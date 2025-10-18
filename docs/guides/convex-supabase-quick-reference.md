# Convex & Supabase Quick Reference

## Installation

```bash
# Install packages
pnpm add convex @supabase/supabase-js

# Initialize services
npx convex dev                  # Sets up Convex
npx supabase init               # Sets up Supabase
```

## Environment Variables

```env
# .env.local
CONVEX_DEPLOYMENT=https://your-app.convex.cloud
NEXT_PUBLIC_CONVEX_URL=https://your-app.convex.cloud
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

## Quick Setup

### 1. Convex Client
```typescript
// lib/convex.ts
import { ConvexClient } from "convex/browser";
export const convex = new ConvexClient(process.env.NEXT_PUBLIC_CONVEX_URL!);
```

### 2. Supabase Client
```typescript
// lib/supabase.ts
import { createClient } from '@supabase/supabase-js';
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);
```

## When to Use What

| Use Case | Use Convex | Use Supabase |
|----------|------------|--------------|
| Real-time updates | ✅ | ❌ |
| User authentication | ❌ | ✅ |
| File storage | ❌ | ✅ |
| Collaborative features | ✅ | ❌ |
| Complex SQL queries | ❌ | ✅ |
| Optimistic updates | ✅ | ❌ |
| Vector search | ❌ | ✅ |
| Serverless functions | ✅ | ✅ |
| Type safety | ✅ | ⚠️ |
| Row-level security | ⚠️ | ✅ |

## Common Code Patterns

### Authentication (Supabase) + Real-time (Convex)

```typescript
// Sign in with Supabase
const { data: { user } } = await supabase.auth.signInWithPassword({
  email, password
});

// Use user ID in Convex
await convex.mutation(api.messages.send, {
  text: "Hello",
  userId: user.id
});
```

### File Upload (Supabase) + Metadata (Convex)

```typescript
// Upload to Supabase
const { data } = await supabase.storage
  .from('files')
  .upload(`${userId}/${fileName}`, file);

// Store metadata in Convex
await convex.mutation(api.files.create, {
  path: data.path,
  name: fileName,
  size: file.size,
  uploadedBy: userId
});
```

### React Hook Usage

```typescript
function MyComponent() {
  // Supabase auth
  const [user, setUser] = useState(null);
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
  }, []);

  // Convex real-time data
  const messages = useQuery(api.messages.list);
  const sendMessage = useMutation(api.messages.send);

  // Combined usage
  const handleSend = (text: string) => {
    if (user) {
      sendMessage({ text, userId: user.id });
    }
  };
}
```

## Schema Examples

### Convex Schema
```typescript
// convex/schema.ts
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  messages: defineTable({
    text: v.string(),
    userId: v.string(),
    createdAt: v.number(),
  }),
});
```

### Supabase Schema
```sql
-- PostgreSQL
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users,
  username TEXT UNIQUE,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
```

## Development Commands

```bash
# Start both services
npx convex dev & npx supabase start

# Check status
npx convex logs            # Convex logs
npx supabase status        # Supabase status

# Generate types
npx convex codegen         # Convex types
npx supabase gen types     # Supabase types

# Deploy to production
npx convex deploy
npx supabase db push
```

## Performance Tips

1. **Minimize cross-service calls** - Keep related data in the same service
2. **Use caching strategically** - Cache Supabase queries, let Convex handle real-time
3. **Batch operations** - Group multiple operations when possible
4. **Choose the right service** - Real-time → Convex, Complex queries → Supabase

## Security Checklist

- [ ] Environment variables are not exposed to client
- [ ] Supabase RLS policies are configured
- [ ] Convex functions validate inputs
- [ ] Service role keys are server-side only
- [ ] CORS is properly configured
- [ ] Auth state is synced between services

## Cost Optimization

- **Convex**: Pay for function calls and database operations
- **Supabase**: Pay for database size and bandwidth
- **Strategy**: Use Convex for active data, archive to Supabase

## Links

- [Convex Docs](https://docs.convex.dev)
- [Supabase Docs](https://supabase.com/docs)
- [Full Setup Guide](./convex-supabase-setup.md)