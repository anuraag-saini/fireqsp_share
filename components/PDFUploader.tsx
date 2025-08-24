'use client'

import { useState, useEffect } from 'react'
import { useUser } from '@clerk/nextjs'
import { Upload, File, X, Loader2, CheckCircle, AlertCircle, Paperclip } from 'lucide-react'
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
}

interface PDFUploaderProps {
  onExtractionComplete?: (results: ExtractionResults) => void
}



export function PDFUploader({ onExtractionComplete }: PDFUploaderProps) {
  const { user } = useUser()
  const [userLimits, setUserLimits] = useState<any>(null)
  const [files, setFiles] = useState<UploadedFile[]>([])
  const [diseaseType, setDiseaseType] = useState<string>('Others')
  const [isExtracting, setIsExtracting] = useState(false)
  const [extractionResults, setExtractionResults] = useState<ExtractionResults | null>(null)
  const [error, setError] = useState<string | null>(null)

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

  const handleExtraction = async () => {
    if (files.length === 0) return

    // Simple limit check
    if (!userLimits?.canUpload) {
      setError('Extractions limit reached. Please upgrade your plan.')
      return
    }

    // File size validation
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

    try {
      const formData = new FormData()
      files.forEach(({ file }) => {
        formData.append('files', file)
      })
      
      if (user?.emailAddresses[0]?.emailAddress) {
        formData.append('userEmail', user.emailAddresses[0].emailAddress)
      }
      formData.append('diseaseType', diseaseType)

      const response = await fetch('/api/extract', {
        method: 'POST',
        body: formData
      })

      if (!response.ok) {
        if (response.status === 413) {
          throw new Error('Files too large. Try smaller PDF files or fewer files.')
        }
        throw new Error('Extraction failed')
      }

      const results = await response.json()
      setExtractionResults(results)
      onExtractionComplete?.(results)

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Extraction failed')
    } finally {
      setIsExtracting(false)
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
      <div className="max-w-2xl w-full bg-white border rounded-xl overflow-hidden" style={{ borderColor: brandConfig.colors.secondary[200] }}>
        {/* Chat Header */}
        <div className="px-5 py-4 border-b text-center" style={{ 
          borderColor: brandConfig.colors.secondary[100], 
          backgroundColor: brandConfig.colors.secondary[50] 
        }}>
          <div className="text-sm font-medium" style={{ color: brandConfig.colors.secondary[600] }}>🔥 FireQSP</div>
        </div>
      
      <div className="p-5">
        
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

        {/* Loading State */}
        {isExtracting && (
          <div className="flex items-center gap-3 p-3 bg-blue-50 border border-blue-200 rounded-3xl">
            <div className="animate-spin rounded-full h-8 w-8 border-b-3 border-blue-600"></div>
            <div className="text-blue-700 text-sm font-medium">
              Processing {files.length} file{files.length !== 1 ? 's' : ''}... 
              <p className="text-gray-600">This may take a few minutes</p>
              <p className="text-gray-600">You may leave and come back later</p>
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
        {extractionResults && (
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