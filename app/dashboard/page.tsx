'use client'

import { useEffect, useState } from 'react'
import { useUser } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import { DashboardLayout } from '@/components/DashboardLayout'
import { PDFUploader } from '@/components/PDFUploader'
import { InteractionTable } from '@/components/InteractionTable'
import { DiagramViewer } from '@/components/DiagramViewer'
import { useAppStore } from '@/stores/appStore'
import { ArrowLeft, Upload, Table, Network } from 'lucide-react'

export default function Dashboard() {
  const { isSignedIn, user, isLoaded } = useUser()
  const router = useRouter()
  
  const { 
    interactions, 
    selectedInteractions,
    currentStep, 
    setExtractionResults, 
    setCurrentStep,
    clearAll 
  } = useAppStore()

  // Simple handler for loading extractions from URL
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const loadExtractionId = urlParams.get('loadExtraction')
    
    console.log('Dashboard: checking for loadExtraction param:', loadExtractionId)
    console.log('User ID:', user?.id)
    
    if (loadExtractionId && user?.id) {
      console.log('Loading extraction:', loadExtractionId)
      const loadAndShowExtraction = async () => {
        try {
          const response = await fetch(`/api/extractions/${loadExtractionId}`)
          console.log('API response status:', response.status)
          
          if (response.ok) {
            const data = await response.json()
            const extraction = data.extraction
            
            console.log('Extraction loaded:', {
              id: extraction.id,
              interactionCount: extraction.interactions?.length,
              title: extraction.title
            })
            
            if (extraction.interactions && extraction.interactions.length > 0) {
              console.log('Setting extraction results and switching to select step')
              setExtractionResults({
                interactions: extraction.interactions,
                references: extraction.source_references || {}
              })
              setCurrentStep('select')
              console.log('Done - should now show Select Interactions table')
            } else {
              console.log('No interactions found in extraction')
            }
          } else {
            console.log('Failed to load extraction, status:', response.status)
          }
        } catch (error) {
          console.error('Error loading extraction:', error)
        }
        
        // Clean up URL
        window.history.replaceState({}, '', '/dashboard')
      }
      
      loadAndShowExtraction()
    } else {
      console.log('Conditions not met:', {
        hasLoadParam: !!loadExtractionId,
        hasUser: !!user?.id
      })
    }
  }, [user?.id, setExtractionResults, setCurrentStep])

  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      router.push('/sign-in')
    }
  }, [isLoaded, isSignedIn, router])

  useEffect(() => {
    // Clear store data when user changes (new signup)
    if (user?.id) {
      const storedUserId = localStorage.getItem('fireqsp_current_user_id')
      
      if (storedUserId !== user.id) {
        console.log('New user detected, clearing stored data')
        // Clear all app data for new user
        clearAll()
        // Store current user ID
        localStorage.setItem('fireqsp_current_user_id', user.id)
      }
    }
  }, [user?.id, clearAll])

  // Handle successful payment redirect
  useEffect(() => {
    const handleSuccessfulPayment = async () => {
      const urlParams = new URLSearchParams(window.location.search)
      const success = urlParams.get('success')
      const sessionId = urlParams.get('session_id')
      
      if (success === 'true' && sessionId && user?.id) {
        console.log('Payment successful, verifying session:', sessionId)
        
        try {
          // Verify the Stripe session and update plan
          const response = await fetch('/api/subscription/verify-payment', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              sessionId: sessionId,
              userId: user.id
            })
          })
          
          if (response.ok) {
            const result = await response.json()
            console.log('Plan updated to:', result.planType)
            // Clean up URL
            window.history.replaceState({}, '', '/dashboard')
            // Refresh to show new plan
            window.location.reload()
          }
        } catch (error) {
          console.error('Failed to verify payment:', error)
        }
      }
    }
    
    handleSuccessfulPayment()
  }, [user?.id])

  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!isSignedIn) {
    return null
  }

  const handleExtractionComplete = (results: any) => {
    console.log('Dashboard: Extraction completed:', results)
    
    setExtractionResults({
      interactions: results.interactions || [],
      references: results.references || {}
    })
    
    // Automatically go to select step if we have interactions
    if (results.interactions && results.interactions.length > 0) {
      setTimeout(() => {
        setCurrentStep('select')
      }, 100)
    }
  }

  const handleBackToTable = () => {
    setCurrentStep('select')
  }

  return (
    <DashboardLayout>
      {/* Progress Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              {currentStep === 'upload' && 'Upload & Extract PDFs'}
              {currentStep === 'select' && 'Select Interactions'}
              {currentStep === 'diagram' && 'Interaction Network'}
            </h2>
            <p className="text-sm text-gray-600">
              {currentStep === 'upload' && 'Upload scientific documents to extract biological interactions'}
              {currentStep === 'select' && `Found ${interactions.length} interactions • Select items for your model`}
              {currentStep === 'diagram' && `Visualizing ${selectedInteractions.length} selected interactions`}
            </p>
          </div>
          
          {/* Progress Indicators */}
          <div className="flex items-center space-x-3">
            <div className={`flex items-center ${currentStep === 'upload' ? 'text-blue-600' : interactions.length > 0 ? 'text-green-600' : 'text-gray-400'}`}>
              <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                interactions.length > 0 ? 'border-green-600 bg-green-600 text-white' : 
                currentStep === 'upload' ? 'border-blue-600' : 'border-gray-400'
              }`}>
                {interactions.length > 0 ? '✓' : '1'}
              </div>
              <span className="ml-2 text-xs font-medium">Upload</span>
            </div>
            
            <div className="w-6 h-px bg-gray-300"></div>
            
            <div className={`flex items-center ${currentStep === 'select' ? 'text-blue-600' : selectedInteractions.length > 0 ? 'text-green-600' : 'text-gray-400'}`}>
              <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                selectedInteractions.length > 0 ? 'border-green-600 bg-green-600 text-white' : 
                currentStep === 'select' ? 'border-blue-600' : 'border-gray-400'
              }`}>
                {selectedInteractions.length > 0 ? '✓' : '2'}
              </div>
              <span className="ml-2 text-xs font-medium">Select</span>
            </div>
            
            <div className="w-6 h-px bg-gray-300"></div>
            
            <div className={`flex items-center ${currentStep === 'diagram' ? 'text-blue-600' : 'text-gray-400'}`}>
              <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                currentStep === 'diagram' ? 'border-blue-600' : 'border-gray-400'
              }`}>
                3
              </div>
              <span className="ml-2 text-xs font-medium">Diagram</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-auto">
        <div className="max-w-7xl mx-auto p-6">
          
          {/* Step 1: Upload */}
          {currentStep === 'upload' && (
            <div className="max-w-2xl mx-auto">
              <PDFUploader onExtractionComplete={handleExtractionComplete} />
            </div>
          )}

          {/* Step 2: Select */}
          {currentStep === 'select' && (
            <InteractionTable />
          )}

          {/* Step 3: Diagram */}
          {currentStep === 'diagram' && (
            <div>
              <div className="mb-4">
                <button
                  onClick={handleBackToTable}
                  className="flex items-center text-gray-600 hover:text-gray-800"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Selection
                </button>
              </div>
              
              <DiagramViewer interactions={selectedInteractions} />
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}