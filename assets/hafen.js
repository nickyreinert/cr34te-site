(function(){
'use strict';
var H=100,BASE=72,MX=82,MY=88,CW=160,VW=innerWidth||800,VH=innerHeight||500,ASP=VW/VH;
var W=Math.max(160,Math.min(320,Math.round(100*ASP))),HW=W>>1,HY=50,SUN=Math.round(W*.72);
var cv=document.getElementById('scene');
if(!cv||!cv.getContext)return;
var ctx=cv.getContext('2d'),calm=false;
try{calm=matchMedia('(prefers-reduced-motion: reduce)').matches}catch(e){}
var SPEED=calm?.4:1;
cv.width=W;cv.height=H;ctx.imageSmoothingEnabled=false;
var ch0=VH,top0=0;
if(ASP<1.6){ch0=VW/1.6;top0=(VH-ch0)/2}
cv.style.cssText='position:fixed;left:0;top:'+top0+'px;width:'+VW+'px;height:'+ch0+'px;display:block;image-rendering:pixelated;touch-action:none';
function hash(n){n=Math.imul(n^0x5bd1e995,0x85ebca6b);n^=n>>>13;n=Math.imul(n,0xc2b2ae35);n^=n>>>16;return n>>>0}
function mkRnd(s){return function(){s=(Math.imul(s,1664525)+1013904223)>>>0;return s/4294967296}}
function R(c,x,y,w,h,col){c.fillStyle=col;c.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h))}
function mix(a,b,t){return Math.round(a+(b-a)*t)}
function ell(c,cx,cy,rx,ry,col){c.fillStyle=col;var d=(ry+.5)*(ry+.5);for(var y=-ry;y<=ry;y++){var hw=Math.round(rx*Math.sqrt(Math.max(0,1-y*y/d)));c.fillRect(cx-hw,cy+y,hw*2+1,1)}}
var sky=document.createElement('canvas');sky.width=W;sky.height=H;
var s=sky.getContext('2d');
for(var sy=0;sy<H;sy+=2){var st=sy<HY?sy/HY:Math.min(1,(sy-HY)/30);
R(s,0,sy,W,2,sy<HY?'rgb('+mix(64,176,st)+','+mix(146,222,st)+','+mix(224,240,st)+')':'rgb('+mix(40,18,st)+','+mix(150,108,st)+','+mix(186,150,st)+')')}
ell(s,SUN,19,12,12,'rgba(255,248,190,.35)');ell(s,SUN,19,8,8,'#fff6c8');
var cam=MX,camL=MX-HW,vis=[],chunks={},clouds=[],t=0,i0,sd=7131;
function rnd(){sd=(Math.imul(sd,1664525)+1013904223)>>>0;return sd/4294967296}
for(i0=0;i0<6;i0++)clouds.push({x:rnd()*W,y:6+rnd()*34,w:30+Math.floor(rnd()*40),sp:2+rnd()*4});
var PAL=['#c9a36a','#b58a55','#d8bb8c','#8fb0a8'];
function house(g,r,x,w,hh,roof,tone){
var top=BASE-hh,rr,cc,ri;
R(g,x,top,w,hh,PAL[tone]);R(g,x+w-1,top,1,hh,'#8a6a3d');
if(roof<2){var rh=Math.min(11,Math.floor((w+2)/2));
for(rr=0;rr<rh;rr++)R(g,x-1+rr,top-1-rr,w+2-2*rr,1,rr?'#a8472a':'#d4794a')}
else{R(g,x-1,top-2,w+2,2,'#a8472a');R(g,x-1,top-2,w+2,1,'#d4794a')}
var cols=Math.max(1,Math.floor((w-2)/10)),rows=Math.max(1,Math.floor((hh-16)/11)),gap=(w-cols*7)/(cols+1);
for(cc=0;cc<cols;cc++)for(ri=0;ri<rows;ri++){
var fx=Math.round(x+gap*(cc+1)+7*cc),fy=top+4+ri*11;
R(g,fx,fy,7,8,'#4a3320');R(g,fx+1,fy+1,5,6,'#35566e');R(g,fx+3,fy+1,1,6,'#4a3320');
if(r()<.5)R(g,fx+1,fy+1,2,1,'#6a9ab8')}
R(g,x+Math.floor(w/2)-2,BASE-10,5,10,'#4a2e18')}
function houses(g,r,a,b){var x=a,w;
while(b-x>=18){w=22+Math.floor(r()*13);if(b-x-w<18)w=b-x;
house(g,r,x,w,26+Math.floor(r()*15),Math.floor(r()*3),Math.floor(r()*4));
x+=w+(r()<.12?7:Math.floor(r()*3))}}
function ship(g,x){var sx=x+4,i,rr,mx,m;
for(rr=0;rr<13;rr++)R(g,sx+Math.floor(rr*.5),54+rr,100-Math.floor(rr*1.7),1,rr===0?'#8a6a3a':rr===3?'#d9b04a':'#6a4426');
R(g,sx,42,24,12,'#7a5230');R(g,sx+3,45,5,6,'#35566e');R(g,sx+13,45,5,6,'#35566e');
for(m=0;m<2;m++){mx=sx+34+m*30;R(g,mx,10,2,44,'#4a3018');R(g,mx-9,18,20,1,'#4a3018');R(g,mx-8,19,18,4,'#ece4cf');
for(i=0;i<26;i++){R(g,mx+2+i,14+Math.round(i*1.4),1,1,'#3a2a1a');R(g,mx-1-i,14+Math.round(i*1.4),1,1,'#3a2a1a')}}
R(g,x,BASE-5,112,5,'#9a917c');R(g,x,BASE-5,112,1,'#c2b89c');
for(i=0;i<112;i+=8)R(g,x+i,BASE-4,1,4,'#6f6753')}
function build(ci){
var r=mkRnd(hash(ci*7919+13)),cx=ci*CW,cn=document.createElement('canvas');
cn.width=CW;cn.height=H;
var g=cn.getContext('2d');g.translate(-cx,0);
var harbor=ci===0||r()>.6,c={cx:cx,cv:cn,theme:harbor?2:0};
if(harbor){var lx=cx+4+Math.floor(r()*(CW-120));houses(g,r,cx,lx-2);ship(g,lx);houses(g,r,lx+114,cx+CW)}
else houses(g,r,cx,cx+CW);
R(g,cx,BASE,CW,6,'#d6c08a');R(g,cx,BASE+5,CW,1,'#a58f5a');R(g,cx,BASE+6,CW,H-BASE-6,'#c0a470');
for(var n=0;n<170;n++)R(g,cx+r()*CW,BASE+7+r()*(H-BASE-8),1+Math.floor(r()*2),1,r()<.5?'#cdb27c':'#a98f5c');
return c}
function chunk(ci){return chunks[ci]||(chunks[ci]=build(ci))}
function visible(){var a=Math.floor(camL/CW),b=Math.floor((camL+W)/CW),mid=Math.floor(cam/CW),i,k;
vis.length=0;for(i=a;i<=b;i++)vis.push(chunk(i));
for(k in chunks)if(Math.abs(k-mid)>3)delete chunks[k]}
var SPC = { h: '#3b2a20', H: '#6a4c3c', s: '#e2aa8a', S: '#b87f63', e: '#18100c', m: '#8a4a40', t: '#c9b27c', T: '#8f7b4f', c: '#111111',
l: '#9db8e0', L: '#7a97c4', W: '#ecece6', k: '#1d1d22', K: '#34343c', u: '#0e0e10', v: '#c0c0c8', g: '#0f0f12', G: '#2e2e36', o: '#2a2118', O: '#4a3b2a' };
var BODY = ['...hhHhh....', '..hhhhhhh...', '.hHhhhhhs...', '.hhhhhhhs...', '.hhssssHH...', '.hhssssesss.', '.hhsSsssssS.', '...sSSSmms..', '....SSSSS...', 'tt..SSS.....', 'tt..cccWW...',
'TTLggglWW...', 'GGLgLlllL...', 'ggLlLlllL...', 'ggLlLlllL...', 'ggLlLlllL...', 'ggLlLllgL...', 'ggLlLllggg..', 'ggLlLllgGg..', '..LlLllgGg..', '..LllssgGg..', '..uuuuuvug..'];
var LEGS = [
['..kkkkkkk...', '..kkkkkkk...', '...kkkK.....', '...kkkK.....', '...kkkK.....', '...kkkK.....', '...oooooo...', '...oooooo...'],
['..kkkkkkk...', '..kkkkkkk...', '..KK.kkk....', '..KK.kkk....', '..KK.kkk....', '.KK...kk....', 'OOO...ooooo.', 'OOO...ooooo.'],
['..kkkkkkk...', '..kkkkkkk...', '..KKkk......', '..KKkk......', '.KKkkk......', 'OOOkkk......', '...oooooo...', '...oooooo...'],
['..kkkkkkk...', '..kkkkkkk...', '..kk.KKK....', '..kk.KKK....', '..kk.KKK....', '.kk...KK....', 'ooo...OOOOO.', 'ooo...OOOOO.'],
['..kkkkkkk...', '..kkkkkkk...', '...kkk......', '...kkkkk....', '.....kkk....', '...ooo.oooo.', '...ooo.oooo.', '............']
];
function drawMan(c, fx, fy) {
var f = jz > 1 ? 4 : moving ? [1, 2, 3, 2][Math.floor(walkT * 8) % 4] : 0;
var blink = (t % 3.7) > 3.58, rows = BODY.concat(LEGS[f]), x, y, ch;
c.save();
c.translate(fx, fy - 29 - (f === 2 ? 1 : 0));
c.scale(face, 1);
for (y = 0; y < rows.length; y++) {
for (x = 0; x < 12; x++) {
ch = rows[y].charAt(x);
if (ch === '.') continue;
c.fillStyle = SPC[ch === 'e' && blink ? 's' : ch];
c.fillRect(x - 6, y, 1, 1);
}
}
c.restore();
}
function lampX(k){return 105+120*k}
function render(){
var i,y,k,ka,kb,lx,cl,cxs;
ctx.drawImage(sky,0,0);
ctx.fillStyle='rgba(255,255,255,.85)';
for(i=0;i<clouds.length;i++){cl=clouds[i];
cxs=Math.round((((cl.x-cam*.12)%(W+70))+(W+70))%(W+70))-70;
ctx.fillRect(cxs,Math.round(cl.y),cl.w,3);ctx.fillRect(cxs+4,Math.round(cl.y)-2,Math.round(cl.w*.5),2);
ctx.fillRect(cxs+Math.round(cl.w*.25),Math.round(cl.y)+3,Math.round(cl.w*.55),2)}
for(y=HY+2;y<BASE-1;y+=2){var ww=2+Math.round((y-HY)*.6);
ctx.fillStyle='rgba(255,255,225,'+(.4-(y-HY)*.012).toFixed(2)+')';
ctx.fillRect(SUN-(ww>>1)+Math.round(Math.sin(t*2+y)*2),y,ww,1)}
ctx.save();ctx.translate(-camL,0);
for(i=0;i<vis.length;i++)ctx.drawImage(vis[i].cv,vis[i].cx,0);
ka=Math.floor((camL-165)/120);kb=Math.ceil((camL+W-45)/120);
for(k=ka;k<=kb;k++){lx=lampX(k);
R(ctx,lx-1,45,2,28,'#14161f');R(ctx,lx-3,73,6,4,'#1b1e29');R(ctx,lx-5,36,10,2,'#14161f');
R(ctx,lx-4,38,1,6,'#14161f');R(ctx,lx+3,38,1,6,'#14161f');R(ctx,lx-3,44,6,1,'#14161f');
R(ctx,lx-3,38,6,6,'#a9cbd6');R(ctx,lx-1,40,2,2,'#fff')}
ell(ctx,MX,MY+1,7,1,'rgba(60,40,10,.35)');
drawMan(ctx,MX,MY-Math.round(jz));
ctx.restore()}
var idleT=99,apause=1,adir=1,lt=document.getElementById('laterne'),face=1,jz=0,jv=0,jumping=false,lastTap=0,px=MX,py=MY,keys={},target=null,moving=false,walkT=0;
function jump(){if(jumping)return;jumping=true;jv=75;if(lt&&Math.random()<.6)lt.setAttribute('data-j','1');startAudio();hideHint()}
function moveMan(dt){
if(jumping){jz+=jv*dt;jv-=260*dt;if(jz<=0){jz=0;jv=0;jumping=false}}
var dx=0,dy=0;
if(keys.left)dx-=1;if(keys.right)dx+=1;if(keys.up)dy-=1;if(keys.down)dy+=1;
if(dx||dy){target=null;idleT=0}
else if(target){var tx=target.x-px,ty=target.y-py,dd=Math.sqrt(tx*tx+ty*ty);if(dd<1.5)target=null;else{dx=tx/dd;dy=ty/dd}}
else if(idleT>6&&!jumping){apause-=dt;
if(apause<0){if(Math.random()<.3)adir=-adir;target={x:px+adir*(30+Math.random()*120),y:80+Math.random()*17};apause=.6+Math.random()*3;if(Math.random()<.15)jump()}}
idleT+=dt;moving=!!(dx||dy);
if(dx>.1)face=1;else if(dx<-.1)face=-1;
if(moving){var len=Math.sqrt(dx*dx+dy*dy);px+=dx/len*32*dt;py+=dy/len*32*dt*.6;walkT+=dt}
py=Math.max(80,Math.min(97,py));MX=Math.round(px);MY=Math.round(py)}
function update(dt){
t+=dt;moveMan(dt);
cam+=(px-cam)*Math.min(1,dt*5);camL=Math.round(cam)-HW;visible();
for(var i=0;i<clouds.length;i++)clouds[i].x-=clouds[i].sp*dt;
if(lt){var cr=cv.getBoundingClientRect();
lt.setAttribute('data-ort',chunk(Math.floor(MX/CW)).theme);
lt.style.left=Math.max(80,Math.min(VW-80,cr.left+(MX-camL)/W*cr.width))+'px';
lt.style.top=(cr.top+(MY-Math.round(jz)-34)/H*cr.height)+'px'}}
function keyName(k){
if(k==='ArrowLeft'||k==='a'||k==='A')return'left';
if(k==='ArrowRight'||k==='d'||k==='D')return'right';
if(k==='ArrowUp'||k==='w'||k==='W')return'up';
if(k==='ArrowDown'||k==='s'||k==='S')return'down';
return null}
addEventListener('keydown',function(e){
if(!cv.offsetWidth)return;
if(e.code==='Space'||e.key===' '){e.preventDefault();jump();return}
var m=keyName(e.key);
if(m){keys[m]=true;e.preventDefault();startAudio();hideHint();return}
if(e.key==='m'||e.key==='M'){toggleMute();return}
startAudio()});
addEventListener('keyup',function(e){var m=keyName(e.key);if(m)keys[m]=false});
addEventListener('blur',function(){keys={}});
cv.addEventListener('pointerdown',function(e){
var r=cv.getBoundingClientRect();
target={x:camL+(e.clientX-r.left)/r.width*W,y:Math.max(80,Math.min(97,(e.clientY-r.top)/r.height*H))};
idleT=0;var n=Date.now();if(n-lastTap<300)jump();lastTap=n;startAudio();hideHint()});
var hint=document.getElementById('hint');
function hideHint(){if(hint)hint.style.opacity='0'}
setTimeout(hideHint,12000);
if(lt)lt.style.cssText='position:fixed;max-width:17em;margin:0;padding:.3em .6em;background:#fffdf2;border:2px solid #1b1b1b;font:600 14px/1.3 ui-monospace,Menlo,monospace;color:#1b1b1b;pointer-events:none;z-index:3;transform:translate(-50%,-100%)';
var au = null, master = null, noiseBuf = null, muted = false, seqTimer = 0, nextTime = 0, seqStep = 0;
var SD = 60 / 116 / 2;
var ROOT = [48, 53, 48, 55, 45, 53, 55, 48];
var MIN = [0, 0, 0, 0, 1, 0, 0, 0];
var MEL = [
[76, 0, 79, 0, 76, 74, 72, 0], [77, 0, 81, 0, 77, 76, 74, 0],
[79, 0, 76, 72, 0, 76, 79, 0], [74, 0, 79, 0, 77, 76, 74, 0],
[76, 0, 81, 0, 79, 76, 72, 0], [77, 0, 81, 77, 0, 76, 74, 72],
[74, 76, 79, 0, 83, 0, 81, 79], [76, 0, 72, 0, 67, 0, 72, 0]
];
function freq(n) { return 440 * Math.pow(2, (n - 69) / 12); }
function tone(type, n, t0, dur, vol, cut) {
var o = au.createOscillator(), f = au.createBiquadFilter(), g = au.createGain();
o.type = type; o.frequency.value = freq(n);
f.type = 'lowpass'; f.frequency.value = cut;
g.gain.setValueAtTime(0.0001, t0);
g.gain.linearRampToValueAtTime(vol, t0 + 0.012);
g.gain.exponentialRampToValueAtTime(vol * 0.55, t0 + Math.min(0.12, dur * 0.5));
g.gain.setValueAtTime(vol * 0.55, t0 + dur);
g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur + 0.08);
o.connect(f); f.connect(g); g.connect(master);
o.start(t0); o.stop(t0 + dur + 0.1);
}
function noiseHit(t0, dur, vol, hz, type) {
var sN = au.createBufferSource(); sN.buffer = noiseBuf;
var bp = au.createBiquadFilter(); bp.type = type; bp.frequency.value = hz;
var g = au.createGain();
g.gain.setValueAtTime(vol, t0); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
sN.connect(bp); bp.connect(g); g.connect(master);
sN.start(t0, Math.random()); sN.stop(t0 + dur + 0.02);
}
function playStep(st, t0) {
var bar = Math.floor(st / 8), i = st % 8, root = ROOT[bar];
var m = MEL[bar][i];
if (m) {
tone('sine', m, t0, SD * 0.7, 0.07, 4000);
}
if (i % 2) {
tone('square', root + 12, t0, SD * 0.35, 0.02, 1400);
tone('square', root + 19, t0, SD * 0.35, 0.015, 1400);
}
if (i === 0 || i === 3) tone('triangle', root - 12, t0, SD * 1.4, 0.1, 500);
if (i === 4 || i === 7) tone('triangle', root - 5, t0, SD * 1.4, 0.09, 500);
noiseHit(t0, 0.03, i % 2 ? 0.014 : 0.022, 7000, 'highpass');
if (i === 0 || i === 3 || i === 6) noiseHit(t0, 0.04, 0.05, 2400, 'bandpass');
if (i === 2 || i === 5) tone('sine', 55, t0, 0.05, 0.08, 1200);
}
function schedule() {
if (!au) return;
if (nextTime < au.currentTime) nextTime = au.currentTime + 0.05;
while (nextTime < au.currentTime + 0.25) {
playStep(seqStep, nextTime);
nextTime += SD;
seqStep = (seqStep + 1) % 64;
}
}
function startAudio() {
if (au) { if (au.state === 'suspended') { try { au.resume(); } catch (e) {} } return; }
try {
var AC = window.AudioContext || window.webkitAudioContext;
if (!AC) return;
au = new AC();
master = au.createGain(); master.gain.value = muted ? 0 : 0.55; master.connect(au.destination);
noiseBuf = au.createBuffer(1, au.sampleRate * 2, au.sampleRate);
var d = noiseBuf.getChannelData(0);
for (var i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
try { au.resume(); } catch (e) {}
nextTime = au.currentTime + 0.1;
seqTimer = setInterval(schedule, 60);
} catch (e) { au = null; }
}
function toggleMute() {
muted = !muted;
startAudio();
if (master) master.gain.value = muted ? 0 : 0.55;
if (hint) { hint.textContent = muted ? 'Musik aus (M)' : 'Musik an (M)'; hint.style.opacity = '1'; setTimeout(hideHint, 2500); }
}
var last=0;
function frame(now){
if(!last)last=now;
var dt=Math.min(.05,(now-last)/1000)*SPEED;last=now;
if(cv.offsetWidth){update(dt);render()}
requestAnimationFrame(frame)}
update(.016);render();requestAnimationFrame(frame);
})();
