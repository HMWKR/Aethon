import json
from pathlib import Path
p=Path("artifacts/aethon-ir-v7-pipeline/evidence/native-plan-v7-draft.json")
d=json.loads(p.read_text(encoding="utf-8"))
ops=d["page_ops"]
# Remove prior failed copy experiment.
ops=ops[:next(i for i,x in enumerate(ops) if x.get("op")=="duplicate" and x.get("page")=="0")]
ops=[x for x in ops if not (x.get("page") in ["6","6#2","6#3","6#4"])]
order=["0","3","3#2","4","0#2","3#3","4#2","9","7","9#2","0#3","10","0#4","10#2","2","3#4","0#5","2#2","4#3"]
idx=next(i for i,x in enumerate(ops) if x.get("op")=="reorder")
ops[idx]["order"]=order
ops.insert(idx,{"op":"duplicate","page":"0","count":4})
ops.insert(4,{"op":"delete","page":"6"})
for op in ops:
    if op.get("op")=="table_create" and op.get("page")=="9#2":
        op["box"]={"left":124,"top":515,"width":1665,"height":410}
        op["columns"]=["컷당 유료 생성","5초 컷 수","API 소계"]
        op["rows"]=[["1회","60","$21"],["2회","60","$42"],["3회","60","$63"]]
for src,at in zip(d["coverage"],order): src["at"]=at
for key in ["6","6#2","6#3","6#4"]: d["replacements"].pop(key,None)
entries=[
("0#2",2,"내부 제한 시험 화면","합성 시험 미디어 · 3초 MP4 / 별도 2초 편집 출력","34nGruyUGAYBhmAOl5cDW","USER_IMAGE",1920,1080),
("0#3",3,"현재와 향후 시스템 구조","사용자 · Aethon 플랫폼 · 외부 모델과 서비스","34nStYlrbVl6rqJ6nBr2f","USER_SVG",1920,850),
("0#4",4,"대화·이미지·영상 모델 연구","장기 R&D · 데이터 권리와 모델 약관 확인 후 평가","34nSteFZv3QMJa1mo0ak9","USER_SVG",1920,850),
("0#5",5,"부록 · 비동기 영상 생성 구조","향후 제안 · 작업 등록·완료 확인·승인·렌더","34nStmitvnmsanWBV1nkv","USER_SVG",1920,850)]
for label,num,title,subtitle,key,kind,w,h in entries:
    suffix="#"+str(num)
    d["replacements"][label]={"n8":title,"n4":subtitle,"n2":("0"+str({"0#2":5,"0#3":11,"0#4":13,"0#5":17}[label]))[-2:]+" / 19"}
    ops.append({"op":"delete_nodes","page":label,"nodes":[n+suffix for n in ["0n1","0n3","0n5","0n6","0n7","0n10","0n11","0n12","0n16","0n17"]]})
    ops.append({"op":"move_nodes","page":label,"nodes":["0n8"+suffix],"dx":0,"dy":-190})
    ops.append({"op":"move_nodes","page":label,"nodes":["0n4"+suffix],"dx":0,"dy":95})
    ops.append({"op":"move_nodes","page":label,"nodes":["0n2"+suffix],"dx":1570,"dy":-870})
    ops.append({"op":"resize_nodes","page":label,"nodes":["0n9"+suffix],"to_box":{"left":80,"top":225,"width":1760,"height":700}})
    x={"op":"replace_image","page":label,"node":"0n9"+suffix,"resource":{"key":key,"type":kind,"width":w,"height":h}}
    if kind=="USER_IMAGE": x["fit"]="contain"
    ops.append(x)
d["page_ops"]=ops
d["replacements"]["2"]["n25"]="국가공인 네트워크관리사 2급 · AI프러덕션 기획자 1급 · Databricks 데이터 엔지니어 프로페셔널"
d["replacements"]["4#3"]["n21"]="Databricks 데이터 엔지니어 프로페셔널 보유 · 자격명은 본인 제공 표기 · 채용 미확정"
d["notes"].append("사진 및 SVG는 0#2~0#5 원본 비프레임 BitmapItem에 교체. 서버 resize가 비율을 유지해 작게 보일 수 있어 생성 후 UI에서 화면 기준 확대와 전체 표시를 확인.")
d["notes"]=[x for x in d["notes"] if "9#2 표의 전체값" not in x]
d["notes"].append("비용의 컷당 1·2·3회 API 소계 세 값은 9#2의 native table_create에 모두 포함.")
p.write_text(json.dumps(d,ensure_ascii=False,indent=2)+chr(10),encoding="utf-8")

