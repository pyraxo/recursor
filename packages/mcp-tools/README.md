# @recursor/mcp-tools

Model Context Protocol (MCP) tools integration for Recursor agents. Provides external knowledge and search capabilities through Context7 documentation search and Exa web search.

## Features

- **Documentation Search**: Query technical documentation via Context7
- **Web Search**: AI-powered web search via Exa
- **Intelligent Caching**: LRU cache with TTL for reduced API costs
- **Type Safety**: Full TypeScript support with Zod validation
- **MCP Server**: Smithery-based stateless HTTP server
- **Agent Integration**: Easy integration with agent think() cycles

## Installation

```bash
pnpm install
```

## Environment Variables

Create a `.env.local` file:

```bash
# Required for web search
EXA_API_KEY=your_exa_api_key_here

# Optional: MCP server port (default: 3100)
MCP_PORT=3100
```

## Usage

### Using the Tool Client

```typescript
import { MCPToolClient } from "@recursor/mcp-tools";

// Initialize client
const client = new MCPToolClient({
  exaApiKey: process.env.EXA_API_KEY,
  cacheTTL: 1000 * 60 * 15, // 15 minutes
  maxCacheSize: 1000,
});

// Search documentation
const docResult = await client.executeTool("search_documentation", {
  libraryName: "react",
  topic: "hooks",
  tokens: 3000,
});

// Perform web search
const webResult = await client.executeTool("web_search", {
  query: "Next.js 15 features",
  numResults: 5,
  searchType: "neural",
});

// Get available tools
const tools = client.getAvailableTools();
console.log(tools); // ["search_documentation", "web_search"]

// Get formatted prompt for agents
const prompt = client.getToolsPrompt();
```

### Running the MCP Server

```bash
# Development
pnpm dev

# Production
pnpm build
node dist/server/index.js
```

The server will start on port 3100 (or MCP_PORT if set).

### Agent Integration

The tools are automatically available in all agents that extend `BaseAgent`:

```typescript
import { BaseAgent } from "@recursor/agent-engine";

class MyAgent extends BaseAgent {
  async think(): Promise<string> {
    const systemPrompt = await this.buildSystemPrompt(`
      You are an agent with external tool access.
    `);

    // Tools are automatically included in the prompt
    const response = await this.llm.completion([
      { role: "system", content: systemPrompt },
      { role: "user", content: "Research React hooks" },
    ]);

    // Check if agent wants to use a tool
    if (this.detectToolUse(response)) {
      const toolResult = await this.executeToolFromResponse(response);
      // Continue with tool result...
    }

    return response;
  }
}
```

### Tool Usage Format

Agents use tools by including directives in their responses:

```
TOOL_USE: search_documentation
PARAMS: {"libraryName": "react", "topic": "hooks"}
```

The agent will receive a formatted result:

```
[search_documentation SUCCESS]
{
  "libraryId": "/facebook/react",
  "documentation": "# React Hooks\n\n...",
  "codeExamples": 45,
  "trustScore": 9.5
}
```

## Available Tools

### search_documentation

Search technical documentation and library references.

**Parameters:**
- `libraryName` (required): Name of the library (e.g., "react", "next.js")
- `topic` (optional): Specific topic to focus on
- `tokens` (optional): Max tokens to retrieve (100-10000, default: 3000)

**Example:**
```typescript
{
  libraryName: "typescript",
  topic: "generics",
  tokens: 2000
}
```

### web_search

Perform intelligent web search with AI-optimized ranking.

**Parameters:**
- `query` (required): Search query
- `numResults` (optional): Number of results (1-20, default: 5)
- `searchType` (optional): "neural" or "keyword" (default: "neural")
- `includeContent` (optional): Extract page content (default: true)
- `category` (optional): "news", "research", or "documentation"

**Example:**
```typescript
{
  query: "Next.js 15 app router features",
  numResults: 3,
  searchType: "neural",
  includeContent: true,
  category: "documentation"
}
```

## Architecture

```
┌─────────────────────────────────────┐
│   Agent Engine (BaseAgent)          │
│   - detectToolUse()                 │
│   - executeToolFromResponse()       │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│   MCPToolClient                     │
│   - executeTool()                   │
│   - Cache management                │
└──────────────┬──────────────────────┘
               │
        ┌──────┴──────┐
        ▼             ▼
┌──────────────┐ ┌──────────────┐
│  Context7    │ │     Exa      │
│  Executor    │ │  Executor    │
└──────────────┘ └──────────────┘
```

## Testing

```bash
# Run all tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Run tests with UI
pnpm test:ui

# Generate coverage report
pnpm test -- --coverage
```

## Development

```bash
# Type check
pnpm type-check

# Lint
pnpm lint

# Build
pnpm build
```

## API Reference

### MCPToolClient

#### Methods

- `executeTool(toolName, params)`: Execute a tool
- `getAvailableTools()`: Get list of registered tools
- `getToolSchema(toolName)`: Get schema for specific tool
- `getAllToolSchemas()`: Get all tool schemas
- `getToolsPrompt()`: Generate formatted prompt for agents
- `registerExecutor(executor)`: Register custom tool
- `unregisterExecutor(toolName)`: Remove tool
- `clearCache()`: Clear all cached results
- `getCacheStats()`: Get cache statistics
- `cleanupCache()`: Remove expired entries

### Tool Result Format

```typescript
interface ToolResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  metadata?: Record<string, unknown>;
}
```

## Cache Management

The tool client uses an LRU (Least Recently Used) cache with TTL:

- **Default TTL**: 15 minutes
- **Default Max Size**: 1000 entries
- **Eviction**: Oldest entries evicted when max size reached
- **Error Handling**: Failed results are not cached

### Cache Statistics

```typescript
const stats = client.getCacheStats();
// {
//   total: 150,
//   expired: 10,
//   valid: 140,
//   maxSize: 1000,
//   ttl: 900000
// }
```

## Custom Tools

You can create and register custom tools:

```typescript
import { ToolExecutor, ToolResult, ToolSchema } from "@recursor/mcp-tools";

class CustomTool implements ToolExecutor {
  async execute(params: unknown): Promise<ToolResult> {
    // Your tool logic here
    return {
      success: true,
      data: { result: "custom data" },
    };
  }

  getSchema(): ToolSchema {
    return {
      name: "custom_tool",
      description: "My custom tool",
      parameters: {
        type: "object",
        properties: {
          param1: { type: "string", description: "First parameter" },
        },
        required: ["param1"],
      },
    };
  }
}

// Register the custom tool
client.registerExecutor(new CustomTool());
```

## Error Handling

Tools return structured error responses:

```typescript
{
  success: false,
  error: "Exa API rate limit exceeded. Please try again later."
}
```

Common error types:
- Validation errors (invalid parameters)
- API key errors (missing or invalid)
- Rate limit errors
- Network errors
- Not found errors

## Performance

- **Cache Hit Rate**: Target >60% for documentation searches
- **Response Time**: <3s average tool execution
- **Concurrency**: Supports multiple concurrent requests
- **Resource Usage**: Minimal memory footprint with LRU eviction

## License

Private - Part of Recursor project

## Contributing

This package is part of the Recursor monorepo. See root CLAUDE.md for development guidelines.
