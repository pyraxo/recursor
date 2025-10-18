import { api } from "@recursor/convex/_generated/api";
import type { Id } from "@recursor/convex/_generated/dataModel";
import { LLMProviders } from "../config";
import { BaseAgent } from "./base-agent";

export class ReviewerAgent extends BaseAgent {
  constructor(
    stackId: Id<"agent_stacks">,
    llm: LLMProviders,
    convexUrl: string
  ) {
    super(stackId, "reviewer", llm, convexUrl);
  }

  async think(): Promise<string> {
    const systemPrompt = await this.buildSystemPrompt(`
You are the Reviewer Agent. Your role is to:
- Review feedback collected by the Communicator
- Analyze project progress and quality
- Generate recommendations for the Planner
- Identify risks and opportunities
- Ensure the project stays competitive
    `);

    const projectIdea = await this.getProjectIdea();
    const todos = await this.getAllTodos();
    const completedTodos = todos?.filter((t) => t.status === "completed") || [];
    const latestArtifact = await this.client.query(api.artifacts.getLatest, {
      stackId: this.stackId,
    });

    // Get feedback from communicator
    const context = await this.memory.getContext(this.stackId, this.agentType);
    const feedbackMessages =
      context?.recent_messages.filter((msg) => msg.includes("FEEDBACK:")) || [];

    const thoughtPrompt = `
Review the current project state:

Project: ${projectIdea?.title}
Status: ${projectIdea?.status}

Progress:
- Completed Todos: ${completedTodos.length}
- Total Todos: ${todos?.length || 0}
- Artifacts Built: ${latestArtifact ? latestArtifact.version : 0}

Feedback from Communicator:
${feedbackMessages.length > 0 ? feedbackMessages.join("\n") : "No feedback yet"}

Provide your analysis:
- THOUGHT: Your assessment of progress and quality
- RISKS: Any risks or concerns
- OPPORTUNITIES: Opportunities for improvement
- RECOMMENDATIONS: Specific actionable advice for the Planner
    `.trim();

    const messages = [
      { role: "system", content: systemPrompt },
      { role: "user", content: thoughtPrompt },
    ];

    const response = await this.llm.groqCompletion(messages);

    await this.logTrace(response, "reviewer_think", {
      completed_todos: completedTodos.length,
      feedback_count: feedbackMessages.length,
    });

    // Extract and store recommendations
    await this.processReview(response);

    return response;
  }

  private async processReview(response: string) {
    // Extract recommendations
    const recommendationsMatch = response.match(
      /RECOMMENDATIONS:\s*([\s\S]+?)(?=\n\n|$)/i
    );

    if (recommendationsMatch && recommendationsMatch[1]) {
      const recommendations = recommendationsMatch[1].trim();

      // Store as a learning
      await this.memory.addLearning(
        this.stackId,
        this.agentType,
        recommendations
      );

      await this.logTrace(
        "Stored recommendations for planner",
        "process_review",
        { recommendations }
      );
    }

    // Extract risks
    const risksMatch = response.match(
      /RISKS:\s*([\s\S]+?)(?=OPPORTUNITIES:|RECOMMENDATIONS:|$)/i
    );
    if (risksMatch && risksMatch[1]) {
      const risks = risksMatch[1].trim();
      await this.memory.addFact(
        this.stackId,
        this.agentType,
        `RISKS: ${risks}`
      );
    }
  }

  async getRecommendationsForPlanner(): Promise<string[]> {
    // Get learnings which contain recommendations
    const memory = await this.memory.getMemory(this.stackId, this.agentType);
    return memory?.learnings || [];
  }

  async analyzeArtifact(): Promise<string> {
    const latestArtifact = await this.client.query(api.artifacts.getLatest, {
      stackId: this.stackId,
    });

    if (!latestArtifact) {
      return "No artifact to review yet.";
    }

    const systemPrompt = await this.buildSystemPrompt(`
You are the Reviewer Agent analyzing the latest build artifact.
    `);

    const thoughtPrompt = `
Review the latest artifact:

Type: ${latestArtifact.type}
Version: ${latestArtifact.version}
Build Time: ${latestArtifact.metadata.build_time_ms}ms
${latestArtifact.metadata.description ? `Description: ${latestArtifact.metadata.description}` : ""}

${latestArtifact.content ? `Content Preview (first 500 chars):\n${latestArtifact.content.substring(0, 500)}...` : ""}

Provide your review:
- QUALITY: Assessment of code quality
- FUNCTIONALITY: Does it meet requirements?
- IMPROVEMENTS: Specific suggestions for improvement
    `.trim();

    const messages = [
      { role: "system", content: systemPrompt },
      { role: "user", content: thoughtPrompt },
    ];

    const response = await this.llm.groqCompletion(messages);

    await this.logTrace(response, "review_artifact", {
      version: latestArtifact.version,
    });

    // Extract improvements as feedback
    const improvementsMatch = response.match(
      /IMPROVEMENTS:\s*([\s\S]+?)(?=\n\n|$)/i
    );
    if (improvementsMatch && improvementsMatch[1]) {
      const improvements = improvementsMatch[1].trim();
      await this.memory.addRecentMessage(
        this.stackId,
        this.agentType,
        `ARTIFACT FEEDBACK: ${improvements}`
      );
    }

    return response;
  }
}
