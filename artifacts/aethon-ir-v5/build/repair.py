from pathlib import Path
import urllib.request
d=Path(__file__).parent
p=d/'finish-deck.mjs'
s=p.read_text(encoding='utf-8')
s=s.replace("const iconRoot=", """const ov=spec.slides[0],dt=spec.slides[1];
ov.components.find(x=>x.id==='ov-now-web').subLabel='HTML · CSS';
ov.components.find(x=>x.id==='ov-now-render').subLabel='FFmpeg · FFprobe';
ov.components.find(x=>x.id==='ov-next-web').iconFile=path.join(DIR,'nextjs.png');
ov.components.find(x=>x.id==='ov-next-cpu').label='검증·합성';
ov.components.find(x=>x.id==='ov-next-cpu').subLabel='승인 후 FFmpeg';
ov.edges.push({id:'gpu-return',role:'external',waypoints:[[1370,698],[1370,705],[1100,705],[1100,730],[910,730],[910,695]]});
const iconRoot=""",1)
s=s.replace("const iconW=small?30:33;", "const wideIcon=n.id==='ov-now-render'||n.id==='ov-now-db';const iconW=wideIcon?58:(small?30:33);\n   if(n.id==='dt-cdn'){await image(s,ico,n.x+52,n.y+8,36,36);text(s,'CloudFront',n.x+9,n.y+45,n.w-18,29,20,true);text(s,'웹·결과 전달',n.x+9,n.y+76,n.w-18,24,18,false,C.muted);continue;}")
s=s.replace('const tx=n.x+(ico?50:12),tw=n.w-(ico?60:24);','const tx=n.x+(ico?(wideIcon?78:50):12),tw=n.w-(ico?(wideIcon?88:60):24);')
s=s.replace('iconW,iconW);','iconW,wideIcon?30:iconW);')
s=s.replace("arrow(s,[[895,500],[975,500]]);arrow(s,[[1200,500],[1280,500]]);", "arrow(s,[[895,340],[935,340],[935,500],[975,500]]);arrow(s,[[895,500],[975,500]]);arrow(s,[[895,660],[935,660],[935,500],[975,500]]);arrow(s,[[1200,500],[1280,500]]);")
s=s.replace('검증한 범위부터 제품과 팀을 확장','검증 결과에 따라 제품과 팀을 확장')
s=s.replace("'초기 제작자\\n영상 제작 실무 피드백", "'초기 제작자 연결\\n영상 제작 실무 피드백")
s=s.replace('아래 역할은 확보 계획 제안','오른쪽 역할은 확보 계획 제안')
s=s.replace("await architecture(s,spec.slides[1]);", "await architecture(s,spec.slides[1]);rect(s,665,516,215,29,C.white);text(s,'검증·승인 후 합성',669,516,210,30,18,true,C.blue);text(s,'상태 전달: SSE/WebSocket 검토',55,720,150,75,18,false,C.muted);")
s=s.replace("await fs.writeFile(path.join(DIR,'candidate.pdf'),new Uint8Array(await(await p.export({format:'pdf'})).arrayBuffer()));", "// PDF exported separately from verified slide renders because bundled PDF font loader is unavailable.")
p.write_text(s,encoding='utf-8')
p=d/'build-deck.mjs';s=p.read_text(encoding='utf-8').replace('모델 연결과 전체 사용 흐름의 검증','일반 사용자용 모델 연결과 전체 사용 흐름의 검증');p.write_text(s,encoding='utf-8')
r=urllib.request.urlopen('https://cdn.simpleicons.org/nextdotjs',timeout=30).read()
(d/'nextjs.svg').write_bytes(r)
print('repairs complete, brand icon from Simple Icons')
