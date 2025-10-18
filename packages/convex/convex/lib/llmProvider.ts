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
  type:
    | "create_todo"
    | "update_todo"
    | "delete_todo"
    | "clear_all_todos"
    | "update_project"
    | "update_phase";
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
  json_mode?: boolean; // Request JSON output (legacy)
  structured?: boolean; // Use provider's native structured output API
  schema?: any; // JSON schema for structured output
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

  // Enable structured output
  if (options.structured && options.schema) {
    requestBody.response_format = {
      type: "json_schema",
      json_schema: {
        name: "response",
        strict: true,
        schema: options.schema,
      },
    };
  } else if (options.json_mode) {
    // Legacy mode - just request JSON without schema validation
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

  const model = options.model || "gpt-5";
  const requestBody: any = {
    model,
    messages,
    temperature: options.temperature ?? 1,
    stream: false,
  };

  // GPT-4o and newer models use max_completion_tokens, older models use max_tokens
  if (model.includes("gpt-5")) {
    requestBody.max_completion_tokens = options.max_tokens || 2000;
  } else {
    requestBody.max_tokens = options.max_tokens || 2000;
  }

  // Enable structured output
  if (options.structured && options.schema) {
    requestBody.response_format = {
      type: "json_schema",
      json_schema: {
        name: "response",
        strict: true,
        schema: options.schema,
      },
    };
  } else if (options.json_mode) {
    // Legacy mode - just request JSON without schema validation
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
 * Google Gemini provider
 */
async function callGemini(
  messages: Message[],
  options: ChatOptions = {}
): Promise<LLMResponse> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY not configured in Convex environment");
  }

  const model = options.model || "gemini-2.5-pro"; // Latest stable Gemini 2.5 Pro (June 2025)

  // Convert messages to Gemini format
  const contents = messages.map((msg) => ({
    role: msg.role === "assistant" ? "model" : "user",
    parts: [{ text: msg.content }],
  }));

  const requestBody: any = {
    contents,
    generationConfig: {
      temperature: options.temperature ?? 1,
      maxOutputTokens: options.max_tokens || 2000,
    },
  };

  // Handle structured output via function calling
  if (options.structured && options.schema) {
    requestBody.tools = [
      {
        functionDeclarations: [
          {
            name: "respond",
            description: "Respond with structured output",
            parameters: options.schema,
          },
        ],
      },
    ];
    requestBody.toolConfig = {
      functionCallingConfig: {
        mode: "ANY",
        allowedFunctionNames: ["respond"],
      },
    };
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Gemini API error: ${response.status} - ${error}`);
  }

  const data = await response.json();

  // Check for error response
  if (!data.candidates || data.candidates.length === 0) {
    console.error(
      "[Gemini] No candidates in response:",
      JSON.stringify(data).substring(0, 500)
    );
    throw new Error(
      `Gemini API returned no candidates: ${JSON.stringify(data).substring(0, 200)}`
    );
  }

  // Extract content - handle both text and function call responses
  let content = "";
  const parts = data.candidates[0]?.content?.parts;
  if (parts) {
    // Check for function call (structured output)
    const functionCall = parts.find((p: any) => p.functionCall);
    if (functionCall) {
      content = JSON.stringify(functionCall.functionCall.args);
    } else {
      // Regular text response
      content = parts[0]?.text || "";
    }
  }

  return {
    content,
    model: model,
    provider: "gemini",
  };
}

/**
 * Claude provider: Anthropic
 */
async function callClaude(
  messages: Message[],
  options: ChatOptions = {}
): Promise<LLMResponse> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY not configured in Convex environment");
  }

  const model = options.model || "claude-sonnet-4-5-20250929"; // Latest Claude 4.5 Sonnet (Sept 29, 2025)

  // Separate system message from other messages
  const systemMessage = messages.find((m) => m.role === "system");
  const conversationMessages = messages.filter((m) => m.role !== "system");

  const requestBody: any = {
    model: model,
    max_tokens: options.max_tokens || 2000,
    temperature: options.temperature ?? 0.7,
    messages: conversationMessages.map((msg) => ({
      role: msg.role === "assistant" ? "assistant" : "user",
      content: msg.content,
    })),
  };

  // Add system message if present
  if (systemMessage) {
    requestBody.system = systemMessage.content;
  }

  // Handle structured output via tool use
  if (options.structured && options.schema) {
    requestBody.tools = [
      {
        name: "respond",
        description: "Respond with structured output",
        input_schema: options.schema,
      },
    ];
    requestBody.tool_choice = { type: "tool", name: "respond" };
  }

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Claude API error: ${response.status} - ${error}`);
  }

  const data = await response.json();

  // Extract content - handle both text and tool use responses
  let content = "";
  if (data.content) {
    // Check for tool use (structured output)
    const toolUse = data.content.find((c: any) => c.type === "tool_use");
    if (toolUse) {
      content = JSON.stringify(toolUse.input);
    } else {
      // Regular text response
      content = data.content[0]?.text || "";
    }
  }

  return {
    content,
    usage: {
      prompt_tokens: data.usage?.input_tokens || 0,
      completion_tokens: data.usage?.output_tokens || 0,
      total_tokens:
        (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0),
    },
    model: data.model,
    provider: "anthropic",
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
    // Use ONLY latest models: Claude 4.5 Sonnet and Gemini 2.5 Pro
    const providers = [
      {
        name: "claude-sonnet-4-5-20250929",
        fn: callClaude,
        model: "claude-sonnet-4-5-20250929", // Latest Claude 4.5 Sonnet (Sept 29, 2025)
      },
      {
        name: "gemini-2.5-pro",
        fn: callGemini,
        model: "gemini-2.5-pro", // Latest Gemini 2.5 Pro (June 2025 stable)
      },
      {
        name: "openai-gpt-5",
        fn: callOpenAI,
        model: "gpt-5", // Latest GPT-4o as final fallback
      },
    ];

    let lastError: Error | null = null;

    for (const provider of providers) {
      try {
        console.log(`Attempting ${provider.name}`);
        const response = await provider.fn(messages, {
          ...options,
          model: options.model || provider.model,
        });
        console.log(
          `Success with ${provider.name} (${response.usage?.total_tokens || "N/A"} tokens)`
        );
        return response;
      } catch (error) {
        lastError = error as Error;
        console.error(`${provider.name} failed:`, error);
        // Move to next provider immediately (no retries on individual providers)
      }
    }

    throw new Error(
      `All LLM providers failed. Last error: ${lastError?.message}`
    );
  }

  /**
   * Builder-optimized chat with smarter models and more tokens
   * Uses Claude 4.5 Sonnet and Gemini 2.5 Pro for best code generation
   */
  async chatForBuilder(
    messages: Message[],
    options: ChatOptions = {}
  ): Promise<LLMResponse> {
    // Builder-specific defaults: more tokens, smarter models
    const builderOptions = {
      ...options,
      max_tokens: options.max_tokens || 16000, // Much more space for code
      temperature: options.temperature ?? 0.7,
    };

    // Use latest models: Claude 4.5 Sonnet (excellent at code) and Gemini 2.5 Pro
    const providers = [
      {
        name: "claude-sonnet-4-5-20250929",
        fn: callClaude,
        model: "claude-sonnet-4-5-20250929", // Latest Claude 4.5 Sonnet (Sept 29, 2025)
      },
      {
        name: "gemini-2.5-pro",
        fn: callGemini,
        model: "gemini-2.5-pro", // Latest Gemini 2.5 Pro (June 2025 stable)
      },
      {
        name: "openai-gpt-5",
        fn: callOpenAI,
        model: "gpt-5", // Latest GPT-5 as final fallback
      },
    ];

    let lastError: Error | null = null;

    for (const provider of providers) {
      try {
        console.log(`[Builder] Attempting ${provider.name}`);
        const response = await provider.fn(messages, {
          ...builderOptions,
          model: provider.model,
        });
        console.log(
          `[Builder] Success with ${provider.name} (${response.usage?.total_tokens || "N/A"} tokens)`
        );
        return response;
      } catch (error) {
        lastError = error as Error;
        console.error(`[Builder] ${provider.name} failed:`, error);
        // Don't retry on builder - just move to next provider
      }
    }

    throw new Error(
      `All builder LLM providers failed. Last error: ${lastError?.message}`
    );
  }

  /**
   * Get JSON schema for structured output based on agent role
   */
  getSchema(role: string): any {
    switch (role) {
      case "planner":
        return {
          type: "object",
          properties: {
            thinking: {
              type: "string",
              description: "Your thoughts about what needs to happen next",
            },
            actions: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  type: {
                    type: "string",
                    enum: ["create_todo", "update_todo", "delete_todo", "clear_all_todos", "update_project", "update_phase"],
                  },
                  content: { type: "string" },
                  oldContent: { type: "string" },
                  newContent: { type: "string" },
                  priority: { type: "number" },
                  reason: { type: "string" },
                  title: { type: "string" },
                  description: { type: "string" },
                  phase: { type: "string" },
                },
                required: ["type"],
              },
            },
          },
          required: ["thinking", "actions"],
        };
      case "builder":
        return {
          type: "object",
          properties: {
            thinking: {
              type: "string",
              description: "Brief summary of what you're trying to accomplish",
            },
            results: {
              type: "object",
              properties: {
                artifact: {
                  type: "string",
                  description: "The complete HTML code with inline CSS and JavaScript",
                },
              },
              required: ["artifact"],
            },
          },
          required: ["thinking", "results"],
        };
      case "communicator":
        return {
          type: "object",
          properties: {
            thinking: {
              type: "string",
              description: "Brief summary of what you're responding to",
            },
            results: {
              type: "object",
              properties: {
                message: {
                  type: "string",
                  description: "The actual message to send",
                },
                recipient: {
                  type: "string",
                  description: "Who you're sending to (name or 'broadcast')",
                },
                type: {
                  type: "string",
                  enum: ["direct", "broadcast"],
                },
              },
              required: ["message", "recipient", "type"],
            },
          },
          required: ["thinking", "results"],
        };
      case "reviewer":
        return {
          type: "object",
          properties: {
            thinking: {
              type: "string",
              description: "Brief assessment of progress and time management",
            },
            results: {
              type: "object",
              properties: {
                recommendations: {
                  type: "array",
                  items: { type: "string" },
                  description: "Specific actionable recommendations",
                },
                issues: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      severity: {
                        type: "string",
                        enum: ["critical", "major", "minor"],
                      },
                      description: { type: "string" },
                    },
                    required: ["severity", "description"],
                  },
                },
              },
              required: ["recommendations", "issues"],
            },
          },
          required: ["thinking", "results"],
        };
      default:
        return {};
    }
  }

  /**
   * Helper method to build system prompts
   */
  buildSystemPrompt(
    role: string,
    context: any,
    useStructuredOutput: boolean = false
  ): Message {
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

  private getRoleDescription(
    role: string,
    useStructuredOutput: boolean = false
  ): string {
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
          return `Your job is to audit the builder and keep the team on track during this hackathon. This is NOT a code quality review - focus on whether the implementation is good enough to pass and if the team can achieve their goals in time.

Respond with JSON in this exact format:
{
  "thinking": "brief assessment of progress, implementation adequacy, and time management",
  "results": {
    "recommendations": [
      "Specific actionable recommendation 1",
      "Specific actionable recommendation 2"
    ],
    "issues": [
      {"severity": "critical", "description": "Critical blocker or time management issue"},
      {"severity": "major", "description": "Significant concern about goals or approach"},
      {"severity": "minor", "description": "Minor suggestion or optimization"}
    ]
  }
}

In your "thinking" field, assess:
1. Is the implementation good enough to demo and pass? (This is a hackathon - it doesn't need to be perfect)
2. Can they achieve their goals before the hackathon ends?
3. Is the builder on track or spinning wheels?
4. Any strategic pivots needed?

In your "results" field, provide actionable recommendations focused on:
- Cutting scope if running out of time
- Prioritizing what matters for the demo
- Fixing blockers that prevent functionality
- Strategic direction changes

DO NOT focus on code quality, security, best practices, or maintainability. Focus on: Will this work? Can we finish in time? What's blocking progress?`;
        } else {
          return `Your job is to audit the builder and keep the team on track during this hackathon. This is NOT a code quality review.

Focus on these questions:
1. Is the implementation good enough to demo and pass? (This is a hackathon - it doesn't need to be perfect)
2. Can they achieve their goals before the hackathon ends?
3. Is the builder on track or spinning wheels?
4. Any strategic pivots needed?

When you spot issues, focus on blockers, time management, and strategic direction - NOT code quality or security. Give recommendations starting with "RECOMMENDATION:" that help the team finish in time with something that works.

Talk through your assessment naturally like you're checking in with the team.`;
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
          /TODO:\s*(.+)/gi, // TODO: <content>
          /TASK:\s*(.+)/gi, // TASK: <content>
          /Create(?:\s+todo)?:\s*(.+)/gi, // Create: <content> or Create todo: <content>
          /^[-*]\s+(.+?)(?:\s*\((?:TODO|TASK)\))?$/gim, // - <content> or - <content> (TODO)
          /^\d+\.\s+(.+?)(?:\s*\((?:TODO|TASK)\))?$/gim, // 1. <content> or 1. <content> (TODO)
        ];

        // Look for UPDATE_TODO patterns
        // UPDATE_TODO: "old content" -> "new content"
        // UPDATE_TODO: "content" PRIORITY: 9
        const updatePattern =
          /UPDATE_TODO:\s*"([^"]+)"(?:\s*->\s*"([^"]+)"|(?:\s+PRIORITY:\s*(\d+)))/gi;

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

        console.log(
          `[Parser] Found ${actions.actions.length} todo actions from planner response`
        );
        console.log(
          `[Parser] Breakdown: ${
            actions.actions.filter((a: any) => a.type === "create_todo").length
          } creates, ${
            actions.actions.filter((a: any) => a.type === "update_todo").length
          } updates, ${
            actions.actions.filter((a: any) => a.type === "delete_todo").length
          } deletes`
        );

        if (actions.actions.length === 0) {
          console.warn(
            "[Parser] No actions found. Response:",
            response.substring(0, 200)
          );
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
