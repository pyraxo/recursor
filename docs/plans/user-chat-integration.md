# Implementation Plan: User Chat Integration for Communicator Agents

**Status**: In Progress
**Created**: 2025-10-19
**Estimated Time**: 3 hours

## Overview
Enable user-to-team chat where messages are ingested by the Communicator, with the Planner deciding when/how to respond.

## 1. Database Schema Changes

**New table: `user_messages`** (packages/convex/convex/schema.ts)
```typescript
user_messages: defineTable({
  team_id: v.id("agent_stacks"),
  sender_name: v.string(),  // User identifier
  content: v.string(),
  timestamp: v.number(),
  processed: v.boolean(),    // Has Communicator seen it?
  response_id: v.optional(v.id("messages")),  // Link to response
})
```

**Indexes needed**:
- By team_id and processed status
- By timestamp for ordering

## 2. Agent Flow Changes

### PlannerAgent
- **Read**: Unprocessed user_messages for the team
- **Analyze**: Determine if messages require response, contain feedback, or suggest changes
- **Output**: Create todo like "Respond to user question about X" or "Incorporate user feedback on Y"
- **Update**: Mark relevant context in current_context

### CommunicatorAgent
- **Check**: Look for Planner todos about responding to users
- **Generate**: Craft response based on context (project state, build progress, etc.)
- **Store**: Save response to messages table AND link back to user_message
- **Mark**: Set user_message.processed = true

## 3. New Convex Functions

**packages/convex/convex/userMessages.ts**
```typescript
- sendUserMessage(team_id, sender, content)
- getUnprocessedMessages(team_id)
- markMessageProcessed(message_id, response_id)
- getUserChatHistory(team_id, limit)
```

## 4. Orchestrator Integration

**In orchestrator tick loop** (packages/agent-engine/src/orchestrator.ts):
- Before Planner runs: Fetch unprocessed user_messages
- Add to Planner's context as `user_messages: []`
- After Communicator runs: Check if any responses were generated

## 5. Dashboard UI

**apps/dashboard/components/ChatPanel.tsx** (new)
- Display user_messages + responses in chat format
- Input field to send new messages
- Real-time updates via Convex subscriptions

## 6. Context Structure

Add to agent current_context:
```typescript
{
  user_messages: [
    { id, sender, content, timestamp, needs_response: boolean }
  ]
}
```

## Key Design Decisions

✅ **Planner controls responses** - Not automatic, strategic decision
✅ **Async responses** - Communicator responds on next tick when todo exists
✅ **Feedback integration** - Planner can create todos for Builder based on user suggestions
✅ **Chat history** - All messages stored for context in future ticks

## Implementation Order

1. Schema + Convex functions (30 min)
2. Orchestrator context injection (15 min)
3. PlannerAgent message analysis logic (30 min)
4. CommunicatorAgent response generation (30 min)
5. Dashboard ChatPanel UI (45 min)
6. Test end-to-end flow (30 min)

**Total: ~3 hours**

## Success Criteria

- [ ] Users can send messages to teams via dashboard
- [ ] PlannerAgent sees and analyzes user messages
- [ ] Planner can create todos for responding
- [ ] CommunicatorAgent responds when told to
- [ ] Responses are linked back to original user messages
- [ ] Chat history is visible in dashboard
- [ ] Real-time updates work via Convex subscriptions
