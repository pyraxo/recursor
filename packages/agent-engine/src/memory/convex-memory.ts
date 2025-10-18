import { ConvexClient } from "convex/browser";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";

export interface AgentMemory {
  facts: string[];
  learnings: string[];
}

export interface AgentContext {
  active_task?: string;
  recent_messages: string[];
  focus?: string;
}

export class ConvexMemoryProvider {
  private client: ConvexClient;

  constructor(convexUrl: string) {
    this.client = new ConvexClient(convexUrl);
  }

  async getMemory(
    stackId: Id<"agent_stacks">,
    agentType: string
  ): Promise<AgentMemory | null> {
    const state = await this.client.query(api.agents.getAgentState, {
      stackId,
      agentType,
    });

    return state?.memory || null;
  }

  async getContext(
    stackId: Id<"agent_stacks">,
    agentType: string
  ): Promise<AgentContext | null> {
    const state = await this.client.query(api.agents.getAgentState, {
      stackId,
      agentType,
    });

    return state?.current_context || null;
  }

  async updateMemory(
    stackId: Id<"agent_stacks">,
    agentType: string,
    memory: AgentMemory
  ): Promise<void> {
    await this.client.mutation(api.agents.updateAgentState, {
      stackId,
      agentType,
      memory,
    });
  }

  async updateContext(
    stackId: Id<"agent_stacks">,
    agentType: string,
    context: AgentContext
  ): Promise<void> {
    await this.client.mutation(api.agents.updateAgentState, {
      stackId,
      agentType,
      currentContext: context,
    });
  }

  async addFact(
    stackId: Id<"agent_stacks">,
    agentType: string,
    fact: string
  ): Promise<void> {
    const memory = await this.getMemory(stackId, agentType);
    if (memory) {
      memory.facts.push(fact);
      await this.updateMemory(stackId, agentType, memory);
    }
  }

  async addLearning(
    stackId: Id<"agent_stacks">,
    agentType: string,
    learning: string
  ): Promise<void> {
    const memory = await this.getMemory(stackId, agentType);
    if (memory) {
      memory.learnings.push(learning);
      await this.updateMemory(stackId, agentType, memory);
    }
  }

  async addRecentMessage(
    stackId: Id<"agent_stacks">,
    agentType: string,
    message: string,
    maxMessages = 10
  ): Promise<void> {
    const context = await this.getContext(stackId, agentType);
    if (context) {
      context.recent_messages.push(message);
      // Keep only last N messages
      if (context.recent_messages.length > maxMessages) {
        context.recent_messages = context.recent_messages.slice(-maxMessages);
      }
      await this.updateContext(stackId, agentType, context);
    }
  }

  async setActiveTas(
    stackId: Id<"agent_stacks">,
    agentType: string,
    task: string
  ): Promise<void> {
    const context = await this.getContext(stackId, agentType);
    if (context) {
      context.active_task = task;
      await this.updateContext(stackId, agentType, context);
    }
  }

  async setFocus(
    stackId: Id<"agent_stacks">,
    agentType: string,
    focus: string
  ): Promise<void> {
    const context = await this.getContext(stackId, agentType);
    if (context) {
      context.focus = focus;
      await this.updateContext(stackId, agentType, context);
    }
  }
}
