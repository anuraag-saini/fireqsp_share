// app/page.tsx
import Link from 'next/link'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { FeatureCard } from '@/components/features/FeatureCard'

export default function HomePage() {
  const features = [
    {
      icon: '🔐',
      title: 'Secure Authentication',
      description: 'Enterprise-grade auth with Clerk. Sign up with email, Google, or GitHub.',
    },
    {
      icon: '💳',
      title: 'Payment Processing',
      description: 'Seamless subscriptions with Stripe. Multiple plans and secure checkout.',
    },
    {
      icon: '🗄️',
      title: 'Cloud Database',
      description: 'Scalable PostgreSQL with Supabase. Real-time updates and file storage.',
    },
    {
      icon: '⚡',
      title: 'Lightning Fast',
      description: 'Built on Next.js 15. Server components and optimized performance.',
    },
    {
      icon: '🎨',
      title: 'Beautiful UI',
      description: 'Modern design with responsive layouts. Clean and accessible.',
    },
    {
      icon: '🚀',
      title: 'Production Ready',
      description: 'TypeScript, error handling, and security best practices included.',
    },
  ]

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      {/* Hero Section */}
      <section className="gradient-hero text-white">
        <div className="container-custom section">
          <div className="max-w-4xl mx-auto text-center animate-fade-in">
            <h1 className="text-5xl font-bold mb-6">
              Build Your SaaS
              <br />
              <span style={{ color: '#BFDBFE' }}>In Minutes</span>
            </h1>
            <p className="text-xl mb-8" style={{ color: '#DBEAFE' }}>
              Complete authentication, payments, and database setup. 
              Start building your product, not infrastructure.
            </p>
            <div className="flex flex-col md:flex-row gap-4 justify-center">
              <Link 
                href="/sign-up" 
                className="btn-primary"
                style={{
                  backgroundColor: 'white',
                  color: '#3B82F6',
                  padding: '1rem 2rem',
                  fontSize: '1.125rem'
                }}
              >
                Get Started Free
              </Link>
              <Link 
                href="/pricing" 
                style={{
                  padding: '1rem 2rem',
                  border: '2px solid white',
                  color: 'white',
                  borderRadius: '0.5rem',
                  fontWeight: 'bold',
                  fontSize: '1.125rem',
                  transition: 'all 0.2s',
                  display: 'inline-block'
                }}
              >
                View Pricing
              </Link>
            </div>
            
            {/* Social Proof */}
            <div className="mt-8 flex flex-wrap items-center justify-center gap-6 text-sm" style={{ color: '#BFDBFE' }}>
              <div className="flex items-center gap-2">
                <span className="text-2xl">✨</span>
                <span>No credit card required</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-2xl">⚡</span>
                <span>5-minute setup</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-2xl">🔒</span>
                <span>Enterprise security</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="section bg-white">
        <div className="container-custom">
          <div className="text-center mb-8">
            <h2 className="text-4xl font-bold mb-4">Everything You Need</h2>
            <p className="text-xl text-gray-600">
              Production-ready modules for modern SaaS applications
            </p>
          </div>
          
          <div className="feature-grid">
            {features.map((feature, index) => (
              <FeatureCard key={index} {...feature} />
            ))}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="section bg-gray-50">
        <div className="container-custom">
          <div className="stats-grid">
            <div className="animate-fade-in">
              <div className="text-5xl font-bold mb-2" style={{ color: '#3B82F6' }}>15min</div>
              <div className="text-gray-600">Setup Time</div>
            </div>
            <div className="animate-fade-in">
              <div className="text-5xl font-bold mb-2" style={{ color: '#3B82F6' }}>3</div>
              <div className="text-gray-600">Core Modules</div>
            </div>
            <div className="animate-fade-in">
              <div className="text-5xl font-bold mb-2" style={{ color: '#3B82F6' }}>100%</div>
              <div className="text-gray-600">TypeScript</div>
            </div>
            <div className="animate-fade-in">
              <div className="text-5xl font-bold mb-2" style={{ color: '#3B82F6' }}>$0</div>
              <div className="text-gray-600">To Start</div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="section bg-white">
        <div className="container-custom">
          <div className="text-center mb-8">
            <h2 className="text-4xl font-bold mb-4">How It Works</h2>
            <p className="text-xl text-gray-600">
              Get up and running in three simple steps
            </p>
          </div>
          
          <div className="how-it-works-grid">
            <div className="text-center">
              <div className="mb-4 mx-auto" style={{
                width: '4rem',
                height: '4rem',
                backgroundColor: '#DBEAFE',
                borderRadius: '9999px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 1.5rem'
              }}>
                <span className="text-3xl">1️⃣</span>
              </div>
              <h3 className="text-2xl font-bold mb-4">Sign Up</h3>
              <p className="text-gray-600">
                Create your account in seconds with email or social login
              </p>
            </div>
            
            <div className="text-center">
              <div className="mb-4" style={{
                width: '4rem',
                height: '4rem',
                backgroundColor: '#DBEAFE',
                borderRadius: '9999px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 1.5rem'
              }}>
                <span className="text-3xl">2️⃣</span>
              </div>
              <h3 className="text-2xl font-bold mb-4">Choose Plan</h3>
              <p className="text-gray-600">
                Select a plan that fits your needs. Start free, upgrade anytime
              </p>
            </div>
            
            <div className="text-center">
              <div className="mb-4" style={{
                width: '4rem',
                height: '4rem',
                backgroundColor: '#DBEAFE',
                borderRadius: '9999px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 1.5rem'
              }}>
                <span className="text-3xl">3️⃣</span>
              </div>
              <h3 className="text-2xl font-bold mb-4">Start Building</h3>
              <p className="text-gray-600">
                Access your dashboard and start using all features immediately
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="section gradient-primary text-white">
        <div className="container-custom text-center">
          <h2 className="text-4xl font-bold mb-6">
            Ready to Get Started?
          </h2>
          <p className="text-xl mb-8" style={{ color: '#DBEAFE' }}>
            Join thousands of developers building amazing SaaS products
          </p>
          <Link 
            href="/sign-up"
            style={{
              display: 'inline-block',
              padding: '1rem 2.5rem',
              backgroundColor: 'white',
              color: '#3B82F6',
              borderRadius: '0.5rem',
              fontWeight: 'bold',
              fontSize: '1.125rem',
              transition: 'all 0.2s'
            }}
          >
            Start Free Trial
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  )
}
