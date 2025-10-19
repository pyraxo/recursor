/**
 * Artifact Sync Service for Cursor Background Agents
 *
 * This module handles bidirectional synchronization of artifacts between Convex
 * (our database) and GitHub repositories (where Cursor agents work).
 *
 * Flow:
 * 1. Materialize: Convex artifacts → Git repo files (before agent starts)
 * 2. Sync: Git repo files → Convex artifacts (after agent completes)
 *
 * Handles both single-file HTML artifacts (legacy) and multi-file projects (new).
 *
 * @module cursor/artifact-sync
 */

import { ConvexClient } from "convex/browser";
import { api } from "@recursor/convex/_generated/api";
import type { Id } from "@recursor/convex/_generated/dataModel";

/**
 * File representation for artifact synchronization
 */
export interface ArtifactFile {
  /** Relative path of the file */
  filename: string;
  /** File contents */
  content: string;
}

/**
 * Metadata about artifact creation
 */
export interface ArtifactMetadata {
  /** Cursor agent ID that created the artifact */
  agent_id: string;
  /** List of files changed by the agent */
  files_changed: string[];
  /** Terminal output from the agent (optional) */
  terminal_output?: string;
}

/**
 * Service for synchronizing artifacts between Convex and Git repositories
 *
 * Usage:
 * ```typescript
 * const sync = new ArtifactSyncService(convexUrl);
 *
 * // Before agent starts - materialize existing artifacts
 * const files = await sync.materializeArtifacts(stackId);
 *
 * // After agent completes - sync changes back
 * await sync.syncChangesToConvex(stackId, changedFiles, metadata);
 * ```
 */
export class ArtifactSyncService {
  private readonly client: ConvexClient;

  /**
   * Create a new artifact sync service
   *
   * @param convexUrl - Convex deployment URL
   */
  constructor(convexUrl: string) {
    if (!convexUrl || convexUrl.trim() === "") {
      throw new Error("Convex URL is required");
    }
    this.client = new ConvexClient(convexUrl);
  }

  /**
   * Materialize Convex artifacts into file structures
   *
   * This converts artifacts stored in Convex into file representations suitable
   * for initializing a Git repository. The latest version of artifacts is used.
   *
   * @param stackId - Agent stack identifier
   * @returns Promise resolving to array of artifact files
   */
  async materializeArtifacts(
    stackId: Id<"agent_stacks">
  ): Promise<ArtifactFile[]> {
    try {
      // Get all artifacts for this stack (ordered by version desc, so latest first)
      const artifacts = await this.client.query(api.artifacts.list, {
        stackId,
      });

      if (!artifacts || artifacts.length === 0) {
        console.log(`[ArtifactSync] No existing artifacts for stack ${stackId}`);
        return [];
      }

      // Use the latest artifact (first in the list)
      const latestArtifact = artifacts[0];
      if (!latestArtifact) {
        console.log("[ArtifactSync] No artifacts found");
        return [];
      }

      console.log(
        `[ArtifactSync] Materializing artifact type=${latestArtifact.type} version=${latestArtifact.version}`
      );

      // Handle different artifact types
      if (latestArtifact.type === "html_js") {
        // Legacy single-file HTML artifact
        if (!latestArtifact.content) {
          console.warn(
            `[ArtifactSync] HTML artifact ${latestArtifact._id} has no content`
          );
          return [];
        }

        return [
          {
            filename: "index.html",
            content: latestArtifact.content,
          },
        ];
      } else if (latestArtifact.type === "multi_file") {
        // Multi-file project stored as combined content
        if (!latestArtifact.content) {
          console.warn(
            `[ArtifactSync] Multi-file artifact ${latestArtifact._id} has no content`
          );
          return [];
        }

        // Parse combined content back into individual files
        return this.parseMultiFileContent(latestArtifact.content);
      } else if (latestArtifact.type === "external_link") {
        // External artifacts - create a README pointing to them
        return [
          {
            filename: "README.md",
            content: `# External Artifact\n\nThis project is hosted externally:\n${latestArtifact.url}\n`,
          },
        ];
      }

      return [];
    } catch (error) {
      console.error("[ArtifactSync] Failed to materialize artifacts:", error);
      throw error;
    }
  }

  /**
   * Sync changed files back to Convex as a new artifact
   *
   * This creates a new artifact version in Convex based on the files changed
   * by the Cursor agent.
   *
   * @param stackId - Agent stack identifier
   * @param changes - Array of changed files
   * @param metadata - Metadata about the artifact creation
   */
  async syncChangesToConvex(
    stackId: Id<"agent_stacks">,
    changes: ArtifactFile[],
    metadata: ArtifactMetadata
  ): Promise<void> {
    if (changes.length === 0) {
      console.log(
        `[ArtifactSync] No changes to sync for stack ${stackId}`
      );
      return;
    }

    try {
      console.log(
        `[ArtifactSync] Syncing ${changes.length} file(s) to Convex`
      );

      // Determine artifact type based on files
      if (changes.length === 1 && changes[0]?.filename === "index.html") {
        // Single HTML file - use legacy format
        await this.client.mutation(api.artifacts.create, {
          stack_id: stackId,
          type: "html_js",
          content: changes[0].content,
          metadata: {
            description: "Generated by Cursor Background Agent",
            tech_stack: ["HTML", "CSS", "JavaScript"],
            build_time_ms: 0,
            cursor_agent_id: metadata.agent_id,
            files_changed: metadata.files_changed,
          } as Record<string, unknown>,
        });

        console.log(`[ArtifactSync] Synced single HTML file artifact`);
      } else {
        // Multi-file project
        const techStack = this.detectTechStack(changes);
        const combinedContent = this.combineFiles(changes);

        await this.client.mutation(api.artifacts.create, {
          stack_id: stackId,
          type: "multi_file",
          content: combinedContent,
          metadata: {
            description: `Multi-file project by Cursor Agent (${changes.length} files)`,
            tech_stack: techStack,
            build_time_ms: 0,
            cursor_agent_id: metadata.agent_id,
            files_changed: metadata.files_changed,
          } as Record<string, unknown>,
        });

        console.log(
          `[ArtifactSync] Synced multi-file artifact: ${techStack.join(", ")}`
        );
      }
    } catch (error) {
      console.error("[ArtifactSync] Failed to sync changes to Convex:", error);
      throw error;
    }
  }

  /**
   * Detect technology stack from file list
   *
   * Analyzes file extensions and contents to determine what technologies
   * are being used in the project.
   *
   * @param files - Array of files to analyze
   * @returns Array of detected technology names
   */
  private detectTechStack(files: ArtifactFile[]): string[] {
    const stack = new Set<string>();

    for (const file of files) {
      const ext = file.filename.split(".").pop()?.toLowerCase();

      // Detect by extension
      switch (ext) {
        case "html":
          stack.add("HTML");
          break;
        case "css":
          stack.add("CSS");
          break;
        case "js":
          stack.add("JavaScript");
          break;
        case "ts":
          stack.add("TypeScript");
          break;
        case "tsx":
          stack.add("React");
          stack.add("TypeScript");
          break;
        case "jsx":
          stack.add("React");
          stack.add("JavaScript");
          break;
        case "vue":
          stack.add("Vue");
          break;
        case "svelte":
          stack.add("Svelte");
          break;
        case "py":
          stack.add("Python");
          break;
        case "rs":
          stack.add("Rust");
          break;
        case "go":
          stack.add("Go");
          break;
      }

      // Detect by filename
      if (file.filename === "package.json") {
        try {
          const pkg = JSON.parse(file.content);

          // Check dependencies for frameworks
          const deps = {
            ...pkg.dependencies,
            ...pkg.devDependencies,
          };

          if (deps.react) stack.add("React");
          if (deps.next) stack.add("Next.js");
          if (deps.vue) stack.add("Vue");
          if (deps.svelte) stack.add("Svelte");
          if (deps.express) stack.add("Express");
          if (deps.fastify) stack.add("Fastify");
          if (deps.typescript) stack.add("TypeScript");
          if (deps.tailwindcss) stack.add("Tailwind CSS");
        } catch {
          // Ignore parse errors
        }
      } else if (file.filename === "requirements.txt") {
        stack.add("Python");
      } else if (file.filename === "Cargo.toml") {
        stack.add("Rust");
      } else if (file.filename === "go.mod") {
        stack.add("Go");
      }
    }

    return Array.from(stack);
  }

  /**
   * Combine multiple files into a single string
   *
   * Creates a combined representation suitable for storage in Convex.
   * Files are separated by comments indicating the filename.
   *
   * @param files - Array of files to combine
   * @returns Combined file content
   */
  private combineFiles(files: ArtifactFile[]): string {
    return files
      .map((file) => {
        const separator = "=".repeat(60);
        return `${separator}\n// File: ${file.filename}\n${separator}\n\n${file.content}`;
      })
      .join("\n\n");
  }

  /**
   * Parse combined multi-file content back into individual files
   *
   * Reverses the combineFiles operation.
   *
   * @param combinedContent - Combined content string
   * @returns Array of individual files
   */
  private parseMultiFileContent(combinedContent: string): ArtifactFile[] {
    const files: ArtifactFile[] = [];
    const separator = "=".repeat(60);

    // Split by the file separator pattern
    const parts = combinedContent.split(`${separator}\n`);

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      if (!part || part.trim() === "") continue;

      // Extract filename from comment
      const filenameMatch = part.match(/^\/\/ File: (.+)\n/);
      if (!filenameMatch) continue;

      const filename = filenameMatch[1]?.trim();
      if (!filename) continue;

      // Extract content (everything after the separator and filename line)
      const contentStart = part.indexOf("\n", part.indexOf("// File:"));
      if (contentStart === -1) continue;

      const content = part
        .substring(contentStart + 1)
        .replace(new RegExp(`^${separator}\n`), "")
        .trim();

      files.push({ filename, content });
    }

    return files;
  }

  /**
   * Close the Convex client connection
   */
  close(): void {
    this.client.close();
  }
}
