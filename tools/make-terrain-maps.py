"""Deterministic, seamless material data maps. No photographic textures or runtime noise generation."""
from pathlib import Path
import math, json
import numpy as np
from PIL import Image, ImageDraw
N=512
OUT=Path(__file__).resolve().parent.parent/'assets'
def noise(cells,seed):
    rng=np.random.default_rng(seed);g=rng.random((cells,cells))
    q=np.arange(N)*cells/N;i=np.floor(q).astype(int);f=q-i;f=f*f*(3-2*f)
    return ((g[i[:,None]%cells,i[None,:]%cells]*(1-f[None,:])+g[i[:,None]%cells,(i[None,:]+1)%cells]*f[None,:])*(1-f[:,None])+(g[(i[:,None]+1)%cells,i[None,:]%cells]*(1-f[None,:])+g[(i[:,None]+1)%cells,(i[None,:]+1)%cells]*f[None,:])*f[:,None])
raw=np.stack([noise(52,1)*.7+noise(160,2)*.3,noise(43,3)*.7+noise(135,4)*.3,noise(26,5)*.8+noise(110,6)*.2,noise(92,7)*.75+noise(250,8)*.25],axis=-1)
raw=np.clip(.5+(raw-.5)*1.45,0,1)
regions=np.uint8(np.clip(raw*255,0,255));regions[:,:,3]=np.uint8(128+np.rint(raw[:,:,3]*127))
Image.fromarray(regions,'RGBA').save(OUT/'terrain-regions.png',optimize=True)
rng=np.random.default_rng(771)
height=.26+.38*noise(12,11)+.16*noise(48,12)+.1*noise(160,13)
clusters=noise(6,14)
moss=.1+.65*clusters+.2*noise(32,15)
height_img=Image.fromarray(np.uint8(height*255),'L');debris=Image.new('L',(N,N));grit=Image.new('L',(N,N))
hd=ImageDraw.Draw(height_img);dd=ImageDraw.Draw(debris);gd=ImageDraw.Draw(grit)
for k in range(1100):
    x,y=rng.uniform(0,N,2);a=rng.uniform(0,math.tau);length=rng.uniform(2.5,10);width=length*rng.uniform(.22,.43)
    if rng.random()>float(clusters[int(y)%N,int(x)%N])+.12:continue
    ux,uy=math.cos(a),math.sin(a);vx,vy=-uy,ux
    shape=[(x-ux*length*.5,y-uy*length*.5),(x+vx*width*.5,y+vy*width*.5),(x+ux*length*.5,y+uy*length*.5),(x-vx*width*.5,y-vy*width*.5)]
    leaf=int(rng.integers(185,250));shade=int(rng.integers(120,180))
    for ox in [-N,0,N]:
      for oy in [-N,0,N]:
        p=[(px+ox,py+oy) for px,py in shape];dd.polygon(p,fill=leaf);hd.polygon(p,fill=shade)
        hd.line([(x-ux*length*.35+ox,y-uy*length*.35+oy),(x+ux*length*.35+ox,y+uy*length*.35+oy)],fill=185,width=1)
for k in range(1700):
    x,y=rng.uniform(0,N,2);a=rng.uniform(0,math.tau);length=rng.uniform(2,8);needle=int(rng.integers(40,110))
    for ox in [-N,0,N]:
      for oy in [-N,0,N]:dd.line([(x+ox,y+oy),(x+math.cos(a)*length+ox,y+math.sin(a)*length+oy)],fill=needle,width=1)
for k in range(1700):
    x,y=rng.uniform(0,N,2);r=rng.uniform(.4,2.4);stone=int(rng.integers(115,240))
    for ox in [-N,0,N]:
      for oy in [-N,0,N]:gd.ellipse((x-r+ox,y-r*.65+oy,x+r+ox,y+r*.65+oy),fill=stone)
# Keep packed alpha >= 128: browser image decoding must never discard RGB under zero alpha.
alpha=Image.fromarray(np.uint8(128+np.rint(np.asarray(grit)/255*127)),'L')
detail=Image.merge('RGBA',[height_img,debris,Image.fromarray(np.uint8(moss*255),'L'),alpha]);detail.save(OUT/'terrain-detail.png',optimize=True)
refs={}
for name,img in [('detail',detail),('regions',Image.fromarray(regions,'RGBA'))]:
 refs[name]=[{'x':x,'y':y,'rgba':list(img.getpixel((x,y)))} for x,y in [(0,0),(100,200),(255,127),(400,300),(511,511),(37,49),(310,207),(450,25)]]
(OUT/'terrain-map-samples.json').write_text(json.dumps(refs,indent=2)+'\n')
print('Generated 2 x 512² packed material maps')
