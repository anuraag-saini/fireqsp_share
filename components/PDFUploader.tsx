'use client'

import { useState } from 'react'
import { useUser } from '@clerk/nextjs'
import { Upload, File, X, Loader2, CheckCircle, AlertCircle } from 'lucide-react'

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
  const [files, setFiles] = useState<UploadedFile[]>([])
  const [diseaseType, setDiseaseType] = useState<string>('Others')
  const [isExtracting, setIsExtracting] = useState(false)
  const [extractionResults, setExtractionResults] = useState<ExtractionResults | null>(null)
  const [error, setError] = useState<string | null>(null)

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
    <div className="bg-white border rounded-lg p-6">
      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-2">📄 PDF Upload & Extraction</h2>
        <p className="text-gray-600">Upload scientific PDFs to extract biological interactions</p>
      </div>

      {/* Show upload interface when not extracting */}
      {!isExtracting && (
        <>
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center mb-4 hover:border-blue-400 transition-colors">
            <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <div className="mb-4">
              <label className="cursor-pointer">
                <span className="text-blue-600 hover:text-blue-700 font-medium">
                  Click to upload PDFs
                </span>
                <span className="text-gray-600"> or drag and drop</span>
                <input
                  type="file"
                  multiple
                  accept=".pdf"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>
            </div>
            <p className="text-sm text-gray-500">PDF files only</p>
          </div>

          {/* File List */}
          {files.length > 0 && (
            <div className="mb-6">
              <h3 className="font-medium mb-3">Uploaded Files ({files.length})</h3>
              <div className="space-y-2">
                {files.map(({ file, id }) => (
                  <div key={id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center">
                      <File className="h-5 w-5 text-blue-600 mr-3" />
                      <div>
                        <p className="font-medium text-sm">{file.name}</p>
                        <p className="text-xs text-gray-500">{formatFileSize(file.size)}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => removeFile(id)}
                      className="text-gray-400 hover:text-red-500"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Disease Type
            </label>
            <select
              value={diseaseType}
              onChange={(e) => setDiseaseType(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="Others">Others</option>
              <option value="Diabetes">Diabetes</option>
              <option value="IBD-UC">IBD - Ulcerative Colitis</option>
              <option value="IBD-CD">IBD - Crohn's Disease</option>
            </select>
          </div>

          {/* Extract Button */}
          <div className="flex gap-4">
            <button
              onClick={handleExtraction}
              disabled={files.length === 0}
              className="flex items-center px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              Extract Interactions
            </button>
            
            {files.length > 0 && (
              <button
                onClick={() => setFiles([])}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded hover:bg-gray-50"
              >
                Clear All
              </button>
            )}
          </div>
        </>
      )}

      {/* Simple Loading State */}
      {isExtracting && (
        <div className="text-center py-12">
          <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">Processing Your Files</h3>
          <p className="text-gray-600">This may take a few minutes...</p>
          <p className="text-sm text-gray-500 mt-2">Analyzing {files.length} file(s) for biological interactions</p>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center">
            <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
            <p className="text-red-700 text-sm font-medium">Extraction Failed</p>
          </div>
          <p className="text-red-600 text-sm mt-1">{error}</p>
          <button
            onClick={() => {
              setError(null)
              setExtractionResults(null)
            }}
            className="mt-2 px-3 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200"
          >
            Try Again
          </button>
        </div>
      )}

      {/* Success Display */}
      {extractionResults && (
        <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center mb-2">
            <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
            <p className="text-green-700 font-medium">
              {extractionResults.message === 'No interactions found' 
                ? 'Processing Complete - No Interactions Found' 
                : 'Extraction Complete!'}
            </p>
          </div>
          
          {extractionResults.message === 'No interactions found' ? (
            <p className="text-green-600 text-sm">
              No biological interactions were found in the uploaded files. Try uploading different documents or check if the content contains biological mechanisms.
            </p>
          ) : (
            <p className="text-green-600 text-sm">
              Found {extractionResults.interactions?.length || 0} interactions from {files.length} files
            </p>
          )}
          
          {extractionResults.errors && extractionResults.errors.length > 0 && (
            <div className="mt-3 pt-3 border-t border-green-200">
              <p className="text-green-700 text-sm font-medium mb-1">Warnings:</p>
              {extractionResults.errors.slice(0, 3).map((err: string, idx: number) => (
                <p key={idx} className="text-green-600 text-xs">{err}</p>
              ))}
              {extractionResults.errors.length > 3 && (
                <p className="text-green-600 text-xs">...and {extractionResults.errors.length - 3} more</p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}