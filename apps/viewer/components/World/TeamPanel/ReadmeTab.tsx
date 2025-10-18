"use client";

import { useQuery } from "convex/react";
import { api } from "@recursor/convex/_generated/api";
import { Id } from "@recursor/convex/_generated/dataModel";

interface ReadmeTabProps {
  stackId: Id<"agent_stacks">;
}

export function ReadmeTab({ stackId }: ReadmeTabProps) {
  const stack = useQuery(api.agents.getStack, { stackId });
  const projectIdea = useQuery(api.project_ideas.getByStack, { stackId });
  const artifact = useQuery(api.artifacts.getLatest, { stackId });

  if (!stack) {
    return <div className="text-[var(--foreground)]/60 font-mono text-sm">Loading...</div>;
  }

  return (
    <div className="space-y-4 font-mono text-sm">
      <div>
        <h3 className="text-[var(--accent-primary)] font-bold mb-2 text-lg">
          {stack.participant_name}
        </h3>
        <div className="text-[var(--foreground)]/80">
          <span className="text-[var(--accent-secondary)]">Phase:</span> {stack.phase}
        </div>
      </div>

      {projectIdea ? (
        <div className="border-t-2 border-[var(--panel-border)] pt-4">
          <h4 className="text-[var(--accent-secondary)] font-bold mb-2">
            Project Idea
          </h4>
          <div className="bg-[var(--background)] p-3 border-2 border-[var(--panel-border)] rounded">
            <h5 className="text-[var(--accent-primary)] font-bold mb-2">
              {projectIdea.title}
            </h5>
            <p className="text-[var(--foreground)]/80 leading-relaxed">
              {projectIdea.description}
            </p>
            <div className="mt-2 text-xs text-[var(--foreground)]/60">
              Status: <span className="text-[var(--accent-quaternary)]">{projectIdea.status}</span>
            </div>
          </div>
        </div>
      ) : (
        <div className="border-t-2 border-[var(--panel-border)] pt-4">
          <div className="bg-[var(--background)] p-3 border-2 border-[var(--panel-border)] rounded text-center">
            <p className="text-[var(--foreground)]/60">
              📝 Project README coming soon...
            </p>
          </div>
        </div>
      )}

      <div className="border-t-2 border-[var(--panel-border)] pt-4">
        <h4 className="text-[var(--accent-secondary)] font-bold mb-2">
          See the Project
          {artifact && <span className="text-xs text-[var(--foreground)]/60 ml-2">(v{artifact.version})</span>}
        </h4>
        {artifact && artifact.type === "html_js" && artifact.content ? (
          <div className="bg-white p-1 border-2 border-[var(--panel-border)] rounded">
            <iframe
              srcDoc={artifact.content}
              className="w-full h-96 border-0 rounded"
              sandbox="allow-scripts allow-same-origin"
              title={`${stack.participant_name} Project`}
            />
            <div className="mt-2 p-2 bg-[var(--background)] text-xs text-[var(--foreground)]/60">
              ⚡ Live Preview
              {artifact.metadata?.tech_stack && (
                <span className="ml-2">
                  | Tech: {artifact.metadata.tech_stack.join(", ")}
                </span>
              )}
            </div>
          </div>
        ) : artifact && artifact.type === "external_link" ? (
          <div className="bg-[var(--background)] p-3 border-2 border-[var(--panel-border)] rounded">
            <a
              href={artifact.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[var(--accent-primary)] hover:text-[var(--accent-secondary)] underline"
            >
              🔗 View Project →
            </a>
            {artifact.metadata?.description && (
              <p className="mt-2 text-xs text-[var(--foreground)]/60">
                {artifact.metadata.description}
              </p>
            )}
          </div>
        ) : (
          <div className="bg-[var(--background)] p-3 border-2 border-[var(--panel-border)] rounded text-center">
            <p className="text-[var(--foreground)]/60 text-xs">
              🚀 Project artifacts will appear here when ready
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

