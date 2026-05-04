# AETHON 100% Production Scorecard

> Updated: 2026-05-05 KST  
> Goal: Measure and improve AETHON with benchmark, gate, test, and evidence loops until every production axis reaches 100%.

---

## 1. Score Separation

| Score | Current | Meaning |
|---|---:|---|
| Codex harness readiness | 8.8 / 10 | Agent contracts, loop discipline, verification, handoff, and insight accumulation quality. |
| Product production readiness | 68 / 100 | Actual deployable completeness of the AI-native video IDE/NLE product. |

The harness score is higher because the development system is now strong. The product score remains lower because the editor still lacks real provider execution, approved staging/production Supabase evidence, desktop packaging, collaboration, production C2PA signing, and compliance proof.

---

## 2. Competitor Benchmark Sources

| Source | Objective takeaway for AETHON |
|---|---|
| Adobe Premiere official help: rolling, ripple, slip, trim mode, ripple delete, Generative Extend | Professional baseline requires real timeline edit primitives, keyboardable trim flows, undo/history, and generated-media labeling/revert behavior. |
| CapCut official desktop/AI pages | Creator velocity requires Script to Video, Smart Search, Auto Captions, Auto Reframe, templates, quick export/share, and low-friction editing. |
| Runway official Timeline/Layers/Gen-4 docs | AI video workflow requires asset-to-timeline flow, layers/tracks, snapping/zoom/scroll, reference-based consistency, cost-aware model iteration, and generated asset management. |
| Higgsfield official AI video page | Cinematic AI direction requires model comparison, camera/lens/shot intent, locked characters, native audio awareness, and one-workspace multi-model routing. |
| High-star OSS video tools and SDKs | Build-vs-adopt decisions must compare against proven trim/render/timeline primitives, licensing, and maintainability. |

Canonical working references:

- Adobe Premiere Help: https://helpx.adobe.com/premiere-pro.html
- Adobe rolling edit: https://helpx.adobe.com/premiere/desktop/edit-projects/trim-clips/perform-rolling-edits.html
- Adobe ripple delete: https://helpx.adobe.com/premiere-pro/using/remove-clips.html
- Adobe Generative Extend: https://helpx.adobe.com/in/premiere/desktop/edit-projects/edit-with-generative-ai/generative-extend-overview.html
- CapCut Desktop AI: https://www.capcut.com/tools/desktop-ai-power/
- CapCut Auto Reframe: https://www.capcut.com/tools/auto-reframe/
- Runway Timeline: https://help.runwayml.com/hc/en-us/articles/4402458964115-Timeline
- Runway Gen-4 References: https://help.runwayml.com/hc/en-us/articles/40042718905875-Gen-4-Image-References-Guide
- Runway Gen-4 Video: https://help.runwayml.com/hc/en-us/articles/37327109429011-Creating-with-Gen-4-Video
- Higgsfield AI Video: https://higgsfield.ai/ai-video

---

## 3. Weighted Production Rubric

| Axis | Weight | Current | 100% Definition | Hard Gate |
|---|---:|---:|---|---|
| Product workflow and positioning | 10 | 5 | User can complete the full intended workflow: brief/reference -> scene plan -> model recommendation -> generation decision -> timeline edit -> QC -> export evidence. | PRD workflow e2e, screenshots, no unresolved Critical scope contradictions |
| Professional NLE editing baseline | 20 | 18 | Multitrack timeline supports select, split, trim, ripple, rolling, slip, delete/ripple delete, snap, zoom, bounded scroll, viewport persistence, scrollbar/minimap navigation, source/program context, keyboard shortcuts, undo/redo. | Unit state tests + Playwright desktop/mobile smoke + visual evidence |
| AI-native planning and adviser layer | 15 | 7 | AI proposes scene plan, prompt variants, model options, cost/rights/quality risks, alternatives, and records user decisions without auto-spending. | Deterministic eval tests + decision audit persisted + UI evidence |
| Provider catalog, queue, and execution safety | 10 | 9 | Provider/model choices are exact catalog records; queued runs are idempotent, leased, observable, retry-safe, and blocked when stale/noncommercial/expired. | Core/db tests + persisted RPC path + append-only run events |
| Media ingest, assets, and search | 10 | 4 | Project bin supports media/reference import, metadata extraction, thumbnails, Smart Search-like filters, reference tagging, and reopen persistence. | File/asset integration tests + browser workflow |
| Export, QC, rights, and provenance | 10 | 9 | Export requires validation reports, rights/cost evidence, manifest, generated-content labels, C2PA/provenance plan, and reproducible render output. | Export manifest tests + browser gate + legal checklist |
| Data, auth, security, and compliance | 10 | 7 | Clerk/Supabase RLS live verification, owner isolation, secret hygiene, audit trails, license/SBOM, OWASP checks, terms-risk policy. | RLS catalog execution + security scan + SBOM/license gate |
| Desktop IDE and platform integration | 5 | 1 | Tauri shell supports native file access, project persistence, packaged build, desktop smoke, crash recovery, and web core reuse. | Tauri build/test/smoke artifact |
| Observability, cost, and operations | 5 | 4 | Provider lifecycle, cost ledger, SLO logs, retry/run events, export audit, user-visible failure states. | Append-only event tests + operational dashboard/evidence |
| Harness, agents, and loop governance | 5 | 4 | Root `agents/` SSoT, Codex/Claude adapters, relevant-agent routing, insight routing, production gate, handoff continuity. | `agents/*.md` coverage + `production:check` + insight update |

**Current production readiness total: 68 / 100.**

This is not a failure state. It is the objective baseline after moving from prototype/skeleton to competitor-backed production gates. A previous draft headline said 31/100, but the weighted rubric summed to 37/100. Loop 11A fixed the disabled export affordance and added a Playwright style regression gate, moving export/QC/provenance from 4 to 5. Loop 11B added tested core and UI timeline primitives for split, ripple delete, and undo/redo history, moving the NLE baseline from 4 to 6 and the canonical baseline to 40/100. Loop 11C added deterministic `@aethon/ai` scene planning, prompt-pair linting, Claude cache-boundary request construction, schema/migration drift protection, and export blocking for validation reports that still need review, moving the canonical baseline to 42/100. Loop 11D added provider-sim run evidence fields, result asset persistence, project-scoped evidence FKs, repository evidence readback, and production gate proof with 76 tests plus 20 production smoke tests, moving the canonical baseline to 46/100. Loop 11F promoted provider-sim completion into a single SQL RPC transaction with lease, claim-token, output asset, events, validation, cost, rights, and export evidence writes guarded by schema/static tests and production gate proof, moving the canonical baseline to 48/100. Loop 11G added deterministic trim-in, trim-out, move, snap-to-boundary, linked audio propagation, and keyboard shortcut coverage across core state tests plus desktop/mobile production smoke, moving the NLE baseline to 8 and the canonical baseline to 50/100. Loop 11H added rolling edit, slip edit, zoom controls, zoom-scaled lane projection, and header layout evidence, moving the NLE baseline to 9 and the canonical baseline to 51/100. Loop 11I added source-duration bounds for trim/roll/slip, source/program monitor command controls, and mobile monitor overflow regression coverage, moving the NLE baseline to 10 and the canonical baseline to 52/100. Loop 11J added pointer drag move, trim-out resize handles, linked-audio gesture evidence, and mobile timeline action layout constraints, moving the NLE baseline to 11 and the canonical baseline to 53/100. Loop 11K added trim-in resize handles routed through the shared command layer, desktop/mobile state assertions for start/duration/in-point linked edits, and 30-test production smoke evidence, moving the NLE baseline to 12 and the canonical baseline to 54/100. Loop 11L added roll boundary handles routed through `rollEditBoundary`, desktop/mobile state assertions for adjacent and linked clips, and 32-test production smoke evidence, moving the NLE baseline to 13 and the canonical baseline to 55/100. Loop 11M added core `rippleTrimClipEnd`, ripple-end timeline handles, source-duration rejection tests, downstream clip shift assertions, and 34-test production smoke evidence, moving the NLE baseline to 14 and the canonical baseline to 56/100. Loop 11N added core `rippleTrimClipStart`, ripple-start timeline handles, linked start/end propagation, downstream closure assertions, and 36-test production smoke evidence, moving the NLE baseline to 15 and the canonical baseline to 57/100. Loop 11O added `SourceMediaMetadata`, `sourceAssetId`-based workspace source-duration hydration, Project Bin media metadata tiles, Clip Inspector source asset/duration/provenance readouts, and production screenshot evidence, moving Media ingest/assets/search to 2 and the canonical baseline to 58/100. Loop 11P added core timeline viewport scroll state, visible-range projection, scroll controls, window readout, and desktop/mobile production evidence, moving the NLE baseline to 16 and the canonical baseline to 59/100. Loop 11Q added browser-local timeline viewport persistence for zoom and scrollSeconds, restored through core clamp functions and proven by desktop/mobile production reload smoke, moving the NLE baseline to 17 and the canonical baseline to 60/100. Loop 11R added a direct timeline scrollbar/minimap navigator on top of the same core visible-range contract, including desktop/mobile production smoke and screenshot evidence, moving the NLE baseline to 18 and the canonical baseline to 61/100. Loop 11S added browser-local media/reference import, deterministic imported source metadata, project bin selection, source monitor readout, reload persistence, Cantos ADR/DDR, and desktop/mobile production evidence, moving Media ingest/assets/search to 3 and the canonical baseline to 62/100. Loop 11T added explicit export manifest evidence ids, generated-content labeling, provenance summary readiness checks, provider-sim export evidence completion, DB repository readback mapping through `rights_summary`, and desktop/mobile Export inspector evidence, moving Export/QC/rights/provenance to 8 and the canonical baseline to 63/100. Loop 11U added source media tags, deterministic thumbnail labels, Project Bin search and tag filtering, persisted imported media tag restoration, mobile-safe pointer smoke scrolling, and desktop/mobile search/filter screenshot evidence, moving Media ingest/assets/search to 4 and the canonical baseline to 64/100. Loop 11V installed and verified the local Supabase CLI/Docker runtime, aligned the initial migration under `supabase/migrations`, fixed live grant drift with explicit role revocation, and added `provider-sim-runtime-check.sql` for RLS owner isolation, queue/claim/complete success, same-token retry idempotency, different-worker and stale-lease rejection, failed completion without export manifest, and fixture cleanup. This moved Provider execution safety to 9, Data/security/compliance to 7, and the canonical baseline to 67/100. Loop 11W added deterministic render artifact proof, local provenance/C2PA attachment evidence, provider-sim artifact wiring, first-class DB export evidence columns, local Supabase runtime verification after reset, and desktop/mobile Export inspector screenshots, moving Export/QC/rights/provenance to 9 and the canonical baseline to 68/100.

---

## 4. 100% Exit Criteria

AETHON is not considered 100% until all conditions below are true.

1. Every weighted rubric axis is 100%.
2. `pnpm production:check` passes after the final product change.
3. Desktop and mobile Playwright evidence exists for the complete workflow.
4. Live or staging Supabase RLS verification runs against the catalog script.
5. At least one real or provider-simulated generation path creates a persisted generation run, result asset, validation report, and export manifest.
6. Timeline editing primitives have deterministic state tests and browser interaction tests.
7. Security/legal/cost gates have explicit pass/fail evidence, not only narrative docs.
8. All 23 agents have produced a latest gap report, and their Critical/High blockers are either resolved or explicitly accepted as out-of-scope by the user.

---

## 5. Immediate Objective Backlog

| Priority | Work | Why first | Gate |
|---|---|---|---|
| P0 | Production C2PA signer and real render output | Local render artifact/provenance proof exists, but final export still lacks a real render file, production C2PA signer, and verification against stored media. | Signed C2PA/provenance artifact + render output probe |
| P0 | Consolidate all 23 agent reports into the next implementation queue | The all-agent wave is complete; the next risk is losing objective blocker ordering across product, security, legal, data, and QA. | Scorecard and handoff reflect the 23-role gap reports |
| P0 | Approved staging Supabase execution | Local runtime evidence exists; production readiness still needs an approved staging target before claiming deployment-grade DB evidence. | Staging Supabase run + no production writes |
| P1 | Durable media thumbnails and storage-backed search | Browser-local tags/search and deterministic thumbnail labels exist; production parity still needs real frame thumbnails, durable asset rows, object storage, and indexed search. | Browser workflow + asset metadata tests |
| P1 | Timeline navigator refinement | Scrollbar/minimap exists; future refinement can add thumbnail density, marker overlays, or click-to-window interactions after higher-risk product gaps are closed. | Playwright timeline workflow + visual evidence |

---

## 6. Scoring Rules

- A score can increase only when there is source-grounded evidence.
- UI claims require Playwright or screenshot evidence.
- Backend/data claims require tests or catalog execution.
- Competitor parity claims require official docs, current product behavior evidence, or explicitly marked assumptions.
- Legal/security claims require checklist evidence and must not be inferred from passing typecheck.
- Agent/harness claims require the relevant `agents/`, `session-handoff.md`, and insight files to be updated.
