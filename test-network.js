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
    NPC_COLORS:['#fff'],ideaNotes:[],saveNotes(){},gameRanks:[],paintRanks(){},addChat(){},serverGameGo(){}};
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(path.join(__dirname,'js/net.js'),'utf8')+';globalThis.NET=NET',context);
  context.NET.connect('tester');
  const socket=FakeWebSocket.instance;socket.readyState=1;socket.onopen();
  socket.message({t:'welcome',users:[{id:1,nick:'near',x:3,y:3},{id:2,nick:'far',x:80,y:45}],notes:[],ranks:[]});
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
  next(ws,m=>m.t==='welcome').then(()=>resolve(ws),reject);
});

(async()=>{
  testClientScope();
  const port=await freePort(),url=`ws://127.0.0.1:${port}`;
  const child=spawn(process.execPath,['server.js'],{cwd:__dirname,env:{...process.env,PORT:String(port)}});
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
    const joined=next(a,m=>m.t==='join'&&m.nick==='B');
    const b=await connect(url,'B',3,3);sockets.push(b);
    const {id}=await joined;
    const near=await next(a,m=>m.t==='snap'&&m.users.some(u=>u[0]===id));
    assert(near.users.some(u=>u[0]===id));
    b.send(JSON.stringify({t:'pos',x:80,y:45,moving:true}));
    const full=await next(a,m=>m.t==='snap'&&m.full===1&&!m.users.some(u=>u[0]===id));
    assert.equal(full.full,1);
    console.log('network AOI reconciliation: ok');
  }finally{
    for(const ws of sockets)ws.close();
    child.kill();
  }
})().catch(err=>{console.error(err);process.exitCode=1;});
