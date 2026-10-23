const {chromium}=require('playwright');
const fs=require('fs'),http=require('http'),path=require('path');
(async()=>{
 const game=fs.readFileSync(process.env.GAME_FILE||path.join(__dirname,'../index.html'));
 const server=http.createServer((q,r)=>{r.setHeader('Content-Type','text/html');r.end(game)}).listen(8771);
 const browser=await chromium.launch({executablePath:process.env.CHROME_PATH||undefined,headless:true,args:['--autoplay-policy=no-user-gesture-required']});
 const page=await browser.newPage({viewport:{width:1280,height:720},deviceScaleFactor:Number(process.env.BENCH_DPR||1)}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript((quality)=>{window.benchRAF=window.requestAnimationFrame.bind(window);window.requestAnimationFrame=()=>0;let seed=42;Math.random=()=>((seed=Math.imul(seed,1664525)+1013904223>>>0)/4294967296);localStorage.setItem('behind-you-fp',JSON.stringify({quality,sound:false}));},process.env.BENCH_QUALITY||'sharp');
 await page.goto('http://localhost:8771');await page.waitForFunction(()=>ready);await page.evaluate(()=>startRun(true));
 const data=await page.evaluate(async()=>{
  const scopes=['simStep','beamStep','envFrame','weatherFrame','lifeFrame','worldSync','thingsSync','grassMask','lightsFrame','placeCamera','thingsFrame','treesFrame','hintsFrame','drawFigures','fxFrame','combatFrame','figuresEnd','drawHud','audioFrame','sunShadows','inkRender','stNear','pieceKit','pondsSync','terrLevelSync'];
  let times={};for(const name of scopes){const fn=eval(name);window['bench_'+name]=function(...a){const t=performance.now();try{return fn.apply(this,a)}finally{times[name]=(times[name]||0)+performance.now()-t}};eval(name+'=window.bench_'+name)}
  const stats=a=>{const s=a.slice().sort((a,b)=>a-b);return {mean:a.reduce((x,y)=>x+y,0)/a.length,p50:s[s.length>>1],p95:s[Math.floor(s.length*.95)],p99:s[Math.floor(s.length*.99)],max:s[s.length-1]}};
  const results=[];
  for(const n of [0,200,800]){
   S.day.bld.clear();stGen++;S.p.x=0;S.p.y=0;S.running=true;S.rg.hp=S.rg.maxHp;S.rg.enemies=[];
   for(let i=0;i<n;i++)stMake({id:['wallW','roofW','floorW','table','stand','palis'][i%6],x:(i%20-10)*48,y:(Math.floor(i/20)-10)*48,a:0,done:true});
   thingsSync(true);worldSync(true);
   const samples=[];let prev;
   for(let f=0;f<360;f++){
    const t=await new Promise(benchRAF);times={};S.p.x=Math.sin(f/100)*180;S.p.y=Math.cos(f/100)*180;look.yaw=f*.012;look.pitch=0;
    const begin=performance.now();frame(t);const cpu=performance.now()-begin;
    const wait=performance.now();renderer.getContext().finish();const gpuWait=performance.now()-wait;
    if(f>=60)samples.push({f,cpu,gpuWait,interval:t-prev,...times});prev=t;
   }
   const names=['cpu','gpuWait','interval',...scopes],metrics={};for(const name of names)metrics[name]=stats(samples.map(s=>s[name]||0));
   results.push({n,pixK,metrics,slowest:samples.slice().sort((a,b)=>b.cpu-a.cpu).slice(0,8),render:{...renderer.info.render}});
  }return results;
 });
 console.log(JSON.stringify({data,errors},null,2));await browser.close();server.close();
})().catch(e=>{console.error(e);process.exit(1)});
