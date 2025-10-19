import { api } from "@recursor/convex/_generated/api";
import type { Id } from "@recursor/convex/_generated/dataModel";
import { ConvexClient } from "convex/browser";
import { LLMProviders } from "../config";
import { ConvexMemoryProvider } from "../memory/convex-memory";
import { ConvexMessagingProvider } from "../messaging/convex-messages";
import {
  MCPToolClient,
  parseToolUse,
  formatToolResultForLLM,
} from "@recursor/mcp-tools";

// Work detection interface
export interface WorkStatus {
  hasWork: boolean;
  type: string;
  workDescription: string;
  priority: number;
  metadata?: Record<string, unknown>;
}

export abstract class BaseAgent {
  protected stackId: Id<"agent_stacks">;
  protected agentType: string;
  protected llm: LLMProviders;
  protected memory: ConvexMemoryProvider;
  protected messaging: ConvexMessagingProvider;
  protected client: ConvexClient;
  protected tools: MCPToolClient;

  constructor(
    stackId: Id<"agent_stacks">,
    agentType: string,
    llm: LLMProviders,
    convexUrl: string
  ) {
    this.stackId = stackId;
    this.agentType = agentType;
    this.llm = llm;
    this.memory = new ConvexMemoryProvider(convexUrl);
    this.messaging = new ConvexMessagingProvider(convexUrl);
    this.client = new ConvexClient(convexUrl);

    // Initialize MCP tools
    this.tools = new MCPToolClient({
      exaApiKey: process.env.EXA_API_KEY,
      cacheTTL: 1000 * 60 * 15, // 15 minutes
      maxCacheSize: 1000,
    });
  }

  // Abstract method that each agent must implement
  abstract think(): Promise<string>;

  // Optional method for detecting available work; default none
  async hasWork(): Promise<WorkStatus> {
    return {
      hasWork: false,
      type: "none",
      workDescription: "",
      priority: 0,
    };
  }

  // Process work when available (override for custom behavior)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async processWork(_workStatus: WorkStatus): Promise<string> {
    // Default implementation just calls think()
    return this.think();
  }

  // Handle no work situation (override for custom behavior)
  protected handleNoWork(): string {
    // Silent return, no LLM call, no trace
    return `${this.agentType}: Idle`;
  }

  // Log a trace for observability
  protected async logTrace(thought: string, action: string, result?: unknown) {
    await this.client.mutation(api.traces.log, {
      stack_id: this.stackId,
      agent_type: this.agentType,
      thought,
      action,
      result,
    });
  }

  // Get the current project idea
  protected async getProjectIdea() {
    return await this.client.query(api.project_ideas.get, {
      stackId: this.stackId,
    });
  }

  // Get pending todos
  protected async getPendingTodos() {
    return await this.client.query(api.todos.getPending, {
      stackId: this.stackId,
    });
  }

  // Get all todos
  protected async getAllTodos() {
    return await this.client.query(api.todos.list, {
      stackId: this.stackId,
    });
  }

  // Create a new todo
  protected async createTodo(content: string, priority: number = 3) {
    return await this.client.mutation(api.todos.create, {
      stack_id: this.stackId,
      content,
      assigned_by: this.agentType,
      priority,
    });
  }

  // Update todo status
  protected async updateTodoStatus(
    todoId: Id<"todos">,
    status: "pending" | "in_progress" | "completed" | "cancelled"
  ) {
    await this.client.mutation(api.todos.updateStatus, {
      todoId,
      status,
    });
  }

  // Get agent stack info
  protected async getStack() {
    return await this.client.query(api.agents.getStack, {
      stackId: this.stackId,
    });
  }

  // Update stack phase
  protected async updatePhase(phase: string) {
    await this.client.mutation(api.agents.updatePhase, {
      stackId: this.stackId,
      phase,
    });
  }

  // Build system prompt with context
  protected async buildSystemPrompt(roleDescription: string): Promise<string> {
    const stack = await this.getStack();
    const projectIdea = await this.getProjectIdea();
    const memory = await this.memory.getMemory(this.stackId, this.agentType);
    const context = await this.memory.getContext(this.stackId, this.agentType);

    return `
You are a ${this.agentType} agent for participant "${stack?.participant_name}" in the Recursor hackathon.

${roleDescription}

Current Phase: ${stack?.phase}

${projectIdea ? `Project Idea: ${projectIdea.title}\n${projectIdea.description}` : "No project idea yet."}

Your Memory:
- Facts: ${memory?.facts.join(", ") || "None yet"}
- Learnings: ${memory?.learnings.join(", ") || "None yet"}

Current Context:
- Active Task: ${context?.active_task || "None"}
- Focus: ${context?.focus || "General"}
- Recent Messages: ${context?.recent_messages.slice(-3).join(" | ") || "None"}

${this.tools.getToolsPrompt()}

Remember:
- You are participating in a live hackathon simulation
- Work autonomously but collaborate with other agents
- Be creative and productive
- Focus on building a working demo
- Use external tools when they can help you make better decisions or gather information
    `.trim();
  }

  /**
   * Check if the response contains a tool use directive
   */
  protected detectToolUse(response: string): boolean {
    return parseToolUse(response) !== null;
  }

  /**
   * Execute a tool based on the agent's response
   * Returns the tool result formatted for LLM consumption
   */
  protected async executeToolFromResponse(
    response: string
  ): Promise<string | null> {
    const toolUse = parseToolUse(response);

    if (!toolUse) {
      return null;
    }

    const { toolName, params } = toolUse;

    // Log that we're using a tool
    await this.logTrace(
      `Using tool: ${toolName}`,
      "tool_execution_start",
      { toolName, params }
    );

    try {
      const result = await this.tools.executeTool(toolName, params);

      // Log the result
      await this.logTrace(
        `Tool ${toolName} ${result.success ? "succeeded" : "failed"}`,
        "tool_execution_complete",
        result
      );

      return formatToolResultForLLM(toolName, result);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      await this.logTrace(
        `Tool ${toolName} threw exception`,
        "tool_execution_error",
        { error: errorMessage }
      );

      return `[${toolName} ERROR]\n${errorMessage}`;
    }
  }
}
