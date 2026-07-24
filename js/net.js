/* 네트워크: 멀티유저 위치/채팅 동기화 (server.js와 짝) — HTTP로 열었을 때만 접속, file:// 은 조용히 오프라인 */
const NET=(()=>{
  let ws=null,timer=0,retryTid=0,retry=0,savedNick='',conn='offline';
  const remotes=new Map(); // id → drawChar 호환 원격 유저 엔티티
  const activeRemotes=new Set(); // 현재 AOI 안에 있어 update/render할 원격 유저
  const chatCount=document.getElementById('chatCount');
  let rebuildPending=false;
  function rebuild(){ // 동시 입퇴장 러시는 다음 프레임에 한 번만 반영
    if(rebuildPending)return;rebuildPending=true;
    requestAnimationFrame(()=>{
      rebuildPending=false;CHARS.length=0;CHARS.push(player,...npcs,vac,...activeRemotes);
      if(chatCount)chatCount.textContent=conn==='online'?'접속 '+(remotes.size+1)+'명'
        :conn==='connecting'?'연결 중…':'오프라인 · 재연결 중';
    });
  }
  function add(u){const r={id:u.id,gx:u.x,gy:u.y,buf:[],nick:u.nick,color:u.color||'#4d8bff',
    head:P.npcHead,moving:false,face:1,phase:Math.random()*7,isPlayer:false,isRemote:true,active:false,d:0};
    remotes.set(u.id,r);return r;}
  function setActive(r,on){
    if(r.active===on)return false;
    r.active=on;if(on)activeRemotes.add(r);else activeRemotes.delete(r);return true;
  }

  function connect(nick){
    if(!/^https?:$/.test(location.protocol))return;
    if(nick)savedNick=nick;
    clearTimeout(retryTid);
    if(ws&&ws.readyState<2)return;
    conn='connecting';rebuild();
    const socket=ws=new WebSocket((location.protocol==='https:'?'wss://':'ws://')+location.host);
    socket.onopen=()=>{
      socket.send(JSON.stringify({t:'hello',nick:savedNick,color:NPC_COLORS[(Math.random()*NPC_COLORS.length)|0],x:player.gx,y:player.gy}));
      let lx=0,ly=0,lm=null;
      timer=setInterval(()=>{ // 10Hz — 변화 있을 때만 전송
        if(socket.readyState!==1)return;
        if(Math.abs(player.gx-lx)<0.02&&Math.abs(player.gy-ly)<0.02&&player.moving===lm)return;
        lx=player.gx;ly=player.gy;lm=player.moving;
        socket.send(JSON.stringify({t:'pos',x:+player.gx.toFixed(2),y:+player.gy.toFixed(2),face:player.face,moving:player.moving}));
      },100);
    };
    socket.onmessage=ev=>{
      let m;try{m=JSON.parse(ev.data);}catch(e){return;}
      if(m.t==='welcome'){conn='online';retry=0;for(const u of m.users)add(u);rebuild();
        if(Array.isArray(m.notes)&&m.notes.length){ideaNotes.length=0;ideaNotes.push(...m.notes);saveNotes();} // 서버가 노트 원본
        if(Array.isArray(m.ranks)){gameRanks=m.ranks;paintRanks();}}
      else if(m.t==='join'){add(m);rebuild();addChat(m.nick+' 님이 입장했어요',{sys:true});}
      else if(m.t==='leave'){const r=remotes.get(m.id);
        if(r){activeRemotes.delete(r);remotes.delete(m.id);rebuild();addChat(r.nick+' 님이 퇴장했어요',{sys:true});}}
      else if(m.t==='snap'){
        let now=performance.now(); // 스톨 후 몰려온 버스트 — 수신 시각이 겹치면 서버 5Hz 간격으로 복원
        if(now-lastSnapAt<80)now=lastSnapAt+SNAP_INTERVAL;
        lastSnapAt=now;
        let changed=false;const seen=m.full?new Set():null;
        for(const[id,x,y,face,mv]of m.users){const r=remotes.get(id);
        if(seen)seen.add(id);
        if(!r)continue;
        changed=setActive(r,true)||changed;
        const lb=r.buf[r.buf.length-1];
        if(lb&&now-lb.t>SNAP_GAP_RESET){ // 장시간 미수신 후 재진입 — 현재 표시 위치에서 새 위치로 글라이드
          r.buf.length=0;r.buf.push({t:now-INTERP_DELAY,x:r.gx,y:r.gy,face,mv});}
        r.buf.push({t:now,x,y,face,mv});if(r.buf.length>12)r.buf.shift();}
        if(seen)for(const r of activeRemotes)if(!seen.has(r.id))changed=setActive(r,false)||changed;
        if(changed)rebuild();
      }
      else if(m.t==='chat'){addChat(m.text,{who:m.nick});
        const r=remotes.get(m.id);
        if(r){r.say=m.text;r.sayUntil=performance.now()/1000+6;r._sayLines=null;}} // 원격 유저도 말풍선
      else if(m.t==='ranks'){gameRanks=m.ranks;paintRanks();}
      else if(m.t==='gameGo'){serverGameGo();}
      else if(m.t==='idea'){ideaNotes.push(m.text);saveNotes();
        if(window._ideaPaint)window._ideaPaint();} // 모달 열려 있으면 즉시 갱신, 전광판은 자동
    };
    socket.onclose=()=>{
      if(ws!==socket)return;
      clearInterval(timer);ws=null;conn='offline';activeRemotes.clear();remotes.clear();rebuild();
      retryTid=setTimeout(()=>connect(),Math.min(1000*2**retry++,10000));
    };
  }
  /* 스냅샷 버퍼 보간 — 원격 유저를 INTERP_DELAY(ms) 과거 시점으로 렌더.
     패킷이 그만큼 늦어도 버퍼에 여유가 있어 멈춤·점프 없이 두 스냅샷 사이를 선형 보간 */
  const SNAP_INTERVAL=200; // 서버 위치 스냅샷 5Hz
  const INTERP_DELAY=320;  // 1.6개 스냅샷 여유 — 네트워크 지터에도 두 샘플 유지
  const SNAP_GAP_RESET=700;
  const MAX_EXTRAP=180;    // 패킷 하나가 늦을 때만 짧게 진행 방향을 예측
  let lastSnapAt=0;
  function tick(dt){
    const rt=performance.now()-INTERP_DELAY;
    for(const r of activeRemotes){
      const b=r.buf;
      while(b.length>=3&&b[1].t<=rt)b.shift(); // 외삽에 필요한 마지막 두 샘플은 보존
      if(b.length>=2&&b[0].t<=rt){
        const p0=b[0],p1=b[1],span=Math.max(1,p1.t-p0.t);
        if(rt<=p1.t){
          const a=(rt-p0.t)/span;
          r.gx=p0.x+(p1.x-p0.x)*a;r.gy=p0.y+(p1.y-p0.y)*a;
          r.moving=!!p1.mv;
        }else{ // 다음 패킷이 조금 늦으면 직전 속도로 최대 180ms만 진행
          const extra=Math.min(rt-p1.t,MAX_EXTRAP),moving=!!p1.mv&&rt-p1.t<=MAX_EXTRAP;
          r.gx=p1.x+(p1.x-p0.x)/span*extra;r.gy=p1.y+(p1.y-p0.y)/span*extra;
          r.moving=moving;
        }
        r.face=p1.face;
      }else if(b.length===1&&b[0].t<=rt){ // 첫 샘플만 있으면 해당 위치에서 다음 샘플 대기
        r.gx=b[0].x;r.gy=b[0].y;r.face=b[0].face;r.moving=false;
      }
      if(r.moving)r.phase+=dt*10;
    }
  }
  const chat=t=>{if(ws&&ws.readyState===1)ws.send(JSON.stringify({t:'chat',text:t}));};
  const idea=t=>{if(ws&&ws.readyState===1)ws.send(JSON.stringify({t:'idea',text:t}));};
  const startGame=()=>{if(ws&&ws.readyState===1){ws.send(JSON.stringify({t:'gameStart'}));return true;}return false;};
  const cancelGame=()=>{if(ws&&ws.readyState===1)ws.send(JSON.stringify({t:'gameCancel'}));};
  const score=()=>{if(ws&&ws.readyState===1){ws.send(JSON.stringify({t:'score'}));return true;}return false;};
  return{connect,tick,chat,idea,startGame,cancelGame,score};
})();
