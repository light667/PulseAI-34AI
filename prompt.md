# PULSE AI v2 — Agent Development Prompt
## Master Specification for Africa Developers Hackathon 2026

> **This document is the complete source of truth for building Pulse AI v2 from scratch.**
> Read every section before writing a single line of code. This is a hackathon submission
> targeting $5,000 first prize at the BeOrchid Africa Developers Hackathon 2026.
> Every decision — design, architecture, UX, copy — must reflect that ambition.

---

## 0. CONTEXT & MISSION

### Who you are building for
Pulse AI is an AI-powered health intelligence platform built for **Africa**. It serves patients
across Togo, Nigeria, Ghana, Benin, and Côte d'Ivoire who need fast, accessible, intelligent
healthcare guidance — regardless of their income, location, or language.

### The problem this solves (know this deeply)
- Over 2.5 million preventable deaths occur each year in Sub-Saharan Africa
- Patients travel blindly to hospitals without knowing if beds, doctors, or specialists are available
- Healthcare systems operate in silos with no real-time coordination
- Mental health is severely underserved and stigmatized
- Medication counterfeiting is rampant — patients cannot verify drug authenticity
- Language barriers prevent many from accessing digital health tools

### What Pulse AI delivers
1. **AI Symptom Diagnosis** — Natural language symptom input (text or voice), multilingual,
   produces a ranked list of probable conditions with severity score and first-aid advice
2. **Smart Hospital Finder** — Real-time map of nearest hospitals with available beds, doctors,
   and services filtered by the patient's diagnosed condition — covering 5 countries
3. **Medication Scanner** — Photo scan of a drug to verify authenticity, check interactions,
   and understand treatment purpose
4. **Lyra — Mental Health Companion** — AI therapist trained on mental health corpus via RAG,
   empathetic, culturally aware, available in French and English
5. **Daily Health Council** — Personalized daily health tip on the dashboard
6. **Health Profile Overview** — Weight, height, blood group, health history — optional at signup

### Why this wins the hackathon
- Continental scale (5 countries, real hospital data from OpenStreetMap)
- Full-stack AI (RAG + LLM + voice + vision) with zero API cost (all free tiers)
- Premium design identity — "African Medical Noir" — visually unlike anything else at the event
- Measurable real-world impact — routing patients to care before it's too late
- WhatsApp accessibility layer — reaches patients with no smartphone via the #1 African app
- Three differentiated AI modules (diagnosis, Lyra, med scan) = technical depth

---

## 1. TECH STACK — 100% FREE, 100% OPEN SOURCE

### Frontend
```
Framework:        Next.js 14+ (App Router)
Styling:          Tailwind CSS v3
UI Components:    shadcn/ui (Radix UI primitives)
Animations:       Framer Motion
Icons:            Lucide React
Map:              MapLibre GL JS + OpenStreetMap tiles (free)
Charts:           Recharts
Font (Display):   Syne — geometric, modern, African-bold feel
Font (Body):      DM Sans — clean, legible, medical authority
```

### Backend / API
```
API Routes:       Next.js App Router API routes (/app/api/...)
LLM Inference:    Groq API free tier
  - Model:        llama-3.3-70b-versatile (diagnosis + Lyra chat)
  - Speech:       whisper-large-v3 (voice symptom input)
  - Vision:       llama-4-maverick-17b (medication scan — vision model)
Embeddings:       HuggingFace Inference API — sentence-transformers/all-MiniLM-L6-v2 (free)
```

### Database & Infrastructure
```
Database:         Supabase free tier (PostgreSQL)
Vector DB:        Supabase pgvector (RAG embeddings for Lyra + medical corpus)
Auth:             Supabase Auth (email/password + Google OAuth)
Storage:          Supabase Storage (medication scan images)
Deployment:       Vercel free tier (Next.js — optimized)
Domain:           Vercel subdomain (free) or custom domain if available
```

### Data Sources
```
Hospital Data:    GeoJSON files per country — extracted from OpenStreetMap via Overpass API
  - /public/data/hospitals_togo.geojson
  - /public/data/hospitals_nigeria.geojson
  - /public/data/hospitals_ghana.geojson
  - /public/data/hospitals_benin.geojson
  - /public/data/hospitals_cote_divoire.geojson

Medical Corpus:   Plain text/PDF chunks ingested into Supabase pgvector
  - WHO Africa disease fact sheets
  - Symptom-to-disease mapping documents
  - First aid guides (Red Cross Africa)
  - Mental health articles (for Lyra RAG)
  - Tropical disease references (malaria, typhoid, dengue, cholera)
```

### Environment Variables Required
```env
# Groq
GROQ_API_KEY=gsk_...

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...  # server-side only

# HuggingFace (for embeddings)
HUGGINGFACE_API_KEY=hf_...

# App
NEXT_PUBLIC_APP_URL=https://pulseai.vercel.app
```

---

## 2. PROJECT STRUCTURE

```
pulse-ai/
├── app/
│   ├── page.tsx                      # ROOT → redirects: splash → onboarding → auth → home
│   ├── onboarding/page.tsx           # Onboarding slides (shown once, first launch only)
│   ├── (app)/                        # Authenticated app shell
│   │   ├── layout.tsx                # Bottom nav layout (mobile-first)
│   │   ├── home/page.tsx             # Main home screen (dashboard)
│   │   ├── diagnostic/page.tsx       # Symptom checker
│   │   ├── hospitals/page.tsx        # Hospital finder map
│   │   ├── lyra/page.tsx             # Mental health chat
│   │   ├── scan/page.tsx             # Medication scanner
│   │   └── profile/page.tsx          # User health profile
│   ├── auth/
│   │   ├── login/page.tsx
│   │   └── signup/page.tsx
│   └── api/
│       ├── diagnose/route.ts         # POST — symptom → diagnosis
│       ├── lyra/route.ts             # POST — mental health chat
│       ├── scan/route.ts             # POST — medication image analysis
│       ├── hospitals/route.ts        # GET — hospital search by coords + service
│       ├── embed/route.ts            # POST — generate embedding for RAG query
│       └── tip/route.ts              # GET — daily health tip
├── components/
│   ├── ui/                           # shadcn/ui generated components
│   ├── layout/
│   │   ├── Navbar.tsx
│   │   ├── Sidebar.tsx
│   │   └── MobileNav.tsx
│   ├── splash/
│   │   └── SplashScreen.tsx          # Animated logo splash (2–3 seconds)
│   ├── onboarding/
│   │   ├── OnboardingSlide.tsx       # Individual slide component
│   │   ├── OnboardingDots.tsx        # Progress dots indicator
│   │   └── OnboardingWrapper.tsx     # Swipeable container (Framer Motion)
│   ├── diagnostic/
│   │   ├── SymptomInput.tsx          # Text + voice input
│   │   ├── DiagnosisResult.tsx       # Ranked results display
│   │   ├── SeverityBadge.tsx
│   │   └── HospitalRecommendation.tsx
│   ├── hospitals/
│   │   ├── HospitalMap.tsx           # MapLibre map
│   │   ├── HospitalCard.tsx
│   │   ├── HospitalFilters.tsx
│   │   └── HospitalList.tsx
│   ├── lyra/
│   │   ├── LyraChat.tsx
│   │   ├── LyraMessage.tsx
│   │   └── LyraSuggestions.tsx
│   ├── scan/
│   │   ├── MedScanUpload.tsx
│   │   └── MedScanResult.tsx
│   └── home/
│       ├── DailyTip.tsx
│       ├── HealthOverview.tsx
│       ├── QuickActions.tsx
│       └── RecentActivity.tsx
├── lib/
│   ├── groq.ts                       # Groq client + helper functions
│   ├── supabase/
│   │   ├── client.ts                 # Browser client
│   │   └── server.ts                 # Server client
│   ├── rag/
│   │   ├── embed.ts                  # Generate embeddings via HuggingFace
│   │   ├── retrieve.ts               # Vector similarity search from Supabase
│   │   └── ingest.ts                 # Script to ingest medical corpus
│   ├── hospitals/
│   │   ├── search.ts                 # GeoJSON proximity search
│   │   └── loader.ts                 # Load and parse GeoJSON files
│   ├── prompts/
│   │   ├── diagnosis.ts              # System prompt for diagnosis LLM
│   │   ├── lyra.ts                   # System prompt for Lyra
│   │   └── medscan.ts                # System prompt for medication analysis
│   └── utils.ts
├── public/
│   └── data/
│       ├── hospitals_togo.geojson
│       ├── hospitals_nigeria.geojson
│       ├── hospitals_ghana.geojson
│       ├── hospitals_benin.geojson
│       └── hospitals_cote_divoire.geojson
├── styles/
│   └── globals.css                   # CSS variables + Tailwind base
├── types/
│   ├── diagnosis.ts
│   ├── hospital.ts
│   └── user.ts
├── middleware.ts                      # Auth guard for /app routes
└── next.config.js
```

---

## 3. DESIGN SYSTEM — "AFRICAN MEDICAL NOIR"

### Philosophy
This design must feel like **a mission-critical medical intelligence system built for Africa**.
Dark, precise, powerful — but warm. Think: NASA control room meets African sunset.
It should look expensive without costing anything. Every other team will have a white background
with blue buttons. You will have something that makes judges stop scrolling.

### Color Palette (CSS Variables in globals.css)
```css
:root {
  /* Base */
  --bg-primary: #050F1C;          /* Deep navy — main background */
  --bg-secondary: #0A1A2E;        /* Slightly lighter — cards, sidebars */
  --bg-tertiary: #0F2444;         /* Borders, elevated surfaces */
  --bg-glass: rgba(10, 26, 46, 0.7); /* Glassmorphism panels */

  /* Brand Green — Life, Health, Tech */
  --accent-green: #00FF87;        /* Primary CTA, active states, success */
  --accent-green-dim: #00CC6A;    /* Hover states */
  --accent-green-glow: rgba(0, 255, 135, 0.15); /* Glow effects */
  --accent-green-subtle: rgba(0, 255, 135, 0.08); /* Subtle backgrounds */

  /* Alert Orange — Urgency, Warning */
  --accent-orange: #FF6B35;       /* Critical severity, alerts */
  --accent-orange-dim: #E55A26;
  --accent-orange-glow: rgba(255, 107, 53, 0.15);

  /* Medical Blue — Information, Links */
  --accent-blue: #4FC3F7;         /* Info states, secondary links */
  --accent-blue-dim: #29B6F6;

  /* Text */
  --text-primary: #F0F4FF;        /* Main text — slightly blue-white */
  --text-secondary: #8BA4C4;      /* Muted text, labels */
  --text-tertiary: #4A6080;       /* Disabled, placeholders */
  --text-inverse: #050F1C;        /* Text on green buttons */

  /* Severity Colors */
  --severity-low: #00FF87;        /* Low risk — green */
  --severity-medium: #FFD166;     /* Medium risk — amber */
  --severity-high: #FF6B35;       /* High risk — orange */
  --severity-critical: #FF3B5C;   /* Critical — red */

  /* Borders */
  --border-default: rgba(75, 120, 180, 0.15);
  --border-active: rgba(0, 255, 135, 0.3);
  --border-glass: rgba(255, 255, 255, 0.06);
}
```

### Typography
```css
/* Import in globals.css */
@import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;1,9..40,400&display=swap');

/* Usage */
font-family: 'Syne', sans-serif;     /* Headings — h1, h2, h3, brand name */
font-family: 'DM Sans', sans-serif;  /* Body — p, labels, inputs, buttons */
```

### Component Style Rules
- **Cards**: `bg-[var(--bg-secondary)] border border-[var(--border-default)] rounded-2xl`
  with `backdrop-blur-sm` for glass effect panels
- **Buttons Primary**: `bg-[var(--accent-green)] text-[var(--text-inverse)] font-semibold`
  with `hover:brightness-110 active:scale-95 transition-all`
- **Buttons Secondary**: `border border-[var(--border-active)] text-[var(--accent-green)]`
  with `hover:bg-[var(--accent-green-subtle)]`
- **Inputs**: `bg-[var(--bg-tertiary)] border border-[var(--border-default)] text-[var(--text-primary)]`
  with `focus:border-[var(--accent-green)] focus:ring-1 focus:ring-[var(--accent-green)]`
- **Badges**: Rounded pill shape, color-coded by severity, with subtle glow matching severity color
- **Animations**: All interactive elements use Framer Motion. Page transitions use `opacity` + `y` spring.
  Cards enter with staggered `delay` of 0.1s per item.

### Background Pattern
The main background should have a **subtle heartbeat/ECG line pattern** as a repeating SVG
in the CSS background — very dim, adds medical atmosphere without distraction.
```css
background-image: url("data:image/svg+xml,..."); /* ECG pattern SVG */
background-size: 200px 60px;
background-repeat: repeat-x;
background-position: bottom;
opacity: 0.03; /* Very subtle */
```

### Glassmorphism Panel Recipe
```css
.glass-panel {
  background: var(--bg-glass);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid var(--border-glass);
  border-radius: 16px;
}
```

---

## 4. APP FLOW — NO LANDING PAGE (App-First Architecture)

### Philosophy
Pulse AI is **an application, not a website**. The web version must feel exactly like a native
mobile app — so that when the Android version is built in Flutter or React Native, the logic,
flow, and UX are already mapped. There is NO marketing landing page on the root URL.
The user is immediately immersed in a product experience from the first second.

### Complete User Flow
```
First visit (no session, no onboarding done):
  / → SplashScreen (2.5s) → /onboarding → /auth/login or /auth/signup

Returning user (no session):
  / → SplashScreen (1.5s) → /auth/login

Authenticated user:
  / → SplashScreen (1.5s) → /home

Onboarding already completed (localStorage flag "pulse_onboarded"):
  Skip directly from splash to auth
```

### Flow Logic in app/page.tsx
```typescript
// app/page.tsx — Root page handles the full entry flow
'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import SplashScreen from '@/components/splash/SplashScreen'

export default function RootPage() {
  const router = useRouter()
  const supabase = createClientComponentClient()
  const [showSplash, setShowSplash] = useState(true)

  useEffect(() => {
    const navigate = async () => {
      // Wait for splash animation to complete
      await new Promise(res => setTimeout(res, 2500))
      setShowSplash(false)

      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        router.replace('/home')
        return
      }
      const onboarded = localStorage.getItem('pulse_onboarded')
      if (!onboarded) {
        router.replace('/onboarding')
      } else {
        router.replace('/auth/login')
      }
    }
    navigate()
  }, [])

  if (showSplash) return <SplashScreen />
  return null
}
```

---

## 4.1 SPLASH SCREEN

### Visual Design
The splash screen is the **first thing any user sees**. It must be iconic and memorable.
Duration: 2.5 seconds on first visit, 1.5 seconds on return visits.

**Layout**: Full-screen, centered, dark background (`var(--bg-primary)`)

**Animation sequence** (Framer Motion):
1. **0ms–400ms**: Background fades in from black
2. **400ms–900ms**: Logo mark appears (scale 0.6 → 1.0, opacity 0 → 1, spring easing)
3. **900ms–1300ms**: "PULSE AI" wordmark fades in below logo (opacity 0 → 1, slight y offset)
4. **1300ms–1800ms**: Tagline appears: "Your Health. Intelligent." (fade in)
5. **1800ms–2200ms**: Green pulse ring radiates outward from logo (CSS keyframes)
6. **2200ms–2500ms**: Entire screen fades out gracefully

**Logo Mark**: A stylized heartbeat line (ECG) that forms a circular shape — represents
the intersection of life (heartbeat) and technology (circuit-like precision).
Built as an inline SVG, animatable with Framer Motion path drawing (`pathLength` 0 → 1).

**Tagline**: "Your Health. Intelligent." in DM Sans, `var(--text-secondary)`, 16px

**Loading indicator**: Thin green progress bar at very bottom of screen, fills from 0 to 100%
over the 2.5 seconds. Purely visual, not functional.

```typescript
// components/splash/SplashScreen.tsx
// SVG heartbeat logo animates stroke from 0 to full using Framer Motion
// motion.path with pathLength: [0, 1] and duration: 1.2s
// Pulse ring: motion.circle with scale: [1, 2.5] and opacity: [0.6, 0]
```

---

## 4.2 ONBOARDING SCREENS

### Purpose
The onboarding sequence runs **once**, on first install/visit. It introduces Pulse AI's
core value proposition in 4 swipeable slides. Stored completion in `localStorage`.

After the last slide, buttons: `[Create Account]` and `[I already have an account]`

### Slide Specifications (4 slides)

**Slide 1 — Welcome**
- Illustration: Abstract map of West Africa with glowing pulse dots on major cities
- Title (Syne 28px): "Healthcare Intelligence for Africa"
- Body (DM Sans 16px): "Get accurate health insights in seconds. Available in French, English, and local languages."
- Accent color: `var(--accent-green)`

**Slide 2 — Symptom Diagnosis**
- Illustration: Stylized chat interface showing symptom input → probability result
- Title: "Describe. Diagnose. Act."
- Body: "Type or speak your symptoms. Pulse AI ranks possible conditions by probability and tells you what to do next."
- Accent: green → animated probability bars appearing

**Slide 3 — Hospital Finder**
- Illustration: Abstract map with hospital pin markers and route line
- Title: "The Right Hospital. Right Now."
- Body: "Find the nearest hospital that can treat your condition — with available doctors and services, across 5 countries."
- Accent: `var(--accent-blue)` (map/navigation feel)

**Slide 4 — Lyra & Mental Health**
- Illustration: Soft circular gradient (Lyra's abstract avatar) with speech bubbles
- Title: "Meet Lyra. Your Mental Health Companion."
- Body: "An AI therapist who listens without judgment, 24/7. Your wellbeing matters — mind and body."
- Accent: violet/teal gradient (Lyra's brand colors)

### Onboarding Navigation
- **Swipe gesture** left/right (Framer Motion drag constraints)
- **Dot indicators** at bottom — filled green for current, dim for others
- **Skip button** top-right (text, small) — goes directly to `/auth/login`
- **Next button** bottom-right (green, pill shape) — advances slide
- **Back** handled by swipe only (no back button on slide 1)
- On last slide: replace "Next" with "Get Started" button

```typescript
// components/onboarding/OnboardingWrapper.tsx
// Framer Motion AnimatePresence for slide transitions
// Direction-aware animation: slides in from right when going forward,
// from left when going back
// On completion: localStorage.setItem('pulse_onboarded', 'true')
// Then: router.push('/auth/signup')
```

---

## 4.3 AUTH PAGES (Login & Signup)

### Design Rules for Auth
- **No navbar, no sidebar** — pure focused screen
- Background: `var(--bg-primary)` with very subtle radial gradient glow (green, low opacity)
  positioned behind the card — feels premium, not clinical
- Card: glassmorphism panel, centered, max-width 400px, rounded-3xl
- Logo at top of card (small, 32px height)
- Back to onboarding: small `←` arrow top-left for users who want to go back

### Login Page
```
[← ]                    [PULSE AI logo]

  Welcome back 👋

  [Email ________________]
  [Password _____________] [👁]

  [Forgot password?]

  [──────── Sign In ────────]  ← green button

  ─── or continue with ───

  [G  Continue with Google]

  Don't have an account? [Sign up]
```

### Signup Page — 3-Step Flow
**Step indicator**: 3 pill dots at top of card, fill green as steps complete

**Step 1 — Account**
```
  Create your account (1/3)

  [Full Name _____________]
  [Email _________________]
  [Password ______________] [👁]
  [Confirm Password ______] [👁]

  Country: [🇹🇬 Togo      ▼]  (Togo, Nigeria, Ghana, Benin, CI)

  [──────── Continue ────────]
```

**Step 2 — Health Profile** (optional but encouraged)
```
  Your health profile (2/3)
  "This helps us personalize your health advice.
   All data is private and encrypted."

  Date of birth: [DD/MM/YYYY]
  Sex: [Male] [Female] [Prefer not to say]
  Blood group: [O+  ▼]
  Weight: [____] kg    Height: [____] cm

  [Skip for now]    [──── Continue ────]
```

**Step 3 — Confirmation**
```
  You're all set! (3/3)
  ✅ Account created
  ✅ Profile saved
  ✅ Ready to use Pulse AI

  [──── Go to Pulse AI ────]  → /home
```

---

## 4.4 HOME SCREEN (replaces Dashboard)

### Mobile-First Layout Philosophy
The home screen is designed like a **native app home screen**, not a web dashboard.
No sidebar. Navigation is via bottom tab bar (5 tabs).
Header is compact — shows greeting + notification bell + avatar only.

### Header (fixed, compact)
```
  Good morning, Kwame 👋          [🔔] [👤]
  Monday, 26 May · Lomé, Togo
```
Height: 64px. Transparent → glass blur on scroll.

### Content Layout (scrollable)
**Section 1 — Health Score Card** (hero card, full width, gradient background)
```
┌──────────────────────────────────────────────┐
│  Your Health Score                           │
│  ████████░░  87/100  Good                   │
│                                              │
│  O+  •  72kg  •  175cm  •  BMI 23.5         │
└──────────────────────────────────────────────┘
```
Card has subtle animated green-to-teal gradient. Numbers animate in on mount.

**Section 2 — Daily Tip**
```
┌──────────────────────────────────────────────┐
│ 💡 Today's Tip                               │
│ "Drinking 2L of water daily reduces          │
│  headaches by 40%. Stay hydrated."          │
└──────────────────────────────────────────────┘
```

**Section 3 — Quick Actions** (2x2 grid of large tap targets)
```
┌─────────────────┐  ┌─────────────────┐
│  🔍             │  │  🏥             │
│  Diagnostic     │  │  Hôpitaux       │
└─────────────────┘  └─────────────────┘
┌─────────────────┐  ┌─────────────────┐
│  🌿             │  │  💊             │
│  Lyra           │  │  Scanner        │
└─────────────────┘  └─────────────────┘
```
Each action card: `var(--bg-secondary)`, rounded-2xl, icon 32px green, label below.
Tap → scale 0.95 → release (Framer Motion `whileTap`).

**Section 4 — Recent Activity**
Last 2 diagnoses as compact list items. "See all →" link.

**Section 5 — Lyra Check-in**
Compact Lyra card at the bottom — gentle prompt to open mental health chat.

### Bottom Navigation (all screens inside /app)
```
[🏠 Home] [🔍 Diagnose] [🏥 Hospitals] [🌿 Lyra] [👤 Profile]
```
Fixed bottom, `var(--bg-secondary)` background, border-top.
Active tab: green icon + green dot below. Inactive: dim icon.
Tab transitions: Framer Motion shared layout animation.

---

## 23. ANDROID-READY ARCHITECTURE PRINCIPLES

### Why this matters
The web app will be ported to Android (Flutter or React Native Expo).
Every design and architecture decision must make that port as easy as possible.

### Design Decisions that Enable Easy Android Port

**1. Mobile-First Viewport**
The entire app is designed for 390px width first (iPhone 14 / most Android midrange).
Desktop is just a wider, padded version — same component tree, same navigation logic.
Never use desktop-only interactions as primary flows (no hover-dependent UX).

**2. App-Shell Architecture**
The app uses a persistent shell (bottom nav + header) wrapping swappable content screens.
This maps 1:1 to Flutter's `Scaffold` + `BottomNavigationBar` or React Native's `Tab.Navigator`.
When porting: each `app/(app)/[screen]/page.tsx` = one Flutter Screen/Widget.

**3. Navigation Pattern**
Use only these navigation patterns (all map directly to mobile):
- Stack navigation (push/pop) = `router.push()` / `router.back()`
- Tab navigation = bottom nav bar (never sidebar on mobile)
- Modal overlays = sheets that slide up from bottom (not full-page modals)
- No hover states as primary interactions — only tap/click

**4. Component Naming Convention**
Name all components as if they will become Flutter widgets:
- `DiagnosticScreen.tsx` not `DiagnosticPage.tsx`
- `HospitalCard.tsx` → Flutter `HospitalCard` widget (same props structure)
- `SplashScreen.tsx` → Flutter `SplashScreen` widget
- `BottomNavBar.tsx` → Flutter `BottomNavigationBar`

**5. State Management (Android-Portable Pattern)**
Use a simple pattern that maps to Flutter's Provider/Riverpod or React Native's Zustand:
```typescript
// lib/store/useHealthStore.ts — Zustand (no external dep needed, simple)
// OR: React Context + useReducer (zero dependencies)
// States: user, currentDiagnosis, nearbyHospitals, lyraMessages
// This exact structure ports to Flutter ChangeNotifier or Riverpod StateNotifier
```

**6. API Layer Isolation**
All API calls must go through a dedicated service layer — never call `fetch` directly in components:
```typescript
// lib/services/diagnosisService.ts   → Flutter: DiagnosisService.dart
// lib/services/hospitalService.ts    → Flutter: HospitalService.dart
// lib/services/lyraService.ts        → Flutter: LyraService.dart
// lib/services/scanService.ts        → Flutter: ScanService.dart
```
This makes porting trivial: rewrite the service file, keep all UI components identical in logic.

**7. Touch Target Sizes**
All tappable elements must be at minimum **44x44px** (Apple HIG / Google Material minimum).
This ensures the web app already passes mobile accessibility — no adjustments needed for Android.

**8. Gesture Support**
Implement swipe gestures from day 1:
- Onboarding slides: swipe left/right (Framer Motion drag)
- Lyra chat: swipe down to dismiss keyboard
- Hospital list: swipe card for quick action
These use Framer Motion's `drag` prop which maps conceptually to Flutter's `GestureDetector`.

**9. Offline Awareness**
Always check `navigator.onLine` and show a subtle banner if offline.
In Android: same pattern with `Connectivity` package.
Critical data (today's tip, last diagnosis) must be cached in `localStorage` (web) /
`SharedPreferences` (Android) — same concept, same code structure.

**10. Image Handling**
Always use `next/image` with explicit width/height. When porting to Flutter:
every `<Image>` component = Flutter `CachedNetworkImage` widget.
Never use CSS `background-image` for content images — only for decorative patterns.

**11. Font Strategy**
Syne and DM Sans are available on Google Fonts — importable in both web AND Flutter
via `google_fonts` package. No custom font files needed for the port.

**12. Color Token System**
The CSS variables defined in Section 3 (design system) map directly to a Flutter
`ThemeData` extension:
```dart
// Flutter equivalent (for reference when porting)
// colors.dart
class PulseColors {
  static const bgPrimary = Color(0xFF050F1C);
  static const accentGreen = Color(0xFF00FF87);
  static const accentOrange = Color(0xFFFF6B35);
  static const textPrimary = Color(0xFFF0F4FF);
  // ... same token names as CSS variables
}
```
Using the same token names in both codebase eliminates color-related porting work entirely.

**13. Screen Size Breakpoints**
The web app uses only 2 layout modes:
- Mobile: `< 768px` — bottom nav, full-width cards, no sidebar
- Desktop: `>= 768px` — same layout but centered with max-width 480px container + side padding

The desktop version is NOT a wide web layout — it's a phone-sized column centered on screen,
as if the app is displayed on a big phone. This means zero layout differences to port.
Desktop users see the app exactly as Android users will.

```css
/* globals.css — App container */
.app-container {
  max-width: 480px;
  margin: 0 auto;
  min-height: 100vh;
  position: relative;
  /* On desktop: centered column with subtle shadow, looks like a phone frame */
  box-shadow: 0 0 60px rgba(0, 255, 135, 0.04);
}
```

**14. Supabase → Firebase Port Path**
Supabase (web) maps directly to Firebase (common in Flutter apps):
- `supabase.auth` → `FirebaseAuth`
- `supabase.from('table')` → `Firestore.collection('table')`
- `supabase.storage` → `Firebase Storage`
- `supabase pgvector` → Keep Supabase for vector, call same API from Flutter via http

All Supabase calls are isolated in `lib/supabase/` — the Flutter port only needs to
rewrite those files, keeping all business logic and UI untouched.

---

## 24. WEB APP AS "PHONE FRAME" ON DESKTOP

### The concept
On desktop browsers, the app renders as a centered phone-column (max 480px wide),
as if you're looking at an Android phone on your screen. This:
1. Makes the web version feel like a native app demo immediately
2. Requires zero additional layout work for mobile
3. Impresses hackathon judges (they'll see it on laptops — this stands out)
4. Eliminates all responsive design complexity — one layout rules all

### Implementation
```tsx
// app/(app)/layout.tsx
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      {/* Subtle outer glow on desktop to simulate phone screen glow */}
      <div className="relative w-full max-w-[480px] min-h-screen
                      bg-[var(--bg-primary)]
                      md:rounded-[2rem] md:overflow-hidden
                      md:shadow-[0_0_80px_rgba(0,255,135,0.06),0_0_0_1px_rgba(255,255,255,0.04)]
                      md:my-4 md:min-h-[calc(100vh-2rem)]">
        {/* Top status bar simulation on desktop */}
        <div className="hidden md:flex h-6 items-center justify-between px-6 pt-1">
          <span className="text-[10px] text-[var(--text-tertiary)]">09:41</span>
          <div className="flex gap-1">
            {/* Battery, signal, wifi icons — pure CSS */}
          </div>
        </div>
        {children}
        <BottomNavBar />
      </div>
    </div>
  )
}
```

### Visual result
- On mobile (390px): fills screen perfectly, bottom nav at bottom — native app feel
- On desktop (1440px): dark background, centered phone column with green glow, fake status bar
- On tablet (768px): same as desktop, slightly wider column

This is the **most impressive** web demo format for a mobile app — and requires zero extra work.



---

## 5. AUTHENTICATION PAGES

### Login Page
- Centered card on dark background with subtle radial glow behind it
- Logo + "Welcome back" headline
- Email + Password inputs with validation
- "Continue with Google" option (Supabase OAuth)
- "Don't have an account? Sign up" link
- Forgot password link

### Signup Page
- Multi-step form (2 steps):
  **Step 1**: Name, Email, Password, Country (dropdown: Togo, Nigeria, Ghana, Benin, CI)
  **Step 2** (optional): Date of birth, Gender, Weight (kg), Height (cm), Blood group
  Note: Step 2 is clearly labeled "Optional — helps us personalize your health advice"
- Progress indicator between steps
- Terms of service checkbox
- On success: redirect to `/dashboard`

---

## 6. HOME SCREEN (see Section 4.4 for complete spec)

> The home screen spec is fully defined in Section 4.4 above.
> Below are complementary widget details not covered there.

### Additional Widget Details

#### Widget 1 — Greeting + Health Score (Top, Full Width)
```
Good morning, [Name] 👋
Your health score today: 87/100 — Excellent
[Green progress bar]
```
Animated number on load.

#### Widget 2 — Daily Tip (Conseil du Jour)
Card with green left border, lightbulb icon:
```
💡 Today's Health Tip
"Drink at least 2 liters of water today.
Staying hydrated reduces headache frequency by up to 40%."
```
Each day a different tip is fetched from `/api/tip`.
The tip is generated by Groq LLM with a medical system prompt seeded with the current date
for variety. Cache it in localStorage per day to avoid re-fetching.

#### Widget 3 — Quick Actions (4 Buttons)
Large icon buttons in a 2x2 grid:
- 🔍 **New Diagnosis** → `/diagnostic`
- 🏥 **Find Hospital** → `/hospitals`
- 🌿 **Talk to Lyra** → `/lyra`
- 💊 **Scan Medication** → `/scan`

#### Widget 4 — Health Overview (Profile Summary)
If user provided health data:
```
Blood Group: O+  |  Weight: 72kg  |  Height: 175cm  |  BMI: 23.5 (Normal)
```
If not provided:
```
[Add your health data to get personalized advice →]
```
Small horizontal card with avatar/initials + colored health metrics.

#### Widget 5 — Recent Diagnoses
List of last 3 diagnoses with date, top condition detected, and severity badge.
"View Full History" link at bottom.
If no history: "No diagnoses yet. Start with your first check-up."

#### Widget 6 — Lyra Check-in Card
Small card with Lyra's avatar (abstract, friendly, non-human — circular gradient shape):
```
"How are you feeling today? I'm here when you need to talk."
[Start Conversation] button
```
Card has soft purple/teal gradient to differentiate it from medical (green/orange) sections.

---

## 7. DIAGNOSTIC PAGE — Core Feature

### 7.1 Input Section
**Page Title**: "AI Symptom Analysis" with Syne 32px
**Subtitle**: "Describe how you're feeling. I'll help identify what might be happening."

**Input Mode Toggle** (Pills): `✍️ Text` | `🎤 Voice` | `🌐 Language`

**Text Mode**:
- Large textarea (minimum 120px height, expandable)
- Placeholder: "Describe your symptoms... e.g., 'I have a headache for 2 days, fever of 38.5°C, and I feel very tired'"
- Character counter (min 20, max 1000)
- Helper text below: "Be as specific as possible — duration, intensity, location of pain"

**Voice Mode** (uses Groq Whisper):
- Large microphone button (green, pulsing ring when recording)
- Recording duration counter
- Transcription appears below in real-time as a text preview
- Edit transcription before submitting
- On submit: transcribed text is sent to diagnosis API

**Language Selector**: Dropdown with flags — 🇬🇧 English | 🇫🇷 Français | 🇹🇬 Ewe | 🇳🇬 Hausa | 🇳🇬 Yoruba
The response will be generated in the selected language.

**Additional Context** (expandable section):
- Age slider (10–90)
- Sex selector: Male / Female / Prefer not to say
- Duration: hours / days / weeks
- Known conditions: free text (optional)
- Pregnancy toggle (if female selected)

**Submit Button**: Large, full-width on mobile, centered on desktop
```
[🔍 Analyze My Symptoms]
```
Show loading state: spinning pulse icon + "Pulse AI is analyzing your symptoms..."
with 3 animated dots and rotating medical facts during wait (3–5 seconds typical)

### 7.2 Diagnosis Result Section
Results appear below the input with a smooth slide-in animation.

**Result Card Layout**:
```
┌─────────────────────────────────────────────────────────┐
│  SEVERITY ASSESSMENT                                     │
│  ██████████ MEDIUM RISK (6/10)                          │
│  Seek medical consultation within 24–48 hours           │
└─────────────────────────────────────────────────────────┘

  POSSIBLE CONDITIONS (ranked by probability)

  ┌─ 1. Typhoid Fever ─────────────── 72% probability ─┐
  │  Common in West Africa. Caused by Salmonella typhi  │
  │  transmitted via contaminated water or food.        │
  │  🔴 Seek doctor consultation                        │
  └────────────────────────────────────────────────────┘

  ┌─ 2. Malaria ───────────────────── 18% probability ─┐
  │  Symptoms overlap significantly. Requires blood     │
  │  test (RDT) to confirm. Very common in Togo.       │
  │  🔴 Get tested immediately                         │
  └────────────────────────────────────────────────────┘

  ┌─ 3. Viral Gastroenteritis ──────── 7% probability ─┐
  │  Less likely given the fever pattern described.     │
  │  Monitor and stay hydrated.                         │
  │  🟡 Monitor at home                                │
  └────────────────────────────────────────────────────┘

  FIRST AID RECOMMENDATIONS
  ✓ Rest and stay well-hydrated (oral rehydration salts if vomiting)
  ✓ Monitor temperature every 6 hours
  ✓ Avoid self-medication with antibiotics without prescription
  ✗ Do NOT ignore if fever exceeds 39.5°C

  ⚠️ DISCLAIMER: This is an AI-generated preliminary assessment.
  It does not replace professional medical diagnosis.
  Always consult a qualified healthcare provider.

  [🏥 Find Nearest Hospital] [💬 Ask Lyra for Support] [🔄 New Diagnosis]
```

**Probability bars**: Horizontal animated progress bars, color-coded by probability
(green > 60%, yellow 30–60%, orange < 30%)

**Disclaimer**: Always present, styled as a subtle bordered box, not dismissible.

**Save to History**: Automatically saved to Supabase after display if user is logged in.

### 7.3 API Route — /api/diagnose/route.ts
```typescript
// POST /api/diagnose
// Body: { symptoms: string, language: string, age?: number, sex?: string, context?: string }
// Returns: { conditions: DiagnosisCondition[], severity: SeverityLevel, firstAid: string[], disclaimer: string }

// SYSTEM PROMPT for Groq (llama-3.3-70b-versatile):
const DIAGNOSIS_SYSTEM_PROMPT = `
You are RuralDiag, Pulse AI's medical analysis engine trained for African healthcare contexts.
You analyze patient-reported symptoms and produce a structured differential diagnosis.

IMPORTANT RULES:
- Always produce a JSON response with the exact structure specified
- Rank conditions by probability (highest first)
- Be specific to African disease patterns (malaria, typhoid, cholera, meningitis, etc.)
- Set severity as: LOW, MEDIUM, HIGH, or CRITICAL
- Always include a disclaimer
- Respond in the user's requested language: {language}
- Never recommend specific prescription drugs
- Always recommend seeing a doctor for anything above LOW severity

RESPONSE FORMAT (JSON only, no markdown):
{
  "conditions": [
    {
      "name": "string",
      "probability": number (0-100),
      "description": "string (2 sentences max)",
      "recommendation": "string"
    }
  ],
  "severity": "LOW|MEDIUM|HIGH|CRITICAL",
  "severityScore": number (1-10),
  "severityMessage": "string",
  "firstAid": ["string", "string", "string"],
  "doNots": ["string"],
  "disclaimer": "string"
}
`;
```

### 7.4 Supabase Schema for Diagnosis History
```sql
CREATE TABLE diagnoses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  symptoms TEXT NOT NULL,
  language VARCHAR(10) DEFAULT 'fr',
  result JSONB NOT NULL,          -- Full JSON response from Groq
  top_condition VARCHAR(255),     -- Denormalized for quick display
  severity VARCHAR(20),           -- LOW|MEDIUM|HIGH|CRITICAL
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS Policy
ALTER TABLE diagnoses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own diagnoses" ON diagnoses
  FOR ALL USING (auth.uid() = user_id);
```

---

## 8. HOSPITAL FINDER PAGE

### 8.1 Layout
- **Left panel** (40% width desktop, full-width mobile): search + filter + hospital list
- **Right panel** (60% width desktop, hidden mobile): MapLibre map

### 8.2 Search and Filters
**Search Bar**: "Search hospitals by name or city..."
**Service Filter** (multi-select pills):
- Urgences / Emergency
- Maternité / Maternity
- Pédiatrie / Pediatrics
- Cardiologie / Cardiology
- Chirurgie / Surgery
- Radiologie / Radiology
- Psychiatrie / Psychiatry
- Pharmacie / Pharmacy

**Country Filter**: All | Togo | Nigeria | Ghana | Benin | Côte d'Ivoire
**Sort by**: Distance | Rating | Availability
**"Use My Location" button**: Uses browser geolocation API

### 8.3 Hospital Card
```
┌──────────────────────────────────────────────────────┐
│ 🏥 CHU Sylvanus Olympio                              │
│ Lomé, Togo  ●  2.3 km away                          │
│ ──────────────────────────────────────────────────── │
│ Services: Urgences  Chirurgie  Pédiatrie             │
│ ──────────────────────────────────────────────────── │
│ Beds: ██████░░░░  60% (est.)                         │
│ Status: 🟢 Open 24/7                                 │
│ ──────────────────────────────────────────────────── │
│ [📍 Get Directions] [📞 Call] [ℹ️ More Info]         │
└──────────────────────────────────────────────────────┘
```
Note: Bed availability shown as "estimated" — important for data honesty.

### 8.4 Map Configuration (MapLibre)
```typescript
// Use OpenStreetMap tiles (free, no key needed)
style: {
  version: 8,
  sources: {
    osm: {
      type: 'raster',
      tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
      tileSize: 256,
    }
  },
  layers: [{ id: 'osm', type: 'raster', source: 'osm' }]
}

// Custom hospital marker: green pulse dot with shadow
// Active hospital marker: slightly larger, bright green glow
// User location marker: blue dot with accuracy circle
```

### 8.5 GeoJSON Hospital Data Format
```json
{
  "type": "FeatureCollection",
  "country": "togo",
  "features": [
    {
      "type": "Feature",
      "geometry": {
        "type": "Point",
        "coordinates": [1.2255, 6.1375]
      },
      "properties": {
        "id": "tg_001",
        "name": "CHU Sylvanus Olympio",
        "city": "Lomé",
        "country": "Togo",
        "type": "public",
        "phone": "+228 22 21 25 01",
        "services": ["urgences", "chirurgie", "pediatrie", "maternite"],
        "opening_hours": "24/7",
        "emergency": true,
        "osm_id": 123456789
      }
    }
  ]
}
```

### 8.6 Proximity Search Logic
```typescript
// lib/hospitals/search.ts
// Haversine formula — pure client/server, no external API needed
function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth radius in km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}
```

---

## 9. LYRA — MENTAL HEALTH COMPANION

### 9.1 Design & Identity
Lyra is NOT a generic chatbot. She is a warm, culturally-aware African AI therapist.
- **Avatar**: Abstract circular shape with soft gradient (teal → purple), NOT a human face
- **Color accent for Lyra module**: `#A78BFA` (soft violet) + `#5EEAD4` (teal) — different from main green
- **Name displayed**: "Lyra 🌿" with a small leaf or moon icon
- **Personality**: Gentle, non-judgmental, uses "you" frequently, never clinical or cold
- **Opening message** (always): "Bonjour, je suis Lyra. Comment te sens-tu aujourd'hui ? Je suis là, sans jugement. 🌿"

### 9.2 Chat Interface
```
┌────────────────────────────────────────────┐
│  Lyra 🌿  •  Your mental health companion  │
│  "Always here. Always listening."          │
└────────────────────────────────────────────┘

[Conversation history — scrollable]

        ┌──────────────────────────────────────┐
        │ "I've been feeling very anxious      │
        │  about work lately."    [you] 14:32  │
        └──────────────────────────────────────┘

┌──────────────────────────────────────────────┐
│ I hear you, and what you're feeling is       │
│ completely valid. Anxiety about work is      │
│ very common, especially when pressure        │
│ accumulates. Would you like to explore       │
│ what's been weighing on you most?  🌿        │
│                               [Lyra] 14:32  │
└──────────────────────────────────────────────┘

Quick Suggestions:
[😔 I feel anxious] [😴 I can't sleep] [😢 I feel alone] [😤 I'm stressed]

[_____ Type a message... _____] [🎤] [Send]
```

### 9.3 RAG System for Lyra
Lyra uses Retrieval-Augmented Generation:
1. User sends message
2. System generates embedding of the message (HuggingFace API)
3. Query Supabase pgvector for the 5 most relevant mental health document chunks
4. Inject retrieved context into Lyra's system prompt
5. Groq generates the response grounded in the retrieved knowledge

**Lyra System Prompt**:
```typescript
const LYRA_SYSTEM_PROMPT = `
You are Lyra, Pulse AI's mental health companion. You are warm, empathetic,
culturally sensitive to West African contexts, and trained in supportive listening,
cognitive behavioral techniques, and mindfulness.

CONTEXT FROM KNOWLEDGE BASE:
{retrieved_context}

RULES:
- Never diagnose mental health conditions
- Always validate the user's feelings before offering perspective
- Use simple, warm language — not clinical terminology
- If the user expresses suicidal ideation or self-harm, immediately provide crisis resources:
  SOS Médecins Togo: +228 22 22 22 22 | Nigeria: 0800-SAFELINE
  And encourage them to seek immediate human support
- Respond in {language}
- Keep responses under 150 words unless user needs extended support
- End messages with a gentle follow-up question or affirmation
- Never give medical prescriptions
`;
```

### 9.4 Supabase Schema for RAG
```sql
-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Mental health knowledge base
CREATE TABLE lyra_knowledge (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  content TEXT NOT NULL,
  source VARCHAR(255),
  category VARCHAR(100),  -- e.g., 'anxiety', 'depression', 'stress', 'sleep'
  embedding vector(384),  -- all-MiniLM-L6-v2 produces 384-dim vectors
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Vector similarity search function
CREATE OR REPLACE FUNCTION match_lyra_knowledge(
  query_embedding vector(384),
  match_threshold FLOAT,
  match_count INT
)
RETURNS TABLE (id UUID, content TEXT, source VARCHAR, similarity FLOAT)
LANGUAGE SQL STABLE AS $$
  SELECT id, content, source, 1 - (embedding <=> query_embedding) AS similarity
  FROM lyra_knowledge
  WHERE 1 - (embedding <=> query_embedding) > match_threshold
  ORDER BY embedding <=> query_embedding
  LIMIT match_count;
$$;

-- Chat history (per user)
CREATE TABLE lyra_conversations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  messages JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE lyra_conversations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users own conversations" ON lyra_conversations
  FOR ALL USING (auth.uid() = user_id);
```

---

## 10. MEDICATION SCANNER PAGE

### 10.1 UI Layout
**Page Title**: "Medication Scanner" | "Vérificateur de Médicaments"
**Subtitle**: "Take a photo of any medicine to verify it and understand what it treats."

**Upload Zone** (large, dashed border, centered):
```
┌──────────────────────────────────────────┐
│           [Camera Icon]                  │
│   Take a photo or upload from gallery   │
│   Supported: JPG, PNG, HEIC             │
│   [📷 Open Camera]  [📁 Upload File]    │
└──────────────────────────────────────────┘
```

**Image Preview**: Once uploaded, show image in a rounded frame with option to retake.
**Scan Button**: `[🔍 Analyze Medication]` — triggers API call.

### 10.2 Result Display
```
┌──────────────────────────────────────────────────────┐
│ 💊 Paracétamol 500mg                                 │
│ Manufacturer: PHARMAQUICK — Togo                     │
│ ──────────────────────────────────────────────────── │
│ 🟢 LIKELY AUTHENTIC                                  │
│ Visual markers match known authentic batch           │
│ ──────────────────────────────────────────────────── │
│ WHAT IT TREATS                                       │
│ Pain relief (headache, body ache, menstrual pain)   │
│ Fever reduction                                     │
│ ──────────────────────────────────────────────────── │
│ DOSAGE GUIDE                                        │
│ Adults: 1–2 tablets every 4–6 hours (max 8/day)    │
│ Children: Consult packaging or doctor               │
│ ──────────────────────────────────────────────────── │
│ ⚠️ INTERACTIONS                                     │
│ Caution with: Warfarin, alcohol, other paracetamol  │
│ ──────────────────────────────────────────────────── │
│ ⚠️ Always consult a pharmacist or doctor for         │
│ prescription medications.                           │
└──────────────────────────────────────────────────────┘
```

### 10.3 API Route — /api/scan/route.ts
```typescript
// POST /api/scan
// Body: FormData with image file
// Process:
// 1. Upload image to Supabase Storage
// 2. Get public URL
// 3. Send URL + prompt to Groq vision model (llama-4-maverick-17b)
// Returns: JSON with drug info

const MEDSCAN_SYSTEM_PROMPT = `
You are PharmAI, Pulse AI's medication verification assistant.
You analyze photos of medications and provide structured information.
You specialize in medications common in West Africa (Togo, Nigeria, Ghana, Benin, Côte d'Ivoire).

Analyze the medication image and return JSON:
{
  "name": "string",
  "manufacturer": "string or null",
  "authenticityAssessment": "LIKELY_AUTHENTIC|UNCERTAIN|SUSPICIOUS",
  "authenticityNote": "string",
  "treats": ["string"],
  "dosageAdults": "string",
  "dosageChildren": "string or 'Consult doctor'",
  "interactions": ["string"],
  "sideEffects": ["string"],
  "disclaimer": "string"
}

If the image is not a medication, return: {"error": "not_a_medication"}
If image is unclear, return: {"error": "image_unclear"}
`;
```

---

## 11. USER PROFILE PAGE

### Sections
**Section 1 — Personal Info**
- Full name, Email, Country, Profile photo (upload to Supabase Storage)
- Edit button

**Section 2 — Health Data** (all optional)
- Weight (kg), Height (cm), Blood group (A+/A-/B+/B-/AB+/AB-/O+/O-)
- Date of birth, Sex, Known chronic conditions (text)
- These display in the dashboard Health Overview widget

**Section 3 — Preferences**
- Language preference: FR | EN
- Notification preferences (email for daily tip)

**Section 4 — Diagnosis History**
- Full list of past diagnoses with date, top condition, severity badge
- Click to expand and see full result

**Section 5 — Data & Privacy**
- "Download my data" button
- "Delete my account" (destructive, confirmation dialog)

---

## 12. MIDDLEWARE & AUTH GUARD

```typescript
// middleware.ts
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()
  const supabase = createMiddlewareClient({ req, res })
  const { data: { session } } = await supabase.auth.getSession()

  // Protect all /app/* routes
  if (!session && req.nextUrl.pathname.startsWith('/dashboard')) {
    return NextResponse.redirect(new URL('/auth/login', req.url))
  }
  if (!session && req.nextUrl.pathname.startsWith('/diagnostic')) {
    return NextResponse.redirect(new URL('/auth/login', req.url))
  }
  // ... same for hospitals, lyra, scan, profile
  return res
}

export const config = {
  matcher: ['/dashboard/:path*', '/diagnostic/:path*', '/hospitals/:path*',
            '/lyra/:path*', '/scan/:path*', '/profile/:path*']
}
```

---

## 13. MOBILE RESPONSIVENESS RULES

Every page must be fully functional and beautiful on mobile (320px–768px).

- **Landing page**: Single column, hero stacks vertically, nav collapses to hamburger
- **Dashboard**: All widgets full-width, stacked vertically
- **Diagnostic**: Input takes full screen width, results scroll below
- **Hospitals**: Map hidden by default, toggle button shows map; list view default
- **Lyra**: Full-screen chat, keyboard doesn't push content off screen
- **Sidebar**: Hidden on mobile, replaced by bottom tab navigation (5 tabs)

Bottom navigation tabs (mobile only):
```
[🏠 Home] [🔍 Diagnose] [🏥 Hospitals] [🌿 Lyra] [👤 Profile]
```
Active tab highlighted with green underline and icon.

---

## 14. ANIMATIONS & MOTION — Framer Motion

### Page Transitions
```typescript
// Wrap page content in motion.div
const pageVariants = {
  hidden: { opacity: 0, y: 20 },
  enter: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 }
}
// transition: { duration: 0.3, ease: 'easeInOut' }
```

### Staggered Card Lists
```typescript
const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
}
const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 }
}
```

### Count-Up Animation (Stats)
Use `framer-motion` with `useInView` + `useMotionValue` + `useTransform` for number counting.
Numbers count up from 0 to target value when section scrolls into view.

### Loading States
- **Diagnosis**: Pulsing heartbeat animation (CSS, green)
- **Map loading**: Skeleton overlay on map container
- **Chat loading**: Three bouncing dots (Lyra thinking animation)
- **Scan processing**: Scanning line animation (CSS) over the uploaded image

### Severity Badge Animation
On result display, severity badge does a brief `scale: [0.8, 1.1, 1]` bounce animation
to draw attention to the critical information.

---

## 15. INTERNATIONALIZATION (i18n)

Use `next-intl` for translations. Minimum: French (primary) and English.

Key strings to translate (example):
```json
{
  "fr": {
    "nav.diagnostic": "Diagnostic",
    "nav.hospitals": "Hôpitaux",
    "nav.lyra": "Lyra",
    "nav.scan": "Scanner",
    "diagnostic.placeholder": "Décrivez vos symptômes...",
    "diagnostic.submit": "Analyser mes symptômes",
    "diagnostic.analyzing": "Pulse AI analyse vos symptômes...",
    "severity.low": "RISQUE FAIBLE",
    "severity.medium": "RISQUE MODÉRÉ",
    "severity.high": "RISQUE ÉLEVÉ",
    "severity.critical": "CRITIQUE — Urgence"
  }
}
```

---

## 16. PERFORMANCE & SEO

### Performance targets
- Lighthouse score: > 85 overall
- LCP (Largest Contentful Paint): < 2.5s
- Use `next/image` for all images with proper sizes and formats
- Lazy load map component (dynamic import with `ssr: false`)
- Lazy load Framer Motion heavy components
- Cache daily tip in localStorage (key: `pulse_tip_{YYYY-MM-DD}`)

### SEO
```typescript
// app/layout.tsx
export const metadata = {
  title: 'Pulse AI — AI-Powered Healthcare for Africa',
  description: 'AI-powered symptom analysis, hospital finder, and mental health support for West Africa. Available in French, English, Hausa, Yoruba, and Ewe.',
  openGraph: {
    title: 'Pulse AI',
    description: 'Healthcare intelligence for every African.',
    image: '/og-image.png',  // 1200x630 dark branded image
    url: 'https://pulseai.vercel.app'
  },
  twitter: { card: 'summary_large_image' }
}
```

---

## 17. ERROR HANDLING & EDGE CASES

### Network errors
- Show friendly error toast (not browser alert)
- "Something went wrong. Please try again." in user's language
- Retry button on diagnosis and scan failures

### API Rate Limits (Groq)
- If Groq rate limit hit: show "Our AI is busy. Please wait a moment." message
- Implement exponential backoff (1s, 2s, 4s) before retrying
- Log failed requests to Supabase for monitoring

### Geolocation denied
- If user denies location: show country dropdown to select country manually
- Default to capital city of selected country for hospital search

### Empty states
Every list/section must have a designed empty state, not a blank space:
- No diagnoses: medical stethoscope icon + "Start your first health check"
- No hospitals found: map marker icon + "No hospitals match your filters. Try broadening your search."
- Lyra no history: Lyra avatar + opening message

### Form validation
- Real-time validation with inline error messages
- Green checkmark on valid fields
- Never let empty form submit

---

## 18. DEPLOYMENT CHECKLIST

Before demo / submission:
- [ ] All environment variables set in Vercel dashboard
- [ ] Supabase pgvector extension enabled
- [ ] Medical corpus ingested (at least 50 document chunks for Lyra RAG)
- [ ] All 5 country GeoJSON files present in /public/data/
- [ ] Test diagnosis with French symptoms (malaria, typhoid, paludisme)
- [ ] Test Lyra chat with anxious message
- [ ] Test medication scan with photo of common African drug (Paracetamol, Artemether)
- [ ] Hospital map loads and shows markers for Lomé, Togo
- [ ] Auth flow works (signup → verify → login → dashboard)
- [ ] Mobile layout tested on 375px viewport
- [ ] Lighthouse score > 85
- [ ] All pages have proper meta titles
- [ ] Disclaimer visible on diagnosis and scan results
- [ ] No console errors in production build
- [ ] `next build` passes without errors

---

## 19. HACKATHON PITCH OPTIMIZATION

The app must also serve as its own pitch deck. These elements ensure judges vote for Pulse AI:

### Impact Numbers to Display Prominently
- 2.5M preventable deaths/year in Sub-Saharan Africa
- < 60 seconds from symptom to diagnosis
- 5 countries covered from day 1
- 6 languages supported
- 0$ cost to patients — free forever for basic access

### Differentiators to Highlight in UI
1. **"Built for Africa, not adapted for Africa"** — use this phrase in hero copy
2. **Real hospital data** — not mock, pulled from OpenStreetMap
3. **WhatsApp bot** — show a QR code prominently for demo
4. **Lyra** — mental health is underserved in Africa, this is a key differentiator
5. **Multilingual** — French and English at minimum, Ewe/Hausa as bonus

### Demo Flow (for judges in 5 minutes)
1. Show landing page (20 sec) — let the design speak
2. Sign up or use demo account (10 sec)
3. Dashboard — "Here's what a patient sees every day" (30 sec)
4. Diagnosis — type symptoms in French, show ranked result (90 sec)
5. Hospital Finder — click "Find Hospital for this condition" (30 sec)
6. Lyra — send one message, show empathetic response (30 sec)
7. Medication Scanner — upload photo, show result (30 sec)
8. WhatsApp QR — "And all of this works on WhatsApp too" (10 sec)

### Visual Demo Data (pre-populated for demo account)
- User: "Demo Patient" | Country: Togo | Blood Group: O+
- 2 past diagnoses in history
- Lyra has 3 previous messages
- Daily tip pre-generated and displayed

---

## 20. MEDICAL CORPUS INGESTION SCRIPT

This script should be run once to populate Supabase pgvector for Lyra's RAG.
Teammate responsible: Person #2 (content researcher).

```typescript
// scripts/ingest-corpus.ts
// Run with: npx ts-node scripts/ingest-corpus.ts

import { createClient } from '@supabase/supabase-js'
import { HfInference } from '@huggingface/inference'

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!)
const hf = new HfInference(process.env.HUGGINGFACE_API_KEY!)

async function generateEmbedding(text: string): Promise<number[]> {
  const result = await hf.featureExtraction({
    model: 'sentence-transformers/all-MiniLM-L6-v2',
    inputs: text
  })
  return result as number[]
}

async function chunkText(text: string, chunkSize = 500): string[] {
  // Split by paragraphs, then by sentence boundaries
  // Target: 300-500 character chunks with overlap
}

async function ingestDocument(content: string, source: string, category: string) {
  const chunks = chunkText(content)
  for (const chunk of chunks) {
    const embedding = await generateEmbedding(chunk)
    await supabase.from('lyra_knowledge').insert({
      content: chunk,
      source,
      category,
      embedding
    })
  }
}

// Documents to ingest:
// - WHO mental health action plan for Africa
// - Anxiety management techniques (CBT-based)
// - Depression support guide (simplified)
// - Stress and burnout recovery
// - Sleep hygiene guide
// - Grief and loss support
// - Relationship and communication
// - African cultural context for mental health stigma
```

---

## 21. OVERPASS API SCRIPT FOR HOSPITAL DATA

Person #3 is responsible for running this and generating the GeoJSON files.

```python
# scripts/extract_hospitals.py
import requests
import json

COUNTRIES = {
    "togo": {"area": "area[name='Togo']", "output": "hospitals_togo.geojson"},
    "nigeria": {"area": "area[name='Nigeria']", "output": "hospitals_nigeria.geojson"},
    "ghana": {"area": "area[name='Ghana']", "output": "hospitals_ghana.geojson"},
    "benin": {"area": "area[name='Bénin']", "output": "hospitals_benin.geojson"},
    "cote_divoire": {"area": "area[name=\"Côte d'Ivoire\"]", "output": "hospitals_cote_divoire.geojson"},
}

OVERPASS_URL = "https://overpass-api.de/api/interpreter"

def extract_hospitals(country_name: str, area_query: str) -> dict:
    query = f"""
    [out:json][timeout:60];
    {area_query}->.searchArea;
    (
      node["amenity"="hospital"](area.searchArea);
      way["amenity"="hospital"](area.searchArea);
      node["amenity"="clinic"](area.searchArea);
    );
    out center tags;
    """
    response = requests.post(OVERPASS_URL, data={"data": query})
    data = response.json()
    
    features = []
    for element in data["elements"]:
        lat = element.get("lat") or element.get("center", {}).get("lat")
        lon = element.get("lon") or element.get("center", {}).get("lon")
        if not lat or not lon:
            continue
        
        tags = element.get("tags", {})
        features.append({
            "type": "Feature",
            "geometry": {"type": "Point", "coordinates": [lon, lat]},
            "properties": {
                "id": f"{country_name}_{element['id']}",
                "name": tags.get("name") or tags.get("name:fr") or "Unknown Hospital",
                "city": tags.get("addr:city", ""),
                "country": country_name.title(),
                "type": "public" if tags.get("operator:type") == "public" else "private",
                "phone": tags.get("phone") or tags.get("contact:phone", ""),
                "services": extract_services(tags),
                "opening_hours": tags.get("opening_hours", ""),
                "emergency": tags.get("emergency") == "yes",
                "osm_id": element["id"]
            }
        })
    
    return {"type": "FeatureCollection", "country": country_name, "features": features}

def extract_services(tags: dict) -> list:
    services = []
    if tags.get("emergency") == "yes": services.append("urgences")
    if tags.get("healthcare:speciality"): 
        services.extend(tags["healthcare:speciality"].split(";"))
    return services or ["general"]
```

---

## 22. FINAL REMINDERS FOR AGENT

1. **Never skip the disclaimer** on diagnosis and medication scan results. It's non-negotiable.
2. **Design comes first** — judges see the UI before they evaluate the code. Make it stunning.
3. **Every page must be fully responsive** — test on 375px width.
4. **Use Syne for headings, DM Sans for body** — never Inter or Arial.
5. **The color green `#00FF87` is the brand** — use it for all CTAs, active states, and success indicators.
6. **Framer Motion on every page** — at minimum, page fade-in and staggered card animation.
7. **All text must be bilingual-ready** — wrap strings in `t()` translation function from the start.
8. **Groq Whisper for voice** — implement voice input on diagnosis page, it's a major differentiator.
9. **Save every diagnosis to Supabase** — users need to see their history.
10. **The landing page IS the pitch** — it must be marketing-grade, not just a features list.
11. **Lyra must feel different from the rest of the app** — different color accent, different typography weight, warmer tone.
12. **Hospital data must load fast** — GeoJSON is client-side, parse it on startup and cache in memory.
13. **Mobile bottom nav** — build it properly, don't hide it, it's the primary nav for 80% of African users.
14. **Build the demo account** — hardcode a demo user with pre-populated data for the hackathon presentation.
15. **Zero budget mindset** — every service used must have a free tier. Never commit to paid services.

---

*This document is the complete specification for Pulse AI v2.*
*Built by 34AI for the Africa Developers Hackathon 2026.*
*Goal: First prize. $5,000. Lives saved.*
