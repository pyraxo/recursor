import { GoogleGenerativeAI } from "@google/generative-ai";
import Groq from "groq-sdk";
import OpenAI from "openai";

export interface AgentConfig {
  convexUrl: string;
  groqApiKey: string;
  openaiApiKey: string;
  geminiApiKey: string;
}

export class LLMProviders {
  groq: Groq;
  openai: OpenAI;
  gemini: GoogleGenerativeAI;

  constructor(config: AgentConfig) {
    this.groq = new Groq({
      apiKey: config.groqApiKey,
    });

    this.openai = new OpenAI({
      apiKey: config.openaiApiKey,
    });

    this.gemini = new GoogleGenerativeAI(config.geminiApiKey);
  }

  // Primary provider for fast, frequent operations
  async groqCompletion(
    messages: Array<{ role: string; content: string }>,
    model = "llama-3.3-70b-versatile"
  ): Promise<string> {
    try {
      const completion = await this.groq.chat.completions.create({
        messages: messages as unknown as Array<{ role: "user" | "assistant" | "system"; content: string }>,
        model,
        temperature: 0.7,
        max_tokens: 2000,
      });

      return completion.choices[0]?.message?.content || "";
    } catch (error) {
      console.error("Groq API error:", error);
      // Fallback to OpenAI
      return this.openaiCompletion(messages);
    }
  }

  // Fallback provider for complex reasoning
  async openaiCompletion(
    messages: Array<{ role: string; content: string }>,
    model = "gpt-4o-mini"
  ): Promise<string> {
    const completion = await this.openai.chat.completions.create({
      messages: messages as unknown as Array<{ role: "user" | "assistant" | "system"; content: string }>,
      model,
      temperature: 0.7,
      max_tokens: 2000,
    });

    return completion.choices[0]?.message?.content || "";
  }

  // Alternative provider
  async geminiCompletion(
    messages: Array<{ role: string; content: string }>,
    model = "gemini-2.0-flash-exp"
  ): Promise<string> {
    const genModel = this.gemini.getGenerativeModel({ model });

    // Convert messages to Gemini format
    const contents = messages.map((msg) => ({
      role: msg.role === "assistant" ? "model" : "user",
      parts: [{ text: msg.content }],
    }));

    const chat = genModel.startChat({
      history: contents.slice(0, -1),
    });

    const lastContent = contents[contents.length - 1];
    if (!lastContent || !lastContent.parts || !lastContent.parts[0]) {
      throw new Error("Invalid message format for Gemini");
    }

    const result = await chat.sendMessage(lastContent.parts[0].text);

    return result.response.text();
  }
}

export function createLLMProviders(): LLMProviders {
  const config: AgentConfig = {
    convexUrl:
      process.env.CONVEX_URL || process.env.NEXT_PUBLIC_CONVEX_URL || "",
    groqApiKey: process.env.GROQ_API_KEY || "",
    openaiApiKey: process.env.OPENAI_API_KEY || "",
    geminiApiKey: process.env.GEMINI_API_KEY || "",
  };

  return new LLMProviders(config);
}
