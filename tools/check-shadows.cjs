const {chromium}=require('playwright');
const fs=require('fs'),http=require('http'),path=require('path');
(async()=>{
 const server=http.createServer((q,r)=>{r.setHeader('Content-Type','text/html');r.end(fs.readFileSync(path.join(__dirname,'../index.html')))}).listen(8774);
 const browser=await chromium.launch({executablePath:process.env.CHROME_PATH,headless:true});
 try{
 const page=await browser.newPage({viewport:{width:960,height:540}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
 await page.addInitScript(()=>{window.requestAnimationFrame=()=>0;localStorage.setItem('behind-you-fp',JSON.stringify({quality:'sharp',sound:false}));});
 await page.goto('http://localhost:8774/?debug');await page.waitForFunction(()=>ready);await page.evaluate(()=>startRun(true));
 const checks=await page.evaluate(()=>{
  const checks=[],check=(name,pass,detail)=>{checks.push({name,pass:!!pass,detail});if(!pass)throw Error(name+': '+JSON.stringify(detail))};
  S.running=false;S.p.x=1400;S.p.y=1000;S.day.t=DAY_LEN*.25;envFrame();worldSync(true);placeCamera(0,0,0);treesFrame();propsFrame();sunShadows();
  const pool=TREE_KINDS.flatMap(k=>TREE_SHADOWS[k]);
  check('shadow pool retains roots beyond old 808-unit cutoff',pool.some(B=>B.casters.some(o=>Math.hypot(o.matrix.elements[12]-S.p.x,o.matrix.elements[14]-S.p.y)>1000)));
  const quadScene=new THREE.Scene(),quadCam=new THREE.OrthographicCamera(-1,1,1,-1,0,1),rt=new THREE.WebGLRenderTarget(128,128);
  const quad=new THREE.Mesh(new THREE.PlaneGeometry(2,2),new THREE.ShaderMaterial({uniforms:{depth:{value:SUN.rt.depthTexture}},vertexShader:'varying vec2 uv0;void main(){uv0=uv;gl_Position=vec4(position.xy,0.,1.);}',fragmentShader:'uniform sampler2D depth;varying vec2 uv0;void main(){float d=texture2D(depth,uv0).r;gl_FragColor=vec4(vec3(d),1.);}'}));quadScene.add(quad);
  const read=()=>{const a=new Uint8Array(128*128*4);renderer.setRenderTarget(rt);renderer.render(quadScene,quadCam);renderer.readRenderTargetPixels(rt,0,0,128,128,a);renderer.setRenderTarget(null);return a};
  for(const [name,dir] of [['low morning',[1,.12,-.45]],['noon',[.1,1,-.45]],['low evening',[-1,.12,-.45]]]){
   LU.sunK.value=1;LU.sunDir.value.set(...dir).normalize();sunShadows();const a=read();
   const optimized=pool.map(B=>B.m.count),original=treeShadowFrame;
   treeShadowFrame=()=>{for(const B of pool){B.casters.forEach((o,i)=>B.m.setMatrixAt(i,o.matrix));B.m.count=B.casters.length;treeUpload(B,B.m.count)}};
   sunShadows();const b=read();treeShadowFrame=original;
   // Restore compacted buffers after the reference render.
   for(const B of pool)B.selected=[-1];sunShadows();
   let changed=0;for(let i=0;i<a.length;i++)if(a[i]!==b[i])changed++;
   check(name+' light-frustum culling preserves shadow-map pixels',changed===0,{changed,selected:optimized.reduce((a,b)=>a+b,0),pool:pool.reduce((n,B)=>n+B.casters.length,0)});
   if(name==='low morning')check('low sun retains distant casters whose shadows reach map',pool.some(B=>B.selected.some(i=>Math.hypot(B.casters[i].matrix.elements[12]-S.p.x,B.casters[i].matrix.elements[14]-S.p.y)>808)));
  }
  const old=pool.map(B=>B.selected.join(',')).join('|');look.yaw+=Math.PI;placeCamera(0,0,0);sunShadows();
  check('caster selection follows camera without world reload',old!==pool.map(B=>B.selected.join(',')).join('|'));
  LU.sunK.value=0;sunShadows();check('night disables sun-map coverage',LU.shC.value.w===0&&LU.shP.value.x===0);
  rt.dispose();quad.geometry.dispose();quad.material.dispose();return checks;
 });
 if(errors.length)throw Error(errors.join('\n'));console.log(JSON.stringify({checks,errors},null,2));
 }finally{await browser.close();server.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
