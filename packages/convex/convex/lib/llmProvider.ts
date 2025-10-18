/**
 * LLM Provider for Convex Actions
 *
 * This module provides LLM capabilities within Convex actions,
 * supporting multiple providers with automatic fallback.
 *
 * IMPORTANT: Environment variables must be set through Convex dashboard:
 * npx convex env set GROQ_API_KEY <your-key>
 * npx convex env set OPENAI_API_KEY <your-key>
 * npx convex env set GEMINI_API_KEY <your-key>
 */

import { prompts } from "@recursor/prompts";

export interface Message {
  role: "system" | "user" | "assistant";
  content: string;
}

// Structured action types for agent responses
export interface TodoAction {
  type: "create_todo" | "update_todo" | "delete_todo" | "clear_all_todos" | "update_project";
  content?: string; // For create and delete
  oldContent?: string; // For update
  newContent?: string; // For update
  priority?: number;
  reason?: string; // For clear_all_todos - why we're clearing
  // For update_project
  title?: string; // New project title (optional)
  description?: string; // New/updated project description
}

export interface PlannerResult {
  thinking: string; // Conversational thoughts about what to do
  actions: TodoAction[]; // Structured actions to perform
}

export interface ChatOptions {
  temperature?: number;
  max_tokens?: number;
  model?: string;
  stream?: boolean;
  json_mode?: boolean; // Request JSON output
}

export interface LLMResponse {
  content: string;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  model?: string;
  provider?: string;
}

/**
 * Primary provider: Groq (fast, cost-effective)
 */
async function callGroq(
  messages: Message[],
  options: ChatOptions = {}
): Promise<LLMResponse> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error("GROQ_API_KEY not configured in Convex environment");
  }

  const requestBody: any = {
    model: options.model || "llama-3.3-70b-versatile",
    messages,
    temperature: options.temperature ?? 0.7,
    max_tokens: options.max_tokens || 2000,
    stream: false, // Convex actions don't support streaming
  };

  // Enable JSON mode if requested
  if (options.json_mode) {
    requestBody.response_format = { type: "json_object" };
  }

  const response = await fetch(
    "https://api.groq.com/openai/v1/chat/completions",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Groq API error: ${response.status} - ${error}`);
  }

  const data = await response.json();

  return {
    content: data.choices[0]?.message?.content || "",
    usage: data.usage,
    model: data.model,
    provider: "groq",
  };
}

/**
 * Fallback provider: OpenAI (reliable, more expensive)
 */
async function callOpenAI(
  messages: Message[],
  options: ChatOptions = {}
): Promise<LLMResponse> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY not configured in Convex environment");
  }

  const requestBody: any = {
    model: options.model || "gpt-4o-mini",
    messages,
    temperature: options.temperature ?? 0.7,
    max_tokens: options.max_tokens || 2000,
    stream: false,
  };

  // Enable JSON mode if requested
  if (options.json_mode) {
    requestBody.response_format = { type: "json_object" };
  }

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenAI API error: ${response.status} - ${error}`);
  }

  const data = await response.json();

  return {
    content: data.choices[0]?.message?.content || "",
    usage: data.usage,
    model: data.model,
    provider: "openai",
  };
}

/**
 * Alternative provider: Google Gemini
 */
async function callGemini(
  messages: Message[],
  options: ChatOptions = {}
): Promise<LLMResponse> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY not configured in Convex environment");
  }

  // Convert messages to Gemini format
  const contents = messages.map((msg) => ({
    role: msg.role === "assistant" ? "model" : "user",
    parts: [{ text: msg.content }],
  }));

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents,
        generationConfig: {
          temperature: options.temperature ?? 0.7,
          maxOutputTokens: options.max_tokens || 2000,
        },
      }),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Gemini API error: ${response.status} - ${error}`);
  }

  const data = await response.json();

  return {
    content: data.candidates[0]?.content?.parts[0]?.text || "",
    model: "gemini-2.0-flash-exp",
    provider: "gemini",
  };
}

/**
 * Main LLM provider with automatic fallback
 */
export class ConvexLLMProvider {
  private maxRetries = 2;
  private retryDelay = 1000; // ms

  async chat(
    messages: Message[],
    options: ChatOptions = {}
  ): Promise<LLMResponse> {
    const providers = [
      { name: "groq", fn: callGroq },
      { name: "openai", fn: callOpenAI },
      { name: "gemini", fn: callGemini },
    ];

    let lastError: Error | null = null;

    for (const provider of providers) {
      for (let attempt = 0; attempt < this.maxRetries; attempt++) {
        try {
          console.log(`Attempting ${provider.name} (attempt ${attempt + 1})`);
          const response = await provider.fn(messages, options);
          console.log(`Success with ${provider.name}`);
          return response;
        } catch (error) {
          lastError = error as Error;
          console.error(`${provider.name} failed:`, error);

          // Wait before retry (except on last attempt)
          if (attempt < this.maxRetries - 1) {
            await new Promise((resolve) =>
              setTimeout(resolve, this.retryDelay)
            );
          }
        }
      }
    }

    throw new Error(
      `All LLM providers failed. Last error: ${lastError?.message}`
    );
  }

  /**
   * Helper method to build system prompts using centralized prompt management
   */
  buildSystemPrompt(role: string, context: any, useStructuredOutput: boolean = false): Message {
    // Map role to prompt accessor
    const agentPromptMap: Record<string, any> = {
      planner: prompts.agent.plannerAgent,
      builder: prompts.agent.builderAgent,
      communicator: prompts.agent.communicatorAgent,
      reviewer: prompts.agent.reviewerAgent,
    };

    const promptAccessor = agentPromptMap[role];
    if (!promptAccessor) {
      throw new Error(`Unknown agent role: ${role}. Available roles: ${Object.keys(agentPromptMap).join(", ")}`);
    }

    // Prepare variables for rendering
    const variables: Record<string, any> = {
      teamName: context.teamName || "Team",
      projectTitle: context.projectTitle || "figuring out what to build",
      phase: context.phase || "ideation",
      todoCount: context.todoCount || 0,
    };

    // Add useStructuredOutput for planner
    if (role === "planner") {
      variables.useStructuredOutput = useStructuredOutput;
    }

    // Render the prompt
    const content = promptAccessor.render(variables);

    return {
      role: "system",
      content,
    };
  }

  /**
   * DEPRECATED: Legacy method - now using centralized prompt management
   * Kept for reference during transition period
   * @deprecated Use buildSystemPrompt() instead, which uses @recursor/prompts package
   */
  private getRoleDescription(role: string, useStructuredOutput: boolean = false): string {
    // All role descriptions now managed in packages/prompts/prompts/agents/
    throw new Error(
      `getRoleDescription() is deprecated. Role prompts are now managed in @recursor/prompts package. ` +
      `Use buildSystemPrompt() instead.`
    );
  }

  /**
   * Parse agent responses for actions
   */
  parseAgentResponse(response: string, agentType: string): any {
    // Extract JSON if present
    const jsonMatch = response.match(/```json\n?([\s\S]*?)\n?```/);
    if (jsonMatch?.[1]) {
      try {
        return JSON.parse(jsonMatch[1]);
      } catch (e) {
        console.warn("Failed to parse JSON from response");
      }
    }

    // Extract actions using regex patterns
    const actions: any = {
      thoughts: response,
      actions: [],
    };

    // Agent-specific parsing
    switch (agentType) {
      case "planner":
        // Look for todo creation patterns - support multiple formats
        const todoPatterns = [
          /TODO:\s*(.+)/gi,                           // TODO: <content>
          /TASK:\s*(.+)/gi,                           // TASK: <content>
          /Create(?:\s+todo)?:\s*(.+)/gi,             // Create: <content> or Create todo: <content>
          /^[-*]\s+(.+?)(?:\s*\((?:TODO|TASK)\))?$/gim, // - <content> or - <content> (TODO)
          /^\d+\.\s+(.+?)(?:\s*\((?:TODO|TASK)\))?$/gim, // 1. <content> or 1. <content> (TODO)
        ];

        // Look for UPDATE_TODO patterns
        // UPDATE_TODO: "old content" -> "new content"
        // UPDATE_TODO: "content" PRIORITY: 9
        const updatePattern = /UPDATE_TODO:\s*"([^"]+)"(?:\s*->\s*"([^"]+)"|(?:\s+PRIORITY:\s*(\d+)))/gi;

        // Look for DELETE_TODO patterns
        // DELETE_TODO: "content to delete"
        const deletePattern = /DELETE_TODO:\s*"([^"]+)"/gi;

        const foundTodos = new Set<string>(); // Avoid duplicates

        // Parse CREATE actions
        for (const pattern of todoPatterns) {
          const matches = response.matchAll(pattern);
          for (const match of matches) {
            if (match[1]) {
              const content = match[1].trim();
              // Filter out very short or non-actionable items, and skip UPDATE/DELETE commands
              if (
                content.length > 5 &&
                !foundTodos.has(content.toLowerCase()) &&
                !content.startsWith("UPDATE_TODO") &&
                !content.startsWith("DELETE_TODO")
              ) {
                foundTodos.add(content.toLowerCase());
                actions.actions.push({
                  type: "create_todo",
                  content: content,
                  priority: 5,
                });
              }
            }
          }
        }

        // Parse UPDATE actions
        const updateMatches = response.matchAll(updatePattern);
        for (const match of updateMatches) {
          const oldContent = match[1]?.trim();
          const newContent = match[2]?.trim();
          const priority = match[3] ? parseInt(match[3]) : undefined;

          if (oldContent) {
            actions.actions.push({
              type: "update_todo",
              oldContent,
              newContent: newContent || undefined,
              priority: priority,
            });
          }
        }

        // Parse DELETE actions
        const deleteMatches = response.matchAll(deletePattern);
        for (const match of deleteMatches) {
          const content = match[1]?.trim();
          if (content) {
            actions.actions.push({
              type: "delete_todo",
              content,
            });
          }
        }

        console.log(`[Parser] Found ${actions.actions.length} todo actions from planner response`);
        console.log(`[Parser] Breakdown: ${
          actions.actions.filter((a: any) => a.type === "create_todo").length
        } creates, ${
          actions.actions.filter((a: any) => a.type === "update_todo").length
        } updates, ${
          actions.actions.filter((a: any) => a.type === "delete_todo").length
        } deletes`);

        if (actions.actions.length === 0) {
          console.warn("[Parser] No actions found. Response:", response.substring(0, 200));
        }
        break;

      case "builder":
        // Look for artifact creation
        if (response.includes("```html") || response.includes("<!DOCTYPE")) {
          const htmlMatch = response.match(/```html\n?([\s\S]*?)\n?```/);
          if (htmlMatch) {
            actions.actions.push({
              type: "create_artifact",
              content: htmlMatch[1],
              format: "html",
            });
          }
        }
        break;

      case "communicator":
        // Look for message patterns
        if (
          response.toLowerCase().includes("broadcast:") ||
          response.toLowerCase().includes("message:")
        ) {
          actions.actions.push({
            type: "send_message",
            content: response,
          });
        }
        break;

      case "reviewer":
        // Look for recommendations
        const recommendations = response
          .split("\n")
          .filter((line) => line.match(/^[-*•]\s+/))
          .map((line) => line.replace(/^[-*•]\s+/, ""));

        if (recommendations.length > 0) {
          actions.recommendations = recommendations;
        }
        break;
    }

    return actions;
  }
}

/**
 * Singleton instance for use in Convex actions
 */
export const llmProvider = new ConvexLLMProvider();