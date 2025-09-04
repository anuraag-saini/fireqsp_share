'use client'

import { useState, useEffect } from 'react'
import { useUser } from '@clerk/nextjs'
import { useAppStore } from '@/stores/appStore'
import { useRouter } from 'next/navigation'

export default function Home() {
  // Mock authentication state for demo
  const { isSignedIn, user, isLoaded } = useUser()
  const { currentStep, clearAll, setCurrentStep, setExtractionResults } = useAppStore()
  const router = useRouter()
  
  // Animation state
  const [currentWordIndex, setCurrentWordIndex] = useState(0)
  const [currentText, setCurrentText] = useState('')
  const [isDeleting, setIsDeleting] = useState(false)
  const [typingSpeed, setTypingSpeed] = useState(150)

  const words = ['Rare Diseases', 'Oncology', 'AutoImmune Diseases', 'Metabolic Diseases']

  const handleNewExtraction = () => {
    clearAll()
    setCurrentStep('upload')
    router.push('/dashboard') // Add navigation
  }

  useEffect(() => {
    const type = () => {
      const currentWord = words[currentWordIndex]
      
      if (isDeleting) {
        setCurrentText(currentWord.substring(0, currentText.length - 1))
        setTypingSpeed(75)
      } else {
        setCurrentText(currentWord.substring(0, currentText.length + 1))
        setTypingSpeed(75)
      }

      if (!isDeleting && currentText === currentWord) {
        setTimeout(() => setIsDeleting(true), 2000)
      } else if (isDeleting && currentText === '') {
        setIsDeleting(false)
        setCurrentWordIndex((prev) => (prev + 1) % words.length)
      }
    }

    const timer = setTimeout(type, typingSpeed)
    return () => clearTimeout(timer)
  }, [currentText, isDeleting, currentWordIndex, typingSpeed, words])

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      <div className="container mx-auto px-4 py-20 text-center">
        {/* Main Title with Animation */}
        <h1 className="text-5xl font-bold mb-6">
          FireQSP
        </h1>
        
        {/* Animated Subtitle */}
        <h2 className="text-3xl font-bold mb-2 h-12">
          For{' '}
          <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            {currentText}
            <span className="animate-pulse">|</span>
          </span>
        </h2>
        
        {/* Secondary Title */}
        <h3 className="text-2xl font-semibold mb-6 text-gray-700">
          AI-powered QSP modeling platform
        </h3>
        
        <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
          Transform scientific literature into quantitative systems pharmacology models 
          with our intelligent extraction and modeling platform.
        </p>
        
        {isSignedIn ? (
          // User is signed in
          <div className="flex justify-center gap-4">
            <button 
              onClick={handleNewExtraction}
              className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-lg font-semibold transition-colors duration-200 transform hover:scale-105"
            >
              Go to Dashboard
            </button>
          </div>
        ) : (
          // User is not signed in
          <div className="flex justify-center gap-4">
            <button 
              onClick={() => window.location.href = '/sign-up'}
              className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-lg font-semibold transition-all duration-200 transform hover:scale-105"
            >
              Get Started Free
            </button>
          </div>
        )}
        
        {/* Features Section */}
        <div className="mt-20 grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          <div className="text-center p-6 rounded-lg hover:bg-white hover:shadow-lg transition-all duration-300 transform hover:-translate-y-2">
            <div className="text-3xl mb-4">📄</div>
            <h3 className="font-semibold mb-2">PDF Extraction</h3>
            <p className="text-sm text-gray-600">AI-powered extraction of biological interactions</p>
          </div>
          <div className="text-center p-6 rounded-lg hover:bg-white hover:shadow-lg transition-all duration-300 transform hover:-translate-y-2">
            <div className="text-3xl mb-4">📊</div>
            <h3 className="font-semibold mb-2">Interactive Tables</h3>
            <p className="text-sm text-gray-600">Filter and select interactions with ease</p>
          </div>
          <div className="text-center p-6 rounded-lg hover:bg-white hover:shadow-lg transition-all duration-300 transform hover:-translate-y-2">
            <div className="text-3xl mb-4">🎨</div>
            <h3 className="font-semibold mb-2">Network Diagrams</h3>
            <p className="text-sm text-gray-600">Beautiful interaction networks with export</p>
          </div>
          <div className="text-center p-6 rounded-lg hover:bg-white hover:shadow-lg transition-all duration-300 transform hover:-translate-y-2">
            <div className="text-3xl mb-4">💬</div>
            <h3 className="font-semibold mb-2">AI Assistant</h3>
            <p className="text-sm text-gray-600">Get help with literature and parameters</p>
          </div>
        </div>
      </div>
    </div>
  )
}