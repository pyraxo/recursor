import { LLMProviders } from "../config";

export interface BuildRequest {
  title: string;
  description: string;
  requirements: string[];
  techStack?: string[];
}

export interface BuildResult {
  content: string;
  metadata: {
    description: string;
    tech_stack: string[];
    build_time_ms: number;
  };
}

export class HTMLBuilder {
  private llm: LLMProviders;

  constructor(llm: LLMProviders) {
    this.llm = llm;
  }

  async build(request: BuildRequest): Promise<BuildResult> {
    const startTime = Date.now();

    const prompt = this.createBuildPrompt(request);

    const messages = [
      {
        role: "system",
        content:
          "You are an expert web developer. Generate complete, self-contained HTML files with inline CSS and JavaScript. The output should be production-ready and visually appealing.",
      },
      {
        role: "user",
        content: prompt,
      },
    ];

    // Use Groq for fast generation
    const response = await this.llm.groqCompletion(messages);

    // Extract HTML from response (handle markdown code blocks)
    const content = this.extractHTML(response);

    const buildTime = Date.now() - startTime;

    return {
      content,
      metadata: {
        description: request.description,
        tech_stack: request.techStack || ["HTML", "CSS", "JavaScript"],
        build_time_ms: buildTime,
      },
    };
  }

  private createBuildPrompt(request: BuildRequest): string {
    return `
Create a complete, self-contained HTML file for the following project:

Title: ${request.title}
Description: ${request.description}

Requirements:
${request.requirements.map((req, i) => `${i + 1}. ${req}`).join("\n")}

${request.techStack ? `Tech Stack: ${request.techStack.join(", ")}` : ""}

Guidelines:
- Generate a SINGLE HTML file with inline CSS and JavaScript
- Make it visually appealing with modern design
- Include all necessary functionality
- Use semantic HTML
- Ensure responsive design
- Add appropriate comments
- Make it production-ready

Output ONLY the HTML code, wrapped in a code block.
    `.trim();
  }

  private extractHTML(response: string): string {
    // Try to extract HTML from markdown code blocks
    const codeBlockMatch = response.match(/```html\n([\s\S]*?)\n```/);
    if (codeBlockMatch && codeBlockMatch[1]) {
      return codeBlockMatch[1].trim();
    }

    // Try without language specifier
    const genericBlockMatch = response.match(/```\n([\s\S]*?)\n```/);
    if (genericBlockMatch && genericBlockMatch[1]) {
      return genericBlockMatch[1].trim();
    }

    // If no code block, look for HTML tags
    const htmlMatch = response.match(/<!DOCTYPE html>[\s\S]*/i);
    if (htmlMatch) {
      return htmlMatch[0].trim();
    }

    // Fallback: return the whole response
    return response.trim();
  }

  async refine(
    currentContent: string,
    feedback: string[]
  ): Promise<BuildResult> {
    const startTime = Date.now();

    const prompt = `
Refine the following HTML code based on this feedback:

Current HTML:
\`\`\`html
${currentContent}
\`\`\`

Feedback:
${feedback.map((f, i) => `${i + 1}. ${f}`).join("\n")}

Generate the improved version. Output ONLY the complete HTML code.
    `.trim();

    const messages = [
      {
        role: "system",
        content:
          "You are an expert web developer refining existing code based on feedback.",
      },
      {
        role: "user",
        content: prompt,
      },
    ];

    const response = await this.llm.groqCompletion(messages);
    const content = this.extractHTML(response);

    const buildTime = Date.now() - startTime;

    return {
      content,
      metadata: {
        description: "Refined version based on feedback",
        tech_stack: ["HTML", "CSS", "JavaScript"],
        build_time_ms: buildTime,
      },
    };
  }
}
