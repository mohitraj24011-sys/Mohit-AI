import { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function getUserId(req: NextRequest): Promise<string | null> {
  try {
    const authHeader = req.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '')
    if (!token) return null

    const db = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
    const { data: { user }, error } = await db.auth.getUser(token)
    if (error || !user) return null
    return user.id
  } catch {
    return null
  }
}
