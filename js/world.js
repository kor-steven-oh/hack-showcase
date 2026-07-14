/* 월드: 지오메트리 상수 · 수학 헬퍼 · 부스/장식 배치 · 바닥/벽 · 충돌 */

/* ---------- 지오메트리 (직사각형 홀 · 아이소메트릭) ---------- */
const TW=64,TH=32;
const HALL_W=82, HALL_D=47;
const WALL_H=70;
/* 트랙 존: 뒤 3(위쪽 외벽 밀착) · 앞 2(중앙 광장 양옆), 존마다 2×2 부스 클러스터 */
const ZONES=[{cx:12,cy:2},{cx:30,cy:2},{cx:48,cy:2},{cx:13,cy:26},{cx:47,cy:26}];
const BOOTH_DX=6.5, BOOTH_DY=8; // 부스 간격 확장 — 존이 중앙 통로까지, 중앙에 라운지
const PLAZA={x:30,y:26.5};
/* 플레이그라운드: 홀 우측 전체 — 위·오른쪽 외벽 밀착 */
const PG={x0:62,x1:80,y0:1,y1:20,accent:'#8b5cf6'};

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
  tr.sign={x:z.cx-0.5,y:z.cy-0.5}; // 존 뒤쪽(벽 안쪽), 화면상 존 중앙 정렬(gx-gy 유지)
  EXHIBITS.filter(e=>e.trackIdx===ti).forEach((ex,k)=>{
    const gx=z.cx+(k%2?BOOTH_DX:-BOOTH_DX), gy=z.cy+(k>1?BOOTH_DY:0);
    BOOTHS.push({gx,gy,ex,track:ti,no:String(k+1).padStart(2,'0'),
      code:tr.code+'-'+String(k+1).padStart(2,'0'),
      view:{x:gx,y:gy+1.9}, d:gx+gy, glow:0.28});
  });
});

/* ---------- 장식 (실내 캠퍼스: 라운지 · 라이브러리 · 아이디어 월 · 스테이지) ---------- */
/* act: 상호작용 종류 — game/idea/lib/info (main.js actSpot 라우팅) */
const DECOR=[
  {type:'billboard',gx:PLAZA.x,gy:PLAZA.y-3.5,text:'HELLO AI',sub:'S.LSI  HACKATHON  EXPO',color:'#3d7bff',w:250,fs:40,face:'ur'}, // 고정 문구 (애니메이션 없음)
  // 트랙 존 중앙 라운지 — 트랙 색 소파 4개가 긴 테이블을 두고 두 대각선에서 정면으로 마주봄
  // + 소파 위 착석 방문객 2~3명 (좌석을 시청자 쪽으로 반 타일 내밀어 d가 소파보다 커짐 — 소파에 안 가려짐)
  ...ZONES.flatMap((z,i)=>{
    const c=TRACKS[i].accent,lx=z.cx-2; // 라운지 전체 2칸 왼쪽(-gx) — 부스 전시월과 안 겹침
    const NK=['부스투어중','데모구경','질문있어요','메모중','열공모드','스티커수집','포토타임','네트워킹','굿즈헌터','피드백요정','커피한잔','당충전','휴식중'];
    const CL=['#12b3a6','#e0872f','#c78bff','#21a17a','#e0533f','#1a8fe3','#f5c542','#6c5ce7','#4d8bff','#ffa8a8','#74c0fc','#8ce99a','#ffd166'];
    // zd: 좌/위쪽 좌석은 gx+gy가 소파보다 작아 가려짐 — 소파 depth 직후로 강제
    const SEAT=[[lx-0.55,z.cy+1.55,lx+z.cy+1.5],[lx+0.55,z.cy+1.55,lx+z.cy+2.2],   // 북쪽 소파 2자리
                [lx-3.05,z.cy+3.45,lx+z.cy+0.9],[lx-3.05,z.cy+4.55,lx+z.cy+1.6]];  // 서쪽 소파 2자리
    const PICK=[[0,1,3],[1,2],[0,2,3],[0,3],[1,2,3]][i];     // 존마다 2~3명 랜덤 조합
    return[
    {type:'sofa',gx:lx,gy:z.cy+1.4,sk:0.5,color:c},{type:'sofa',gx:lx,gy:z.cy+6.6,sk:0.5,fl:1,color:c},   // gy축 대각선 쌍
    {type:'sofa',gx:lx-3.2,gy:z.cy+4,sk:-0.5,color:c},{type:'sofa',gx:lx+3.2,gy:z.cy+4,sk:-0.5,fl:1,color:c}, // gx축 대각선 쌍
    {type:'longtable',gx:lx,gy:z.cy+4,sk:0.5},
    ...PICK.map((sn,k)=>({type:'sitter',gx:SEAT[sn][0],gy:SEAT[sn][1],zd:SEAT[sn][2],color:CL[(i*3+k)%13],nick:NK[(i*3+k)%13]})),
  ];}),
  // 플레이그라운드 대형 팻말 — zd: 뒤벽(d≈86.4)보다 뒤에 그려지지 않도록 벽 위로
  {type:'billboard',gx:70,gy:PG.y0+0.4,text:'PLAYGROUND',sub:'미니게임 · 소소한 즐길거리',color:'#8b5cf6',w:280,fs:36,face:'ur',zd:87},
  // 메시지 월 (T1/T4 사이 · T3/T5 사이 가로 통로) + 스탠딩 테이블
  // 서쪽 외벽 대형 전광판(야구장 스크린) — notes: 메시지 월 문구 실시간 순환 (render.js billboardScreen)
  // gx 2.2: 외벽(gx≈1)과 안 겹치게 한 칸 안쪽 / gy 18.3: 중앙 가로 통로(상단 카펫끝 14.9 ~ 하단 카펫시작 21.7) 중앙
  // zd 24.3: 화면상 겹치는 서쪽 외벽 타일 최대 d(≈24)보다 위 — 벽에 안 가림
  {type:'billboard',gx:2.2,gy:18.3,text:'MESSAGE WALL',sub:'💬 MESSAGE WALL LIVE · 방문객이 남긴 한마디',color:'#21a17a',w:340,h:150,fs:32,face:'ul',notes:1,zd:24.3},
  {type:'board',gx:12.5,gy:18.3,act:'idea'},{type:'board',gx:47.5,gy:18.3,act:'idea'},
  {type:'table',gx:27,gy:21},{type:'table',gx:33,gy:21},
  // 카페 라운지 (우측 아래 대형 — 플레이그라운드 축소분 흡수)
  {type:'cafebar',gx:69,gy:26.5},
  // 서비스 라인(위쪽 가장자리): 음식 진열대 2 · 음료 쿨러 1 · 자판기 3 한쪽 밀집 나열
  {type:'foodcase',gx:63.5,gy:22.4},{type:'foodcase',gx:66.7,gy:22.4},
  {type:'fridge',gx:70,gy:22.3},
  {type:'vending',gx:73.6,gy:22.2},{type:'vending',gx:75.8,gy:22.2,color:'#21a17a'},{type:'vending',gx:78,gy:22.2,color:'#1a8fe3'},
  // 좌석: 긴 테이블 2 + 원탁 5 믹스 (의자 fl = 반대편 마주 앉기)
  // 긴 테이블 A (gx축) — 4인석, 3명 그룹 착석
  {type:'longtable',gx:65.5,gy:30,sk:0.5},
  {type:'chair',gx:64.6,gy:28.8,sk:-0.5},{type:'chair',gx:66.4,gy:28.8,sk:-0.5},
  {type:'chair',gx:64.6,gy:31.2,sk:-0.5,fl:1},{type:'chair',gx:66.4,gy:31.2,sk:-0.5,fl:1},
  // 긴 테이블 B (gy축) — 4인석, 2명 마주 착석
  {type:'longtable',gx:74,gy:32.5,sk:-0.5},
  {type:'chair',gx:72.9,gy:31.6,sk:0.5},{type:'chair',gx:72.9,gy:33.4,sk:0.5},
  {type:'chair',gx:75.1,gy:31.6,sk:0.5,fl:1},{type:'chair',gx:75.1,gy:33.4,sk:0.5,fl:1},
  // 원탁 5개 (의자 2개씩: 서쪽 sk0.5 · 북쪽 sk-0.5)
  {type:'table',gx:69,gy:31},{type:'chair',gx:67.7,gy:31,sk:0.5},{type:'chair',gx:69,gy:29.7,sk:-0.5},
  {type:'table',gx:64,gy:34.5},{type:'chair',gx:62.7,gy:34.5,sk:0.5},{type:'chair',gx:64,gy:33.2,sk:-0.5},
  {type:'table',gx:69,gy:36.5},{type:'chair',gx:67.7,gy:36.5,sk:0.5},{type:'chair',gx:69,gy:35.2,sk:-0.5},
  {type:'table',gx:75.5,gy:37},{type:'chair',gx:74.2,gy:37,sk:0.5},{type:'chair',gx:75.5,gy:35.7,sk:-0.5},
  {type:'table',gx:64.5,gy:39},{type:'chair',gx:63.2,gy:39,sk:0.5},{type:'chair',gx:64.5,gy:37.7,sk:-0.5},
  {type:'sofa',gx:66.5,gy:41.2,color:'#a45a44',sk:-0.5},{type:'table',gx:69.3,gy:41.3},{type:'sofa',gx:72,gy:41.2,color:'#a45a44',sk:-0.5,fl:1}, // 테이블 사이 마주보기
  // 앉아 있는 방문객 (의자 좌표와 일치, 의자 뒤 선언 — 3명 그룹 · 2명 마주 · 2명 · 싱글)
  {type:'sitter',gx:64.6,gy:28.8,color:'#12b3a6',nick:'라떼장인'},
  {type:'sitter',gx:66.4,gy:28.8,color:'#e0872f',nick:'모카홀릭'},
  {type:'sitter',gx:66.4,gy:31.2,color:'#c78bff',nick:'슈크림'},
  {type:'sitter',gx:72.9,gy:31.6,color:'#21a17a',nick:'콜드브루'},
  {type:'sitter',gx:75.1,gy:33.4,color:'#e0533f',nick:'디카페인'},
  {type:'sitter',gx:62.7,gy:34.5,color:'#1a8fe3',nick:'바닐라샷'},
  {type:'sitter',gx:64,gy:33.2,color:'#f5c542',nick:'휘핑추가'},
  {type:'sitter',gx:67.7,gy:31,color:'#6c5ce7',nick:'에스프레소'},
  // 입구 — 안내데스크
  {type:'desk',gx:33,gy:43.3,act:'info'},
  // 플레이그라운드: 아케이드 미니게임 캐비닛 + 벤치
  {type:'arcade',gx:65,gy:11,label:'두더지 잡기',color:'#e0533f'},
  {type:'arcade',gx:70,gy:11,label:'반응속도',color:'#21a17a',game:'reaction',act:'game'},
  {type:'arcade',gx:75,gy:11,label:'타자 배틀',color:'#e0872f'},
  {type:'arcade',gx:65,gy:17,label:'AI 퀴즈',color:'#1a8fe3'},
  {type:'arcade',gx:70,gy:17,label:'가위바위보',color:'#c78bff'},
  {type:'arcade',gx:75,gy:17,label:'랜덤 뽑기',color:'#e6b24d'},
  {type:'bench',gx:63,gy:14,sk:-0.5},{type:'bench',gx:77,gy:14,sk:-0.5},
  // 플레이그라운드 휴식 공간 (간판 아래 라운지)
  {type:'sofa',gx:66.5,gy:6.5,sk:-0.5},{type:'sofa',gx:72.5,gy:6.5,sk:-0.5,fl:1},{type:'table',gx:69.5,gy:6.7}, // 테이블 사이 마주보기
];
/* NPC가 머무는 지점 (소파·테이블·객석 앞) — 공간에 생기 부여 */
const HANGOUTS=[[67.5,42],[72,42],[69.5,42.2],[26,25.2],[34,25.2],[26,29.2],[34,29.2],
  [21.3,21.2],[38.7,21.2],[69.5,40],[77.8,40.2],
  [67,7.8],[72.5,7.8],[69.7,25.2],[65.8,30.8],[73.8,34.8],[77.8,30.8],
  ...ZONES.map(z=>[z.cx-2,z.cy+5.3])]; // 존 중앙 라운지 (2칸 왼쪽 이동 반영)

/* 정적 스크린 좌표 캐시 — 매 프레임 w2s 재계산 방지 */
for(const b of BOOTHS){const s=w2s(b.gx,b.gy);b.sx=s.x;b.sy=s.y;}
TRACKS.forEach(tr=>{const s=w2s(tr.sign.x,tr.sign.y);tr.sx=s.x;tr.sy=s.y;});
for(const d of DECOR){const s=w2s(d.gx,d.gy);d.sx=s.x;d.sy=s.y;}

/* ---------- 바닥 사전계산 ---------- */
function carpetTrack(gx,gy){for(let i=0;i<ZONES.length;i++){const z=ZONES[i];
  if(Math.abs(gx-z.cx)<=BOOTH_DX+2 && (gy-z.cy)>=-4.3 && (gy-z.cy)<=BOOTH_DY+4.9) return i;}return -1;} // 위아래 3칸 확장
const FLOOR=[];
for(let gx=1;gx<=HALL_W-2;gx++)for(let gy=1;gy<=HALL_D-2;gy++){
  const chk=((gx+gy)&1), base=chk?P.floorA:P.floorB;
  let fill;
  const pd=Math.hypot(gx-PLAZA.x,(gy-PLAZA.y)*0.72); // 광장: 중앙 통로 방향(세로)으로 긴 타원
  if(gy>=HALL_D-4){ fill=mix(base,'#3d7bff',0.13); }
  else if(pd<8){ fill=mix(base,'#3d7bff',pd<5?0.2:0.10); }       // 광장 + 중앙 러그
  else if(gx>=PG.x0&&gx<=PG.x1&&gy>=PG.y0&&gy<=PG.y1){ fill=mix(base,PG.accent,0.14); }
  else if(gx>=62&&gx<=80&&gy>=21&&gy<=42){ fill=mix(base,'#e0872f',0.10); }   // 카페 라운지 러그 (플레이그라운드 아래)
  else{ const tk=carpetTrack(gx,gy); fill = tk>=0 ? mix(base,TRACKS[tk].accent,0.17) : base; }
  FLOOR.push({gx,gy,fill});
}
const FLOORSET=new Set(FLOOR.map(f=>f.gx+','+f.gy));
const WALLS=[];   // 상단 좌/우(뒤쪽)만
for(const f of FLOOR){
  if(!FLOORSET.has((f.gx-1)+','+f.gy)) WALLS.push({gx:f.gx,gy:f.gy,edge:'ul',d:f.gx+f.gy-0.6});
  if(!FLOORSET.has(f.gx+','+(f.gy-1))) WALLS.push({gx:f.gx,gy:f.gy,edge:'ur',d:f.gx+f.gy-0.6});
}
/* 트랙 존 구분: 벽 대신 공중 부유 컬러 라인(render.js drawZoneLines) — 통행 자유 */
const ZONE_WALL_SIDE=4; // 플레이그라운드 좌측 파티션 길이(타일)
/* 플레이그라운드 파티션 (뒤 외벽 액센트 + 좌측 위쪽, 앞·우측 개방 — 우측은 외벽 밀착) */
for(let gx=PG.x0;gx<=PG.x1;gx++) WALLS.push({gx,gy:PG.y0,edge:'ur',acc:PG.accent,d:gx+PG.y0-0.6});
for(let gy=PG.y0;gy<PG.y0+ZONE_WALL_SIDE;gy++)
  WALLS.push({gx:PG.x0,gy,edge:'ul',acc:PG.accent,d:PG.x0+gy-0.6});

/* ---------- 충돌 ---------- */
function walkable(gx,gy){ // 벽만 막음(홀 경계 + 플레이그라운드 파티션) — 부스·장식·존 라인은 통과
  if(gx<1.4||gx>HALL_W-2.6||gy<1.4||gy>HALL_D-1.8) return false;
  const pby=PG.y0-0.5;
  if(Math.abs(gy-pby)<0.4 && gx>=PG.x0-0.9 && gx<=PG.x1+0.9) return false;
  if((Math.abs(gx-(PG.x0-0.5))<0.4||Math.abs(gx-(PG.x1+0.5))<0.4) && gy>pby-0.4 && gy<pby+ZONE_WALL_SIDE) return false;
  return true;
}
function moveEnt(e,dx,dy){if(walkable(e.gx+dx,e.gy))e.gx+=dx;if(walkable(e.gx,e.gy+dy))e.gy+=dy;}
