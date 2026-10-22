const {chromium}=require('playwright');
const http=require('http'),fs=require('fs');
(async()=>{
const server=http.createServer((q,r)=>{r.setHeader('Content-Type','text/html');r.end(fs.readFileSync((process.env.GAME_FILE || require('path').join(__dirname,'../index.html'))));}).listen(8768);
const browser=await chromium.launch({executablePath:process.env.CHROME_PATH || undefined,headless:true,args:['--autoplay-policy=no-user-gesture-required']});const page=await browser.newPage({viewport:{width:1280,height:720}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.addInitScript(()=>{window.requestAnimationFrame=()=>0});await page.goto('http://localhost:8768');await page.waitForFunction(()=>ready);await page.evaluate(()=>startRun(true));await page.waitForFunction(()=>CL_VB.scream&&CL_VB.scream.filter(Boolean).length>1);
const result=await page.evaluate(async()=>{
S.p.x=400;S.p.y=300;S.rg.maxHp=S.rg.hp=1000;S.running=true;
const group=clanBand(6,{camp:{x:480,y:350}});if(!group)throw Error('Group fixture failed');
for(const e of clanList())clanNotice(e);
let maxVoices=0,maxPlaced=0,frames=0;const initial=clanList().map(e=>({x:e.x,y:e.y}));
for(let i=0;i<300;i++){frame(performance.now());maxVoices=Math.max(maxVoices,PLACED.filter(p=>p.voice).length);maxPlaced=Math.max(maxPlaced,PLACED.length);frames++;await new Promise(r=>setTimeout(r,16));}
return {frames,enemies:clanList().length,maxVoices,maxPlaced,audioState:actx.state,phase:S.rg.phase,states:clanList().map(e=>e.cl.st),moved:clanList().some((e,i)=>Math.hypot(e.x-initial[i].x,e.y-initial[i].y)>1)};
});await page.screenshot({path:require('path').join(process.env.TEST_OUTPUT || process.cwd(),'encounter.png')});console.log(JSON.stringify({result,errors},null,2));await browser.close();server.close();if(errors.length||!result.moved||result.audioState!=='running')process.exitCode=1;
})().catch(e=>{console.error(e);process.exit(1)});
