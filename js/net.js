/* 네트워크: 멀티유저 위치/채팅 동기화 (server.js와 짝) — HTTP로 열었을 때만 접속, file:// 은 조용히 오프라인 */
const NET=(()=>{
  let ws=null,timer=0;
  const remotes=new Map(); // id → drawChar 호환 원격 유저 엔티티
  const chatCount=document.getElementById('chatCount');
  function rebuild(){ // CHARS 재구성은 입퇴장 때만 — 렌더 depth 병합 루프는 그대로
    CHARS.length=0;CHARS.push(player,...npcs,vac,...remotes.values());
    if(chatCount)chatCount.textContent='접속 '+(remotes.size+1)+'명';
  }
  function add(u){remotes.set(u.id,{gx:u.x,gy:u.y,buf:[],nick:u.nick,color:u.color||'#4d8bff',
    head:P.npcHead,moving:false,face:1,phase:Math.random()*7,isPlayer:false,d:0});}

  function connect(nick){
    if(!/^https?:$/.test(location.protocol))return;
    ws=new WebSocket((location.protocol==='https:'?'wss://':'ws://')+location.host);
    ws.onopen=()=>{
      ws.send(JSON.stringify({t:'hello',nick,color:NPC_COLORS[(Math.random()*NPC_COLORS.length)|0],x:player.gx,y:player.gy}));
      let lx=0,ly=0,lm=null;
      timer=setInterval(()=>{ // 10Hz — 변화 있을 때만 전송
        if(ws.readyState!==1)return;
        if(Math.abs(player.gx-lx)<0.02&&Math.abs(player.gy-ly)<0.02&&player.moving===lm)return;
        lx=player.gx;ly=player.gy;lm=player.moving;
        ws.send(JSON.stringify({t:'pos',x:+player.gx.toFixed(2),y:+player.gy.toFixed(2),face:player.face,moving:player.moving}));
      },100);
    };
    ws.onmessage=ev=>{
      let m;try{m=JSON.parse(ev.data);}catch(e){return;}
      if(m.t==='welcome'){for(const u of m.users)add(u);rebuild();
        if(Array.isArray(m.notes)&&m.notes.length){ideaNotes.length=0;ideaNotes.push(...m.notes);saveNotes();} // 서버가 노트 원본
        if(Array.isArray(m.ranks)){gameRanks=m.ranks;paintRanks();}}
      else if(m.t==='join'){add(m);rebuild();addChat(m.nick+' 님이 입장했어요',{sys:true});}
      else if(m.t==='leave'){const r=remotes.get(m.id);
        if(r){remotes.delete(m.id);rebuild();addChat(r.nick+' 님이 퇴장했어요',{sys:true});}}
      else if(m.t==='snap'){
        let now=performance.now(); // 스톨 후 몰려온 버스트 — 수신 시각이 겹치면 서버 10Hz 간격으로 복원
        if(now-lastSnapAt<50)now=lastSnapAt+100;
        lastSnapAt=now;
        for(const[id,x,y,face,mv]of m.users){const r=remotes.get(id);
        if(!r)continue;
        const lb=r.buf[r.buf.length-1];
        if(lb&&now-lb.t>300){ // 정지했다 재이동 — 오래된 스냅샷 버리고 현재 표시 위치에서 새 위치로 글라이드
          r.buf.length=0;r.buf.push({t:now-INTERP_DELAY,x:r.gx,y:r.gy,face,mv});}
        r.buf.push({t:now,x,y,face,mv});if(r.buf.length>12)r.buf.shift();}}
      else if(m.t==='chat'){addChat(m.text,{who:m.nick});
        const r=[...remotes.values()].find(u=>u.nick===m.nick);
        if(r){r.say=m.text;r.sayUntil=performance.now()/1000+6;r._sayLines=null;}} // 원격 유저도 말풍선
      else if(m.t==='ranks'){gameRanks=m.ranks;paintRanks();}
      else if(m.t==='idea'){ideaNotes.push(m.text);saveNotes();
        if(window._ideaPaint)window._ideaPaint();} // 모달 열려 있으면 즉시 갱신, 전광판은 자동
    };
    ws.onclose=()=>{clearInterval(timer);remotes.clear();rebuild();}; // ponytail: 자동 재접속 없음 — 필요해지면 지수 백오프로
  }
  /* 스냅샷 버퍼 보간 — 원격 유저를 INTERP_DELAY(ms) 과거 시점으로 렌더.
     패킷이 그만큼 늦어도 버퍼에 여유가 있어 멈춤·점프 없이 두 스냅샷 사이를 선형 보간 */
  const INTERP_DELAY=200;
  let lastSnapAt=0;
  function tick(dt){
    const rt=performance.now()-INTERP_DELAY;
    for(const r of remotes.values()){
      const b=r.buf;
      while(b.length>=2&&b[1].t<=rt)b.shift();
      if(b.length>=2&&b[0].t<=rt){
        const a=(rt-b[0].t)/(b[1].t-b[0].t);
        r.gx=b[0].x+(b[1].x-b[0].x)*a;
        r.gy=b[0].y+(b[1].y-b[0].y)*a;
        r.face=b[1].face;r.moving=!!b[1].mv;
      }else if(b.length===1&&b[0].t<=rt){ // 버퍼 소진(패킷 지연·정지) — 마지막 위치에서 걸음 멈춤
        r.gx=b[0].x;r.gy=b[0].y;r.face=b[0].face;r.moving=false;
      }
      if(r.moving)r.phase+=dt*10;
    }
  }
  const chat=t=>{if(ws&&ws.readyState===1)ws.send(JSON.stringify({t:'chat',text:t}));};
  const idea=t=>{if(ws&&ws.readyState===1)ws.send(JSON.stringify({t:'idea',text:t}));};
  const score=ms=>{if(ws&&ws.readyState===1){ws.send(JSON.stringify({t:'score',ms}));return true;}return false;};
  return{connect,tick,chat,idea,score};
})();
