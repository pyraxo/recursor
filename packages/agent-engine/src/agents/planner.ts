import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { LLMProviders } from "../config";
import { BaseAgent } from "./base-agent";

export class PlannerAgent extends BaseAgent {
  constructor(
    stackId: Id<"agent_stacks">,
    llm: LLMProviders,
    convexUrl: string
  ) {
    super(stackId, "planner", llm, convexUrl);
  }

  async think(): Promise<string> {
    const systemPrompt = await this.buildSystemPrompt(`
You are the Planner Agent. Your role is to:
- Define the project strategy and roadmap
- Create and prioritize todos for the Builder
- Make high-level decisions about the project direction
- Adapt plans based on feedback from the Reviewer
- Ensure the project stays on track for demo
    `);

    const todos = await this.getAllTodos();
    const context = await this.memory.getContext(this.stackId, this.agentType);

    const thoughtPrompt = `
Analyze the current project state and decide what to do next.

Current Todos (${todos?.length || 0}):
${todos?.map((t) => `- [${t.status}] ${t.content} (priority: ${t.priority})`).join("\n") || "No todos yet"}

Context:
${context?.focus ? `Current Focus: ${context.focus}` : ""}

Based on this, what should you do?
Options:
1. Create new todos if project needs more work
2. Adjust priorities if needed
3. Change phase if ready to move forward
4. Refine project idea if needed

Respond with:
- THOUGHT: Your reasoning
- ACTION: What you'll do (create_todos | adjust_plan | change_phase | refine_idea)
- DETAILS: Specific details (e.g., new todo contents, new phase name)
    `.trim();

    const messages = [
      { role: "system", content: systemPrompt },
      { role: "user", content: thoughtPrompt },
    ];

    const response = await this.llm.groqCompletion(messages);

    await this.logTrace(response, "planner_think", {
      todos: todos?.length,
      phase: (await this.getStack())?.phase,
    });

    // Parse and execute the action
    await this.executeAction(response);

    return response;
  }

  private async executeAction(response: string) {
    const actionMatch = response.match(/ACTION:\s*(.+)/i);
    const detailsMatch = response.match(/DETAILS:\s*([\s\S]+)/i);

    if (!actionMatch) return;

    const action = (actionMatch[1] || "").trim().toLowerCase();
    const details = (detailsMatch?.[1] || "").trim();

    switch (action) {
      case "create_todos":
        await this.createTodosFromDetails(details || "");
        break;

      case "change_phase": {
        const phaseMatch = details.match(/phase:\s*(\w+)/i);
        if (phaseMatch && phaseMatch[1]) {
          await this.updatePhase(phaseMatch[1]);
        }
        break;
      }

      case "refine_idea":
        // Update focus to refinement
        await this.memory.setFocus(
          this.stackId,
          this.agentType,
          "refining_idea"
        );
        break;

      default:
        // No specific action
        break;
    }
  }

  private async createTodosFromDetails(details: string) {
    // Extract todo items from details
    const todoMatches = details.match(/[-*]\s*(.+?)(?=\n|$)/g) || [];

    for (let i = 0; i < todoMatches.length; i++) {
      const raw = todoMatches[i];
      if (!raw) continue;
      const todoContent = raw.replace(/^[-*]\s*/, "").trim();
      if (!todoContent) continue;
      const priority = todoMatches.length - i; // Earlier todos have higher priority
      await this.createTodo(todoContent, priority);
    }
  }

  async receiveAdvice(advice: string) {
    // Store advice from Reviewer in context
    await this.memory.addRecentMessage(
      this.stackId,
      this.agentType,
      `REVIEWER ADVICE: ${advice}`
    );

    await this.logTrace(
      `Received advice from reviewer: ${advice}`,
      "receive_advice"
    );
  }

  async initialize() {
    // Initialize the project with first set of todos
    const projectIdea = await this.getProjectIdea();

    if (!projectIdea) {
      // Create a project idea first
      await this.client.mutation(api.project_ideas.create, {
        stack_id: this.stackId,
        title: "Hackathon Project",
        description: "A project to be defined during ideation",
        created_by: this.agentType,
      });
    }

    // Create initial todos
    const existingTodos = await this.getPendingTodos();
    if (!existingTodos || existingTodos.length === 0) {
      await this.createTodo("Define project concept and goals", 5);
      await this.createTodo("Identify key features", 4);
      await this.createTodo("Create initial prototype", 3);
    }

    await this.logTrace(
      "Initialized planner with project idea and initial todos",
      "initialize"
    );
  }
}
