// how many tree pixels get shaded in a view (each one that passes the depth test as it's drawn, in the game's own draw order):
// a measure of the trees' fragment work that doesn't depend on the speed of software GL. GAME_FILE=... node tools/count-tree-fragments.cjs
const {chromium}=require('playwright');
const fs=require('fs'),http=require('http');
(async()=>{
 const game=fs.readFileSync(process.env.GAME_FILE||require('path').join(__dirname,'../index.html'));
 const server=http.createServer((q,r)=>{r.setHeader('Content-Type','text/html');r.end(game)}).listen(8778);
 const browser=await chromium.launch({headless:true});
 try{
 const page=await browser.newPage({viewport:{width:640,height:360}});
 await page.addInitScript(()=>{window.requestAnimationFrame=()=>0;let seed=42;Math.random=()=>((seed=Math.imul(seed,1664525)+1013904223>>>0)/4294967296);localStorage.setItem('behind-you-fp',JSON.stringify({quality:'sharp',sound:false,ink:false}));});
 await page.goto('http://localhost:8778/?debug');await page.waitForFunction(()=>ready,null,{timeout:180000});await page.evaluate(()=>startRun(true));
 const views=[['forest',1400,1000,1.1,-.04,.3],['meadow',0,200,3.14,-.03,.3],['glade',350,700,2.4,-.03,.3],['deep',1400,1000,-2.0,.02,.3]];
 for(const [name,x,y,yaw,pitch,time] of views){
  const r=await page.evaluate(({x,y,yaw,pitch,time})=>{
   S.running=false;S.p.x=x;S.p.y=y;S.day.t=DAY_LEN*time;look.yaw=yaw;look.pitch=pitch;S.t=100;
   groundMesh.position.set(Math.round(x/10)*10,0,Math.round(y/10)*10);envFrame();worldSync(true);thingsSync(true);grassMask(x,y,WORLD.lakes,1);placeCamera(0,0,0);thingsFrame(0);treesFrame();propsFrame();propsN.end();shN=shBase;shadowsEnd();sunShadows();outlineSync();
   const W=320,H=180,rt=new THREE.WebGLRenderTarget(W,H,{type:THREE.HalfFloatType,depthBuffer:true});
   const trees=[];for(const k of TREE_KINDS)for(const B of TREES[k])trees.push(B.m);
   const tset=new Set(trees),saved=[];scene.traverse(o=>{if(o.isMesh||o.isPoints||o.isLine)saved.push([o,o.visible]);});
   for(const m of trees)m.visible=false;
   const ac=renderer.autoClear;renderer.autoClear=false;renderer.setRenderTarget(rt);renderer.setClearColor(0,1);renderer.clear();renderer.render(scene,cam);
   renderer.clearColor();   // keep the depth of everything that isn't a tree
   for(const [o] of saved)if(!tset.has(o))o.visible=false;
   const mats=new Map();
   for(const m of trees){m.visible=true;let c=mats.get(m.material);if(!c){c=m.material.clone();c.uniforms=m.material.uniforms;c.defines=Object.assign({},m.material.defines);
     c.fragmentShader=m.material.fragmentShader.replace(/gl_FragColor = vec4\(fogged\(grey\(o\), vW\)[^;]*;/,'gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0);');
     if(c.fragmentShader===m.material.fragmentShader)throw Error('no patch');c.blending=THREE.CustomBlending;c.blendEquation=THREE.AddEquation;c.blendSrc=THREE.OneFactor;c.blendDst=THREE.OneFactor;c.transparent=false;mats.set(m.material,c);}
     m.userData.mat0=m.material;m.material=c;}
   renderer.render(scene,cam);
   const px=new Uint16Array(W*H*4);renderer.readRenderTargetPixels(rt,0,0,W,H,px);
   const h2f=h=>{const e=(h>>10)&31,f=h&1023;return e?Math.pow(2,e-15)*(1+f/1024):f/1024*Math.pow(2,-14);};
   let frags=0,covered=0;for(let i=0;i<W*H;i++){const v=Math.round(h2f(px[i*4]));frags+=v;if(v)covered++;}
   for(const m of trees){m.material=m.userData.mat0;}for(const [o,v] of saved)o.visible=v;
   renderer.setRenderTarget(null);renderer.autoClear=ac;rt.dispose();for(const c of mats.values())c.dispose();
   return {treeFrags:frags,treePixels:covered,perPixel:+(frags/Math.max(1,covered)).toFixed(2),screenShare:+(covered/(W*H)).toFixed(3)};
  },{x,y,yaw,pitch,time});
  console.log(name,JSON.stringify(r));
 }
 }finally{await browser.close();server.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
