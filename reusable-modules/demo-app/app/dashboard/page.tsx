// app/dashboard/page.tsx
import { currentUser } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { StatsCard } from '@/components/features/StatsCard'

export default async function DashboardPage() {
  const user = await currentUser()
  
  if (!user) {
    redirect('/sign-in')
  }

  // Mock data - replace with real data from Supabase
  const stats = [
    { label: 'Total Items', value: '24', change: '+12%', trend: 'up' as const },
    { label: 'Active Projects', value: '8', change: '+3', trend: 'up' as const },
    { label: 'Completed', value: '16', change: '2 this week', trend: 'neutral' as const },
    { label: 'Storage Used', value: '2.4 GB', change: '68% of limit', trend: 'neutral' as const },
  ]

  const recentActivity = [
    { action: 'Created new project', time: '2 hours ago', icon: '📁' },
    { action: 'Updated profile', time: '5 hours ago', icon: '👤' },
    { action: 'Uploaded 3 files', time: '1 day ago', icon: '📤' },
    { action: 'Subscription renewed', time: '3 days ago', icon: '💳' },
  ]

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Welcome Section */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">
              Welcome back, {user.firstName || 'there'}! 👋
            </h1>
            <p className="text-gray-600 mt-2">
              Here's what's happening with your account today
            </p>
          </div>
          <Link
            href="/content/new"
            className="btn-primary"
          >
            + Create New
          </Link>
        </div>

        {/* Stats Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map((stat, index) => (
            <StatsCard key={index} {...stat} />
          ))}
        </div>

        {/* Two Column Layout */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Recent Activity */}
          <div className="lg:col-span-2 card">
            <h2 className="text-xl font-bold mb-6">Recent Activity</h2>
            <div className="space-y-4">
              {recentActivity.map((activity, index) => (
                <div key={index} className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                  <div className="text-3xl">{activity.icon}</div>
                  <div className="flex-1">
                    <p className="font-medium">{activity.action}</p>
                    <p className="text-sm text-gray-500">{activity.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="card">
            <h2 className="text-xl font-bold mb-6">Quick Actions</h2>
            <div className="space-y-3">
              <Link
                href="/content"
                className="block p-4 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">📄</span>
                  <div>
                    <p className="font-medium text-blue-900">My Content</p>
                    <p className="text-sm text-blue-600">View all items</p>
                  </div>
                </div>
              </Link>
              
              <Link
                href="/settings"
                className="block p-4 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">⚙️</span>
                  <div>
                    <p className="font-medium text-purple-900">Settings</p>
                    <p className="text-sm text-purple-600">Manage account</p>
                  </div>
                </div>
              </Link>
              
              <Link
                href="/pricing"
                className="block p-4 bg-green-50 rounded-lg hover:bg-green-100 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">⭐</span>
                  <div>
                    <p className="font-medium text-green-900">Upgrade</p>
                    <p className="text-sm text-green-600">View plans</p>
                  </div>
                </div>
              </Link>
            </div>
          </div>
        </div>

        {/* Subscription Status */}
        <div className="card bg-gradient-primary text-white">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-bold mb-2">Your Plan: Free Trial</h3>
              <p className="text-blue-100">
                Upgrade to unlock unlimited features and priority support
              </p>
            </div>
            <Link
              href="/pricing"
              className="px-6 py-3 bg-white text-blue-600 rounded-lg font-semibold hover:bg-blue-50 transition-colors"
            >
              Upgrade Now
            </Link>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
