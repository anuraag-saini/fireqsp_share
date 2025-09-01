import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, handleAuthError } from '@/lib/auth'
import { SupabaseExtraction } from '@/lib/supabase-utils'

// GET - Get user's extraction history
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth()

    const extractions = await SupabaseExtraction.getUserExtractions(user.id)
    return NextResponse.json({ extractions })
    
  } catch (error) {
    console.error('Error fetching extractions:', error)
    return handleAuthError(error)
  }
}

// DELETE - Delete an extraction
export async function DELETE(request: NextRequest) {
  try {
    const user = await requireAuth()

    const { searchParams } = new URL(request.url)
    const extractionId = searchParams.get('id')
    
    if (!extractionId) {
      return NextResponse.json({ error: 'Extraction ID required' }, { status: 400 })
    }

    await SupabaseExtraction.deleteExtraction(extractionId)
    return NextResponse.json({ success: true })
    
  } catch (error) {
    console.error('Error deleting extraction:', error)
    return handleAuthError(error)
  }
}