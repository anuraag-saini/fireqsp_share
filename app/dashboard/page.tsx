'use client'

import { useUser } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { PDFUploader } from '@/components/PDFUploader'
import { InteractionTable } from '@/components/InteractionTable'
import { DiagramViewer } from '@/components/DiagramViewer'
import { useAppStore } from '@/stores/appStore'

export default function Dashboard() {
  const { isSignedIn, user, isLoaded } = useUser()
  const router = useRouter()
  const { 
    interactions, 
    selectedInteractions,
    currentStep, 
    setExtractionResults, 
    setSelectedInteractions,
    clearAll,
    getStats
  } = useAppStore()

  const stats = getStats()

  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      router.push('/sign-in')
    }
  }, [isLoaded, isSignedIn, router])

  if (!isLoaded) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    )
  }

  if (!isSignedIn) {
    return null
  }

  const handleExtractionComplete = (results: any) => {
    setExtractionResults({
      interactions: results.interactions || [],
      references: results.references || {}
    })
  }

  const handleSelectionChange = (selectedInteractions: any[]) => {
    setSelectedInteractions(selectedInteractions)
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      {/* Header */}
      <div className="mb-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold mb-2">🔥 FireQSP Dashboard</h1>
            <p className="text-gray-600">
              Hi {user?.firstName || user?.emailAddresses[0]?.emailAddress}! Ready to start your QSP modeling?
            </p>
          </div>
          
          {interactions.length > 0 && (
            <button
              onClick={clearAll}
              className="px-4 py-2 text-sm text-red-600 border border-red-300 rounded hover:bg-red-50"
            >
              Clear All Data
            </button>
          )}
        </div>
      </div>

      {/* Progress Steps */}
      <div className="mb-8 flex items-center space-x-4">
        <div className={`flex items-center ${currentStep === 'upload' ? 'text-blue-600' : interactions.length > 0 ? 'text-green-600' : 'text-gray-400'}`}>
          <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center mr-2 ${
            interactions.length > 0 ? 'border-green-600 bg-green-600 text-white' : 
            currentStep === 'upload' ? 'border-blue-600' : 'border-gray-400'
          }`}>
            {interactions.length > 0 ? '✓' : '1'}
          </div>
          <span className="font-medium">Upload PDFs</span>
        </div>
        
        <div className="flex-1 h-px bg-gray-300"></div>
        
        <div className={`flex items-center ${currentStep === 'select' ? 'text-blue-600' : selectedInteractions.length > 0 ? 'text-green-600' : 'text-gray-400'}`}>
          <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center mr-2 ${
            selectedInteractions.length > 0 ? 'border-green-600 bg-green-600 text-white' :
            currentStep === 'select' ? 'border-blue-600' : 'border-gray-400'
          }`}>
            {selectedInteractions.length > 0 ? '✓' : '2'}
          </div>
          <span className="font-medium">Select Interactions</span>
        </div>
        
        <div className="flex-1 h-px bg-gray-300"></div>
        
        <div className={`flex items-center ${currentStep === 'diagram' ? 'text-blue-600' : currentStep === 'complete' ? 'text-green-600' : 'text-gray-400'}`}>
          <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center mr-2 ${
            currentStep === 'complete' ? 'border-green-600 bg-green-600 text-white' :
            currentStep === 'diagram' ? 'border-blue-600' : 'border-gray-400'
          }`}>
            {currentStep === 'complete' ? '✓' : '3'}
          </div>
          <span className="font-medium">Create Diagram</span>
        </div>
      </div>

      {/* Main Content - Two Column Layout for Large Screens */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        
        {/* Left Column - Upload and Table */}
        <div className="space-y-8">
          {/* Step 1: PDF Upload */}
          <PDFUploader onExtractionComplete={handleExtractionComplete} />

          {/* Step 2: Interaction Selection Table */}
          {interactions.length > 0 && (
            <InteractionTable onSelectionChange={handleSelectionChange} />
          )}
        </div>

        {/* Right Column - Diagram and Summary */}
        <div className="space-y-8">
          {/* Step 3: Network Diagram */}
          <DiagramViewer />
        </div>
      </div>

      {/* Full Width Sections for Mobile */}
      <div className="xl:hidden space-y-8 mt-8">
        {/* Coming Soon Features - Only show on mobile when no interactions */}
        {interactions.length === 0 && (
          <div className="grid md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-lg border border-gray-200 opacity-50">
              <div className="text-2xl mb-3">📊</div>
              <h3 className="font-semibold mb-2">Interactive Selection</h3>
              <p className="text-sm text-gray-600">Select and filter extracted interactions</p>
              <p className="text-xs text-blue-600 mt-2">Available after PDF extraction</p>
            </div>

            <div className="bg-white p-6 rounded-lg border border-gray-200 opacity-50">
              <div className="text-2xl mb-3">🎨</div>
              <h3 className="font-semibold mb-2">Network Diagrams</h3>
              <p className="text-sm text-gray-600">Generate interactive network diagrams</p>
              <p className="text-xs text-blue-600 mt-2">Available after interaction selection</p>
            </div>

            <div className="bg-white p-6 rounded-lg border border-gray-200 opacity-50">
              <div className="text-2xl mb-3">💬</div>
              <h3 className="font-semibold mb-2">AI Assistant</h3>
              <p className="text-sm text-gray-600">Get help with your modeling questions</p>
              <p className="text-xs text-blue-600 mt-2">Coming soon</p>
            </div>
          </div>
        )}
      </div>

      {/* Completion Status */}
      {selectedInteractions.length > 0 && (
        <div className="mt-8 bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-green-800 mb-1">🎉 Network Analysis Complete!</h3>
              <p className="text-green-700 text-sm">
                You've successfully created a network diagram with {selectedInteractions.length} interactions. 
                You can now download the diagram, adjust settings, or export your data.
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  // Could trigger a tour or help modal
                  alert('Feature coming soon: Export to modeling software!')
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
              >
                Next Steps
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer Help */}
      <div className="mt-12 text-center text-gray-500 text-sm">
        <p>
          Need help? Check out our{' '}
          <button 
            onClick={() => alert('Documentation coming soon!')}
            className="text-blue-600 hover:text-blue-700 underline"
          >
            documentation
          </button>
          {' '}or{' '}
          <button 
            onClick={() => alert('Support chat coming soon!')}
            className="text-blue-600 hover:text-blue-700 underline"
          >
            contact support
          </button>
        </p>
      </div>
    </div>
  )
}