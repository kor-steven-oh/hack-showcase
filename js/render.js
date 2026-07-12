/* 렌더: 캔버스 셋업 · draw 함수 · 미니맵 · render() */

/* ---------- 캔버스 ---------- */
const cv=document.getElementById('game'),ctx=cv.getContext('2d');
const mm=document.getElementById('minimap'),mmx=mm.getContext('2d');
let W=0,H=0,DPR=Math.min(window.devicePixelRatio||1,2);
function resize(){W=innerWidth;H=innerHeight;cv.width=W*DPR;cv.height=H*DPR;cv.style.width=W+'px';cv.style.height=H+'px';ctx.setTransform(DPR,0,0,DPR,0,0);}
addEventListener('resize',resize);resize();

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
