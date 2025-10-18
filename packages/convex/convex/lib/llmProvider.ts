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

export interface Message {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface ChatOptions {
  temperature?: number;
  max_tokens?: number;
  model?: string;
  stream?: boolean;
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

  const response = await fetch(
    "https://api.groq.com/openai/v1/chat/completions",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: options.model || "llama-3.3-70b-versatile",
        messages,
        temperature: options.temperature ?? 0.7,
        max_tokens: options.max_tokens || 2000,
        stream: false, // Convex actions don't support streaming
      }),
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

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: options.model || "gpt-4o-mini",
      messages,
      temperature: options.temperature ?? 0.7,
      max_tokens: options.max_tokens || 2000,
      stream: false,
    }),
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
   * Helper method to build system prompts
   */
  buildSystemPrompt(role: string, context: any): Message {
    return {
      role: "system",
      content: `You are a ${role} agent in the Recursor hackathon simulation.

Current context:
- Project: ${context.projectTitle || "Not yet defined"}
- Phase: ${context.phase || "Ideation"}
- Todos: ${context.todoCount || 0} tasks
- Team: ${context.teamName || "Team"}

Your role is to ${this.getRoleDescription(role)}

Remember:
- Be creative and productive
- Work autonomously but collaborate
- Focus on building a working demo
- Make decisions quickly and move forward`,
    };
  }

  private getRoleDescription(role: string): string {
    switch (role) {
      case "planner":
        return `create strategic plans, define todos, and coordinate the team's efforts.

You have full control over the todo list and can:
- CREATE new todos
- UPDATE existing todos (modify content or priority)
- DELETE todos that are no longer needed

IMPORTANT: Use these exact formats for todo management:

CREATE a new todo:
TODO: <description of the task>

UPDATE an existing todo (reference it by content):
UPDATE_TODO: "<exact current content>" -> "<new content>"
or
UPDATE_TODO: "<exact current content>" PRIORITY: <1-10>

DELETE a todo (reference it by content):
DELETE_TODO: "<exact content of todo to delete>"

Examples:
TODO: Set up project file structure
TODO: Create basic HTML layout
UPDATE_TODO: "Create basic HTML layout" -> "Create responsive HTML layout with mobile support"
UPDATE_TODO: "Add styling with CSS" PRIORITY: 9
DELETE_TODO: "Research potential APIs"

Each command should be on its own line. Be strategic - remove todos that are outdated, update todos to be more specific, and create new ones as the project evolves.`;
      case "builder":
        return "execute todos, write code, and build working artifacts";
      case "communicator":
        return "handle team communication, status updates, and external messaging";
      case "reviewer":
        return `perform code reviews of the builder's artifacts and provide technical feedback.

Your responsibilities:
- Review HTML, CSS, and JavaScript code in artifacts
- Identify bugs, security issues, and code quality problems
- Suggest specific improvements and best practices
- Check for accessibility, performance, and maintainability issues
- Provide actionable recommendations for the planner to address

Focus on the CODE QUALITY, not project management. When you find issues, provide:
1. Clear description of the problem
2. Severity (critical/major/minor)
3. Specific recommendation starting with "RECOMMENDATION:"

Be constructive and specific in your feedback.`;
      default:
        return "contribute to the team's success";
    }
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