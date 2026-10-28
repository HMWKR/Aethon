from pathlib import Path
import json
d=Path(__file__).parent
rows=json.loads((d/'speaker-notes.json').read_text(encoding='utf-8'))
parts=['# Aethon 발표자 노트\n\n본문 15장 7분 40초 배분 + 전환 여유 20초. 부록 16~18장은 질의응답용입니다. 실제 영상 재생 시간을 추가하면 다른 설명 시간을 조정해야 합니다.\n']
for r in rows:
    parts.append(f"## {r['n']}. {r['title']}\n\n{r['note']}\n")
(d.parent/'output'/'Aethon-IR-20261027-v5-발표자노트.md').write_text('\n'.join(parts),encoding='utf-8')
print('18 slide notes saved')
