// Measure actual visible and sun-depth cutouts, using depth textures rather than colour.
const {chromium}=require('playwright'),fs=require('fs'),http=require('http'),path=require('path');
(async()=>{
 const game=fs.readFileSync(process.env.GAME_FILE||path.join(__dirname,'../index.html'));
 const server=http.createServer((q,r)=>r.end(game)).listen(8779);
 const browser=await chromium.launch({executablePath:process.env.CHROME_PATH,headless:true});
 try{
  const page=await browser.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
  await page.addInitScript(()=>{window.requestAnimationFrame=()=>0;localStorage.setItem('behind-you-fp',JSON.stringify({ink:false,quality:'sharp',sound:false}))});
  await page.goto('http://localhost:8779');await page.waitForFunction(()=>ready);await page.evaluate(()=>startRun(true));
  const result=await page.evaluate(()=>{
   const checks=[],samples=[],check=(name,pass,detail)=>{checks.push({name,pass:!!pass,detail});if(!pass)throw Error(name+': '+JSON.stringify(detail))};
   S.day.t=DAY_LEN*.25;envFrame();LU.time.value=0;LU.shP.value.x=0;LU.occ.value.w=0;
   const N=256,rt=new THREE.WebGLRenderTarget(N,N,{depthBuffer:true});rt.depthTexture=new THREE.DepthTexture(N,N);
   const maskRT=new THREE.WebGLRenderTarget(N,N),pixels=new Uint8Array(N*N*4);
   const quadScene=new THREE.Scene(),qc=new THREE.OrthographicCamera(-1,1,1,-1,0,1);
   const qm=new THREE.ShaderMaterial({uniforms:{depthMap:{value:rt.depthTexture}},vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}',fragmentShader:'uniform sampler2D depthMap;varying vec2 vUv;void main(){gl_FragColor=vec4(vec3(texture2D(depthMap,vUv).r<.99999?1.:0.),1.);}'});
   const quad=new THREE.Mesh(new THREE.PlaneGeometry(2,2),qm);quadScene.add(quad);
   const sc=new THREE.Scene(),c=new THREE.OrthographicCamera(-65,65,65,-65,1,500),solid=new THREE.MeshBasicMaterial({side:THREE.DoubleSide});
   const h=terrH(0,0);c.position.set(0,h+60,200);c.lookAt(0,h+60,0);c.updateMatrixWorld();LU.camPos.value.copy(c.position);LU.fogC.value.copy(c.position);
   const read=(mesh,material)=>{
    mesh.material=material;renderer.setRenderTarget(rt);renderer.setClearColor(0,1);renderer.clear();renderer.render(sc,c);
    renderer.setRenderTarget(maskRT);renderer.clear();renderer.render(quadScene,qc);renderer.readRenderTargetPixels(maskRT,0,0,N,N,pixels);
    let total=0,trunk=0;for(let y=0;y<N;y++)for(let x=0;x<N;x++)if(pixels[(y*N+x)*4]){total++;if(y>=24&&y<42)trunk++;}return {total,trunk};
   };
   // Basic material has no terrain lift; translate the baseline by the identical height.
   const shiftedSolid=solid.clone();shiftedSolid.onBeforeCompile=sh=>{sh.uniforms.terrF=LU.terrF;sh.vertexShader=TERR_GLSL+'\n'+sh.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\n transformed.y+=terrH(modelMatrix[3].xz);');};
   for(const kind of ['pine','oak','cherry'])for(const low of [false,true]){
    const g=treeModel(kind,0,low),mesh=new THREE.Mesh(g,treeMat);sc.add(mesh);
    const full=read(mesh,shiftedSolid),visible=read(mesh,treeMat),shadow=read(mesh,SUN.treeMat);
    check(kind+' '+(low?'low':'high')+' visible canopy has fine cutouts',visible.total<full.total-20&&visible.total>full.total*.4,{full:full.total,visible:visible.total});
    check(kind+' '+(low?'low':'high')+' sun-depth pass lets light through',shadow.total<full.total-10&&shadow.total>full.total*.4,{full:full.total,shadow:shadow.total});
    check(kind+' '+(low?'low':'high')+' trunk stays solid in both passes',full.trunk>0&&visible.trunk===full.trunk&&shadow.trunk===full.trunk,{full:full.trunk,visible:visible.trunk,shadow:shadow.trunk});
    samples.push({kind,low,full,visible,shadow});sc.remove(mesh);g.dispose();
   }
   const distantGeometry=treeModel('oak',0,false),distantMesh=new THREE.Mesh(distantGeometry,treeMat);sc.add(distantMesh);LU.fogC.value.set(0,0,LU.leafRange.value.y*.8);
   const fading=read(distantMesh,treeMat),opaqueDistant=read(distantMesh,treeMatSolid);
   check('close and further tree materials cut the same gaps where trees pass between them',fading.total===opaqueDistant.total&&fading.trunk===opaqueDistant.trunk,{fading,opaqueDistant});
   // Every tree in sight keeps gaps: past the close band the pattern is read coarser rather than closed up.
   const distantFull=read(distantMesh,shiftedSolid);
   for(const d of [600,1200,1800]){LU.fogC.value.set(0,0,d);const far=read(distantMesh,treeMatSolid);
    check('a tree '+d+' away still has gaps in its leaves',far.total<distantFull.total-20&&far.total>distantFull.total*.4&&far.trunk===distantFull.trunk,{full:distantFull.total,far:far.total});}
   const q0=SET.quality;SET.quality='fast';treeLeafSync();const fastFar=read(distantMesh,treeMatSolid);SET.quality=q0;treeLeafSync();
   check('Fast draws the further trees solid, as before',fastFar.total===distantFull.total,{full:distantFull.total,fast:fastFar.total});
   sc.remove(distantMesh);distantGeometry.dispose();
   // A non-tree caster must not inherit the preceding tree's canopy attribute or texture mask.
   const box=new THREE.Mesh(new THREE.BoxGeometry(20,80,20),solid);box.position.y=40;sc.add(box);
   const opaque=read(box,shiftedSolid),nonTree=read(box,SUN.mat);
   check('non-tree shadow casters remain opaque after tree draws',opaque.total===nonTree.total&&opaque.total>0,{opaque,nonTree});
   renderer.setRenderTarget(null);
   const originals=[];scene.traverse(o=>{if(o.material)originals.push([o,o.material]);});sunShadows();
   check('sun pass restores every scene material',originals.every(([o,m])=>o.material===m));
   S.p.x=S.p.y=0;const edge=LU.leafRange.value.y*.8,o={x:edge+8,y:0,s:1,seed:.1,type:'pine'},vi=(o.seed*997|0)%TREE_NV;
   treesBegin();treeAdd(o,'pine',o.x);treesEnd();const close=TREES.pine[vi],far=TREES.pine[vi+TREE_NV];
   const before=Array.from(far.source.slice(0,16)),beforeHeight=far.heights[0];let heightCalls=0;const originalHeight=terrH;terrH=(...a)=>{heightCalls++;return originalHeight(...a);};
   let entered=false,preserved=false,returned=false;
   try{
     S.p.x=20;treesFrame();entered=close.list.includes(o)&&!far.list.includes(o);
     preserved=before.every((v,i)=>close.source[i]===v)&&close.heights[0]===beforeHeight&&close.shN===1&&close.keepShadow===1;
     S.p.x=-20;treesFrame();returned=far.list.includes(o)&&!close.list.includes(o)&&before.every((v,i)=>far.source[i]===v)&&far.heights[0]===beforeHeight&&far.shN===1;
   }finally{terrH=originalHeight;}
   check('close foliage assignment follows movement without a world reload',entered&&returned);
   check('close-band transfers preserve cached transforms, height and shadow prefix',preserved&&returned);
   check('close-band transfers do not resample terrain',heightCalls===0,heightCalls);

   rt.dispose();maskRT.dispose();qm.dispose();quad.geometry.dispose();solid.dispose();shiftedSolid.dispose();box.geometry.dispose();
   return {checks,samples};
  });
  if(errors.length)throw Error(errors.join('\n'));console.log(JSON.stringify({...result,errors},null,2));
 }finally{await browser.close();server.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
