# v6 사실·온톨로지 변경 검토

2026-10-28 01:05~01:07 KST. **v5에서 바꿔야 할 새로운 사실 변경은 발견하지 않았다.** 새 프리미엄 템플릿에 v5의 검증된 내용과 상태 구분을 재사용할 수 있다.

## 이번에 확인한 변경 여부

| 영역 | 변경 여부와 근거 |
|---|---|
| 최신 개발·제한 시험 근거 | QA `docs/qa/codex-workflow-review-20261027/REPORT-ko.md` SHA256이 지난밤 v5 검수와 동일: `cf06bbb1edc9de14cd9ff802f21f3b8e37e1fe176c858d4373ae897714ad0923`. 476개 검사 기록, 합성 로컬 3초 출력, 별도 브라우저 2초 편집 출력의 상태 변화 없음. 이번에는 제품 시험을 재실행하지 않음 |
| 현재 스택·연결 경계 | `app.py` 및 프런트엔드 현재 코드 재확인. HTML/CSS/JavaScript, Python HTTP, SQLite·로컬 파일, FFmpeg/FFprobe라는 v5 설명과 일치. `app.py:1013` 선택적 모델 설정 및 `app.py:1174` 기본 실행에서 외부 모델 설정 미전달 확인. 클라우드 운영·일반 모델 연결 완료로 바꿀 새 근거 없음 |
| 실제 모델 시험 | 제한된 실제 Claude 도구·편집 시험 기록은 유지. 일반 사용자용 연결과 외부 AI 영상 생성 실호출 검증 미완료/보류 상태도 그대로. 모델 연결 코드 존재와 실사용 수용을 합쳐 표현하지 않음 |
| 타깃·시장·경력 | 기존 v5 발표 노트 3/6/7/10/14p 및 지난밤 사실 검수와 대조. 타깃 가설, 고객 인터뷰·시험 고객·매출 없음, 경력 본인 제공, 수상 과거 팀 이력의 변경 근거 없음. 웹자료는 지시대로 2026-10-27 확인 결과를 재사용하며 새 수치를 만들지 않음 |
| 사업·발표 그래프 | 두 JSON의 SHA256이 기존 문맥과 일치. `context-check`에서 포함된 로컬 근거 전체의 freshness 유효 확인. 기존 발표 README의 청중/발표시간 미확인 표기는 일반 브리프의 미갱신 문구이며, 이번 대회의 사용자 요청과 기존 직접 확인한 안내 PDF의 8분 발표 조건이 우선 |

## 실행 결과와 새 산출물

- 현재 프로젝트 `AGENTS.md`와 `docs/knowledge/ONTOLOGY-OPERATIONS.md`, 발표 README를 재확인했다.
- `ontology-validate-v6.json`: `valid: true`, 86 nodes, 119 edges, 오류 없음.
- `ontology-previous-context-check-v6.json`: 지난밤 사용한 `C:/Users/jusan/AppData/Local/Temp/aethon-pitch-v4-context-20261027.json`의 `valid: true`, 오류 없음.
- `ontology-pitch-context-v6.json`: 현재 그래프로 새로 생성한 v6 발표 문맥.
- `ontology-context-check-v6.json`: 새 v6 문맥의 `valid: true`, 오류 없음.
- `fact-source-hashes-v6.json`: 관련 안내·README·QA·ontology·현재 스택 파일 13개의 새 해시 스냅샷. 소스 코드 전체가 과거와 바이트 단위 동일하다고 주장하지 않으며, 과거 해시가 있는 QA·두 ontology와 저장 문맥은 직접 비교했다.
- `ontology-kit-bridge-summary-v6.json`: 별도 project_kit 검사는 종료1. revision26, 1827 objects, `HASH_CHANGED` 143개와 `UPSTREAM_STALE` 926개. 기존 실패 상태가 남아 있고 새 사업·발표 그래프 통과와 별개다. 원본/등록/해시는 수정하지 않았다.

새 근거 변경이 없어서 `impact` 재검토를 요구하는 변경 출처가 없었다. 이번 작업에서 작성한 파일은 이 evidence 폴더의 ontology/fact 검증 산출물뿐이며, 제품 코드·기존 자료·이미지·PPT·미리캔버스를 수정하지 않았다.

## v6 제작 시 유지할 결론

새로운 사실 수정 요청은 없다. **현재 로컬 구현 / 제한 시험 / 향후 도입 제안**을 기존처럼 분리하고, 새 템플릿의 예시 매출·고객·TAM 숫자는 Aethon 값으로 남기지 않는다. `150억 회+`, `15.8%`, `200만~400만 원`에는 기존 대상·기간·단위·조건을 그대로 붙인다. 이번 로컬 검사를 외부 원문을 10월28일 새로 확인한 것으로 표현하지 않는다.
