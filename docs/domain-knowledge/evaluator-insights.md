# Evaluator Insights

> Shared insight file for `fact-checker`, `insight-curator`, `ai-output-validator`,
> `prompt-linter`, `coherence-reviewer`, `cost-monitor`, `security-auditor`, and
> `ce-reviewer`.

## 2026-05-04: full-context all-agent fork is a harness risk

- **발견**: all-agent 감사 요구를 그대로 `fork_context:true` 동시 spawn으로 해석하면 Codex 프로세스 OOM이 발생할 수 있다.
- **결정**: AC 축은 "모든 역할 coverage"와 "동시 full-context fork"를 분리한다. 모든 역할은 실행하되, Codex에서는 `agents/CODEX_RUNTIME.md`의 경량 wave/batch 정책을 따른다.
- **CE 영향**: root `agents/*.md`가 없으면 역할 계약이 `.claude/agents/`에 묶여 Codex-native 실행 기준이 흐려진다. 이번 루프에서 23개 role contract를 root `agents/`로 승격했다.
- **다음**: 다음 evaluator wave는 `changed=없음` read-only report를 반환하고, lead가 100% scorecard에 수렴한다.

## 2026-05-03: repeated evaluator findings become loop priorities

- **발견**: security-auditor, legal-compliance, observability-lead가 모두 Server Action trust boundary를 High/Critical로 지적했다. ai-output-validator와 ai-consistency는 validation report 누락 export risk를 반복 지적했다.
- **결정**: 중복 지적은 다음 loop 우선순위로 승격한다. 이번에는 runtime validation + canonical re-read, missing validation report blocker를 먼저 구현했다.
- **검증**: `pnpm production:check` passed with 40 tests, 4-package typecheck/build, 18 production smoke.
- **잔여 리스크**: provider catalog exactness, append-only generation events, rights/C2PA evidence, SBOM/license gate, typed validation metrics는 아직 다음 루프 대상이다.
- **다음**: evaluator wave 결과는 `changed=없음`이라도 record-or-route insight로 남긴다.

## 2026-05-03: common agent contract covers the harness axes

- **발견**: `.claude/agents/AGENT_CONTRACT.md`와 `agents/AGENT_CONTRACT.md`가 동시에 SSoT처럼 보이면 CE Confusion/Clash가 생긴다.
- **결정**: root `agents/AGENT_CONTRACT.md`를 canonical contract로 두고 `.claude/agents/AGENT_CONTRACT.md`는 compatibility shim으로 유지한다.
- **축**: CE/AC/GC/EL/SI를 공용 agent contract의 Harness Axis Contract에 명시했다.
- **다음**: 개별 role 파일 이동은 Claude hook/discovery 영향 감사를 마친 뒤 shim 또는 sync 전략과 함께 진행한다.

## 2026-04-20: evaluator organization baseline

- **역할**: fact-checker, insight-curator, ai-output-validator, prompt-linter, coherence-reviewer, cost-monitor, security-auditor, ce-reviewer.
- **원칙**: Evaluator는 기본 read-only다. 직접 쓸 수 없는 경우 report에 insight recommendation을 남기고 document owner 또는 insight-curator가 기록한다.
- **검증 질문**: 사용자가 AI 제안을 이해하고 책임 있게 선택했는가, 비용/권리/품질 리스크가 보였는가, export gate가 증거를 요구하는가.
