# 🗄️ Supabase Storage Module

Complete database and storage solution for Next.js using Supabase.

## 📦 Installation

```bash
npm install @supabase/supabase-js
```

## 🔑 Environment Variables

Create a `.env.local` file with:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

## 🏗️ Project Structure

```
3-supabase-storage/
├── README.md (this file)
├── lib/
│   ├── supabase.ts           # Supabase clients
│   ├── supabase-types.ts     # TypeScript types
│   └── supabase-utils.ts     # Helper functions
├── app/
│   └── api/
│       └── data/
│           └── route.ts      # Example data API
└── sql/
    ├── schema.sql            # Database schema
    └── rls-policies.sql      # Row Level Security
```

## 🚀 Setup Steps

### 1. Create Supabase Project

1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Create a new project
3. Copy your project URL and keys to `.env.local`

### 2. Set Up Database Tables

Run these SQL commands in Supabase SQL Editor:

```sql
-- Users table (synced with Clerk)
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- User subscriptions
CREATE TABLE user_subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  user_email TEXT NOT NULL,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  plan_type TEXT DEFAULT 'free',
  status TEXT DEFAULT 'inactive',
  current_period_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- User data/content table (example)
CREATE TABLE user_content (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content JSONB,
  status TEXT DEFAULT 'draft',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_user_subscriptions_user_id ON user_subscriptions(user_id);
CREATE INDEX idx_user_content_user_id ON user_content(user_id);
CREATE INDEX idx_user_content_status ON user_content(status);
```

### 3. Enable Row Level Security (RLS)

```sql
-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_content ENABLE ROW LEVEL SECURITY;

-- Users can read their own data
CREATE POLICY "Users can read own data"
  ON users FOR SELECT
  USING (auth.jwt() ->> 'sub' = id);

-- Users can update their own data
CREATE POLICY "Users can update own data"
  ON users FOR UPDATE
  USING (auth.jwt() ->> 'sub' = id);

-- Users can read their own subscription
CREATE POLICY "Users can read own subscription"
  ON user_subscriptions FOR SELECT
  USING (auth.jwt() ->> 'sub' = user_id);

-- Users can manage their own content
CREATE POLICY "Users can manage own content"
  ON user_content FOR ALL
  USING (auth.jwt() ->> 'sub' = user_id);
```

### 4. Set Up Storage Buckets (Optional)

For file uploads:

```sql
-- Create storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('user-uploads', 'user-uploads', false);

-- Storage policies
CREATE POLICY "Users can upload own files"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'user-uploads' 
    AND auth.jwt() ->> 'sub' = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can read own files"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'user-uploads'
    AND auth.jwt() ->> 'sub' = (storage.foldername(name))[1]
  );
```

## 📖 Usage Examples

### Basic CRUD Operations

```typescript
import { supabase, supabaseAdmin } from '@/lib/supabase'

// CREATE
async function createContent(userId: string, title: string, content: any) {
  const { data, error } = await supabaseAdmin
    .from('user_content')
    .insert({
      user_id: userId,
      title,
      content,
      status: 'draft'
    })
    .select()
    .single()

  if (error) throw error
  return data
}

// READ
async function getUserContent(userId: string) {
  const { data, error } = await supabaseAdmin
    .from('user_content')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data
}

// UPDATE
async function updateContent(id: string, updates: any) {
  const { data, error } = await supabaseAdmin
    .from('user_content')
    .update({
      ...updates,
      updated_at: new Date().toISOString()
    })
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

// DELETE
async function deleteContent(id: string) {
  const { error } = await supabaseAdmin
    .from('user_content')
    .delete()
    .eq('id', id)

  if (error) throw error
}
```

### File Upload Example

```typescript
import { supabaseAdmin } from '@/lib/supabase'

async function uploadFile(
  userId: string, 
  file: File
): Promise<string> {
  const fileName = `${userId}/${Date.now()}-${file.name}`
  
  const { data, error } = await supabaseAdmin
    .storage
    .from('user-uploads')
    .upload(fileName, file, {
      cacheControl: '3600',
      upsert: false
    })

  if (error) throw error

  // Get public URL
  const { data: urlData } = supabaseAdmin
    .storage
    .from('user-uploads')
    .getPublicUrl(fileName)

  return urlData.publicUrl
}
```

### Realtime Subscriptions

```typescript
'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export function useRealtimeContent(userId: string) {
  const [content, setContent] = useState<any[]>([])

  useEffect(() => {
    // Subscribe to changes
    const channel = supabase
      .channel('user_content_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_content',
          filter: `user_id=eq.${userId}`
        },
        (payload) => {
          console.log('Change received!', payload)
          // Update local state based on payload
          if (payload.eventType === 'INSERT') {
            setContent(prev => [payload.new, ...prev])
          }
          // Handle UPDATE and DELETE similarly
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [userId])

  return content
}
```

### Batch Operations

```typescript
async function batchInsert(items: any[]) {
  const { data, error } = await supabaseAdmin
    .from('user_content')
    .insert(items)
    .select()

  if (error) throw error
  return data
}

async function batchDelete(ids: string[]) {
  const { error } = await supabaseAdmin
    .from('user_content')
    .delete()
    .in('id', ids)

  if (error) throw error
}
```

### Complex Queries

```typescript
// Query with filters and joins
async function getContentWithSubscription(userId: string) {
  const { data, error } = await supabaseAdmin
    .from('user_content')
    .select(`
      *,
      users!inner(
        email,
        full_name
      ),
      user_subscriptions!inner(
        plan_type,
        status
      )
    `)
    .eq('user_id', userId)
    .eq('status', 'published')
    .order('created_at', { ascending: false })
    .limit(10)

  if (error) throw error
  return data
}
```

## 🔒 Security Best Practices

- ✅ Always use RLS policies for user data
- ✅ Use `supabaseAdmin` only in server components/API routes
- ✅ Use `supabase` in client components (respects RLS)
- ✅ Never expose service role key to client
- ✅ Validate all inputs before database operations
- ✅ Use prepared statements (automatic with Supabase)

## 🐛 Troubleshooting

### RLS Blocking Queries

If queries return no data:
1. Check RLS policies are correctly configured
2. Verify JWT token contains correct user ID
3. Use `supabaseAdmin` in API routes to bypass RLS when needed

### Connection Issues

```typescript
// Test connection
async function testConnection() {
  const { data, error } = await supabase
    .from('users')
    .select('count')
    .single()

  if (error) {
    console.error('Connection failed:', error)
  } else {
    console.log('Connected successfully')
  }
}
```

### Performance Optimization

```typescript
// Use select to limit columns
const { data } = await supabase
  .from('user_content')
  .select('id, title, created_at') // Only needed columns
  .limit(100)

// Use indexes for frequently queried columns
// Add in SQL:
// CREATE INDEX idx_content_created ON user_content(created_at DESC);
```

## 📚 Additional Resources

- [Supabase Documentation](https://supabase.com/docs)
- [Supabase JavaScript Client](https://supabase.com/docs/reference/javascript)
- [Row Level Security Guide](https://supabase.com/docs/guides/auth/row-level-security)
- [Supabase Storage](https://supabase.com/docs/guides/storage)

## 💡 Pro Tips

1. **Use TypeScript types** - Generate types from your database schema
2. **Implement caching** - Use React Query or SWR with Supabase
3. **Error handling** - Always check for errors in responses
4. **Migrations** - Use Supabase CLI for version-controlled schema changes
5. **Monitoring** - Enable and review Supabase logs regularly
