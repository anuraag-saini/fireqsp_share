// components/AdminDebugPanel.tsx
'use client'

import { useState } from 'react'

export function AdminDebugPanel() {
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  const testEndpoint = async (endpoint: string) => {
    setLoading(true)
    setError(null)
    setResults(null)

    try {
      const response = await fetch(`/api/admin/${endpoint}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Request failed')
      }

      setResults(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  const buttonClass = "px-4 py-2 bg-white border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"

  return (
    <div className="p-6 bg-white border rounded-lg">
      <h3 className="text-lg font-semibold mb-4">🔧 Admin API Debug Panel</h3>
      
      <div className="space-y-4">
        <div className="flex gap-2">
          <button
            onClick={() => testEndpoint('stats')}
            disabled={loading}
            className={buttonClass}
          >
            Test Stats API
          </button>
          
          <button
            onClick={() => testEndpoint('users')}
            disabled={loading}
            className={buttonClass}
          >
            Test Users API
          </button>
          
          <button
            onClick={() => testEndpoint('activity')}
            disabled={loading}
            className={buttonClass}
          >
            Test Activity API
          </button>
        </div>

        {loading && (
          <div className="text-blue-600">Loading...</div>
        )}

        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-700 font-medium">Error:</p>
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        )}

        {results && (
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-green-700 font-medium mb-2">API Response:</p>
            <pre className="text-xs text-green-600 overflow-auto max-h-96">
              {JSON.stringify(results, null, 2)}
            </pre>
          </div>
        )}
      </div>

      <div className="mt-6 p-4 bg-gray-50 rounded-lg">
        <h4 className="font-medium mb-2">Current Database Info:</h4>
        <ul className="text-sm text-gray-600 space-y-1">
          <li>• 3 users in user_subscriptions table</li>
          <li>• Multiple extractions in extractions table</li>
          <li>• Admin activities table is empty (will be populated from other tables)</li>
          <li>• Your admin email: asaini.anuraags@gmail.com</li>
        </ul>
      </div>
    </div>
  )
}