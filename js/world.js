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
/* act: 상호작용 종류 — ranking/game/idea/info (main.js actSpot 라우팅) */
const CAFE_GUEST_COLORS=['#4d8bff','#c78bff','#e0533f','#f5c542','#12b3a6','#ffa8a8','#1a8fe3','#6c5ce7','#8ce99a','#e0872f'];
const DECOR=[
  {type:'billboard',gx:PLAZA.x,gy:PLAZA.y-3.5,text:'HELLO AI',sub:'S.LSI  HACKATHON  EXPO',color:'#3d7bff',w:250,fs:40,face:'ur'}, // 고정 문구 (애니메이션 없음)
  {type:'board',gx:PLAZA.x,gy:PLAZA.y+0.8,act:'ranking'}, // 전광판 앞 팀 랭킹·투표
  // 트랙 존 중앙 라운지 — 소파 3개와 위쪽 작업 보드가 공동 작업 테이블을 둘러쌈
  // 서쪽 소파 착석 방문객은 소파 바로 뒤 깊이로 그려 등받이에 가려지지 않게 함
  ...ZONES.flatMap((z,i)=>{
    const c=TRACKS[i].accent,lx=z.cx-2; // 라운지 전체 2칸 왼쪽(-gx) — 부스 전시월과 안 겹침
    const NK=['부스투어중','데모구경','질문있어요','메모중','열공모드','스티커수집','포토타임','네트워킹','굿즈헌터','피드백요정','커피한잔','당충전','휴식중'];
    const CL=['#12b3a6','#e0872f','#c78bff','#21a17a','#e0533f','#1a8fe3','#f5c542','#6c5ce7','#4d8bff','#ffa8a8','#74c0fc','#8ce99a','#ffd166'];
    // 중앙 테이블의 측면·아래쪽에 소파를 정렬하고 위쪽 자리는 작업 보드로 사용.
    const SOFAS=[[0,0.6],[0,8],[-3.7,4],[3.3,4]].map(([x,y])=>[lx+x,z.cy+y]);
    const[wx,wy]=SOFAS[2];
    // 소파가 옮겨지면 착석 위치와 깊이도 함께 이동.
    const SEAT=[[wx+0.15,wy-0.55,wx+wy+0.1],[wx+0.15,wy+0.55,wx+wy+0.8]];
    // 장비대와 간식대를 작업 테이블에 가까운 소파 사이 모서리에 배치.
    const EXTRAS=[
      [[-2.4,1.9],[2.5,6.8],[3,-0.6],[-2.5,6.7]],
      [[-2.2,2],[2.7,6.9],[3.2,-0.6],[-2.4,6.8]],
      [[-2.3,1.9],[2.4,6.7],[3.1,-0.7],[-2.6,6.9]],
      [[-2.3,2.1],[2.6,6.8],[3.3,-0.5],[-2.4,6.9]],
      [[-2.4,2],[2.5,6.9],[3,-0.7],[-2.5,6.8]],
    ][i];
    const WORK_NICKS=[
      ['칩설계중','RTL장인','타이밍봇','배선연구','검증요정','EDA메이트'],
      ['수율탐정','웨이퍼러버','품질지킴','패턴분석','불량제로','데이터뷰'],
      ['설비닥터','센서연구','로그탐험','알람해결','정비메이트','운영마스터'],
      ['온보딩중','피플메이트','성장코치','조직탐구','러닝버디','마음챙김'],
      ['코드리뷰','테스트장인','디버깅중','커밋요정','빌드메이트','문서덕후'],
    ][i];
    const PICK=[[1],[0],[0,1],[1],[0,1]][i]; // 남은 소파에 1~2명 착석
    return[
    ...SOFAS.flatMap(([gx,gy],k)=>k===0?[]:[{type:'sofa',gx,gy,sk:k<2?0.5:-0.5,
      fl:k%2,color:c,cushion:true}]),
    {type:'longtable',gx:lx,gy:z.cy+4,sk:0.5,lounge:i},
    // 넓은 공동 작업 테이블 양쪽에 3명씩 앉아 노트북을 함께 본다.
    ...[[-1.25,-1.35],[0,-1.35],[1.25,-1.35],[-1.25,1.35],[0,1.35],[1.25,1.35]].flatMap(([dx,dy],k)=>[
      {type:'chair',gx:lx+dx,gy:z.cy+4+dy,sk:-0.5,fl:dy>0?1:0},
      {type:'sitter',gx:lx+dx,gy:z.cy+4+dy,color:CL[(i*3+k+4)%13],working:dy>0?1:-1,nick:WORK_NICKS[k],track:i},
    ]),
    ...['sidetable','snacktable','trackart','loungecabinet'].map((type,k)=>
      ({type,gx:lx+EXTRAS[k][0],gy:z.cy+EXTRAS[k][1],track:i})),
    {type:'taskboard',gx:SOFAS[0][0],gy:SOFAS[0][1],sk:0.5,track:i},
    {type:'bag',gx:SOFAS[1][0]+1.2,gy:SOFAS[1][1]+0.15,track:i},
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
  // 카페: 서비스 라인 → 열린 주문 동선 → 2인석 / 커뮤니티 테이블 / 소파 코너
  {type:'cafebar',gx:69,gy:25.5},
  {type:'coldbrew',gx:73.5,gy:25.5}, // 카운터 옆 독립 추출대 — 주문 동선 뒤쪽
  {type:'cafemenu',gx:62.4,gy:27.5}, // 서쪽 진입부, 간판 뒤로 가구가 겹치지 않는 자리
  {type:'foodcase',gx:65.4,gy:24.4},{type:'foodcase',gx:66.6,gy:24.4},
  {type:'fridge',gx:70.8,gy:22.3},{type:'fridge',gx:72.2,gy:22.3},
  {type:'vending',gx:74,gy:22.3,color:P.cafeGreen},
  ...[[63,24],[62.2,33],[62.2,37],[63,41.5],[79,32.8],[74,41.5]]
    .map(([gx,gy])=>({type:'plant',gx,gy})),
  // 서쪽 2열 × 4행: 테이블 사이 간격을 두고 2인석 8세트 배치
  // gx 69~72 중앙 통로와 카운터 앞 gy 27~29는 좌석 없이 유지.
  ...[64,67].flatMap((gx,col)=>[30.5,33.5,36.5,39.5].flatMap((gy,row)=>[
    {type:'table',gx,gy},
    {type:'chair',gx:gx-0.85,gy,sk:0.5},
    {type:'chair',gx:gx+0.85,gy,sk:0.5,fl:1},
    {type:'sitter',gx:gx-0.85,gy,color:CAFE_GUEST_COLORS[col*4+row],
      nick:['라떼장인','디카페인','쿠키타임','원두탐험','커피수혈','디저트러버','잠깐휴식','아이디어충전'][col*4+row]},
    ...((col+row)%2===0?[{type:'sitter',gx:gx+0.85,gy,color:CAFE_GUEST_COLORS[(col*4+row+4)%CAFE_GUEST_COLORS.length],
      nick:['바닐라샷','모닝커피','산미취향','밀크티'][col*2+(row>>1)]}]:[]),
  ])),
  // 동쪽 4인석 3세트: 카운터 앞을 피하고 소파 코너 옆까지 활용
  ...[30.5,33.5,36.5].flatMap((gy,i)=>[
    {type:'longtable',gx:73.8,gy,sk:0.5},
    ...[[-0.7,-0.8],[0.7,-0.8],[-0.7,0.8],[0.7,0.8]].map(([dx,dy])=>
      ({type:'chair',gx:73.8+dx,gy:gy+dy,sk:-0.5,fl:dy>0?1:0})),
    {type:'sitter',gx:73.1,gy:gy-0.8,color:CAFE_GUEST_COLORS[i*3],nick:['콜드브루','모카홀릭','데모이야기'][i]},
    {type:'sitter',gx:74.5,gy:gy+0.8,color:CAFE_GUEST_COLORS[i*3+1],nick:['팀회고','오트라떼','다음프로젝트'][i]},
    ...(i!==1?[{type:'sitter',gx:74.5,gy:gy-0.8,color:CAFE_GUEST_COLORS[i*3+2],nick:i?'당충전':'커피챗'}]:[]),
  ]),
  // 동쪽 가장자리 2인석 3세트, 아치와 소파 사이 공간 활용
  ...[28.5,31.5,34.5].flatMap((gy,i)=>[
    {type:'table',gx:77.7,gy},
    {type:'chair',gx:77.7,gy:gy-0.85,sk:-0.5},
    {type:'chair',gx:77.7,gy:gy+0.85,sk:-0.5,fl:1},
    {type:'sitter',gx:77.7,gy:gy-0.85,color:CAFE_GUEST_COLORS[i+7],nick:['책과커피','한잔더','에스프레소'][i]},
  ]),
  // 세이지 러그 위 소파 코너: 두 소파 사이 낮은 커피 테이블
  {type:'sofa',gx:76.5,gy:36.8,sk:0.5,color:P.cafeGreen},
  {type:'table',gx:76.5,gy:38.3,low:true},
  {type:'sofa',gx:76.5,gy:39.8,sk:0.5,fl:1,color:P.cafeGreen},
  {type:'cafelamp',gx:78.6,gy:36.8},
  // 작은 갤러리 포인트: 아치 오브제와 커피콩 조각
  {type:'cafeart',gx:78,gy:24,kind:'arch'},
  {type:'cafeart',gx:69.5,gy:40,kind:'bean'},
  {type:'bench',gx:71.5,gy:40.5,sk:0.5},
  // 입구 — 안내데스크
  {type:'desk',gx:33,gy:43.3,act:'info'},
  {type:'merchtable',gx:38,gy:42.5}, // 안내데스크 옆, 입구 정면 통로는 비움
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
// 카페 테이블만 컵·트레이를 올린다. 다른 존의 공용 테이블은 그대로 유지.
for(const d of DECOR)if(d.gx>=62&&d.gy>=24&&['table','longtable'].includes(d.type))d.cafe=true;
/* NPC가 머무는 지점 (소파·테이블·객석 앞) — 공간에 생기 부여 */
const HANGOUTS=[[68,38],[72,38.5],[70,41.5],[26,25.2],[34,25.2],[26,29.2],[34,29.2],
  [21.3,21.2],[38.7,21.2],[68,40],[78.5,40.8],
  [67,7.8],[72.5,7.8],[69.7,28],[65.5,33],[73.8,34.8],[77.8,30.8],
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
  else if(gx>=62&&gx<=80&&gy>=21&&gy<=42){
    const rug=gx>=74&&gx<=79&&gy>=36&&gy<=41;
    fill=rug?P.cafeRug:gy<=27?mix(P.cafeTile,P.cafeWood,chk?0.08:0):mix(P.cafeFloor,P.cafeWood,gx%3===0?0.16:0.04);
  }   // 카페 라운지 러그 (플레이그라운드 아래)
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
