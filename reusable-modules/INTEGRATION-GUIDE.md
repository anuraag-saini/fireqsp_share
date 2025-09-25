# 🔗 Integration Guide

This guide shows how to integrate all three modules (Clerk Auth, Stripe Payments, and Supabase Storage) together in a Next.js application.

## 📋 Complete Setup Checklist

### 1. Install All Dependencies

```bash
npm install @clerk/nextjs @stripe/stripe-js stripe @supabase/supabase-js svix
```

### 2. Environment Variables

Create `.env.local` with all required variables:

```env
# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_xxx
CLERK_SECRET_KEY=sk_test_xxx
CLERK_WEBHOOK_SECRET=whsec_xxx

# Stripe Payments
STRIPE_SECRET_KEY=sk_test_xxx
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_xxx
STRIPE_BASIC_PRICE_ID=price_xxx
STRIPE_PRO_PRICE_ID=price_xxx
STRIPE_ENTERPRISE_PRICE_ID=price_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx

# Supabase Database
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxx
SUPABASE_SERVICE_ROLE_KEY=xxx

# App Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 3. Project Structure

```
your-app/
├── app/
│   ├── layout.tsx                    # Wrap with ClerkProvider
│   ├── page.tsx                      # Home page
│   ├── sign-in/
│   │   └── [[...sign-in]]/
│   │       └── page.tsx
│   ├── sign-up/
│   │   └── [[...sign-up]]/
│   │       └── page.tsx
│   ├── dashboard/
│   │   └── page.tsx                  # Protected dashboard
│   ├── pricing/
│   │   └── page.tsx                  # Pricing page with Stripe
│   └── api/
│       ├── webhooks/
│       │   ├── clerk/
│       │   │   └── route.ts          # Clerk webhooks
│       │   └── stripe/
│       │       └── route.ts          # Stripe webhooks
│       └── stripe/
│           └── create-checkout/
│               └── route.ts          # Checkout creation
├── lib/
│   ├── auth.ts                       # Auth utilities
│   ├── stripe.ts                     # Stripe server utils
│   ├── stripe-client.ts              # Stripe client utils
│   ├── supabase.ts                   # Supabase clients
│   ├── supabase-types.ts             # TypeScript types
│   └── supabase-utils.ts             # Database helpers
├── components/
│   ├── UserButton.tsx
│   └── PricingCard.tsx
└── middleware.ts                     # Route protection
```

## 🔄 Integration Flow

### User Signup Flow

```
1. User signs up via Clerk
   ↓
2. Clerk webhook fires (user.created)
   ↓
3. Webhook creates user in Supabase
   ↓
4. User gets trial subscription
   ↓
5. User accesses protected routes
```

### Payment Flow

```
1. User selects plan on pricing page
   ↓
2. Create Stripe checkout session
   ↓
3. User completes payment on Stripe
   ↓
4. Stripe webhook fires (checkout.session.completed)
   ↓
5. Update subscription in Supabase
   ↓
6. User gets access to paid features
```

## 💻 Code Examples

### 1. App Layout with Clerk

```tsx
// app/layout.tsx
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

### 2. Protected Dashboard with Subscription Check

```tsx
// app/dashboard/page.tsx
import { currentUser } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { SupabaseUtils } from '@/lib/supabase-utils'

export default async function DashboardPage() {
  const user = await currentUser()
  
  if (!user) {
    redirect('/sign-in')
  }

  // Check subscription status
  const hasAccess = await SupabaseUtils.hasActiveSubscription(user.id)
  const subscription = await SupabaseUtils.getUserSubscription(user.id)

  return (
    <div>
      <h1>Dashboard</h1>
      <p>Welcome, {user.firstName}!</p>
      
      {hasAccess ? (
        <div>
          <p>Plan: {subscription?.plan_type}</p>
          <p>Status: {subscription?.status}</p>
          {/* Show premium features */}
        </div>
      ) : (
        <div>
          <p>Upgrade to access premium features</p>
          <a href="/pricing">View Plans</a>
        </div>
      )}
    </div>
  )
}
```

### 3. Integrated Clerk Webhook with Supabase

```typescript
// app/api/webhooks/clerk/route.ts
import { NextResponse } from 'next/headers'
import { WebhookEvent } from '@clerk/nextjs/server'
import { Webhook } from 'svix'
import { SupabaseUtils } from '@/lib/supabase-utils'

export async function POST(req: Request) {
  const body = await req.text()
  const headersList = await headers()
  
  const wh = new Webhook(process.env.CLERK_WEBHOOK_SECRET!)
  const payload = wh.verify(body, {
    'svix-id': headersList.get('svix-id')!,
    'svix-timestamp': headersList.get('svix-timestamp')!,
    'svix-signature': headersList.get('svix-signature')!,
  }) as WebhookEvent

  if (payload.type === 'user.created') {
    const user = payload.data
    
    // Create user in Supabase
    await SupabaseUtils.upsertUser({
      id: user.id,
      email: user.email_addresses[0].email_address,
      full_name: `${user.first_name} ${user.last_name}`,
      avatar_url: user.image_url,
    })

    console.log(`✅ User created: ${user.id}`)
  }

  return NextResponse.json({ success: true })
}
```

### 4. Complete Pricing Page

```tsx
// app/pricing/page.tsx
'use client'

import { useUser } from '@clerk/nextjs'
import { PricingCard } from '@/components/PricingCard'
import { useRouter } from 'next/navigation'

export default function PricingPage() {
  const { isSignedIn } = useUser()
  const router = useRouter()

  const plans = [
    {
      name: 'Basic',
      price: 9.99,
      planType: 'basic' as const,
      features: [
        '10 extractions per month',
        'Basic support',
        'Email notifications',
      ],
    },
    {
      name: 'Pro',
      price: 29.99,
      planType: 'pro' as const,
      popular: true,
      features: [
        '100 extractions per month',
        'Priority support',
        'API access',
      ],
    },
  ]

  if (!isSignedIn) {
    return (
      <div className="text-center py-12">
        <h2 className="text-3xl font-bold mb-4">Sign in to view pricing</h2>
        <button
          onClick={() => router.push('/sign-in')}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg"
        >
          Sign In
        </button>
      </div>
    )
  }

  return (
    <div className="py-12">
      <h1 className="text-4xl font-bold text-center mb-12">Choose Your Plan</h1>
      <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
        {plans.map((plan) => (
          <PricingCard key={plan.planType} plan={plan} />
        ))}
      </div>
    </div>
  )
}
```

### 5. API Route with All Three Services

```typescript
// app/api/user/profile/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { SupabaseUtils } from '@/lib/supabase-utils'
import { stripe } from '@/lib/stripe'

export async function GET(request: NextRequest) {
  try {
    // 1. Authenticate with Clerk
    const user = await requireAuth()
    
    // 2. Get user data from Supabase
    const userData = await SupabaseUtils.getUser(user.id)
    const subscription = await SupabaseUtils.getUserSubscription(user.id)
    
    // 3. Get Stripe customer info if exists
    let stripeCustomer = null
    if (subscription?.stripe_customer_id) {
      stripeCustomer = await stripe.customers.retrieve(
        subscription.stripe_customer_id
      )
    }

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.emailAddresses[0].emailAddress,
        fullName: userData?.full_name,
        avatarUrl: userData?.avatar_url,
      },
      subscription: {
        plan: subscription?.plan_type || 'free',
        status: subscription?.status || 'inactive',
        currentPeriodEnd: subscription?.current_period_end,
      },
      billing: stripeCustomer ? {
        customerId: subscription.stripe_customer_id,
        // Add more billing info as needed
      } : null,
    })
  } catch (error) {
    console.error('Profile error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch profile' },
      { status: 500 }
    )
  }
}
```

## 🎯 Common Patterns

### Pattern 1: Feature Gating by Plan

```typescript
// lib/feature-access.ts
import { SupabaseUtils } from './supabase-utils'

export async function canAccessFeature(
  userId: string,
  feature: string
): Promise<boolean> {
  const subscription = await SupabaseUtils.getUserSubscription(userId)
  const plan = subscription?.plan_type || 'free'

  const featureAccess: Record<string, string[]> = {
    'basic_extraction': ['free', 'trial', 'basic', 'pro', 'enterprise'],
    'advanced_extraction': ['pro', 'enterprise'],
    'api_access': ['pro', 'enterprise'],
    'custom_integration': ['enterprise'],
  }

  return featureAccess[feature]?.includes(plan) || false
}

// Usage in API route
export async function POST(request: NextRequest) {
  const user = await requireAuth()
  
  const hasAccess = await canAccessFeature(user.id, 'api_access')
  
  if (!hasAccess) {
    return NextResponse.json(
      { error: 'Upgrade to Pro to access this feature' },
      { status: 403 }
    )
  }
  
  // Process request...
}
```

### Pattern 2: Usage Tracking

```typescript
// lib/usage-tracker.ts
import { supabaseAdmin } from './supabase'

export async function trackUsage(userId: string, action: string) {
  const currentMonth = new Date().toISOString().slice(0, 7)
  
  await supabaseAdmin.rpc('increment_usage', {
    p_user_id: userId
  })
  
  console.log(`📊 Tracked ${action} for user ${userId}`)
}

// Usage in API route
export async function POST(request: NextRequest) {
  const user = await requireAuth()
  
  // Track the usage
  await trackUsage(user.id, 'extraction')
  
  // Process request...
}
```

### Pattern 3: Subscription Cancellation

```typescript
// app/api/subscription/cancel/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { SupabaseUtils } from '@/lib/supabase-utils'
import { stripe } from '@/lib/stripe'

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth()
    
    const subscription = await SupabaseUtils.getUserSubscription(user.id)
    
    if (!subscription?.stripe_subscription_id) {
      return NextResponse.json(
        { error: 'No active subscription' },
        { status: 400 }
      )
    }

    // Cancel in Stripe
    await stripe.subscriptions.cancel(subscription.stripe_subscription_id)
    
    // Update in Supabase (webhook will also update this)
    await SupabaseUtils.updateSubscription(user.id, {
      status: 'canceled',
    })

    return NextResponse.json({
      message: 'Subscription canceled successfully',
    })
  } catch (error) {
    console.error('Cancel error:', error)
    return NextResponse.json(
      { error: 'Failed to cancel subscription' },
      { status: 500 }
    )
  }
}
```

## 🧪 Testing Checklist

### Local Testing

1. **Test Clerk Authentication**
   - [ ] Sign up flow works
   - [ ] Sign in flow works
   - [ ] Protected routes redirect
   - [ ] User button displays correctly

2. **Test Stripe Integration**
   - [ ] Checkout session creates successfully
   - [ ] Payment completes (use test cards)
   - [ ] Webhook receives events
   - [ ] Subscription updates in database

3. **Test Supabase Integration**
   - [ ] User created on signup
   - [ ] Data queries work
   - [ ] RLS policies enforced
   - [ ] File uploads work

### Webhook Testing

Use Stripe CLI and Clerk webhook testing:

```bash
# Test Stripe webhooks locally
stripe listen --forward-to localhost:3000/api/webhooks/stripe

# Test with specific event
stripe trigger checkout.session.completed
```

## 🚀 Deployment Checklist

1. **Environment Variables**
   - [ ] All production keys configured
   - [ ] Webhook secrets updated
   - [ ] App URL set correctly

2. **Webhooks**
   - [ ] Clerk webhook endpoint added
   - [ ] Stripe webhook endpoint added
   - [ ] Both webhooks tested in production

3. **Database**
   - [ ] Supabase tables created
   - [ ] RLS policies enabled
   - [ ] Indexes added for performance

4. **Security**
   - [ ] Service keys not exposed to client
   - [ ] RLS policies tested
   - [ ] Rate limiting implemented

## 📚 Additional Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [Clerk Documentation](https://clerk.com/docs)
- [Stripe Documentation](https://stripe.com/docs)
- [Supabase Documentation](https://supabase.com/docs)

## 💡 Pro Tips

1. **Use TypeScript** - All modules have type safety
2. **Error Handling** - Always handle webhook failures gracefully
3. **Logging** - Log all important events for debugging
4. **Caching** - Implement caching for frequently accessed data
5. **Monitoring** - Set up error tracking (Sentry, LogRocket)
6. **Testing** - Write tests for critical paths

## 🐛 Common Issues & Solutions

### Issue: Webhooks not receiving events

**Solution**: 
- Check webhook URL is publicly accessible
- Verify webhook secrets match
- Check webhook logs in respective dashboards

### Issue: RLS blocking queries

**Solution**:
- Use `supabaseAdmin` in API routes
- Check JWT token contains user ID
- Verify RLS policies are correct

### Issue: Payment not reflecting in app

**Solution**:
- Check Stripe webhook is firing
- Verify webhook handler updates database
- Check for errors in webhook logs

---

**Built with ❤️ for easy Next.js development**
