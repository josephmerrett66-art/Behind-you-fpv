const {chromium}=require('playwright');
const fs=require('fs'),http=require('http'),path=require('path');
(async()=>{
 const game=fs.readFileSync(process.env.GAME_FILE||path.join(__dirname,'../index.html'));
 const server=http.createServer((q,r)=>{r.setHeader('Content-Type','text/html');r.end(game)}).listen(8778);
 const browser=await chromium.launch({executablePath:process.env.CHROME_PATH,headless:true});
 try{
 const page=await browser.newPage({viewport:{width:1280,height:800}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
 await page.addInitScript(()=>{window.requestAnimationFrame=()=>0;let seed=42;Math.random=()=>((seed=Math.imul(seed,1664525)+1013904223>>>0)/4294967296);localStorage.setItem('behind-you-fp',JSON.stringify({quality:'sharp',sound:false,ink:false}));});
 await page.goto('http://localhost:8778/?debug');await page.waitForFunction(()=>ready);await page.evaluate(()=>startRun(true));
 const out=process.env.TEST_OUTPUT||'../../outputs/foliage-after';fs.mkdirSync(out,{recursive:true});
 const models=await page.evaluate(()=>TREE_KINDS.flatMap(k=>Array.from({length:3},(_,vi)=>[false,true].map(lo=>{const g=treeModel(k,vi,lo);return {kind:k,vi,lo,triangles:g.index.count/3,vertices:g.attributes.position.count,finite:Object.values(g.attributes).every(a=>a.array.every(Number.isFinite))}})).flat()));
 for(const [name,kind,vi,close] of [['oak','oak',0,false],['cherry','cherry',1,false],['spruce','pine',0,false],['fir','pine',1,false],['pine','pine',2,false],['oak-detail','oak',0,true],['needles-detail','pine',0,true]]){
  await page.evaluate(({kind,vi,close})=>{
   S.running=false;S.day.t=DAY_LEN*.25;S.t=100;S.p.x=0;S.p.y=0;envFrame();LU.time.value=0;LU.shP.value.x=0;LU.occ.value.w=0;
   const sc=new THREE.Scene();sc.background=new THREE.Color('#a5bac1');const g=treeModel(kind,vi,false),mesh=new THREE.Mesh(g,treeMatSolid);sc.add(mesh);
   const h=terrH(0,0),c=new THREE.PerspectiveCamera(40,1280/800,1,3000);c.position.set(close?28:105,h+(close?65:72),close?70:190);c.lookAt(0,h+(close?67:65),0);c.updateMatrixWorld();LU.camPos.value.copy(c.position);LU.fogC.value.copy(c.position);
   renderer.setRenderTarget(null);renderer.render(sc,c);g.dispose();
  },{kind,vi,close});
  await page.screenshot({path:path.join(out,name+'.png')});
 }
 const checks=[{name:'all 24 species/variant/LOD geometries have finite attributes',pass:models.every(m=>m.finite)},{name:'all tree variants retain indexed geometry',pass:models.every(m=>m.vertices<m.triangles*3)}];
 if(checks.some(c=>!c.pass)||errors.length)throw Error(JSON.stringify({checks,errors}));
 console.log(JSON.stringify({models,checks,errors},null,2));
 }finally{await browser.close();server.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
