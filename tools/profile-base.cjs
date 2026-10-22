const {chromium}=require('playwright');
const fs=require('fs'),http=require('http');
(async()=>{
 const server=http.createServer((req,res)=>{res.setHeader('Content-Type','text/html');res.end(fs.readFileSync((process.env.GAME_FILE || require('path').join(__dirname,'../index.html'))));}).listen(8765);
 const browser=await chromium.launch({executablePath:process.env.CHROME_PATH || undefined,headless:true,args:['--autoplay-policy=no-user-gesture-required','--disable-frame-rate-limit','--disable-gpu-vsync']});
 const page=await browser.newPage({viewport:{width:1280,height:720}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{window.requestAnimationFrame=()=>0;let seed=42;Math.random=()=>((seed=Math.imul(seed,1664525)+1013904223>>>0)/4294967296);localStorage.setItem('behind-you-fp',JSON.stringify({quality:'sharp',sound:true}));});
 await page.goto('http://localhost:8765');await page.waitForFunction(()=>ready);await page.evaluate(()=>startRun(true));
 // Audio decoding runs on worker threads; let it finish before comparing render costs.
 await page.waitForFunction(()=>Object.entries(VOX||{}).every(([k,v])=>(CL_VB[k]||[]).filter(Boolean).length===v.length)&&Object.entries(SFX||{}).every(([k,v])=>(SB[k]||[]).filter(Boolean).length===v.length),null,{timeout:60000});
 const result=await page.evaluate(()=>{
  const measure=(fn,n=100)=>{for(let i=0;i<15;i++)fn();const a=[];for(let i=0;i<n;i++){const t=performance.now();fn();a.push(performance.now()-t);}a.sort((a,b)=>a-b);return {mean:a.reduce((x,y)=>x+y,0)/n,median:a[Math.floor(n*.5)],p95:a[Math.floor(n*.95)]};};
  const rows=[];for(const n of [0,200,800]){
   S.day.bld.clear();stGen++;S.p.x=0;S.p.y=0;S.running=false;look.yaw=0;look.pitch=0;
   for(let i=0;i<n;i++)stMake({id:['wallW','roofW','floorW','table','stand','palis'][i%6],x:(i%20-10)*48,y:(Math.floor(i/20)-10)*48,a:0,done:true});
   thingsSync(true);envFrame();placeCamera(0,0,0);
   const near=measure(()=>{for(let i=0;i<100;i++)stNear(i,0,60)},60);
   const roof=[...S.day.bld.values()].find(o=>o.id==='roofW');
   const rebuild=measure(()=>{if(roof)roof.burn=roof.burn?0:1;thingsSync(true)},15),idle=measure(()=>thingsSync(false));
   renderer.info.autoReset=false;renderer.info.reset();sunShadows();inkRender();renderer.getContext().finish();const render={...renderer.info.render};renderer.info.autoReset=true;
   const frameTime=measure(()=>{frame(performance.now());renderer.getContext().finish()},100);
   rows.push({n,near100:near,rebuild,idle,render,frameTime});
  }return rows;
 });
 console.log(JSON.stringify({rows:result,errors},null,2));await page.screenshot({path:require('path').join(process.env.TEST_OUTPUT || process.cwd(),(process.argv[2]||'profile')+'.png')});
 await browser.close();server.close();
})().catch(e=>{console.error(e);process.exit(1)});
