/* 멀티유저 서버 — 정적 파일 서빙 + WebSocket 위치/채팅 중계
   실행: npm install && node server.js  →  http://localhost:3210 */
const http=require('http'),fs=require('fs'),path=require('path');
const {WebSocketServer,OPEN}=require('ws');
const PORT=process.env.PORT||3210;

const MIME={'.html':'text/html; charset=utf-8','.css':'text/css','.js':'text/javascript','.png':'image/png','.svg':'image/svg+xml','.ico':'image/x-icon'};
const server=http.createServer((req,res)=>{
  const url=decodeURIComponent(req.url.split('?')[0]);
  const fp=path.join(__dirname,url==='/'?'hello-ai-exhibition-white.html':url);
  if(!fp.startsWith(__dirname+path.sep)){res.writeHead(403);res.end();return;} // 경로 탈출 차단
  fs.readFile(fp,(err,data)=>{
    if(err){res.writeHead(404);res.end('not found');return;}
    res.writeHead(200,{'Content-Type':MIME[path.extname(fp)]||'application/octet-stream'});
    res.end(data);
  });
});

/* 아이디어 월 노트 — JSON 파일 영속화. ponytail: 파일 DB, 규모 커지면 sqlite로 */
const NOTES_FILE=path.join(__dirname,'idea-notes.json');
let notes=null;
try{notes=JSON.parse(fs.readFileSync(NOTES_FILE,'utf8'));}catch(e){}
if(!Array.isArray(notes)||!notes.length)
  notes=['부스 동선 너무 좋아요 👍','T5 코드리뷰 부스터 실무에 쓰고 싶다','내년엔 우리 팀도 출전!'];
const saveNotes=()=>fs.writeFile(NOTES_FILE,JSON.stringify(notes),()=>{});

/* 반응속도 랭킹 — 닉당 최고기록, TOP 10 유지 */
const SCORES_FILE=path.join(__dirname,'reaction-scores.json');
let scores=null;
try{scores=JSON.parse(fs.readFileSync(SCORES_FILE,'utf8'));}catch(e){}
if(!Array.isArray(scores))scores=[];
const saveScores=()=>fs.writeFile(SCORES_FILE,JSON.stringify(scores),()=>{});

let seq=1;
const users=new Map(); // id → {ws,nick,color,x,y,face,moving,dirty}
const send=(ws,m)=>{if(ws.readyState===OPEN)ws.send(JSON.stringify(m));};
const bcast=(m,skip)=>{const s=JSON.stringify(m);
  for(const u of users.values())if(u.ws!==skip&&u.ws.readyState===OPEN)u.ws.send(s);};
const cx=v=>Math.min(81,Math.max(1,+v||0)),cy=v=>Math.min(46,Math.max(1,+v||0)); // 홀 범위 clamp

const wss=new WebSocketServer({server});
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
        x:cx(m.x),y:cy(m.y),face:1,moving:false,dirty:false};
      users.set(id,u);
      send(ws,{t:'welcome',id,notes,ranks:scores,users:[...users].filter(([i])=>i!==id)
        .map(([i,v])=>({id:i,nick:v.nick,color:v.color,x:v.x,y:v.y}))});
      bcast({t:'join',id,nick:u.nick,color:u.color,x:u.x,y:u.y},ws);
    }else if(m.t==='pos'&&id){
      const u=users.get(id);if(!u)return;
      u.x=cx(m.x);u.y=cy(m.y);u.face=m.face>0?1:-1;u.moving=!!m.moving;u.dirty=true;
    }else if(m.t==='chat'&&id){
      const u=users.get(id),text=String(m.text||'').slice(0,200).trim();
      if(u&&text)bcast({t:'chat',nick:u.nick,text},ws);
    }else if(m.t==='idea'&&id){
      const text=String(m.text||'').slice(0,80).trim();
      if(!text)return;
      notes.push(text);if(notes.length>200)notes=notes.slice(-200);
      saveNotes();
      bcast({t:'idea',text},ws); // 작성자는 로컬에 이미 반영됨
    }else if(m.t==='score'&&id){
      const u=users.get(id),ms=Math.round(+m.ms);
      if(!u||!isFinite(ms)||ms<80||ms>3000)return; // 유효 범위 밖(치트·오입력) 컷
      const i=scores.findIndex(s=>s.nick===u.nick);
      if(i>=0){if(ms>=scores[i].ms)return;scores[i].ms=ms;} // 갱신 아닐 땐 무시
      else scores.push({nick:u.nick,ms});
      scores.sort((a,b)=>a.ms-b.ms);scores=scores.slice(0,10);
      saveScores();
      bcast({t:'ranks',ranks:scores}); // 본인 포함 전원에 새 순위표
    }
  });
  ws.on('close',()=>{if(id&&users.delete(id))bcast({t:'leave',id});});
});

setInterval(()=>{ // 10Hz 스냅샷 — 움직인 유저만 묶어서 브로드캐스트
  const snap=[];
  for(const[i,u]of users)if(u.dirty){snap.push([i,+u.x.toFixed(2),+u.y.toFixed(2),u.face,u.moving?1:0]);u.dirty=false;}
  if(!snap.length)return;
  const s=JSON.stringify({t:'snap',users:snap});
  for(const u of users.values()) // 백프레셔: 못 따라오는 클라이언트는 이번 스냅샷 스킵 (위치는 lossy — 다음 걸로 따라잡음)
    if(u.ws.readyState===OPEN&&u.ws.bufferedAmount<262144)u.ws.send(s);
},100);

server.listen(PORT,()=>console.log('전시관 서버: http://localhost:'+PORT));
