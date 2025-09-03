'use client'

import { useState, useEffect } from 'react'
import { UserButton, useUser } from '@clerk/nextjs'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAppStore } from '@/stores/appStore'
import { brandConfig } from '@/lib/brand-config'

import { 
  Plus, 
  History, 
  FileText, 
  Calendar,
  ChevronLeft,
  ChevronRight,
  Trash2,
  Clock,
  RefreshCw
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
  const router = useRouter()
  const [userLimits, setUserLimits] = useState<any>(null)
  const { currentStep, clearAll, setCurrentStep, setExtractionResults } = useAppStore()
  const [extractionHistory, setExtractionHistory] = useState<ExtractionHistory[]>([])
  const [isHistoryLoading, setIsHistoryLoading] = useState(true)
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  
  // Active Jobs State
  const [activeJobs, setActiveJobs] = useState([])
  const [isJobsLoading, setIsJobsLoading] = useState(false)
  const [showActiveJobs, setShowActiveJobs] = useState(false)

  useEffect(() => {
    const checkLimits = async () => {
        try {
        const response = await fetch('/api/subscription/status')
        if (response.ok) {
            const limits = await response.json()
            setUserLimits(limits)
        }
        } catch (error) {
        console.error('Failed to get limits:', error)
        }
    }
    
    checkLimits()
  }, [user?.id])

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

  // Load active jobs - only when requested
  const loadActiveJobs = async () => {
    if (!user?.id) return
    
    try {
      setIsJobsLoading(true)
      const response = await fetch('/api/jobs/active')
      
      if (response.ok) {
        const jobs = await response.json()
        setActiveJobs(jobs)
      } else {
        console.error('Failed to load active jobs:', response.statusText)
      }
    } catch (error) {
      console.error('Failed to load active jobs:', error)
    } finally {
      setIsJobsLoading(false)
    }
  }

  const handleNewExtraction = () => {
    clearAll()
    setCurrentStep('upload')
    router.push('/dashboard') // Add navigation
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
          router.push(`/dashboard?extraction=${extractionId}`)
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
    event.stopPropagation() 
    
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

  const handleToggleActiveJobs = () => {
    if (!showActiveJobs) {
      setShowActiveJobs(true)
      loadActiveJobs()
    } else {
      setShowActiveJobs(false)
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()

    // Reset hours to compare just the dates
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const compareDate = new Date(date.getFullYear(), date.getMonth(), date.getDate())
    
    const diffTime = today.getTime() - compareDate.getTime()
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))
    
    if (diffDays === 0) return 'Today'
    if (diffDays === 1) return 'Yesterday'
    if (diffDays <= 7) return `${diffDays} days ago`
    if (diffDays <= 30) return `${Math.floor(diffDays / 7)} weeks ago`
    
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

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <div className={`bg-white border-r border-gray-200 flex flex-col transition-all duration-300 ${
        isSidebarCollapsed ? 'w-16' : 'w-80'
      }`}>
        
        {/* Sidebar Header */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <Link href="/" className="text-2xl font-bold" style={{ color: brandConfig.colors.primary[600] }}>
            {!isSidebarCollapsed && (
              <div>
                🔥 FireQSP
              </div>
            )}
            </Link>

            <button
              onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              {isSidebarCollapsed ? <ChevronRight className="h-6 w-6" /> : <ChevronLeft className="h-6 w-6" />}
            </button>
          </div>
        </div>

        {/* Navigation */}
        <div className="p-4 border-b border-gray-200">
          <div className="space-y-2">
            <button
              onClick={handleNewExtraction}
              className="w-full flex items-center px-1 py-1 text-blue-600 hover:bg-blue-50 rounded-lg">
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

        {/* Active Jobs Section - NEW */}
        <div className="border-t border-gray-200">
          <div className="p-4">
            <button
              onClick={handleToggleActiveJobs}
              className="w-full flex items-center px-1 py-2 text-gray-600 hover:bg-gray-50 rounded-lg"
            >
              <Clock className="h-4 w-4" />
              {!isSidebarCollapsed && <span className="ml-3">Active Jobs</span>}
              {!isSidebarCollapsed && activeJobs.length > 0 && (
                <span className="ml-auto bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                  {activeJobs.length}
                </span>
              )}
            </button>

            {/* Active Jobs List */}
            {showActiveJobs && !isSidebarCollapsed && (
              <div className="mt-3 border-t border-gray-100 pt-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-gray-500">ACTIVE JOBS</span>
                  <button
                    onClick={loadActiveJobs}
                    disabled={isJobsLoading}
                    className="p-1 hover:bg-gray-100 rounded transition-colors"
                  >
                    <RefreshCw className={`h-3 w-3 text-gray-400 ${isJobsLoading ? 'animate-spin' : ''}`} />
                  </button>
                </div>

                {isJobsLoading ? (
                  <div className="text-center py-4">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mx-auto"></div>
                  </div>
                ) : activeJobs.length === 0 ? (
                  <p className="text-xs text-gray-500 py-2">No active jobs</p>
                ) : (
                  <div className="space-y-2">
                    {activeJobs.map((job: any) => (
                      <div
                        key={job.id}
                        onClick={() => router.push(`/dashboard/progress/${job.id}`)}
                        className="p-2 bg-blue-50 rounded-lg cursor-pointer hover:bg-blue-100 transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <p className="text-xs font-medium text-blue-900">
                              {job.total_files} files
                            </p>
                            <p className="text-xs text-blue-700">
                              {job.files_processed}/{job.total_files} processed
                            </p>
                            {job.interactions_found > 0 && (
                              <p className="text-xs text-green-700">
                                {job.interactions_found} interactions
                              </p>
                            )}
                          </div>
                          <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                            <div className="w-3 h-3 rounded-full bg-blue-600" 
                                 style={{
                                   transform: `scale(${job.total_files > 0 ? (job.files_processed / job.total_files) : 0})`
                                 }}>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
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