import json
from pathlib import Path
p=Path("artifacts/aethon-ir-v7-pipeline/evidence/native-plan-v7-draft.json")
d=json.loads(p.read_text(encoding="utf-8"))
d["replacements"]["0"]["n8"]="소규모·버추얼 아이돌\n기획사 AI MV 작업대"
d["page_ops"].append({"op":"move_nodes","page":"0","nodes":["0n8"],"dx":0,"dy":-65})
d["notes"]=[x for x in d["notes"] if not x.startswith("현재·향후 도식 및 모델 연구")]
p.write_text(json.dumps(d,ensure_ascii=False,indent=2)+chr(10),encoding="utf-8")

