# Legal & Compliance Insights

## 2026-05-05: local C2PA attachment evidence is not production signing

- **발견**: Export manifest가 `c2paStatus: attached`를 표시하더라도, 실제 production signer와 stored render file 검증이 없으면 법적/배포용 provenance 완료로 볼 수 없다.
- **결정**: Loop 11W의 attachment는 `local-provider-sim` policy의 deterministic SHA-256 attestation으로 기록한다. UI와 scorecard는 이를 production C2PA signing, platform watermarking, or final publish compliance로 확대 해석하지 않는다.
- **영향**: Generated/mixed ready export는 verified local attestation이 없거나 checksum/source hash/signature가 맞지 않으면 blocker가 된다. Export/QC/rights/provenance는 9/10까지 올릴 수 있지만, 10/10은 production signer, real render output, stored artifact verification, license evidence attachment가 통과해야 한다.
- **출처**: Loop 11W render artifact proof and local provenance attachment; Cantos DDR `0041-loop11w-c2pa-verification-readout-evidence.html`.
- **다음**: production C2PA signer selection, certificate/key custody policy, render file hash verification, generated-content label export embedding을 별도 slice로 닫는다.

## 2026-05-04: generated-content label and C2PA status must be explicit export evidence

- **발견**: Export gate가 rights/cost blocker를 보여도 generated-content label, C2PA/provenance status, concrete evidence ids가 비어 있으면 최종 퍼블리시 가능성을 판단할 수 없다.
- **결정**: Loop 11T는 `generatedContentLabel`, `provenanceSummary`, validation/cost/rights evidence ids, rights evidence asset ids, `c2paStatus`를 export manifest readiness input으로 승격했다.
- **영향**: `not-attached` C2PA는 여전히 final export 완료가 아니라 warning 상태다. 실제 100% exit에는 C2PA attachment/signature 또는 명시적 non-required policy와 재현 가능한 render artifact evidence가 필요하다.
- **출처**: Loop 11T export manifest evidence expansion.
- **다음**: live/generated-content C2PA artifact proof, license evidence attachment, SBOM/license allowlist gate를 별도 production slice로 닫는다.

## 2026-05-03: rights and C2PA remain blockers before real export

- **발견**: Server trust boundary는 보강했지만 rights evidence와 C2PA는 아직 slot 수준이다. provider commercial-use 표기도 plan/terms/data-retention 조건과 분리되어야 한다.
- **결정**: 실제 provider 호출 또는 final export 전에는 provider legal matrix, license/consent evidence, C2PA signing/verification status가 readiness input이어야 한다.
- **영향**: `commercialUseAllowed: true`만으로 UI가 안전하다고 말하면 안 된다. terms URL, verified date, plan condition, retention/training policy가 함께 필요하다.
- **다음**: SBOM/license allowlist, NOTICE, GPL/reference 격리 기록을 production gate 후보로 추가한다.

> 본 파일은 `legal-compliance` 에이전트의 발견/결정을 축적한다.
> 업데이트 규칙: CLAUDE.md "인사이트 분배 프로토콜" 참조.

## 2026-04-20: 에이전트 초기 생성

- **발견**: AETHON 프로젝트 부트스트랩. Legal & Compliance Specialty 신설.
- **이유**: AI 생성물 저작권·캐릭터 레퍼런스 퍼블리시티권·GDPR·EU AI Act·한국 AI 기본법 등 복합 규제 도메인 전담.
- **영향**: 이용약관/개인정보처리방침 초안, ref 이미지 업로드 경계, 학습 데이터 정책 결정이 여기 축적된다.
- **출처**: /agent-architect 실행 (세션 2026-04-20)
- **다음**: 첫 과제 수신 대기.

---

## 2026-05-03: 권리/동의 리스크는 Auto를 막는 Gate다

- **발견**: 레퍼런스 이미지, 실존 인물, 브랜드 로고, 외부 provider 업로드, 최종 export metadata는 사용자의 명시적 확인이 필요한 권리/동의 지점이다.
- **이유**: AETHON은 AI가 법적 책임을 대신 판단하는 제품이 아니라, 사용자가 책임 있는 선택을 하도록 리스크를 드러내는 편집기다.
- **영향**: 추천 카드에는 `riskFlags`와 `rightsSummary`가 포함되어야 한다. Auto Mode라도 권리 리스크가 `medium` 이상이면 Adviser Gate로 전환한다.
- **출처**: 사용자 피드백(2026-05-03), PRD 1.1.
- **다음**: `assets.consent_status`, `export_manifests.rights_summary`, C2PA metadata 정책 구체화.

---

## 2026-04-20: Phase 1 사전 지식 시드

### AI 생성물 저작권 — 주요 판례 동향 (확신도: [추정] 정기 갱신 필요)
- **발견**: 주요 시사점 — (a) 미국 USCO 판례: 사람의 창작적 기여(human authorship)가 있는 부분만 보호, 순수 AI 생성물은 비보호. (b) EU 추세: 학습 데이터 opt-out 기반. (c) 한국 입법 활동 활성화 추세.
- **이유**: AETHON 사용자가 만든 영상의 권리 귀속 명확히 해야 약관·서비스 정책 마련 가능.
- **영향**: Terms of Service에 (a) 사용자 입력(스토리/캐릭터/세계관)은 사용자 소유, (b) AI 생성 결과물은 사용자에게 양도/허락하되 "AI 보조 창작" 고지 권장 명시.
- **출처**: 사전 리서치 [추정] — Phase 5 출시 직전 fact-checker로 최신 판례 갱신.
- **다음**: Phase 5 직전 Terms 초안 작성.

### EU AI Act 일정 (확신도: [추정])
- **발견**: EU AI Act는 2024년 발효, GPAI(범용 AI) 의무는 2025-08부터 단계적 적용 추정. 생성형 AI 콘텐츠 워터마크 의무 가능성. AETHON 직접 GPAI 아니지만 GPAI 출력 사용 → 다운스트림 의무 검토.
- **이유**: EU 시장 진출 시(확장 E1) 컴플라이언스 필수. 위반 시 글로벌 매출 기준 과징금.
- **영향**: Phase 10 다국어 + 법무 검토에서 EU AI Act 대응 (생성물 워터마크 필드 + 메타데이터).
- **출처**: 사전 리서치 [추정] — Phase 9~10 사이 fact-checker 갱신.
- **다음**: Phase 10 시작 전 EU 출시 여부 결정.

### 한국 AI 기본법 시점
- **발견**: 한국에서도 AI 관련 입법 활동 진행 추정. 출시·배포 사업자에게 일정 의무 부과 가능성.
- **이유**: 본사 한국 등록 시 1차 적용. 모니터링 필수.
- **영향**: Phase 5 출시 전 법무 검토 항목 추가.
- **출처**: 사전 리서치 [추정] — fact-checker 갱신 필요.
- **다음**: Phase 5 직전 한국 입법 현황 갱신.

### 라이선스 일관성 (오픈소스 의존)
- **발견**: SDXL/ControlNet은 OpenRAIL/CreativeML 등, FLUX는 fal.ai 자체 라이선스, ComfyUI는 GPL/Apache 혼재. 사용 조건이 다름.
- **이유**: 잘못 사용하면 상업 제공 위반 위험.
- **영향**: 각 모델 어댑터에 라이선스 메타 + 상업 사용 허용 여부 표시. legal-compliance가 매트릭스 유지.
- **출처**: 사전 리서치.
- **다음**: Phase 2 어댑터 작성 시 라이선스 매트릭스 첨부.

---
