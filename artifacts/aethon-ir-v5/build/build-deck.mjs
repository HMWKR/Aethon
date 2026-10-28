import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import {Presentation, PresentationFile} from '@oai/artifact-tool';
const DIR=path.dirname(fileURLToPath(import.meta.url));
const ROOT='C:/Users/jusan/Desktop/AethonP';
const EVID='C:/Users/jusan/.codex/visualizations/2026/10/27/01a17c71-00c0-7b42-be8c-167feaa93918';
const OUT=path.join(DIR,'../output');
const FONT='Malgun Gothic';
const C={ink:'#151C28',muted:'#566371',blue:'#126A9A',cyan:'#DDF4FC',light:'#F3F7FA',rule:'#D7E0E8',white:'#FFFFFF',green:'#25796E',purple:'#7958A5'};
const p=Presentation.create({slideSize:{width:1600,height:900}});
const notes=[];const slideCopy=[];
function rect(s,x,y,w,h,fill=C.white,stroke='none',lw=0,geom='rect') {return s.shapes.add({geometry:geom,position:{left:x,top:y,width:w,height:h},fill,line:{fill:stroke,width:lw}});}
function text(s,txt,x,y,w,h,size=30,bold=false,color=C.ink,align='left'){const q=rect(s,x,y,w,h,'none');q.text=txt;q.text.style={typeface:FONT,fontSize:size,bold,color,alignment:align,verticalAlignment:'top',insets:0,autoFit:'none',wrap:'square'};return q;}
function line(s,x,y,w,h=0,color=C.rule,width=2){return s.shapes.add({geometry:'line',position:{left:x,top:y,width:w,height:h},fill:'none',line:{fill:color,width}});}
function arrow(s,pts,color=C.blue,dash=false){for(let i=1;i<pts.length;i++){const a=pts[i-1],b=pts[i];if(a[0]===b[0]&&a[1]===b[1])continue;const c=s.shapes.add({geometry:'connector',kind:'straight',position:{left:Math.min(a[0],b[0]),top:Math.min(a[1],b[1]),width:Math.abs(b[0]-a[0]),height:Math.abs(b[1]-a[1]),horizontalFlip:b[0]<a[0],verticalFlip:b[1]<a[1]},line:{fill:color,width:2.5,style:dash?'dashed':'solid'},...(i===pts.length-1?{tail:{type:'triangle',width:'sm',length:'sm'}}:{})});c.bringToFront();}}
async function image(s,file,x,y,w,h,fit='contain'){const b=await fs.readFile(file);return s.images.add({blob:b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),contentType:file.endsWith('.svg')?'image/svg+xml':'image/png',alt:path.basename(file),fit,position:{left:x,top:y,width:w,height:h}});}
function slide(title,section,note,source='',subtitle=''){const s=p.slides.add();s.background.fill=C.white;const n=p.slides.items.length;text(s,section.toUpperCase(),80,46,1100,30,18,true,C.blue);text(s,String(n).padStart(2,'0'),1440,46,80,30,18,false,C.muted,'right');text(s,title,80,98,1440,100,50,true);if(subtitle)text(s,subtitle,82,205,1410,48,25,false,C.muted);line(s,80,829,1440);if(source)text(s,source,80,845,1400,43,17,false,C.muted);s.speakerNotes.text=note;notes.push({n,title,note,source});slideCopy.push({n,title,source});return s;}
function tbl(s,values,x,y,w,h,colWidths,fsz=26){const t=s.tables.add({rows:values.length,columns:values[0].length,left:x,top:y,width:w,height:h,columnWidths:colWidths,values});t.borders.assign({fill:C.rule,width:1});for(let r=0;r<values.length;r++){t.rows[r].height=r===0?60:(h-60)/(values.length-1);for(let c=0;c<values[0].length;c++){const cell=t.getCell(r,c);cell.fill=r===0?C.ink:(c===values[0].length-1?'#EAF7FC':C.white);cell.text.style={typeface:FONT,fontSize:fsz,color:r===0?C.white:C.ink,bold:r===0,verticalAlignment:'middle',insets:14};}}return t;}
const SRC={yt:'https://blog.youtube/culture-and-trends/youtube-culture-trends-report-virtual-creators/',kocca:'https://welcon.kocca.kr/ko/info/business/1958572',mingle:'https://minglestudio.co.kr/services',eden:'https://eden-world.net/ko/blog/interview/202',music:'https://stellive.me/music',award1:'https://www.kbu.ac.kr/kor/CMS/Board/Board.do?board_seq=163712&mCode=MN078&mgr_seq=240&mode=view&page=11&searchCategory=c001',award2:'https://info.kbu.ac.kr/kor/CMS/Board/Board.do?board_seq=168650&mCode=MN078&mgr_seq=240&mode=view&page=2'};
// 01 Cover: user's supplied brand artwork, unchanged.
{
 const s=p.slides.add();s.background.fill=C.white;
 text(s,'REALIZESOFT',80,60,900,45,25,true);
 text(s,'개인 VTuber·소규모 버추얼팀의\nAI 음악영상 제작 작업대',82,260,860,130,39);
 text(s,'AETHON',75,395,920,150,126,true);
 text(s,'한 캐릭터의 다음 음악영상까지',84,564,820,70,32,false,C.blue);
 await image(s,path.join(DIR,'brand/Aethon-Icon-Pack/PNG-2048/Aethon-Ink-Symbol.png'),990,225,530,530);
 text(s,'이성민  RealizeSoft(현실화하는소프트) 대표\n경복대학교 소프트웨어융합학과',84,750,1050,70,23);
 text(s,'2026 창업아이디어 경진대회',84,846,1100,30,18,false,C.muted);
 const note='10초. 안녕하세요. 개인 VTuber와 소규모 버추얼팀이 한 캐릭터의 음악영상을 이어서 만들도록 돕는 Aethon의 이성민입니다. 브랜드 이미지는 사용자가 제공한 원본 아이콘입니다.';s.speakerNotes.text=note;notes.push({n:1,title:'AETHON',note});
}
// 02 The fragmented workflow, an explicit problem hypothesis.
{
 const s=slide('제작 과정의 맥락을 사람이 이어야 합니다','문제',`30초. 공개 제작자 인터뷰에서는 음원, 외주, 레퍼런스, MV, 검토를 운영자가 조율하는 과업이 나타납니다. 저희는 그 과정을 반복할 때 설정과 선택 이유를 다시 연결해야 한다는 문제를 가설로 잡았습니다. 아직 Aethon 고객 인터뷰 결과는 아닙니다.\n출처: ${SRC.eden}`,'공개 제작 사례에 근거한 문제 가설 · 고객 인터뷰 전 / 에덴월드 박디라 인터뷰, 2026.09.17');
 const xs=[80,580,1080],labs=['준비','제작','검토'];
 for(let i=0;i<3;i++){text(s,'0'+(i+1),xs[i],260,380,80,62,true,C.blue);text(s,labs[i],xs[i],362,400,60,36,true);line(s,xs[i],446,400,0,C.ink,2);}
 text(s,'음원과 IP 설정\n참고 자료를 모으고\n제작 의도를 전달',80,480,400,160,30);
 text(s,'기획·생성·편집 사이\n파일과 설정을 이동\n장면별 결과를 선택',580,480,400,160,30);
 text(s,'수정 이유를 전달\n승인한 버전을 찾고\n다음 제작에 재사용',1080,480,400,160,30);
 arrow(s,[[500,384],[548,384]],C.muted);arrow(s,[[1000,384],[1048,384]],C.muted);
 text(s,'곡이 바뀌어도, 캐릭터와 선택의 맥락은 이어져야 합니다',80,721,1440,65,37,true);
}
// 03 Why this initial customer segment.
{
 const s=slide('왜 개인 VTuber·소규모팀부터 시작하나요?','초기 타깃',`30초. 조금 궁금하실 수 있습니다. 왜 수많은 영상 타깃 중 이 고객인가요? 같은 IP로 곡을 이어 만드는 공개 사례가 있고, 공개 인터뷰에는 개인·팀 활동자가 제작 조율까지 맡는 사례가 있습니다. 그래서 한 곡의 제작과 다음 곡의 재사용이라는 단위로 Aethon의 가치를 관찰할 수 있다고 봤습니다. 이 판단은 초기 타깃 가설이며 구매 의향은 앞으로 확인합니다. 200만~400만원은 밍글스튜디오 프리미엄 MV 예상 견적 한 사례입니다. 시장 평균이나 당사 절감액이 아닙니다.\n${SRC.eden}\n${SRC.music}\n${SRC.mingle}`,'출처: 에덴월드 공개 인터뷰, 스텔라이브 MUSIC, 밍글스튜디오 서비스 안내 / 2026.10.27 확인');
 const rows=[['같은 IP의 반복 제작','커버곡과 오리지널곡을 이어 내는 공개 사례'],['운영자에게 모이는 조율','음원·외주·레퍼런스·MV·피드백을 연결'],['제품과 맞는 검증 단위','한 곡의 기획부터 승인, 다음 곡의 설정 재사용']];
 rows.forEach((a,i)=>{text(s,'0'+(i+1),80,260+i*155,70,50,29,true,C.blue);text(s,a[0],177,253+i*155,760,52,34,true);text(s,a[1],177,315+i*155,760,63,26,false,C.muted);});
 line(s,1005,255,0,430);text(s,'국내 전문 제작의 견적 사례',1060,260,460,72,26,true);
 text(s,'200~400',1052,366,480,95,70,true,C.blue);text(s,'만원',1062,463,350,58,35,true);
 text(s,'프리미엄 MV 예상 견적\nVAT 별도, 범위별 변동\n시장 평균·절감액과 별개',1062,559,440,140,25,false,C.muted);
 text(s,'초기 타깃 가설  /  실제 반복 사용과 구매 의향은 검증 전',80,760,1440,40,26,true,C.blue);
}
// 04 Native workflow diagram: same stages as problem slide.
{
 const s=slide('복잡한 제작 흐름을 하나의 작업대로','해결책',`35초. 준비 단계에서는 IP와 음원을 정리합니다. 대화형 AI는 장면 기획과 도구 사용을 돕고, 영상 모델은 별도로 장면 후보를 생성하는 역할입니다. 제작자는 Take를 선택하고 편집한 뒤 승인합니다. 현재 코드 구현과 제한 시험 단계이며, 일반 사용자용 모델 연결과 전체 사용 흐름의 검증은 남아 있습니다.\n근거: 현재 저장소 코드 및 QA 기록, 2026.10.27`,'현재 코드 구현과 개발 목표를 요약한 사용자 흐름 · 영상 모델 실제 생성 검증 미완료');
 const xs=[80,455,830,1205],ws=[315,315,315,315],heads=['IP·음원 입력','AI 기획','생성·편집','검토·출력'];
 xs.forEach((x,i)=>{const q=rect(s,x,310,ws[i],220,i===3?C.cyan:C.light,C.rule,1);text(s,'0'+(i+1),x+25,333,260,40,26,true,C.blue);text(s,heads[i],x+25,395,280,60,33,true);if(i<3)arrow(s,[[x+315,420],[x+365,420]]);});
 const details=['캐릭터·설정\n음원·참고·권리','대화형 AI\n장면 계획·도구 제안','샷별 Take 비교\n타임라인·자막','사람의 승인\nMP4·SRT 출력'];
 details.forEach((a,i)=>text(s,a,xs[i]+8,565,320,120,29));
 text(s,'프로젝트에 남는 정보',80,746,330,45,26,true,C.blue);text(s,'IP 설정   장면과 버전   수정 이유   승인 기록',440,746,1080,45,28,true);
}
// 05 Actual product evidence, never a fabricated UI.
{
 const s=slide('장면 선택과 검토를 한 화면에서','제품 화면',`40초. 이 화면은 실제 Aethon 내부 시험 화면입니다. 왼쪽에서 장면을 고르고, 아래에서 Take를 비교하며, 오른쪽에서 검토와 승인 상태를 확인합니다. 타임라인은 선택한 결과를 편집 구성에 연결합니다. 화면의 색상 패턴은 합성 시험 미디어이며 실제 AI 생성 영상이 아닙니다.\n이미지: docs/qa/codex-cli-assessment-20261026/implementation/1920-selected-basic.png`,'실제 내부 시험 화면, 2026.10.26 · 합성 시험 미디어 사용 · AI 생성 결과물 또는 고객 작업 사례 아님');
 await image(s,path.join(ROOT,'docs/qa/codex-cli-assessment-20261026/implementation/1920-selected-basic.png'),80,215,1065,599);
 text(s,'장면과 Take',1215,267,310,55,32,true);text(s,'후보를 비교하고\n편집에 쓸 결과를 선택',1215,333,305,110,26,false,C.muted);
 text(s,'검토와 승인',1215,483,310,55,32,true);text(s,'수정 기록을 남기고\n출력 승인 상태를 관리',1215,550,305,110,26,false,C.muted);
 text(s,'사용자 시연 영상은\n추후 추가 예정',1215,728,305,80,23,false,C.blue);
}
// 06 Stage and bounded evidence.
{
 const s=slide('프로토타입 개발·내부 기능 검증 단계','현재 단계',`45초. IP와 음원, 샷과 Take, 승인, 작업 상태, FFmpeg 출력 및 복구 흐름을 구현하고 있습니다. QA에는 합성 음원과 로컬 모션 3초 MP4, 별도 브라우저 편집 2초 출력 기록이 있습니다. 제한된 Claude 실제 시험 기록도 있지만 일반 사용자 연결은 미완료이며 영상 생성 모델 실호출은 확인되지 않았습니다. 고객 인터뷰, 시험 고객, 매출도 아직 없습니다. 발표자료 작업에서 제품 테스트를 재실행한 수치가 아닙니다.\n근거: 저장소 README와 docs/qa의 2026.10.27까지 기록`,'저장소·QA 기록 기준, 2026.10.27 · 별개 시험 결과 · 이번 발표자료 작업에서 제품 시험을 재실행한 것은 아님');
 text(s,'코드에 구현한 흐름',80,248,650,55,33,true);text(s,'IP·음원·샷·Take\n편집·승인·작업 상태\nFFmpeg 출력과 복구',80,335,650,190,34);
 text(s,'제한 시험 기록',825,248,670,55,33,true);text(s,'3초',825,333,280,100,78,true,C.blue);text(s,'2초',1175,333,280,100,78,true,C.blue);
 text(s,'합성 음원·로컬 모션\nMP4 출력',825,457,310,110,27);text(s,'별도 브라우저\n편집 출력',1175,457,310,110,27);
 line(s,80,615,1440);text(s,'다음 검증',80,652,230,50,28,true,C.blue);
 text(s,'일반 사용자 모델 연결과 전체 작업 완주\n실제 AI 영상 생성, 반복 사용과 지불 의향',340,646,1170,100,30);
 text(s,'고객 인터뷰·시험 고객·매출 없음',80,767,1440,42,27,true);
}
// 07 Markets: measured context separated from bottom-up market hypothesis.
{
 const s=slide('시장 배경과 도달할 고객의 범위','시장',`30초. 글로벌 버추얼 크리에이터 300개 표본의 2024년 조회 합계는 150억회를 넘었고, 2025년 국내 대중음악 매출은 전년 대비 15.8% 증가했습니다. 이는 시장 배경이며 Aethon의 TAM 금액이 아닙니다. 저희는 음악영상 제작 소프트웨어 수요에서 한국어로 접근할 초기 고객을 좁혀 검증합니다. 고객 수와 제작 빈도, 지불 비용 조사 후 금액을 산정하겠습니다. 원의 크기는 시장 금액 비율을 나타내지 않습니다.\n${SRC.yt}\n${SRC.kocca}`,'YouTube(2025.04.17, 2024 표본), KOCCA(2026.08.18, 2025 매출) · 시장 금액 미산정 · 원 면적은 금액 비율 아님');
 text(s,'150억 회+',80,245,610,100,76,true,C.blue);text(s,'2024년 글로벌 가상 크리에이터\n300개 표본의 영상·라이브·Shorts 조회 합계',85,358,610,100,25);
 text(s,'+15.8%',80,500,610,100,76,true,C.blue);text(s,'2025년 국내 대중음악산업 매출\n전년 대비 증가율',85,612,610,100,25);
 rect(s,820,225,600,540,'#F0F8FC','none',0,'ellipse');rect(s,900,330,440,420,'#DDF3FC','none',0,'ellipse');rect(s,985,465,275,260,'#ADE4F5','none',0,'ellipse');
 text(s,'TAM',830,260,580,45,31,true,C.blue,'center');text(s,'IP 음악영상 제작 소프트웨어 수요',820,310,600,50,23,false,C.ink,'center');
 text(s,'SAM',910,383,420,45,31,true,C.blue,'center');text(s,'한국어로 접근 가능한\n개인 VTuber·소규모팀',930,431,380,75,23,false,C.ink,'center');
 text(s,'SOM',990,559,265,45,31,true,C.ink,'center');text(s,'접촉·시험으로 확인할\n초기 유료 고객군',990,611,265,80,22,false,C.ink,'center');
 text(s,'산정 방식: 고객 수 × 연간 제작 빈도 × 제작 1회당 도구 지출',80,766,1440,45,27,true);
}
// 08 Editable comparison table, no invented superiority.
{
 const s=slide('제작 맥락을 관리하는 방식의 차이','대안과 차별화',`30초. 개별 도구는 필요한 생성과 편집을 직접 수행하게 하고, 외주는 계약 범위의 제작을 맡습니다. Aethon은 IP와 장면, Take와 승인을 연결해 다음 음악영상의 준비에 재사용하는 목표입니다. 현재 품질, 가격, 시간 우위는 실사용 비교 전입니다. 타사의 모든 기능이 없다고 단정한 비교가 아닙니다.\n${SRC.mingle}\n현재 Aethon 구현 구조`,'제공 방식 기준 비교 · Aethon 품질·가격·시간 우위는 미검증 / 밍글스튜디오 서비스 안내, 현재 제품 구조');
 tbl(s,[['비교 기준','개별 생성·편집 도구','전문 제작 외주','Aethon의 목표'],['기획과 제작','사용자가 도구를 조합','계약 범위의 제작 수행','IP·음원·장면을 연결'],['선택과 수정','파일·프롬프트를 직접 관리','레퍼런스·검수 의견 전달','Take·수정 이유·승인 관리'],['다음 음악영상','자료와 설정을 다시 연결','새 의뢰와 범위 협의','같은 IP의 제작 맥락 재사용'] ],80,267,1440,420,[225,390,390,435],26);
 text(s,'차별화 가설',80,744,230,44,25,true,C.blue);text(s,'한 편의 생성 결과를 넘어, 동일 IP의 반복 제작을 관리',330,738,1190,65,33,true);
}
// 09 Business model and correct per-output cost denominator.
{
 const s=slide('작업대 구독 + 생성 사용량 과금','수익 구조 가설',`35초. 프로젝트와 IP, 버전과 승인 기록을 관리하는 가치는 구독으로, 모델 호출과 영상 처리 비용은 사용량으로 검증하려 합니다. 가격과 마진은 아직 정하지 않았습니다. 단순 생성 1회 가격이 아니라 재시도와 처리, 저장, 지원까지 합한 비용을 같은 기간의 승인 결과물 수로 나누어 살피겠습니다. 청구되는 생성 초수와 최종 채택 영상 길이는 다릅니다.`,'가격·과금 단위·마진 미확정 · 실제 사용과 청구 내역을 바탕으로 검증할 사업 가설');
 text(s,'작업대 구독',80,257,600,65,43,true);text(s,'프로젝트·IP·버전·승인 기록\n반복 제작에 필요한 작업 관리',80,361,610,120,31);
 text(s,'+',748,325,90,90,65,false,C.blue,'center');
 text(s,'생성 사용량',920,257,600,65,43,true);text(s,'모델 호출과 영상 처리량\n실제 발생 비용을 반영',920,361,600,120,31);
 line(s,80,565,1440);text(s,'승인 결과물당 비용',80,607,520,55,31,true,C.blue);
 text(s,'생성·재시도 + 편집·처리 + 저장·전송 + 지원 비용',630,610,890,60,26,true,'#243D50','center');line(s,625,677,895,0,C.ink,2);text(s,'같은 기간의 승인 결과물 수',630,696,890,55,27,true,C.ink,'center');
 text(s,'실제 청구 초수와 최종 채택 영상 길이를 구분해 측정',80,774,1440,40,25,false,C.muted);
}

// Remaining slides are installed below before export.
export {p,DIR,ROOT,EVID,OUT,FONT,C,SRC,notes,slideCopy,slide,text,rect,line,arrow,image,tbl};
