import {
  createLLMProviders,
  ExecutionController,
} from "@recursor/agent-engine";
import { createServer, IncomingMessage, ServerResponse } from "http";

const PORT = process.env.PORT || 3003;
const CONVEX_URL = process.env.CONVEX_URL || process.env.NEXT_PUBLIC_CONVEX_URL;

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
