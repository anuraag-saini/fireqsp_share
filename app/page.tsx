'use client'

import { useUser } from '@clerk/nextjs'
import Link from 'next/link'

export default function Home() {
  const { isSignedIn, user } = useUser()

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      <div className="container mx-auto px-4 py-20 text-center">
        <h1 className="text-5xl font-bold mb-6 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
          🔥 FireQSP
        </h1>
        <h2 className="text-3xl font-bold mb-6">
          AI-Powered QSP Modeling
        </h2>
        <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
          Transform scientific literature into quantitative systems pharmacology models 
          with our intelligent extraction and modeling platform.
        </p>
        
        {isSignedIn ? (
          // User is signed in
          <div className="flex justify-center gap-4">
            <Link href="/dashboard">
              <button className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-lg font-semibold">
                Go to Dashboard
              </button>
            </Link>
          </div>
        ) : (
          // User is not signed in
          <div className="flex justify-center gap-4">
            <Link href="/sign-up">
              <button className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-lg font-semibold">
                Get Started Free
              </button>
            </Link>
            <Link href="/sign-in">
              <button className="px-8 py-3 border border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 text-lg font-semibold">
                Sign In
              </button>
            </Link>
          </div>
        )}
        
        {/* Features Section */}
        <div className="mt-20 grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          <div className="text-center">
            <div className="text-3xl mb-4">📄</div>
            <h3 className="font-semibold mb-2">PDF Extraction</h3>
            <p className="text-sm text-gray-600">AI-powered extraction of biological interactions</p>
          </div>
          <div className="text-center">
            <div className="text-3xl mb-4">📊</div>
            <h3 className="font-semibold mb-2">Interactive Tables</h3>
            <p className="text-sm text-gray-600">Filter and select interactions with ease</p>
          </div>
          <div className="text-center">
            <div className="text-3xl mb-4">🎨</div>
            <h3 className="font-semibold mb-2">Network Diagrams</h3>
            <p className="text-sm text-gray-600">Beautiful interaction networks with export</p>
          </div>
          <div className="text-center">
            <div className="text-3xl mb-4">💬</div>
            <h3 className="font-semibold mb-2">AI Assistant</h3>
            <p className="text-sm text-gray-600">Get help with literature and parameters</p>
          </div>
        </div>
      </div>
    </div>
  )
}