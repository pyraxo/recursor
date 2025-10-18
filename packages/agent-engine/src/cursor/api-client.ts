/**
 * Cursor Background Agents API Client
 *
 * This module provides a client for interacting with the Cursor Background Agents REST API.
 * The API allows programmatic creation and management of autonomous coding agents that run
 * in isolated Ubuntu VMs with full IDE tooling.
 *
 * API Documentation: https://docs.cursor.com/en/background-agent/api
 * Authentication: Bearer token via API key from Cursor Dashboard
 *
 * Rate Limits:
 * - Up to 256 concurrent agents per API key
 * - API endpoints subject to standard rate limiting
 *
 * @module cursor/api-client
 */

/**
 * Environment configuration for a Cursor Background Agent
 */
export interface BackgroundAgentEnvironment {
  /** Commands to run during setup (e.g., "npm install") */
  setup_commands?: string[];
  /** Terminal processes to keep alive (e.g., dev servers) */
  terminal_processes?: string[];
  /** Custom tool scripts available to the agent */
  custom_tools?: string[];
  /** Environment variables for the agent's runtime */
  environment_variables?: Record<string, string>;
}

/**
 * Prompt structure for background agent requests
 */
export interface BackgroundAgentPrompt {
  /** Text prompt for the agent */
  text: string;
  /** Optional images (base64 encoded) */
  images?: Array<{
    data: string;
    dimension: { width: number; height: number };
  }>;
}

/**
 * Source repository configuration
 */
export interface BackgroundAgentSource {
  /** Git repository URL (must be accessible) */
  repository: string;
  /** Git ref (branch, tag, or commit) to work on */
  ref: string;
}

/**
 * Request parameters for creating a background agent
 */
export interface BackgroundAgentRequest {
  /** Prompt structure */
  prompt: BackgroundAgentPrompt;
  /** Source repository configuration */
  source: BackgroundAgentSource;
  /** AI model to use (e.g., "claude-4.5-sonnet") */
  model?: string;
  /** Environment configuration */
  environment?: BackgroundAgentEnvironment;
}

/**
 * Agent execution outputs
 */
export interface BackgroundAgentOutputs {
  /** List of files modified by the agent */
  files_changed: string[];
  /** Git commits created by the agent */
  commits: string[];
  /** Terminal output from the agent's execution */
  terminal_output: string;
}

/**
 * Response from the Cursor Background Agents API
 */
export interface BackgroundAgentResponse {
  /** Unique agent identifier */
  agent_id: string;
  /** Current agent status */
  status: "creating" | "running" | "completed" | "failed" | "terminated";
  /** ISO timestamp when agent was created */
  created_at: string;
  /** Repository URL the agent is working on */
  repository: string;
  /** Branch the agent is working on */
  branch: string;
  /** Model being used */
  model: string;
  /** Outputs from the agent's execution (when available) */
  outputs?: BackgroundAgentOutputs;
  /** Error message if agent failed */
  error?: string;
}

/**
 * Client for the Cursor Background Agents REST API
 *
 * Usage:
 * ```typescript
 * const client = new CursorAPIClient(process.env.CURSOR_API_KEY);
 *
 * // Create an agent
 * const agent = await client.createAgent({
 *   prompt: {
 *     text: "Implement user authentication"
 *   },
 *   source: {
 *     repository: "https://github.com/user/repo",
 *     ref: "main"
 *   }
 * });
 *
 * // Poll until complete
 * const result = await client.pollUntilComplete(agent.agent_id);
 * ```
 */
export class CursorAPIClient {
  private readonly apiKey: string;
  private readonly baseURL: string;

  /**
   * Create a new Cursor API client
   *
   * @param apiKey - API key from Cursor Dashboard (required)
   * @param baseURL - Base URL for the API (defaults to production)
   * @throws {Error} If API key is not provided
   */
  constructor(apiKey: string, baseURL = "https://api.cursor.com/v0") {
    if (!apiKey || apiKey.trim() === "") {
      throw new Error("Cursor API key is required");
    }
    this.apiKey = apiKey;
    this.baseURL = baseURL;
  }

  /**
   * Create a new background agent
   *
   * The agent will be created in an isolated VM and begin working on the specified
   * repository and branch. The agent operates autonomously based on the prompt.
   *
   * @param request - Agent creation parameters
   * @returns Promise resolving to the agent response
   * @throws {Error} If the API request fails
   */
  async createAgent(
    request: BackgroundAgentRequest
  ): Promise<BackgroundAgentResponse> {
    const response = await fetch(`${this.baseURL}/agents`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Failed to create background agent (${response.status}): ${errorText}`
      );
    }

    return await response.json();
  }

  /**
   * Get the current status of a background agent
   *
   * @param agentId - Unique agent identifier
   * @returns Promise resolving to the agent's current status
   * @throws {Error} If the API request fails
   */
  async getAgentStatus(agentId: string): Promise<BackgroundAgentResponse> {
    const response = await fetch(`${this.baseURL}/agents/${agentId}`, {
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Failed to get agent status (${response.status}): ${errorText}`
      );
    }

    return await response.json();
  }

  /**
   * Send a follow-up prompt to an existing agent
   *
   * This allows for iterative development where the agent can receive additional
   * instructions after completing initial work.
   *
   * @param agentId - Unique agent identifier
   * @param prompt - Follow-up instructions (can be string or prompt object)
   * @throws {Error} If the API request fails
   */
  async sendFollowUp(
    agentId: string,
    prompt: string | BackgroundAgentPrompt
  ): Promise<void> {
    // Convert string to prompt object if needed
    const promptObject: BackgroundAgentPrompt =
      typeof prompt === "string" ? { text: prompt } : prompt;

    const response = await fetch(`${this.baseURL}/agents/${agentId}/followup`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ prompt: promptObject }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Failed to send follow-up (${response.status}): ${errorText}`
      );
    }
  }

  /**
   * Terminate a running background agent
   *
   * This will stop the agent's execution and clean up resources. The agent
   * cannot be restarted after termination.
   *
   * @param agentId - Unique agent identifier
   * @throws {Error} If the API request fails
   */
  async terminateAgent(agentId: string): Promise<void> {
    const response = await fetch(`${this.baseURL}/agents/${agentId}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Failed to terminate agent (${response.status}): ${errorText}`
      );
    }
  }

  /**
   * Poll an agent until it reaches a terminal state (completed or failed)
   *
   * This is a convenience method that repeatedly checks the agent's status
   * until it finishes or the timeout is reached.
   *
   * @param agentId - Unique agent identifier
   * @param maxWaitMs - Maximum time to wait in milliseconds (default: 30 minutes)
   * @param pollIntervalMs - Time between status checks in milliseconds (default: 10 seconds)
   * @returns Promise resolving to the final agent status
   * @throws {Error} If the agent doesn't complete within the timeout
   */
  async pollUntilComplete(
    agentId: string,
    maxWaitMs: number = 1800000, // 30 minutes
    pollIntervalMs: number = 10000 // 10 seconds
  ): Promise<BackgroundAgentResponse> {
    const startTime = Date.now();

    while (Date.now() - startTime < maxWaitMs) {
      const status = await this.getAgentStatus(agentId);

      // Terminal states
      if (
        status.status === "completed" ||
        status.status === "failed" ||
        status.status === "terminated"
      ) {
        return status;
      }

      // Wait before next poll
      await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
    }

    throw new Error(
      `Agent ${agentId} did not complete within ${maxWaitMs}ms timeout`
    );
  }

  /**
   * Poll an agent with a callback for progress updates
   *
   * Similar to pollUntilComplete but allows for progress monitoring.
   *
   * @param agentId - Unique agent identifier
   * @param onProgress - Callback invoked on each status check
   * @param maxWaitMs - Maximum time to wait in milliseconds
   * @param pollIntervalMs - Time between status checks in milliseconds
   * @returns Promise resolving to the final agent status
   * @throws {Error} If the agent doesn't complete within the timeout
   */
  async pollWithProgress(
    agentId: string,
    onProgress: (status: BackgroundAgentResponse) => void,
    maxWaitMs: number = 1800000,
    pollIntervalMs: number = 10000
  ): Promise<BackgroundAgentResponse> {
    const startTime = Date.now();

    while (Date.now() - startTime < maxWaitMs) {
      const status = await this.getAgentStatus(agentId);
      onProgress(status);

      if (
        status.status === "completed" ||
        status.status === "failed" ||
        status.status === "terminated"
      ) {
        return status;
      }

      await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
    }

    throw new Error(
      `Agent ${agentId} did not complete within ${maxWaitMs}ms timeout`
    );
  }
}
