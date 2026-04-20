# AETHON Fact-Checks (조직 공통)

> `fact-checker` 에이전트가 사실 검증 결과를 append-only로 기록한다.
> 다른 에이전트는 읽기 전용 참조.
> 형식: 아래 템플릿.

```
## YYYY-MM-DD: <검증 대상 제목>
| Claim | Source | Tag |
|---|---|---|
| "주장 내용" | https://… | [검증됨] / [추정] / [미확인] |
- **결론**: {요약}
- **의뢰**: {의뢰 에이전트명}
```

---

## 2026-04-20: 조직 출범 초기 팩트 기준선

| Claim | Source | Tag |
|---|---|---|
| "Claude Sonnet 4.6는 Prompt Caching 지원" | `~/.claude/rules/skill-notion-sync.md` · Anthropic 공식 | [검증됨] |
| "Next.js 16 App Router + React 19가 프로젝트 표준" | `CLAUDE.md` 기술 스택 표 | [검증됨] |
| "Vercel Fluid Compute 기본 런타임, Edge Functions 비권장" | Vercel Knowledge Update 2026-02-27 | [검증됨] |
| "Node.js 24 LTS 현재 Vercel 기본" | Vercel Knowledge Update 2026-02-27 | [검증됨] |
| "영상 9모델 라우팅 대상(Runway/Kling/Veo 3/Seedance/Grok/Luma/Pika 2.5/Hailuo/Sora 2)" | `.claude/plans/ai-typed-dusk.md` | [검증됨] (플랜 문서 기준) |

- **결론**: 조직 출범 시점의 팩트 기준선 확정. 이후 모델 버전 업데이트는 재검증 필요.
- **의뢰**: `/agent-architect` 실행 과정에서 자동 기록.

---
