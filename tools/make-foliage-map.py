"""Bake periodic leaf/needle coverage and relief fields for the tree material."""
from pathlib import Path
import math
import numpy as np
from PIL import Image
N=256
rng=np.random.default_rng(413)
y,x=np.mgrid[:N,:N];leaf=np.zeros((N,N));vein=np.zeros((N,N));needle=np.zeros((N,N));shade=np.zeros((N,N))
def delta(a,b):return (a-b+N/2)%N-N/2
def blade(cx,cy,a,length,width,tone):
    global leaf,vein,shade
    dx,dy=delta(x,cx),delta(y,cy);u=(dx*math.cos(a)+dy*math.sin(a))/length;v=(-dx*math.sin(a)+dy*math.cos(a))/width
    # Pointed elliptical blade, with an illuminated half and a restrained central vein.
    body=np.clip((1-u*u-v*v*(1+np.abs(u)*1.5))*5,0,1)
    leaf=np.maximum(leaf,body*(.58+.22*tone+.14*np.clip(v,-1,1)))
    vein=np.maximum(vein,body*np.exp(-np.abs(v)*18)*.65)
    shade=np.maximum(shade,body*(.55+.4*tone))
for _ in range(90):
    cx,cy=rng.uniform(0,N,2);a=rng.uniform(0,math.tau);length=rng.uniform(15,27)
    for j in range(4):
      t=(j-1.5)*length*.43
      for side in [-1,1]:
       ang=a+side*rng.uniform(.5,.95);bx=cx+math.cos(a)*t+math.cos(ang)*5;by=cy+math.sin(a)*t+math.sin(ang)*5
       blade(bx,by,ang,rng.uniform(5,9),rng.uniform(2.4,4.2),rng.random())
    blade(cx+math.cos(a)*length,cy+math.sin(a)*length,a,8,3.3,rng.random())
for _ in range(120):
    cx,cy=rng.uniform(0,N,2);a=rng.uniform(0,math.tau)
    for j in range(8):
     for side in [-1,1]:
      t=(j-3.5)*2.6;ang=a+side*.65
      dx=delta(x,cx+math.cos(a)*t+math.cos(ang)*4);dy=delta(y,cy+math.sin(a)*t+math.sin(ang)*4)
      u=(dx*math.cos(ang)+dy*math.sin(ang))/6;v=(-dx*math.sin(ang)+dy*math.cos(ang))/.65
      needle=np.maximum(needle,np.clip((1-u*u-v*v)*2,0,1)*rng.uniform(.65,1))
# R leaf relief, G needle sprays, B leaf variation. Fully opaque: no alpha overdraw.
data=np.stack([np.clip(.14+leaf*.8+vein*.12,0,1),np.clip(.15+needle*.8,0,1),np.clip(.25+shade*.65,0,1),np.ones((N,N))],axis=-1)
out=Path(__file__).resolve().parent.parent/'assets/foliage-data.png'
Image.fromarray(np.uint8(np.rint(data*255)),'RGBA').save(out,optimize=True)
print(out.name,out.stat().st_size)
