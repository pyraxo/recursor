# User Chat Integration - Testing Guide

**Date**: 2025-10-19
**Related**: user-chat-integration.md

## Prerequisites

1. Convex backend running (`pnpm convex:dev`)
2. Dashboard running (`pnpm --filter dashboard dev`)
3. At least one agent stack created

## Test Scenarios

### Scenario 1: Send User Message

**Steps**:
1. Open dashboard at `http://localhost:3002`
2. Navigate to a team's detail page
3. Click on the "Chat" tab
4. Enter your name in the sender field (e.g., "Alice")
5. Type a message: "What are you working on?"
6. Click "Send"

**Expected**:
- Message appears immediately in the chat history
- Status shows "Waiting for team to see this message..." (yellow text)
- Message stored in `user_messages` table with `processed: false`

**Verify in Convex Dashboard**:
```
Query: user_messages
Filter: team_id = [your_stack_id]
Expected: 1 record with processed = false
```

---

### Scenario 2: Planner Receives & Analyzes Message

**Steps**:
1. Wait for the next orchestration cycle (Planner runs first)
2. Watch the Convex logs or terminal running the agent

**Expected**:
- Planner fetches unprocessed messages
- `checkPlannerHasWork` returns `true` with reason "User messages need attention"
- Planner LLM receives context including the user message
- Planner creates a todo like: "Respond to user question about current work"

**Verify**:
- Check the "Todos" tab in dashboard
- Look for a new pending todo about responding to the user
- Check agent_traces table for planner execution logs

---

### Scenario 3: Communicator Generates Response

**Steps**:
1. Wait for Communicator to run (3rd in the cycle after Planner and Builder)
2. Watch the chat panel in the dashboard

**Expected**:
- Communicator detects user-response todo
- Fetches unprocessed user messages
- Generates a response based on project context
- Creates a broadcast message with the response
- Links message to user_message via `response_id`
- Marks user_message as `processed: true`
- Marks the response todo as `completed`

**Verify in Dashboard**:
- Chat panel shows the agent's response under your message
- Status changes from yellow to showing the bot response
- Response has green border/background
- Timestamp shows when response was created

**Verify in Convex**:
```
Query: user_messages
Expected: processed = true, response_id set

Query: messages
Filter: from_stack_id = [your_stack_id]
Expected: New broadcast message with response content

Query: todos
Expected: Response todo status = "completed"
```

---

### Scenario 4: Multiple Messages

**Steps**:
1. Send 3 different messages quickly:
   - "How is the project going?"
   - "Can you add a dark mode feature?"
   - "What's your timeline?"

**Expected**:
- All messages appear in chat history
- All marked as unprocessed initially
- Planner on next cycle sees all 3 messages
- May create multiple response todos OR one consolidated response
- Communicator processes all messages in one response
- All messages marked as processed

**Edge Cases to Test**:
- Messages from different senders
- Very long messages
- Messages with special characters
- Multiple messages before agent processes any

---

### Scenario 5: Feedback Integration

**Steps**:
1. Send message: "I think you should focus on the UI first, backend can wait"

**Expected**:
- Planner analyzes the feedback
- May create todos to adjust priorities
- May create a response todo to acknowledge feedback
- Next Builder cycle might adjust work based on Planner's updated todos

**Verify**:
- Check if new todos reflect the user's feedback
- Check if todo priorities changed
- Look for strategic adjustments in agent traces

---

### Scenario 6: Real-Time Updates

**Steps**:
1. Open the same team in two browser tabs
2. In Tab 1: Send a message
3. Watch Tab 2

**Expected**:
- Message appears in both tabs (Convex reactive updates)
- When response arrives, both tabs update
- No need to refresh

---

## Debugging Tips

### Message Not Appearing
- Check browser console for errors
- Verify Convex connection (top right indicator in dashboard)
- Check `userMessages.send` mutation is defined and exported

### Planner Not Seeing Message
- Check `internal.userMessages.internalGetUnprocessed` exists
- Verify Planner's context loading in logs
- Check `checkPlannerHasWork` logic includes user message check

### Communicator Not Responding
- Verify todo contains keywords: "respond to user", "answer user", "reply to user"
- Check Communicator's todo filtering logic
- Look for errors in Communicator execution logs

### Response Not Linked
- Verify `internalSend` returns message ID
- Check `internalMarkProcessed` is called with correct IDs
- Query user_messages to see if response_id is set

---

## Performance Testing

### Load Test
1. Send 10 messages rapidly
2. Observe processing time
3. Check for race conditions

### Long-Running Test
1. Leave dashboard open for 30 minutes
2. Send messages periodically
3. Verify memory doesn't leak
4. Check Convex function call counts

---

## Success Criteria

✅ Users can send messages via dashboard
✅ Messages appear immediately with status indicators
✅ Planner receives and analyzes messages within next cycle
✅ Planner creates appropriate response/action todos
✅ Communicator responds when instructed by Planner
✅ Responses appear in chat with proper linking
✅ Messages marked as processed after handling
✅ Real-time updates work across browser tabs
✅ Multiple messages handled correctly
✅ Feedback can influence agent behavior

---

## Known Limitations

1. **No Message Editing**: Once sent, messages cannot be edited
2. **No Message Deletion**: Cannot delete messages (by design for audit trail)
3. **Response Delay**: Responses depend on orchestration cycle timing
4. **Single Response**: All unprocessed messages may get one consolidated response
5. **No Direct Reply**: Communicator responds via broadcast, not direct to user

---

## Future Enhancements

- [ ] Message read receipts (show when Planner sees message)
- [ ] Typing indicators (show when Communicator is composing)
- [ ] Message reactions/upvotes
- [ ] Thread support (reply to specific messages)
- [ ] User authentication (real user accounts vs visitor names)
- [ ] File attachments
- [ ] Rich text formatting
- [ ] @mentions for specific agents
- [ ] Chat export functionality
