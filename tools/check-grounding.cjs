const {chromium}=require('playwright');
const fs=require('fs'),http=require('http'),path=require('path');
(async()=>{
 const game=fs.readFileSync(process.env.GAME_FILE||path.join(__dirname,'../index.html'));
 const server=http.createServer((q,r)=>{r.setHeader('Content-Type','text/html');r.end(game)}).listen(8776);
 const browser=await chromium.launch({executablePath:process.env.CHROME_PATH,headless:true});
 try{
 const page=await browser.newPage({viewport:{width:1280,height:800}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
 await page.addInitScript(()=>{window.requestAnimationFrame=()=>0;let seed=42;Math.random=()=>((seed=Math.imul(seed,1664525)+1013904223>>>0)/4294967296);localStorage.setItem('behind-you-fp',JSON.stringify({quality:'sharp',sound:false,ink:false}));});
 await page.goto('http://localhost:8776/?debug');await page.waitForFunction(()=>ready);await page.evaluate(()=>startRun(true));
 await page.waitForFunction(()=>ISHEET.ok.axe1);
 const result=process.env.VISUAL_ONLY==='1'?{}:await page.evaluate(()=>{
  const checks=[],check=(name,pass,detail)=>{checks.push({name,pass:!!pass,detail});if(!pass)throw Error(name+': '+JSON.stringify(detail))};
  const audit=[];let fits=0,worst=-Infinity;
  for(const kind in PROP_KIND){if(kind==='nberries')continue;
   let gap=-Infinity,contact=-Infinity;
   for(let vi=0;vi<PROP_KIND[kind].n;vi++){
    const g=propModel(kind,vi),p=g.attributes.position,foot=g.boundingBox.min.y+.65;
    for(const [x,y] of [[0,0],[350,700],[1400,1000],[1850,-650],[5200,300],[5500,0]]){
     terrLevelSync(x,y,[]);const h=terrH(x,y),s=kind.startsWith('rock')?2:1.3,fit=propGroundFit(g,x,y,s,.371,h),v=new V3();let min=Infinity,max=-Infinity;
     for(let i=0;i<p.count;i++)if(p.getY(i)<=foot){v.fromBufferAttribute(p,i).applyMatrix4(fit.m);const d=v.y+h-terrH(v.x,v.z);min=Math.min(min,d);max=Math.max(max,d)}
     gap=Math.max(gap,max);contact=Math.max(contact,min);fits++;
    }
   }
   audit.push({kind,maxBaseGap:gap,maxLowestContact:contact});worst=Math.max(worst,gap);
   check(kind+' remains seated on flat/sloping/coastal terrain',contact<=.001&&gap<=.01,{maxBaseGap:gap,maxLowestContact:contact});
  }
  for(const kind of TREE_KINDS){
   let worstRoot=-Infinity;
   for(let vi=0;vi<TREE_NV;vi++)for(const [x,y] of [[0,0],[350,700],[1400,1000],[1850,-650],[5200,300],[5500,0]]){
    terrLevelSync(x,y,[]);const g=treeModel(kind,vi,false);g.computeBoundingBox();const p=g.attributes.position,m=treeMatrix({x,y,s:1,seed:vi*.17},0),v=new V3(),h=terrH(x,y);let low=Infinity;
    for(let i=0;i<p.count;i++)if(p.getY(i)<=g.boundingBox.min.y+.25){v.fromBufferAttribute(p,i).applyMatrix4(m);low=Math.min(low,v.y+h-terrH(v.x,v.z));}
    worstRoot=Math.max(worstRoot,low);
   }
   check(kind+' tree roots remain connected to terrain',worstRoot<=.01,worstRoot);
  }
  propsN.begin();propsN.add('bbush',1,1400,1000,1.15,.25);propsN.add('nberries',1,1400,1000,1.15,.25);
  const a=propsN.k.bbush[1].items[0].m,b=propsN.k.nberries[1].items[0].m;
  check('berries keep exactly the same footing as their bush',a.every((v,i)=>v===b[i]));
  const originalFit=propGroundFit;let repeatedFits=0;propGroundFit=(...a)=>{repeatedFits++;return originalFit(...a)};
  propsN.begin();propsN.add('bbush',1,1400,1000,1.15,.25);propGroundFit=originalFit;
  check('stationary gatherable reuses cached terrain fitting',repeatedFits===0,repeatedFits);
  S.day.drops=[{it:'axe1',x:1400,y:1000,seed:.2,n:1}];S.p.x=1400;S.p.y=1000;
  thingsFrame(10);const m=dropPool.find(m=>m.visible),first=m.position.clone(),rotation=m.rotation.y;
  check('dropped item visible edge rests on terrain',m&&Math.abs(m.position.y+m.geometry.userData.groundY*m.scale.y+.05)<.001);
  thingsFrame(12);check('dropped items no longer hover or spin',m.position.equals(first)&&m.rotation.y===rotation);
  const floor=stMake({id:'floorW',x:1400,y:1000,a:0,done:true});stGen++;
  thingsFrame(14);const lift=dropSupport(S.day.drops[0]);
  check('dropped item rests on a built floor rather than sinking through it',lift>1&&Math.abs(m.position.y+m.geometry.userData.groundY*m.scale.y+.05-lift)<.001,lift);
  const rock=propsNear(700,400,400).find(o=>o.kind==='rock'),D=S.day,inv=D.inv.slice(),hot=D.hot,atk=S.p.atk;
  S.p.x=rock.x+35;S.p.y=rock.y;D.inv[0]=newSlot('pick3',1);D.hot=0;D.st=100;
  for(let i=0;i<2;i++){S.p.atk={hit:new Set()};dayHarvest({reach:70,dmg:1,knock:0},0,o=>o===rock,()=>{});}
  check('grounded mineable rock still breaks with the normal pick interaction',D.felled.has(rock.key));
  D.felled.delete(rock.key);D.cut.delete('r'+rock.key);D.inv=inv;D.hot=hot;S.p.atk=atk;delete rock.shakeT;
  return {checks,audit,fits,worst};
 });
 const out=process.env.TEST_OUTPUT||'../../outputs/grounding-after';fs.mkdirSync(out,{recursive:true});
 for(const [name,region] of [['rock',700],['ore',3500]]){
  await page.evaluate(({region})=>{
   S.running=false;S.day.t=DAY_LEN*.25;envFrame();
   const rocks=propsNear(region,400,500).filter(o=>o.kind==='rock');
   rocks.sort((a,b)=>{const slope=o=>Math.abs(terrH(o.x+15,o.y)-terrH(o.x-15,o.y))+Math.abs(terrH(o.x,o.y+15)-terrH(o.x,o.y-15));return slope(b)-slope(a)});
   const o=rocks[0];if(!o)throw Error('No rock fixture');S.p.x=o.x+85;S.p.y=o.y+65;
   worldSync(true);thingsSync(true);grassMask(S.p.x,S.p.y,WORLD.lakes,1);groundMesh.position.set(Math.round(S.p.x/10)*10,0,Math.round(S.p.y/10)*10);
   placeCamera(0,0,0);cam.lookAt(o.x,terrH(o.x,o.y)+10,o.y);cam.updateMatrixWorld();LU.camPos.value.copy(cam.position);
   thingsFrame(0);treesFrame();propsFrame();propsN.end();outlineSync();sunShadows();inkRender();drawHud();
  },{region});
  await page.screenshot({path:path.join(out,name+'.png')});
 }
 if(errors.length)throw Error(errors.join('\n'));console.log(JSON.stringify({...result,errors},null,2));
 }finally{await browser.close();server.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
