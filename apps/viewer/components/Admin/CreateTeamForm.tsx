"use client";

import { api } from "@recursor/convex/_generated/api";
import { Button } from "@repo/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/ui/components/card";
import { Checkbox } from "@repo/ui/components/checkbox";
import { Input } from "@repo/ui/components/input";
import { Label } from "@repo/ui/components/label";
import { RadioGroup, RadioGroupItem } from "@repo/ui/components/radio-group";
import { Textarea } from "@repo/ui/components/textarea";
import { useMutation } from "convex/react";
import { Code2, Lightbulb, Loader2, UserPlus, Users } from "lucide-react";
import { useState } from "react";

export function CreateTeamForm() {
  const [participantName, setParticipantName] = useState("");
  const [teamType, setTeamType] = useState<"standard" | "cursor">("standard");
  const [provideIdea, setProvideIdea] = useState(false);
  const [projectTitle, setProjectTitle] = useState("");
  const [projectDescription, setProjectDescription] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const createStack = useMutation(api.agents.createStack);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!participantName.trim()) return;

    setIsCreating(true);
    try {
      await createStack({
        participant_name: participantName.trim(),
        team_type: teamType,
        // Pass initial project idea if provided
        ...(provideIdea &&
          projectTitle &&
          projectDescription && {
            initial_project_title: projectTitle.trim(),
            initial_project_description: projectDescription.trim(),
          }),
      });

      // Reset form
      setParticipantName("");
      setTeamType("standard");
      setProvideIdea(false);
      setProjectTitle("");
      setProjectDescription("");
    } catch (error) {
      console.error("Failed to create team:", error);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Card className="border-border bg-card h-fit">
      <CardHeader>
        <CardTitle className="font-mono text-sm font-semibold flex items-center gap-2">
          <UserPlus className="size-4" />
          Create New Team
        </CardTitle>
        <CardDescription className="font-mono text-xs text-muted-foreground">
          Add a new participant to the hackathon
        </CardDescription>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Participant Name Input */}
          <div className="space-y-2">
            <Label
              htmlFor="team-name"
              className="font-mono text-xs font-medium"
            >
              Participant Name
              <span className="text-red-500 ml-1">*</span>
            </Label>
            <Input
              id="team-name"
              value={participantName}
              onChange={(e) => setParticipantName(e.target.value)}
              placeholder="Enter team name"
              className="font-mono text-sm bg-background border-border focus:ring-1 focus:ring-foreground/10"
              required
              disabled={isCreating}
            />
            <p className="font-mono text-[10px] text-muted-foreground">
              Choose a unique name for this agent team
            </p>
          </div>

          {/* Team Type Selection */}
          <div className="space-y-3">
            <Label className="font-mono text-xs font-medium pl-1">
              Team Architecture
              <span className="text-red-500 ml-1">*</span>
            </Label>
            <RadioGroup
              value={teamType}
              onValueChange={(value) =>
                setTeamType(value as "standard" | "cursor")
              }
              disabled={isCreating}
              className="space-y-2"
            >
              {/* Standard Multi-Agent Option */}
              <div className="flex items-start space-x-3 p-3 rounded-lg border border-border hover:bg-muted/20 transition-colors">
                <RadioGroupItem
                  value="standard"
                  id="standard"
                  className="mt-0.5"
                />
                <div className="space-y-1 flex-1">
                  <Label
                    htmlFor="standard"
                    className="font-mono text-xs cursor-pointer flex items-center gap-2"
                  >
                    <Users className="size-3.5" />
                    Standard Multi-Agent (4 agents)
                  </Label>
                  <p className="font-mono text-[10px] text-muted-foreground leading-relaxed">
                    Traditional architecture with Planner, Builder,
                    Communicator, and Reviewer agents working in coordination.
                  </p>
                </div>
              </div>

              {/* Cursor Background Agent Option */}
              <div className="flex items-start space-x-3 p-3 rounded-lg border border-border hover:bg-muted/20 transition-colors">
                <RadioGroupItem value="cursor" id="cursor" className="mt-0.5" />
                <div className="space-y-1 flex-1">
                  <Label
                    htmlFor="cursor"
                    className="font-mono text-xs cursor-pointer flex items-center gap-2"
                  >
                    <Code2 className="size-3.5" />
                    Cursor Background Agent
                  </Label>
                  <p className="font-mono text-[10px] text-muted-foreground leading-relaxed">
                    Single autonomous agent with full IDE tooling (grep, lint,
                    test, git) working in an isolated VM with GitHub workspace.
                  </p>
                </div>
              </div>
            </RadioGroup>
          </div>

          {/* Provide Initial Idea Checkbox */}
          <div className="flex items-start space-x-3 p-3 rounded-lg bg-muted/20 border border-border">
            <Checkbox
              id="provide-idea"
              checked={provideIdea}
              onCheckedChange={(checked) => setProvideIdea(checked as boolean)}
              disabled={isCreating}
              className="mt-0.5"
            />
            <div className="space-y-1">
              <Label
                htmlFor="provide-idea"
                className="font-mono text-xs cursor-pointer flex items-center gap-2"
              >
                <Lightbulb className="size-3" />
                Provide initial project idea
              </Label>
              <p className="font-mono text-[10px] text-muted-foreground">
                Give the team a starting direction (optional)
              </p>
            </div>
          </div>

          {/* Project Idea Fields (Conditional) */}
          {provideIdea && (
            <div className="space-y-3 p-3 rounded-lg bg-muted/10 border border-dashed border-border animate-in fade-in slide-in-from-top-1 duration-200">
              <div className="space-y-2">
                <Label
                  htmlFor="project-title"
                  className="font-mono text-xs font-medium"
                >
                  Project Title
                </Label>
                <Input
                  id="project-title"
                  value={projectTitle}
                  onChange={(e) => setProjectTitle(e.target.value)}
                  placeholder="e.g., AI-powered task manager"
                  className="font-mono text-sm bg-background border-border"
                  disabled={isCreating}
                />
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor="project-description"
                  className="font-mono text-xs font-medium"
                >
                  Project Description
                </Label>
                <Textarea
                  id="project-description"
                  value={projectDescription}
                  onChange={(e) => setProjectDescription(e.target.value)}
                  placeholder="Describe the project idea..."
                  className="font-mono text-sm bg-background border-border resize-none"
                  rows={3}
                  disabled={isCreating}
                />
              </div>
            </div>
          )}

          {/* Submit Button */}
          <Button
            type="submit"
            disabled={isCreating || !participantName.trim()}
            className="w-full font-mono text-xs bg-foreground hover:bg-foreground/90 text-background"
          >
            {isCreating ? (
              <>
                <Loader2 className="size-3.5 animate-spin" />
                Creating Team...
              </>
            ) : (
              <>
                <UserPlus className="size-3.5" />
                Create Team
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
