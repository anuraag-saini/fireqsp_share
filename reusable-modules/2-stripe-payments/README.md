# 💳 Stripe Payments Module

Complete payment integration for Next.js using Stripe.

## 📦 Installation

```bash
npm install stripe @stripe/stripe-js
```

## 🔑 Environment Variables

Create a `.env.local` file with:

```env
# Stripe Keys
STRIPE_SECRET_KEY=sk_test_xxx
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_xxx

# Stripe Price IDs (get these from Stripe Dashboard → Products)
STRIPE_BASIC_PRICE_ID=price_xxx
STRIPE_PRO_PRICE_ID=price_xxx
STRIPE_ENTERPRISE_PRICE_ID=price_xxx

# Stripe Webhook Secret (for payment events)
STRIPE_WEBHOOK_SECRET=whsec_xxx

# App URL
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## 🏗️ Project Structure

```
2-stripe-payments/
├── README.md (this file)
├── lib/
│   ├── stripe.ts              # Server-side Stripe client
│   ├── stripe-client.ts       # Client-side Stripe utilities
│   └── stripe-config.ts       # Stripe configuration
├── app/
│   └── api/
│       ├── stripe/
│       │   └── create-checkout/
│       │       └── route.ts   # Create checkout session
│       └── webhooks/
│           └── stripe/
│               └── route.ts   # Handle Stripe events
└── components/
    └── PricingCard.tsx        # Pricing card component
```

## 🚀 Setup Steps

### 1. Create Products in Stripe Dashboard

1. Go to Stripe Dashboard → Products
2. Create your products (e.g., Basic, Pro, Enterprise)
3. Set up prices for each product
4. Copy the Price IDs to your `.env.local`

### 2. Set up Stripe Webhook

1. Go to Stripe Dashboard → Developers → Webhooks
2. Add endpoint: `https://yourdomain.com/api/webhooks/stripe`
3. Select events to listen to:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
4. Copy webhook secret to `.env.local`

### 3. Create Supabase Tables (for subscription tracking)

```sql
-- User subscriptions table
CREATE TABLE user_subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT UNIQUE NOT NULL,
  user_email TEXT NOT NULL,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  plan_type TEXT DEFAULT 'free',
  status TEXT DEFAULT 'inactive',
  current_period_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Payment history table (optional)
CREATE TABLE payment_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT NOT NULL,
  stripe_payment_id TEXT NOT NULL,
  amount INTEGER NOT NULL,
  currency TEXT DEFAULT 'usd',
  status TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

## 📖 Usage Examples

### Creating a Checkout Session

```typescript
// Client-side component
'use client'

import { useState } from 'react'

export function SubscribeButton({ planType }: { planType: string }) {
  const [loading, setLoading] = useState(false)

  const handleSubscribe = async () => {
    setLoading(true)
    
    try {
      const response = await fetch('/api/stripe/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planType,
          userEmail: 'user@example.com',
          successUrl: `${window.location.origin}/dashboard?success=true`,
          cancelUrl: `${window.location.origin}/pricing?canceled=true`,
        }),
      })

      const { url } = await response.json()
      
      if (url) {
        window.location.href = url
      }
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleSubscribe}
      disabled={loading}
      className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
    >
      {loading ? 'Processing...' : 'Subscribe'}
    </button>
  )
}
```

### Check Subscription Status

```typescript
// app/api/subscription/status/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth()
    
    const { data, error } = await supabaseAdmin
      .from('user_subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (error) throw error

    return NextResponse.json({
      subscription: data,
      isActive: data.status === 'active',
      planType: data.plan_type,
    })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch subscription' },
      { status: 500 }
    )
  }
}
```

### Server-side Subscription Check

```typescript
import { supabaseAdmin } from '@/lib/supabase'

export async function checkUserSubscription(userId: string) {
  const { data } = await supabaseAdmin
    .from('user_subscriptions')
    .select('*')
    .eq('user_id', userId)
    .single()

  if (!data) {
    return { hasAccess: false, plan: 'free' }
  }

  const isActive = data.status === 'active' && 
    new Date(data.current_period_end) > new Date()

  return {
    hasAccess: isActive,
    plan: data.plan_type,
    subscription: data,
  }
}
```

### Customer Portal (Self-service)

```typescript
// app/api/stripe/customer-portal/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { requireAuth } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth()
    
    // Get Stripe customer ID from database
    const { data } = await supabaseAdmin
      .from('user_subscriptions')
      .select('stripe_customer_id')
      .eq('user_id', user.id)
      .single()

    if (!data?.stripe_customer_id) {
      return NextResponse.json(
        { error: 'No subscription found' },
        { status: 404 }
      )
    }

    // Create portal session
    const session = await stripe.billingPortal.sessions.create({
      customer: data.stripe_customer_id,
      return_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard`,
    })

    return NextResponse.json({ url: session.url })
  } catch (error) {
    console.error('Portal error:', error)
    return NextResponse.json(
      { error: 'Failed to create portal session' },
      { status: 500 }
    )
  }
}
```

## 🎨 UI Components

### Pricing Card Component

```tsx
'use client'

import { useState } from 'react'

interface PricingPlan {
  name: string
  price: number
  planType: 'basic' | 'pro' | 'enterprise'
  features: string[]
}

export function PricingCard({ plan }: { plan: PricingPlan }) {
  const [loading, setLoading] = useState(false)

  const handleSubscribe = async () => {
    setLoading(true)
    // Implementation from above example
  }

  return (
    <div className="border rounded-lg p-6 shadow-lg">
      <h3 className="text-2xl font-bold">{plan.name}</h3>
      <p className="text-4xl font-bold mt-4">
        ${plan.price}
        <span className="text-lg font-normal text-gray-600">/month</span>
      </p>
      
      <ul className="mt-6 space-y-3">
        {plan.features.map((feature, i) => (
          <li key={i} className="flex items-center">
            <svg className="h-5 w-5 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
            {feature}
          </li>
        ))}
      </ul>
      
      <button
        onClick={handleSubscribe}
        disabled={loading}
        className="w-full mt-8 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
      >
        {loading ? 'Processing...' : 'Subscribe Now'}
      </button>
    </div>
  )
}
```

## 🔒 Security Best Practices

- ✅ Always verify webhook signatures
- ✅ Use server-side API routes for Stripe operations
- ✅ Never expose secret keys to the client
- ✅ Validate amounts and currency on the server
- ✅ Handle idempotency for webhook events
- ✅ Log all payment events for debugging

## 🐛 Troubleshooting

### Webhook not receiving events

1. Use Stripe CLI for local testing:
   ```bash
   stripe listen --forward-to localhost:3000/api/webhooks/stripe
   ```

2. Check webhook logs in Stripe Dashboard

3. Verify webhook secret matches

### Payment not updating database

1. Check webhook event is being received
2. Verify Supabase connection
3. Check logs for database errors

### Test Mode vs Live Mode

Make sure you're using the correct API keys:
- Test keys start with `sk_test_` and `pk_test_`
- Live keys start with `sk_live_` and `pk_live_`

## 📚 Additional Resources

- [Stripe Documentation](https://stripe.com/docs)
- [Stripe Checkout](https://stripe.com/docs/payments/checkout)
- [Stripe Webhooks](https://stripe.com/docs/webhooks)
- [Stripe Testing](https://stripe.com/docs/testing)

## 💡 Testing Cards

Use these test cards in development:

| Card Number | Description |
|------------|-------------|
| 4242 4242 4242 4242 | Success |
| 4000 0000 0000 0002 | Card declined |
| 4000 0000 0000 9995 | Insufficient funds |
