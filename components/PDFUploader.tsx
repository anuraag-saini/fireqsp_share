'use client'

import { useState } from 'react'
import { useUser } from '@clerk/nextjs'
import { Upload, File, X, Loader2 } from 'lucide-react'

interface UploadedFile {
  file: File
  id: string
}

interface PDFUploaderProps {
  onExtractionComplete?: (results: any) => void
}

export function PDFUploader({ onExtractionComplete }: PDFUploaderProps) {
  const { user } = useUser()
  const [files, setFiles] = useState<UploadedFile[]>([])
  const [isExtracting, setIsExtracting] = useState(false)
  const [extractionResults, setExtractionResults] = useState<any>(null)
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

    try {
      const formData = new FormData()
      files.forEach(({ file }) => {
        formData.append('files', file)
      })
      
      if (user?.emailAddresses[0]?.emailAddress) {
        formData.append('userEmail', user.emailAddresses[0].emailAddress)
      }

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

      {/* File Upload Area */}
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
              disabled={isExtracting}
            />
          </label>
        </div>
        <p className="text-sm text-gray-500">PDF files only, up to 10MB each</p>
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
                  disabled={isExtracting}
                  className="text-gray-400 hover:text-red-500 disabled:opacity-50"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Extract Button */}
      <div className="flex gap-4">
        <button
          onClick={handleExtraction}
          disabled={files.length === 0 || isExtracting}
          className="flex items-center px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          {isExtracting ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Extracting...
            </>
          ) : (
            'Extract Interactions'
          )}
        </button>
        
        {files.length > 0 && (
          <button
            onClick={() => setFiles([])}
            disabled={isExtracting}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded hover:bg-gray-50 disabled:opacity-50"
          >
            Clear All
          </button>
        )}
      </div>

      {/* Error Display */}
      {error && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}

      {/* Success Display */}
      {extractionResults && (
        <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-green-700 font-medium">✅ Extraction Complete!</p>
          <p className="text-green-600 text-sm mt-1">
            Found {extractionResults.interactions?.length || 0} interactions from {files.length} files
          </p>
        </div>
      )}
    </div>
  )
} 
