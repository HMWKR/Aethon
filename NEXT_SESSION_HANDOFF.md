# NEXT SESSION HANDOFF

> Updated: 2026-05-05 KST  
> Workspace: `C:\Users\jusan\Desktop\Aethon`  
> Latest completed loop: **Loop 11W - deterministic render artifact proof + local provenance attachment**  
> Current product production readiness: **68/100**  
> Current Codex harness readiness: **8.8/10**

## 1. Start Here

다음 Codex 세션은 아래 순서대로 먼저 읽고 이어서 진행한다.

1. `AGENTS.md`
2. `NEXT_SESSION_PROMPT.md`
3. `session-handoff.md`
4. `NEXT_SESSION_HANDOFF.md`
5. `docs/business-plan/aethon-100-percent-production-scorecard.md`
6. `docs/domain-knowledge/production-loop-insights.md`
7. 현재 작업이 DB 쪽이면:
   - `packages/db/schema.sql`
   - `packages/db/migrations/0001_initial_ai_control.sql`
   - `packages/db/verification/rls-catalog-check.sql`
   - `packages/db/src/ai-control-repository.ts`
   - `packages/db/src/schema-security.test.ts`
8. 현재 작업이 NLE/media fallback 쪽이면:
   - `packages/core/src/video-editing.ts`
   - `packages/core/src/video-editing.test.ts`
   - `apps/web/app/studio-client.tsx`
   - `apps/web/app/globals.css`
   - `apps/web/tests/e2e/studio.smoke.spec.ts`

`NEXT_SESSION_PROMPT.md`는 첫 메시지로 그대로 붙여 넣는 용도다. 이 파일은 작업 중 판단 기준과 종료 조건을 확인하는 운영 문서다.

## 2. Active Goal

AETHON의 모든 축이 경쟁력 있는 제품 준비도 체크리스트에서 100%를 만족할 때까지, 감각이나 선언이 아니라 검증 가능한 benchmark, gate, test, screenshot, Cantos 기록, 문서 evidence로 완성도를 측정하며 반복 구현한다.

현재 기준:

- Product production readiness: **68/100**
- Codex harness readiness: **8.8/10**
- Latest full gate: `$env:AETHON_E2E_PORT='3031'; pnpm production:check`
- Latest full gate result: **103 unit/source/security tests**, **5-package typecheck**, **5-package build**, **38 production Playwright smoke tests** passed.
- Latest focused Supabase gate: `pnpm supabase:verify`
- Latest focused Supabase result: after local DB reset for the Loop 11W export-manifest evidence migration, RLS catalog and provider-sim runtime SQL checks passed against local Supabase.
- Latest Cantos evidence:
  - ADR `0033-loop11w-deterministic-render-artifact-local-provenance.html`
  - DDR `0040-loop11w-export-render-artifact-evidence.html`
  - DDR `0041-loop11w-c2pa-verification-readout-evidence.html`
- Latest visual screenshots from last UI loop:
  - `docs/business-plan/assets/aethon-loop11w-render-artifact-proof-1440.png`
  - `docs/business-plan/assets/aethon-loop11w-render-artifact-proof-mobile-390.png`
  - `docs/business-plan/assets/aethon-loop11w-c2pa-render-proof-1440.png`
  - `docs/business-plan/assets/aethon-loop11w-c2pa-render-proof-mobile-390.png`
  - `docs/business-plan/assets/aethon-loop11w-c2pa-render-proof-1440.png`
  - `docs/business-plan/assets/aethon-loop11w-c2pa-render-proof-mobile-390.png`

## 3. Immediate Next Target

Recommended next loop: **Loop 11X - production C2PA signer/real render output or durable media storage slice**.

Local Supabase runtime evidence is complete. Do not touch production Supabase without explicit approval. If the user provides an approved staging target, run the same verification path there; otherwise switch to the smallest remaining P0 product slice.

Priority order:

1. **Approved staging Supabase evidence path**
   - Confirm the target is staging/dev, not production.
   - Do not connect to production without explicit user approval.
   - Run `pnpm supabase:verify` or the equivalent target-specific RLS/provider-sim SQL checks.
   - Confirm no secrets or generated local keys are printed into docs or final output.

2. **Product slice**
   - Production C2PA signer and real render output, if credentials/policy are explicitly approved.
   - Durable media storage, real thumbnail extraction, or indexed search.

Choose the smallest slice that can be fully implemented and verified in the same session.

## 4. Operating Rules

- 모든 사용자-facing 답변은 한국어로 한다.
- 기존 dirty worktree는 이전 세션 작업물로 간주한다. 관련 없는 변경은 되돌리지 않는다.
- `.duet`는 현재 absent 상태다. 다시 보이면 tracked 여부를 확인하고 임의 삭제하지 않는다.
- 관련 agent만 1-3개 사용한다. 전체 23-agent wave를 기본값으로 쓰지 않는다.
- subagent가 필요해도 `fork_context:true`를 기본값으로 쓰지 않는다.
- MCP/Cantos/Playwright는 main Codex가 필요한 만큼만 순차적으로 사용한다.
- subagent에게 MCP 실행이나 외부 evidence 기록을 맡기지 않는다.
- MCP cold-start timeout은 코드 실패로 단정하지 말고 execution-surface blocker로 기록한다.
- `.env`, token, secret은 읽거나 출력하지 않는다.
- production Supabase, paid provider, paid API, 외부 배포 write는 명시 승인 없이 수행하지 않는다.
- UI 변경이 있으면 desktop/mobile Playwright evidence를 남긴다.

## 5. Required Preflight

다음 세션 시작 직후 실행한다.

```powershell
git status --short
if (Test-Path -LiteralPath '.\.duet') { Resolve-Path -LiteralPath '.\.duet' } else { 'duet-path=absent' }
git ls-files .duet
pnpm exec supabase --version
docker --version
docker info
```

해석:

- `supabase` CLI와 Docker daemon이 사용 가능하고 target이 local/staging으로 명확하면 DB runtime path를 진행한다.
- CLI가 없거나 Docker daemon이 죽어 있거나 target이 production인지 불명확하면 DB write를 하지 않고 fallback product slice로 전환한다.
- Supabase MCP가 보이더라도 local/dev write target이 명확하지 않으면 production-safe evidence로 인정하지 않는다.

## 6. Supabase Runtime Evidence Status

Loop 11V에서 local Supabase 기준 아래 항목은 완료됐다.

- `rls-catalog-check.sql`이 실제 local DB에서 통과했다.
- same claim token retry가 duplicate claimed/terminal evidence row를 만들지 않는 것을 검증했다.
- different worker active lease completion이 거부됐다.
- stale/expired lease completion이 거부됐다.
- successful provider-sim completion이 output asset, validation report, cost ledger entry, rights manifest entry, export manifest를 모두 만들었다.
- failed provider-sim completion은 export manifest를 만들지 않았다.
- owner RLS isolation이 non-owner JWT claim에서 generation run count 0으로 검증됐다.
- deterministic fixture cleanup 후 project count 0을 확인했다.

남은 Supabase 항목은 승인된 staging target, 실제 Clerk auth session claim shape, production-safe secret/env separation이다.

## 7. Fallback Product Slice Checklist

Supabase path가 막히면 아래 중 하나만 선택한다.

- **Production C2PA signer and real render output**
  - Loop 11W는 local deterministic render artifact proof와 local attachment evidence를 닫았다.
  - 다음 단계는 실제 render output file, production signer/verification policy, stored artifact checksum verification을 다룬다.
  - credential, certificate, production signing key, paid provider/API가 필요하면 명시 승인 전에는 진행하지 않는다.

- **Durable media library refinement**
  - Loop 11U browser-local tags/search 위에 durable storage, real frame thumbnail extraction, or indexed search 중 하나를 추가한다.
  - browser-local scope인지 repository/object-storage boundary인지 명확히 선택한다.

Fallback slice도 제품 점수 상승은 full gate, smoke evidence, docs update가 모두 있을 때만 반영한다.

## 8. Verification Commands

Focused checks:

```powershell
pnpm --filter @aethon/core test
pnpm --filter @aethon/db test
pnpm --filter @aethon/db typecheck
pnpm --filter @aethon/web typecheck
pnpm --filter @aethon/web build
```

Full production gate:

```powershell
$env:AETHON_E2E_PORT='3031'; pnpm production:check
```

Diff and residue checks:

```powershell
git diff --check
git status --short
if (Test-Path -LiteralPath '.\.duet') { Resolve-Path -LiteralPath '.\.duet' } else { 'duet-path=absent' }
git ls-files .duet
```

If port `3020` is still occupied by an older Next server, continue using `AETHON_E2E_PORT=3031`.

## 9. Documentation Updates At Loop Close

Always update:

- `session-handoff.md`
- `NEXT_SESSION_PROMPT.md`
- `NEXT_SESSION_HANDOFF.md`
- `docs/domain-knowledge/shared/changelog.md`
- `docs/domain-knowledge/production-loop-insights.md`

Update when relevant:

- `docs/business-plan/aethon-100-percent-production-scorecard.md` if score changes.
- `docs/domain-knowledge/data-insights.md` for DB/RLS/provider-sim evidence.
- `docs/domain-knowledge/be-insights.md` for worker/lease/RPC behavior.
- `docs/domain-knowledge/fe-insights.md` or `docs/domain-knowledge/fe-interactions-insights.md` for timeline UI changes.
- `docs/business-plan/assets/` with desktop/mobile screenshots for UI changes.

Cantos:

- Write an ADR for architecture or contract decisions.
- Write a DDR for implemented behavior/evidence.
- If Cantos is unavailable, record that explicitly and keep repo-local evidence.

## 10. Scoring Rule

Current product score stays **68/100** unless the next loop adds verified product capability.

Do not raise the score for:

- docs-only changes,
- unexecuted SQL narrative,
- static SQL checks alone,
- typecheck/build without behavior evidence,
- an implementation that did not pass the relevant gate.

Possible score movement:

- Approved staging Supabase runtime evidence can raise Data/security further only if the target is confirmed non-production.
- A verified NLE/media/export fallback slice can raise the matching product axis.
- Any score change must cite exact tests, smoke coverage, screenshots if UI changed, and docs/Cantos evidence.

## 11. Final Answer Contract

The next session final answer must include:

```text
goal
status
changed
verified
uncertain
```

It must also state:

- whether the active goal changed or only the next loop advanced,
- which relevant agents were used, if any,
- whether Cantos/Playwright evidence was captured or skipped,
- exact verification commands and pass/fail result,
- current product readiness score and whether it changed.

## 12. Known Constraints

- Supabase CLI is now available through `pnpm exec supabase`; it was unavailable in previous loops.
- Docker Desktop Linux daemon was started for Loop 11V local verification; re-check `docker info` before future DB work.
- Supabase SQL MCP did not expose a confirmed local/dev write target in previous loops.
- Loop 11Q was verified with `AETHON_E2E_PORT=3031` because port `3020` had a stale Next dev server that this session could not terminate.
- Loop 11R completed the timeline scrollbar/minimap fallback and was verified with `AETHON_E2E_PORT=3031` production gate plus desktop/mobile screenshot evidence.
- Loop 11S completed browser-local media import persistence with Project Bin import, Source Monitor metadata readout, localStorage reload persistence, Cantos ADR/DDR, and desktop/mobile screenshot evidence.
- Loop 11T completed export manifest evidence expansion with concrete asset/model/validation/cost/rights ids, generated-content label, provenance summary readiness checks, Cantos ADR/DDR, and desktop/mobile Export inspector evidence.
- Loop 11U completed browser-local media search and tags with `SourceMediaMetadata.tags`, deterministic thumbnail labels, search/tag filters, Cantos ADR/DDR, and desktop/mobile Project Bin evidence.
- Loop 11V completed local Supabase runtime evidence with CLI/Docker local stack, RLS catalog verification, provider-sim runtime SQL, Cantos ADR/DDR, and product readiness 67/100.
- Loop 11W completed deterministic render artifact proof and local provenance attachment evidence with core/provider-sim/DB first-class export manifest columns/UI/smoke coverage, local Supabase verification after reset, Cantos ADR/DDR, desktop/mobile Export inspector screenshots, and product readiness 68/100. This is not production C2PA signing or a real render-output file.
- This file is a handoff document only. It does not by itself change the product readiness score.
