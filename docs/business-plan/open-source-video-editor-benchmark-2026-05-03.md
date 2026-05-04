# AETHON Open-Source Video Editor Benchmark

> Date: 2026-05-03  
> Source snapshot: GitHub REST API repository metadata queried on 2026-05-03 23:10 KST from `repos/{owner}/{repo}` endpoints; competitor feature claims cross-checked against official product/help pages where available.  
> Purpose: 경쟁 제품 UX와 GitHub 고스타 영상/캔버스/렌더링 프로젝트를 기준으로 AETHON의 다음 production loop 우선순위를 정한다.

## 결론

AETHON은 현재 "배포 가능한 완성 편집 제품"이 아니라 production-grade skeleton이다. 다음 루프부터는 화면 증명보다 실제 편집자가 기대하는 동작과 신뢰 게이트를 하나씩 올려야 한다.

우선순위는 다음이다.

1. **Professional NLE baseline**: trim, split, ripple, snap, zoom, undo/redo, source/program monitor sync.
2. **Creator velocity layer**: script-to-video, smart search, auto captions, auto reframe, background removal 같은 빠른 시작 동선.
3. **AI-native planning layer**: 사용자의 의도를 scene spec, shot plan, camera logic, provider recommendation으로 구조화.
4. **Evidence and rights layer**: AI decision, provider, prompt, cost, rights, validation, export blockers를 타임라인에 기록.

## Closed Competitor UX 기준

| 제품 | 관찰 포인트 | AETHON 적용 |
|---|---|---|
| Runway | Timeline은 asset drag, snapping, clip size/zoom 같은 필수 편집 surface를 제공하지만 제품 중심은 여전히 generative workflow다. | AETHON은 AI workflow를 편집기와 분리하지 않고, timeline edit primitive를 실제 상태 전이로 구현해야 한다. |
| Adobe Premiere | Source/Program monitor, text-based editing, trim/ripple/rolling/slip/slide, media intelligence, Generative Extend가 professional baseline이다. | Loop 10부터 trim/split/ripple/undo를 smoke로 묶고, AI 기능은 export gate와 persisted history에 연결한다. |
| CapCut Desktop | Script to Video, Smart Search, Auto Reframe, Auto Captions, background removal, templates가 creator velocity를 만든다. | 기본은 Adviser-first로 유지하되 반복 작업에는 사용자가 명시한 Auto/shortcut surface를 제공한다. |
| Higgsfield | 공식 소개 기준으로 creative intent를 cinematic planning으로 전환하는 포지셔닝이 강하다. 세부 기능은 marketing claim으로 분리해 검증한다. | AETHON adviser는 raw prompt 작성기가 아니라 scene spec/shot plan 생성기로 진화해야 한다. |

## GitHub 고스타 프로젝트 후보

| Repo | Stars | Stack | License snapshot | 사용 방식 |
|---|---:|---|---|---|
| `tldraw/tldraw` | 46,778 | TypeScript | GitHub API: NOASSERTION; license file has production-use restrictions/license-key risk | infinite canvas, selection, annotation/pin UX 참고. 라이선스 승인 전 dependency 금지. |
| `remotion-dev/remotion` | 45,560 | TypeScript/React | GitHub API: NOASSERTION; license file is custom/source-available with commercial-use risk | React 기반 programmatic video/render pipeline 참고. 상업 조건 승인 전 vendor 금지. |
| `mifi/lossless-cut` | 40,182 | TypeScript/Electron/FFmpeg | GPL-2.0 | segment, trim, waveform, undo/redo, EDL UX 참고. GPL 코드 복사 금지. |
| `ffmpegwasm/ffmpeg.wasm` | 17,449 | C/WASM | MIT wrapper; FFmpeg build options may become LGPL/GPL depending on codecs/config | 웹 MVP browser-side render/preview 후보. 실제 빌드 옵션은 법무/보안 게이트에서 검토. |
| `mltframework/shotcut` | 13,846 | C++/Qt/MLT | GPL-3.0 | multi-track NLE 구조 참고. 코드 직접 사용 금지. |
| `olive-editor/olive` | 9,013 | C++ | GPL-3.0 | NLE architecture, node/compositor 사고방식 참고. 코드 직접 사용 금지. |
| `OpenShot/openshot-qt` | 5,716 | Python/Qt | GitHub API: NOASSERTION; `COPYING` indicates GPL-3.0 family | cross-platform editor workflow 참고. 코드 직접 사용 금지. |
| `KDE/kdenlive` | 4,985 | C++/Qt/MLT | GPL-3.0 | professional open-source NLE feature map 참고. 코드 직접 사용 금지. |

## Download / Build-Up 원칙

- 외부 repo는 먼저 `.codex-tmp/oss-benchmarks/<repo>` 같은 임시 경로에 shallow clone한다.
- GPL/LGPL/AGPL 계열은 AETHON 코드에 복사하지 않는다. 제품 동작, UX, 정보구조, 테스트 케이스만 참고한다.
- MIT/Apache/BSD 계열도 실제 dependency 후보로 쓰기 전 SPDX, NOTICE, transitive license, 보안 advisory를 확인한다.
- `NOASSERTION`, custom, source-available, production-use restricted license는 법무/보안 승인 전 vendor 금지다.
- 외부 코드를 가져올 때는 ADR에 출처, license, 사용 범위, 대체 가능성, 삭제 전략을 기록한다.
- large binary/sample media는 repo에 넣지 않는다. 필요한 경우 `docs/business-plan/assets/`에는 screenshot evidence만 둔다.

## 다음 Loop 후보

1. **Loop 10A - Trusted server action boundary**: approval queue 전에 suggestion/preferences/gate를 서버 저장본으로 재조회하고 런타임 스키마 검증을 추가한다.
2. **Loop 10B - Export evidence gate**: 생성 씬마다 최신 validation report/run evidence를 필수화하고 missing/stale/not-run을 blocker로 만든다.
3. **Loop 10C - Timeline edit primitive**: split/trim/ripple/undo 중 하나를 실제 state transition + smoke로 구현한다.
4. **Loop 10D - Provider catalog hardening**: 9개 provider capability를 versioned catalog로 분리하고 deprecated/terms/pricing TTL gate를 둔다.

추천은 Loop 10A다. 실제 provider 호출과 비용 발생으로 가기 전 서버 신뢰 경계를 먼저 닫아야 한다.
