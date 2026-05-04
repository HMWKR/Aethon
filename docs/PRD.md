# AETHON — Product Requirements Document

> **버전**: 1.1 (AI Control Center 반영)
> **작성일**: 2026-04-20 / 업데이트: 2026-05-03
> **소유**: `product-lead` 에이전트
> **스코프**: D+60 웹 MVP / D+75 데스크톱 / D+160 Post-MVP
> **상위 계약**: `CLAUDE.md` 4-Frame, `.claude/plans/ai-typed-dusk.md`

---

## 0. 개요

### 0.1 프로덕트 비전 (One-Liner)

> **"AI advises. You choose. The timeline remembers."**
>
> AI 영상을 이미 만들어 본 창작자가 기획표, 레퍼런스, 모델 선택, 생성 결과, 부분수정, 최종 편집을 한 프로젝트 타임라인에서 책임 있게 관리하는 AI-native NLE.

### 0.2 핵심 차별화

1. **Adviser-first AI Control**: AI는 자동 실행자가 아니라 선택 보조자다. 기본값은 Adviser Mode이며, 사용자는 작업별로 Auto / Adviser / Off를 선택한다.
2. **AI-native Timeline Memory**: 프롬프트, 모델 선택 이유, 비용, 레퍼런스, 권리, 일관성 점수, 재생성 이력을 씬 타임라인에 저장한다.
3. **멀티 AI 모델 추천 + 수동 결정**: 이미지/영상 모델을 씬 특성별로 추천하되, 실행 전 이유·비용·리스크·대체 모델을 보여주고 사용자가 승인한다.
4. **타임라인 일관성 엔진**: IP-Adapter + 프로젝트 단위 고정값 주입으로 씬 간 캐릭터 얼굴 일관성 ≥ 0.80 (코사인 유사도)를 측정한다.
5. **웹 + 데스크톱 동일 코어**: Tauri 2.0 + 모노레포로 React 코어를 재사용하고, 데스크톱은 네이티브 FFmpeg·오프라인 파일 I/O까지 확장한다.

### 0.3 목표 (SMART)

| # | 지표 | 측정 방법 | 목표 |
|---|---|---|---|
| S1 | 캐릭터 얼굴 일관성 | 동일 캐릭터 10씬 임베딩 코사인 유사도 평균 | ≥ 0.80 |
| S2 | 창작 시간 단축 | 5분 영상 제작 시간 (AETHON vs Runway 단독) | -70% |
| S3 | 인라인 편집 수렴성 | 핀 클릭 → 재생성 → 승인 평균 시도 횟수 | ≤ 2.5회 |
| S4 | MVP 출시 | Vercel Production + 외부 유저 10명 실사용 | D+60 내 |
| S5 | 책임 있는 AI 선택 | 외부 호출/비용 발생/권리 차단/export 전 AI 근거와 승인 UI 제공률 | 100% |

### 0.4 사용자 정의 (Who)

AETHON의 1차 타깃은 **AI 영상을 이미 만들어 본 개인·소규모 창작자**로 정의한다. 공통 특성:

- AI 영상 도구를 1개 이상 사용해본 경험이 있다 (Runway/Kling/Pika/Sora 중 1+).
- "씬 간 일관성 깨짐"으로 인한 재작업 비용을 직접 경험했다.
- 월 5건 이상의 영상 콘텐츠를 제작하거나 제작 의향이 있다.
- 1~10분 길이의 단편/광고/교육/시각화 영상이 주된 산출물이다.
- AI가 모든 것을 자동으로 처리하기보다, 놓친 리스크와 더 나은 선택지를 제안해주길 원한다.

B2B(광고 에이전시/게임 스튜디오)는 Post-MVP(Phase 8+)에서 평가하며, MVP 단계에서는 검증 대상에서 제외한다.

### 0.5 AI 개입 원칙

| 모드 | 정의 | 기본 사용처 |
|---|---|---|
| **Auto Mode** | 사용자가 허용한 범위에서 AI가 반복/저위험 작업을 자동 실행한다. | 일관성 점수 계산, 블랙프레임/무음 검사, 초안 후보 생성 |
| **Adviser Mode** | AI가 실행하지 않고 후보, 근거, 비용, 리스크, 놓친 점을 제안한다. 최종 선택은 사용자가 한다. | 모델 선택, 프롬프트 작성, 부분수정, 비용 최적화 |
| **Off** | AI 제안과 자동 검사를 끄고 일반 편집기처럼 동작한다. | 민감한 소재, 법무 검토 전 컷, 사용자가 직접 통제하려는 작업 |

**제품 원칙**: AI는 책임 주체가 아니다. AETHON은 사용자가 어떤 근거로 선택했는지 남기는 편집기여야 한다.

---

## 1. 사용자 페르소나 6종

### P1. 유튜브 단편 애니메이터 — 김민지 (28세, 여)

| 항목 | 내용 |
|---|---|
| **직업** | 1인 유튜브 채널 운영자 (구독자 8만, 5분 단편 애니메이션) |
| **일상** | 평일 9시 시나리오 작성 → 13시 이미지 생성(Runway/Midjourney) → 18시 편집(Premiere) → 자정 업로드. 주 2편 제작. |
| **페인포인트** | 매 씬마다 주인공 외형 프롬프트 재입력 → 그래도 얼굴이 살짝 달라짐. 시청자 댓글 "캐릭터가 미묘하게 바뀐다"가 누적. 후반 색감/스타일 보정에 1편당 4시간. |
| **AETHON 사용 시나리오** | 캐릭터 카드 1회 등록 → 30개 씬에 IP-Adapter 적용 후보 제안 → 사용자가 승인한 컷만 생성 → 일관성 검증 패스. 영상 변환은 Pika 2.5(캐릭터 클로즈업) + Luma(드리프트 씬)를 추천 카드로 제안하고 사용자가 확정. 5분 영상 제작 시간 12h → 4h. |
| **성공 지표** | S1(일관성) + S2(시간 단축). |

### P2. 웹소설 작가 → 영상화 도전자 — 박재훈 (35세, 남)

| 항목 | 내용 |
|---|---|
| **직업** | 웹소설 연재 작가 (월 매출 200만원) + 자기 소설 OST 영상 제작 시도. |
| **일상** | 주중 소설 집필 → 주말 자기 소설 1화 분량을 영상화하려 시도 → 캐릭터 일관성/세계관 일관성 무너져 포기. |
| **페인포인트** | "내 머릿속 캐릭터"가 AI마다 다르게 나옴. 세계관 설정(고대 동양 판타지)을 매 씬 프롬프트에 다시 입력. 도구 학습 비용이 시간을 잡아먹음. |
| **AETHON 사용 시나리오** | 세계관 바이블(world_bible) + 캐릭터 5명 카드 등록 → 소설 텍스트 붙여넣기 → AI가 30씬 구성안을 제안 → 사용자가 합치기/삭제/순서를 확정 → 그림체(예: "수묵화 + 고대 동양") 고정값 주입 → SDXL+ControlNet 기본, 인물 클로즈업은 FLUX 추천. |
| **성공 지표** | S1 + 세계관 일관성(Post-MVP에서 별도 측정). |

### P3. 마케터 / 광고 PD — 이정훈 (42세, 남)

| 항목 | 내용 |
|---|---|
| **직업** | B2B SaaS 마케팅 매니저. 30초~60초 광고 영상을 외주 또는 직접 제작. |
| **일상** | 분기당 4편의 광고. 외주 단가 1편 500만원. 직접 제작 시도하면 품질이 외주 80% 수준. |
| **페인포인트** | 브랜드 컬러·로고·키비주얼의 일관성. AI 영상 도구는 "텍스트/타이포 깨짐" 빈번. 클라이언트 검수 라운드가 평균 3회 → 매번 전체 재생성. |
| **AETHON 사용 시나리오** | 브랜드 가이드(컬러 팔레트/타이포)를 mood_palette + art_style로 등록 → 텍스트가 들어가는 씬은 Ideogram 추천 + 권리/브랜드 리스크 표시 → 검수 피드백을 인라인 핀으로 표시("이 부분 색만 바꿔") → FLUX Fill 부분 재생성. |
| **성공 지표** | S2 + S3(인라인 편집 수렴 ≤ 2.5회 → 클라이언트 검수 사이클 단축). |

### P4. 교육 콘텐츠 크리에이터 — 정수아 (29세, 여)

| 항목 | 내용 |
|---|---|
| **직업** | 코딩 강의 채널 운영자. 3분 길이 강의 영상을 주 3편 제작. |
| **일상** | 강의 스크립트 작성 → 슬라이드 + 보조 일러스트 → 더빙 → 편집. 일러스트 제작이 병목. |
| **페인포인트** | 동일 캐릭터(자기 아바타)를 30개 강의에 걸쳐 일관되게 유지하기 어려움. 추상적 개념(예: "함수형 프로그래밍의 불변성") 시각화는 DALL-E가 가장 잘하지만 캐릭터 일관성이 약함. |
| **AETHON 사용 시나리오** | 아바타 캐릭터 카드 + IP-Adapter 고정 → 추상 개념 슬라이드는 DALL-E, 아바타 등장 씬은 FLUX를 추천 → 영상 변환은 짧은 컷이면 Seedance(저렴), 감정 강조 컷이면 Hailuo를 추천. |
| **성공 지표** | S1 + S2 + 비용(cost-monitor 모니터링). |

### P5. 독립 영화감독 — 사전 시각화(Pre-vis) — 황태호 (33세, 남)

| 항목 | 내용 |
|---|---|
| **직업** | 단편 영화 독립 감독. 본 촬영 전 사전 시각화(Pre-visualization)로 투자/배우 설득. |
| **일상** | 콘티 그리기 → 스토리보드 → 촬영. AI로 사전 시각화하려 시도했으나 "한 컷씩만 잘 나옴". |
| **페인포인트** | 영화 문법(180도 법칙, 컷 연결성, 감정 곡선)을 AI가 이해하지 못함. 카메라 무브먼트(돌리/팬/줌)의 일관성. 시네마틱 무드 유지. |
| **AETHON 사용 시나리오** | `storyboard-director` 에이전트 자문 → 3막 구조 검증 → 영상 변환은 Runway Gen-3(시네마틱) + Luma(카메라 무브). 사전 시각화 산출물을 투자 미팅에 활용. |
| **성공 지표** | S1 + 영화적 문법 점수(`storyboard-director` 검증 통과율). |

### P6. VTuber / 스트리머 OP 영상 제작자 — 윤서연 (24세, 여)

| 항목 | 내용 |
|---|---|
| **직업** | VTuber (구독자 3만). 채널 인트로/엔딩(15~30초) + 이벤트 영상(1~2분) 직접 제작. |
| **일상** | 신규 인트로 분기당 1회 제작. 외주 단가 부담 → 직접 제작. |
| **페인포인트** | 자기 VTuber 캐릭터(2D 일러스트 기반)를 영상에 삽입할 때 "원본 일러스트와 다른 얼굴"이 나옴. 짧은 영상이라도 5~6 컷이 필요한데 일관성이 무너짐. 일본 애니메이션 스타일 유지가 어려움. |
| **AETHON 사용 시나리오** | VTuber 모델 일러스트를 ref_image_url로 등록 → IP-Adapter 가중치 강하게 → Hailuo MiniMax(아시아 스타일 강점) 추천 근거 확인 후 승인. 인라인 핀으로 "눈 색만 바꿔" 즉시 수정. |
| **성공 지표** | S1 + S3. |

### 1.7 페르소나 우선순위 (MVP)

| 페르소나 | MVP 우선순위 | 근거 |
|---|---|---|
| P1 | **High** | 명확한 사용 빈도 + S1·S2 직접 검증 |
| P3 | **High** | B2B 입구점 + S3 검증 |
| P4 | **Medium** | 정량적 검증 용이 |
| P6 | **Medium** | 일본/아시아 시장 신호 |
| P2 | **Low** (Post-MVP) | 세계관 바이블 기능(P9) 필요 |
| P5 | **Low** (Post-MVP) | storyboard-director 성숙도 필요 |

---

## 2. MVP 4대 — 상세 요구사항

### 2.0 M0 — AI Control Center

#### 사용자 스토리

- **US-M0-1**: As a P1, 전역 AI 모드를 Auto / Adviser / Off 중 선택하고 싶다. 그래야 내 작업 스타일에 맞게 AI 개입 수준을 조절할 수 있다.
- **US-M0-2**: As a P3, 모델 선택은 Adviser, 권리 체크는 Auto Gate, 프롬프트 작성은 Off처럼 작업별로 다르게 설정하고 싶다.
- **US-M0-3**: As a P5, AI가 어떤 선택지를 왜 추천했는지 비용·품질·권리 리스크와 함께 보고 싶다.

#### Acceptance Criteria

- **AC-M0-1** *Given* 사용자가 프로젝트를 열었을 때, *When* AI Control Center를 보면, *Then* 전역 모드와 작업별 상세 모드가 표시된다.
- **AC-M0-2** *Given* `Adviser Mode`에서 모델 추천이 발생했을 때, *When* 사용자가 추천 카드를 확인하면, *Then* 추천 모델, 대체 모델 2개 이상, 이유, 예상 비용, 리스크가 표시된다.
- **AC-M0-3** *Given* 비용 발생 또는 외부 provider 호출이 필요한 작업일 때, *When* 전역 모드가 Auto여도, *Then* 승인 임계값을 초과하면 사용자 확인을 요구한다.
- **AC-M0-4** *Given* 사용자가 Off로 설정한 작업일 때, *When* 해당 작업 화면에 진입하면, *Then* AI 제안 카드가 표시되지 않는다.

#### 의존 / 위험

- **의존**: `product-lead`(모드 정책), `fe-design`(AI Control Center UX), `data-lead`(`ai_preferences`, `ai_suggestions`), `be-orchestrator`(승인 게이트).
- **리스크**: Auto와 Adviser의 경계가 흐리면 사용자가 통제권을 잃었다고 느낄 수 있다. 모든 실행 버튼에 실행 주체와 비용/외부 전송 여부를 표시한다.

---

### 2.1 M1 — 타임라인 + 씬 카드 UI

#### 사용자 스토리

- **US-M1-1**: As a P1, 스크립트나 기획표를 붙여넣으면 AI가 30개 내외의 씬 구성을 제안해주길 원한다. 사용자는 제안을 승인하거나 수정한 뒤 타임라인으로 확정한다.
- **US-M1-2**: As a P3, 분할된 씬을 드래그하여 순서를 바꾸고 길이(duration)를 조절하고 싶다. 광고는 컷 타이밍이 핵심이기 때문이다.
- **US-M1-3**: As a P4, 씬 카드를 클릭하면 우측 패널에 해당 씬의 프리뷰(이미지)가 즉시 표시되길 원한다. 강의 슬라이드 흐름을 시각적으로 검증해야 한다.
- **US-M1-4**: As a P5, 각 씬의 카메라 앵글(wide/medium/close-up) + 감정(calm/anger/battle) + 사용자 의도(user_intent)를 직접 편집할 수 있길 원한다.
- **US-M1-5**: As a P1, 씬을 추가/삭제/복제할 수 있어야 한다.
- **US-M1-6**: As a P6, 타임라인에서 줌 인/아웃하여 개별 씬 디테일과 전체 흐름을 모두 볼 수 있어야 한다.
- **US-M1-7**: As a P3, 프로젝트를 닫았다 다시 열어도 모든 씬과 순서가 보존되어야 한다.

#### Acceptance Criteria

- **AC-M1-1** *Given* 사용자가 1000자 분량의 스크립트 또는 기획표를 입력했을 때, *When* "씬 구성 제안" 버튼을 클릭하면, *Then* 30초 이내에 25~35개 씬 후보가 생성되고 사용자가 승인한 항목만 타임라인에 반영된다.
- **AC-M1-2** *Given* 30개 씬이 존재할 때, *When* 사용자가 씬 5번을 씬 20번 위치로 드래그하면, *Then* `order_index`가 자동 재계산되고 DB에 저장된다.
- **AC-M1-3** *Given* 임의의 씬을 클릭했을 때, *When* 클릭 이벤트가 발생하면, *Then* 100ms 이내에 우측 프리뷰 패널이 해당 씬의 `image_url`을 표시한다 (Server Component 스트리밍 + Suspense).
- **AC-M1-4** *Given* 사용자가 씬 카드의 `duration_sec`을 5초 → 8초로 수정하고 *When* 포커스를 이탈하면, *Then* 즉시 DB 저장 + 옵티미스틱 UI 업데이트.
- **AC-M1-5** *Given* 30개 씬이 표시될 때, *When* 타임라인을 스크롤하면, *Then* Konva 가상화로 60fps를 유지한다 (확신도: [추정] 가상화 패턴 적용 시).
- **AC-M1-6** *Given* 프로젝트를 닫고 다시 열 때, *When* 페이지가 로드되면, *Then* 모든 씬·순서·duration이 마지막 저장 상태로 복원된다.

#### 비기능 요구사항

- **성능**: 30 씬 타임라인 첫 렌더 ≤ 2s, 드래그 60fps.
- **접근성**: 키보드 화살표로 씬 이동, 스크린리더로 씬 번호+감정 읽기.
- **모바일**: MVP에서는 데스크톱 우선. 모바일은 Read-only 뷰만 제공.

#### 의존 / 위험

- **의존**: `data-lead`(scenes 테이블), `ai-prompt-engineer`(씬 구성 제안), `fe-canvas`(Konva).
- **리스크**: Konva 30+ 노드 성능 → 가상화 필요. 씬 구성 제안의 토큰 비용 → Prompt Caching으로 시스템 프롬프트 캐시.

---

### 2.2 M2 — 캐릭터 카드 + 고정값 (IP-Adapter)

#### 사용자 스토리

- **US-M2-1**: As a P2, 캐릭터의 외형(appearance) + 레퍼런스 이미지를 1회 등록하면, 모든 씬에 적용 후보로 제안되고 사용자가 씬별로 승인/조정할 수 있길 원한다.
- **US-M2-2**: As a P1, 한 프로젝트에 5명까지 캐릭터를 등록할 수 있어야 한다.
- **US-M2-3**: As a P4, 각 씬에서 등장 캐릭터를 다중 선택할 수 있어야 한다.
- **US-M2-4**: As a P6, 캐릭터 카드를 수정하면 미생성 씬은 새 외형으로, 이미 생성된 씬은 사용자 선택에 따라 재생성하거나 보존한다.
- **US-M2-5**: As a P5, 동일 캐릭터가 10개 씬에 등장할 때 얼굴 일관성이 유지되어야 한다(S1 ≥ 0.80).
- **US-M2-6**: As a P3, 브랜드 마스코트 같은 비인간 캐릭터도 동일한 시스템으로 등록할 수 있어야 한다.
- **US-M2-7**: As a P1, 캐릭터 카드에 personality(JSONB)를 입력하면 프롬프트 합성 시 행동/표정에 반영되길 원한다.

#### Acceptance Criteria

- **AC-M2-1** *Given* 캐릭터 카드 + 레퍼런스 이미지가 등록되었을 때, *When* 해당 캐릭터가 포함된 씬을 생성하면, *Then* IP-Adapter 가중치가 적용된 이미지가 반환된다.
- **AC-M2-2** *Given* 동일 캐릭터가 포함된 10개 씬을 연속 생성하고 *When* `scripts/measure-consistency.ts`를 실행하면, *Then* 임베딩 코사인 유사도 평균 ≥ 0.80.
- **AC-M2-3** *Given* 캐릭터 카드의 `appearance`를 수정했을 때, *When* "전체 재생성" 버튼을 클릭하면, *Then* 해당 캐릭터가 등장하는 모든 씬이 큐에 등록되고 진행률이 표시된다.
- **AC-M2-4** *Given* 5명 캐릭터가 등록된 상태에서 *When* 한 씬에 3명을 선택하면, *Then* 자동 프롬프트 합성 시 3명 모두의 외형이 주입된다.
- **AC-M2-5** *Given* 비인간 캐릭터(예: 로봇)가 등록되었을 때, *When* 이미지를 생성하면, *Then* 인간/비인간 구분 없이 IP-Adapter가 동작한다 (확신도: [추정] FLUX IP-Adapter 비인간 지원 fact-checker 검증 필요).

#### 비기능 요구사항

- **성능**: 캐릭터 카드 등록 후 첫 씬 이미지 생성 ≤ 30s (FLUX 평균).
- **보안**: 레퍼런스 이미지는 Vercel Blob private 스토리지에 저장, RLS로 프로젝트 오너만 접근.
- **확장성**: 향후 오브젝트 고정값(P9)도 동일 패턴으로 확장 가능해야 함.

#### 의존 / 위험

- **의존**: `ai-consistency`(IP-Adapter), `data-lead`(characters 테이블), `fe-design`(카드 UI).
- **리스크**: IP-Adapter 가중치 튜닝 — 너무 강하면 다양성 소실, 너무 약하면 일관성 깨짐. 0.6~0.8 범위 실험 필요.

---

### 2.3 M3 — 인라인 핀 부분 재생성

#### 사용자 스토리

- **US-M3-1**: As a P3, 생성된 이미지에서 마음에 안 드는 영역을 드래그하여 사각 영역으로 표시하고 싶다.
- **US-M3-2**: As a P3, 영역에 댓글("이 부분 색만 푸른색으로")을 입력하면, 해당 영역만 재생성되길 원한다.
- **US-M3-3**: As a P1, 재생성 결과가 만족스러우면 "적용", 아니면 "재시도"할 수 있어야 한다.
- **US-M3-4**: As a P6, 원본과 수정본을 비교 슬라이더로 좌우 스와이프하며 확인할 수 있어야 한다.
- **US-M3-5**: As a P5, 한 이미지에 여러 핀(최대 5개)을 동시 표시하고, 각각 독립적으로 재생성할 수 있어야 한다.
- **US-M3-6**: As a P3, 재생성 평균 2.5회 이내에 만족스러운 결과를 얻어야 한다(S3).
- **US-M3-7**: As a P1, 핀 히스토리가 보존되어 "두 단계 전 버전으로 돌아가기"가 가능해야 한다.

#### Acceptance Criteria

- **AC-M3-1** *Given* 씬 이미지가 표시될 때, *When* 사용자가 마우스 드래그로 영역을 그리면, *Then* 정규화된 좌표(`{ x, y, w, h } 0~1`)가 inpaint_pins JSONB에 저장된다.
- **AC-M3-2** *Given* 핀에 댓글이 입력되었을 때, *When* "재생성" 버튼을 클릭하면, *Then* FLUX Fill API가 호출되고 결과가 result_url에 저장된다.
- **AC-M3-3** *Given* 재생성이 완료되었을 때, *When* 비교 슬라이더 컴포넌트가 렌더되면, *Then* 좌(원본)/우(수정본)를 드래그로 비교 가능하다.
- **AC-M3-4** *Given* 5개 핀이 동시에 존재할 때, *When* 각 핀을 독립적으로 재생성하면, *Then* 영역 간 충돌 없이 처리된다 (Vercel Queues로 직렬 보장 또는 Promise.all 병렬).
- **AC-M3-5** *Given* 30명 사용자 베타 테스트에서, *When* 핀 사용 데이터를 측정하면, *Then* 평균 재시도 ≤ 2.5회.
- **AC-M3-6** *Given* 핀 적용 후, *When* "되돌리기"를 클릭하면, *Then* 직전 result_url로 image_url이 복원된다.

#### 비기능 요구사항

- **성능**: 인페인팅 평균 응답 시간 ≤ 20s (FLUX Fill 추정).
- **UX**: 영역 드래그 시 60fps, 핀 마커는 Framer Motion으로 부드럽게.
- **접근성**: 키보드만으로도 핀 생성 가능(좌표 입력 폼 fallback).

#### 의존 / 위험

- **의존**: `fe-interactions`(드래그 + 슬라이더), `ai-consistency`(FLUX Fill / Nano Banana Edit).
- **리스크**: 인페인팅 결과가 영역 외 픽셀에 영향을 주면 시각적으로 어색 → 마스크 블러 + IP-Adapter 동시 적용으로 완화.

---

### 2.4 M4 — 이미지 → 영상 변환

#### 사용자 스토리

- **US-M4-1**: As a P1, 각 씬의 이미지를 클릭 한 번으로 영상 클립(3~10초)으로 변환할 수 있어야 한다.
- **US-M4-2**: As a P3, AI가 씬 특성에 따라 최적 영상 모델(9개 중 1개)을 추천 카드로 제안하길 원한다.
- **US-M4-3**: As a P3, AI 추천을 무시하고 수동으로 모델을 선택할 수도 있어야 한다.
- **US-M4-4**: As a P5, 카메라 무브먼트(panning/zoom/static)와 모션 강도(low/medium/high)를 UI에서 설정할 수 있어야 한다.
- **US-M4-5**: As a P1, 모든 씬의 영상 변환이 끝나면 Export 전 최종 체크를 보고 승인한 뒤 타임라인 순서대로 MP4로 결합되길 원한다.
- **US-M4-6**: As a P4, 변환 중 진행률(N/30 완료, ETA)이 실시간 표시되어야 한다.
- **US-M4-7**: As a P6, 변환 실패 시(API 오류) 재시도/폴백 후보와 비용 차이를 보고 선택하거나, 내가 허용한 Auto 정책 안에서는 자동 재시도되길 원한다.

#### Acceptance Criteria

- **AC-M4-1** *Given* 30개 씬이 모두 이미지를 가진 상태에서, *When* "영상 변환 시작"을 클릭하면, *Then* Vercel Queues에 작업이 등록되고 병렬로 실행된다.
- **AC-M4-2** *Given* 한 씬이 `duration_sec=8`, `emotion=battle`, `camera_angle=action`이라면, *When* 모델 추천이 발생하면, *Then* Runway가 1순위 후보로 표시되고 `model_selection_reason`, 예상 비용, 대체 모델이 함께 기록된다.
- **AC-M4-3** *Given* 사용자가 추천 모델 대신 Pika로 변경할 때, *When* 모델 칩 드롭다운에서 Pika를 선택하면, *Then* `model_auto_selected=false`로 전환되고 그 씬에서만 적용된다.
- **AC-M4-4** *Given* 모든 씬 변환이 완료되었을 때, *When* "Export MP4" 버튼을 클릭하면, *Then* FFmpeg.wasm(웹) 또는 네이티브 FFmpeg(데스크톱)이 1080p MP4를 생성한다.
- **AC-M4-5** *Given* 변환 중 한 씬이 실패하면, *When* Adviser Mode라면, *Then* 재시도/Seedance 폴백/건너뛰기 후보를 표시한다. Auto 허용 범위라면 1회 재시도 후 실패 내용을 사용자에게 알린다.
- **AC-M4-6** *Given* 30 씬 × 평균 5초 영상 = 150초 길이 Export, *When* 사용자가 Export 버튼을 누르면, *Then* 진행률이 실시간 표시되고 완료 시 다운로드 링크가 제공된다.

#### 비기능 요구사항

- **성능**: 30씬 영상 변환 병렬 처리, 평균 5분 내 완료(API 응답 시간 의존).
- **비용**: `cost-monitor`가 프로젝트당 예상 비용을 변환 시작 전 표시.
- **보안**: AI Gateway 키는 서버 사이드만, 클라이언트 노출 금지.

#### 의존 / 위험

- **의존**: `ai-video-router`(9 모델 라우팅), `be-orchestrator`(큐 + 재시도), `desktop-qa-lead`(네이티브 FFmpeg).
- **리스크**: Sora 2 등 일부 모델 접근 제한 → MVP는 Runway + Kling 최소 2개 + Seedance(폴백)로 시작, 나머지 점진 추가.

---

## 3. 데이터 스키마 요약

`packages/db/schema.sql`에 정의. 4개 메인 테이블 + AI Control 보조 테이블.

### 3.1 `projects`
```
id UUID PK | owner_id UUID -> auth.users | name TEXT
art_style TEXT                  -- '2D anime', '3D render', '수묵화'
mood_palette JSONB              -- { warm: 0.3, cinematic: 0.8 }
world_bible TEXT                -- 세계관 문서 (Post-MVP P9 확장)
created_at TIMESTAMP
```

### 3.2 `characters`
```
id UUID PK | project_id UUID -> projects
name TEXT | age INT | gender TEXT
personality JSONB               -- { extroversion: 0.2, passion: 0.9 }
appearance TEXT                 -- "짧은 은발, 붉은 눈, 검은 갑옷"
ref_image_url TEXT
role TEXT                       -- 'protagonist' | 'supporter' | 'villain'
```

### 3.3 `backgrounds`
```
id UUID PK | project_id UUID -> projects
name TEXT
time_of_day TEXT | weather TEXT | season TEXT
description TEXT
ref_image_url TEXT
```

### 3.4 `scenes` (멀티 모델 라우팅 필드 포함)
```
id UUID PK | project_id UUID -> projects
order_index INT | duration_sec NUMERIC
camera_angle TEXT               -- 'close-up' | 'medium' | 'wide'
emotion TEXT                    -- 'calm' | 'anger' | 'battle'
user_intent TEXT                -- "주인공이 검을 뽑는 장면"
image_prompt TEXT               -- 이미지 프롬프트 후보/승인본
video_prompt TEXT               -- 영상 프롬프트 후보/승인본
image_url TEXT
video_clip_url TEXT
characters_in_scene UUID[]
background_id UUID -> backgrounds
inpaint_pins JSONB              -- [{ area, comment, result_url }]

-- 멀티 모델 라우팅
image_model TEXT                -- 'fal-flux' | 'nano-banana' | 'ideogram' | 'dalle3' | 'sdxl'
video_model TEXT                -- 'runway' | 'kling' | 'veo3' | 'seedance' | 'grok' | 'luma' | 'pika' | 'hailuo' | 'sora2'
model_auto_selected BOOLEAN     -- true=AI 추천, false=사용자 오버라이드
model_selection_reason TEXT     -- "시네마틱 + 긴 영상이라 Kling 추천"
```

### 3.5 AI Control 보조 테이블

```
ai_preferences
id UUID PK | project_id UUID -> projects | user_id TEXT
global_mode TEXT                -- 'auto' | 'adviser' | 'off'
task_modes JSONB                -- { modelSelection: 'adviser', rightsCheck: 'auto' }
approval_thresholds JSONB       -- 비용/권리/외부 업로드 임계값

ai_suggestions
id UUID PK | scene_id UUID -> scenes
suggestion_type TEXT            -- model | prompt | inpaint | cost | rights
alternatives JSONB              -- 후보/대체안
risk_flags JSONB                -- 비용/품질/권리 리스크
user_decision TEXT              -- pending | accepted | dismissed | edited
decision_reason TEXT

generation_runs
id UUID PK | scene_id UUID -> scenes
provider TEXT | model TEXT | cost_estimate NUMERIC
status TEXT                     -- queued | running | succeeded | failed | cancelled
trigger_mode TEXT               -- auto | adviser | off
```

### 3.6 RLS 정책
- 모든 테이블: `owner_id = auth.uid()` 또는 `project_id IN (SELECT id FROM projects WHERE owner_id = auth.uid())`.
- Storage 버킷: 프로젝트 오너만 read/write.

---

## 4. API 계약 개요 (Server Actions / Route Handlers)

| # | 엔드포인트 | 유형 | 입력 | 출력 | 책임 에이전트 |
|---|---|---|---|---|---|
| **A1** | `splitSceneAction(scriptText)` | Server Action | `string` | `Scene[]` | `ai-prompt-engineer` |
| **A2** | `generateSceneImage(sceneId)` | Server Action | `uuid` | `{ image_url, model_used }` | `ai-consistency` |
| **A3** | `inpaintScenePin(sceneId, pinIndex)` | Server Action | `uuid, int` | `{ result_url }` | `ai-consistency` |
| **A4** | `generateSceneVideo(sceneId)` | Route Handler `POST /api/video` | `{ sceneId }` | `{ jobId }` (큐 등록) | `ai-video-router` |
| **A5** | `exportProjectMP4(projectId)` | Route Handler `POST /api/export` | `{ projectId, resolution }` | `{ downloadUrl }` (스트리밍) | `be-orchestrator` |

**공통 규칙**:
- 모든 엔드포인트 진입 시 Clerk 세션 검증.
- Zod 입력 스키마 강제.
- AI 호출은 Vercel AI Gateway 경유.
- 장시간 작업(>30s)은 Vercel Queues로 비동기 처리, 클라이언트는 polling 또는 Realtime 구독.

---

## 5. 수용 기준 종합 (D+60 출시 직전 체크리스트)

### 5.1 기능 (Functional)
- [ ] **F-01** 신규 프로젝트 생성 → 캐릭터 1+ 등록 → 씬 구성 제안/승인 → 이미지 생성 → 영상 변환 → MP4 Export 전체 플로우가 Playwright E2E로 통과한다.
- [ ] **F-02** 30 씬 타임라인이 60fps로 드래그된다.
- [ ] **F-03** S1 측정: 동일 캐릭터 10 씬 코사인 유사도 ≥ 0.80.
- [ ] **F-04** S3 측정: 인라인 핀 평균 재시도 ≤ 2.5회 (베타 사용자 데이터 기반).
- [ ] **F-05** 9개 영상 모델 중 최소 3개(Runway, Kling, Seedance)가 실제 호출 가능.
- [ ] **F-06** 5개 이미지 모델 중 최소 3개(FLUX, Nano Banana, DALL-E 3)가 실제 호출 가능.
- [ ] **F-07** 씬 구성 제안이 30초 이내에 25~35개 씬 후보를 생성하고, 사용자가 승인한 항목만 타임라인에 반영된다.
- [ ] **F-08** 인라인 핀 비교 슬라이더가 좌우 드래그로 동작.
- [ ] **F-09** 영상 변환 중 진행률이 실시간 표시.
- [ ] **F-10** 모델 추천 카드 + 사용자 승인 + 수동 오버라이드 + 명시 허용된 Auto 실행이 모두 동작한다.

### 5.2 비기능 (Non-functional)
- [ ] **N-01** 첫 페이지 LCP ≤ 2.5s (Lighthouse Production).
- [ ] **N-02** Web Vitals — INP ≤ 200ms, CLS ≤ 0.1.
- [ ] **N-03** Vercel Production 배포 + 도메인 연결 + HTTPS.
- [ ] **N-04** Sentry 에러 트래킹 활성화.
- [ ] **N-05** Vercel Analytics 대시보드 활성화.
- [ ] **N-06** 외부 유저 10명 가입 + 1명당 최소 1개 프로젝트 생성.
- [ ] **N-07** S2 측정: 5분 영상 제작 시간 -70% (내부 사용자 3명 측정).

### 5.3 보안 / 프라이버시
- [ ] **S-01** 모든 Server Action이 Clerk 세션 검증.
- [ ] **S-02** Supabase RLS가 4개 테이블 모두 적용.
- [ ] **S-03** AI API 키가 클라이언트 번들에 노출되지 않음 (`security-auditor` 검증).
- [ ] **S-04** 사용자 업로드 이미지는 Vercel Blob private + Signed URL.
- [ ] **S-05** 로그에 PII가 마스킹.
- [ ] **S-06** OWASP Top 10 자동 검사 통과.

### 5.4 데이터 / 인프라
- [ ] **D-01** Supabase 마이그레이션이 idempotent하고 롤백 가능.
- [ ] **D-02** 프로젝트 삭제 시 관련 모든 리소스(이미지/영상/Blob) cascade.
- [ ] **D-03** Vercel AI Gateway가 모든 AI 프로바이더 통합.
- [ ] **D-04** GitHub Actions CI가 main push 시 lint/test/build 통과.

---

## 6. MVP 제외 (Out of Scope)

다음은 D+60에서 **제공하지 않는다**. Post-MVP(Phase 8~12)로 연기.

| # | 제외 항목 | 연기 Phase | 이유 |
|---|---|---|---|
| **OOS-1** | 협업 모드 (실시간 댓글, 다중 사용자 편집) | P11 | Supabase Realtime 통합 + 충돌 해결 알고리즘 필요 |
| **OOS-2** | TTS / 자막 / 음성 더빙 (ElevenLabs) | P10 | 별도 도메인. M1~M4 안정화 우선 |
| **OOS-3** | 다국어 UI (영어/일본어/중국어) | P10 | next-intl 인프라. MVP는 한국어만 |
| **OOS-4** | 템플릿 마켓플레이스 (캐릭터/세계관 거래) | P12 | 결제·수수료·콘텐츠 모더레이션 필요 |
| **OOS-5** | 세계관 바이블 에디터 + 오브젝트 고정값 | P9 | 캐릭터 일관성(M2) 안정화 후 확장 |
| **OOS-6** | 모바일 네이티브 앱 (iOS/Android) | 확장 시나리오 E2 | 타임라인 UX의 모바일 적응 R&D 필요 |
| **OOS-7** | API 플랫폼화 (외부 호출용 SDK) | 확장 시나리오 E3 | 자체 UI 검증 후 |
| **OOS-8** | 자체 모델 파인튜닝 / 학습 | 피벗 트리거 T3 이후 | 비용 ROI 분석 필요 |
| **OOS-9** | 스토리텔링 어시스턴트 (감정 곡선 자동 분석) | P8 | `storyboard-director` 성숙 후 |
| **OOS-10** | 모바일 Read-only 뷰 | MVP 후속 패치 | MVP는 데스크톱 우선 |
| **OOS-11** | 9개 영상 모델 전체 연동 | Phase 5+ | MVP는 3개(Runway/Kling/Seedance), 나머지 점진 |
| **OOS-12** | 5개 이미지 모델 전체 연동 | Phase 5+ | MVP는 3개(FLUX/Nano Banana/DALL-E), 나머지 점진 |
| **OOS-13** | 결제 / 구독 모델 | Phase 5 직후 (D+60~D+90) | MVP는 무료 베타 10명, 결제는 사용량 데이터 확보 후 |
| **OOS-14** | 비인간 캐릭터 IP-Adapter 검증 | M2 안정화 후 | fact-checker 사전 검증 필요 |
| **OOS-15** | 배경 카드의 자동 일관성 적용 | Phase 6+ | MVP는 캐릭터만, 배경은 수동 |

---

## 7. 변경 이력

| 일자 | 버전 | 변경 | 작성 |
|---|---|---|---|
| 2026-04-20 | 1.0 | 초기 PRD 작성. 6 페르소나 + M1~M4 + 데이터 스키마 + API + 수용 기준 + Out of Scope. | `product-lead` |
| 2026-05-03 | 1.1 | AI-native NLE 포지셔닝, Adviser-first AI Control, Auto/Adviser/Off 작업별 모드, Cantos 개발 메모리 반영. | `product-lead` |

---

## 8. 참조

- 상위 플랜: `.claude/plans/ai-typed-dusk.md`
- 비전: `docs/VISION.md`
- 로드맵: `docs/ROADMAP.md`
- 에이전트 매트릭스: `.claude/rules/agent-matrix.md`
- 인사이트: `docs/domain-knowledge/product-insights.md`
## 2026-05-03 Loop 2 Update: Production Readiness Gates

- AETHON's AI execution contract now requires explicit `SceneSpec`, provider capability, validation, rights, cost, and export readiness evidence.
- The UI must keep AI as an adviser by default: model suggestions expose cost/risk/capability, and export is blocked until pending choices, QC failures, rights review, and budget issues are resolved.
- Verified implementation: `packages/core/src/production-readiness.ts`, `apps/web/app/studio-client.tsx`, 17 core tests, full typecheck/build, Playwright screenshots, and Cantos DDR `0019-loop2-production-readiness-gates.html`.
- Product requirement impact: every paid/external provider run needs a decision audit and an approved budget before queueing.
