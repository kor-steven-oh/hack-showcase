/* 렌더: 캔버스 셋업 · draw 함수 · 미니맵 · render() */

/* ---------- 캔버스 ---------- */
const cv=document.getElementById('game'),ctx=cv.getContext('2d');
const mm=document.getElementById('minimap'),mmx=mm.getContext('2d');
let W=0,H=0,DPR=Math.min(window.devicePixelRatio||1,2);
let BG=null; // 배경 그라디언트 캐시 — 매 프레임 createLinearGradient 방지
function resize(){W=innerWidth;H=innerHeight;cv.width=W*DPR;cv.height=H*DPR;cv.style.width=W+'px';cv.style.height=H+'px';ctx.setTransform(DPR,0,0,DPR,0,0);BG=null;}
addEventListener('resize',resize);resize();

/* ---------- 그리기 헬퍼 ---------- */
function roundRectPath(x,y,w,h,r){ctx.beginPath();ctx.moveTo(x+r,y);ctx.arcTo(x+w,y,x+w,y+h,r);ctx.arcTo(x+w,y+h,x,y+h,r);ctx.arcTo(x,y+h,x,y,r);ctx.arcTo(x,y,x+w,y,r);ctx.closePath();}
function roundRect(x,y,w,h,r,fill){roundRectPath(x,y,w,h,r);ctx.fillStyle=fill;ctx.fill();}
/* shadowBlur 대체 글로우 — 반투명 테두리 3겹, 패널 fill을 뒤에 그려 안쪽을 덮는다 */
function halo(x,y,w,h,r,color,k){
  roundRectPath(x,y,w,h,r);
  ctx.strokeStyle=hexA(color,0.10+0.13*k);ctx.lineWidth=10;ctx.stroke();
  ctx.strokeStyle=hexA(color,0.15+0.20*k);ctx.lineWidth=5;ctx.stroke();
  ctx.strokeStyle=hexA(color,0.22+0.33*k);ctx.lineWidth=2;ctx.stroke();
}
/* 줄바꿈 계산 — ctx.font 설정 후 호출, 결과는 객체에 캐시해 매 프레임 measureText 방지 */
function wrapLines(txt,maxW,maxLines){
  const chars=[...txt];let line='',lines=[];
  for(const ch of chars){if(ctx.measureText(line+ch).width>maxW){lines.push(line);line=ch;if(lines.length>=maxLines)break;}else line+=ch;}
  if(lines.length<maxLines)lines.push(line);
  if(chars.length>lines.join('').length){const l=lines[maxLines-1];lines[maxLines-1]=l.slice(0,-1)+'…';}
  return lines;
}
function drawLines(lines,x,y,lh){for(let i=0;i<lines.length;i++)ctx.fillText(lines[i],x,y+i*lh);}
let TXTW={}; // 라벨/닉네임 measureText 캐시 — ctx.font 설정 후 호출 (문자열별 폰트가 겹치지 않아 키 충돌 없음)
const txtW=s=>TXTW[s]||(TXTW[s]=ctx.measureText(s).width);
/* 웹폰트(Pretendard) 로드 완료 시 폴백 폰트로 측정/프리렌더된 캐시 무효화 */
if(document.fonts){
  document.fonts.addEventListener('loadingdone',()=>{
    for(const b of BOOTHS)b._lines=null;
    for(const tr of TRACKS)tr._lines=null;
    for(const d of DECOR)if(d.type==='billboard'){d._screen=null;d._bg=null;d._liveTxt=null;}
    ENTR=null;TXTW={};
  });
  document.fonts.load('900 40px Pretendard'); // 캔버스 전용 웨이트 — DOM이 안 쓰면 로드 안 되므로 명시 요청
}

/* ---------- 바닥 사전계산: 색상별 Path2D + 격자 직선 ---------- */
const FLOOR_FILLS=new Map();
for(const f of FLOOR){
  let p=FLOOR_FILLS.get(f.fill);if(!p)FLOOR_FILLS.set(f.fill,p=new Path2D());
  const s=w2s(f.gx,f.gy);
  p.moveTo(s.x,s.y-TH/2);p.lineTo(s.x+TW/2,s.y);p.lineTo(s.x,s.y+TH/2);p.lineTo(s.x-TW/2,s.y);p.closePath();
}
const GRID_PATH=new Path2D(); // 타일 외곽선 = 아이소 격자 직선 2방향 (타일별 stroke 대체)
{
  const g0=0.5,gx1=HALL_W-1.5,gy1=HALL_D-1.5;
  for(let gx=g0;gx<=gx1;gx++){const a=w2s(gx,g0),b=w2s(gx,gy1);GRID_PATH.moveTo(a.x,a.y);GRID_PATH.lineTo(b.x,b.y);}
  for(let gy=g0;gy<=gy1;gy++){const a=w2s(g0,gy),b=w2s(gx1,gy);GRID_PATH.moveTo(a.x,a.y);GRID_PATH.lineTo(b.x,b.y);}
}
/* ---------- 벽 사전계산: Path2D + 그라디언트 1회 생성 ---------- */
for(const w of WALLS){
  const s=w2s(w.gx,w.gy);w.sx=s.x;w.sy=s.y;
  let ax,ay,bx,by;
  if(w.edge==='ul'){ax=s.x-TW/2;ay=s.y;bx=s.x;by=s.y-TH/2;}
  else{ax=s.x;ay=s.y-TH/2;bx=s.x+TW/2;by=s.y;}
  const p=new Path2D();p.moveTo(ax,ay);p.lineTo(bx,by);p.lineTo(bx,by-WALL_H);p.lineTo(ax,ay-WALL_H);p.closePath();w.path=p;
  const g=ctx.createLinearGradient(0,ay-WALL_H,0,ay);
  if(w.edge==='ul'){g.addColorStop(0,P.wallUlA);g.addColorStop(1,P.wallUlB);}
  else{g.addColorStop(0,P.wallA);g.addColorStop(1,P.wallB);}
  w.grad=g;
  const tp=new Path2D();tp.moveTo(ax,ay-WALL_H);tp.lineTo(bx,by-WALL_H);w.topPath=tp;
  w.topStroke=w.acc?hexA(w.acc,0.6):'rgba(77,139,255,0.4)';
}

function drawFloor(){
  for(const [fill,p] of FLOOR_FILLS){ctx.fillStyle=fill;ctx.fill(p);}
  ctx.strokeStyle=P.floorLine;ctx.lineWidth=1;ctx.stroke(GRID_PATH);
  const e=w2s(HALL_W/2,HALL_D-2.3);
  ENTR||(ENTR=makeEntrance()); // shadowBlur 텍스트는 프레임당 비용 큼(특히 Safari/Firefox) — 1회 프리렌더
  ctx.drawImage(ENTR,e.x-ENTR.width/4,e.y-ENTR.height/4,ENTR.width/2,ENTR.height/2);
}
let ENTR=null;
function makeEntrance(){
  const S=2,txt='HELLO AI HACKATHON · EXPO',c=document.createElement('canvas'),g=c.getContext('2d');
  g.font='800 13px Pretendard';
  const w=Math.ceil(g.measureText(txt).width)+48,h=44;
  c.width=w*S;c.height=h*S;g.scale(S,S);
  g.font='800 13px Pretendard';g.textAlign='center';g.textBaseline='middle';
  g.fillStyle=P.entranceInk;g.shadowColor='rgba(61,123,255,0.6)';g.shadowBlur=12;
  g.fillText(txt,w/2,h/2);
  return c;
}

/* 트랙 존 경계 — 벽 대신 공중에 둥둥 떠 있는 반투명 컬러 라인 (카펫 둘레).
   타일 단위 세그먼트로 쪼개 depth 정렬에 편입: 외벽 위에 보이되 부스 패널 뒤에 깔림 */
function drawZoneSeg(s,t){
  if(cull(s.x1,s.y1-40))return;
  const h=38+Math.sin(t*1.2+s.ph)*3; // 부유 애니메이션 — NPC 키(≈37px) 정도 높이
  ctx.lineCap='butt'; // round 캡은 반투명 겹침으로 이음매마다 점이 생김
  ctx.strokeStyle=hexA(s.acc,0.13);ctx.lineWidth=7;
  ctx.beginPath();ctx.moveTo(s.x1,s.y1-h);ctx.lineTo(s.x2,s.y2-h);ctx.stroke();
  ctx.strokeStyle=hexA(s.acc,0.45);ctx.lineWidth=2;
  ctx.beginPath();ctx.moveTo(s.x1,s.y1-h);ctx.lineTo(s.x2,s.y2-h);ctx.stroke();
}

function drawWall(w){
  if(cull(w.sx,w.sy-WALL_H))return;
  ctx.fillStyle=w.grad;ctx.fill(w.path);
  ctx.strokeStyle=w.topStroke;ctx.lineWidth=2;ctx.stroke(w.topPath);
}

function drawBanner(tr){
  const x=tr.sx,y=tr.sy;if(cull(x,y-110))return;
  const acc=tr.accent,H=88,w=32,top=y-H;
  ctx.fillStyle=P.bannerFrame;ctx.fillRect(x-2,y-H,4,H);
  roundRect(x-w/2,top,w,58,4,P.bannerFrame);
  ctx.save();roundRectPath(x-w/2,top,w,58,4);ctx.clip();
  ctx.fillStyle=acc;ctx.fillRect(x-w/2,top,w,22);
  ctx.fillStyle=P.screenBg;ctx.fillRect(x-w/2,top+22,w,36);ctx.restore();
  roundRectPath(x-w/2,top,w,58,4);ctx.strokeStyle=hexA(acc,0.7);ctx.lineWidth=1.5;ctx.stroke();
  ctx.fillStyle='#fff';ctx.font='800 13px Pretendard';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(tr.code,x,top+11);
  ctx.fillStyle=P.ink;ctx.font='700 7px Pretendard';ctx.textBaseline='top';
  tr._lines||(tr._lines=wrapLines(tr.name,w-4,3));
  drawLines(tr._lines,x,top+27,8);
}

/* LED 스크린 내용(텍스트 글로우 포함) 1회 프리렌더 — 매 프레임 shadowBlur 텍스트 제거 */
/* 스크린 본문 텍스트 — 그라디언트+글로우, 폭 넘치면 폰트 자동 축소. g는 스케일 적용된 컨텍스트 */
function drawScreenText(g,d,text){
  const w=d.w,h=d.h||110,acc=d.color;
  const tg=g.createLinearGradient(w/2-w*0.36,0,w/2+w*0.36,0);
  tg.addColorStop(0,acc);tg.addColorStop(.5,'#ffffff');tg.addColorStop(1,acc);
  let fs=d.fs;g.font='900 '+fs+'px Pretendard, sans-serif';
  while(fs>16&&g.measureText(text).width>w-32){fs-=2;g.font='900 '+fs+'px Pretendard, sans-serif';}
  g.shadowColor=hexA(acc,0.85);g.shadowBlur=22;
  g.fillStyle=tg;g.textAlign='center';g.textBaseline='middle';
  g.fillText(text,w/2,h/2-8);g.shadowBlur=0;
}
function makeBillboardScreen(d,text){
  const w=d.w,h=d.h||110,S=2,c=document.createElement('canvas');
  c.width=w*S;c.height=h*S;
  const g=c.getContext('2d');g.scale(S,S);
  g.beginPath();g.moveTo(10,0);g.arcTo(w,0,w,h,10);g.arcTo(w,h,0,h,10);g.arcTo(0,h,0,0,10);g.arcTo(0,0,w,0,10);g.closePath();g.clip();
  g.fillStyle='#0b1024';g.fillRect(0,0,w,h);
  const acc=d.color;
  drawScreenText(g,d,text);
  g.fillStyle=hexA(acc,0.9);g.font='700 11px Pretendard';g.fillText(d.sub,w/2,h-20);
  g.fillStyle=hexA(acc,0.05);for(let i=0;i<h;i+=4)g.fillRect(0,i,w,2);
  return c;
}
/* 타자기 효과 — 글자 타이핑으로 생기고 백스페이스로 지워짐. 상태는 d._tw에 유지 */
function typedText(d,list,t){
  const s=d._tw||(d._tw={i:0,n:0,ph:0,t0:t}); // ph: 0 타이핑, 1 유지, 2 삭제
  if(t-s.t0>6)s.t0=t; // 탭 복귀 등 시간 점프 보호
  const chars=[...list[s.i%list.length]];
  if(s.n>chars.length)s.n=chars.length; // 노트 목록이 런타임에 바뀐 경우
  const DUR=ph=>ph===1?3:ph===2?0.04:0.07;
  while(t-s.t0>=DUR(s.ph)){
    s.t0+=DUR(s.ph);
    if(s.ph===0){if(++s.n>=chars.length)s.ph=1;}
    else if(s.ph===1)s.ph=2;
    else if(--s.n<=0){s.n=0;s.ph=0;s.i=(s.i+1)%list.length;break;}
  }
  const cur=s.ph===1?(Math.floor(t*2)%2?'▌':' '):'▌'; // 유지 중엔 깜빡, 타이핑/삭제 중엔 고정
  return chars.slice(0,s.n).join('')+cur;
}
/* cycle/notes: 타자기 애니메이션 — 표시 문자열이 바뀐 프레임에만 재렌더(초당 ~15회), 그 외엔 캐시 재사용 */
function billboardScreen(d,t){
  const list=d.notes?(typeof ideaNotes!=='undefined'&&ideaNotes.length?ideaNotes:null):d.cycle;
  if(!list)return d._screen||(d._screen=makeBillboardScreen(d,d.text));
  const txt=typedText(d,list,t);
  if(d._liveTxt!==txt){
    d._liveTxt=txt;
    const w=d.w,h=d.h||110,S=2;
    if(!d._live){d._live=document.createElement('canvas');d._live.width=w*S;d._live.height=h*S;}
    d._bg||(d._bg=makeBillboardScreen(d,'')); // 텍스트 없는 배경(서브·스캔라인 포함)
    const g=d._live.getContext('2d');
    g.setTransform(S,0,0,S,0,0);g.clearRect(0,0,w,h);
    g.drawImage(d._bg,0,0,w,h);
    drawScreenText(g,d,txt);
  }
  return d._live;
}

function drawBillboard(d,t){
  const x=d.sx,y=d.sy,h=d.h||110;if(cull(x,y-104-h))return;
  const w=d.w,top=-64-h,acc=d.color;
  const dir=d.face==='ul'?-1:1,k=dir*0.5; // 아이소 벽면 기울기 (ur: ↘, ul: ↗)
  const D=12,dD=dir*D; // isobox 두께 — 셰어 로컬좌표에서 안쪽 오프셋 = (dir*D, -D)
  ctx.save();ctx.translate(x,y);ctx.transform(1,k,0,1,0,0);
  ctx.fillStyle=P.bannerFrame;ctx.fillRect(-w/2+18,-64,8,64);ctx.fillRect(w/2-26,-64,8,64);
  // 캐비닛 옆면·윗면 (isoBox 3면 셰이딩과 동일 규칙: 옆 어둡게, 위 밝게)
  ctx.fillStyle=mix('#0b1024','#000000',0.4);
  ctx.beginPath();ctx.moveTo(dir*w/2,top);ctx.lineTo(dir*w/2+dD,top-D);ctx.lineTo(dir*w/2+dD,top+h-D);ctx.lineTo(dir*w/2,top+h);ctx.closePath();ctx.fill();
  ctx.fillStyle=mix('#0b1024','#ffffff',0.18);
  ctx.beginPath();ctx.moveTo(-w/2,top);ctx.lineTo(w/2,top);ctx.lineTo(w/2+dD,top-D);ctx.lineTo(-w/2+dD,top-D);ctx.closePath();ctx.fill();
  halo(-w/2,top,w,h,10,acc,0.8);
  roundRect(-w/2,top,w,h,10,'#0b1024');   // LED 스크린은 테마 무관 다크
  const pulse=0.75+0.25*Math.sin(t*1.8+d.gx);
  ctx.globalAlpha=0.72+0.28*pulse;
  ctx.drawImage(billboardScreen(d,t),-w/2,top,w,h);
  ctx.globalAlpha=1;
  roundRectPath(-w/2,top,w,h,10);ctx.strokeStyle=hexA(acc,0.8);ctx.lineWidth=2;ctx.stroke();
  ctx.restore();
}

/* 상호작용 말풍선 (E/Space 안내) — 부스 외 스팟 공용 */
const ACT_TXT={game:'게임하기',idea:'메시지 남기기',info:'안내 보기',ranking:'랭킹·투표 보기'};
const ACT_CLR={idea:'#21a17a',info:'#1428a0',ranking:'#e0533f'};
function actBubble(x,yTop,act,t,color,click){
  const py=yTop-Math.sin(t*3)*2,c=color||ACT_CLR[act]||'#1428a0';
  const label='▶ '+ACT_TXT[act]+' · '+(click?'클릭':'Space');
  ctx.font='700 12px Pretendard';const lw=txtW(label)+22;
  roundRect(x-lw/2,py-12,lw,24,12,c);ctx.fillStyle='#fff';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(label,x,py);
  ctx.beginPath();ctx.moveTo(x-5,py+12);ctx.lineTo(x+5,py+12);ctx.lineTo(x,py+18);ctx.closePath();ctx.fillStyle=c;ctx.fill();
}

/* 아이소 축 정렬 박스 — dir=1: gx축, dir=-1: gy축. 윗면·앞면·끝면 3면 셰이딩으로 입체감. c는 hex */
function isoBox(cx,cy,hw,hd,h,dir,c){
  const ax=cx-dir*(hw-hd),ay=cy-0.5*(hw+hd), bx=cx+dir*(hw+hd),by=cy+0.5*(hw-hd),
        qx=cx+dir*(hw-hd),qy=cy+0.5*(hw+hd), dx=cx-dir*(hw+hd),dy=cy-0.5*(hw-hd);
  ctx.fillStyle=c;ctx.beginPath();ctx.moveTo(dx,dy-h);ctx.lineTo(qx,qy-h);ctx.lineTo(qx,qy);ctx.lineTo(dx,dy);ctx.closePath();ctx.fill();
  ctx.fillStyle=mix(c,'#000000',0.24);ctx.beginPath();ctx.moveTo(bx,by-h);ctx.lineTo(qx,qy-h);ctx.lineTo(qx,qy);ctx.lineTo(bx,by);ctx.closePath();ctx.fill();
  ctx.fillStyle=mix(c,'#ffffff',0.14);ctx.beginPath();ctx.moveTo(ax,ay-h);ctx.lineTo(bx,by-h);ctx.lineTo(qx,qy-h);ctx.lineTo(dx,dy-h);ctx.closePath();ctx.fill();
}
/* 로컬 축 오프셋: du=길이축(u), dv=깊이축(v, +v=시청자 쪽) */
const isoO=(x,y,dir)=>(du,dv)=>[x+dir*(du-dv),y+0.5*(du+dv)];
/* isoBox 발자국 모양 그림자 — 바닥 평행사변형. hw/hd/dir은 isoBox와 동일 축, 여유분 포함해 전달 */
function shadowIso(cx,cy,hw,hd,dir){
  ctx.fillStyle=P.charShadow;ctx.beginPath();
  ctx.moveTo(cx-dir*(hw-hd),cy-0.5*(hw+hd));
  ctx.lineTo(cx+dir*(hw+hd),cy+0.5*(hw-hd));
  ctx.lineTo(cx+dir*(hw-hd),cy+0.5*(hw+hd));
  ctx.lineTo(cx-dir*(hw+hd),cy-0.5*(hw-hd));
  ctx.closePath();ctx.fill();
}

function drawSofa(d){
  const x=d.sx,y=d.sy;if(cull(x,y-46))return;
  // fl: 등받이를 시청자 쪽(+v)에 — 마주보는 배치에서 반대편 소파용 (뒷모습으로 보임)
  const c=d.color||'#3f5fae',dir=(d.sk||0.5)<0?-1:1,s=d.fl?-1:1,o=isoO(x,y,dir);
  shadowIso(x,y,32,13,dir);
  // 등받이 앞면에 좌판·팔걸이 뒷면을 정확히 맞댐 (dv ±3.5 ~ ±9.5)
  const back=()=>{const[bx,by]=o(0,-7*s);isoBox(bx,by,28.5,3.5,26,dir,c);};
  if(s>0)back();                                                 // 등받이가 먼쪽이면 먼저
  const[fx,fy]=o(-24,3*s);isoBox(fx,fy,4.5,6.5,17,dir,c);        // 팔걸이(먼쪽)
  const[sx,sy]=o(0,3*s);isoBox(sx,sy,19.5,6.5,11,dir,c);         // 좌판
  const[nx,ny]=o(24,3*s);isoBox(nx,ny,4.5,6.5,17,dir,c);         // 팔걸이(가까운쪽)
  if(d.cushion){const[a,b]=o(13,0);isoBox(a,b-11,5,3,8,dir,P.cafeCream);}
  if(s<0)back();                                                 // 등받이가 가까운쪽이면 마지막
  else{const m1=o(0,-3.5),m2=o(0,9.5);
    ctx.strokeStyle='rgba(0,0,0,0.22)';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(m1[0],m1[1]-11);ctx.lineTo(m2[0],m2[1]-11);ctx.stroke();} // 쿠션 이음선
}

function drawTable(d){
  const x=d.sx,y=d.sy;if(cull(x,y-40))return;
  ctx.save();if(d.low){ctx.translate(0,y*0.4);ctx.scale(1,0.6);}
  ctx.save();ctx.translate(x,y);ctx.scale(1,0.5);ctx.fillStyle=P.charShadow;ctx.beginPath();ctx.arc(0,0,16,0,Math.PI*2);ctx.fill();ctx.restore();
  ctx.save();ctx.translate(x,y);ctx.scale(1,0.5);ctx.fillStyle='#4e3520';ctx.beginPath();ctx.arc(0,0,6,0,Math.PI*2);ctx.fill();ctx.restore(); // 받침
  ctx.fillStyle='#6b4f36';ctx.fillRect(x-2.5,y-24,5,24);
  ctx.save();ctx.translate(x,y-22);ctx.scale(1,0.5);ctx.fillStyle='#7b5636';ctx.beginPath();ctx.arc(0,0,17,0,Math.PI*2);ctx.fill();ctx.restore(); // 상판 옆면(두께)
  ctx.save();ctx.translate(x,y-26);ctx.scale(1,0.5);
  ctx.fillStyle='#a97c50';ctx.beginPath();ctx.arc(0,0,17,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='rgba(255,255,255,0.15)';ctx.beginPath();ctx.arc(0,-2,13,0,Math.PI*2);ctx.fill();
  ctx.restore();
  if(d.cafe)drawCoffee(x,y-27);
  ctx.restore();
}

function drawBoard(d,t){
  const x=d.sx,y=d.sy;if(cull(x,y-130))return;
  const w=150,h=88,top=y-24-h;
  const hot=d===activeSpot||d===hoverSpot;
  ctx.fillStyle=P.bannerFrame;ctx.fillRect(x-w/2+10,y-24,6,24);ctx.fillRect(x+w/2-16,y-24,6,24);
  if(hot)halo(x-w/2-4,top-4,w+8,h+8,6,ACT_CLR[d.act]||'#1428a0',d===hoverSpot?1:0.7);
  roundRect(x-w/2-4,top-4,w+8,h+8,6,P.bannerFrame);
  roundRect(x-w/2,top,w,h,4,'#f2efe6');
  const ranking=d.act==='ranking';
  ctx.fillStyle='#1428a0';ctx.font='800 11px Pretendard';ctx.textAlign='left';ctx.textBaseline='top';
  ctx.fillText(ranking?'TEAM RANKING · 실시간 투표':'MESSAGE WALL · 메시지 월',x-w/2+8,top+7);
  if(ranking){
    for(let i=0;i<4;i++){
      const yy=top+27+i*14;
      ctx.fillStyle=i===0?'#e6b24d':'#6675a0';ctx.font='800 10px Pretendard';ctx.fillText(String(i+1),x-w/2+12,yy);
      ctx.fillStyle='#dbe1ec';ctx.fillRect(x-w/2+28,yy+1,82-i*8,7);
      ctx.fillStyle='#e0533f';ctx.fillText('♥',x+w/2-22,yy-2);
    }
  }else{
    const NC=['#ffd166','#8ce99a','#74c0fc','#ffa8a8','#e599f7'];
    for(let i=0;i<12;i++){const nx=x-w/2+10+(i%4)*34,ny=top+26+((i/4)|0)*20;
      ctx.fillStyle=NC[(i*7+Math.floor(d.gx))%5];ctx.fillRect(nx,ny,26,15); // gx가 소수여도 유효 인덱스
      ctx.strokeStyle='rgba(0,0,0,0.25)';ctx.lineWidth=1;
      ctx.beginPath();ctx.moveTo(nx+4,ny+6);ctx.lineTo(nx+20,ny+6);ctx.moveTo(nx+4,ny+10);ctx.lineTo(nx+14,ny+10);ctx.stroke();
    }
  }
  if(hot)actBubble(x,top-16,d.act,t,null,d===hoverSpot);
}

function drawChair(d){
  const x=d.sx,y=d.sy;if(cull(x,y-36))return;
  // fl: 등받이를 +u 끝으로 — 반대 방향 착석(마주 앉기)
  const dir=(d.sk||0.5)<0?-1:1,s=d.fl?-1:1,o=isoO(x,y,dir);
  shadowIso(x,y,11,8,dir);
  ctx.fillStyle='#4e3520';
  for(const[du,dv]of[[-6,-4],[6,-4],[-6,5],[6,5]]){const[lx,ly]=o(du,dv);ctx.fillRect(lx-1.5,ly-9,3,9);}
  const[sx,sy]=o(0,0);isoBox(sx,sy-9,8,6,3.5,dir,'#8a5a3a');       // 좌판(다리 위)
  const[bx,by]=o(-8*s,0);isoBox(bx,by-9,2,6,17,dir,'#8a5a3a');     // 등받이
}

function drawLongtable(d){ // 긴 테이블 — 아이소 축 정렬, 양쪽 착석용
  const x=d.sx,y=d.sy;if(cull(x,y-40))return;
  const dir=(d.sk||0.5)<0?-1:1,o=isoO(x,y,dir);
  const hw=d.lounge!==undefined?68:38,hd=d.lounge!==undefined?28:9;
  shadowIso(x,y,hw+4,hd+4,dir);
  ctx.fillStyle='#6b4f36';
  for(const[du,dv]of[[-hw+6,-hd+3],[-hw+6,hd-3],[hw-6,-hd+3],[hw-6,hd-3]]){const[lx,ly]=o(du,dv);ctx.fillRect(lx-2,ly-19,4,19);}
  isoBox(x,y-19,hw,hd,5,dir,'#a97c50'); // 상판(다리 위)
  if(d.cafe){const[a,b]=o(-19,0),[c,e]=o(19,0);drawCoffee(a,b-25);drawCoffee(c,e-25);}
  if(d.lounge!==undefined)drawLoungeProps(x,y-25,dir,d.lounge);
}

// 트랙 라운지 소품: 상판 위 좌표로 그려 가구와 함께 깊이 정렬한다.
function drawLoungeProps(x,y,dir,track){
  const o=isoO(x,y,dir),c=TRACKS[track].accent;
  // 서로 마주 보는 두 줄, 각 3대. 먼쪽 노트북은 화면 뒷면이 보인다.
  for(const dv of [-16,16])for(const du of [-40,0,40]){
    const[lx,ly]=o(du,dv),[sx,sy]=o(du,dv+(dv<0?5:-5));
    isoBox(lx,ly,10,6,1,dir,P.cafeMetal);
    ctx.save();ctx.translate(sx,sy-1);ctx.transform(1,0.5*dir,0,1,0,0);
    roundRect(-10,-15,20,15,2,dv<0?P.cafeMetal:P.cafeMenu);
    ctx.fillStyle=dv<0?P.cafeCream:c;
    if(dv<0){ctx.beginPath();ctx.arc(0,-8,2,0,Math.PI*2);ctx.fill();}
    else{ctx.fillRect(-7,-12,14,2);ctx.fillRect(-7,-8,9,1);ctx.fillRect(-7,-4,11,1);}
    ctx.restore();
  }
}

function drawSideTable(d){
  const x=d.sx,y=d.sy;if(cull(x,y-40))return;
  shadowIso(x,y,13,10,1);
  isoBox(x,y,6,5,14,1,P.cafeWood);
  isoBox(x,y-14,12,9,3,1,P.cafeCream);
  if(d.track%2===0)drawCoffee(x,y-18);
  else{
    isoBox(x,y-17,4,3,6,1,P.cafePot);
    ctx.strokeStyle=P.cafeGreen;ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(x,y-23);ctx.lineTo(x,y-34);ctx.stroke();
    ctx.fillStyle=P.cafeGreen;ctx.beginPath();ctx.ellipse(x-4,y-30,5,2,0.5,0,Math.PI*2);ctx.ellipse(x+4,y-34,5,2,-0.5,0,Math.PI*2);ctx.fill();
  }
}

function drawLoungeCabinet(d){
  const x=d.sx,y=d.sy;if(cull(x,y-80))return;
  const c=TRACKS[d.track].accent,o=isoO(x,y,1),books=d.track>=3;
  shadowIso(x,y,29,12,1);
  if(books){
    isoBox(x,y,26,9,43,1,P.cafeWood);
    const[fx,fy]=o(0,9);
    ctx.save();ctx.translate(fx,fy);ctx.transform(1,0.5,0,1,0,0);
    ctx.fillStyle=P.cafeMenu;ctx.fillRect(-23,-39,46,34);
    for(let row=0;row<2;row++)for(let k=0;k<7;k++){
      const h=10+(k*3+row)%5,xx=-20+k*6,yy=-7-row*17;
      ctx.fillStyle=[c,P.cafeCream,P.cafePot,P.cafeMetal][(k+row)%4];ctx.fillRect(xx,yy-h,4,h);
      ctx.fillStyle=P.cafeCream;ctx.fillRect(xx+1,yy-h+3,2,1);
    }
    ctx.fillStyle=P.cafeWood;ctx.fillRect(-24,-23,48,3);ctx.restore();
    // 책장 위 눕혀 둔 자료집
    isoBox(x,y-43,10,6,2,1,c);isoBox(x,y-45,9,5,1,1,P.cafeCream);
  }else{
    isoBox(x,y,26,9,20,1,P.cafeMetal);isoBox(x,y-20,29,12,3,1,P.cafeCream);
    if(d.track===0){ // 오실로스코프: 파형 화면과 조작 다이얼
      isoBox(x,y-23,18,7,23,1,P.cafeMetal);
      const[fx,fy]=o(0,7);ctx.save();ctx.translate(fx,fy-23);ctx.transform(1,0.5,0,1,0,0);
      ctx.fillStyle=P.cafeMenu;ctx.fillRect(-15,-20,22,16);
      ctx.strokeStyle=c;ctx.lineWidth=1.5;ctx.beginPath();
      for(let j=0;j<=18;j++){const yy=-12+Math.sin(j*0.65)*4;j?ctx.lineTo(-13+j,yy):ctx.moveTo(-13+j,yy);}ctx.stroke();
      ctx.fillStyle=P.cafeCream;for(const yy of [-16,-7]){ctx.beginPath();ctx.arc(12,yy,2.5,0,Math.PI*2);ctx.fill();}ctx.restore();
    }else if(d.track===1){ // 품질 검사 현미경: 받침, 재물대, 대물렌즈, 접안부
      isoBox(x,y-23,14,8,3,1,P.cafeMetal);
      isoBox(x+8,y-26,3,3,28,1,c);
      isoBox(x,y-36,11,6,2,1,P.cafeMenu);
      isoBox(x,y-38,3,3,14,1,P.cafeMetal);
      isoBox(x+3,y-52,8,4,4,1,c);
      isoBox(x-5,y-54,3,3,7,1,P.cafeMenu);
      isoBox(x,y-38,5,3,1,1,P.cafeGlassEdge);
    }else{ // 설비 진단 스테이션: 제어함과 소형 센서
      const[a,b]=o(-10,0);isoBox(a,b-23,10,7,24,1,P.cafeMenu);
      const[fx,fy]=o(-10,7);ctx.save();ctx.translate(fx,fy-23);ctx.transform(1,0.5,0,1,0,0);
      ctx.fillStyle=c;ctx.fillRect(-7,-20,14,7);ctx.fillStyle=P.cafeCream;
      for(let j=0;j<3;j++)ctx.fillRect(-6+j*5,-8,2,2);ctx.restore();
      const[a2,b2]=o(17,0);isoBox(a2,b2-23,5,5,7,1,P.cafeMetal);isoBox(a2,b2-30,2,2,12,1,c);
      ctx.strokeStyle=P.cafeCoffee;ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(a+8,b-24);ctx.quadraticCurveTo(x+6,y-10,a2,b2-23);ctx.stroke();
    }
  }
}

function drawTaskBoard(d){
  const x=d.sx,y=d.sy;if(cull(x,y-110))return;
  const c=TRACKS[d.track].accent,dir=d.sk<0?-1:1,o=isoO(x,y,dir);
  ctx.save();ctx.translate(x,y);ctx.scale(2/3,2/3);ctx.translate(-x,-y);
  shadowIso(x,y,67,12,dir);
  // 소파와 같은 바닥 축을 따르는 받침과 두께 있는 프레임.
  for(const u of [-53,53]){
    const[a,b]=o(u,0);isoBox(a,b,3,10,3,dir,P.cafeMetal);
    isoBox(a,b-3,2,2,28,dir,P.cafeWood);
  }
  isoBox(x,y-30,66,3,64,dir,P.cafeWood);
  const[fx,fy]=o(0,3);
  ctx.save();ctx.translate(fx,fy);ctx.transform(1,0.5*dir,0,1,0,0);
  roundRect(-63,-91,126,58,2,P.cafeCream);
  ctx.textAlign='center';ctx.textBaseline='middle';ctx.font='800 7px Pretendard';
  ctx.fillStyle=P.cafeMenu;ctx.fillText(TRACKS[d.track].code+' · SPRINT BOARD',0,-82);
  const tasks=LOUNGE_ACTIVITY[d.track].tasks;
  for(let k=0;k<3;k++){
    const xx=-42+k*42;
    ctx.fillStyle=P.cafeMenu;ctx.font='700 7px Pretendard';ctx.fillText(['TODO','DOING','DONE'][k],xx,-68);
    roundRect(xx-19,-61,38,21,2,k===1?c:P.cafeMetal);
    ctx.fillStyle=P.cafeCream;ctx.font='700 7px Pretendard';ctx.fillText(tasks[k],xx,-50);
  }
  ctx.restore();
  ctx.restore();
}

function drawLoungeChat(){
  const d=loungeChat.speaker;if(!d||cull(d.sx,d.sy-100))return;
  const x=d.sx,y=d.sy-82;
  ctx.font='600 11px Pretendard';const w=txtW(loungeChat.text)+22;
  roundRect(x-w/2,y-17,w,27,8,P.panel);
  ctx.strokeStyle=TRACKS[d.track].accent;ctx.lineWidth=1;roundRectPath(x-w/2,y-17,w,27,8);ctx.stroke();
  ctx.fillStyle=P.panel;ctx.beginPath();ctx.moveTo(x-4,y+10);ctx.lineTo(x,y+16);ctx.lineTo(x+4,y+10);ctx.fill();
  ctx.fillStyle=P.ink;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(loungeChat.text,x,y-3);
}

function drawBag(d){
  const x=d.sx,y=d.sy;if(cull(x,y-25))return;
  const c=TRACKS[d.track].accent;
  shadowIso(x,y,10,7,1);
  ctx.strokeStyle=P.cafeWood;ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(x+4,y-11,6,9,0.2,0,Math.PI*2);ctx.stroke();
  isoBox(x,y,7,5,17,1,c);isoBox(x-4,y+2,5,2,9,1,P.cafeMenu);
  ctx.strokeStyle=P.cafeCream;ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(x-8,y-6);ctx.lineTo(x,y-2);ctx.stroke();
  ctx.strokeStyle=P.cafeMenu;ctx.lineWidth=2;ctx.beginPath();ctx.arc(x,y-17,3,Math.PI,0);ctx.stroke();
}

function drawMerchTable(d){
  const x=d.sx,y=d.sy;if(cull(x,y-100))return;
  const o=isoO(x,y,1);
  shadowIso(x,y,58,18,1);
  ctx.fillStyle=P.cafeWood;
  for(const[du,dv]of[[-46,-10],[46,-10],[-46,10],[46,10]]){const[a,b]=o(du,dv);ctx.fillRect(a-2,b-25,4,25);}
  isoBox(x,y-25,53,15,4,1,P.cafeCream);
  // 다섯 트랙 스티커가 담긴 낮은 트레이
  const[tx,ty]=o(-26,0);isoBox(tx,ty-29,22,10,2,1,P.cafeWood);
  for(let i=0;i<5;i++){
    const[a,b]=o(-43+i*8,0);isoBox(a,b-31,3,5,1,1,P.cafeCream);
    ctx.fillStyle=TRACKS[i].accent;ctx.beginPath();ctx.ellipse(a,b-33,2.5,1.5,0,0,Math.PI*2);ctx.fill();
  }
  // 접어 둔 티셔츠와 손잡이가 보이는 에코백
  const[fx,fy]=o(10,0);isoBox(fx,fy-29,10,8,4,1,P.cafeGreen);isoBox(fx,fy-33,10,8,3,1,P.cafeCream);
  ctx.fillStyle=P.cafeGreen;ctx.font='800 6px Pretendard';ctx.textAlign='center';ctx.fillText('AI',fx,fy-38);
  const[bx,by]=o(37,0);isoBox(bx,by-29,8,5,15,1,P.cafeCream);
  ctx.strokeStyle=P.cafeWood;ctx.lineWidth=1.5;ctx.beginPath();ctx.arc(bx,by-45,5,Math.PI,0);ctx.stroke();
  // 테이블 아래 여분의 굿즈 상자
  const[cx,cy]=o(22,2);isoBox(cx,cy,12,8,13,1,P.cafeWood);
  ctx.fillStyle=P.cafeCream;ctx.fillRect(cx-2,cy-13,4,9);
  roundRect(x-60,y-88,120,20,4,P.cafeMenu);
  ctx.fillStyle=P.cafeCream;ctx.font='800 10px Pretendard';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('GOODS & STICKERS',x,y-78);
}

function drawSnackTable(d){
  const x=d.sx,y=d.sy;if(cull(x,y-64))return;
  const c=TRACKS[d.track].accent,o=isoO(x,y,1);
  shadowIso(x,y,32,15,1);
  ctx.fillStyle=P.cafeWood;
  for(const[du,dv]of[[-24,-8],[24,-8],[-24,8],[24,8]]){
    const[a,b]=o(du,dv);ctx.fillRect(a-2,b-24,4,24);
  }
  // 하단 선반에는 여분의 간식 상자, 상판은 밝은 트레이 테이블
  isoBox(x,y-6,27,11,2,1,P.cafeWood);
  const[bx,by]=o(5,1);isoBox(bx,by-8,12,7,9,1,c);
  isoBox(x,y-23,30,13,3,1,P.cafeCream);
  const[tx,ty]=o(-15,1);isoBox(tx,ty-26,12,9,2,1,P.cafeWood);
  // 존마다 쿠키 / 도넛 / 과일 트레이를 섞는다.
  for(const[du,dv]of[[-21,-3],[-11,-3],[-21,5],[-11,5]]){
    const[a,b]=o(du,dv),yy=b-30;
    ctx.fillStyle=d.track%3===2?P.cafePot:P.cafeWood;
    ctx.beginPath();ctx.ellipse(a,yy,4,2.7,0,0,Math.PI*2);ctx.fill();
    if(d.track%3===0){
      ctx.fillStyle=P.cafeCoffee;ctx.fillRect(a-2,yy-1,1,1);ctx.fillRect(a+1,yy,1,1);
    }else if(d.track%3===1){
      ctx.fillStyle=P.cafeCream;ctx.beginPath();ctx.ellipse(a,yy,1.4,1,0,0,Math.PI*2);ctx.fill();
    }else{
      ctx.fillStyle=P.cafeGreen;ctx.beginPath();ctx.ellipse(a+1,yy-3,2,1,-0.5,0,Math.PI*2);ctx.fill();
    }
  }
  // 밀봉 스낵과 물병·음료캔 — 작업 장비와 분리된 셀프 서비스 공간
  for(const u of [3,11]){
    const[a,b]=o(u,-5);isoBox(a,b-26,3,2,10,1,u===3?c:P.cafePot);
    ctx.fillStyle=P.cafeCream;ctx.fillRect(a-2,b-33,4,2);
  }
  for(const u of [16,24]){
    const[a,b]=o(u,5);
    roundRect(a-3,b-39,6,13,2,P.cafeGlass);
    ctx.strokeStyle=P.cafeGlassEdge;ctx.lineWidth=1;roundRectPath(a-3,b-39,6,13,2);ctx.stroke();
    ctx.fillStyle=c;ctx.fillRect(a-3,b-42,6,3);ctx.fillRect(a-3,b-33,6,4);
  }
  const[fx,fy]=o(0,13);
  ctx.save();ctx.translate(fx,fy-18);ctx.transform(1,0.5,0,1,0,0);
  roundRect(-23,-5,46,10,2,c);ctx.fillStyle=P.cafeCream;ctx.font='700 7px Pretendard';
  ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('SNACK BREAK',0,0);ctx.restore();
}

function drawTrackArt(d){
  const x=d.sx,y=d.sy;if(cull(x,y-65))return;
  const c=TRACKS[d.track].accent;
  shadowIso(x,y,18,13,1);isoBox(x,y,15,11,15,1,P.cafeCream);
  const base=y-17;
  ctx.save();ctx.translate(x,base);
  if(d.track===0){ // 칩: 패키지 주변 핀과 다이
    ctx.strokeStyle=P.cafeMetal;ctx.lineWidth=2;
    for(let i=-9;i<=9;i+=6){ctx.beginPath();ctx.moveTo(i,-34);ctx.lineTo(i,-4);ctx.moveTo(-16,i-19);ctx.lineTo(16,i-19);ctx.stroke();}
    roundRect(-12,-30,24,23,3,P.cafeMenu);roundRect(-7,-25,14,13,2,c);
  }else if(d.track===1){ // 웨이퍼: 둥근 기판 위 다이 격자
    ctx.fillStyle=c;ctx.beginPath();ctx.ellipse(0,-21,17,20,-0.25,0,Math.PI*2);ctx.fill();
    ctx.save();ctx.clip();ctx.strokeStyle=P.cafeCream;ctx.lineWidth=0.7;
    for(let i=-24;i<=24;i+=7){ctx.beginPath();ctx.moveTo(i,-44);ctx.lineTo(i,0);ctx.moveTo(-22,i-21);ctx.lineTo(22,i-21);ctx.stroke();}ctx.restore();
  }else if(d.track===2){ // 로봇 팔: 관절과 집게
    isoBox(0,0,10,7,5,1,P.cafeMetal);
    ctx.strokeStyle=c;ctx.lineWidth=7;ctx.lineJoin='round';ctx.beginPath();ctx.moveTo(0,-5);ctx.lineTo(-8,-21);ctx.lineTo(6,-34);ctx.lineTo(15,-24);ctx.stroke();
    ctx.fillStyle=P.cafeMetal;for(const[a,b]of[[0,-5],[-8,-21],[6,-34]]){ctx.beginPath();ctx.arc(a,b,4,0,Math.PI*2);ctx.fill();}
    ctx.strokeStyle=P.cafeMenu;ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(11,-22);ctx.lineTo(11,-16);ctx.moveTo(18,-24);ctx.lineTo(21,-18);ctx.stroke();
  }else if(d.track===3){ // 사람: 서로를 향한 두 추상 인물
    for(const[a,b,col]of[[-8,-7,c],[9,-3,P.cafeWood]]){roundRect(a-5,b-19,10,19,5,col);ctx.fillStyle=col;ctx.beginPath();ctx.arc(a,b-26,6,0,Math.PI*2);ctx.fill();}
  }else{ // 개발: 코드 괄호 조각
    ctx.strokeStyle=c;ctx.lineWidth=5;ctx.lineJoin='round';ctx.beginPath();ctx.moveTo(-7,-33);ctx.lineTo(-18,-21);ctx.lineTo(-7,-9);ctx.moveTo(7,-33);ctx.lineTo(18,-21);ctx.lineTo(7,-9);ctx.stroke();
    ctx.strokeStyle=P.cafeMetal;ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(4,-36);ctx.lineTo(-4,-6);ctx.stroke();
  }
  ctx.restore();
}

// 카페 소품은 기존 깊이 정렬에 참여하는 정적 도형으로 그린다.
function drawCoffee(x,y){
  ctx.fillStyle=P.cafeCream;ctx.beginPath();ctx.ellipse(x,y,8,3,0,0,Math.PI*2);ctx.fill();
  roundRect(x-4,y-8,8,8,2,P.cafeCream);
  ctx.strokeStyle=P.cafeCream;ctx.lineWidth=1.5;ctx.beginPath();ctx.arc(x+4,y-5,2.5,-Math.PI/2,Math.PI/2);ctx.stroke();
  ctx.fillStyle=P.cafeWood;ctx.beginPath();ctx.ellipse(x,y-8,3,1.5,0,0,Math.PI*2);ctx.fill();
}

function drawPlant(d){
  const x=d.sx,y=d.sy;if(cull(x,y-60))return;
  ctx.save();ctx.translate(x,y);ctx.scale(0.58,0.58);ctx.translate(-x,-y);
  shadowIso(x,y,14,11,1);
  isoBox(x,y,10,8,15,1,P.cafePot);
  ctx.fillStyle=P.cafeMenu;ctx.beginPath();ctx.ellipse(x,y-16,11,5,0,0,Math.PI*2);ctx.fill();
  ctx.strokeStyle=P.cafeGreen;ctx.lineWidth=2;
  for(const[dx,dy]of[[-13,-35],[12,-42],[-9,-51],[6,-59],[17,-28]]){
    ctx.beginPath();ctx.moveTo(x,y-16);ctx.quadraticCurveTo(x,y+dy,x+dx,y+dy);ctx.stroke();
    ctx.fillStyle=dx<0?P.cafeGreen:P.cafeLeaf;
    ctx.beginPath();ctx.ellipse(x+dx,y+dy,9,4,dx<0?0.6:-0.6,0,Math.PI*2);ctx.fill();
  }
  ctx.restore();
}

function drawCafeMenu(d){
  const x=d.sx,y=d.sy;if(cull(x,y-82))return;
  shadowIso(x,y,30,10,1);
  ctx.strokeStyle=P.cafeWood;ctx.lineWidth=4;
  ctx.beginPath();ctx.moveTo(x-24,y);ctx.lineTo(x-20,y-74);ctx.lineTo(x+20,y-74);ctx.lineTo(x+27,y);ctx.stroke();
  roundRect(x-31,y-78,62,66,3,P.cafeWood);
  roundRect(x-28,y-75,56,60,2,P.cafeMenu);
  ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle=P.cafeCream;
  ctx.font='800 12px Pretendard';ctx.fillText('COFFEE',x,y-61);
  ctx.font='500 9px Pretendard';ctx.fillText('커피 한 잔의 여유',x,y-46);
  ctx.fillText('Americano',x,y-32);ctx.fillText('Latte · Cookie',x,y-21);
}

function drawCafeArt(d){
  const x=d.sx,y=d.sy;if(cull(x,y-90))return;
  shadowIso(x,y,22,17,1);
  isoBox(x,y,19,14,17,1,P.cafeCream);
  if(d.kind==='arch'){
    // 작은 테라코타 아치: 열린 가운데로 배경이 보이는 조각
    ctx.strokeStyle=P.cafeWood;ctx.lineWidth=12;
    ctx.beginPath();ctx.moveTo(x-14,y-23);ctx.lineTo(x-14,y-58);ctx.arc(x+2,y-58,16,Math.PI,0);ctx.lineTo(x+18,y-23);ctx.stroke();
    ctx.strokeStyle=P.cafePot;ctx.lineWidth=9;
    ctx.beginPath();ctx.moveTo(x-18,y-25);ctx.lineTo(x-18,y-60);ctx.arc(x-2,y-60,16,Math.PI,0);ctx.lineTo(x+14,y-25);ctx.stroke();
  }else{
    ctx.fillStyle=P.cafeWood;ctx.beginPath();ctx.ellipse(x,y-40,15,22,0.45,0,Math.PI*2);ctx.fill();
    ctx.strokeStyle=P.cafeCream;ctx.lineWidth=2;
    ctx.beginPath();ctx.moveTo(x+7,y-58);ctx.bezierCurveTo(x-12,y-49,x+12,y-35,x-7,y-23);ctx.stroke();
  }
  ctx.fillStyle=P.cafeWood;ctx.fillRect(x-4,y-10,8,3);
}

function drawCafeLamp(d){
  const x=d.sx,y=d.sy;if(cull(x,y-85))return;
  ctx.fillStyle=P.charShadow;ctx.beginPath();ctx.ellipse(x,y,14,6,0,0,Math.PI*2);ctx.fill();
  ctx.fillStyle=P.cafeMenu;ctx.beginPath();ctx.ellipse(x,y-2,10,4,0,0,Math.PI*2);ctx.fill();
  ctx.fillRect(x-1.5,y-66,3,64);
  ctx.fillStyle=P.cafeCream;ctx.beginPath();ctx.moveTo(x-9,y-79);ctx.lineTo(x+9,y-79);ctx.lineTo(x+17,y-60);ctx.lineTo(x-17,y-60);ctx.closePath();ctx.fill();
  ctx.strokeStyle=P.cafeWood;ctx.lineWidth=1;
  for(let dx=-9;dx<=9;dx+=6){ctx.beginPath();ctx.moveTo(x+dx*0.6,y-77);ctx.lineTo(x+dx,y-62);ctx.stroke();}
}

function drawCafebar(d){
  const x=d.sx,y=d.sy;if(cull(x,y-110))return;
  const o=isoO(x,y,1);
  shadowIso(x,y,66,18,1);
  // 바리스타와 우드 슬랫 카운터, 밝은 석재 상판
  const[px,py]=o(8,-17);
  roundRect(px-7,py-37,14,22,6,P.cafeGreen);
  ctx.fillStyle=P.cafeCream;ctx.fillRect(px-4,py-31,8,13);
  ctx.fillStyle=P.npcHead;ctx.beginPath();ctx.arc(px,py-43,6,0,Math.PI*2);ctx.fill();
  isoBox(x,y,62,13,30,1,P.cafeWood);
  ctx.strokeStyle=P.cafeCream;ctx.lineWidth=1;ctx.globalAlpha=0.3;
  for(let u=-58;u<=58;u+=8){const[a,b]=o(u,13);ctx.beginPath();ctx.moveTo(a,b-27);ctx.lineTo(a,b-3);ctx.stroke();}
  ctx.globalAlpha=1;isoBox(x,y-30,65,16,4,1,P.cafeCream);
  // 원두 호퍼가 달린 그라인더
  const[gx,gy]=o(-53,-2);
  isoBox(gx,gy-34,6,5,13,1,P.cafeMenu);
  roundRect(gx-5,gy-63,10,14,3,P.cafeGlass);
  ctx.fillStyle=P.cafeCoffee;ctx.fillRect(gx-4,gy-55,8,5);
  ctx.strokeStyle=P.cafeGlassEdge;ctx.lineWidth=1;ctx.strokeRect(gx-5,gy-63,10,14);
  ctx.fillStyle=P.cafeMenu;ctx.fillRect(gx-6,gy-65,12,3);
  // 2그룹 에스프레소 머신: 금속 바디, 압력계, 포터필터, 스팀 완드
  const[mx,my]=o(-24,0);isoBox(mx,my-34,20,10,23,1,P.cafeMetal);
  const[ax,ay]=o(-24,10);
  ctx.save();ctx.translate(ax,ay-34);ctx.transform(1,0.5,0,1,0,0);
  ctx.fillStyle=P.cafeMenu;ctx.fillRect(-17,-19,34,14);
  ctx.fillStyle=P.cafeCream;ctx.beginPath();ctx.arc(0,-15,3,0,Math.PI*2);ctx.fill();
  ctx.strokeStyle=P.cafeCoffee;ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(0,-15);ctx.lineTo(1,-17);ctx.stroke();
  for(const u of [-10,10]){
    ctx.fillStyle=P.cafeMetal;ctx.fillRect(u-3,-12,6,5);
    ctx.fillStyle=P.cafeMenu;ctx.fillRect(u,-8,8,2);
    ctx.fillStyle=P.cafeCream;ctx.fillRect(u-3,-5,6,5);
  }
  ctx.strokeStyle=P.cafeMetal;ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(18,-14);ctx.lineTo(22,-9);ctx.lineTo(22,-3);ctx.stroke();
  ctx.fillStyle=P.cafeMetal;ctx.fillRect(-19,1,39,3);ctx.restore();
  drawCoffee(mx-6,my-58);drawCoffee(mx+5,my-55);
  const[cx,cy]=o(12,1);drawCoffee(cx,cy-35);
  // 픽업 트레이와 결제 단말기
  const[tx,ty]=o(43,0);isoBox(tx,ty-34,9,6,2,1,P.cafeWood);
  const[rx,ry]=o(27,-5);isoBox(rx,ry-34,5,4,9,1,P.cafeMenu);
  // 눈높이 위 작은 브랜드 사인
  roundRect(x-67,y-109,134,25,5,P.cafeMenu);
  ctx.fillStyle=P.cafeCream;ctx.textAlign='center';ctx.textBaseline='middle';
  ctx.font='800 13px Pretendard';ctx.fillText('HELLO COFFEE',x,y-96);
  ctx.font='600 8px Pretendard';ctx.fillStyle=P.inkSoft;ctx.fillText('커피 한 잔, 아이디어 한 스푼',x,y-76);
}

// 투명 용기도 상판과 같은 아이소메트릭 축으로 구성한다.
function drawBrewGlass(x,y,hw,hd,h,level,liquid){
  isoBox(x,y,hw-1,hd-1,level,1,liquid);
  const pts=[[x-hw+hd,y-(hw+hd)/2],[x+hw+hd,y+(hw-hd)/2],
    [x+hw-hd,y+(hw+hd)/2],[x-hw-hd,y-(hw-hd)/2]];
  ctx.fillStyle=P.cafeGlass;ctx.strokeStyle=P.cafeGlassEdge;ctx.lineWidth=0.8;
  for(const [a,b]of[[3,2],[1,2]]){
    ctx.beginPath();ctx.moveTo(pts[a][0],pts[a][1]);ctx.lineTo(pts[b][0],pts[b][1]);
    ctx.lineTo(pts[b][0],pts[b][1]-h);ctx.lineTo(pts[a][0],pts[a][1]-h);ctx.closePath();ctx.fill();ctx.stroke();
  }
  ctx.beginPath();pts.forEach(([a,b],i)=>i?ctx.lineTo(a,b-h):ctx.moveTo(a,b-h));ctx.closePath();ctx.fill();ctx.stroke();
  ctx.strokeStyle=P.cafeCream;ctx.lineWidth=1;ctx.beginPath();
  ctx.moveTo(pts[3][0]+2,pts[3][1]-h+3);ctx.lineTo(pts[3][0]+2,pts[3][1]-3);ctx.stroke();
}

function drawColdBrew(d){
  const x=d.sx,y=d.sy;if(cull(x,y-150))return;
  shadowIso(x,y,44,20,1);
  isoBox(x,y,40,16,28,1,P.cafeWood);
  isoBox(x,y-28,43,18,3,1,P.cafeCream);
  const o=isoO(x,y,1);
  // 추출탑마다 기둥 4개·선반·투명 용기를 깊이 순서로 구성.
  for(const u of [-21,21]){
    const[a,b]=o(u,0),base=b-32,r=isoO(a,base,1);
    // 뒤쪽 기둥과 선반
    for(const du of [-13,13]){const[px,py]=r(du,-9);isoBox(px,py,1.7,1.7,94,1,P.cafeWood);}
    for(const h of [0,34,62,94])isoBox(a,base-h,15,11,2.5,1,P.cafeWood);
    // 추출된 커피 서버, 원두층, 상부 물탱크
    drawBrewGlass(a,base-3,7,5,20,9,P.cafeCoffee);
    isoBox(a,base-23,4,3,2,1,P.cafeMetal); // 서버 입구
    drawBrewGlass(a,base-37,7,5,15,10,P.cafeCoffee);
    isoBox(a,base-37,7,5,2,1,P.cafeCream); // 필터
    drawBrewGlass(a,base-65,8,6,24,16,P.cafeGlassEdge);
    isoBox(a,base-89,9,7,2,1,P.cafeMetal); // 분리형 뚜껑
    // 미세 조절 밸브와 물방울
    const[vx,vy]=r(0,6);
    isoBox(vx,vy-60,1.5,1.5,6,1,P.cafeMetal);
    isoBox(vx+3,vy-62,4,1,2,1,P.cafeMetal);
    ctx.fillStyle=P.cafeGlassEdge;ctx.beginPath();ctx.ellipse(vx,vy-56,1,1.8,0,0,Math.PI*2);ctx.fill();
    ctx.fillStyle=P.cafeCoffee;ctx.beginPath();ctx.ellipse(a,base-29,1,1.6,0,0,Math.PI*2);ctx.fill();
    // 앞쪽 기둥을 용기 위에 그려 두께와 금속 접합부 표현
    for(const du of [-13,13]){
      const[px,py]=r(du,9);isoBox(px,py,1.7,1.7,94,1,P.cafeWood);
      for(const h of [3,36,64,93]){ctx.fillStyle=P.cafeMetal;ctx.fillRect(px-1,py-h,2,2);}
    }
  }
  const[fx,fy]=o(0,16);
  ctx.save();ctx.translate(fx,fy-14);ctx.transform(1,0.5,0,1,0,0);
  roundRect(-32,-7,64,14,2,P.cafeMenu);
  ctx.font='700 8px Pretendard';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle=P.cafeCream;ctx.fillText('DUTCH COFFEE',0,0);ctx.restore();
}

function drawVending(d){
  const x=d.sx,y=d.sy;if(cull(x,y-80))return;
  const dir=(d.sk||0.5)<0?-1:1,o=isoO(x,y,dir);
  shadowIso(x,y,19,11,dir);
  isoBox(x,y,16,8,58,dir,d.color||'#e0533f');
  const[fx,fy]=o(0,8); // 앞면 디테일 — 앞면 평면 스큐(기울기 0.5*dir)
  ctx.save();ctx.translate(fx,fy);ctx.transform(1,0.5*dir,0,1,0,0);
  ctx.fillStyle='#0b1024';ctx.fillRect(-12,-53,19,34);
  const DR=['#ffd166','#74c0fc','#8ce99a'];
  for(let r=0;r<3;r++)for(let i=0;i<3;i++){ctx.fillStyle=DR[(r+i)%3];ctx.fillRect(-10+i*6,-50+r*11,4,7);}
  ctx.fillStyle='rgba(255,255,255,0.25)';ctx.fillRect(9,-53,4,20);
  ctx.fillStyle='rgba(0,0,0,0.3)';ctx.fillRect(-12,-14,24,8);
  ctx.restore();
}

function drawSitter(d){ // 의자에 앉아 쉬는 방문객
  const x=d.sx,y=d.sy;if(cull(x,y-52))return;
  const by=y-13; // 좌판 위
  roundRect(x-7,by-17,14,16,6,d.color||'#4d8bff');
  ctx.fillStyle='rgba(255,255,255,0.14)';roundRectPath(x-7,by-17,14,8,6);ctx.fill();
  ctx.fillStyle=P.npcHead;ctx.beginPath();ctx.arc(x,by-21,6,0,Math.PI*2);ctx.fill();
  if(d.working){ // 테이블을 향해 내민 팔: 공동 작업 중인 착석 방문객
    ctx.strokeStyle=d.color;ctx.lineWidth=4;ctx.lineCap='round';
    ctx.beginPath();ctx.moveTo(x+d.working*4,by-11);ctx.lineTo(x+d.working*13,by-7);ctx.stroke();
    ctx.fillStyle=P.npcHead;ctx.beginPath();ctx.arc(x+d.working*13,by-7,2,0,Math.PI*2);ctx.fill();ctx.lineCap='butt';
  }
  if(d.nick){ // 닉네임 — 배회 NPC와 동일 스타일
    ctx.font='600 9px Pretendard';const nw=txtW(d.nick)+10;
    ctx.globalAlpha=0.88;roundRect(x-nw/2,by-43,nw,14,7,P.chip);
    ctx.fillStyle=P.ink;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(d.nick,x,by-36);
    ctx.globalAlpha=1;
  }
}

function drawFoodcase(d){ // 음식 진열대 — 카운터 + 유리 진열부 + 페이스트리
  const x=d.sx,y=d.sy;if(cull(x,y-60))return;
  const dir=(d.sk||0.5)<0?-1:1,o=isoO(x,y,dir);
  shadowIso(x,y,19,11,dir);
  isoBox(x,y,16,8,22,dir,P.counter);
  const FOOD=['#f5c542','#e0872f','#e0533f','#8ce99a'];
  for(let i=0;i<4;i++){const[px,py]=o(-10+i*7,0);ctx.fillStyle=FOOD[i];ctx.beginPath();ctx.arc(px,py-25,3.2,0,Math.PI*2);ctx.fill();}
  const[fx,fy]=o(0,8);
  ctx.save();ctx.translate(fx,fy);ctx.transform(1,0.5*dir,0,1,0,0);
  ctx.fillStyle='rgba(180,200,255,0.16)';ctx.fillRect(-15,-42,30,20); // 유리 케이스
  ctx.strokeStyle='rgba(200,220,255,0.55)';ctx.lineWidth=1;ctx.strokeRect(-15,-42,30,20);
  ctx.restore();
}

function drawFridge(d){ // 음료 진열대(쿨러) — 선반 3단 + 병
  const x=d.sx,y=d.sy;if(cull(x,y-80))return;
  const dir=(d.sk||0.5)<0?-1:1,o=isoO(x,y,dir);
  shadowIso(x,y,17,11,dir);
  isoBox(x,y,14,8,56,dir,'#1a8fe3');
  const[fx,fy]=o(0,8);
  ctx.save();ctx.translate(fx,fy);ctx.transform(1,0.5*dir,0,1,0,0);
  ctx.fillStyle='#0b1024';ctx.fillRect(-11,-52,22,42);
  const BT=['#ffd166','#74c0fc','#8ce99a','#ffa8a8'];
  for(let r=0;r<3;r++){
    for(let i=0;i<4;i++){ctx.fillStyle=BT[(r+i)%4];ctx.fillRect(-9+i*5,-46+r*13,3,6);}
    ctx.fillStyle='rgba(255,255,255,0.3)';ctx.fillRect(-11,-40+r*13,22,1.5); // 선반
  }
  ctx.fillStyle='rgba(255,255,255,0.35)';ctx.fillRect(-11,-52,22,2.5); // 상단 라이트
  ctx.restore();
}

function drawDesk(d,t){
  const x=d.sx,y=d.sy;if(cull(x,y-90))return;
  const o=isoO(x,y,1);
  shadowIso(x,y,50,15,1);
  // 스태프 (데스크 뒤 = -v 쪽)
  const[px,py]=o(0,-13);
  roundRect(px-7,py-30,14,18,6,'#1428a0');
  ctx.fillStyle=P.npcHead;ctx.beginPath();ctx.arc(px,py-34,6,0,Math.PI*2);ctx.fill();
  // 데스크(gx축 정렬)
  isoBox(x,y,46,11,24,1,P.counter);
  const e1=o(-46,11),e2=o(46,11);
  ctx.strokeStyle='#3d7bff';ctx.lineWidth=2.5;ctx.beginPath();ctx.moveTo(e1[0],e1[1]-24);ctx.lineTo(e2[0],e2[1]-24);ctx.stroke(); // 상판 앞모서리
  // 사인
  ctx.fillStyle=P.bannerFrame;ctx.fillRect(x-2,y-56,4,18);
  ctx.font='800 10px Pretendard';const lw=txtW('INFORMATION')+16;
  roundRect(x-lw/2,y-72,lw,18,9,'#1428a0');
  ctx.fillStyle='#fff';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('INFORMATION',x,y-63);
  if(d===activeSpot)actBubble(x,y-86,'info',t);
}

function drawArcade(d,t){
  const x=d.sx,y=d.sy;if(cull(x,y-110))return;
  const hw=27,hd=9,h=86,o=isoO(x,y,1);
  shadowIso(x,y,hw+4,hd+3,1);
  isoBox(x,y,hw,hd,h,1,P.panel);
  const[fx,fy]=o(0,hd); // 앞면 디테일(마퀴·스크린·패널) — 앞면 평면 스큐
  ctx.save();ctx.translate(fx,fy);ctx.transform(1,0.5,0,1,0,0);
  halo(-hw,-h,hw*2,h,6,d.color,0.55+0.25*Math.sin(t*2+d.gx));
  roundRectPath(-hw,-h,hw*2,h,6);ctx.strokeStyle=hexA(d.color,0.8);ctx.lineWidth=1.5;ctx.stroke();
  // 마퀴 + 게임명
  ctx.fillStyle=d.color;ctx.fillRect(-hw+3,-h+3,hw*2-6,15);
  ctx.fillStyle='#fff';ctx.font='800 9px Pretendard';ctx.textAlign='center';ctx.textBaseline='middle';
  ctx.fillText(d.label,0,-h+11);
  // 스크린 (LED 다크 + 낙하 픽셀)
  ctx.fillStyle='#0b1024';ctx.fillRect(-hw+6,-h+22,hw*2-12,36);
  for(let i=0;i<4;i++){const py=-h+25+((t*26+i*9+d.gx*7)%30);ctx.fillStyle=hexA(d.color,0.85);ctx.fillRect(-17+i*10,py,5,5);}
  // 컨트롤 패널 + 버튼
  ctx.fillStyle=P.counter;ctx.fillRect(-hw+6,-h+63,hw*2-12,13);
  ctx.fillStyle=hexA(d.color,0.95);ctx.beginPath();ctx.arc(-11,-h+69.5,3.4,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='rgba(255,255,255,0.6)';ctx.beginPath();ctx.arc(11,-h+69.5,3.4,0,Math.PI*2);ctx.fill();
  ctx.restore();
  if(d===activeSpot)actBubble(x,fy-h-18,'game',t,d.color);
}

function drawBench(d){
  const x=d.sx,y=d.sy;if(cull(x,y-40))return;
  const dir=(d.sk||0.5)<0?-1:1,o=isoO(x,y,dir);
  const hw=d.big?52:30,hd=d.big?11:7,legs=d.big?[-40,0,40]:[-22,22]; // big: 광장용 대형 양면 벤치(등받이 없음)
  shadowIso(x,y,hw+4,hd+3,dir);
  ctx.fillStyle='#6b4f36';
  for(const s of legs){const[lx,ly]=o(s,0);ctx.fillRect(lx-2.5,ly-11,5,11);}
  isoBox(x,y-9,hw,hd,5,dir,'#a97c50'); // 좌판(다리 위)
}

function drawBooth(b,t){
  const x=b.sx,y=b.sy;if(cull(x,y-170))return;
  const acc=b.ex.accent;
  let a=1;
  if(b.d>player.d+0.2){const sd=Math.hypot(x-player.sx,y-player.sy);if(sd<84)a=0.34;}
  ctx.save();ctx.globalAlpha=a;
  // 카운터 (gx축 정렬 isoBox + 상판 앞모서리 액센트)
  const cy=y-4,ch=16,o=isoO(x,cy,1);
  isoBox(x,cy,32,9,ch,1,P.counter);
  const e1=o(-32,9),e2=o(32,9);
  ctx.strokeStyle=hexA(acc,0.9);ctx.lineWidth=2.5;ctx.beginPath();ctx.moveTo(e1[0],e1[1]-ch);ctx.lineTo(e2[0],e2[1]-ch);ctx.stroke();
  // 백월 디스플레이 (세로형)
  const bw=88,bh=132,top=cy-ch-8-bh;
  halo(x-bw/2,top,bw,bh,6,acc,b.glow);
  roundRect(x-bw/2,top,bw,bh,6,P.panel);
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
  b._lines||(b._lines=wrapLines(b.ex.title,bw-22,4));
  drawLines(b._lines,x-bw/2+11,top+30,15);
  ctx.fillStyle=P.inkSoft;ctx.font='600 9px Pretendard';
  ctx.fillText(b.ex.team,x-bw/2+11,top+bh-14);
  // 행잉 사인
  const hy=top-16-Math.sin(t*2.5+b.gx)*2;
  roundRect(x-26,hy-10,52,18,4,P.chip);
  roundRectPath(x-26,hy-10,52,18,4);ctx.strokeStyle=hexA(acc,0.5);ctx.lineWidth=1.5;ctx.stroke();
  ctx.fillStyle=P.ink;ctx.font='800 10px Pretendard';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(b.code,x,hy-1);
  ctx.restore();
  if(b===activeBooth||b===hoverBooth){
    const py=hy-24-Math.sin(t*3)*2;ctx.save();ctx.globalAlpha=Math.min(1,b.glow+0.2);
    const label='▶ 관람하기 · '+(b===hoverBooth?'클릭':'Space');ctx.font='700 12px Pretendard';const w=txtW(label)+22;
    roundRect(x-w/2,py-12,w,24,12,'#1428a0');ctx.fillStyle='#fff';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(label,x,py);
    ctx.beginPath();ctx.moveTo(x-5,py+12);ctx.lineTo(x+5,py+12);ctx.lineTo(x,py+18);ctx.closePath();ctx.fillStyle='#1428a0';ctx.fill();ctx.restore();
  }
}

function drawVacuum(e,t){
  const x=(e.gx-e.gy)*TW/2,y=(e.gx+e.gy)*TH/2;if(cull(x,y))return;
  for(const p of e.trail){ // 청소 자국 — 옅어지며 사라지는 반짝이
    const s=w2s(p.x,p.y);
    ctx.fillStyle='rgba(120,200,255,'+(p.a*0.5).toFixed(3)+')';
    ctx.beginPath();ctx.arc(s.x,s.y,1.8,0,Math.PI*2);ctx.fill();
  }
  ctx.save();ctx.translate(x,y);ctx.scale(1,0.5);ctx.fillStyle=P.charShadow;ctx.beginPath();ctx.arc(0,0,15,0,Math.PI*2);ctx.fill();ctx.restore();
  const r=13;
  ctx.fillStyle='#9aa3b5';ctx.beginPath();ctx.ellipse(x,y-3,r,r*0.5,0,0,Math.PI*2);ctx.fill();   // 옆면
  ctx.fillStyle='#e8ebf2';ctx.beginPath();ctx.ellipse(x,y-8,r,r*0.5,0,0,Math.PI*2);ctx.fill();   // 상판
  ctx.fillStyle='#f7f8fb';ctx.beginPath();ctx.ellipse(x,y-8,r*0.7,r*0.35,0,0,Math.PI*2);ctx.fill();
  ctx.strokeStyle='rgba(0,0,0,0.12)';ctx.lineWidth=1;ctx.beginPath();ctx.ellipse(x,y-8,r*0.7,r*0.35,0,0,Math.PI*2);ctx.stroke();
  ctx.fillStyle='#d8dce6';ctx.beginPath();ctx.ellipse(x,y-11.5,4.5,2.4,0,0,Math.PI*2);ctx.fill(); // 라이다 타워
  ctx.fillStyle='#2b3244';ctx.beginPath();ctx.ellipse(x,y-13,3.2,1.7,0,0,Math.PI*2);ctx.fill();
  ctx.fillStyle=Math.floor(t*2)%2?'#21d07a':'#0e7a44';ctx.beginPath();ctx.arc(x+6,y-9,1.6,0,Math.PI*2);ctx.fill(); // 상태 LED
  ctx.font='600 8px Pretendard';const lb='🧹 청소중',nw=txtW(lb)+10;
  ctx.globalAlpha=0.85;roundRect(x-nw/2,y-32,nw,13,6,P.chip);
  ctx.fillStyle=P.ink;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(lb,x,y-25.5);
  ctx.globalAlpha=1;
}

function drawChar(e,t){
  if(e.isVac)return drawVacuum(e,t);
  const x=(e.gx-e.gy)*TW/2,y=(e.gx+e.gy)*TH/2;if(cull(x,y))return;
  const bob=(e.moving)?Math.sin(e.phase)*2:Math.sin(t*2.4+e.phase)*1;
  ctx.save();ctx.translate(x,y);ctx.scale(1,0.5);ctx.fillStyle=P.charShadow;ctx.beginPath();ctx.arc(0,0,11,0,Math.PI*2);ctx.fill();ctx.restore();
  if(e.isPlayer){ctx.save();ctx.translate(x,y);ctx.scale(1,0.5);const g=ctx.createRadialGradient(0,0,2,0,0,26);g.addColorStop(0,'rgba(61,123,255,0.45)');g.addColorStop(1,'rgba(61,123,255,0)');ctx.fillStyle=g;ctx.beginPath();ctx.arc(0,0,26,0,Math.PI*2);ctx.fill();ctx.restore();}
  if(e.isJudge){ctx.save();ctx.translate(x,y);ctx.scale(1,0.5);const r=29+Math.sin(t*2+e.phase)*2,g=ctx.createRadialGradient(0,0,5,0,0,r);
    g.addColorStop(0,'rgba(167,139,250,0.5)');g.addColorStop(0.55,'rgba(139,92,246,0.22)');g.addColorStop(1,'rgba(139,92,246,0)');
    ctx.fillStyle=g;ctx.beginPath();ctx.arc(0,0,r,0,Math.PI*2);ctx.fill();
    ctx.strokeStyle='rgba(196,181,253,0.65)';ctx.lineWidth=1.5;ctx.beginPath();ctx.arc(0,0,17+Math.sin(t*2.5+e.phase),0,Math.PI*2);ctx.stroke();ctx.restore();}
  const by=y-bob;
  roundRect(x-8,by-26,16,20,7,e.color);
  ctx.fillStyle='rgba(255,255,255,0.14)';roundRectPath(x-8,by-26,16,10,7);ctx.fill();
  if(e.isBot){ // 로봇 헤드 — 사각 헤드 + 바이저 눈 + 가슴 상태 LED 점멸. 색은 청소기와 동일 금속 계열
    roundRect(x-7,by-37,14,13,4,e.head);
    roundRect(x-5+e.face,by-34,10,5,2.5,'#2b3244');
    ctx.fillStyle='#7ee0ff';ctx.fillRect(x-3.5+e.face,by-33,2,3);ctx.fillRect(x+1.5+e.face,by-33,2,3);
    ctx.fillStyle=Math.floor(t*2)%2?'#21d07a':'#0e7a44';ctx.beginPath();ctx.arc(x,by-13,1.8,0,Math.PI*2);ctx.fill();
  }else{
  ctx.fillStyle=e.head;ctx.beginPath();ctx.arc(x,by-30,7,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='rgba(0,0,0,0.10)';ctx.beginPath();ctx.arc(x+e.face*2,by-30,7,-0.4,1.0);ctx.fill();
  }
  if(e.nick){ // 닉네임 — 플레이어 포함 전원 표시
    ctx.font='600 9px Pretendard';const nw=txtW(e.nick)+10;
    ctx.globalAlpha=0.88;roundRect(x-nw/2,by-52,nw,14,7,P.chip);
    ctx.fillStyle=P.ink;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(e.nick,x,by-45);
    ctx.globalAlpha=1;
  }
  const saying=e.say&&t<e.sayUntil;
  if(saying){ // 채팅 말풍선 — 닉칩 위, 최대 3줄
    ctx.font='600 12px Pretendard';
    e._sayLines||(e._sayLines=wrapLines(e.say,180,3));
    const lines=e._sayLines,lh=16,bh=lines.length*lh+12;
    let lw=0;for(const s of lines)lw=Math.max(lw,ctx.measureText(s).width);lw+=19;
    const top=by-56-bh;
    roundRect(x-lw/2,top,lw,bh,10,P.chip);
    ctx.beginPath();ctx.moveTo(x-5,top+bh);ctx.lineTo(x+5,top+bh);ctx.lineTo(x,top+bh+6);ctx.closePath();ctx.fillStyle=P.chip;ctx.fill(); // 꼬리
    roundRectPath(x-lw/2,top,lw,bh,10);ctx.strokeStyle='rgba(61,123,255,0.45)';ctx.lineWidth=1;ctx.stroke();
    ctx.fillStyle=P.ink;ctx.textAlign='center';ctx.textBaseline='top';
    drawLines(lines,x,top+6,lh);
  }
  else if(e.isPlayer){const yy=by-62+Math.sin(t*3)*2;ctx.fillStyle='#3d7bff';ctx.beginPath();ctx.moveTo(x,yy+6);ctx.lineTo(x-5,yy-2);ctx.lineTo(x+5,yy-2);ctx.closePath();ctx.fill();} // 내 위치 마커 — 말풍선 중엔 숨김
}

const parts=Array.from({length:40},()=>{const s=Math.random()*1.6+0.4;
  return{x:Math.random(),y:Math.random(),s,sp:0.4+Math.random()*0.8,col:`rgba(${P.particle},${0.05+s*0.06})`};});
function drawParticles(dt){for(const p of parts){p.y-=p.sp*dt*0.03;if(p.y<-0.02){p.y=1.02;p.x=Math.random();}ctx.fillStyle=p.col;ctx.beginPath();ctx.arc(p.x*W,p.y*H,p.s,0,Math.PI*2);ctx.fill();}}

function drawMinimap(){
  const SZ=172,sc=Math.min(SZ/HALL_W,SZ/HALL_D),ox=(SZ-HALL_W*sc)/2,oy=(SZ-HALL_D*sc)/2;
  const X=g=>ox+g*sc, Y=g=>oy+g*sc;
  mmx.clearRect(0,0,SZ,SZ);mmx.fillStyle=P.mmBg;mmx.fillRect(0,0,SZ,SZ);
  mmx.fillStyle='rgba(61,123,255,0.16)';mmx.fillRect(X(1),Y(HALL_D-4),(HALL_W-3)*sc,(HALL_D-3-(HALL_D-4))*sc+2*sc);
  mmx.strokeStyle='rgba(90,110,170,0.5)';mmx.lineWidth=1.4;mmx.strokeRect(X(1),Y(1),(HALL_W-3)*sc,(HALL_D-3)*sc);
  for(const b of BOOTHS){mmx.fillStyle=hexA(b.ex.accent,0.85);mmx.fillRect(X(b.gx)-3,Y(b.gy)-2,6,4);
    if(b===activeBooth){mmx.strokeStyle=P.ink;mmx.lineWidth=1.5;mmx.strokeRect(X(b.gx)-4,Y(b.gy)-3,8,6);}}
  mmx.fillStyle='rgba(139,92,246,0.22)';mmx.fillRect(X(PG.x0),Y(PG.y0),(PG.x1-PG.x0+1)*sc,(PG.y1-PG.y0+1)*sc);
  mmx.fillStyle='rgba(224,135,47,0.28)';mmx.fillRect(X(62),Y(21),19*sc,22*sc);   // 카페 라운지
  mmx.fillStyle='#4d8bff';mmx.fillRect(X(PLAZA.x)-4,Y(PLAZA.y-3.5)-1.5,8,3);
  mmx.fillStyle=P.mmNpc;for(const n of npcs){mmx.beginPath();mmx.arc(X(n.gx),Y(n.gy),1.6,0,Math.PI*2);mmx.fill();}
  mmx.fillStyle='#3d7bff';mmx.beginPath();mmx.arc(X(player.gx),Y(player.gy),3.4,0,Math.PI*2);mmx.fill();mmx.strokeStyle='#fff';mmx.lineWidth=1;mmx.stroke();
}

/* ---------- 렌더 ---------- */
/* 정적 엔티티(벽·배너·장식·부스)는 depth 불변 — 1회 정렬 후 매 프레임 캐릭터만 병합 */
const DRAW={billboard:drawBillboard,bench:drawBench,arcade:drawArcade,sofa:drawSofa,
  table:drawTable,board:drawBoard,chair:drawChair,
  cafebar:drawCafebar,coldbrew:drawColdBrew,vending:drawVending,desk:drawDesk,foodcase:drawFoodcase,fridge:drawFridge,
  taskboard:drawTaskBoard,bag:drawBag,merchtable:drawMerchTable,loungecabinet:drawLoungeCabinet,snacktable:drawSnackTable,sidetable:drawSideTable,trackart:drawTrackArt,plant:drawPlant,cafemenu:drawCafeMenu,cafeart:drawCafeArt,cafelamp:drawCafeLamp,sitter:drawSitter,longtable:drawLongtable};
const STATICS=[];
for(const w of WALLS)STATICS.push({fn:drawWall,d:w.d,obj:w});
for(const tr of TRACKS)STATICS.push({fn:drawBanner,d:tr.sign.x+tr.sign.y,obj:tr});
/* sk: 아이소 바닥 축 방향 플래그 (+0.5 = gx축, -0.5 = gy축) — 각 draw 함수가 isoBox dir로 사용 */
for(const d of DECOR)STATICS.push({fn:DRAW[d.type],d:d.zd??(d.gx+d.gy),obj:d});
for(const b of BOOTHS)STATICS.push({fn:drawBooth,d:b.d,obj:b});
/* 존 라인 세그먼트 — d=중점+0.4: 같은 자리 외벽(d=gx+gy-0.6)보다 뒤(위에 그려짐), 부스 패널(d=gx+gy)보다 앞(뒤에 깔림) */
TRACKS.forEach((tr,ti)=>{
  const z=ZONES[ti],hw=BOOTH_DX+2,x0=z.cx-hw,x1=z.cx+hw,y0=Math.max(z.cy-4.5,0.5),y1=z.cy+BOOTH_DY+4.5,ph=ti*1.3; // 카펫(±3칸 확장)과 동일 둘레
  const seg=(gx1,gy1,gx2,gy2)=>{const a=w2s(gx1,gy1),b=w2s(gx2,gy2);
    STATICS.push({fn:drawZoneSeg,d:(gx1+gx2+gy1+gy2)/2+0.4,obj:{x1:a.x,y1:a.y,x2:b.x,y2:b.y,acc:tr.accent,ph}});};
  for(let gx=x0;gx<x1;gx++){seg(gx,y0,gx+1,y0);seg(gx,y1,gx+1,y1);}
  for(let gy=y0;gy<y1;gy++){seg(x0,gy,x0,gy+1);seg(x1,gy,x1,gy+1);}
});
STATICS.sort((a,b)=>a.d-b.d);

let mmTick=0;
const VISIBLE_CHARS=[];
const VISIBLE_REMOTES=[];
const MAX_VISIBLE_REMOTES=120;
function render(t,dt){
  if(!BG){BG=ctx.createLinearGradient(0,0,0,H);BG.addColorStop(0,P.bgA);BG.addColorStop(1,P.bgB);}
  ctx.fillStyle=BG;ctx.fillRect(0,0,W,H);
  ctx.save();ctx.translate(camX,camY);
  drawFloor();
  VISIBLE_CHARS.length=0;VISIBLE_REMOTES.length=0;
  for(const c of CHARS){
    c.d=c.gx+c.gy;
    if(c.isRemote){ // 화면 밖 원격 사용자는 정렬과 복잡한 캐릭터 draw 호출까지 생략
      const s=w2s(c.gx,c.gy),x=s.x+camX,y=s.y+camY;
      if(x<-140||x>W+140||y<-180||y>H+100)continue;
      c._viewDist=(c.gx-player.gx)**2+(c.gy-player.gy)**2;
      VISIBLE_REMOTES.push(c);continue;
    }
    VISIBLE_CHARS.push(c);
  }
  VISIBLE_REMOTES.sort((a,b)=>a._viewDist-b._viewDist);
  for(let i=0;i<Math.min(MAX_VISIBLE_REMOTES,VISIBLE_REMOTES.length);i++)VISIBLE_CHARS.push(VISIBLE_REMOTES[i]);
  VISIBLE_CHARS.sort((a,b)=>a.d-b.d);
  let ci=0;
  for(const e of STATICS){
    while(ci<VISIBLE_CHARS.length&&VISIBLE_CHARS[ci].d<e.d)drawChar(VISIBLE_CHARS[ci++],t);
    e.fn(e.obj,t);
  }
  while(ci<VISIBLE_CHARS.length)drawChar(VISIBLE_CHARS[ci++],t);
  drawLoungeChat();
  ctx.restore();
  drawParticles(dt);
  if(!(mmTick++%3))drawMinimap(); // 미니맵 20Hz면 충분
}
