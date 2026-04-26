'use client'

const STEPS = [
  { n: 1, label: 'Set your goal',        icon: '🎯', link: '/onboarding',    cta: 'Set Goal' },
  { n: 2, label: 'Build your resume',    icon: '📄', link: '/resume',        cta: 'Build Resume' },
  { n: 3, label: 'Apply to 5 jobs',      icon: '🚀', link: '/opportunities', cta: 'Find Jobs' },
  { n: 4, label: 'Connect with 2 people',icon: '🤝', link: '/linkedin-extender', cta: 'Send Messages' },
  { n: 5, label: "You're job-ready!",    icon: '🏆', link: '/pricing',       cta: 'Upgrade to Pro' },
]

type Props = {
  currentStep: number
  compact?: boolean
}

export default function OnboardingFlow({ currentStep, compact = false }: Props) {
  const pct = Math.round(((currentStep - 1) / (STEPS.length - 1)) * 100)
  const nextStep = STEPS.find(s => s.n === currentStep)

  if (compact) {
    return (
      <div style={{ padding: '10px 14px', background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.15)', borderRadius: 10, display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ fontSize: 11, color: '#60a5fa', fontWeight: 700 }}>Step {currentStep}/5</div>
        <div style={{ flex: 1, height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 2 }}>
          <div style={{ height: '100%', width: `${pct}%`, background: '#3b82f6', borderRadius: 2, transition: 'width 0.5s' }} />
        </div>
        {nextStep && currentStep < 5 && (
          <a href={nextStep.link} style={{ fontSize: 11, color: '#3b82f6', textDecoration: 'none', fontWeight: 700, whiteSpace: 'nowrap' }}>
            {nextStep.cta} →
          </a>
        )}
      </div>
    )
  }

  return (
    <div className="card" style={{ marginBottom: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <div style={{ fontFamily: 'Syne,sans-serif', fontWeight: 700, fontSize: 15, color: 'white' }}>
          Your Progress {currentStep >= 5 ? '🎉' : ''}
        </div>
        <span style={{ fontSize: 11, color: '#60a5fa', fontWeight: 700 }}>{pct}% complete</span>
      </div>

      <div style={{ height: 5, background: 'var(--bg3)', borderRadius: 3, overflow: 'hidden', marginBottom: 16 }}>
        <div style={{ height: '100%', width: `${pct}%`, background: 'linear-gradient(90deg,#3b82f6,#10b981)', borderRadius: 3, transition: 'width 0.5s' }} />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {STEPS.map(step => {
          const done    = step.n < currentStep
          const current = step.n === currentStep
          const future  = step.n > currentStep
          return (
            <div key={step.n} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderRadius: 9, background: current ? 'rgba(59,130,246,0.08)' : 'transparent', border: current ? '1px solid rgba(59,130,246,0.2)' : '1px solid transparent' }}>
              <span style={{ fontSize: 18, opacity: future ? 0.3 : 1 }}>{done ? '✅' : current ? step.icon : '⬜'}</span>
              <span style={{ flex: 1, fontSize: 13, color: done ? 'var(--text-muted)' : current ? 'white' : 'var(--text-dim)', fontWeight: current ? 600 : 400, textDecoration: done ? 'line-through' : 'none' }}>
                {step.label}
              </span>
              {current && (
                <a href={step.link}
                  style={{ fontSize: 11, color: '#3b82f6', textDecoration: 'none', fontWeight: 700, padding: '3px 8px', background: 'rgba(59,130,246,0.12)', borderRadius: 5 }}>
                  {step.cta} →
                </a>
              )}
            </div>
          )
        })}
      </div>

      {currentStep >= 5 && (
        <div style={{ marginTop: 14, padding: '12px 16px', background: 'linear-gradient(135deg,rgba(59,130,246,0.1),rgba(139,92,246,0.1))', borderRadius: 10, border: '1px solid rgba(139,92,246,0.2)', textAlign: 'center' }}>
          <p style={{ fontSize: 14, color: 'white', fontWeight: 600, marginBottom: 8 }}>🚀 Ready for your next role!</p>
          <a href="/pricing" style={{ fontSize: 13, color: '#a78bfa', textDecoration: 'none', fontWeight: 700 }}>
            Unlock unlimited access with Pro →
          </a>
        </div>
      )}
    </div>
  )
}
