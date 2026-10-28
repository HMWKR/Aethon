import json
from pathlib import Path
base=Path(__file__).parent
path=base/"slideplan.json"
raw=path.read_text(encoding="utf-8").removesuffix(r"\n")
d=json.loads(raw)
path.write_text(json.dumps(d,ensure_ascii=False,indent=2)+chr(10),encoding="utf-8")
nl=chr(10)
parts=["# Aethon v7 발표자 노트", "", "*기준일 2026-10-28 · 한국 창업아이디어 경진대회 · 발표 8분 / 질의 7분*", "", "본문 16장 발화 계획 7분 10초, 장 전환과 영상 재생을 위한 여유 50초. 실제 리허설로 계측한다. 부록은 질의 때만 사용한다. 고객·성과와 가설을 구분한다.", ""]
for slide in d["slides"]:
    time = str(slide["seconds"])+"초" if slide["seconds"] else "부록 · 질의용"
    parts.extend(["## "+str(slide["id"])+". "+slide["title"]+" ("+time+")", "", slide["speaker_note"], ""])
(base/"발표자노트.md").write_text(nl.join(parts)+nl,encoding="utf-8")

