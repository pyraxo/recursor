# Cursor Team Setup Guide

Quick guide to configure environment variables for Cursor Background Agent teams.

## Required Environment Variables

All environment variables should be added to **`.env.local`** in the project root.

### 1. CURSOR_API_KEY

**What it is**: API key for Cursor Background Agents
**Required for**: Creating and managing Cursor teams
**How to get it**:

1. Go to [https://cursor.com/settings](https://cursor.com/settings)
2. Ensure you have a **paid Cursor plan** (free plan does not support Background Agents)
3. Navigate to API settings
4. Generate a new API key
5. Copy the key (format: `cur_xxx...`)

**Add to `.env.local`**:
```bash
CURSOR_API_KEY=cur_your_api_key_here
```

### 2. GITHUB_TOKEN

**What it is**: GitHub Personal Access Token
**Required for**: Creating temporary GitHub workspaces for Cursor agents
**How to get it**:

1. Go to [https://github.com/settings/tokens](https://github.com/settings/tokens)
2. Click "Generate new token" → "Generate new token (classic)"
3. Give it a descriptive name (e.g., "Recursor Cursor Teams")
4. Set expiration (recommend: 90 days or No expiration)
5. Select the following scopes:
   - ✅ **`repo`** (Full control of private repositories)
   - ✅ **`delete_repo`** (Delete repositories)
6. Click "Generate token"
7. Copy the token immediately (you won't see it again!)

**Add to `.env.local`**:
```bash
GITHUB_TOKEN=ghp_your_github_token_here
```

### Why These Scopes?

- **`repo`**: Allows creating, reading, writing, and pushing to repositories
- **`delete_repo`**: Enables automatic cleanup of temporary workspaces

**Note**: Cursor agents create temporary repos named `recursor-cursor-{stackId}` which are deleted after use to prevent accumulation.

## Verification

After adding the keys, verify they're loaded:

```bash
# From project root
node -e "console.log('CURSOR_API_KEY:', process.env.CURSOR_API_KEY ? 'SET' : 'NOT SET')"
node -e "console.log('GITHUB_TOKEN:', process.env.GITHUB_TOKEN ? 'SET' : 'NOT SET')"
```

Or test creating a Cursor team:

```bash
# This will fail with clear error messages if keys are missing
cd packages/agent-engine
pnpm cli create TestCursorTeam --type=cursor
```

## Security Best Practices

1. **Never commit `.env.local`** to version control (already in `.gitignore`)
2. **Use separate GitHub accounts** for bot operations (optional but recommended)
3. **Rotate tokens regularly** (every 90 days)
4. **Use minimal scopes** (only `repo` and `delete_repo`)
5. **Monitor usage** via GitHub audit log

## Optional: Create Dedicated GitHub Bot Account

For production use, consider creating a separate GitHub account:

1. Create new GitHub account (e.g., `recursor-cursor-bot@yourcompany.com`)
2. Invite to organization with appropriate permissions
3. Generate PAT from that account
4. Use that token instead of your personal token

Benefits:
- Cleaner audit trail
- No personal token exposure
- Easier to manage at scale

## Troubleshooting

**Error: "CURSOR_API_KEY environment variable is required"**
- Add `CURSOR_API_KEY` to `.env.local`
- Restart your terminal/dev server

**Error: "GITHUB_TOKEN environment variable is required"**
- Add `GITHUB_TOKEN` to `.env.local`
- Verify token has `repo` and `delete_repo` scopes

**Error: "401 Unauthorized" from Cursor API**
- API key is invalid or expired
- Regenerate at [cursor.com/settings](https://cursor.com/settings)

**Error: "403 Forbidden" from GitHub API**
- Token doesn't have required scopes
- Create new token with `repo` and `delete_repo`

**Error: "Rate limit exceeded"**
- Too many GitHub API calls
- Wait for rate limit reset (check headers)
- Consider implementing retry logic (see Phase 4 tasks)

## Cost Considerations

**Cursor API**: ~$2/agent-hour (estimated, verify current pricing)
**GitHub**: Free for public repos, included in Pro/Team plans

**Recommendation**: Start small, monitor costs, scale gradually.

---

**Next Steps**: Once keys are added, you can create Cursor teams via the dashboard or CLI.
