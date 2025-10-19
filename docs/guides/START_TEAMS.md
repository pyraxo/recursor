# How to Start Teams & Test Judging

## Problem
Teams exist but aren't running → No agents executing → No artifacts being created → Judge has nothing to evaluate

## Solution

### Quick Start (Recommended)

1. **Open Dashboard**:
   ```bash
   cd /Users/justinwong/Desktop/School/cursor\ hackathon/recursor/apps/dashboard
   pnpm dev
   ```
   Then visit: `http://localhost:3001` (or whatever port it shows)

2. **Find Global Controls** (at the top of the Admin Dashboard page)

3. **Click "Start All"** button (green play button)

4. **Wait 30-60 seconds** for agents to start creating artifacts

5. **Check Viewer Dashboard**: `http://localhost:3000/dashboard`
   - Wait 5 minutes for auto-judging OR
   - Manually trigger judging (see below)

### Manual Judging Trigger

Visit Convex Dashboard: https://dashboard.convex.dev/d/fantastic-yak-548

1. Go to **Functions** tab
2. Find `judging/executeAllJudges`
3. Click **Run** (no parameters needed)
4. Wait ~10-30 seconds (it judges all teams)
5. Refresh viewer dashboard to see scores

### Check If Teams Are Running

In Convex Dashboard:
1. Go to **Data** tab
2. Open `agent_stacks` table
3. Check `execution_state` column
   - ✅ Should be "running"
   - ❌ If "idle" or empty → teams aren't started

### Check If Artifacts Exist

In Convex Dashboard:
1. Go to **Data** tab
2. Open `artifacts` table
3. Should see entries with `content` field populated

## Expected Flow

```
1. Teams created → execution_state: "idle"
2. Click "Start All" → execution_state: "running"
3. Orchestrator cron (5s) → detects running teams
4. Agents execute → planner creates todos, builder creates artifacts
5. Judge cron (5min) → evaluates artifacts, stores scores
6. Dashboard → displays scores on leaderboard
```

## Troubleshooting

**No teams created?**
- Create teams via dashboard "Create Team" form

**Started but no artifacts?**
- Check Convex logs for errors
- Teams need time to build (1-2 minutes)
- Planner needs to create todos first

**Judge not working?**
- Ensure `convex dev` is running
- Check that artifacts exist
- Manually trigger judging to test

**Dashboard not loading?**
- Clear Next.js cache: `rm -rf apps/viewer/.next`
- Restart viewer app

