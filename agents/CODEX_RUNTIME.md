# AETHON Codex Agent Runtime

> Codex에서 AETHON 공용 agent contract를 실행하는 표준 어댑터다.
> 역할의 SSoT는 `agents/*.md`이며, `.claude/agents/*.md`는 Claude 호환 경로다.

---

## 1. 실행 원칙

- **모든 역할은 활성 roster로 유지하되, 상시 전원 기동하지 않는다.** 제품 목표가 "100% production readiness"일 때 23개 역할 전체를 기준으로 삼지만, 실제 실행은 현재 작업 slice에 직접 필요한 역할만 선택한다.
- **전체 세션 fork 금지.** 긴 대화 전체를 여러 subagent에 복제하면 Codex 프로세스 메모리 실패가 발생할 수 있다.
- **경량 context 전달.** agent에는 active goal, 해당 `agents/<role>.md`, 관련 파일 목록, 산출 형식만 넘긴다.
- **batch wave 실행.** 동시에 깨울 수는 있지만 안정성을 위해 한 wave는 최대 6개 역할로 제한한다. 모든 역할은 여러 wave에 걸쳐 빠짐없이 실행한다.
- **read-only audit 우선.** 설계/검토 wave는 파일을 수정하지 않고 `changed=없음`으로 보고한다. 구현은 lead가 결과를 수렴한 뒤 별도 worker 범위로 진행한다.
- **runtime-neutral 계약 유지.** Codex 고유 도구명, Claude 고유 도구명, OMX 고유 표면은 역할 계약 본문이 아니라 이 어댑터 문서에서만 다룬다.

---

## 2. Codex 실행 모드

| Mode | 사용 조건 | 실행 방식 |
|---|---|---|
| `mapped` | 역할 판단만 필요한 경우 | main agent가 `agents/<role>.md`를 읽고 역할 기준을 적용한다. |
| `emulated` | 작업이 긴밀하게 결합되어 subagent가 오히려 비용이 큰 경우 | main agent가 해당 역할 관점으로 구현/검토한다. |
| `spawned` | 사용자가 agent/delegation/parallel work를 명시한 경우 | `spawn_agent`에 경량 prompt를 전달한다. `fork_context:true`는 대형 세션에서 금지한다. |
| `review-wave` | 전체 기준 재산정, 대형 milestone, 또는 사용자가 명시적으로 전원 점검을 요청한 경우 | 기본은 실행하지 않는다. 필요할 때만 3개 이하 batch로 read-only agent를 깨우고 결과를 scorecard와 handoff에 수렴한다. |

---

## 3. Relevant-Agent Routing

기본 실행은 all-agent wave가 아니라 relevant-agent routing이다.

| 작업 slice | 기본 역할 |
|---|---|
| 제품 scope, scorecard, competitor parity | `product-lead`, 필요 시 `fact-checker` |
| Timeline/NLE/UI interaction | `fe-canvas`, `fe-interactions`, 필요 시 `desktop-qa-lead` |
| Frontend design/visual QA | `fe-design`, 필요 시 `playwright-qa-expert` 역할 기준 |
| Server Actions, queue, worker, state transition | `be-orchestrator`, 필요 시 `data-lead` |
| Supabase schema/RLS/repository | `data-lead`, 필요 시 `security-auditor` |
| Prompt/planner/AI adviser | `ai-prompt-engineer`, `prompt-linter` |
| Provider routing/execution/export evidence | `ai-video-router`, `ai-output-validator`, 필요 시 `cost-monitor`, `legal-compliance` |
| Desktop/Tauri/packaging | `desktop-qa-lead`, 필요 시 `devops-ci` |
| Cost/observability/security/legal gates | 해당 evaluator 1-2개만 선택 |

### Full Roster Reference

전체 재감사가 필요할 때만 아래 wave를 사용한다.

#### Wave A: Product + Frontend + Backend

1. `product-lead`
2. `fe-lead`
3. `fe-canvas`
4. `fe-interactions`
5. `fe-design`
6. `be-orchestrator`

### Wave B: AI + Data + Platform

1. `ai-prompt-engineer`
2. `ai-consistency`
3. `ai-video-router`
4. `data-lead`
5. `desktop-qa-lead`
6. `devops-ci`

### Wave C: Evaluators

1. `observability-lead`
2. `fact-checker`
3. `insight-curator`
4. `ai-output-validator`
5. `prompt-linter`
6. `coherence-reviewer`

### Wave D: Risk + Specialty

1. `cost-monitor`
2. `security-auditor`
3. `ce-reviewer`
4. `legal-compliance`
5. `storyboard-director`

All waves are a fallback for whole-system audit, not the default execution path. The limit is an execution-safety limit, not a reduction in role coverage.

---

## 4. Codex Spawn Prompt Template

```text
역할: {role}
목표: AETHON을 경쟁사 대비 객관 기준 100%까지 끌어올린다.
계약: agents/AGENT_CONTRACT.md 와 agents/{role}.md 를 기준으로 한다.
범위: {role-specific scope}
읽을 파일: {minimal relevant files}
금지: 파일 수정, 전체 repo rewrite, 사용자 변경 되돌리기, paid provider 호출, secret 접근.
산출:
1. 이 역할의 100% 객관 기준
2. 현재 완성도 %
3. 경쟁사/OSS 대비 gap
4. 다음 1-3개 구현 액션
5. 검증 gate
6. changed / verified / uncertain
```

---

## 5. OOM 방지 규칙

- `fork_context:true`는 짧은 세션이나 단일 agent 정밀 분석에만 사용한다.
- 10개 이상 agent를 깨울 때는 `fork_context`를 쓰지 않는다.
- agent prompt는 2,000자 내외로 유지한다.
- agent 결과는 수렴 즉시 닫고, 필요하면 요약만 `session-handoff.md`에 남긴다.
- 불필요한 MCP 서버는 전역 config에서 제거하거나 비활성화한다. CapCut MCP는 AETHON goal 달성에 필수 의존이 아니므로 제거 대상이다.
- **MCP-cold wave 원칙**: all-agent wave 중에는 subagent prompt에 MCP/plugin/app 사용을 요구하지 않는다. MCP evidence는 wave가 끝난 뒤 main Codex가 필요한 서버만 `tool_search`로 노출해 순차 실행한다.
- **Timeout signature**: `Starting MCP servers (0/9)` 다음 `ERROR: This operation returned because the timeout period expired`가 반복되면 코드 실패가 아니라 MCP startup surface 실패로 본다.
- **복구 순서**: 새 agent spawn을 중단한다 → 이미 뜬 agent 결과를 회수/종료한다 → `codex mcp list`로 활성 MCP 수를 확인한다 → 필요한 MCP만 main에서 순차 호출한다 → 비필수 MCP는 사용자 승인 후 전역 config에서 비활성화한다.
- **동시성 하향 조건**: MCP timeout이 한 번이라도 발생한 세션에서는 다음 all-agent wave를 최대 3개 역할로 낮추고, Cantos/Playwright 캡처는 agent wave와 분리한다.
- **Relevant-agent 기본값**: 일반 구현 loop에서는 역할을 1-3개만 선택한다. 이미 최근 리포트가 있는 역할은 다시 띄우지 않고, 메인 Codex가 해당 리포트를 적용한다.

---

## 6. 100% Goal Scorecard 연결

All-agent 결과는 다음 산출물에 수렴한다.

- `docs/business-plan/aethon-100-percent-production-scorecard.md`
- `session-handoff.md`
- `docs/domain-knowledge/production-loop-insights.md`
- 해당 역할의 `docs/domain-knowledge/*-insights.md`

100% 판정은 감각이 아니라 다음 증거 중 하나 이상으로만 올린다.

- passing test/typecheck/build/smoke
- browser screenshot 또는 visual audit evidence
- source-grounded code review
- official competitor/API documentation citation
- security/legal/cost checklist
- export manifest 또는 audit trail artifact
