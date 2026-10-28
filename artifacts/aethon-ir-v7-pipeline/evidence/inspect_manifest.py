import json
from pathlib import Path
m=json.loads(Path("artifacts/aethon-ir-v6/evidence/template-manifest.json").read_text(encoding="utf-8-sig"))
for page in m["pages"]:
    if page["page"]==0:
        print(json.dumps([n for n in page["nodes"] if n.get("id") in ["0n1","0n4","0n6","0n8","0n9","0n15","0n17"]],ensure_ascii=False,indent=2))

