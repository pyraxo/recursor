# Cursor Agent Structured Decision-Making Implementation Plan

**Status**: Planning
**Created**: 2025-10-19
**Owner**: Agent Architecture Team
**Priority**: High

## Executive Summary

This plan addresses the critical gap in the Cursor Background Agent architecture: while the standard 4-agent system has detailed, structured decision-making frameworks embedded in prompts, the Cursor agent receives only generic "job description" guidance. This plan implements a hybrid approach that gives the single Cursor agent the same structured thinking capabilities as the 4-agent system while leveraging its unique advantages (multi-file projects, git workspace, IDE tooling).

## Problem Statement

### Current State

**4-Agent System (Standard Teams)**:
- ✅ Each agent gets highly specific, role-based prompts with detailed instructions
- ✅ Structured JSON outputs with schemas (thinking + actions/results)
- ✅ Decision frameworks embedded (phase transitions, priority 1-10 scoring)
- ✅ Inter-agent communication (reviewer → planner recommendations)
- ✅ Sequential workflow enforcement (plan → build → communicate → review)
- ✅ Examples and anti-patterns in prompts

**Cursor Agent System (Cursor Teams)**:
- ❌ Generic "job description" prompt (lists responsibilities without HOW)
- ❌ No structured workflow enforcement
- ❌ No decision frameworks or scoring systems
- ❌ No multi-step thinking process
- ✅ Git-based workspace (advantage!)
- ✅ Full IDE tooling and multi-file support
- ✅ Autonomous operation in isolated VM

### The Gap

The Cursor agent prompt (packages/agent-engine/src/cursor/cursor-team-orchestrator.ts:762-897) tells agents WHAT to do but not HOW:

```
## Your Responsibilities (Consolidated Multi-Agent Approach)

### 1. Planning (Planner Role)
- Analyze the current project state and requirements
- Break down complex work into logical, achievable steps
...
```

Compare to the 4-agent Planner prompt (packages/convex/convex/lib/llmProvider.ts:650-695):

```
Priority is 1-10, with 10 being most important.

PHASE MANAGEMENT:
You control which phase the team is in. Update it as you make progress:
- "ideation": ... Stay here until you have a solid project description.
- "building": ... Move here once you have todos and are building.
[Detailed decision criteria for each phase]
```

**Result**: Cursor agents lack the structured decision-making frameworks needed to make consistent, high-quality autonomous decisions.

## Goals

1. **Give Cursor agents the same decision-making capability as 4-agent teams**
2. **Maintain Cursor-specific advantages** (multi-file, git, IDE tooling)
3. **Enable traceable, debuggable decision processes**
4. **Allow iterative improvement** of agent expertise over time
5. **Minimize prompt token usage** by externalizing guides to the repo

## Architectural Approach

### Selected Architecture: Hybrid Repository-Based Workflow System

This approach uses the git repository as an "external brain" containing detailed workflow guides, decision frameworks, and examples - effectively giving the agent a persistent knowledge base it can reference.

```
Repository Structure:
.
├── docs/
│   └── cursor-agent/
│       ├── workflows/              # Detailed role-specific guides
│       │   ├── planning.md         # Full planner expertise
│       │   ├── building.md         # Full builder expertise
│       │   ├── review.md           # Full reviewer expertise
│       │   └── communication.md    # Full communicator expertise
│       ├── frameworks/             # Decision-making frameworks
│       │   ├── phase-management.md
│       │   ├── priority-scoring.md
│       │   ├── commit-strategy.md
│       │   └── scope-management.md
│       ├── examples/               # Showcase of excellent decisions
│       │   ├── excellent-planning.md
│       │   ├── excellent-building.md
│       │   ├── scope-cut-success.md
│       │   └── phase-transition.md
│       └── templates/
│           └── tick-execution-template.md
├── logs/
│   ├── tick-001.md                # Execution logs (agent creates)
│   ├── tick-002.md
│   └── ...
└── src/                           # Actual project code
    └── ...
```

### Why This Approach?

**Advantages**:
1. ✅ **Workflow guides can be exact copies** of 4-agent system prompts
2. ✅ **Externalized expertise** reduces prompt token usage
3. ✅ **Traceable decisions** via execution logs in git
4. ✅ **Iterative refinement** - update guides based on observation
5. ✅ **State management stays in Convex** (no duplication)
6. ✅ **Agent learns from previous ticks** via logs
7. ✅ **Debuggable** - can see exactly what agent read and decided

**How It Works**:
1. Workspace setup creates workflow guides in repository
2. Prompt directs agent to read specific guides for each role
3. Agent executes each role sequentially with guidance
4. Agent logs decisions to `logs/tick-NNN.md`
5. Future ticks can reference past logs for continuity

## Implementation Phases

### Phase 1: Extract and Document 4-Agent Expertise ✓ (Design Complete)

**Objective**: Convert implicit knowledge in llmProvider.ts into explicit markdown guides

**Tasks**:

#### Task 1.1: Create Workflow Guides
**Files to Create**:
- `docs/cursor-agent/workflows/planning.md`
- `docs/cursor-agent/workflows/building.md`
- `docs/cursor-agent/workflows/review.md`
- `docs/cursor-agent/workflows/communication.md`

**Source Material**:
- Extract from: `packages/convex/convex/lib/llmProvider.ts:645-804`
- Method: `getRoleDescription()` contains full prompts for each role
- Format: Convert to standalone markdown documents

**Content Structure for Each Guide**:
```markdown
# [Role] Workflow Guide

## Role Description
[Clear statement of role purpose]

## Core Principles
[Key guiding principles for this role]

## Decision Frameworks
[Structured decision-making processes]

## Output Format
[Expected JSON structure]

## Examples
[Good and bad examples]

## Anti-Patterns
[Common mistakes to avoid]
```

**Acceptance Criteria**:
- [ ] All 4 workflow guides created
- [ ] Content matches llmProvider.ts prompts exactly
- [ ] Examples included for each major decision type
- [ ] Anti-patterns documented
- [ ] Output schemas clearly defined

#### Task 1.2: Create Decision Frameworks
**Files to Create**:
- `docs/cursor-agent/frameworks/phase-management.md`
- `docs/cursor-agent/frameworks/priority-scoring.md`
- `docs/cursor-agent/frameworks/commit-strategy.md`
- `docs/cursor-agent/frameworks/scope-management.md`

**Content for phase-management.md**:
```markdown
# Phase Management Framework

## Phase Lifecycle
ideation (2-3 ticks) → building (4-8 ticks) → demo (2-3 ticks) → complete

## Phase: Ideation
**Purpose**: Define what you're building
**Entry Criteria**: [...]
**Success Criteria**: [...]
**Transition Rules**: [...]
**Red Flags**: [...]

[Similar for each phase]

## Decision Tree
[Flowchart-style decision logic]

## Examples of Good Phase Transitions
[Real examples with reasoning]
```

**Content for priority-scoring.md**:
```markdown
# Priority Scoring Framework (1-10 Scale)

## Priority 10 (Critical Blocker)
- Blocks all other work
- System doesn't work without it
- Examples: [...]

## Priority 7-9 (Major Feature)
- Core functionality
- Key user-facing feature
- Examples: [...]

[Continue for all priority levels]

## Scoring Rubric
[Decision matrix for assigning priorities]
```

**Acceptance Criteria**:
- [ ] All 4 framework docs created
- [ ] Decision trees formalized
- [ ] Scoring rubrics with examples
- [ ] Clear transition criteria defined

#### Task 1.3: Create Example Showcases
**Files to Create**:
- `docs/cursor-agent/examples/excellent-planning.md`
- `docs/cursor-agent/examples/excellent-building.md`
- `docs/cursor-agent/examples/excellent-review.md`
- `docs/cursor-agent/examples/scope-cut-success.md`
- `docs/cursor-agent/examples/phase-transition.md`

**Content Structure**:
```markdown
# Example: [Scenario]

## Context
[Setup and state]

## Decision Made
[What the agent decided]

## Reasoning
[Why this was excellent]

## Outcome
[What happened as a result]

## Key Takeaways
[Lessons to apply]
```

**Acceptance Criteria**:
- [ ] At least 5 examples created
- [ ] Cover common decision scenarios
- [ ] Include both simple and complex cases
- [ ] Demonstrate best practices from 4-agent system

#### Task 1.4: Create Execution Template
**File to Create**:
- `docs/cursor-agent/templates/tick-execution-template.md`

**Content**:
```markdown
# Tick Execution Log - Template

## Instructions
Copy this file to `logs/tick-NNN.md` and fill in each section as you work through this tick.

## Tick Metadata
- Tick Number: [N]
- Started At: [timestamp]
- Phase: [current phase]

## Phase 1: Planning

### Context Loading
- Current project: [name]
- Current phase: [phase]
- Pending todos: [count]
- Recent changes: [summary]

### Decision Framework Application

#### Phase Transition Analysis
📖 **Reference**: docs/cursor-agent/frameworks/phase-management.md

- Currently in: [phase]
- Should transition? [YES/NO]
- Reasoning: [apply decision tree from framework]
- New phase (if yes): [phase]

#### Priority Scoring
📖 **Reference**: docs/cursor-agent/frameworks/priority-scoring.md

For each todo, score 1-10:
- [Todo 1]: Priority [score] - Reasoning: [...]
- [Todo 2]: Priority [score] - Reasoning: [...]

#### Todo Management Decisions
- Create: [list with reasoning]
- Update: [list with reasoning]
- Delete: [list with reasoning]

### Planning Summary
[What did you decide and why?]

## Phase 2: Building

### Todo Selection
Selected: [highest priority todo]
Why: [reasoning]

### Implementation Plan
📖 **Reference**: docs/cursor-agent/workflows/building.md

- Approach: [description]
- Files to create/modify: [list]
- Key challenges: [list]

### Build Log
[Document implementation steps]

### Commit
- Message: [semantic format]
- Files changed: [list]

## Phase 3: Review

### Assessment
📖 **Reference**: docs/cursor-agent/workflows/review.md

- Demo-ready? [YES/NO - reasoning]
- Completion estimate: [%]
- Time analysis: [ticks used vs remaining]

### Blocker Analysis
- Current blockers: [list or NONE]
- Potential blockers: [list]

### Scope Management
📖 **Reference**: docs/cursor-agent/frameworks/scope-management.md

- Should cut scope? [YES/NO - reasoning]
- Features to cut: [list with reasoning]

### Recommendations
1. [Specific recommendation]
2. [Specific recommendation]

## Phase 4: Communication

### Messages Received
[List messages to respond to]

### Responses
📖 **Reference**: docs/cursor-agent/workflows/communication.md

[For each message, your response]

## Meta-Review

### What Went Well
[Successes this tick]

### What to Improve
[Areas for next tick]

### Notes for Future Ticks
[Things to remember]
```

**Acceptance Criteria**:
- [ ] Template covers all 4 roles
- [ ] References framework docs explicitly
- [ ] Structured for easy filling
- [ ] Captures decision reasoning

**Estimated Effort**: 2-3 days
**Dependencies**: Access to llmProvider.ts source

---

### Phase 2: Enhance Workspace Manager

**Objective**: Automatically create workflow guides in each Cursor team workspace

**Tasks**:

#### Task 2.1: Create Workflow Guide Generator
**File to Modify**: `packages/agent-engine/src/cursor/workspace-manager.ts`

**New Methods to Add**:

```typescript
/**
 * Set up agent workflow documentation in repository
 * This creates the "external brain" for the agent with all decision-making guides
 */
async setupAgentWorkflows(workspace: VirtualWorkspace): Promise<void> {
  const agentDocsPath = path.join(workspace.localPath, 'docs/cursor-agent');

  console.log('[WorkspaceManager] Creating agent workflow documentation...');

  // Create directory structure
  await fs.mkdir(path.join(agentDocsPath, 'workflows'), { recursive: true });
  await fs.mkdir(path.join(agentDocsPath, 'frameworks'), { recursive: true });
  await fs.mkdir(path.join(agentDocsPath, 'examples'), { recursive: true });
  await fs.mkdir(path.join(agentDocsPath, 'templates'), { recursive: true });
  await fs.mkdir(path.join(workspace.localPath, 'logs'), { recursive: true });

  // Create workflow guides
  await this.createWorkflowGuide(agentDocsPath, 'planning');
  await this.createWorkflowGuide(agentDocsPath, 'building');
  await this.createWorkflowGuide(agentDocsPath, 'review');
  await this.createWorkflowGuide(agentDocsPath, 'communication');

  // Create decision frameworks
  await this.createFrameworkDoc(agentDocsPath, 'phase-management');
  await this.createFrameworkDoc(agentDocsPath, 'priority-scoring');
  await this.createFrameworkDoc(agentDocsPath, 'commit-strategy');
  await this.createFrameworkDoc(agentDocsPath, 'scope-management');

  // Create examples
  await this.createExampleDoc(agentDocsPath, 'excellent-planning');
  await this.createExampleDoc(agentDocsPath, 'excellent-building');
  await this.createExampleDoc(agentDocsPath, 'excellent-review');
  await this.createExampleDoc(agentDocsPath, 'scope-cut-success');
  await this.createExampleDoc(agentDocsPath, 'phase-transition');

  // Create execution template
  await this.createTickTemplate(agentDocsPath);

  // Create README explaining the system
  await this.createAgentDocsReadme(agentDocsPath);

  console.log('[WorkspaceManager] Agent documentation created');
}

/**
 * Create a workflow guide for a specific role
 */
private async createWorkflowGuide(basePath: string, role: string): Promise<void> {
  const content = this.getWorkflowGuideContent(role);
  const filepath = path.join(basePath, 'workflows', `${role}.md`);
  await fs.writeFile(filepath, content, 'utf-8');
  console.log(`[WorkspaceManager] Created workflow guide: ${role}`);
}

/**
 * Get workflow guide content for a role
 * This extracts and formats the expertise from the 4-agent system
 */
private getWorkflowGuideContent(role: string): string {
  // Content from Phase 1 Task 1.1
  // Return the complete markdown guide for this role
  // Implementation note: Load from template files or embed directly

  switch (role) {
    case 'planning':
      return PLANNING_WORKFLOW_GUIDE; // From Phase 1
    case 'building':
      return BUILDING_WORKFLOW_GUIDE; // From Phase 1
    case 'review':
      return REVIEW_WORKFLOW_GUIDE; // From Phase 1
    case 'communication':
      return COMMUNICATION_WORKFLOW_GUIDE; // From Phase 1
    default:
      throw new Error(`Unknown role: ${role}`);
  }
}

/**
 * Create a decision framework document
 */
private async createFrameworkDoc(basePath: string, framework: string): Promise<void> {
  const content = this.getFrameworkContent(framework);
  const filepath = path.join(basePath, 'frameworks', `${framework}.md`);
  await fs.writeFile(filepath, content, 'utf-8');
  console.log(`[WorkspaceManager] Created framework: ${framework}`);
}

private getFrameworkContent(framework: string): string {
  // Content from Phase 1 Task 1.2
  switch (framework) {
    case 'phase-management':
      return PHASE_MANAGEMENT_FRAMEWORK;
    case 'priority-scoring':
      return PRIORITY_SCORING_FRAMEWORK;
    case 'commit-strategy':
      return COMMIT_STRATEGY_FRAMEWORK;
    case 'scope-management':
      return SCOPE_MANAGEMENT_FRAMEWORK;
    default:
      throw new Error(`Unknown framework: ${framework}`);
  }
}

/**
 * Create an example showcase document
 */
private async createExampleDoc(basePath: string, example: string): Promise<void> {
  const content = this.getExampleContent(example);
  const filepath = path.join(basePath, 'examples', `${example}.md`);
  await fs.writeFile(filepath, content, 'utf-8');
  console.log(`[WorkspaceManager] Created example: ${example}`);
}

private getExampleContent(example: string): string {
  // Content from Phase 1 Task 1.3
  // Return the example showcase markdown
  // Implementation: Load from template files
  return EXAMPLE_SHOWCASES[example];
}

/**
 * Create the execution template
 */
private async createTickTemplate(basePath: string): Promise<void> {
  const content = TICK_EXECUTION_TEMPLATE; // From Phase 1 Task 1.4
  const filepath = path.join(basePath, 'templates', 'tick-execution-template.md');
  await fs.writeFile(filepath, content, 'utf-8');
  console.log('[WorkspaceManager] Created execution template');
}

/**
 * Create README explaining the agent documentation system
 */
private async createAgentDocsReadme(basePath: string): Promise<void> {
  const readme = `# Cursor Agent Documentation

This directory contains your workflow guides, decision frameworks, and execution templates.

## How This Works

You are an autonomous agent simulating a 4-person team (Planner, Builder, Communicator, Reviewer).
This documentation gives you the expertise of each role.

## Directory Structure

- **workflows/** - Detailed guides for each role (read these when executing that role)
- **frameworks/** - Decision-making frameworks (reference for specific decisions)
- **examples/** - Showcases of excellent decisions (learn from these)
- **templates/** - Execution log template (copy and fill out each tick)

## Execution Process

For each tick:

1. Copy \`templates/tick-execution-template.md\` to \`../logs/tick-NNN.md\`
2. Read \`workflows/planning.md\` and execute planning role
3. Read \`workflows/building.md\` and execute building role
4. Read \`workflows/review.md\` and execute review role
5. Read \`workflows/communication.md\` and execute communication role
6. Fill out the execution log as you go
7. Commit everything (code changes + execution log)

## Key Principle

**The guides contain hard-won expertise from many iterations.**
Trust them. Follow the decision frameworks. Reference the examples.

Your job is to execute the workflows, not reinvent them.
`;

  await fs.writeFile(path.join(basePath, 'README.md'), readme, 'utf-8');
}
```

**Acceptance Criteria**:
- [ ] Methods create all documentation files
- [ ] Directory structure matches design
- [ ] Content loaded from Phase 1 artifacts
- [ ] README explains the system
- [ ] Error handling for file operations

#### Task 2.2: Integrate into Workspace Creation
**File to Modify**: `packages/agent-engine/src/cursor/workspace-manager.ts`

**Changes**:

In `createWorkspace()` method, add after initial commit:

```typescript
// Set up agent workflow documentation
await this.setupAgentWorkflows(workspace);

// Commit the documentation
await workspace.git.add('docs/');
await workspace.git.add('logs/.gitkeep');
await workspace.git.commit('chore: add agent workflow guides and decision frameworks');
await workspace.git.push('origin', workspace.branch);

console.log('[WorkspaceManager] Agent documentation committed to repository');
```

**Acceptance Criteria**:
- [ ] Documentation created for every new workspace
- [ ] Documentation committed to git before agent starts
- [ ] Logs directory initialized with .gitkeep

#### Task 2.3: Handle Existing Workspaces
**File to Modify**: `packages/agent-engine/src/cursor/workspace-manager.ts`

**Changes**:

In `cloneExistingWorkspace()` method, add check:

```typescript
// Check if agent documentation exists
const docsPath = path.join(workspace.localPath, 'docs/cursor-agent/README.md');
const docsExist = await fs.access(docsPath).then(() => true).catch(() => false);

if (!docsExist) {
  console.log('[WorkspaceManager] Existing workspace missing agent docs, creating...');
  await this.setupAgentWorkflows(workspace);

  await workspace.git.add('docs/');
  await workspace.git.commit('chore: add missing agent workflow guides');
  await workspace.git.push('origin', workspace.branch);
}
```

**Acceptance Criteria**:
- [ ] Existing workspaces get documentation if missing
- [ ] No error if documentation already exists
- [ ] Backward compatible with old workspaces

**Estimated Effort**: 3-4 days
**Dependencies**: Phase 1 complete

---

### Phase 3: Enhance Cursor Orchestrator Prompt

**Objective**: Update the unified prompt to leverage workflow guides

**Tasks**:

#### Task 3.1: Refactor buildUnifiedPrompt()
**File to Modify**: `packages/agent-engine/src/cursor/cursor-team-orchestrator.ts`

**Current Method**: Lines 743-897 (buildUnifiedPrompt)

**New Implementation**:

```typescript
/**
 * Build unified prompt that directs agent to workflow guides
 *
 * Instead of embedding all expertise in the prompt, we:
 * 1. Give high-level context and current state
 * 2. Direct agent to read specific workflow guides
 * 3. Provide execution template to structure thinking
 * 4. Emphasize logging and documentation
 */
private async buildUnifiedPrompt(pendingTodos: any[]): Promise<string> {
  const stack = await this.client.query(api.agents.getStack, {
    stackId: this.stackId,
  });

  const projectIdea = await this.client.query(api.project_ideas.get, {
    stackId: this.stackId,
  });

  const artifacts = await this.client.query(api.artifacts.list, {
    stackId: this.stackId,
  });

  const allMessages = await this.client.query(api.messages.getTimeline, {
    stackId: this.stackId,
  });
  const messages = allMessages?.slice(-5) || [];

  // Get the current tick number
  const existingLogs = await this.workspaceManager.listFiles(
    this.currentWorkspace!.repoName,
    'logs',
    this.currentWorkspace!.branch
  );
  const tickNumber = existingLogs.filter(f => f.startsWith('tick-')).length + 1;

  return `
# Autonomous Agent Execution - Tick ${tickNumber}

You are "${stack?.participant_name || "CursorTeam"}", an autonomous AI developer participating in the Recursor hackathon.

## Current State

**Project**: ${projectIdea?.title || "Undefined"}
**Description**: ${projectIdea?.description || "Define what you're building"}
**Phase**: ${stack?.phase || "ideation"}
**Artifacts**: ${artifacts?.length || 0} versions committed
**Pending Todos**: ${pendingTodos.length}

## Your Workflow Documentation

Your repository contains complete workflow guides with all the expertise you need:

📁 **docs/cursor-agent/**
- \`workflows/planning.md\` - Complete Planner role expertise
- \`workflows/building.md\` - Complete Builder role expertise
- \`workflows/review.md\` - Complete Reviewer role expertise
- \`workflows/communication.md\` - Complete Communicator role expertise
- \`frameworks/phase-management.md\` - Decision tree for phase transitions
- \`frameworks/priority-scoring.md\` - How to score priorities 1-10
- \`frameworks/commit-strategy.md\` - When and how to commit
- \`frameworks/scope-management.md\` - How to cut scope under time pressure
- \`examples/\` - Showcases of excellent decisions

**Read these guides!** They contain hard-won expertise from many iterations.

## Execution Instructions

### Step 1: Set Up Execution Log

1. Copy \`docs/cursor-agent/templates/tick-execution-template.md\` to \`logs/tick-${tickNumber}.md\`
2. Fill it out as you execute each role
3. This log is your memory and decision record

### Step 2: Execute Planning Role

📖 **Read**: \`docs/cursor-agent/workflows/planning.md\`
📊 **Apply**: \`docs/cursor-agent/frameworks/phase-management.md\` and \`priority-scoring.md\`

**Current Todos** (${pendingTodos.length} pending):
${pendingTodos
  .sort((a, b) => (b.priority || 0) - (a.priority || 0))
  .map((t, i) => `${i + 1}. [Priority ${t.priority || 0}] ${t.content}`)
  .join('\n')}

**Your Planning Tasks**:
1. Review current project state and todos
2. Apply phase transition decision tree - should we move phases?
3. Score each todo priority (1-10) using the scoring framework
4. Decide: create new todos / update existing / delete irrelevant / clear all?
5. Update project description if evolved
6. Document your planning reasoning in \`logs/tick-${tickNumber}.md\`

**Output**: Update todos in Convex (via your actions in logs directory)

### Step 3: Execute Building Role

📖 **Read**: \`docs/cursor-agent/workflows/building.md\`
🛠️ **Apply**: \`docs/cursor-agent/frameworks/commit-strategy.md\`

**Highest Priority Todo**: ${pendingTodos[0]?.content || "None"}

**Your Building Tasks**:
1. Take the highest priority todo
2. Plan your implementation approach
3. Write clean, working code (multi-file is encouraged!)
4. Test your implementation
5. Commit with semantic message: \`git commit -m "feat: description"\`
6. Push to remote: \`git push origin ${this.currentWorkspace?.branch}\`
7. Document your build process in \`logs/tick-${tickNumber}.md\`

**CRITICAL**: Uncommitted work is lost forever! Commit frequently.

### Step 4: Execute Review Role

📖 **Read**: \`docs/cursor-agent/workflows/review.md\`
🎯 **Apply**: \`docs/cursor-agent/frameworks/scope-management.md\`

**Your Review Tasks**:
1. Assess: Is this demo-ready for a hackathon?
2. Calculate: Time remaining vs work remaining
3. Identify: Any blockers preventing progress?
4. Decide: Should we cut scope?
5. Generate: Specific recommendations for next tick
6. Document your assessment in \`logs/tick-${tickNumber}.md\`

**Remember**: This is hackathon review, not production code review!

### Step 5: Execute Communication Role

📖 **Read**: \`docs/cursor-agent/workflows/communication.md\`

${messages && messages.length > 0
  ? `**Messages to Respond To**:
${messages.map((m: any) => `- From ${m.from_agent_type || m.from_user_name || "Unknown"}: ${m.content}`).join('\n')}

**Your Communication Tasks**:
1. Respond to each message (direct, conversational, 2-3 sentences)
2. Create broadcasts ONLY if planning created a broadcast todo
3. Document your responses in \`logs/tick-${tickNumber}.md\``
  : `**No messages** to respond to this tick.`}

### Step 6: Finalize

1. Review your execution log: \`logs/tick-${tickNumber}.md\`
2. Commit the log: \`git add logs/ && git commit -m "docs: tick ${tickNumber} execution log" && git push\`
3. Ensure all code changes are also committed

## Key Principles

1. **Follow the guides** - They contain proven expertise
2. **Document your thinking** - Fill out the execution log completely
3. **Commit frequently** - Uncommitted work disappears
4. **Move fast** - This is a hackathon, not production
5. **Be specific** - Vague decisions lead to vague results

## Reference the Examples

When unsure, check \`docs/cursor-agent/examples/\` for:
- How to make good planning decisions
- How to build quality features quickly
- How to identify when to cut scope
- How to transition between phases

## What Success Looks Like

After this tick, you should have:
- ✅ Completed execution log in \`logs/tick-${tickNumber}.md\`
- ✅ Planning decisions made (phase, todos, priorities)
- ✅ Code implemented and committed (if there were todos)
- ✅ Review assessment documented
- ✅ Messages responded to (if any)
- ✅ Everything committed to git

---

**Now execute!** Start by copying the template to \`logs/tick-${tickNumber}.md\`, then work through each role systematically.
  `.trim();
}
```

**Acceptance Criteria**:
- [ ] Prompt directs to workflow guides explicitly
- [ ] Execution structure is clear and systematic
- [ ] Current state included for context
- [ ] Tick number tracked for logging
- [ ] Emphasis on documentation and commits

#### Task 3.2: Add Tick Tracking
**File to Modify**: `packages/agent-engine/src/cursor/cursor-team-orchestrator.ts`

**Changes**:

Add property to class:
```typescript
private currentTick: number = 0;
```

In `tick()` method, track tick number:
```typescript
async tick(): Promise<CursorOrchestrationResult> {
  this.currentTick++;
  this.tickCount++;

  console.log(`\n=== Cursor Tick ${this.tickCount} (Execution #${this.currentTick}) for stack ${this.stackId} ===`);
  // ... rest of method
}
```

Save tick number to Convex:
```typescript
await this.updateCursorConfig({
  current_tick: this.currentTick,
  last_tick_at: Date.now(),
});
```

**Acceptance Criteria**:
- [ ] Tick number increments each execution
- [ ] Tick number passed to prompt
- [ ] Tick number saved to Convex
- [ ] Tick number used in log filenames

**Estimated Effort**: 2-3 days
**Dependencies**: Phase 2 complete

---

### Phase 4: Implement Log-Based Memory

**Objective**: Enable agent to learn from previous ticks by reading past execution logs

**Tasks**:

#### Task 4.1: Add Log Reading to Prompt
**File to Modify**: `packages/agent-engine/src/cursor/cursor-team-orchestrator.ts`

**Enhancement to buildUnifiedPrompt()**:

```typescript
// Fetch recent execution logs from git
let recentLogs = '';
if (tickNumber > 1) {
  const previousTickLogs = await this.fetchRecentTickLogs(3); // Last 3 ticks
  if (previousTickLogs.length > 0) {
    recentLogs = `

## Recent Execution History

Here are your execution logs from the last ${previousTickLogs.length} tick(s):

${previousTickLogs.map((log, i) => `
### ${log.filename}

${log.content}

---
`).join('\n')}

**Learn from these logs**:
- What decisions did you make?
- What worked well?
- What should you improve?
- Any patterns or lessons?

`;
  }
}
```

Add to prompt before "Execution Instructions":
```typescript
${recentLogs}
```

**New Method**:
```typescript
/**
 * Fetch recent execution logs from git repository
 * These logs help the agent maintain continuity and learn from past decisions
 */
private async fetchRecentTickLogs(count: number): Promise<Array<{filename: string, content: string}>> {
  try {
    const logs: Array<{filename: string, content: string}> = [];

    // List log files
    const logFiles = await this.workspaceManager.listFiles(
      this.currentWorkspace!.repoName,
      'logs',
      this.currentWorkspace!.branch
    );

    // Filter and sort tick logs
    const tickLogs = logFiles
      .filter(f => f.match(/^tick-\d+\.md$/))
      .sort((a, b) => {
        const aNum = parseInt(a.match(/\d+/)![0]);
        const bNum = parseInt(b.match(/\d+/)![0]);
        return bNum - aNum; // Descending order
      })
      .slice(0, count);

    // Fetch content for each log
    for (const logFile of tickLogs) {
      const content = await this.workspaceManager.readFile(
        this.currentWorkspace!.repoName,
        `logs/${logFile}`,
        this.currentWorkspace!.branch
      );
      logs.push({
        filename: logFile,
        content: content.substring(0, 3000) // Limit to 3000 chars per log
      });
    }

    return logs;
  } catch (error) {
    console.error('[CursorOrchestrator] Failed to fetch recent logs:', error);
    return [];
  }
}
```

**Acceptance Criteria**:
- [ ] Agent receives last 3 tick logs in prompt
- [ ] Logs loaded from git repository
- [ ] Content truncated to prevent token bloat
- [ ] Graceful handling if logs don't exist
- [ ] Agent explicitly told to learn from logs

#### Task 4.2: Add Meta-Learning Prompt Section
**File to Modify**: `packages/agent-engine/src/cursor/cursor-team-orchestrator.ts`

**Add to prompt** (after Step 6: Finalize):

```typescript
### Step 7: Meta-Learning

Before finishing this tick, reflect on your execution:

1. **Review your execution log** - Did you follow the workflow guides?
2. **Assess your decisions** - Were they well-reasoned using the frameworks?
3. **Identify improvements** - What would you do differently next tick?
4. **Note patterns** - Any recurring issues or successful strategies?

**Add a "Meta-Review" section** to \`logs/tick-${tickNumber}.md\`:
```markdown
## Meta-Review

### What Went Well
[Successes this tick]

### What to Improve Next Tick
[Specific improvements]

### Lessons Learned
[Patterns or insights]
```

This reflection will help you in future ticks!
```

**Acceptance Criteria**:
- [ ] Agent prompted to reflect after execution
- [ ] Meta-review section in template
- [ ] Emphasis on learning and improvement

**Estimated Effort**: 1-2 days
**Dependencies**: Phase 3 complete

---

### Phase 5: Testing and Validation

**Objective**: Verify the enhanced Cursor agent makes better decisions than baseline

**Tasks**:

#### Task 5.1: Create Test Scenarios
**File to Create**: `tests/cursor-agent-decision-making.test.ts`

**Test Scenarios**:

1. **Phase Transition Test**
   - Setup: Agent in ideation with solid project description
   - Expected: Agent transitions to building phase
   - Validation: Check execution log shows decision tree application

2. **Priority Scoring Test**
   - Setup: Multiple todos of varying importance
   - Expected: Agent scores using 1-10 scale with reasoning
   - Validation: Check priorities align with scoring framework

3. **Scope Management Test**
   - Setup: 70% time elapsed, 40% work complete
   - Expected: Agent identifies scope issue and cuts features
   - Validation: Check review recommendations in log

4. **Commit Frequency Test**
   - Setup: Complete a todo
   - Expected: Agent commits with semantic message
   - Validation: Check git history for commit

5. **Execution Log Test**
   - Setup: Run a full tick
   - Expected: Complete execution log created in logs/
   - Validation: Check log has all sections filled out

**Acceptance Criteria**:
- [ ] All 5 test scenarios implemented
- [ ] Tests can run automatically
- [ ] Pass/fail criteria clearly defined
- [ ] Tests validate against execution logs

#### Task 5.2: A/B Comparison Framework
**File to Create**: `scripts/compare-cursor-agents.ts`

**Purpose**: Compare old vs new Cursor agent on same tasks

**Implementation**:
```typescript
/**
 * A/B Comparison Script
 *
 * Runs the same task through:
 * 1. Old cursor agent (generic prompt)
 * 2. New cursor agent (workflow guides)
 *
 * Compares:
 * - Decision quality
 * - Reasoning clarity
 * - Alignment with 4-agent system
 */

interface ComparisonResult {
  scenario: string;
  oldAgentDecision: string;
  newAgentDecision: string;
  oldAgentReasoning: string;
  newAgentReasoning: string;
  winner: 'old' | 'new' | 'tie';
  notes: string;
}

async function runComparison(scenario: TestScenario): Promise<ComparisonResult> {
  // Run with old prompt
  const oldResult = await runWithOldPrompt(scenario);

  // Run with new prompt + guides
  const newResult = await runWithNewPrompt(scenario);

  // Compare results
  return {
    scenario: scenario.name,
    oldAgentDecision: oldResult.decision,
    newAgentDecision: newResult.decision,
    oldAgentReasoning: oldResult.reasoning,
    newAgentReasoning: newResult.reasoning,
    winner: evaluateWinner(oldResult, newResult, scenario),
    notes: generateComparisonNotes(oldResult, newResult)
  };
}
```

**Acceptance Criteria**:
- [ ] Script can run both agent versions
- [ ] Results saved to comparison report
- [ ] Winner determined by objective criteria
- [ ] Human review possible for edge cases

#### Task 5.3: Manual Testing Checklist
**File to Create**: `docs/guides/cursor-agent-testing-checklist.md`

**Content**:
```markdown
# Cursor Agent Testing Checklist

## Pre-Flight Checks

- [ ] Workflow guides present in repository
- [ ] Frameworks documentation exists
- [ ] Examples directory populated
- [ ] Execution template available
- [ ] Logs directory exists

## Test 1: Ideation → Building Transition

1. Create new Cursor team
2. Let agent run 2-3 ticks in ideation
3. Verify:
   - [ ] Project description evolves
   - [ ] Agent references phase-management.md
   - [ ] Transition decision documented in log
   - [ ] Agent moves to building phase

## Test 2: Priority Scoring

1. Create agent with 5 different todos
2. Verify:
   - [ ] Each todo has priority 1-10
   - [ ] Reasoning references priority-scoring.md
   - [ ] Priorities make sense (critical=10, polish=1)
   - [ ] Documented in execution log

## Test 3: Building with Commits

1. Agent in building phase with pending todo
2. Verify:
   - [ ] Code implemented
   - [ ] Semantic commit message used
   - [ ] Changes pushed to remote
   - [ ] Build process documented in log

## Test 4: Scope Management Under Time Pressure

1. Set up: 70% time elapsed, many todos pending
2. Verify:
   - [ ] Agent identifies time/scope mismatch
   - [ ] References scope-management.md
   - [ ] Recommends specific features to cut
   - [ ] Documented in review section of log

## Test 5: Learning from Logs

1. Run 3 ticks with same agent
2. On tick 4, verify:
   - [ ] Agent references previous logs in reasoning
   - [ ] Learns from past mistakes
   - [ ] Continues successful patterns
   - [ ] Meta-review section shows reflection

## Success Criteria

**All tests pass** = Agent has structured decision-making capability
**Any test fails** = Debug and fix before deployment
```

**Acceptance Criteria**:
- [ ] Checklist covers all key features
- [ ] Can be executed manually
- [ ] Pass/fail criteria clear
- [ ] Includes debugging guidance

**Estimated Effort**: 3-4 days
**Dependencies**: All previous phases complete

---

### Phase 6: Deployment and Monitoring

**Objective**: Roll out enhanced system and monitor decision quality

**Tasks**:

#### Task 6.1: Feature Flag Implementation
**File to Modify**: `packages/agent-engine/src/cursor/cursor-team-orchestrator.ts`

**Add feature flag**:
```typescript
private useWorkflowGuides: boolean;

constructor(
  stackId: Id<"agent_stacks">,
  cursorApiKey: string,
  githubToken: string,
  convexUrl: string,
  options?: {
    useWorkflowGuides?: boolean; // Default: true for new teams
  }
) {
  this.stackId = stackId;
  this.cursorAPI = new CursorAPIClient(cursorApiKey);
  this.workspaceManager = new VirtualWorkspaceManager(githubToken);
  this.artifactSync = new ArtifactSyncService(convexUrl);
  this.client = new ConvexClient(convexUrl);

  // Enable workflow guides by default for new teams
  this.useWorkflowGuides = options?.useWorkflowGuides ?? true;

  console.log(`[CursorOrchestrator] Workflow guides: ${this.useWorkflowGuides ? 'ENABLED' : 'DISABLED'}`);
}
```

Use flag in prompt building:
```typescript
private async buildUnifiedPrompt(pendingTodos: any[]): Promise<string> {
  if (this.useWorkflowGuides) {
    return this.buildGuidedPrompt(pendingTodos); // New system
  } else {
    return this.buildLegacyPrompt(pendingTodos); // Old system
  }
}
```

**Acceptance Criteria**:
- [ ] Feature flag controls guide usage
- [ ] Default is enabled for new teams
- [ ] Can be disabled for comparison
- [ ] Logged clearly in console

#### Task 6.2: Decision Quality Metrics
**File to Modify**: `packages/convex/convex/schema.ts`

**Add metrics table**:
```typescript
cursor_agent_metrics: defineTable({
  stack_id: v.id("agent_stacks"),
  tick_number: v.number(),

  // Decision quality scores (0-10)
  planning_quality: v.number(),
  building_quality: v.number(),
  review_quality: v.number(),
  communication_quality: v.number(),

  // Specific metrics
  used_workflow_guides: v.boolean(),
  referenced_frameworks: v.array(v.string()),
  execution_log_complete: v.boolean(),
  commits_this_tick: v.number(),

  // Automated scores
  phase_transition_appropriate: v.optional(v.boolean()),
  priority_scores_reasonable: v.optional(v.boolean()),
  commit_messages_semantic: v.optional(v.boolean()),

  timestamp: v.number(),
})
  .index("by_stack", ["stack_id"])
  .index("by_tick", ["stack_id", "tick_number"]),
```

**New mutation** to log metrics:
```typescript
export const logCursorAgentMetrics = mutation({
  args: {
    stack_id: v.id("agent_stacks"),
    tick_number: v.number(),
    metrics: v.object({
      used_workflow_guides: v.boolean(),
      referenced_frameworks: v.array(v.string()),
      execution_log_complete: v.boolean(),
      commits_this_tick: v.number(),
    })
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("cursor_agent_metrics", {
      stack_id: args.stack_id,
      tick_number: args.tick_number,
      ...args.metrics,
      timestamp: Date.now(),
    });
  }
});
```

**Acceptance Criteria**:
- [ ] Metrics captured each tick
- [ ] Stored in Convex for analysis
- [ ] Queryable by stack and tick
- [ ] Includes automated quality scores

#### Task 6.3: Create Decision Quality Dashboard
**File to Create**: `apps/dashboard/components/CursorAgent/DecisionQualityPanel.tsx`

**Component**:
```typescript
/**
 * Decision Quality Panel
 *
 * Shows metrics for Cursor agent decision-making:
 * - Are workflow guides being used?
 * - Are decisions well-reasoned?
 * - Is the execution log complete?
 * - Commit frequency
 */

export function DecisionQualityPanel({ stackId }: { stackId: Id<"agent_stacks"> }) {
  const metrics = useQuery(api.metrics.getCursorAgentMetrics, { stackId });

  return (
    <div className="decision-quality-panel">
      <h3>Decision Quality Metrics</h3>

      <div className="metrics-grid">
        <MetricCard
          title="Workflow Guide Usage"
          value={metrics?.used_workflow_guides ? "Yes" : "No"}
          status={metrics?.used_workflow_guides ? "good" : "warning"}
        />

        <MetricCard
          title="Frameworks Referenced"
          value={metrics?.referenced_frameworks?.length || 0}
          status={metrics?.referenced_frameworks?.length > 0 ? "good" : "warning"}
        />

        <MetricCard
          title="Execution Log"
          value={metrics?.execution_log_complete ? "Complete" : "Incomplete"}
          status={metrics?.execution_log_complete ? "good" : "error"}
        />

        <MetricCard
          title="Commits This Tick"
          value={metrics?.commits_this_tick || 0}
          status={metrics?.commits_this_tick > 0 ? "good" : "warning"}
        />
      </div>

      <div className="execution-log-viewer">
        <h4>Latest Execution Log</h4>
        <LogViewer stackId={stackId} />
      </div>
    </div>
  );
}
```

**Acceptance Criteria**:
- [ ] Panel shows key metrics
- [ ] Real-time updates
- [ ] Visual indicators (good/warning/error)
- [ ] Links to full execution logs

#### Task 6.4: Gradual Rollout Plan
**File to Create**: `docs/guides/cursor-agent-rollout-plan.md`

**Content**:
```markdown
# Cursor Agent Workflow Guides Rollout Plan

## Phase 1: Internal Testing (Week 1)
- Enable for 2-3 test teams
- Monitor decision quality metrics
- Review execution logs daily
- Fix any critical issues

**Success Criteria**:
- [ ] All test teams create execution logs
- [ ] Workflow guides are referenced
- [ ] No regressions in code quality

## Phase 2: Limited Beta (Week 2)
- Enable for 25% of new Cursor teams
- Compare metrics vs baseline (old prompt)
- Gather feedback from team monitoring

**Success Criteria**:
- [ ] Decision quality scores ≥ baseline
- [ ] Commit frequency maintained or improved
- [ ] No critical bugs

## Phase 3: Majority Rollout (Week 3)
- Enable for 75% of new Cursor teams
- Monitor at scale
- Refine workflow guides based on patterns

**Success Criteria**:
- [ ] Metrics stable at scale
- [ ] Guides refined based on common issues
- [ ] Documentation complete

## Phase 4: Full Rollout (Week 4)
- Enable for 100% of teams
- Old prompt deprecated
- Ongoing monitoring and refinement

**Success Criteria**:
- [ ] All teams using new system
- [ ] Decision quality consistently high
- [ ] Guides continue to evolve
```

**Acceptance Criteria**:
- [ ] Rollout plan has clear phases
- [ ] Success criteria defined
- [ ] Rollback plan included
- [ ] Timeline realistic

**Estimated Effort**: 2-3 days (implementation) + 4 weeks (rollout)
**Dependencies**: All previous phases complete

---

## Success Metrics

### Primary Metrics

1. **Decision Quality Score**
   - Target: ≥ 8/10 average across planning, building, review, communication
   - Measured: Human review of execution logs
   - Comparison: vs. 4-agent system decisions

2. **Workflow Guide Usage**
   - Target: 100% of ticks reference at least 2 guides
   - Measured: Automated scan of execution logs
   - Indicates: Agent is actually using the documentation

3. **Execution Log Completeness**
   - Target: 95% of ticks have complete logs
   - Measured: Automated validation of log structure
   - Indicates: Structured thinking is happening

4. **Commit Frequency**
   - Target: ≥ 1 commit per tick when building
   - Measured: Git history analysis
   - Indicates: Agent is shipping code

### Secondary Metrics

5. **Phase Transition Appropriateness**
   - Target: 90% of transitions follow decision tree
   - Measured: Manual review of logs
   - Indicates: Framework is being applied

6. **Priority Score Consistency**
   - Target: 85% of priorities align with scoring rubric
   - Measured: Manual review against framework
   - Indicates: Systematic prioritization

7. **Scope Management Effectiveness**
   - Target: Scope issues identified within 1 tick
   - Measured: Review of scope-cutting decisions
   - Indicates: Proactive time management

8. **Learning from History**
   - Target: 75% of ticks reference previous logs
   - Measured: Grep for log references in new logs
   - Indicates: Continuity and learning

## Risks and Mitigations

### Risk 1: Agent Ignores Workflow Guides
**Impact**: High - Defeats the entire purpose
**Probability**: Medium
**Mitigation**:
- Make guides mandatory in prompt ("You MUST read...")
- Add checklist: "Which guides did you read this tick?"
- Monitor usage metrics closely
- If ignored, strengthen prompt language

### Risk 2: Guides Are Too Long
**Impact**: Medium - Token bloat, agent skips sections
**Probability**: Medium
**Mitigation**:
- Keep guides focused and scannable
- Use clear headings and structure
- Provide TL;DR sections
- Monitor actual usage patterns

### Risk 3: Execution Logs Not Created
**Impact**: High - No memory, no learning, no traceability
**Probability**: Low
**Mitigation**:
- Make log creation first instruction
- Validate log exists before completing tick
- Automated alerts if logs missing
- Template makes it easy to follow

### Risk 4: Guides Become Outdated
**Impact**: Medium - Bad guidance leads to bad decisions
**Probability**: Medium
**Mitigation**:
- Regular review of guides (monthly)
- Update based on observed patterns
- Version control guides
- Deprecation warnings for old patterns

### Risk 5: Performance Regression
**Impact**: High - New system worse than old system
**Probability**: Low
**Mitigation**:
- A/B testing before full rollout
- Feature flag allows instant rollback
- Continuous monitoring of metrics
- Clear success criteria for rollout phases

## Open Questions

1. **Should guides be in markdown or a more structured format?**
   - Leaning toward: Markdown for readability and ease of editing
   - Alternative: JSON schema for programmatic validation

2. **How many previous logs should be included in prompt?**
   - Current plan: Last 3 ticks
   - Need to balance: Continuity vs token usage
   - May vary by context (more during building, less during ideation)

3. **Should execution logs be required or optional?**
   - Leaning toward: Required (enforce via validation)
   - Alternative: Optional but highly encouraged
   - Risk: If optional, agents may skip

4. **How to handle guide updates mid-project?**
   - Current plan: Update guides in repo, agent picks up changes
   - Risk: Inconsistent guidance across ticks
   - May need: Version locking per team

## Timeline

| Phase | Duration | Deliverables |
|-------|----------|--------------|
| Phase 1: Extract Expertise | 2-3 days | All workflow guides, frameworks, examples, templates |
| Phase 2: Workspace Manager | 3-4 days | Auto-creation of guides in repos |
| Phase 3: Enhanced Prompt | 2-3 days | New buildUnifiedPrompt() with guide references |
| Phase 4: Log Memory | 1-2 days | Log reading, meta-learning |
| Phase 5: Testing | 3-4 days | Test scenarios, A/B comparison, checklist |
| Phase 6: Deployment | 2-3 days + 4 weeks | Feature flag, metrics, dashboard, rollout |
| **Total** | **13-19 days** + 4 week rollout | Full system operational |

## Next Steps

1. **Review and Approve Plan** - Stakeholder sign-off on approach
2. **Begin Phase 1** - Extract expertise from llmProvider.ts
3. **Set Up Tracking** - Create project board with tasks
4. **Weekly Check-ins** - Review progress and adjust plan
5. **Prepare Test Environment** - Sandbox for testing changes

## Conclusion

This implementation plan transforms the Cursor agent from receiving generic "job description" guidance to having access to the same structured, battle-tested decision-making frameworks as the 4-agent system. By externalizing expertise into workflow guides, frameworks, and examples in the git repository, we give the agent a persistent "external brain" that enables:

- **Consistent decision-making** using proven frameworks
- **Traceable reasoning** through execution logs
- **Continuous learning** from past ticks
- **Iterative improvement** via guide refinement

The hybrid approach leverages Cursor's unique advantages (multi-file projects, git workspace, IDE tooling) while ensuring the same decision quality as the specialized 4-agent system.

**Success will be measured by**: Decision quality scores, workflow guide usage, execution log completeness, and commit frequency.

**Risk is mitigated by**: Feature flags for instant rollback, A/B testing, gradual rollout, and continuous monitoring.

The estimated timeline of 13-19 days implementation + 4 week rollout is realistic and allows for proper testing and validation at each phase.
