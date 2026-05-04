# AETHON 사업계획서 (IR Deck)

> 18 섹션 단일 페이지 HTML. 외부 빌드 불필요.

## 사용법

1. **브라우저 직접 열기**: `index.html` 더블클릭 또는
   ```
   open docs/business-plan/index.html  # macOS
   start docs/business-plan/index.html # Windows
   ```
2. **PDF Export**:
   - Chrome/Edge → ⌘/Ctrl+P → "PDF로 저장" → "배경 그래픽" ON 권장
3. **로컬 서버 (선택)**:
   ```
   cd docs/business-plan && python -m http.server 8080
   ```

## 갱신 주기

- 분기별 KPI/매출 데이터 업데이트
- Phase 진행 시 Roadmap/Team 섹션 갱신
- 외부 공유 시 contact 정보 실값으로 교체

## 외부 의존성

- Tailwind CSS via CDN (cdn.tailwindcss.com)
- Google Fonts: Inter, JetBrains Mono

오프라인 환경에서는 위 CDN을 vendor/ 디렉토리로 다운로드 후 경로 변경 필요.

## 문서 구조

총 18 섹션:
1. Hero — One-line vision + 3 metric
2. Problem — 4 정량화된 시나리오
3. Solution — 3축 통합 (M1/M2/M3) + M4
4. Differentiation — 4 차별화 축 + 비교표
5. Why Now — 3대 시장 신호
6. Product Demo — Mockup 3종
7. Tech Architecture — 시스템 다이어그램
8. Market Size — TAM/SAM/SOM + 지역 분포
9. Competitive Landscape — 8×6 매트릭스
10. Business Model — 4 Tier Pricing + LTV/CAC
11. Roadmap — 12 Phase 타임라인
12. Financial — 5년 매출/MAU
13. KPI Dashboard — S1~S4 + NPS/MAFV/D7
14. Use of Funds — $1.5M 시드 분배
15. Risk & Mitigation — Top 5 리스크
16. PSF Matrix — Problem×Solution 매핑
17. Team — 23 에이전트 조직
18. Contact / CTA

## 제품 증거 / DDR

- `assets/aethon-loop8-adviser-decision-export-1440.png` — Loop 8 desktop adviser decision + export gate evidence.
- `assets/aethon-loop8-adviser-decision-export-mobile-390.png` — Loop 8 mobile adviser decision + export gate evidence.
- `assets/aethon-loop11r-timeline-navigator-1440.png` — Loop 11R desktop timeline scrollbar + minimap navigation evidence.
- `assets/aethon-loop11r-timeline-navigator-mobile-390.png` — Loop 11R mobile timeline scrollbar + minimap navigation evidence.
- `assets/aethon-loop11s-media-import-persistence-1440.png` — Loop 11S desktop browser-local media import + Project Bin persistence evidence.
- `assets/aethon-loop11s-media-import-persistence-mobile-390.png` — Loop 11S mobile browser-local media import + Source Monitor readout evidence.
- `assets/aethon-loop11t-export-manifest-evidence-1440.png` — Loop 11T desktop Export inspector manifest evidence.
- `assets/aethon-loop11t-export-manifest-evidence-mobile-390.png` — Loop 11T mobile Export inspector manifest evidence.
- `assets/aethon-loop11u-media-search-tags-1440.png` — Loop 11U desktop Project Bin media search/tag filtering evidence.
- `assets/aethon-loop11u-media-search-tags-mobile-390.png` — Loop 11U mobile Project Bin media search/tag filtering evidence.
- `assets/aethon-loop11w-render-artifact-proof-1440.png` — Loop 11W desktop Export inspector render artifact proof evidence.
- `assets/aethon-loop11w-render-artifact-proof-mobile-390.png` — Loop 11W mobile Export inspector render artifact proof evidence.
- `assets/aethon-loop11w-c2pa-render-proof-1440.png` — Loop 11W desktop C2PA-ready local attestation evidence.
- `assets/aethon-loop11w-c2pa-render-proof-mobile-390.png` — Loop 11W mobile C2PA-ready local attestation evidence.
- `loop8-adviser-decision-export-gate-ddr-2026-05-03.html` — Loop 8 local DDR. AI suggestion을 사용자가 결정하고, 남은 QC/rights/preview blocker가 export를 계속 막는 흐름을 기록한다.
- `open-source-video-editor-benchmark-2026-05-03.md` — Runway, Adobe Premiere, CapCut, Higgsfield와 GitHub 고스타 OSS 영상 편집기/SDK 기준으로 다음 NLE/IDE 루프 우선순위를 정리한다.

## 추정 수치 표기

매출/시장 점유율/CAGR 등 외부 데이터가 필요한 항목은 본문에 `[추정]` 태그로 표기되어 있다. 외부 공유 전 `fact-checker` 에이전트 검증 필요.
