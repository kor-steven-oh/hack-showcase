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
const NPC_COUNT=50,npcs=[];
for(let i=0;i<NPC_COUNT;i++){
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

/* AI 심사위원단(5) — 한 팀으로 부스를 순회하며 함께 평가 */
const JUDGE_NAMES=['Ada','Turing','Grace','Nova','Atlas'];
const JUDGE_LINES=[
  '음.. 훌륭하군!','대단해!','이런 혁신이!','완성도가 높군요!','흥미로운 접근입니다!',
  '문제 정의가 명확하군요.','실무 활용성이 돋보입니다!','데모가 인상적이에요.','기술 선택이 영리하군요!',
  '사용자 경험까지 고민했네요.','확장 가능성이 기대됩니다!','팀워크가 느껴지는 결과네요.','아이디어가 참 신선합니다!',
  '데이터를 잘 활용했군요.','발표가 아주 설득력 있어요!','조금 더 자세히 보고 싶군요.',
  '핵심 가치가 한눈에 들어오네요.','복잡한 문제를 간결하게 풀었군요!','결과 지표가 인상적입니다.',
  '현업의 어려움을 정확히 짚었어요.','모델의 설명 가능성도 좋군요.','프로토타입 완성도가 기대 이상이에요!',
  '접근 방식에 독창성이 있습니다.','도입 효과가 명확해 보이네요.','기술과 사용자 가치의 균형이 좋아요.',
  '안정성까지 잘 고려했군요.','발전 가능성이 큰 프로젝트입니다!','세부 구현이 아주 탄탄하네요.'
];
const JUDGE_DIALOGUES=[
  [[0,'Turing, 이 구조는 어떻게 봐요?'],[1,'좋습니다. 확장성도 충분해 보여요.']],
  [[2,'Nova, 사용자 관점에서는 어때요?'],[3,'흐름이 직관적이라 바로 쓸 수 있겠어요.']],
  [[4,'Ada, 이 아이디어의 강점은 뭘까요?'],[0,'명확한 문제 해결과 높은 실용성이에요.']],
  [[1,'Grace, 기술 선택에 동의하나요?'],[2,'네, 요구사항에 아주 잘 맞는 선택이에요.']],
  [[3,'Atlas, 실제 도입도 가능해 보이나요?'],[4,'충분합니다. 운영 계획만 보완하면 되겠어요.']],
  [[0,'다들 데모 결과는 어떻게 봤나요?'],[2,'수치와 체감 효과가 모두 인상적이었어요.']],
  [[1,'Atlas, 데이터 신뢰도는 충분할까요?'],[4,'검증 절차가 명확해서 신뢰할 만합니다.']],
  [[2,'Ada, 보안 측면에서 우려는 없나요?'],[0,'민감 정보 처리만 보완하면 괜찮겠어요.']],
  [[3,'Turing, 성과 지표가 설득력 있나요?'],[1,'네, 기존 방식과의 비교가 명확합니다.']],
  [[4,'Grace, 차별점이 충분히 보이나요?'],[2,'핵심 기능에서 독창성이 확실히 드러나요.']],
  [[0,'Nova, 도입 순서는 어떻게 잡으면 좋을까요?'],[3,'작은 조직에서 검증한 뒤 확장하면 좋겠어요.']],
  [[1,'Atlas, 유지보수 부담은 어떨까요?'],[4,'구조가 단순해서 운영 부담도 낮아 보입니다.']]
];
const JUDGE_OFFSETS=[[-1.25,-0.1],[0,0],[1.3,0.15],[-0.65,1.15],[0.75,1.3]];
const judgeGroup={state:'walk',timer:0,talk:2,lastBooth:-1,visited:new Set(),reply:null,lastLine:'',lastDialogue:-1,leaveAt:0};
const judges=JUDGE_OFFSETS.map((_,i)=>{
  const j={gx:HALL_W/2-1.2+i*0.6,gy:HALL_D-4,nick:'🧠 '+JUDGE_NAMES[i],color:['#6c5ce7','#8b5cf6','#a78bfa','#7c3aed','#5b21b6'][i],
    head:'#e9e1ff',isJudge:1,speed:1.8+Math.random()*0.4,state:'walk',phase:i,moving:true,face:1,isPlayer:false,tx:0,ty:0};
  npcs.push(j);return j;
});
function sendJudges(){
  if(judgeGroup.visited.size>=BOOTHS.length)judgeGroup.visited.clear();
  const cx=judges.reduce((s,j)=>s+j.gx,0)/judges.length,cy=judges.reduce((s,j)=>s+j.gy,0)/judges.length;
  let bi=-1,nearest=Infinity;
  BOOTHS.forEach((b,i)=>{
    if(judgeGroup.visited.has(i)||(i===judgeGroup.lastBooth&&BOOTHS.length>1))return;
    const d=dist(cx,cy,b.view.x,b.view.y);if(d<nearest){nearest=d;bi=i;}
  });
  if(bi<0){judgeGroup.visited.clear();bi=judgeGroup.lastBooth===0?1:0;}
  judgeGroup.visited.add(bi);
  judgeGroup.lastBooth=bi;judgeGroup.state='walk';judgeGroup.reply=null;judgeGroup.leaveAt=0;
  const b=BOOTHS[bi];
  judges.forEach((j,i)=>{
    j.tx=b.view.x+JUDGE_OFFSETS[i][0]+(Math.random()-.5)*0.25;
    j.ty=b.view.y+JUDGE_OFFSETS[i][1]+(Math.random()-.5)*0.2;j.moving=true;j.sayUntil=0;
  });
}
sendJudges();

/* 로봇청소기 — 통로를 쉼 없이 순회하며 청소. trail: 지나온 자리 반짝 자국 */
const vac={gx:HALL_W/2+3,gy:HALL_D-4,isVac:true,speed:1.4,tx:0,ty:0,trail:[],trailT:0,face:1,moving:true,phase:0};
{const p=randAisle();vac.tx=p.x;vac.ty=p.y;}
const CHARS=[player,...npcs,vac]; // 렌더 depth 병합용 — 멤버 고정, 매 프레임 d만 갱신

/* ---------- 입력 ---------- */
const keys={};
const K_UP=['w','ArrowUp'],K_DOWN=['s','ArrowDown'],K_LEFT=['a','ArrowLeft'],K_RIGHT=['d','ArrowRight'];
let started=false,activeBooth=null,activeSpot=null,hoverBooth=null,hoverSpot=null,modalOpen=false;
/* 상호작용 스팟(act) 라우팅 — DECOR의 act 키와 1:1 */
function actSpot(spot=activeSpot){
  if(!spot)return;
  const a=spot.act;
  if(a==='game')openGame();
  else if(a==='idea')openIdea();
  else if(a==='info')openInfo();
  else if(a==='ranking')openRanking();
}
function interact(){if(activeBooth)openModal(activeBooth.ex);else actSpot();}
function hitPanel(clientX,clientY){
  const x=clientX-camX,y=clientY-camY;
  for(const b of BOOTHS)if(Math.abs(x-b.sx)<=48&&y>=b.sy-188&&y<=b.sy-22)return{booth:b};
  for(const d of DECOR)if(d.type==='board'&&d.act&&Math.abs(x-d.sx)<=79&&y>=d.sy-116&&y<=d.sy-20)return{spot:d};
  return null;
}
let mouseX=0,mouseY=0,mouseInside=false;
function updatePanelHover(){
  const hit=mouseInside&&started&&!modalOpen?hitPanel(mouseX,mouseY):null;
  hoverBooth=hit?.booth||null;hoverSpot=hit?.spot||null;
  const cursor=hit?'pointer':'default';if(cv.style.cursor!==cursor)cv.style.cursor=cursor;
}
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
cv.addEventListener('mousemove',e=>{mouseX=e.clientX;mouseY=e.clientY;mouseInside=true;updatePanelHover();});
cv.addEventListener('mouseleave',()=>{mouseInside=false;updatePanelHover();});
cv.addEventListener('click',e=>{ // 패널 클릭은 관람, 나머지는 기존 클릭 이동
  if(!started||modalOpen)return;
  const hit=hitPanel(e.clientX,e.clientY);
  if(hit){player.tgt=null;if(hit.booth)openModal(hit.booth.ex);else actSpot(hit.spot);return;}
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
// 가까운 라운지 한 곳에서만 짧은 문답. 전체 채팅이나 서버로 보내지 않는다.
const loungeWorkers=ZONES.map((_,i)=>DECOR.filter(d=>d.type==='sitter'&&d.working&&d.track===i));
const loungeChat={wait:4,track:-1,turn:0,rounds:ZONES.map(()=>0),speaker:null,text:'',left:0};
function updateLoungeChat(dt){
  if(!started||modalOpen){loungeChat.speaker=null;loungeChat.track=-1;loungeChat.wait=4;return;}
  const nearby=ZONES.findIndex(z=>dist(player.gx,player.gy,z.cx-2,z.cy+4)<8);
  if(nearby<0||nearby!==loungeChat.track&&loungeChat.speaker){
    loungeChat.speaker=null;loungeChat.track=-1;loungeChat.wait=4;
  }
  if(nearby<0)return;
  if(loungeChat.speaker){
    loungeChat.left-=dt;if(loungeChat.left>0)return;
    if(loungeChat.turn===0){
      loungeChat.turn=1;
      const round=loungeChat.rounds[nearby],lines=LOUNGE_ACTIVITY[nearby].dialogues;
      loungeChat.speaker=loungeWorkers[nearby][(round*2+1)%6];
      loungeChat.text=lines[round%lines.length][1];loungeChat.left=3.5;
    }else{
      loungeChat.speaker=null;loungeChat.rounds[nearby]++;loungeChat.wait=8;
    }
    return;
  }
  loungeChat.wait-=dt;if(loungeChat.wait>0)return;
  const round=loungeChat.rounds[nearby],lines=LOUNGE_ACTIVITY[nearby].dialogues;
  loungeChat.track=nearby;loungeChat.turn=0;
  loungeChat.speaker=loungeWorkers[nearby][(round*2)%6];
  loungeChat.text=lines[round%lines.length][0];loungeChat.left=3.5;
}

function update(dt,t){
  updateLoungeChat(dt);
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
    if(n.isJudge)continue;
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
  if(judgeGroup.state==='walk'){
    let arrived=0,blocked=false;
    for(const j of judges){
      const dx=j.tx-j.gx,dy=j.ty-j.gy,dd=Math.hypot(dx,dy);
      if(dd<0.2){j.moving=false;arrived++;continue;}
      let mx=dx/dd,my=dy/dd;
      for(const o of judges)if(o!==j){
        const ox=j.gx-o.gx,oy=j.gy-o.gy,od=Math.hypot(ox,oy);
        if(od>0&&od<0.85){const push=(0.85-od)*1.2;mx+=ox/od*push;my+=oy/od*push;}
      }
      const mm=Math.hypot(mx,my)||1,bx=j.gx,by=j.gy,sp=j.speed*dt;moveEnt(j,mx/mm*sp,my/mm*sp);
      if(Math.abs(j.gx-bx)<1e-4&&Math.abs(j.gy-by)<1e-4)blocked=true;
      j.moving=true;j.phase+=dt*10;if(Math.abs(dx)>0.01)j.face=dx>0?1:-1;
    }
    if(blocked)sendJudges();
    else if(arrived===judges.length){judgeGroup.state='view';judgeGroup.timer=12+Math.random()*5;judgeGroup.talk=1+Math.random()*2;}
  }else{
    judgeGroup.timer-=dt;judgeGroup.talk-=dt;
    if(judgeGroup.talk<=0&&(judgeGroup.timer>0||judgeGroup.reply)){
      const replying=!!judgeGroup.reply;
      let turn=judgeGroup.reply;
      if(turn)judgeGroup.reply=null;
      else if(Math.random()<0.5){
        let di;do{di=(Math.random()*JUDGE_DIALOGUES.length)|0;}while(di===judgeGroup.lastDialogue);
        judgeGroup.lastDialogue=di;const pair=JUDGE_DIALOGUES[di];turn=pair[0];judgeGroup.reply=pair[1];
      }else{
        let line;do{line=JUDGE_LINES[(Math.random()*JUDGE_LINES.length)|0];}while(line===judgeGroup.lastLine);
        turn=[(Math.random()*judges.length)|0,line];
      }
      judgeGroup.lastLine=turn[1];
      const j=judges[turn[0]];j.say=turn[1];j.sayUntil=t+4;j._sayLines=null;
      if(replying)judgeGroup.leaveAt=t+4.5;
      judgeGroup.talk=2.5+Math.random()*2;
    }
    if(judgeGroup.timer<=0&&!judgeGroup.reply&&t>=judgeGroup.leaveAt)sendJudges();
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
  updatePanelHover();
  for(const b of BOOTHS)b.glow=lerp(b.glow,(b===activeBooth||b===hoverBooth?1:0.28),0.18);

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

let last=performance.now(),lastRender=0;
function loop(now){let dt=(now-last)/1000;last=now;if(dt>0.05)dt=0.05;const t=now/1000;update(dt,t);
  if((started&&!modalOpen)||now-lastRender>=100){render(t,Math.min((now-lastRender)/1000,0.1));lastRender=now;}
  requestAnimationFrame(loop);}
requestAnimationFrame(loop);

/* ---------- 모달 ---------- */
const modalBack=document.getElementById('modalBack'),modal=document.getElementById('modal');
const AVA=['#3d7bff','#12b3a6','#6c5ce7','#e0872f','#e0533f'];
function downloadBrochure(ex){
  const people=ex.members.map(m=>`<li><b>${esc(m[0])}</b> · ${esc(m[1])}</li>`).join('');
  const html=`<!doctype html><html lang="ko"><meta charset="utf-8"><meta name="viewport" content="width=device-width">
  <title>${esc(ex.title)} · 프로젝트 소개서</title><style>
  body{max-width:800px;margin:50px auto;padding:0 28px;font:16px/1.7 Arial,sans-serif;color:#172033}
  header{border-top:6px solid ${ex.accent};padding-top:28px}small{color:#64748b}h1{font-size:34px;line-height:1.2;margin:8px 0}
  section{margin-top:36px}h2{font-size:18px;border-bottom:1px solid #dbe2ea;padding-bottom:8px}
  .tags{display:flex;flex-wrap:wrap;gap:8px}.tags span{padding:5px 10px;border-radius:8px;background:#eef2ff}li{margin:6px 0}
  </style><body><header><small>${esc(ex.code)} · ${esc(ex.trackName)} · ${esc(ex.award)}</small>
  <h1>${esc(ex.title)}</h1><b>${esc(ex.team)}</b></header>
  <section><h2>프로젝트 개요</h2><h3>${esc(ex.summary)}</h3><p>${esc(ex.desc)}</p></section>
  <section><h2>핵심 기술</h2><div class="tags">${ex.tags.map(tag=>`<span>${esc(tag)}</span>`).join('')}</div></section>
  <section><h2>팀 구성원</h2><ul>${people}</ul></section></body></html>`;
  const url=URL.createObjectURL(new Blob([html],{type:'text/html;charset=utf-8'})),a=document.createElement('a');
  a.href=url;a.download=`${ex.code}-${ex.title.replace(/[\\/:*?"<>|]/g,'-')}-소개서.html`;a.click();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
}
function openModal(ex){
  modalOpen=true;
  modal.classList.add('exhibit-modal');
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
    <div class="m-body exhibit-body">
      <section class="demo-panel"><div class="panel-bar"><span class="panel-label">DEMO VIDEO · 데모 영상</span></div>${video}</section>
      <section class="project-panel">
        <div class="panel-bar"><span class="panel-label">PROJECT STORY · 프로젝트 소개</span><button class="brochure-download" id="brochureDownload">↓ 상세 소개서</button></div>
        <div class="project-slides">
          <div class="project-slide on">
            <div class="slide-kicker">01 · OVERVIEW</div><h3>프로젝트 개요</h3>
            <div class="m-summary">${ex.summary}</div><div class="m-desc">${ex.desc}</div>
          </div>
          <div class="project-slide">
            <div class="slide-kicker">02 · TECHNOLOGY</div><h3>핵심 기술</h3>
            <div class="m-desc">프로젝트를 구현한 주요 기술과 키워드입니다.</div><div class="tags">${tags}</div>
          </div>
          <div class="project-slide">
            <div class="slide-kicker">03 · TEAM</div><h3>팀 소개</h3>
            <div class="members">${members}</div>
          </div>
          <div class="slide-nav">
            <button id="slidePrev" aria-label="이전 소개 페이지">←</button>
            <div class="slide-dots">${[0,1,2].map(i=>`<button class="${i?'':'on'}" data-slide="${i}" aria-label="${i+1}번 소개 페이지"></button>`).join('')}</div>
            <span id="slidePage">1 / 3</span>
            <button id="slideNext" aria-label="다음 소개 페이지">→</button>
          </div>
        </div>
      </section>
    </div>`;
  showModalBack();document.getElementById('mClose').onclick=closeModal;
  document.getElementById('brochureDownload').onclick=()=>downloadBrochure(ex);
  const slides=[...modal.querySelectorAll('.project-slide')],dots=[...modal.querySelectorAll('[data-slide]')];let slide=0;
  const slideTo=i=>{slide=clamp(i,0,slides.length-1);slides.forEach((el,n)=>el.classList.toggle('on',n===slide));
    dots.forEach((el,n)=>el.classList.toggle('on',n===slide));document.getElementById('slidePage').textContent=(slide+1)+' / '+slides.length;
    document.getElementById('slidePrev').disabled=slide===0;document.getElementById('slideNext').disabled=slide===slides.length-1;};
  document.getElementById('slidePrev').onclick=()=>slideTo(slide-1);
  document.getElementById('slideNext').onclick=()=>slideTo(slide+1);
  dots.forEach(btn=>btn.onclick=()=>slideTo(+btn.dataset.slide));slideTo(0);
}
let closeTid=0;
function showModalBack(){clearTimeout(closeTid);modalBack.classList.remove('closing');modalBack.classList.add('open');}
function closeModal(){if(gameOpen&&typeof NET!=='undefined')NET.cancelGame();modalOpen=false;gameOpen=false;if(gameTid){clearTimeout(gameTid);gameTid=0;}
  modalBack.classList.add('closing'); // 실제 제거는 animationend, 타이머는 폴백(스로틀 탭 등)
  clearTimeout(closeTid);closeTid=setTimeout(()=>modalBack.classList.remove('open','closing'),400);}
modalBack.addEventListener('animationend',()=>{
  if(modalBack.classList.contains('closing')){clearTimeout(closeTid);modalBack.classList.remove('open','closing');}});
modalBack.addEventListener('click',e=>{if(e.target===modalBack)closeModal();});

/* ---------- 상호작용 스팟 모달 (아이디어 월 · 안내) ---------- */
const ACT_BTN={game:'▶ 게임하기',idea:'✏ 메시지',info:'ℹ 안내',ranking:'♥ 랭킹·투표'};
function spotHead(acc,tag,title,sub){
  return `<div class="m-head">
    <div class="accent-line" style="background:linear-gradient(90deg,${acc},transparent)"></div>
    <button class="m-close" id="mClose">✕</button>
    <span class="m-track" style="color:${acc};background:${hexA(acc,0.12)};border:1px solid ${hexA(acc,0.35)}">${tag}</span>
    <div class="m-title">${title}</div>
    <div class="m-team">${sub}</div>
  </div>`;
}
function openSpotModal(html){modalOpen=true;modal.classList.remove('exhibit-modal');modal.innerHTML=html;showModalBack();document.getElementById('mClose').onclick=closeModal;}

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
let teamLikes=null,votedTeams=null;
try{teamLikes=JSON.parse(localStorage.getItem('teamLikes'));}catch(e){}
try{votedTeams=new Set(JSON.parse(localStorage.getItem('votedTeams')));}catch(e){}
const legacyLikes=Array.isArray(teamLikes)&&Math.max(0,...teamLikes)<50;
teamLikes=EXHIBITS.map((ex,i)=>Math.max(0,+(Array.isArray(teamLikes)?teamLikes[i]:0)||0)+(legacyLikes||!Array.isArray(teamLikes)?ex.likes:0));
if(!(votedTeams instanceof Set))votedTeams=new Set();
function setTeamLikes(likes){
  teamLikes=EXHIBITS.map((_,i)=>Math.max(0,+likes?.[i]||0));
  try{localStorage.setItem('teamLikes',JSON.stringify(teamLikes));}catch(e){}
  paintTeamRanks();
}
function paintTeamRanks(){
  const el=document.getElementById('teamRankList');if(!el)return;
  const ranked=EXHIBITS.map((ex,i)=>({ex,likes:teamLikes[i]})).sort((a,b)=>b.likes-a.likes||a.ex.id-b.ex.id);
  document.getElementById('teamLikeTotal').textContent=teamLikes.reduce((a,b)=>a+b,0).toLocaleString();
  document.getElementById('teamVoteCount').textContent=votedTeams.size;
  document.getElementById('teamPodium').innerHTML=[ranked[1],ranked[0],ranked[2]].map((r,i)=>{
    const rank=[2,1,3][i];
    return `<div class="podium p${rank}" style="--team:${r.ex.accent}"><span>${rank===1?'🏆':rank===2?'🥈':'🥉'}</span><b>${esc(r.ex.team)}</b><small>${esc(r.ex.title)}</small><strong>♥ ${r.likes}</strong></div>`;
  }).join('');
  el.innerHTML=ranked.map((r,i)=>`<div class="team-rank-row">
    <span class="team-rk">${i+1}</span><span class="team-track" style="color:${r.ex.accent};border-color:${hexA(r.ex.accent,0.35)}">${r.ex.code}</span><span class="team-rank-name"><b>${esc(r.ex.team)}</b><small>${esc(r.ex.title)}</small></span>
    <span class="team-likes">♥ ${r.likes}</span><button data-vote="${r.ex.id}"${votedTeams.has(r.ex.id)?' disabled':''}>${votedTeams.has(r.ex.id)?'✓ 투표함':'투표'}</button>
  </div>`).join('');
  el.querySelectorAll('[data-vote]').forEach(btn=>btn.onclick=()=>voteTeam(+btn.dataset.vote));
}
function voteTeam(id){
  const i=EXHIBITS.findIndex(ex=>ex.id===id);if(i<0||votedTeams.has(id))return;
  votedTeams.add(id);teamLikes[i]++;
  try{localStorage.setItem('votedTeams',JSON.stringify([...votedTeams]));}catch(e){}
  setTeamLikes(teamLikes);
  if(typeof NET!=='undefined')NET.vote(id);
}
function openRanking(){
  const acc='#e0533f';
  openSpotModal(spotHead(acc,'TEAM RANKING · 실시간 투표','팀 랭킹','마음에 든 프로젝트에 좋아요를 눌러 응원하세요')+
    `<div class="m-body">
      <div class="team-rank-summary"><div><strong id="teamLikeTotal">0</strong><span>총 좋아요</span></div><div><strong>20</strong><span>참가 팀</span></div><div><strong id="teamVoteCount">0</strong><span>내 투표</span></div></div>
      <div class="team-podium" id="teamPodium"></div>
      <div class="m-sec-title">전체 순위 · 팀별 한 번씩 투표할 수 있어요</div>
      <div class="team-rank-list" id="teamRankList"></div>
    </div>`);
  paintTeamRanks();
}
function paintRanks(){
  const el=document.getElementById('rankList');if(!el)return;
  el.innerHTML=gameRanks.length?gameRanks.map((r,i)=>
    `<div class="rank-row${r.nick===player.nick?' me':''}"><span class="rk">${i+1}</span><span class="rnick">${esc(r.nick)}</span><span class="rms">${r.ms}ms</span></div>`).join('')
    :'<div class="rank-row">아직 기록 없음</div>';
}
function submitScore(ms){
  if(typeof NET!=='undefined'&&NET.score())return; // 서버가 GO 시점부터 경과 시간을 계산해 ranks 브로드캐스트
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
    if(typeof NET!=='undefined'&&NET.startGame())return; // 온라인은 서버가 GO 시점을 발급
    gameTid=setTimeout(()=>{gameTid=0;serverGameGo();},1000+Math.random()*2500);
  }else if(gameSt==='wait'){
    clearTimeout(gameTid);gameTid=0;if(typeof NET!=='undefined')NET.cancelGame();
    gameSt='result';setPad('fail','너무 빨라요 😅','초록색을 기다렸다 눌러야 해요 · Space로 재도전');
  }else if(gameSt==='go'){
    const ms=Math.round(performance.now()-gameT0);
    if(gameBest===null||ms<gameBest)gameBest=ms;
    submitScore(ms);
    gameSt='result';setPad('result',ms+'ms',gradeMs(ms)+' · 최고 기록 '+gameBest+'ms · Space로 재도전');
  }
}
function serverGameGo(){
  if(!gameOpen||gameSt!=='wait')return;
  gameSt='go';gameT0=performance.now();setPad('go','지금!','Space / 클릭');
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
const AMBIENT_CHAT=[
  '어느 부스부터 볼지 행복한 고민 중이에요 😊',
  '중앙 전광판 앞에서 랭킹 확인했어요?',
  'T1 설계·EDA 쪽 데모가 정말 빠르네요',
  '방금 투표하고 왔습니다 🙌',
  'AI 심사위원단 따라가면 재밌는 부스가 보여요',
  '프로젝트 소개 슬라이드 구성이 좋네요',
  '데모 영상 보고 아이디어가 확 이해됐어요',
  'T2 수율·품질 부스도 꼭 들러보세요',
  '좋아요 순위가 계속 바뀌고 있네요!',
  '이런 전시 방식 신선하고 재밌어요',
  '팀 설명 들으니 기술 포인트가 명확하네요',
  '메시지 월에 응원 한마디 남겼어요 💬',
  '지금 중앙 광장에서 만날 분?',
  'T3 설비·운영 트랙부터 정주행 중입니다',
  '상세 소개서 다운로드 기능 편하네요',
  '아이디어도 좋고 완성도도 높아요',
  '어떤 팀에 투표할지 고민되네요',
  '심사위원들이 한참 토론하고 있어요 👀',
  '플레이그라운드 미니게임 해보셨나요?',
  '반응속도 랭킹 도전 중입니다 🔥',
  'T4 HR·People 프로젝트가 따뜻하네요',
  '부스마다 색깔이 달라서 찾기 쉬워요',
  '발표 자료가 핵심만 잘 담겼어요',
  '데모에서 실제 활용 장면이 잘 보이네요',
  '좋아요 한 표가 순위를 바꿀 수도 있겠어요',
  '카페 라운지에서 잠깐 쉬어갑니다 ☕',
  'T5 DevX 팀들 아이디어가 실용적이네요',
  '코드 리뷰 프로젝트 인상 깊었어요',
  'AI 심사위원 오라가 멀리서도 보여요',
  '전시관 한 바퀴 도는 데 시간 가는 줄 모르겠네요',
  '팀원 소개까지 볼 수 있어서 좋습니다',
  '이 프로젝트 실제로 써보고 싶어요',
  '부스 앞에서 Space 누르면 상세 화면이 열려요',
  '중앙 랭킹 보드에서 바로 투표할 수 있어요',
  '다들 가장 기억에 남는 프로젝트가 뭔가요?',
  '기술 스택 설명이 구체적이라 좋네요',
  '심사위원 질문이 꽤 날카롭네요 😄',
  '아이디어와 구현의 균형이 훌륭합니다',
  '팀별 좋아요 수 보는 재미가 있네요',
  '전시 동선이 넓어서 둘러보기 편해요',
  '저는 자동화 주제 프로젝트가 눈에 들어오네요',
  '발표 슬라이드 다음 장도 꼭 넘겨보세요',
  '프로젝트 소개서를 저장해뒀습니다',
  '다른 트랙과 결합해도 재미있겠어요',
  '현업 문제를 제대로 짚은 프로젝트네요',
  '짧은 데모인데도 임팩트가 큽니다',
  '심사 결과가 벌써 궁금해요!',
  '응원하는 팀에 좋아요 눌렀습니다 💙',
  '마지막 부스까지 전부 보고 투표하려고요',
  '모든 참가 팀 수고 많으셨습니다 👏'
];
let ambientChatCount=0,ambientChatStarted=false;
function queueAmbientChat(){
  if(ambientChatCount>=AMBIENT_CHAT.length)return;
  setTimeout(()=>{
    if(typeof NET==='undefined'||NET.userCount()<10){
      const i=ambientChatCount++;
      addChat(AMBIENT_CHAT[i],{who:NICKS[(i*7+3)%NICKS.length]});
    }
    queueAmbientChat();
  },2200+Math.random()*2800);
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
  if(!ambientChatStarted){ambientChatStarted=true;queueAmbientChat();}
  started=true;const intro=document.getElementById('intro');intro.style.opacity='0';setTimeout(()=>intro.style.display='none',500);
};
