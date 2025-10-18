# MCP Tools Integration Implementation Plan

## Executive Summary
Create a new package `@recursor/mcp-tools` to provide orchestrator agents with external knowledge and search capabilities via Model Context Protocol (MCP) servers. This package will enable agents to search documentation (Context7), perform web searches (Exa), and be extensible for future tool integrations. The implementation leverages Smithery SDK for MCP server creation and provides a unified interface for agents to access these capabilities during their think cycles.

## 1. Feature Requirements

### 1.1 Functional Requirements
- **Documentation Search**: Query technical documentation, SDKs, and library references via Context7
- **Web Search**: Perform real-time web searches with intelligent ranking via Exa API
- **MCP Server Infrastructure**: Smithery-based stateless HTTP MCP servers
- **Agent Integration**: Simple tool invocation interface for orchestrator agents
- **Tool Discovery**: Automatic tool registration and schema generation
- **Response Formatting**: Structured responses optimized for LLM consumption
- **Error Handling**: Graceful fallbacks and informative error messages
- **Caching**: Intelligent response caching to reduce API costs

### 1.2 Non-Functional Requirements
- **Performance**: Tool invocations complete within 2-5 seconds
- **Reliability**: 99% uptime with automatic failover
- **Scalability**: Support multiple concurrent agent requests
- **Cost Optimization**: Cache frequently accessed documentation and search results
- **Type Safety**: Full TypeScript typing for all interfaces
- **Testability**: Comprehensive unit and integration tests
- **Extensibility**: Easy addition of new MCP tools

## 2. Architecture Design

### 2.1 System Architecture
```
┌──────────────────────────────────────────────────────────────┐
│                   Agent Engine Layer                         │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  Orchestrator Agents (Planner, Builder, etc.)          │  │
│  │  - Invokes tools during think() cycle                  │  │
│  │  - Receives structured responses                       │  │
│  └────────────────┬───────────────────────────────────────┘  │
└───────────────────┼──────────────────────────────────────────┘
                    │
                    ▼
┌──────────────────────────────────────────────────────────────┐
│              @recursor/mcp-tools Package                     │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  MCPToolClient                                         │  │
│  │  - executeTool(toolName, params)                       │  │
│  │  - getAvailableTools()                                 │  │
│  │  - Tool result caching                                 │  │
│  └────────────────┬───────────────────────────────────────┘  │
│                   │                                          │
│  ┌────────────────┴───────────────────────────────────────┐  │
│  │  Tool Executors                                        │  │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │  │
│  │  │  Context7    │  │     Exa      │  │   Future     │ │  │
│  │  │  Executor    │  │   Executor   │  │    Tools     │ │  │
│  │  └──────────────┘  └──────────────┘  └──────────────┘ │  │
│  └────────────────────────────────────────────────────────┘  │
└──────────────────┬───────────────────────────────────────────┘
                   │
                   ▼
┌──────────────────────────────────────────────────────────────┐
│              MCP Servers (Smithery-based)                    │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  Recursor MCP Server (HTTP)                            │  │
│  │  - Stateless server on port 3100                       │  │
│  │  - Tool routing and validation                         │  │
│  │  - Request/response transformation                     │  │
│  └────────────────┬───────────────────────────────────────┘  │
└───────────────────┼──────────────────────────────────────────┘
                    │
       ┌────────────┴────────────┐
       ▼                         ▼
┌─────────────────┐    ┌─────────────────┐
│  Context7 API   │    │    Exa API      │
│  - resolve-lib  │    │  - web_search   │
│  - get-docs     │    │  - find_similar │
└─────────────────┘    └─────────────────┘
```

### 2.2 Tool Definitions

#### Context7 Tools
```typescript
{
  name: "search_documentation",
  description: "Search technical documentation, SDKs, and library references",
  inputSchema: {
    libraryName: string,      // e.g., "react", "next.js"
    topic?: string,           // e.g., "hooks", "routing"
    tokens?: number           // max tokens (default: 3000)
  },
  outputSchema: {
    libraryId: string,        // Context7 library ID
    documentation: string,    // Markdown formatted docs
    codeExamples: number,     // Count of code snippets
    trustScore: number        // Library trust score
  }
}

{
  name: "resolve_library",
  description: "Find the correct library ID for a package name",
  inputSchema: {
    libraryName: string       // Package/library to search
  },
  outputSchema: {
    matches: Array<{
      libraryId: string,
      name: string,
      description: string,
      trustScore: number,
      snippets: number
    }>
  }
}
```

#### Exa Search Tools
```typescript
{
  name: "web_search",
  description: "Perform intelligent web search with AI-optimized ranking",
  inputSchema: {
    query: string,            // Search query
    numResults?: number,      // Results to return (default: 5)
    searchType?: string,      // "neural" | "keyword" (default: neural)
    includeContent?: boolean, // Extract page content (default: true)
    category?: string         // "news" | "research" | "documentation"
  },
  outputSchema: {
    results: Array<{
      title: string,
      url: string,
      snippet: string,
      content?: string,       // Full content if requested
      publishedDate?: string,
      score: number
    }>,
    searchMetadata: {
      query: string,
      totalResults: number,
      searchTime: number
    }
  }
}

{
  name: "find_similar_content",
  description: "Find content similar to a given URL",
  inputSchema: {
    url: string,              // Reference URL
    numResults?: number       // Results to return (default: 5)
  },
  outputSchema: {
    results: Array<{
      title: string,
      url: string,
      snippet: string,
      similarity: number
    }>
  }
}
```

### 2.3 Agent Integration Pattern

Agents will use tools during their `think()` cycle via an enhanced prompt:

```typescript
// In any agent (e.g., BuilderAgent)
async think(): Promise<string> {
  const systemPrompt = await this.buildSystemPrompt(`
    You are the Builder Agent with access to external tools:

    AVAILABLE TOOLS:
    ${this.tools.getToolsPrompt()}

    To use a tool, respond with:
    TOOL_USE: <tool_name>
    PARAMS: <JSON parameters>
  `);

  const response = await this.llm.completion(messages);

  // Check if agent wants to use a tool
  if (this.detectToolUse(response)) {
    const toolResult = await this.tools.executeTool(
      toolName,
      params
    );

    // Feed result back to agent
    const finalResponse = await this.llm.completion([
      ...messages,
      { role: "assistant", content: response },
      { role: "user", content: `TOOL_RESULT: ${toolResult}` }
    ]);

    return finalResponse;
  }

  return response;
}
```

### 2.4 Data Flow

#### Documentation Search Flow:
1. Agent detects need for documentation (e.g., "How to use React hooks?")
2. Agent includes TOOL_USE directive in response
3. MCPToolClient parses tool invocation
4. Executes Context7 search via MCP server
5. Formats documentation for LLM consumption
6. Returns result to agent for integration into response
7. Agent proceeds with enhanced knowledge

#### Web Search Flow:
1. Agent needs current information (e.g., "Latest Next.js 15 features")
2. Agent invokes web_search tool
3. Exa API performs neural search
4. Results filtered and ranked by relevance
5. Content extracted and summarized
6. Agent receives structured results
7. Agent uses information in decision-making

## 3. Package Structure

```
packages/mcp-tools/
├── package.json
├── tsconfig.json
├── src/
│   ├── index.ts                    # Main exports
│   ├── client/
│   │   ├── MCPToolClient.ts        # Main client interface
│   │   ├── ToolExecutor.ts         # Base executor class
│   │   └── cache.ts                # Response caching
│   ├── executors/
│   │   ├── Context7Executor.ts     # Context7 integration
│   │   ├── ExaExecutor.ts          # Exa integration
│   │   └── index.ts                # Export all executors
│   ├── server/
│   │   ├── index.ts                # MCP server entry point
│   │   ├── createServer.ts         # Smithery server factory
│   │   ├── routes/
│   │   │   ├── context7.ts         # Context7 tool routes
│   │   │   └── exa.ts              # Exa tool routes
│   │   └── middleware/
│   │       ├── validation.ts       # Input validation
│   │       └── errorHandler.ts     # Error handling
│   ├── types/
│   │   ├── tools.ts                # Tool type definitions
│   │   ├── context7.ts             # Context7 types
│   │   └── exa.ts                  # Exa types
│   └── utils/
│       ├── formatting.ts           # Response formatting
│       └── prompts.ts              # Tool prompt generation
├── scripts/
│   └── start-server.ts             # Server startup script
└── tests/
    ├── client.test.ts
    ├── executors/
    │   ├── context7.test.ts
    │   └── exa.test.ts
    └── integration/
        └── e2e.test.ts
```

## 4. Implementation Phases

### Phase 1: Package Foundation (Single Shot - Day 1)

This implementation is designed for **single-shot execution** - all components will be implemented in one comprehensive session.

#### 1.1 Package Initialization
```bash
# Create package directory
mkdir -p packages/mcp-tools

# Initialize package.json
cat > packages/mcp-tools/package.json << 'EOF'
{
  "name": "@recursor/mcp-tools",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "exports": {
    ".": "./src/index.ts",
    "./client": "./src/client/index.ts",
    "./server": "./src/server/index.ts"
  },
  "scripts": {
    "dev": "tsx src/server/index.ts",
    "build": "tsc",
    "type-check": "tsc --noEmit",
    "test": "vitest",
    "lint": "eslint . --max-warnings 0"
  },
  "dependencies": {
    "@smithery/sdk": "^0.3.0",
    "@modelcontextprotocol/sdk": "^1.0.0",
    "exa-js": "^1.0.14",
    "zod": "^3.23.8",
    "dotenv": "^16.4.5"
  },
  "devDependencies": {
    "@repo/typescript-config": "workspace:*",
    "@types/node": "^22.5.0",
    "typescript": "^5.6.2",
    "tsx": "^4.19.2",
    "vitest": "^3.2.4"
  }
}
EOF

# Create tsconfig.json
cat > packages/mcp-tools/tsconfig.json << 'EOF'
{
  "extends": "@repo/typescript-config/base.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src",
    "lib": ["es2020", "dom", "dom.iterable"],
    "target": "es2020"
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "**/*.test.ts"]
}
EOF
```

#### 1.2 Core Type Definitions
```typescript
// src/types/tools.ts
import { z } from "zod";

export interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: z.ZodSchema;
  outputSchema: z.ZodSchema;
  executor: ToolExecutor;
}

export interface ToolExecutor {
  execute(params: unknown): Promise<ToolResult>;
  getSchema(): ToolSchema;
}

export interface ToolResult {
  success: boolean;
  data?: unknown;
  error?: string;
  metadata?: Record<string, unknown>;
}

export interface ToolSchema {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
}
```

#### 1.3 Context7 Executor
```typescript
// src/executors/Context7Executor.ts
import { ToolExecutor, ToolResult } from "../types/tools";
import { z } from "zod";

const searchDocsSchema = z.object({
  libraryName: z.string(),
  topic: z.string().optional(),
  tokens: z.number().optional().default(3000),
});

export class Context7Executor implements ToolExecutor {
  async execute(params: unknown): Promise<ToolResult> {
    const validated = searchDocsSchema.parse(params);

    try {
      // 1. Resolve library ID
      const libraryId = await this.resolveLibrary(validated.libraryName);

      // 2. Fetch documentation
      const docs = await this.fetchDocs(
        libraryId,
        validated.topic,
        validated.tokens
      );

      return {
        success: true,
        data: {
          libraryId,
          documentation: docs.content,
          codeExamples: docs.snippets,
          trustScore: docs.trust,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: `Context7 search failed: ${error.message}`,
      };
    }
  }

  private async resolveLibrary(name: string): Promise<string> {
    // Implementation using Context7 MCP
    // Note: This will use the existing MCP connection
    throw new Error("Not implemented");
  }

  private async fetchDocs(
    libraryId: string,
    topic?: string,
    tokens?: number
  ) {
    // Implementation using Context7 MCP
    throw new Error("Not implemented");
  }

  getSchema(): ToolSchema {
    return {
      name: "search_documentation",
      description: "Search technical documentation and library references",
      parameters: {
        type: "object",
        properties: {
          libraryName: { type: "string" },
          topic: { type: "string" },
          tokens: { type: "number", default: 3000 },
        },
        required: ["libraryName"],
      },
    };
  }
}
```

#### 1.4 Exa Executor
```typescript
// src/executors/ExaExecutor.ts
import Exa from "exa-js";
import { ToolExecutor, ToolResult } from "../types/tools";
import { z } from "zod";

const webSearchSchema = z.object({
  query: z.string(),
  numResults: z.number().optional().default(5),
  searchType: z.enum(["neural", "keyword"]).optional().default("neural"),
  includeContent: z.boolean().optional().default(true),
  category: z.enum(["news", "research", "documentation"]).optional(),
});

export class ExaExecutor implements ToolExecutor {
  private exa: Exa;

  constructor(apiKey: string) {
    this.exa = new Exa(apiKey);
  }

  async execute(params: unknown): Promise<ToolResult> {
    const validated = webSearchSchema.parse(params);

    try {
      const results = await this.exa.searchAndContents(
        validated.query,
        {
          type: validated.searchType,
          numResults: validated.numResults,
          text: validated.includeContent,
          category: validated.category,
        }
      );

      return {
        success: true,
        data: {
          results: results.results.map((r) => ({
            title: r.title,
            url: r.url,
            snippet: r.text?.substring(0, 200) || "",
            content: r.text,
            publishedDate: r.publishedDate,
            score: r.score,
          })),
          searchMetadata: {
            query: validated.query,
            totalResults: results.results.length,
            searchTime: Date.now(),
          },
        },
      };
    } catch (error) {
      return {
        success: false,
        error: `Exa search failed: ${error.message}`,
      };
    }
  }

  getSchema(): ToolSchema {
    return {
      name: "web_search",
      description: "Perform intelligent web search with AI-optimized ranking",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string" },
          numResults: { type: "number", default: 5 },
          searchType: { type: "string", enum: ["neural", "keyword"] },
          includeContent: { type: "boolean", default: true },
          category: { type: "string", enum: ["news", "research", "documentation"] },
        },
        required: ["query"],
      },
    };
  }
}
```

#### 1.5 MCP Tool Client
```typescript
// src/client/MCPToolClient.ts
import { ToolExecutor, ToolResult } from "../types/tools";
import { Context7Executor } from "../executors/Context7Executor";
import { ExaExecutor } from "../executors/ExaExecutor";

export class MCPToolClient {
  private executors: Map<string, ToolExecutor> = new Map();
  private cache: Map<string, { result: ToolResult; timestamp: number }> = new Map();
  private cacheTTL: number = 1000 * 60 * 15; // 15 minutes

  constructor(config: { exaApiKey: string }) {
    // Register executors
    this.registerExecutor(new Context7Executor());
    this.registerExecutor(new ExaExecutor(config.exaApiKey));
  }

  private registerExecutor(executor: ToolExecutor) {
    const schema = executor.getSchema();
    this.executors.set(schema.name, executor);
  }

  async executeTool(toolName: string, params: unknown): Promise<ToolResult> {
    const cacheKey = `${toolName}:${JSON.stringify(params)}`;

    // Check cache
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
      return cached.result;
    }

    const executor = this.executors.get(toolName);
    if (!executor) {
      return {
        success: false,
        error: `Tool "${toolName}" not found`,
      };
    }

    const result = await executor.execute(params);

    // Cache successful results
    if (result.success) {
      this.cache.set(cacheKey, { result, timestamp: Date.now() });
    }

    return result;
  }

  getAvailableTools(): string[] {
    return Array.from(this.executors.keys());
  }

  getToolsPrompt(): string {
    const tools = Array.from(this.executors.values())
      .map((e) => {
        const schema = e.getSchema();
        return `- ${schema.name}: ${schema.description}
  Parameters: ${JSON.stringify(schema.parameters, null, 2)}`;
      })
      .join("\n\n");

    return `Available external tools:\n\n${tools}`;
  }
}
```

#### 1.6 Smithery MCP Server
```typescript
// src/server/index.ts
import { createStatelessServer } from "@smithery/sdk/server/stateless.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { Context7Executor } from "../executors/Context7Executor";
import { ExaExecutor } from "../executors/ExaExecutor";
import dotenv from "dotenv";

dotenv.config();

function createMcpServer({ config }) {
  const mcpServer = new McpServer({
    name: "Recursor MCP Tools",
    version: "1.0.0",
  });

  const context7 = new Context7Executor();
  const exa = new ExaExecutor(process.env.EXA_API_KEY || "");

  // Register Context7 tools
  mcpServer.tool(
    context7.getSchema().name,
    context7.getSchema().description,
    context7.getSchema().parameters,
    async (params) => {
      const result = await context7.execute(params);
      return result.success ? result.data : { error: result.error };
    }
  );

  // Register Exa tools
  mcpServer.tool(
    exa.getSchema().name,
    exa.getSchema().description,
    exa.getSchema().parameters,
    async (params) => {
      const result = await exa.execute(params);
      return result.success ? result.data : { error: result.error };
    }
  );

  return mcpServer.server;
}

// Start server
const server = createStatelessServer(createMcpServer);
const PORT = process.env.MCP_PORT || 3100;

server.app.listen(PORT, () => {
  console.log(`Recursor MCP Server running on port ${PORT}`);
});
```

#### 1.7 Integration with Agent Engine
```typescript
// packages/agent-engine/src/agents/base-agent.ts
import { MCPToolClient } from "@recursor/mcp-tools/client";

export class BaseAgent {
  protected tools: MCPToolClient;

  constructor(stackId, agentType, llm, convexUrl) {
    // ... existing initialization

    // Initialize MCP tools
    this.tools = new MCPToolClient({
      exaApiKey: process.env.EXA_API_KEY || "",
    });
  }

  protected async buildSystemPrompt(basePrompt: string): Promise<string> {
    return `${basePrompt}

${this.tools.getToolsPrompt()}

To use a tool, include in your response:
TOOL_USE: <tool_name>
PARAMS: <JSON parameters>

You will receive the tool result and can incorporate it into your final response.
`;
  }

  protected detectToolUse(response: string): boolean {
    return /TOOL_USE:/i.test(response);
  }

  protected async executeToolFromResponse(response: string): Promise<string | null> {
    const toolMatch = response.match(/TOOL_USE:\s*(\w+)/i);
    const paramsMatch = response.match(/PARAMS:\s*({[\s\S]*?})/i);

    if (!toolMatch) return null;

    const toolName = toolMatch[1];
    const params = paramsMatch ? JSON.parse(paramsMatch[1]) : {};

    const result = await this.tools.executeTool(toolName, params);

    if (result.success) {
      return `TOOL_RESULT for ${toolName}:\n${JSON.stringify(result.data, null, 2)}`;
    } else {
      return `TOOL_ERROR for ${toolName}:\n${result.error}`;
    }
  }
}
```

#### 1.8 Environment Configuration
```bash
# Add to .env.local
EXA_API_KEY=your_exa_api_key_here
MCP_PORT=3100
```

#### 1.9 Tests
```typescript
// tests/client.test.ts
import { describe, it, expect, vi } from "vitest";
import { MCPToolClient } from "../src/client/MCPToolClient";

describe("MCPToolClient", () => {
  it("should execute Context7 search", async () => {
    const client = new MCPToolClient({ exaApiKey: "test-key" });

    const result = await client.executeTool("search_documentation", {
      libraryName: "react",
      topic: "hooks",
    });

    expect(result.success).toBe(true);
    expect(result.data).toHaveProperty("documentation");
  });

  it("should execute Exa web search", async () => {
    const client = new MCPToolClient({ exaApiKey: "test-key" });

    const result = await client.executeTool("web_search", {
      query: "Next.js 15 features",
      numResults: 3,
    });

    expect(result.success).toBe(true);
    expect(result.data).toHaveProperty("results");
  });

  it("should cache tool results", async () => {
    const client = new MCPToolClient({ exaApiKey: "test-key" });

    const result1 = await client.executeTool("web_search", {
      query: "test query",
    });

    const result2 = await client.executeTool("web_search", {
      query: "test query",
    });

    expect(result1).toEqual(result2);
  });
});
```

## 5. Integration Testing

### 5.1 End-to-End Test Scenario
```typescript
// tests/integration/e2e.test.ts
describe("Agent MCP Integration", () => {
  it("should allow PlannerAgent to search documentation", async () => {
    const planner = new PlannerAgent(stackId, llm, convexUrl);

    // Simulate agent needing documentation
    const response = await planner.think();

    // Agent should be able to use search_documentation tool
    expect(response).toContain("TOOL_USE: search_documentation");
  });

  it("should allow BuilderAgent to search web", async () => {
    const builder = new BuilderAgent(stackId, llm, convexUrl);

    // Simulate agent needing current information
    const response = await builder.think();

    // Agent should be able to use web_search tool
    expect(response).toContain("TOOL_USE: web_search");
  });
});
```

## 6. Deployment & Operations

### 6.1 MCP Server Deployment
```bash
# Development
pnpm --filter @recursor/mcp-tools dev

# Production (with PM2)
pm2 start packages/mcp-tools/src/server/index.ts \
  --name recursor-mcp \
  --interpreter tsx

# Or with Docker
docker build -t recursor-mcp -f packages/mcp-tools/Dockerfile .
docker run -p 3100:3100 -e EXA_API_KEY=$EXA_API_KEY recursor-mcp
```

### 6.2 Monitoring
- Health check endpoint: `GET /health`
- Metrics endpoint: `GET /metrics`
- Tool usage tracking via Convex traces
- Error rate monitoring via Sentry

## 7. Future Enhancements

### 7.1 Additional Tools (Phase 2)
- **GitHub Integration**: Search code, issues, PRs
- **Stack Overflow Search**: Programming Q&A
- **NPM Package Search**: Find and analyze packages
- **Code Execution**: Safe sandbox for code testing

### 7.2 Performance Optimizations
- Redis caching layer
- Response streaming for large results
- Parallel tool execution
- Request deduplication

### 7.3 Advanced Features
- Tool chaining (multi-step queries)
- Automatic tool selection by LLM
- Custom tool creation via config
- Tool usage analytics dashboard

## 8. Success Metrics

- **Tool Adoption**: >70% of agent actions use at least one tool
- **Response Time**: <3s average tool execution time
- **Cache Hit Rate**: >60% for documentation searches
- **Error Rate**: <2% failed tool invocations
- **Agent Performance**: 30% improvement in task completion with tools vs. without

## 9. Dependencies & Prerequisites

### 9.1 External Services
- **Exa API**: Requires API key (free tier available)
- **Context7**: Already integrated via MCP
- **Smithery Registry**: Optional for publishing

### 9.2 Package Dependencies
```json
{
  "@smithery/sdk": "^0.3.0",
  "@modelcontextprotocol/sdk": "^1.0.0",
  "exa-js": "^1.0.14",
  "zod": "^3.23.8"
}
```

## 10. Risk Assessment & Mitigation

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Exa API rate limits | High | Medium | Implement caching, request queuing |
| Context7 downtime | Medium | Low | Fallback to cached docs, graceful degradation |
| Tool execution timeout | Medium | Medium | 5s timeout with retry logic |
| Cost overrun | High | Low | Track API usage, set spending limits |
| Integration breaking agents | High | Low | Comprehensive tests, feature flags |

## 11. Timeline & Milestones

**Single-Shot Implementation (Day 1)**
- ✅ Package structure and dependencies (30 min)
- ✅ Core type definitions (30 min)
- ✅ Context7 executor implementation (1 hour)
- ✅ Exa executor implementation (1 hour)
- ✅ MCP Tool Client (1 hour)
- ✅ Smithery MCP server (1 hour)
- ✅ Agent integration (1 hour)
- ✅ Tests and documentation (1 hour)
- ✅ Environment setup and configuration (30 min)

**Total Time: ~7 hours single-shot implementation**

## 12. Appendix

### A. Tool Prompt Examples

**For Planner Agent:**
```
You have access to external tools for research and planning:

1. search_documentation - Find technical docs for libraries
   Use when: Planning features that require specific APIs or frameworks

2. web_search - Search the web for current information
   Use when: Need latest trends, best practices, or recent solutions

Example:
TOOL_USE: search_documentation
PARAMS: {"libraryName": "next.js", "topic": "app router"}
```

### B. Response Format Examples

**Context7 Response:**
```json
{
  "success": true,
  "data": {
    "libraryId": "/vercel/next.js",
    "documentation": "## App Router\n\nThe App Router...",
    "codeExamples": 45,
    "trustScore": 9.5
  }
}
```

**Exa Response:**
```json
{
  "success": true,
  "data": {
    "results": [
      {
        "title": "Next.js 15 Release Notes",
        "url": "https://nextjs.org/blog/next-15",
        "snippet": "Next.js 15 introduces...",
        "score": 0.95
      }
    ],
    "searchMetadata": {
      "query": "Next.js 15 features",
      "totalResults": 3,
      "searchTime": 1234567890
    }
  }
}
```

---

**Document Version**: 1.0
**Last Updated**: 2025-10-18
**Author**: Claude (Conductor)
**Status**: Ready for Single-Shot Implementation
