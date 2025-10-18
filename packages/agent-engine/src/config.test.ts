import { describe, expect, it } from "vitest";
import { AgentConfig } from "./config";

describe("AgentConfig", () => {
  it("should create a valid config", () => {
    const config: AgentConfig = {
      convexUrl: "https://test.convex.cloud",
      groqApiKey: "test-groq-key",
      openaiApiKey: "test-openai-key",
      geminiApiKey: "test-gemini-key",
    };

    expect(config.convexUrl).toBe("https://test.convex.cloud");
    expect(config.groqApiKey).toBe("test-groq-key");
    expect(config.openaiApiKey).toBe("test-openai-key");
    expect(config.geminiApiKey).toBe("test-gemini-key");
  });
});
