var c=document.getElementById('c'),x=c.getContext('2d'),W,H,N=240,P=[],cx,cy,mx,my,pulse=0,t=0;
function rs(){W=c.width=c.clientWidth;H=c.height=c.clientHeight;if(mx==null){mx=W/2;my=H/2;cx=mx;cy=my}}
for(var i=0;i<N;i++){P.push({a:Math.random()*6.283,r:.1+Math.random()*.4,s:(Math.random()-.5)*.02+.01,h:Math.random()*360,z:1+Math.random()*2})}
addEventListener('resize',rs);
rs();
function pos(e){var b=c.getBoundingClientRect();mx=e.clientX-b.left;my=e.clientY-b.top}
c.addEventListener('pointermove',pos);
c.addEventListener('pointerdown',function(e){pos(e);pulse=1});
function f(){
t+=.016;cx+=(mx-cx)*.06;cy+=(my-cy)*.06;pulse*=.95;
x.fillStyle='rgba(5,6,15,.18)';x.fillRect(0,0,W,H);
var m=Math.min(W,H);
for(var i=0;i<N;i++){var p=P[i];
p.a+=p.s*(1+pulse*4);
var r=p.r*m*(1+.2*Math.sin(t*2+p.r*20)+pulse*1.2);
var X=cx+Math.cos(p.a)*r,Y=cy+Math.sin(p.a*1.3)*r*.7;
x.fillStyle='hsl('+((p.h+t*30)%360)+',90%,65%)';
x.beginPath();x.arc(X,Y,p.z*(1+pulse),0,6.283);x.fill()}
requestAnimationFrame(f)}
f();
