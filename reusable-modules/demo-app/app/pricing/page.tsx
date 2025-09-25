// app/pricing/page.tsx
'use client'

import { useState } from 'react'
import { useUser } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'

export default function PricingPage() {
  const { isSignedIn } = useUser()
  const router = useRouter()
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

  const handleSubscribe = async (planType: string) => {
    if (!isSignedIn) {
      router.push('/sign-up')
      return
    }

    if (planType === 'free') {
      router.push('/dashboard')
      return
    }

    if (planType === 'enterprise') {
      window.location.href = 'mailto:sales@example.com'
      return
    }

    setLoading(planType)
    
    try {
      const response = await fetch('/api/stripe/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planType,
          successUrl: `${window.location.origin}/dashboard?success=true`,
          cancelUrl: `${window.location.origin}/pricing?canceled=true`,
        }),
      })

      const data = await response.json()

      if (data.url) {
        window.location.href = data.url
      }
    } catch (error) {
      console.error('Error:', error)
      alert('Something went wrong. Please try again.')
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-1">
        {/* Header Section */}
        <section className="section bg-gradient-primary text-white">
          <div className="container-custom text-center">
            <h1 className="text-5xl font-bold mb-6">
              Simple, Transparent Pricing
            </h1>
            <p className="text-xl text-blue-100 max-w-2xl mx-auto">
              Choose the perfect plan for your needs. Always know what you'll pay.
            </p>
          </div>
        </section>

        {/* Pricing Cards */}
        <section className="section bg-white">
          <div className="container-custom">
            <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
              {plans.map((plan) => (
                <div
                  key={plan.planType}
                  className={`card relative ${
                    plan.highlighted
                      ? 'ring-2 ring-blue-500 shadow-2xl scale-105'
                      : ''
                  }`}
                >
                  {plan.highlighted && (
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                      <span className="badge-primary px-4 py-1">Most Popular</span>
                    </div>
                  )}
                  
                  <div className="text-center mb-6">
                    <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
                    <p className="text-gray-600 mb-4">{plan.description}</p>
                    <div className="flex items-baseline justify-center gap-2">
                      <span className="text-5xl font-bold">${plan.price}</span>
                      <span className="text-gray-500">/month</span>
                    </div>
                  </div>

                  <ul className="space-y-3 mb-8">
                    {plan.features.map((feature, index) => (
                      <li key={index} className="flex items-center gap-3">
                        <svg
                          className="w-5 h-5 text-green-500 flex-shrink-0"
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
                        <span className="text-gray-600">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <button
                    onClick={() => handleSubscribe(plan.planType)}
                    disabled={loading === plan.planType}
                    className={`w-full py-3 rounded-lg font-semibold transition-colors ${
                      plan.highlighted
                        ? 'bg-blue-600 text-white hover:bg-blue-700'
                        : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    {loading === plan.planType ? 'Processing...' : plan.cta}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="section bg-gray-50">
          <div className="container-custom max-w-4xl">
            <h2 className="text-3xl font-bold text-center mb-12">
              Frequently Asked Questions
            </h2>
            
            <div className="space-y-6">
              <div className="card">
                <h3 className="text-xl font-bold mb-2">Can I change plans later?</h3>
                <p className="text-gray-600">
                  Yes! You can upgrade or downgrade your plan at any time. Changes take effect immediately.
                </p>
              </div>
              
              <div className="card">
                <h3 className="text-xl font-bold mb-2">Is there a free trial?</h3>
                <p className="text-gray-600">
                  The Free plan is available forever. Pro and Enterprise plans come with a 14-day money-back guarantee.
                </p>
              </div>
              
              <div className="card">
                <h3 className="text-xl font-bold mb-2">What payment methods do you accept?</h3>
                <p className="text-gray-600">
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
