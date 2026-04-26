-- MohitJob AI Enterprise — Fixed Schema
-- Safe to re-run. Run in Supabase SQL Editor.

create extension if not exists pgcrypto;

-- 1. Profiles
create table if not exists public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  full_name text, email text, phone text,
  "current_role" text, current_company text, years_experience integer default 0,
  role_tier text default 'mid' check (role_tier in ('fresher','junior','mid','senior','staff','principal','manager','senior_manager','director','vp','c_suite')),
  target_roles jsonb default '[]', target_companies jsonb default '[]', skills jsonb default '[]',
  desired_salary_min integer, desired_salary_max integer, locations jsonb default '["Remote"]',
  linkedin_url text, github_url text, portfolio_url text, naukri_url text, resume_text text,
  automation_enabled boolean default false, auto_apply_enabled boolean default false,
  daily_apply_limit integer default 10, linkedin_connect_daily_limit integer default 20,
  onboarding_step integer default 1, onboarding_completed boolean default false,
  ai_memory jsonb default '{}', referral_code text unique, referred_by uuid references auth.users(id),
  created_at timestamptz default now(), updated_at timestamptz default now()
);
alter table public.profiles enable row level security;
drop policy if exists "Users manage own profile" on public.profiles;
create policy "Users manage own profile" on public.profiles for all using (auth.uid() = id);

-- 2. User Plans
create table if not exists public.user_plans (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade unique not null,
  plan text default 'free' check (plan in ('free','pro','enterprise')),
  stripe_customer_id text, stripe_subscription_id text, stripe_price_id text,
  billing_interval text check (billing_interval in ('monthly','annual')),
  trial_ends_at timestamptz, current_period_end timestamptz,
  status text default 'active' check (status in ('active','cancelled','past_due','trialing')),
  credits integer default 0, created_at timestamptz default now(), updated_at timestamptz default now()
);
alter table public.user_plans enable row level security;
drop policy if exists "Users view own plan" on public.user_plans;
create policy "Users view own plan" on public.user_plans for all using (auth.uid() = user_id);

-- 3. Usage Logs
create table if not exists public.usage_logs (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  feature text not null, date date default current_date, count integer default 1,
  unique (user_id, feature, date)
);
alter table public.usage_logs enable row level security;
drop policy if exists "Users view own usage" on public.usage_logs;
create policy "Users view own usage" on public.usage_logs for all using (auth.uid() = user_id);

-- 4. Referrals
create table if not exists public.referrals (
  id uuid default gen_random_uuid() primary key,
  referrer_id uuid references auth.users(id) on delete cascade not null,
  referee_id uuid references auth.users(id) on delete cascade not null,
  status text default 'pending' check (status in ('pending','credited','expired')),
  credits_given integer default 5, created_at timestamptz default now()
);
alter table public.referrals enable row level security;
drop policy if exists "Users view own referrals" on public.referrals;
create policy "Users view own referrals" on public.referrals for all using (auth.uid() = referrer_id or auth.uid() = referee_id);

-- 5. Resumes
create table if not exists public.resumes (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  title text default 'My Resume', experience text, job_description text,
  generated_bullets jsonb default '[]', summary text, key_skills jsonb default '[]',
  ats_score integer default 0, ats_matched jsonb default '[]',
  ats_missing jsonb default '[]', ats_suggestions jsonb default '[]',
  created_at timestamptz default now(), updated_at timestamptz default now()
);
alter table public.resumes enable row level security;
drop policy if exists "Users manage own resumes" on public.resumes;
create policy "Users manage own resumes" on public.resumes for all using (auth.uid() = user_id);

-- 6. Jobs
create table if not exists public.jobs (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  title text not null, company text not null,
  status text default 'wishlist' check (status in ('wishlist','applied','screen','interview','final','offer','rejected','ghosted')),
  source text, salary_range text, location text, job_url text, description text, notes text,
  applied_date date, interview_date date, offer_date date, offer_amount integer,
  next_action text, next_action_date date, priority text default 'medium',
  auto_applied boolean default false, match_score integer default 0,
  created_at timestamptz default now(), updated_at timestamptz default now()
);
alter table public.jobs enable row level security;
drop policy if exists "Users manage own jobs" on public.jobs;
create policy "Users manage own jobs" on public.jobs for all using (auth.uid() = user_id);

-- 7. Application Queue
create table if not exists public.application_queue (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  job_id uuid references public.jobs(id) on delete set null,
  job_url text, platform text default 'linkedin',
  title text, company text, match_score integer default 0,
  status text default 'pending' check (status in ('pending','processing','applied','failed','skipped','manual_required')),
  attempts integer default 0, last_error text,
  apply_kit jsonb default '{}', applied_at timestamptz, scheduled_at timestamptz default now(),
  created_at timestamptz default now()
);
alter table public.application_queue enable row level security;
drop policy if exists "Users manage own queue" on public.application_queue;
create policy "Users manage own queue" on public.application_queue for all using (auth.uid() = user_id);

-- 8. Ingested Jobs
create table if not exists public.ingested_jobs (
  id uuid default gen_random_uuid() primary key,
  source text not null, external_id text,
  title text not null, company text not null,
  location text, salary_range text, description text, apply_url text not null,
  tags jsonb default '[]', is_remote boolean default false,
  posted_at timestamptz, expires_at timestamptz, scraped_at timestamptz default now(),
  unique(source, external_id)
);
alter table public.ingested_jobs enable row level security;
drop policy if exists "Anyone reads ingested" on public.ingested_jobs;
create policy "Anyone reads ingested" on public.ingested_jobs for select using (true);

-- 9. Network
create table if not exists public.network (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null, company text, role text, role_tier text, linkedin_url text, email text,
  status text default 'to_connect' check (status in ('to_connect','request_sent','connected','messaged','replied','call_scheduled','mentor','referral_asked','referral_given')),
  connection_message text, follow_up_message text, referral_ask text, notes text,
  last_contact date, next_followup date, auto_managed boolean default false,
  tags jsonb default '[]', created_at timestamptz default now()
);
alter table public.network enable row level security;
drop policy if exists "Users manage own network" on public.network;
create policy "Users manage own network" on public.network for all using (auth.uid() = user_id);

-- 10. Cover Letters
create table if not exists public.cover_letters (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  job_title text, company text, tone text default 'professional',
  content text, used_count integer default 0, created_at timestamptz default now()
);
alter table public.cover_letters enable row level security;
drop policy if exists "Users manage own cover letters" on public.cover_letters;
create policy "Users manage own cover letters" on public.cover_letters for all using (auth.uid() = user_id);

-- 11. Skill Gaps
create table if not exists public.skill_gaps (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  current_skills jsonb default '[]', target_role text, gap_analysis jsonb, roadmap jsonb,
  created_at timestamptz default now()
);
alter table public.skill_gaps enable row level security;
drop policy if exists "Users manage own skill gaps" on public.skill_gaps;
create policy "Users manage own skill gaps" on public.skill_gaps for all using (auth.uid() = user_id);

-- 12. Learning
create table if not exists public.learning (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  skill text not null, resource_title text, resource_url text, resource_type text,
  status text default 'not_started' check (status in ('not_started','in_progress','completed')),
  progress_pct integer default 0, notes text, created_at timestamptz default now()
);
alter table public.learning enable row level security;
drop policy if exists "Users manage own learning" on public.learning;
create policy "Users manage own learning" on public.learning for all using (auth.uid() = user_id);

-- 13. Automation Logs
create table if not exists public.automation_logs (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  action text, platform text, result text, details jsonb, created_at timestamptz default now()
);
alter table public.automation_logs enable row level security;
drop policy if exists "Users view own logs" on public.automation_logs;
create policy "Users view own logs" on public.automation_logs for all using (auth.uid() = user_id);

-- 14. Interview Prep
create table if not exists public.interview_prep (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  company text, role text, questions jsonb default '[]', score integer, feedback text,
  created_at timestamptz default now()
);
alter table public.interview_prep enable row level security;
drop policy if exists "Users manage own interview prep" on public.interview_prep;
create policy "Users manage own interview prep" on public.interview_prep for all using (auth.uid() = user_id);

-- 15. Profile Scores
create table if not exists public.profile_scores (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  platform text, score integer, suggestions jsonb default '[]',
  last_scanned timestamptz default now(), unique(user_id, platform)
);
alter table public.profile_scores enable row level security;
drop policy if exists "Users manage own profile scores" on public.profile_scores;
create policy "Users manage own profile scores" on public.profile_scores for all using (auth.uid() = user_id);

-- 16. User Wins
create table if not exists public.user_wins (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  win_type text check (win_type in ('offer','salary_hike','interview','referral','promotion')),
  description text, company text, role text,
  salary_before integer, salary_after integer, days_to_win integer,
  is_public boolean default false, linkedin_post text, created_at timestamptz default now()
);
alter table public.user_wins enable row level security;
drop policy if exists "Users manage own wins" on public.user_wins;
create policy "Users manage own wins" on public.user_wins for all using (auth.uid() = user_id);
drop policy if exists "Public wins readable" on public.user_wins;
create policy "Public wins readable" on public.user_wins for select using (is_public = true);

-- 17. Funnel Events
create table if not exists public.funnel_events (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  event text not null, properties jsonb default '{}', created_at timestamptz default now()
);
alter table public.funnel_events enable row level security;
drop policy if exists "Users view own events" on public.funnel_events;
create policy "Users view own events" on public.funnel_events for all using (auth.uid() = user_id);

-- 18. Marketing Leads
create table if not exists public.leads (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  name text, email text, phone text, linkedin_url text, twitter_url text,
  company text, company_size text, industry text, location text, website text,
  lead_type text not null check (lead_type in ('dev_client','enterprise_client','it_professional','hr_recruiter','bootcamp','college')),
  source text, score integer default 50, intent_signals jsonb default '[]', estimated_value integer default 0,
  status text default 'new' check (status in ('new','contacted','replied','interested','demo_scheduled','proposal_sent','negotiating','closed_won','closed_lost','nurturing')),
  pain_points jsonb default '[]', notes text, tags jsonb default '[]',
  last_contacted timestamptz, next_followup timestamptz, created_at timestamptz default now(), updated_at timestamptz default now()
);
alter table public.leads enable row level security;
drop policy if exists "Users manage own leads" on public.leads;
create policy "Users manage own leads" on public.leads for all using (auth.uid() = user_id);

-- 19. Campaigns
create table if not exists public.campaigns (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null, goal text not null, target_type text not null,
  channel text not null check (channel in ('linkedin','email','whatsapp','twitter','reddit','multi')),
  status text default 'draft' check (status in ('draft','active','paused','completed')),
  sequence jsonb default '[]', total_sent integer default 0, total_replied integer default 0,
  total_converted integer default 0, daily_limit integer default 20, send_time text default '09:30',
  created_at timestamptz default now(), updated_at timestamptz default now()
);
alter table public.campaigns enable row level security;
drop policy if exists "Users manage own campaigns" on public.campaigns;
create policy "Users manage own campaigns" on public.campaigns for all using (auth.uid() = user_id);

-- 20. Campaign Leads
create table if not exists public.campaign_leads (
  id uuid default gen_random_uuid() primary key,
  campaign_id uuid references public.campaigns(id) on delete cascade not null,
  lead_id uuid references public.leads(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  current_step integer default 0,
  status text default 'queued' check (status in ('queued','in_progress','replied','converted','unsubscribed','failed')),
  messages_sent integer default 0, last_message text, last_sent_at timestamptz,
  reply_text text, reply_sentiment text, next_action text, created_at timestamptz default now()
);
alter table public.campaign_leads enable row level security;
drop policy if exists "Users manage campaign leads" on public.campaign_leads;
create policy "Users manage campaign leads" on public.campaign_leads for all using (auth.uid() = user_id);

-- 21. Message Log
create table if not exists public.message_log (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  lead_id uuid references public.leads(id) on delete cascade,
  campaign_id uuid references public.campaigns(id) on delete set null,
  channel text, direction text check (direction in ('outbound','inbound')),
  content text not null, status text default 'generated' check (status in ('generated','sent','delivered','read','replied')),
  created_at timestamptz default now()
);
alter table public.message_log enable row level security;
drop policy if exists "Users manage own messages" on public.message_log;
create policy "Users manage own messages" on public.message_log for all using (auth.uid() = user_id);

-- 22. Achievements
create table if not exists public.achievements (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  achievement text not null, category text check (category in ('applications','networking','learning','streak','milestone','social')),
  xp_earned integer default 0, badge_icon text, description text, earned_at timestamptz default now()
);
alter table public.achievements enable row level security;
drop policy if exists "Users view own achievements" on public.achievements;
create policy "Users view own achievements" on public.achievements for all using (auth.uid() = user_id);

-- 23. Daily Challenges
create table if not exists public.daily_challenges (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  date date default current_date, challenges jsonb default '[]',
  completed jsonb default '[]', xp_earned integer default 0, unique(user_id, date)
);
alter table public.daily_challenges enable row level security;
drop policy if exists "Users manage own challenges" on public.daily_challenges;
create policy "Users manage own challenges" on public.daily_challenges for all using (auth.uid() = user_id);

-- 24. Resume Versions
create table if not exists public.resume_versions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null, target_role text, target_company text, bullets jsonb default '[]',
  summary text, ats_score integer default 0, is_default boolean default false, created_at timestamptz default now()
);
alter table public.resume_versions enable row level security;
drop policy if exists "Users manage own resume versions" on public.resume_versions;
create policy "Users manage own resume versions" on public.resume_versions for all using (auth.uid() = user_id);

-- 25. Watchlist
create table if not exists public.company_watchlist (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  company text not null, website text, linkedin text,
  status text default 'watching' check (status in ('watching','targeting','applied','interviewing','rejected','offer')),
  notes text, contacts jsonb default '[]', intel jsonb default '{}', created_at timestamptz default now()
);
alter table public.company_watchlist enable row level security;
drop policy if exists "Users manage own watchlist" on public.company_watchlist;
create policy "Users manage own watchlist" on public.company_watchlist for all using (auth.uid() = user_id);

-- 26. Offer Comparisons
create table if not exists public.offer_comparisons (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null, offers jsonb default '[]', verdict text, created_at timestamptz default now()
);
alter table public.offer_comparisons enable row level security;
drop policy if exists "Users manage own offers" on public.offer_comparisons;
create policy "Users manage own offers" on public.offer_comparisons for all using (auth.uid() = user_id);

-- 27. Social Posts
create table if not exists public.social_posts (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  post_type text check (post_type in ('win','tip','question','milestone','job_hunt_update')),
  content text not null, likes integer default 0, is_anonymous boolean default true,
  tags jsonb default '[]', created_at timestamptz default now()
);
alter table public.social_posts enable row level security;
drop policy if exists "All read social" on public.social_posts;
create policy "All read social" on public.social_posts for select using (true);
drop policy if exists "Users manage own posts" on public.social_posts;
create policy "Users manage own posts" on public.social_posts for insert with check (auth.uid() = user_id);

-- 28. B2B Proposals
create table if not exists public.b2b_proposals (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  lead_id uuid references public.leads(id) on delete set null,
  title text not null, client_name text, content jsonb default '{}',
  status text default 'draft' check (status in ('draft','sent','viewed','accepted','rejected','negotiating')),
  value_inr integer default 0, created_at timestamptz default now()
);
alter table public.b2b_proposals enable row level security;
drop policy if exists "Users manage own proposals" on public.b2b_proposals;
create policy "Users manage own proposals" on public.b2b_proposals for all using (auth.uid() = user_id);

-- 29. Social Post Queue
create table if not exists public.social_post_queue (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  platform text not null check (platform in ('linkedin','naukri','twitter','both')),
  trigger_type text not null check (trigger_type in ('offer','interview','applications_50','applications_100','manual','win','weekly_update','streak_milestone')),
  content text not null, status text default 'pending' check (status in ('pending','posted','failed','skipped','one_click_opened')),
  post_url text, scheduled_at timestamptz default now(), posted_at timestamptz, error text,
  metadata jsonb default '{}', created_at timestamptz default now()
);
alter table public.social_post_queue enable row level security;
drop policy if exists "Users manage own post queue" on public.social_post_queue;
create policy "Users manage own post queue" on public.social_post_queue for all using (auth.uid() = user_id);

-- 30. Social Trigger Log
create table if not exists public.social_trigger_log (
  id           uuid default gen_random_uuid() primary key,
  user_id      uuid references auth.users(id) on delete cascade not null,
  trigger_type text not null,
  fired_at     timestamptz default now(),
  fired_date   date default current_date,
  metadata     jsonb default '{}',
  unique(user_id, trigger_type, fired_date)
);
alter table public.social_trigger_log enable row level security;
drop policy if exists "Users view own trigger log" on public.social_trigger_log;
create policy "Users view own trigger log" on public.social_trigger_log for all using (auth.uid() = user_id);

-- 31. Interview Outcomes
create table if not exists public.interview_outcomes (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  company text not null, role text, source text, days_to_get integer,
  outcome text check (outcome in ('scheduled','attended','passed','rejected','offer','ghosted')),
  salary_offered integer, notes text, created_at timestamptz default now()
);
alter table public.interview_outcomes enable row level security;
drop policy if exists "Users manage own interviews" on public.interview_outcomes;
create policy "Users manage own interviews" on public.interview_outcomes for all using (auth.uid() = user_id);

-- 32. Automation Throttle
create table if not exists public.automation_throttle (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  platform text not null, action text not null, count integer default 0, date date default current_date,
  unique(user_id, platform, action, date)
);
alter table public.automation_throttle enable row level security;
drop policy if exists "Users view own throttle" on public.automation_throttle;
create policy "Users view own throttle" on public.automation_throttle for all using (auth.uid() = user_id);

-- 33. Functions & Triggers
create or replace function public.increment_credits(p_user_id uuid, p_amount integer)
returns void language plpgsql security definer as $$
begin
  insert into public.user_plans (user_id, credits) values (p_user_id, p_amount)
  on conflict (user_id) do update set credits = public.user_plans.credits + p_amount, updated_at = now();
end;
$$;

create or replace function public.decrement_credit(p_user_id uuid)
returns boolean language plpgsql security definer as $$
declare v_credits integer;
begin
  select credits into v_credits from public.user_plans where user_id = p_user_id;
  if v_credits > 0 then update public.user_plans set credits = credits - 1 where user_id = p_user_id; return true; end if;
  return false;
end;
$$;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_code text;
begin
  v_code := upper(substring(new.id::text, 1, 8));
  insert into public.profiles (id, email, full_name, referral_code)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email,'@',1)), v_code)
  on conflict (id) do nothing;
  insert into public.user_plans (user_id, plan) values (new.id, 'free') on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute procedure public.handle_new_user();

-- Streak update function
create or replace function public.update_streak(p_user_id uuid)
returns integer language plpgsql security definer as $$
declare
  v_last_active date;
  v_streak integer;
  v_today date := current_date;
begin
  select last_active_date, streak_days into v_last_active, v_streak
  from public.profiles where id = p_user_id;
  if v_last_active = v_today then return v_streak;
  elsif v_last_active = v_today - 1 then v_streak := v_streak + 1;
  else v_streak := 1; end if;
  update public.profiles set streak_days = v_streak, last_active_date = v_today, xp_points = xp_points + 10 where id = p_user_id;
  return v_streak;
end;
$$;

-- XP update function
create or replace function public.add_xp(p_user_id uuid, p_xp integer)
returns integer language plpgsql security definer as $$
declare v_total integer;
begin
  update public.profiles set xp_points = xp_points + p_xp where id = p_user_id returning xp_points into v_total;
  update public.profiles set level = greatest(1, xp_points / 500) where id = p_user_id;
  return v_total;
end;
$$;
