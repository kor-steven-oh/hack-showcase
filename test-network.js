const assert=require('assert'),fs=require('fs'),net=require('net'),path=require('path'),vm=require('vm'),{spawn}=require('child_process');
const WebSocket=require('ws');

function testClientScope(){
  class FakeWebSocket{
    constructor(){this.readyState=0;FakeWebSocket.instance=this;}
    send(){}
    message(m){this.onmessage({data:JSON.stringify(m)});}
  }
  const chatCount={},player={gx:2,gy:2,moving:false,face:1},vac={},chars=[],timers=[];
  const context={WebSocket:FakeWebSocket,location:{protocol:'http:',host:'local'},document:{getElementById:()=>chatCount},
    requestAnimationFrame:cb=>cb(),setInterval:()=>1,clearInterval(){},setTimeout:fn=>timers.push(fn),clearTimeout(){},
    performance:{now:()=>1000},JSON,Math,Map,Set,player,vac,CHARS:chars,npcs:[],P:{npcHead:'#fff'},
    NPC_COLORS:['#fff'],ideaNotes:[],saveNotes(){},gameRanks:[],paintRanks(){},setTeamLikes(){},addChat(){},serverGameGo(){}};
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(path.join(__dirname,'js/net.js'),'utf8')+';globalThis.NET=NET',context);
  context.NET.connect('tester');
  const socket=FakeWebSocket.instance;socket.readyState=1;socket.onopen();
  socket.message({t:'welcome',users:[{id:1,nick:'near',x:3,y:3},{id:2,nick:'far',x:80,y:45}],notes:[],ranks:[]});
  assert.equal(context.NET.userCount(),3);
  for(let id=3;id<=9;id++)socket.message({t:'join',id,nick:'user'+id,x:3,y:3});
  assert.equal(context.NET.userCount(),10);
  socket.message({t:'leave',id:9});
  assert.equal(context.NET.userCount(),9);
  assert.equal(chars.length,2);
  socket.message({t:'snap',full:1,users:[[1,3,3,1,0]]});
  assert.deepEqual(chars.map(c=>c.nick).filter(Boolean),['near']);
  socket.message({t:'snap',full:1,users:[[2,80,45,1,0]]});
  assert.deepEqual(chars.map(c=>c.nick).filter(Boolean),['far']);
  socket.readyState=3;socket.onclose();
  assert.equal(chatCount.textContent,'오프라인 · 재연결 중');
  timers.pop()();
  assert.notEqual(FakeWebSocket.instance,socket);
  assert.equal(chatCount.textContent,'연결 중…');
}

function testJudgePanelConfig(){
  const source=fs.readFileSync(path.join(__dirname,'js/main.js'),'utf8');
  assert.match(source,/const JUDGE_OFFSETS=\[\[-1\.25,-0\.1\],\[0,0\],\[1\.3,0\.15\],\[-0\.65,1\.15\],\[0\.75,1\.3\]\]/);
  for(const name of ['Ada','Turing','Grace','Nova','Atlas'])assert(source.includes(`'${name}'`));
  for(const line of ['음.. 훌륭하군!','대단해!','이런 혁신이!'])assert(source.includes(line));
  const dialogues=source.match(/const JUDGE_DIALOGUES=\[([\s\S]*?)\n\];/)[1];
  assert.equal((dialogues.match(/\[\[\d,/g)||[]).length,12);
  assert(source.includes('while(line===judgeGroup.lastLine)'));
  assert(source.includes('if(replying)judgeGroup.leaveAt=t+4.5'));
  assert(source.includes('judgeGroup.timer<=0&&!judgeGroup.reply&&t>=judgeGroup.leaveAt'));
  assert(source.includes('judgeGroup.timer=12+Math.random()*5'));
  assert(source.includes('judgeGroup.visited.has(i)'));
  assert.equal((source.match(/class="project-slide(?: on)?"/g)||[]).length,3);
  assert(source.includes("slideTo(slide+1)"));
  assert(source.includes("new Blob([html],{type:'text/html;charset=utf-8'})"));
  assert(source.includes('id="brochureDownload"'));
  const ambient=source.match(/const AMBIENT_CHAT=\[([\s\S]*?)\n\];/)[1];
  assert.equal((ambient.match(/^\s*'/gm)||[]).length,50);
  assert(source.includes("NET.userCount()<10"));
  assert(source.includes('ambientChatCount>=AMBIENT_CHAT.length'));
}

const wait=(ms)=>new Promise(r=>setTimeout(r,ms));
const freePort=()=>new Promise((resolve,reject)=>{
  const s=net.createServer().once('error',reject).listen(0,'127.0.0.1',()=>{
    const {port}=s.address();s.close(()=>resolve(port));
  });
});
const next=(ws,test,timeout=7000)=>new Promise((resolve,reject)=>{
  const tid=setTimeout(()=>done(new Error('message timeout')),timeout);
  const onMessage=data=>{const m=JSON.parse(data);if(test(m))done(null,m);};
  const done=(err,value)=>{clearTimeout(tid);ws.off('message',onMessage);err?reject(err):resolve(value);};
  ws.on('message',onMessage);
});
const connect=(url,nick,x,y)=>new Promise((resolve,reject)=>{
  const ws=new WebSocket(url);
  ws.once('error',reject);
  ws.once('open',()=>ws.send(JSON.stringify({t:'hello',nick,x,y})));
  next(ws,m=>m.t==='welcome').then(m=>{ws.welcome=m;resolve(ws);},reject);
});

(async()=>{
  testClientScope();
  testJudgePanelConfig();
  const port=await freePort(),url=`ws://127.0.0.1:${port}`;
  const child=spawn(process.execPath,['server.js'],{cwd:__dirname,env:{...process.env,PORT:String(port),NODE_ENV:'test'}});
  const sockets=[];
  try{
    await Promise.race([
      new Promise((resolve,reject)=>{
        child.stdout.on('data',d=>{if(d.includes('전시관 서버'))resolve();});
        child.once('exit',code=>reject(new Error(`server exited ${code}`)));
      }),
      wait(3000).then(()=>{throw new Error('server start timeout');})
    ]);
    const a=await connect(url,'A',2,2);sockets.push(a);
    assert(a.welcome.likes.some(Number));
    const joined=next(a,m=>m.t==='join'&&m.nick==='B');
    const b=await connect(url,'B',3,3);sockets.push(b);
    const {id}=await joined;
    const near=await next(a,m=>m.t==='snap'&&m.users.some(u=>u[0]===id));
    assert(near.users.some(u=>u[0]===id));
    const likesBefore=a.welcome.likes[0];
    b.send(JSON.stringify({t:'vote',id:1}));
    const voted=await next(a,m=>m.t==='likes');
    assert.equal(voted.likes[0],likesBefore+1);
    b.send(JSON.stringify({t:'pos',x:80,y:45,moving:true}));
    const full=await next(a,m=>m.t==='snap'&&m.full===1&&!m.users.some(u=>u[0]===id));
    assert.equal(full.full,1);
    console.log('network AOI reconciliation and voting: ok');
  }finally{
    for(const ws of sockets)ws.close();
    child.kill();
  }
})().catch(err=>{console.error(err);process.exitCode=1;});
