/* 메인: 엔티티(플레이어·NPC) · 입력 · update · 루프 · 모달 · 채팅 */

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
const CHARS=[player,...npcs]; // 렌더 depth 병합용 — 멤버 고정, 매 프레임 d만 갱신

/* ---------- 입력 ---------- */
const keys={};
const K_UP=['w','ArrowUp'],K_DOWN=['s','ArrowDown'],K_LEFT=['a','ArrowLeft'],K_RIGHT=['d','ArrowRight'];
let started=false,activeBooth=null,activeArcade=null,modalOpen=false;
addEventListener('keydown',e=>{
  if(e.target&&(e.target.tagName==='INPUT'||e.target.isContentEditable))return;
  if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight',' '].includes(e.key))e.preventDefault();
  const k=e.key.length===1?e.key.toLowerCase():e.key; keys[k]=true;
  if(k===' '&&started&&!e.repeat){
    if(gameOpen)gameTap();
    else if(!modalOpen&&activeBooth)openModal(activeBooth.ex);
    else if(!modalOpen&&activeArcade)openGame();
  }
  if(k==='Escape'&&modalOpen)closeModal();
});
addEventListener('keyup',e=>{const k=e.key.length===1?e.key.toLowerCase():e.key;keys[k]=false;});
cv.addEventListener('click',()=>{if(started&&!modalOpen){if(activeBooth)openModal(activeBooth.ex);else if(activeArcade)openGame();}});
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
  actBtn.addEventListener('pointerdown',e=>{e.preventDefault();if(started&&!modalOpen){if(activeBooth)openModal(activeBooth.ex);else if(activeArcade)openGame();}});
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
  activeArcade=null;
  if(!activeBooth){let ab=1.8;
    for(const d of DECOR){if(!d.game)continue;const dd=dist(player.gx,player.gy,d.gx,d.gy+0.8);if(dd<ab){ab=dd;activeArcade=d;}}}
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
  if(actBtn){actBtn.classList.toggle('on',!!(started&&!modalOpen&&(activeBooth||activeArcade)));
    actBtn.textContent=activeArcade?'▶ 게임하기':'▶ 관람하기';}

  const ps=w2s(player.gx,player.gy);player.sx=ps.x;player.sy=ps.y;
  const tx=W/2-ps.x,ty=H/2-40-ps.y;
  if(initCam){camX=tx;camY=ty;initCam=false;}
  camX=lerp(camX,tx,0.12);camY=lerp(camY,ty,0.12);
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
function closeModal(){modalOpen=false;gameOpen=false;if(gameTid){clearTimeout(gameTid);gameTid=0;}modalBack.classList.remove('open');}
modalBack.addEventListener('click',e=>{if(e.target===modalBack)closeModal();});

/* ---------- 미니게임: 반응속도 ---------- */
// ponytail: 게임 종류가 늘면 game 키별 open 함수 라우팅으로 확장
let gameOpen=false,gameSt='idle',gameTid=0,gameT0=0,gameBest=null;
function openGame(){
  modalOpen=true;gameOpen=true;gameSt='idle';
  const acc='#21a17a';
  modal.innerHTML=`
    <div class="m-head">
      <div class="accent-line" style="background:linear-gradient(90deg,${acc},transparent)"></div>
      <button class="m-close" id="mClose">✕</button>
      <span class="m-track" style="color:${acc};background:${hexA(acc,0.12)};border:1px solid ${hexA(acc,0.35)}">PLAYGROUND · 미니게임</span>
      <div class="m-title">반응속도</div>
      <div class="m-team">초록색으로 바뀌는 순간, 최대한 빨리 Space 또는 클릭!</div>
    </div>
    <div class="m-body"><div class="game-pad" id="gamePad"></div></div>`;
  modalBack.classList.add('open');
  document.getElementById('mClose').onclick=closeModal;
  document.getElementById('gamePad').addEventListener('pointerdown',e=>{e.preventDefault();gameTap();});
  setPad('idle','반응속도 테스트','Space 또는 클릭으로 시작');
}
function setPad(cls,big,small){
  const p=document.getElementById('gamePad');if(!p)return;
  p.className='game-pad '+cls;
  p.innerHTML=`<div class="g-big">${big}</div><div class="g-small">${small}</div>`;
}
function gradeMs(ms){return ms<180?'⚡ 초인적':ms<250?'🔥 빠름':ms<350?'👍 평균':'🐢 느긋하시네요';}
function gameTap(){
  if(gameSt==='idle'||gameSt==='result'){
    gameSt='wait';setPad('wait','기다리세요…','초록색이 되면 바로!');
    gameTid=setTimeout(()=>{gameTid=0;gameSt='go';gameT0=performance.now();setPad('go','지금!','Space / 클릭');},1000+Math.random()*2500);
  }else if(gameSt==='wait'){
    clearTimeout(gameTid);gameTid=0;
    gameSt='result';setPad('fail','너무 빨라요 😅','초록색을 기다렸다 눌러야 해요 · Space로 재도전');
  }else if(gameSt==='go'){
    const ms=Math.round(performance.now()-gameT0);
    if(gameBest===null||ms<gameBest)gameBest=ms;
    gameSt='result';setPad('result',ms+'ms',gradeMs(ms)+' · 최고 기록 '+gameBest+'ms · Space로 재도전');
  }
}

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
