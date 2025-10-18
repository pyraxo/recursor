# docs/ Organization Guide

This document explains how to organize documentation files in the `/docs` directory.

## 📁 Directory Structure

```
docs/
├── analysis/          Technical analysis documents
├── plans/             Implementation plans and PRDs
├── guides/            How-to guides and setup instructions
├── todos/             Active todos and work-in-progress
│   └── done/          Completed todos and implementation summaries
└── *.md               Root-level permanent reference documentation
```

---

## 📂 Folder Purposes

### `/docs/analysis/`
**Purpose**: In-depth technical analysis, architectural decisions, and feasibility studies.

**Examples**:
- Architecture decision records (ADRs)
- Technology comparison documents
- Feasibility studies
- System design analysis

**Naming Convention**: `kebab-case-description.md` or `SCREAMING_SNAKE_CASE.md` for major decisions

**When to use**:
- Analyzing different technical approaches
- Documenting architectural decisions
- Comparing technologies or frameworks
- Deep-dive technical research

---

### `/docs/plans/`
**Purpose**: Implementation plans, product requirements, and roadmaps.

**Examples**:
- PRDs (Product Requirement Documents)
- Implementation plans
- Migration plans
- Feature specifications
- Step-by-step execution plans

**Naming Convention**: `kebab-case-feature-plan.md` or `prd.md`

**When to use**:
- Planning a new feature implementation
- Creating product specifications
- Outlining migration strategies
- Defining project roadmaps

---

### `/docs/guides/`
**Purpose**: How-to guides, setup instructions, and reference documentation.

**Examples**:
- Setup guides
- Configuration instructions
- Quick reference guides
- Best practices
- Troubleshooting guides

**Naming Convention**: `kebab-case-guide.md` or `kebab-case-setup.md`

**When to use**:
- Documenting setup procedures
- Creating reference documentation
- Writing how-to guides
- Explaining workflows

---

### `/docs/todos/`
**Purpose**: Active work-in-progress, scratchpads, and task tracking.

**Examples**:
- Living scratchpads
- Active implementation todos
- Work-in-progress notes
- Testing checklists

**Naming Convention**: `SCREAMING_SNAKE_CASE.md` for active work

**When to use**:
- Tracking active tasks
- Maintaining work-in-progress notes
- Quick scratchpad for ideas
- Testing checklists

**Important**: When work is complete:
- Move active todos to `/docs/todos/done/`
- Create implementation summaries in `/docs/todos/done/` (e.g., `FEATURE_NAME_COMPLETE.md`)
- Keep completed work archived for future reference

### `/docs/todos/done/`
**Purpose**: Archive for completed work, implementation summaries, and finished todos.

**Examples**:
- `VIEWER_INTEGRATION_COMPLETE.md` - Summary of completed viewer integration
- `AUTONOMOUS_IMPLEMENTATION_SUMMARY.md` - Summary of autonomous agent implementation
- `USER_CHAT_IMPLEMENTATION_COMPLETE.md` - Summary of user chat feature

**Naming Convention**: `SCREAMING_SNAKE_CASE.md` for summaries

**When to use**:
- Archiving completed todos from `/docs/todos/`
- Creating implementation summaries after feature completion
- Documenting what was accomplished and lessons learned
- Preserving historical context for future reference

---

### Root-Level `/docs/*.md`
**Purpose**: Permanent reference documentation and entry-point guides.

**Examples**:
- Getting started guides
- Testing documentation
- High-level project overviews
- Permanent reference material

**Naming Convention**: `SCREAMING_SNAKE_CASE.md` or `kebab-case.md`

**When to use**:
- Creating entry-point documentation
- High-level project overviews
- Permanent reference guides

**Note**: Implementation summaries and completion reports should go in `/docs/todos/done/`, not at root level.

---

## 🎯 Quick Decision Guide

**Ask yourself**:

1. **Is it analyzing a technical decision?** → `/docs/analysis/`
2. **Is it planning future work?** → `/docs/plans/`
3. **Is it explaining how to do something?** → `/docs/guides/`
4. **Is it active work-in-progress?** → `/docs/todos/`
5. **Is it a completed implementation summary?** → `/docs/todos/done/`
6. **Is it permanent reference documentation?** → `/docs/*.md` (root level)

---

## 📝 File Naming Best Practices

### Use Kebab Case for Most Files
```
good: viewer-integration-analysis.md
bad:  ViewerIntegrationAnalysis.md
bad:  viewer_integration_analysis.md
```

### Use SCREAMING_SNAKE_CASE for Important Summaries
```
good: VIEWER_INTEGRATION_COMPLETE.md
good: DASHBOARD_INTEGRATION_SUMMARY.md
good: GETTING_STARTED.md
```

### Be Descriptive
```
good: convex-graph-orchestration-feasibility.md
bad:  analysis1.md
bad:  temp.md
```

### Include Context
```
good: autonomous-agent-execution-plan.md
okay: agent-execution-plan.md
bad:  plan.md
```

---

## 🔄 Document Lifecycle

### 1. Planning Phase
**Location**: `/docs/plans/`
- Create implementation plan
- Define requirements

### 2. Analysis Phase
**Location**: `/docs/analysis/`
- Technical research
- Architecture decisions

### 3. Active Development
**Location**: `/docs/todos/`
- Work-in-progress notes
- Active checklists

### 4. Completion
**Actions**:
- Move active todos to `/docs/todos/done/`
- Create implementation summary in `/docs/todos/done/` (e.g., `FEATURE_NAME_COMPLETE.md`)
- Update guides in `/docs/guides/` if needed
- Update permanent reference docs in `/docs/*.md` if needed

---

## 📚 Examples from Current Repository

### Analysis Documents
```
docs/analysis/ORCHESTRATION_ARCHITECTURE_DECISION.md
docs/analysis/convex-graph-orchestration-feasibility.md
docs/analysis/convex-vs-mastra-orchestration.md
docs/analysis/viewer-integration-analysis.md
```

### Implementation Plans
```
docs/plans/prd.md
docs/plans/multi-agent-implementation.md
docs/plans/autonomous-agent-execution-plan.md
docs/plans/dashboard-play-pause-implementation.md
```

### How-To Guides
```
docs/guides/testing-and-linting-setup.md
docs/guides/convex-supabase-setup.md
docs/guides/graph-orchestration-migration.md
docs/guides/seed-test-teams.md
```

### Active Work
```
docs/todos/LIVING_SCRATCHPAD.md
docs/todos/MCP_TOOLS_IMPLEMENTATION.md
docs/todos/TEST_DASHBOARD.md
```

### Completed Work & Implementation Summaries
```
docs/todos/done/VIEWER_INTEGRATION_COMPLETE.md
docs/todos/done/AUTONOMOUS_IMPLEMENTATION_SUMMARY.md
docs/todos/done/DASHBOARD_INTEGRATION_SUMMARY.md
docs/todos/done/USER_CHAT_IMPLEMENTATION_COMPLETE.md
```

### Root-Level Reference Documentation
```
docs/CLAUDE.md
docs/GETTING_STARTED.md
docs/TESTING.md
```

---

## 🚀 Creating New Documentation

### Step 1: Determine Category
Use the Quick Decision Guide above to determine the appropriate folder.

### Step 2: Choose File Name
- Use kebab-case for most files
- Use SCREAMING_SNAKE_CASE for summaries and important guides
- Be descriptive and include context

### Step 3: Create File
```bash
# Analysis document
touch docs/analysis/my-technical-analysis.md

# Implementation plan
touch docs/plans/my-feature-plan.md

# How-to guide
touch docs/guides/my-setup-guide.md

# Active work
touch docs/todos/MY_ACTIVE_WORK.md

# Implementation summary (when completed)
touch docs/todos/done/MY_FEATURE_COMPLETE.md

# Permanent reference documentation (root level)
touch docs/MY_REFERENCE_GUIDE.md
```

### Step 4: Add Standard Header
```markdown
# [Document Title]

**Type**: [Analysis/Plan/Guide/Todo/Summary]
**Created**: YYYY-MM-DD
**Status**: [Draft/In Progress/Complete/Archived]

## Overview
[Brief description of what this document covers]

---

[Document content...]
```

---

## 🔧 Maintenance

### Regular Cleanup
- **Weekly**: Review `/docs/todos/` and move completed items to `/docs/todos/done/`
- **Monthly**: Archive outdated plans and analysis
- **Quarterly**: Update guides and root-level documentation

### Archiving
When a document is no longer active but should be preserved:
```bash
# Move to done folder
mv docs/todos/COMPLETED_WORK.md docs/todos/done/

# Or create an archive folder
mkdir -p docs/archive/2025/
mv docs/old-plan.md docs/archive/2025/
```

---

## 💡 Tips for Claude Code Users

When working with Claude Code on this repository:

1. **Reference this guide**: Ask Claude to organize new docs according to this structure
2. **Be specific**: Tell Claude which folder to place new documentation in
3. **Maintain consistency**: Follow the naming conventions and structure
4. **Create implementation summaries**: After completing major features, create a summary in `/docs/todos/done/`
5. **Archive completed work**: Move finished todos from `/docs/todos/` to `/docs/todos/done/`
6. **Keep root level clean**: Only permanent reference documentation belongs in `/docs/*.md`

---

**Last Updated**: 2025-10-19
**Maintained By**: Repository contributors
