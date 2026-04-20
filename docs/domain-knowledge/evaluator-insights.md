# Evaluator 공통 Insights

> 본 파일은 8인의 Evaluator 에이전트가 공유하는 인사이트 축적 공간이다:
> `fact-checker`, `insight-curator`, `ai-output-validator`, `prompt-linter`,
> `coherence-reviewer`, `cost-monitor`, `security-auditor`, `ce-reviewer`.
>
> 각 Evaluator는 자신의 검증 기준/체크리스트/판정 패턴을 여기 기록하며,
> 항목 제목에 `[에이전트명]` 태그를 붙여 부서별 검색 가능하도록 한다.
> 업데이트 규칙: CLAUDE.md "인사이트 분배 프로토콜" 참조.

## 2026-04-20: Evaluator 부서 일괄 신설

- **발견**: AETHON 프로젝트 부트스트랩. 8인 Evaluator 공동 부서 설립.
- **이유**: Quality Governance 축 — 사실/인사이트/AI 출력/프롬프트/일관성/비용/보안/CE 각 축의 품질 게이트 필요.
- **영향**:
  - Worker:Evaluator 비율 약 2:1 (15 Worker/Lead+Director : 8 Evaluator)
  - 대부분 Evaluator는 Read-only 또는 Write 최소 권한으로 작동
  - 본 부서의 검증 결과는 각 대상 부서 인사이트 파일에 반영됨
- **출처**: /agent-architect 실행 (세션 2026-04-20)
- **다음**: 첫 검증 과제 수신 대기.

---
