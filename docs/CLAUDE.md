# docs/ Organization Guide

This document explains how to organize documentation files in the `/docs` directory.

## 📁 Directory Structure

```
docs/
├── analysis/          Technical analysis documents
├── plans/             Implementation plans and PRDs
├── guides/            How-to guides and setup instructions
├── todos/             Active todos and work-in-progress
│   └── done/          Completed todos (archived)
└── *.md               Root-level summaries and key documents
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

**Archiving**: Move completed todos to `/docs/todos/done/` when finished

---

### Root-Level `/docs/*.md`
**Purpose**: Major summaries, integration reports, and key documentation.

**Examples**:
- Integration summaries (e.g., `VIEWER_INTEGRATION_COMPLETE.md`)
- Implementation summaries (e.g., `AUTONOMOUS_IMPLEMENTATION_SUMMARY.md`)
- Getting started guides
- Testing documentation
- High-level overviews

**Naming Convention**: `SCREAMING_SNAKE_CASE.md` for summaries, `Title_Case.md` for guides

**When to use**:
- Documenting major integrations
- Summarizing completed work
- Creating entry-point documentation
- High-level project overviews

---

## 🎯 Quick Decision Guide

**Ask yourself**:

1. **Is it analyzing a technical decision?** → `/docs/analysis/`
2. **Is it planning future work?** → `/docs/plans/`
3. **Is it explaining how to do something?** → `/docs/guides/`
4. **Is it active work-in-progress?** → `/docs/todos/`
5. **Is it a major summary or key document?** → `/docs/*.md` (root level)

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
- Move todos to `/docs/todos/done/`
- Create summary in `/docs/*.md` (root level)
- Update guides in `/docs/guides/` if needed

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

### Completed Work (Archived)
```
docs/todos/done/[completed-tasks].md
```

### Root-Level Summaries
```
docs/VIEWER_INTEGRATION_COMPLETE.md
docs/AUTONOMOUS_IMPLEMENTATION_SUMMARY.md
docs/DASHBOARD_INTEGRATION_SUMMARY.md
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

# Summary (root level)
touch docs/MY_INTEGRATION_SUMMARY.md
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
4. **Update summaries**: After major integrations, create a root-level summary
5. **Archive completed work**: Move finished todos to the done folder

---

**Last Updated**: 2025-10-18
**Maintained By**: Repository contributors
