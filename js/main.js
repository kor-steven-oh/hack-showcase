/* 메인: 엔티티(플레이어·NPC) · 입력 · update · 루프 · 모달 · 채팅 */

/* ---------- 엔티티 ---------- */
const player={gx:HALL_W/2,gy:HALL_D-3,color:'#3d7bff',head:P.playerHead,phase:0,moving:false,face:1,isPlayer:true};
const NPC_COLORS=['#12b3a6','#6c5ce7','#e0872f','#21a17a','#e0533f','#1a8fe3','#c78bff','#4d8bff'];
const NICKS=['새벽코딩','민초단','커밋요정','도넛왕','텐서보이','디버그맨','밤샘장인','반도체진심',
  '웨이퍼러버','치킨쿠폰','알고리듬','폰노이만','초코라떼','피카부','스탠드업','자율주행러',
  '커피수혈','조립왕','핫식스','린턴하는중'];
const AY=[5,14,22,26,41], AX=[3,21,30,39,56,70];
function randAisle(){return Math.random()<0.5
  ? {x:2+Math.random()*(HALL_W-4), y:AY[(Math.random()*AY.length)|0]}
  : {x:AX[(Math.random()*AX.length)|0], y:2+Math.random()*(HALL_D-4)};}
function npcTarget(n){
  const r=Math.random();
  if(r<0.5){const b=BOOTHS[(Math.random()*BOOTHS.length)|0];n.tx=b.view.x+(Math.random()-.5)*0.6;n.ty=b.view.y+(Math.random()-.5)*0.4;}
  else if(r<0.75){const h=HANGOUTS[(Math.random()*HANGOUTS.length)|0];
    n.tx=clamp(h[0]+(Math.random()-.5)*0.8,1.6,HALL_W-2.6);n.ty=clamp(h[1]+(Math.random()-.5)*0.5,1.6,HALL_D-2.6);}
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
/* 안내 도슨트 봇(4) — 홀을 순회하는 로봇 가이드. 다가가면 멈추고, Space → 전시관 안내(openInfo) */
const GUIDE_TIPS=['안녕하세요, 안내 도슨트예요. Space로 말 걸어보세요!','부스 앞에서 Space를 누르면 프로젝트를 자세히 볼 수 있어요','미니게임은 우측 위 플레이그라운드에 있어요 🎮','응원 한마디는 중앙 통로 메시지 월에 남겨주세요 💬','쉬어가실 땐 우측 아래 카페 라운지로 오세요 ☕','트랙은 5개, 부스는 총 20개랍니다'];
const guides=[[PLAZA.x,PLAZA.y+3],[12,8],[48,8],[70,24]].map((p,i)=>{
  const g={gx:p[0],gy:p[1],nick:'🤖 도슨트 '+(i+1),color:'#f5c542',head:'#d8dce6',isBot:1,
    speed:1.7,state:'walk',timer:0,phase:i*1.7,moving:true,face:1,isPlayer:false,tx:0,ty:0,
    act:'info',tipT:3+i*4,tipI:i}; // tipT/tipI 엇갈림 — 동시에 같은 멘트 안 하도록
  npcTarget(g);npcs.push(g);return g; // npcs에 편입 — 배회 상태머신·CHARS·rebuild() 전부 공짜
});
function guideTarget(g){ // 후보 6개 중 다른 도슨트들과 가장 먼 목적지 선택 — 분산 순찰
  let bx=g.tx,by=g.ty,bs=-1;
  for(let k=0;k<6;k++){npcTarget(g);
    let md=Infinity;for(const o of guides)if(o!==g)md=Math.min(md,dist(g.tx,g.ty,o.gx,o.gy));
    if(md>bs){bs=md;bx=g.tx;by=g.ty;}}
  g.tx=bx;g.ty=by;
}

/* 로봇청소기 — 통로를 쉼 없이 순회하며 청소. trail: 지나온 자리 반짝 자국 */
const vac={gx:HALL_W/2+3,gy:HALL_D-4,isVac:true,speed:1.4,tx:0,ty:0,trail:[],trailT:0,face:1,moving:true,phase:0};
{const p=randAisle();vac.tx=p.x;vac.ty=p.y;}
const CHARS=[player,...npcs,vac]; // 렌더 depth 병합용 — 멤버 고정, 매 프레임 d만 갱신

/* ---------- 입력 ---------- */
const keys={};
const K_UP=['w','ArrowUp'],K_DOWN=['s','ArrowDown'],K_LEFT=['a','ArrowLeft'],K_RIGHT=['d','ArrowRight'];
let started=false,activeBooth=null,activeSpot=null,modalOpen=false;
/* 상호작용 스팟(act) 라우팅 — DECOR의 act 키와 1:1 */
function actSpot(){
  if(!activeSpot)return;
  const a=activeSpot.act;
  if(a==='game')openGame();
  else if(a==='idea')openIdea();
  else if(a==='info')openInfo();
}
function interact(){if(activeBooth)openModal(activeBooth.ex);else actSpot();}
addEventListener('keydown',e=>{
  if(e.target&&(e.target.tagName==='INPUT'||e.target.isContentEditable))return;
  if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight',' '].includes(e.key))e.preventDefault();
  const k=e.key.length===1?e.key.toLowerCase():e.key; keys[k]=true;
  if(k===' '&&started&&!e.repeat){
    if(gameOpen)gameTap();
    else if(!modalOpen)interact();
  }
  if(k==='Escape'&&modalOpen)closeModal();
});
addEventListener('keyup',e=>{const k=e.key.length===1?e.key.toLowerCase():e.key;keys[k]=false;});
cv.addEventListener('click',e=>{ // 클릭 지점으로 이동 — 모달 오픈은 Space/액션 버튼 전용
  if(!started||modalOpen)return;
  const a=2*(e.clientX-camX)/TW, b=2*(e.clientY-camY)/TH; // w2s 역변환 (렌더는 translate(camX,camY))
  player.tgt={x:clamp((a+b)/2,1.4,HALL_W-2.6),y:clamp((b-a)/2,1.4,HALL_D-1.8)};
});
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
  actBtn.addEventListener('pointerdown',e=>{e.preventDefault();if(started&&!modalOpen)interact();});
})();

/* ---------- 업데이트 ---------- */
let camX=0,camY=0,initCam=true;
const zoneTxt=document.getElementById('zoneTxt'),zonePill=document.getElementById('zonePill');
function update(dt,t){
  if(started&&!modalOpen){
    let h=(down(K_RIGHT)?1:0)-(down(K_LEFT)?1:0)+padVec.x, v=(down(K_DOWN)?1:0)-(down(K_UP)?1:0)+padVec.y;
    h=clamp(h,-1,1);v=clamp(v,-1,1);
    if(h||v){player.tgt=null;const m=Math.hypot(h,v)||1;h/=m;v/=m;const sp=6*dt;moveEnt(player,(v+h)*sp,(v-h)*sp);player.moving=true;player.phase+=dt*11;if(h)player.face=h>0?1:-1;}
    else if(player.tgt){ // 클릭 이동 — NPC와 동일 추적, 도착·벽 막힘 시 해제
      const dx=player.tgt.x-player.gx,dy=player.tgt.y-player.gy,dd=Math.hypot(dx,dy);
      const bx=player.gx,by=player.gy;
      if(dd>0.02)moveEnt(player,dx/dd*Math.min(6*dt,dd),dy/dd*Math.min(6*dt,dd));
      if(dd<0.15||(Math.abs(player.gx-bx)<1e-4&&Math.abs(player.gy-by)<1e-4)){player.tgt=null;player.moving=false;}
      else{player.moving=true;player.phase+=dt*11;if(Math.abs(dx)>0.05)player.face=dx>0?1:-1;}
    }
    else player.moving=false;
  } else player.moving=false;

  for(const n of npcs){
    if(n.state==='walk'){
      const dx=n.tx-n.gx,dy=n.ty-n.gy,dd=Math.hypot(dx,dy);
      if(dd<0.2){n.state='view';n.timer=2+Math.random()*3;n.moving=false;}
      else{const sp=n.speed*dt,bx=n.gx,by=n.gy;moveEnt(n,dx/dd*sp,dy/dd*sp);
        if(Math.abs(n.gx-bx)<1e-4&&Math.abs(n.gy-by)<1e-4)(n.isBot?guideTarget:npcTarget)(n);
        n.moving=true;n.phase+=dt*10;if(Math.abs(dx)>0.01)n.face=dx>0?1:-1;}
    }else{n.timer-=dt;if(n.timer<=0)(n.isBot?guideTarget:npcTarget)(n);}
  }
  for(const g of guides){ // 도슨트 — 플레이어 접근 시 멈춰 마주보기 + 안내 멘트 순환 말풍선
    if(dist(player.gx,player.gy,g.gx,g.gy)<2.4){
      g.state='view';g.timer=1;g.moving=false;
      g.face=player.gx>g.gx?1:-1;
    }
    g.tipT-=dt;
    if(g.tipT<=0){g.tipT=16;g.say=GUIDE_TIPS[g.tipI++%GUIDE_TIPS.length];g.sayUntil=t+6;g._sayLines=null;}
  }
  { // 로봇청소기 — NPC와 달리 멈추지 않고 통로 웨이포인트 연속 순회
    const dx=vac.tx-vac.gx,dy=vac.ty-vac.gy,dd=Math.hypot(dx,dy);
    const retarget=()=>{const p=randAisle();vac.tx=clamp(p.x,1.8,HALL_W-2.8);vac.ty=clamp(p.y,1.8,HALL_D-2.8);};
    if(dd<0.3)retarget();
    else{const sp=vac.speed*dt,bx=vac.gx,by=vac.gy;moveEnt(vac,dx/dd*sp,dy/dd*sp);
      if(Math.abs(vac.gx-bx)<1e-4&&Math.abs(vac.gy-by)<1e-4)retarget(); // 벽에 막히면 새 목적지
      if(Math.abs(dx)>0.01)vac.face=dx>0?1:-1;}
    vac.trailT-=dt;
    if(vac.trailT<=0){vac.trailT=0.16;vac.trail.push({x:vac.gx,y:vac.gy,a:0.5});}
    for(const p of vac.trail)p.a-=dt*0.22;
    while(vac.trail.length&&vac.trail[0].a<=0)vac.trail.shift();
  }
  if(typeof NET!=='undefined')NET.tick(dt); // 원격 유저 보간 (net.js는 main.js 뒤에 로드)

  activeBooth=null;let best=1.5;
  for(const b of BOOTHS){ // 부스 풋프린트 사각형까지의 거리 — 앞뒤좌우 어느 쪽이든 활성. 앞(+gy)은 관람 지점(gy+1.9)까지 풋프린트 취급
    const dx=Math.max(Math.abs(player.gx-b.gx)-1.2,0);
    const dyv=player.gy-b.gy,dy=Math.max(dyv<0?-dyv-0.5:dyv-1.9,0);
    const dd=Math.hypot(dx,dy);if(dd<best){best=dd;activeBooth=b;}}
  activeSpot=null;let ab=1.9;
  for(const d of DECOR){if(!d.act)continue;const dd=dist(player.gx,player.gy,d.gx,d.gy+0.8);if(dd<ab){ab=dd;activeSpot=d;}}
  for(const g of guides){const gd=dist(player.gx,player.gy,g.gx,g.gy);
    if(gd<ab){ab=gd;activeSpot=g;}} // 도슨트도 안내 스팟 — actSpot의 'info' 라우팅 재사용
  if(activeBooth&&activeSpot){if(best<=ab)activeSpot=null;else activeBooth=null;} // 겹치면 더 가까운 쪽 — 부스가 도슨트/스팟을 가리지 않게
  for(const b of BOOTHS)b.glow=lerp(b.glow,(b===activeBooth?1:0.28),0.18);

  let lbl='이동 통로',col='#4d8bff';
  if(player.gy>=HALL_D-3){lbl='입구 · Entrance';col='#4d8bff';}
  else{let bi=-1;ZONES.forEach((z,i)=>{
      if(Math.abs(player.gx-z.cx)<=BOOTH_DX+3.5 && player.gy>=z.cy-5 && player.gy<=z.cy+BOOTH_DY+5.5) bi=i;});
    if(bi>=0){lbl=TRACKS[bi].code+' · '+TRACKS[bi].name;col=TRACKS[bi].accent;}
    else if(Math.abs(player.gx-PLAZA.x)<=8&&Math.abs(player.gy-PLAZA.y)<=10.5){lbl='중앙 광장 · HELLO AI';col='#4d8bff';}
    else if(player.gx>=PG.x0-0.5&&player.gx<=PG.x1+0.5&&player.gy>=PG.y0-1&&player.gy<=PG.y1+1){lbl='플레이그라운드 · Playground';col='#a78bfa';}
    else if(player.gx>=61.5&&player.gx<=80&&player.gy>=20.5&&player.gy<=42.5){lbl='카페 라운지 · Cafe Lounge';col='#e0872f';}
    else if(player.gy>=17.5&&player.gy<=23.5&&player.gx>=8&&player.gx<=56){lbl='메시지 월 · Message Wall';col='#37d67a';}}
  if(zoneTxt.textContent!==lbl){ // DOM 쓰기는 변경 시에만 — 매 프레임 스타일 무효화 방지
    zoneTxt.textContent=lbl; zonePill.style.color=col;
    const zd=zonePill.querySelector('.zd'); if(zd){zd.style.background=col;zd.style.boxShadow='0 0 10px '+col;}
  }
  if(actBtn){actBtn.classList.toggle('on',!!(started&&!modalOpen&&(activeBooth||activeSpot)));
    const at=activeBooth?'▶ 관람하기':(activeSpot?ACT_BTN[activeSpot.act]:'▶ 관람하기');
    if(actBtn.textContent!==at)actBtn.textContent=at;}

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
  showModalBack();document.getElementById('mClose').onclick=closeModal;
}
let closeTid=0;
function showModalBack(){clearTimeout(closeTid);modalBack.classList.remove('closing');modalBack.classList.add('open');}
function closeModal(){modalOpen=false;gameOpen=false;if(gameTid){clearTimeout(gameTid);gameTid=0;}
  modalBack.classList.add('closing'); // 실제 제거는 animationend, 타이머는 폴백(스로틀 탭 등)
  clearTimeout(closeTid);closeTid=setTimeout(()=>modalBack.classList.remove('open','closing'),400);}
modalBack.addEventListener('animationend',()=>{
  if(modalBack.classList.contains('closing')){clearTimeout(closeTid);modalBack.classList.remove('open','closing');}});
modalBack.addEventListener('click',e=>{if(e.target===modalBack)closeModal();});

/* ---------- 상호작용 스팟 모달 (아이디어 월 · 안내) ---------- */
const ACT_BTN={game:'▶ 게임하기',idea:'✏ 메시지',info:'ℹ 안내'};
function spotHead(acc,tag,title,sub){
  return `<div class="m-head">
    <div class="accent-line" style="background:linear-gradient(90deg,${acc},transparent)"></div>
    <button class="m-close" id="mClose">✕</button>
    <span class="m-track" style="color:${acc};background:${hexA(acc,0.12)};border:1px solid ${hexA(acc,0.35)}">${tag}</span>
    <div class="m-title">${title}</div>
    <div class="m-team">${sub}</div>
  </div>`;
}
function openSpotModal(html){modalOpen=true;modal.innerHTML=html;showModalBack();document.getElementById('mClose').onclick=closeModal;}

/* 아이디어 월 — 서버 접속 시 서버(idea-notes.json)가 원본, localStorage는 오프라인 폴백 */
let ideaNotes=null;
try{ideaNotes=JSON.parse(localStorage.getItem('ideaNotes'));}catch(e){}
if(!Array.isArray(ideaNotes)||!ideaNotes.length)
  ideaNotes=['부스 동선 너무 좋아요 👍','T5 코드리뷰 부스터 실무에 쓰고 싶다','내년엔 우리 팀도 출전!'];
let saveNotesTid=0; // localStorage.setItem은 동기 I/O — 수신 러시 때 프레임 블록 방지용 디바운스
function flushNotes(){clearTimeout(saveNotesTid);saveNotesTid=0;
  try{localStorage.setItem('ideaNotes',JSON.stringify(ideaNotes.slice(-60)));}catch(e){}}
function saveNotes(){clearTimeout(saveNotesTid);saveNotesTid=setTimeout(flushNotes,400);}
addEventListener('pagehide',()=>{if(saveNotesTid)flushNotes();}); // 탭 닫기/새로고침 직전 유실 방지
const NOTE_C=['#ffd166','#8ce99a','#74c0fc','#ffa8a8','#e599f7'];
function openIdea(){
  const acc='#21a17a';
  openSpotModal(spotHead(acc,'MESSAGE WALL · 메시지 월','메시지 월','해커톤에서 떠오른 생각, 응원 한마디를 붙여보세요')+
    `<div class="m-body">
      <div class="note-form"><input id="noteIn" maxlength="80" placeholder="한 줄 남기기…"/><button id="noteAdd">붙이기</button></div>
      <div class="note-grid" id="noteGrid"></div>
    </div>`);
  const grid=document.getElementById('noteGrid'),inp=document.getElementById('noteIn');
  const paint=()=>{grid.innerHTML='';ideaNotes.forEach((n,i)=>{
    const el=document.createElement('div');el.className='note';
    el.style.background=NOTE_C[i%5];el.style.transform='rotate('+((i%5)-2)*1.6+'deg)';
    el.textContent=n;grid.appendChild(el);});
    grid.scrollTop=grid.scrollHeight;};
  const add=()=>{const v=inp.value.trim();if(!v)return;ideaNotes.push(v);saveNotes();inp.value='';paint();
    if(typeof NET!=='undefined')NET.idea(v);};
  document.getElementById('noteAdd').onclick=add;
  inp.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();add();}});
  window._ideaPaint=paint; // net.js가 원격 노트 수신 시 호출
  paint();
}

function openInfo(){
  const acc='#3d7bff';
  openSpotModal(spotHead(acc,'INFORMATION · 안내','전시관 안내','5개 트랙 20개 부스, 광장과 플레이그라운드까지 천천히 둘러보세요')+
    `<div class="m-body">
      <div class="m-summary">이동 <b>WASD / 방향키 / 클릭</b> · 관람 <b>Space</b> · 미니게임은 우측 플레이그라운드, 휴식은 입구 왼쪽 카페 라운지에서.</div>
      <div class="lib-list" style="margin-top:12px">${TRACKS.map(tr=>`<div class="lib-row"><div class="lib-term" style="color:${tr.accent}">${tr.code}</div><div class="lib-desc"><b>${tr.name}</b> — ${tr.tagline}</div></div>`).join('')}</div>
    </div>`);
}

/* ---------- 미니게임: 반응속도 ---------- */
// ponytail: 게임 종류가 늘면 game 키별 open 함수 라우팅으로 확장
let gameOpen=false,gameSt='idle',gameTid=0,gameT0=0,gameBest=null;
let gameRanks=[]; // [{nick,ms}] — 온라인이면 서버 순위(welcome/ranks), 오프라인이면 내 기록만
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function paintRanks(){
  const el=document.getElementById('rankList');if(!el)return;
  el.innerHTML=gameRanks.length?gameRanks.map((r,i)=>
    `<div class="rank-row${r.nick===player.nick?' me':''}"><span class="rk">${i+1}</span><span class="rnick">${esc(r.nick)}</span><span class="rms">${r.ms}ms</span></div>`).join('')
    :'<div class="rank-row">아직 기록 없음</div>';
}
function submitScore(ms){
  if(typeof NET!=='undefined'&&NET.score(ms))return; // 서버가 ranks 브로드캐스트로 갱신
  const nick=player.nick||'게스트',i=gameRanks.findIndex(r=>r.nick===nick); // 오프라인 폴백
  if(i>=0){if(ms>=gameRanks[i].ms)return;gameRanks[i].ms=ms;}
  else gameRanks.push({nick,ms});
  gameRanks.sort((a,b)=>a.ms-b.ms);gameRanks=gameRanks.slice(0,10);
  paintRanks();
}
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
    <div class="m-body"><div class="game-wrap">
      <div class="game-pad" id="gamePad"></div>
      <div class="rank-panel"><div class="rank-title">🏆 랭킹 TOP 10</div><div id="rankList"></div></div>
    </div></div>`;
  showModalBack();
  document.getElementById('mClose').onclick=closeModal;
  document.getElementById('gamePad').addEventListener('pointerdown',e=>{e.preventDefault();gameTap();});
  setPad('idle','반응속도 테스트','Space 또는 클릭으로 시작');
  paintRanks();
}
function setPad(cls,big,small){
  const p=document.getElementById('gamePad');if(!p)return;
  p.className='game-pad '+cls;
  p.innerHTML=`<div class="g-big">${big}</div><div class="g-small">${small}</div>`;
}
function gradeMs(ms){return ms<180?'⚡ 초인적':ms<250?'🔥 빠름':ms<350?'👍 평균':'🐢 느긋하시네요';}
function gameTap(){
  if(!gameOpen)return; // 모달 닫힘 애니메이션 중 잔여 탭 — 유령 타이머 예약 방지
  if(gameSt==='idle'||gameSt==='result'){
    gameSt='wait';setPad('wait','기다리세요…','초록색이 되면 바로!');
    gameTid=setTimeout(()=>{gameTid=0;gameSt='go';gameT0=performance.now();setPad('go','지금!','Space / 클릭');},1000+Math.random()*2500);
  }else if(gameSt==='wait'){
    clearTimeout(gameTid);gameTid=0;
    gameSt='result';setPad('fail','너무 빨라요 😅','초록색을 기다렸다 눌러야 해요 · Space로 재도전');
  }else if(gameSt==='go'){
    const ms=Math.round(performance.now()-gameT0);
    if(gameBest===null||ms<gameBest)gameBest=ms;
    submitScore(ms);
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
  chatBody.appendChild(el);
  while(chatBody.childElementCount>200)chatBody.firstElementChild.remove(); // DOM 무한 누적 방지
  if(!chat.classList.contains('collapsed'))chatBody.scrollTop=chatBody.scrollHeight; // 접힘(display:none) 중엔 강제 레이아웃 스킵
}
function sendChat(){
  const v=chatText.value.trim();if(!v)return;
  addChat(v,{self:true});chatText.value='';
  player.say=v;player.sayUntil=performance.now()/1000+6;player._sayLines=null; // 캐릭터 머리 위 말풍선 6초
  if(typeof NET!=='undefined')NET.chat(v);
}
chatSend.addEventListener('click',sendChat);
chatText.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();sendChat();}else if(e.key==='Escape'){chatText.blur();}});
chatHead.addEventListener('click',()=>{
  if(!chat.classList.toggle('collapsed'))chatBody.scrollTop=chatBody.scrollHeight; // 펼칠 때 최신 메시지로
});
addChat('전체 채팅에 입장했어요. 아직 서버 연결 전이라 내가 보낸 메시지는 내 화면에만 표시됩니다.',{sys:true});
addChat('부스 어디부터 도실 거예요?',{who:'김도현'});
addChat('저는 T1 설계·EDA 부스부터요 👀',{who:'이서연'});

/* 입장 — 닉네임 입력(자동 추천 기본값) 후 멀티유저 접속 */
const nickIn=document.getElementById('nickIn');
const suggestNick=()=>NICKS[(Math.random()*NICKS.length)|0]+((10+Math.random()*90)|0);
if(nickIn){
  nickIn.value=suggestNick();
  nickIn.addEventListener('keydown',e=>{if(e.key==='Enter')document.getElementById('enterBtn').click();});
  const rf=document.getElementById('nickRefresh');
  if(rf)rf.onclick=()=>{nickIn.value=suggestNick();nickIn.focus();};
}
document.getElementById('enterBtn').onclick=()=>{
  player.nick=((nickIn&&nickIn.value.trim())||suggestNick()).slice(0,12);
  if(typeof NET!=='undefined')NET.connect(player.nick);
  started=true;const intro=document.getElementById('intro');intro.style.opacity='0';setTimeout(()=>intro.style.display='none',500);
};
