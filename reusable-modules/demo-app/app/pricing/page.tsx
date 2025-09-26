// app/pricing/page.tsx - No Auth Version
'use client'

import { useState } from 'react'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'

export default function PricingPage() {
  const [loading, setLoading] = useState<string | null>(null)

  const plans = [
    {
      name: 'Free',
      price: 0,
      planType: 'free',
      description: 'Perfect for trying out',
      features: [
        '5 projects',
        '100 MB storage',
        'Basic support',
        'Community access',
      ],
      cta: 'Current Plan',
      highlighted: false,
    },
    {
      name: 'Pro',
      price: 29,
      planType: 'pro',
      description: 'For serious creators',
      features: [
        'Unlimited projects',
        '10 GB storage',
        'Priority support',
        'Advanced features',
        'API access',
        'Custom domain',
      ],
      cta: 'Upgrade to Pro',
      highlighted: true,
    },
    {
      name: 'Enterprise',
      price: 99,
      planType: 'enterprise',
      description: 'For large teams',
      features: [
        'Everything in Pro',
        '100 GB storage',
        '24/7 dedicated support',
        'Custom integrations',
        'SLA guarantee',
        'Team management',
        'Advanced security',
      ],
      cta: 'Contact Sales',
      highlighted: false,
    },
  ]

  const handleSubscribe = (planType: string) => {
    alert(`Demo Mode: In production, this would redirect to Stripe checkout for the ${planType} plan. Add real Stripe keys to enable payments.`)
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Header />
      
      <main style={{ flex: 1 }}>
        {/* Header Section */}
        <section className="section gradient-primary" style={{ color: 'white' }}>
          <div className="container-custom" style={{ textAlign: 'center' }}>
            <h1 style={{ fontSize: '3rem', fontWeight: 'bold', marginBottom: '1.5rem' }}>
              Simple, Transparent Pricing
            </h1>
            <p style={{ fontSize: '1.25rem', maxWidth: '42rem', margin: '0 auto', opacity: 0.9 }}>
              Choose the perfect plan for your needs. Always know what you'll pay.
            </p>
          </div>
        </section>

        {/* Pricing Cards */}
        <section className="section" style={{ backgroundColor: 'white' }}>
          <div className="container-custom">
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
              gap: '2rem',
              maxWidth: '75rem',
              margin: '0 auto'
            }}>
              {plans.map((plan) => (
                <div
                  key={plan.planType}
                  className={plan.highlighted ? 'card' : 'card'}
                  style={{
                    position: 'relative',
                    ...(plan.highlighted ? {
                      boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
                      transform: 'scale(1.05)',
                      border: '2px solid #3B82F6'
                    } : {})
                  }}
                >
                  {plan.highlighted && (
                    <div style={{
                      position: 'absolute',
                      top: '-1rem',
                      left: '50%',
                      transform: 'translateX(-50%)'
                    }}>
                      <span className="badge-primary" style={{ padding: '0.25rem 1rem' }}>Most Popular</span>
                    </div>
                  )}
                  
                  <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                    <h3 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>{plan.name}</h3>
                    <p style={{ color: '#4B5563', marginBottom: '1rem' }}>{plan.description}</p>
                    <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: '0.5rem' }}>
                      <span style={{ fontSize: '3rem', fontWeight: 'bold' }}>${plan.price}</span>
                      <span style={{ color: '#6B7280' }}>/month</span>
                    </div>
                  </div>

                  <ul style={{ marginBottom: '2rem' }}>
                    {plan.features.map((feature, index) => (
                      <li key={index} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
                        <svg
                          style={{ width: '1.25rem', height: '1.25rem', color: '#10B981', flexShrink: 0 }}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                        <span style={{ color: '#4B5563' }}>{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <button
                    onClick={() => handleSubscribe(plan.planType)}
                    disabled={loading === plan.planType}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      borderRadius: '0.5rem',
                      fontWeight: 600,
                      border: 'none',
                      cursor: 'pointer',
                      transition: 'background-color 0.2s',
                      ...(plan.highlighted ? {
                        backgroundColor: '#3B82F6',
                        color: 'white'
                      } : {
                        backgroundColor: '#F3F4F6',
                        color: '#111827'
                      })
                    }}
                    onMouseOver={(e) => {
                      e.currentTarget.style.backgroundColor = plan.highlighted ? '#2563EB' : '#E5E7EB'
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.backgroundColor = plan.highlighted ? '#3B82F6' : '#F3F4F6'
                    }}
                  >
                    {loading === plan.planType ? 'Processing...' : plan.cta}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="section" style={{ backgroundColor: '#F9FAFB' }}>
          <div className="container-custom" style={{ maxWidth: '56rem' }}>
            <h2 style={{ fontSize: '2rem', fontWeight: 'bold', textAlign: 'center', marginBottom: '3rem' }}>
              Frequently Asked Questions
            </h2>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div className="card">
                <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>Can I change plans later?</h3>
                <p style={{ color: '#4B5563' }}>
                  Yes! You can upgrade or downgrade your plan at any time. Changes take effect immediately.
                </p>
              </div>
              
              <div className="card">
                <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>Is there a free trial?</h3>
                <p style={{ color: '#4B5563' }}>
                  The Free plan is available forever. Pro and Enterprise plans come with a 14-day money-back guarantee.
                </p>
              </div>
              
              <div className="card">
                <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>What payment methods do you accept?</h3>
                <p style={{ color: '#4B5563' }}>
                  We accept all major credit cards, debit cards, and support various local payment methods through Stripe.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}
