/* 렌더: 캔버스 셋업 · draw 함수 · 미니맵 · render() */

/* ---------- 캔버스 ---------- */
const cv=document.getElementById('game'),ctx=cv.getContext('2d');
const mm=document.getElementById('minimap'),mmx=mm.getContext('2d');
let W=0,H=0,DPR=Math.min(window.devicePixelRatio||1,2);
function resize(){W=innerWidth;H=innerHeight;cv.width=W*DPR;cv.height=H*DPR;cv.style.width=W+'px';cv.style.height=H+'px';ctx.setTransform(DPR,0,0,DPR,0,0);}
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
/* 웹폰트(Pretendard) 로드 완료 시 폴백 폰트로 측정/프리렌더된 캐시 무효화 */
if(document.fonts)document.fonts.addEventListener('loadingdone',()=>{
  for(const b of BOOTHS)b._lines=null;
  for(const tr of TRACKS)tr._lines=null;
  for(const d of DECOR)if(d.type==='billboard')d._screen=null;
});

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
  ctx.save();ctx.translate(e.x,e.y);ctx.textAlign='center';ctx.textBaseline='middle';
  ctx.fillStyle=P.entranceInk;ctx.font='800 13px Pretendard';ctx.shadowColor='rgba(61,123,255,0.6)';ctx.shadowBlur=12;
  ctx.fillText('HELLO AI HACKATHON · EXPO',0,0);ctx.restore();
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
function makeBillboardScreen(d){
  const w=d.w,h=110,S=2,c=document.createElement('canvas');
  c.width=w*S;c.height=h*S;
  const g=c.getContext('2d');g.scale(S,S);
  g.beginPath();g.moveTo(10,0);g.arcTo(w,0,w,h,10);g.arcTo(w,h,0,h,10);g.arcTo(0,h,0,0,10);g.arcTo(0,0,w,0,10);g.closePath();g.clip();
  g.fillStyle='#0b1024';g.fillRect(0,0,w,h);
  const acc=d.color,tg=g.createLinearGradient(w/2-w*0.36,0,w/2+w*0.36,0);
  tg.addColorStop(0,acc);tg.addColorStop(.5,'#ffffff');tg.addColorStop(1,acc);
  g.shadowColor=hexA(acc,0.85);g.shadowBlur=22;
  g.fillStyle=tg;g.font='900 '+d.fs+'px Pretendard';g.textAlign='center';g.textBaseline='middle';
  g.fillText(d.text,w/2,h/2-8);g.shadowBlur=0;
  g.fillStyle=hexA(acc,0.9);g.font='700 11px Pretendard';g.fillText(d.sub,w/2,h-20);
  g.fillStyle=hexA(acc,0.05);for(let i=0;i<h;i+=4)g.fillRect(0,i,w,2);
  return c;
}

function drawBillboard(d,t){
  const x=d.sx,y=d.sy;if(cull(x,y-210))return;
  const w=d.w,h=110,top=-64-h,acc=d.color;
  const k=d.face==='ul'?-0.5:0.5; // 아이소 벽면 기울기 (ur: ↘, ul: ↗)
  ctx.save();ctx.translate(x,y);ctx.transform(1,k,0,1,0,0);
  ctx.fillStyle=P.bannerFrame;ctx.fillRect(-w/2+18,-64,8,64);ctx.fillRect(w/2-26,-64,8,64);
  halo(-w/2,top,w,h,10,acc,0.8);
  roundRect(-w/2,top,w,h,10,'#0b1024');   // LED 스크린은 테마 무관 다크
  d._screen||(d._screen=makeBillboardScreen(d));
  const pulse=0.75+0.25*Math.sin(t*1.8+d.gx);
  ctx.globalAlpha=0.72+0.28*pulse;
  ctx.drawImage(d._screen,-w/2,top,w,h);
  ctx.globalAlpha=1;
  roundRectPath(-w/2,top,w,h,10);ctx.strokeStyle=hexA(acc,0.8);ctx.lineWidth=2;ctx.stroke();
  ctx.restore();
}

function drawTree(d){
  const x=d.sx,y=d.sy;if(cull(x,y-90))return;
  ctx.save();ctx.translate(x,y);ctx.scale(1,0.5);ctx.fillStyle=P.charShadow;ctx.beginPath();ctx.arc(0,0,14,0,Math.PI*2);ctx.fill();ctx.restore();
  ctx.fillStyle='#7a5a3e';ctx.fillRect(x-3,y-26,6,26);
  ctx.fillStyle='#1f8f58';ctx.beginPath();ctx.moveTo(x,y-60);ctx.lineTo(x+22,y-24);ctx.lineTo(x-22,y-24);ctx.closePath();ctx.fill();
  ctx.fillStyle='#2fb474';ctx.beginPath();ctx.moveTo(x,y-84);ctx.lineTo(x+16,y-44);ctx.lineTo(x-16,y-44);ctx.closePath();ctx.fill();
}

function drawArcade(d,t){
  const x=d.sx,y=d.sy;if(cull(x,y-110))return;
  const w=62,h=86,top=y-8-h;
  ctx.save();ctx.translate(x,y);ctx.scale(1,0.5);ctx.fillStyle=P.charShadow;ctx.beginPath();ctx.ellipse(0,0,30,14,0,0,Math.PI*2);ctx.fill();ctx.restore();
  halo(x-w/2,top,w,h,6,d.color,0.55+0.25*Math.sin(t*2+d.gx));
  roundRect(x-w/2,top,w,h,6,P.panel);
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
  if(d===activeArcade){
    const py=top-18-Math.sin(t*3)*2;
    const label='▶ 게임하기 · Space / 클릭';ctx.font='700 12px Pretendard';const lw=ctx.measureText(label).width+22;
    roundRect(x-lw/2,py-12,lw,24,12,d.color);ctx.fillStyle='#fff';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(label,x,py);
    ctx.beginPath();ctx.moveTo(x-5,py+12);ctx.lineTo(x+5,py+12);ctx.lineTo(x,py+18);ctx.closePath();ctx.fillStyle=d.color;ctx.fill();
  }
}

function drawBench(d){
  const x=d.sx,y=d.sy;if(cull(x,y-40))return;
  ctx.save();ctx.translate(x,y);ctx.scale(1,0.5);ctx.fillStyle=P.charShadow;ctx.beginPath();ctx.ellipse(0,0,30,13,0,0,Math.PI*2);ctx.fill();ctx.restore();
  ctx.fillStyle='#6b4f36';ctx.fillRect(x-24,y-12,5,11);ctx.fillRect(x+19,y-12,5,11);
  roundRect(x-30,y-21,60,10,3,'#a97c50');
  ctx.fillStyle='rgba(255,255,255,0.18)';ctx.fillRect(x-28,y-21,56,3);
}

function drawBooth(b,t){
  const x=b.sx,y=b.sy;if(cull(x,y-170))return;
  const acc=b.ex.accent;
  let a=1;
  if(b.d>player.d+0.2){const sd=Math.hypot(x-player.sx,y-player.sy);if(sd<84)a=0.34;}
  ctx.save();ctx.globalAlpha=a;
  // 카운터
  const cw=74,ch=16,cy=y-4;
  roundRect(x-cw/2,cy-ch,cw,ch,3,P.counter);
  ctx.fillStyle=hexA(acc,0.9);ctx.fillRect(x-cw/2,cy-ch,cw,4);
  ctx.fillStyle='rgba(255,255,255,0.05)';ctx.fillRect(x-cw/2,cy-ch+4,cw,ch-4);
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
  if(b===activeBooth){
    const py=hy-24-Math.sin(t*3)*2;ctx.save();ctx.globalAlpha=Math.min(1,b.glow+0.2);
    const label='▶ 관람하기 · Space / 클릭';ctx.font='700 12px Pretendard';const w=ctx.measureText(label).width+22;
    roundRect(x-w/2,py-12,w,24,12,'#1428a0');ctx.fillStyle='#fff';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(label,x,py);
    ctx.beginPath();ctx.moveTo(x-5,py+12);ctx.lineTo(x+5,py+12);ctx.lineTo(x,py+18);ctx.closePath();ctx.fillStyle='#1428a0';ctx.fill();ctx.restore();
  }
}

function drawChar(e,t){
  const x=(e.gx-e.gy)*TW/2,y=(e.gx+e.gy)*TH/2;if(cull(x,y))return;
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
/* 정적 엔티티(벽·배너·장식·부스)는 depth 불변 — 1회 정렬 후 매 프레임 캐릭터만 병합 */
const STATICS=[];
for(const w of WALLS)STATICS.push({type:'wall',d:w.d,obj:w});
for(const tr of TRACKS)STATICS.push({type:'banner',d:tr.sign.x+tr.sign.y,obj:tr});
for(const d of DECOR)STATICS.push({type:d.type,d:d.zd??(d.gx+d.gy),obj:d});
for(const b of BOOTHS)STATICS.push({type:'booth',d:b.d,obj:b});
STATICS.sort((a,b)=>a.d-b.d);

function render(t,dt){
  const bg=ctx.createLinearGradient(0,0,0,H);bg.addColorStop(0,P.bgA);bg.addColorStop(1,P.bgB);ctx.fillStyle=bg;ctx.fillRect(0,0,W,H);
  ctx.save();ctx.translate(camX,camY);
  drawFloor();
  for(const c of CHARS)c.d=c.gx+c.gy;
  CHARS.sort((a,b)=>a.d-b.d);
  let ci=0;
  for(const e of STATICS){
    while(ci<CHARS.length&&CHARS[ci].d<e.d)drawChar(CHARS[ci++],t);
    const k=e.type;
    if(k==='wall')drawWall(e.obj);else if(k==='banner')drawBanner(e.obj);
    else if(k==='billboard')drawBillboard(e.obj,t);else if(k==='tree')drawTree(e.obj);else if(k==='bench')drawBench(e.obj);else if(k==='arcade')drawArcade(e.obj,t);
    else drawBooth(e.obj,t);
  }
  while(ci<CHARS.length)drawChar(CHARS[ci++],t);
  ctx.restore();
  drawParticles(dt);drawMinimap();
}
