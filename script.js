(() => {
  'use strict';
  const canvas=document.getElementById('scene'),ctx=canvas.getContext('2d');
  const scoreEl=document.getElementById('score'),toast=document.getElementById('toast');
  let w=0,h=0,dpr=1,score=0,last=0,flashUntil=0;
  const N=7,nodes=[],edges=[],adjacency=new Map(),key=(x,y,z)=>`${x},${y},${z}`;
  const dirs={up:[0,-1,0],down:[0,1,0],left:[-1,0,0],right:[1,0,0],rise:[0,0,1],descend:[0,0,-1]};
  const opposite={up:'down',down:'up',left:'right',right:'left',rise:'descend',descend:'rise'};
  const axisColor={up:'#a4ffb2',down:'#a4ffb2',left:'#79e9ff',right:'#79e9ff',rise:'#ff9cde',descend:'#ff9cde'};
  let player={x:0,y:0,z:0,dir:'right',progress:0,moving:false},enemy={x:6,y:6,z:6,dir:'left',progress:0,moving:false};
  let build=0,ready=false,queuedDirection=null;
  function resize(){dpr=Math.min(devicePixelRatio||1,2);w=canvas.clientWidth;h=canvas.clientHeight;canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);ctx.setTransform(dpr,0,0,dpr,0,0)}
  addEventListener('resize',resize);resize();
  canvas.addEventListener('pointerdown',()=>canvas.focus({preventScroll:true}));
  function addEdge(a,b){const id=edges.length;edges.push({a,b,id});adjacency.get(key(...a)).push(id);adjacency.get(key(...b)).push(id)}
  for(let z=0;z<N;z++)for(let y=0;y<N;y++)for(let x=0;x<N;x++){nodes.push([x,y,z]);adjacency.set(key(x,y,z),[])}
  for(let z=0;z<N;z++)for(let y=0;y<N;y++)for(let x=0;x<N;x++){
    if(x<N-1&&(Math.random()<.79||(y===3&&z===3)))addEdge([x,y,z],[x+1,y,z]);
    if(y<N-1&&(Math.random()<.78||(x===3&&z===3)))addEdge([x,y,z],[x,y+1,z]);
    if(z<N-1&&(Math.random()<.66||(x===3&&y===3)))addEdge([x,y,z],[x,y,z+1]);
  }
  for(const p of nodes){if(!adjacency.get(key(...p)).length){const [x,y,z]=p;const q=x>0?[x-1,y,z]:y>0?[x,y-1,z]:[x,y,z-1];addEdge(p,q)}}
  function project(p){const [x,y,z]=p;const unit=Math.min(w/(N*1.75),h/(N*1.55));const xx=x-(N-1)/2,yy=y-(N-1)/2,zz=z-(N-1)/2;return{x:w*.5+(xx-yy)*unit*.72,y:h*.51+(xx+yy)*unit*.36-zz*unit*.78}}
  function lerp(a,b,t){return a.map((v,i)=>v+(b[i]-v)*t)}
  function nodePoint(p){return project(p)}
  function otherEnd(e,p){return e.a.every((v,i)=>v===p[i])?e.b:e.a}
  function connected(p,dir){const d=dirs[dir],q=[p[0]+d[0],p[1]+d[1],p[2]+d[2]];if(q.some(v=>v<0||v>=N))return false;return adjacency.get(key(...p)).some(id=>key(...otherEnd(edges[id],p))===key(...q))}
  function edgeFor(p,dir){if(!connected(p,dir))return null;const d=dirs[dir],q=[p[0]+d[0],p[1]+d[1],p[2]+d[2]];return adjacency.get(key(...p)).map(id=>edges[id]).find(e=>key(...otherEnd(e,p))===key(...q))||null}
  function drawPipe(e,alpha=1,color='#536779',width=7){const a=nodePoint(e.a),b=nodePoint(e.b);ctx.save();ctx.globalAlpha=alpha;ctx.lineCap='round';ctx.strokeStyle='#030811';ctx.lineWidth=width+5;ctx.beginPath();ctx.moveTo(a.x+2,a.y+4);ctx.lineTo(b.x+2,b.y+4);ctx.stroke();ctx.strokeStyle=color;ctx.lineWidth=width;ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();ctx.strokeStyle='#d8f1ff';ctx.globalAlpha=alpha*.36;ctx.lineWidth=1.4;ctx.beginPath();ctx.moveTo(a.x-1,a.y-1);ctx.lineTo(b.x-1,b.y-1);ctx.stroke();ctx.restore()}
  function posOf(actor){const p=[actor.x,actor.y,actor.z];if(!actor.moving||actor.progress<=0)return p;const d=dirs[actor.dir],q=[p[0]+d[0],p[1]+d[1],p[2]+d[2]];return lerp(p,q,actor.progress)}
  function startMove(actor,dir){const p=[actor.x,actor.y,actor.z];if(!connected(p,dir))return false;actor.dir=dir;actor.progress=0;actor.moving=true;return true}
  function moveEnemy(dt,speed){if(!enemy.moving){const p=[enemy.x,enemy.y,enemy.z],opts=Object.keys(dirs).filter(d=>connected(p,d));if(opts.length){const choices=opts.filter(d=>d!==opposite[enemy.dir]);startMove(enemy,(choices.length?choices:opts)[Math.floor(Math.random()*(choices.length||opts.length))])}else return}enemy.progress+=dt*speed;if(enemy.progress>=1){const d=dirs[enemy.dir];enemy.x+=d[0];enemy.y+=d[1];enemy.z+=d[2];enemy.progress=0;enemy.moving=false}}
  function drawCharacter(actor,isPlayer){const p=project(posOf(actor)),r=Math.max(5,Math.min(11,Math.min(w,h)*.018));ctx.save();ctx.translate(p.x,p.y);ctx.shadowBlur=18;ctx.shadowColor=isPlayer?'#ffe66d':'#ff4c78';if(isPlayer){ctx.fillStyle='#ffe66d';const angle={right:0,left:Math.PI,up:-Math.PI/2,down:Math.PI/2,rise:0,descend:Math.PI}[actor.dir]||0;ctx.rotate(angle);const mouth=.18+Math.abs(Math.sin(performance.now()*.009))*.28;ctx.beginPath();ctx.moveTo(0,0);ctx.arc(0,0,r,mouth,Math.PI*2-mouth);ctx.closePath();ctx.fill();ctx.fillStyle='#17202a';ctx.beginPath();ctx.arc(-r*.12,-r*.52,Math.max(1,r*.13),0,Math.PI*2);ctx.fill()}else{ctx.fillStyle='#ff4c78';ctx.beginPath();ctx.arc(0,-r*.12,r,Math.PI,0);ctx.lineTo(r,r*.8);for(let i=3;i>=0;i--)ctx.lineTo(-r+i*r*.5,r*.45+(i%2)*r*.35);ctx.closePath();ctx.fill();ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(-r*.3,-r*.1,r*.22,0,Math.PI*2);ctx.arc(r*.3,-r*.1,r*.22,0,Math.PI*2);ctx.fill();ctx.fillStyle='#152130';ctx.beginPath();ctx.arc(-r*.25,-r*.08,r*.1,0,Math.PI*2);ctx.arc(r*.35,-r*.08,r*.1,0,Math.PI*2);ctx.fill()}ctx.restore()}
  function drawLocalRoutes(){const p=[player.x,player.y,player.z];for(const dir of Object.keys(dirs)){const e=edgeFor(p,dir);if(e){drawPipe(e,1,axisColor[dir],10);const q=project(otherEnd(e,p));ctx.save();ctx.fillStyle=axisColor[dir];ctx.shadowBlur=12;ctx.shadowColor=axisColor[dir];ctx.beginPath();ctx.arc(q.x,q.y,4,0,Math.PI*2);ctx.fill();ctx.restore()}}const here=project(p);ctx.save();ctx.strokeStyle='#ffe66d';ctx.lineWidth=1.5;ctx.setLineDash([3,3]);ctx.beginPath();ctx.arc(here.x,here.y,14,0,Math.PI*2);ctx.stroke();ctx.restore()}
  function collide(){const a=posOf(player),b=posOf(enemy),dist=Math.hypot(a[0]-b[0],a[1]-b[1],a[2]-b[2]);if(dist<.52){score++;scoreEl.textContent=String(score).padStart(4,'0');flashUntil=performance.now()+850;toast.innerHTML='CAUGHT <span>— +1 POINT</span>';const candidates=nodes.filter(p=>adjacency.get(key(...p)).length&&Math.abs(p[0]-player.x)+Math.abs(p[1]-player.y)+Math.abs(p[2]-player.z)>5),p=candidates[Math.floor(Math.random()*candidates.length)]||[6,6,6];enemy={x:p[0],y:p[1],z:p[2],dir:'left',progress:0,moving:false};setTimeout(()=>{if(performance.now()>flashUntil)toast.innerHTML='MAZE ONLINE <span>— CHOOSE A DIRECTION</span>'},900)}}
  function draw(now){ctx.clearRect(0,0,w,h);const glow=ctx.createRadialGradient(w*.5,h*.5,0,w*.5,h*.5,Math.max(w,h)*.7);glow.addColorStop(0,'#132b3b');glow.addColorStop(1,'#070b12');ctx.fillStyle=glow;ctx.fillRect(0,0,w,h);
    if(build<edges.length)build=Math.min(edges.length,build+Math.max(1,Math.ceil(edges.length/90)));
    const visible=edges.slice(0,build).sort((a,b)=>{const pa=nodePoint(a.a),pb=nodePoint(a.b),qa=nodePoint(b.a),qb=nodePoint(b.b);return pa.y+pb.y-(qa.y+qb.y)});visible.forEach(e=>drawPipe(e,build===edges.length?1:.75));
    for(const p of nodes){const q=project(p);ctx.fillStyle='#c0d8e8';ctx.globalAlpha=.42;ctx.beginPath();ctx.arc(q.x,q.y,2.4,0,Math.PI*2);ctx.fill()}ctx.globalAlpha=1;
    if(build===edges.length){ready=true;const dt=Math.min(.05,(now-last)/1000||0);if(player.moving){player.progress+=dt*1.45;if(player.progress>=1){const d=dirs[player.dir];player.x+=d[0];player.y+=d[1];player.z+=d[2];player.progress=0;player.moving=false;if(queuedDirection){const next=queuedDirection;queuedDirection=null;if(!startMove(player,next))toast.innerHTML='NO PIPE THAT WAY <span>— CHOOSE A HIGHLIGHTED ROUTE</span>'}}}drawLocalRoutes();moveEnemy(dt,1.05);drawCharacter(player,true);drawCharacter(enemy,false);collide()}else drawCharacter(player,true);
    last=now;requestAnimationFrame(draw)}
  function setDirection(dir){if(!ready)return;if(player.moving){queuedDirection=dir;return}if(startMove(player,dir)){queuedDirection=null;toast.innerHTML='MOVING <span>— YOU STOP AT EVERY JUNCTION</span>'}else{queuedDirection=null;toast.innerHTML='NO PIPE THAT WAY <span>— FOLLOW THE COLORED ROUTES</span>'}}
  addEventListener('keydown',e=>{const map={ArrowUp:'up',ArrowDown:'down',ArrowLeft:'left',ArrowRight:'right',q:'rise',Q:'rise',a:'descend',A:'descend'};const dir=map[e.key];if(dir){e.preventDefault();canvas.focus({preventScroll:true});setDirection(dir)}});
  document.querySelectorAll('[data-dir]').forEach(b=>b.addEventListener('pointerdown',e=>{e.preventDefault();canvas.focus({preventScroll:true});setDirection(b.dataset.dir)}));
  const p=[0,0,0];const start=nodes.find(n=>n[0]===p[0]&&n[1]===p[1]&&n[2]===p[2]);if(start)player.dir=connected(p,'right')?'right':Object.keys(dirs).find(d=>connected(p,d))||'right';
  requestAnimationFrame(draw);
})(); 
