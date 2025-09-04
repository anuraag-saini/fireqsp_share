// components/AdminActivity.tsx - Updated for 4 status types
'use client'

import { useEffect, useState } from 'react'
import { Activity, User, AlertCircle, CheckCircle, Clock, RefreshCw, AlertTriangle } from 'lucide-react'

interface ActivityItem {
  id: string
  userId: string
  userEmail: string
  action: string
  details: string
  status?: string
  title: string
  timestamp: string
}

export function AdminActivity() {
  const [activities, setActivities] = useState<ActivityItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchActivity()
    
    // Auto-refresh every 30 seconds
    const interval = window.setInterval(fetchActivity, 30000)
    return () => window.clearInterval(interval)
  }, [])

  const fetchActivity = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/admin/activity')
      
      if (!response.ok) {
        throw new Error('Failed to fetch activity')
      }
      
      const data = await response.json()
      setActivities(data.activities || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load activity')
    } finally {
      setLoading(false)
    }
  }

  const getActivityIcon = (action: string, status?: string) => {
    if (action.includes('Registration')) {
      return <User className="h-5 w-5 text-blue-600" />
    }
    
    if (action.includes('Extraction')) {
      switch (status) {
        case 'completed':
          return <CheckCircle className="h-5 w-5 text-green-600" />
        case 'failed':
          return <AlertCircle className="h-5 w-5 text-red-600" />
        case 'partial':
          return <AlertTriangle className="h-5 w-5 text-orange-600" />
        case 'processing':
        default:
          return <Clock className="h-5 w-5 text-yellow-600" />
      }
    }
    
    return <Activity className="h-5 w-5 text-gray-600" />
  }

  const getActivityBadgeColor = (action: string, status?: string) => {
    if (action.includes('Registration')) {
      return 'bg-blue-100 text-blue-700'
    }
    
    if (action.includes('Extraction')) {
      switch (status) {
        case 'completed':
          return 'bg-green-100 text-green-700'
        case 'failed':
          return 'bg-red-100 text-red-700'
        case 'partial':
          return 'bg-orange-100 text-orange-700'
        case 'processing':
        default:
          return 'bg-yellow-100 text-yellow-700'
      }
    }
    
    return 'bg-gray-100 text-gray-700'
  }

  const getStatusBadge = (status?: string) => {
    if (!status) return null

    const statusLabels = {
      completed: { label: 'Completed', color: 'bg-green-100 text-green-700' },
      failed: { label: 'Failed', color: 'bg-red-100 text-red-700' },
      partial: { label: 'Partial', color: 'bg-orange-100 text-orange-700' },
      processing: { label: 'Processing', color: 'bg-yellow-100 text-yellow-700' }
    }

    const statusInfo = statusLabels[status as keyof typeof statusLabels]
    if (!statusInfo) return null

    return (
      <span className={`inline-block px-2 py-1 text-xs font-medium rounded-full ${statusInfo.color}`}>
        {statusInfo.label}
      </span>
    )
  }

  const formatTimeAgo = (timestamp: string) => {
    const now = new Date()
    const time = new Date(timestamp)
    const diffInMinutes = Math.floor((now.getTime() - time.getTime()) / (1000 * 60))
    
    if (diffInMinutes < 1) return 'Just now'
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`
    
    const diffInHours = Math.floor(diffInMinutes / 60)
    if (diffInHours < 24) return `${diffInHours}h ago`
    
    const diffInDays = Math.floor(diffInHours / 24)
    if (diffInDays < 7) return `${diffInDays}d ago`
    
    return time.toLocaleDateString()
  }

  if (loading && activities.length === 0) {
    return (
      <div className="bg-white rounded-lg border">
        <div className="p-6 border-b">
          <div className="h-6 bg-gray-200 rounded w-1/4 animate-pulse"></div>
        </div>
        <div className="p-6 space-y-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="flex items-start space-x-4 animate-pulse">
              <div className="h-10 w-10 bg-gray-200 rounded-full"></div>
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <p className="text-red-700 font-medium">Error loading activity</p>
        <p className="text-red-600 text-sm mt-1">{error}</p>
        <button
          onClick={fetchActivity}
          className="mt-3 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 text-sm"
        >
          Retry
        </button>
      </div>
    )
  }

  // Calculate stats for header
  const stats = activities.reduce((acc, activity) => {
    if (activity.action.includes('Extraction')) {
      switch (activity.status) {
        case 'completed':
          acc.completed++
          break
        case 'failed':
          acc.failed++
          break
        case 'partial':
          acc.partial++
          break
        case 'processing':
          acc.processing++
          break
      }
    } else if (activity.action.includes('Registration')) {
      acc.registrations++
    }
    return acc
  }, { completed: 0, failed: 0, partial: 0, processing: 0, registrations: 0 })

  return (
    <div className="bg-white rounded-lg border">
      {/* Header with Stats */}
      <div className="p-6 border-b">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Recent Activity</h2>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-500">
              {activities.length} activities
            </span>
            <button
              onClick={fetchActivity}
              disabled={loading}
              className="p-2 text-gray-400 hover:text-gray-600 disabled:opacity-50"
              title="Refresh"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-6 gap-2 text-center">
          <div className="bg-green-50 p-2 rounded">
            <div className="text-xs text-green-600 font-medium">Completed</div>
            <div className="text-lg font-bold text-green-900">{stats.completed}</div>
          </div>
          <div className="bg-orange-50 p-2 rounded">
            <div className="text-xs text-orange-600 font-medium">Partial</div>
            <div className="text-lg font-bold text-orange-900">{stats.partial}</div>
          </div>
          <div className="bg-yellow-50 p-2 rounded">
            <div className="text-xs text-yellow-600 font-medium">Processing</div>
            <div className="text-lg font-bold text-yellow-900">{stats.processing}</div>
          </div>
          <div className="bg-red-50 p-2 rounded">
            <div className="text-xs text-red-600 font-medium">Failed</div>
            <div className="text-lg font-bold text-red-900">{stats.failed}</div>
          </div>
          <div className="bg-blue-50 p-2 rounded">
            <div className="text-xs text-blue-600 font-medium">Registrations</div>
            <div className="text-lg font-bold text-blue-900">{stats.registrations}</div>
          </div>
          <div className="bg-gray-50 p-2 rounded">
            <div className="text-xs text-gray-600 font-medium">Total</div>
            <div className="text-lg font-bold text-gray-900">{activities.length}</div>
          </div>
        </div>
      </div>

      {/* Activity Feed */}
      <div className="max-h-96 overflow-y-auto">
        {activities.length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            <Activity className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p>No recent activity</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {activities.map((activity) => (
              <div key={activity.id} className="p-6 hover:bg-gray-50">
                <div className="flex items-start space-x-4">
                  {/* Icon */}
                  <div className="flex-shrink-0 mt-1">
                    {getActivityIcon(activity.action, activity.status)}
                  </div>
                  
                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className={`inline-block px-2 py-1 text-xs font-medium rounded-full ${getActivityBadgeColor(activity.action, activity.status)}`}>
                        {activity.action}
                      </span>
                      {activity.action.includes('Extraction') && getStatusBadge(activity.status)}
                      <span className="text-xs text-gray-500">
                        {formatTimeAgo(activity.timestamp)}
                      </span>
                    </div>
                    
                    <div className="text-sm text-gray-900 mb-1">
                      <span className="font-medium">{activity.userEmail}</span>
                      {activity.title && activity.title !== 'User Registration' && activity.title !== 'Processing...' && (
                        <span className="text-gray-600"> • {activity.title}</span>
                      )}
                    </div>
                    
                    <p className="text-sm text-gray-600">{activity.details}</p>
                  </div>
                  
                  {/* Timestamp */}
                  <div className="flex-shrink-0 text-xs text-gray-400">
                    {new Date(activity.timestamp).toLocaleTimeString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      {activities.length > 0 && (
        <div className="p-4 border-t bg-gray-50 text-center">
          <p className="text-xs text-gray-500">
            Auto-refreshes every 30 seconds • Last updated: {new Date().toLocaleTimeString()}
          </p>
        </div>
      )}
    </div>
  )
}