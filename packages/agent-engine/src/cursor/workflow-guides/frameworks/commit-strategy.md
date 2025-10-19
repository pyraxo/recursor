# Commit Strategy Framework

## Core Principle

⚠️ **UNCOMMITTED WORK IS LOST FOREVER** ⚠️

Your git commits are synced back to Convex as "artifacts". These artifacts are used for:
- Grading and evaluation
- Review by other agents
- Tracking progress
- Demo preparation

**If it's not committed and pushed, it doesn't exist in the system.**

## The Three-Step Commit Process

Every time you complete meaningful work:

### Step 1: Stage All Changes
```bash
git add .
```

**What this does**: Adds all modified, created, and deleted files to the staging area

**When to use**: Always stage everything unless you specifically need to commit only certain files

### Step 2: Commit with Semantic Message
```bash
git commit -m "feat: add user authentication with GitHub OAuth"
```

**What this does**: Creates a commit with a descriptive message

**Message format**: See "Semantic Commit Messages" section below

### Step 3: Push to Remote
```bash
git push origin [branch-name]
```

**What this does**: Uploads your commits to GitHub where they can be synced

**CRITICAL**: This step is REQUIRED. Local commits without pushing are not detected by the orchestration system.

## Commit Frequency Guidelines

### When to Commit

Commit when you reach any of these milestones:

#### ✅ Todo Completed
```bash
# You just finished "Implement user login"
git add .
git commit -m "feat: implement user login with email/password"
git push origin agent-workspace
```

#### ✅ Feature Finished
```bash
# You completed the chat interface component
git add .
git commit -m "feat: add real-time chat interface component"
git push origin agent-workspace
```

#### ✅ Bug Fixed
```bash
# You resolved the login redirect bug
git add .
git commit -m "fix: resolve login redirect loop after authentication"
git push origin agent-workspace
```

#### ✅ Significant Files Added
```bash
# You created the database schema and models
git add .
git commit -m "feat: add database schema and user model"
git push origin agent-workspace
```

#### ✅ Working State Reached
```bash
# You just got the WebSocket connection working
git add .
git commit -m "feat: implement WebSocket connection for real-time sync"
git push origin agent-workspace
```

#### ✅ Refactoring Complete
```bash
# You reorganized the component structure
git add .
git commit -m "refactor: reorganize components by feature"
git push origin agent-workspace
```

### When NOT to Commit

Don't commit when:

#### ❌ Code Doesn't Run
Wait until it compiles and runs without errors

#### ❌ Breaking Changes Incomplete
If you started a refactor that breaks things, finish it first

#### ❌ Incomplete Implementation
If you can't test the feature yet, keep working

### Commit Frequency Sweet Spot

**Good frequency**: Every 15-30 minutes of productive work
- Too often: Commit spam, unclear history
- Too rare: Large commits, risk of lost work

**Rule of thumb**: If you've written >50 lines of code or >2 files, probably time to commit

## Semantic Commit Messages

### Format

```
<type>: <description>

[optional body]
```

### Types

#### `feat:` - New Feature
Use when adding new functionality

**Examples**:
- ✅ `feat: add user registration form`
- ✅ `feat: implement real-time chat with WebSockets`
- ✅ `feat: add quiz creation and editing`
- ✅ `feat: integrate GitHub OAuth authentication`

#### `fix:` - Bug Fix
Use when fixing something that was broken

**Examples**:
- ✅ `fix: resolve login redirect loop`
- ✅ `fix: correct quiz scoring calculation`
- ✅ `fix: handle WebSocket reconnection properly`
- ✅ `fix: prevent form submission with invalid data`

#### `docs:` - Documentation
Use when updating documentation

**Examples**:
- ✅ `docs: add README with setup instructions`
- ✅ `docs: update API documentation`
- ✅ `docs: add code comments for complex logic`
- ✅ `docs: create demo script and usage guide`

#### `style:` - UI/Styling
Use when changing visual styling

**Examples**:
- ✅ `style: improve quiz interface with Tailwind`
- ✅ `style: add responsive mobile layout`
- ✅ `style: polish button and form styles`
- ✅ `style: add smooth animations and transitions`

#### `refactor:` - Code Restructuring
Use when reorganizing code without changing behavior

**Examples**:
- ✅ `refactor: extract quiz logic into custom hook`
- ✅ `refactor: reorganize components by feature`
- ✅ `refactor: simplify authentication flow`
- ✅ `refactor: extract shared utilities`

#### `test:` - Tests
Use when adding or updating tests

**Examples**:
- ✅ `test: add tests for quiz scoring`
- ✅ `test: add integration tests for auth flow`
- ✅ `test: update tests after API changes`

#### `chore:` - Build/Config
Use for tooling, dependencies, config

**Examples**:
- ✅ `chore: set up Next.js project`
- ✅ `chore: add Tailwind CSS dependencies`
- ✅ `chore: configure TypeScript`
- ✅ `chore: update dependencies`

### Description Guidelines

**Good descriptions**:
- ✅ Clear and specific
- ✅ Describe what was done
- ✅ Use imperative mood ("add" not "added")
- ✅ Start with lowercase
- ✅ No period at the end

**Examples of good descriptions**:
- ✅ `feat: add user authentication with GitHub OAuth`
- ✅ `fix: resolve database connection timeout`
- ✅ `docs: add setup instructions to README`
- ✅ `style: improve mobile responsive layout`

**Examples of bad descriptions**:
- ❌ `feat: stuff` (too vague)
- ❌ `fix: Fixed the bug.` (should be imperative, no period, not specific)
- ❌ `update` (no type, no description)
- ❌ `WIP` (work in progress shouldn't be committed)
- ❌ `changes` (too vague, no type)

### Optional Body

For complex changes, add a body with more detail:

```bash
git commit -m "feat: implement real-time quiz synchronization

- Add WebSocket connection manager
- Create custom hook for quiz state sync
- Handle connection drops and reconnection
- Add participant presence tracking"
```

**When to use body**:
- Change affects multiple components
- Complex logic needs explanation
- Breaking changes
- Migration or architectural changes

## Commit Anti-Patterns

### ❌ Giant Commits
**Bad**: One commit with 20 files and 5 features
```bash
git commit -m "feat: add auth, dashboard, settings, profile, and admin panel"
```

**Good**: Separate commits for each logical unit
```bash
git commit -m "feat: add authentication with GitHub OAuth"
# work on next feature
git commit -m "feat: add user dashboard with quiz history"
# work on next feature
git commit -m "feat: add settings page for user preferences"
```

### ❌ Vague Messages
**Bad**:
```bash
git commit -m "updates"
git commit -m "changes"
git commit -m "fix stuff"
```

**Good**:
```bash
git commit -m "feat: add quiz timer functionality"
git commit -m "fix: resolve race condition in quiz state"
git commit -m "style: improve quiz results display"
```

### ❌ Broken Code Commits
**Bad**: Committing code that doesn't compile or run
```bash
git commit -m "WIP: half-done auth feature"
```

**Good**: Finish to a working state first
```bash
# Keep working until it works
git commit -m "feat: add authentication with login/logout"
```

### ❌ No Pushing
**Bad**: Making commits but never pushing
```bash
git commit -m "feat: add feature"
# ... never push ...
# Work is lost when session ends
```

**Good**: Always push immediately after committing
```bash
git commit -m "feat: add feature"
git push origin agent-workspace  # REQUIRED!
```

## Multi-Step Workflows

### Typical Feature Implementation

```bash
# 1. Implement feature
# ... write code ...

# 2. Test it works
# ... manual testing ...

# 3. Commit and push
git add .
git commit -m "feat: implement quiz timer with countdown"
git push origin agent-workspace

# 4. Move to next feature
```

### Fixing a Bug

```bash
# 1. Identify and fix bug
# ... debug and fix ...

# 2. Verify fix works
# ... test ...

# 3. Commit with fix type
git add .
git commit -m "fix: resolve timer not stopping after quiz ends"
git push origin agent-workspace
```

### Refactoring

```bash
# 1. Refactor code
# ... reorganize ...

# 2. Verify nothing broke
# ... test ...

# 3. Commit with refactor type
git add .
git commit -m "refactor: extract quiz logic into custom hooks"
git push origin agent-workspace
```

## Emergency Situations

### Build is Broken

If you break the build:

1. **Priority 10**: Fix it immediately
2. **Don't commit** broken code
3. **Once fixed**: Commit the fix
```bash
git add .
git commit -m "fix: resolve build error in quiz component"
git push origin agent-workspace
```

### Accidentally Committed Broken Code

If you already committed and pushed broken code:

1. **Fix it** in the next commit (don't amend!)
2. **Commit the fix** immediately
```bash
git add .
git commit -m "fix: resolve error from previous commit"
git push origin agent-workspace
```

**Don't use**: `git commit --amend` (causes sync issues)

### Lost Changes

If you forgot to commit and lost work:
- **Can't recover** uncommitted work
- **Lesson learned**: Commit more frequently
- **Implement again**: Treat it as practice, second time is usually better

## Commit Checklist

Before every commit, check:

- [ ] Code runs without errors
- [ ] Feature/fix is complete and working
- [ ] Tested the changes manually
- [ ] Commit message follows semantic format
- [ ] About to run `git push` after commit

## Quick Reference

| Situation | Type | Example |
|-----------|------|---------|
| New feature works | `feat:` | `feat: add user dashboard` |
| Bug is fixed | `fix:` | `fix: resolve login bug` |
| UI is polished | `style:` | `style: improve mobile layout` |
| Code reorganized | `refactor:` | `refactor: extract utilities` |
| Docs updated | `docs:` | `docs: add README` |
| Tests added | `test:` | `test: add auth tests` |
| Config/tooling | `chore:` | `chore: set up project` |

## Remember

1. **Commit frequently**: Every meaningful unit of work
2. **Push immediately**: Every commit must be pushed
3. **Be specific**: Clear, semantic commit messages
4. **Test first**: Don't commit broken code
5. **One thing**: One logical change per commit

Your git history is your progress record - make it clear and complete!
