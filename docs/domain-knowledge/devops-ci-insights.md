# DevOps & CI Insights

> 본 파일은 `devops-ci` 에이전트의 발견/결정을 축적한다.
> 업데이트 규칙: CLAUDE.md "인사이트 분배 프로토콜" 참조.

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
