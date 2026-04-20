# AETHON 에이전트 매트릭스

> 23 에이전트 전체 매트릭스. CLAUDE.md "에이전트 자동 매핑" 섹션의 확장 버전.
> 키워드가 매칭되면 `Agent` tool로 해당 에이전트에 위임 (Iron Law #1).

---

## 전체 매트릭스

| # | 에이전트 | 그룹 | 도구 | 인사이트 파일 | 트리거 키워드 |
|---|---|---|---|---|---|
| 1 | `product-lead` | A. Product | Read, Glob, Grep, Write, Edit, WebFetch, WebSearch | `product-insights.md` | PRD, 스코프, 기획, 검수, 성공 지표, 마일스톤, 로드맵, MVP, Phase, 검증 |
| 2 | `fe-lead` | B. Frontend | Read, Glob, Grep, Bash, Edit, Write, WebFetch | `fe-insights.md` | Next.js, App Router, 라우팅, 레이아웃, Server Component, 상태 관리, Zustand, Jotai, Suspense |
| 3 | `fe-canvas` | B. Frontend | Read, Glob, Grep, Bash, Edit, Write | `fe-canvas-insights.md` | Konva, 타임라인, 씬 카드, 프리뷰 캔버스, 줌, 패닝, Stage, Layer |
| 4 | `fe-interactions` | B. Frontend | Read, Glob, Grep, Bash, Edit, Write | `fe-interactions-insights.md` | 인라인 핀, 영역 드래그, 비교 슬라이더, dnd-kit, Framer Motion, 댓글 |
| 5 | `fe-design` | B. Frontend | Read, Glob, Grep, Bash, Edit, Write | `fe-design-insights.md` | Claude Design, Tailwind, 디자인 토큰, shadcn, 디자인 시스템, 테마, Storybook |
| 6 | `be-orchestrator` | C. Backend | Read, Glob, Grep, Bash, Edit, Write, WebFetch | `be-insights.md` | Server Action, Route Handler, API, 오케스트레이션, Job 큐, Vercel Queues, 에러 폴백, AI 호출 |
| 7 | `ai-prompt-engineer` | D. AI | Read, Glob, Grep, Bash, Edit, Write, WebFetch | `ai-prompt-insights.md` | Claude Sonnet, Prompt Caching, 씬 분할, 자동 프롬프트, 7요소, 스토리 분석 |
| 8 | `ai-consistency` | D. AI | Read, Glob, Grep, Bash, Edit, Write, WebFetch | `ai-consistency-insights.md` | IP-Adapter, 캐릭터 일관성, 고정값 주입, 인페인팅, FLUX Fill, Nano Banana, Ideogram, DALL-E, SDXL |
| 9 | `ai-video-router` | D. AI | Read, Glob, Grep, Bash, Edit, Write, WebFetch | `ai-video-router-insights.md` | 영상 생성, Runway, Kling, Veo, Seedance, Grok, Luma, Pika, Hailuo, Sora, FFmpeg, Export |
| 10 | `data-lead` | E. Platform | Read, Glob, Grep, Bash, Edit, Write | `data-insights.md` | Supabase, 스키마, 마이그레이션, RLS, Storage, Realtime, Postgres, JSONB |
| 11 | `desktop-qa-lead` | E. Platform | Read, Glob, Grep, Bash, Edit, Write | `desktop-qa-insights.md` | Tauri, 데스크톱, Rust, IPC, 네이티브 FS, 멀티 윈도우, Playwright, E2E |
| 12 | `devops-ci` | E. Platform | Read, Glob, Grep, Bash, Edit, Write, WebFetch | `devops-ci-insights.md` | CI/CD, GitHub Actions, 워크플로우, Vercel 배포, Preview, Rolling Release, 릴리스 |
| 13 | `observability-lead` | E. Platform | Read, Glob, Grep, Bash, Edit, Write, WebFetch | `observability-insights.md` | Analytics, Sentry, 모니터링, 대시보드, Grafana, Datadog, Web Vitals, SLO |
| 14 | `fact-checker` | F. Evaluator | Read, Glob, Grep, WebFetch, WebSearch | `shared/fact-checks.md` (append) + `evaluator-insights.md` | 사실 검증, fact check, 버전 확인, API 스펙, 출처 확인 |
| 15 | `insight-curator` | F. Evaluator | Read, Glob, Grep, Write (shared/changelog.md만) | `evaluator-insights.md` | 인사이트 정리, 인사이트 리뷰, 중복 탐지, 노화 항목, 인사이트 감사 |
| 16 | `ai-output-validator` | F. Evaluator | Read, Glob, Bash | `evaluator-insights.md` | AI 출력 검증, S1 지표, 얼굴 일관성, 코사인 유사도, 무드 편차, 품질 |
| 17 | `prompt-linter` | F. Evaluator | Read, Grep | `evaluator-insights.md` | 프롬프트 린트, CE 검증, 4대 실패 모드, 토큰 효율, 적정 고도 |
| 18 | `coherence-reviewer` | F. Evaluator | Read, Glob, Grep | `evaluator-insights.md` | 일관성 검토, 충돌 조정, 모순 해결, coherence check |
| 19 | `cost-monitor` | F. Evaluator | Read, Bash, WebFetch | `evaluator-insights.md` | 비용, cost, 예산, 청구, Active CPU, 모델별 단가, 지출 |
| 20 | `security-auditor` | F. Evaluator | Read, Glob, Grep, Bash | `evaluator-insights.md` | 보안 감사, OWASP, 취약점, RLS 검증, API 키, XSS, CSRF, 인증 |
| 21 | `ce-reviewer` | F. Evaluator | Read, Grep | `evaluator-insights.md` | CE 검증, CE 리뷰, Progressive Disclosure, 문서 품질 |
| 22 | `legal-compliance` | G. Specialty | Read, WebFetch, WebSearch | `legal-compliance-insights.md` | 저작권, IP, 개인정보, GDPR, EU AI Act, AI 기본법, 법무, 컴플라이언스 |
| 23 | `storyboard-director` | G. Specialty | Read | `storyboard-director-insights.md` | 스토리텔링, 연출, 페이싱, 3막 구조, Kishōtenketsu, 감정 곡선, 180도 법칙 |

---

## 도구 권한 원칙

1. **Lead/Director**: `Read, Glob, Grep, Bash, Edit, Write` — 도메인 내 자유 편집. 외부 API 확인 필요 시 WebFetch 추가.
2. **Worker**: Lead와 동일하되, 부서 폴더 내로 제한 (`.claude/agents/<name>.md`의 CONSTRAINTS에 명시).
3. **Evaluator — Write 최소화 원칙**:
   - `fact-checker`: Write 없음. 단, `shared/fact-checks.md` append만 예외 허용.
   - `insight-curator`: Write는 `shared/changelog.md`에만. 원본 인사이트 파일 직접 편집 금지.
   - `ai-output-validator`: Write 없음. Bash(측정 스크립트)만.
   - `prompt-linter`/`coherence-reviewer`/`ce-reviewer`: Read + Grep (+Glob)만. Write 없음.
   - `cost-monitor`: Read + Bash + WebFetch만. Write 없음.
   - `security-auditor`: Read + Glob + Grep + Bash(읽기 전용 스캔). Write 없음.
4. **Specialty**:
   - `legal-compliance`: Read + WebFetch + WebSearch. 본인 인사이트 파일만 Write 허용.
   - `storyboard-director`: Read only. 본인 인사이트는 의뢰 에이전트 경유 기록.

---

## 그룹 통계

- **Product**: 1 (4.3%)
- **Frontend**: 4 (17.4%)
- **Backend**: 1 (4.3%)
- **AI**: 3 (13.0%)
- **Platform/Data**: 4 (17.4%)
- **Evaluator**: 8 (34.8%)
- **Specialty**: 2 (8.7%)
- **합계**: 23 (100%)

Worker/Lead : Evaluator 비율 = 13:8 ≈ 1.6:1 (패턴 #2 권장 2:1~3:1에 인접).
Evaluator 비중이 높은 이유: 멀티 모델 라우팅·AI 출력 품질·법무/연출 등 검증 축이 많음.

---

## 자동 매핑 규칙

1. 사용자 요청의 키워드가 위 표의 "트리거 키워드"에 매칭되면 해당 에이전트를 `Agent` tool로 호출.
2. 복수 에이전트 매칭 시: 상류 Lead(예: `fe-lead`)가 1차 수신 → 하위에 재위임.
3. 도메인 교차(FE + BE + AI) 작업: `product-lead`가 조정.
4. 충돌 감지: `coherence-reviewer` 자동 소환.
5. 인사이트 기록 누락 감지: `insight-curator`가 Stop 훅에서 자동 작동.
