# Cursor Team Implementation - Issues & Fixes

**Date**: October 19, 2025
**Status**: Critical Issues Resolved

---

## Why GitHub PAT is Required

### Virtual Workspace Architecture

Cursor Background Agents operate in isolated VMs and **require a real GitHub repository** as their workspace. This is not an optional feature—it's fundamental to how Cursor agents function.

**The Workflow:**
1. **Create temporary repository** (`recursor-cursor-{stackId}`) for each agent stack
2. **Materialize artifacts** from Convex into local files
3. **Push initial state** to GitHub with project context and todos
4. **Provide repo URL** to Cursor agent as workspace
5. **Agent works** in isolated VM, cloning and modifying the repo
6. **Monitor changes** via Git operations (diff, log)
7. **Sync artifacts back** to Convex when agent completes work
8. **Delete repository** during cleanup to avoid pollution

**Why Not Local Filesystem?**
- Cursor agents run in **remote VMs**, not local processes
- They need a **Git-based workspace** for version control features
- The agent needs **GitHub context** for professional development workflow
- **Collaboration features** require a real repository

### Required GitHub PAT Scopes

- **`repo`**: Full repository access (create, read, write, push, commit)
- **`delete_repo`**: Delete repositories during cleanup (prevents accumulation)

### Cost Consideration

Each cursor team creates 1 repository. Without cleanup:
- 500 teams = 500 repos
- At scale, repository pollution becomes a problem
- The `delete_repo` scope enables automatic cleanup

---

## Critical Issues Found & Fixed

### 🔴 Issue #1: Circular Import Dependency

**Problem:**
```typescript
// orchestrator-factory.ts
import { AgentStackOrchestrator } from "./orchestrator";
export interface IOrchestrator { ... }

// orchestrator.ts
import type { IOrchestrator } from "./orchestrator-factory";

// cursor-team-orchestrator.ts
import type { IOrchestrator } from "../orchestrator-factory";
```

This creates a circular dependency: factory → orchestrators → factory

**Impact**: Runtime errors, module resolution failures, bundling issues

**Fix Applied**: ✅
- Created `packages/agent-engine/src/types.ts` with `IOrchestrator` interface
- Updated all imports to `import type { IOrchestrator } from "./types"`
- Removed interface definition from orchestrator-factory.ts
- **Result**: Clean dependency graph, no circular references

### 🔴 Issue #2: Missing Package Dependencies

**Problem:**
The implementation uses three packages not declared in `package.json`:
- `@octokit/rest` - GitHub API client
- `simple-git` - Git operations
- `tmp-promise` - Temporary directory management

**Impact**: Runtime errors when importing modules, installation failures

**Fix Applied**: ✅
```json
"dependencies": {
  "@octokit/rest": "^20.0.2",
  "simple-git": "^3.25.0",
  "tmp-promise": "^3.0.3"
}
```

**Next Step**: Run `pnpm install` to install dependencies

---

## Medium Priority Issues (To Be Addressed)

### 🟡 Issue #3: ConvexClient Duplication

**Problem:**
```typescript
// OrchestratorFactory.create() creates new client each time
const client = new ConvexClient(convexUrl);
const stack = await client.query(api.agents.getStack, { stackId });
```

If the caller already has a ConvexClient, we're creating unnecessary instances.

**Impact**:
- Minor memory overhead
- Extra connection overhead
- Not reusing existing connections

**Recommended Fix**:
```typescript
static async create(
  stackId: Id<"agent_stacks">,
  llm: LLMProviders,
  convexUrl: string,
  client?: ConvexClient  // Optional client parameter
): Promise<IOrchestrator> {
  const convexClient = client || new ConvexClient(convexUrl);
  // ... rest of implementation
}
```

**Priority**: Low (optimize later)

### 🟡 Issue #4: Inconsistent Status Interface

**Problem:**
```typescript
// CLI uses optional chaining
console.log(`Todos: ${status.todos?.completed || 0}/${status.todos?.total || 0}`);
```

This suggests the two orchestrators may return different status shapes.

**Impact**:
- Runtime errors if interface mismatch
- Type safety issues
- Difficult to maintain

**Recommended Fix**:
```typescript
// In types.ts
export interface OrchestratorStatus {
  stack: {
    participant_name: string;
    team_type: "standard" | "cursor";
    phase: string;
  } | null;
  projectIdea: {
    title: string;
    description: string;
  } | null;
  todos: {
    total: number;
    completed: number;
    pending: number;
  };
  artifacts: {
    total: number;
    latest_version: number;
  };
  tickCount: number;
}

// Update interface
export interface IOrchestrator {
  getStatus(): Promise<OrchestratorStatus>;  // Specific type
}
```

**Priority**: Medium (implement during Phase 4 testing)

### 🟡 Issue #5: Orphaned Repositories Risk

**Problem:**
If the process crashes before `cleanup()` is called:
- GitHub repos never deleted
- Repository accumulation over time
- Cost implications at scale

**Current Behavior:**
```typescript
// In cursor-team-orchestrator.ts
async cleanup(): Promise<void> {
  if (this.currentWorkspace) {
    await this.workspaceManager.cleanup(this.currentWorkspace);
  }
}
```

Only called explicitly—not guaranteed during crashes.

**Impact**:
- Low during development
- High at production scale
- Financial cost (storage, API rate limits)

**Recommended Fix**:
1. **Background Cleanup Job**:
   ```typescript
   // Scheduled task runs daily
   async function cleanupOrphanedRepos() {
     const repos = await octokit.repos.listForAuthenticatedUser();
     const orphaned = repos.filter(r =>
       r.name.startsWith('recursor-cursor-') &&
       r.updated_at < Date.now() - 24 * 60 * 60 * 1000  // 24 hours old
     );
     for (const repo of orphaned) {
       await octokit.repos.delete({ owner, repo: repo.name });
     }
   }
   ```

2. **TTL-based Deletion**:
   - Add GitHub repository topic: `recursor-ttl:24h`
   - Cleanup service scans topics and deletes expired repos

3. **Process Signal Handlers**:
   ```typescript
   process.on('SIGTERM', async () => {
     await orchestrator.cleanup();
     process.exit(0);
   });
   ```

**Priority**: Medium (implement before production)

### 🟡 Issue #6: No GitHub Rate Limiting

**Problem:**
No retry logic or rate limit handling in workspace-manager.ts:
```typescript
await this.octokit.repos.create({ name: repoName });
await this.octokit.repos.delete({ owner, repo });
```

**Impact**:
- API failures during high-volume operations
- No exponential backoff
- Rate limit errors not handled gracefully

**Recommended Fix**:
```typescript
private async withRetry<T>(
  operation: () => Promise<T>,
  maxRetries = 3
): Promise<T> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await operation();
    } catch (error) {
      if (error.status === 403 && error.headers['x-ratelimit-remaining'] === '0') {
        const resetTime = parseInt(error.headers['x-ratelimit-reset']) * 1000;
        const waitTime = resetTime - Date.now();
        console.log(`Rate limited. Waiting ${waitTime}ms...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        continue;
      }
      if (i === maxRetries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, i)));
    }
  }
  throw new Error('Max retries exceeded');
}
```

**Priority**: Medium (implement during Phase 4)

---

## Low Priority Issues (Future Improvements)

### 🟢 Issue #7: Missing Index Exports

**Problem:**
New modules may not be exported from package entry points.

**Check Required:**
```typescript
// packages/agent-engine/src/index.ts
export { OrchestratorFactory } from './orchestrator-factory';
export { CursorTeamOrchestrator } from './cursor/cursor-team-orchestrator';
export type { IOrchestrator } from './types';
```

**Priority**: Low (not critical for CLI usage)

### 🟢 Issue #8: Artifact Sync Edge Cases

**Problem:**
No handling for:
- Git merge conflicts
- Invalid repository state
- Binary files
- Large files (>100MB)
- Submodules

**Recommended Improvements**:
- Pre-flight checks before sync
- Conflict detection and resolution strategy
- Binary file filtering
- LFS support for large files

**Priority**: Low (rare edge cases)

### 🟢 Issue #9: Environment Variable Validation Timing

**Problem:**
Factory validates env vars, but constructors might use them first.

**Current Flow:**
```typescript
// Factory validates after instantiation attempt
const orchestrator = new CursorTeamOrchestrator(...);  // May fail first
```

**Better Approach:**
```typescript
// Validate before instantiation
if (teamType === "cursor") {
  validateCursorEnvironment();  // Throws early
}
return new CursorTeamOrchestrator(...);
```

**Priority**: Low (current approach works, just less ideal)

---

## Summary of Fixes Applied

| Issue | Severity | Status | Fix |
|-------|----------|--------|-----|
| Circular import | 🔴 Critical | ✅ Fixed | Created `types.ts` with shared interface |
| Missing dependencies | 🔴 Critical | ✅ Fixed | Added to package.json |
| Client duplication | 🟡 Medium | ⏳ Deferred | Optional parameter (Phase 4) |
| Status interface | 🟡 Medium | ⏳ Deferred | Unified type (Phase 4) |
| Orphaned repos | 🟡 Medium | ⏳ Deferred | Cleanup job (before production) |
| Rate limiting | 🟡 Medium | ⏳ Deferred | Retry logic (Phase 4) |
| Index exports | 🟢 Low | ⏳ Deferred | Add exports if needed |
| Sync edge cases | 🟢 Low | ⏳ Deferred | Incremental improvements |
| Env validation | 🟢 Low | ⏳ Deferred | Refactor if needed |

---

## Files Modified in Fixes

1. **Created**: `packages/agent-engine/src/types.ts`
   - Extracted `IOrchestrator` interface
   - Breaks circular dependency

2. **Modified**: `packages/agent-engine/src/orchestrator-factory.ts`
   - Removed interface definition
   - Added import from `types.ts`

3. **Modified**: `packages/agent-engine/src/orchestrator.ts`
   - Updated import to use `types.ts`

4. **Modified**: `packages/agent-engine/src/cursor/cursor-team-orchestrator.ts`
   - Updated import to use `types.ts`

5. **Modified**: `packages/agent-engine/package.json`
   - Added `@octokit/rest`, `simple-git`, `tmp-promise`

6. **Moved**: `docs/CURSOR_TEAM_IMPLEMENTATION_COMPLETE.md`
   - To: `docs/implementations/cursor-team-complete.md`
   - Created `docs/implementations/` directory

---

## Next Steps

### Immediate (Before Testing)
1. ✅ Fix circular import - **DONE**
2. ✅ Add missing dependencies - **DONE**
3. Run `pnpm install` to install new packages
4. Run `pnpm type-check` to verify no type errors
5. Run `pnpm build` to verify compilation

### Phase 4 (Testing)
1. Address status interface consistency
2. Implement retry logic for GitHub API
3. Test edge cases in artifact sync
4. Performance benchmarking

### Before Production
1. Implement orphaned repository cleanup
2. Add comprehensive error tracking
3. Setup monitoring and alerts
4. Load testing with multiple concurrent teams

---

**Last Updated**: October 19, 2025
**Status**: ✅ Critical issues resolved, implementation ready for testing
