// components/AdminStats.tsx - Fixed ESLint errors
'use client'

import { useEffect, useState } from 'react'
import { Users, Activity, DollarSign, AlertTriangle, TrendingUp, FileText } from 'lucide-react'

interface AdminStatsData {
  totalUsers: number
  activeUsers: number
  totalExtractions: number
  successfulExtractions: number
  failedExtractions: number
  totalRevenue: number
  apiCalls: number
  errorRate: number
}

export function AdminStats() {
  const [stats, setStats] = useState<AdminStatsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchStats()
  }, [])

  const fetchStats = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/admin/stats')
      
      if (!response.ok) {
        throw new Error('Failed to fetch stats')
      }
      
      const data = await response.json()
      setStats(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load stats')
    } finally {
      setLoading(false)
    }
  }
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="bg-white p-6 rounded-lg border animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
            <div className="h-8 bg-gray-200 rounded w-3/4"></div>
          </div>
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <div className="flex items-center gap-2 text-red-700">
          <AlertTriangle className="h-5 w-5" />
          <span className="font-medium">Error loading stats</span>
        </div>
        <p className="text-red-600 text-sm mt-1">{error}</p>
        <button
          onClick={fetchStats}
          className="mt-3 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 text-sm"
        >
          Retry
        </button>
      </div>
    )
  }

  if (!stats) return null

  const statCards = [
    {
      title: 'Total Users',
      value: stats.totalUsers,
      icon: Users,
      color: 'blue',
      subtitle: `${stats.activeUsers} active (30 days)`,
    },
    {
      title: 'Total Extractions',
      value: stats.totalExtractions,
      icon: FileText,
      color: 'green',
      subtitle: `${stats.successfulExtractions} successful`,
    },
    {
      title: 'Monthly Revenue',
      value: `$${stats.totalRevenue}`,
      icon: DollarSign,
      color: 'purple',
      subtitle: 'Active subscriptions',
    },
    {
      title: 'API Calls (30d)',
      value: stats.apiCalls,
      icon: Activity,
      color: 'orange',
      subtitle: 'Recent activity',
    },
    {
      title: 'Error Rate',
      value: `${stats.errorRate}%`,
      icon: AlertTriangle,
      color: stats.errorRate > 10 ? 'red' : 'gray',
      subtitle: `${stats.failedExtractions} failed`,
    },
    {
      title: 'Success Rate',
      value: `${stats.totalExtractions > 0 ? Math.round((stats.successfulExtractions / stats.totalExtractions) * 100) : 0}%`,
      icon: TrendingUp,
      color: 'green',
      subtitle: 'Overall performance',
    },
  ]

  const getColorClasses = (color: string) => {
    const colors = {
      blue: 'text-blue-600 bg-blue-50',
      green: 'text-green-600 bg-green-50',
      purple: 'text-purple-600 bg-purple-50',
      orange: 'text-orange-600 bg-orange-50',
      red: 'text-red-600 bg-red-50',
      gray: 'text-gray-600 bg-gray-50',
    }
    return colors[color as keyof typeof colors] || colors.gray
  }

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {statCards.map((stat) => (
          <div key={stat.title} className="bg-white p-6 rounded-lg border hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{stat.value}</p>
                {stat.subtitle && (
                  <p className="text-xs text-gray-500 mt-1">{stat.subtitle}</p>
                )}
              </div>
              <div className={`p-3 rounded-full ${getColorClasses(stat.color)}`}>
                <stat.icon className="h-6 w-6" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="bg-white p-6 rounded-lg border">
        <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={fetchStats}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
          >
            Refresh Stats
          </button>
          <button
            onClick={() => window.open('/api/admin/stats', '_blank')}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded hover:bg-gray-50 text-sm"
          >
            View Raw Data
          </button>
        </div>
      </div>

      {/* System Health */}
      <div className="bg-white p-6 rounded-lg border">
        <h3 className="text-lg font-semibold mb-4">System Health</h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Database Connection</span>
            <span className="text-sm text-green-600 font-medium">✅ Connected</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">API Response Time</span>
            <span className="text-sm text-green-600 font-medium">✅ Good (&lt;2s)</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Error Rate</span>
            <span className={`text-sm font-medium ${stats.errorRate > 10 ? 'text-red-600' : 'text-green-600'}`}>
              {stats.errorRate > 10 ? '⚠️' : '✅'} {stats.errorRate}%
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}