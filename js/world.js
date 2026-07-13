/* 월드: 지오메트리 상수 · 수학 헬퍼 · 부스/장식 배치 · 바닥/벽 · 충돌 */

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
function cull(x,y){x+=camX;y+=camY;return x<-140||x>W+140||y<-190||y>H+210;} // 월드 스크린 좌표 기준(렌더는 translate(camX,camY) 하에 그림)

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
  {type:'arcade',gx:70,gy:14,label:'반응속도',color:'#21a17a',game:'reaction'},
  {type:'arcade',gx:75,gy:14,label:'타자 배틀',color:'#e0872f'},
  {type:'arcade',gx:65,gy:24,label:'AI 퀴즈',color:'#1a8fe3'},
  {type:'arcade',gx:70,gy:24,label:'가위바위보',color:'#c78bff'},
  {type:'arcade',gx:75,gy:24,label:'랜덤 뽑기',color:'#e6b24d'},
  {type:'bench',gx:63,gy:19},{type:'bench',gx:77,gy:19},
  {type:'tree',gx:63,gy:30},{type:'tree',gx:77,gy:30},
];

/* 정적 스크린 좌표 캐시 — 매 프레임 w2s 재계산 방지 */
for(const b of BOOTHS){const s=w2s(b.gx,b.gy);b.sx=s.x;b.sy=s.y;}
TRACKS.forEach(tr=>{const s=w2s(tr.sign.x,tr.sign.y);tr.sx=s.x;tr.sy=s.y;});
for(const d of DECOR){const s=w2s(d.gx,d.gy);d.sx=s.x;d.sy=s.y;}

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
