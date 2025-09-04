// components/AdminUsers.tsx - Updated for Clerk integration
'use client'

import { useEffect, useState } from 'react'
import { Search, Filter, MoreHorizontal, Eye, Ban, Play, Trash2, UserPlus, UserCheck, UserX } from 'lucide-react'

interface User {
  id: string
  email: string
  name: string
  plan: string
  status: string
  joinDate: string
  lastActive: string
  extractionsCount: number
  apiCallsThisMonth: number
  totalSpent: number
  hasSubscription: boolean
  isAdminGranted: boolean
  clerkData: {
    imageUrl?: string
    username?: string
    phoneNumbers?: string[]
  }
}

export function AdminUsers() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [planFilter, setPlanFilter] = useState('all')
  const [subscriptionFilter, setSubscriptionFilter] = useState('all')

  useEffect(() => {
    fetchUsers()
  }, [])

  const fetchUsers = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/admin/users')
      
      if (!response.ok) {
        throw new Error('Failed to fetch users')
      }
      
      const data = await response.json()
      setUsers(data.users || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load users')
    } finally {
      setLoading(false)
    }
  }

  const handleUserAction = async (userId: string, action: string, planType?: string) => {
    try {
      const response = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, action, planType })
      })

      if (!response.ok) {
        throw new Error('Action failed')
      }

      // Refresh users list
      fetchUsers()
    } catch (err) {
      alert(`Failed to ${action} user: ${err instanceof Error ? err.message : 'Unknown error'}`)
    }
  }

  const handleGrantSubscription = async (userId: string, userEmail: string) => {
    const planType = prompt(
      `Grant subscription to ${userEmail}?\n\nChoose plan (basic/pro/enterprise):`,
      'pro'
    )
    
    if (planType && ['basic', 'pro', 'enterprise'].includes(planType.toLowerCase())) {
      await handleUserAction(userId, 'grant_subscription', planType.toLowerCase())
    }
  }

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.name.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === 'all' || user.status === statusFilter
    const matchesPlan = planFilter === 'all' || user.plan === planFilter
    const matchesSubscription = subscriptionFilter === 'all' || 
                               (subscriptionFilter === 'has_subscription' && user.hasSubscription) ||
                               (subscriptionFilter === 'no_subscription' && !user.hasSubscription) ||
                               (subscriptionFilter === 'admin_granted' && user.isAdminGranted)
    
    return matchesSearch && matchesStatus && matchesPlan && matchesSubscription
  })

  const getPlanBadgeColor = (plan: string, hasSubscription: boolean) => {
    if (!hasSubscription) return 'bg-gray-100 text-gray-700'
    
    const colors = {
      trial: 'bg-gray-100 text-gray-700',
      basic: 'bg-blue-100 text-blue-700',
      pro: 'bg-purple-100 text-purple-700',
      enterprise: 'bg-green-100 text-green-700'
    }
    return colors[plan as keyof typeof colors] || colors.trial
  }

  const getStatusBadgeColor = (status: string) => {
    const colors = {
      active: 'bg-green-100 text-green-700',
      suspended: 'bg-red-100 text-red-700',
      cancelled: 'bg-orange-100 text-orange-700',
      trial: 'bg-gray-100 text-gray-700'
    }
    return colors[status as keyof typeof colors] || colors.trial
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg border">
        <div className="p-6 border-b">
          <div className="h-6 bg-gray-200 rounded w-1/4 animate-pulse"></div>
        </div>
        <div className="p-6 space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center space-x-4 animate-pulse">
              <div className="h-10 w-10 bg-gray-200 rounded-full"></div>
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                <div className="h-3 bg-gray-200 rounded w-1/6"></div>
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
        <p className="text-red-700 font-medium">Error loading users</p>
        <p className="text-red-600 text-sm mt-1">{error}</p>
        <button
          onClick={fetchUsers}
          className="mt-3 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 text-sm"
        >
          Retry
        </button>
      </div>
    )
  }

  const stats = {
    total: users.length,
    withSubscription: users.filter(u => u.hasSubscription).length,
    adminGranted: users.filter(u => u.isAdminGranted).length,
    active: users.filter(u => u.status === 'active').length
  }

  return (
    <div className="bg-white rounded-lg border">
      {/* Header with Stats */}
      <div className="p-6 border-b">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">User Management</h2>
          <div className="text-sm text-gray-500">
            {filteredUsers.length} of {users.length} users
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-4 gap-4 mb-4">
          <div className="bg-blue-50 p-3 rounded-lg">
            <div className="text-sm text-blue-600 font-medium">Total Users</div>
            <div className="text-xl font-bold text-blue-900">{stats.total}</div>
          </div>
          <div className="bg-green-50 p-3 rounded-lg">
            <div className="text-sm text-green-600 font-medium">With Subscription</div>
            <div className="text-xl font-bold text-green-900">{stats.withSubscription}</div>
          </div>
          <div className="bg-purple-50 p-3 rounded-lg">
            <div className="text-sm text-purple-600 font-medium">Admin Granted</div>
            <div className="text-xl font-bold text-purple-900">{stats.adminGranted}</div>
          </div>
          <div className="bg-orange-50 p-3 rounded-lg">
            <div className="text-sm text-orange-600 font-medium">Active</div>
            <div className="text-xl font-bold text-orange-900">{stats.active}</div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search users by name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-md w-full focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          
          <select
            value={subscriptionFilter}
            onChange={(e) => setSubscriptionFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Users</option>
            <option value="has_subscription">Has Subscription</option>
            <option value="no_subscription">No Subscription</option>
            <option value="admin_granted">Admin Granted</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="suspended">Suspended</option>
            <option value="trial">Trial</option>
            <option value="cancelled">Cancelled</option>
          </select>

          <select
            value={planFilter}
            onChange={(e) => setPlanFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Plans</option>
            <option value="trial">Trial</option>
            <option value="basic">Basic</option>
            <option value="pro">Pro</option>
            <option value="enterprise">Enterprise</option>
          </select>
        </div>
      </div>

      {/* Users Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left py-3 px-6 font-medium text-gray-700">User</th>
              <th className="text-left py-3 px-6 font-medium text-gray-700">Plan</th>
              <th className="text-left py-3 px-6 font-medium text-gray-700">Status</th>
              <th className="text-left py-3 px-6 font-medium text-gray-700">Usage</th>
              <th className="text-left py-3 px-6 font-medium text-gray-700">Revenue</th>
              <th className="text-left py-3 px-6 font-medium text-gray-700">Last Active</th>
              <th className="text-left py-3 px-6 font-medium text-gray-700">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {filteredUsers.map((user) => (
              <tr key={user.id} className="hover:bg-gray-50">
                {/* In AdminUsers.tsx, update the user row to show admin-granted flag: */}
                <td className="py-4 px-6">
                  <div className="flex items-center space-x-3">
                    {user.clerkData.imageUrl ? (
                      <img 
                        src={user.clerkData.imageUrl} 
                        alt={user.name}
                        className="w-8 h-8 rounded-full"
                      />
                    ) : (
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                        <span className="text-blue-600 text-sm font-medium">
                          {user.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                    )}
                    <div>
                      <div className="font-medium text-gray-900">{user.name}</div>
                      <div className="text-sm text-gray-500">{user.email}</div>
                      {user.isAdminGranted && (
                        <div className="flex items-center gap-1">
                          <div className="text-xs text-purple-600 font-medium">👑 Admin Granted</div>
                        </div>
                      )}
                    </div>
                  </div>
                </td>
                <td className="py-4 px-6">
                  <span className={`inline-block px-2 py-1 text-xs font-medium rounded-full ${getPlanBadgeColor(user.plan, user.hasSubscription)}`}>
                    {user.hasSubscription ? user.plan : 'No Plan'}
                  </span>
                </td>
                <td className="py-4 px-6">
                  <span className={`inline-block px-2 py-1 text-xs font-medium rounded-full ${getStatusBadgeColor(user.status)}`}>
                    {user.status}
                  </span>
                </td>
                <td className="py-4 px-6">
                  <div className="text-sm">
                    <div>{user.extractionsCount} total</div>
                    <div className="text-gray-500">{user.apiCallsThisMonth} this month</div>
                  </div>
                </td>
                <td className="py-4 px-6">
                  <div className="font-medium">${user.totalSpent}</div>
                </td>
                <td className="py-4 px-6">
                  <div className="text-sm text-gray-500">
                    {new Date(user.lastActive).toLocaleDateString()}
                  </div>
                </td>
                <td className="py-4 px-6">
                  <div className="flex items-center space-x-2">
                    {/* Grant/Revoke Subscription */}
                    {!user.hasSubscription ? (
                      <button
                        onClick={() => handleGrantSubscription(user.id, user.email)}
                        className="p-1 text-gray-400 hover:text-green-600"
                        title="Grant Subscription"
                      >
                        <UserPlus className="h-4 w-4" />
                      </button>
                    ) : (
                      <button
                        onClick={() => {
                          if (confirm(`Revoke subscription for ${user.email}?`)) {
                            handleUserAction(user.id, 'revoke_subscription')
                          }
                        }}
                        className="p-1 text-gray-400 hover:text-red-600"
                        title="Revoke Subscription"
                      >
                        <UserX className="h-4 w-4" />
                      </button>
                    )}

                    {/* View Details */}
                    <button
                      onClick={() => handleUserAction(user.id, 'view')}
                      className="p-1 text-gray-400 hover:text-blue-600"
                      title="View Details"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                    
                    {/* Suspend/Activate */}
                    {user.status === 'active' ? (
                      <button
                        onClick={() => handleUserAction(user.id, 'suspend')}
                        className="p-1 text-gray-400 hover:text-red-600"
                        title="Suspend User"
                      >
                        <Ban className="h-4 w-4" />
                      </button>
                    ) : (
                      <button
                        onClick={() => handleUserAction(user.id, 'activate')}
                        className="p-1 text-gray-400 hover:text-green-600"
                        title="Activate User"
                      >
                        <Play className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filteredUsers.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">No users found matching your criteria</p>
          </div>
        )}
      </div>
    </div>
  )
}