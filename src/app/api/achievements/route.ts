import { NextRequest, NextResponse } from 'next/server'
import { getUserId } from '@/lib/auth'
import { createClient } from '@supabase/supabase-js'

const db = () => createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

const ACHIEVEMENT_DEFS = [
  { key: 'first_resume',       label: 'Resume Builder',      desc: 'Built your first AI resume',            xp: 50,  icon: '📄', category: 'applications' },
  { key: 'first_apply',        label: 'First Application',   desc: 'Applied to your first job',             xp: 100, icon: '🚀', category: 'applications' },
  { key: 'five_applies',       label: '5 Applications',      desc: 'Applied to 5 jobs',                     xp: 150, icon: '🎯', category: 'applications' },
  { key: 'twenty_applies',     label: '20 Applications',     desc: 'Applied to 20 jobs',                    xp: 300, icon: '⚡', category: 'applications' },
  { key: 'hundred_applies',    label: 'Century',             desc: 'Applied to 100 jobs',                   xp: 1000,icon: '💯', category: 'applications' },
  { key: 'first_interview',    label: 'Interview Secured',   desc: 'Got your first interview',              xp: 500, icon: '🎤', category: 'milestone'     },
  { key: 'first_offer',        label: 'Offer Received',      desc: 'Got your first job offer',              xp: 2000,icon: '🏆', category: 'milestone'     },
  { key: 'salary_hike_50',     label: '50% Hike',            desc: 'Got a 50%+ salary increase',           xp: 1500,icon: '💰', category: 'milestone'     },
  { key: 'network_10',         label: 'Networker',           desc: 'Connected with 10 people',             xp: 100, icon: '🤝', category: 'networking'    },
  { key: 'network_100',        label: 'Super Connector',     desc: 'Connected with 100 people',            xp: 500, icon: '🌐', category: 'networking'    },
  { key: 'referral_1',         label: 'First Referral',      desc: 'Got your first job referral',          xp: 300, icon: '⭐', category: 'networking'    },
  { key: 'streak_7',           label: 'Week Warrior',        desc: '7-day activity streak',                 xp: 200, icon: '🔥', category: 'streak'        },
  { key: 'streak_30',          label: 'Monthly Champion',    desc: '30-day activity streak',                xp: 750, icon: '🌟', category: 'streak'        },
  { key: 'streak_100',         label: 'Unstoppable',         desc: '100-day activity streak',               xp: 3000,icon: '🦁', category: 'streak'        },
  { key: 'ats_80',             label: 'ATS Master',          desc: 'Resume scored 80+ on ATS',             xp: 200, icon: '🎓', category: 'learning'      },
  { key: 'learning_complete',  label: 'Course Completed',    desc: 'Completed a learning resource',         xp: 150, icon: '📚', category: 'learning'      },
  { key: 'win_shared',         label: 'Win Sharer',          desc: 'Shared a win with the community',       xp: 100, icon: '📣', category: 'social'        },
  { key: 'referral_mohitjob',  label: 'Community Builder',   desc: 'Referred a friend to MohitJob AI',    xp: 250, icon: '🎁', category: 'social'        },
]

export async function GET(req: NextRequest) {
  try {
    const userId = await getUserId(req)
    if (!userId) return NextResponse.json({ error: 'Sign in required' }, { status: 401 })

    const [achRes, profileRes] = await Promise.all([
      db().from('achievements').select('*').eq('user_id', userId).order('earned_at', { ascending: false }),
      db().from('profiles').select('xp_points, level, streak_days, badges').eq('id', userId).single(),
    ])

    const earned     = achRes.data || []
    const earnedKeys = earned.map(a => a.achievement)
    const profile    = profileRes.data || {}

    const all = ACHIEVEMENT_DEFS.map(def => ({
      ...def,
      earned:    earnedKeys.includes(def.key),
      earnedAt:  earned.find(a => a.achievement === def.key)?.earned_at,
    }))

    const totalXp   = all.filter(a => a.earned).reduce((s, a) => s + a.xp, 0)
    const nextLevel = ((profile.level || 1) * 500)

    return NextResponse.json({
      achievements: all,
      earned:       earned.length,
      total:        all.length,
      xp:           profile.xp_points || totalXp,
      level:        profile.level || 1,
      nextLevelXp:  nextLevel,
      streak:       profile.streak_days || 0,
      badges:       profile.badges || [],
    })
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Error' }, { status: 500 })
  }
}

// POST — award an achievement
export async function POST(req: NextRequest) {
  try {
    const userId = await getUserId(req)
    if (!userId) return NextResponse.json({ error: 'Sign in required' }, { status: 401 })

    const { achievement } = await req.json()
    const def = ACHIEVEMENT_DEFS.find(a => a.key === achievement)
    if (!def) return NextResponse.json({ error: 'Unknown achievement' }, { status: 400 })

    // Check if already earned
    const { data: existing } = await db().from('achievements').select('id').eq('user_id', userId).eq('achievement', achievement).single()
    if (existing) return NextResponse.json({ alreadyEarned: true })

    // Award
    await db().from('achievements').insert({
      user_id: userId, achievement, category: def.category,
      xp_earned: def.xp, badge_icon: def.icon, description: def.desc,
    })

    // Add XP + update streak
    await db().rpc('add_xp', { p_user_id: userId, p_xp: def.xp })
    await db().rpc('update_streak', { p_user_id: userId })

    return NextResponse.json({ awarded: true, achievement: def.label, xp: def.xp, icon: def.icon })
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Error' }, { status: 500 })
  }
}
