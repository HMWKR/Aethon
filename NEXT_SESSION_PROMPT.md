# AETHON 다음 Codex 세션 시작 프롬프트

아래 블록을 다음 Codex 세션 첫 메시지로 그대로 붙여 넣는다.

```text
AGENTS.md, session-handoff.md, NEXT_SESSION_PROMPT.md, NEXT_SESSION_HANDOFF.md, docs/business-plan/aethon-100-percent-production-scorecard.md 를 먼저 읽고 이어서 진행해줘.

Active goal:
AETHON의 모든 축이 경쟁 제품 대비 객관적 체크리스트로 100%를 만족할 때까지, 감각이 아니라 검증 가능한 benchmark/gate/test/evidence로 완성도를 측정하고 반복 구현한다.

현재 기준:
- Codex harness readiness: 8.8/10.
- Product production readiness: 68/100.
- Latest completed loop: Loop 11W - deterministic render artifact proof + local provenance attachment.
- Latest full gate: AETHON_E2E_PORT=3031 pnpm production:check passed with 103 unit/source/security tests, 5-package typecheck, 5-package build, and 38 production Playwright smoke tests.
- Latest Supabase gate: pnpm supabase:verify passed RLS catalog and provider-sim runtime SQL against local Supabase after local DB reset for the Loop 11W export-manifest evidence migration.
- Latest Cantos evidence: ADR 0033 loop11w-deterministic-render-artifact-local-provenance, DDR 0040 loop11w-export-render-artifact-evidence, DDR 0041 loop11w-c2pa-verification-readout-evidence.
- Latest visual screenshots from last UI loop:
  - docs/business-plan/assets/aethon-loop11w-render-artifact-proof-1440.png
  - docs/business-plan/assets/aethon-loop11w-render-artifact-proof-mobile-390.png
  - docs/business-plan/assets/aethon-loop11w-c2pa-render-proof-1440.png
  - docs/business-plan/assets/aethon-loop11w-c2pa-render-proof-mobile-390.png
  - docs/business-plan/assets/aethon-loop11w-c2pa-render-proof-1440.png
  - docs/business-plan/assets/aethon-loop11w-c2pa-render-proof-mobile-390.png
- .duet 의존은 없어야 한다. 작업 시작 시 Test-Path .\.duet 와 git ls-files .duet 로 확인한다. tracked 파일이 있으면 삭제하지 말고 먼저 보고한다.
- Port 3020에는 이전 Next dev server가 남아 있을 수 있고, 현재 세션에서는 종료 권한이 없었다. production smoke는 필요하면 AETHON_E2E_PORT=3031 을 사용한다.

운영 규칙:
- 모든 출력은 한국어로 한다.
- 전체 에이전트 웨이브를 매번 띄우지 않는다. 현재 작업에 직접 필요한 관련 역할만 1-3개 선택한다.
- Codex에서 subagent가 필요한 경우에도 full-context fork를 기본값으로 쓰지 않는다.
- MCP가 보이지 않으면 설치 실패로 단정하지 말고 tool_search를 먼저 사용한다.
- Cantos/Playwright/MCP evidence는 main Codex가 필요한 만큼만 실행한다.
- .env, token, secret은 읽거나 출력하지 않는다.
- production Supabase, paid provider, 유료 API 호출, 외부 쓰기는 명시 승인 없이 하지 않는다.
- dirty worktree의 기존 변경은 사용자/이전 세션 작업물로 간주하고 되돌리지 않는다.

다음 작업:
Loop 11X - production C2PA signer/real render output 또는 durable media storage slice를 먼저 검토한다. Local Supabase runtime evidence와 local render artifact proof는 완료됐으므로 production Supabase write, production signer, paid provider/API 호출은 명시 승인 없이는 하지 않는다.

우선순위:
1. 승인된 staging Supabase target이 있으면 production이 아님을 확인한 뒤 pnpm supabase:verify와 동등한 RLS/provider-sim SQL gate를 실행한다.
2. staging target이 없으면 P0 backlog 중 가장 작은 독립 slice를 선택한다:
   - production C2PA signer and real render output
   - durable media storage, real thumbnail extraction, or indexed search
3. UI 변경이 있으면 desktop/mobile screenshot evidence를 docs/business-plan/assets/ 에 추가한다.
4. Cantos ADR/DDR, scorecard, session-handoff.md, NEXT_SESSION_HANDOFF.md, docs/domain-knowledge/production-loop-insights.md, 관련 도메인 인사이트, docs/domain-knowledge/shared/changelog.md 를 갱신한다.

점수 규칙:
- 현재 68/100을 유지한다.
- 승인된 staging DB runtime gate가 통과하면 Data/security 축을 근거와 함께 소폭 상향할 수 있다.
- verified fallback slice가 통과하면 해당 제품 축을 근거와 함께 소폭 상향할 수 있다.
- 점수 상승은 test/build/smoke/screenshot/Cantos/문서 증거가 모두 맞을 때만 반영한다.

검증 명령:
- pnpm --filter @aethon/core test
- pnpm --filter @aethon/db test
- pnpm --filter @aethon/db typecheck
- pnpm --filter @aethon/web typecheck
- pnpm --filter @aethon/web build
- pnpm supabase:verify
- $env:AETHON_E2E_PORT='3031'; pnpm production:check
- git diff --check
- Test-Path .\.duet
- git ls-files .duet

최종 답변 형식:
goal
status
changed
verified
uncertain
```

## 다음 세션 핵심 목표

다음 세션은 local Supabase evidence와 local render artifact proof 이후 남은 P0 제품 gap을 닫는 것이 우선이다. 승인된 staging Supabase target이나 production C2PA signer/real render 정책이 없으면 durable media storage/real thumbnail extraction 중 가장 작은 slice로 전환한다.
