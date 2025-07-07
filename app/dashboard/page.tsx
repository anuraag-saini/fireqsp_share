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

      {/* Statistics Dashboard */}
      {interactions.length > 0 && (
        <div className="mb-8 grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-lg border">
            <div className="text-2xl font-bold text-blue-600">{stats.total}</div>
            <div className="text-sm text-gray-600">Total Interactions</div>
          </div>
          <div className="bg-white p-4 rounded-lg border">
            <div className="text-2xl font-bold text-green-600">{stats.selected}</div>
            <div className="text-sm text-gray-600">Selected</div>
          </div>
          <div className="bg-white p-4 rounded-lg border">
            <div className="text-2xl font-bold text-purple-600">{Object.keys(stats.byFile).length}</div>
            <div className="text-sm text-gray-600">Source Files</div>
          </div>
          <div className="bg-white p-4 rounded-lg border">
            <div className="text-2xl font-bold text-orange-600">{Object.keys(stats.byType).length}</div>
            <div className="text-sm text-gray-600">Interaction Types</div>
          </div>
        </div>
      )}

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

          {/* Selected Interactions Summary */}
          {selectedInteractions.length > 0 && (
            <div className="bg-white border rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-4">🎯 Selection Summary</h3>
              
              <div className="grid grid-cols-3 gap-4 mb-4">
                <div className="text-center p-3 bg-green-50 rounded-lg border border-green-200">
                  <div className="text-xl font-bold text-green-600">{selectedInteractions.length}</div>
                  <div className="text-xs text-green-600">Interactions</div>
                </div>
                <div className="text-center p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="text-xl font-bold text-blue-600">
                    {new Set(selectedInteractions.flatMap(i => [i.source, i.target])).size}
                  </div>
                  <div className="text-xs text-blue-600">Entities</div>
                </div>
                <div className="text-center p-3 bg-purple-50 rounded-lg border border-purple-200">
                  <div className="text-xl font-bold text-purple-600">
                    {new Set(selectedInteractions.map(i => i.interaction_type)).size}
                  </div>
                  <div className="text-xs text-purple-600">Types</div>
                </div>
              </div>

              {/* Quick Preview */}
              <div className="space-y-2 max-h-48 overflow-y-auto">
                <h4 className="font-medium text-gray-900 text-sm">Selected Interactions:</h4>
                {selectedInteractions.slice(0, 3).map((interaction) => (
                  <div key={interaction.id} className="flex items-center justify-between p-2 bg-gray-50 rounded text-sm">
                    <div className="flex items-center space-x-2">
                      <span className="font-medium text-blue-600">{interaction.source}</span>
                      <span className="text-gray-400">→</span>
                      <span className="font-medium text-green-600">{interaction.target}</span>
                    </div>
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      interaction.interaction_type === 'positive' ? 'bg-green-100 text-green-700' :
                      interaction.interaction_type === 'negative' ? 'bg-red-100 text-red-700' :
                      'bg-purple-100 text-purple-700'
                    }`}>
                      {interaction.interaction_type}
                    </span>
                  </div>
                ))}
                {selectedInteractions.length > 3 && (
                  <div className="text-center text-xs text-gray-500 py-2">
                    ...and {selectedInteractions.length - 3} more
                  </div>
                )}
              </div>

              {/* Interaction Type Breakdown */}
              <div className="mt-4 pt-4 border-t border-gray-200">
                <h4 className="font-medium text-gray-900 text-sm mb-2">Type Distribution:</h4>
                <div className="flex flex-wrap gap-1">
                  {Object.entries(
                    selectedInteractions.reduce((acc, interaction) => {
                      acc[interaction.interaction_type] = (acc[interaction.interaction_type] || 0) + 1
                      return acc
                    }, {} as Record<string, number>)
                  ).map(([type, count]) => (
                    <span
                      key={type}
                      className={`px-2 py-1 rounded text-xs font-medium ${
                        type === 'positive' ? 'bg-green-100 text-green-800' :
                        type === 'negative' ? 'bg-red-100 text-red-800' :
                        type === 'regulatory' ? 'bg-purple-100 text-purple-800' :
                        type === 'binding' ? 'bg-blue-100 text-blue-800' :
                        'bg-orange-100 text-orange-800'
                      }`}
                    >
                      {type}: {count}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}
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