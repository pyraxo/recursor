/**
 * LLM Provider for Convex Actions
 *
 * This module provides LLM capabilities within Convex actions,
 * supporting multiple providers with automatic fallback.
 */

export interface Message {
  role: 'system' | 'user' | 'assistant';
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
    throw new Error('GROQ_API_KEY not configured');
  }

  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: options.model || 'llama-3.3-70b-versatile',
      messages,
      temperature: options.temperature || 0.7,
      max_tokens: options.max_tokens || 2000,
      stream: false, // Convex actions don't support streaming
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Groq API error: ${response.status} - ${error}`);
  }

  const data = await response.json();

  return {
    content: data.choices[0]?.message?.content || '',
    usage: data.usage,
    model: data.model,
    provider: 'groq',
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
    throw new Error('OPENAI_API_KEY not configured');
  }

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: options.model || 'gpt-4o-mini',
      messages,
      temperature: options.temperature || 0.7,
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
    content: data.choices[0]?.message?.content || '',
    usage: data.usage,
    model: data.model,
    provider: 'openai',
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
    throw new Error('GEMINI_API_KEY not configured');
  }

  // Convert messages to Gemini format
  const contents = messages.map(msg => ({
    role: msg.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: msg.content }],
  }));

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents,
        generationConfig: {
          temperature: options.temperature || 0.7,
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
    content: data.candidates[0]?.content?.parts[0]?.text || '',
    model: 'gemini-2.0-flash-exp',
    provider: 'gemini',
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
      { name: 'groq', fn: callGroq },
      { name: 'openai', fn: callOpenAI },
      { name: 'gemini', fn: callGemini },
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
            await new Promise(resolve => setTimeout(resolve, this.retryDelay));
          }
        }
      }
    }

    throw new Error(`All LLM providers failed. Last error: ${lastError?.message}`);
  }

  /**
   * Helper method to build system prompts
   */
  buildSystemPrompt(role: string, context: any): Message {
    return {
      role: 'system',
      content: `You are a ${role} agent in the Recursor hackathon simulation.

Current context:
- Project: ${context.projectTitle || 'Not yet defined'}
- Phase: ${context.phase || 'Ideation'}
- Todos: ${context.todoCount || 0} tasks
- Team: ${context.teamName || 'Team'}

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
      case 'planner':
        return 'create strategic plans, define todos, and coordinate the team\'s efforts';
      case 'builder':
        return 'execute todos, write code, and build working artifacts';
      case 'communicator':
        return 'handle team communication, status updates, and external messaging';
      case 'reviewer':
        return 'analyze progress, provide feedback, and suggest improvements';
      default:
        return 'contribute to the team\'s success';
    }
  }

  /**
   * Parse agent responses for actions
   */
  parseAgentResponse(response: string, agentType: string): any {
    // Extract JSON if present
    const jsonMatch = response.match(/```json\n?([\s\S]*?)\n?```/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[1]);
      } catch (e) {
        console.warn('Failed to parse JSON from response');
      }
    }

    // Extract actions using regex patterns
    const actions: any = {
      thoughts: response,
      actions: [],
    };

    // Agent-specific parsing
    switch (agentType) {
      case 'planner':
        // Look for todo creation patterns
        const todoMatches = response.matchAll(/(?:TODO|TASK|Create):\s*(.+)/gi);
        for (const match of todoMatches) {
          actions.actions.push({
            type: 'create_todo',
            content: match[1].trim(),
          });
        }
        break;

      case 'builder':
        // Look for artifact creation
        if (response.includes('```html') || response.includes('<!DOCTYPE')) {
          const htmlMatch = response.match(/```html\n?([\s\S]*?)\n?```/);
          if (htmlMatch) {
            actions.actions.push({
              type: 'create_artifact',
              content: htmlMatch[1],
              format: 'html',
            });
          }
        }
        break;

      case 'communicator':
        // Look for message patterns
        if (response.toLowerCase().includes('broadcast:') ||
            response.toLowerCase().includes('message:')) {
          actions.actions.push({
            type: 'send_message',
            content: response,
          });
        }
        break;

      case 'reviewer':
        // Look for recommendations
        const recommendations = response.split('\n')
          .filter(line => line.match(/^[-*•]\s+/))
          .map(line => line.replace(/^[-*•]\s+/, ''));

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