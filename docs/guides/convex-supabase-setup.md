# Convex and Supabase Setup Guide

## Overview

This guide explains how to set up and use both Convex and Supabase in your project. These two backend services offer complementary features that, when used together, can provide a powerful and flexible backend infrastructure.

## Why Use Both Services?

### Convex Strengths
- **Real-time reactive database**: Automatically syncs data across clients without additional configuration
- **TypeScript-first**: End-to-end type safety with auto-generated types
- **Serverless functions**: Write backend logic directly in TypeScript with hot-reload
- **Optimistic updates**: Built-in support for instant UI updates
- **Transactional consistency**: ACID guarantees across all operations
- **Simple deployment**: No infrastructure management needed

### Supabase Strengths
- **Full PostgreSQL database**: Access to all PostgreSQL features and extensions
- **Row-Level Security (RLS)**: Fine-grained access control at the database level
- **Built-in authentication**: Multiple auth providers out of the box
- **Storage**: File and media storage with CDN
- **Vector embeddings**: Built-in support for AI/ML use cases
- **SQL capabilities**: Complex queries, views, stored procedures

## Recommended Architecture Pattern

Use each service for what it does best:
- **Convex**: Real-time features, collaborative features, reactive UI state
- **Supabase**: Authentication, file storage, complex SQL queries, analytics

## Prerequisites

- Node.js 18+ installed
- pnpm installed (this project uses pnpm workspaces)
- Git configured
- Accounts on both [Convex](https://convex.dev) and [Supabase](https://supabase.com)

## Setup Instructions

### Step 1: Install Dependencies

From the project root, install the necessary packages:

```bash
pnpm add convex @supabase/supabase-js
pnpm add -D @types/node
```

### Step 2: Set Up Convex

#### 2.1 Initialize Convex

```bash
npx convex dev
```

This command will:
- Prompt you to log in to Convex
- Create a new project or connect to an existing one
- Generate a `convex/` directory with configuration files
- Create `.env.local` with your Convex deployment URL

#### 2.2 Configure Convex

Create `convex/convex.config.ts`:

```typescript
import { defineApp } from "convex/server";

const app = defineApp();

export default app;
```

#### 2.3 Create Your First Convex Function

Create `convex/messages.ts`:

```typescript
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Query to get all messages
export const list = query({
  handler: async (ctx) => {
    return await ctx.db.query("messages").collect();
  },
});

// Mutation to send a message
export const send = mutation({
  args: {
    text: v.string(),
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("messages", {
      text: args.text,
      userId: args.userId,
      createdAt: Date.now(),
    });
  },
});
```

Create `convex/schema.ts`:

```typescript
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

### Step 3: Set Up Supabase

#### 3.1 Create a Supabase Project

1. Go to [app.supabase.com](https://app.supabase.com)
2. Create a new project
3. Save your project URL and anon key

#### 3.2 Initialize Supabase Locally

```bash
npx supabase init
```

#### 3.3 Configure Environment Variables

Add to your `.env.local`:

```env
# Convex (already added by npx convex dev)
CONVEX_DEPLOYMENT=your-deployment-url

# Supabase
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

#### 3.4 Create Supabase Tables

Create `supabase/migrations/001_initial_schema.sql`:

```sql
-- User profiles table
CREATE TABLE profiles (
  id UUID REFERENCES auth.users PRIMARY KEY,
  username TEXT UNIQUE,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Public profiles are viewable by everyone"
  ON profiles FOR SELECT
  USING (true);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- Storage bucket for user uploads
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true);

-- Storage policies
CREATE POLICY "Anyone can view avatars"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

CREATE POLICY "Authenticated users can upload avatars"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'avatars' AND auth.role() = 'authenticated');
```

Apply the migration:

```bash
npx supabase db push
```

### Step 4: Create Client Utilities

#### 4.1 Convex Client Setup

Create `lib/convex.ts`:

```typescript
import { ConvexClient } from "convex/browser";

const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL!;

export const convex = new ConvexClient(convexUrl);
```

#### 4.2 Supabase Client Setup

Create `lib/supabase.ts`:

```typescript
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});
```

### Step 5: Implement Authentication Bridge

Since Supabase has excellent built-in authentication, we'll use it as the primary auth provider and sync user sessions with Convex.

Create `lib/auth-bridge.ts`:

```typescript
import { supabase } from './supabase';
import { convex } from './convex';
import { api } from '../convex/_generated/api';

export async function syncAuthToConvex() {
  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    // Store user info in Convex for real-time features
    await convex.mutation(api.users.upsert, {
      id: user.id,
      email: user.email,
      metadata: user.user_metadata,
    });
  }
}

// Call this on auth state changes
supabase.auth.onAuthStateChange((event, session) => {
  if (event === 'SIGNED_IN' && session) {
    syncAuthToConvex();
  }
});
```

Create `convex/users.ts`:

```typescript
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const upsert = mutation({
  args: {
    id: v.string(),
    email: v.optional(v.string()),
    metadata: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("supabaseId"), args.id))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        email: args.email,
        metadata: args.metadata,
        lastSeen: Date.now(),
      });
    } else {
      await ctx.db.insert("users", {
        supabaseId: args.id,
        email: args.email,
        metadata: args.metadata,
        createdAt: Date.now(),
        lastSeen: Date.now(),
      });
    }
  },
});
```

### Step 6: Example Usage in React

Create a component that uses both services:

```tsx
// components/ChatWithProfile.tsx
import { useEffect, useState } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../convex/_generated/api';
import { supabase } from '../lib/supabase';

export function ChatWithProfile() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const messages = useQuery(api.messages.list);
  const sendMessage = useMutation(api.messages.send);

  // Get auth from Supabase
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
      if (user) {
        // Fetch profile from Supabase
        supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single()
          .then(({ data }) => setProfile(data));
      }
    });
  }, []);

  // Real-time messages from Convex
  const handleSend = async (text: string) => {
    if (user) {
      await sendMessage({
        text,
        userId: user.id
      });
    }
  };

  return (
    <div>
      <div>
        {profile && (
          <img src={profile.avatar_url} alt={profile.full_name} />
        )}
      </div>
      <div>
        {messages?.map((msg) => (
          <div key={msg._id}>{msg.text}</div>
        ))}
      </div>
      {/* Message input form */}
    </div>
  );
}
```

## Best Practices

### 1. Service Selection Guidelines

**Use Convex for:**
- Real-time collaborative features (chat, presence, live cursors)
- Reactive UI state that needs to sync across clients
- Simple CRUD operations with type safety
- Optimistic updates for instant feedback
- Serverless functions that need to run close to your data

**Use Supabase for:**
- User authentication and authorization
- File/media storage and CDN delivery
- Complex SQL queries and reporting
- Full-text search
- Vector embeddings for AI features
- Data that needs PostgreSQL-specific features

### 2. Data Synchronization

When you need data to exist in both systems:
- Keep the source of truth in one system
- Use webhooks or background jobs to sync
- Consider eventual consistency requirements

### 3. Security Considerations

- Use Supabase RLS for database-level security
- Use Convex functions for business logic validation
- Never expose service keys in client code
- Implement proper CORS policies

### 4. Performance Optimization

- Use Convex for frequently changing data
- Use Supabase for large datasets and complex queries
- Cache Supabase query results when appropriate
- Use database indexes for both services

## Common Patterns

### Pattern 1: Auth + Real-time Chat

```typescript
// Supabase handles auth
const { user } = await supabase.auth.signInWithPassword({
  email, password
});

// Convex handles real-time messages
const messages = useQuery(api.chat.messages);
```

### Pattern 2: File Upload + Metadata

```typescript
// Supabase stores the file
const { data } = await supabase.storage
  .from('uploads')
  .upload(path, file);

// Convex tracks metadata and sharing
await convex.mutation(api.files.create, {
  url: data.path,
  name: file.name,
  sharedWith: userIds,
});
```

### Pattern 3: Analytics Pipeline

```typescript
// Convex collects events in real-time
await convex.mutation(api.events.track, {
  event: 'page_view',
  properties: { ... }
});

// Periodic sync to Supabase for analysis
// Run this in a Convex scheduled function
const events = await ctx.db.query('events').collect();
await supabase.from('analytics').insert(events);
```

## Deployment

### Development

```bash
# Terminal 1: Convex
npx convex dev

# Terminal 2: Supabase
npx supabase start

# Terminal 3: Your app
pnpm dev
```

### Production

1. **Deploy Convex:**
```bash
npx convex deploy
```

2. **Deploy Supabase:**
- Push database changes: `npx supabase db push`
- Deploy edge functions: `npx supabase functions deploy`

3. **Update environment variables** in your hosting platform (Vercel, Netlify, etc.)

## Troubleshooting

### Common Issues

1. **CORS errors**: Check Supabase project settings
2. **Type errors**: Run `npx convex codegen` to regenerate types
3. **Auth sync issues**: Verify webhook configuration
4. **Real-time not working**: Check Convex deployment status

### Debug Commands

```bash
# Check Convex status
npx convex logs

# Check Supabase status
npx supabase status

# Reset local Supabase
npx supabase db reset
```

## Resources

- [Convex Documentation](https://docs.convex.dev)
- [Supabase Documentation](https://supabase.com/docs)
- [Example Repository](https://github.com/your-org/convex-supabase-example)
- [Discord Community](https://discord.gg/convex)

## Conclusion

By combining Convex and Supabase, you get the best of both worlds: Convex's excellent real-time capabilities and developer experience with Supabase's powerful PostgreSQL features and built-in authentication. This architecture provides flexibility to choose the right tool for each feature while maintaining a cohesive backend infrastructure.

Remember to:
- Start simple and add complexity as needed
- Monitor usage and costs for both services
- Keep security as a top priority
- Document your service boundaries clearly

Happy building!