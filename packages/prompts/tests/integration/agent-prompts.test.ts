/**
 * Integration tests for agent prompts
 * Tests that prompts render correctly and match expected output
 */

import { describe, it, expect } from "vitest";
import { prompts } from "../../src/index.js";

describe("Agent Prompts Integration", () => {
  describe("PlannerAgent", () => {
    it("renders with minimal variables", () => {
      const result = prompts.agent.plannerAgent.render({
        teamName: "TestTeam",
      });

      expect(result).toContain("TestTeam");
      expect(result).toContain("figuring out what to build"); // default projectTitle
      expect(result).toContain("ideation"); // default phase
      expect(result).toContain("0 tasks"); // default todoCount
    });

    it("renders with structured output enabled", () => {
      const result = prompts.agent.plannerAgent.render({
        teamName: "TestTeam",
        useStructuredOutput: true,
      });

      expect(result).toContain("JSON");
      expect(result).toContain("thinking");
      expect(result).toContain("actions");
      expect(result).toContain("create_todo");
    });

    it("renders without structured output", () => {
      const result = prompts.agent.plannerAgent.render({
        teamName: "TestTeam",
        useStructuredOutput: false,
      });

      expect(result).not.toContain("JSON");
      expect(result).toContain("manage the todo list");
    });

    it("validates required fields", () => {
      const validation = prompts.agent.plannerAgent.validate({
        teamName: "Test",
      });

      expect(validation.valid).toBe(true);
    });
  });

  describe("BuilderAgent", () => {
    it("renders with all variables", () => {
      const result = prompts.agent.builderAgent.render({
        teamName: "BuilderBots",
        projectTitle: "AI Calendar",
        phase: "building",
        todoCount: 5,
      });

      expect(result).toContain("BuilderBots");
      expect(result).toContain("AI Calendar");
      expect(result).toContain("building");
      expect(result).toContain("5 tasks");
      expect(result).toContain("write code");
      expect(result).toContain("HTML");
    });

    it("applies default values", () => {
      const result = prompts.agent.builderAgent.render({});

      expect(result).toContain("Team");
      expect(result).toContain("figuring out what to build");
      expect(result).toContain("ideation");
    });
  });

  describe("CommunicatorAgent", () => {
    it("renders with context", () => {
      const result = prompts.agent.communicatorAgent.render({
        teamName: "ChatBots",
        projectTitle: "Social Network",
        phase: "demo",
        todoCount: 2,
      });

      expect(result).toContain("ChatBots");
      expect(result).toContain("Social Network");
      expect(result).toContain("demo");
      expect(result).toContain("messages");
      expect(result).toContain("broadcast");
    });
  });

  describe("ReviewerAgent", () => {
    it("renders with instructions", () => {
      const result = prompts.agent.reviewerAgent.render({
        teamName: "CodeReviewers",
        projectTitle: "E-commerce Site",
      });

      expect(result).toContain("CodeReviewers");
      expect(result).toContain("E-commerce Site");
      expect(result).toContain("review code");
      expect(result).toContain("RECOMMENDATION");
      expect(result).toContain("bugs");
      expect(result).toContain("security");
    });
  });

  describe("Prompt Consistency", () => {
    it("all agent prompts have consistent structure", () => {
      const agents = [
        prompts.agent.plannerAgent,
        prompts.agent.builderAgent,
        prompts.agent.communicatorAgent,
        prompts.agent.reviewerAgent,
      ];

      for (const agent of agents) {
        expect(agent.name).toBeDefined();
        expect(agent.version).toBe("1.0.0");
        expect(agent.description).toBeDefined();
        expect(agent.tags).toContain("agent");
        expect(agent.metadata).toBeDefined();
      }
    });

    it("all agent prompts mention hackathon", () => {
      const agents = [
        prompts.agent.plannerAgent,
        prompts.agent.builderAgent,
        prompts.agent.communicatorAgent,
        prompts.agent.reviewerAgent,
      ];

      for (const agent of agents) {
        const rendered = agent.render({});
        expect(rendered.toLowerCase()).toContain("hackathon");
      }
    });

    it("all agent prompts are motivational", () => {
      const agents = [
        prompts.agent.plannerAgent,
        prompts.agent.builderAgent,
        prompts.agent.communicatorAgent,
        prompts.agent.reviewerAgent,
      ];

      for (const agent of agents) {
        const rendered = agent.render({});
        expect(rendered).toContain("Keep it moving");
      }
    });
  });
});

describe("Cursor Unified Prompt", () => {
  it("renders with all responsibilities", () => {
    const result = prompts.cursor.cursorUnifiedPrompt.render(
      {
        participantName: "CursorTeam",
        projectTitle: "Hackathon Project",
        projectDescription: "An innovative solution",
        phase: "building",
        artifactCount: 3,
      },
      { strict: false }
    );

    expect(result).toContain("CursorTeam");
    expect(result).toContain("Hackathon Project");
    expect(result).toContain("An innovative solution");
    expect(result).toContain("building");
    expect(result).toContain("3 versions");
    expect(result).toContain("Planning (Planner Role)");
    expect(result).toContain("Building (Builder Role)");
    expect(result).toContain("Communication (Communicator Role)");
    expect(result).toContain("Review (Reviewer Role)");
  });

  it("renders todos when provided", () => {
    const result = prompts.cursor.cursorUnifiedPrompt.render(
      {
        participantName: "Team",
        todos: [
          { content: "Implement authentication", priority: 10 },
          { content: "Add database schema", priority: 8 },
        ],
      },
      { strict: false }
    );

    expect(result).toContain("Current Todos");
    expect(result).toContain("Implement authentication");
    expect(result).toContain("Add database schema");
  });

  it("renders messages when provided", () => {
    const result = prompts.cursor.cursorUnifiedPrompt.render(
      {
        participantName: "Team",
        messages: [
          { from: "User1", content: "Great progress!" },
          { from: "Judge", content: "How's the demo coming?" },
        ],
      },
      { strict: false }
    );

    expect(result).toContain("Recent Messages");
    expect(result).toContain("User1");
    expect(result).toContain("Great progress!");
    expect(result).toContain("Judge");
  });
});

describe("Tool Instructions", () => {
  it("renders with tool descriptions", () => {
    const toolDesc = `### search_web\nSearch the web for information`;
    const result = prompts.tool.toolInstructions.render({
      toolDescriptions: toolDesc,
    });

    expect(result).toContain("External Tools Available");
    expect(result).toContain("search_web");
    expect(result).toContain("TOOL_USE");
    expect(result).toContain("PARAMS");
  });

  it("renders empty when no tools", () => {
    const result = prompts.tool.toolInstructions.render({
      toolDescriptions: "",
    });

    expect(result).toBe("");
  });
});

describe("HTML Builder Prompt", () => {
  it("renders with requirements", () => {
    const result = prompts.builder.htmlBuilder.render(
      {
        title: "Todo App",
        description: "A simple todo application",
        requirements: [
          "Add new todos",
          "Mark todos as complete",
          "Delete todos",
        ],
      },
      { strict: false }
    );

    expect(result).toContain("Todo App");
    expect(result).toContain("A simple todo application");
    expect(result).toContain("Add new todos");
    expect(result).toContain("Mark todos as complete");
    expect(result).toContain("Delete todos");
    expect(result).toContain("SINGLE HTML file");
  });

  it("renders with tech stack", () => {
    const result = prompts.builder.htmlBuilder.render(
      {
        title: "Dashboard",
        description: "Analytics dashboard",
        requirements: ["Display charts"],
        techStack: ["React", "Chart.js", "Tailwind CSS"],
      },
      { strict: false }
    );

    expect(result).toContain("Tech Stack");
    expect(result).toContain("React");
    expect(result).toContain("Chart.js");
    expect(result).toContain("Tailwind CSS");
  });

  it("validates required fields", () => {
    const validation = prompts.builder.htmlBuilder.validate({
      title: "Test",
      description: "Test description",
      requirements: ["Req 1"],
    });

    expect(validation.valid).toBe(true);
  });

  it("fails validation without required fields", () => {
    const validation = prompts.builder.htmlBuilder.validate({
      title: "Test",
      // missing description and requirements
    });

    expect(validation.valid).toBe(false);
    expect(validation.errors.length).toBeGreaterThan(0);
  });
});
