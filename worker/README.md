# MohitJob AI — Auto-Apply Worker

A safe, human-like automated job application engine.

## Setup (5 minutes)

```bash
cd worker
npm install
npx playwright install chromium
cp .env.example .env
# Fill SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY
```

## Capture LinkedIn Session (Required Once)

```bash
npx ts-node -e "import('./linkedin').then(m => m.captureLinkedInSession())"
```

1. Browser opens → log into LinkedIn manually
2. Wait for feed page to load
3. Session saved to `linkedin-session.json`
4. Never commit this file to git!

## Run Worker

```bash
# Development (TypeScript)
npx ts-node index.ts

# Production (compiled)
npm run build
node dist/index.js
```

## How It Works

1. Worker polls `application_queue` table every 30 seconds
2. Picks up to 3 pending jobs per run (configurable)
3. For LinkedIn: opens browser, clicks Easy Apply, submits
4. Updates queue status: pending → processing → applied/failed
5. Human-like delays between applies (30–90 seconds)
6. Maximum 15 applies per day (hard limit)

## Queue a Job (from Next.js app)

```typescript
await supabase.from('application_queue').insert({
  user_id: userId,
  job_url: 'https://linkedin.com/jobs/view/...',
  platform: 'linkedin',
  title: 'Senior Backend Engineer',
  company: 'Razorpay',
  match_score: 87,
  apply_kit: {
    tailoredHeadline: '...',
    coverLetterOpener: '...',
    phone: '+91-9876543210',
    resumePath: '/path/to/resume.pdf',
  }
})
```

## Safety Rules (DO NOT BREAK)

- ❌ Never apply to 50+ jobs/day
- ❌ Never remove delays between applies  
- ❌ Never run on LinkedIn login automation (session only)
- ✅ Start with 3–5 applies/day
- ✅ Monitor for CAPTCHA prompts
- ✅ Keep `HEADLESS=false` while testing

## Troubleshooting

| Error | Fix |
|---|---|
| "Session file not found" | Run captureLinkedInSession() |
| "LinkedIn session expired" | Regenerate session file |
| "No Easy Apply button" | Use only Easy Apply jobs |
| "Multi-step form" | Manual apply required |
| Status stays "processing" | Worker crashed — restart |

## Deploy on Railway / Render

```bash
# Dockerfile included for containerized deployment
# Set env vars in dashboard
# Start command: node dist/index.js
```


## Social Posting (LinkedIn + Naukri)

### Setup LinkedIn Session (same as auto-apply)
```bash
npx ts-node -e "import('./posters/linkedin-poster').then(m => m.captureLinkedInSession())"
```

### Setup Naukri Session
```bash
npx ts-node -e "import('./posters/naukri-poster').then(m => m.captureNaukriSession())"
```

### Auto-Post Triggers (all active by default)
| Trigger | When | Platform |
|---|---|---|
| Job Offer | User marks job as "offer" | LinkedIn + Naukri |
| Interview | Job moved to interview stage | LinkedIn |
| 50 Applications | Total applications crosses 50 | LinkedIn |
| 100 Applications | Total applications crosses 100 | LinkedIn |
| Streak Milestone | 7/14/21/30/60/100-day streak | LinkedIn |
| Weekly Update | Every Friday | LinkedIn |

### Post Flow
1. Worker checks triggers every 30 min
2. AI generates personalised post (no corporate speak)
3. Browser automation posts to LinkedIn
4. Naukri profile marked as "active" (improves search rank)
5. If automation fails: one-click URL saved in UI for manual posting

### Sessions needed
- `linkedin-session.json` — for LinkedIn auto-posting
- `naukri-session.json` — for Naukri profile updates
- Both separate from `linkedin-session.json` used for auto-apply (can share same file)
