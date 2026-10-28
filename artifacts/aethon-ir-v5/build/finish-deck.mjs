import fs from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {PresentationFile} from '@oai/artifact-tool';
import {p,DIR,ROOT,EVID,OUT,FONT,C,SRC,notes,slideCopy,slide,text,rect,line,arrow,image,tbl} from './build-deck.mjs';
const spec=JSON.parse((await fs.readFile(path.join(EVID,'v5-architecture-spec.json'),'utf8')).replace(/^\uFEFF/,''));
const ov=spec.slides[0],dt=spec.slides[1];
dt.edges.find(x=>x.id==='dt-runpod-call').labelPosition.x=790;
ov.components.find(x=>x.id==='ov-now-web').subLabel='HTML · CSS';
ov.components.find(x=>x.id==='ov-now-render').subLabel='FFmpeg · FFprobe';
ov.components.find(x=>x.id==='ov-next-web').iconFile=path.join(DIR,'nextjs.png');
ov.components.find(x=>x.id==='ov-next-cpu').label='검증·승인';
ov.components.find(x=>x.id==='ov-next-cpu').subLabel='FFmpeg 합성';
ov.edges.push({id:'gpu-return',role:'external',waypoints:[[1370,698],[1370,705],[1100,705],[1100,730],[910,730],[910,695]]});
const iconRoot=path.join(EVID,'icon-assets-v3');
const addNotes=(s,extra)=>{s.speakerNotes.text += '\n'+extra;notes[notes.length-1].note=s.speakerNotes.text;};
async function architecture(s,d){
 const fills={userBoundary:'#F7F9FB',platformBoundary:'#F3F8FC',cloudBoundary:'#FAFCFE',vpcBoundary:'#E9F3FC',externalBoundary:'#F9F5FC'};
 for(const g of d.groups){rect(s,g.x,g.y,g.w,g.h,fills[g.role]||C.light,g.role==='vpcBoundary'?'#8F9BDC':C.rule,2);text(s,g.label,g.x+14,g.y+10,g.w-28,38,g.fontSize,true,g.role==='vpcBoundary'?C.purple:C.ink);}
 for(const e of d.edges){const st=spec.styles.edgeRoles[e.role];arrow(s,e.waypoints,st.stroke,st.dash);}
 for(const n of d.components){rect(s,n.x,n.y,n.w,n.h,C.white,'#A9BCCB',1.4);
   const ico=n.iconFile;const small=n.h<58;const wideIcon=n.id==='ov-now-render'||n.id==='ov-now-db';const iconW=wideIcon?58:(small?30:33);
   if(n.id==='dt-cdn'){await image(s,ico,n.x+52,n.y+8,36,36);text(s,'CloudFront',n.x+9,n.y+45,n.w-18,29,20,true);text(s,'웹·결과 전달',n.x+9,n.y+76,n.w-18,24,18,false,C.muted);continue;}
   if(ico)await image(s,ico,n.x+9,n.y+(small?10:12),iconW,wideIcon?30:iconW);
   const tx=n.x+(ico?(wideIcon?78:50):12),tw=n.w-(ico?(wideIcon?88:60):24);
   const f=Math.min(n.fontSize,ico&&n.w<220?22:n.fontSize);
   if(n.subLabel){text(s,n.label,tx,n.y+11,tw,38,f,true);text(s,n.subLabel,n.x+12,n.y+n.h-30,n.w-24,27,18,false,C.muted);}
   else{text(s,n.label,tx,n.y+(small?12:17),tw,n.h-15,Math.min(f,23),true);}
   for(const extra of (n.extraIcons||[]))await image(s,extra.file,extra.x,extra.y,extra.w,extra.h);
 }
 for(const e of d.edges){if(e.labelPosition){const a=e.labelPosition;rect(s,a.x,a.y,a.w,a.h,C.white);text(s,e.label,a.x,a.y,a.w,a.h,a.fontSize||18,false,C.muted);}}
}
// 10 Current and future architecture on the same page.
{
 const s=slide('현재 시스템과 향후 확장 구조','시스템 아키텍처',`40초. 위는 현재 로컬 구현, 아래는 향후 도입 검토안입니다. 왼쪽은 사용자, 가운데는 Aethon, 오른쪽은 외부 모델과 서비스입니다. 대화 모델은 기획과 도구 요청을 돕고 영상 모델은 별도의 생성 작업을 맡습니다. 현재 HTML·CSS·JavaScript, Python HTTP, SQLite와 로컬 파일, FFmpeg를 사용합니다. 향후 Next.js와 FastAPI, PostgreSQL, AWS 저장·전달, 외부 GPU와 데이터 플랫폼을 검토합니다. LangChain은 현재 사용 기술로 확인되지 않아 넣지 않았습니다.\n근거: 현재 코드, v5-architecture-spec 및 architecture-research-v4.md. 아이콘: AWS Architecture Icons, Python, SQLite, W3C HTML5(CC BY 3.0), Simple Icons JavaScript, Next.js, PostgreSQL, FFmpeg, Databricks의 원본 자산.\nhttps://aws.amazon.com/architecture/icons/\nhttps://www.w3.org/html/logo/faq.html\nhttps://www.postgresql.org/about/policies/trademarks/`,'현재: 코드·제한 시험 / 향후: 도입 검토·미구현 · 실선은 작업·저장, 점선은 외부 연결 · HTML5 아이콘: W3C, CC BY 3.0');
 await architecture(s,spec.slides[0]);text(s,'현재',35,155,180,35,26,true,C.blue);text(s,'향후 계획',35,466,280,40,26,true,C.purple);
}
// 11 Separate training from inference, editable research lifecycle.
{
 const s=slide('기획 모델과 영상 모델을 각각 고도화','자체 AI 개발 계획',`25초. 장기적으로는 기획용 언어 모델과 이미지·영상 생성 모델을 각각 특화하려 합니다. 사용 권리가 확보된 데이터와 학습이 허용된 교사 모델을 전제로 미세조정과 증류를 검토합니다. Claude나 GPT 출력의 학습 사용을 자동으로 허용한다고 보지 않습니다. 기준 모델보다 품질과 비용이 나아지는지 평가한 뒤 버전 관리와 배포, 롤백으로 연결합니다. 현재 자체 모델을 보유하거나 외부 API를 대체했다는 의미는 아닙니다.\nhttps://docs.databricks.com/aws/en/machine-learning/mlops/mlops-workflow\nhttps://github.com/Wan-Video/Wan2.1`,'향후 R&D 제안 · 데이터 권리·교사 모델 조건 확인 필요 · 품질·비용 우위와 외부 API 완전 대체는 미검증');
 rect(s,80,300,300,400,C.light,C.rule,1);text(s,'허용 데이터',108,334,245,55,33,true);text(s,'IP·소재 권리\n선택·수정 기록\n학습·평가셋 분리',108,417,245,158,28);await image(s,path.join(iconRoot,'Databricks-Logo-Icon.svg'),110,611,44,44);text(s,'Databricks 검토',168,617,185,50,21,true);
 const lanes=[['기획용 언어 모델','계획·도구 사용·일관성'],['이미지 모델','캐릭터·스타일 유지'],['영상 모델','장면 품질·움직임·연결']];
 lanes.forEach((a,i)=>{const y=278+i*160;rect(s,450,y,445,125,C.white,'#AFC6D5',1.5);text(s,a[0],475,y+20,395,42,30,true);text(s,a[1],475,y+75,395,35,24,false,C.muted);arrow(s,[[380,500],[413,500],[413,y+62],[450,y+62]],C.muted);});
 text(s,'미세조정·증류 검토',451,772,445,40,24,true,C.blue);
 rect(s,975,300,225,400,'#EAF6FC',C.rule,1);text(s,'평가',1003,336,173,60,36,true);text(s,'기준 대비\n품질·비용\n안전성·권리\n사람의 채택',1003,428,173,220,26);
 rect(s,1280,300,240,400,C.white,C.rule,1);text(s,'운영',1305,336,190,60,36,true);text(s,'모델 버전 등록\n승인 후 배포\n관찰·롤백',1305,428,190,180,26);text(s,'MLflow 검토',1305,649,190,40,22,true,C.blue);
 arrow(s,[[895,340],[935,340],[935,500],[975,500]]);arrow(s,[[895,500],[975,500]]);arrow(s,[[895,660],[935,660],[935,500],[975,500]]);arrow(s,[[1200,500],[1280,500]]);
}
// 12 GTM: behavior and measurements, not invented traction.
{
 const s=slide('한 곡의 사용과 다음 곡의 재사용을 검증','초기 고객 확보',`35초. 대표가 개인 VTuber와 소규모 버추얼팀 활동 채널, 음악 제작 커뮤니티에서 첫 대화를 시작할 계획입니다. 최근 제작 기록을 함께 보며 문제를 확인하고 한 곡의 작업을 관찰합니다. 다음 곡에서 어떤 정보를 다시 쓰고 무엇에 비용을 지불할지 확인합니다. 아직 실행한 고객 성과가 아닙니다. 인터뷰는 개발과 병행합니다.`,'미실행 검증 계획 · 인터뷰는 개발과 병행 · 대표가 초기 고객 대화를 직접 수행');
 const vals=[['1','문제 인터뷰','최근 제작물·의뢰서·수정 기록','과정에서 반복되는 마찰'],['2','한 곡 사용 시험','IP 입력부터 장면 검토·출력','완주 여부·수정 이유·승인본 비용'],['3','다음 곡과 유료 의향','같은 IP의 설정·기록 재사용','반복 사용·지불 의향·실제 결제']];
 vals.forEach((r,i)=>{const y=254+i*170;text(s,r[0],80,y,80,70,54,true,C.blue);text(s,r[1],195,y+5,420,60,34,true);text(s,r[2],650,y,870,50,29);text(s,r[3],650,y+67,870,45,26,false,C.muted);line(s,190,y+132,1330);});
 text(s,'접근 후보',80,779,200,38,24,true,C.blue);text(s,'개인 VTuber·버추얼팀 활동 채널, 음악영상 제작 커뮤니티',315,774,1205,45,27);
}
// 13 Expansion gates with hiring linked to the bottleneck.
{
 const s=slide('검증 결과에 따라 제품과 팀을 확장','단계별 실행 계획',`25초. 핵심 제작 흐름을 실제 환경에서 확인한 뒤, 제작자가 완주하고 결과를 채택하는지 봅니다. 반복 유료 사용과 비용이 확인되면 고객 운영을 보강합니다. 권리 데이터와 평가셋이 쌓이고 기존 모델의 병목이 확인될 때 ML 역량을 확보해 모델 특화와 시장 확장을 검토합니다. 일정, 채용 인원, 예산은 확정하지 않았습니다.`,'단계별 진입 조건과 역할 확보 제안 · 채용 시점·인원·예산 미확정');
 tbl(s,[['단계','확인할 근거','우선 확보할 역량'],['핵심 흐름 완성','모델 연결·출력·복구의 전체 작업','제품·풀스택'],['제작자 검증','실제 작업 완주와 결과 채택 이유','영상 제작·UX 리서치'],['유료 반복 사용','재사용·결제와 지원 포함 원가','고객 운영·사업개발'],['모델 특화·시장 확장','권리 데이터·평가셋, 기준 모델 대비 가치','ML·영상 생성·MLOps']],80,255,1440,475,[355,675,410],27);
 text(s,'고객 검증과 자금 확보, 실제 병목에 따라 협업·채용 방식을 결정',80,765,1440,43,29,true,C.blue);
}
// 14 Founder, credible prior record not product traction.
{
 const s=slide('데이터와 제품 흐름을 연결하는 1인 창업팀','대표 역량',`25초. 저는 경복대학교 소프트웨어융합학과 이성민이며 RealizeSoft 대표입니다. 데이터엔지니어 직무와 한화 포탈 데이터 엔지니어링 경험을 바탕으로 제품 방향과 개발, 초기 고객 검증을 맡습니다. RealizeSoft 팀의 U300 Academy 대상과 경기북동부 창업챌린지 기술상 이력이 있습니다. 과거 팀의 수상 이력이며 현재 제품의 매출이나 고객 실적은 아닙니다.\n경력은 본인 제공. 수상 공식 보도: ${SRC.award1}\n${SRC.award2}`,'경력·학력은 본인 제공 / 수상은 경복대학교 보도(2026.07.23·09.22)의 RealizeSoft 팀 이력');
 text(s,'이성민',80,260,590,105,78,true);text(s,'RealizeSoft 대표\n현실화하는소프트',85,389,590,95,31);text(s,'경복대학교 소프트웨어융합학과',85,526,610,60,28);
 text(s,'데이터엔지니어 직무\n한화 포탈 데이터 엔지니어링 경험',85,639,610,100,29,false,C.blue);
 line(s,760,265,0,470);text(s,'2026 U300 Academy',840,263,680,50,31,true);text(s,'대상',840,330,670,90,66,true,C.blue);text(s,'한국연구재단 이사장상',843,428,670,50,28);
 text(s,'경기북동부 청년창업챌린지',840,546,680,50,31,true);text(s,'IR 데모데이 기술상',840,610,680,70,44,true,C.blue);text(s,'경기도경제과학진흥원장상',843,698,670,50,28);
 text(s,'현재 1인 운영 · 제품 방향·개발·초기 고객 검증 총괄',80,780,1440,35,24,false,C.muted);
}
// 15 Concrete non-financial ask; amount intentionally not invented.
{
 const s=slide('실제 제작자가 다시 쓰는지 확인하겠습니다','지원과 다음 성과',`25초. 다음 성과는 실제 제작자가 한 곡을 완주하고 다음 곡에도 Aethon을 쓰는지 확인하는 것입니다. 초기 제작자 연결, 영상 제작 실무 피드백, 사업화와 기술 멘토링을 요청드립니다. 확보한 자원은 제품 흐름 완결, 고객 작업 관찰, 실제 청구와 재시도를 포함한 비용 검증에 우선 사용하겠습니다. 요청 금액과 배분액은 시험 범위에 맞춰 산정할 예정입니다.`,'지원·투자 요청 금액 및 배분액 미확정 · 초기 고객 검증과 실제 비용 기록을 우선');
 text(s,'필요한 연결',80,267,650,65,42,true,C.blue);text(s,'초기 제작자 연결\n영상 제작 실무 피드백\n사업화·기술 멘토링',80,369,650,230,35);
 text(s,'확인할 성과',875,267,645,65,42,true,C.blue);text(s,'기획부터 출력까지 작업 완주\n다음 곡에서의 재사용\n지원·재시도 포함 실제 비용',875,369,645,230,35);
 line(s,80,669,1440,0,C.ink,2);text(s,'Aethon',80,716,400,75,53,true);text(s,'한 캐릭터의 다음 음악영상까지',500,735,1020,60,40,true);
}
// 16 Native detailed cloud architecture appendix.
{
 const s=slide('향후 비동기 영상 제작 구조','부록 1 · 기술 상세',`질의응답용. 현재 운영 구조가 아닌 도입 검토안입니다. 사용자는 API에 요청을 보내고 PostgreSQL에 상태를 남깁니다. Runpod의 내장 큐가 GPU 작업을 받으며, 생성 파일은 presigned URL로 S3에 직접 업로드하는 방식을 검토합니다. S3 객체 생성 이벤트는 SQS/Lambda 등의 경유로 검증 처리하며 임의 HTTP 웹훅 직접 호출을 전제하지 않습니다. Runpod 상태 조회/완료 알림은 별도입니다. 모든 장면 파일과 상태를 검증하고 사람의 승인 이후 FFmpeg가 합성합니다. 코덱·해상도·프레임율·오디오와 전환 길이를 정규화해야 하므로 60×5초가 항상 5분은 아닙니다. 중복 알림과 순서 역전은 멱등 처리가 필요하고 실패는 재시도·재조정합니다. 진행률 전달은 SSE 또는 WebSocket 검토입니다. Databricks에는 허용한 기록만 전달합니다. SQS 또는 Redis/Celery의 별도 조율 큐는 부하와 책임을 확인한 뒤 선택합니다.\nhttps://docs.runpod.io/serverless/endpoints/send-requests\nhttps://docs.aws.amazon.com/AmazonS3/latest/userguide/EventNotifications.html\nhttps://docs.databricks.com/aws/en/machine-learning/mlops/mlops-workflow`,'전체 향후 도입 검토안 · 업로드 알림과 완료 판정 분리 · 파일·상태·승인 검증 후 합성 · 이벤트 중복·재시도 처리 필요');
 await architecture(s,spec.slides[1]);rect(s,665,516,215,29,C.white);text(s,'검증·승인 후 합성',669,516,210,30,18,true,C.blue);text(s,'상태 전달\nSSE 또는\nWebSocket 검토',55,680,150,86,18,false,C.muted);
}
// 17 Evidence and staffing detail (no fake current team).
{
 const s=slide('대표의 기반 역량과 보강할 역할','부록 2 · 팀 확장',`질의응답용. 현재는 이성민 대표 1인입니다. 자격은 사용자가 제공한 표기이며 네트워크관리사 2급은 국가공인 자격입니다. AI프러덕션 기획자 1급과 Databricks Professional은 정확한 발급기관·공식 종목 표기 확인 전입니다. 현재 확보된 팀원이나 확정 채용으로 표현하지 않습니다. 각 단계의 병목과 자금 확보에 따라 협업, 자문, 채용을 선택합니다.`,'현재 대표 1인 · 경력·자격 본인 제공 · 오른쪽 역할은 확보 계획 제안이며 채용 확정 아님');
 text(s,'기반 역량',80,250,600,60,35,true,C.blue);text(s,'데이터엔지니어 직무\n한화 포탈 데이터 엔지니어링 경험',80,336,620,110,30);text(s,'보유 자격',80,502,620,50,31,true);text(s,'네트워크관리사 2급 (국가공인)\nAI프러덕션 기획자 1급\nDatabricks Professional',80,574,620,160,29);text(s,'자격 명칭은 본인 제공 표기',80,761,620,35,22,false,C.muted);
 const rr=[['제품·풀스택','모델 연결·복구·사용 흐름 완성'],['영상 제작·UX 리서치','결과 품질과 제작자 작업 평가'],['고객 운영·사업개발','반복 사용·전환·지원 비용 관리'],['ML·영상 생성·MLOps','권리 데이터·평가·모델 특화']];
 rr.forEach((r,i)=>{text(s,r[0],830,251+i*137,690,45,31,true);text(s,r[1],830,307+i*137,690,45,26,false,C.muted);if(i<3)line(s,830,365+i*137,690);});
}
// 18 Traceable definitions and source ledger.
{
 const s=slide('수치의 범위와 주요 근거','부록 3 · 근거',`질의응답용. 산업 지표와 자사 실적을 분리합니다. 상세 URL은 아래와 같습니다.\nYouTube: ${SRC.yt}\nKOCCA: ${SRC.kocca}\n밍글스튜디오: ${SRC.mingle}\n에덴월드: ${SRC.eden}\n스텔라이브: ${SRC.music}\n수상: ${SRC.award1}\n${SRC.award2}\n참고한 실제 IR 원본: Headless 30p https://file.zillinks.com/prod/uploads/6ed739667afe22aa882e30120a4b13e1_introFile.pdf\nWayne Hills 2023 24p https://www.waynehills.co/_files/ugd/55f4cc_1519dc60af1f4483a7a0dc55e5d7a5b4.pdf\nToonsquare 2024 76p https://file.zillinks.com/prod/uploads/884c4c81406b72c6deb85f9c32e0a476_JYOwLgTg9gYsA2BTIA.pdf\n투자·수상 이력이 있는 기업의 공개 원본이나 해당 투자 라운드·수상 당일 사용본과 동일하다는 것은 확인하지 못했습니다. 타사 수치는 Aethon 성과로 사용하지 않았습니다.`,'외부 원문 확인: 2026.10.27 · 본문별 상세 링크는 발표자 노트에 수록 · 자사 고객·매출·절감률 수치 없음');
 tbl(s,[['항목','측정 범위·조건','출처'],['150억 회 초과','2024년 글로벌 300개 가상 크리에이터 표본\n영상·라이브·Shorts 조회 합계','YouTube, 2025.04.17'],['15.8% 증가','2025년 국내 대중음악산업 매출\n전년 대비 증가율','KOCCA, 2026.08.18'],['200만~400만원','프리미엄 MV 예상 견적 한 사례\nVAT 별도·상담 후 확정','밍글스튜디오'],['현재 개발 단계','코드 및 내부 합성 시험 기록\n실제 고객·영상 모델 실호출 검증과 별개','Aethon 저장소·QA'],['수상 이력','RealizeSoft 팀의 과거 관련 이력\n현재 제품의 매출·고객 실적과 별개','경복대학교 보도']],80,242,1440,555,[300,760,380],24);
}
await fs.mkdir(OUT,{recursive:true});await fs.mkdir(path.join(DIR,'renders'),{recursive:true});
await fs.writeFile(path.join(DIR,'presentation.json'),JSON.stringify(p.toProto()));
await fs.writeFile(path.join(DIR,'speaker-notes.json'),JSON.stringify(notes,null,2),'utf8');
await (await PresentationFile.exportPptx(p)).save(path.join(DIR,'candidate.pptx'));
for(let i=0;i<p.slides.items.length;i++){const s=p.slides.items[i];const png=await p.export({slide:s,format:'png',scale:1});await fs.writeFile(path.join(DIR,'renders',`slide-${String(i+1).padStart(2,'0')}.png`),new Uint8Array(await png.arrayBuffer()));const lo=await s.export({format:'layout'});await fs.writeFile(path.join(DIR,'renders',`slide-${String(i+1).padStart(2,'0')}.json`),await lo.text());console.log(`rendered ${i+1}/${p.slides.items.length}`);}
await fs.writeFile(path.join(DIR,'contact.webp'),new Uint8Array(await(await p.export({format:'webp',montage:true,scale:.35})).arrayBuffer()));
// PDF exported separately from verified slide renders because bundled PDF font loader is unavailable.
console.log('BUILD_COMPLETE '+p.slides.items.length);
process.exitCode=0;


