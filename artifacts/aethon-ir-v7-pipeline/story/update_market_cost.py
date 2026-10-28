import json
from pathlib import Path
base = Path(__file__).parent
path = base / "slideplan.json"
d = json.loads(path.read_text(encoding="utf-8"))
slides = d["slides"]
market = next(s for s in slides if s["id"] == 7)
market.update({
    "title":"출시 초기부터 전체 시장까지 네 단계로 나눕니다",
    "on_slide":["TAM: 글로벌 뮤직비디오 제작 소프트웨어","SAM: 국내 제공 가능한 AI 영상 제작 소프트웨어","SOM: 국내 음악·엔터테인먼트 제작 조직의 공략 가능 수요","LAM: 소규모 아이돌 기획사·지하·버추얼 아이돌 MV 제작 시장","시장 금액과 고객 수 미산정"],
    "visual":"네 범위의 포함관계를 동일 크기 상자와 화살표로 표현. 면적은 시장 규모의 비율이 아님.",
    "status":"시장 범위 가설; 출시 초기 LAM 사용자 확정, 시장금액 미산정",
    "sources":["U1","P1","K1"],
    "speaker_note":"시장은 전체 뮤직비디오 제작 소프트웨어에서 국내 제공 가능 영역, 국내 음악과 엔터테인먼트 제작 조직의 공략 가능 수요로 좁혀 봅니다. 출시 초기 공략 시장, 즉 LAM은 소규모 아이돌 기획사와 지하·버추얼 아이돌의 뮤직비디오 제작 시장입니다. 이 네 단계는 범위의 가설입니다. 고객 수와 연간 지출 자료가 없어 금액은 아직 계산하지 않았습니다."
})
cost = {
    "id":10, "section":"본문",
    "title":"생성 비용의 범위를 가정해 원가 검증을 시작합니다",
    "on_slide":["영상 API: 5초당 $0.35","5초 생성 60컷 × 컷당 1·2·3회 = $21·$42·$63","외주 공개 견적: 200만~400만원, VAT 별도·상담","API 소계와 외주 전체는 범위가 달라 절감률 미산정"],
    "visual":"가정된 유료 생성 횟수별 API 소계 세 숫자를 나란히, 외주 견적은 별도의 참고 패널로 분리. 근거·제외 항목을 1줄 이상 표시.",
    "status":"2026-10-28 공개 가격 기준의 설명용 시나리오; 실측 원가·절감 실적 아님",
    "sources":["F1","M1"],
    "seconds":30,
    "speaker_note":"비용은 실제 사용 전이라도 가정으로 구조를 살필 수 있습니다. 공개 API 단가 5초당 0.35달러에 60컷을 만들고 컷마다 한 번, 두 번, 세 번 유료로 생성한다고 가정하면 생성 API 소계는 각각 21, 42, 63달러입니다. 이는 총 300초의 생성분만 계산한 예시로 완성된 뮤직비디오 원가가 아닙니다. 기획·인건비·편집·권리·운영·세금 등을 포함하지 않아 외주의 200만에서 400만원 공개 견적과 직접 비교하거나 절감률을 산정하지 않습니다."
}
slides.insert(9,cost)
seconds=[10,25,30,30,35,25,30,25,25,30,35,30,25,20,25,30]
for i,slide in enumerate(slides, start=1):
    slide["id"]=i
    if i<=16:
        slide["section"]="본문"
        slide["seconds"]=seconds[i-1]
    else:
        slide["section"]="부록"
        slide["seconds"]=0
d["timing"].update({"main_seconds":sum(seconds),"buffer_seconds":480-sum(seconds),"appendix_count":3,"note":"본문 발화 예정 7분 10초, 전환·영상 여유 50초. 실제 리허설과 삽입 영상 재생시간 계측 필요."})
d["narrative"]="작은 제작 조직의 뮤직비디오 기획·제작 과정 → 해결책과 제한된 현재 증거 → 네 단계 시장과 사업 가설 → 비용 가정과 구현·검증 경로 → 장기 확장과 실행 주체 → 필요한 연결"
d["cautions"].append("API 생성 비용 시나리오는 완성된 MV의 총원가나 외주 대비 절감률이 아니다.")
path.write_text(json.dumps(d,ensure_ascii=False,indent=2)+"\\n",encoding="utf-8")
intro="# Aethon v7 발표자 노트\\n\\n*기준일 2026-10-28 · 한국 창업아이디어 경진대회 · 발표 8분 / 질의 7분*\\n\\n본문 16장 발화 계획 7분 10초, 장 전환과 영상 재생을 위한 여유 50초. 실제 리허설로 계측한다. 부록은 질의 때만 사용한다. 고객·성과와 가설을 구분한다.\\n\\n"
for s in slides:
    intro+=f'## {s["id"]}. {s["title"]} '+(f'({s["seconds"]}초)' if s["seconds"] else "(부록 · 질의용)")+f'\\n\\n{s["speaker_note"]}\\n\\n'
(base/"발표자노트.md").write_text(intro,encoding="utf-8")

