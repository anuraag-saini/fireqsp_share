'use client'

import { useState, useEffect } from 'react'
import { useUser } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import { Upload, File, X, Loader2, CheckCircle, AlertCircle, Paperclip, Clock } from 'lucide-react'
import { brandConfig } from '@/lib/brand-config'

interface UploadedFile {
  file: File
  id: string
}

interface ExtractionResults {
  interactions: Array<{
    id: string
    mechanism: string
    source: { name: string, level: string }
    target: { name: string, level: string }
    interaction_type: string
    details: string
    confidence: string
    filename: string
  }>
  references: Record<string, string>
  summary?: {
    totalFiles: number
    totalInteractions: number
    filesWithErrors: number
  }
  errors?: string[]
  message?: string
  // Background job properties
  useBackgroundJob?: boolean
  jobId?: string
  fileCount?: number
}

interface PDFUploaderProps {
  onExtractionComplete?: (results: ExtractionResults) => void
}

export function PDFUploader({ onExtractionComplete }: PDFUploaderProps) {
  const { user } = useUser()
  const router = useRouter()
  const [userLimits, setUserLimits] = useState<any>(null)
  const [files, setFiles] = useState<UploadedFile[]>([])
  const [diseaseType, setDiseaseType] = useState<string>('Others')
  const [isExtracting, setIsExtracting] = useState(false)
  const [extractionResults, setExtractionResults] = useState<ExtractionResults | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [uploadProgress, setUploadProgress] = useState<{current: number, total: number, status: string} | null>(null)

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

  // Get plan color for the bottom line
  const getPlanColor = () => {
    if (!userLimits?.plan) return '#d1d5db' // gray-300 default
    
    switch (userLimits.plan) {
      case 'pro': return '#fbbf24' // amber-400 (golden)
      case 'basic': return '#8b5cf6' // violet-500 (purple)  
      case 'trial': return '#fbbf24' // amber-400 (golden)
      case 'enterprise': return '#fbbf24' // amber-400 (golden)
      case 'expired': return '#ef4444' // red-500
      default: return '#d1d5db' // gray-300
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files).map(file => ({
        file,
        id: Math.random().toString(36).substr(2, 9)
      }))
      setFiles(prev => [...prev, ...newFiles])
    }
  }

  const removeFile = (id: string) => {
    setFiles(prev => prev.filter(f => f.id !== id))
  }

  // Check if upload qualifies for background processing
  const isLargeUpload = () => {
    return files.length > 0 // All uploads now use the same flow
  }

  const handleExtraction = async () => {
    if (files.length === 0) return

    // Validation (keep existing validation logic)
    if (!userLimits?.canUpload) {
      setError('Extractions limit reached. Please upgrade your plan.')
      return
    }

    // File size validation (keep existing)
    const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB per file  
    const MAX_TOTAL_SIZE = 40 * 1024 * 1024; // 40MB total
    
    let totalSize = 0;
    for (const { file } of files) {
      if (file.size > MAX_FILE_SIZE) {
        setError(`File "${file.name}" is too large. Maximum size is 10MB per file.`);
        return;
      }
      totalSize += file.size;
    }
    
    if (totalSize > MAX_TOTAL_SIZE) {
      setError('Total file size too large. Maximum is 40MB total.');
      return;
    }

    setIsExtracting(true)
    setError(null)
    setExtractionResults(null)
    setUploadProgress(null)

    try {
      // Step 1: Create job (no files sent)
      setUploadProgress({ status: 'Creating job...', current: 0, total: files.length })
      
      const jobResponse = await fetch('/api/upload-job', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileCount: files.length,
          userEmail: user?.emailAddresses[0]?.emailAddress
        })
      })

      if (!jobResponse.ok) {
        throw new Error('Failed to create job')
      }

      const { jobId, userId } = await jobResponse.json()
      console.log('Job created:', jobId)

      // Step 2: Upload files via API (uses service role)
      setUploadProgress({ status: 'Uploading files...', current: 0, total: files.length })

      for (let i = 0; i < files.length; i++) {
        const { file } = files[i]
        
        console.log(`Uploading file ${i + 1}/${files.length}: ${file.name}`)
        
        // Upload via your existing FileStorage.uploadFile (server-side with service role)
        const uploadFormData = new FormData()
        uploadFormData.append('file', file)
        uploadFormData.append('userId', userId)
        uploadFormData.append('jobId', jobId)
        
        const uploadResponse = await fetch('/api/upload-file', {
          method: 'POST',
          body: uploadFormData
        })
        
        if (!uploadResponse.ok) {
          const error = await uploadResponse.text()
          throw new Error(`Failed to upload ${file.name}: ${error}`)
        }
        
        setUploadProgress({ 
          status: 'Uploading files...', 
          current: i + 1, 
          total: files.length 
        })
      }

      // Step 3: Trigger background processing
      setUploadProgress({ status: 'Starting processing...', current: files.length, total: files.length })
      
      const processResponse = await fetch('/api/process-background', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobId,
          userId,
          userEmail: user?.emailAddresses[0]?.emailAddress,
          fileCount: files.length
        })
      })

      if (!processResponse.ok) {
        throw new Error('Failed to start processing')
      }

      console.log('Background processing started, redirecting to progress page')
      router.push(`/dashboard/progress/${jobId}`)

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Processing failed')
      console.error('Upload error:', err)
    } finally {
      setIsExtracting(false)
      setUploadProgress(null)
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  return (
    <div className="flex justify-center items-center h-[calc(70vh)] p-4">
      <div className="max-w-2xl w-full bg-white border rounded-xl overflow-hidden relative" style={{ borderColor: brandConfig.colors.secondary[200] }}>
        {/* Plan Color Line - Subtle line at the bottom */}
        <div 
          className="absolute bottom-0 left-0 right-0 h-2 rounded-b-xl"
          style={{ backgroundColor: getPlanColor() }}
        ></div>
        
        {/* Chat Header */}
        <div className="px-5 py-4 border-b text-center" style={{ 
          borderColor: brandConfig.colors.secondary[100], 
          backgroundColor: brandConfig.colors.secondary[50] 
        }}>
          <div className="text-sm font-medium" style={{ color: brandConfig.colors.secondary[600] }}>🔥 FireQSP</div>
        </div>
      
      <div className="p-5 pb-6"> {/* Added bottom padding to account for color line */}
        
        {/* Show upload interface when not extracting */}
        {!isExtracting && (
          <div className={`border border-gray-200 rounded-3xl p-3 flex items-center gap-3 transition-all duration-200 ${
            files.length > 0 ? 'border-blue-500 bg-blue-50' : 'bg-gray-50 hover:border-gray-300'
          }`}>
            <button 
              onClick={() => document.getElementById('fileInput')?.click()}
              className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200 ${
                files.length > 0 ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
              }`}
            >
              <Paperclip className="h-4 w-4" />
            </button>
            
            <div className="flex-1 min-w-0">
              {files.length === 0 ? (
                <div 
                  onClick={() => document.getElementById('fileInput')?.click()}
                  className="text-sm cursor-pointer"
                  style={{ color: brandConfig.colors.secondary[400] }}
                >
                  Upload
                </div>
              ) : (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {files.map(({ file, id }) => (
                    <div key={id} className="flex items-center gap-1.5 bg-gray-100 border border-gray-200 rounded-2xl px-2.5 py-1 max-w-48">
                      <span className="text-gray-700 text-xs font-medium truncate max-w-28">
                        {file.name}
                      </span>
                      <span className="text-gray-500 text-xs">
                        {formatFileSize(file.size)}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          removeFile(id)
                        }}
                        className="w-4 h-4 rounded-full flex items-center justify-center text-gray-400 hover:bg-gray-200 hover:text-gray-600 transition-colors duration-200"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            <div className="flex items-center gap-2">
              <button
                onClick={handleExtraction}
                disabled={files.length === 0}
                className="px-4 py-2 rounded-2xl text-xs font-medium transition-colors duration-200 disabled:cursor-not-allowed"
                style={{
                  backgroundColor: files.length === 0? brandConfig.colors.secondary[200] : brandConfig.colors.primary[500],
                  color: files.length === 0 ? brandConfig.colors.secondary[400] : 'white'
                }}
              >
                Process
              </button>
              
              {files.length > 0 && (
                <button
                  onClick={() => setFiles([])}
                  className="px-3 py-2 text-xs font-medium rounded-2xl transition-colors duration-200"
                  style={{ color: brandConfig.colors.secondary[600] }}
                >
                  Clear
                </button>
              )}
            </div>
            
            <input
              id="fileInput"
              type="file"
              multiple
              accept=".pdf"
              onChange={handleFileChange}
              className="hidden"
            />
          </div>
        )}

        {/* Large Upload Warning */}
        {files.length > 0 && isLargeUpload() && !isExtracting && (
          <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-3xl flex items-center gap-2">
            <Clock className="h-4 w-4 text-amber-600" />
            <div className="text-amber-700 text-sm">
              <span className="font-medium">Large upload detected!</span> 
              <span className="text-amber-600"> Files will be uploaded to secure storage first, then processed in the background.</span>
            </div>
          </div>
        )}

        {/* Loading State */}
        {isExtracting && (
          <div className="flex items-center gap-3 p-3 bg-blue-50 border border-blue-200 rounded-3xl">
            <div className="animate-spin rounded-full h-8 w-8 border-b-3 border-blue-600"></div>
            <div className="text-blue-700 text-sm font-medium">
              {uploadProgress ? (
                <>
                  {uploadProgress.status}
                  {uploadProgress.current > 0 && (
                    <div className="mt-1 text-xs text-gray-600">
                      {uploadProgress.current} of {uploadProgress.total} files
                    </div>
                  )}
                </>
              ) : isLargeUpload() ? (
                <>
                  Setting up background processing for {files.length} file{files.length !== 1 ? 's' : ''}...
                  <p className="text-gray-600">You'll be redirected to track progress shortly.</p>
                </>
              ) : (
                <>
                  Processing {files.length} file{files.length !== 1 ? 's' : ''}... 
                  <p className="text-gray-600">This may take a few minutes. Do not close/refresh this page.</p>
                </>
              )}
            </div>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-3xl flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-red-500" />
            <div className="text-red-700 text-sm font-medium">
              {error}
            </div>
            <button
              onClick={() => {
                setError(null)
                setExtractionResults(null)
              }}
              className="ml-auto px-3 py-1 text-xs bg-red-100 text-red-700 rounded-xl hover:bg-red-200 transition-colors duration-200"
            >
              Try Again
            </button>
          </div>
        )}

        {/* Success Display */}
        {extractionResults && !extractionResults.useBackgroundJob && (
          <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-3xl">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <div className="text-green-700 text-sm font-medium">
                {extractionResults.message === 'No interactions found' 
                  ? 'Processing Complete - No Interactions Found' 
                  : 'Processing Complete!'}
              </div>
            </div>
            
            {extractionResults.message === 'No interactions found' ? (
              <div className="text-green-600 text-sm">
                No biological interactions were found in the uploaded files. Try uploading different documents or check if the content contains biological mechanisms.
              </div>
            ) : (
              <div className="text-green-600 text-sm">
                Found {extractionResults.interactions?.length || 0} interactions from {files.length} files
              </div>
            )}
            
            {extractionResults.errors && extractionResults.errors.length > 0 && (
              <div className="mt-3 pt-3 border-t border-green-200">
                <div className="text-green-700 text-sm font-medium mb-1">Warnings:</div>
                {extractionResults.errors.slice(0, 3).map((err: string, idx: number) => (
                  <div key={idx} className="text-green-600 text-xs">{err}</div>
                ))}
                {extractionResults.errors.length > 3 && (
                  <div className="text-green-600 text-xs">...and {extractionResults.errors.length - 3} more</div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  </div>
)
}