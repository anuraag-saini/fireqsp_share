 
// Client-safe configuration - no server keys
export const STRIPE_CONFIG = {
  BASIC_PRICE: 'price_basic_monthly',    // We'll replace these with real IDs
  PRO_PRICE: 'price_pro_monthly',
  ENTERPRISE_PRICE: 'price_enterprise_monthly'
} as const