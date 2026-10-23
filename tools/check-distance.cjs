const {chromium}=require('playwright');
const fs=require('fs'),http=require('http'),path=require('path');
(async()=>{
 const game=fs.readFileSync(process.env.GAME_FILE||path.join(__dirname,'../index.html'));
 const server=http.createServer((q,r)=>{r.setHeader('Content-Type','text/html');r.end(game)}).listen(8773);
 const browser=await chromium.launch({executablePath:process.env.CHROME_PATH||undefined,headless:true,args:['--autoplay-policy=no-user-gesture-required']});
 const page=await browser.newPage({viewport:{width:1280,height:720}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
 await page.addInitScript(()=>{window.requestAnimationFrame=()=>0;let seed=42;Math.random=()=>((seed=Math.imul(seed,1664525)+1013904223>>>0)/4294967296);localStorage.setItem('behind-you-fp',JSON.stringify({quality:'sharp',sound:false}));});
 await page.goto('http://localhost:8773/?debug');await page.waitForFunction(()=>ready);await page.evaluate(()=>startRun(true));
 const checks=await page.evaluate(()=>{
  const checks=[],check=(name,pass,detail)=>{checks.push({name,pass:!!pass,detail});if(!pass)throw Error(name+': '+JSON.stringify(detail))};
  S.running=false;S.day.t=DAY_LEN*.25;S.p.x=1400;S.p.y=1000;look.yaw=1.1;look.pitch=-.04;envFrame();
  check('world and detailed ranges doubled',VIEW===1900&&TREE_LOD===800&&VIS.plants===940&&VIS.drops===1200&&VIS.nodes===1080);
  check('first person far plane covers horizon',cam.far>VIEW+200,cam.far);
  check('day fog doubled',LU.fogR.value.x===860&&LU.fogR.value.y===1900,LU.fogR.value.toArray());
  worldSync(true);placeCamera(0,0,0);thingsSync(true);thingsFrame(0);treesFrame();propsFrame();propsN.end();sunShadows();inkRender();
  const props=propsNear(S.p.x,S.p.y,VIEW+VIS.preload),farTrees=props.filter(o=>o.kind==='tree'&&Math.hypot(o.x-S.p.x,o.y-S.p.y)>1200&&Math.hypot(o.x-S.p.x,o.y-S.p.y)<1800);
  const rendered=new Set(TREE_KINDS.flatMap(k=>TREES[k].flatMap(b=>b.list)));
  check('forest loaded throughout expanded visible radius',farTrees.length>0&&farTrees.every(o=>rendered.has(o)),farTrees.length);
  check('trees do not silently hit instance capacity',TREE_KINDS.every(k=>TREES[k].every(b=>b.list.length<TREE_CAP)));
  check('decor preloads beyond fade and next update',VIS.decorLoad>=VIS.plants+VIS.worldStep+80);
  check('plants fade at new distance',propMat('plant').m.uniforms.cullR.value===940);
  check('logs and small solid decor fade before their load boundary',propsW._kind('log')[0].m.material.uniforms.cullR.value===940&&propsW._kind('pebbles')[0].m.material.uniforms.cullR.value===940);
  check('large rocks retain the full world horizon',propsW._kind('rock')[0].m.material.uniforms.cullR.value===0);
  check('gatherable nodes have their own extended fade',Object.values(propsN.materials).every(m=>m.m.uniforms.cullR.value===1080));
  outlineSync();check('gatherable outlines retain the original world material policy',Object.entries(propsN.materials).every(([k,m])=>m.e===PROP_MAT[k].e&&!m.e.visible));
  const o={kind:'tree',type:'pine',x:S.p.x+900,y:S.p.y,s:1,seed:.25};
  treesBegin();treeAdd(o,'pine',900);
  const vi=(o.seed*997|0)%TREE_NV;
  check('both tree detail levels preloaded in overlap',TREES.pine[vi+2*TREE_NV].list.includes(o)&&TREES.pine[vi+3*TREE_NV].list.includes(o));
  check('tree transition spans 800 to 1000',TREE_LOD===800&&TREE_LOD_END===1000);
  treesBegin();treeAdd(o,'pine',650);check('detailed tree retained past old 400 cutoff',TREES.pine[vi+TREE_NV].list.includes(o));
  treesBegin();treeAdd(o,'pine',1250);check('distant trees use solid low detail',TREES.pine[vi+4*TREE_NV].list.includes(o));
  S.day.bld.clear();stGen++;const wall=stMake({id:'wallW',x:S.p.x,y:S.p.y-1000,a:0,done:true});thingsSync(true);
  check('building geometry present at 1000 units',thingsK.mesh.geometry.attributes.position.count>0);
  check('building fade extends to 1240',thingsK.mesh.material.uniforms.visualRange.value.x===1240);
  check('drop fade extends to 1200',dropRangeMat.uniforms.visualRange.value.x===1200&&dropB.m.uniforms.cull.value===1200);
  const positions=groundMesh.geometry.attributes.position;
  let min=Infinity,max=-Infinity,has10=false;for(let i=0;i<positions.count;i++){const x=positions.getX(i);min=Math.min(min,x);max=Math.max(max,x);if(x===10)has10=true}
  check('terrain reaches beyond horizon and preserves close grid',min===-3600&&max===3600&&has10,{min,max,has10});
  check('grass extends to 2160 with original near rings',GR_RINGS.join() === '120,360,1080,2160');
  check('grass mask covers extended field at same texel size',GM_S/GM_N===2400/512&&GM_S/2>2160);
  SET.view='iso';envFrame();placeCamera(0,0,0);check('iso far plane covers expanded horizon',cam.far>VIEW_ISO);
  SET.view='first';isoOff();envFrame();placeCamera(0,0,0);check('returning to first retains extended far plane',cam.far===VIEW+500);
  S.day.t=DAY_LEN*.82;envFrame();check('night fog remains proportionally limited',LU.fogR.value.y<1900&&LU.fogR.value.y>=1120,LU.fogR.value.toArray());
  S.day.t=DAY_LEN*.25;envFrame();worldDirty=true;worldSync(true);thingsSync(true);
  for(let i=0;i<8;i++)frame(performance.now()+i*16);
  // Culling must preserve actual pixels, including shadows cast from outside the view.
  const read=()=>{sunShadows();inkRender();const gl=renderer.getContext(),a=new Uint8Array(gl.drawingBufferWidth*gl.drawingBufferHeight*4);gl.readPixels(0,0,gl.drawingBufferWidth,gl.drawingBufferHeight,gl.RGBA,gl.UNSIGNED_BYTE,a);return a};
  for(const yaw of [0,1.1,3,4.5]){
    look.yaw=yaw;placeCamera(0,0,0);instanceCulling=true;treesFrame();propsFrame();const a=read();
    instanceCulling=false;treesFrame();propsFrame();const b=read();let changed=0;
    for(let i=0;i<a.length;i++)if(Math.abs(a[i]-b[i])>1)changed++;
    check('instance culling preserves pixels and shadows at yaw '+yaw,changed===0,changed);
  }
  instanceCulling=true;treesFrame();propsFrame();
  const model=treeModel('oak',0,false),expanded=model.toNonIndexed();
  let exact=true;for(const name in model.attributes){const a=model.attributes[name],b=expanded.attributes[name];for(let i=0;i<model.index.count&&exact;i++){const j=model.index.getX(i);for(let k=0;k<a.itemSize;k++)if(a.array[j*a.itemSize+k]!==b.array[i*a.itemSize+k]){exact=false;break}}}
  check('indexed models preserve every triangle attribute',exact);
  check('indexing removes duplicate vertex work',model.attributes.position.count<model.index.count*.7,{vertices:model.attributes.position.count,corners:model.index.count});model.dispose();expanded.dispose();
  // Render isolated geometry at fixed screen size so fades are checked on actual GPU pixels.
  const testScene = new THREE.Scene(), testCam = new THREE.OrthographicCamera(-100,100,190,-30,1,1000);
  const rt = new THREE.WebGLRenderTarget(192,192), pixels = new Uint8Array(192*192*4);
  const savedFog=LU.fogR.value.clone(),savedCenter=LU.fogC.value.clone();LU.fogR.value.set(1e5,1e6);LU.fogC.value.set(0,0,0);
  const sample=(mesh,d)=>{
    testScene.add(mesh);mesh.position.set(0,0,-d);mesh.scale.setScalar(1.75);
    const h=terrH(0,-d);testCam.position.set(0,h+80,200-d);testCam.lookAt(0,h+80,-d);testCam.updateMatrixWorld();
    renderer.setRenderTarget(rt);renderer.setClearColor(0,1);renderer.clear();renderer.render(testScene,testCam);renderer.readRenderTargetPixels(rt,0,0,192,192,pixels);testScene.remove(mesh);
    let lit=0;for(let i=0;i<pixels.length;i+=4)if(pixels[i]+pixels[i+1]+pixels[i+2]>20)lit++;return lit;
  };
  const hi=new THREE.Mesh(treeModel('pine',0,false),treeLodHigh),lo=new THREE.Mesh(treeModel('pine',0,true),treeLodLow);
  const high=[800,900,1000].map(d=>sample(hi,d)),low=[800,900,1000].map(d=>sample(lo,d));
  check('high tree pixels fade gradually',high[0]>1000&&high[1]>high[0]*.2&&high[1]<high[0]*.8&&high[2]===0,high);
  check('low tree pixels arrive gradually',low[0]===0&&low[1]>low[2]*.2&&low[1]<low[2]*.8&&low[2]>1000,low);
  const kit=new Kit();kit.add(P_BOX(),0,50,0,60,100,10,hex('#b5a86a'));
  const item=new THREE.Mesh(kit.geometry(),rangeMaterial(kitMat,1200));
  const fade=[1000,1140,1300].map(d=>sample(item,d));
  check('detail fade removes geometry gradually',fade[0]>1000&&fade[1]>fade[0]*.1&&fade[1]<fade[0]*.9&&fade[2]===0,fade);
  item.geometry.dispose();item.material.dispose();hi.geometry.dispose();lo.geometry.dispose();rt.dispose();
  renderer.setRenderTarget(null);LU.fogR.value.copy(savedFog);LU.fogC.value.copy(savedCenter);
  envFrame();worldDirty=true;worldSync(true);placeCamera(0,0,0);sunShadows();inkRender();
  S.p.x=isleR(0)-120;S.p.y=0;worldDirty=true;
  for(let i=0;i<180;i++)worldSync(false);
  const shore=()=>scene.children.filter(m=>m.userData.shoreCell);
  const resident=shore().filter(m=>Math.hypot(m.geometry.boundingSphere.center.x-S.p.x,m.geometry.boundingSphere.center.z-S.p.y)<800);
  check('beach cells preload and retain fine detail',resident.length>10,resident.length);
  const residentGeo=new Map(resident.map(m=>[m,m.geometry]));
  for(const y of [80,140,240,140,0]){S.p.y=y;for(let i=0;i<32;i++)worldSync(false);}
  check('walking along beach reuses existing buffers',resident.every(m=>m.parent===scene&&m.geometry===residentGeo.get(m)));
  placeCamera(0,0,0);treesFrame();propsFrame();const a=read();shore().forEach(m=>m.frustumCulled=false);const b=read();shore().forEach(m=>m.frustumCulled=true);
  let shoreDiff=0;for(let i=0;i<a.length;i++)if(Math.abs(a[i]-b[i])>1)shoreDiff++;
  check('beach cell culling preserves pixels and shadows',shoreDiff===0,shoreDiff);
  check('WebGL shaders linked',renderer.info.programs.every(p=>!p.diagnostics||p.diagnostics.runnable));
  return checks;
 });
 await page.screenshot({path:path.join(process.env.TEST_OUTPUT||process.cwd(),'extended-distance.png')});
 if(errors.length)throw Error(errors.join('\n'));
 console.log(JSON.stringify({checks,errors},null,2));await browser.close();server.close();
})().catch(e=>{console.error(e);process.exit(1)});
