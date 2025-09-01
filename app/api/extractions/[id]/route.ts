import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, handleAuthError } from '@/lib/auth'
import { SupabaseExtraction } from '@/lib/supabase-utils'

// GET - Get specific extraction data
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth()

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
    return handleAuthError(error)
  }
}