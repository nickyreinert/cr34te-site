const canvas=document.querySelector('#game'),ctx=canvas.getContext('2d'),nextCanvas=document.querySelector('#next'),nctx=nextCanvas.getContext('2d');
const scoreEl=document.querySelector('#score'),levelEl=document.querySelector('#level'),linesEl=document.querySelector('#lines'),twistsEl=document.querySelector('#twists'),statusEl=document.querySelector('#status'),ruleEl=document.querySelector('#rule'),playButton=document.querySelector('#play');
const W=12,H=20,S=30;
const BUILD='0.5',PREF='cr34te:v=';
const versionEl=document.querySelector('#version'),prevBtn=document.querySelector('#ver-prev'),nextBtn=document.querySelector('#ver-next'),latestBtn=document.querySelector('#ver-latest'),pinBtn=document.querySelector('#ver-pin'),reloadBtn=document.querySelector('#ver-reload');
const NICKY={labels:['N','I','C','K','Y'],shapes:[[[1,0,0,1],[1,1,0,1],[1,0,1,1],[1,0,0,1],[1,0,0,1]],[[1,1,1],[0,1,0],[0,1,0],[0,1,0],[1,1,1]],[[0,1,1],[1,0,0],[1,0,0],[1,0,0],[0,1,1]],[[1,0,0,1],[1,0,1,0],[1,1,0,0],[1,0,1,0],[1,0,0,1]],[[1,0,0,1],[1,0,0,1],[0,1,1,0],[0,1,0,0],[0,1,0,0]]],colors:['#4deeea','#ffe66d','#ff4fb3','#a78bfa','#8aff80']};
const TETRIS={labels:null,shapes:[[[1,1,1,1]],[[1,1],[1,1]],[[0,1,0],[1,1,1]],[[1,0,0],[1,1,1]],[[0,0,1],[1,1,1]],[[0,1,1],[1,1,0]],[[1,1,0],[0,1,1]]],colors:['#4deeea','#ffe66d','#ff4fb3','#a78bfa','#ff875e','#8aff80','#70a1ff']};
/* Version cache. The last entry is the newest build and boots by default, so the frame always
   runs the shipped code; every older entry stays playable to jump back to. To ship a version:
   append an entry with the next number and raise BUILD to match it. */
const ARCHIVE=[
{v:'0.1',name:'WRONG TETRIS',note:'Seven tetrominoes, random spawn, no letters.',title:'WRONG<br>TETRIS',kind:TETRIS,ordered:false},
{v:'0.2',name:'WRONG NICKY',note:'Letter blocks spell N I C K Y in order.',title:'WRONG<br>NICKY',kind:NICKY,ordered:true},
{v:'0.3',name:'WRONG NICKY + CACHE',note:'NICKY blocks plus this version cache.',title:'WRONG<br>NICKY',kind:NICKY,ordered:true},
{v:'0.4',name:'EXPLODED NICKY',note:'NICKY blocks, version cache and the 3D exploded view, which starts by itself on load.',title:'WRONG<br>NICKY',kind:NICKY,ordered:true,explode:true},
{v:'0.5',name:'EXPLODED NICKY (ON CLICK)',note:'Same as 0.4, but the 3D view waits for the 3D VIEW button or the E key.',title:'WRONG<br>NICKY',kind:NICKY,ordered:true}
];
let active=ARCHIVE[ARCHIVE.length-1],shapes=active.kind.shapes,colors=active.kind.colors,labels=active.kind.labels;
const rules=['Gravity is a suggestion.','Every 5 lines, gravity reverses.','The next piece may be mirrored.','The floor is now the ceiling.','Reality is running out of patience.'];
let board,piece,nextPiece,score=0,lines=0,twists=0,level=1,gravity=1,running=false,paused=false,gameOver=false,last=0,acc=0,raf=0,chaos=0,spawnIndex=0;
function matrixCopy(m){return m.map(r=>r.slice())}
function randomPiece(){const id=active.ordered?spawnIndex:Math.floor(Math.random()*shapes.length);spawnIndex=(spawnIndex+1)%shapes.length;let m=matrixCopy(shapes[id]);if(chaos>1&&Math.random()<.35)m=m.map(r=>r.slice().reverse());return{id,m,x:Math.floor((W-m[0].length)/2),y:gravity===1?-m.length: H}}
function reset(){board=Array.from({length:H},()=>Array(W).fill(0));score=lines=twists=0;level=1;gravity=1;chaos=0;gameOver=paused=false;piece=null;spawnIndex=0;nextPiece=randomPiece();spawn();updateStats();draw();drawNext()}
function spawn(){piece=nextPiece;piece.x=Math.floor((W-piece.m[0].length)/2);piece.y=gravity===1?-piece.m.length:H-1;nextPiece=randomPiece();if(collides(piece,0,0)){end();return}drawNext()}
function collides(p,dx,dy,m=p.m){for(let y=0;y<m.length;y++)for(let x=0;x<m[y].length;x++)if(m[y][x]){const bx=p.x+x+dx,by=p.y+y+dy;if(bx<0||bx>=W||by<0||by>=H){if(by<0&&gravity===1)continue;if(by>=H&&gravity===-1)continue;return true}if(board[by][bx])return true}return false}
function rotate(){if(!running||paused)return;const m=piece.m[0].map((_,i)=>piece.m.map(r=>r[i]).reverse());if(!collides(piece,0,0,m)){piece.m=m;twists++;updateStats();draw()}}
function move(dx,dy){if(!running||paused)return;if(!collides(piece,dx,dy)){piece.x+=dx;piece.y+=dy;draw();return true}return false}
function flip(){if(!running||paused)return;gravity*=-1;twists++;piece.m=piece.m.map(r=>r.slice().reverse());piece.y=Math.max(0,Math.min(H-piece.m.length,piece.y));if(collides(piece,0,0)){gravity*=-1;piece.m=piece.m.map(r=>r.slice().reverse());statusEl.textContent='No room to bend reality.';return}statusEl.textContent=gravity===1?'Down is down. For now.':'UP IS THE NEW DOWN';ruleEl.textContent=gravity===1?'Gravity points down.':'Gravity points UP. Deal with it.';draw();updateStats()}
function lock(){for(let y=0;y<piece.m.length;y++)for(let x=0;x<piece.m[y].length;x++)if(piece.m[y][x]){const by=piece.y+y,bx=piece.x+x;if(by>=0&&by<H)board[by][bx]=piece.id+1}clearLines();spawn();draw()}
function clearLines(){let cleared=0;if(gravity===1){for(let y=H-1;y>=0;){if(board[y].every(Boolean)){board.splice(y,1);board.unshift(Array(W).fill(0));cleared++}else y--}}else{for(let y=0;y<H;){if(board[y].every(Boolean)){board.splice(y,1);board.push(Array(W).fill(0));cleared++}else y++}}if(cleared){lines+=cleared;score+=[0,100,300,500,800][Math.min(4,cleared)]*level;level=1+Math.floor(lines/5);if(Math.floor(lines/5)>chaos){chaos=Math.floor(lines/5);if(chaos%2===1)gravity*=-1;ruleEl.textContent=rules[chaos%rules.length];statusEl.textContent=gravity===1?'A line vanished. Gravity survived.':'LINE CLEAR. THE WORLD FLIPPED.';twists++}else statusEl.textContent=`${cleared} line${cleared>1?'s':''} erased. The damage remains.`;updateStats()}}
function updateStats(){scoreEl.textContent=String(score).padStart(4,'0');linesEl.textContent=lines;twistsEl.textContent=twists;levelEl.textContent=String(level).padStart(2,'0')}
function end(){running=false;gameOver=true;cancelAnimationFrame(raf);statusEl.textContent='Reality collapsed. Score: '+score;playButton.textContent='REBUILD REALITY';playButton.classList.remove('hidden');draw()}
function start(){cancelAnimationFrame(raf);reset();running=true;playButton.classList.add('hidden');statusEl.textContent='Gravity is already suspicious.';last=performance.now();raf=requestAnimationFrame(loop)}
function loop(now){if(!running)return;const dt=Math.min(100,now-last);last=now;if(!paused){acc+=dt;const speed=Math.max(80,650-(level-1)*48);if(acc>speed){acc=0;if(!move(0,gravity)){if((gravity===1&&piece.y<0)||(gravity===-1&&piece.y+piece.m.length>H))return end();lock()}}}draw();raf=requestAnimationFrame(loop)}
function block(x,y,color,scale=1){ctx.fillStyle=color;ctx.fillRect(x*S+1,y*S+1,S-2,S-2);ctx.fillStyle='rgba(255,255,255,.22)';ctx.fillRect(x*S+3,y*S+3,S-6,3);ctx.fillStyle='rgba(0,0,0,.22)';ctx.fillRect(x*S+3,y*S+S-5,S-6,2)}
function draw(){ctx.fillStyle='#100d15';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.strokeStyle='#28202f';ctx.lineWidth=1;for(let x=0;x<=W;x++){ctx.beginPath();ctx.moveTo(x*S,0);ctx.lineTo(x*S,canvas.height);ctx.stroke()}for(let y=0;y<=H;y++){ctx.beginPath();ctx.moveTo(0,y*S);ctx.lineTo(canvas.width,y*S);ctx.stroke()}for(let y=0;y<H;y++)for(let x=0;x<W;x++)if(board[y][x])block(x,y,colors[board[y][x]-1]);if(piece)for(let y=0;y<piece.m.length;y++)for(let x=0;x<piece.m[y].length;x++)if(piece.m[y][x]){const bx=piece.x+x,by=piece.y+y;if(by>=0&&by<H)block(bx,by,colors[piece.id])}ctx.fillStyle='#ff4fb3';ctx.fillRect(0,gravity===1?canvas.height-3:0,canvas.width,3);if(paused&&running){ctx.fillStyle='rgba(10,9,13,.8)';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.fillStyle='#d9ff43';ctx.font='bold 28px monospace';ctx.textAlign='center';ctx.fillText('PAUSED',canvas.width/2,canvas.height/2)}}
function drawNext(){nctx.fillStyle='#100d15';nctx.fillRect(0,0,120,120);const m=nextPiece.m,unit=20,ox=(120-m[0].length*unit)/2,oy=(120-m.length*unit)/2;for(let y=0;y<m.length;y++)for(let x=0;x<m[y].length;x++)if(m[y][x]){nctx.fillStyle=colors[nextPiece.id];nctx.fillRect(ox+x*unit+1,oy+y*unit+1,unit-2,unit-2);nctx.fillStyle='rgba(255,255,255,.25)';nctx.fillRect(ox+x*unit+3,oy+y*unit+3,unit-6,3)}if(labels){nctx.font='bold 13px monospace';nctx.fillStyle='#a79bae';nctx.fillText(labels[nextPiece.id],8,16)}}
function action(a){if(a==='left')move(-1,0);if(a==='right')move(1,0);if(a==='down'){if(move(0,gravity))score++,updateStats();else lock()}if(a==='rotate')rotate();if(a==='flip')flip();if(a==='drop'&&running&&!paused){let n=0;while(move(0,gravity))n++;score+=n*2;updateStats();lock()}}
document.addEventListener('keydown',e=>{const keys=['ArrowLeft','ArrowRight','ArrowDown','ArrowUp',' ','x','X','z','Z','p','P'];if(keys.includes(e.key))e.preventDefault();if(e.key===' '){if(!running)start();else action('drop')}else if(e.key==='ArrowLeft')action('left');else if(e.key==='ArrowRight')action('right');else if(e.key==='ArrowDown')action('down');else if(e.key==='ArrowUp'||e.key==='x'||e.key==='X')action('rotate');else if(e.key==='z'||e.key==='Z')action('flip');else if((e.key==='p'||e.key==='P')&&running){paused=!paused;statusEl.textContent=paused?'Paused. Press P to resume.':'Back to the nonsense.';last=performance.now();draw()}else if(e.key==='[')stepVersion(-1);else if(e.key===']')stepVersion(1);else if(e.key==='e'||e.key==='E')toggleFx()});
document.querySelectorAll('[data-action]').forEach(b=>b.addEventListener('click',()=>action(b.dataset.action)));playButton.addEventListener('click',start);reset();
/* --- 3D exploded view + debris physics ------------------------------------
   External libraries (three.js, cannon-es, rapier ...) cannot be used here:
   this frame forbids network requests and external resources, and a bundled
   engine would break the file budget. So the projection is pure CSS 3D and
   the solver below lives in this file: kinematic explode, hover showcase,
   staggered release, gravity, wall/floor bounces, pairwise collisions,
   sleeping, and pointer dragging so the debris can be shoved around.    */
const PARTS=['.wordmark','.eyebrow','.game-meta .score','.game-meta .label','.title-wrap h1','.title-wrap .status','.side-panel > .label','#rule','.mini-stat','.controls','.hint','.version-bar','#play','#next'];
const TILE_COLS=5,TILE_ROWS=8,PH_EXPLODE=2.8,PH_FALL=4.6,GRAV=1500;
const cardEl=document.querySelector('.game-card'),boardEl=document.querySelector('#game'),fxBtn=document.querySelector('#explode');
let stage=null,shards=[],hiddenNodes=[],fxRaf=0,fxLast=0,fxTime=0,dragged=null,explodeTimer=0;
function easeOut3(t){return 1-Math.pow(1-t,3)}
function halfH(s){return s.h*(s.lying>.5?.34:.5)}
function buildShard(node,w,h,cx,cy,kind){node.classList.add('shard');node.classList.add(kind);node.style.width=w+'px';node.style.height=h+'px';stage.appendChild(node);const s={el:node,x:cx,y:cy,ox:cx,oy:cy,tx:cx,ty:cy,tz:0,z:0,z0:0,w:w,h:h,vx:0,vy:0,vz:0,rx:0,ry:0,rz:0,wx:0,wy:0,wz:0,trx:0,tryy:0,trz:0,mass:Math.max(.5,w*h/9000),seed:Math.random()*Math.PI*2,free:false,asleep:false,rest:0,lying:0,drag:null,releaseAt:0,tile:kind==='tile'};shards.push(s);return s}
function hideNode(el){el.style.visibility='hidden';hiddenNodes.push(el)}
function explode(){
  if(stage)return;
  cancelAnimationFrame(raf);raf=0;running=false;paused=false;playButton.textContent='BREAK REALITY';playButton.classList.remove('hidden');
  stage=document.createElement('div');stage.className='stage3d';
  const grid=document.createElement('div');grid.className='stage-grid';stage.appendChild(grid);
  document.body.appendChild(stage);
  try{buildPieces()}catch(err){assemble();return}
  fxTime=0;fxLast=performance.now();
  stage.addEventListener('pointerdown',onPointerDown,{passive:false});
  window.addEventListener('pointermove',onPointerMove,{passive:false});
  window.addEventListener('pointerup',onPointerUp);
  window.addEventListener('pointercancel',onPointerUp);
  drawShards();updateFxButton();
  cancelAnimationFrame(fxRaf);fxRaf=requestAnimationFrame(fxTick);
}
function buildPieces(){
  shards=[];hiddenNodes=[];
  const cw=innerWidth,chh=innerHeight,ccx=cw/2,ccy=chh*.44,cr=cardEl.getBoundingClientRect();
  hideNode(cardEl);
  const frame=document.createElement('div');buildShard(frame,cr.width,cr.height,cr.left+cr.width/2,cr.top+cr.height/2,'plate');
  const br=boardEl.getBoundingClientRect(),tw=br.width/TILE_COLS,th=br.height/TILE_ROWS;
  const back=document.createElement('div');buildShard(back,br.width,br.height,br.left+br.width/2,br.top+br.height/2,'plate');
  for(let row=0;row<TILE_ROWS;row++)for(let col=0;col<TILE_COLS;col++){
    const t=document.createElement('canvas');t.width=128;t.height=128;
    t.getContext('2d').drawImage(boardEl,col*boardEl.width/TILE_COLS,row*boardEl.height/TILE_ROWS,boardEl.width/TILE_COLS,boardEl.height/TILE_ROWS,0,0,t.width,t.height);
    buildShard(t,tw,th,br.left+(col+.5)*tw,br.top+(row+.5)*th,'tile');
  }
  hideNode(boardEl);
  PARTS.forEach(sel=>document.querySelectorAll(sel).forEach(el=>{
    const r=el.getBoundingClientRect();if(r.width<8||r.height<8)return;
    let node;
    if(el.tagName==='CANVAS'){node=document.createElement('canvas');node.width=256;node.height=256;node.getContext('2d').drawImage(el,0,0,node.width,node.height)}
    else{node=el.cloneNode(true);node.removeAttribute('id');node.querySelectorAll('[id]').forEach(n=>n.removeAttribute('id'));if(node.tagName==='A')node.removeAttribute('href')}
    buildShard(node,r.width,r.height,r.left+r.width/2,r.top+r.height/2,'part');
    hideNode(el);
  }));
  shards.forEach((s,i)=>{
    const dx=s.x-ccx,dy=s.y-ccy,dist=Math.max(70,Math.hypot(dx,dy)),nx=dx/dist,ny=dy/dist;
    const reach=dist*(s.tile?1.55:1.22)+(s.tile?80:50),hw=s.w/2,hh=s.h/2;
    s.tx=Math.max(hw+8,Math.min(cw-hw-8,ccx+nx*reach+(s.seed%1-.5)*46));
    s.ty=Math.max(hh+8,Math.min(chh-hh-8,ccy+ny*reach*.88+Math.sin(s.seed*1.7)*34));
    s.tz=Math.sin(s.seed*2.1)*230+(ny>0?-70:70);
    s.z0=s.tz*.25+(s.seed%1-.5)*30;
    s.trx=ny*18+Math.sin(s.seed)*8;s.tryy=nx*26+Math.cos(s.seed)*8;s.trz=(s.seed/Math.PI-1)*8;
    s.releaseAt=PH_FALL+(i%9)*.12+(s.seed%1)*.2;
  });
}
function assemble(){
  if(!stage)return;
  cancelAnimationFrame(fxRaf);fxRaf=0;
  stage.remove();stage=null;shards=[];dragged=null;fxTime=0;
  hiddenNodes.forEach(el=>{el.style.visibility=''});hiddenNodes=[];
  window.removeEventListener('pointermove',onPointerMove);
  window.removeEventListener('pointerup',onPointerUp);
  window.removeEventListener('pointercancel',onPointerUp);
  updateFxButton();
}
function toggleFx(){if(stage)assemble();else explode()}
function updateFxButton(){if(!fxBtn)return;fxBtn.textContent=stage?'ASSEMBLE':'3D VIEW';fxBtn.setAttribute('aria-pressed',stage?'true':'false')}
function drawShards(){for(let i=0;i<shards.length;i++){const s=shards[i];s.el.style.transform='translate3d('+(s.x-s.w/2)+'px,'+(s.y-s.h/2)+'px,'+s.z+'px) rotateX('+(s.rx+s.lying*62)+'deg) rotateY('+s.ry+'deg) rotateZ('+s.rz+'deg)'}}
function stepShard(s,dt){
  const hh=halfH(s),floor=innerHeight-12;
  if(s.drag){
    s.asleep=false;s.rest=0;s.lying=Math.max(0,s.lying-6*dt);
    s.vx=(s.drag.x-s.x)*16;s.vy=(s.drag.y-s.y)*16;
    s.z+=(46-s.z)*Math.min(1,8*dt);
    s.rx+=(0-s.rx)*Math.min(1,7*dt);s.ry+=(0-s.ry)*Math.min(1,5*dt);
    s.wx*=.9;s.wy*=.9;s.wz*=.92;
  }else{
    s.vy+=GRAV*dt;s.vx*=.996;s.vz*=.985;
    s.z+=(s.z0-s.z)*Math.min(1,3*dt);
    s.rx+=s.wx*dt;s.ry+=s.wy*dt;s.rz+=s.wz*dt;
    s.wx*=.99;s.wy*=.99;s.wz*=.995;
  }
  s.x+=s.vx*dt;s.y+=s.vy*dt;
  if(s.x<s.w/2){s.x=s.w/2;s.vx=Math.abs(s.vx)*.4;s.wz+=.6}
  if(s.x>innerWidth-s.w/2){s.x=innerWidth-s.w/2;s.vx=-Math.abs(s.vx)*.4;s.wz-=.6}
  if(s.y<hh){s.y=hh;s.vy=Math.abs(s.vy)*.3}
  const restY=floor-hh;
  if(s.y>restY){
    s.y=restY;
    if(s.vy>70){s.vy=-s.vy*.32;s.wz+=(Math.random()-.5)*1.6}else{s.vy=0}
    s.vx*=.9;s.wz*=.9;
    s.lying=Math.min(1,s.lying+3*dt);
  }else{s.lying=Math.max(0,s.lying-1.6*dt)}
  if(s.z>320)s.z=320;
  if(s.z<-320)s.z=-320;
  if(!s.drag&&s.y>=restY-1&&Math.abs(s.vx)<30&&Math.abs(s.vy)<30)s.rest+=dt;else s.rest=0;
  if(s.rest>.5){s.asleep=true;s.vx=0;s.vy=0;s.vz=0;s.wx=0;s.wy=0;s.wz=0}
}
function collide(){
  for(let i=0;i<shards.length;i++){
    const a=shards[i];if(!a.free)continue;
    const ahw=a.w/2,ahh=halfH(a);
    for(let j=i+1;j<shards.length;j++){
      const b=shards[j];if(!b.free)continue;
      if(a.asleep&&b.asleep)continue;
      const dx=b.x-a.x,bhw=b.w/2,bhh=halfH(b);
      if(dx>=ahw+bhw||dx<=-(ahw+bhw))continue;
      const dy=b.y-a.y;
      if(dy>=ahh+bhh||dy<=-(ahh+bhh))continue;
      const ox=ahw+bhw-Math.abs(dx),oy=ahh+bhh-Math.abs(dy);
      const ma=a.asleep?1e6:a.mass,mb=b.asleep?1e6:b.mass,mt=ma+mb;
      let rel=0;
      if(ox<oy){
        const n=dx<0?1:-1,px=ox*n;
        a.x-=px*mb/mt;b.x+=px*ma/mt;
        rel=(b.vx-a.vx)*n;
        if(rel<0){const imp=-1.24*rel/(1/ma+1/mb);a.vx-=imp*n/ma;b.vx+=imp*n/mb;a.wz-=.4;b.wz+=.4}
      }else{
        const n=dy<0?1:-1,py=oy*n;
        a.y-=py*mb/mt;b.y+=py*ma/mt;
        rel=(b.vy-a.vy)*n;
        if(rel<0){const imp=-1.24*rel/(1/ma+1/mb);a.vy-=imp*n/ma;b.vy+=imp*n/mb;a.wz+=(b.vx-a.vx)*.0008;b.wz-=(b.vx-a.vx)*.0008}
      }
      if(Math.abs(rel)>70){a.asleep=false;b.asleep=false;a.rest=0;b.rest=0}
    }
  }
}
function onPointerDown(e){
  if(!stage)return;
  let best=null;
  for(let i=shards.length-1;i>=0;i--){
    const s=shards[i];
    if(Math.abs(e.clientX-s.x)<=s.w/2&&Math.abs(e.clientY-s.y)<=halfH(s)){if(!best||s.z>best.z)best=s}
  }
  if(!best)return;
  e.preventDefault();
  best.free=true;best.asleep=false;best.rest=0;best.lying=0;
  best.drag={x:e.clientX,y:e.clientY};
  best.el.classList.add('dragged');
  dragged=best;
}
function onPointerMove(e){if(!dragged||!dragged.drag)return;dragged.drag.x=e.clientX;dragged.drag.y=e.clientY;if(e.cancelable)e.preventDefault()}
function onPointerUp(){if(!dragged)return;dragged.el.classList.remove('dragged');dragged.drag=null;dragged.wz+=(Math.random()-.5)*2;dragged=null}
function fxTick(now){
  if(!stage)return;
  const dt=Math.min(.05,Math.max(.0008,(now-fxLast)/1000));fxLast=now;fxTime+=dt;
  const t=fxTime;
  if(t<PH_EXPLODE){
    const k=easeOut3(t/PH_EXPLODE);
    for(let i=0;i<shards.length;i++){const s=shards[i];if(s.free)continue;s.x=s.ox+(s.tx-s.ox)*k;s.y=s.oy+(s.ty-s.oy)*k;s.z=s.tz*k;s.rx=s.trx*k;s.ry=s.tryy*k;s.rz=s.trz*k}
  }else{
    for(let i=0;i<shards.length;i++){
      const s=shards[i];
      if(!s.free){
        if(t<PH_FALL){
          s.x=s.tx+Math.sin(t*.9+s.seed)*9;s.y=s.ty+Math.cos(t*1.1+s.seed)*8;s.z=s.tz+Math.sin(t*.7+s.seed)*26;
          s.rx=s.trx+Math.sin(t*.6+s.seed)*5;s.ry=s.tryy+Math.sin(t*.85+s.seed)*14;s.rz=s.trz+Math.cos(t*.7+s.seed)*6;
        }
        if(t>=s.releaseAt){s.free=true;s.vx=Math.sin(s.seed*2.7)*70;s.vy=30;s.vz=-s.z*.9;s.wx=(Math.random()-.5)*2;s.wy=(Math.random()-.5)*2;s.wz=(Math.random()-.5)*3}
        continue;
      }
      stepShard(s,dt);
    }
    collide();
  }
  drawShards();
  fxRaf=requestAnimationFrame(fxTick);
}
if(fxBtn)fxBtn.addEventListener('click',toggleFx);
function indexOfVersion(v){for(let i=0;i<ARCHIVE.length;i++)if(ARCHIVE[i].v===v)return i;return -1}
function prefRead(){try{const raw=String(window.name||'');return raw.indexOf(PREF)===0?raw.slice(PREF.length):null}catch(e){return null}}
function prefWrite(v){try{const raw=String(window.name||'');if(raw&&raw.indexOf(PREF)!==0)return false;window.name=v?PREF+v:'';return true}catch(e){return false}}
function updateVersionUI(){const i=ARCHIVE.indexOf(active),pinned=prefRead();versionEl.textContent='v'+active.v+(active.v===BUILD?' · latest':' · older');versionEl.title=active.name+' — '+active.note;prevBtn.disabled=i<=0;nextBtn.disabled=i>=ARCHIVE.length-1;latestBtn.className=active.v===BUILD?'hidden':'';pinBtn.setAttribute('aria-pressed',pinned===active.v?'true':'false');pinBtn.textContent=pinned===active.v?'UNPIN':'PIN';reloadBtn.title='Purge cached state and reload v'+active.v}
function applyVersion(i,message){const next=ARCHIVE[Math.max(0,Math.min(ARCHIVE.length-1,i))];active=next;shapes=next.kind.shapes;colors=next.kind.colors;labels=next.kind.labels;document.querySelector('#game-title').innerHTML=next.title;ruleEl.textContent=rules[0];cancelAnimationFrame(raf);raf=0;running=false;paused=false;reset();playButton.textContent='BREAK REALITY';playButton.classList.remove('hidden');statusEl.textContent=message||'v'+next.v+' · '+next.name+' live.'+(next.v===BUILD?'':'. Latest is v'+BUILD+'.');updateVersionUI();if(stage)assemble();if(explodeTimer)clearTimeout(explodeTimer);if(next.explode)explodeTimer=setTimeout(function(){if(active.explode&&!stage&&!running)explode()},900)}
function stepVersion(d){const i=ARCHIVE.indexOf(active)+d;if(i<0||i>=ARCHIVE.length){statusEl.textContent=d<0?'v'+ARCHIVE[0].v+' is the oldest build in the cache.':'v'+BUILD+' is the latest build.';return}applyVersion(i)}
function togglePin(){if(prefRead()===active.v){const ok=prefWrite('');statusEl.textContent=ok?'Unpinned. The next load runs v'+BUILD+'.':'Pin cleared for this session.'}else{const ok=prefWrite(active.v);statusEl.textContent=ok?'v'+active.v+' pinned. It survives reloads of this frame.':'v'+active.v+' pinned for this session — this sandbox blocks persistent storage.'}updateVersionUI()}
prevBtn.addEventListener('click',()=>stepVersion(-1));nextBtn.addEventListener('click',()=>stepVersion(1));latestBtn.addEventListener('click',()=>applyVersion(ARCHIVE.length-1));pinBtn.addEventListener('click',togglePin);reloadBtn.addEventListener('click',()=>applyVersion(ARCHIVE.indexOf(active),'Cache purged. v'+active.v+' reloaded from the shipped build.'));
const pinned=prefRead(),pinnedIndex=pinned?indexOfVersion(pinned):-1;
if(pinned&&pinnedIndex<0)prefWrite('');
if(pinnedIndex>=0&&ARCHIVE[pinnedIndex].v!==BUILD)applyVersion(pinnedIndex,'Pinned v'+ARCHIVE[pinnedIndex].v+' restored. Latest is v'+BUILD+' — press LATEST to update.');else applyVersion(ARCHIVE.length-1,'v'+BUILD+' · '+ARCHIVE[ARCHIVE.length-1].name+'. Newest build live, cache served from it.');
