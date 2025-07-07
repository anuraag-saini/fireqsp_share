import Stripe from 'stripe'

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-06-30.basil',
})

export const PRICE_IDS = {
  BASIC: process.env.STRIPE_BASIC_PRICE_ID!,
  PRO: process.env.STRIPE_PRO_PRICE_ID!,
  ENTERPRISE: process.env.STRIPE_ENTERPRISE_PRICE_ID!
} as const

export type PriceId = typeof PRICE_IDS[keyof typeof PRICE_IDS]