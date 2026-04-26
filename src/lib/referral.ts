export function generateReferralCode(userId: string): string {
  // Simple base64 encoding (readable, short)
  return Buffer.from(userId).toString('base64url').slice(0, 12).toUpperCase()
}

export function decodeReferralCode(code: string): string | null {
  try {
    // Reconstruct UUID from code
    const decoded = Buffer.from(code, 'base64url').toString('utf-8')
    // Validate UUID format
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(decoded)) {
      return decoded
    }
    return null
  } catch {
    return null
  }
}

// Alternative: look up referral_code in profiles table (more reliable)
export async function getReferrerFromCode(code: string, db: ReturnType<typeof import('@supabase/supabase-js').createClient>): Promise<string | null> {
  const { data } = await db
    .from('profiles')
    .select('id')
    .eq('referral_code', code.toUpperCase())
    .single()
  return data?.id || null
}
