const {chromium}=require('playwright');
const fs=require('fs'),http=require('http');
(async()=>{
 const server=http.createServer((req,res)=>{res.setHeader('Content-Type','text/html');res.end(fs.readFileSync((process.env.GAME_FILE || require('path').join(__dirname,'../index.html'))));}).listen(8766);
 const browser=await chromium.launch({executablePath:process.env.CHROME_PATH || undefined,headless:true,args:['--autoplay-policy=no-user-gesture-required']});
 const page=await browser.newPage({viewport:{width:1280,height:720}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{window.requestAnimationFrame=()=>0;localStorage.setItem('behind-you-fp',JSON.stringify({quality:'sharp',sound:true}));});
 await page.goto('http://localhost:8766');await page.waitForFunction(()=>ready);await page.evaluate(()=>startRun(true));
 const results=await page.evaluate(()=>{
  const checks=[];const check=(name,pass,detail)=>{checks.push({name,pass:!!pass,detail});if(!pass)throw Error(name+': '+JSON.stringify(detail));};
  for(let i=0;i<20;i++)frame(performance.now()+i*16);
  check('new game renders',true);
  let D=S.day;D.bld.clear();stGen++;S.p.x=0;S.p.y=-50;
  for(let i=0;i<800;i++)stMake({id:'wallW',x:(i%40-20)*40,y:(Math.floor(i/40)-10)*40,a:0,done:true});
  for(let i=0;i<100;i++){
   const x=Math.sin(i)*600,y=Math.cos(i)*600,R=i%150;
   const expected=[...D.bld.values()].filter(o=>Math.abs(o.x-x)<R+GRID&&Math.abs(o.y-y)<R+GRID);
   check('spatial query '+i,JSON.stringify(expected.map(o=>o.key))===JSON.stringify(stNear(x,y,R).map(o=>o.key)));
  }
  daySave();const largeSave=dayReadSave();dayLoad(largeSave);D=S.day;
  check('800-piece established save reloads',D.bld.size===800&&[...D.bld.values()].every(o=>o.done&&o.id==='wallW'));
  thingsSync(true);envFrame();
  const pixels=()=>{sunShadows();inkRender();renderer.clearDepth();renderer.render(vmScene,vmCam);const gl=renderer.getContext(),p=new Uint8Array(gl.drawingBufferWidth*gl.drawingBufferHeight*4);gl.readPixels(0,0,gl.drawingBufferWidth,gl.drawingBufferHeight,gl.RGBA,gl.UNSIGNED_BYTE,p);return p;};
  for(const yaw of [0,1.1,2.9,4.5]){
    look.yaw=yaw;look.pitch=.2;placeCamera(0,0,0);
    const enabled=pixels();const meshes=[...THING_CELLS.values()].flatMap(c=>[c.solid.mesh,c.solid.edge,c.plan,c.depth]);meshes.forEach(m=>m.frustumCulled=false);const disabled=pixels();meshes.forEach(m=>m.frustumCulled=true);
    let different=0;for(let i=0;i<enabled.length;i++)if(Math.abs(enabled[i]-disabled[i])>1)different++;
    check('culling preserves image at yaw '+yaw,different===0,{different});
  }
  D.bld.clear();stGen++;
  const aim=(x,y,z)=>{const dx=x-S.p.x,dy=y-S.p.y;S.aimW=Math.atan2(dy,dx);look.yaw=-S.aimW-Math.PI/2;look.pitch=Math.atan2(terrH(x,y)+z-terrH(S.p.x,S.p.y)-EYE,Math.hypot(dx,dy));};
  stMake({id:'floorW',x:100,y:100,a:0,done:true});D.piece='roofW';D.bsnap=true;
  for(const pos of [[100,80],[100,40],[80,100]]){S.p.x=pos[0];S.p.y=pos[1];aim(100,100,ROOF_H);const sp=stSnap(PC('roofW'),stAimPt());check('roof inside/outside '+pos,sp.snap&&Math.hypot(sp.x-100,sp.y-100)<.1&&stFree(PC('roofW'),sp)===true,sp);}
  D.bsnap=false;check('roof snap toggle preserved',!stSnap(PC('roofW'),stAimPt()).snap);D.bsnap=true;
  const roof=stMake({id:'roofW',x:100,y:100,a:0,done:true});check('duplicate roof rejected',stFree(PC('roofW'),{x:100,y:100,a:0,snap:true})!==true);stGone(roof);
  D.bld.clear();stGen++;const table=stMake({id:'table',x:0,y:0,a:0,done:true});S.p.x=9;S.p.y=-35;aim(9,3,16);D.piece='flowers';
  D.inv[D.hot]={id:Object.keys(DIT).find(id=>DIT[id].tool==='build'),n:1};for(const id of Object.keys(DIT))D.seen.add(id);S.running=true;
  let sp=stSnap(PC('flowers'),stAimPt());check('table surface selected',sp.z===16&&sp.on===table,sp);check('table placement valid',stFree(PC('flowers'),sp)===true,stFree(PC('flowers'),sp));
  const ghost=stGhost();stPlace();const pot=[...D.bld.values()].find(o=>o.id==='flowers');check('ghost and placement match',ghost&&pot&&Math.hypot(pot.x-ghost.x,pot.y-ghost.y)<.001&&pot.z===ghost.z,{ghost,pot});
  pot.done=true;pot.need={};
  const geom=new Kit();pieceKit(geom,pot);const g=geom.geometry();g.computeBoundingBox();check('pot bottom equals tabletop',Math.abs(g.boundingBox.min.y-16)<.001,g.boundingBox.min.y);
  aim(-4,2,16);sp=stSnap(PC('flowers'),stAimPt());check('existing bowl blocks placement',stFree(PC('flowers'),sp)!==true);
  const stool=stMake({id:'stool',x:50,y:0,a:0,done:true});S.p.x=50;S.p.y=-35;aim(50,0,10.15);sp=stSnap(PC('flowers'),stAimPt());check('different support height',sp.z===10.15&&stFree(PC('flowers'),sp)===true,sp);
  S.p.x=9;S.p.y=-35;aim(pot.x,pot.y,20);check('raised decoration can be targeted',stAimed()===pot);
  daySave();const save=dayReadSave();check('save includes support height',save.d.bld.some(o=>o.id==='flowers'&&o.z===16&&o.support));dayLoad(save);
  const loaded=[...S.day.bld.values()].find(o=>o.id==='flowers'),parent=S.day.bld.get(loaded.on);check('support remapped after reload',parent&&parent.id==='table'&&loaded.z===16);
  const before=[loaded.x,loaded.y,loaded.a];mvPick({kind:'st',o:parent});check('carried furniture carries contents',!S.day.bld.has(loaded.key));mvPut(true);check('cancel move restores contents',S.day.bld.has(loaded.key)&&loaded.x===before[0]&&loaded.y===before[1]);
  const oldSpot=mvSpot;mvPick({kind:'st',o:parent});mvSpot=()=>({sp:{x:parent.x+50,y:parent.y+50,a:Math.PI/2},ok:true});mvPut(false);mvSpot=oldSpot;check('contents follow moved furniture',Math.abs(loaded.x-(50-before[1]))<.001&&Math.abs(loaded.y-(50+before[0]))<.001);
  stGone(parent);check('removing support removes dependent decoration',!S.day.bld.has(loaded.key));
  // Legacy saves have neither height nor support fields.
  for(const o of save.d.bld){delete o.z;delete o.support;}dayLoad(save);check('legacy base loads',S.day.bld.size===save.d.bld.length&&[...S.day.bld.values()].every(o=>!o.z));
  // Mutating one local piece must retain all unrelated cell buffers.
  S.day.bld.clear();stGen++;for(let i=0;i<400;i++)stMake({id:'roofW',x:(i%20-10)*56,y:(Math.floor(i/20)-10)*56,a:0,done:true});thingsSync(true);
  const cells=new Map([...THING_CELLS].map(([id,c])=>[id,c.solid.mesh.geometry]));const first=[...S.day.bld.values()].find(o=>Math.abs(o.x-S.p.x)<500&&Math.abs(o.y-S.p.y)<500);first.burn=1;thingsSync(true);let replaced=0;for(const [id,c]of THING_CELLS)if(cells.get(id)!==c.solid.mesh.geometry)replaced++;check('local damage rebuilds one cell',replaced===1&&THING_CELLS.size>1,{replaced,cells:THING_CELLS.size});
  const door=stMake({id:'door',x:0,y:0,a:0,done:true});door.open=.5;door.ajar=1;thingsSync(true);check('moving door separated',SWING.skip.has(door));door.open=door.ajar=1;thingsSync(true);check('resting door returns to static batch',!SWING.skip.has(door));
  // Leave a natural furniture scene for visual inspection.
  S.day.bld.clear();stGen++;const tab=stMake({id:'table',x:0,y:0,a:0,done:true});const dec=stMake({id:'flowers',x:9,y:3,a:0,z:16,support:decorSupport(tab),done:true});dec.on=tab.key;
  EX_FIRE.gone=true;S.p.x=38;S.p.y=-42;aim(0,0,12);S.running=false;thingsSync(true);frame(performance.now());
  return checks;
 });
 await page.screenshot({path:require('path').join(process.env.TEST_OUTPUT || process.cwd(),'furniture.png')});
 await page.waitForFunction(()=>CL_VB.scream&&CL_VB.scream.filter(Boolean).length>1);
 const audio=await page.evaluate(async()=>{
  const stats={maxVoices:0,maxPlaced:0,contexts:[],audibleSamples:0};
  const analyser=actx.createAnalyser();analyser.fftSize=256;OUT.connect(analyser);const data=new Float32Array(256);
  const who=Array.from({length:20},(_,i)=>({x:S.p.x+20+Math.cos(i)*40,y:S.p.y+Math.sin(i)*40,cl:{voice:CL_VOICES[i%4]}}));
  for(let round=0;round<600;round++){
   for(const w of who)clanSnd(round%4?'chatter':'scream',w.x,w.y,1,125,w);
   snd('hit_flesh',{x:S.p.x+5,y:S.p.y});audioFrame();
   stats.maxVoices=Math.max(stats.maxVoices,PLACED.filter(p=>p.voice).length);stats.maxPlaced=Math.max(stats.maxPlaced,PLACED.length);stats.contexts.push(actx.state);
   analyser.getFloatTimeDomainData(data);if(data.some(x=>Math.abs(x)>.001))stats.audibleSamples++;
   await new Promise(r=>setTimeout(r,100));
  }
  const positional=placeOut(S.p.x+20,S.p.y,1);const p=PLACED.find(p=>p.inp===positional);const side1=placeCalc(p).side;S.aimW+=Math.PI;const side2=placeCalc(p).side;stats.positionFollowsTurn=Math.abs(side1+side2)<1e-6;positional.release();
  await new Promise(r=>setTimeout(r,7000));audioFrame();stats.remaining=PLACED.length;stats.audioTime=actx.currentTime;OUT.disconnect(analyser);analyser.disconnect();return stats;
 });
 if (audio.maxVoices > 8 || audio.maxPlaced > 48 || audio.remaining !== 0 || !audio.positionFollowsTurn || audio.audibleSamples < 590 || audio.contexts.some(s => s !== 'running') || errors.length) throw Error('Audio/runtime regression: '+JSON.stringify({audio,errors}));
 console.log(JSON.stringify({checks:results,audio,errors},null,2));await browser.close();server.close();
})().catch(e=>{console.error(e);process.exit(1)});
