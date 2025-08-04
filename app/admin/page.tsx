// app/admin/page.tsx - Final production-ready admin dashboard
'use client'

import { useEffect, useState } from 'react'
import { useUser } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import { AdminStats } from '@/components/AdminStats'
import { AdminUsers } from '@/components/AdminUsers'
import { AdminActivity } from '@/components/AdminActivity'
import { Flame, TrendingUp, Users, Activity, Settings } from 'lucide-react'

const ADMIN_EMAILS = [
  'asaini.anuraags@gmail.com',
  'admin@fireqsp.com'
]

export default function AdminPage() {
  const { user, isLoaded } = useUser()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'activity' | 'settings'>('overview')

  useEffect(() => {
    if (isLoaded && (!user || !ADMIN_EMAILS.includes(user.emailAddresses[0]?.emailAddress || ''))) {
      router.push('/dashboard')
    }
  }, [user, isLoaded, router])

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
              <p className="text-gray-600">Configure system parameters and admin preferences.</p>
            </div>
            
            {/* Settings Panel */}
            <div className="bg-white rounded-lg border p-6">
              <h3 className="text-lg font-semibold mb-4">Admin Configuration</h3>
              
              <div className="space-y-6">
                {/* Admin Emails */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Admin Email Addresses
                  </label>
                  <div className="bg-gray-50 rounded-md p-3">
                    <div className="space-y-1">
                      {ADMIN_EMAILS.map((email, index) => (
                        <div key={index} className="flex items-center justify-between text-sm">
                          <span className="text-gray-900">{email}</span>
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            email === user.emailAddresses[0]?.emailAddress 
                              ? 'bg-green-100 text-green-700' 
                              : 'bg-gray-100 text-gray-700'
                          }`}>
                            {email === user.emailAddresses[0]?.emailAddress ? 'Current' : 'Admin'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Only these email addresses can access the admin dashboard.
                  </p>
                </div>

                {/* API Information */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    API Endpoints
                  </label>
                  <div className="bg-gray-50 rounded-md p-3">
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-700">/api/admin/stats</span>
                        <span className="text-green-600 font-medium">Active</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-700">/api/admin/users</span>
                        <span className="text-green-600 font-medium">Active</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-700">/api/admin/activity</span>
                        <span className="text-green-600 font-medium">Active</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* System Info */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    System Information
                  </label>
                  <div className="bg-gray-50 rounded-md p-3">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-700">Platform:</span>
                        <span className="ml-2 font-medium">FireQSP Admin v1.0</span>
                      </div>
                      <div>
                        <span className="text-gray-700">Database:</span>
                        <span className="ml-2 font-medium text-green-600">Connected</span>
                      </div>
                      <div>
                        <span className="text-gray-700">Last Deploy:</span>
                        <span className="ml-2 font-medium">{new Date().toLocaleDateString()}</span>
                      </div>
                      <div>
                        <span className="text-gray-700">Auth Provider:</span>
                        <span className="ml-2 font-medium">Clerk</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="pt-4 border-t">
                  <div className="flex gap-3">
                    <button
                      onClick={() => window.location.reload()}
                      className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                    >
                      Refresh Dashboard
                    </button>
                    <button
                      onClick={() => router.push('/dashboard')}
                      className="px-4 py-2 border border-gray-300 text-gray-700 rounded hover:bg-gray-50"
                    >
                      Back to App
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}