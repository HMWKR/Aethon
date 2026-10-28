import json
from pathlib import Path
p=Path("artifacts/aethon-ir-v7-pipeline/evidence/native-plan-v7-draft.json")
d=json.loads(p.read_text(encoding="utf-8"))
d["replacements"]["9#2"]["n41"]="생성과 작업시간의 가성비"
d["replacements"]["9#2"]["n36"]="Kling 2.5 Turbo Pro I2V · 5초 $0.35 / 편집·검수·권리·저장 별도 / 요금 미정"
d["replacements"]["2"]["n32"]="이성민 · RealizeSoft(현실화하는소프트) 대표\n경복대학교 소프트웨어융합학과\n현재 데이터 엔지니어 · 한화 포탈 경험"
d["notes"].append("0n4#2:0의 3초와 2초는 서로 다른 내부 시험의 길이이며 동일 지표의 수치 계열이 아님.")
d["notes"].append("9n36#2:0의 2.5는 모델 버전, 5초는 단가 기준 길이, $0.35는 단일 호출 단가라 동일 지표 계열이 아님. 1·2·3회 유료 생성별 API 총액 $21·$42·$63은 9#2 표에 모두 기재.")
p.write_text(json.dumps(d,ensure_ascii=False,indent=2)+chr(10),encoding="utf-8")

