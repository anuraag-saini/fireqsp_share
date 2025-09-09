// app/dashboard/progress/[jobId]/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useUser } from '@clerk/nextjs'
import { DashboardLayout } from '@/components/DashboardLayout'
import { ArrowLeft, CheckCircle, XCircle, Clock, FileText, AlertTriangle } from 'lucide-react'

interface Job {
  id: string
  status: string
  total_files: number
  files_processed: number
  files_successful: number
  files_failed: number
  current_file?: string
  interactions_found: number
  failed_files?: string[]
  created_at: string
  started_at?: string
  completed_at?: string
  extraction_id?: string
}

export default function ProgressPage() {
  const { jobId } = useParams()
  const router = useRouter()
  const { user, isLoaded } = useUser()
  const [job, setJob] = useState<Job | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (isLoaded && !user) {
      router.push('/sign-in')
      return
    }
  }, [isLoaded, user, router])

  useEffect(() => {
    if (!jobId || !user) return

    const pollStatus = async () => {
      try {
        const response = await fetch(`/api/jobs/${jobId}`)
        
        if (!response.ok) {
          if (response.status === 404) {
            setError('Job not found')
          } else {
            setError('Failed to get job status')
          }
          setLoading(false)
          return
        }

        const jobData = await response.json()
        console.log('Job status update:', jobData.status, 'Extraction ID:', jobData.extraction_id)
        setJob(jobData)
        setLoading(false)
        
        if (jobData.status === 'completed') {
          console.log('Job completed! Should redirect now...')
          // Redirect to dashboard and load the extraction directly
          if (jobData.extraction_id) {
            const redirectUrl = `/dashboard?loadExtraction=${jobData.extraction_id}`
            console.log('Redirecting to:', redirectUrl)
            router.push(redirectUrl)
          } else {
            console.log('No extraction ID found, redirecting to plain dashboard')
            router.push('/dashboard')
          }
        } else if (jobData.status === 'failed') {
          // Stop polling on failure
          return
        }
      } catch (err) {
        console.error('Polling error:', err)
        setError('Failed to get job status')
        setLoading(false)
      }
    }

    // Initial poll
    pollStatus()

    // Poll every 5 seconds if job is still processing
    const interval = setInterval(() => {
      if (job?.status === 'completed' || job?.status === 'failed') {
        clearInterval(interval)
        return
      }
      pollStatus()
    }, 5000)

    return () => clearInterval(interval)
  }, [jobId, user, router, job?.status])

  if (!isLoaded || loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </DashboardLayout>
    )
  }

  if (error) {
    return (
      <DashboardLayout>
        <div className="max-w-2xl mx-auto p-6">
          <div className="text-center">
            <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Processing Error</h2>
            <p className="text-red-600 mb-4">{error}</p>
            <button
              onClick={() => router.push('/dashboard')}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  if (!job) {
    return (
      <DashboardLayout>
        <div className="max-w-2xl mx-auto p-6">
          <div className="text-center">
            <p className="text-gray-600">Job not found</p>
            <button
              onClick={() => router.push('/dashboard')}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  const progressPercent = job.total_files > 0 ? (job.files_processed / job.total_files) * 100 : 0

  const getStatusIcon = () => {
    switch (job.status) {
      case 'completed':
        return <CheckCircle className="h-8 w-8 text-green-500" />
      case 'failed':
        return <XCircle className="h-8 w-8 text-red-500" />
      case 'processing':
        return <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      default:
        return <Clock className="h-8 w-8 text-gray-400" />
    }
  }

  const getStatusText = () => {
    switch (job.status) {
      case 'queued':
        return 'Queued for processing...'
      case 'processing':
        return job.current_file ? `Processing: ${job.current_file}` : 'Processing files...'
      case 'completed':
        return 'Processing complete! Redirecting to results...'
      case 'failed':
        return 'Processing failed'
      default:
        return job.status
    }
  }

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <button
              onClick={() => router.push('/dashboard')}
              className="flex items-center text-gray-600 hover:text-gray-800 mb-2"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </button>
            <h1 className="text-2xl font-semibold text-gray-900">Extraction Progress</h1>
          </div>
        </div>

        {/* Progress Card */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          {/* Status Header */}
          <div className="flex items-center mb-6">
            {getStatusIcon()}
            <div className="ml-4">
              <h2 className="text-lg font-medium text-gray-900">
                {getStatusText()}
              </h2>
              {/* <p className="text-sm text-gray-600">
                Job ID: {job.id.slice(0, 8)}...
              </p> */}
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mb-6">
            <div className="flex justify-between text-sm text-gray-600 mb-2">
              <span>Progress</span>
              <span>{Math.round(progressPercent)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className={`h-2 rounded-full transition-all duration-300 ${
                  job.status === 'completed' ? 'bg-green-500' : 
                  job.status === 'failed' ? 'bg-red-500' : 'bg-blue-600'
                }`}
                style={{ width: `${progressPercent}%` }}
              ></div>
            </div>
          </div>

          {/* Statistics Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <FileText className="h-6 w-6 text-gray-600 mx-auto mb-2" />
              <div className="text-2xl font-semibold text-gray-900">{job.total_files}</div>
              <div className="text-sm text-gray-600">Total Files</div>
            </div>
            
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="w-6 h-6 bg-blue-600 rounded mx-auto mb-2"></div>
              <div className="text-2xl font-semibold text-blue-900">{job.files_processed}</div>
              <div className="text-sm text-blue-700">Processed</div>
            </div>
            
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <CheckCircle className="h-6 w-6 text-green-600 mx-auto mb-2" />
              <div className="text-2xl font-semibold text-green-900">{job.interactions_found}</div>
              <div className="text-sm text-green-700">Interactions</div>
            </div>
            
            {job.files_failed > 0 && (
              <div className="text-center p-4 bg-red-50 rounded-lg">
                <AlertTriangle className="h-6 w-6 text-red-600 mx-auto mb-2" />
                <div className="text-2xl font-semibold text-red-900">{job.files_failed}</div>
                <div className="text-sm text-red-700">Failed</div>
              </div>
            )}
          </div>

          {/* Failed Files */}
          {job.failed_files && job.failed_files.length > 0 && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <h3 className="font-medium text-red-900 mb-2">Failed Files:</h3>
              <ul className="text-sm text-red-700 space-y-1">
                {job.failed_files.map((filename, idx) => (
                  <li key={idx} className="flex items-center">
                    <XCircle className="h-4 w-4 mr-2 flex-shrink-0" />
                    {filename}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Current Status */}
          <div className="flex justify-between items-center text-sm text-gray-600">
            <div>
              {job.started_at && (
                <span>Started: {new Date(job.started_at + 'Z').toLocaleString()}</span>
              )}
            </div>
            <div>
              {job.completed_at && (
                <span>Completed: {new Date(job.completed_at + 'Z').toLocaleString()}</span>
              )}
            </div>
          </div>
        </div>

        {/* Completion Actions */}
        {job.status === 'completed' && (
          <div className="mt-6 text-center">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
              <CheckCircle className="h-6 w-6 text-green-600 mx-auto mb-2" />
              <p className="text-green-800 font-medium">
                Extraction completed successfully!
              </p>
              <p className="text-green-700 text-sm">
                Found {job.interactions_found} interactions from {job.files_successful} files
              </p>
            </div>
            
            <button
              onClick={() => {
                if (job.extraction_id) {
                  router.push(`/dashboard?loadExtraction=${job.extraction_id}`)
                } else {
                  router.push('/dashboard')
                }
              }}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              View Results
            </button>
          </div>
        )}

        {job.status === 'failed' && (
          <div className="mt-6 text-center">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
              <XCircle className="h-6 w-6 text-red-600 mx-auto mb-2" />
              <p className="text-red-800 font-medium">
                Extraction failed
              </p>
              <p className="text-red-700 text-sm">
                Please try again with different files or contact support
              </p>
            </div>
            
            <button
              onClick={() => router.push('/dashboard')}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Try Again
            </button>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}