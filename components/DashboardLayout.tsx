'use client'

import { useState, useEffect } from 'react'
import { UserButton, useUser } from '@clerk/nextjs'
import Link from 'next/link'
import { useAppStore } from '@/stores/appStore'
import { brandConfig } from '@/lib/brand-config'
import { 
  Plus, 
  History, 
  FileText, 
  Calendar,
  ChevronLeft,
  ChevronRight,
  Trash2
} from 'lucide-react'

interface ExtractionHistory {
  id: string
  title: string
  status: 'processing' | 'completed' | 'failed'
  file_count: number
  interaction_count: number
  created_at: string
  updated_at: string
}

interface DashboardLayoutProps {
  children: React.ReactNode
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const { user } = useUser()
  const { currentStep, clearAll, setCurrentStep, setExtractionResults } = useAppStore()
  const [extractionHistory, setExtractionHistory] = useState<ExtractionHistory[]>([])
  const [isHistoryLoading, setIsHistoryLoading] = useState(true)
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)

  // Load user's extraction history using API
  useEffect(() => {
    const loadHistory = async () => {
      if (!user?.id) return
      
      try {
        setIsHistoryLoading(true)
        const response = await fetch('/api/extractions')
        
        if (response.ok) {
          const data = await response.json()
          setExtractionHistory(data.extractions || [])
        } else {
          console.error('Failed to load history:', response.statusText)
        }
      } catch (error) {
        console.error('Failed to load extraction history:', error)
      } finally {
        setIsHistoryLoading(false)
      }
    }

    loadHistory()
  }, [user?.id])

  const handleNewExtraction = () => {
    clearAll()
    setCurrentStep('upload')
  }

  const handleLoadHistoricalExtraction = async (extractionId: string) => {
    try {
      const response = await fetch(`/api/extractions/${extractionId}`)
      
      if (response.ok) {
        const data = await response.json()
        const extraction = data.extraction
        
        if (extraction && extraction.interactions) {
          // Set the historical data in the store
          setExtractionResults({
            interactions: extraction.interactions,
            references: extraction.source_references || {}
          })
        }
      } else {
        throw new Error('Failed to load extraction')
      }
    } catch (error) {
      console.error('Failed to load historical extraction:', error)
      alert('Failed to load extraction. Please try again.')
    }
  }

  const handleDeleteExtraction = async (extractionId: string, event: React.MouseEvent) => {
    event.stopPropagation() // Prevent triggering the load action
    
    if (!confirm('Are you sure you want to delete?')) return
    
    try {
      const response = await fetch(`/api/extractions?id=${extractionId}`, {
        method: 'DELETE'
      })
      
      if (response.ok) {
        // Refresh history
        const historyResponse = await fetch('/api/extractions')
        if (historyResponse.ok) {
          const data = await historyResponse.json()
          setExtractionHistory(data.extractions || [])
        }
      } else {
        throw new Error('Failed to delete extraction')
      }
    } catch (error) {
      console.error('Failed to delete extraction:', error)
      alert('Failed to delete extraction. Please try again.')
    }
  }

  // ... rest of the component remains the same (formatDate, getStatusColor, etc.)
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffTime = Math.abs(now.getTime() - date.getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    
    if (diffDays === 1) return 'Today'
    if (diffDays === 2) return 'Yesterday'
    if (diffDays <= 7) return `${diffDays - 1} days ago`
    return date.toLocaleDateString()
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-600'
      case 'processing': return 'text-blue-600'
      case 'failed': return 'text-red-600'
      default: return 'text-gray-600'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return '✓'
      case 'processing': return '⟳'
      case 'failed': return '✗'
      default: return '○'
    }
  }

  // ... rest of the JSX remains exactly the same
  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar - same as before */}
      <div className={`bg-white border-r border-gray-200 flex flex-col transition-all duration-300 ${
        isSidebarCollapsed ? 'w-16' : 'w-80'
      }`}>
        
        {/* Sidebar Header */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <Link href="/" className="text-2xl font-bold" style={{ color: brandConfig.colors.primary[600] }}>
            🔥 FireQSP
          </Link>

            <button
              onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              {isSidebarCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {/* Navigation */}
        <div className="p-4 border-b border-gray-200">
          <div className="space-y-2">
                       
            <button
              onClick={handleNewExtraction}
              className="w-full flex items-center px-3 py-2 text-blue-600 hover:bg-blue-50 rounded-lg"
            >
              <Plus className="h-4 w-4" />
              {!isSidebarCollapsed && <span className="ml-3">New Extraction</span>}
            </button>
          </div>
        </div>

        {/* Extraction History */}
        <div className="flex-1 overflow-hidden flex flex-col">
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center">
              <History className="h-4 w-4 text-gray-600" />
              {!isSidebarCollapsed && <h3 className="ml-2 text-sm font-medium text-gray-900">Recent</h3>}
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto">
            {isHistoryLoading ? (
              <div className="p-4 text-center">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
                {!isSidebarCollapsed && <p className="text-sm text-gray-600 mt-2">Loading...</p>}
              </div>
            ) : extractionHistory.length === 0 ? (
              <div className="p-4 text-center">
                <FileText className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                {!isSidebarCollapsed && (
                  <>
                    <p className="text-sm text-gray-600">No extractions yet</p>
                    <p className="text-xs text-gray-500 mt-1">Start by uploading PDFs</p>
                  </>
                )}
              </div>
            ) : (
              <div className="space-y-1 p-2">
                {extractionHistory.map((extraction) => (
                  <div
                    key={extraction.id}
                    onClick={() => handleLoadHistoricalExtraction(extraction.id)}
                    className="group relative p-3 hover:bg-gray-50 rounded-lg cursor-pointer border border-transparent hover:border-gray-200"
                  >
                    {!isSidebarCollapsed ? (
                      <>
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center">
                              <span className={`text-sm ${getStatusColor(extraction.status)}`}>
                                {getStatusIcon(extraction.status)}
                              </span>
                              <p className="ml-2 text-sm font-medium text-gray-900 truncate">
                                {extraction.title}
                              </p>
                            </div>
                            
                            <div className="mt-1 flex items-center text-xs text-gray-500">
                              <FileText className="h-3 w-3 mr-1" />
                              <span>{extraction.file_count} files</span>
                              <span className="mx-1">•</span>
                              <span>{extraction.interaction_count} interactions</span>
                            </div>
                            
                            <div className="mt-1 flex items-center text-xs text-gray-400">
                              <Calendar className="h-3 w-3 mr-1" />
                              <span>{formatDate(extraction.created_at)}</span>
                            </div>
                          </div>
                          
                          <button
                            onClick={(e) => handleDeleteExtraction(extraction.id, e)}
                            className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-100 rounded text-red-500 transition-opacity"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      </>
                    ) : (
                      <div className="flex justify-center">
                        <span className={`text-lg ${getStatusColor(extraction.status)}`}>
                          {getStatusIcon(extraction.status)}
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* User Section */}
        <div className="p-4 border-t border-gray-200">
          <div className="flex items-center">
            <UserButton afterSignOutUrl="/" />
            {!isSidebarCollapsed && (
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-900">
                  {user?.firstName || user?.emailAddresses[0]?.emailAddress?.split('@')[0]}
                </p>
                <p className="text-xs text-gray-600">
                  {user?.emailAddresses[0]?.emailAddress}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {children}
      </div>
    </div>
  )
}