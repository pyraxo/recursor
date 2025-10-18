# Testing the Play/Pause Feature

## Setup Instructions

### 1. Install Dependencies
```bash
cd packages/agent-engine
pnpm install
```

### 2. Environment Configuration
Create a `.env` file in the project root with:
```env
CONVEX_URL=https://your-convex-instance.convex.cloud
ANTHROPIC_API_KEY=your-api-key
# Or for OpenAI:
# OPENAI_API_KEY=your-api-key
# LLM_PROVIDER=openai
```

### 3. Start Convex Dev Server
```bash
cd packages/convex
pnpm dev
```

### 4. Start the Dashboard
```bash
cd apps/dashboard
pnpm dev
```

### 5. Start the Execution Service
```bash
cd packages/agent-engine
pnpm service
# Or for development with auto-reload:
pnpm service:dev
```

## Testing Workflow

### Test 1: Basic Play/Pause for Single Team

1. **Create a Team**
   - Go to Admin Dashboard (http://localhost:3002/admin)
   - Enter participant name
   - Provide initial project idea
   - Click "Create Team"

2. **Start Execution**
   - Navigate to the Observability view (http://localhost:3002)
   - Click on the team in the left panel
   - Click the green **Play** button in the ExecutionControls
   - Verify status changes to "RUNNING"
   - Check that activity indicator shows processing

3. **Pause Execution**
   - Click the yellow **Pause** button
   - Verify status changes to "PAUSED"
   - Confirm agents complete current action before pausing
   - Check that "Agents will resume from current state" message appears

4. **Resume Execution**
   - Click the green **Play** button again
   - Verify status changes back to "RUNNING"
   - Confirm agents continue from where they left off
   - Check Live Feed for continued agent activity

5. **Stop Execution**
   - Click the red **Stop** button
   - Confirm the warning dialog
   - Verify status changes to "STOPPED"
   - Confirm controls are disabled after stopping

### Test 2: Multiple Teams

1. **Create Multiple Teams**
   - Create 3-4 teams via Admin Dashboard
   - Give each unique names and project ideas

2. **Start Individual Teams**
   - Start 2 teams individually using their Play buttons
   - Leave 1-2 teams idle
   - Verify execution status badges show correctly

3. **Use Global Controls**
   - Go to Admin Dashboard
   - Use "Start All" button
   - Verify idle teams start running
   - Check execution statistics update

4. **Test Mixed States**
   - Pause one team
   - Stop another team
   - Keep others running
   - Use "Stop All" button
   - Verify only running teams are affected

### Test 3: Service Resilience

1. **Service Restart**
   - Start a team execution
   - Stop the execution service (Ctrl+C)
   - Restart the service
   - Verify team continues from saved state

2. **Dashboard Refresh**
   - Start team execution
   - Refresh the dashboard page
   - Verify controls maintain correct state
   - Confirm execution continues uninterrupted

### Test 4: Error Handling

1. **Network Interruption**
   - Start execution
   - Briefly disconnect network (optional test)
   - Verify service attempts retry
   - Check execution recovers or stops gracefully

2. **Invalid State Transitions**
   - Try starting an already running team
   - Try pausing a stopped team
   - Verify appropriate error handling

### Test 5: Performance & UI

1. **Activity Indicators**
   - Start multiple teams
   - Verify activity indicators pulse when processing
   - Check last activity timestamps update
   - Confirm elapsed time displays correctly

2. **Admin Dashboard Stats**
   - Start/stop/pause various teams
   - Verify phase statistics remain accurate
   - Check execution state counts update in real-time
   - Confirm team list shows status badges

## Expected Behaviors

### Execution States

| State | Play Button | Pause Button | Stop Button | Activity |
|-------|------------|--------------|-------------|----------|
| IDLE | ✅ Enabled (Start) | ❌ Hidden | ❌ Hidden | None |
| RUNNING | ❌ Hidden | ✅ Enabled | ✅ Enabled | Pulsing indicator |
| PAUSED | ✅ Enabled (Resume) | ❌ Hidden | ✅ Enabled | None |
| STOPPED | ❌ All Disabled | ❌ All Disabled | ❌ All Disabled | None |

### Service Logs

The execution service should log:
```
Starting Execution Controller...
✓ Execution controller is running
Starting execution for stack <id> (Team Name)
Started orchestrator for stack <id>
Execution paused by dashboard.
Execution resumed from dashboard.
Stopping execution for stack <id> (Team Name)
```

### Dashboard Updates

- Execution status badges update within 1-2 seconds
- Activity indicators show processing within 5 seconds of agent action
- Statistics refresh immediately after state changes
- Team list shows real-time execution status

## Troubleshooting

### Issue: Teams won't start
- Check execution service is running
- Verify Convex connection
- Check browser console for errors
- Ensure API keys are configured

### Issue: Pause doesn't work
- Verify orchestrator refactoring is deployed
- Check service logs for errors
- Ensure Convex mutations are deployed

### Issue: UI not updating
- Check Convex dev server is running
- Verify dashboard is connected to Convex
- Clear browser cache and refresh

### Issue: Service crashes
- Check logs for error messages
- Verify all dependencies installed
- Ensure proper environment variables
- Check for retry attempts in logs

## Verification Checklist

- [ ] Teams can be created with initial project ideas
- [ ] Play button starts agent execution
- [ ] Pause button halts execution gracefully
- [ ] Resume continues from exact pause point
- [ ] Stop button permanently halts execution
- [ ] Multiple teams can run independently
- [ ] Global controls affect appropriate teams
- [ ] Service recovers from crashes
- [ ] Dashboard shows real-time status
- [ ] Admin statistics are accurate
- [ ] Error messages are clear and helpful
- [ ] Performance is acceptable with 5+ teams

## Notes

- The execution service polls Convex every 2 seconds for state changes
- Agents complete their current action before pausing (graceful pause)
- Stopped teams cannot be restarted; they remain in terminal state
- The service supports automatic retry with exponential backoff
- Dashboard uses Convex subscriptions for real-time updates