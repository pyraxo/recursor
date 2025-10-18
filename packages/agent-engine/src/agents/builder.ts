import { api } from "@recursor/convex/_generated/api";
import type { Id } from "@recursor/convex/_generated/dataModel";
import { HTMLBuilder } from "../artifacts/html-builder";
import { LLMProviders } from "../config";
import { BaseAgent } from "./base-agent";

export class BuilderAgent extends BaseAgent {
  private htmlBuilder: HTMLBuilder;

  constructor(
    stackId: Id<"agent_stacks">,
    llm: LLMProviders,
    convexUrl: string
  ) {
    super(stackId, "builder", llm, convexUrl);
    this.htmlBuilder = new HTMLBuilder(llm);
  }

  async think(): Promise<string> {
    const systemPrompt = await this.buildSystemPrompt(`
You are the Builder Agent. Your role is to:
- Execute todos created by the Planner
- Build working prototypes and artifacts
- Focus on HTML/JS single-file applications initially
- Create functional, visually appealing demos
- Update todo statuses as you work
    `);

    const pendingTodos = await this.getPendingTodos();
    const projectIdea = await this.getProjectIdea();
    const latestArtifact = await this.client.query(api.artifacts.getLatest, {
      stackId: this.stackId,
    });

    if (!pendingTodos || pendingTodos.length === 0) {
      const thought = "No pending todos. Waiting for Planner to assign work.";
      await this.logTrace(thought, "builder_think", { idle: true });
      return thought;
    }

    // Pick the highest priority todo
    const currentTodo = pendingTodos[0];
    if (!currentTodo) {
      const thought = "No current todo to work on.";
      await this.logTrace(thought, "builder_think", { idle: true });
      return thought;
    }

    const thoughtPrompt = `
Project: ${projectIdea?.title}
Description: ${projectIdea?.description}

Current Todo: ${currentTodo.content}
${latestArtifact ? `\nExisting Artifact Version: ${latestArtifact.version}` : "No artifacts yet"}

Should you build something for this todo?
Respond with:
- THOUGHT: Your reasoning
- ACTION: build_artifact | skip | wait
- BUILD_DETAILS: If building, what should you build?
  - Title
  - Description
  - Key requirements (list)
    `.trim();

    const messages = [
      { role: "system", content: systemPrompt },
      { role: "user", content: thoughtPrompt },
    ];

    const response = await this.llm.groqCompletion(messages);

    await this.logTrace(response, "builder_think", {
      todo: currentTodo.content,
      artifact_version: latestArtifact?.version || 0,
    });

    // Execute the action
    await this.executeAction(response, currentTodo._id);

    return response;
  }

  private async executeAction(response: string, todoId: Id<"todos">) {
    const actionMatch = response.match(/ACTION:\s*(.+)/i);
    if (!actionMatch || !actionMatch[1]) return;

    const action = actionMatch[1].trim().toLowerCase();

    if (action === "build_artifact") {
      await this.buildArtifact(response, todoId);
    } else if (action === "skip") {
      // Mark todo as completed
      await this.updateTodoStatus(todoId, "completed");
    }
  }

  private async buildArtifact(response: string, todoId: Id<"todos">) {
    // Extract build details
    const titleMatch = response.match(/Title:\s*(.+)/i);
    const descMatch = response.match(/Description:\s*(.+)/i);
    const requirementsSection = response.match(
      /Key requirements:?\s*([\s\S]+?)(?=\n\n|$)/i
    );

    const title = titleMatch?.[1]?.trim() || "Hackathon Project";
    const description =
      descMatch?.[1]?.trim() || "A project built during the hackathon";

    let requirements: string[] = [];
    if (requirementsSection && requirementsSection[1]) {
      requirements = requirementsSection[1]
        .split("\n")
        .map((line) => line.replace(/^[-*]\s*/, "").trim())
        .filter((line) => line.length > 0);
    }

    await this.logTrace(`Building artifact: ${title}`, "build_artifact_start", {
      title,
      requirements,
    });

    // Mark todo as in progress
    await this.updateTodoStatus(todoId, "in_progress");

    try {
      // Build the artifact
      const result = await this.htmlBuilder.build({
        title,
        description,
        requirements,
        techStack: ["HTML", "CSS", "JavaScript"],
      });

      // Save to Convex
      await this.client.mutation(api.artifacts.create, {
        stack_id: this.stackId,
        type: "html_js",
        content: result.content,
        metadata: result.metadata,
      });

      // Mark todo as completed
      await this.updateTodoStatus(todoId, "completed");

      await this.logTrace(
        `Successfully built artifact: ${title}`,
        "build_artifact_complete",
        { build_time_ms: result.metadata.build_time_ms }
      );
    } catch (error) {
      await this.logTrace(
        `Failed to build artifact: ${error}`,
        "build_artifact_error",
        { error: String(error) }
      );

      // Mark todo as pending again
      await this.updateTodoStatus(todoId, "pending");
    }
  }

  async refineArtifact(feedback: string[]) {
    const latestArtifact = await this.client.query(api.artifacts.getLatest, {
      stackId: this.stackId,
    });

    if (!latestArtifact || !latestArtifact.content) {
      await this.logTrace("No artifact to refine", "refine_artifact_skip");
      return;
    }

    await this.logTrace(
      `Refining artifact based on feedback`,
      "refine_artifact_start",
      { feedback }
    );

    try {
      const result = await this.htmlBuilder.refine(
        latestArtifact.content,
        feedback
      );

      await this.client.mutation(api.artifacts.create, {
        stack_id: this.stackId,
        type: "html_js",
        content: result.content,
        metadata: result.metadata,
      });

      await this.logTrace(
        `Successfully refined artifact`,
        "refine_artifact_complete",
        { build_time_ms: result.metadata.build_time_ms }
      );
    } catch (error) {
      await this.logTrace(
        `Failed to refine artifact: ${error}`,
        "refine_artifact_error",
        { error: String(error) }
      );
    }
  }
}
