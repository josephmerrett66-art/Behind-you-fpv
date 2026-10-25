const {chromium}=require('playwright');
const fs=require('fs'),http=require('http'),path=require('path');
(async()=>{
 const game=fs.readFileSync(process.env.GAME_FILE||path.join(__dirname,'../index.html'));
 const server=http.createServer((q,r)=>{r.setHeader('Content-Type','text/html');r.end(game)}).listen(8775);
 const browser=await chromium.launch({executablePath:process.env.CHROME_PATH,headless:true});
 try{
 const page=await browser.newPage({viewport:{width:1280,height:800}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
 await page.addInitScript(({quality})=>{window.requestAnimationFrame=()=>0;let seed=42;Math.random=()=>((seed=Math.imul(seed,1664525)+1013904223>>>0)/4294967296);localStorage.setItem('behind-you-fp',JSON.stringify({quality,sound:false,ink:false}));},{quality:process.env.CHECK_QUALITY||'sharp'});
 await page.goto('http://localhost:8775/?debug');await page.waitForFunction(()=>ready);await page.evaluate(()=>startRun(true));
 const out=process.env.TEST_OUTPUT||'../../outputs/ground-cover';fs.mkdirSync(out,{recursive:true});
 const results=[];
 for(const [name,x,y,yaw,pitch,time] of [['forest',1400,1000,1.1,-.12,.25],['underfoot',1400,1000,1.1,-.68,.25],['glade',350,700,2.4,-.2,.25],['meadow',0,200,Math.PI,-.3,.25],['coast',5500,0,1.5,-.22,.25],['night',1400,1000,1.1,-.25,.82]]){
  results.push(await page.evaluate(({x,y,yaw,pitch,time,name})=>{
   S.running=false;S.p.x=x;S.p.y=y;S.day.t=DAY_LEN*time;look.yaw=yaw;look.pitch=pitch;S.t=100;
   groundMesh.position.set(Math.round(x/10)*10,0,Math.round(y/10)*10);envFrame();worldSync(true);thingsSync(true);grassMask(x,y,WORLD.lakes,1);placeCamera(0,0,0);thingsFrame(0);treesFrame();propsFrame();propsN.end();shN=shBase;shadowsEnd();sunShadows();outlineSync();
   renderer.info.autoReset=false;renderer.info.reset();inkRender();drawHud();
   const pos=grassMesh.geometry.attributes.position;let maxHeight=0;for(let i=0;i<pos.count;i++)maxHeight=Math.max(maxHeight,pos.getY(i));
   return {name,grassTriangles:GR_N*GR_RINGS.length,maxHeight,calls:renderer.info.render.calls,triangles:renderer.info.render.triangles};
  },{x,y,yaw,pitch,time,name}));
  await page.screenshot({path:path.join(out,name+'.png')});
 }
 const checks=process.env.VISUAL_ONLY==='1'?[]:await page.evaluate(()=>{
  const checks=[],check=(name,pass,detail)=>{checks.push({name,pass:!!pass,detail});if(!pass)throw Error(name+': '+JSON.stringify(detail))};
  S.day.t=DAY_LEN*.25;S.p.x=0;S.p.y=200;envFrame();placeCamera(0,0,0);
  const testScene=new THREE.Scene(),testCam=new THREE.OrthographicCamera(-35,35,35,-35,1,300),rt=new THREE.WebGLRenderTarget(128,128);
  // An oblique view measures blade visibility without depending on how far wind bends them.
  testCam.position.set(0,100,245);testCam.up.set(0,1,0);testCam.lookAt(0,0,200);testCam.updateMatrixWorld();
  const mesh=grassMesh.meshes[0],parent=mesh.parent,saved=grassMaskData.slice(),pixels=new Uint8Array(128*128*4);
  const read=()=>{renderer.setRenderTarget(rt);renderer.setClearColor(0,1);renderer.clear();renderer.render(testScene,testCam);renderer.readRenderTargetPixels(rt,0,0,128,128,pixels);let n=0;for(let i=0;i<pixels.length;i+=4)if(pixels[i]+pixels[i+1]+pixels[i+2]>0)n++;return n};
  testScene.add(mesh);grassMaskData.fill(255);grassMaskTex.needsUpdate=true;const visible=read();
  grassMaskData.fill(0);grassMaskTex.needsUpdate=true;const masked=read();
  mesh.visible=false;grassMaskData.fill(255);grassMaskTex.needsUpdate=true;const hidden=read();mesh.visible=SET.grass;
  parent.add(mesh);grassMaskData.set(saved);grassMaskTex.needsUpdate=true;renderer.setRenderTarget(null);rt.dispose();
  check('unmasked turf produces visible pixels',visible>100,visible);
  check('floor/water exclusion mask suppresses turf completely',masked===0,masked);
  check('grass off removes turf completely',hidden===0,hidden);
  return checks;
 });
 if(errors.length)throw Error(errors.join('\n'));
 console.log(JSON.stringify({results,checks,errors},null,2));
 }finally{await browser.close();server.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
