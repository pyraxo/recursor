# Test Agent Cleanup Guide

## Test Agents to Remove

During development and testing, the following test agents were created:

1. **TestAgent** - ID: `jx75cw8sch8yc3tdg8w0jbdz3x7spx3q`
2. **TestAgent-1424** - ID: `jx7d8cmr2w2m0caje238af2r757sq57n`

## How to Delete Test Agents

### Option 1: Using Admin Dashboard UI (Recommended)

This method tests the delete functionality we just built:

1. **Start Convex backend:**

   ```bash
   pnpm convex:dev
   ```

2. **Start Dashboard in another terminal:**

   ```bash
   cd apps/dashboard
   pnpm dev
   ```

3. **Open dashboard:** http://localhost:3002

4. **Delete each test agent:**
   - Ensure you're on the "Admin" tab
   - Find "TestAgent" and "TestAgent-1424" in the "Existing Teams" list
   - Click the trash icon for each
   - Choose whether to cascade delete (recommended: uncheck for first test, check for second)
   - Click "Delete Team"

### Option 2: Using Convex Dashboard

1. Open your Convex dashboard (URL shown when running `pnpm convex:dev`)
2. Navigate to **Data** tab
3. Open the `agent_stacks` table
4. Find and delete the test agent entries manually
5. If you want to clean up related data, also delete from:
   - `agent_states`
   - `project_ideas`
   - `todos`
   - `artifacts`
   - `messages`
   - `agent_traces`

### Option 3: Using CLI Script

Create a temporary script to delete:

```typescript
// scripts/cleanup.ts
import { ConvexClient } from "convex/browser";

const client = new ConvexClient(process.env.CONVEX_URL!);

const stackIds = [
  "jx75cw8sch8yc3tdg8w0jbdz3x7spx3q",
  "jx7d8cmr2w2m0caje238af2r757sq57n",
];

for (const stackId of stackIds) {
  try {
    await client.mutation("agents:deleteStack" as any, {
      stackId,
      cascadeDelete: true,
    });
    console.log(`Deleted: ${stackId}`);
  } catch (error) {
    console.error(`Failed to delete ${stackId}:`, error);
  }
}
```

Then run:

```bash
CONVEX_URL=https://industrious-bison-383.convex.cloud tsx scripts/cleanup.ts
```

## Verification

After deletion, verify:

1. **Dashboard UI:** The agents no longer appear in the "Existing Teams" list
2. **Stats:** Total Teams count decreases appropriately
3. **Convex Dashboard:** Check `agent_stacks` table is empty (or contains only desired teams)

## Notes

- **Recommendation:** Use Option 1 (Admin Dashboard UI) as it tests your new delete functionality
- Test both cascade delete options to verify both work correctly
- The delete functionality includes proper error handling and loading states
- All deletes are permanent and cannot be undone (by design)
