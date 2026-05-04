# DevOps & CI Insights

> 본 파일은 `devops-ci` 에이전트의 발견/결정을 축적한다.
> 업데이트 규칙: CLAUDE.md "인사이트 분배 프로토콜" 참조.

## 2026-05-05: GitHub 원격 저장소 부트스트랩 + Mac 인계 채널 확립

- **발견**: 부트스트랩 직후 1 commit만 있던 로컬 repo를 GitHub PRIVATE 저장소(`HMWKR/Aethon`)로 승격. `gh repo create --source=. --remote=origin --push` 단일 명령으로 (a) 원격 생성 + (b) origin remote 등록 + (c) main push가 한 번에 처리된다. 200 files / +32,974 / 19.6 MB가 단일 commit `d72045e`로 동기화됐다.
- **이유**: Windows → Mac 작업 이전을 위해 GitHub를 SSoT 동기화 허브로 채택. 백업이 부수 효과이고 본질은 머신 간 작업 연속성. D+60 MVP 일정에서 머신 전환 시 손실/공백 0을 목표로 한다.
- **영향**:
  - `.gitignore`에 `.codex/`, `.codex-tmp/`, `.claude/settings.local.json`, `.claude/runtime-state/` 추가 — Codex 런타임 임시 파일과 머신 고유 hook 설정이 영구 차단됨. 모든 머신은 동일한 ignore 정책을 공유한다.
  - 시크릿 누출 검증 0건 — `.env*` 파일 자체 부재 + 하드코딩 시크릿 없음 + `supabase/config.toml`은 `env(...)` 참조만 사용. 즉, Mac에서는 `apps/web/.env.local`을 안전 채널로 별도 이전해야 한다 (1Password/Bitwarden 등).
  - `session-handoff.md`에 "Mac Bootstrap" 섹션 추가 — Mac 첫 세션 진입 6단계(clone → install → env.local 복원 → Docker → dev → handoff 읽기) 명시.
  - 향후 GitHub Actions 활성화의 출발점 — `.github/workflows/production-gate.yml`이 이미 push됨, 다음 라운드에서 Vercel Preview 분리·Tauri 매트릭스 빌드 워크플로우를 추가할 수 있다.
- **출처**: 사용자 요청 "Mac에서 작업 이어가기 위해 GitHub push" + /what 4단계 프레임워크 (Why-What-How-So What) 확정 후 5-Phase 실행.
- **다음**:
  - Mac 환경 도착 후 `pnpm production:check` (103 unit/security + 5-package typecheck/build + 38 Playwright smoke) 게이트 통과 확인.
  - GitHub Actions 매트릭스 빌드 워크플로우 추가 시 본 인사이트의 .gitignore 정책과 시크릿 부재 전제를 base로 한다.
  - macOS 머신 도입 → Tauri 데스크톱 빌드(`macos-latest` runner) 워크플로우 활성화 가능.

## 2026-05-05: Supabase local verification is a repo script, not an implicit global dependency

- **발견**: 전역 `supabase` 명령이 없어도 root dev dependency와 `pnpm exec supabase`로 CLI를 고정할 수 있다. Windows pnpm 설치 후 binary symlink가 처음 생성되지 않을 수 있어 package postinstall 실행으로 CLI binary를 복구했다.
- **결정**: root `package.json`에 `supabase:start`, `supabase:db:reset`, `supabase:verify:rls`, `supabase:verify:provider-sim`, `supabase:verify`를 추가했다. CI에 바로 넣지는 않고, 현재는 Docker Desktop local runtime이 켜진 개발자 환경에서 실행하는 focused gate로 둔다.
- **영향**: Supabase 검증은 이제 "CLI가 설치돼 있으면 수동 실행"이 아니라 repo script로 재현된다. 다만 GitHub Actions에 Docker/Supabase local stack을 추가할지는 duration, image pull, cache policy를 본 뒤 별도 결정해야 한다.
- **출처**: Loop 11V local Supabase runtime evidence.
- **다음**: staging project 승인 후 CI/preview-safe DB verification strategy를 분리한다.

## 2026-04-20: 에이전트 초기 생성

- **발견**: AETHON 프로젝트 부트스트랩. DevOps & CI Worker 신설.
- **이유**: GitHub Actions·Tauri 멀티 플랫폼 빌드·Vercel Preview/Production·Rolling Releases 전담.
- **영향**: CI 파이프라인 단계, 배포 전략(카나리 10%→100%), Secrets 동기화 규칙 결정이 여기 축적된다.
- **출처**: /agent-architect 실행 (세션 2026-04-20)
- **다음**: 첫 과제 수신 대기.

---

## 2026-04-20: Phase 1 사전 지식 시드

### GitHub Actions 매트릭스 빌드 (Tauri)
- **발견**: 데스크톱 바이너리 빌드는 OS 매트릭스(`macos-latest`, `windows-latest`) + Rust 캐시 + sidecar 다운로드 단계. 단일 워크플로우 `desktop-build.yml`.
- **이유**: macOS는 macOS 머신, Windows는 Windows 머신에서만 빌드 가능.
- **영향**: Phase 6 워크플로우 작성. 코드 사이닝 secrets 등록 사전 작업.
- **출처**: 사전 리서치.
- **다음**: Phase 6 시작 전 GitHub Actions secrets 셋업.

### Vercel Preview 환경 분리
- **발견**: Vercel은 PR마다 Preview 배포 자동 생성. 환경 변수는 Production/Preview/Development 3개 분리. Supabase 인스턴스도 Preview는 별도 또는 Branch DB 활용.
- **이유**: PR 단위 안전한 검증, Production 데이터 보호.
- **영향**: `vercel.ts`에 환경별 설정. `.env.production` / `.env.preview` 분리.
- **출처**: 사전 리서치 + Vercel knowledge-update.
- **다음**: Phase 0 Vercel 셋업 시 3개 환경 변수 등록.

### Rolling Releases 카나리 비율
- **발견**: Vercel Rolling Releases(GA 2025-06)는 신규 배포를 0%→10%→50%→100% 단계 노출. 큰 변경은 카나리 1주, 소규모는 1일.
- **이유**: 외부 유저 10명 베타에서 회귀 빠르게 감지.
- **영향**: Phase 5 Production 배포 후 Phase 8+ 큰 기능은 카나리 패턴.
- **출처**: 사전 리서치 + Vercel knowledge-update.
- **다음**: Phase 5 배포 시 카나리 정책 문서화.

---

## 2026-04-20: Phase 1 사전 지식 시드

### GitHub Actions 매트릭스 빌드 (Tauri)
- **발견**: 데스크톱 바이너리 빌드는 OS 매트릭스(`macos-latest`, `windows-latest`) + Rust 캐시 + sidecar 다운로드 단계. 단일 워크플로우 `desktop-build.yml`.
- **이유**: macOS는 macOS 머신, Windows는 Windows 머신에서만 빌드 가능.
- **영향**: Phase 6 워크플로우 작성. 코드 사이닝 secrets 등록 사전 작업.
- **출처**: 사전 리서치.
- **다음**: Phase 6 시작 전 GitHub Actions secrets 셋업.

### Vercel Preview 환경 분리
- **발견**: Vercel은 PR마다 Preview 배포 자동 생성. 환경 변수는 Production/Preview/Development 3개 분리. Supabase 인스턴스도 Preview는 별도 또는 Branch DB 활용.
- **이유**: PR 단위 안전한 검증, Production 데이터 보호.
- **영향**: `vercel.ts`에 환경별 설정. `.env.production` / `.env.preview` 분리.
- **출처**: 사전 리서치 + Vercel knowledge-update.
- **다음**: Phase 0 Vercel 셋업 시 3개 환경 변수 등록.

### Rolling Releases 카나리 비율
- **발견**: Vercel Rolling Releases(GA 2025-06)는 신규 배포를 0%→10%→50%→100% 단계 노출. 큰 변경은 카나리 1주, 소규모는 1일.
- **이유**: 외부 유저 10명 베타에서 회귀 빠르게 감지.
- **영향**: Phase 5 Production 배포 후 Phase 8+ 큰 기능은 카나리 패턴.
- **출처**: 사전 리서치 + Vercel knowledge-update.
- **다음**: Phase 5 배포 시 카나리 정책 문서화.

---
