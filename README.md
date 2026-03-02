# PULSE – AI-Powered Employee Coaching Platform

Private, confidential AI coaching sessions for employee wellbeing and growth.

## Tech Stack

| Layer      | Technology |
|------------|------------|
| Frontend   | React 18 + Vite + Tailwind CSS |
| AI         | Google Gemini Live API (voice) + Gemini Flash (text) |
| Database   | Supabase (PostgreSQL) |
| Storage    | Supabase Storage (documents + transcripts) |
| Auth       | Supabase Auth |

## Quick Start

### 1. Supabase Setup

1. Create a project at [supabase.com](https://supabase.com)
2. Go to **SQL Editor** → paste and run `supabase/schema.sql`
3. Copy your **Project URL** and **anon public key** from Settings → API

### 2. Gemini API Key

1. Get a key from [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Enable the **Gemini Live API** (gemini-2.0-flash-live-001)

### 3. Frontend Setup

```bash
cd frontend
cp .env.example .env
# Fill in .env with your keys
npm install
npm run dev
```

### 4. Make yourself Admin

After signing up, run this in Supabase SQL Editor:
```sql
UPDATE profiles SET role = 'ADMIN' WHERE email = 'your@email.com';
```

## Environment Variables

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_GEMINI_API_KEY=your-gemini-api-key
```

## Features

### Employee
- **Voice coaching** via Gemini Live API (real-time audio streaming)
- **Text fallback** if voice unavailable
- **5-module session** (Check-In → Work → Team → Growth → Actions)
- **Mood tracking** with emoji picker
- **Micro-actions** with due dates and completion tracking
- **Session history** with AI-generated summaries
- **Document storage** (PDFs, images, notes)

### Admin (HR/Leadership)
- **Anonymized aggregate insights** — zero individual data visible
- **Weekly mood trends** across organization
- **Top themes** by sentiment (positive/neutral/negative)
- **Department breakdown** (min. 3 sessions required for privacy)
- Privacy-first design: all aggregated, no session content exposed

## Architecture

```
PULSE
├── frontend/                  # React app
│   └── src/
│       ├── lib/
│       │   ├── supabase.js    # DB + Auth + Storage client
│       │   └── gemini.js      # Gemini Live + Text + utilities
│       ├── hooks/
│       │   └── useVoice.js    # Mic capture + Gemini Live streaming
│       ├── pages/             # Login, Register, Dashboard, Session, History, Admin
│       └── components/        # VoiceCoach, Charts, ActionModal, etc.
└── supabase/
    └── schema.sql             # Tables, RLS, Storage buckets
```

## Session Flow

```
1. CHECK-IN         (3 min)  → Mood score 1-10
2. WORK & WORKLOAD  (5 min)  → Challenges, stress
3. TEAM & CULTURE   (4 min)  → Belonging, safety
4. GROWTH           (4 min)  → Career goals
5. CLOSING + ACTIONS(4 min)  → 1-2 micro-commitments
```

## Privacy & Security

- Row Level Security on all tables — users see only their own data
- Admins see only anonymized aggregates — no session content ever
- Supabase Storage with signed URLs (1-hour expiry)
- Minimum 3-session threshold for department data display
