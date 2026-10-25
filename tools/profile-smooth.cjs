const {chromium}=require('playwright');
const fs=require('fs'),http=require('http'),path=require('path');
if(process.env.BENCH_FIXED_STEP==='1'&&process.env.BENCH_QUALITY==='auto')throw Error('Auto requires real frame cadence; use BENCH_LOCK_DAY=1 instead of BENCH_FIXED_STEP.');
(async()=>{
 const game=fs.readFileSync(process.env.GAME_FILE||path.join(__dirname,'../index.html'));
 const server=http.createServer((q,r)=>{r.setHeader('Content-Type','text/html');r.end(game)}).listen(8771);
 const browser=await chromium.launch({executablePath:process.env.CHROME_PATH||undefined,headless:true,args:['--autoplay-policy=no-user-gesture-required']});
 const page=await browser.newPage({viewport:{width:1280,height:720},deviceScaleFactor:Number(process.env.BENCH_DPR||1)}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(({quality,ink})=>{window.benchRAF=window.requestAnimationFrame.bind(window);window.requestAnimationFrame=()=>0;let seed=42;Math.random=()=>((seed=Math.imul(seed,1664525)+1013904223>>>0)/4294967296);localStorage.setItem('behind-you-fp',JSON.stringify({quality,sound:false,ink}));},{quality:process.env.BENCH_QUALITY||'sharp',ink:process.env.BENCH_INK!=='0'});
 await page.goto('http://localhost:8771');await page.waitForFunction(()=>ready);await page.evaluate(()=>startRun(true));
 const data=await page.evaluate(async({coast,fixedStep,warmup,lockDay})=>{
  const scopes=['simStep','beamStep','envFrame','weatherFrame','lifeFrame','worldSync','thingsSync','grassMask','lightsFrame','placeCamera','thingsFrame','treesFrame','hintsFrame','drawFigures','fxFrame','combatFrame','figuresEnd','drawHud','audioFrame','sunShadows','inkRender','stNear','pieceKit','pondsSync','terrLevelSync'];
  let times={};for(const name of scopes){const fn=eval(name);window['bench_'+name]=function(...a){const t=performance.now();try{return fn.apply(this,a)}finally{times[name]=(times[name]||0)+performance.now()-t}};eval(name+'=window.bench_'+name)}
  const stats=a=>{const s=a.slice().sort((a,b)=>a-b);return {mean:a.reduce((x,y)=>x+y,0)/a.length,p50:s[s.length>>1],p95:s[Math.floor(s.length*.95)],p99:s[Math.floor(s.length*.99)],max:s[s.length-1]}};
  const gl=renderer.getContext(),timer=gl.getExtension('EXT_disjoint_timer_query_webgl2');
  const results=[];let simulationFrame=0;if(fixedStep)last=100000-1000/60;
  for(const n of (coast?[0]:[0,200,800])){
   const bx=coast?isleR(0)-150:0;
   S.day.bld.clear();stGen++;S.p.x=bx;S.p.y=0;S.running=true;S.rg.hp=S.rg.maxHp;S.rg.enemies=[];
   for(let i=0;i<n;i++)stMake({id:['wallW','roofW','floorW','table','stand','palis'][i%6],x:(i%20-10)*48,y:(Math.floor(i/20)-10)*48,a:0,done:true});
   thingsSync(true);worldSync(true);
   const samples=[],queries=[];let prev;
   for(let f=0;f<warmup+300;f++){
    const step=f<warmup?f%360:60+f-warmup;
    const t=await new Promise(benchRAF);times={};S.p.x=bx+Math.sin(step/100)*(coast?60:180);S.p.y=Math.cos(step/100)*(coast?600:180);look.yaw=step*.012;look.pitch=0;
    if(lockDay){S.day.t=DAY_LEN*.25;S.t=100;}
    renderer.info.autoReset=false;renderer.info.reset();
    const query=timer&&f>=warmup?gl.createQuery():null;if(query)gl.beginQuery(timer.TIME_ELAPSED_EXT,query);
    const begin=performance.now();frame(fixedStep?100000+(simulationFrame++)*1000/60:t);const cpu=performance.now()-begin;if(query)gl.endQuery(timer.TIME_ELAPSED_EXT);
    const wait=performance.now();renderer.getContext().finish();const gpuWait=performance.now()-wait;
    if(f>=warmup){const sample={f,cpu,gpuWait,interval:t-prev,triangles:renderer.info.render.triangles,calls:renderer.info.render.calls,...times};samples.push(sample);if(query)queries.push({query,sample});}prev=t;
   }
   if(timer){for(let i=0;i<8&&queries.some(q=>!gl.getQueryParameter(q.query,gl.QUERY_RESULT_AVAILABLE));i++)await new Promise(benchRAF);const disjoint=gl.getParameter(timer.GPU_DISJOINT_EXT);for(const q of queries){if(!disjoint&&gl.getQueryParameter(q.query,gl.QUERY_RESULT_AVAILABLE))q.sample.gpuMs=gl.getQueryParameter(q.query,gl.QUERY_RESULT)/1e6;gl.deleteQuery(q.query);}}
   const names=['cpu','gpuWait','interval','triangles','calls',...scopes,...(samples.every(s=>s.gpuMs!==undefined)?['gpuMs']:[])],metrics={};for(const name of names)metrics[name]=stats(samples.map(s=>s[name]||0));
   results.push({n,pixK,metrics,slowest:samples.slice().sort((a,b)=>b.cpu-a.cpu).slice(0,8),render:{...renderer.info.render}});
  }return results;
 },{coast:process.env.BENCH_COAST==='1',fixedStep:process.env.BENCH_FIXED_STEP==='1',warmup:Number(process.env.BENCH_WARM||60),lockDay:process.env.BENCH_LOCK_DAY==='1'});
 const gpuInfo=await page.evaluate(()=>{const gl=renderer.getContext(),e=gl.getExtension('WEBGL_debug_renderer_info');return {renderer:e?gl.getParameter(e.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER),samples:gl.getParameter(gl.SAMPLES),timerAvailable:!!gl.getExtension('EXT_disjoint_timer_query_webgl2')}});
 console.log(JSON.stringify({lockDay:process.env.BENCH_LOCK_DAY==='1',warmup:Number(process.env.BENCH_WARM||60),fixedStep:process.env.BENCH_FIXED_STEP==='1',gpuInfo,buildSha256:require('crypto').createHash('sha256').update(game).digest('hex'),quality:process.env.BENCH_QUALITY||'sharp',dpr:Number(process.env.BENCH_DPR||1),ink:process.env.BENCH_INK!=='0',coast:process.env.BENCH_COAST==='1',data,errors},null,2));await browser.close();server.close();
})().catch(e=>{console.error(e);process.exit(1)});
