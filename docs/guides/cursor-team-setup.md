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
**Required for**: Creating temporary GitHub workspaces for Cursor agents in the `recursor-sandbox` organization
**How to get it**:

#### Option A: Fine-grained PAT (Recommended - More Secure)

1. Go to [https://github.com/settings/personal-access-tokens/new](https://github.com/settings/personal-access-tokens/new)
2. Configure token:
   - **Name**: "Recursor Cursor Teams - recursor-sandbox"
   - **Expiration**: 90 days (recommended)
   - **Resource owner**: Select **`recursor-sandbox`** organization
   - **Repository access**: "All repositories" (within org only)
   - **Organization permissions**:
     - ✅ **Administration**: Read and write (for creating/deleting repos)
   - **Repository permissions**:
     - ✅ **Contents**: Read and write
     - ✅ **Metadata**: Read-only (automatically included)
3. Click "Generate token"
4. Copy the token immediately (format: `github_pat_xxx...`)

**Benefits of fine-grained tokens**:
- ✅ Scoped to ONLY the `recursor-sandbox` organization
- ✅ Cannot access your personal repos
- ✅ More granular permissions
- ✅ Better audit trail

#### Option B: Classic PAT (Legacy)

1. Go to [https://github.com/settings/tokens](https://github.com/settings/tokens)
2. Click "Generate new token" → "Generate new token (classic)"
3. Give it a descriptive name (e.g., "Recursor Cursor Teams")
4. Set expiration (recommend: 90 days)
5. Select the following scopes:
   - ✅ **`repo`** (Full control of private repositories)
   - ✅ **`delete_repo`** (Delete repositories)
6. Click "Generate token"
7. Copy the token immediately (format: `ghp_xxx...`)

⚠️ **Warning**: Classic tokens grant access to ALL repos in your account. Fine-grained tokens (Option A) are more secure.

**Add to `.env.local`**:
```bash
# Fine-grained token (recommended)
GITHUB_TOKEN=github_pat_your_token_here

# OR classic token (legacy)
GITHUB_TOKEN=ghp_your_github_token_here
```

### Repository Organization

Cursor agents create temporary repos in the **`recursor-sandbox`** organization:
- Format: `recursor-sandbox/recursor-{team-name}-{timestamp}`
- Visibility: **Private**
- Lifecycle: Automatically deleted after agent completes work
- Purpose: Isolated workspace with full IDE tooling

### Why These Scopes?

- **`repo`** or **Contents (write)**: Create, read, write, and push to repositories
- **`delete_repo`** or **Administration (write)**: Automatic cleanup of temporary workspaces
- **Organization scoping**: Limits token access to only `recursor-sandbox` repos

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

1. ✅ **Use fine-grained tokens** scoped to `recursor-sandbox` org (not classic PATs)
2. ✅ **Never commit `.env.local`** to version control (already in `.gitignore`)
3. ✅ **Rotate tokens regularly** (every 90 days with expiration)
4. ✅ **Use minimal scopes** (only what's needed for repo operations)
5. ✅ **Monitor usage** via GitHub audit log at [github.com/organizations/recursor-sandbox/settings/audit-log](https://github.com/organizations/recursor-sandbox/settings/audit-log)
6. ✅ **Review created repos** periodically to ensure cleanup is working
7. ⚠️ **Avoid classic PATs** - they grant access to ALL your repos, not just the org

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
- For fine-grained tokens: Ensure **Administration** (write) and **Contents** (write) permissions
- For classic tokens: Ensure `repo` and `delete_repo` scopes
- Verify token is authorized for `recursor-sandbox` organization

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
