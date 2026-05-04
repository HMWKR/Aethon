# Loop 11F Next Session Ultradetail Plan

> Date: 2026-05-04 KST  
> Workspace: `C:\Users\jusan\Desktop\Aethon`  
> Target loop: **Loop 11F - Live/SQL provider-sim transaction + idempotency evidence**  
> Current product readiness: **46/100**  
> Current harness readiness: **8.8/10**

> Status note: Loop 11F's SQL RPC transaction promotion path has been completed. Live/local Supabase runtime evidence is still blocked by missing Supabase CLI and inactive Docker Desktop Linux daemon. Current continuation is tracked in `session-handoff.md` and `NEXT_SESSION_PROMPT.md`; latest completed loop is Loop 11Q with product readiness 60/100.

## 1. Mission

AETHON의 다음 생산 루프는 새 AI provider를 붙이는 작업이 아니다. 지금 해야 할 일은 provider-sim execution이 운영 환경에서 믿을 수 있는 evidence chain을 만들도록 DB boundary를 닫는 것이다.

Loop 11D/11E에서 이미 다음 기반은 만들어졌다.

- core provider-sim은 queued run을 `claimed -> running -> succeeded/failed`로 전이한다.
- 성공 path는 validation report, cost ledger, rights manifest, export manifest, export readiness를 만든다.
- repository는 result asset 저장, evidence field 보존, generation-run evidence readback을 지원한다.
- repository completion boundary는 `lease_owner`, `claim_token`, `lease_expires_at` 조건을 확인하고 duplicate-safe writes를 사용한다.

하지만 아직 다음 gap이 남아 있다.

- repository-level boundary는 여러 Supabase JS calls로 구성된다.
- 실제 DB transaction으로 all-or-nothing이 보장됐다는 evidence가 없다.
- live/local Supabase에서 claim/completion/evidence chain이 실행됐다는 증거가 없다.
- same claim token retry, different worker active lease, stale lease completion, duplicate evidence rows 방지에 대한 runtime 또는 static gate가 부족하다.

Loop 11F의 목표는 이 gap을 닫는 것이다.

## 2. Hard Constraints

- 모든 출력은 한국어로 한다.
- 관련 에이전트만 1-3개 사용한다. 전체 23개 에이전트 웨이브는 기본값이 아니다.
- subagent에 `fork_context:true`를 사용하지 않는다.
- subagent prompt에는 MCP 사용을 요구하지 않는다.
- Cantos/Playwright evidence는 main Codex가 필요한 서버만 순차 실행한다.
- MCP cold-start timeout이 재발하면 code failure로 처리하지 말고 execution-surface failure로 기록한다.
- CapCut MCP는 복구하지 않는다.
- `.duet/`가 다시 나타나면 경로와 tracked 여부를 확인한 뒤 local residue일 때만 삭제한다.
- `.env`, tokens, secrets는 읽거나 출력하지 않는다.
- production Supabase, paid provider, external paid API는 명시 승인 없이 연결하지 않는다.
- dirty worktree는 이전 세션 작업물로 간주하고 되돌리지 않는다.

## 3. Required Starting Reads

다음 순서로 읽는다.

1. `AGENTS.md`
2. `session-handoff.md`
3. `NEXT_SESSION_PROMPT.md`
4. `docs/business-plan/aethon-100-percent-production-scorecard.md`
5. `agents/CODEX_RUNTIME.md`
6. `packages/core/src/provider-sim.ts`
7. `packages/core/src/provider-sim.test.ts`
8. `packages/core/src/generation-run.ts`
9. `packages/core/src/production-readiness.ts`
10. `packages/db/src/ai-control-repository.ts`
11. `packages/db/src/schema-types.ts`
12. `packages/db/schema.sql`
13. `packages/db/migrations/0001_initial_ai_control.sql`
14. `packages/db/src/schema-security.test.ts`
15. `packages/db/verification/rls-catalog-check.sql`

## 4. Relevant-Agent Routing

기본 실행은 main Codex가 한다. subagent는 막히거나 독립 감사가 필요한 경우만 사용한다.

권장 관련 역할:

- `data-lead`: DB transaction/RPC, RLS, project-scoped FK, live catalog verification.
- `be-orchestrator`: worker boundary, lease/idempotency, retry behavior.
- 선택적 `security-auditor`: live DB/RLS 또는 privileged RPC/security-invoker risk를 바꿀 때만.

비권장:

- 전체 23개 역할 동시 실행.
- Playwright/Cantos를 subagent에게 직접 요구.
- full context fork.

## 5. Current Evidence Baseline

마지막 확인된 full gate:

```powershell
pnpm production:check
```

결과:

- core tests: 35 passed
- ai tests: 8 passed
- db tests: 27 passed
- web tests: 6 passed
- total unit/source/security tests: 76 passed
- typecheck: 5 packages passed
- build: 5 packages passed
- production Playwright smoke: 20 passed

이 baseline이 깨지면 Loop 11F는 실패다.

## 6. Primary Implementation Paths

다음 세션은 아래 두 경로 중 하나를 선택한다.

### Path A - Live/Local Supabase Execution Evidence

이 경로는 가장 강한 evidence다.

조건:

- local 또는 staging Supabase만 사용한다.
- production DB는 명시 승인 없이 절대 연결하지 않는다.
- Supabase CLI/Docker가 없거나 실행 불가능하면 Path B로 전환한다.

작업:

1. tooling 확인:

```powershell
supabase --version
docker --version
```

2. local/staging DB가 준비되어 있으면 schema/migration 적용 상태 확인.
3. `packages/db/verification/rls-catalog-check.sql` 실행.
4. 테스트용 project/run/asset/evidence chain을 생성한다.
5. provider-sim completion path를 실행한다.
6. 같은 claim token 재실행이 duplicate rows를 만들지 않는지 확인한다.
7. 다른 worker가 active lease를 가진 run을 complete하지 못하는지 확인한다.
8. stale/expired lease completion이 거절되는지 확인한다.
9. `getGenerationRunEvidence`가 non-empty output asset, events, validation, cost, rights, export manifest를 반환하는지 확인한다.

완료 evidence:

- SQL execution output 또는 test output.
- 가능하면 `docs/business-plan/assets/`에 evidence screenshot 또는 rendered report.
- `docs/domain-knowledge/data-insights.md`와 `production-loop-insights.md` 갱신.

### Path B - SQL RPC Transaction Promotion

local/staging DB 실행이 불가능하거나 CLI가 없으면 이 경로를 사용한다.

목표:

`complete_provider_simulated_run` 또는 동등한 SQL RPC를 추가해서 다음을 하나의 DB transaction으로 묶는다.

- run이 `running` 상태인지 확인.
- `lease_owner`, `claim_token`, `lease_expires_at > completed_at` 확인.
- terminal status update.
- output asset upsert.
- running/succeeded/failed events insert.
- validation report insert.
- cost ledger insert.
- rights manifest insert.
- export manifest insert.
- duplicate event/evidence idempotency.
- project-scoped FK 유지.

주의:

- RPC는 `security invoker`를 기본으로 유지한다.
- service role 전용 RPC로 바꾸려면 명시 이유와 보안 영향 문서를 남긴다.
- RLS 우회를 만들지 않는다.
- destructive SQL은 금지한다.

필요 파일:

- `packages/db/schema.sql`
- `packages/db/migrations/0001_initial_ai_control.sql`
- `packages/db/src/schema-security.test.ts`
- `packages/db/verification/rls-catalog-check.sql`
- `packages/db/src/ai-control-repository.ts`
- `packages/db/src/schema-types.ts`

정적 테스트 요구:

- RPC 존재 확인.
- `security invoker` 확인.
- active lease 조건 확인.
- `lease_owner = p_actor_id` 확인.
- `claim_token = p_claim_token` 확인.
- `lease_expires_at > p_completed_at` 확인.
- terminal status 제한 확인.
- duplicate evidence idempotency 확인.
- `insert into assets`, `insert into generation_run_events`, `insert into validation_reports`, `insert into cost_ledger_entries`, `insert into rights_manifest_entries`, `insert into export_manifests` 확인.
- project-scoped FK 유지 확인.

## 7. Minimum Test Matrix

Loop 11F는 아래 test intent를 만족해야 한다.

| Test | Required Evidence |
|---|---|
| Same claim token retry | duplicate terminal evidence rows are not created |
| Different worker active lease | completion is rejected |
| Stale/expired lease | terminal update is rejected |
| Failed provider-sim run | no export manifest is created |
| Successful provider-sim run | output asset, validation, cost, rights, export manifest are non-empty |
| Readback | `getGenerationRunEvidence` returns run + outputAsset + events + validation + cost + rights + export |
| Schema drift | `schema.sql` and initial migration stay in sync |
| Live catalog | `rls-catalog-check.sql` covers new RPC/FK/ledger rules |

## 8. Verification Commands

Focused checks:

```powershell
pnpm --filter @aethon/core test
pnpm --filter @aethon/db test
pnpm --filter @aethon/db typecheck
```

Full gate:

```powershell
pnpm production:check
```

Diff hygiene:

```powershell
git diff --check
git status --short
```

Duet residue check:

```powershell
if (Test-Path -LiteralPath '.\.duet') { Resolve-Path -LiteralPath '.\.duet' } else { 'duet-path=absent' }
git ls-files .duet
```

## 9. Scoring Rules For Loop 11F

Current score: 46/100.

Do not raise score for:

- only repository-level refactor.
- only typecheck.
- only docs.
- unexecuted SQL narrative.
- unverified local assumptions.

Possible score increase:

- +1 or +2 if SQL RPC transaction is added, statically tested, schema/migration synced, and `pnpm production:check` passes.
- +2 or +3 if local/staging Supabase actually executes provider-sim completion and idempotency cases pass.
- +0 if Supabase tooling is unavailable and no SQL transaction boundary is implemented.

Any score change must update:

- `docs/business-plan/aethon-100-percent-production-scorecard.md`
- `session-handoff.md`
- `docs/domain-knowledge/production-loop-insights.md`
- relevant role insight files.

## 10. Documentation Updates Required

At loop close, update:

- `session-handoff.md`
- `docs/domain-knowledge/production-loop-insights.md`
- `docs/domain-knowledge/data-insights.md`
- `docs/domain-knowledge/be-insights.md`
- `docs/domain-knowledge/shared/changelog.md`
- `docs/business-plan/aethon-100-percent-production-scorecard.md` if score changes.

If UI changes:

- add desktop/mobile Playwright screenshot evidence under `docs/business-plan/assets/`.

If Cantos is usable:

- write a DDR/ADR after code/test verification.
- do not start all MCP servers in subagents.
- avoid Cantos during agent waves.

If Cantos is not usable:

- record repo-local evidence and say why Cantos was skipped.

## 11. Known Risks

1. **MCP cold-start timeout**
   - Avoid starting many MCP servers during subagent work.
   - Use main Codex sequential tool calls only when needed.

2. **Supabase production risk**
   - Do not connect to production DB.
   - Ask before any staging write if target is unclear.

3. **Partial write risk**
   - Repository-level completion still has multiple calls.
   - SQL RPC or live transaction evidence is the desired closure.

4. **Over-scoring risk**
   - Passing `production:check` alone does not prove live DB behavior.
   - Score increase requires the hard gate evidence above.

5. **Worktree risk**
   - Many files are already dirty/untracked from prior loops.
   - Do not revert unrelated changes.

## 12. Final Answer Contract

Final answer must include:

```text
changed
verified
uncertain
```

It must state:

- whether the active goal changed or only the plan changed.
- which relevant agents were used, if any.
- whether Cantos/Playwright evidence was captured or intentionally skipped.
- exact verification commands and pass/fail result.
- current product readiness score and whether it changed.

## 13. Preferred Next First Step

Start with this sequence:

1. Read the files listed in section 3.
2. Confirm `.duet` is absent.
3. Check whether `supabase` CLI and Docker are available.
4. If local/staging Supabase is feasible, choose Path A.
5. If not feasible, choose Path B and implement SQL RPC transaction/static gates.
6. Run focused tests.
7. Run `pnpm production:check`.
8. Update docs and handoff.
