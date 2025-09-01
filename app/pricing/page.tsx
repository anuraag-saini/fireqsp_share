'use client'

import { useState } from 'react'
import { useUser } from '@clerk/nextjs'
import { Check, Zap } from 'lucide-react'

const plans = [
  {
    title: 'Basic',
    monthlyPrice: 19,
    description: 'Perfect for getting started with QSP modeling',
    features: [
      'Up to 5 extractions per month',
      'Maximum 5 PDFs upload per extractions',
      'Fixed 50 interactions for diagram',
      'Full table export',
      'Email support'
    ],
    priceId: 'basic',
    popular: false
  },
  {
    title: 'Pro',
    monthlyPrice: 99,
    description: 'Advanced features for professional researchers',
    features: [
      'Everything in Basic',
      'Unlimited PDF uploads and extractions',
      'Custom selections for interactions with export',
      'Unlimited diagrams',
      'Priority support',
      'API access'
    ],
    priceId: 'pro',
    popular: true
  },
  // {
  //   title: 'Enterprise',
  //   monthlyPrice: 299,
  //   description: 'Full-featured platform for teams',
  //   features: [
  //     'Everything in Pro',
  //     'Team collaboration',
  //     'Custom integrations',
  //     'Dedicated support',
  //     'SLA guarantee',
  //     'Custom training'
  //   ],
  //   priceId: 'enterprise',
  //   popular: false
  // }
]

function PricingCard({ plan, isYearly, index }: { 
  plan: typeof plans[0], 
  isYearly: boolean, 
  index: number 
}) {
  const { user } = useUser()
  
  const monthlyPrice = plan.monthlyPrice
  const yearlyMonthlyPrice = Math.round(monthlyPrice * 0.8) // 20% discount
  const displayPrice = isYearly ? yearlyMonthlyPrice : monthlyPrice
  const yearlyTotal = yearlyMonthlyPrice * 12
  const monthlySavings = monthlyPrice - yearlyMonthlyPrice

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
          planType: plan.priceId,
          isYearly: isYearly,
          userEmail: user.emailAddresses[0]?.emailAddress,
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
    <div 
      className={`relative bg-white rounded-xl border transition-all duration-500 hover:scale-105 hover:shadow-xl hover:border-blue-500 ${
        plan.popular 
          ? 'border-blue-500 shadow-lg scale-105' 
          : 'border-gray-200'
      } p-6 group`}
      style={{
        animationDelay: `${index * 150}ms`,
        animation: 'slideInUp 0.6s ease-out forwards'
      }}
    >
      {plan.popular && (
        <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
          <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-4 py-2 rounded-full text-sm font-medium flex items-center">
            <Zap className="h-4 w-4 mr-1" />
            Most Popular
          </div>
        </div>
      )}
      
      <div className="mb-6">
        <h3 className="text-2xl font-bold mb-2 group-hover:text-blue-600 transition-colors">
          {plan.title}
        </h3>
        <p className="text-gray-600 mb-4">{plan.description}</p>
        
        <div className="mb-4">
          <div className="flex items-baseline">
            <span className="text-4xl font-bold text-gray-900">
              ${displayPrice}
            </span>
            <span className="text-gray-500 ml-2">/month</span>
          </div>
          
          {isYearly && (
            <div className="mt-2 space-y-1">
              <div className="text-sm text-green-600 font-medium">
                💰 Save ${monthlySavings}/month (${monthlySavings * 12}/year)
              </div>
              <div className="text-xs text-gray-500">
                Billed annually 
                {/* at ${yearlyTotal} */}
              </div>
            </div>
          )}
          
          {!isYearly && (
            <div className="text-xs text-gray-500 mt-1">
              Billed monthly
            </div>
          )}
        </div>
      </div>
      
      <ul className="space-y-3 mb-6">
        {plan.features.map((feature, featureIndex) => (
          <li 
            key={featureIndex} 
            className="flex items-start"
          >
            <Check className="h-4 w-4 text-green-500 mr-3 flex-shrink-0 mt-0.5" />
            <span className="text-sm text-gray-700">{feature}</span>
          </li>
        ))}
      </ul>
      
      <button 
        onClick={handleSubscribe}
        className={`w-full py-3 px-6 rounded-lg font-semibold transition-all duration-300 transform hover:scale-105 ${
          plan.popular 
            ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700 shadow-lg' 
            : 'border-2 border-blue-600 text-blue-600 hover:bg-blue-600 hover:text-white'
        }`}
      >
        Get Started with {plan.title}
      </button>
    </div>
  )
}

export default function PricingPage() {
  const [isYearly, setIsYearly] = useState(false)

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="container mx-auto py-20 px-4">
        {/* Header */}
        <div className="text-center mb-16 opacity-0 animate-fadeInDown">
          <h1 className="text-5xl font-bold mb-6 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Choose Your Plan
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
            Select the perfect plan for your QSP modeling needs. Start with a free trial and upgrade anytime.
          </p>
        </div>
        
        {/* Billing Toggle */}
        <div className="flex justify-center mb-12 opacity-0 animate-fadeIn" style={{ animationDelay: '200ms', animationFillMode: 'forwards' }}>
          <div className="bg-white p-1 rounded-xl shadow-lg border border-gray-200">
            <div className="flex items-center">
              <button
                onClick={() => setIsYearly(false)}
                className={`px-6 py-3 rounded-lg font-medium transition-all duration-300 ${
                  !isYearly 
                    ? 'bg-blue-600 text-white shadow-md' 
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Monthly
              </button>
              <button
                onClick={() => setIsYearly(true)}
                className={`px-6 py-3 rounded-lg font-medium transition-all duration-300 relative ${
                  isYearly 
                    ? 'bg-blue-600 text-white shadow-md' 
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Yearly
                <span className="absolute -top-2 -right-2 bg-green-500 text-white text-xs px-2 py-1 rounded-full">
                  20% OFF
                </span>
              </button>
            </div>
          </div>
        </div>
        
        {/* Pricing Cards */}
        <div className="grid md:grid-cols-2 gap-8 max-w-7xl mx-auto">
          {plans.map((plan, index) => (
            <PricingCard 
              key={`${plan.title}-${isYearly}`} 
              plan={plan} 
              isYearly={isYearly}
              index={index}
            />
          ))}
        </div>
        
        {/* Footer */}
        <div className="text-center mt-16 opacity-0 animate-fadeInUp" style={{ animationDelay: '800ms', animationFillMode: 'forwards' }}>
          <div className="bg-white rounded-xl p-8 shadow-lg max-w-2xl mx-auto">
            <h3 className="text-xl font-semibold mb-4">🎯 Risk-Free Trial</h3>
            <p className="text-gray-600 mb-4">
              All plans include a <strong>14-day free trial</strong>. No credit card required to start.
            </p>
            <div className="flex justify-center space-x-8 text-sm text-gray-500">
              <span>✅ Cancel anytime</span>
              <span>✅ No setup fees</span>
              <span>✅ Instant access</span>
            </div>
          </div>
        </div>
      </div>
      
      <style jsx>{`
        @keyframes slideInUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes fadeInDown {
          from {
            opacity: 0;
            transform: translateY(-20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        
        .animate-slideInUp {
          animation: slideInUp 0.6s ease-out forwards;
        }
        
        .animate-fadeInDown {
          animation: fadeInDown 0.6s ease-out forwards;
        }
        
        .animate-fadeInUp {
          animation: fadeInUp 0.6s ease-out forwards;
        }
        
        .animate-fadeIn {
          animation: fadeIn 0.6s ease-out forwards;
        }
      `}</style>
    </div>
  )
}