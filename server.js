/* 멀티유저 서버 — 정적 파일 서빙 + WebSocket 위치/채팅 중계
   실행: npm install && node server.js  →  http://localhost:3210 */
const http=require('http'),fs=require('fs'),path=require('path');
const {WebSocketServer,OPEN}=require('ws');
const PORT=process.env.PORT||3210;

const MIME={'.html':'text/html; charset=utf-8','.css':'text/css','.js':'text/javascript','.png':'image/png','.svg':'image/svg+xml','.ico':'image/x-icon'};
const server=http.createServer((req,res)=>{
  let url;
  try{url=decodeURIComponent(req.url.split('?')[0]);}
  catch(e){res.writeHead(400);res.end('bad request');return;}
  const fp=path.join(__dirname,url==='/'?'hello-ai-exhibition-white.html':url);
  if(!fp.startsWith(__dirname+path.sep)){res.writeHead(403);res.end();return;} // 경로 탈출 차단
  fs.readFile(fp,(err,data)=>{
    if(err){res.writeHead(404);res.end('not found');return;}
    const ext=path.extname(fp);
    res.writeHead(200,{
      'Content-Type':MIME[ext]||'application/octet-stream',
      'Cache-Control':ext==='.html'?'no-cache':'public, max-age=3600'
    });
    res.end(data);
  });
});

/* 아이디어 월 노트 — JSON 파일 영속화. ponytail: 파일 DB, 규모 커지면 sqlite로 */
const NOTES_FILE=path.join(__dirname,'idea-notes.json');
let notes=null;
try{notes=JSON.parse(fs.readFileSync(NOTES_FILE,'utf8'));}catch(e){}
if(!Array.isArray(notes)||!notes.length)
  notes=['부스 동선 너무 좋아요 👍','T5 코드리뷰 부스터 실무에 쓰고 싶다','내년엔 우리 팀도 출전!'];
let notesSaveTid=0;
const saveNotes=()=>{clearTimeout(notesSaveTid);notesSaveTid=setTimeout(()=>{
  notesSaveTid=0;fs.writeFile(NOTES_FILE,JSON.stringify(notes),()=>{});
},250);};

/* 반응속도 랭킹 — 닉당 최고기록, TOP 10 유지 */
const SCORES_FILE=path.join(__dirname,'reaction-scores.json');
let scores=null;
try{scores=JSON.parse(fs.readFileSync(SCORES_FILE,'utf8'));}catch(e){}
if(!Array.isArray(scores))scores=[];
let scoresSaveTid=0;
const saveScores=()=>{clearTimeout(scoresSaveTid);scoresSaveTid=setTimeout(()=>{
  scoresSaveTid=0;fs.writeFile(SCORES_FILE,JSON.stringify(scores),()=>{});
},250);};

let seq=1;
const users=new Map(); // id → {ws,nick,color,x,y,face,moving,dirty}
const send=(ws,m)=>{if(ws.readyState===OPEN)ws.send(JSON.stringify(m));};
const MAX_BUFFER=262144;
const bcast=(m,skip)=>{const s=JSON.stringify(m);
  for(const u of users.values())if(u.ws!==skip&&u.ws.readyState===OPEN&&u.ws.bufferedAmount<MAX_BUFFER)u.ws.send(s);};
const cx=v=>Math.min(81,Math.max(1,+v||0)),cy=v=>Math.min(46,Math.max(1,+v||0)); // 홀 범위 clamp
/* 고빈도 메시지가 전체 접속자의 송신 버퍼를 키우지 않도록 사용자별 고정 윈도우 제한 */
function allowed(u,key,limit,windowMs){
  const now=Date.now(),s=u.limits[key]||(u.limits[key]={t:now,n:0});
  if(now-s.t>=windowMs){s.t=now;s.n=0;}
  return ++s.n<=limit;
}
function clearGame(u){if(u.game){clearTimeout(u.game.timer);u.game=null;}}

const wss=new WebSocketServer({server,maxPayload:4096});
/* 하트비트 — 비정상 종료 연결이 users에 유령으로 남는 것 방지 */
setInterval(()=>{
  for(const ws of wss.clients){
    if(ws.isAlive===false){ws.terminate();continue;} // terminate → close 이벤트로 users 정리·leave 브로드캐스트
    ws.isAlive=false;ws.ping();
  }
},30000);

wss.on('connection',ws=>{
  let id=0;
  ws.isAlive=true;
  ws.on('pong',()=>ws.isAlive=true);
  ws.on('message',raw=>{
    let m;try{m=JSON.parse(raw);}catch(e){return;}
    if(m.t==='hello'&&!id){
      id=seq++;
      const u={ws,nick:String(m.nick||'게스트').slice(0,12),color:String(m.color||'#4d8bff').slice(0,9),
        x:cx(m.x),y:cy(m.y),face:1,moving:false,dirty:false,viewCell:null,limits:{},game:null};
      users.set(id,u);
      send(ws,{t:'welcome',id,notes,ranks:scores,users:[...users].filter(([i])=>i!==id)
        .map(([i,v])=>({id:i,nick:v.nick,color:v.color,x:v.x,y:v.y}))});
      bcast({t:'join',id,nick:u.nick,color:u.color,x:u.x,y:u.y},ws);
    }else if(m.t==='pos'&&id){
      const u=users.get(id);if(!u)return;
      if(!allowed(u,'pos',20,1000))return;
      u.x=cx(m.x);u.y=cy(m.y);u.face=m.face>0?1:-1;u.moving=!!m.moving;u.dirty=true;
    }else if(m.t==='chat'&&id){
      const u=users.get(id),text=String(m.text||'').slice(0,200).trim();
      if(u&&text&&allowed(u,'chat',5,5000))bcast({t:'chat',id,nick:u.nick,text},ws);
    }else if(m.t==='idea'&&id){
      const u=users.get(id);if(!u||!allowed(u,'idea',3,10000))return;
      const text=String(m.text||'').slice(0,80).trim();
      if(!text)return;
      notes.push(text);if(notes.length>200)notes=notes.slice(-200);
      saveNotes();
      bcast({t:'idea',text},ws); // 작성자는 로컬에 이미 반영됨
    }else if(m.t==='gameStart'&&id){
      const u=users.get(id);if(!u||u.game||!allowed(u,'game',4,10000))return;
      u.game={timer:0,goAt:0};
      u.game.timer=setTimeout(()=>{
        if(users.get(id)!==u||!u.game)return;
        u.game.timer=0;u.game.goAt=Date.now();send(ws,{t:'gameGo'});
      },1000+Math.random()*2500);
    }else if(m.t==='gameCancel'&&id){
      const u=users.get(id);if(u)clearGame(u);
    }else if(m.t==='score'&&id){
      const u=users.get(id);if(!u||!u.game||!u.game.goAt)return;
      const ms=Math.round(Date.now()-u.game.goAt);clearGame(u);
      if(ms<80||ms>3000)return; // 서버 GO 시점 기준 유효 범위 밖 컷
      const i=scores.findIndex(s=>s.nick===u.nick);
      if(i>=0){if(ms>=scores[i].ms)return;scores[i].ms=ms;} // 갱신 아닐 땐 무시
      else scores.push({nick:u.nick,ms});
      scores.sort((a,b)=>a.ms-b.ms);scores=scores.slice(0,10);
      saveScores();
      bcast({t:'ranks',ranks:scores}); // 본인 포함 전원에 새 순위표
    }
  });
  ws.on('close',()=>{const u=users.get(id);if(u)clearGame(u);if(id&&users.delete(id))bcast({t:'leave',id});});
});

/* 위치 관심영역(AOI) — 같은 12×12 셀과 인접 8개 셀의 사용자만 동기화.
   셀별 JSON을 한 번만 만들어 공유하고, 5초마다 전체 로컬 상태로 누락을 복구한다. */
const AOI_CELL=12;
const MAX_AOI_USERS=180;
const cellOf=u=>((u.x/AOI_CELL)|0)+','+((u.y/AOI_CELL)|0);
const around=(map,key)=>{
  const [cx,cy]=key.split(',').map(Number),out=[];
  for(let dx=-1;dx<=1;dx++)for(let dy=-1;dy<=1;dy++){
    const a=map.get((cx+dx)+','+(cy+dy));if(a)out.push(...a);
  }
  return out;
};
let snapTick=0;
setInterval(()=>{ // 5Hz 델타 + 0.2Hz 로컬 전체 스냅샷
  const allByCell=new Map(),dirtyByCell=new Map(),clientsByCell=new Map();
  for(const[i,u]of users){
    const key=cellOf(u),tuple=[i,+u.x.toFixed(2),+u.y.toFixed(2),u.face,u.moving?1:0];
    if(!allByCell.has(key))allByCell.set(key,[]);allByCell.get(key).push(tuple);
    if(!clientsByCell.has(key))clientsByCell.set(key,[]);clientsByCell.get(key).push(u);
    if(u.dirty){if(!dirtyByCell.has(key))dirtyByCell.set(key,[]);dirtyByCell.get(key).push(tuple);u.dirty=false;}
  }
  const periodicFull=++snapTick%25===0;
  for(const[key,clients]of clientsByCell){
    let dirtyMsg=null,fullMsg=null;
    const localDirty=around(dirtyByCell,key);
    const localAll=around(allByCell,key),crowded=localAll.length>MAX_AOI_USERS;
    if(!crowded&&localDirty.length)dirtyMsg=JSON.stringify({t:'snap',users:localDirty});
    for(const u of clients){
      if(u.ws.readyState!==OPEN||u.ws.bufferedAmount>=MAX_BUFFER)continue;
      const needsFull=periodicFull||u.viewCell!==key;
      if(crowded){ // 밀집 구역은 각 사용자에게 가까운 인원만 보내 브라우저·회선 상한을 고정
        if(!needsFull&&!localDirty.length)continue;
        const nearest=localAll.slice().sort((a,b)=>{
          const ua=users.get(a[0]),ub=users.get(b[0]);
          return (ua.x-u.x)**2+(ua.y-u.y)**2-(ub.x-u.x)**2-(ub.y-u.y)**2;
        }).slice(0,MAX_AOI_USERS);
        let payload=nearest;
        if(!needsFull){const nearIds=new Set(nearest.map(v=>v[0]));payload=localDirty.filter(v=>nearIds.has(v[0]));}
        if(payload.length)u.ws.send(JSON.stringify({t:'snap',users:payload}));
        if(needsFull)u.viewCell=key;
      }else if(needsFull){
        if(!fullMsg)fullMsg=JSON.stringify({t:'snap',users:localAll});
        u.ws.send(fullMsg);u.viewCell=key;
      }else if(dirtyMsg)u.ws.send(dirtyMsg);
    }
  }
},200);

server.listen(PORT,()=>console.log('전시관 서버: http://localhost:'+PORT));
