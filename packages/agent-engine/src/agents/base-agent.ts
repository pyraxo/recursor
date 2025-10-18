import { ConvexClient } from "convex/browser";
import { api } from "@recursor/convex/_generated/api";
import type { Id } from "@recursor/convex/_generated/dataModel";
import { LLMProviders } from "../config";
import { ConvexMemoryProvider } from "../memory/convex-memory";
import { ConvexMessagingProvider } from "../messaging/convex-messages";

export abstract class BaseAgent {
  protected stackId: Id<"agent_stacks">;
  protected agentType: string;
  protected llm: LLMProviders;
  protected memory: ConvexMemoryProvider;
  protected messaging: ConvexMessagingProvider;
  protected client: ConvexClient;

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
  }

  // Abstract method that each agent must implement
  abstract think(): Promise<string>;

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

Remember:
- You are participating in a live hackathon simulation
- Work autonomously but collaborate with other agents
- Be creative and productive
- Focus on building a working demo
    `.trim();
  }
}
