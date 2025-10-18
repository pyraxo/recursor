"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@recursor/convex/_generated/api";
import { Button } from "@repo/ui/button";
import { Input } from "@repo/ui/input";
import { Label } from "@repo/ui/label";
import { Textarea } from "@repo/ui/textarea";
import { Checkbox } from "@repo/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@repo/ui/card";

export function CreateTeamForm() {
  const [participantName, setParticipantName] = useState("");
  const [showProjectIdea, setShowProjectIdea] = useState(false);
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
      });

      // TODO: Create initial project idea if provided
      // This would require calling api.project_ideas.create after stack creation

      setParticipantName("");
      setProjectTitle("");
      setProjectDescription("");
      setShowProjectIdea(false);
    } catch (error) {
      console.error("Failed to create team:", error);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Create New Team</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="participant">Participant Name *</Label>
            <Input
              id="participant"
              value={participantName}
              onChange={(e) => setParticipantName(e.target.value)}
              placeholder="Enter team name"
              required
            />
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="show-project"
              checked={showProjectIdea}
              onCheckedChange={(checked) =>
                setShowProjectIdea(checked as boolean)
              }
            />
            <Label
              htmlFor="show-project"
              className="text-sm font-normal cursor-pointer"
            >
              Provide initial project idea
            </Label>
          </div>

          {showProjectIdea && (
            <>
              <div className="space-y-2">
                <Label htmlFor="title">Project Title</Label>
                <Input
                  id="title"
                  value={projectTitle}
                  onChange={(e) => setProjectTitle(e.target.value)}
                  placeholder="Enter project title"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Project Description</Label>
                <Textarea
                  id="description"
                  value={projectDescription}
                  onChange={(e) => setProjectDescription(e.target.value)}
                  placeholder="Enter project description"
                  rows={4}
                />
              </div>
            </>
          )}

          <Button type="submit" disabled={isCreating} className="w-full">
            {isCreating ? "Creating..." : "Create Team"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

