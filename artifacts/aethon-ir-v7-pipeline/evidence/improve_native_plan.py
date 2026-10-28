import json
from pathlib import Path
p=Path("artifacts/aethon-ir-v7-pipeline/evidence/native-plan-v7-draft.json")
d=json.loads(p.read_text(encoding="utf-8"))
d["replacements"]["3"]["n16"]="Pain & Flow"
d["replacements"]["9#2"]["n41"]="생성과 사람 작업의 비용"
d["replacements"]["9#2"]["n36"]="Kling 2.5 Turbo Pro I2V · 60컷 가정 / 기획·편집·검수·권리·저장·전송 별도"
for op in d["page_ops"]:
    if op.get("op")=="table_create" and op.get("page")=="9#2": op["box"]={"left":124,"top":520,"width":1665,"height":405}
d["notes"].append("9n36#2:0의 2.5는 모델 버전, 60은 가정된 컷 수로 수치 계열이 아님. 세 API 소계는 9#2 표의 전체값.")
ops=d["page_ops"]
ops.append({"op":"duplicate","page":"0","count":4})
src=[("0#2","0n9#2","6",{"key":"34nGruyUGAYBhmAOl5cDW","type":"USER_IMAGE","width":1920,"height":1080}),("0#3","0n9#3","6#2",{"key":"34nStYlrbVl6rqJ6nBr2f","type":"USER_SVG","width":1920,"height":850}),("0#4","0n9#4","6#3",{"key":"34nSteFZv3QMJa1mo0ak9","type":"USER_SVG","width":1920,"height":850}),("0#5","0n9#5","6#4",{"key":"34nStmitvnmsanWBV1nkv","type":"USER_SVG","width":1920,"height":850})]
for page,node,target,res in src:
    ops.append({"op":"replace_image","page":page,"node":node,"resource":res})
    ops.append({"op":"resize_nodes","page":page,"nodes":[node],"to_box":{"left":70,"top":360,"width":1780,"height":690}})
    ops.append({"op":"copy_nodes","nodes":[node],"to_page":target,"to_box":{"left":70,"top":360,"width":1780,"height":690},"fit":True})
for page,node,target,res in reversed(src): ops.append({"op":"delete","page":page})
d["notes"]=[x for x in d["notes"] if not x.startswith("이미지 수동 삽입 위치")]
p.write_text(json.dumps(d,ensure_ascii=False,indent=2)+chr(10),encoding="utf-8")

