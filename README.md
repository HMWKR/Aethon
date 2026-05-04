# AETHON

**AI-native Video Editing Studio** — _AI advises. You choose. The timeline remembers._

**Status:** Phase 0.5 — Monorepo bootstrap started · Adviser-first docs sync complete · Professional editor workspace loop verified · Supabase local runtime gates verified · Local render/C2PA-ready artifact proof verified

---

## Overview

AETHON is an AI-native non-linear editor for creators who already make AI videos. It brings fixed creative context, scene-by-scene decisions, model recommendations, generation history, partial revision, rights tracking, and final editing into one timeline.

**The problem.** Current AI video workflows are split across image tools, video models, prompt notes, storage folders, and final editors. Creators must manually preserve character/world consistency, compare model choices, track costs, and remember why each scene was generated in a certain way.

**The solution.** A timeline workspace with character/background/reference cards, AI Control Center, scene board, model recommendation, inline pin-based revision, and export gates. AI does not become the responsible author. It helps users notice missed risks, compare better options, and make informed choices.

**Differentiation.** AETHON is not a black-box auto-generation product. Its default mode is **Adviser Mode**: AI proposes choices with reasons, costs, risks, and alternatives. Users can switch task-by-task between `Auto`, `Adviser`, and `Off`.

---

## MVP (D+60)

| # | Feature | Definition of Done |
|---|---|---|
| M0 | AI Control Center | Global `Auto / Adviser / Off` mode + task-level mode settings for model choice, prompts, consistency, cost, rights, and export QC |
| M1 | Timeline + Scene cards | Plan/table/script input -> user-approved scene suggestions -> drag reorder/resize -> click to preview |
| M2 | Character cards with fixed values | Register appearance + reference image -> IP-Adapter keeps face cosine similarity >= 0.80 |
| M3 | Inline pin regeneration | Drag region -> comment -> FLUX Fill inpaint -> before/after slider |
| M4 | Image -> Video conversion | Per-scene image -> model recommendation -> user approval or override -> motion + camera UI -> MP4 export |

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
├─ docs/
│  └─ domain-knowledge/   # Per-agent insight logs
└─ agents/
   ├─ AGENT_CONTRACT.md   # Runtime-neutral agent/harness contract
   ├─ CODEX_RUNTIME.md    # Codex all-agent wave/runtime adapter
   └─ *.md                # 23 canonical role contracts
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

## Documentation

| Document | Path | Description |
|---|---|---|
| Project Plan | `.claude/plans/ai-typed-dusk.md` | Full implementation plan — 4-Frame, 12 Phases, multi-model routing |
| PRD | `docs/PRD.md` | Product Requirements — 6 personas, MVP M1~M4, 30 acceptance criteria |
| Vision | `docs/VISION.md` | 1y/3y/5y vision matrix, 5 expansion scenarios, 5 pivot triggers |
| Roadmap | `docs/ROADMAP.md` | 12 Phase detailed roadmap with risk register |
| Business Plan (HTML) | `docs/business-plan/index.html` | 18-section IR deck (open in browser) |
| Market/Repo Analysis | `docs/business-plan/aethon-market-repo-analysis-2026-05-03.html` | Repo audit, market research, GitHub video editor benchmark, AI Control Modes |
| Studio Screenshot | `docs/business-plan/assets/aethon-studio-ai-control-center-1440.png` | First Playwright-verified AI Control Center screen |
| Approval Flow Screenshot | `docs/business-plan/assets/aethon-ai-control-approval-flow-1440.png` | Interactive approval gate, risk, cost, and option comparison screen |
| Editor Workspace Screenshot | `docs/business-plan/assets/aethon-editor-workspace-1440.png` | Premiere/CapCut-style editor workspace: project bin, monitors, inspector, tool rail, multitrack timeline |
| Editor Responsive Evidence | `docs/business-plan/assets/aethon-editor-workspace-1366x768.png`, `docs/business-plan/assets/aethon-editor-workspace-mobile-390.png` | Desktop minimum and mobile review-mode Playwright evidence |
| Production Readiness Evidence | `docs/business-plan/assets/aethon-loop2-ai-inspector-1440.png`, `docs/business-plan/assets/aethon-loop2-clip-inspector-1440.png`, `docs/business-plan/assets/aethon-loop2-export-gate-1440.png`, `docs/business-plan/assets/aethon-loop2-mobile-390.png` | SceneSpec, provider capability, validation report, rights/cost blockers, export gate evidence |
| Adviser Decision Evidence | `docs/business-plan/assets/aethon-loop8-adviser-decision-export-1440.png`, `docs/business-plan/assets/aethon-loop8-adviser-decision-export-mobile-390.png` | Loop 8 desktop/mobile evidence: editor-approved AI suggestion, remaining export blockers, console errors 0 |
| Loop 8 Local DDR | `docs/business-plan/loop8-adviser-decision-export-gate-ddr-2026-05-03.html` | Adviser decision workflow, visual evidence, verification, dark-pattern review |
| OSS Video Editor Benchmark | `docs/business-plan/open-source-video-editor-benchmark-2026-05-03.md` | Competitor and GitHub high-star OSS benchmark for next NLE/IDE loops |
| 100% Production Scorecard | `docs/business-plan/aethon-100-percent-production-scorecard.md` | Objective weighted readiness rubric, competitor benchmark sources, exit criteria, immediate backlog |
| Loop 11A Evidence | `docs/business-plan/assets/aethon-loop11a-codex-agent-scorecard-before-1440.png`, `docs/business-plan/assets/aethon-loop11a-codex-agent-scorecard-before-mobile-390.png` | Playwright MCP before-state screenshots for Codex agent/scorecard loop and FE visual gap review |
| Loop 11A Export Fix Evidence | `docs/business-plan/assets/aethon-loop11a-disabled-export-after-1440.png`, `docs/business-plan/assets/aethon-loop11a-disabled-export-after-mobile-390.png`, `docs/business-plan/assets/aethon-loop11a-disabled-export-after-export-tab-1440.png` | Playwright MCP after-state screenshots for disabled Export affordance fix |
| Loop 11A Cantos Evidence | `docs/business-plan/assets/aethon-cantos-adr-0013-codex-agent-contracts-1440.png` | Playwright MCP screenshot of Cantos ADR-0013 |
| Loop 11B Timeline Evidence | `docs/business-plan/assets/aethon-loop11b-timeline-split-after-1440.png`, `docs/business-plan/assets/aethon-loop11b-timeline-ripple-delete-after-1440.png` | Playwright MCP after-state screenshots for split and ripple delete timeline workflow |
| Loop 11C Cantos Evidence | `docs/business-plan/assets/aethon-cantos-adr-0015-loop11c-1440.png`, `docs/business-plan/assets/aethon-cantos-ddr-0023-loop11c-gate-1440.png` | Playwright MCP screenshots of Cantos ADR-0015 and DDR-0023 for deterministic AI planner/export QC/schema drift gates and production gate evidence |
| Loop 11R Timeline Navigator Evidence | `docs/business-plan/assets/aethon-loop11r-timeline-navigator-1440.png`, `docs/business-plan/assets/aethon-loop11r-timeline-navigator-mobile-390.png` | Desktop/mobile production screenshots for direct timeline scrollbar + minimap navigation |
| Loop 11S Media Import Evidence | `docs/business-plan/assets/aethon-loop11s-media-import-persistence-1440.png`, `docs/business-plan/assets/aethon-loop11s-media-import-persistence-mobile-390.png` | Desktop/mobile production screenshots for browser-local media import, project bin persistence, and Source Monitor metadata readout |
| Loop 11T Export Manifest Evidence | `docs/business-plan/assets/aethon-loop11t-export-manifest-evidence-1440.png`, `docs/business-plan/assets/aethon-loop11t-export-manifest-evidence-mobile-390.png` | Desktop/mobile production screenshots for concrete export manifest asset/model/validation/cost/rights evidence and generated-content label |
| Loop 11U Media Search Evidence | `docs/business-plan/assets/aethon-loop11u-media-search-tags-1440.png`, `docs/business-plan/assets/aethon-loop11u-media-search-tags-mobile-390.png` | Desktop/mobile production screenshots for browser-local import tags, deterministic thumbnail labels, search, and tag filtering |
| Loop 11V Supabase Runtime Evidence | `supabase/config.toml`, `supabase/migrations/20260504150838_initial_ai_control.sql`, `packages/db/verification/provider-sim-runtime-check.sql` | Local Supabase CLI/Docker evidence for RLS catalog, provider-sim queue/claim/complete, retry/idempotency, lease rejection, failed-path no-export, and owner isolation |
| Loop 11W Render/C2PA Evidence | `docs/business-plan/assets/aethon-loop11w-render-artifact-proof-1440.png`, `docs/business-plan/assets/aethon-loop11w-render-artifact-proof-mobile-390.png`, `docs/business-plan/assets/aethon-loop11w-c2pa-render-proof-1440.png`, `docs/business-plan/assets/aethon-loop11w-c2pa-render-proof-mobile-390.png` | Desktop/mobile production screenshots for render artifact id, deterministic checksum, artifact URI, generated-content label, local C2PA-ready verification, policy, signature, signer, and manifest hash |
| Agent Contract | `agents/AGENT_CONTRACT.md` | Runtime-neutral agent contract plus CE/AC/GC/EL/SI harness axis mapping |
| Codex Agent Runtime | `agents/CODEX_RUNTIME.md` | Codex all-agent wave order, OOM prevention, prompt template, execution modes |
| Agent Matrix | `.claude/rules/agent-matrix.md` | 23 agents · 7 groups · trigger keywords · runtime adapter rules |
| Domain Insights | `docs/domain-knowledge/*.md` | Per-team accumulated knowledge |
| Cantos ADR/DDR | `C:\Users\jusan\Desktop\cantos\projects\aethon\` | ADR/DDR decision memory, UI/UX records, future screenshots |

> Open the IR deck: `start docs/business-plan/index.html` (Windows) or `open docs/business-plan/index.html` (macOS)

---

## Getting Started

```bash
pnpm install
pnpm supabase:start
pnpm supabase:db:reset
pnpm supabase:verify
pnpm --filter @aethon/web dev # default http://localhost:3000, use next free port if occupied
pnpm --filter desktop tauri dev
```

The first web studio screen now exists under `apps/web/app/page.tsx`. It has moved from an AI Control Center-first scaffold to a professional editor workspace: Project Bin, IDE Context, Source Monitor, Program Monitor, AI/Clip/Export Inspector, Tool Rail, and multitrack Timeline.

The AI Control Center policy lives in `packages/core/src/` and is covered by Vitest. AI is now placed inside the Adviser inspector layer, while `apps/web/app/actions/ai-control.ts` defines the server-action boundary for future Supabase persistence. Cantos DDR `0018-premiere-capcut-editor-workspace-loop-1.html` records the editor workspace decision and Playwright screenshots.

Loop 2 adds the production-readiness layer in `packages/core/src/production-readiness.ts`: `SceneSpec`, provider capability registry, validation reports, cost ledger, rights manifest, and export readiness evaluation. The UI now shows those contracts inside AI/Clip/Export Inspector surfaces, and Cantos DDR `0019-loop2-production-readiness-gates.html` records the adviser-led gate decision.

Loop 3 persists the same readiness contract in Supabase. `packages/db/schema.sql` and `packages/db/migrations/0001_initial_ai_control.sql` now include `scene_specs`, `provider_capability_versions`, `validation_reports`, `cost_ledger_entries`, `rights_manifest_entries`, and expanded `export_manifests`. Server actions now derive persisted user identity through Supabase auth instead of trusting a client-provided `userId`. Cantos ADR `0008-persist-production-readiness-contracts.html` records the data/security decision.

Loop 4 adds the first DB/security verification harness. `packages/db/src/schema-security.test.ts` checks both schema and migration SQL for readiness tables, RLS, owner policies, append-oriented ledger grants, destructive SQL absence, and Clerk JWT `sub` trust boundaries. `apps/web/app/actions/ai-control.test.ts` checks persisted server-action guardrails. Root `pnpm test` now runs 32 tests across core/db/web. Cantos ADR `0009-static-rls-security-harness-before-local-supabase.html` records the verification decision.

Loop 7 adds `packages/db/verification/rls-catalog-check.sql`, a live Supabase/Postgres catalog check for `pg_class.relrowsecurity`, `pg_policies`, and `information_schema.role_table_grants`.

Loop 6 adds browser smoke coverage to the production gate. `apps/web/tests/e2e/studio.smoke.spec.ts` checks desktop and mobile editor load, console errors, critical panels, and export blocker behavior. `apps/web/vitest.config.ts` keeps Vitest unit tests separate from Playwright e2e tests. Cantos ADR `0011-browser-smoke-in-production-gate.html` records the browser gate decision.

Loop 8 strengthens the adviser-first editing workflow. `apps/web/app/studio-client.tsx` now exposes stable selectors for AI metrics, inspector bodies, tool rail buttons, selected timeline clips, and the export master gate. `apps/web/tests/e2e/studio.smoke.spec.ts` now verifies explicit AI adviser decisions, all-suggestions-handled export blocking, risky generated clip validation context, and tool state persistence across desktop and mobile. Local DDR `docs/business-plan/loop8-adviser-decision-export-gate-ddr-2026-05-03.html` records the decision because external evidence export was not used for this loop.

Loop 9 starts the DB-backed adviser decision persistence hardening. `packages/db/schema.sql` and `packages/db/migrations/0001_initial_ai_control.sql` now define `record_ai_decision_and_queue_generation_run`, a security-invoker RPC that records the AI decision audit and queues the approved generation run in one database transaction. `packages/db/verification/rls-catalog-check.sql` now checks the RPC, execute grant, and approved-suggestion dedupe index. The next product loop should use `docs/business-plan/open-source-video-editor-benchmark-2026-05-03.md` to prioritize actual NLE editing primitives over cosmetic UI.

Loop 10A closes two production trust gaps before real provider execution. Server Actions now runtime-validate unknown inputs and, on persisted paths, re-read the stored suggestion/preferences before recalculating approval gates. Export readiness now treats a missing validation report for any generated-video scene as a blocker. The production gate also runs browser smoke against `next start`, not `next dev`.

Loop 11A starts Codex-native agent architecture hardening. The 23 AETHON role contracts now live under root `agents/*.md`, while `.claude/agents/*.md` remains a Claude compatibility path. Codex all-agent work uses `agents/CODEX_RUNTIME.md`: all roles are still covered, but large sessions use lightweight batches instead of full-context forks.

Loop 11V installs and verifies the local Supabase runtime path. The root Supabase CLI dev dependency is available through `pnpm exec supabase`, `supabase/config.toml` initializes the local project, and `supabase/migrations/20260504150838_initial_ai_control.sql` mirrors the AETHON initial DB contract. `pnpm supabase:verify` now runs both `rls-catalog-check.sql` and `provider-sim-runtime-check.sql` against local Supabase without touching production. The runtime gate proves ledger grants, RLS owner isolation, provider-sim queue/claim/complete, same-token retry idempotency, different-worker and stale-lease rejection, failed completion without export manifest, and fixture cleanup.

Loop 11W adds local render artifact proof to the export provenance contract. `ExportManifest` now carries a deterministic render artifact id/URI/checksum plus a local provenance attachment. Provider-sim successful exports produce those fields, DB schema/migrations/RPC/repository mapping preserve them through first-class export manifest columns, and the Studio Export inspector shows render artifact plus C2PA-ready verification/policy/signature evidence while final export remains blocked by unresolved QC/rights issues. This is local attestation evidence, not production C2PA signing.

The current product readiness baseline is tracked in `docs/business-plan/aethon-100-percent-production-scorecard.md`: Codex harness readiness is 8.8/10, while product production readiness is 68/100 against the competitor-backed rubric. This separates development-system quality from actual video editor completeness.

---

## Production Gate

```powershell
pnpm production:check
```

The local production gate runs `pnpm test`, `pnpm typecheck`, `pnpm build`, and `pnpm --filter @aethon/web smoke:prod` in sequence. GitHub Actions mirrors the same gate in `.github/workflows/production-gate.yml` on `main`, `feature/**`, `codex/**`, and pull requests with Node 24 and pnpm 10.10.0.

Latest verified gate after Loop 11W render artifact evidence: `$env:AETHON_E2E_PORT='3031'; pnpm production:check` passed with 103 unit/security/source tests, 5-package typecheck, 5-package build, and 38 production Playwright smoke tests. Supabase local runtime verification also passed via `pnpm supabase:verify` after local DB reset applied the export-manifest evidence migration.

CI runs on Ubuntu and splits the same gate into visible `Test`, `Typecheck`, and `Build` steps after `pnpm install --frozen-lockfile` so failures are easy to triage. Local development is Windows-first in this workspace; use the `package.json` script rather than Bash-only scripts.

Current build does not require production secrets. When Supabase, Clerk, Vercel Blob, or AI Gateway become build-time requirements, keep production secrets out of pull request CI. `NEXT_PUBLIC_*` variables are public client-bundle values, not secret storage.

---

## Roadmap

- **Phase 0.5** — Documentation sync + monorepo bootstrap + AI Control Center scaffold + professional editor workspace loop + production readiness gates
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
| S5 | Adviser-first control | 100% paid or external-call AI actions require visible reason + user approval unless explicitly set to Auto |

---

## Contributing

Phase 0 is a closed-core bootstrapping phase. External contribution guidelines will be published alongside the MVP release.

Development rules, agent roster, and commit conventions live in [`CLAUDE.md`](./CLAUDE.md).

---

## License

TBD.
