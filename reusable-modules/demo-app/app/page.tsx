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
      description: 'Modern design with Tailwind CSS. Responsive and accessible.',
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
        <div className="container-custom py-32">
          <div className="max-w-4xl mx-auto text-center animate-fade-in">
            <h1 className="text-5xl md:text-7xl font-bold mb-6">
              Build Your SaaS
              <br />
              <span className="text-blue-200">In Minutes</span>
            </h1>
            <p className="text-xl md:text-2xl mb-10 text-blue-100">
              Complete authentication, payments, and database setup. 
              Start building your product, not infrastructure.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link 
                href="/sign-up" 
                className="px-8 py-4 bg-white text-blue-600 rounded-lg font-bold text-lg hover:bg-blue-50 transition-colors duration-200"
              >
                Get Started Free
              </Link>
              <Link 
                href="/pricing" 
                className="px-8 py-4 bg-transparent border-2 border-white text-white rounded-lg font-bold text-lg hover:bg-white hover:text-blue-600 transition-colors duration-200"
              >
                View Pricing
              </Link>
            </div>
            
            {/* Social Proof */}
            <div className="mt-12 flex items-center justify-center gap-8 text-sm text-blue-200">
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
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">Everything You Need</h2>
            <p className="text-xl text-gray-600">
              Production-ready modules for modern SaaS applications
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <FeatureCard key={index} {...feature} />
            ))}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="section bg-gray-50">
        <div className="container-custom">
          <div className="grid md:grid-cols-4 gap-8 text-center">
            <div className="animate-fade-in">
              <div className="text-5xl font-bold text-blue-600 mb-2">15min</div>
              <div className="text-gray-600">Setup Time</div>
            </div>
            <div className="animate-fade-in" style={{ animationDelay: '0.1s' }}>
              <div className="text-5xl font-bold text-blue-600 mb-2">3</div>
              <div className="text-gray-600">Core Modules</div>
            </div>
            <div className="animate-fade-in" style={{ animationDelay: '0.2s' }}>
              <div className="text-5xl font-bold text-blue-600 mb-2">100%</div>
              <div className="text-gray-600">TypeScript</div>
            </div>
            <div className="animate-fade-in" style={{ animationDelay: '0.3s' }}>
              <div className="text-5xl font-bold text-blue-600 mb-2">$0</div>
              <div className="text-gray-600">To Start</div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="section bg-white">
        <div className="container-custom">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">How It Works</h2>
            <p className="text-xl text-gray-600">
              Get up and running in three simple steps
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-12">
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="text-3xl">1️⃣</span>
              </div>
              <h3 className="text-2xl font-bold mb-4">Sign Up</h3>
              <p className="text-gray-600">
                Create your account in seconds with email or social login
              </p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="text-3xl">2️⃣</span>
              </div>
              <h3 className="text-2xl font-bold mb-4">Choose Plan</h3>
              <p className="text-gray-600">
                Select a plan that fits your needs. Start free, upgrade anytime
              </p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
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
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            Ready to Get Started?
          </h2>
          <p className="text-xl mb-10 text-blue-100">
            Join thousands of developers building amazing SaaS products
          </p>
          <Link 
            href="/sign-up"
            className="inline-block px-10 py-4 bg-white text-blue-600 rounded-lg font-bold text-lg hover:bg-blue-50 transition-colors duration-200"
          >
            Start Free Trial
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  )
}
