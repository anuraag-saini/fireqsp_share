# 🔐 Clerk Authentication Module

Complete authentication system for Next.js using Clerk.

## 📦 Installation

```bash
npm install @clerk/nextjs svix
```

## 🔑 Environment Variables

Create a `.env.local` file with:

```env
# Clerk Configuration
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_xxx
CLERK_SECRET_KEY=sk_test_xxx

# Clerk URLs (optional, defaults shown)
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/dashboard

# Clerk Webhook Secret (for user lifecycle events)
CLERK_WEBHOOK_SECRET=whsec_xxx
```

## 🏗️ Project Structure

```
1-clerk-auth/
├── README.md (this file)
├── lib/
│   └── auth.ts           # Auth utilities and helpers
├── middleware.ts          # Route protection
├── app/
│   ├── api/
│   │   └── webhooks/
│   │       └── clerk/
│   │           └── route.ts  # Webhook handler
│   ├── sign-in/
│   │   └── [[...sign-in]]/
│   │       └── page.tsx      # Sign-in page
│   └── sign-up/
│       └── [[...sign-up]]/
│           └── page.tsx      # Sign-up page
└── components/
    └── UserButton.tsx     # User profile button
```

## 🚀 Setup Steps

### 1. Wrap your app with ClerkProvider

Update `app/layout.tsx`:

```tsx
import { ClerkProvider } from '@clerk/nextjs'

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body>{children}</body>
      </html>
    </ClerkProvider>
  )
}
```

### 2. Copy the middleware

Copy `middleware.ts` to your project root. This protects routes automatically.

### 3. Set up webhooks in Clerk Dashboard

1. Go to Clerk Dashboard → Webhooks
2. Add endpoint: `https://yourdomain.com/api/webhooks/clerk`
3. Subscribe to events: `user.created`, `user.updated`, `user.deleted`
4. Copy the webhook secret to your `.env.local`

### 4. Create Supabase tables (if using database sync)

```sql
-- User subscriptions table
CREATE TABLE user_subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT UNIQUE NOT NULL,
  user_email TEXT NOT NULL,
  plan_type TEXT DEFAULT 'trial',
  status TEXT DEFAULT 'active',
  trial_start_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_active TIMESTAMPTZ DEFAULT NOW()
);

-- User usage tracking table
CREATE TABLE user_usage (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT UNIQUE NOT NULL,
  extraction_count INTEGER DEFAULT 0,
  current_month TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

## 📖 Usage Examples

### Protecting API Routes

```typescript
// app/api/protected/route.ts
import { requireAuth, handleAuthError } from '@/lib/auth'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const user = await requireAuth()
    
    return NextResponse.json({
      message: 'Protected data',
      userId: user.id
    })
  } catch (error) {
    return handleAuthError(error)
  }
}
```

### Getting Current User in Server Components

```tsx
// app/dashboard/page.tsx
import { currentUser } from '@clerk/nextjs/server'

export default async function DashboardPage() {
  const user = await currentUser()
  
  if (!user) {
    redirect('/sign-in')
  }
  
  return (
    <div>
      <h1>Welcome, {user.firstName}!</h1>
      <p>Email: {user.emailAddresses[0].emailAddress}</p>
    </div>
  )
}
```

### Using Authentication in Client Components

```tsx
'use client'

import { useUser } from '@clerk/nextjs'

export default function Profile() {
  const { isSignedIn, user, isLoaded } = useUser()
  
  if (!isLoaded) return <div>Loading...</div>
  
  if (!isSignedIn) return <div>Please sign in</div>
  
  return (
    <div>
      <h2>{user.fullName}</h2>
      <p>{user.emailAddresses[0].emailAddress}</p>
    </div>
  )
}
```

### Rate Limiting Example

```typescript
import { createRateLimit } from '@/lib/auth'

// 10 requests per minute
const rateLimit = createRateLimit(10, 60000)

export async function POST(req: Request) {
  const user = await requireAuth()
  
  if (!rateLimit(user.id)) {
    return NextResponse.json(
      { error: 'Too many requests' },
      { status: 429 }
    )
  }
  
  // Process request...
}
```

### Admin-Only Routes

Update `middleware.ts` to check for admin role:

```typescript
if (isAdminRoute(request)) {
  const user = await currentUser()
  
  // Check if user has admin role
  if (user?.publicMetadata?.role !== 'admin') {
    return NextResponse.json(
      { error: 'Forbidden' }, 
      { status: 403 }
    )
  }
}
```

## 🎨 UI Components

### Sign In Button

```tsx
import { SignInButton, SignedIn, SignedOut } from '@clerk/nextjs'

export default function Header() {
  return (
    <header>
      <SignedOut>
        <SignInButton mode="modal">
          <button>Sign In</button>
        </SignInButton>
      </SignedOut>
      <SignedIn>
        <UserButton afterSignOutUrl="/" />
      </SignedIn>
    </header>
  )
}
```

## 🔒 Security Features

- ✅ Automatic session management
- ✅ JWT token validation
- ✅ CSRF protection
- ✅ Rate limiting utilities
- ✅ Webhook signature verification
- ✅ Role-based access control

## 🐛 Troubleshooting

### Webhook not receiving events

1. Check webhook URL is publicly accessible
2. Verify webhook secret matches Clerk Dashboard
3. Check Clerk Dashboard → Webhooks → Attempts for errors

### Infinite redirect loops

Make sure public routes are defined in `middleware.ts`:

```typescript
const isPublicRoute = createRouteMatcher([
  '/',
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/api/webhooks(.*)',
])
```

### Type errors with user object

Install Clerk types:

```bash
npm install @clerk/types
```

## 📚 Additional Resources

- [Clerk Documentation](https://clerk.com/docs)
- [Next.js App Router with Clerk](https://clerk.com/docs/quickstarts/nextjs)
- [Clerk Webhooks Guide](https://clerk.com/docs/integrations/webhooks)
