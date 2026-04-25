import request from "supertest";
import http from "http";
import { app, captures, sseClients, localhostMiddleware } from "./index";

// Reset state before each test
beforeEach(() => {
  captures.length = 0;
  sseClients.length = 0;
});

// ─── POST /capture ────────────────────────────────────────────────────────────

describe("POST /capture", () => {
  const validPayload = {
    timestamp: "2024-01-15T10:30:00.000Z",
    url: "http://localhost/demo.html",
    type: "keypress",
    value: "secret",
  };

  it("returns 201 and saves event to captures array", async () => {
    const res = await request(app).post("/capture").send(validPayload);

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject(validPayload);
    expect(captures).toHaveLength(1);
    expect(captures[0]).toMatchObject(validPayload);
  });

  it("returns 400 when timestamp is missing", async () => {
    const { timestamp, ...body } = validPayload;
    const res = await request(app).post("/capture").send(body);
    expect(res.status).toBe(400);
    expect(captures).toHaveLength(0);
  });

  it("returns 400 when url is missing", async () => {
    const { url, ...body } = validPayload;
    const res = await request(app).post("/capture").send(body);
    expect(res.status).toBe(400);
    expect(captures).toHaveLength(0);
  });

  it("returns 400 when type is missing", async () => {
    const { type, ...body } = validPayload;
    const res = await request(app).post("/capture").send(body);
    expect(res.status).toBe(400);
    expect(captures).toHaveLength(0);
  });

  it("returns 400 when value is missing", async () => {
    const { value, ...body } = validPayload;
    const res = await request(app).post("/capture").send(body);
    expect(res.status).toBe(400);
    expect(captures).toHaveLength(0);
  });

  it("emits SSE data to connected clients", async () => {
    const written: string[] = [];
    const mockClient = {
      write: (data: string) => { written.push(data); return true; },
    } as any;
    sseClients.push(mockClient);

    await request(app).post("/capture").send(validPayload);

    expect(written).toHaveLength(1);
    expect(written[0]).toContain(`"type":"keypress"`);
    expect(written[0]).toContain(`"value":"secret"`);
    expect(written[0]).toMatch(/^data: /);
    expect(written[0]).toMatch(/\n\n$/);
  });

  it("accumulates multiple captures", async () => {
    await request(app).post("/capture").send(validPayload);
    await request(app).post("/capture").send({ ...validPayload, value: "abc" });
    expect(captures).toHaveLength(2);
  });
});

// ─── Non-localhost rejection ──────────────────────────────────────────────────

describe("Non-localhost rejection (localhostMiddleware)", () => {
  const makeReq = (ip: string) =>
    ({ ip, socket: { remoteAddress: ip } } as any);

  const makeRes = () => {
    let statusCode: number | undefined;
    let jsonBody: any;
    const res: any = {
      status(code: number) { statusCode = code; return res; },
      json(body: any) { jsonBody = body; return res; },
      _statusCode: () => statusCode,
      _jsonBody: () => jsonBody,
    };
    return res;
  };

  it("rejects non-localhost IP with 403", () => {
    const req = makeReq("192.168.1.100");
    const res = makeRes();
    const next = jest.fn();

    localhostMiddleware(req, res, next);

    expect(res._statusCode()).toBe(403);
    expect(res._jsonBody()).toEqual({ error: "Forbidden: localhost only" });
    expect(next).not.toHaveBeenCalled();
  });

  it("rejects another non-localhost IP with 403", () => {
    const req = makeReq("10.0.0.1");
    const res = makeRes();
    const next = jest.fn();

    localhostMiddleware(req, res, next);

    expect(res._statusCode()).toBe(403);
    expect(next).not.toHaveBeenCalled();
  });

  it("allows 127.0.0.1", () => {
    const req = makeReq("127.0.0.1");
    const next = jest.fn();

    localhostMiddleware(req, {} as any, next);

    expect(next).toHaveBeenCalled();
  });

  it("allows ::1 (IPv6 localhost)", () => {
    const req = makeReq("::1");
    const next = jest.fn();

    localhostMiddleware(req, {} as any, next);

    expect(next).toHaveBeenCalled();
  });

  it("allows ::ffff:127.0.0.1 (IPv4-mapped IPv6 localhost)", () => {
    const req = makeReq("::ffff:127.0.0.1");
    const next = jest.fn();

    localhostMiddleware(req, {} as any, next);

    expect(next).toHaveBeenCalled();
  });
});

// ─── DELETE /captures ─────────────────────────────────────────────────────────

describe("DELETE /captures", () => {
  it("clears the captures array and returns 204", async () => {
    const payload = {
      timestamp: "2024-01-15T10:30:00.000Z",
      url: "http://localhost/demo.html",
      type: "submit",
      value: "password123",
    };
    await request(app).post("/capture").send(payload);
    await request(app).post("/capture").send({ ...payload, value: "abc" });
    expect(captures).toHaveLength(2);

    const res = await request(app).delete("/captures");
    expect(res.status).toBe(204);
    expect(captures).toHaveLength(0);
  });

  it("returns 204 even when store is already empty", async () => {
    const res = await request(app).delete("/captures");
    expect(res.status).toBe(204);
    expect(captures).toHaveLength(0);
  });
});

// ─── GET /events ──────────────────────────────────────────────────────────────

describe("GET /events", () => {
  it("returns 200 with Content-Type: text/event-stream", (done) => {
    const server = http.createServer(app).listen(0, "127.0.0.1", () => {
      const port = (server.address() as any).port;
      const req = http.request(
        { host: "127.0.0.1", port, path: "/events", method: "GET" },
        (res) => {
          expect(res.statusCode).toBe(200);
          expect(res.headers["content-type"]).toMatch(/text\/event-stream/);
          req.destroy();
          server.close(done);
        }
      );
      req.on("error", () => server.close(done));
      req.end();
    });
  });

  it("sends initial connection comment", (done) => {
    const server = http.createServer(app).listen(0, "127.0.0.1", () => {
      const port = (server.address() as any).port;
      const req = http.request(
        { host: "127.0.0.1", port, path: "/events", method: "GET" },
        (res) => {
          let data = "";
          res.on("data", (chunk: Buffer) => {
            data += chunk.toString();
            if (data.includes(": connected")) {
              expect(data).toContain(": connected");
              req.destroy();
              server.close(done);
            }
          });
        }
      );
      req.on("error", () => server.close(done));
      req.end();
    });
  });
});
