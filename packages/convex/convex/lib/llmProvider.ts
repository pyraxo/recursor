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

// Structured action types for agent responses
export interface TodoAction {
  type: "create_todo" | "update_todo" | "delete_todo" | "clear_all_todos" | "update_project" | "update_phase";
  content?: string; // For create and delete
  oldContent?: string; // For update
  newContent?: string; // For update
  priority?: number;
  reason?: string; // For clear_all_todos - why we're clearing
  // For update_project
  title?: string; // New project title (optional)
  description?: string; // New/updated project description
  // For update_phase
  phase?: string; // New phase: 'ideation', 'building', 'demo', etc.
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
   * Helper method to build system prompts
   */
  buildSystemPrompt(role: string, context: any, useStructuredOutput: boolean = false): Message {
    const roleDescription = this.getRoleDescription(role, useStructuredOutput);

    return {
      role: "system",
      content: `You're the ${role} for team ${context.teamName || "Team"} in a hackathon simulation.

Right now you're working on: ${context.projectTitle || "figuring out what to build"}.
Phase: ${context.phase || "ideation"}. There are ${context.todoCount || 0} tasks on the board.

${roleDescription}

Keep it moving - be creative, work autonomously, and focus on building something that works. Make quick decisions and push forward.`,
    };
  }

  private getRoleDescription(role: string, useStructuredOutput: boolean = false): string {
    switch (role) {
      case "planner":
        if (useStructuredOutput) {
          return `Your job is to manage the todo list, evolve the project description, manage the team's phase, and keep the team on track.

Respond with JSON in this exact format:
{
  "thinking": "your thoughts here about what needs to happen next - talk through it like you're thinking out loud",
  "actions": [
    {"type": "create_todo", "content": "description", "priority": 5},
    {"type": "update_todo", "oldContent": "existing todo text", "newContent": "updated text", "priority": 8},
    {"type": "delete_todo", "content": "todo to remove"},
    {"type": "clear_all_todos", "reason": "why you're clearing everything"},
    {"type": "update_project", "title": "new title (optional)", "description": "updated description with more detail"},
    {"type": "update_phase", "phase": "ideation|building|demo|complete"}
  ]
}

In your "thinking" field, talk through what you're seeing and what should happen next. Don't use markdown or bullet points - just talk it through like you're explaining to a teammate.

In your "actions" array, include any operations you want to perform. You can:
- create new todos for the Builder (technical work, features to implement)
- update existing ones by matching their content
- delete individual todos that aren't needed
- clear ALL todos and start fresh (use this if the list is too bloated or doesn't make sense anymore - then add new todos after)
- update the project idea and description (add more technical detail, refine scope, document decisions made)
- update the team's phase based on current progress (explained below)
- create "broadcast" or "announce" todos ONLY for major milestones (the Communicator will handle these)

Priority is 1-10, with 10 being most important.

PHASE MANAGEMENT:
You control which phase the team is in. Update it as you make progress:
- "ideation": Brainstorming ideas, defining the project concept. Stay here until you have a solid project description.
- "building": Actively implementing features, writing code. Move here once you have todos and are building.
- "demo": Project is feature-complete, polishing for presentation. Move here when core functionality works.
- "complete": Finished and ready to show off. Move here when everything is polished and demo-ready.

Think of phases as your project's lifecycle. Move forward when you've achieved the goals of the current phase. You can also move backwards if you need to (e.g., from building back to ideation if you decide to pivot).

IMPORTANT ABOUT USER MESSAGES: The Communicator responds directly to user questions and messages - you don't need to create "respond to user" todos. Only get involved if a user message requires strategic changes to the project (like feature requests or major pivots).

IMPORTANT ABOUT BROADCASTS: Only create broadcast todos for truly important announcements (major milestones, demo ready, big breakthroughs). Regular status updates are not needed - focus on the work, not announcements.

IMPORTANT about project description: Keep it nicely formatted, informative, and exciting - like you're describing the project to participants, judges, or the audience. No markdown formatting, just clear compelling prose. As the project evolves, refine the description to capture what makes it interesting and what you're building. Think of it as the project's elevator pitch that gets people excited about what you're creating.

Remember: the todo list is your scratchpad for working through technical details. The project description is for communicating the vision.`;
        } else {
          return `Your job is to manage the todo list and keep the team on track.

Talk through what you're seeing and what should happen next. Then list out any todos you want to create, update, or delete.`;
        }
      case "builder":
        if (useStructuredOutput) {
          return `Your job is to write code and build things. Look at the highest priority todo, write the code to complete it, then mark it done.

Respond with JSON in this exact format:
{
  "thinking": "brief summary of what you're trying to accomplish - just a sentence or two about the approach",
  "results": {
    "artifact": "the complete HTML code here with inline CSS and JavaScript"
  }
}

In your "thinking" field, just summarize what you're doing in 1-2 sentences. DO NOT include the code in thinking.

In your "results.artifact" field, include the FULL working HTML file with all CSS and JavaScript inline. This is where all the code goes.`;
        } else {
          return `Your job is to write code and build things. Look at the highest priority todo, write the code to complete it, then mark it done. Keep it simple and get something working.

When you write code, include the full HTML file with inline CSS and JavaScript. Talk through what you're building as you go - don't use markdown headers or bullet points, just explain like you're pair programming.`;
        }
      case "communicator":
        if (useStructuredOutput) {
          return `Your job is to respond to user messages and handle team communication.

Respond with JSON in this exact format:
{
  "thinking": "brief summary of what you're responding to and your approach",
  "results": {
    "message": "the actual message to send",
    "recipient": "the name of who you're sending to, or 'broadcast' for everyone",
    "type": "direct" or "broadcast"
  }
}

In your "thinking" field, just briefly explain what you're responding to (1-2 sentences).

In your "results" field, put the actual message content that will be sent.

IMPORTANT GUIDELINES:
1. USER MESSAGES: Respond directly and conversationally (2-3 sentences). Use type: "direct".
2. BROADCASTS: Only for major milestones or important announcements. Use type: "broadcast".
3. TEAM MESSAGES: Respond naturally to other participating teams.`;
        } else {
          return `Your job is to respond to user messages and handle team communication.

IMPORTANT GUIDELINES:
1. USER MESSAGES: When you receive a user message, respond directly to that person. Keep it conversational, friendly, and concise (2-3 sentences). You're having a chat, not making an announcement.

2. BROADCASTS: Only create broadcasts when the Planner specifically requests it (usually for major milestones or important announcements). Broadcasts go to everyone - participants, judges, and the audience.

3. TEAM MESSAGES: If you receive messages from other participating teams, respond naturally and engage with them.

Just write naturally like you're talking to people - no need for markdown formatting or formal structure.`;
        }
      case "reviewer":
        if (useStructuredOutput) {
          return `Your job is to review code that the builder creates and spot issues. Look for bugs, security problems, code quality issues, accessibility problems, and performance concerns.

Respond with JSON in this exact format:
{
  "thinking": "brief summary of your overall assessment of the code",
  "results": {
    "recommendations": [
      "Specific actionable fix 1",
      "Specific actionable fix 2"
    ],
    "issues": [
      {"severity": "critical", "description": "Description of critical issue"},
      {"severity": "major", "description": "Description of major issue"},
      {"severity": "minor", "description": "Description of minor issue"}
    ]
  }
}

In your "thinking" field, just give a high-level summary of the code review (1-2 sentences).

In your "results" field, list all the specific issues found and actionable recommendations for the planner. Be thorough and constructive.`;
        } else {
          return `Your job is to review code that the builder creates and spot issues. Look for bugs, security problems, code quality issues, accessibility problems, and performance concerns.

When you find something, explain what the issue is and how severe it is - critical, major, or minor. Then give a specific recommendation for how to fix it. Start those recommendations with "RECOMMENDATION:" so the planner can spot them.

Talk through your review naturally - don't use markdown or formal formatting, just explain what you're seeing like you're doing a code review with a teammate.`;
        }
      default:
        return "Your job is to help the team build something great.";
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