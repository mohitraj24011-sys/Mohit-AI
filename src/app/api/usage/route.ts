import { NextRequest, NextResponse } from 'next/server'
import { getUserId } from '@/lib/auth'
import { checkLimit, getUsageSummary, Feature } from '@/lib/plans'

// GET /api/usage?feature=resume — check if feature is allowed
export async function GET(req: NextRequest) {
  try {
    const userId = await getUserId(req)
    if (!userId) return NextResponse.json({ allowed: false, reason: 'not_authenticated' })

    const { searchParams } = new URL(req.url)
    const feature = searchParams.get('feature') as Feature | null

    if (feature) {
      const result = await checkLimit(userId, feature)
      return NextResponse.json(result)
    }

    // Return full usage summary
    const summary = await getUsageSummary(userId)
    return NextResponse.json(summary)
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Error' }, { status: 500 })
  }
}
