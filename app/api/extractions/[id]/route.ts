import { NextRequest, NextResponse } from 'next/server'
import { currentUser } from '@clerk/nextjs/server'
import { SupabaseExtraction } from '@/lib/supabase-utils'

// GET - Get specific extraction data
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await currentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Await the params object before accessing its properties
    const { id } = await params
    const extraction = await SupabaseExtraction.getExtraction(id)
    
    if (!extraction) {
      return NextResponse.json({ error: 'Extraction not found' }, { status: 404 })
    }

    // Verify ownership
    if (extraction.user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    return NextResponse.json({ extraction })
    
  } catch (error) {
    console.error('Error fetching extraction:', error)
    return NextResponse.json(
      { error: 'Failed to fetch extraction' },
      { status: 500 }
    )
  }
}