import express, { Request, Response, NextFunction } from "express";
import path from "path";

export interface CaptureEvent {
  timestamp: string; // ISO 8601
  url: string;
  type: "keypress" | "submit";
  value: string;
}

// In-memory store
export const captures: CaptureEvent[] = [];
export const sseClients: Response[] = [];

export const app = express();

// Middleware: only allow 127.0.0.1
export function localhostMiddleware(req: Request, res: Response, next: NextFunction): void {
  const remoteAddress =
    req.ip ||
    req.socket.remoteAddress ||
    "";
  const isLocalhost =
    remoteAddress === "127.0.0.1" ||
    remoteAddress === "::ffff:127.0.0.1" ||
    remoteAddress === "::1";
  if (!isLocalhost) {
    res.status(403).json({ error: "Forbidden: localhost only" });
    return;
  }
  next();
}

app.use(localhostMiddleware);

// CORS: allow both localhost and 127.0.0.1 origins (same machine, different hostnames)
app.use((req: Request, res: Response, next: NextFunction) => {
  const origin = req.headers.origin || "";
  if (/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  }
  if (req.method === "OPTIONS") {
    res.sendStatus(204);
    return;
  }
  next();
});

app.use(express.json());

// POST /capture — receive keylog data from content script
app.post("/capture", (req: Request, res: Response) => {
  const { timestamp, url, type, value, username } = req.body;

  // Validate required fields (value can be empty string — that's valid)
  if (!timestamp || !url || !type || value === undefined || value === null) {
    res.status(400).json({ error: "Missing required fields: timestamp, url, type, value" });
    return;
  }

  const event: CaptureEvent & { username?: string } = { timestamp, url, type, value, ...(username !== undefined ? { username } : {}) };

  // Push to in-memory store
  captures.push(event as CaptureEvent);

  // Emit SSE event to all connected clients
  const sseData = `data: ${JSON.stringify(event)}\n\n`;
  for (const client of sseClients) {
    client.write(sseData);
  }

  res.status(201).json(event);
});

// GET /events — SSE stream for Attack Dashboard
app.get("/events", (req: Request, res: Response) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  // Add this client to the list
  sseClients.push(res);

  // Confirm connection
  res.write(": connected\n\n");

  // Cleanup on disconnect
  req.on("close", () => {
    const idx = sseClients.indexOf(res);
    if (idx !== -1) {
      sseClients.splice(idx, 1);
    }
  });
});

// DELETE /captures — reset in-memory store
app.delete("/captures", (_req: Request, res: Response) => {
  captures.length = 0;
  res.status(204).end();
});

// Serve static files from public/
app.use(express.static(path.join(__dirname, "..", "public")));

// GET / — serve dashboard
app.get("/", (_req: Request, res: Response) => {
  res.sendFile(path.join(__dirname, "..", "public", "dashboard.html"));
});

// GET /demo — serve demo page (victim simulation)
app.get("/demo", (_req: Request, res: Response) => {
  res.sendFile(path.join(__dirname, "..", "public", "demo.html"));
});

// Start server only when run directly (not imported as module)
if (require.main === module) {
  app.listen(3000, "127.0.0.1", () => {
    console.log("Security Demo Server running at http://127.0.0.1:3000");
  });
}
