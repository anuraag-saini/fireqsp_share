// app/admin/page.tsx - Fixed admin dashboard with working settings
'use client'

import { useEffect, useState } from 'react'
import { useUser } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import { AdminStats } from '@/components/AdminStats'
import { AdminUsers } from '@/components/AdminUsers'
import { AdminActivity } from '@/components/AdminActivity'
import { HealthMonitor } from '@/components/admin/HealthMonitor'
import { SystemStatusIndicator } from '@/components/admin/SystemStatusIndicator'
import { Flame, TrendingUp, Users, Activity, Settings } from 'lucide-react'

const ADMIN_EMAILS = [
  'asaini.anuraags@gmail.com',
  'admin@fireqsp.com'
]

export default function AdminPage() {
  const { user, isLoaded } = useUser()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'activity' | 'settings'>('overview')

  const [processingJobs, setProcessingJobs] = useState<any[] | null>(null)
  
  // Settings state
  const [openaiModel, setOpenaiModel] = useState('gpt-4o-mini')
  const [availableModels, setAvailableModels] = useState<string[]>([])
  const [grantEmail, setGrantEmail] = useState('')
  const [grantPlan, setGrantPlan] = useState('pro')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [systemInfo, setSystemInfo] = useState<any>(null)

  useEffect(() => {
    if (isLoaded && (!user || !ADMIN_EMAILS.includes(user.emailAddresses[0]?.emailAddress || ''))) {
      router.push('/dashboard')
    }
  }, [user, isLoaded, router])

  // Load settings when switching to settings tab
  useEffect(() => {
    if (activeTab === 'settings') {
      loadSettings()
    }
  }, [activeTab])

  const loadSettings = async () => {
    try {
      const [settingsResponse, healthResponse] = await Promise.all([
        fetch('/api/admin/settings'),
        fetch('/api/health')
      ])
      
      if (settingsResponse.ok) {
        const data = await settingsResponse.json()
        setOpenaiModel(data.openai_model || 'gpt-4o-mini')
        setAvailableModels(data.available_models || [])
      }
      
      if (healthResponse.ok) {
        const healthData = await healthResponse.json()
        setSystemInfo(healthData.system)
      }
    } catch (error) {
      console.error('Failed to load settings:', error)
    }
  }

  const saveModelSettings = async () => {
    setLoading(true)
    setMessage('')
    
    try {
      const response = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ openai_model: openaiModel })
      })
      
      if (response.ok) {
        setMessage('✅ Model settings saved successfully!')
      } else {
        setMessage('❌ Failed to save model settings')
      }
    } catch (error) {
      setMessage('❌ Error saving settings')
    } finally {
      setLoading(false)
      // Clear message after 3 seconds
      setTimeout(() => setMessage(''), 3000)
    }
  }

  const grantUserAccess = async () => {
    if (!grantEmail.trim()) {
      setMessage('❌ Please enter an email address')
      return
    }

    if (!grantEmail.includes('@')) {
      setMessage('❌ Please enter a valid email address')
      return
    }

    setLoading(true)
    setMessage('')
    
    try {
      // First, we need to find the user by email using Clerk
      // Since we don't have direct access to Clerk users from frontend,
      // we'll pass the email to the backend and let it handle the lookup
      const response = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: 'grant_access_by_email',
          userEmail: grantEmail.trim(),
          planType: grantPlan
        })
      })
      
      if (response.ok) {
        setMessage(`✅ Access granted to ${grantEmail} (${grantPlan} plan)`)
        setGrantEmail('')
      } else {
        const error = await response.json()
        setMessage(`❌ ${error.error || 'Failed to grant access'}`)
      }
    } catch (error) {
      setMessage('❌ Error granting access')
    } finally {
      setLoading(false)
      // Clear message after 5 seconds
      setTimeout(() => setMessage(''), 5000)
    }
  }

  const loadProcessingJobs = async () => {
    setLoading(true)
    setMessage('')
    
    try {
      const response = await fetch('/api/admin/cleanup-stuck-jobs')
      if (response.ok) {
        const result = await response.json()
        setProcessingJobs(result.jobs)
        if (result.count === 0) {
          setMessage('✅ No processing jobs found')
        }
      } else {
        setMessage('❌ Failed to load processing jobs')
      }
    } catch (error) {
      setMessage('❌ Error loading jobs')
    } finally {
      setLoading(false)
      setTimeout(() => setMessage(''), 3000)
    }
  }

  const killSpecificJob = async (jobId: string) => {
    if (!confirm('Are you sure you want to kill this job?')) {
      return
    }

    setLoading(true)
    try {
      const response = await fetch('/api/admin/cleanup-stuck-jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId })
      })
      
      if (response.ok) {
        setMessage('✅ Job killed successfully!')
        // Refresh the list
        loadProcessingJobs()
      } else {
        setMessage('❌ Failed to kill job')
      }
    } catch (error) {
      setMessage('❌ Error killing job')
    } finally {
      setLoading(false)
      setTimeout(() => setMessage(''), 3000)
    }
  }

  const cleanupOldJobs = async () => {
    if (!confirm('Kill all jobs older than 2 hours?')) {
      return
    }

    setLoading(true)
    try {
      const response = await fetch('/api/admin/cleanup-stuck-jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}) // Empty body = cleanup old jobs
      })
      
      if (response.ok) {
        const result = await response.json()
        setMessage(result.count > 0 ? `✅ Killed ${result.count} old jobs` : '✅ No old jobs to kill')
        loadProcessingJobs()
      } else {
        setMessage('❌ Failed to cleanup old jobs')
      }
    } catch (error) {
      setMessage('❌ Error cleaning up jobs')
    } finally {
      setLoading(false)
      setTimeout(() => setMessage(''), 3000)
    }
  }

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading admin dashboard...</p>
        </div>
      </div>
    )
  }

  if (!user || !ADMIN_EMAILS.includes(user.emailAddresses[0]?.emailAddress || '')) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-lg shadow-md p-6 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Flame className="h-8 w-8 text-red-600" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600 mb-4">You don&apos;t have permission to access the admin dashboard.</p>
          <button
            onClick={() => router.push('/dashboard')}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    )
  }

  const tabs = [
    { id: 'overview' as const, label: 'Overview', icon: TrendingUp },
    { id: 'users' as const, label: 'Users', icon: Users },
    { id: 'activity' as const, label: 'Activity', icon: Activity },
    { id: 'settings' as const, label: 'Settings', icon: Settings }
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <Flame className="h-8 w-8 text-orange-500" />
              <div>
                <h1 className="text-xl font-bold text-gray-900">FireQSP Admin</h1>
                <p className="text-sm text-gray-500">System Management Dashboard</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              {/* System Status */}
              <SystemStatusIndicator />
              
              <div className="text-right text-sm">
                <p className="text-gray-900 font-medium">{user.firstName || 'Admin'}</p>
                <p className="text-gray-500">{user.emailAddresses[0]?.emailAddress}</p>
              </div>
              <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                <span className="text-white text-sm font-medium">
                  {(user.firstName?.[0] || user.emailAddresses[0]?.emailAddress[0] || 'A').toUpperCase()}
                </span>
              </div>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex space-x-8">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <tab.icon className="h-4 w-4" />
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'overview' && (
          <div className="space-y-8">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">System Overview</h2>
              <p className="text-gray-600">Monitor your FireQSP platform performance and usage.</p>
            </div>
            {/* Health Monitor */}
            <HealthMonitor />
            {/* Admin Stats */}
            <AdminStats />
          </div>
        )}

        {activeTab === 'users' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">User Management</h2>
              <p className="text-gray-600">Manage user accounts, subscriptions, and permissions.</p>
            </div>
            <AdminUsers />
          </div>
        )}

        {activeTab === 'activity' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Activity Feed</h2>
              <p className="text-gray-600">Monitor real-time user activity and system events.</p>
            </div>
            <AdminActivity />
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">System Settings</h2>
              <p className="text-gray-600">Configure essential system parameters.</p>
            </div>

            {/* Status Message */}
            {message && (
              <div className={`p-3 rounded-md ${message.includes('✅') ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
                {message}
              </div>
            )}

            {/* OpenAI Configuration */}
            <div className="bg-white rounded-lg border p-6">
              <h3 className="text-lg font-semibold mb-4">OpenAI Model</h3>
              
              <div className="space-y-4">
                <div>
                  <select 
                    value={openaiModel}
                    onChange={(e) => setOpenaiModel(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 w-full max-w-xs"
                  >
                    {availableModels.map(model => (
                      <option key={model} value={model}>{model}</option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    Model used for all extractions
                  </p>
                </div>

                <button 
                  onClick={saveModelSettings}
                  disabled={loading}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                >
                  {loading ? 'Saving...' : 'Save'}
                </button>
              </div>
            </div>

            {/* User Access */}
            <div className="bg-white rounded-lg border p-6">
              <h3 className="text-lg font-semibold mb-4">Grant User Access</h3>
              
              <div className="flex gap-3">
                <input
                  type="email"
                  placeholder="user@example.com"
                  value={grantEmail}
                  onChange={(e) => setGrantEmail(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 flex-1 max-w-sm"
                />
                <select 
                  value={grantPlan}
                  onChange={(e) => setGrantPlan(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                >
                  <option value="pro">Pro Plan</option>
                  <option value="enterprise">Enterprise Plan</option>
                </select>
                <button 
                  onClick={grantUserAccess}
                  disabled={loading}
                  className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
                >
                  {loading ? 'Granting...' : 'Grant'}
                </button>
              </div>
            </div>

            {/* Job Management */}
            <div className="bg-white rounded-lg border p-6">
              <h3 className="text-lg font-semibold mb-4">Processing Jobs</h3>
              
              <div className="flex gap-3 mb-4">
                <button 
                  onClick={loadProcessingJobs}
                  disabled={loading}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                >
                  {loading ? 'Loading...' : 'Show Active Jobs'}
                </button>
                
                <button 
                  onClick={cleanupOldJobs}
                  disabled={loading}
                  className="px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700 disabled:opacity-50"
                >
                  Kill Old Jobs
                </button>
              </div>

              {processingJobs && processingJobs.length > 0 && (
                <div className="space-y-2">
                  {processingJobs.map((job: any) => {
                    const duration = Math.round((Date.now() - new Date(job.created_at).getTime()) / 1000 / 60)
                    
                    return (
                      <div key={job.id} className="flex items-center justify-between p-3 bg-gray-50 rounded border">
                        <div>
                          <div className="text-sm font-mono">{job.id.slice(0, 8)}...</div>
                          <div className="text-xs text-gray-600">{duration}m ago • {job.files_processed || 0}/{job.total_files || 0} files</div>
                        </div>
                        <button
                          onClick={() => killSpecificJob(job.id)}
                          className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700"
                        >
                          Kill
                        </button>
                      </div>
                    )
                  })}
                </div>
              )}

              {processingJobs && processingJobs.length === 0 && (
                <div className="text-green-600 text-sm">
                  ✅ No active jobs
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}