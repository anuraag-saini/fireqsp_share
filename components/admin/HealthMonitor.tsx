'use client'

import { useEffect, useState } from 'react'
import { Activity, Server, Clock, CheckCircle, XCircle, AlertCircle, RefreshCw } from 'lucide-react'

interface HealthData {
  status: 'healthy' | 'unhealthy'
  timestamp: string
  uptime: number
  responseTime?: number
  system?: {
    nodeVersion: string
    platform: string
    environment: string
    memory: {
      used: number
      total: number
      external: number
    }
    pid: number
  }
  services?: {
    api: string
    database: string
  }
}

export function HealthMonitor() {
  const [healthData, setHealthData] = useState<HealthData | null>(null)
  const [loading, setLoading] = useState(false)
  const [lastChecked, setLastChecked] = useState<Date | null>(null)
  const [autoRefresh, setAutoRefresh] = useState(true)

  const checkHealth = async () => {
    setLoading(true)
    const startTime = Date.now()
    
    try {
      const response = await fetch('/api/health')
      const responseTime = Date.now() - startTime
      
      if (response.ok) {
        const data = await response.json()
        setHealthData({
          ...data,
          responseTime
        })
      } else {
        setHealthData({
          status: 'unhealthy',
          timestamp: new Date().toISOString(),
          uptime: 0,
          responseTime
        })
      }
      
      setLastChecked(new Date())
    } catch (error) {
      console.error('Health check failed:', error)
      setHealthData({
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        uptime: 0,
        responseTime: Date.now() - startTime
      })
      setLastChecked(new Date())
    } finally {
      setLoading(false)
    }
  }

  // Initial health check
  useEffect(() => {
    checkHealth()
  }, [])

  // Auto-refresh every 30 seconds
  useEffect(() => {
    if (!autoRefresh) return

    const interval = setInterval(checkHealth, 30000)
    return () => clearInterval(interval)
  }, [autoRefresh])

  const formatUptime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = Math.floor(seconds % 60)
    
    if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`
    } else {
      return `${secs}s`
    }
  }

  const formatResponseTime = (ms: number) => {
    if (ms < 1000) {
      return `${ms}ms`
    } else {
      return `${(ms / 1000).toFixed(2)}s`
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'text-green-600'
      case 'unhealthy':
        return 'text-red-600'
      default:
        return 'text-yellow-600'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="h-5 w-5 text-green-600" />
      case 'unhealthy':
        return <XCircle className="h-5 w-5 text-red-600" />
      default:
        return <AlertCircle className="h-5 w-5 text-yellow-600" />
    }
  }

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'bg-green-100 text-green-800'
      case 'unhealthy':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-yellow-100 text-yellow-800'
    }
  }

  return (
    <div className="bg-white rounded-lg border p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Activity className="h-6 w-6 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-900">System Health</h3>
        </div>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-2 text-sm text-gray-600">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            Auto-refresh
          </label>
          <button
            onClick={checkHealth}
            disabled={loading}
            className="p-2 text-gray-400 hover:text-gray-600 disabled:opacity-50"
            title="Refresh health status"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {healthData ? (
        <div className="space-y-4">
          {/* Overall Status */}
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-3">
              {getStatusIcon(healthData.status)}
              <div>
                <h4 className="font-medium text-gray-900">System Status</h4>
                <p className="text-sm text-gray-600">
                  Last checked: {lastChecked?.toLocaleTimeString() || 'Never'}
                </p>
              </div>
            </div>
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusBadgeColor(healthData.status)}`}>
              {healthData.status === 'healthy' ? 'Healthy' : 'Unhealthy'}
            </span>
          </div>

          {/* Metrics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Uptime */}
            <div className="p-4 border rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-medium text-gray-700">Uptime</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">
                {formatUptime(healthData.uptime)}
              </p>
            </div>

            {/* Response Time */}
            <div className="p-4 border rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Server className="h-4 w-4 text-green-600" />
                <span className="text-sm font-medium text-gray-700">Response Time</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">
                {healthData.responseTime ? formatResponseTime(healthData.responseTime) : 'N/A'}
              </p>
            </div>

            {/* Status */}
            <div className="p-4 border rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Activity className="h-4 w-4 text-purple-600" />
                <span className="text-sm font-medium text-gray-700">Status</span>
              </div>
              <p className={`text-2xl font-bold ${
                healthData.status === 'healthy' ? 'text-green-600' : 'text-red-600'
              }`}>
                {healthData.status === 'healthy' ? 'Healthy' : 'Issues'}
              </p>
            </div>
          </div>

          {/* Services Status */}
          {healthData.services && (
            <div className="p-4 bg-gray-50 rounded-lg">
              <h5 className="font-medium text-gray-900 mb-3">Services</h5>
              <div className="grid grid-cols-2 gap-6">
                {Object.entries(healthData.services).map(([service, status]) => (
                  <div key={service} className="flex items-center justify-between">
                    <span className="text-sm text-gray-700 capitalize">{service}</span>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      status === 'healthy' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {status === 'healthy' ? '✓' : '✗'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="flex items-center justify-center p-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading health status...</p>
          </div>
        </div>
      )}
    </div>
  )
}
