(() => {
  'use strict';
  const canvas = document.getElementById('scene');
  const ctx = canvas.getContext('2d');
  const scoreEl = document.getElementById('score');
  const toast = document.getElementById('toast');
  let w=0,h=0,dpr=1,score=0,last=0,spawnAt=0,flashUntil=0;
  const N=7, nodes=[], edges=[], adjacency=new Map();
  const key=(x,y,z)=>`${x},${y},${z}`;
  const dirs={up:[0,-1,0],down:[0,1,0],left:[-1,0,0],right:[1,0,0]};
  const opposite={up:'down',down:'up',left:'right',right:'left'};
  let player={x:0,y:0,z:0,dir:'right',progress:0}, enemy={x:6,y:6,z:6,dir:'left',progress:0};
  let build=0, ready=false, lastMove=0, lastEnemy=0;
  function resize(){dpr=Math.min(devicePixelRatio||1,2);w=canvas.clientWidth;h=canvas.clientHeight;canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);ctx.setTransform(dpr,0,0,dpr,0,0)}
  addEventListener('resize',resize); resize();
  function addEdge(a,b){const id=edges.length;edges.push({a,b,id});adjacency.get(key(...a)).push(id);adjacency.get(key(...b)).push(id)}
  for(let z=0;z<N;z++)for(let y=0;y<N;y++)for(let x=0;x<N;x++){nodes.push([x,y,z]);adjacency.set(key(x,y,z),[])}
  // A connected, looping 3D pipe network. Every junction is a real traversable connection.
  for(let z=0;z<N;z++)for(let y=0;y<N;y++)for(let x=0;x<N;x++){
    if(x<N-1 && (Math.random()<.79 || (y===3&&z===3)))addEdge([x,y,z],[x+1,y,z]);
    if(y<N-1 && (Math.random()<.78 || (x===3&&z===3)))addEdge([x,y,z],[x,y+1,z]);
    if(z<N-1 && (Math.random()<.66 || (x===3&&y===3)))addEdge([x,y,z],[x,y,z+1]);
  }
  // Ensure no isolated nodes by connecting each node to its nearest predecessor when needed.
  for(const p of nodes){if(!adjacency.get(key(...p)).length){const [x,y,z]=p;const q=x>0?[x-1,y,z]:y>0?[x,y-1,z]:[x,y,z-1];addEdge(p,q)}}
  function project(p){const [x,y,z]=p;const unit=Math.min(w/(N*1.75),h/(N*1.55));const xx=x-(N-1)/2, yy=y-(N-1)/2, zz=z-(N-1)/2;return {x:w*.5+(xx-yy)*unit*.72,y:h*.51+(xx+yy)*unit*.36-zz*unit*.78}}
  function lerp(a,b,t){return a.map((v,i)=>v+(b[i]-v)*t)}
  function nodePoint(p){return project(p)}
  function drawPipe(e,alpha=1){const a=nodePoint(e.a),b=nodePoint(e.b);ctx.globalAlpha=alpha;ctx.lineCap='round';ctx.strokeStyle='#07101a';ctx.lineWidth=10;ctx.beginPath();ctx.moveTo(a.x+2,a.y+4);ctx.lineTo(b.x+2,b.y+4);ctx.stroke();ctx.strokeStyle='#163a4b';ctx.lineWidth=7;ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();ctx.strokeStyle='#48cce7';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(a.x,a.y-1);ctx.lineTo(b.x,b.y-1);ctx.stroke();ctx.globalAlpha=1}
  function posOf(actor){const p=[actor.x,actor.y,actor.z];const n=dirs[actor.dir];const q=[p[0]+n[0],p[1]+n[1],p[2]+n[2]];if(q.some(v=>v<0||v>=N)||!adjacency.get(key(...p)).some(id=>{const e=edges[id];return key(...(e.a.every((v,i)=>v===p[i])?e.b:e.a))===key(...q)}))return p;return lerp(p,q,actor.progress)}
  function connected(p,dir){const d=dirs[dir],q=[p[0]+d[0],p[1]+d[1],p[2]+d[2]];if(q.some(v=>v<0||v>=N))return false;return adjacency.get(key(...p)).some(id=>{const e=edges[id],other=e.a.every((v,i)=>v===p[i])?e.b:e.a;return key(...other)===key(...q)})}
  function step(actor,dir){const p=[actor.x,actor.y,actor.z];if(actor.progress>.05)return false;if(!connected(p,dir))return false;actor.dir=dir;return true}
  function move(actor,dt,speed){actor.progress+=dt*speed;if(actor.progress>=1){const d=dirs[actor.dir],p=[actor.x+d[0],actor.y+d[1],actor.z+d[2]];if(p.some(v=>v<0||v>=N)||!connected([actor.x,actor.y,actor.z],actor.dir)){actor.progress=0;return}actor.x=p[0];actor.y=p[1];actor.z=p[2];actor.progress=0}}
  function randomDirection(actor){const p=[actor.x,actor.y,actor.z],opts=Object.keys(dirs).filter(d=>connected(p,d));if(!opts.length)return;const reverse=opposite[actor.dir];const choices=opts.filter(d=>d!==reverse);actor.dir=(choices.length?choices:opts)[Math.floor(Math.random()*(choices.length||opts.length))]}
  function respawnEnemy(){const candidates=nodes.filter(p=>adjacency.get(key(...p)).length && Math.abs(p[0]-player.x)+Math.abs(p[1]-player.y)+Math.abs(p[2]-player.z)>5);const p=candidates[Math.floor(Math.random()*candidates.length)]||[6,6,6];enemy={x:p[0],y:p[1],z:p[2],dir:'left',progress:0};if(!connected([enemy.x,enemy.y,enemy.z],enemy.dir))randomDirection(enemy)}
  function drawCharacter(actor,isPlayer){const p=project(posOf(actor)),r=Math.max(5,Math.min(11,Math.min(w,h)*.018));ctx.save();ctx.translate(p.x,p.y);ctx.shadowBlur=18;ctx.shadowColor=isPlayer?'#ffe66d':'#ff4c78';if(isPlayer){ctx.fillStyle='#ffe66d';const angle={right:0,left:Math.PI,up:-Math.PI/2,down:Math.PI/2}[actor.dir]||0;ctx.rotate(angle);const mouth=.18+Math.abs(Math.sin(performance.now()*.009))*.28;ctx.beginPath();ctx.moveTo(0,0);ctx.arc(0,0,r,mouth,Math.PI*2-mouth);ctx.closePath();ctx.fill();ctx.fillStyle='#17202a';ctx.beginPath();ctx.arc(-r*.12,-r*.52,Math.max(1,r*.13),0,Math.PI*2);ctx.fill()}else{ctx.fillStyle='#ff4c78';ctx.beginPath();ctx.arc(0,-r*.12,r,Math.PI,0);ctx.lineTo(r,r*.8);for(let i=3;i>=0;i--)ctx.lineTo(-r+i*r*.5,r*.45+(i%2)*r*.35);ctx.closePath();ctx.fill();ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(-r*.3,-r*.1,r*.22,0,Math.PI*2);ctx.arc(r*.3,-r*.1,r*.22,0,Math.PI*2);ctx.fill();ctx.fillStyle='#152130';ctx.beginPath();ctx.arc(-r*.25,-r*.08,r*.1,0,Math.PI*2);ctx.arc(r*.35,-r*.08,r*.1,0,Math.PI*2);ctx.fill()}ctx.restore()}
  function collide(){const a=posOf(player),b=posOf(enemy);const dist=Math.hypot(a[0]-b[0],a[1]-b[1],a[2]-b[2]);if(dist<.52){score++;scoreEl.textContent=String(score).padStart(4,'0');flashUntil=performance.now()+850;toast.innerHTML='CAUGHT <span>— +1 POINT</span>';respawnEnemy();setTimeout(()=>{if(performance.now()>flashUntil)toast.innerHTML='MAZE ONLINE <span>— CATCH IT</span>'},900)}}
  function draw(now){ctx.clearRect(0,0,w,h);const glow=ctx.createRadialGradient(w*.5,h*.5,0,w*.5,h*.5,Math.max(w,h)*.7);glow.addColorStop(0,'#132b3b');glow.addColorStop(1,'#070b12');ctx.fillStyle=glow;ctx.fillRect(0,0,w,h);
    // A short construction sweep, then the maze remains permanently in place.
    if(build<edges.length)build=Math.min(edges.length,build+Math.max(1,Math.ceil(edges.length/90)));
    const visible=edges.slice(0,build).sort((a,b)=>{const pa=nodePoint(a.a),pb=nodePoint(b.a);return pa.y+pb.y-(nodePoint(b.b).y+nodePoint(a.b).y)});visible.forEach(e=>drawPipe(e,build===edges.length?1:.75));
    for(const p of nodes){const q=project(p);ctx.fillStyle='#5bdff0';ctx.globalAlpha=.28;ctx.beginPath();ctx.arc(q.x,q.y,2.1,0,Math.PI*2);ctx.fill()}ctx.globalAlpha=1;
    if(build===edges.length){ready=true;const dt=Math.min(.05,(now-last)/1000||0);move(player,dt,1.45);if(enemy.progress<.02 && (Math.random()<.22||!connected([enemy.x,enemy.y,enemy.z],enemy.dir)) )randomDirection(enemy);move(enemy,dt,1.05);drawCharacter(player,true);drawCharacter(enemy,false);collide()}else{drawCharacter(player,true)}
    last=now;requestAnimationFrame(draw)}
  function setDirection(dir){if(ready)step(player,dir)}
  addEventListener('keydown',e=>{const map={ArrowUp:'up',ArrowDown:'down',ArrowLeft:'left',ArrowRight:'right'};if(map[e.key]){e.preventDefault();setDirection(map[e.key])} });
  document.querySelectorAll('[data-dir]').forEach(b=>{b.addEventListener('pointerdown',e=>{e.preventDefault();setDirection(b.dataset.dir)})});
  respawnEnemy();requestAnimationFrame(draw);
})();
