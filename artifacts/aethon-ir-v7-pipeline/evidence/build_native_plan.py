import copy,json
from pathlib import Path
base=Path("artifacts/aethon-ir-v7-pipeline/evidence")
old=json.loads(Path("artifacts/aethon-ir-v6/evidence/native-plan-reviewed.json").read_text(encoding="utf-8-sig"))
sc=json.loads((base/"prepare-scaffold.json").read_text(encoding="utf-8-sig"))
story=json.loads(Path("artifacts/aethon-ir-v7-pipeline/story/slideplan.json").read_text(encoding="utf-8-sig"))
p=copy.deepcopy(old)
labels=["0","3","3#2","4","6","3#3","4#2","9","7","9#2","6#2","10","6#3","10#2","2","3#4","6#4","2#2","4#3"]
p["sources"]=sc["plan"]["sources"]
p["coverage"]=[{"src":src,"at":at} for src,at in zip(p["sources"],labels)]
p["notes"]=["19장: 본문 16장 + 질의용 부록 3장. 각 수치의 범위와 상황은 원고 기준.","10쪽 5초 컷당 1·2·3회 생성 API 소계 전체값 $21·$42·$63 → 9#2의 native table_create. 개별값 조회가 목적이며 유료 호출 횟수·가격의 속성을 비교하므로 표 사용.","현재·향후 도식 및 모델 연구·상세 도식은 등록된 SVG를 이미지로 후속 삽입해야 함. 제품 화면도 내부 합성 시험임을 표기.","가격·고객·매출·고객 인터뷰·시장 금액 미확정 또는 없음. 외주 견적은 18쪽에서만 맥락으로 제시."]
p["keep"]=[x for x in p.get("keep",[]) if not x.startswith("5")]
ops=p["page_ops"]
for op in ops:
    if op.get("op")=="duplicate" and op.get("page")=="4": op["count"]=2
    if op.get("op")=="duplicate" and op.get("page")=="3": op["count"]=3
    if op.get("op")=="reorder": op["order"]=labels
ops.insert(4,{"op":"delete","page":"5"})
idx=next(i for i,x in enumerate(ops) if x.get("op")=="reorder")
ops.insert(idx,{"op":"duplicate","page":"9","count":1})
ops=[x for x in ops if x.get("page")!="5" or x.get("op")=="delete"]
ops=[x for x in ops if x.get("page")!="3#5"]
p["page_ops"]=ops
# Duplicate original competition table cleanup on the cost page.
del9=next(x for x in ops if x.get("op")=="delete_nodes" and x.get("page")=="9" and "9n1" in x.get("nodes",[]))
costdel={"op":"delete_nodes","page":"9#2","nodes":[n+"#2" for n in del9["nodes"]]}
pos=ops.index(del9)
ops.insert(pos+1,costdel)
# Remove template branding on extra cloned pages.
ops.append({"op":"delete_nodes","page":"9#2","nodes":["9n24#2","9n25#2"]})
ops.append({"op":"delete_nodes","page":"4#3","nodes":["4n38#3","4n39#3"]})
ops.append({"op":"table_create","page":"9#2","box":{"left":124,"top":475,"width":1665,"height":350},"columns":["컷당 유료 생성","1회","2회","3회"],"rows":[["60컷 API 소계","$21","$42","$63"]],"font_size":32})
r=p["replacements"]
r.pop("5",None);r.pop("3#5",None)
r["0"].update({"n8":"아티스트의 다음 MV까지","n4":"AI Music Video Workspace","n6":"REALIZESOFT"})
r["3"].update({"n30":"제작 맥락을\n하나로 연결","n24":"문제 가설 · 고객 인터뷰 전","n19":"준비","n29":"아티스트와 곡의 자료를 모읍니다.","n26":"기획","n18":"장면을 구상하고 도구를 연결합니다.","n27":"검토","n17":"결과를 비교하고 수정·승인합니다.","n16":"Problem"})
r["3#2"].update({"n30":"왜 이 제작팀부터\n시작할까요?","n24":"초기 타깃 가설 · 고객 인터뷰 전 / NEKIRU·밍글스튜디오 공개 사례","n19":"반복 발매","n29":"NEKIRU 단일 사례: 싱글 17곡 이상. MV 편수 아님","n26":"작은 조직","n18":"자료·기획·검토 연결의 필요성을 인터뷰로 확인","n27":"제작 비용","n17":"MV 외주 공개 예상 견적: 200만~400만원 · VAT 별도","n16":"Target"})
r["4"].update({"n23":["자료에서","결과까지","하나의 흐름"],"n50":"자료 입력","n41":"아티스트·음원·참고 자료","n42":"대화 AI","n44":"장면 구상·기획","n22":"영상 모델","n43":"생성 요청·결과 선택","n45":"검토·출력","n16":"편집·승인 후 출력","n21":"목표 사용자 흐름 · 영상 모델 실호출 검증 전"})
r["6"].update({"n17":"로컬 제한 시험을\n진행했습니다","n19":"내부 합성 시험 화면 · 3초 MP4 / 별도 브라우저 편집 출력 2초","n11":"Progress"})
r["3#3"].update({"n30":"다음 작업까지\n제작 맥락 연결","n24":"제품 방향 가설 · 고객 인터뷰·시험 고객·매출 없음","n19":"자료","n29":"아티스트·음원과 제작 참고 자료","n26":"장면","n18":"기획 의도와 생성 결과를 연결","n27":"다음 작업","n17":"선택한 맥락을 다시 쓰는 가치 검증","n16":"Workflow"})
r["4#2"]={"n23":["시장 범위를","네 단계로","좁혀 출시"],"n50":"TAM","n41":"글로벌 MV 제작 SW","n42":"SAM","n44":"국내 제공 가능 MV 제작 SW","n22":"SOM","n43":"접근·판매·지원 가능한 국내 조직","n45":"LAM","n16":"소규모 기획사·지하/버추얼 아이돌 MV팀","n7":"Market Scope","n35":"Market","n5":"Addressable","n21":"동일 조직·연간 MV 제작 도구 지출 기준 · 금액과 고객 수 미산정"}
r["9"].update({"n41":"대안별 제작 방식","n36":"작업 흐름 기준 · 가격·품질 우위 검증 전","n14":"Alternatives"})
r["7"].update({"n28":"구독과 사용량\n과금 가설","n29":"승인본당 직접비 = 같은 기간 총 직접비 ÷ 승인본 수","n57":"작업대 구독","n54":"제작 자료·프로젝트 관리","n6":"생성 사용량","n27":"모델 호출·영상 처리 반영","n39":"가격 검증","n14":"지불 의향과 비용 확인 후 결정"})
r["9#2"]={"n41":"가성비를 결정하는\n생성과 사람 작업","n14":"Cost Scenario","n36":"fal Kling 2.5 Turbo Pro I2V · 5초 $0.35 · 60컷 가정 / 기획·편집·검수·권리·저장·전송 별도 · Aethon 요금 미정"}
r["6#2"].update({"n17":"현재와 향후\n시스템 구조","n19":"사용자 · Aethon 플랫폼 · 외부 모델/서비스 / 현재와 향후 분리","n11":"Architecture"})
r["10"].update({"n20":"제작팀과 함께\n사용을 검증","n42":"고객 인터뷰 → 제한 시험 → 반복 사용","n41":"최근 MV 제작 과정","n38":"자료 전달·수정·승인 확인","n45":"기획사·제작팀 인터뷰","n12":"Interview","n25":"한 곡의 작업 흐름","n1":"기획부터 검토까지 시험","n43":"이용 경험과 승인본 비용 측정","n3":"Test","n37":"다음 곡의 자료 재사용","n4":"반복 사용·지불 의향 확인","n44":"검증 결과로 다음 단계 결정","n2":"Repeat","n17":"Validation"})
r["6#3"].update({"n17":"대화·이미지·영상\n모델 연구","n19":"장기 R&D 계획 · 데이터 권리와 모델 약관 확인 후 평가","n11":"AI Roadmap"})
r["10#2"].update({"n20":"검증 후 협업 시장으로\n단계적 확장","n42":"반복 사용·비용·운영 역량을 확인하며 확장","n41":"초기 아이돌 MV","n38":"제작팀의 작업 흐름 검증","n45":"기획사·제작팀","n12":"Initial","n25":"인접 창작 작업","n1":"사용 사례와 운영 경험 축적","n43":"필요한 역할 단계별 확보","n3":"Adjacent","n37":"AI 협업 제작","n4":"더 넓은 워크플로 시장","n44":"품질·비용·데이터 권리 검토","n2":"Long term","n17":"Expansion"})
r["2"].update({"n39":["개발과 데이터를","연결하는","1인 창업자"],"n32":"이성민 · RealizeSoft(현실화하는소프트) 대표\n경복대학교 소프트웨어융합학과\n데이터 엔지니어 · 한화 포탈 경험","n25":"국가공인 네트워크관리사 2급 · AI프러덕션 기획자 1급 · Databricks Professional","n20":"2026 U300 Academy 대상 / 한국연구재단 이사장상\n경기북동부 청년창업챌린지 기술상 / 경기도경제과학진흥원장상\nRealizeSoft 과거 팀 수상"})
r["3#4"].update({"n30":"제작팀과 함께\n다음 검증","n24":"연결과 피드백, 사업화 멘토링","n19":"제품","n29":"생성·편집·출력 흐름 완성","n26":"고객","n18":"실제 작업과 사용 경험 확인","n27":"비용","n17":"생성·재시도·사람 작업을 측정","n16":"Next Step"})
r["6#4"].update({"n17":"부록 · 비동기\n영상 생성 구조","n19":"향후 제안 · 작업 등록·완료 확인·승인·렌더","n11":"Async Detail"})
r["2#2"].update({"n39":["숫자와 주장,","구현 상태의","출처"],"n32":"KOCCA: 2025 대중음악 매출 +15.8%\n밍글스튜디오: MV 200만~400만원\nVAT 별도 · 상담 견적","n25":"외부 수치는 인접 시장·공개 견적의 맥락","n20":"fal.ai Kling 공개 단가 (2026.10.28 확인)\nAethon 저장소·QA 기록\n경복대학교 RealizeSoft 수상 보도"})
r["4#3"]={"n23":["현재 대표 1인,","단계에 맞춰","역량 보강"],"n50":"대표","n41":"데이터·제품 개발","n42":"영상·UX","n44":"제작 품질·사용성","n22":"고객·사업","n43":"고객 검증·운영","n45":"ML·MLOps","n16":"데이터 권리·평가","n7":"Team Plan","n35":"Roles","n5":"Capabilities","n21":"네트워크관리사 2급 국가공인 · 다른 자격은 본인 제공 표기 · 채용 미확정"}
# Keep old comparison table but align its content to current target.
for op in ops:
    if op.get("op")=="table_create" and op.get("page")=="9":
        op["rows"]=[["기획·제작","도구 조합","계약 범위 수행","자료·장면 연결"],["선택·수정","파일 관리","수정 의견 전달","결과 비교·승인"],["다음 제작","자료 재연결","새 의뢰·협의","맥락 재사용 목표"]]
# Required illustrations need larger non-framed image regions added by editor.
p["notes"].append("이미지 수동 삽입 위치: 6=시험 화면, 6#2=overview, 6#3=lifecycle, 6#4=aws-detail. 미리캔버스 plan은 새 프레임 없는 이미지 자리를 생성하지 못해 SVG의 원본 비율을 보존할 기존 자리가 없음.")
(base/"native-plan-v7-draft.json").write_text(json.dumps(p,ensure_ascii=False,indent=2)+chr(10),encoding="utf-8")

