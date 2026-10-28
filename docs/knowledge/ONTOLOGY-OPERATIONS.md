# 사업계획·발표 온톨로지 운영 안내

이 도구는 사업계획과 발표 JSON을 **하나의 읽기 전용 그래프**로 검사하고 필요한 근거를 조회한다. 별도 설치나 네트워크가 필요하지 않다. 정본과 관계 제약은 [온톨로지 계약](ONTOLOGY-SCHEMA.md)을 따른다. 기존 `project_kit`과 제품 런타임 온톨로지는 별도다.

## 작업 시작과 근거 확인

저장소 루트의 PowerShell에서 실행한다.

```powershell
python docs/knowledge/ontology_tool.py validate
python docs/knowledge/ontology_tool.py search "시장"
python docs/knowledge/ontology_tool.py show BP-DATA-001
python docs/knowledge/ontology_tool.py impact BP-SRC-006
```

`validate`는 종류별 필수 필드, 관계의 출발·도착 타입, 출처, 가설·근거 상태, 의존 관계 순환과 사업–발표 수치 스냅샷을 검사한다. 오류가 있으면 수정 후 다시 검사한다. 통과는 기록된 구조의 검증이지 원문의 진실성, 실제 사업성 또는 인터넷 자료의 최신성 보증이 아니다.

`show`는 해당 항목이 의존하는 근거를 따라가고, `impact`는 반대 방향으로 해당 근거를 이용하는 사업계획 장·발표 주장·슬라이드 등 **검토 후보**를 찾는다. 예시의 IFPI 출처는 `BP-DATA-001`과 `PPT-DATA-001`을 거쳐 `PPT-SLIDE-006`에 연결된다. 기존 Markdown이나 PPT 파일을 자동으로 고치지는 않는다.

## 작성 문맥과 변경 확인

사업계획용은 `business`, 발표자료용은 `pitch`를 선택한다. `context`는 유효한 그래프에서 관련 항목과 로컬 출처의 해시를 포함한 JSON을 만든다. 예시는 시스템 임시 폴더에 고유한 이름으로 저장한다.

```powershell
$aethonContextPath = Join-Path $env:TEMP ("aethon-pitch-{0}.json" -f [guid]::NewGuid())
python docs/knowledge/ontology_tool.py context --task pitch --json | Set-Content -Encoding UTF8 -LiteralPath $aethonContextPath
if ($LASTEXITCODE -ne 0) { throw '온톨로지 문맥 생성 실패' }
python docs/knowledge/ontology_tool.py context-check $aethonContextPath
```

컨텍스트를 적용하기 전과 근거가 변경된 후 `context-check`를 실행한다. 본문, 두 온톨로지 JSON 또는 포함된 로컬 출처가 바뀌면 오류를 표시한다. 영향 항목은 해당 출처나 개념 ID로 `impact`를 실행해 확인하고, 새 문맥을 생성해 차이를 검토한다. 해시는 로컬 바이트 변경 감지용이며 전자서명이나 출처 진위·URL 최신성 검증이 아니다. 줄바꿈 변경도 바이트 변경으로 감지된다.

수치 스냅샷은 사업 데이터와 발표 데이터의 `value`, `unit`, `period`를 비교한다. 제목 등 자유 텍스트, Markdown 문서나 생성된 PPT의 숫자는 자동 비교하지 못하므로 별도 검토한다. 외부 자료의 조건·날짜는 사용 직전 원문에서 확인한다.

## 기존 지식 키트 조회

```powershell
python docs/knowledge/ontology_kit_bridge.py validate
python docs/knowledge/ontology_kit_bridge.py search "Aethon" --task business --limit 5
python docs/knowledge/ontology_kit_bridge.py impact SPEC2:BUS-001
python docs/knowledge/ontology_kit_bridge.py --snapshot-head validate
```

브리지는 기존 키트의 조회 명령과 종료 코드·오래된 근거 경고를 그대로 전달한다. 검색 성공이 기존 키트 전체 검증 성공을 의미하지 않으므로 먼저 `validate` 결과를 확인한다. **2026-10-27 검증 시 기존 키트는 해시 불일치와 연쇄적인 오래된 근거 경고로 실패했다.** 별도 조사에서 143개 해시 불일치는 체크아웃 줄바꿈 차이로 확인됐지만 원본을 변경하거나 해시를 갱신하지 않았다. 현재 작업본의 재검증 결과를 우선한다.

`--snapshot-head`는 Git의 마지막 커밋에서 체크아웃 줄바꿈 변환 없이 키트를 임시 사본으로 열고, 그 사본의 CLI로 검사한다. 커밋되지 않은 변경은 포함하지 않으며 원본 작업본의 검증 성공을 뜻하지 않는다. 현재 작업본을 검사하려면 옵션 없이 실행한다. 임시 사본은 실행 종료 시 정리된다.

이 브리지는 신규 JSON을 기존 키트에 등록·승격하거나 두 그래프를 자동 결합하지 않는다. 기존 키트 오류가 남아 있을 때 그 결과를 승인된 현재 근거로 취급하지 않는다. 자동 등록이나 키트의 검증 규칙 우회 없이 두 결과의 출처와 상태를 각각 확인한다.

## 유지보수

원문이 바뀌면 해당 항목의 사실 여부와 범위를 검토하고 필요한 경우 새 근거 또는 ID로 갱신한다. 사업 수치와 연결된 PPT의 `metric_snapshot`을 함께 검토하며, 기존 ID의 의미를 임의로 바꾸거나 가설을 실측으로 승격하지 않는다. 관련 산출물을 수정한 뒤 `validate`, 작성 문맥 재생성 및 관련 테스트를 실행한다.

```powershell
python -m unittest discover -s tests -p 'test_business_ontology.py' -v
```
