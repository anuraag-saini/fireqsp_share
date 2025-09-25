// lib/stripe-client.ts
'use client'

import { loadStripe, Stripe } from '@stripe/stripe-js'

/**
 * Client-side Stripe instance
 * Only loads once and reuses the same instance
 */
let stripePromise: Promise<Stripe | null>

export const getStripe = () => {
  if (!stripePromise) {
    stripePromise = loadStripe(
      process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!
    )
  }
  return stripePromise
}

/**
 * Redirect to Stripe Checkout
 */
export async function redirectToCheckout(sessionId: string) {
  const stripe = await getStripe()
  
  if (!stripe) {
    throw new Error('Stripe failed to load')
  }

  const { error } = await stripe.redirectToCheckout({ sessionId })

  if (error) {
    console.error('Stripe redirect error:', error)
    throw error
  }
}
