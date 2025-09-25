// app/content/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { useUser } from '@clerk/nextjs'
import { redirect } from 'next/navigation'
import { DashboardLayout } from '@/components/layout/DashboardLayout'

interface ContentItem {
  id: string
  title: string
  status: string
  created_at: string
}

export default function ContentPage() {
  const { isSignedIn, isLoaded } = useUser()
  const [content, setContent] = useState<ContentItem[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      redirect('/sign-in')
    }

    if (isSignedIn) {
      fetchContent()
    }
  }, [isSignedIn, isLoaded])

  const fetchContent = async () => {
    try {
      const response = await fetch('/api/data')
      const data = await response.json()
      setContent(data.data || [])
    } catch (error) {
      console.error('Error fetching content:', error)
    } finally {
      setLoading(false)
    }
  }

  const createContent = async () => {
    setCreating(true)
    try {
      const response = await fetch('/api/data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: `New Item ${content.length + 1}`,
          content: { description: 'This is a new content item' },
          status: 'draft',
        }),
      })

      if (response.ok) {
        await fetchContent()
      }
    } catch (error) {
      console.error('Error creating content:', error)
    } finally {
      setCreating(false)
    }
  }

  const deleteContent = async (id: string) => {
    if (!confirm('Are you sure you want to delete this item?')) return

    try {
      const response = await fetch(`/api/data?id=${id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        await fetchContent()
      }
    } catch (error) {
      console.error('Error deleting content:', error)
    }
  }

  if (!isLoaded || loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">My Content</h1>
            <p className="text-gray-600 mt-2">
              Manage all your content items
            </p>
          </div>
          <button
            onClick={createContent}
            disabled={creating}
            className="btn-primary disabled:opacity-50"
          >
            {creating ? 'Creating...' : '+ New Item'}
          </button>
        </div>

        {/* Content List */}
        {content.length === 0 ? (
          <div className="card text-center py-12">
            <div className="text-6xl mb-4">📄</div>
            <h3 className="text-xl font-bold mb-2">No content yet</h3>
            <p className="text-gray-600 mb-6">
              Create your first content item to get started
            </p>
            <button onClick={createContent} className="btn-primary">
              Create First Item
            </button>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {content.map((item) => (
              <div key={item.id} className="card-hover">
                <div className="flex items-start justify-between mb-4">
                  <h3 className="text-lg font-bold">{item.title}</h3>
                  <span className="badge-primary">{item.status}</span>
                </div>
                <p className="text-sm text-gray-500 mb-4">
                  Created {new Date(item.created_at).toLocaleDateString()}
                </p>
                <div className="flex gap-2">
                  <button className="flex-1 py-2 bg-blue-50 text-blue-600 rounded-lg font-medium hover:bg-blue-100 transition-colors">
                    Edit
                  </button>
                  <button
                    onClick={() => deleteContent(item.id)}
                    className="flex-1 py-2 bg-red-50 text-red-600 rounded-lg font-medium hover:bg-red-100 transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
