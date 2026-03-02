# PULSE – AI-Powered Employee Coaching Platform

> Private, confidential AI coaching sessions for employee wellbeing and growth — powered by OpenAI GPT-4o.

---

## Tech Stack

| Layer            | Technology |
|------------------|------------|
| **Frontend**     | React 18 + Vite + Tailwind CSS |
| **AI Text Chat** | OpenAI `gpt-4o-mini` (Chat Completions API) |
| **AI Voice**     | OpenAI `gpt-4o-realtime-preview` (Realtime API via WebRTC) |
| **AI TTS**       | Web Speech API (browser-native, no API cost) |
| **Summaries**    | OpenAI `gpt-4o-mini` (session + manager reports) |
| **Email**        | EmailJS — client-side, no backend needed |
| **Database**     | Supabase (PostgreSQL + Auth) |

---

## Features

### Employee (Priyanshu — `/`)
- **5-module structured coaching session** (Check-In → Work → Team → Culture → Growth → Actions)
- **AI opens every module** with a warm, humble, GPT-generated intro
- **Voice coaching** via OpenAI Realtime API (WebRTC, real-time audio streaming)
- **Text chat** with AI replies also spoken aloud via browser TTS
- **TTS toggle** — enable/disable AI voice on text responses anytime
- **Mood tracking** with emoji picker (score 1–10)
- **Micro-actions** with due dates committed at session close
- **Manager notification consent** — optional checkbox; email only sent if employee opts in
- **Session history** with AI-generated summaries

### Admin / Manager (Vinay — `/admin`)
- **Anonymized aggregate insights** — zero individual session content visible
- **Weekly mood trends** across the organization
- **Top themes** by sentiment (positive / neutral / negative)
- **Department breakdown** (minimum 3 sessions required for privacy)
- **Privacy-first design** — all data aggregated, no verbatim transcript ever exposed

---

## AI Coaching Framework

PULSE is trained on the **"Love as a Change Strategy"** framework with **Six Principles of Change**:

| Principle | Description |
|-----------|-------------|
| **Embrace Discomfort** | Run into the storm; choose honesty over harmony |
| **Prioritize Relationships** | Put people at the center; build transformational trust |
| **Practice Empathetic Curiosity** | Listen without judgment; dialogue over debate |
| **Experiment** | Bias toward action; learn from missteps |
| **Wield Your Influence** | Power isn't title-based; influence from any corner |
| **Be Effective** | Effectiveness over efficiency; slow down to go faster |

---

## Session Flow

```
Module 1 — CHECK-IN           (~3 min)   Mood score 1–10, emotional state
Module 2 — WORK & WORKLOAD    (~5 min)   Challenges, stress, wins
Module 3 — TEAM & CULTURE     (~4 min)   Belonging, team dynamics, safety
Module 4 — GROWTH             (~4 min)   Career goals, what energizes them
Module 5 — CLOSING + ACTIONS  (~4 min)   1–2 micro-commitments + optional manager email
```

At each module transition, the AI speaks first with a warm, GPT-generated opening message.

---

## Architecture

```
PULSE
├── frontend/
│   ├── src/
│   │   ├── lib/
│   │   │   ├── openai.js          # GPT-4o-mini: text chat, phase intros, summaries, manager reports
│   │   │   ├── tts.js             # Web Speech API TTS — speaks AI text replies aloud
│   │   │   ├── emailjs.js         # EmailJS — sends post-session manager report (no backend)
│   │   │   └── supabase.js        # Supabase DB + Auth + Storage client
│   │   ├── hooks/
│   │   │   └── useVoice.js        # OpenAI Realtime API — mic capture + WebRTC voice streaming
│   │   ├── context/
│   │   │   └── AuthContext.jsx    # URL-based role detection + Supabase auth
│   │   ├── pages/
│   │   │   ├── Dashboard.jsx      # Employee home
│   │   │   ├── Session.jsx        # Core coaching session (text + voice + TTS)
│   │   │   ├── AdminDashboard.jsx # Manager org insights (anonymized)
│   │   │   ├── SessionHistory.jsx # Past sessions + summaries
│   │   │   ├── Login.jsx
│   │   │   └── Register.jsx
│   │   └── components/
│   │       ├── ActionModal.jsx        # Session close — micro-actions + manager consent checkbox
│   │       ├── TranscriptViewer.jsx   # Chat UI + 3-dot AI thinking indicator
│   │       ├── VoiceCoach.jsx         # Voice session UI
│   │       ├── SessionProgress.jsx    # Module progress bar
│   │       └── charts/
│   │           ├── MoodTrendChart.jsx
│   │           ├── SentimentChart.jsx
│   │           ├── ThemeBarChart.jsx
│   │           └── DeptTable.jsx
│   ├── netlify.toml               # Netlify deployment config (publish dir + SPA redirect)
│   └── .gitignore                 # Excludes .env, node_modules, .claude/, dist/
└── supabase/
    └── schema.sql                 # Tables, RLS policies, Storage buckets
```

---

## Request Flow

```
┌───────────────────┐         Text Chat          ┌─────────────────────────────┐
│                   │ ─────────────────────────▶ │                             │
│   Browser         │  gpt-4o-mini               │   OpenAI Chat API           │
│   (React SPA)     │ ◀───────────────────────── │   gpt-4o-realtime-preview   │
│                   │                            │                             │
│                   │         Voice (WebRTC)      └─────────────────────────────┘
│                   │ ◀──────────────────────────▶  OpenAI Realtime API
│                   │
│                   │         Email              ┌─────────────────────────────┐
│                   │ ─────────────────────────▶ │   EmailJS (browser SDK)     │
│                   │                            │   → Manager inbox           │
│                   │                            └─────────────────────────────┘
│                   │
│                   │         TTS                ┌─────────────────────────────┐
│                   │ ─────────────────────────▶ │   Web Speech API            │
│                   │                            │   (browser-native, free)    │
└───────────────────┘                            └─────────────────────────────┘
```

---

## Demo URLs

| Role | URL | User |
|------|-----|------|
| Employee | `/` | Priyanshu (Software Engineer) |
| Manager / Admin | `/admin` | Vinay (Engineering Manager) |

> No login required for demo — URL-based role detection is built in.

---

## Environment Variables

Create `frontend/.env` with:

```env
# OpenAI
VITE_OPENAI_API_KEY=sk-proj-...

# EmailJS (manager notifications)
VITE_EMAILJS_SERVICE_ID=service_xxxxxxx
VITE_EMAILJS_TEMPLATE_ID=template_xxxxxxx
VITE_EMAILJS_PUBLIC_KEY=xxxxxxxxxxxxxxx

# Supabase (optional for demo — static mock data used by default)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

> ⚠️ **Never commit `.env` to Git.** Keys are excluded via `.gitignore`.
> For production on Netlify, add these in **Site Settings → Environment Variables** (without the `VITE_` prefix for server-side functions).

---

## Quick Start (Local)

```bash
cd frontend
npm install
# Create .env and fill in your keys (see above)
npm run dev
```

Then open:
- `http://localhost:5174/` → Employee view (Priyanshu)
- `http://localhost:5174/admin` → Manager view (Vinay)

---

## Deploying to Netlify

1. Push your repo to GitHub (`.env` is git-ignored — keys stay local)
2. Go to [netlify.com](https://netlify.com) → **Add new site → Import from GitHub**
3. Netlify auto-detects `netlify.toml`:
   - Build command: `npm run build`
   - Publish directory: `dist`
4. Add all `VITE_*` environment variables under **Site Settings → Environment Variables**
5. Click **Deploy** — every `git push` to `main` auto-redeploys

---

## Privacy & Security

- Row Level Security (RLS) on all Supabase tables — users see only their own data
- Admins see only anonymized aggregates — no session content ever visible
- Manager email requires **explicit employee consent** via checkbox — opt-in only
- Minimum 3-session threshold required before department data appears in admin view
- Supabase Storage uses signed URLs (1-hour expiry)
- `.env` excluded from Git — API keys never enter version control

---

## EmailJS Manager Report

After a session, if the employee opts in, the manager receives a structured email with:

| Section | Content |
|---------|---------|
| **Check-In** | Mood score + emotional state summary |
| **Work & Workload** | Stress levels, key challenges or wins |
| **Team & Culture** | Team dynamics, belonging themes |
| **Growth** | Career aspirations, professional energy |
| **Actions Committed** | 1–2 micro-actions with due dates |
| **Overall Sentiment** | 🟢 Positive / 🟡 Neutral / 🔴 Needs Attention |

> No verbatim transcript is ever included — all sections are GPT-paraphrased summaries (30–50 words each).
