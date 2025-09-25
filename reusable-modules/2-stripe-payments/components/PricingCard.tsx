// components/PricingCard.tsx
'use client'

import { useState } from 'react'

interface PricingPlan {
  name: string
  price: number
  planType: 'basic' | 'pro' | 'enterprise'
  features: string[]
  popular?: boolean
}

export function PricingCard({ plan }: { plan: PricingPlan }) {
  const [loading, setLoading] = useState(false)

  const handleSubscribe = async () => {
    setLoading(true)
    
    try {
      const response = await fetch('/api/stripe/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planType: plan.planType,
          successUrl: `${window.location.origin}/dashboard?success=true`,
          cancelUrl: `${window.location.origin}/pricing?canceled=true`,
        }),
      })

      const data = await response.json()

      if (data.url) {
        window.location.href = data.url
      } else {
        throw new Error('No checkout URL returned')
      }
    } catch (error) {
      console.error('Subscription error:', error)
      alert('Failed to start checkout. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={`relative border rounded-2xl p-8 shadow-lg ${
      plan.popular ? 'border-blue-500 ring-2 ring-blue-500' : 'border-gray-200'
    }`}>
      {plan.popular && (
        <div className="absolute -top-4 left-1/2 -translate-x-1/2">
          <span className="bg-blue-500 text-white px-4 py-1 rounded-full text-sm font-semibold">
            Most Popular
          </span>
        </div>
      )}
      
      <div className="text-center">
        <h3 className="text-2xl font-bold text-gray-900">{plan.name}</h3>
        <div className="mt-4 flex items-baseline justify-center">
          <span className="text-5xl font-extrabold text-gray-900">
            ${plan.price}
          </span>
          <span className="ml-2 text-xl text-gray-500">/month</span>
        </div>
      </div>

      <ul className="mt-8 space-y-4">
        {plan.features.map((feature, index) => (
          <li key={index} className="flex items-start">
            <svg
              className="h-6 w-6 text-green-500 flex-shrink-0"
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
            <span className="ml-3 text-gray-700">{feature}</span>
          </li>
        ))}
      </ul>

      <button
        onClick={handleSubscribe}
        disabled={loading}
        className={`mt-8 w-full py-3 px-6 rounded-lg font-semibold transition-colors ${
          plan.popular
            ? 'bg-blue-600 text-white hover:bg-blue-700'
            : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
        } disabled:opacity-50 disabled:cursor-not-allowed`}
      >
        {loading ? 'Processing...' : 'Subscribe Now'}
      </button>
    </div>
  )
}

// Example usage component
export function PricingSection() {
  const plans: PricingPlan[] = [
    {
      name: 'Basic',
      price: 9.99,
      planType: 'basic',
      features: [
        '10 extractions per month',
        'Basic support',
        'Email notifications',
        'Standard processing speed',
      ],
    },
    {
      name: 'Pro',
      price: 29.99,
      planType: 'pro',
      popular: true,
      features: [
        '100 extractions per month',
        'Priority support',
        'Advanced features',
        'API access',
        'Faster processing',
      ],
    },
    {
      name: 'Enterprise',
      price: 99.99,
      planType: 'enterprise',
      features: [
        'Unlimited extractions',
        '24/7 dedicated support',
        'Custom integrations',
        'SLA guarantee',
        'Dedicated account manager',
      ],
    },
  ]

  return (
    <div className="py-12">
      <div className="text-center mb-12">
        <h2 className="text-4xl font-bold text-gray-900">
          Choose Your Plan
        </h2>
        <p className="mt-4 text-xl text-gray-600">
          Select the perfect plan for your needs
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-8 max-w-7xl mx-auto px-4">
        {plans.map((plan) => (
          <PricingCard key={plan.planType} plan={plan} />
        ))}
      </div>
    </div>
  )
}
