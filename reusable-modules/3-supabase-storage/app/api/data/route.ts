// app/api/data/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { SupabaseUtils } from '@/lib/supabase-utils'

/**
 * Example API route demonstrating Supabase operations
 * 
 * GET /api/data - Get user's content
 * POST /api/data - Create new content
 * PUT /api/data - Update content
 * DELETE /api/data - Delete content
 */

// GET - Fetch user's content
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth()
    const { searchParams } = new URL(request.url)
    
    const limit = parseInt(searchParams.get('limit') || '10')
    const offset = parseInt(searchParams.get('offset') || '0')
    const status = searchParams.get('status') || undefined

    // Check cache first
    const cacheKey = `user_content_${user.id}_${limit}_${offset}_${status}`
    const cached = SupabaseUtils.getCached(cacheKey)
    
    if (cached) {
      return NextResponse.json({ data: cached, cached: true })
    }

    // Fetch from database
    const content = await SupabaseUtils.getUserContent(user.id, {
      limit,
      offset,
      status,
    })

    // Cache for 5 minutes
    SupabaseUtils.setCache(cacheKey, content, 300)

    return NextResponse.json({ 
      data: content,
      count: content.length,
      cached: false 
    })
  } catch (error) {
    console.error('Error fetching data:', error)
    return NextResponse.json(
      { error: 'Failed to fetch data' },
      { status: 500 }
    )
  }
}

// POST - Create new content
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth()
    const body = await request.json()
    
    const { title, content, status = 'draft' } = body

    if (!title) {
      return NextResponse.json(
        { error: 'Title is required' },
        { status: 400 }
      )
    }

    // Create content
    const newContent = await SupabaseUtils.createContent({
      user_id: user.id,
      title,
      content,
      status,
    })

    // Clear cache
    SupabaseUtils.clearCache(`user_content_${user.id}`)

    return NextResponse.json(
      { data: newContent, message: 'Content created successfully' },
      { status: 201 }
    )
  } catch (error) {
    console.error('Error creating content:', error)
    return NextResponse.json(
      { error: 'Failed to create content' },
      { status: 500 }
    )
  }
}

// PUT - Update content
export async function PUT(request: NextRequest) {
  try {
    const user = await requireAuth()
    const body = await request.json()
    
    const { id, title, content, status } = body

    if (!id) {
      return NextResponse.json(
        { error: 'Content ID is required' },
        { status: 400 }
      )
    }

    // Prepare updates
    const updates: any = {}
    if (title !== undefined) updates.title = title
    if (content !== undefined) updates.content = content
    if (status !== undefined) updates.status = status

    // Update content
    const updatedContent = await SupabaseUtils.updateContent(id, updates)

    // Clear cache
    SupabaseUtils.clearCache(`user_content_${user.id}`)

    return NextResponse.json({
      data: updatedContent,
      message: 'Content updated successfully',
    })
  } catch (error) {
    console.error('Error updating content:', error)
    return NextResponse.json(
      { error: 'Failed to update content' },
      { status: 500 }
    )
  }
}

// DELETE - Delete content
export async function DELETE(request: NextRequest) {
  try {
    const user = await requireAuth()
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { error: 'Content ID is required' },
        { status: 400 }
      )
    }

    // Delete content
    await SupabaseUtils.deleteContent(id)

    // Clear cache
    SupabaseUtils.clearCache(`user_content_${user.id}`)

    return NextResponse.json({
      message: 'Content deleted successfully',
    })
  } catch (error) {
    console.error('Error deleting content:', error)
    return NextResponse.json(
      { error: 'Failed to delete content' },
      { status: 500 }
    )
  }
}
