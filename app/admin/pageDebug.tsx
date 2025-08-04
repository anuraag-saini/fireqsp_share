// app/admin/page.tsx - Simple debug version
'use client'

import { useEffect, useState } from 'react'
import { useUser } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'

const ADMIN_EMAILS = [
  'asaini.anuraags@gmail.com',
  'admin@fireqsp.com'
]

export default function AdminPage() {
  const { user, isLoaded } = useUser()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [activeEndpoint, setActiveEndpoint] = useState<string>('')

  useEffect(() => {
    if (isLoaded && (!user || !ADMIN_EMAILS.includes(user.emailAddresses[0]?.emailAddress || ''))) {
      router.push('/dashboard')
    }
  }, [user, isLoaded, router])

  const testEndpoint = async (endpoint: string) => {
    setLoading(true)
    setError(null)
    setResults(null)
    setActiveEndpoint(endpoint)

    try {
      console.log(`Testing /api/admin/${endpoint}`)
      
      const response = await fetch(`/api/admin/${endpoint}`)
      const data = await response.json()

      console.log('Response status:', response.status)
      console.log('Response data:', data)

      if (!response.ok) {
        throw new Error(data.error || `HTTP ${response.status}`)
      }

      setResults(data)
    } catch (err) {
      console.error('API Error:', err)
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  if (!isLoaded) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    )
  }

  if (!user || !ADMIN_EMAILS.includes(user.emailAddresses[0]?.emailAddress || '')) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <h2 className="text-red-800 font-semibold">Access Denied</h2>
          <p className="text-red-600">You don't have admin access.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 px-4">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">🔥 FireQSP Admin Debug</h1>
            <p className="text-gray-600">Testing admin API endpoints</p>
          </div>
          <div className="text-right text-sm text-gray-500">
            <p>Admin: {user.emailAddresses[0]?.emailAddress}</p>
          </div>
        </div>
      </div>

      {/* Test Buttons */}
      <div className="bg-white border rounded-lg p-6 mb-6">
        <h3 className="text-lg font-semibold mb-4">🔧 API Endpoint Tests</h3>
        
        <div className="flex gap-4 mb-6">
          <button
            onClick={() => testEndpoint('stats')}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {loading && activeEndpoint === 'stats' ? 'Testing...' : 'Test Stats API'}
          </button>
          
          <button
            onClick={() => testEndpoint('users')}
            disabled={loading}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {loading && activeEndpoint === 'users' ? 'Testing...' : 'Test Users API'}
          </button>
          
          <button
            onClick={() => testEndpoint('activity')}
            disabled={loading}
            className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {loading && activeEndpoint === 'activity' ? 'Testing...' : 'Test Activity API'}
          </button>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex items-center gap-2 text-blue-600 mb-4">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
            <span>Testing {activeEndpoint} endpoint...</span>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg mb-4">
            <p className="text-red-700 font-medium">❌ Error:</p>
            <p className="text-red-600 text-sm">{error}</p>
            <p className="text-red-500 text-xs mt-2">Check the browser console for more details</p>
          </div>
        )}

        {/* Success Results */}
        {results && (
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-green-700 font-medium mb-2">✅ API Response from /{activeEndpoint}:</p>
            <div className="bg-white border rounded p-3 max-h-96 overflow-auto">
              <pre className="text-xs text-gray-800">
                {JSON.stringify(results, null, 2)}
              </pre>
            </div>
          </div>
        )}
      </div>

      {/* Database Info */}
      <div className="bg-gray-50 border rounded-lg p-6">
        <h4 className="font-semibold mb-3">📊 Current Database Status</h4>
        <div className="grid md:grid-cols-2 gap-4 text-sm">
          <div>
            <h5 className="font-medium text-gray-700 mb-2">Tables Found:</h5>
            <ul className="space-y-1 text-gray-600">
              <li>✅ user_subscriptions (3 users)</li>
              <li>✅ user_usage (3 records)</li>
              <li>✅ extractions (11+ records)</li>
              <li>⚪ admin_activities (empty - populated from other tables)</li>
            </ul>
          </div>
          <div>
            <h5 className="font-medium text-gray-700 mb-2">API Endpoints:</h5>
            <ul className="space-y-1 text-gray-600">
              <li>/api/admin/stats - System statistics</li>
              <li>/api/admin/users - User management</li>
              <li>/api/admin/activity - Activity feed</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Instructions */}
      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-medium text-blue-800 mb-2">🎯 Next Steps:</h4>
        <ol className="text-sm text-blue-700 space-y-1">
          <li>1. Test each API endpoint using the buttons above</li>
          <li>2. Check the browser console (F12) for detailed logs</li>
          <li>3. Verify the responses match your Supabase data</li>
          <li>4. Once APIs work, we'll build the full admin interface</li>
        </ol>
      </div>
    </div>
  )
}