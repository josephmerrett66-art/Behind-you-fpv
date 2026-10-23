const {chromium}=require('playwright');
const fs=require('fs'),http=require('http'),path=require('path');
(async()=>{
 const game=fs.readFileSync(process.env.GAME_FILE||path.join(__dirname,'../index.html'));
 const server=http.createServer((q,r)=>{r.setHeader('Content-Type','text/html');r.end(game)}).listen(8772);
 const browser=await chromium.launch({executablePath:process.env.CHROME_PATH||undefined,headless:true,args:['--autoplay-policy=no-user-gesture-required']});
 const page=await browser.newPage({viewport:{width:960,height:540}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{window.requestAnimationFrame=()=>0;localStorage.setItem('behind-you-fp',JSON.stringify({quality:'sharp',sound:false}));});
 await page.goto('http://localhost:8772');await page.waitForFunction(()=>ready);await page.evaluate(()=>startRun(true));
 const checks=await page.evaluate(()=>{
  const checks=[],check=(name,pass,detail)=>{checks.push({name,pass,detail});if(!pass)throw Error(name+': '+JSON.stringify(detail))};
  S.running=false;S.day.bld.clear();stGen++;S.p.x=0;S.p.y=0;
  for(let i=0;i<200;i++)stMake({id:['wallW','roofW','floorW','table','stand','palis'][i%6],x:(i%20-10)*48,y:(Math.floor(i/20)-5)*48,a:0,done:true});
  thingsSync(true);check('medium base uses local batches',THING_CELLS.size>1,THING_CELLS.size);
  const buffers=new Map([...THING_CELLS].map(([id,c])=>[id,c.solid.mesh.geometry]));
  let replaced=0;for(let i=0;i<120;i++){
   S.p.x=Math.sin(i/120*Math.PI*2)*160;S.p.y=Math.cos(i/120*Math.PI*2)*160;thingsSync(true);
   for(const [id,g] of buffers)if(THING_CELLS.get(id)?.solid.mesh.geometry!==g)replaced++;
  }
  check('walking through a medium base reuses every existing buffer',replaced===0,replaced);
  S.p.x=-3200;S.p.y=0;thingsSync(true);
  check('distant cached cells are hidden',[...buffers.keys()].every(id=>{const c=THING_CELLS.get(id);return !c.solid.visible&&!c.plan.visible&&!c.depth.visible}));
  S.p.x=0;thingsSync(true);
  check('returning reuses resident buffers',[...buffers].every(([id,g])=>THING_CELLS.get(id)?.solid.mesh.geometry===g));
  check('returning restores visible structures',[...THING_CELLS.values()].some(c=>c.solid.visible));
  S.day.bld.clear();stGen++;
  for(let i=0;i<240;i++)stMake({id:'wallW',x:i*280,y:0,a:0,done:true});
  let peak=0;for(let i=0;i<240;i++){S.p.x=i*280;thingsSync(true);peak=Math.max(peak,THING_CELLS.size)}
  check('resident cache stays bounded while travelling',peak<=VIS.buildCache,peak);
  newGame(true);S.running=false;S.p.x=S.p.y=0;thingsSync(true);
  check('new small game releases the cell cache',THING_CELLS.size===0,THING_CELLS.size);
  const sun=sunShadows,ink=inkRender;
  try{
   SET.quality='auto';pixK=1;resize();AQ.iv=1/60;AQ.hist=[];AQ.dts=[];AQ.miss=AQ.all=AQ.good=0;AQ.cpu=0;fpsAcc=fpsN=0;
   // A slow driver submission is render pressure; Auto must still be able to respond.
   sunShadows=()=>{const until=performance.now()+20;while(performance.now()<until){}};
   inkRender=()=>{};
   let t=performance.now();last=t;
   for(let i=0;i<32;i++){t+=40;frame(t)}
   check('Auto lowers resolution under slow rendering',pixK<1,pixK);
   check('render wait excluded from simulation CPU budget',AQ.cpu<.02,AQ.cpu);
   SET.quality='sharp';pixK=1;resize();for(let i=0;i<32;i++)autoQuality(.04,t/1000+i*.04);
   check('Sharp remains under player control',pixK===1,pixK);
  }finally{sunShadows=sun;inkRender=ink}
  return checks;
 });
 if(errors.length)throw Error(errors.join('\n'));
 console.log(JSON.stringify({checks,errors},null,2));await browser.close();server.close();
})().catch(e=>{console.error(e);process.exit(1)});
