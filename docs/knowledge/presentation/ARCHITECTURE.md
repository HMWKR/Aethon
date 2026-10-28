# Aethon 발표용 기술 아키텍처

**기준일: 2026-10-28.** 현재 피벗된 Aethon의 로컬 프로토타입과 향후 도입 검토안을 발표하기 위한 기준 자료다. 현재 기능과 시험 범위는 2026-10-27 코드·QA 조사와 2026-10-28 발표자료 작성 근거에 따른다. 이후 코드나 연결 상태가 바뀌었는지는 이번 문서 작성에서 다시 조사하거나 시험하지 않았다. 발표 전에 현재 저장소와 관련 QA 기록을 다시 확인한다.

도식은 설명을 위해 일부 단계를 묶은 개념도다. 도식 안의 서비스 이름과 화살표가 현재 운영 중인 클라우드나 외부 모델 연결의 증거는 아니다. 사용자는 웹 작업대에서 요청하고, **Aethon 플랫폼**이 프로젝트 맥락·승인·작업을 관리하며, **외부 모델·서비스**는 별도의 경계에서 호출된다.

## 현재와 향후: 한 장의 개요

![Aethon의 현재 및 향후 시스템 구조](assets/architecture-overview-outlined.png)

위쪽은 현재 부분 구현 및 제한 시험, 아래쪽은 향후 도입 검토·미구현 구조다. 목표 사용자 흐름은 **요청·기획 → 생성 요청 → 편집·검토 → 저장·전달**이다. 실제 외부 모델로 생성이 검증되었다는 뜻은 아니다.

| 역할 | 2026-10-27 조사 당시 확인 | 향후 제안 · 미구현 |
|---|---|---|
| 웹 작업대 | HTML·CSS·바닐라 JavaScript 기반 로컬 브라우저 화면 | Next.js 검토 |
| API·작업 관리 | Python 표준 HTTP 서버와 자체 Python 도구 실행·승인·예산·작업 관리 | FastAPI, AWS ECS/Fargate 등의 도입 검토 |
| 업무 데이터 | SQLite에 상태·작업·원장 등을 보관 | PostgreSQL/RDS 등 운영 DB 검토 |
| 파일·출력 | 로컬 원본·내보내기 파일, FFmpeg·FFprobe 기반 렌더 경로 | S3 미디어 저장과 CloudFront 전달 검토 |
| 대화 AI | 별도 주입한 Claude 어댑터의 제한 시험; 기본 실행에서 자동 연결되지 않음 | 별도 대화 모델로 기획·도구 요청을 처리하는 구조 검토 |
| 영상 AI | 생성 큐와 fal 어댑터 경로가 있으나 기본 미연결, 실제 영상 생성 검증 전 | RunPod GPU와 Wan 등으로 영상 추론 검토 |
| 분석·모델 | 현재 조사에서 Databricks 운영·자체 모델 완성 확인 없음 | 권리가 확인된 기록의 Databricks 후속 분석과 장기 모델 연구 검토 |

기획용 대화 모델과 영상 생성 모델은 서로 다른 역할이다. 대화 모델이 영상 모델을 직접 실행하는 것으로 간주하지 않는다. 실제 생성 요청은 플랫폼의 도구 실행, 승인·예산 및 생성 큐를 거치는 경로로 설명한다. LangChain, PostgreSQL, AWS 또는 Databricks가 현재 사용 중이라는 근거는 기존 조사에서 확인되지 않았다.

## 모델 고도화 흐름: 장기 연구

![권리 확인부터 평가와 배포까지의 모델 고도화 흐름](assets/architecture-lifecycle-outlined.png)

권리가 확인된 데이터와 교사 모델을 전제로 기획용 대화·이미지·영상 모델을 각각 연구하고, 기준 모델 대비 품질·비용·안전과 사람의 선택을 평가한 뒤 조건이 맞을 때 배포·관찰·이전 버전 복구를 검토한다. Databricks는 허용 기록의 정제·분석 후보이고 MLflow는 모델 버전 관리 후보이다. 미세조정이나 증류는 모델별 사용 권리와 약관을 확인한 뒤 검토하며, 특정 외부 모델의 출력이나 가중치를 증류할 권리가 확보되었다는 뜻이 아니다. 자체 모델 구축과 효과는 아직 검증되지 않았다.

## 비동기 영상 작업: AWS 상세 제안

![AWS와 외부 추론을 구분한 비동기 작업 구조](assets/architecture-aws-detail-outlined.png)

이 구조는 향후 설계안이며 모든 서비스의 동시 도입이 확정된 것은 아니다. CloudFront는 웹·결과 전달, VPC의 API와 작업 조율은 승인과 상태 관리, 외부 RunPod/Wan은 GPU 추론 후보, S3는 생성 장면·최종 영상 저장 후보이다. S3와 SQS는 VPC 바깥의 AWS 관리형 서비스로 그렸다. 개념상 **장면 업로드 이벤트 → SQS 알림 → 완료 조건 검증 → PostgreSQL 상태 기록 → FFmpeg 합성 워커 → S3 최종 영상 → CloudFront 전달** 순서를 사용한다. SQS 자체가 파일을 처리하거나 완료를 보증하지 않는다. 최종본 업로드는 같은 생성 알림을 반복하지 않도록 이벤트 범위를 분리하는 설계다.

실서비스 설계 시 작업 ID별 중복 이벤트·재시도·타임아웃·실패 복구, 장면 누락 검증, 원자적 상태 변경, 모델별 접근 권한과 비용을 별도 설계·시험해야 한다. DB의 상태 기록은 작업이 준비되었다는 정보이며 DB가 자동으로 워커를 직접 실행한다는 뜻은 아니다. Databricks는 실시간 요청 경로 밖에서 **사용이 허용된 기록만** 수집·분석하는 후속 단계다.

## 근거와 확인 범위

- 현재 구현 경로: [웹 화면](../../../index.html), [Python 서버](../../../app.py), [대화·도구 실행](../../../chat_runtime.py), [영상 생성 큐](../../../generation_queue.py), [fal 연동 경로](../../../fal_provider.py), [타임라인 편집](../../../editing.py), [FFmpeg 렌더](../../../renderer.py), [사용량 원장](../../../ledger.py). 이 파일 링크는 검토 출발점이며 이후 변경 여부까지 보증하지 않는다.
- 제한 시험: 2026-10-27 내부 QA 기록(경로는 내부 관리 목록인 사업계획 온톨로지 `BP-SRC-004` 참조)은 합성 음원·로컬 모션을 사용한 3초 MP4 출력 등 당시 검증 범위를 기록한다. 실제 고객 사용이나 외부 영상 AI 생성 성공을 보증하지 않는다.
- v7 발표물: [미리캔버스 PDF](../../../artifacts/aethon-ir-v7-pipeline/output/Aethon-IR-v7-MiriCanvas.pdf), [최종 검수 기록](../../../artifacts/aethon-ir-v7-pipeline/qa/최종검수기록.md), [도식 작성 원본](../../../artifacts/aethon-ir-v7-pipeline/assets/). 당시 PPT의 사용자·플랫폼·외부 경계와 현재/향후 상태를 유지한다.
- 아이콘 출처는 [AWS 아키텍처 아이콘](https://aws.amazon.com/architecture/icons/), [Databricks 브랜드 지침](https://brand.databricks.com/) 및 [도식 아이콘 출처 기록](../../../artifacts/aethon-ir-v7-pipeline/assets/SOURCES.md)(AWS·Databricks 아이콘 출처, v7 개요도 기술 표시 글리프의 출처 확인 필요 사항, 제휴 아님 고지 포함)을 참고한다. 이용 조건은 재사용 전 확인한다.

## 이미지와 수정 방법

각 이미지의 `*.svg`는 일반 텍스트를 포함한 수정용 원본이다. 텍스트와 도형의 위치·내용을 SVG 편집기에서 조정할 수 있다. `*-outlined.svg`는 미리캔버스 PDF에서 한글이 사라지는 문제를 막기 위해 모든 글자를 경로로 바꾼 등록용 벡터이며, 도식의 글자를 일반 텍스트로 선택·수정할 수 없다. `*-outlined.png`는 경로화 SVG의 1920×850 미리보기다.

1. **원본 SVG를 복사해 수정**하고 기술명·상태·화살표를 근거에 맞게 확인한다. 기존 최종 자료의 출처와 버전은 보존한다.
2. 수정한 SVG의 글자를 경로로 변환하고 PNG로 렌더링해 글자·경계·연결선을 눈으로 확인한다. 기존 생성·변환 예시는 [v7 스크립트](../../../artifacts/aethon-ir-v7-pipeline/assets/architecture-build.py)이며, 이 스크립트는 해당 작업 당시의 로컬 산출물 및 Windows 글꼴 경로에 의존하므로 다른 환경에서 그대로 재현된다고 보장하지 않는다.
3. 미리캔버스에 경로화 SVG를 배치한 뒤 실제 PDF로 내보내 한글·크기·겹침을 다시 확인한다. PPTX 내부의 이미지 도식은 개별 문구를 직접 편집할 수 없다.

## 보존 파일 무결성

2026-10-28 복사 직후 v7 원본과 아래 파일의 SHA-256이 모두 일치했다.

| 보존 파일 | SHA-256 |
|---|---|
| [architecture-overview.svg](assets/architecture-overview.svg) | `6894A543F19679132972C62728214FD3EC2B9BE87BFB17AF8233665E52F91296` |
| [architecture-overview-outlined.svg](assets/architecture-overview-outlined.svg) | `D607D4B9A1814EECE1F7DAD4240D346CC88FD9EE9A62656AB8D95A5C53C6F80A` |
| [architecture-overview-outlined.png](assets/architecture-overview-outlined.png) | `049320F30B96247B2EDBF559D9462E6F2E6CC3212635EB0DF5BE080AF3A5F8E7` |
| [architecture-lifecycle.svg](assets/architecture-lifecycle.svg) | `7A01A471A6F8BC2F34A57455A84CDAD932B3250CCB7231C02D922B543FA6DA03` |
| [architecture-lifecycle-outlined.svg](assets/architecture-lifecycle-outlined.svg) | `659F81207C4725659049317505D2185FC402B434956CDBBC8671922F16F907A5` |
| [architecture-lifecycle-outlined.png](assets/architecture-lifecycle-outlined.png) | `5841D0BD9221704EDBDB81E5DB72EE3A7736D64D4385155CF0ACC4420E51137E` |
| [architecture-aws-detail.svg](assets/architecture-aws-detail.svg) | `DECDDAFAFEB1CA046AEFE6A45056651802F842D17D73A48773B233C723E699B9` |
| [architecture-aws-detail-outlined.svg](assets/architecture-aws-detail-outlined.svg) | `215D5D1ACEFBC9CBD5FC0C58ED95CAEA982C1CD7D083C157D24ACBB86C75284F` |
| [architecture-aws-detail-outlined.png](assets/architecture-aws-detail-outlined.png) | `41B811BBD3DD670C73B2D4E2C516B0F9DB5B7F0BBEDAB86D474DFE74E8B35E08` |
