'use client'
import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { Flame, Clock, MessageSquare, TrendingUp, Zap, Target, Users, AlertTriangle, CheckCircle, ArrowRight, RefreshCw } from 'lucide-react'
import OnboardingFlow from '@/components/OnboardingFlow'

type DigestData = {
  date: string
  stats: { applied: number; interviews: number; offers: number; appliedToday: number; pendingQueue: number; networkSize: number }
  expiringSoon: { id: string; company: string; title: string; daysLeft: number; action: string }[]
  pendingFollowups: { name: string; company: string; status: string; last_contact: string }[]
  actionItems: { priority: 'high'|'medium'|'low'; action: string; link: string; count?: number }[]
  usageToday: Record<string, number>
  recentWins: { win_type: string; company: string; role: string; salary_after?: number; days_to_win?: number }[]
  targetRole: string
  onboardingStep: number
}

const PRIORITY_COLORS = { high: '#ef4444', medium: '#f59e0b', low: '#6b7a99' }
const PRIORITY_ICONS  = { high: AlertTriangle, medium: Clock, low: Target }

export default function WarRoom() {
  const [data, setData]       = useState<DigestData | null>(null)
  const [loading, setLoading] = useState(true)
  const [lastRefresh, setLastRefresh] = useState(new Date())

  const load = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { setLoading(false); return }
    try {
      const res = await fetch('/api/daily-digest', { headers: { Authorization: `Bearer ${session.access_token}` } })
      if (res.ok) { setData(await res.json()); setLastRefresh(new Date()) }
    } catch (e) { console.error(e) }
    setLoading(false)
  }, [])

  useEffect(() => {
    load()
    // Auto-refresh every 5 minutes
    const interval = setInterval(load, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [load])

  if (loading) return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '60px 20px', textAlign: 'center' }}>
      <RefreshCw size={24} color="#3b82f6" style={{ animation: 'spin 1s linear infinite', margin: '0 auto 12px' }} />
      <div style={{ color: '#6b7a99' }}>Loading your war room...</div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  if (!data) return (
    <div style={{ maxWidth: 600, margin: '80px auto', padding: '0 20px', textAlign: 'center' }}>
      <div style={{ fontSize: 48, marginBottom: 16 }}>🔐</div>
      <h2 style={{ fontFamily: 'Syne,sans-serif', fontSize: 22, color: 'white', marginBottom: 10 }}>Sign in to access your War Room</h2>
      <a href="/auth"><button className="btn-primary" style={{ margin: '0 auto' }}>Sign In</button></a>
    </div>
  )

  const highPriority = data.actionItems.filter(a => a.priority === 'high')
  const medPriority  = data.actionItems.filter(a => a.priority === 'medium')
  const lowPriority  = data.actionItems.filter(a => a.priority === 'low')

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '28px 20px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontFamily: 'Syne,sans-serif', fontSize: 26, fontWeight: 800, color: 'white', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 10 }}>
            <Flame size={24} color="#ef4444" /> Daily War Room
          </h1>
          <p style={{ color: '#6b7a99', fontSize: 13 }}>
            {data.targetRole ? `Target: ${data.targetRole}` : 'Set your target role to personalise'} · Last updated {lastRefresh.toLocaleTimeString()}
          </p>
        </div>
        <button onClick={load} className="btn-ghost" style={{ padding: '8px 14px' }}>
          <RefreshCw size={13} /> Refresh
        </button>
      </div>

      {/* Onboarding */}
      {data.onboardingStep < 5 && <OnboardingFlow currentStep={data.onboardingStep} compact />}

      {/* High priority alerts */}
      {highPriority.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          {highPriority.map((item, i) => (
            <a key={i} href={item.link} style={{ textDecoration: 'none', display: 'block', marginBottom: 8 }}>
              <div style={{ padding: '12px 16px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 10, display: 'flex', alignItems: 'center', gap: 12 }}>
                <AlertTriangle size={16} color="#ef4444" />
                <span style={{ flex: 1, color: 'white', fontSize: 14, fontWeight: 500 }}>{item.action}</span>
                <ArrowRight size={14} color="#ef4444" />
              </div>
            </a>
          ))}
        </div>
      )}

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(130px,1fr))', gap: 12, marginBottom: 20 }}>
        {[
          { l: 'Applied Total', v: data.stats.applied,      c: '#3b82f6',  icon: Target },
          { l: 'Interviews',    v: data.stats.interviews,   c: '#f59e0b',  icon: Users },
          { l: 'Offers',        v: data.stats.offers,       c: '#10b981',  icon: CheckCircle },
          { l: 'Today Applied', v: data.stats.appliedToday, c: '#8b5cf6',  icon: Zap },
          { l: 'In Queue',      v: data.stats.pendingQueue, c: '#f97316',  icon: Clock },
          { l: 'Network',       v: data.stats.networkSize,  c: '#6b7a99',  icon: Users },
        ].map(({ l, v, c, icon: Icon }) => (
          <div key={l} className="card" style={{ textAlign: 'center', padding: 14 }}>
            <Icon size={13} color={c} style={{ margin: '0 auto 6px' }} />
            <div style={{ fontFamily: 'Syne,sans-serif', fontSize: 24, fontWeight: 800, color: c }}>{v}</div>
            <div style={{ fontSize: 11, color: '#6b7a99', marginTop: 2 }}>{l}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
        {/* Action items */}
        <div className="card">
          <div style={{ fontFamily: 'Syne,sans-serif', fontWeight: 700, fontSize: 15, color: 'white', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Target size={16} color="#3b82f6" /> Today's Actions
          </div>
          {data.actionItems.length === 0 ? (
            <div style={{ fontSize: 13, color: '#6b7a99', padding: '20px 0', textAlign: 'center' }}>
              ✅ All clear — no urgent actions today!
            </div>
          ) : (
            data.actionItems.map((item, i) => {
              const Icon = PRIORITY_ICONS[item.priority]
              return (
                <a key={i} href={item.link} style={{ textDecoration: 'none', display: 'flex', gap: 10, alignItems: 'center', padding: '10px 0', borderBottom: '1px solid rgba(99,130,255,0.06)' }}>
                  <Icon size={13} color={PRIORITY_COLORS[item.priority]} style={{ flexShrink: 0 }} />
                  <span style={{ flex: 1, fontSize: 13, color: item.priority === 'high' ? 'white' : '#6b7a99' }}>{item.action}</span>
                  <ArrowRight size={11} color={PRIORITY_COLORS[item.priority]} />
                </a>
              )
            })
          )}
          <div style={{ marginTop: 14, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <a href="/auto-apply"><button className="btn-primary" style={{ fontSize: 12, padding: '8px 14px' }}><Zap size={11} /> Auto-Apply</button></a>
            <a href="/linkedin-extender"><button className="btn-ghost" style={{ fontSize: 12, padding: '8px 14px' }}><Users size={11} /> LinkedIn AI</button></a>
          </div>
        </div>

        {/* Expiring + follow-ups */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {data.expiringSoon.length > 0 && (
            <div className="card" style={{ borderColor: 'rgba(245,158,11,0.3)' }}>
              <div style={{ fontFamily: 'Syne,sans-serif', fontWeight: 700, fontSize: 14, color: '#f59e0b', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Clock size={14} /> Expiring Soon
              </div>
              {data.expiringSoon.map((j, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid rgba(99,130,255,0.06)' }}>
                  <div>
                    <div style={{ fontSize: 13, color: 'white', fontWeight: 600 }}>{j.company}</div>
                    <div style={{ fontSize: 11, color: '#6b7a99' }}>{j.action}</div>
                  </div>
                  <span style={{ fontSize: 11, color: j.daysLeft === 0 ? '#ef4444' : '#f59e0b', fontWeight: 700, background: 'rgba(245,158,11,0.1)', padding: '2px 8px', borderRadius: 5 }}>
                    {j.daysLeft === 0 ? 'Today!' : `${j.daysLeft}d left`}
                  </span>
                </div>
              ))}
            </div>
          )}

          {data.pendingFollowups.length > 0 && (
            <div className="card" style={{ borderColor: 'rgba(139,92,246,0.3)' }}>
              <div style={{ fontFamily: 'Syne,sans-serif', fontWeight: 700, fontSize: 14, color: '#8b5cf6', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                <MessageSquare size={14} /> Follow-Up Now
              </div>
              {data.pendingFollowups.slice(0, 4).map((c, i) => (
                <a key={i} href="/network" style={{ textDecoration: 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid rgba(99,130,255,0.06)' }}>
                  <div>
                    <div style={{ fontSize: 13, color: 'white', fontWeight: 600 }}>{c.name}</div>
                    <div style={{ fontSize: 11, color: '#6b7a99' }}>{c.company} · {c.status.replace('_', ' ')}</div>
                  </div>
                  <ArrowRight size={12} color="#8b5cf6" />
                </a>
              ))}
              <a href="/linkedin-extender">
                <button className="btn-ghost" style={{ marginTop: 10, width: '100%', justifyContent: 'center', fontSize: 12 }}>
                  Generate Follow-up Messages →
                </button>
              </a>
            </div>
          )}

          {/* Recent wins */}
          {data.recentWins.length > 0 && (
            <div className="card" style={{ borderColor: 'rgba(16,185,129,0.3)' }}>
              <div style={{ fontFamily: 'Syne,sans-serif', fontWeight: 700, fontSize: 14, color: '#10b981', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                <TrendingUp size={14} /> Recent Wins 🎉
              </div>
              {data.recentWins.map((w, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid rgba(99,130,255,0.06)', fontSize: 13 }}>
                  <span style={{ color: 'white', fontWeight: 500 }}>{w.company} {w.role ? `— ${w.role}` : ''}</span>
                  {w.salary_after && <span style={{ color: '#10b981', fontWeight: 700 }}>₹{w.salary_after}L</span>}
                </div>
              ))}
              <a href="/wins">
                <button className="btn-ghost" style={{ marginTop: 10, width: '100%', justifyContent: 'center', fontSize: 12 }}>
                  Capture a Win →
                </button>
              </a>
            </div>
          )}
        </div>
      </div>

      {/* Today's usage bar */}
      {Object.keys(data.usageToday).length > 0 && (
        <div className="card" style={{ marginTop: 18 }}>
          <div style={{ fontFamily: 'Syne,sans-serif', fontWeight: 700, fontSize: 14, color: 'white', marginBottom: 12 }}>Today's Usage</div>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            {Object.entries(data.usageToday).map(([feat, count]) => (
              <div key={feat} style={{ padding: '6px 12px', background: 'var(--bg2)', borderRadius: 8, fontSize: 12 }}>
                <span style={{ color: '#6b7a99' }}>{feat.replace('_', ' ')}: </span>
                <span style={{ color: '#10b981', fontWeight: 700 }}>{count}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
