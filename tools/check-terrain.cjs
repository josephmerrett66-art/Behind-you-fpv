const {chromium}=require('playwright');
const fs=require('fs'),http=require('http'),path=require('path');
(async()=>{
 const game=fs.readFileSync(process.env.GAME_FILE||path.join(__dirname,'../index.html'));
 const server=http.createServer((q,r)=>{r.setHeader('Content-Type','text/html');r.end(game)}).listen(8777);
 const browser=await chromium.launch({executablePath:process.env.CHROME_PATH,headless:true});
 try{
 const page=await browser.newPage({viewport:{width:1280,height:800}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
 await page.addInitScript(()=>{window.requestAnimationFrame=()=>0;let seed=42;Math.random=()=>((seed=Math.imul(seed,1664525)+1013904223>>>0)/4294967296);localStorage.setItem('behind-you-fp',JSON.stringify({quality:'sharp',sound:false,ink:false}));});
 await page.goto('http://localhost:8777/?debug');await page.waitForFunction(()=>ready);await page.evaluate(()=>startRun(true));
 const samples=JSON.parse(fs.readFileSync(path.join(__dirname,'../assets/terrain-map-samples.json')));
 const checks=process.env.VISUAL_ONLY==='1'?[]:await page.evaluate((samples)=>{
  const checks=[],check=(name,pass,detail)=>{checks.push({name,pass:!!pass,detail});if(!pass)throw Error(name+': '+JSON.stringify(detail))};
  check('packed maps loaded at their intended resolution',floorTex.image.width===512&&soilTex.image.width===512);
  check('combined material texel storage below old 768 square texture',2*512*512<768*768);
  for(const [name,map] of [['detail',floorTex],['regions',soilTex]]){
   const refs=samples[name],sc=new THREE.Scene(),ca=new THREE.OrthographicCamera(-1,1,1,-1,0,1),rt=new THREE.WebGLRenderTarget(refs.length,1),pixels=new Uint8Array(refs.length*4);
   const oldMin=map.minFilter,oldMag=map.magFilter;map.minFilter=map.magFilter=THREE.NearestFilter;map.needsUpdate=true;
   const mat=new THREE.ShaderMaterial({uniforms:{dataMap:{value:map},texels:{value:refs.map(r=>new THREE.Vector2((r.x+.5)/512,(r.y+.5)/512))}},vertexShader:'void main(){gl_Position=vec4(position.xy,0.,1.);}',fragmentShader:'uniform sampler2D dataMap;uniform vec2 texels[8];void main(){gl_FragColor=texture2D(dataMap,texels[int(gl_FragCoord.x)]);}'});
   const mesh=new THREE.Mesh(new THREE.PlaneGeometry(2,2),mat);sc.add(mesh);renderer.setRenderTarget(rt);renderer.render(sc,ca);renderer.readRenderTargetPixels(rt,0,0,refs.length,1,pixels);renderer.setRenderTarget(null);
   let worst=0;refs.forEach((r,i)=>r.rgba.forEach((v,c)=>worst=Math.max(worst,Math.abs(v-pixels[i*4+c]))));
   check(name+' packed channels survive browser decoding and GPU upload',worst<=3,worst);
   map.minFilter=oldMin;map.magFilter=oldMag;map.needsUpdate=true;rt.dispose();mesh.geometry.dispose();mat.dispose();
  }
  const points=Array.from({length:48},(_,i)=>new THREE.Vector2(-600+i*133,Math.sin(i*1.37)*2100));
  const sc=new THREE.Scene(),ca=new THREE.OrthographicCamera(-1,1,1,-1,0,1),rt=new THREE.WebGLRenderTarget(points.length,1),pixels=new Uint8Array(points.length*4);
  const mat=new THREE.ShaderMaterial({uniforms:Object.assign({points:{value:points}},LU),vertexShader:'void main(){gl_Position=vec4(position.xy,0.,1.);}',fragmentShader:TERR_GLSL+`uniform vec2 points[48];void main(){float h=terrH(points[int(gl_FragCoord.x)]);float v=(h+128.)/256.;vec3 e=fract(v*vec3(1.,255.,65025.));e-=e.yzz*vec3(1./255.,1./255.,0.);gl_FragColor=vec4(e,1.);}`});
  const plane=new THREE.Mesh(new THREE.PlaneGeometry(2,2),mat);sc.add(plane);renderer.setRenderTarget(rt);renderer.render(sc,ca);renderer.readRenderTargetPixels(rt,0,0,points.length,1,pixels);renderer.setRenderTarget(null);
  let worst=0;for(let i=0;i<points.length;i++){const gpu=(pixels[i*4]/255+pixels[i*4+1]/65025+pixels[i*4+2]/16581375)*256-128;worst=Math.max(worst,Math.abs(gpu-terrH(points[i].x,points[i].y)));}
  check('CPU and GPU height fields agree across 48 world locations',worst<.025,worst);
  mat.fragmentShader=TERR_GLSL+'uniform vec2 points[48];void main(){gl_FragColor=vec4(terrN(points[int(gl_FragCoord.x)])*.5+.5,1.);}';mat.needsUpdate=true;
  renderer.setRenderTarget(rt);renderer.render(sc,ca);renderer.readRenderTargetPixels(rt,0,0,points.length,1,pixels);renderer.setRenderTarget(null);
  let normalError=0;points.forEach((p,i)=>{const n=new V3(-(terrH(p.x+3,p.y)-terrH(p.x-3,p.y))/6,1,-(terrH(p.x,p.y+3)-terrH(p.x,p.y-3))/6).normalize();[n.x,n.y,n.z].forEach((v,c)=>normalError=Math.max(normalError,Math.abs(v-(pixels[i*4+c]/255*2-1))));});
  check('analytic/sampled GPU normals match the actual terrain slopes',normalError<.012,normalError);
  rt.dispose();plane.geometry.dispose();mat.dispose();
  const height=terrH(0,0);check('camp remains level across its build area',Math.abs(terrH(40,30)-height)<.001&&Math.abs(terrH(-40,-30)-height)<.001);
  return checks;
 },samples);
 const sites=await page.evaluate(()=>{
  const sites=[];
  for(const type of ['grove','deadwood','boulders']){
   const matches=AREA.marks.map(m=>({...m,x:m.x>AREA_P/2?m.x-AREA_P:m.x,y:m.y>AREA_P/2?m.y-AREA_P:m.y})).filter(m=>m.t===type&&coastS(m.x,m.y)<-400).sort((a,b)=>Math.hypot(a.x,a.y)-Math.hypot(b.x,b.y));
   if(matches[0])sites.push({name:type,x:matches[0].x,y:matches[0].y});
  }return sites;
 });
 const out=process.env.TEST_OUTPUT||'../../outputs/terrain-after';fs.mkdirSync(out,{recursive:true});
 for(const site of [...sites,{name:'rain',x:350,y:700},{name:'low-sun',x:0,y:200}]){
  await page.evaluate(({name,x,y})=>{
   S.running=false;S.p.x=x;S.p.y=y;S.day.t=DAY_LEN*(name==='low-sun'?.03:.25);S.t=100;look.yaw=.7;look.pitch=-.36;
   envFrame();if(name==='rain')LU.rainW.value=.8;else LU.rainW.value=0;
   worldSync(true);thingsSync(true);grassMask(x,y,WORLD.lakes,1);placeCamera(0,0,0);thingsFrame(0);treesFrame();propsFrame();propsN.end();outlineSync();sunShadows();
   groundMesh.position.set(Math.round(x/10)*10,0,Math.round(y/10)*10);inkRender();drawHud();
  },site);
  await page.screenshot({path:path.join(out,site.name+'.png')});
 }
 if(errors.length)throw Error(errors.join('\n'));console.log(JSON.stringify({checks,sites,errors},null,2));
 }finally{await browser.close();server.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
