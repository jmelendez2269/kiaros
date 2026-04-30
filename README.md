# Kiaros — Personalized Planning System

A personalized planning system built around your goals, timing, and natural cycles.

## Project Overview

Kiaros is the founding beta product. This is an MVP implementation focused on:
- Guided onboarding (capture meaningful user context)
- Personalized blueprint generation
- Current-time guidance and planning
- Beta feedback loop

See [docs/](./docs) for product strategy and build sequence.

## Tech Stack

- **Framework**: Next.js 15 with TypeScript
- **UI**: Tailwind CSS + shadcn/ui components
- **Auth**: Clerk
- **Database**: Supabase (PostgreSQL)
- **AI**: OpenAI (for blueprint generation)

## Project Structure

```
kiaros/
├── app/
│   ├── (auth)/                 # Public auth routes (sign-in, sign-up)
│   ├── (app)/                  # Protected app routes
│   │   ├── onboarding/         # Multi-step onboarding flow
│   │   ├── dashboard/          # Main dashboard/overview
│   │   ├── blueprint/          # Blueprint view
│   │   └── layout.tsx          # App layout with header/footer
│   ├── api/                    # API routes (backend)
│   │   ├── onboarding/
│   │   ├── blueprint/
│   │   └── feedback/
│   ├── globals.css             # Tailwind styles
│   └── layout.tsx              # Root layout with Clerk provider
│
├── lib/
│   ├── types.ts                # Shared TypeScript types
│   ├── constants.ts            # App constants
│   ├── utils.ts                # Utility functions
│   ├── supabase.ts             # Supabase client & queries
│   ├── services/               # Business logic
│   │   ├── blueprint.ts        # Blueprint generation/retrieval
│   │   ├── onboarding.ts       # Onboarding data management
│   │   └── user.ts             # User profile management
│   └── hooks/                  # Custom React hooks
│       └── useUser.ts          # User context hook
│
├── public/                     # Static assets
├── docs/                       # Product documentation
│   ├── kiaros-ai-dev-starter-pack-v1.md
│   ├── kiaros-developer-handoff-v1.md
│   ├── kiaros-mvp-cut-v1.md
│   └── kiaros-build-sequence-v1.md
│
├── .env.local.example          # Environment variables template
├── package.json                # Dependencies
├── tsconfig.json               # TypeScript config
├── tailwind.config.ts          # Tailwind configuration
└── README.md                   # This file
```

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn

### Setup

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Configure environment variables**
   ```bash
   cp .env.local.example .env.local
   ```
   
   Then fill in:
   - Clerk keys (from clerk.com)
   - Supabase URL and keys (from supabase.com)
   - Anthropic API key (from console.anthropic.com)
   - Stripe secret key and webhook secret (from dashboard.stripe.com)

3. **Start development server**
   ```bash
   npm run dev
   ```

   Navigate to http://localhost:3000

## Feature Status

### ✅ Implemented (Skeleton)
- Auth flow (Clerk integration)
- Route structure
- Onboarding form shells (5 steps)
- Dashboard placeholder
- Blueprint view placeholder
- API route structures
- TypeScript types
- Service layer stubs

### 🔄 In Progress / TODO
- Supabase integration (tables, migrations)
- Onboarding form validation
- Blueprint generation (template or AI-based)
- Current guidance derivation
- Feedback capture
- Visual polish

### ❌ Not Building in MVP
- Full tracker system
- Deep journaling suite
- Quarterly reviews
- Year Unwrapped
- Advanced analytics
- Extensive settings systems

## Onboarding Flow

Users progress through 5 steps:

1. **Birth Information** — Name, date of birth, time of birth
2. **Location** — Birth city and country
3. **Goals & Categories** — Life focus areas and primary goals
4. **Vision & Season** — Current season description and 90-day focus
5. **Recent Reflection** — Recent events, energy level, current state

After completion → Blueprint generation → Dashboard with current guidance

## Key Architecture Decisions

### Why Supabase?
- PostgreSQL database with great DX
- Built-in auth integration (though using Clerk for more control)
- Real-time capabilities for future features
- Simple to self-host or scale

### Why Clerk?
- Superior UX for auth flows
- Webhook support for user management
- Built for modern web apps
- Dark mode support out of the box

### Why shadcn/ui?
- Headless component library (full control)
- Excellent Tailwind integration
- Dark mode first
- No vendor lock-in

### Blueprint Generation Strategy
For MVP, recommend starting with **template + AI fills** approach:
- Define structure (season, goals, energy, guidance)
- Use templates as base
- Let Claude/GPT-4 personalize sections
- Much faster iteration than full generation
- More consistent output quality

## Next Steps

### Stage 2: Onboarding Implementation
- [ ] Add form validation
- [ ] Implement step progression logic
- [ ] Connect to Supabase onboarding_data table
- [ ] Add progress indicator

### Stage 3: Blueprint Generation
- [ ] Design blueprint data structure (exact sections, schema)
- [ ] Implement generation endpoint (template or AI)
- [ ] Create storage in Supabase
- [ ] Build blueprint rendering

### Stage 4: Dashboard & Current Guidance
- [ ] Derive weekly guidance from blueprint
- [ ] Implement energy framing
- [ ] Create current week view
- [ ] Add links to blueprint

### Stage 5: Beta Support
- [ ] Light interpretation layer (chat or contextual blocks)
- [ ] Feedback form implementation
- [ ] Beta invite/access flow

## Database Schema (To Implement)

See [lib/supabase.ts](./lib/supabase.ts) for full schema definition.

Key tables:
- `users` — User profiles (linked to Clerk)
- `onboarding_data` — User input from onboarding flow
- `blueprints` — Generated personalized blueprints
- `current_guidance` — Weekly/current guidance
- `feedback` — Beta user feedback

## Development Tips

### Debugging
- Check browser console for client-side errors
- Use Next.js error overlay for server errors
- Clerk logs in dashboard (clerk.com)

### Adding a New Form Field
1. Update `OnboardingData` type in `lib/types.ts`
2. Add field to appropriate onboarding step
3. Update validation in `lib/services/onboarding.ts`
4. Add to Supabase schema migration (when implementing)

### Testing Clerk Auth
1. Sign up creates new Clerk user
2. After signup, gets redirected to `/onboarding`
3. Protect routes with `auth()` from `@clerk/nextjs/server`

## Code Style

- Use TypeScript for type safety
- Prefer functional components with hooks
- Use Tailwind classes (no inline CSS)
- Add TODO comments for stubbed features
- Keep components focused and small

## Notes for AI Coding Assistant

This skeleton is intentionally sparse with clear TODOs. When implementing:

1. **Follow MVP boundaries** — don't add features beyond onboarding → blueprint → current guidance
2. **Preserve structure** — don't reorganize files unless requested
3. **Keep it simple** — prefer straightforward implementations over premature optimization
4. **Document TODOs** — mark what's stubbed vs implemented
5. **Test manually** — features should work end-to-end before moving on

## Resources

- [Next.js Docs](https://nextjs.org/docs)
- [Clerk Docs](https://clerk.com/docs)
- [Supabase Docs](https://supabase.com/docs)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [Product Strategy](./docs/kiaros-developer-handoff-v1.md)

---

**Status**: MVP Skeleton Phase
**Last Updated**: April 2026
