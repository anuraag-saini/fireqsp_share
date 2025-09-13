'use client'

import { useEffect, useState } from 'react'
import { CheckCircle, XCircle, AlertCircle } from 'lucide-react'

interface SystemStatus {
  status: 'healthy' | 'unhealthy' | 'unknown'
  responseTime?: number
}

export function SystemStatusIndicator() {
  const [status, setStatus] = useState<SystemStatus>({ status: 'unknown' })

  useEffect(() => {
    const checkStatus = async () => {
      const startTime = Date.now()
      try {
        const response = await fetch('/api/health')
        const responseTime = Date.now() - startTime
        
        if (response.ok) {
          const data = await response.json()
          setStatus({
            status: data.status === 'healthy' ? 'healthy' : 'unhealthy',
            responseTime
          })
        } else {
          setStatus({ status: 'unhealthy', responseTime })
        }
      } catch (error) {
        setStatus({ status: 'unhealthy', responseTime: Date.now() - startTime })
      }
    }

    checkStatus()
    // Check every 60 seconds
    const interval = setInterval(checkStatus, 60000)
    return () => clearInterval(interval)
  }, [])

  const getStatusConfig = () => {
    switch (status.status) {
      case 'healthy':
        return {
          icon: <CheckCircle className="h-4 w-4 text-green-600" />,
          text: 'Healthy',
          bgColor: 'bg-green-100',
          textColor: 'text-green-800'
        }
      case 'unhealthy':
        return {
          icon: <XCircle className="h-4 w-4 text-red-600" />,
          text: 'Issues',
          bgColor: 'bg-red-100',
          textColor: 'text-red-800'
        }
      default:
        return {
          icon: <AlertCircle className="h-4 w-4 text-yellow-600" />,
          text: 'Checking',
          bgColor: 'bg-yellow-100',
          textColor: 'text-yellow-800'
        }
    }
  }

  const config = getStatusConfig()

  return (
    <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${config.bgColor} ${config.textColor}`}>
      {config.icon}
      <span>{config.text}</span>
      {status.responseTime && (
        <span className="ml-1 opacity-75">
          ({status.responseTime}ms)
        </span>
      )}
    </div>
  )
}
