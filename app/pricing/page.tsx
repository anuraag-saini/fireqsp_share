'use client'

import { useUser } from '@clerk/nextjs'
import { Check } from 'lucide-react'

const plans = [
  {
    title: 'Basic',
    price: '$19',
    description: 'Perfect for getting started with QSP modeling',
    features: [
      'Up to 5 extractions per month',
      'Maximum 5 PDFs upload per extractions',
      'Fixed 50 intertractions for diagram',
      'Full table export',
      'Email support'
    ],
    priceId: 'basic', // We'll pass this to the API
    popular: false
  },
  {
    title: 'Pro',
    price: '$99',
    description: 'Advanced features for professional researchers',
    features: [
      'Everything in Basic',
      'Unlimited PDF uploads and extractions',
      'Custom selections for interactions with export',
      'Unlimited diagrams',
      // 'ODE generation and simulation',
      'Priority support',
      'API access'
    ],
    priceId: 'pro',
    popular: true
  },
  {
    title: 'Enterprise',
    price: '$299',
    description: 'Full-featured platform for teams',
    features: [
      'Everything in Pro',
      'Team collaboration',
      'Custom integrations',
      'Dedicated support',
      'SLA guarantee',
      'Custom training'
    ],
    priceId: 'enterprise',
    popular: false
  }
]

function PricingCard({ plan }: { plan: typeof plans[0] }) {
  const { user } = useUser()

  const handleSubscribe = async () => {
    if (!user) {
      window.location.href = '/sign-in'
      return
    }

    try {
      const response = await fetch('/api/stripe/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planType: plan.priceId, // Send plan type instead of price ID
          userEmail: user.emailAddresses[0]?.emailAddress,
          successUrl: `${window.location.origin}/dashboard?success=true&plan=${plan.title.toLowerCase()}`,
          cancelUrl: `${window.location.origin}/pricing?canceled=true`,
        }),
      })
      
      const data = await response.json()
      
      if (data.error) {
        alert('Payment setup failed: ' + data.error)
        return
      }
      
      if (data.url) {
        window.location.href = data.url
      }
    } catch (error) {
      console.error('Subscription error:', error)
      alert('Something went wrong. Please try again.')
    }
  }
  
  return (
    <div className={`relative bg-white rounded-lg border ${plan.popular ? 'border-blue-500 shadow-lg' : 'border-gray-200'} p-6`}>
      {plan.popular && (
        <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
          <span className="bg-blue-500 text-white px-3 py-1 rounded-full text-sm font-medium">
            Most Popular
          </span>
        </div>
      )}
      
      <div className="mb-6">
        <h3 className="text-xl font-semibold mb-2">{plan.title}</h3>
        <p className="text-gray-600 mb-4">{plan.description}</p>
        <div className="mb-4">
          <span className="text-3xl font-bold">{plan.price}</span>
          <span className="text-gray-500 ml-1">/month</span>
        </div>
      </div>
      
      <ul className="space-y-3 mb-6">
        {plan.features.map((feature, index) => (
          <li key={index} className="flex items-center">
            <Check className="h-4 w-4 text-green-500 mr-2 flex-shrink-0" />
            <span className="text-sm">{feature}</span>
          </li>
        ))}
      </ul>
      
      <button 
        onClick={handleSubscribe}
        className={`w-full py-2 px-4 rounded font-medium transition-colors ${
          plan.popular 
            ? 'bg-blue-600 text-white hover:bg-blue-700' 
            : 'border border-blue-600 text-blue-600 hover:bg-blue-50'
        }`}
      >
        Subscribe to {plan.title}
      </button>
    </div>
  )
}

export default function PricingPage() {
  return (
    <div className="container mx-auto py-16 px-4">
      <div className="text-center mb-16">
        <h1 className="text-4xl font-bold mb-4">Choose Your Plan</h1>
        <p className="text-xl text-gray-600 max-w-2xl mx-auto">
          Select the perfect plan for your QSP modeling needs. Upgrade or downgrade at any time.
        </p>
      </div>
      
      <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
        {plans.map((plan, index) => (
          <PricingCard key={index} plan={plan} />
        ))}
      </div>
      
      <div className="text-center mt-12">
        <p className="text-gray-600">
          All plans include a 14-day free trial. No credit card required to start.
        </p>
      </div>
    </div>
  )
}