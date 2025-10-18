import {
  createLLMProviders,
  ExecutionController,
} from "@recursor/agent-engine";
import { createServer, IncomingMessage, ServerResponse } from "http";
import fs from "node:fs";
import path from "node:path";

const PORT = process.env.PORT || 3003;

// Best-effort load of CONVEX_URL from project root .env.local without adding deps
function loadConvexUrlFromEnvFile(): string | undefined {
  try {
    const repoRoot = path.resolve(__dirname, "../../..");
    const envPath = path.join(repoRoot, ".env.local");
    if (!fs.existsSync(envPath)) return undefined;
    const contents = fs.readFileSync(envPath, "utf8");
    for (const line of contents.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      const raw = trimmed.slice(eq + 1).trim();
      const value = raw.replace(/^['\"]|['\"]$/g, "");
      if (key === "CONVEX_URL" || key === "NEXT_PUBLIC_CONVEX_URL") {
        if (value) return value;
      }
    }
  } catch {
    // ignore
  }
  return undefined;
}

const CONVEX_URL =
  process.env.CONVEX_URL ||
  process.env.NEXT_PUBLIC_CONVEX_URL ||
  loadConvexUrlFromEnvFile();

class AgentExecutionService {
  private controller: ExecutionController | null = null;
  private server: ReturnType<typeof createServer>;

  constructor() {
    this.server = createServer(this.handleRequest.bind(this));
  }

  async start() {
    if (!CONVEX_URL) {
      throw new Error("CONVEX_URL or NEXT_PUBLIC_CONVEX_URL required");
    }

    // Initialize execution controller
    const llmProviders = createLLMProviders();
    this.controller = new ExecutionController(llmProviders, CONVEX_URL);
    await this.controller.start();

    // Start HTTP server
    this.server.listen(PORT, () => {
      console.log(`Agent execution service running on port ${PORT}`);
    });

    // Handle shutdown
    process.on("SIGINT", () => this.shutdown());
    process.on("SIGTERM", () => this.shutdown());
  }

  private async handleRequest(req: IncomingMessage, res: ServerResponse) {
    // Enable CORS
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
    res.setHeader("Content-Type", "application/json");

    if (req.method === "OPTIONS") {
      res.writeHead(200);
      res.end();
      return;
    }

    if (req.url === "/health") {
      const health: any = {
        status: "healthy",
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        controller: !!this.controller,
      };

      if (this.controller) {
        try {
          const status = await this.controller.getStatus();
          health.controller = status;
        } catch (error) {
          health.status = "degraded";
        }
      }

      res.writeHead(200);
      res.end(JSON.stringify(health, null, 2));
      return;
    }

    if (req.url === "/status" && this.controller) {
      try {
        const status = await this.controller.getStatus();
        res.writeHead(200);
        res.end(JSON.stringify(status, null, 2));
        return;
      } catch (error) {
        res.writeHead(500);
        res.end(JSON.stringify({ error: "Failed to get status" }));
        return;
      }
    }

    res.writeHead(404);
    res.end(JSON.stringify({ error: "Not found" }));
  }

  private shutdown() {
    console.log("Shutting down...");
    this.server.close();
    process.exit(0);
  }
}

// Start the service
const service = new AgentExecutionService();
service.start().catch((error) => {
  console.error("Failed to start:", error);
  process.exit(1);
});
