// lib/stripe-config.ts

/**
 * Client-safe Stripe configuration
 * No sensitive keys here - only price IDs and public config
 */

export const STRIPE_PLANS = {
  BASIC: {
    name: 'Basic',
    price: 9.99,
    priceId: 'price_basic', // This should match your Stripe price ID
    features: [
      '10 extractions per month',
      'Basic support',
      'Email notifications',
    ],
  },
  PRO: {
    name: 'Pro',
    price: 29.99,
    priceId: 'price_pro',
    features: [
      '100 extractions per month',
      'Priority support',
      'Advanced features',
      'API access',
    ],
  },
  ENTERPRISE: {
    name: 'Enterprise',
    price: 99.99,
    priceId: 'price_enterprise',
    features: [
      'Unlimited extractions',
      '24/7 dedicated support',
      'Custom integrations',
      'SLA guarantee',
      'Dedicated account manager',
    ],
  },
} as const

export type PlanType = keyof typeof STRIPE_PLANS

/**
 * Get plan details by type
 */
export function getPlanDetails(planType: PlanType) {
  return STRIPE_PLANS[planType]
}

/**
 * Check if plan type is valid
 */
export function isValidPlan(planType: string): planType is PlanType {
  return planType.toUpperCase() in STRIPE_PLANS
}
