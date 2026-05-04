# AETHON Agent Matrix

> 공용 역할 계약의 SSoT는 `agents/AGENT_CONTRACT.md`와 `agents/*.md`다.
> `.claude/agents/*.md`는 현재 Claude 런타임 호환 경로이며, Codex/OMX/미래 런타임은 같은 역할 계약을 각자 어댑터 규칙으로 실행한다.
> Codex all-agent 실행 정책은 `agents/CODEX_RUNTIME.md`를 따른다.

---

## 공용 원칙

- **Map first, spawn second**: 사용자 요청을 먼저 역할에 매핑하고, 실제 subagent/Agent 실행은 런타임과 사용자 요청이 허용할 때만 수행한다.
- **No full-context all-agent fork**: Codex에서 전체 역할을 깨울 때는 모든 역할을 wave로 실행하되, 대형 세션 전체를 각 agent에 fork하지 않는다.
- **Runtime-neutral role files**: 공유 역할 파일에는 Claude 전용 도구 이름을 계약으로 박지 않는다. 도구명은 각 런타임 어댑터가 해석한다.
- **Insight routing**: durable finding은 해당 `docs/domain-knowledge/*-insights.md`로 기록하거나, read-only evaluator라면 기록 권고를 남긴다.
- **Harness axes**: CE/AC/GC/EL/SI 기준은 `agents/AGENT_CONTRACT.md`의 Harness Axis Contract를 따른다.
- **Playwright visibility**: Codex에서 Playwright MCP가 바로 안 보이면 설치 문제로 단정하지 말고 먼저 `tool_search`로 노출시킨다.

---

## 역할 매트릭스

| # | Agent | Group | Insight target | Trigger keywords |
|---:|---|---|---|---|
| 1 | `product-lead` | Product | `product-insights.md` | PRD, MVP, scope, roadmap, success metric, competitor, business plan |
| 2 | `fe-lead` | Frontend | `fe-insights.md` | Next.js, App Router, layout, routing, state, React architecture |
| 3 | `fe-canvas` | Frontend | `fe-canvas-insights.md` | timeline, canvas, preview, scene card, track, zoom, scrubber |
| 4 | `fe-interactions` | Frontend | `fe-interactions-insights.md` | drag, drop, inline pin, compare slider, shortcut, focus, keyboard |
| 5 | `fe-design` | Frontend | `fe-design-insights.md` | design system, Tailwind, shadcn, visual hierarchy, density |
| 6 | `be-orchestrator` | Backend | `be-insights.md` | Server Action, route handler, queue, orchestration, provider call |
| 7 | `ai-prompt-engineer` | AI | `ai-prompt-insights.md` | prompt, Claude, scene planning, prompt caching, storyboard text |
| 8 | `ai-consistency` | AI | `ai-consistency-insights.md` | character consistency, IP-Adapter, inpaint, FLUX, image model |
| 9 | `ai-video-router` | AI | `ai-video-router-insights.md` | Runway, Kling, Veo, Seedance, Grok, Luma, Pika, Hailuo, Sora, FFmpeg |
| 10 | `data-lead` | Platform | `data-insights.md` | Supabase, schema, migration, RLS, Storage, Realtime, JSONB |
| 11 | `desktop-qa-lead` | Platform | `desktop-qa-insights.md` | Tauri, Playwright, smoke, e2e, desktop shell, native FS |
| 12 | `devops-ci` | Platform | `devops-ci-insights.md` | CI, GitHub Actions, Vercel, production gate, release |
| 13 | `observability-lead` | Platform | `observability-insights.md` | audit trail, logs, analytics, SLO, provider lifecycle, history |
| 14 | `fact-checker` | Evaluator | `shared/fact-checks.md`, `evaluator-insights.md` | external facts, versions, official docs, API specs, citations |
| 15 | `insight-curator` | Evaluator | `evaluator-insights.md`, `shared/changelog.md` | insight cleanup, duplicates, stale knowledge, changelog |
| 16 | `ai-output-validator` | Evaluator | `evaluator-insights.md` | validation report, S1, quality metric, artifact evidence, export blocker |
| 17 | `prompt-linter` | Evaluator | `evaluator-insights.md` | prompt lint, CE failure modes, wording, user consent |
| 18 | `coherence-reviewer` | Evaluator | `evaluator-insights.md` | contradiction, doc drift, architecture conflict, stale handoff |
| 19 | `cost-monitor` | Evaluator | `evaluator-insights.md` | budget, cost ledger, spend, idempotency, pricing |
| 20 | `security-auditor` | Evaluator | `evaluator-insights.md` | OWASP, RLS, input validation, auth, secrets, supply chain |
| 21 | `ce-reviewer` | Evaluator | `evaluator-insights.md` | context engineering, progressive disclosure, instruction clash |
| 22 | `legal-compliance` | Specialty | `legal-compliance-insights.md` | license, IP, consent, C2PA, copyright, terms, compliance |
| 23 | `storyboard-director` | Specialty | `storyboard-director-insights.md` | storyboard, pacing, narrative arc, camera logic, scene beat |

---

## 자동 매핑 규칙

1. 사용자 요청 키워드를 위 표와 매칭해 역할을 먼저 고른다.
2. 실행은 런타임 어댑터가 결정한다: Claude는 Agent/hook, Codex는 명시 요청이 있을 때 `spawn_agent` 또는 main-agent emulation, OMX는 연결된 team/hud 표면을 사용한다.
3. 여러 역할이 걸리면 상류 Lead가 조정한다. FE 교차 작업은 `fe-lead`, BE/queue 작업은 `be-orchestrator`, 제품/전략 교차 작업은 `product-lead`가 1차 조정한다.
4. 문서/코드/인사이트가 충돌하면 `coherence-reviewer`를 review target으로 매핑한다. 실제 spawn은 런타임과 사용자 요청이 허용할 때만 한다.
5. read-only evaluator는 직접 파일을 고치지 않고 `changed=없음`과 함께 기록 권고를 남길 수 있다.
6. 인사이트 누락, 중복, 오래된 지식은 `insight-curator`가 정리 대상으로 매핑한다.

---

## 권한 원칙

- Lead/worker 역할은 구현이 필요할 때만 편집 권한을 쓴다.
- Evaluator 역할은 기본 read-only다. 예외는 `insight-curator`의 공유 changelog 정리, `legal-compliance`의 본인 insight 파일 기록처럼 명시된 문서 작업뿐이다.
- 보안, 비용, 법무, provider 호출, production DB 변경은 사용자 확인 없이는 실행하지 않는다.
- Codex에서는 공용 역할 계약을 읽고, 파일 수정 전 현재 repo 상태와 관련 파일을 확인한다.
