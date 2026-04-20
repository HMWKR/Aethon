# AETHON

**AI Video Creation Studio** — _Let AI handle prompts. You direct the story._

**Status:** Phase 0 — Bootstrapping

---

## Overview

AETHON is a timeline-based AI video creation studio that brings the Claude Design philosophy — **fixed values + inline editing** — to the video domain for the first time. Creators focus on story and direction; AETHON handles repetitive prompt engineering and cross-scene consistency (character appearance, background, art style).

**The problem.** Current AI video tools (Runway Gen-3, Kling, Pika, Sora, etc.) generate great single scenes but break character and world consistency across scenes. Creators must re-type appearance, background, and style prompts for every shot.

**The solution.** A timeline workspace with character/background cards (fixed values), inline pin-based regeneration, and a multi-model router that picks the best image/video AI per scene — all under a unified intent input.

**Differentiation.** AETHON is the first tool that (a) applies Claude Design's fixed-value + inline-edit UX to video, and (b) consolidates 5 image models and 9 video models behind a single scene-aware router with manual override.

---

## MVP (D+60)

| # | Feature | Definition of Done |
|---|---|---|
| M1 | Timeline + Scene cards | Script input -> AI auto-splits ~30 scenes -> drag reorder/resize -> click to preview |
| M2 | Character cards with fixed values | Register appearance + reference image -> IP-Adapter keeps face cosine similarity >= 0.80 |
| M3 | Inline pin regeneration | Drag region -> comment -> FLUX Fill inpaint -> before/after slider |
| M4 | Image -> Video conversion | Per-scene image -> Runway/Kling/etc. -> motion + camera UI -> timeline auto-placement -> MP4 export |

---

## Architecture

Turborepo + pnpm monorepo.

```
aethon/
├─ apps/
│  ├─ web/          # Next.js 16 + Vercel Fluid Compute
│  └─ desktop/      # Tauri 2.0 native shell (React core reused)
├─ packages/
│  ├─ ui/           # Shared React components (timeline, cards, inline pin)
│  ├─ core/         # Platform-independent domain logic
│  ├─ ai/           # AI adapters (Claude, FLUX, Runway, Kling, Veo 3, etc.)
│  ├─ adapters/     # Platform branches (web FS / Tauri FS, FFmpeg.wasm / native)
│  └─ db/           # Supabase client + schema
└─ docs/
   └─ domain-knowledge/   # Per-agent insight logs
```

### Tech Stack (confirmed)

- **Framework:** Next.js 16 App Router + React 19
- **Runtime:** Vercel Fluid Compute (Node.js 24 LTS, 300s timeout)
- **Desktop:** Tauri 2.0 + Rust
- **AI text:** Claude Sonnet 4.6 + Prompt Caching
- **AI Gateway:** Vercel AI Gateway (unified provider + fallback + cost tracking)
- **Image models (5):** fal.ai FLUX + IP-Adapter / Nano Banana (Gemini 2.5 Flash Image) / Ideogram / DALL-E 3 / SDXL + ControlNet
- **Video models (9):** Runway Gen-3 / Kling 2.0 / Google Veo 3 / ByteDance Seedance / xAI Grok Imagine / Luma Dream Machine / Pika 2.5 / Hailuo MiniMax / Sora 2
- **Inpainting:** FLUX Fill + Nano Banana Edit
- **DB:** Supabase (Postgres + Storage + Realtime)
- **Auth:** Clerk (Vercel Marketplace)
- **Storage:** Vercel Blob (private) + Supabase Storage
- **Video render:** FFmpeg.wasm (web) / FFmpeg native (desktop)
- **Deploy:** Vercel (web) + GitHub Actions (desktop builds)

---

## Getting Started

> TBD — monorepo setup in progress (Phase 0).
> See `.claude/plans/ai-typed-dusk.md` for the full roadmap.

Planned:

```bash
pnpm install
pnpm --filter web dev         # http://localhost:3000
pnpm --filter desktop tauri dev
```

---

## Roadmap

- **Phase 0** — Monorepo + Supabase schema + Vercel link
- **Phase 1–5** — MVP (M1–M4 + QA + web deploy), D+60
- **Phase 6–7** — Tauri 2.0 desktop shell + native features, D+75
- **Phase 8–12** — Post-MVP: storytelling assistant, world bible editor, TTS + multilingual, realtime collab, template marketplace, D+160

Full plan: [`.claude/plans/ai-typed-dusk.md`](.claude/plans/ai-typed-dusk.md)

---

## Success Criteria (SMART)

| # | Metric | Target |
|---|---|---|
| S1 | Character face consistency (cosine similarity across 10 scenes) | >= 0.80 |
| S2 | Time to produce a 5-minute video vs. Runway-only | -70% |
| S3 | Inline-pin regeneration convergence | <= 2.5 attempts |
| S4 | MVP launch | Vercel production + 10 external users, D+60 |

---

## Contributing

Phase 0 is a closed-core bootstrapping phase. External contribution guidelines will be published alongside the MVP release.

Development rules, agent roster, and commit conventions live in [`CLAUDE.md`](./CLAUDE.md).

---

## License

TBD.
