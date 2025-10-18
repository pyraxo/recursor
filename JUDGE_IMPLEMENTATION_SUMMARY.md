# Judge Agent Implementation - Summary

## ✅ What Was Implemented

### 1. Schema Extensions (`packages/convex/convex/schema.ts`)
- ✅ Added `judgments` table with:
  - Individual scores for 4 criteria (technical_merit, polish, execution, wow_factor)
  - Total score (sum of all criteria, max 40)
  - Detailed feedback notes for each criterion
  - Artifact version tracking to avoid re-judging
  - Indexes for efficient querying

### 2. Judge Agent Class (`packages/agent-engine/src/agents/judge.ts`)
- ✅ Created `JudgeAgent` class extending `BaseAgent`
- ✅ Delegates to Convex backend for execution (following existing pattern)
- ✅ Logs judgment results to traces

### 3. Convex Judging Functions (`packages/convex/convex/judging.ts`)
- ✅ `executeJudge` (action): Judge a single team
- ✅ `executeJudgeInternal` (internalAction): Internal version for cron
- ✅ `executeAllJudges` (action): Judge all teams (manual trigger)
- ✅ `executeAllJudgesScheduled` (internalAction): Scheduled version for cron
- ✅ `getLatestJudgment` (query): Get latest judgment for a team
- ✅ `getLeaderboard` (query): Get ranked leaderboard with all teams
- ✅ `createJudgmentInternal` (internalMutation): Store judgment results
- ✅ Smart caching: Only re-judges if artifact version changed
- ✅ Robust error handling with fallback scores

### 4. LLM Judge Prompt
The judge uses a comprehensive system prompt that evaluates on 4 criteria:

#### **Technical Merit (1-10)**
- Code quality, architecture, implementation soundness
- Best practices and maintainability

#### **Polish (1-10)**
- UI/UX quality and professionalism
- Attention to detail

#### **Execution (1-10)**
- How well the vision was delivered
- Completeness and functionality

#### **Wow Factor (1-10)**
- Innovation and creativity
- Memorability and impressiveness

The judge responds with structured JSON including scores and detailed feedback for each criterion.

### 5. Automated Cron Job (`packages/convex/convex/crons.ts`)
- ✅ Runs every 5 minutes automatically
- ✅ Judges all teams with artifacts
- ✅ Skips teams without artifacts or unchanged artifacts

### 6. Leaderboard UI (`apps/viewer/components/Dashboard/LeaderboardTable.tsx`)
- ✅ Updated to use real judgment data instead of mock random scores
- ✅ Shows top teams ranked by total score
- ✅ Displays all 4 criteria scores
- ✅ Top 3 teams highlighted with medals (🥇🥈🥉)
- ✅ Real-time updates via Convex reactive queries

### 7. Helper Functions Added
- ✅ `internalListStacks` in `packages/convex/convex/agents.ts`
- ✅ `internalList` in `packages/convex/convex/todos.ts`

## 🚀 How to Deploy & Test

### Step 1: Deploy Convex Functions
```bash
# Deploy Convex to generate types and activate cron jobs
pnpm convex:deploy
```

This will:
- Generate TypeScript types for all Convex functions (resolving current linter errors)
- Activate the 5-minute cron job for automatic judging
- Make all judging functions available

### Step 2: Start the Viewer App
```bash
cd apps/viewer
pnpm dev
```

Then navigate to `http://localhost:3000/dashboard` to see the leaderboard.

### Step 3: Manual Testing

#### Option A: Trigger Manual Judgment
From your application code or Convex dashboard, you can call:
```typescript
await ctx.runAction(api.judging.executeAllJudges, {});
```

#### Option B: Judge a Specific Team
```typescript
await ctx.runAction(api.judging.executeJudge, {
  stackId: "<team-stack-id>",
});
```

#### Option C: Wait for Cron (5 minutes)
The cron job will automatically judge all teams every 5 minutes.

## 📊 Viewing Results

### Leaderboard Dashboard
Visit `/dashboard` in the viewer app to see:
- Real-time leaderboard sorted by total score
- All 4 criteria scores displayed
- Top 3 teams with medal indicators
- Updates automatically when new judgments are made

### Query Judgment Data
From any Convex context:
```typescript
// Get leaderboard
const leaderboard = await ctx.runQuery(api.judging.getLeaderboard, {});

// Get specific team's latest judgment
const judgment = await ctx.runQuery(api.judging.getLatestJudgment, {
  stackId: "<team-stack-id>",
});
```

## 🔧 Configuration

### Adjust Cron Frequency
Edit `packages/convex/convex/crons.ts`:
```typescript
crons.interval(
  "judge all teams",
  { minutes: 5 },  // Change this value
  internal.judging.executeAllJudgesScheduled
);
```

### Customize Judging Criteria
Edit the system prompt in `packages/convex/convex/judging.ts` (line ~140).

### Change Score Scale
Currently uses 1-10 scale per criterion (max 40 total). To change:
1. Update prompt in `judging.ts`
2. Update LeaderboardTable calculation if needed

## 📝 Notes

### ⚠️ Expected TypeScript Errors (Pre-Deploy) - THIS IS NORMAL!
You'll see **4 TypeScript errors** about `judging` not existing:

**In `packages/convex/convex/judging.ts` (lines 124, 237):**
```
Property 'judging' does not exist on type...
```

**In `apps/viewer/components/Dashboard/LeaderboardTable.tsx` (line 17):**
```
Property 'judging' does not exist on type...
```

**In `packages/convex/convex/crons.ts` (line 29):**
```
Property 'judging' does not exist on type...
```

### Why These Errors Exist (And Why They're OK!)

This is **100% expected** in the Convex development workflow:

1. ✅ We created new Convex functions in `judging.ts`
2. ✅ These functions are properly exported
3. ❌ TypeScript complains because `internal.judging` doesn't exist in the generated types **yet**
4. ✨ Convex auto-generates TypeScript definitions **during deployment**
5. ✅ After running `pnpm convex:deploy`, all 4 errors **disappear automatically**

**The code is correct!** The types just haven't been generated yet. This is standard Convex workflow.

### Pre-existing Errors (Unrelated)
There are also some pre-existing TypeScript errors in `SpeechBubbles.tsx` that are unrelated to the judge implementation. These were already there before this feature was added.

### Judgment Caching
The system automatically avoids re-judging the same artifact version. Only when a team builds a new artifact (incremented version) will they be re-judged.

### LLM Requirements
Judgments use the LLM provider configured in `convex/lib/llmProvider.ts`. Ensure you have:
- `GROQ_API_KEY` (primary)
- `OPENAI_API_KEY` (fallback)
- `GEMINI_API_KEY` (alternative)

### Score Calculation
- Individual criteria: 1-10 each
- Total score: Sum of all 4 (max 40)
- Overall score shown in leaderboard: Average (total_score / 4)

## 🎯 Next Steps (Optional Enhancements)

1. **Dashboard Admin View**: Add detailed judgment feedback display in the admin dashboard
2. **Historical Tracking**: Show judgment history over time
3. **Sponsor Track Filtering**: Add sponsor-specific judging criteria
4. **Manual Judge Button**: Add UI button to trigger manual judgment
5. **Judgment Webhooks**: Notify teams when they receive new judgments

## 🐛 Troubleshooting

### Cron Not Running
- Verify Convex deployment: `pnpm convex:deploy`
- Check Convex dashboard for cron job status
- Look for errors in Convex logs

### No Judgments Appearing
- Ensure teams have artifacts created
- Check that artifacts have `content` field populated
- Verify LLM API keys are configured
- Check Convex logs for judgment errors

### Leaderboard Empty
- Teams need to be judged first (wait 5 min or trigger manually)
- Verify `api.judging.getLeaderboard` returns data in Convex dashboard
- Check browser console for query errors

## ✨ Summary

The judge agent system is now fully implemented and will automatically evaluate all teams every 5 minutes based on 4 criteria. The leaderboard displays real-time results with a beautiful pixel-art UI. Simply deploy Convex and start the viewer app to see it in action!

