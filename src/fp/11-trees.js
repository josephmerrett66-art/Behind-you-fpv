// ================= the trees, built solid: the same pines, oaks, cherries and dead trees as the pictures, in the round =================
// Each kind is modelled a few ways over (trunk, limbs, and a crown of soft lumps or drooping tiers of needles), in the
// pictures' own colours with the same dark outline, then stood about the woods many times over in one draw per model.
const TREE_R3D = 1e9, TREE_NV = 3;   // every tree solid, near or far
// Shared by visible foliage and the sun-depth pass. A binary cutout leaves real,
// leaf-shaped sky gaps; local coordinates keep them fixed while a tree sways.
// Joe: "more detailed trees leaves with lights coming through in every tree as opposed to just up close so every tree that
// you can see". Past leafRange.x the finest gaps would shrink under a pixel and close up, so further off the same pattern
// is read at twice its size, then four times, and so on: the gaps stay a few pixels across on every tree in sight, each
// one between more leaves the further off it is, as the gaps you see in a real far-off crown are between whole sprays of
// them. A tree is read at its own distance, so it never changes across one crown; between one size and the next the two
// are blended, the cut raised to keep the share of sky the same (its dip in the middle of the blend measured offline).
// The leaves stir: the pattern wavers a little, a different way across each part of a crown, so the gaps flicker as
// leaves move in the breeze, and the flecks of sun they let through onto the ground flicker with them (13-sun).
const FOLIAGE_CUT_GLSL=`uniform sampler2D foliageT;uniform vec2 leafRange;uniform float leafT,leafUnder;
vec3 leafStir(vec3 g){return g+vec3(.24*sin(leafT*2.3+g.y*.83+g.x*.21)+.1*sin(leafT*5.1+g.x*1.7),.2*sin(leafT*1.9+g.x*.71-g.y*.33)+.08*sin(leafT*4.3+g.y*1.9),0.0);}
vec4 foliageField(vec3 g){return texture2D(foliageT,leafStir(g).xy/18.0);}
bool foliageGap(vec4 f){return max(f.r,f.g)<.25;}
vec4 foliageAt(vec3 g,float d,out float cut){
  float L=max(0.0,log2(d/leafRange.x)),o=floor(L),t=L-o;vec2 q=leafStir(g).xy/(18.0*exp2(o));
  vec4 a=texture2D(foliageT,q+fract(o*vec2(.37,.61))),b=texture2D(foliageT,q*.5+fract((o+1.0)*vec2(.37,.61)));
  cut=.25+.157*pow(4.0*t*(1.0-t),3.3);return mix(a,b,t);
}
`;
LU.leafT = LU.time;
// Gusts: now and then the wind gets up and a gust comes through the woods, the crowns tossing harder as it passes and their
// shadows with them, timed so it reaches you as the leaves come down in it (86-life's gust, from the same clock).
const GUST_GLSL = `float gustAt(vec2 p, vec2 c, float t) { float s = t - dot(p - c, vec2(0.92, 0.39)) / 150.0;   // blowing the way the leaves drift
  float g = sin(s * 0.061) * 0.5 + sin(s * 0.137 + 1.7) * 0.3 + sin(s * 0.29 + 4.1) * 0.2; return smoothstep(0.42, 0.62, g); }
`;
const treeMat = new THREE.ShaderMaterial({
  uniforms: Object.assign({}, LU),
  vertexShader: TERR_GLSL + GUST_GLSL + `attribute vec3 color, gu; attribute float em, mt; uniform float time; uniform vec3 fogC;
      #ifdef USE_INSTANCING
        attribute float baseHeight;
      #endif
      varying float vTreeD, vTn; varying vec3 vC, vW, vN, vG, vL; varying float vE, vM;
    void main() {
      mat4 im = modelMatrix;
      #ifdef USE_INSTANCING
        im = modelMatrix * instanceMatrix;
      #endif
      vec4 w = im * vec4(position, 1.0);
      float k = max(0.0, position.y - 24.0) / 90.0, ph = im[3].x * 0.013 + im[3].z * 0.017;   // the crown sways in the breeze, the trunk stands
      k *= k * (1.0 + 1.4 * gustAt(im[3].xz, fogC.xz, time));
      w.x += (sin(time * 0.9 + ph) * 0.6 + sin(time * 2.3 + ph * 3.0) * 0.25 + sin(time * 4.1 + ph * 5.0) * 0.08) * k * 6.0; w.z += sin(time * 0.7 + ph * 1.7) * k * 3.0;
      #ifdef USE_INSTANCING
        #ifdef CAVES
          if (im[3].x > ${CAVE_X0.toFixed(1)}) w.y += terrH(im[3].xz); else
        #endif
        w.y += baseHeight;
      #else
        w.y += terrH(im[3].xz);
      #endif
      vTreeD = distance(im[3].xz, fogC.xz); vTn = fract(sin(dot(im[3].xz, vec2(12.9898, 78.233))) * 43758.5453); vW = w.xyz; vL = position; vN = normalize(mat3(im) * normal); vC = color; vE = em; vG = gu; vM = mt;
      gl_Position = projectionMatrix * viewMatrix * w;
    }`,
  fragmentShader: LIGHT_GLSL + PAINT_GLSL + FOLIAGE_CUT_GLSL + `varying vec3 vC, vW, vN, vG, vL; varying float vE, vM, vTreeD, vTn;
    uniform vec4 occ;
    float occluding(vec3 p) {   // from above: on the line between the camera and you, a tree thins away
      if (occ.w < 0.5 || p.y < occ.y - 4.0) return 0.0;
      vec3 ab = occ.xyz - camPos; float t = clamp(dot(p - camPos, ab) / dot(ab, ab), 0.0, 1.0);
      return 1.0 - smoothstep(26.0, 46.0, distance(p, camPos + ab * t));
    }
    void main() {
      if (occ.w > 0.5 && occluding(vW) > fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453) * 0.999) discard;
      vec3 N = normalize(vN), c;
      bool leaf = vM > 4.5 && vM < 5.5, needle = vM > 7.5 && vM < 8.5, frond = vM > 8.5;
      if (frond) {
        // a fern's leaflets, cut from its band (14-props): one after another up each side, swept forward along the frond and
        // lobed along their edges, pale at the edges where the light comes through them and darker down the middle. Further
        // off they merge into the band, or they'd shimmer
        float far = smoothstep(90.0, 260.0, distance(vW, camPos)), a = abs(vG.y);
        float x = abs(fract(vG.x + (vG.y > 0.0 ? 0.5 : 0.0) - a * 1.1) - 0.5);
        float hw = mix(0.38 * pow(max(1.0 - a, 0.0), 0.55) * mix(0.55, 1.0, smoothstep(0.0, 0.15, a)) * (0.78 + 0.22 * abs(sin(a * 15.0))), 0.56, far);
        bool stalk = a < 0.06;
        if (!stalk && x > hw) discard;
        float e = stalk ? 1.0 : clamp(1.0 - x / max(hw, 1e-3), 0.0, 1.0);   // 0 at a leaflet's edge, 1 down its middle
        c = stalk ? vC * vec3(0.72, 0.64, 0.44) : vC * mix(1.22, 0.84, e * (1.0 - far)) * (0.92 + 0.16 * smoothstep(0.3, 0.9, a));
        N = normalize(vec3(N.x * 0.4, abs(N.y) * 0.5 + 0.6, N.z * 0.4));   // lit as the open fan it is, not by which way each face is turned
      } else if (leaf || needle) {
        // right beside you, the leaves thin out so a tree never blinds you
        float d = distance(vW, camPos);
        if (d < 34.0) { float dz = fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453); if (dz > smoothstep(16.0, 34.0, d)) discard; }
        float up = smoothstep(-0.5, 0.9, N.y) * 0.55 + smoothstep(10.0, 110.0, vL.y) * 0.25;   // lit from above, darker underneath and inside
        vec3 V=normalize(camPos-vW);float cut,rim=1.0-abs(dot(N,V));
        vec4 f=foliageAt(vG,vTreeD,cut);
        #ifndef TREE_OPAQUE
          // thinner toward a crown's edge, where you look along the leaves and the pattern smears together
          if(max(f.r,f.g)<cut+.07*rim*rim)discard;
        #endif
        // Mipmapped local-space detail: fine pores merge gradually with distance.
        vec4 broad=texture2D(foliageT,(vG.yz-vG.x*.29)/71.0+vec2(.31,.67));
        float cluster=.89+.16*broad.b;
        float back=pow(max(dot(V,-sunDir),0.0),2.0)*sunK;
        if (leaf) {
          float blade=smoothstep(.23,.78,f.r),tip=smoothstep(.58,.86,f.r);
          c=vC*(.64+.43*up)*cluster*mix(.86,1.14,blade);
          c+=vC*vec3(.12,.16,.06)*(tip*up+back*.26);
        } else {
          float spray=smoothstep(.24,.79,f.g);
          c=vC*(.69+.38*up)*cluster*mix(.87,1.12,spray);
          c+=vec3(.035,.065,.035)*spray*up+vC*back*.035;
        }
        // greens of their own (93-colour): one tree a little yellower than the next, another bluer, and each crown warmer on its
        // sunlit top than down in its depths (the blossom keeps its pink)
        float gw = clamp((vC.g - max(vC.r, vC.b)) * 6.0, 0.0, 1.0);
        c *= mix(vec3(1.0), mix(vec3(0.93, 0.99, 1.09), vec3(1.09, 1.04, 0.8), vTn) * mix(vec3(0.94, 0.98, 1.08), vec3(1.06, 1.02, 0.86), smoothstep(0.15, 0.7, up)), gw);
      } else {
        paintH = vL.y;
        if (vM > 6.5 && vM < 7.5) {
          // bark: plates split by furrows that run up the trunk, wandering as they go and cracked across here and there, and
          // the surface tipped the way the furrows go, so the light catches the plates' edges and a trunk reads in the round.
          // Further off the furrows would shrink under a pixel and shimmer, so they fade to their average
          vec2 D = vG.yz / max(length(vG.yz), 1e-3);
          float w1 = vn(vec3(vG.x * 0.05, D * 1.6)), w2 = vn(vec3(vG.x * 0.16, D * 3.2)), fade = 1.0 - smoothstep(200.0, 700.0, distance(vW, camPos));
          float ph = atan(D.y, D.x) * 15.0 + w1 * 6.0 + w2 * 2.2 + vG.x * 0.015;
          float plate = smoothstep(-0.8 + 0.55 * w2, 0.1 + 0.4 * w1, sin(ph)), crack = smoothstep(0.7, 0.8, vn(vec3(vG.x * 0.32, D * 6.0)));
          c = vC * mix(0.8, (0.45 + 0.68 * plate * (1.0 - 0.45 * crack)) * (0.84 + 0.32 * vn(vec3(vG.x * 0.7, D * 12.0))), fade) * mix(0.66, 1.0, smoothstep(0.0, 9.0, paintH));
          N = normalize(N - cross(N, vec3(0.0, 1.0, 0.0)) * cos(ph) * 0.45 * fade);
          // moss up the foot of the trunk, over the roots and along the tops of the limbs, most on the shady side; pale lichen higher up
          float mn = vn(vL * 0.13) * 0.6 + vn(vL * 0.45) * 0.4;
          float low = 1.0 - smoothstep(4.0, 30.0, vL.y + (mn - 0.5) * 18.0), shady = 0.5 + 0.5 * N.z;
          float m = smoothstep(0.5, 0.88, mn * (0.45 + 0.5 * low + 0.25 * shady) + 0.25 * max(N.y, 0.0));
          c = mix(c, vec3(0.22, 0.31, 0.12) * (0.85 + 0.3 * mn), m * 0.6);
          float lic = smoothstep(0.84, 0.9, vn(vL * vec3(0.9, 0.35, 0.9))) * smoothstep(18.0, 36.0, vL.y);
          c = mix(c, vec3(0.46, 0.48, 0.4), lic * 0.3);
        } else {
          c = paint(vC, vM, vG, vW, N);
          if (vM > 1.5 && vM < 2.5) {   // stone: a few dark cracks through it, moss over its top (most where it's shady), pale lichen here and there
            float cr = abs(vn(vG * 0.085 + 3.1) - 0.5) + 0.3 * abs(vn(vG * 0.22 + 1.7) - 0.5);
            c *= mix(0.45, 1.0, smoothstep(0.012, 0.045, cr));
            float mn = vn(vG * 0.11) * 0.65 + vn(vG * 0.42) * 0.35, moss = smoothstep(0.52, 0.8, N.y * 0.72 + mn * 0.6 - 0.08);
            c = mix(c, vec3(0.25, 0.37, 0.13) * (0.8 + 0.45 * mn), moss * 0.85);
            c = mix(c, vec3(0.64, 0.66, 0.54), smoothstep(0.8, 0.86, vn(vG * 0.5 + 7.0)) * (1.0 - moss) * 0.45);
          }
        }
      }
      float sh = sunShade(vW + N * 0.6);
      vec3 o = c * lightAtS(vW, N, 1.0, sh) * 1.05;
      if (leaf || needle || frond) {   // the sun through the leaves: with it behind them they glow, most at a crown's edge where it has the fewest to get through
        float tr = pow(max(dot(normalize(camPos - vW), -sunDir), 0.0), 4.0) * sunK * sh * (0.35 + 0.65 * (1.0 - abs(dot(N, normalize(camPos - vW)))));
        o += vC * amb * tr * (leaf ? vec3(1.1, 1.2, 0.65) : vec3(0.8, 0.95, 0.55));
        // and from underneath, looking up into a crown, the daylight comes through them: a glowing green, not a black mass (93-colour)
        // It shows from a little way up, so the roof of a close stand isn't black, and the light takes the leaf's hue at a
        // brightness of its own, so even a deep green crown glows a green you can see
        float under = smoothstep(0.05, 0.75, -normalize(camPos - vW).y);
        o += max(vC, vC / max(max(vC.r, vC.g), max(vC.b, 0.03)) * 0.4) * amb * sunK * under * (0.55 + 0.45 * sh) * leafUnder * (leaf ? vec3(0.95, 1.15, 0.55) : vec3(0.75, 0.95, 0.55));
      }
      gl_FragColor = vec4(fogged(grey(o), vW), frond ? 0.5 : leaf || needle ? 0.0 : 1.0);   // (alpha: leaves for the ink, 07-ink; 0.5 the soft-edged undergrowth)
    }`,
});
const treeEdge = new THREE.ShaderMaterial({
  uniforms: Object.assign({}, LU), side: THREE.BackSide,
  vertexShader: TERR_GLSL + `attribute float ew; uniform float time; varying vec3 vW;
    void main() {
      mat4 im = modelMatrix;
      #ifdef USE_INSTANCING
        im = modelMatrix * instanceMatrix;
      #endif
      vec4 w = im * vec4(position + normal * ew, 1.0);
      float k = max(0.0, position.y - 24.0) / 90.0, ph = im[3].x * 0.013 + im[3].z * 0.017;
      w.x += (sin(time * 0.9 + ph) * 0.6 + sin(time * 2.3 + ph * 3.0) * 0.25) * k * k * 6.0; w.z += sin(time * 0.7 + ph * 1.7) * k * k * 3.0; w.y += terrH(im[3].xz);
      vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w;
    }`,
  fragmentShader: LIGHT_GLSL + `varying vec3 vW;
    uniform vec4 occ;
    void main() { if (distance(vW, camPos) < 30.0) discard; if (occ.w > 0.5 && vW.y > occ.y - 4.0) { vec3 ab = occ.xyz - camPos; float t = clamp(dot(vW - camPos, ab) / dot(ab, ab), 0.0, 1.0); if (distance(vW, camPos + ab * t) < 40.0) discard; } vec3 L = lightAt(vW, vec3(0.0), 0.0); float b = clamp(dot(L, vec3(0.34)) * 2.2, 0.0, 1.0); gl_FragColor = vec4(fogged(vec3(0.122, 0.114, 0.102) * b, vW), 1.0); }`,
});

// soft lumps for a crown, and a tier of a pine's skirt with a ragged, drooping hem
const P_LUMP = (k = 0, lo = false) => prim('lump' + k + (lo ? 'lo' : ''), () => {
  const g = new THREE.SphereGeometry(0.5, 8, 6), p = g.attributes.position, v = new V3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p,i);const a=Math.atan2(v.z,v.x),r=Math.hypot(v.x,v.z);
    const lobes=1+.12*Math.sin(a*3+k*1.7)*Math.min(1,r*3)+.065*Math.cos(a*5-k+v.y*6);
    const n=.94+.065*Math.sin(v.x*17+v.y*11+k)*Math.sin(v.z*19-k);
    v.x*=lobes*n;v.z*=lobes*n;v.y=v.y*.86*n+.025*Math.sin(a*4+k)*Math.min(1,r*4);
    p.setXYZ(i,v.x,v.y,v.z);
  }
  g.computeVertexNormals();g.setAttribute('leafUV',g.attributes.uv);return g;
});
const P_TREE_LEAF = () => prim('treeLeaf',()=>{const g=new THREE.OctahedronGeometry(.5,0),p=g.attributes.position,n=g.attributes.normal;for(let i=0;i<p.count;i++){n.setXYZ(i,p.getX(i)*2,p.getY(i)*2,p.getZ(i)*2);}return g;});
const P_TIER = (k = 0, lo = false) => prim('tier' + k + (lo ? 'lo' : ''), () => {
  const n = lo ? 8 : 12, g = new THREE.ConeGeometry(0.5, 1, n, 1), p = g.attributes.position, v = new V3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i); if (v.y > 0.49) continue;
    const r = Math.hypot(v.x, v.z); if (r < 1e-4) continue;
    const a=Math.atan2(v.z,v.x),f=r/.5;
    const tuft=.5+.5*Math.cos(a*(lo?4:8)+k*1.7),jag=1+(.24*tuft-.14+.045*Math.sin(a*3+k))*f;
    p.setXYZ(i,v.x*jag,v.y-(.05+.18*tuft)*f*f,v.z*jag);
  }
  g.translate(0, 0.5, 0);g.computeVertexNormals();g.setAttribute('leafUV',g.attributes.uv);return g;
});

// Share identical model vertices, preserving every attribute bit-for-bit. The GPU then runs
// terrain/wind/lighting setup once per shared vertex rather than for every triangle corner.
function indexModel(g) {
  const entries=Object.entries(g.attributes),n=g.attributes.position.count;
  const bits=entries.map(([,a])=>new Uint32Array(a.array.buffer,a.array.byteOffset,a.array.length));
  const heads=new Map(),next=[],original=[],indices=new Uint32Array(n);
  for(let i=0;i<n;i++){
    let hash=2166136261;
    for(let a=0;a<entries.length;a++){const w=entries[a][1].itemSize;for(let k=0;k<w;k++)hash=Math.imul(hash^bits[a][i*w+k],16777619);}
    let found=-1;
    for(let j=heads.get(hash);j!==undefined&&j>=0;j=next[j]){
      const other=original[j];let same=true;
      for(let a=0;a<entries.length&&same;a++){const w=entries[a][1].itemSize;for(let k=0;k<w;k++)if(bits[a][i*w+k]!==bits[a][other*w+k]){same=false;break;}}
      if(same){found=j;break;}
    }
    if(found<0){found=original.length;original.push(i);next.push(heads.get(hash)??-1);heads.set(hash,found);}
    indices[i]=found;
  }
  for(const [name,a] of entries){const out=new a.array.constructor(original.length*a.itemSize);for(let j=0;j<original.length;j++)out.set(a.array.subarray(original[j]*a.itemSize,(original[j]+1)*a.itemSize),j*a.itemSize);g.setAttribute(name,new THREE.BufferAttribute(out,a.itemSize,a.normalized));}
  g.setIndex(new THREE.BufferAttribute(original.length<=65535?new Uint16Array(indices):indices,1));
  return g;
}

// Keep each canopy primitive's own UVs, including duplicated seam/apex vertices.
// Projecting onto a flat plane stretches pinholes into slits around curved crowns.
class TreeKit extends Kit {
  add(geo,x,y,z,sx,sy,sz,col,...rest){
    const first=this.gu.length;super.add(geo,x,y,z,sx,sy,sz,col,...rest);
    const mt=this._mat(col),uv=geo.attributes.leafUV;
    if(!uv||!((mt>4.5&&mt<5.5)||(mt>7.5&&mt<8.5)))return;
    const width=Math.PI*(sx+sz)*.5,height=Math.max(sy,Math.min(sx,sz)*.7),offset=(x*.37+z*.61)%97;
    for(let i=0;i<uv.count;i++){const j=first+i*3;this.gu[j]=uv.getX(i)*width+offset;this.gu[j+1]=uv.getY(i)*height+offset*.3;this.gu[j+2]=0;}
  }
  // A tube along a path of [x, y, z, r] points (a trunk, a limb, a root), bending as the path bends. Each ring is carried on
  // from the one before (parallel transport), so the tube never twists; prof(a, k) shapes ring k round its angle a (the
  // buttresses at a trunk's foot, a slight oval), and the far end closes in a short blunt tip. The bark is painted from where
  // each point sits along the tube and round it, as a rod's is. lastFrame keeps the first ring's two sideways directions, so
  // a root can be sent out along a buttress.
  tube(path, M, prof, cols, ew = 0.5, a0 = 0) {
    const n = path.length, T = [], U = [], W = [], P = [], N = [], S = [0];
    for (let k = 0; k < n; k++) { const a = path[Math.max(0, k - 1)], b = path[Math.min(n - 1, k + 1)]; T.push(new V3(b[0] - a[0], b[1] - a[1], b[2] - a[2]).normalize()); if (k) S.push(S[k - 1] + Math.hypot(path[k][0] - path[k - 1][0], path[k][1] - path[k - 1][1], path[k][2] - path[k - 1][2])); }
    const u = Math.abs(T[0].x) > 0.9 ? new V3(0, 0, 1) : new V3(1, 0, 0);
    for (let k = 0; k < n; k++) { u.addScaledVector(T[k], -u.dot(T[k])).normalize(); U.push(u.clone()); W.push(new V3().crossVectors(u, T[k])); }
    this.lastFrame = [U[0].toArray(), W[0].toArray()];
    const ring = k => { const row = [], c = path[k]; for (let j = 0; j <= M; j++) { const a = a0 + j / M * 6.2832, r = c[3] * (prof ? prof(a, k) : 1), ca = Math.cos(a), sa = Math.sin(a);
      row.push([c[0] + (U[k].x * ca + W[k].x * sa) * r, c[1] + (U[k].y * ca + W[k].y * sa) * r, c[2] + (U[k].z * ca + W[k].z * sa) * r, ca * r, sa * r]); } return row; };
    for (let k = 0; k < n; k++) P.push(ring(k));
    const sub = (A, B) => new V3(A[0] - B[0], A[1] - B[1], A[2] - B[2]);
    for (let k = 0; k < n; k++) { const row = []; for (let j = 0; j <= M; j++) {
      const dA = sub(P[k][j === M ? 1 : j + 1], P[k][j === 0 ? M - 1 : j - 1]), dS = sub(P[Math.min(n - 1, k + 1)][j], P[Math.max(0, k - 1)][j]);
      row.push(new V3().crossVectors(dS, dA).normalize()); } N.push(row); }
    const e = path[n - 1], te = T[n - 1], tip = [e[0] + te.x * e[3] * 0.6, e[1] + te.y * e[3] * 0.6, e[2] + te.z * e[3] * 0.6, 0, 0], m = this._mat(cols[0]), o = (path[0][0] * 0.37 + path[0][2] * 0.61) % 97;
    const put = (p, nr, s, col) => { this.pos.push(p[0], p[1], p[2]); this.nor.push(nr.x, nr.y, nr.z); this.col.push(col[0], col[1], col[2]); this.gu.push(s + o, p[3], p[4]); this.mts.push(m); this.em.push(0); this.ew.push(ew); };
    for (let k = 0; k + 1 < n; k++) for (let j = 0; j < M; j++) {
      const q = [[k, j], [k + 1, j], [k, j + 1], [k, j + 1], [k + 1, j], [k + 1, j + 1]];
      for (const [a, b] of q) put(P[a][b], N[a][b], S[a], cols[a]);
    }
    for (let j = 0; j < M; j++) { put(P[n - 1][j], N[n - 1][j], S[n - 1], cols[n - 1]); put(tip, te, S[n - 1] + e[3] * 0.6, cols[n - 1]); put(P[n - 1][j + 1], N[n - 1][j + 1], S[n - 1], cols[n - 1]); }
  }
}

function treeModel(kind, vi, lo = false, near = false) {   // one tree, in the pictures' own units (a pine is about 112 high), its foot at the origin
  let s = 977 + vi * 131 + kind.length * 17; const R = () => (s = (s * 16807) % 2147483647) / 2147483647, K = new TreeKit();
  // The trunk's own shape (its lean and bow, its buttresses and roots) draws on a sequence of its own, the same near and far,
  // so every form of a tree stands the same way and casts the same shadow; R keeps its old draws, so the crowns are as they were
  let q = 7919 + vi * 271 + kind.length * 31; const Q = () => (q = (q * 48271) % 2147483647) / 2147483647, burn = n => { for (let i = 0; i < n; i++) R(); };
  const tone = (list, j) => hex(list[j % list.length]);
  // lo: the same tree for the far woods, in fewer faces and without the twigs you couldn't see from there (TREE_LOD);
  // near: the trees right round you, rounder, with their buttresses and roots in full
  const det = lo ? 0 : near ? 2 : 1;
  const P_TIER_ = k => P_TIER(k, lo), P_LUMP_ = k => P_LUMP(k, lo), P_CYL_ = n => P_CYL(lo ? Math.max(4, n >> 1) : n), P_CONE_ = n => P_CONE(lo ? Math.max(4, n >> 1) : n);
  // How the trunk stands: leaning a little one way and bowing gently, the crown carried over to wherever its top has got to
  let leanA = Q() * 6.283, lean = 0, bow = 0, H = 50;
  const off = y => { const t = Math.max(0, y) / H, l = lean * Math.pow(Math.min(t, 1.4), 1.5), b = bow * Math.sin(Math.min(t, 1) * Math.PI);
    return [Math.cos(leanA) * l - Math.sin(leanA) * b, Math.sin(leanA) * l + Math.cos(leanA) * b]; };
  const bark = h => paintHex(h, 0.85), mixHex = (a, b, t) => { const A = bark(a), B = bark(b); t = clamp(t, 0, 1); return [A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, A[2] + (B[2] - A[2]) * t]; };
  // the trunk: one tube from under the ground to its top, flaring at its foot into buttresses that run on out as roots
  const trunk = (top, r0, r1, colAt, { flare = 0.75, lobes = 5, lobeK = 0.5 } = {}) => {
    const lobePh = Q() * 6.283, ovalPh = Q() * 6.283, rings = [5, 7, 11][det], path = [], cols = [];
    for (let k = 0; k < rings; k++) { const y = -6 + (top + 6) * Math.pow(k / (rings - 1), 1.6), o = off(y), t = Math.max(0, y) / top;
      path.push([o[0], y, o[1], (r0 + (r1 - r0) * Math.pow(t, 0.9)) * (1 + flare * Math.exp(-Math.max(0, y) / 6.5))]); cols.push(colAt(y)); }
    const lk = lo ? lobeK * 0.5 : lobeK, prof = (a, k) => 1 + lk * Math.exp(-Math.max(0, path[k][1]) / 8) * (1.5 * Math.pow(Math.max(0, Math.cos(lobes * a + lobePh)), 2) - 0.45) + 0.05 * Math.cos(2 * a + ovalPh);
    K.tube(path, [6, lobes * 2, lobes * 3][det], prof, cols, 0.4, -lobePh / lobes);   // (the buttresses on the rings' corners)
    const f = K.lastFrame;
    for (let i = 0; i < lobes; i++) {   // the roots: each buttress carried on out along the ground and down into it
      const a = (i * 6.283 - lobePh) / lobes, dx = f[0][0] * Math.cos(a) + f[1][0] * Math.sin(a), dz = f[0][2] * Math.cos(a) + f[1][2] * Math.sin(a), L = 0.8 + 0.5 * Q(), c = colAt(0);
      if (det) K.tube([[dx * r0 * 0.7, 5, dz * r0 * 0.7, r0 * 0.5], [dx * r0 * (1.7 + L * 0.5), 1.1, dz * r0 * (1.7 + L * 0.5), r0 * 0.3], [dx * r0 * (2.4 + L * 1.4), -2.5, dz * r0 * (2.4 + L * 1.4), r0 * 0.08]], [0, 5, 6][det], null, [c, c, c], 0.3);
    }
  };
  // a limb: a tube from the trunk out to where it ends in the crown, leaving it low and sweeping up, tapering as it goes
  const limb = (sx, sy, sz, ex, ey, ez, r0, r1, col, up = 0.35, M = [4, 5, 7][det], n = [3, 4, 5][det]) => {
    const L = Math.hypot(ex - sx, ey - sy, ez - sz), cx = sx + (ex - sx) * 0.45, cy = sy + (ey - sy) * 0.45 - L * up * 0.3, cz = sz + (ez - sz) * 0.45, path = [], cols = [];
    for (let k = 0; k < n; k++) { const t = k / (n - 1), u = 1 - t;
      path.push([u * u * sx + 2 * u * t * cx + t * t * ex, u * u * sy + 2 * u * t * cy + t * t * ey, u * u * sz + 2 * u * t * cz + t * t * ez, r0 + (r1 - r0) * t]); cols.push(col); }
    K.tube(path, M, null, cols, 0.5);
    return path;
  };
  if (kind === 'pine') {
    // three of them: a spruce in drooping skirts of boughs, blue-green; a fir, broader and greener, the trunk showing at its
    // foot; and a tall pine, a long bare trunk going orange up high and a ragged crown of needle clumps on top. Each skirt is
    // pale at its tips where the new growth is and dark in toward the trunk, so the tiers read one under the next
    if (vi < 2) {
      const sp = vi === 0, y0 = sp ? 29 : 33;   // the lowest boughs clear your head, so you walk in under them
      H = sp ? 110 : 102; lean = 1.5 + Q() * 1.5; bow = (Q() - 0.5) * 2;   // a spruce or a fir grows near straight
      K.mt = 'bark';
      trunk(H - 8, 4.2, 0.8, y => mixHex('#5a402e', '#6a4c37', y / 30), { flare: 0.6, lobes: 5, lobeK: 0.45 });   // the trunk, tapering up through the boughs
      burn(5);
      K.mt = 8;
      const tiers = sp ? 8 : 7, G = sp ? [['#173b2e', '#47836a'], ['#1b4234', '#52907a'], ['#15372a', '#3f7a60']] : [['#1d4026', '#58944f'], ['#22482b', '#66a05a'], ['#1b3c24', '#4c8846']];
      for (let i = 0; i < tiers; i++) {
        const f = i / (tiers - 1), y = y0 + f * (H - y0 - 18), r = (sp ? 66 : 72) * Math.pow(1 - f * 0.84, 1.08) * (0.9 + 0.2 * R()), h = (sp ? 22 : 24) - f * 9, c = G[(i + vi) % 3], o = off(y);
        kitGrad(K, () => K.add(P_TIER_((i + vi) % 4), o[0] + (R() - 0.5) * 3, y, o[1] + (R() - 0.5) * 3, r, h, r, hex(c[1]), R() * 6.28, 0, (R() - 0.5) * 0.1, 0, 0.32), hex(c[1]), hex(c[0]), 1.4);
      }
      const o = off(H - 20); kitGrad(K, () => K.add(P_CONE_(7), o[0], H - 20, o[1], 10, 24, 10, hex(G[1][1]), 0, 0, 0.05, 0, 0.3), hex(G[1][0]), hex(G[1][1]));   // the leader
    } else {
      H = 120; lean = 3 + Q() * 2; bow = (Q() - 0.5) * 5; leanA = Math.atan2(0.6, 1.5) + (Q() - 0.5) * 0.8;   // a tall pine grows a little crooked
      K.mt = 'bark';
      // low down the bark is dark and deep-furrowed; up high it goes thin and orange
      trunk(H, 3.8, 1.3, y => mixHex('#5e4433', '#b4704a', (y - 52) / 22), { flare: 0.55, lobes: 4, lobeK: 0.45 });
      burn(4);
      for (let i = 0; i < 4; i++) { const a = i * 2.3 + 0.7, y = 30 + i * 8, L = 7 + R() * 5, dy = R() * 3, o = off(y); if (!lo) K.rod(P_CYL_(4), o[0], y, o[1], o[0] + Math.cos(a) * L, y - 2 - dy, o[1] + Math.sin(a) * L, 0.7, bark('#4a3a2e')); }   // old snapped-off branches (the same draws of R near and far, so the two forms match)
      const tips = [];
      for (let i = 0; i < 6; i++) {   // boughs out from the top of the trunk, each ending in a clump of needles
        const a = i * 2.4 + vi + R() * 0.5, y = 74 + i * 6 + R() * 4, L = 16 + R() * 10 - i * 1.2, o = off(y), tx = o[0] + Math.cos(a) * L, tz = o[1] + Math.sin(a) * L, ty = y + 6 + R() * 6;
        limb(o[0], y - 1, o[1], tx, ty, tz, 1.5, 0.7, bark('#7a4c32'), 0.5, [4, 4, 6][det]); tips.push([tx, ty, tz, 1 - i / 7]);
      }
      { const o = off(122); tips.push([o[0], 122, o[1], 0.5]); }
      K.mt = 8;
      const G = [['#22462a', '#64a058'], ['#284e2e', '#72aa62'], ['#1f4127', '#58944e']];
      tips.forEach(([x, y, z, w], i) => { const r = 30 + w * 14 + R() * 6, c = G[i % 3]; kitGrad(K, () => K.add(P_TIER_((i + 1) % 4), x, y - 4, z, r, r * 0.42, r * 0.92, hex(c[1]), R() * 6.28, 0, (R() - 0.5) * 0.25, 0, 0.32), hex(c[1]), hex(c[0]), 1.3); });   // flat ragged tufts of needles, pale at their tips
    }
    K.mt = null;
  } else if (kind === 'oak' || kind === 'cherry') {
    const ch = kind === 'cherry', trunkH = ch ? 46 : 50, crownY = ch ? 66 : 64, rT = ch ? 4.4 : 5.2;
    const lx = (R() - 0.5) * 4, lz = (R() - 0.5) * 4;   // (the way the trunk always leant; now it bows a little too)
    H = trunkH; leanA = Math.atan2(lz, lx); lean = Math.hypot(lx, lz) + 1 + Q() * 2; bow = (Q() - 0.5) * 4;
    K.mt = 'bark';
    trunk(crownY + 4, rT, rT * 0.42, y => mixHex(ch ? '#4a3c32' : '#4e3f31', ch ? '#54443a' : '#5c4a3a', y / 14), { flare: 0.8, lobes: 5, lobeK: 0.55 });   // roots spreading into the ground at its foot
    burn(5);
    const limbs = ch ? 5 : 4, tips = [];
    for (let i = 0; i < limbs; i++) {   // limbs out from the top of the trunk into the crown, each forking once on its way (seen only from under it)
      const a = i / limbs * 6.28 + R() * 0.8, L = (ch ? 30 : 22) + R() * 10, y0 = trunkH * (0.6 + 0.3 * R()), o = off(y0);
      const tx = o[0] + Math.cos(a) * L, tz = o[1] + Math.sin(a) * L, ty = crownY - 4 + R() * 10, r0 = ch ? 2.3 : 2.8;
      const P = limb(o[0], y0, o[1], tx, ty, tz, r0, r0 * 0.45, bark('#54443a')); tips.push([tx, ty, tz]);
      const fa = a + (Q() > 0.5 ? 0.75 : -0.75), fL = L * (0.45 + 0.2 * Q()), m = P[Math.floor(P.length / 2)];
      if (det === 2) limb(m[0], m[1], m[2], m[0] + Math.cos(fa) * fL, m[1] + fL * 0.55, m[2] + Math.sin(fa) * fL, m[3] * 0.75, m[3] * 0.3, bark('#54443a'), 0.2, 5, 3);
    }
    K.mt = null;
    // the crown: soft lumps of leaf (or blossom), bigger and darker at the heart, smaller and lighter round the top and edges,
    // over wherever the trunk has carried it
    const G = ch ? ['#cc649c', '#e080b2', '#ee9ec4', '#d670a8'] : ['#2b5220', '#386628', '#477834', '#3d6c2b'];
    K.mt = 'plant';
    const clump=(k,x,y,z,sx,sy,sz,col,yaw=0)=>K.add(P_LUMP_(k),x,y,z,sx,sy,sz,col,yaw,0,0,0,.32);
    const lumps = ch ? 5 + vi % 2 : 8 + vi % 2, oc = off(crownY);
    for (let i = 0; i < lumps; i++) {
      const a = i / lumps * 6.28 + R(), d = (ch ? 22 : 20) + R() * 12, r = (ch ? 32 : 38) + R() * 12, y = crownY + (R() - 0.3) * 18;
      clump(i % 5,oc[0]+Math.cos(a)*d,y,oc[1]+Math.sin(a)*d,r,r*.85,r,tone(G,i),R()*6.28);
    }
    clump(5,oc[0],crownY+16,oc[1],ch?34:40,30,ch?34:40,tone(G,2));
    if (ch) for (const [x, y, z] of tips) clump(6,x,y+4,z,30,24,30,tone(G,3),R()*6.28);
    K.mt = null;
  } else {   // dead: a bare trunk, snapped at the top, its limbs forking into twigs
    H = 50; lean = 3 + Q() * 3; bow = (Q() - 0.5) * 4;
    K.mt = 'bark';
    trunk(50, 4.6, 3.2, y => mixHex('#3f3630', '#4d433b', y / 12), { flare: 0.85, lobes: 4, lobeK: 0.6 });
    const ot = off(50);
    K.add(P_CONE_(7), ot[0] + 0.6, 49, ot[1], 6.6, 8, 6.6, bark('#4d433b'), 0, 0, 0.3, 0, 0.3);   // the snapped top, a jagged splinter of it standing
    if (det) K.add(P_CONE_(5), ot[0] - 1.6, 50, ot[1] + 1, 2.6, 7, 2.6, bark('#5a5048'), 0.8, 0, -0.25, 0, 0.3);
    const fork = (x, y, z, a, el, L, r, depth) => {
      const ex = x + Math.cos(a) * Math.cos(el) * L, ey = y + Math.sin(el) * L, ez = z + Math.sin(a) * Math.cos(el) * L;
      if (depth === 2) limb(x, y, z, ex, ey, ez, r * 1.3, r * 0.7, bark('#4d433b'), 0.15);   // the main limbs, swept out of the trunk
      else if (!lo || depth > 0) K.rod(P_CYL_(5), x, y, z, ex, ey, ez, r, bark('#4d433b'));   // far off, without the finest twigs
      if (depth > 0) for (let j = 0; j < 2; j++) fork(ex, ey, ez, a + (j ? 0.6 : -0.6) + (R() - 0.5) * 0.5, el + 0.15 + R() * 0.3, L * 0.6, r * 0.6, depth - 1);
    };
    for (let i = 0; i < 4; i++) { const y = 26 + i * 7, o = off(y); fork(o[0], y, o[1], i * 1.7 + R(), 0.35 + R() * 0.4, 20 + R() * 8, 1.25, 2); }
    K.mt = null;
  }
  const g=indexModel(K.geometry());
  // Alias the existing material buffer for the shared shadow pass: no extra vertex data.
  g.setAttribute('canopy',g.attributes.mt);
  return g;
}

// one instanced draw (and its outline) per kind and way of building it
// Three bands round you, each its own draw: up close (TREE_NEAR) the trees whose leaves thin away as you brush past and,
// seen from above, fade where they'd hide you; then the same trees without that; then past TREE_LOD the plainer far-off
// form. All of them have the gaps in their leaves (FOLIAGE_CUT_GLSL). A shader that can throw away a pixel stops a phone
// skipping the hidden surfaces behind it, so on Fast the trees past the near ones are drawn solid, as they all were before
// (treeLeafSync); the trees are drawn nearest first, so whatever is hidden behind a near crown is still skipped
const TREE_KINDS = ['pine', 'oak', 'cherry', 'dead'], TREE_CAP = 2800, TREE_LOD = 800, TREE_LOD_END = 1000, TREE_NEAR = 420;
const treeMatSolid = (() => {
  const a = 'if (occ.w > 0.5 && occluding(vW) > fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453) * 0.999) discard;', b = 'if (d < 34.0) { float dz = fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453); if (dz > smoothstep(16.0, 34.0, d)) discard; }';
  if (!treeMat.fragmentShader.includes(a) || !treeMat.fragmentShader.includes(b)) throw new Error('treeMatSolid: the tree shader changed');
  return new THREE.ShaderMaterial({ defines:{},uniforms: treeMat.uniforms, vertexShader: treeMat.vertexShader, fragmentShader: treeMat.fragmentShader.replace(a, '').replace(b, '') });
})();
// Load both forms before the transition, then crossfade them per pixel as the player moves.
function treeLodMaterial(high) {
  const m = treeMatSolid.clone(); m.uniforms = treeMatSolid.uniforms;
  m.fragmentShader = treeMatSolid.fragmentShader.replace('void main() {', `void main() {
    float lf = smoothstep(${TREE_LOD.toFixed(1)}, ${TREE_LOD_END.toFixed(1)}, vTreeD);
    float ln = fract(sin(dot(floor(vW * 2.0), vec3(12.9898, 78.233, 37.719))) * 43758.5453);
    if (${high ? 'ln < lf || lf >= 1.0' : 'ln >= lf'}) discard;`);
  return m;
}
const treeLodHigh = treeLodMaterial(true), treeLodLow = treeLodMaterial(false);
function treeLeafSync() {   // Fast: the gaps in the leaves only on the near trees
  const solid = SET.quality === 'fast';
  for (const m of [treeMatSolid, treeLodHigh, treeLodLow]) if (!!m.defines.TREE_OPAQUE !== solid) { if (solid) m.defines.TREE_OPAQUE = 1; else delete m.defines.TREE_OPAQUE; m.needsUpdate = true; }
}
treeLeafSync();
const TREE_SHADOWS = {};
const TREES = {};
for (const k of TREE_KINDS) TREES[k] = [];
let treesBuilt = false;
function terrainInstanceGeometry(base, capacity) {
  const g = new THREE.BufferGeometry();
  for (const k in base.attributes) g.setAttribute(k, base.attributes[k]);
  if (base.index) g.setIndex(base.index);
  g.setAttribute('baseHeight', new THREE.InstancedBufferAttribute(new Float32Array(capacity), 1).setUsage(THREE.DynamicDrawUsage));
  g.boundingSphere = base.boundingSphere; g.userData = base.userData;
  return g;
}
function treesBuild() {
  treesBuilt = true;
  for (const k of TREE_KINDS) { const nearM = [], high = [], low = [];
    for (let v = 0; v < TREE_NV * 5; v++) {
      const band = Math.floor(v / TREE_NV), vi = v % TREE_NV;
      const g = band === 0 ? (nearM[vi] || (nearM[vi] = treeModel(k, vi, false, true))) : band < 3 ? (high[vi] || (high[vi] = treeModel(k, vi, false))) : (low[vi] || (low[vi] = treeModel(k, vi, true)));
      const mat = [treeMat, treeMatSolid, treeLodHigh, treeLodLow, treeMatSolid][band];
      const m = new THREE.InstancedMesh(terrainInstanceGeometry(g, TREE_CAP), mat, TREE_CAP), e = new THREE.InstancedMesh(g, treeEdge, TREE_CAP);
      m.renderOrder=1+[0,1,2,2,3][band];   // after everything else, and nearest band first, so a crown hides what's behind it before that's drawn
      m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      m.count = e.count = 0; m.frustumCulled = e.frustumCulled = false; e.instanceMatrix = m.instanceMatrix; scene.add(castsShadow(m)); scene.add(e);
      TREES[k].push({ m, e, band, list: [] });
    }
    TREE_SHADOWS[k] = low.map(g => { const m = new THREE.InstancedMesh(g, SUN.mat, TREE_CAP); m.layers.set(1); m.count = 0; m.frustumCulled = false; m.instanceMatrix.setUsage(THREE.DynamicDrawUsage); scene.add(m); return { m, n: 0, casters: [], selected: [] }; });
  }
}
const _tm = new M4(), _tq = new THREE.Quaternion(), _tq2 = new THREE.Quaternion(), _te = new THREE.Euler(), _tp = new V3(), _ts = new V3(), _tax = new V3();
function treeMatrix(o, tilt, ta) {
  const k = TREE_K * o.s, yaw = (o.seed * 7919 % 1) * 6.283;
  _tq.setFromEuler(_te.set(0, yaw, 0));
  if (tilt) { _tq2.setFromAxisAngle(_tax.set(-Math.sin(ta), 0, Math.cos(ta)), tilt); _tq.premultiply(_tq2); }
  return _tm.compose(_tp.set(o.x, 0, o.y), _tq, _ts.set(k, k, k));
}
function treesBegin() { if (!treesBuilt) treesBuild(); for (const k of TREE_KINDS) for (const B of TREES[k]) B.list.length = 0; }
function treeAdd(o, kind, d) {   // near enough to stand solid? then it's ours, not a picture
  if (d > TREE_R3D) return false;
  const near = isoP() ? TREE_LOD : LU.leafRange.value.y * .8, vi = (o.seed * 997 | 0) % TREE_NV;
  const add = band => { const B = TREES[kind][vi + band * TREE_NV]; if (B.list.length < TREE_CAP) B.list.push(o); };
  const margin = VIS.worldStep + 10;
  if (d < TREE_LOD - margin) add(d > near ? 1 : 0);
  else if (d <= TREE_LOD_END + margin) { add(2); add(3); }
  else add(4);
  return true;
}
function treeUpload(B, count) {
  if (!count) return;
  const a = B.m.instanceMatrix; a.needsUpdate = true;
  if (a.clearUpdateRanges) { a.clearUpdateRanges(); if (count) a.addUpdateRange(0, count * 16); }
  else { a.updateRange.offset = 0; a.updateRange.count = count * 16; }
  const h = B.m.geometry.attributes.baseHeight;
  if (h) { h.needsUpdate = true; if (h.clearUpdateRanges) { h.clearUpdateRanges(); h.addUpdateRange(0, count); } else { h.updateRange.offset = 0; h.updateRange.count = count; } }
}
// Keep full model data on the CPU, uploading only instances in view or needed by nearby shadows.
const INSTANCE_VIEW = new THREE.Frustum(), INSTANCE_M = new M4(), INSTANCE_SPHERE = new THREE.Sphere();
let instanceCulling = true;
function instanceView() { cam.updateMatrixWorld(); INSTANCE_M.multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse); INSTANCE_VIEW.setFromProjectionMatrix(INSTANCE_M); }
function instanceSource(B) {
  if (!B.source) { B.source = new Float32Array(B.m.instanceMatrix.array.length); B.heights = new Float32Array(B.m.instanceMatrix.count); B.selected = []; }
}
function instanceCompact(B) {
  instanceSource(B);
  const g = B.m.geometry; if (!g.boundingSphere) g.computeBoundingSphere();
  const c = g.boundingSphere.center, radius = g.boundingSphere.radius, a = B.source, selected = [];
  for (let i = 0; i < B.n; i++) {
    const j = i * 16;
    INSTANCE_SPHERE.center.set(a[j]*c.x+a[j+4]*c.y+a[j+8]*c.z+a[j+12], a[j+1]*c.x+a[j+5]*c.y+a[j+9]*c.z+a[j+13]+B.heights[i], a[j+2]*c.x+a[j+6]*c.y+a[j+10]*c.z+a[j+14]);
    INSTANCE_SPHERE.radius = radius * Math.max(Math.hypot(a[j],a[j+1],a[j+2]),Math.hypot(a[j+4],a[j+5],a[j+6]),Math.hypot(a[j+8],a[j+9],a[j+10])) + 24;
    if (!instanceCulling || S.p.x >= CAVE_X0 || i < (B.keepShadow || 0) || INSTANCE_VIEW.intersectsSphere(INSTANCE_SPHERE)) selected.push(i);
  }
  const changed = B.dirty || selected.length !== B.selected.length || selected.some((v,i)=>v!==B.selected[i]);
  if (changed) {
    const out=B.m.instanceMatrix.array,h=g.attributes.baseHeight;
    for(let j=0;j<selected.length;j++){const i=selected[j];out.set(a.subarray(i*16,i*16+16),j*16);h.setX(j,B.heights[i]);}
    treeUpload(B,selected.length); B.selected=selected; B.dirty=false;
  }
  B.m.count=selected.length;if(B.e)B.e.count=selected.length;
}
function treesEnd() {
  const px=S.p.x,py=S.p.y,SR=shadowReach()**2,unique=new Set();
  for(const k of TREE_KINDS)for(const B of TREE_SHADOWS[k]){B.n=0;B.casters.length=0;}
  for (const k of TREE_KINDS) for (const B of TREES[k]) {
    instanceSource(B);
    const d2=o=>(o.x-px)**2+(o.y-py)**2;
    B.list.sort((a,b)=>d2(a)-d2(b)); B.shN=0;
    for(let i=0;i<B.list.length;i++){
      const o=B.list[i],d=d2(o);treeMatrix(o,0).toArray(B.source,i*16);B.heights[i]=terrH(o.x,o.y);
      if(B.band<2&&d<=400**2)B.shN=i+1;
      if(d>400**2&&d<SR&&!unique.has(o)){
        unique.add(o);const vi=(o.seed*997|0)%TREE_NV,Q=TREE_SHADOWS[k][vi];if(Q.n<TREE_CAP){
          const matrix=treeMatrix(o,0).clone();
          if(!Q.m.geometry.boundingSphere)Q.m.geometry.computeBoundingSphere();
          const sphere=Q.m.geometry.boundingSphere.clone().applyMatrix4(matrix);
          sphere.center.y+=B.heights[i];sphere.radius+=24;
          Q.casters.push({matrix,sphere});Q.n++;
        }
      }
    }
    B.n=B.list.length;B.keepShadow=B.shN;B.dirty=true;instanceCompact(B);
  }
  for(const k of TREE_KINDS)for(const B of TREE_SHADOWS[k]){B.selected=[];B.m.count=0;}
}
// A shadow caster can be behind the player or far beyond the visible ground it shades.
// Cull its entire volume against the light, never its root against the player radius.
function treeShadowFrame() {
  if(!treesBuilt)return;
  for(const k of TREE_KINDS)for(const B of TREE_SHADOWS[k]){
    const selected=[];
    for(let i=0;i<B.casters.length;i++)if(SUN.frustum.intersectsSphere(B.casters[i].sphere))selected.push(i);
    if(selected.length!==B.selected.length||selected.some((v,i)=>v!==B.selected[i])){
      for(let i=0;i<selected.length;i++)B.m.setMatrixAt(i,B.casters[selected[i]].matrix);
      treeUpload(B,selected.length);B.selected=selected;
    }
    B.m.count=selected.length;
  }
}
// Refresh only the close/opaque assignment between world updates. Moving cached
// matrices preserves the shadow prefix and avoids rebuilding trees or terrain fits.
const _treeTransfer=new Float32Array(16);
function treeMoveBand(from,to,i){
  if(to.list.length>=TREE_CAP)return false;
  const o=from.list[i],shadow=i<from.shN,height=from.heights[i],n=from.list.length;
  for(let k=0;k<16;k++)_treeTransfer[k]=from.source[i*16+k];
  from.source.copyWithin(i*16,(i+1)*16,n*16);from.heights.copyWithin(i,i+1,n);from.list.splice(i,1);if(shadow)from.shN--;
  const at=shadow?to.shN:to.list.length,m=to.list.length;
  to.source.copyWithin((at+1)*16,at*16,m*16);to.heights.copyWithin(at+1,at,m);to.source.set(_treeTransfer,at*16);to.heights[at]=height;to.list.splice(at,0,o);if(shadow)to.shN++;
  from.n=from.list.length;to.n=to.list.length;from.keepShadow=from.shN;to.keepShadow=to.shN;from.dirty=to.dirty=true;
  return true;
}
function treeCloseBands(){
  if(isoP())return;
  const enter=(LU.leafRange.value.y*.8)**2,leave=(LU.leafRange.value.y*.82)**2,px=S.p.x,py=S.p.y;
  for(const kind of TREE_KINDS)for(let vi=0;vi<TREE_NV;vi++){
    const near=TREES[kind][vi],far=TREES[kind][vi+TREE_NV];
    for(let i=near.list.length-1;i>=0;i--){const o=near.list[i];if((o.x-px)**2+(o.y-py)**2>leave)treeMoveBand(near,far,i);}
    for(let i=far.list.length-1;i>=0;i--){const o=far.list[i];if((o.x-px)**2+(o.y-py)**2<enter)treeMoveBand(far,near,i);}
  }
}
// each frame: a tree you're chopping shudders with each blow
function treesFrame() {
  instanceView();
  if (!treesBuilt) return;
  treeCloseBands();
  for (const k of TREE_KINDS) for (const B of TREES[k]) {
    let dirty = false;
    B.list.forEach((o, i) => {
      const t = S.t - (o.shakeT ?? -99); if (t > 0.7 && !o.fpShook) return;
      o.fpShook = t <= 0.7;
      const a = Math.atan2(o.y - S.p.y, o.x - S.p.x), tilt = t <= 0.7 ? Math.sin(t * 34) * Math.exp(-t * 6) * 0.05 : 0;
      treeMatrix(o, tilt, a).toArray(B.source, i * 16); dirty = true;
    });
    B.n = B.list.length;
    if (dirty) B.dirty = true;
  }
  // the tree you just felled topples away from you, solid, the same tree it was
  for (const g of S.day.logs) if (g.kind === 'poof') {
    const kind = kindOfTree(g), B = TREES[kind][(g.seed * 997 | 0) % TREE_NV]; if (B.n >= TREE_CAP) continue;
    const u = Math.min(1, g.t / (g.T || POOF_T)), a = g.fa ?? (g.fa = Math.atan2(g.y - S.p.y, g.x - S.p.x));
    B.heights[B.n] = terrH(g.x, g.y); treeMatrix(g, u * u * 1.5, a).toArray(B.source, B.n++ * 16); B.dirty = true;
  }
  for (const k of TREE_KINDS) for (const B of TREES[k]) instanceCompact(B);
}
