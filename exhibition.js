/* ================================================================
   S.LSI Hello AI Hackathon — Conference Expo
   직사각형 홀 · 아이소메트릭 3D 뷰 · 20 booths / 5 tracks
   ================================================================ */

/* ---------- 테마 팔레트 (canvas) ---------- */
const PALETTES={
 dark:{
  wallUlA:'#2a3560',
  wallUlB:'#141d3f',
  wallA:'#20294d',
  wallB:'#0e1533',
  bgA:'#0a0f24',
  bgB:'#06080f',
  playerHead:'#eaf0ff',
  npcHead:'#dfe6fb',
  floorA:'#0c1128',
  floorB:'#0a0e22',
  floorLine:'rgba(60,80,140,0.10)',
  entranceInk:'rgba(210,222,255,0.5)',
  bannerFrame:'#141c3c',
  screenBg:'#0b1024',
  counter:'#141d3f',
  panel:'#0a0f24',
  ink:'#eaf0ff',
  inkSoft:'rgba(180,196,235,0.85)',
  chip:'#161d3d',
  charShadow:'rgba(0,0,0,0.35)',
  particle:'120,150,255',
  mmBg:'#080c1a',
  mmNpc:'rgba(200,210,240,0.5)'
 },
 white:{
  wallUlA:'#e7ebf4',
  wallUlB:'#d7dde9',
  wallA:'#e1e6f0',
  wallB:'#d0d7e6',
  bgA:'#ffffff',
  bgB:'#e9edf5',
  playerHead:'#0f1836',
  npcHead:'#0f1836',
  floorA:'#eef1f8',
  floorB:'#f2f4fa',
  floorLine:'rgba(30,55,120,0.07)',
  entranceInk:'rgba(30,50,150,0.55)',
  bannerFrame:'#ccd5e6',
  screenBg:'#f4f6fc',
  counter:'#d7dde9',
  panel:'#ffffff',
  ink:'#0f1836',
  inkSoft:'rgba(90,105,140,0.92)',
  chip:'#eef1f8',
  charShadow:'rgba(30,45,90,0.16)',
  particle:'50,80,180',
  mmBg:'#f0f3fa',
  mmNpc:'rgba(95,108,148,0.6)'
 },
};
const P=PALETTES[document.documentElement.dataset.theme]||PALETTES.dark;

/* ---------- 트랙(5) ---------- */
const TRACKS=[
  {code:'T1',name:'설계 · EDA',accent:'#3d7bff',
   tagline:'반도체 설계 흐름을 AI로 가속',
   blurb:'EDA 툴체인에 에이전트를 결합해 반복 검증과 최적화를 자동화합니다. 설계자는 판단이 필요한 핵심 작업에만 집중할 수 있습니다.',
   tags:['EDA','Layout','Timing','DRC','RTL','Agent'],
   titles:['레이아웃 자동 검수 에이전트','타이밍 클로저 코파일럿','DRC 위반 예측 모델','셀 배치 최적화 엔진','RTL 리뷰 어시스턴트','전력 격자 이상 진단']},
  {code:'T2',name:'수율 · 품질',accent:'#e0872f',
   tagline:'수율 하락의 전조를 먼저 포착',
   blurb:'공정 데이터를 학습해 이상 로트를 조기 경보하고 근본 원인을 랭킹합니다. 품질 엔지니어의 의사결정 속도를 높입니다.',
   tags:['Yield','Anomaly','SPC','Vision','시계열','품질'],
   titles:['수율 이상탐지 대시보드','결함 이미지 자동 분류','웨이퍼 맵 패턴 인식','공정 파라미터 추천기','불량 원인 추적 그래프','검사 리포트 자동화']},
  {code:'T3',name:'설비 · 운영',accent:'#e0533f',
   tagline:'설비 운영을 더 안전하고 빠르게',
   blurb:'알람과 로그의 홍수 속에서 진짜 중요한 신호를 골라냅니다. 예지보전으로 다운타임을 줄입니다.',
   tags:['PdM','Alarm','IoT','예지보전','로그','운영'],
   titles:['설비 알람 우선순위 분류기','예지보전 잔여수명 예측','설비 로그 이상 요약','정비 매뉴얼 검색봇','챔버 상태 모니터','교대 인수인계 자동요약']},
  {code:'T4',name:'HR · People',accent:'#21a17a',
   tagline:'구성원의 경험을 AI로 돌봄',
   blurb:'온보딩부터 성장까지 사람 중심의 여정을 지원합니다. HR 담당자의 반복 업무를 덜어줍니다.',
   tags:['HR','People','온보딩','챗봇','교육','성장'],
   titles:['HR 온보딩 AI 가이드','사내 규정 질의응답봇','교육과정 추천 에이전트','리더십 피드백 코치','조직 서베이 요약','경력개발 로드맵 도우미']},
  {code:'T5',name:'개발생산성 · DevX',accent:'#1a8fe3',
   tagline:'개발자의 하루를 가볍게',
   blurb:'리뷰·테스트·문서를 자동화해 반복을 줄입니다. Claude Code 기반 에이전트가 개발 흐름에 스며듭니다.',
   tags:['DevX','Claude Code','CI','Test','리뷰','자동화'],
   titles:['코드리뷰 부스터','테스트 케이스 생성기','PR 요약 & 릴리즈노트','사내 API 문서봇','로그 디버깅 어시스턴트','커밋 컨벤션 가디언']},
];

/* ---------- 샘플 데이터 (seeded) ---------- */
function rng(seed){return function(){seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
const R=rng(20260607);
const pick=a=>a[(R()*a.length)|0];
const SUR=['김','이','박','최','정','강','조','윤','장','임','한','오','서','신','권','황','안','송','전','홍','유','고','문','양','배','백','허','남'];
const GIV=['서준','도윤','하은','지우','예린','민재','수아','현우','지민','채원','동혁','소미','태호','지안','예준','하린','승민','유진','건우','다현','시우','나연','재현','하늘','도현','서연','민준','지원','은우','가은'];
const ROLE=['백엔드','프론트엔드','ML · 모델링','데이터','기획 · PM','디자인','인프라','분석','풀스택'];
const TEAMW=['놀리지허브','옐로우존','미미르','알람브레이커','리뷰파이','미팅메이트','웰컴온','레이아웃크루','데이터하베스트','오토파일럿','코드가디언','인사이트랩','넥스트웨이브','픽셀포지','스마트로직','뉴런','시그널랩','파운더스','퀀텀리프','오라클','블루프린트','하이퍼루프'];
const TIERS=[['대상','i9'],['최우수','i7'],['우수','i5'],['장려','i3']];
function members(){const n=3+((R()<0.45)?1:0);const arr=[];for(let i=0;i<n;i++){arr.push([pick(SUR)+pick(GIV), i===0?'팀장':pick(ROLE)]);}return arr;}
function pickTags(pool){const c=[...pool];const out=[];for(let i=0;i<4&&c.length;i++){out.push(c.splice((R()*c.length)|0,1)[0]);}return out;}

const EXHIBITS=[]; let _id=0;
const PER_TRACK=4;
TRACKS.forEach((tr,ti)=>{
  tr.titles.slice(0,PER_TRACK).forEach((title,idx)=>{
    _id++;
    let tier = idx===0?TIERS[1]:(idx===1?TIERS[2]:TIERS[3]);
    if((ti===0&&idx===0)||(ti===4&&idx===0)) tier=TIERS[0];
    EXHIBITS.push({
      id:_id, trackIdx:ti, code:tr.code, trackName:tr.name, accent:tr.accent,
      title, team:'Team '+pick(TEAMW), award:'AI '+tier[1]+' · '+tier[0],
      summary:title+' — '+tr.tagline, desc:tr.blurb,
      tags:pickTags(tr.tags), members:members(), videoUrl:''
    });
  });
});

/* ---------- 지오메트리 (직사각형 홀 · 아이소메트릭) ---------- */
const TW=64,TH=32;
const HALL_W=82, HALL_D=43;
const WALL_H=70;
/* 트랙 존: 뒤 3 · 앞 2(중앙 광장 양옆), 존마다 2×2 부스 클러스터 */
const ZONES=[{cx:12,cy:8},{cx:30,cy:8},{cx:48,cy:8},{cx:13,cy:25},{cx:47,cy:25}];
const BOOTH_DX=4, BOOTH_DY=6;
const PLAZA={x:30,y:26};
/* 플레이그라운드: 홀 우측 (17×23타일) */
const PG={x0:62,x1:78,y0:9,y1:31,accent:'#8b5cf6'};

const clamp=(v,a,b)=>v<a?a:v>b?b:v;
const dist=(ax,ay,bx,by)=>Math.hypot(ax-bx,ay-by);
const lerp=(a,b,t)=>a+(b-a)*t;
function w2s(gx,gy){return{x:(gx-gy)*TW/2,y:(gx+gy)*TH/2};}
function hexA(hex,a){const n=parseInt(hex.slice(1),16);return`rgba(${(n>>16)&255},${(n>>8)&255},${n&255},${a})`;}
function mix(h1,h2,t){const a=parseInt(h1.slice(1),16),b=parseInt(h2.slice(1),16);
  const r=Math.round(lerp((a>>16)&255,(b>>16)&255,t)),g=Math.round(lerp((a>>8)&255,(b>>8)&255,t)),bl=Math.round(lerp(a&255,b&255,t));
  return`rgb(${r},${g},${bl})`;}
function cull(x,y){return x<-140||x>W+140||y<-190||y>H+210;}

const BOOTHS=[];
TRACKS.forEach((tr,ti)=>{
  const z=ZONES[ti];
  tr.zone={x:z.cx,y:z.cy+BOOTH_DY/2};
  tr.sign={x:z.cx-2.5,y:z.cy-2.5}; // 존 뒤쪽, 화면상 존 중앙 정렬(gx-gy 유지)
  EXHIBITS.filter(e=>e.trackIdx===ti).forEach((ex,k)=>{
    const gx=z.cx+(k%2?BOOTH_DX:-BOOTH_DX), gy=z.cy+(k>1?BOOTH_DY:0);
    BOOTHS.push({gx,gy,ex,track:ti,no:String(k+1).padStart(2,'0'),
      code:tr.code+'-'+String(k+1).padStart(2,'0'),
      view:{x:gx,y:gy+1.9}, d:gx+gy, glow:0.28});
  });
});

/* ---------- 장식 (중앙 전광판 · 나무 · 벤치) ---------- */
const DECOR=[
  {type:'billboard',gx:PLAZA.x,gy:PLAZA.y-3.5,text:'HELLO AI',sub:'S.LSI  HACKATHON  EXPO',color:'#3d7bff',w:250,fs:40,face:'ur'},
  // 플레이그라운드 대형 팻말 — zd: 뒤벽(d≈86.4)보다 뒤에 그려지지 않도록 벽 위로
  {type:'billboard',gx:70,gy:PG.y0+0.4,text:'PLAYGROUND',sub:'미니게임 · 소소한 즐길거리',color:'#8b5cf6',w:280,fs:36,face:'ur',zd:87},
  // 광장 벤치 (전광판 앞)
  {type:'bench',gx:25.5,gy:25},{type:'bench',gx:34.5,gy:25},
  {type:'bench',gx:25.5,gy:29},{type:'bench',gx:34.5,gy:29},
  // 입구 벤치
  {type:'bench',gx:10,gy:38},{type:'bench',gx:52,gy:38},
  // 나무
  {type:'tree',gx:22,gy:20},{type:'tree',gx:38,gy:20},
  {type:'tree',gx:22,gy:32},{type:'tree',gx:38,gy:32},
  {type:'tree',gx:3,gy:14},{type:'tree',gx:3,gy:28},
  {type:'tree',gx:60,gy:14},{type:'tree',gx:60,gy:28},
  {type:'tree',gx:22,gy:3},{type:'tree',gx:38,gy:3},
  // 플레이그라운드: 아케이드 미니게임 캐비닛 + 벤치 + 나무
  {type:'arcade',gx:65,gy:14,label:'두더지 잡기',color:'#e0533f'},
  {type:'arcade',gx:70,gy:14,label:'반응속도',color:'#21a17a'},
  {type:'arcade',gx:75,gy:14,label:'타자 배틀',color:'#e0872f'},
  {type:'arcade',gx:65,gy:24,label:'AI 퀴즈',color:'#1a8fe3'},
  {type:'arcade',gx:70,gy:24,label:'가위바위보',color:'#c78bff'},
  {type:'arcade',gx:75,gy:24,label:'랜덤 뽑기',color:'#e6b24d'},
  {type:'bench',gx:63,gy:19},{type:'bench',gx:77,gy:19},
  {type:'tree',gx:63,gy:30},{type:'tree',gx:77,gy:30},
];

/* ---------- 캔버스 ---------- */
const cv=document.getElementById('game'),ctx=cv.getContext('2d');
const mm=document.getElementById('minimap'),mmx=mm.getContext('2d');
let W=0,H=0,DPR=Math.min(window.devicePixelRatio||1,2);
function resize(){W=innerWidth;H=innerHeight;cv.width=W*DPR;cv.height=H*DPR;cv.style.width=W+'px';cv.style.height=H+'px';ctx.setTransform(DPR,0,0,DPR,0,0);}
addEventListener('resize',resize);resize();

/* ---------- 바닥 사전계산 ---------- */
function carpetTrack(gx,gy){for(let i=0;i<ZONES.length;i++){const z=ZONES[i];
  if(Math.abs(gx-z.cx)<=BOOTH_DX+2 && (gy-z.cy)>=-1.3 && (gy-z.cy)<=BOOTH_DY+1.9) return i;}return -1;}
const FLOOR=[];
for(let gx=1;gx<=HALL_W-2;gx++)for(let gy=1;gy<=HALL_D-2;gy++){
  const chk=((gx+gy)&1), base=chk?P.floorA:P.floorB;
  let fill;
  if(gy>=HALL_D-4){ fill=mix(base,'#3d7bff',0.13); }
  else if(dist(gx,gy,PLAZA.x,PLAZA.y)<7.5){ fill=mix(base,'#3d7bff',0.10); }
  else if(gx>=PG.x0&&gx<=PG.x1&&gy>=PG.y0&&gy<=PG.y1){ fill=mix(base,PG.accent,0.14); }
  else{ const tk=carpetTrack(gx,gy); fill = tk>=0 ? mix(base,TRACKS[tk].accent,0.17) : base; }
  FLOOR.push({gx,gy,fill});
}
const FLOORSET=new Set(FLOOR.map(f=>f.gx+','+f.gy));
const WALLS=[];   // 상단 좌/우(뒤쪽)만
for(const f of FLOOR){
  if(!FLOORSET.has((f.gx-1)+','+f.gy)) WALLS.push({gx:f.gx,gy:f.gy,edge:'ul',d:f.gx+f.gy-0.6});
  if(!FLOORSET.has(f.gx+','+(f.gy-1))) WALLS.push({gx:f.gx,gy:f.gy,edge:'ur',d:f.gx+f.gy-0.6});
}
/* 구역 파티션 벽: 뒤 + 좌우 위쪽(앞은 개방) — 바닥 타일 경계에 정렬 */
const ZONE_WALL_HW=6, ZONE_WALL_SIDE=4; // 카펫 반폭(타일), 좌우 벽 길이(타일)
TRACKS.forEach((tr,ti)=>{const z=ZONES[ti];
  const by=z.cy-1; // 카펫 뒤쪽 타일줄
  for(let gx=z.cx-ZONE_WALL_HW;gx<=z.cx+ZONE_WALL_HW;gx++)
    WALLS.push({gx,gy:by,edge:'ur',acc:tr.accent,d:gx+by-0.6});
  for(let gy=by;gy<by+ZONE_WALL_SIDE;gy++){
    WALLS.push({gx:z.cx-ZONE_WALL_HW,gy,edge:'ul',acc:tr.accent,d:z.cx-ZONE_WALL_HW+gy-0.6});
    WALLS.push({gx:z.cx+ZONE_WALL_HW+1,gy,edge:'ul',acc:tr.accent,d:z.cx+ZONE_WALL_HW+1+gy-0.6});
  }
});
/* 플레이그라운드 파티션 (뒤 + 좌우 위쪽, 앞 개방) */
for(let gx=PG.x0;gx<=PG.x1;gx++) WALLS.push({gx,gy:PG.y0,edge:'ur',acc:PG.accent,d:gx+PG.y0-0.6});
for(let gy=PG.y0;gy<PG.y0+ZONE_WALL_SIDE;gy++){
  WALLS.push({gx:PG.x0,gy,edge:'ul',acc:PG.accent,d:PG.x0+gy-0.6});
  WALLS.push({gx:PG.x1+1,gy,edge:'ul',acc:PG.accent,d:PG.x1+1+gy-0.6});
}

/* ---------- 엔티티 ---------- */
const player={gx:HALL_W/2,gy:HALL_D-3,color:'#3d7bff',head:P.playerHead,phase:0,moving:false,face:1,isPlayer:true};
const NPC_COLORS=['#12b3a6','#6c5ce7','#e0872f','#21a17a','#e0533f','#1a8fe3','#c78bff','#4d8bff'];
const NICKS=['새벽코딩','민초단','커밋요정','도넛왕','텐서보이','디버그맨','밤샘장인','반도체진심',
  '웨이퍼러버','치킨쿠폰','알고리듬','폰노이만','초코라떼','피카부','스탠드업','자율주행러',
  '커피수혈','조립왕','핫식스','린턴하는중'];
const AY=[5,14,20,24,37], AX=[3,21,30,39,56,70];
function randAisle(){return Math.random()<0.5
  ? {x:2+Math.random()*(HALL_W-4), y:AY[(Math.random()*AY.length)|0]}
  : {x:AX[(Math.random()*AX.length)|0], y:2+Math.random()*(HALL_D-4)};}
function npcTarget(n){
  if(Math.random()<0.6){const b=BOOTHS[(Math.random()*BOOTHS.length)|0];n.tx=b.view.x+(Math.random()-.5)*0.6;n.ty=b.view.y+(Math.random()-.5)*0.4;}
  else{const p=randAisle();n.tx=clamp(p.x,1.6,HALL_W-2.6);n.ty=clamp(p.y,1.6,HALL_D-2.6);}
  n.state='walk';
}
const npcs=[];
for(let i=0;i<20;i++){
  let sx,sy;do{sx=6+Math.random()*(HALL_W-12);sy=HALL_D-3-Math.random()*2.5;}while(!walkable(sx,sy));
  const n={gx:sx,gy:sy,nick:NICKS[i%NICKS.length],color:NPC_COLORS[i%NPC_COLORS.length],head:P.npcHead,
    speed:2.1+Math.random()*1.2,state:'walk',timer:0,phase:Math.random()*7,moving:true,face:1,isPlayer:false,tx:0,ty:0};
  npcTarget(n); npcs.push(n);
}

/* ---------- 충돌 ---------- */
function walkable(gx,gy){ // 벽만 막음(홀 경계 + 구역 파티션) — 부스·장식은 통과
  if(gx<1.4||gx>HALL_W-2.6||gy<1.4||gy>HALL_D-1.8) return false;
  for(const z of ZONES){
    const by=z.cy-1.5; // 뒤 벽 경계선
    if(Math.abs(gy-by)<0.4 && Math.abs(gx-z.cx)<=ZONE_WALL_HW+0.9) return false;
    if(Math.abs(Math.abs(gx-z.cx)-(ZONE_WALL_HW+0.5))<0.4 && gy>by-0.4 && gy<by+ZONE_WALL_SIDE) return false;
  }
  const pby=PG.y0-0.5;
  if(Math.abs(gy-pby)<0.4 && gx>=PG.x0-0.9 && gx<=PG.x1+0.9) return false;
  if((Math.abs(gx-(PG.x0-0.5))<0.4||Math.abs(gx-(PG.x1+0.5))<0.4) && gy>pby-0.4 && gy<pby+ZONE_WALL_SIDE) return false;
  return true;
}
function moveEnt(e,dx,dy){if(walkable(e.gx+dx,e.gy))e.gx+=dx;if(walkable(e.gx,e.gy+dy))e.gy+=dy;}

/* ---------- 입력 ---------- */
const keys={};
const K_UP=['w','ArrowUp'],K_DOWN=['s','ArrowDown'],K_LEFT=['a','ArrowLeft'],K_RIGHT=['d','ArrowRight'];
let started=false,activeBooth=null,modalOpen=false;
addEventListener('keydown',e=>{
  if(e.target&&(e.target.tagName==='INPUT'||e.target.isContentEditable))return;
  if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight',' '].includes(e.key))e.preventDefault();
  const k=e.key.length===1?e.key.toLowerCase():e.key; keys[k]=true;
  if(k===' '&&started&&!modalOpen&&activeBooth)openModal(activeBooth.ex);
  if(k==='Escape'&&modalOpen)closeModal();
});
addEventListener('keyup',e=>{const k=e.key.length===1?e.key.toLowerCase():e.key;keys[k]=false;});
cv.addEventListener('click',()=>{if(started&&!modalOpen&&activeBooth)openModal(activeBooth.ex);});
const down=l=>l.some(k=>keys[k]);

let padVec={x:0,y:0}, actBtn=null;
(function bindTouch(){
  document.querySelectorAll('.pad-btn:not(.pad-empty)').forEach(btn=>{
    const dx=+btn.dataset.dx, dy=+btn.dataset.dy;
    const on=e=>{e.preventDefault();padVec.x=dx;padVec.y=dy;btn.classList.add('on');};
    const off=()=>{if(padVec.x===dx&&padVec.y===dy){padVec.x=0;padVec.y=0;}btn.classList.remove('on');};
    btn.addEventListener('pointerdown',on);
    ['pointerup','pointerleave','pointercancel'].forEach(ev=>btn.addEventListener(ev,off));
  });
  actBtn=document.getElementById('actBtn');
  actBtn.addEventListener('pointerdown',e=>{e.preventDefault();if(started&&!modalOpen&&activeBooth)openModal(activeBooth.ex);});
})();

/* ---------- 업데이트 ---------- */
let camX=0,camY=0,initCam=true;
const zoneTxt=document.getElementById('zoneTxt'),zonePill=document.getElementById('zonePill');
function update(dt,t){
  if(started&&!modalOpen){
    let h=(down(K_RIGHT)?1:0)-(down(K_LEFT)?1:0)+padVec.x, v=(down(K_DOWN)?1:0)-(down(K_UP)?1:0)+padVec.y;
    h=clamp(h,-1,1);v=clamp(v,-1,1);
    if(h||v){const m=Math.hypot(h,v)||1;h/=m;v/=m;const sp=6*dt;moveEnt(player,(v+h)*sp,(v-h)*sp);player.moving=true;player.phase+=dt*11;if(h)player.face=h>0?1:-1;}
    else player.moving=false;
  } else player.moving=false;

  for(const n of npcs){
    if(n.state==='walk'){
      const dx=n.tx-n.gx,dy=n.ty-n.gy,dd=Math.hypot(dx,dy);
      if(dd<0.2){n.state='view';n.timer=2+Math.random()*3;n.moving=false;}
      else{const sp=n.speed*dt,bx=n.gx,by=n.gy;moveEnt(n,dx/dd*sp,dy/dd*sp);
        if(Math.abs(n.gx-bx)<1e-4&&Math.abs(n.gy-by)<1e-4)npcTarget(n);
        n.moving=true;n.phase+=dt*10;if(Math.abs(dx)>0.01)n.face=dx>0?1:-1;}
    }else{n.timer-=dt;if(n.timer<=0)npcTarget(n);}
  }

  activeBooth=null;let best=1.5;
  for(const b of BOOTHS){const dd=dist(player.gx,player.gy,b.view.x,b.view.y);if(dd<best){best=dd;activeBooth=b;}}
  for(const b of BOOTHS)b.glow=lerp(b.glow,(b===activeBooth?1:0.28),0.18);

  let lbl='이동 통로',col='#4d8bff';
  if(player.gy>=HALL_D-3){lbl='입구 · Entrance';col='#4d8bff';}
  else{let bi=-1;ZONES.forEach((z,i)=>{
      if(Math.abs(player.gx-z.cx)<=BOOTH_DX+3.5 && player.gy>=z.cy-2 && player.gy<=z.cy+BOOTH_DY+3) bi=i;});
    if(bi>=0){lbl=TRACKS[bi].code+' · '+TRACKS[bi].name;col=TRACKS[bi].accent;}
    else if(Math.abs(player.gx-PLAZA.x)<=8&&Math.abs(player.gy-PLAZA.y)<=7.5){lbl='중앙 광장 · HELLO AI';col='#4d8bff';}
    else if(player.gx>=PG.x0-0.5&&player.gx<=PG.x1+0.5&&player.gy>=PG.y0-1&&player.gy<=PG.y1+1){lbl='플레이그라운드 · Playground';col='#a78bfa';}}
  zoneTxt.textContent=lbl; zonePill.style.color=col;
  const zd=zonePill.querySelector('.zd'); if(zd){zd.style.background=col;zd.style.boxShadow='0 0 10px '+col;}
  if(actBtn)actBtn.classList.toggle('on',!!(started&&!modalOpen&&activeBooth));

  const ps=w2s(player.gx,player.gy);const tx=W/2-ps.x,ty=H/2-40-ps.y;
  if(initCam){camX=tx;camY=ty;initCam=false;}
  camX=lerp(camX,tx,0.12);camY=lerp(camY,ty,0.12);
}

/* ---------- 그리기 헬퍼 ---------- */
function isoTile(sx,sy,fill,stroke){
  ctx.beginPath();ctx.moveTo(sx,sy-TH/2);ctx.lineTo(sx+TW/2,sy);ctx.lineTo(sx,sy+TH/2);ctx.lineTo(sx-TW/2,sy);ctx.closePath();
  ctx.fillStyle=fill;ctx.fill();if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=1;ctx.stroke();}
}
function roundRectPath(x,y,w,h,r){ctx.beginPath();ctx.moveTo(x+r,y);ctx.arcTo(x+w,y,x+w,y+h,r);ctx.arcTo(x+w,y+h,x,y+h,r);ctx.arcTo(x,y+h,x,y,r);ctx.arcTo(x,y,x+w,y,r);ctx.closePath();}
function roundRect(x,y,w,h,r,fill){roundRectPath(x,y,w,h,r);ctx.fillStyle=fill;ctx.fill();}
function wrapText(txt,x,y,maxW,lh,maxLines,fromTop){
  const chars=[...txt];let line='',lines=[];
  for(const ch of chars){if(ctx.measureText(line+ch).width>maxW){lines.push(line);line=ch;if(lines.length>=maxLines)break;}else line+=ch;}
  if(lines.length<maxLines)lines.push(line);
  const total=lines.join('').length, start=fromTop?y:y-(lines.length-1)*lh;
  lines.forEach((l,i)=>{if(i===maxLines-1&&chars.length>total)l=l.slice(0,-1)+'…';ctx.fillText(l,x,start+i*lh);});
}

function drawFloor(t){
  for(const f of FLOOR){const s=w2s(f.gx,f.gy),sx=s.x+camX,sy=s.y+camY;if(cull(sx,sy))continue;isoTile(sx,sy,f.fill,P.floorLine);}
  const e=w2s(HALL_W/2,HALL_D-2.3),ex=e.x+camX,ey=e.y+camY;
  ctx.save();ctx.translate(ex,ey);ctx.textAlign='center';ctx.textBaseline='middle';
  ctx.fillStyle=P.entranceInk;ctx.font='800 13px Pretendard';ctx.shadowColor='rgba(61,123,255,0.6)';ctx.shadowBlur=12;
  ctx.fillText('HELLO AI HACKATHON · EXPO',0,0);ctx.restore();
}

function drawWall(w){
  const s=w2s(w.gx,w.gy),sx=s.x+camX,sy=s.y+camY;if(cull(sx,sy-WALL_H))return;
  let ax,ay,bx,by;
  if(w.edge==='ul'){ax=sx-TW/2;ay=sy;bx=sx;by=sy-TH/2;}
  else{ax=sx;ay=sy-TH/2;bx=sx+TW/2;by=sy;}
  const Hh=WALL_H;
  ctx.beginPath();ctx.moveTo(ax,ay);ctx.lineTo(bx,by);ctx.lineTo(bx,by-Hh);ctx.lineTo(ax,ay-Hh);ctx.closePath();
  const g=ctx.createLinearGradient(0,ay-Hh,0,ay);
  if(w.edge==='ul'){g.addColorStop(0,P.wallUlA);g.addColorStop(1,P.wallUlB);}
  else{g.addColorStop(0,P.wallA);g.addColorStop(1,P.wallB);}
  ctx.fillStyle=g;ctx.fill();
  ctx.beginPath();ctx.moveTo(ax,ay-Hh);ctx.lineTo(bx,by-Hh);ctx.strokeStyle=w.acc?hexA(w.acc,0.6):'rgba(77,139,255,0.4)';ctx.lineWidth=2;ctx.stroke();
}

function drawBanner(tr){
  const s=w2s(tr.sign.x,tr.sign.y),x=s.x+camX,y=s.y+camY;if(cull(x,y-110))return;
  const acc=tr.accent,H=88,w=32,top=y-H;
  ctx.fillStyle=P.bannerFrame;ctx.fillRect(x-2,y-H,4,H);
  roundRect(x-w/2,top,w,58,4,P.bannerFrame);
  ctx.save();roundRectPath(x-w/2,top,w,58,4);ctx.clip();
  ctx.fillStyle=acc;ctx.fillRect(x-w/2,top,w,22);
  ctx.fillStyle=P.screenBg;ctx.fillRect(x-w/2,top+22,w,36);ctx.restore();
  roundRectPath(x-w/2,top,w,58,4);ctx.strokeStyle=hexA(acc,0.7);ctx.lineWidth=1.5;ctx.stroke();
  ctx.fillStyle='#fff';ctx.font='800 13px Pretendard';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(tr.code,x,top+11);
  ctx.fillStyle=P.ink;ctx.font='700 7px Pretendard';ctx.textBaseline='top';
  wrapText(tr.name,x,top+27,w-4,8,3,true);
}

function drawBillboard(d,t){
  const s=w2s(d.gx,d.gy),x=s.x+camX,y=s.y+camY;if(cull(x,y-210))return;
  const w=d.w,h=110,top=-64-h,acc=d.color;
  const k=d.face==='ul'?-0.5:0.5; // 아이소 벽면 기울기 (ur: ↘, ul: ↗)
  ctx.save();ctx.translate(x,y);ctx.transform(1,k,0,1,0,0);
  ctx.fillStyle=P.bannerFrame;ctx.fillRect(-w/2+18,-64,8,64);ctx.fillRect(w/2-26,-64,8,64);
  ctx.shadowColor=hexA(acc,0.5);ctx.shadowBlur=26;
  roundRect(-w/2,top,w,h,10,'#0b1024');ctx.shadowBlur=0;   // LED 스크린은 테마 무관 다크
  ctx.save();roundRectPath(-w/2,top,w,h,10);ctx.clip();
  const pulse=0.75+0.25*Math.sin(t*1.8+d.gx);
  const g=ctx.createLinearGradient(-w*0.36,0,w*0.36,0);
  g.addColorStop(0,acc);g.addColorStop(.5,'#ffffff');g.addColorStop(1,acc);
  ctx.shadowColor=hexA(acc,0.85*pulse);ctx.shadowBlur=22*pulse;
  ctx.fillStyle=g;ctx.font='900 '+d.fs+'px Pretendard';ctx.textAlign='center';ctx.textBaseline='middle';
  ctx.fillText(d.text,0,top+h/2-8);ctx.shadowBlur=0;
  ctx.fillStyle=hexA(acc,0.9);ctx.font='700 11px Pretendard';
  ctx.fillText(d.sub,0,top+h-20);
  ctx.fillStyle=hexA(acc,0.05);for(let i=0;i<h;i+=4)ctx.fillRect(-w/2,top+i,w,2);
  ctx.restore();
  roundRectPath(-w/2,top,w,h,10);ctx.strokeStyle=hexA(acc,0.8);ctx.lineWidth=2;ctx.stroke();
  ctx.restore();
}

function drawTree(d){
  const s=w2s(d.gx,d.gy),x=s.x+camX,y=s.y+camY;if(cull(x,y-90))return;
  ctx.save();ctx.translate(x,y);ctx.scale(1,0.5);ctx.fillStyle=P.charShadow;ctx.beginPath();ctx.arc(0,0,14,0,Math.PI*2);ctx.fill();ctx.restore();
  ctx.fillStyle='#7a5a3e';ctx.fillRect(x-3,y-26,6,26);
  ctx.fillStyle='#1f8f58';ctx.beginPath();ctx.moveTo(x,y-60);ctx.lineTo(x+22,y-24);ctx.lineTo(x-22,y-24);ctx.closePath();ctx.fill();
  ctx.fillStyle='#2fb474';ctx.beginPath();ctx.moveTo(x,y-84);ctx.lineTo(x+16,y-44);ctx.lineTo(x-16,y-44);ctx.closePath();ctx.fill();
}

function drawArcade(d,t){
  const s=w2s(d.gx,d.gy),x=s.x+camX,y=s.y+camY;if(cull(x,y-110))return;
  const w=62,h=86,top=y-8-h;
  ctx.save();ctx.translate(x,y);ctx.scale(1,0.5);ctx.fillStyle=P.charShadow;ctx.beginPath();ctx.ellipse(0,0,30,14,0,0,Math.PI*2);ctx.fill();ctx.restore();
  ctx.shadowColor=hexA(d.color,0.45);ctx.shadowBlur=14+5*Math.sin(t*2+d.gx);
  roundRect(x-w/2,top,w,h,6,P.panel);ctx.shadowBlur=0;
  roundRectPath(x-w/2,top,w,h,6);ctx.strokeStyle=hexA(d.color,0.8);ctx.lineWidth=1.5;ctx.stroke();
  // 마퀴 + 게임명
  ctx.fillStyle=d.color;ctx.fillRect(x-w/2+3,top+3,w-6,15);
  ctx.fillStyle='#fff';ctx.font='800 9px Pretendard';ctx.textAlign='center';ctx.textBaseline='middle';
  ctx.fillText(d.label,x,top+11);
  // 스크린 (LED 다크 + 낙하 픽셀)
  ctx.fillStyle='#0b1024';ctx.fillRect(x-w/2+6,top+22,w-12,36);
  for(let i=0;i<4;i++){const py=top+25+((t*26+i*9+d.gx*7)%30);ctx.fillStyle=hexA(d.color,0.85);ctx.fillRect(x-17+i*10,py,5,5);}
  // 컨트롤 패널 + 버튼
  ctx.fillStyle=P.counter;ctx.fillRect(x-w/2+6,top+63,w-12,13);
  ctx.fillStyle=hexA(d.color,0.95);ctx.beginPath();ctx.arc(x-11,top+69.5,3.4,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='rgba(255,255,255,0.6)';ctx.beginPath();ctx.arc(x+11,top+69.5,3.4,0,Math.PI*2);ctx.fill();
}

function drawBench(d){
  const s=w2s(d.gx,d.gy),x=s.x+camX,y=s.y+camY;if(cull(x,y-40))return;
  ctx.save();ctx.translate(x,y);ctx.scale(1,0.5);ctx.fillStyle=P.charShadow;ctx.beginPath();ctx.ellipse(0,0,30,13,0,0,Math.PI*2);ctx.fill();ctx.restore();
  ctx.fillStyle='#6b4f36';ctx.fillRect(x-24,y-12,5,11);ctx.fillRect(x+19,y-12,5,11);
  roundRect(x-30,y-21,60,10,3,'#a97c50');
  ctx.fillStyle='rgba(255,255,255,0.18)';ctx.fillRect(x-28,y-21,56,3);
}

function drawBooth(b,t){
  const s=w2s(b.gx,b.gy),x=s.x+camX,y=s.y+camY;if(cull(x,y-170))return;
  const acc=b.ex.accent;
  const pd=player.gx+player.gy,pp=w2s(player.gx,player.gy);let a=1;
  if(b.d>pd+0.2){const sd=Math.hypot(s.x-pp.x,s.y-pp.y);if(sd<84)a=0.34;}
  ctx.save();ctx.globalAlpha=a;
  // 카운터
  const cw=74,ch=16,cy=y-4;
  roundRect(x-cw/2,cy-ch,cw,ch,3,P.counter);
  ctx.fillStyle=hexA(acc,0.9);ctx.fillRect(x-cw/2,cy-ch,cw,4);
  ctx.fillStyle='rgba(255,255,255,0.05)';ctx.fillRect(x-cw/2,cy-ch+4,cw,ch-4);
  // 백월 디스플레이 (세로형)
  const bw=88,bh=132,top=cy-ch-8-bh;
  ctx.shadowColor=hexA(acc,0.4+0.35*b.glow);ctx.shadowBlur=14+16*b.glow;
  roundRect(x-bw/2,top,bw,bh,6,P.panel);ctx.shadowBlur=0;
  ctx.save();roundRectPath(x-bw/2,top,bw,bh,6);ctx.clip();
  ctx.fillStyle=acc;ctx.fillRect(x-bw/2,top,bw,20);
  ctx.fillStyle=P.screenBg;ctx.fillRect(x-bw/2,top+20,bw,bh-20);
  ctx.strokeStyle=hexA(acc,0.55);ctx.lineWidth=1.5;
  for(let i=0;i<3;i++){ctx.beginPath();ctx.arc(x-bw/2+18,top+bh-31,6+i*6,0,Math.PI*1.5);ctx.stroke();}
  ctx.fillStyle=hexA(acc,0.9);ctx.beginPath();ctx.arc(x+bw/2-16,top+bh-33,4.5,0,Math.PI*2);ctx.fill();
  ctx.restore();
  roundRectPath(x-bw/2,top,bw,bh,6);ctx.strokeStyle=hexA(acc,0.8);ctx.lineWidth=2;ctx.stroke();
  ctx.fillStyle='#fff';ctx.textBaseline='middle';
  ctx.font='800 10px Pretendard';ctx.textAlign='left';ctx.fillText(b.code,x-bw/2+8,top+10);
  ctx.font='700 9px Pretendard';ctx.textAlign='right';ctx.fillText('▶',x+bw/2-8,top+10);
  ctx.fillStyle=P.ink;ctx.font='700 12px Pretendard';ctx.textAlign='left';ctx.textBaseline='top';
  wrapText(b.ex.title,x-bw/2+11,top+30,bw-22,15,4,true);
  ctx.fillStyle=P.inkSoft;ctx.font='600 9px Pretendard';
  ctx.fillText(b.ex.team,x-bw/2+11,top+bh-14);
  // 행잉 사인
  const hy=top-16-Math.sin(t*2.5+b.gx)*2;
  roundRect(x-26,hy-10,52,18,4,P.chip);
  roundRectPath(x-26,hy-10,52,18,4);ctx.strokeStyle=hexA(acc,0.5);ctx.lineWidth=1.5;ctx.stroke();
  ctx.fillStyle=P.ink;ctx.font='800 10px Pretendard';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(b.code,x,hy-1);
  ctx.restore();
  if(b===activeBooth){
    const py=hy-24-Math.sin(t*3)*2;ctx.save();ctx.globalAlpha=Math.min(1,b.glow+0.2);
    const label='▶ 관람하기 · Space / 클릭';ctx.font='700 12px Pretendard';const w=ctx.measureText(label).width+22;
    roundRect(x-w/2,py-12,w,24,12,'#1428a0');ctx.fillStyle='#fff';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(label,x,py);
    ctx.beginPath();ctx.moveTo(x-5,py+12);ctx.lineTo(x+5,py+12);ctx.lineTo(x,py+18);ctx.closePath();ctx.fillStyle='#1428a0';ctx.fill();ctx.restore();
  }
}

function drawChar(e,t){
  const s=w2s(e.gx,e.gy),x=s.x+camX,y=s.y+camY;if(cull(x,y))return;
  const bob=(e.moving)?Math.sin(e.phase)*2:Math.sin(t*2.4+e.phase)*1;
  ctx.save();ctx.translate(x,y);ctx.scale(1,0.5);ctx.fillStyle=P.charShadow;ctx.beginPath();ctx.arc(0,0,11,0,Math.PI*2);ctx.fill();ctx.restore();
  if(e.isPlayer){ctx.save();ctx.translate(x,y);ctx.scale(1,0.5);const g=ctx.createRadialGradient(0,0,2,0,0,26);g.addColorStop(0,'rgba(61,123,255,0.45)');g.addColorStop(1,'rgba(61,123,255,0)');ctx.fillStyle=g;ctx.beginPath();ctx.arc(0,0,26,0,Math.PI*2);ctx.fill();ctx.restore();}
  const by=y-bob;
  roundRect(x-8,by-26,16,20,7,e.color);
  ctx.fillStyle='rgba(255,255,255,0.14)';roundRectPath(x-8,by-26,16,10,7);ctx.fill();
  ctx.fillStyle=e.head;ctx.beginPath();ctx.arc(x,by-30,7,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='rgba(0,0,0,0.10)';ctx.beginPath();ctx.arc(x+e.face*2,by-30,7,-0.4,1.0);ctx.fill();
  if(e.isPlayer){const yy=by-48+Math.sin(t*3)*2;ctx.fillStyle='#3d7bff';ctx.beginPath();ctx.moveTo(x,yy+6);ctx.lineTo(x-5,yy-2);ctx.lineTo(x+5,yy-2);ctx.closePath();ctx.fill();}
  else if(e.nick){ // 닉네임 — 실제 유저처럼
    ctx.font='600 9px Pretendard';const nw=ctx.measureText(e.nick).width+10;
    ctx.globalAlpha=0.88;roundRect(x-nw/2,by-52,nw,14,7,P.chip);
    ctx.fillStyle=P.ink;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(e.nick,x,by-45);
    ctx.globalAlpha=1;
  }
}

const parts=Array.from({length:40},()=>({x:Math.random(),y:Math.random(),s:Math.random()*1.6+0.4,sp:0.4+Math.random()*0.8}));
function drawParticles(dt){for(const p of parts){p.y-=p.sp*dt*0.03;if(p.y<-0.02){p.y=1.02;p.x=Math.random();}ctx.fillStyle=`rgba(${P.particle},${0.05+p.s*0.06})`;ctx.beginPath();ctx.arc(p.x*W,p.y*H,p.s,0,Math.PI*2);ctx.fill();}}

function drawMinimap(){
  const SZ=172,sc=Math.min(SZ/HALL_W,SZ/HALL_D),ox=(SZ-HALL_W*sc)/2,oy=(SZ-HALL_D*sc)/2;
  const X=g=>ox+g*sc, Y=g=>oy+g*sc;
  mmx.clearRect(0,0,SZ,SZ);mmx.fillStyle=P.mmBg;mmx.fillRect(0,0,SZ,SZ);
  mmx.fillStyle='rgba(61,123,255,0.16)';mmx.fillRect(X(1),Y(HALL_D-4),(HALL_W-3)*sc,(HALL_D-3-(HALL_D-4))*sc+2*sc);
  mmx.strokeStyle='rgba(90,110,170,0.5)';mmx.lineWidth=1.4;mmx.strokeRect(X(1),Y(1),(HALL_W-3)*sc,(HALL_D-3)*sc);
  for(const b of BOOTHS){mmx.fillStyle=hexA(b.ex.accent,0.85);mmx.fillRect(X(b.gx)-3,Y(b.gy)-2,6,4);
    if(b===activeBooth){mmx.strokeStyle=P.ink;mmx.lineWidth=1.5;mmx.strokeRect(X(b.gx)-4,Y(b.gy)-3,8,6);}}
  mmx.fillStyle='rgba(139,92,246,0.22)';mmx.fillRect(X(PG.x0),Y(PG.y0),(PG.x1-PG.x0+1)*sc,(PG.y1-PG.y0+1)*sc);
  mmx.fillStyle='#4d8bff';mmx.fillRect(X(PLAZA.x)-4,Y(PLAZA.y-3.5)-1.5,8,3);
  mmx.fillStyle=P.mmNpc;for(const n of npcs){mmx.beginPath();mmx.arc(X(n.gx),Y(n.gy),1.6,0,Math.PI*2);mmx.fill();}
  mmx.fillStyle='#3d7bff';mmx.beginPath();mmx.arc(X(player.gx),Y(player.gy),3.4,0,Math.PI*2);mmx.fill();mmx.strokeStyle='#fff';mmx.lineWidth=1;mmx.stroke();
}

/* ---------- 렌더 ---------- */
function render(t,dt){
  const bg=ctx.createLinearGradient(0,0,0,H);bg.addColorStop(0,P.bgA);bg.addColorStop(1,P.bgB);ctx.fillStyle=bg;ctx.fillRect(0,0,W,H);
  drawFloor(t);
  const ents=[];
  for(const w of WALLS)ents.push({type:'wall',d:w.d,obj:w});
  for(const tr of TRACKS)ents.push({type:'banner',d:tr.sign.x+tr.sign.y,obj:tr});
  for(const d of DECOR)ents.push({type:d.type,d:d.zd??(d.gx+d.gy),obj:d});
  for(const b of BOOTHS)ents.push({type:'booth',d:b.d,obj:b});
  ents.push({type:'char',d:player.gx+player.gy,obj:player});
  for(const n of npcs)ents.push({type:'char',d:n.gx+n.gy,obj:n});
  ents.sort((a,b)=>a.d-b.d);
  for(const e of ents){const k=e.type;
    if(k==='wall')drawWall(e.obj);else if(k==='banner')drawBanner(e.obj);
    else if(k==='billboard')drawBillboard(e.obj,t);else if(k==='tree')drawTree(e.obj);else if(k==='bench')drawBench(e.obj);else if(k==='arcade')drawArcade(e.obj,t);
    else if(k==='booth')drawBooth(e.obj,t);else drawChar(e.obj,t);}
  drawParticles(dt);drawMinimap();
}

let last=performance.now();
function loop(now){let dt=(now-last)/1000;last=now;if(dt>0.05)dt=0.05;const t=now/1000;update(dt,t);render(t,dt);requestAnimationFrame(loop);}
requestAnimationFrame(loop);

/* ---------- 모달 ---------- */
const modalBack=document.getElementById('modalBack'),modal=document.getElementById('modal');
const AVA=['#3d7bff','#12b3a6','#6c5ce7','#e0872f','#e0533f'];
function openModal(ex){
  modalOpen=true;
  const video=ex.videoUrl
    ?`<div class="video-box"><iframe src="https://www.youtube.com/embed/${ex.videoUrl}" allowfullscreen></iframe></div>`
    :`<div class="video-box"><div class="video-scan"></div><div class="video-ph"><div class="play"></div>데모 영상 준비 중<br/><span style="font-size:11px;opacity:.7">videoUrl에 유튜브 ID를 넣으면 재생됩니다</span></div></div>`;
  const tags=ex.tags.map(tg=>`<span class="tag">${tg}</span>`).join('');
  const members=ex.members.map((m,i)=>`<div class="member"><div class="m-ava" style="background:${AVA[i%AVA.length]}">${m[0][0]}</div><div><div class="m-name">${m[0]}</div><div class="m-role">${m[1]}</div></div></div>`).join('');
  modal.innerHTML=`
    <div class="m-head">
      <div class="accent-line" style="background:linear-gradient(90deg,${ex.accent},transparent)"></div>
      <button class="m-close" id="mClose">✕</button>
      <span class="m-track" style="color:${ex.accent};background:${hexA(ex.accent,0.12)};border:1px solid ${hexA(ex.accent,0.35)}">${ex.code} · ${ex.trackName}</span>
      <span class="m-award">🏆 ${ex.award}</span>
      <div class="m-title">${ex.title}</div>
      <div class="m-team">${ex.team}</div>
    </div>
    <div class="m-body">
      ${video}
      <div class="m-summary">${ex.summary}</div>
      <div class="m-desc">${ex.desc}</div>
      <div class="m-grid">
        <div><div class="m-sec-title">기술 · 키워드</div><div class="tags">${tags}</div></div>
        <div><div class="m-sec-title">팀 구성원</div><div class="members">${members}</div></div>
      </div>
    </div>`;
  modalBack.classList.add('open');document.getElementById('mClose').onclick=closeModal;
}
function closeModal(){modalOpen=false;modalBack.classList.remove('open');}
modalBack.addEventListener('click',e=>{if(e.target===modalBack)closeModal();});

/* ---------- 전체 채팅 ---------- */
const chat=document.getElementById('chat'),chatBody=document.getElementById('chatBody'),
  chatText=document.getElementById('chatText'),chatSend=document.getElementById('chatSend'),
  chatHead=document.getElementById('chatHead');
function addChat(text,opt){
  opt=opt||{};
  const el=document.createElement('div');
  el.className='msg'+(opt.self?' me':'')+(opt.sys?' sys':'');
  if(opt.who&&!opt.self&&!opt.sys){const w=document.createElement('div');w.className='who';w.textContent=opt.who;el.appendChild(w);}
  const b=document.createElement('div');b.className='bub';b.textContent=text;el.appendChild(b);
  chatBody.appendChild(el);chatBody.scrollTop=chatBody.scrollHeight;
}
function sendChat(){
  const v=chatText.value.trim();if(!v)return;
  addChat(v,{self:true});chatText.value='';
  // TODO(backend): 서버로 전송 — 예) socket.emit('chat',{text:v})
}
chatSend.addEventListener('click',sendChat);
chatText.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();sendChat();}else if(e.key==='Escape'){chatText.blur();}});
chatHead.addEventListener('click',()=>chat.classList.toggle('collapsed'));
addChat('전체 채팅에 입장했어요. 아직 서버 연결 전이라 내가 보낸 메시지는 내 화면에만 표시됩니다.',{sys:true});
addChat('부스 어디부터 도실 거예요?',{who:'김도현'});
addChat('저는 T1 설계·EDA 부스부터요 👀',{who:'이서연'});

document.getElementById('enterBtn').onclick=()=>{started=true;const intro=document.getElementById('intro');intro.style.opacity='0';setTimeout(()=>intro.style.display='none',500);};
