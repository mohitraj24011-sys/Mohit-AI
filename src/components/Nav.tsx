'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import {
  FileText, Mail, KanbanSquare, Users, Bot, BarChart3, TrendingUp,
  Target, LogIn, LogOut, Zap, Globe, Cpu, BookOpen, Mic, Layers,
  UserCog, CreditCard, Activity, Flame, Trophy, Gift, Menu, X,
  Megaphone, Database, Send, DollarSign, ShieldCheck, RefreshCw,
  Building2, Star, Briefcase
} from 'lucide-react'

const JOB_NAV = [
  { href: '/war-room',          label: 'War Room',    icon: Flame      },
  { href: '/dashboard',         label: 'Dashboard',   icon: BarChart3  },
  { href: '/resume',            label: 'Resume',      icon: FileText   },
  { href: '/cover-letter',      label: 'Cover',       icon: Mail       },
  { href: '/opportunities',     label: 'Jobs',        icon: Globe      },
  { href: '/tracker',           label: 'Tracker',     icon: KanbanSquare },
  { href: '/network',           label: 'Network',     icon: Users      },
  { href: '/linkedin-extender', label: 'LinkedIn AI', icon: Layers     },
  { href: '/agents',            label: 'Agents',      icon: Bot        },
  { href: '/gap-analysis',      label: 'Skill Gap',   icon: Target     },
  { href: '/learning',          label: 'Learn',       icon: BookOpen   },
  { href: '/interview-prep',    label: 'Interview',   icon: Mic        },
  { href: '/role-advisor',      label: 'Role IQ',     icon: UserCog    },
  { href: '/profile-optimizer', label: 'Profiles',    icon: TrendingUp },
  { href: '/salary',            label: 'Salary',      icon: DollarSign },
  { href: '/auto-apply',        label: 'Auto-Apply',  icon: Zap        },
  { href: '/funnel',            label: 'Analytics',   icon: Activity   },
  { href: '/achievements',      label: 'Achievements',icon: Trophy     },
  { href: '/company',           label: 'Companies',   icon: Building2  },
  { href: '/offer',             label: 'Offers',      icon: Briefcase  },
  { href: '/social',            label: 'Community',   icon: Globe      },
  { href: '/social-post',       label: 'Auto Post',    icon: Send       },
  { href: '/wins',              label: 'Wins',        icon: Star       },
  { href: '/billing',           label: 'Billing',     icon: CreditCard },
]

const CLIENT_NAV = [
  { href: '/marketing',         label: 'Marketing',   icon: Megaphone  },
  { href: '/leads',             label: 'Leads CRM',   icon: Database   },
  { href: '/campaigns',         label: 'Campaigns',   icon: Send       },
  { href: '/b2b',               label: 'Proposals',   icon: Briefcase  },
  { href: '/wins',              label: 'Wins',        icon: Trophy     },
  { href: '/billing',           label: 'Billing',     icon: CreditCard },
  { href: '/admin',             label: 'Admin',       icon: ShieldCheck},
]

export default function Nav() {
  const pathname = usePathname()
  const router   = useRouter()
  const [user, setUser]           = useState<{id?:string;email?:string}|null>(null)
  const [userType, setUserType]   = useState<'job_seeker'|'client_seeker'>('job_seeker')
  const [plan, setPlan]           = useState('free')
  const [streak, setStreak]       = useState(0)
  const [xp, setXp]               = useState(0)
  const [autoActive, setAutoActive] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [switching, setSwitching]   = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      const u = data.session?.user ?? null
      setUser(u)
      if (u) {
        const [planRes, profileRes] = await Promise.all([
          supabase.from('user_plans').select('plan').eq('user_id', u.id).single(),
          supabase.from('profiles').select('automation_enabled,user_type,streak_days,xp_points').eq('id', u.id).single(),
        ])
        setPlan(planRes.data?.plan || 'free')
        setUserType(profileRes.data?.user_type || 'job_seeker')
        setStreak(profileRes.data?.streak_days || 0)
        setXp(profileRes.data?.xp_points || 0)
        setAutoActive(profileRes.data?.automation_enabled || false)
      }
    })
    const { data: l } = supabase.auth.onAuthStateChange((_, s) => setUser(s?.user ?? null))
    return () => l.subscription.unsubscribe()
  }, [])

  const switchMode = async () => {
    if (!user?.id) return
    setSwitching(true)
    const newType = userType === 'job_seeker' ? 'client_seeker' : 'job_seeker'
    await supabase.from('profiles').update({ user_type: newType }).eq('id', user.id)
    setUserType(newType)
    setSwitching(false)
    router.push(newType === 'job_seeker' ? '/war-room' : '/marketing')
  }

  const NAV = userType === 'client_seeker' ? CLIENT_NAV : JOB_NAV
  const modeColor = userType === 'job_seeker' ? '#3b82f6' : '#10b981'
  const modeLabel = userType === 'job_seeker' ? 'Job Search' : 'Client Mode'

  return (
    <>
      <nav style={{
        background: 'rgba(8,11,18,0.97)', borderBottom: '1px solid rgba(99,130,255,0.08)',
        backdropFilter: 'blur(12px)', position: 'sticky', top: 0, zIndex: 100,
      }}>
        <div style={{ maxWidth: 1900, margin: '0 auto', padding: '0 14px', height: 52, display: 'flex', alignItems: 'center', gap: 8 }}>

          {/* Logo */}
          <Link href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 7, flexShrink: 0 }}>
            <div style={{ width: 26, height: 26, background: `linear-gradient(135deg,${modeColor},${userType==='job_seeker'?'#10b981':'#3b82f6'})`, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Zap size={13} color="white" strokeWidth={2.5} />
            </div>
            <span style={{ fontFamily: 'Syne,sans-serif', fontWeight: 800, fontSize: 14, color: 'white', letterSpacing: '-0.03em' }}>
              MohitJob<span style={{ color: modeColor }}>AI</span>
            </span>
            {autoActive && <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#10b981', boxShadow: '0 0 6px #10b981' }} />}
          </Link>

          {/* Mode badge */}
          {user && (
            <button onClick={switchMode} disabled={switching}
              style={{ padding: '2px 8px', borderRadius: 12, background: `${modeColor}15`, border: `1px solid ${modeColor}30`, color: modeColor, fontSize: 10, fontWeight: 700, cursor: 'pointer', flexShrink: 0, display: 'flex', alignItems: 'center', gap: 4 }}>
              {switching ? <RefreshCw size={9} /> : null}
              {modeLabel}
            </button>
          )}

          {/* Nav links */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 1, overflowX: 'auto', flex: 1, scrollbarWidth: 'none' }}>
            {NAV.map(({ href, label, icon: Icon }) => (
              <Link key={href} href={href} className={`nav-link ${pathname === href ? 'active' : ''}`}>
                <Icon size={10} />{label}
              </Link>
            ))}
          </div>

          {/* Right: streak + XP + plan + auth */}
          <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexShrink: 0 }}>
            {user && streak > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 3, padding: '3px 8px', background: 'rgba(239,68,68,0.1)', borderRadius: 10, fontSize: 11, color: '#f87171', fontWeight: 700 }}>
                🔥 {streak}
              </div>
            )}
            {user && xp > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 3, padding: '3px 8px', background: 'rgba(245,158,11,0.1)', borderRadius: 10, fontSize: 11, color: '#fbbf24', fontWeight: 700 }}>
                ⚡ {xp}xp
              </div>
            )}
            {plan === 'pro' && <span className="badge badge-green" style={{ fontSize: 9, padding: '1px 6px' }}>PRO</span>}
            {user ? (
              <>
                <Link href="/billing">
                  <button className="btn-ghost" style={{ padding: '4px 10px', fontSize: 11 }}><Gift size={11} /> Refer</button>
                </Link>
                <button onClick={() => supabase.auth.signOut().then(() => router.push('/'))} className="btn-ghost" style={{ padding: '4px 10px', fontSize: 11 }}>
                  <LogOut size={11} />
                </button>
              </>
            ) : (
              <Link href="/auth"><button className="btn-primary" style={{ padding: '5px 12px', fontSize: 12 }}><LogIn size={11} /> Sign In</button></Link>
            )}
            <button onClick={() => setMobileOpen(!mobileOpen)} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', padding: 4, display: 'none' }} className="mobile-btn">
              {mobileOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
        </div>
      </nav>

      {mobileOpen && (
        <div style={{ position: 'fixed', top: 52, left: 0, right: 0, bottom: 0, background: 'rgba(8,11,18,0.98)', zIndex: 99, overflowY: 'auto', padding: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {NAV.map(({ href, label, icon: Icon }) => (
              <Link key={href} href={href} onClick={() => setMobileOpen(false)}
                style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 14px', background: pathname === href ? `${modeColor}15` : 'rgba(255,255,255,0.04)', borderRadius: 10, textDecoration: 'none', color: pathname === href ? modeColor : '#6b7a99', fontSize: 13, fontWeight: 500 }}>
                <Icon size={14} />{label}
              </Link>
            ))}
          </div>
        </div>
      )}
    </>
  )
}
