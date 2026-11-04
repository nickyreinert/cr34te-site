// Useless box duel: raymarched WebGL1 scene, state derived from timestamps, procedural Web Audio
(function () {
'use strict';
const cv = document.getElementById('c');
const gl = cv.getContext('webgl', { antialias: false, alpha: false });
if (!gl) { document.body.textContent = 'WebGL not available'; return; }
// Obstacle slots are bounded by fragment uniform space (two vec4 each); the oldest slot is reused when full
const N = Math.max(8, Math.min(48, Math.floor((gl.getParameter(gl.MAX_FRAGMENT_UNIFORM_VECTORS) - 32) / 2)));
const VS = `attribute vec2 aP;
void main(){gl_Position=vec4(aP,0.0,1.0);}`;
const FS = `#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
uniform vec2 uRes;
uniform vec3 uCam;
uniform vec3 uFw;
uniform vec3 uRt;
uniform vec3 uUp;
uniform vec3 uS;
uniform vec3 uE;
uniform vec3 uF;
uniform vec2 uLC;
uniform vec2 uLD;
uniform vec4 uOA[__N__];
uniform vec4 uOB[__N__];
const vec3 LD=vec3(-0.433,0.736,0.520);
const vec3 SB=vec3(0.30,0.70,-0.65);
float h21(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float vn(vec2 p){vec2 i=floor(p);vec2 f=fract(p);f=f*f*(3.0-2.0*f);return mix(mix(h21(i),h21(i+vec2(1.0,0.0)),f.x),mix(h21(i+vec2(0.0,1.0)),h21(i+vec2(1.0,1.0)),f.x),f.y);}
float fbm(vec2 p){float a=0.5;float s=0.0;for(int i=0;i<4;i++){s+=a*vn(p);p=p*2.03+vec2(17.1,3.7);a*=0.5;}return s;}
float sdBox(vec3 p,vec3 b){vec3 q=abs(p)-b;return length(max(q,0.0))+min(max(q.x,max(q.y,q.z)),0.0);}
float sdRB(vec3 p,vec3 b,float r){return sdBox(p,b-r)-r;}
float sdCap(vec3 p,vec3 a,vec3 b,float r){vec3 pa=p-a;vec3 ba=b-a;float h=clamp(dot(pa,ba)/(dot(ba,ba)+0.000001),0.0,1.0);return length(pa-ba*h)-r;}
vec2 map(vec3 p){
  float bx=sdRB(p,vec3(0.8,0.3,0.55),0.03);
  float cd=-sdBox(p-vec3(0.35,0.03,0.0),vec3(0.17,0.28,0.17));
  float d=max(bx,cd);
  float m=cd>bx?6.0:1.0;
  vec3 q=p-vec3(0.35,0.3,-0.17);
  vec3 l=vec3(q.x,q.y*uLC.x-q.z*uLC.y,q.y*uLC.y+q.z*uLC.x);
  float dl=sdRB(l-vec3(0.0,-0.012,0.17),vec3(0.164,0.012,0.164),0.004);
  if(dl<d){d=dl;m=1.0;}
  vec3 pv=vec3(-0.3,0.345,0.0);
  vec3 ld=vec3(uLD.x,uLD.y,0.0);
  float dr=sdCap(p,pv,pv+ld*0.17,0.011);
  if(dr<d){d=dr;m=5.0;}
  float dk=length(p-pv-ld*0.17)-0.034;
  if(dk<d){d=dk;m=4.0;}
  float dp=sdRB(p-vec3(-0.3,0.312,0.0),vec3(0.1,0.012,0.06),0.006);
  dp=min(dp,sdCap(p,vec3(-0.3,0.345,-0.045),vec3(-0.3,0.345,0.045),0.027));
  if(dp<d){d=dp;m=3.0;}
  float da=min(sdCap(p,uS,uE,0.03),sdCap(p,uE,uF,0.024));
  if(da<d){d=da;m=5.0;}
  float dj=min(length(p-uS)-0.05,length(p-uE)-0.042);
  dj=min(dj,length(p-uF)-0.034);
  vec3 fu=normalize(uF-uE+vec3(0.00001,0.0,0.0));
  vec3 fn=vec3(-fu.y,fu.x,0.0);
  dj=min(dj,sdCap(p,uF-fn*0.055,uF+fn*0.055,0.016));
  if(dj<d){d=dj;m=3.0;}
  float dc=sdCap(p,vec3(uS.x,-0.245,0.0),vec3(uS.x,max(uS.y,-0.245),0.0),0.032);
  dc=min(dc,sdCap(p,vec3(uS.x,-0.245,0.0),vec3(uS.x,-0.215,0.0),0.075));
  if(dc<d){d=dc;m=5.0;}
  for(int i=0;i<__N__;i++){
    vec4 a=uOA[i];vec4 b=uOB[i];
    if(b.x>0.5){
      vec3 o=p-a.xyz;
      if(length(o)-a.w*1.45<d){
        float dO;
        if(b.x<1.5){dO=length(o)-a.w;}
        else{
          float cy=cos(b.z);float sy=sin(b.z);
          o=vec3(o.x*cy+o.z*sy,o.y,-o.x*sy+o.z*cy);
          if(b.x<2.5){dO=sdRB(o,vec3(a.w*0.8),a.w*0.12);}
          else{vec2 dd=vec2(length(o.xz)-a.w+0.01,abs(o.y)-a.w*0.7+0.01);dO=min(max(dd.x,dd.y),0.0)+length(max(dd,0.0))-0.01;}
        }
        if(dO<d){d=dO;m=7.0+float(i);}
      }
    }
  }
  return vec2(d,m);
}
vec2 trace(vec3 ro,vec3 rd,float t0,float t1){float t=t0;float m=-1.0;for(int i=0;i<110;i++){vec2 h=map(ro+rd*t);if(h.x<0.0005*t){m=h.y;break;}t+=h.x*0.9;if(t>t1)break;}return vec2(t,m);}
vec3 nor(vec3 p){vec2 e=vec2(1.0,-1.0)*0.0006;return normalize(e.xyy*map(p+e.xyy).x+e.yyx*map(p+e.yyx).x+e.yxy*map(p+e.yxy).x+e.xxx*map(p+e.xxx).x);}
float shadow(vec3 ro,vec3 rd){float res=1.0;float t=0.01;for(int i=0;i<32;i++){float h=map(ro+rd*t).x;res=min(res,10.0*h/t);t+=clamp(h,0.01,0.2);if(res<0.003||t>3.0)break;}res=clamp(res,0.0,1.0);return res*res*(3.0-2.0*res);}
float occ(vec3 p,vec3 n){float o=0.0;float s=1.0;for(int i=0;i<5;i++){float h=0.01+0.12*float(i)/4.0;float d=map(p+n*h).x;o+=(h-d)*s;s*=0.85;}return clamp(1.0-2.0*o,0.0,1.0);}
vec3 wood(vec2 u){
  float w=fbm(vec2(u.x*1.3,u.y*5.0));
  float r=0.5+0.5*sin(u.y*22.0+w*9.0);
  float fine=fbm(vec2(u.x*2.0,u.y*90.0));
  vec3 c=mix(vec3(0.30,0.15,0.06),vec3(0.62,0.38,0.18),smoothstep(0.1,0.9,r*0.65+fine*0.5));
  return c*(0.85+0.3*fine);
}
vec2 wuv(vec3 p,vec3 n){vec3 a=abs(n);if(a.y>0.7)return vec2(p.x,p.z);if(a.z>0.7)return vec2(p.x,p.y);return vec2(p.z,p.y);}
vec3 env(vec3 r){
  vec3 c=mix(vec3(0.10,0.095,0.09),vec3(0.38,0.45,0.6),smoothstep(-0.2,0.9,r.y));
  float s=dot(r,SB);
  c+=vec3(5.0,4.4,3.5)*smoothstep(0.92,0.975,s);
  c+=vec3(1.0,0.8,0.6)*pow(max(s,0.0),6.0)*0.8;
  c+=vec3(1.6,1.6,1.7)*smoothstep(0.6,0.95,r.y);
  c+=vec3(1.2,1.3,1.5)*smoothstep(0.55,0.9,dot(r,vec3(0.78,0.35,0.52)));
  c+=vec3(1.1,0.95,0.8)*smoothstep(0.55,0.9,dot(r,vec3(-0.7,0.3,0.65)));
  return c;
}
vec3 shade(vec3 p,vec3 n,vec3 rd,float m){
  vec3 al=vec3(0.5);float rg=0.5;float mt=0.0;
  if(m<1.5){al=wood(wuv(p,n));rg=0.3;}
  else if(m<2.5){al=vec3(0.07,0.075,0.085)*(0.75+0.5*fbm(p.xz*5.0));rg=0.55;}
  else if(m<3.5){al=vec3(0.95,0.64,0.30);rg=0.3;mt=1.0;}
  else if(m<4.5){al=vec3(0.55,0.02,0.02);rg=0.15;}
  else if(m<5.5){al=vec3(0.78,0.8,0.82);rg=0.28;mt=1.0;}
  else if(m<6.5){al=vec3(0.015,0.014,0.013);rg=0.7;}
  else{float k=m-7.0;al=0.5+0.5*cos(6.2832*(k*0.37+vec3(0.0,0.33,0.67)));al=al*al*0.8;rg=0.35;}
  vec3 f0=mix(vec3(0.04),al,mt);
  vec3 dif=al*(1.0-mt*0.7);
  float sh=shadow(p+n*0.003,LD);
  float ao=occ(p,n);
  float nl=max(dot(n,LD),0.0);
  float spot=1.0/(1.0+0.12*dot(p.xz,p.xz));
  vec3 v=-rd;
  vec3 h=normalize(LD+v);
  float nh=max(dot(n,h),0.0);
  float a2=pow(rg,4.0);
  float dd=nh*nh*(a2-1.0)+1.0;
  float D=min(a2/(3.14159*dd*dd),30.0);
  vec3 F=f0+(1.0-f0)*pow(1.0-max(dot(n,v),0.0),5.0);
  vec3 key=vec3(1.0,0.88,0.72)*3.4*spot;
  vec3 amb=mix(vec3(0.05,0.045,0.04),vec3(0.2,0.24,0.33),0.5+0.5*n.y);
  float nf=max(dot(n,vec3(0.45,0.25,0.85)),0.0);
  vec3 col=dif*(key*nl*sh+amb*ao*1.6+vec3(0.28,0.3,0.36)*nf*ao);
  col+=key*D*F*nl*sh*0.25;
  col+=env(reflect(rd,n))*F*mix(0.45,1.0,ao)*mix(1.0,0.25,rg);
  if(m>5.5&&m<6.5)col+=vec3(0.25,0.12,0.04)*ao*0.5;
  return col;
}
vec2 aabb(vec3 ro,vec3 rd){
  vec3 inv=1.0/rd;
  vec3 t1=(vec3(-2.4,-0.35,-2.0)-ro)*inv;
  vec3 t2=(vec3(2.4,3.4,2.0)-ro)*inv;
  vec3 tn=min(t1,t2);vec3 tf=max(t1,t2);
  return vec2(max(max(tn.x,tn.y),max(tn.z,0.0)),min(tf.x,min(tf.y,tf.z)));
}
vec3 bg(vec2 uv){
  float v=1.0-clamp(length(uv)*0.55,0.0,1.0);
  return mix(vec3(0.02,0.022,0.028),vec3(0.16,0.17,0.2),v*v);
}
void main(){
  vec2 uv=(2.0*gl_FragCoord.xy-uRes)/uRes.y;
  vec3 rd=normalize(uFw*1.6+uRt*uv.x+uUp*uv.y);
  vec3 ro=uCam;
  vec3 col=bg(uv);
  float tT=rd.y<-0.0001?(-0.3-ro.y)/rd.y:1e9;
  vec2 bb=aabb(ro,rd);
  float tb=1e9;float m=-1.0;
  if(bb.y>bb.x){vec2 r=trace(ro,rd,bb.x,min(bb.y,tT));tb=r.x;m=r.y;}
  if(m>0.0&&tb<tT){
    vec3 p=ro+rd*tb;
    col=shade(p,nor(p),rd,m);
  }else if(tT<1e8){
    vec3 c=shade(ro+rd*tT,vec3(0.0,1.0,0.0),rd,2.0);
    col=mix(c,col,clamp(1.0-exp(-0.06*max(tT-4.0,0.0)),0.0,1.0));
  }
  col*=1.0-0.2*dot(uv*0.5,uv*0.5);
  col=(col*(2.51*col+0.03))/(col*(2.43*col+0.59)+0.14);
  col=pow(clamp(col,0.0,1.0),vec3(1.0/2.2));
  col+=(h21(gl_FragCoord.xy)-0.5)/255.0;
  gl_FragColor=vec4(col,1.0);
}`.split('__N__').join(String(N));
function compile(type, src) {
  const s = gl.createShader(type);
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) { document.body.textContent = gl.getShaderInfoLog(s); throw new Error('shader'); }
  return s;
}
const pg = gl.createProgram();
gl.attachShader(pg, compile(gl.VERTEX_SHADER, VS));
gl.attachShader(pg, compile(gl.FRAGMENT_SHADER, FS));
gl.linkProgram(pg);
gl.useProgram(pg);
const buf = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, buf);
gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
const loc = gl.getAttribLocation(pg, 'aP');
gl.enableVertexAttribArray(loc);
gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
const U = {};
['uRes', 'uCam', 'uFw', 'uRt', 'uUp', 'uS', 'uE', 'uF', 'uLC', 'uLD', 'uOA', 'uOB'].forEach(n => { U[n] = gl.getUniformLocation(pg, n); });

// Timeline constants (seconds after the random delay) and lever geometry
const OFF = -0.55, ON = 0.55, PV = [-0.3, 0.345], L = 0.42;
const TM = { open: [0, 0.35], rise: [0.3, 0.95], r1: [0.95, 1.5], r2: [1.5, 1.7], pull: [1.8, 2.4], ret: [2.5, 3.0], low: [3.0, 3.6], close: [3.55, 3.9], end: 4.0 };
const now = () => performance.now() / 1000;
const cl = (x, a, b) => Math.min(Math.max(x, a), b);
const sg = (t, r) => { const x = cl((t - r[0]) / (r[1] - r[0]), 0, 1); return x * x * (3 - 2 * x); };
const mx = (a, b, t) => a + (b - a) * t;
const mv = (a, b, t) => [mx(a[0], b[0], t), mx(a[1], b[1], t)];

// Round state: flipAt starts a round, slam holds a won round, fault marks a false start
let flipAt = null, delay = 0, slam = null, fault = false;
let score = 0, streak = 0, best = 0, dropped = 0;
const winSec = () => Math.max(0.3, 0.9 - 0.06 * streak);
const hintEl = document.getElementById('hint'), hudEl = document.getElementById('hud');
const say = s => { hintEl.textContent = s; };
const hud = () => { hudEl.textContent = 'Score ' + score + ' | Streak ' + streak + ' | Best ' + best + ' | Window ' + Math.round(winSec() * 1000) + ' ms | Obstacles ' + dropped; };

// Time since the lid started opening; after a slam the timeline runs backwards so lid and arm retract
function ttOf(t) {
  if (flipAt === null) return -1;
  if (slam === null) return t - flipAt - delay;
  return Math.max(0, slam.tt - (t - slam.t) * 2.5);
}

// Finger contact point on the lever for lever angle a
function fpt(a) {
  const s = Math.sin(a), c = Math.cos(a);
  return [PV[0] + s * 0.1224 + c * 0.04, PV[1] + c * 0.1224 - s * 0.04];
}

// Whole pose is a pure function of time
function pose(t) {
  const tt = ttOf(t);
  let a = OFF;
  if (flipAt !== null) {
    a = mx(OFF, ON, sg(t - flipAt, [0, 0.12]));
    a = slam === null ? mx(a, OFF, sg(tt, TM.pull)) : mx(a, OFF, sg(t - slam.reset, [0, 0.2]));
  }
  const phi = 1.95 * sg(tt, TM.open) * (1 - sg(tt, TM.close));
  const S = [0.35, -0.6 + 0.94 * sg(tt, TM.rise) - 0.94 * sg(tt, TM.low)];
  const up = [S[0], S[1] + 0.82];
  const tip = [PV[0] + Math.sin(ON) * 0.17 + 0.11, PV[1] + Math.cos(ON) * 0.17 + 0.1];
  let F = mv(up, tip, sg(tt, TM.r1));
  F = mv(F, fpt(ON), sg(tt, TM.r2));
  if (tt >= TM.pull[0]) F = fpt(a);
  F = mv(F, up, sg(tt, TM.ret));
  const dx = F[0] - S[0], dy = F[1] - S[1], len = Math.hypot(dx, dy) || 1e-6;
  const d = cl(len, 0.05, 2 * L - 0.001), ux = dx / len, uy = dy / len, h = Math.sqrt(L * L - d * d / 4);
  return {
    tt, a, phi, S,
    E: [S[0] + ux * d / 2 + uy * h, S[1] + uy * d / 2 - ux * h],
    F: [S[0] + ux * d, S[1] + uy * d]
  };
}

// Camera and projection (used for picking the lever)
const nrm = v => { const l = Math.hypot(v[0], v[1], v[2]); return [v[0] / l, v[1] / l, v[2] / l]; };
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const crs = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
function cam() {
  const W = cv.clientWidth, H = cv.clientHeight, D = Math.max(2.1, 1.7 * H / W);
  const T = [0, 0.25, 0], pos = [T[0] + D * 0.22, T[1] + D * 0.42, T[2] + D * 0.88];
  const fw = nrm([T[0] - pos[0], T[1] - pos[1], T[2] - pos[2]]);
  const rt = nrm(crs(fw, [0, 1, 0]));
  return { W, H, pos, fw, rt, up: crs(rt, fw) };
}
function proj(c, p) {
  const r = [p[0] - c.pos[0], p[1] - c.pos[1], p[2] - c.pos[2]], z = dot(r, c.fw);
  return [(1.6 * dot(r, c.rt) / z * c.H + c.W) / 2, c.H * (1 - 1.6 * dot(r, c.up) / z) / 2, z];
}

// Obstacles: falling bodies that stack, inert with respect to the mechanism
const obs = [];
let nObs = 0, hits = 0;
function spawn() {
  const type = 1 + Math.floor(Math.random() * 3), r = 0.06 + Math.random() * 0.05;
  let x, z, k = 0;
  do { x = (Math.random() * 2 - 1) * 0.7; z = (Math.random() * 2 - 1) * 0.45; k++; } while (k < 20 && Math.abs(x + 0.3) < 0.25 && Math.abs(z) < 0.2);
  obs[nObs % N] = { type, r, h: [0, r, r * 0.8, r * 0.7][type], x, y: 2.6 + Math.random() * 0.4, z, vx: 0, vy: 0, vz: 0, yaw: Math.random() * 6.28 };
  nObs++;
  dropped++;
  hud();
}
function pushOut(o, cx, cz, m, dt, k) {
  const dx = o.x - cx, dz = o.z - cz;
  if (Math.abs(dx) < m && Math.abs(dz) < m) {
    const l = Math.hypot(dx, dz) || 1e-3;
    o.vx += dx / l * k * dt;
    o.vz += dz / l * k * dt;
  }
}
function step(dt, P) {
  const pts = [P.E, P.F, [(P.E[0] + P.F[0]) / 2, (P.E[1] + P.F[1]) / 2], [(P.S[0] + P.E[0]) / 2, (P.S[1] + P.E[1]) / 2]];
  for (const o of obs) {
    o.vy -= 9 * dt; o.x += o.vx * dt; o.y += o.vy * dt; o.z += o.vz * dt;
    const top = Math.abs(o.x) < 0.82 && Math.abs(o.z) < 0.57;
    const prev = o.y - o.vy * dt;
    let g = (top ? 0.3 : -0.3) + o.h, sup = null;
    for (const q of obs) {
      if (q === o || q.y >= o.y) continue;
      if (Math.hypot(o.x - q.x, o.z - q.z) < 0.75 * (o.r + q.r)) {
        const tp = q.y + q.h + o.h;
        if (tp > g && prev >= tp - 0.03) { g = tp; sup = q; }
      }
    }
    if (o.y < g) {
      if (o.vy < -0.6) hit(o, -o.vy, top || sup !== null);
      o.y = g;
      o.vy = o.vy < -0.6 ? -o.vy * 0.3 : 0;
      const f = Math.exp(-5 * dt);
      o.vx *= f; o.vz *= f;
    }
    if (sup !== null && o.y < g + 0.01) {
      const dx = o.x - sup.x, dz = o.z - sup.z;
      const k = (o.type === 1 || sup.type === 1) ? 12 : (Math.hypot(dx, dz) > 0.35 * (o.r + sup.r) ? 6 : 0.4);
      o.vx += dx * k * dt; o.vz += dz * k * dt;
    }
    if (top && o.y < 0.3 + o.h + 0.15) {
      if (P.phi > 0.05) pushOut(o, 0.35, 0, 0.2 + o.r * 0.5, dt, 14);
      pushOut(o, -0.3, 0, 0.14 + o.r * 0.5, dt, 14);
    }
    if (P.tt > 0.3 && P.tt < 3.7) {
      for (const q of pts) {
        const dx = o.x - q[0], dy = o.y - q[1], dz = o.z, dd = Math.hypot(dx, dy, dz);
        if (dd < o.r + 0.05 && dd > 1e-4) { o.vx = dx / dd * 2.5; o.vy = Math.max(o.vy, dy / dd * 2.5 + 1); o.vz = dz / dd * 2.5; }
      }
    }
  }
  for (let i = 0; i < obs.length; i++) for (let j = i + 1; j < obs.length; j++) {
    const a = obs[i], b = obs[j], dx = b.x - a.x, dz = b.z - a.z, l = Math.hypot(dx, dz) || 1e-3, m = (a.r + b.r) * 0.85;
    if (l < m && Math.abs(a.y - b.y) < 0.9 * (a.h + b.h)) {
      const p = (m - l) * 0.5 / l;
      a.x -= dx * p; a.z -= dz * p; b.x += dx * p; b.z += dz * p;
    }
  }
}

// Audio
let ac = null, bus, nb;
const mt = {};
let pp = { S: [0.35, -0.6], F: [0.35, 0.22], phi: 0 };
function ir(sec) {
  const n = ac.sampleRate * sec | 0, b = ac.createBuffer(2, n, ac.sampleRate);
  for (let c = 0; c < 2; c++) { const d = b.getChannelData(c); for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 3); }
  return b;
}
function initAudio() {
  if (ac) { ac.resume(); return; }
  const A = window.AudioContext || window.webkitAudioContext;
  if (!A) return;
  ac = new A();
  const comp = ac.createDynamicsCompressor(), master = ac.createGain();
  master.gain.value = 0.8;
  master.connect(comp); comp.connect(ac.destination);
  bus = ac.createGain(); bus.connect(master);
  const rv = ac.createConvolver(), wg = ac.createGain();
  rv.buffer = ir(1.2); wg.gain.value = 0.25;
  bus.connect(wg); wg.connect(rv); rv.connect(master);
  nb = ac.createBuffer(1, ac.sampleRate * 2, ac.sampleRate);
  const d = nb.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  const lp = ac.createBiquadFilter();
  lp.type = 'lowpass'; lp.frequency.value = 650; lp.Q.value = 2;
  mt.g = ac.createGain(); mt.g.gain.value = 0;
  mt.a = ac.createOscillator(); mt.a.type = 'sawtooth'; mt.a.frequency.value = 70;
  mt.b = ac.createOscillator(); mt.b.type = 'triangle'; mt.b.frequency.value = 105;
  mt.w = ac.createOscillator(); mt.w.frequency.value = 500;
  mt.wg = ac.createGain(); mt.wg.gain.value = 0;
  mt.a.connect(lp); mt.b.connect(lp); lp.connect(mt.g); mt.g.connect(bus);
  mt.w.connect(mt.wg); mt.wg.connect(bus);
  [mt.a, mt.b, mt.w].forEach(o => o.start());
}
function out(pan) {
  const p = ac.createStereoPanner();
  p.pan.value = cl(pan || 0, -1, 1);
  p.connect(bus);
  return p;
}
function noise(t, dur, f, q, g, type, pan, f2) {
  const s = ac.createBufferSource();
  s.buffer = nb; s.loop = true;
  const fl = ac.createBiquadFilter();
  fl.type = type; fl.Q.value = q;
  fl.frequency.setValueAtTime(f, t);
  if (f2) fl.frequency.exponentialRampToValueAtTime(f2, t + dur);
  const ga = ac.createGain();
  ga.gain.setValueAtTime(0.0001, t);
  ga.gain.exponentialRampToValueAtTime(g, t + 0.004);
  ga.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  s.connect(fl); fl.connect(ga); ga.connect(out(pan));
  s.start(t, Math.random() * 1.5); s.stop(t + dur + 0.05);
}
function tone(t, f, f2, dur, g, pan, type) {
  const o = ac.createOscillator();
  o.type = type || 'sine';
  o.frequency.setValueAtTime(f, t);
  o.frequency.exponentialRampToValueAtTime(f2, t + dur);
  const ga = ac.createGain();
  ga.gain.setValueAtTime(g, t);
  ga.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(ga); ga.connect(out(pan));
  o.start(t); o.stop(t + dur + 0.05);
}
function ping(t, f, dur, g, pan) {
  [1, 2.76, 5.4].forEach((r, i) => tone(t, f * r, f * r * 0.99, dur / (1 + i), g / (1 + i * 1.5), pan, 'sine'));
}
// Optional last argument o: delay in seconds from now
function click(g, pan, o) {
  if (!ac) return;
  const t = ac.currentTime + (o || 0);
  noise(t, 0.03, 3500, 1.2, 0.5 * g, 'bandpass', pan);
  noise(t, 0.012, 7000, 0.7, 0.3 * g, 'highpass', pan);
  tone(t, 150, 60, 0.12, 0.5 * g, pan);
  ping(t, 1800 + Math.random() * 300, 0.18, 0.12 * g, pan);
}
function clack() {
  if (!ac) return;
  click(1.3, 0.2);
  tone(ac.currentTime, 95, 45, 0.2, 0.7, 0.2);
}
function thud(g, o) {
  if (!ac) return;
  const t = ac.currentTime + (o || 0);
  tone(t, 110, 45, 0.25, 0.9 * g, 0.3);
  noise(t, 0.15, 300, 0.8, 0.5 * g, 'lowpass', 0.3);
}
function creak(g, dir) {
  if (!ac) return;
  const t = ac.currentTime;
  noise(t, 0.35, dir > 0 ? 350 : 1100, 8, 0.25 * g, 'bandpass', 0.3, dir > 0 ? 1100 : 350);
  tone(t, dir > 0 ? 240 : 330, dir > 0 ? 330 : 240, 0.35, 0.03 * g, 0.3, 'sawtooth');
}
function chime(k) {
  if (!ac) return;
  const t = ac.currentTime, f = 523 * Math.pow(1.0595, Math.min(k, 12) * 2);
  ping(t, f, 0.6, 0.18, 0);
  ping(t + 0.09, f * 1.5, 0.6, 0.14, 0);
}
function buzz() {
  if (!ac) return;
  tone(ac.currentTime, 140, 100, 0.3, 0.2, 0, 'square');
}
function sad() {
  if (!ac) return;
  tone(ac.currentTime, 220, 80, 0.5, 0.25, 0, 'triangle');
}
function hit(o, sp, top) {
  if (!ac || hits++ > 5) return;
  const t = ac.currentTime, g = Math.min(sp / 5, 1) * 0.6, pan = o.x / 1.2, f = (top ? 20 : 14) / o.r;
  tone(t, f, f * 0.5, 0.18, g, pan);
  noise(t, 0.09, top ? 900 : 500, 1, g * 0.7, 'bandpass', pan);
  if (o.type === 2) ping(t, f * 5, 0.1, g * 0.25, pan);
  if (o.type === 3) ping(t, f * 3.1, 0.2, g * 0.2, pan);
}
function motor(P, dt) {
  if (!ac) return;
  const v = (Math.hypot(P.S[0] - pp.S[0], P.S[1] - pp.S[1]) + Math.hypot(P.F[0] - pp.F[0], P.F[1] - pp.F[1]) + Math.abs(P.phi - pp.phi) * 0.2) / dt;
  pp = { S: P.S, F: P.F, phi: P.phi };
  const n = ac.currentTime;
  mt.g.gain.setTargetAtTime(Math.min(v * 0.03, 0.09), n, 0.04);
  mt.a.frequency.setTargetAtTime(70 + v * 30, n, 0.05);
  mt.b.frequency.setTargetAtTime((70 + v * 30) * 1.503, n, 0.05);
  mt.w.frequency.setTargetAtTime(500 + v * 500, n, 0.05);
  mt.wg.gain.setTargetAtTime(Math.min(v * 0.004, 0.012), n, 0.05);
}

// Game: slam the lid shut while it opens; the hand wins if you are too late, the window shrinks with the streak
function endRun(msg, again) {
  const s = score;
  best = Math.max(best, s);
  score = 0; streak = 0;
  say(msg + ' Run score ' + s + (again ? '. Tap the lever' : '.'));
  hud();
}
function lose() {
  if (fault) return;
  endRun('The box wins.', true);
  sad();
}
function attempt() {
  if (slam !== null || fault) return;
  const t = now(), tt = t - flipAt - delay, w = winSec();
  if (tt < 0) { fault = true; endRun('Too early.', false); buzz(); return; }
  if (tt > w) return;
  const pts = Math.round((100 + Math.round((1 - tt / w) * 100)) * (1 + 0.25 * streak));
  const back = tt / 2.5;
  slam = { t, tt, reset: t + back + 0.6 };
  score += pts; streak++; best = Math.max(best, score);
  say('Slammed in ' + Math.round(tt * 1000) + ' ms, +' + pts + '. Tap the lever');
  hud();
  thud(1.1, back);
  chime(streak);
  click(0.8, -0.3, back + 0.65);
}
const X = (a, b, x) => a < x && b >= x;
function events(a, b) {
  if (X(a, b, TM.open[0])) creak(0.35, 1);
  if (X(a, b, TM.open[1])) thud(0.6);
  if (X(a, b, TM.r2[1])) click(0.5, -0.2);
  if (X(a, b, TM.pull[1])) { clack(); lose(); }
  if (X(a, b, TM.close[0])) creak(0.35, -1);
  if (X(a, b, TM.close[1])) thud(0.8);
}

// Input
function flip() {
  flipAt = now();
  delay = 0.7 + Math.random() * 3.3;
  slam = null;
  fault = false;
  say('Wait for the lid, then tap to slam it shut');
  click(1, -0.3);
}
cv.addEventListener('pointerdown', e => {
  initAudio();
  if (flipAt !== null) { attempt(); return; }
  const b = cv.getBoundingClientRect(), x = e.clientX - b.left, y = e.clientY - b.top, c = cam();
  for (const f of [0.35, 0.7, 1]) {
    const q = proj(c, [PV[0] + Math.sin(OFF) * 0.17 * f, PV[1] + Math.cos(OFF) * 0.17 * f, 0]);
    if (Math.hypot(x - q[0], y - q[1]) < 0.13 * 0.8 * c.H / q[2]) { flip(); return; }
  }
});
document.getElementById('drop').addEventListener('click', () => { initAudio(); spawn(); });

// Rendering
let sc = Math.min(window.devicePixelRatio || 1, 1.5) * 0.8;
function resize() {
  cv.width = Math.max(2, Math.round(cv.clientWidth * sc));
  cv.height = Math.max(2, Math.round(cv.clientHeight * sc));
  gl.viewport(0, 0, cv.width, cv.height);
}
window.addEventListener('resize', resize);
resize();
const OA = new Float32Array(N * 4), OB = new Float32Array(N * 4);
function draw(P) {
  const c = cam();
  gl.uniform2f(U.uRes, cv.width, cv.height);
  gl.uniform3fv(U.uCam, c.pos);
  gl.uniform3fv(U.uFw, c.fw);
  gl.uniform3fv(U.uRt, c.rt);
  gl.uniform3fv(U.uUp, c.up);
  gl.uniform3f(U.uS, P.S[0], P.S[1], 0);
  gl.uniform3f(U.uE, P.E[0], P.E[1], 0);
  gl.uniform3f(U.uF, P.F[0], P.F[1], 0);
  gl.uniform2f(U.uLC, Math.cos(P.phi), Math.sin(P.phi));
  gl.uniform2f(U.uLD, Math.sin(P.a), Math.cos(P.a));
  OA.fill(0); OB.fill(0);
  obs.forEach((o, i) => { OA.set([o.x, o.y, o.z, o.r], i * 4); OB.set([o.type, 0, o.yaw, 0], i * 4); });
  gl.uniform4fv(U.uOA, OA);
  gl.uniform4fv(U.uOB, OB);
  gl.drawArrays(gl.TRIANGLES, 0, 3);
}
hud();
let last = now(), prevTT = -1, ema = 0.016, fc = 0;
function frame() {
  const t = now(), raw = t - last, dt = Math.min(raw || 0.016, 0.033);
  last = t;
  hits = 0;
  if (flipAt !== null && (slam === null ? t - flipAt - delay > TM.end : t > slam.reset + 0.3)) { flipAt = null; slam = null; }
  const P = pose(t);
  step(dt, P);
  events(prevTT, P.tt);
  prevTT = P.tt;
  motor(P, dt);
  draw(P);
  ema = ema * 0.95 + raw * 0.05;
  if (++fc % 90 === 0 && ema > 0.03 && sc > 0.3) { sc *= 0.85; resize(); }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
})();
