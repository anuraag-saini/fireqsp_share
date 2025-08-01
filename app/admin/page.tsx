// app/admin/page.tsx
'use client'

import { useUser } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { 
  Users, 
  Activity, 
  DollarSign, 
  FileText, 
  AlertCircle,
  Eye,
  Ban,
  Trash2,
  Calendar,
  TrendingUp
} from 'lucide-react'

interface AdminStats {
  totalUsers: number
  activeUsers: number
  totalExtractions: number
  totalRevenue: number
  apiCalls: number
  errorRate: number
}

interface UserData {
  id: string
  email: string
  name: string
  plan: string
  status: 'active' | 'canceled' | 'past_due'
  joinDate: string
  lastActive: string
  extractionsCount: number
  apiCallsThisMonth: number
  totalSpent: number
}

interface RecentActivity {
  id: string
  userId: string
  userEmail: string
  action: string
  timestamp: string
  details: string
}

// Simple admin access control (in production, use proper role-based auth)
const ADMIN_EMAILS = [
  'asaini.anuraags@gmail.com', // Replace with your actual admin email
  'admin@fireqsp.com'
]

export default function AdminDashboard() {
  const { user, isLoaded } = useUser()
  const router = useRouter()
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [users, setUsers] = useState<UserData[]>([])
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'activity'>('overview')

  // Check admin access
  useEffect(() => {
    if (isLoaded && (!user || !ADMIN_EMAILS.includes(user.emailAddresses[0]?.emailAddress || ''))) {
      router.push('/')
      return
    }
  }, [isLoaded, user, router])

  // Load admin data
  useEffect(() => {
    if (!user || !ADMIN_EMAILS.includes(user.emailAddresses[0]?.emailAddress || '')) return

    const loadAdminData = async () => {
      try {
        setLoading(true)
        
        // Load all data in parallel
        const [statsRes, usersRes, activityRes] = await Promise.all([
          fetch('/api/admin/stats'),
          fetch('/api/admin/users'),
          fetch('/api/admin/activity')
        ])

        if (statsRes.ok) {
          const statsData = await statsRes.json()
          setStats(statsData)
        }

        if (usersRes.ok) {
          const usersData = await usersRes.json()
          setUsers(usersData.users || [])
        }

        if (activityRes.ok) {
          const activityData = await activityRes.json()
          setRecentActivity(activityData.activities || [])
        }

      } catch (error) {
        console.error('Failed to load admin data:', error)
      } finally {
        setLoading(false)
      }
    }

    loadAdminData()
  }, [user])

  const handleUserAction = async (userId: string, action: 'suspend' | 'delete' | 'view') => {
    if (action === 'delete' && !confirm('Are you sure you want to delete this user?')) return
    if (action === 'suspend' && !confirm('Are you sure you want to suspend this user?')) return

    try {
      const response = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, action })
      })

      if (response.ok) {
        // Refresh users list
        const usersRes = await fetch('/api/admin/users')
        if (usersRes.ok) {
          const usersData = await usersRes.json()
          setUsers(usersData.users || [])
        }
      }
    } catch (error) {
      console.error('User action failed:', error)
      alert('Action failed. Please try again.')
    }
  }

  if (!isLoaded || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!user || !ADMIN_EMAILS.includes(user.emailAddresses[0]?.emailAddress || '')) {
    return null
  }

  const formatCurrency = (amount: number) => `$${amount.toLocaleString()}`
  const formatDate = (dateString: string) => new Date(dateString).toLocaleDateString()

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">🔥 FireQSP Admin</h1>
              <p className="text-gray-600">System overview and user management</p>
            </div>
            <div className="text-sm text-gray-500">
              Admin: {user?.emailAddresses[0]?.emailAddress}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Stats Overview */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <Users className="h-8 w-8 text-blue-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Users</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.totalUsers}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <Activity className="h-8 w-8 text-green-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Active Users</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.activeUsers}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <FileText className="h-8 w-8 text-purple-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Extractions</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.totalExtractions}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <DollarSign className="h-8 w-8 text-yellow-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Revenue</p>
                  <p className="text-2xl font-bold text-gray-900">{formatCurrency(stats.totalRevenue)}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="mb-6">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              {[
                { id: 'overview', label: 'Overview', icon: TrendingUp },
                { id: 'users', label: 'Users', icon: Users },
                { id: 'activity', label: 'Activity', icon: Activity }
              ].map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => setActiveTab(id as any)}
                  className={`flex items-center py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className="h-4 w-4 mr-2" />
                  {label}
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && stats && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">System Health</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">API Calls (30d)</span>
                  <span className="font-medium">{stats.apiCalls.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Error Rate</span>
                  <span className={`font-medium ${stats.errorRate > 5 ? 'text-red-600' : 'text-green-600'}`}>
                    {stats.errorRate.toFixed(2)}%
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Active Users</span>
                  <span className="font-medium">{stats.activeUsers}</span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h3>
              <div className="space-y-3">
                <button className="w-full text-left px-4 py-2 bg-blue-50 text-blue-700 rounded hover:bg-blue-100">
                  📊 Export User Data
                </button>
                <button className="w-full text-left px-4 py-2 bg-green-50 text-green-700 rounded hover:bg-green-100">
                  📈 Usage Analytics
                </button>
                <button className="w-full text-left px-4 py-2 bg-yellow-50 text-yellow-700 rounded hover:bg-yellow-100">
                  💳 Billing Report
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'users' && (
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">User Management</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      User
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Plan
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Usage
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Revenue
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {users.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{user.name}</div>
                          <div className="text-sm text-gray-500">{user.email}</div>
                          <div className="text-xs text-gray-400">
                            Joined {formatDate(user.joinDate)}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                          user.plan === 'pro' ? 'bg-blue-100 text-blue-800' :
                          user.plan === 'enterprise' ? 'bg-purple-100 text-purple-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {user.plan}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div>{user.extractionsCount} extractions</div>
                        <div className="text-xs text-gray-500">{user.apiCallsThisMonth} API calls</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatCurrency(user.totalSpent)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                          user.status === 'active' ? 'bg-green-100 text-green-800' :
                          user.status === 'past_due' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {user.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleUserAction(user.id, 'view')}
                            className="text-blue-600 hover:text-blue-900"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleUserAction(user.id, 'suspend')}
                            className="text-yellow-600 hover:text-yellow-900"
                          >
                            <Ban className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleUserAction(user.id, 'delete')}
                            className="text-red-600 hover:text-red-900"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'activity' && (
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Recent Activity</h3>
            </div>
            <div className="divide-y divide-gray-200">
              {recentActivity.map((activity) => (
                <div key={activity.id} className="px-6 py-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {activity.userEmail}
                      </p>
                      <p className="text-sm text-blue-600">{activity.action}</p>
                      <p className="text-xs text-gray-500">{activity.details}</p>
                    </div>
                    <div className="text-xs text-gray-400">
                      {formatDate(activity.timestamp)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}