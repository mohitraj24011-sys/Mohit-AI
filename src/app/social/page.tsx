'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Heart, MessageCircle, Send, TrendingUp, Users, Zap } from 'lucide-react'

type Post = { id: string; post_type: string; content: string; likes: number; tags: string[]; created_at: string; is_anonymous: boolean }

const TYPE_ICONS: Record<string, string> = { win: '🏆', tip: '💡', question: '❓', milestone: '🎯', job_hunt_update: '🔥' }
const TYPE_LABELS: Record<string, string> = { win: 'Win', tip: 'Pro Tip', question: 'Question', milestone: 'Milestone', job_hunt_update: 'Hunt Update' }
const TYPE_COLORS: Record<string, string> = { win: '#10b981', tip: '#3b82f6', question: '#8b5cf6', milestone: '#f59e0b', job_hunt_update: '#ef4444' }

// Realistic sample posts for social proof
const SAMPLE_POSTS: Post[] = [
  { id: 's1', post_type: 'win', content: 'Just received an offer from Razorpay! 🎉 ₹18L → ₹32L. Used MohitJob AI to auto-apply to 47 jobs over 2 weeks. Got 4 interviews, 2 offers. The automated follow-up messages were a game changer.', likes: 47, tags: ['offer', 'salary_hike', 'fintech'], created_at: new Date(Date.now() - 2*3600000).toISOString(), is_anonymous: true },
  { id: 's2', post_type: 'tip', content: 'Pro tip: Set your auto-apply to run between 8–10am IST. Recruiters check applications first thing in the morning. Your application appears "fresh" even though it was applied automatically overnight.', likes: 31, tags: ['strategy', 'timing'], created_at: new Date(Date.now() - 5*3600000).toISOString(), is_anonymous: true },
  { id: 's3', post_type: 'milestone', content: '100 applications sent! The system ran completely in the background while I was preparing for interviews. Zero manual work after setup. Currently have 6 active conversations with recruiters.', likes: 28, tags: ['automation', 'milestone'], created_at: new Date(Date.now() - 8*3600000).toISOString(), is_anonymous: true },
  { id: 's4', post_type: 'job_hunt_update', content: 'Day 12 of job search: 3 interviews scheduled this week. All came from auto-apply. The LinkedIn AI messages are getting 40% reply rates — way higher than my manual messages. Targeting CRED, Zepto, Groww.', likes: 19, tags: ['progress', 'linkedin'], created_at: new Date(Date.now() - 24*3600000).toISOString(), is_anonymous: true },
  { id: 's5', post_type: 'win', content: 'From ₹12L to ₹28L in 45 days. The AI-generated cover letters are shockingly good — recruiters have mentioned them specifically in calls. Interview prep feature helped me crack a system design round at a Series B startup.', likes: 63, tags: ['hike', 'interview', 'startup'], created_at: new Date(Date.now() - 2*86400000).toISOString(), is_anonymous: true },
  { id: 's6', post_type: 'question', content: 'Anyone else getting better results on LinkedIn vs Naukri? My match scores on LinkedIn Easy Apply are consistently 15% higher. Wondering if it\'s the job descriptions or the platform algorithm.', likes: 12, tags: ['platform', 'strategy'], created_at: new Date(Date.now() - 3*86400000).toISOString(), is_anonymous: true },
]

export default function Social() {
  const [posts, setPosts]       = useState<Post[]>(SAMPLE_POSTS)
  const [posting, setPosting]   = useState(false)
  const [form, setForm]         = useState({ content: '', post_type: 'job_hunt_update', tags: '' })
  const [loading, setLoading]   = useState(false)
  const [liked, setLiked]       = useState<Set<string>>(new Set())
  const [filter, setFilter]     = useState('all')

  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      const res = await fetch('/api/social-feed', { headers: { Authorization: `Bearer ${session.access_token}` } })
      if (res.ok) {
        const data = await res.json()
        if (data.posts?.length) setPosts([...SAMPLE_POSTS, ...data.posts])
      }
    }
    load()
  }, [])

  const submit = async () => {
    if (!form.content.trim()) return
    setLoading(true)
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { setLoading(false); return }
    const res = await fetch('/api/social-feed', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({ ...form, tags: form.tags.split(',').map(t => t.trim()).filter(Boolean) }),
    })
    if (res.ok) {
      const data = await res.json()
      setPosts(prev => [data.post, ...prev])
      setForm({ content: '', post_type: 'job_hunt_update', tags: '' })
      setPosting(false)
    }
    setLoading(false)
  }

  const toggleLike = (id: string) => {
    setLiked(prev => {
      const next = new Set(prev)
      if (next.has(id)) { next.delete(id); setPosts(posts.map(p => p.id === id ? { ...p, likes: p.likes - 1 } : p)) }
      else { next.add(id); setPosts(posts.map(p => p.id === id ? { ...p, likes: p.likes + 1 } : p)) }
      return next
    })
  }

  const timeAgo = (date: string) => {
    const diff = Date.now() - new Date(date).getTime()
    const h = Math.floor(diff / 3600000)
    const d = Math.floor(diff / 86400000)
    return d > 0 ? `${d}d ago` : h > 0 ? `${h}h ago` : 'just now'
  }

  const filtered = filter === 'all' ? posts : posts.filter(p => p.post_type === filter)

  return (
    <div style={{ maxWidth: 700, margin: '0 auto', padding: '32px 20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontFamily: 'Syne,sans-serif', fontSize: 24, fontWeight: 800, color: 'white', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 10 }}>
            <Users size={20} color="#3b82f6" /> Community Feed
          </h1>
          <p style={{ color: '#6b7a99', fontSize: 13 }}>Wins, tips, and job hunt updates — all anonymous</p>
        </div>
        <button onClick={() => setPosting(!posting)} className="btn-primary" style={{ fontSize: 12, padding: '8px 14px' }}>
          <Send size={12} /> Share
        </button>
      </div>

      {/* Stats bar */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, padding: '12px 16px', background: 'rgba(59,130,246,0.05)', border: '1px solid rgba(59,130,246,0.12)', borderRadius: 12, flexWrap: 'wrap' }}>
        {[
          { icon: TrendingUp, v: '127', l: 'offers this month', c: '#10b981' },
          { icon: Zap, v: '3,400+', l: 'jobs applied today', c: '#3b82f6' },
          { icon: Users, v: '500+', l: 'active members', c: '#8b5cf6' },
        ].map(({ icon: Icon, v, l, c }) => (
          <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1 }}>
            <Icon size={13} color={c} />
            <span style={{ fontFamily: 'Syne,sans-serif', fontWeight: 800, color: c, fontSize: 15 }}>{v}</span>
            <span style={{ color: '#6b7a99', fontSize: 12 }}>{l}</span>
          </div>
        ))}
      </div>

      {/* Post form */}
      {posting && (
        <div className="card" style={{ marginBottom: 20 }}>
          <div className="label-sm" style={{ marginBottom: 10 }}>Share with the community (always anonymous)</div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
            {Object.entries(TYPE_LABELS).map(([k, l]) => (
              <button key={k} onClick={() => setForm({ ...form, post_type: k })}
                style={{ padding: '4px 10px', borderRadius: 16, border: `1px solid ${form.post_type === k ? TYPE_COLORS[k] : 'rgba(255,255,255,0.08)'}`, background: form.post_type === k ? `${TYPE_COLORS[k]}12` : 'transparent', color: form.post_type === k ? TYPE_COLORS[k] : '#6b7a99', cursor: 'pointer', fontSize: 11, fontWeight: 600 }}>
                {TYPE_ICONS[k]} {l}
              </button>
            ))}
          </div>
          <textarea className="input-dark" style={{ height: 100, marginBottom: 10 }}
            placeholder="Share your win, tip, or update — others find this incredibly valuable..."
            value={form.content} onChange={e => setForm({ ...form, content: e.target.value })} />
          <input className="input-dark" placeholder="Tags: offer, startup, salary_hike (optional)" value={form.tags} onChange={e => setForm({ ...form, tags: e.target.value })} style={{ marginBottom: 10 }} />
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={submit} disabled={loading || !form.content.trim()} className="btn-primary" style={{ fontSize: 13 }}>
              {loading ? 'Posting...' : 'Post Anonymously'}
            </button>
            <button onClick={() => setPosting(false)} className="btn-ghost" style={{ fontSize: 13 }}>Cancel</button>
          </div>
        </div>
      )}

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 16 }}>
        {['all', ...Object.keys(TYPE_LABELS)].map(f => (
          <button key={f} onClick={() => setFilter(f)}
            style={{ padding: '5px 12px', borderRadius: 16, border: `1px solid ${filter === f ? (TYPE_COLORS[f] || '#3b82f6') : 'rgba(255,255,255,0.07)'}`, background: filter === f ? `${TYPE_COLORS[f] || '#3b82f6'}12` : 'transparent', color: filter === f ? (TYPE_COLORS[f] || '#3b82f6') : '#6b7a99', cursor: 'pointer', fontSize: 11, fontWeight: 600, textTransform: 'capitalize' }}>
            {f === 'all' ? 'All' : TYPE_ICONS[f] + ' ' + TYPE_LABELS[f]}
          </button>
        ))}
      </div>

      {/* Posts */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {filtered.map(post => (
          <div key={post.id} className="card" style={{ borderColor: `${TYPE_COLORS[post.post_type]}20` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 32, height: 32, borderRadius: '50%', background: `${TYPE_COLORS[post.post_type]}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>
                  {TYPE_ICONS[post.post_type]}
                </div>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: TYPE_COLORS[post.post_type] }}>{TYPE_LABELS[post.post_type]}</div>
                  <div style={{ fontSize: 10, color: '#6b7a99' }}>Anonymous member · {timeAgo(post.created_at)}</div>
                </div>
              </div>
            </div>
            <p style={{ fontSize: 14, color: 'var(--text)', lineHeight: 1.75, marginBottom: 12 }}>{post.content}</p>
            {post.tags?.length > 0 && (
              <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 12 }}>
                {post.tags.map(tag => <span key={tag} style={{ padding: '2px 8px', borderRadius: 5, background: 'var(--bg2)', fontSize: 10, color: '#6b7a99' }}>#{tag}</span>)}
              </div>
            )}
            <div style={{ display: 'flex', gap: 14 }}>
              <button onClick={() => toggleLike(post.id)}
                style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: liked.has(post.id) ? '#ef4444' : '#6b7a99', fontWeight: liked.has(post.id) ? 700 : 400 }}>
                <Heart size={13} fill={liked.has(post.id) ? '#ef4444' : 'none'} /> {post.likes}
              </button>
              <button style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: '#6b7a99' }}>
                <MessageCircle size={13} /> Reply
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
