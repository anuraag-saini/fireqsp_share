// lib/stripe.ts
import Stripe from 'stripe'

/**
 * Server-side Stripe client
 * Uses secret key - NEVER expose this to the client
 */
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-11-20.acacia', // Use latest API version
  typescript: true,
})

/**
 * Stripe Price IDs from environment variables
 * These are your product price IDs from Stripe Dashboard
 */
export const PRICE_IDS = {
  BASIC: process.env.STRIPE_BASIC_PRICE_ID!,
  PRO: process.env.STRIPE_PRO_PRICE_ID!,
  ENTERPRISE: process.env.STRIPE_ENTERPRISE_PRICE_ID!,
} as const

export type PriceId = typeof PRICE_IDS[keyof typeof PRICE_IDS]

/**
 * Get price ID by plan type
 */
export function getPriceId(planType: string): string | null {
  switch (planType.toLowerCase()) {
    case 'basic':
      return PRICE_IDS.BASIC
    case 'pro':
      return PRICE_IDS.PRO
    case 'enterprise':
      return PRICE_IDS.ENTERPRISE
    default:
      return null
  }
}

/**
 * Create a Stripe checkout session
 */
export async function createCheckoutSession({
  priceId,
  userId,
  userEmail,
  successUrl,
  cancelUrl,
  metadata = {},
}: {
  priceId: string
  userId: string
  userEmail: string
  successUrl: string
  cancelUrl: string
  metadata?: Record<string, string>
}) {
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    mode: 'subscription',
    success_url: successUrl,
    cancel_url: cancelUrl,
    customer_email: userEmail,
    client_reference_id: userId,
    metadata: {
      userId,
      userEmail,
      ...metadata,
    },
  })

  return session
}

/**
 * Create a customer portal session for subscription management
 */
export async function createPortalSession(
  customerId: string,
  returnUrl: string
) {
  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl,
  })

  return session
}

/**
 * Cancel a subscription
 */
export async function cancelSubscription(subscriptionId: string) {
  const subscription = await stripe.subscriptions.cancel(subscriptionId)
  return subscription
}

/**
 * Get subscription details
 */
export async function getSubscription(subscriptionId: string) {
  const subscription = await stripe.subscriptions.retrieve(subscriptionId)
  return subscription
}
