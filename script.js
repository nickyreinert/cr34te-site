'use strict';
(function(){
var cv=document.getElementById('c'),ctx=cv.getContext('2d'),ui=document.getElementById('ui'),dashEl=document.getElementById('dash');
var W=800,H=600,DPR=1,S=1,TAU=Math.PI*2;
function clamp(v,a,b){return v<a?a:v>b?b:v;}
function rnd(a,b){return a+Math.random()*(b-a);}
function rint(a,b){return Math.floor(rnd(a,b+1));}
function pick(a){return a[Math.floor(Math.random()*a.length)];}
function hyp(a,b){return Math.sqrt(a*a+b*b);}
function angDiff(a,b){var d=a-b;while(d>Math.PI)d-=TAU;while(d<-Math.PI)d+=TAU;return d;}
function rng(seed){var a=seed>>>0;return function(){a=a+0x6D2B79F5|0;var t=Math.imul(a ^ a>>>15,1|a);t=t+Math.imul(t ^ t>>>7,61|t)^ t;return((t ^ t>>>14)>>>0)/4294967296;};}
function hash(x,y,s){var h=(Math.imul(x,374761393)+Math.imul(y,668265263)+Math.imul(s,2147483647))|0;h=Math.imul(h ^ h>>>13,1274126177);h ^=h>>>16;return(h>>>0)/4294967296;}
function resize(){DPR=Math.min(2,window.devicePixelRatio||1);W=Math.max(240,window.innerWidth);H=Math.max(240,window.innerHeight);cv.width=Math.round(W*DPR);cv.height=Math.round(H*DPR);S=clamp(Math.min(W,H)/640,0.7,1.4);}
resize();window.addEventListener('resize',resize);
var AC=null,muted=false,lastSfx={},musicT=0,musicN=0;
function audioInit(){if(AC){try{if(AC.state==='suspended')AC.resume();}catch(e){}return;}try{AC=new(window.AudioContext||window.webkitAudioContext)();}catch(e){AC=null;}}
function tone(f,d,type,vol,slide){if(!AC||muted)return;try{var o=AC.createOscillator(),g=AC.createGain(),t=AC.currentTime;o.type=type||'square';o.frequency.setValueAtTime(f,t);if(slide)o.frequency.exponentialRampToValueAtTime(Math.max(20,f*slide),t+d);g.gain.setValueAtTime(vol||0.05,t);g.gain.exponentialRampToValueAtTime(0.0001,t+d);o.connect(g);g.connect(AC.destination);o.start(t);o.stop(t+d+0.03);}catch(e){}}
function sfx(n){var now=performance.now();if(lastSfx[n]&&now-lastSfx[n]<(n==='shot'?80:45))return;lastSfx[n]=now;
switch(n){case 'shot':tone(520+Math.random()*80,0.07,'square',0.012,0.5);break;case 'hit':tone(190,0.06,'sawtooth',0.018,0.6);break;case 'kill':tone(130,0.18,'sawtooth',0.035,0.3);break;case 'gem':tone(900+Math.random()*300,0.06,'sine',0.025,1.4);break;case 'lvl':tone(400,0.45,'triangle',0.06,3);break;case 'hurt':tone(90,0.3,'sawtooth',0.07,0.4);break;case 'dash':tone(300,0.2,'sine',0.05,3);break;case 'boom':tone(70,0.35,'sawtooth',0.06,0.3);break;case 'warn':tone(220,0.5,'square',0.04,0.5);break;}}
function music(dt){if(!AC||muted||!G)return;musicT-=dt;if(musicT>0)return;var r=G.sector.root,sc=[0,3,5,7,10,12,15],k=G.sector.arp[musicN%8];musicN++;
tone(r*Math.pow(2,sc[k%7]/12),0.35,'triangle',0.018,0.98);if(musicN%4===1)tone(r/2,0.5,'sine',0.03,0.9);musicT=clamp(0.3-G.en.length*0.003,0.14,0.3);}
var state='title',G=null,best=0,lastSeed=0;
var keys={},sticky={},mouse={x:0,y:0,t:-99,has:false},stick={id:null,ox:0,oy:0,x:0,y:0},touchMode=false,autoAim=false,dashBuf=0;
var tcam={x:0,y:0},titleSeed=(Math.random()*4294967295)>>>0;
function down(k){return keys[k]||(sticky[k]>performance.now());}
function seedStr(s){return(s>>>0).toString(36).toUpperCase().slice(0,7);}
window.addEventListener('keydown',function(e){
var k=e.key.toLowerCase();
if(k===' '||k==='enter'||k.indexOf('arrow')===0||k==='tab')e.preventDefault();
keys[k]=true;sticky[k]=performance.now()+90;
if(!e.repeat)onKey(k);
});
window.addEventListener('keyup',function(e){keys[e.key.toLowerCase()]=false;});
window.addEventListener('blur',function(){for(var k in keys)keys[k]=false;if(state==='play')pause();});
document.addEventListener('visibilitychange',function(){if(document.hidden&&state==='play')pause();});
window.addEventListener('contextmenu',function(e){e.preventDefault();});
function onKey(k){
audioInit();
if(state==='title'){if(k==='enter'||k===' ')startGame(titleSeed);return;}
if(state==='over'){if(k==='enter'||k==='r')startGame((Math.random()*4294967295)>>>0);else if(k==='s')startGame(lastSeed);return;}
if(state==='perk'){var n=parseInt(k,10);if(n>=1&&n<=G.offer.cards.length)choose(n-1);else if(k==='r')reroll();return;}
if(state==='pause'){if(k==='p'||k==='escape'||k==='enter')resume();return;}
if(state==='play'){
if(k===' '||k==='shift'||k==='e')dashBuf=0.3;
else if(k==='p'||k==='escape')pause();
else if(k==='m')muted=!muted;
else if(k==='t'){autoAim=!autoAim;toast(autoAim?'AUTO-AIM ON':'MOUSE AIM','#8ef');}
}
}
window.addEventListener('pointermove',function(e){
if(e.pointerType==='mouse'){mouse.x=e.clientX;mouse.y=e.clientY;mouse.t=performance.now();mouse.has=true;return;}
if(e.pointerId===stick.id){var dx=e.clientX-stick.ox,dy=e.clientY-stick.oy,R=56,d=hyp(dx,dy);
if(d>R){stick.ox+=dx/d*(d-R);stick.oy+=dy/d*(d-R);dx=e.clientX-stick.ox;dy=e.clientY-stick.oy;}
stick.x=clamp(dx/R,-1,1);stick.y=clamp(dy/R,-1,1);}
});
cv.addEventListener('pointerdown',function(e){
audioInit();try{window.focus();}catch(_){}
if(e.pointerType==='mouse'){mouse.x=e.clientX;mouse.y=e.clientY;mouse.t=performance.now();mouse.has=true;if(e.button===2&&state==='play')dashBuf=0.3;return;}
touchMode=true;dashEl.classList.add('on');
if(state==='play'&&stick.id===null){stick.id=e.pointerId;stick.ox=e.clientX;stick.oy=e.clientY;stick.x=stick.y=0;try{cv.setPointerCapture(e.pointerId);}catch(_){}}
});
function endPtr(e){if(e.pointerId===stick.id){stick.id=null;stick.x=stick.y=0;}}
window.addEventListener('pointerup',endPtr);window.addEventListener('pointercancel',endPtr);
dashEl.addEventListener('pointerdown',function(e){e.preventDefault();e.stopPropagation();audioInit();touchMode=true;if(state==='play')dashBuf=0.3;});
var SY=['ka','zo','ri','vex','lu','na','thor','ym','qui','sha','dro','mi','xen','or','ul','bra','tek','ish','ven','pho'];
function nameGen(r,n){var s='';for(var i=0;i<n;i++)s+=SY[Math.floor(r()*SY.length)];return s.charAt(0).toUpperCase()+s.slice(1);}
var BEHW={chase:'Hunter',orbit:'Warden',sniper:'Sentinel',dash:'Lancer',swarm:'Mite',zig:'Skitter',weave:'Wisp'};
var MUTS=[
{id:'swift',n:'Overclocked Foes',d:'enemies move 25% faster'},{id:'dense',n:'Swarming Tide',d:'many more enemies'},
{id:'rich',n:'Gilded Sector',d:'double XP, tougher foes'},{id:'fog',n:'Dark Nebula',d:'vision is limited'},
{id:'ice',n:'Frictionless Void',d:'your ship drifts'},{id:'storm',n:'Bullet Storm',d:'enemies fire faster'},
{id:'armored',n:'Hardened Hulls',d:'tough enemies, extra XP'}];
var SPEC=['armor','split','explode','cloak','regen','summon','enrage'];
var SPECN={armor:'armored',split:'splitting',explode:'volatile',cloak:'cloaking',regen:'regenerating',summon:'summoning',enrage:'enraging'};
function genSpecies(r,stage,hue){
var behs=['chase','orbit','zig','sniper','dash','swarm','weave'],weps=['none','aim','tri','ring','spiral','burst','cross'];
var beh=behs[Math.floor(r()*behs.length)],wep=stage<2?(r()<0.5?'none':'aim'):weps[Math.floor(r()*weps.length)];
if((beh==='dash'||beh==='swarm')&&r()<0.7)wep='none';
if(beh==='sniper'&&wep==='none')wep='aim';
var size=beh==='swarm'?7+r()*4:12+r()*14,sp={};
var specN=stage>=8?2:1,chance=stage<2?0:stage<4?0.3:0.5,specs={},sl=[];
for(var i=0;i<specN;i++)if(r()<chance&&beh!=='swarm'){var s=SPEC[Math.floor(r()*SPEC.length)];specs[s]=1;}
for(var q in specs)sl.push(SPECN[q]);
var spdR={chase:[80,125],orbit:[100,140],zig:[100,150],sniper:[85,115],dash:[85,110],swarm:[125,170],weave:[110,160]}[beh];
sp.name=(sl[0]?sl[0]+' ':'')+nameGen(r,2)+' '+BEHW[beh];
sp.sides=3+Math.floor(r()*5);sp.size=size;sp.hp=beh==='swarm'?size*0.55:size*size*0.07+8;
sp.spd=spdR[0]+r()*(spdR[1]-spdR[0]);sp.beh=beh;sp.wep=wep;sp.rate=1.6+r()*1.6;sp.bspd=150+r()*70+stage*5;
sp.bdmg=7+stage*0.9;sp.dmg=10+stage*1.1;sp.hue=(hue+Math.floor(r()*140)-30+360)%360;sp.xp=beh==='swarm'?1:1+Math.floor(size/11);
sp.spin=(r()-0.5)*2.4;sp.pack=beh==='swarm'?6+Math.floor(r()*4+stage/3):1+Math.floor(r()*3);sp.core=Math.floor(r()*3);sp.sp=specs;
return sp;
}
function genBoss(r,stage,hue){
var pool=['ring','fan','spiral','cross','rain','summon','burst'],pats=[];
while(pats.length<4){var p=pool[Math.floor(r()*pool.length)];if(pats.indexOf(p)<0)pats.push(p);}
if(pats[0]==='summon'){pats[0]=pats[1];pats[1]='summon';}
return{name:nameGen(r,3)+' '+pick(['Colossus','Leviathan','Overseer','Harbinger','Titan','Matriarch']),sides:5+Math.floor(r()*4),size:52+r()*14,hp:900*(1+0.4*stage/5),spd:60,beh:'boss',wep:'none',rate:2,bspd:190,bdmg:9+stage*0.8,dmg:20,hue:(hue+Math.floor(r()*120))%360,xp:12,spin:0.25,pack:1,core:1,sp:{},boss:true,pats:pats};
}
function pc(v){return Math.round(v*100)+'%';}
function cnt(m){return m>=2?2:1;}
function pl(n){return n>1?'s':'';}
var PERKS=[
{id:'dmg',n:'Overcharge',t:'gun',d:function(m){return '+'+pc(0.3*m)+' damage';},a:function(s,m){s.dmg*=1+0.3*m;}},
{id:'rate',n:'Rapid Cycler',t:'gun',d:function(m){return '+'+pc(0.22*m)+' fire rate';},a:function(s,m){s.rate*=1+0.22*m;}},
{id:'multi',n:'Split Barrel',t:'gun',max:6,d:function(m){return '+'+cnt(m)+' projectile'+pl(cnt(m));},a:function(s,m){s.shots+=cnt(m);s.spread+=0.04;}},
{id:'pierce',n:'Lance Core',t:'gun',max:5,d:function(m){return 'bullets pierce +'+cnt(m)+' enemies';},a:function(s,m){s.pierce+=cnt(m);}},
{id:'bounce',n:'Ricochet Engine',t:'gun',max:4,d:function(m){return 'bullets jump to +'+cnt(m)+' more target'+pl(cnt(m));},a:function(s,m){s.bounce+=cnt(m);}},
{id:'homing',n:'Seeker Lattice',t:'gun',max:4,d:function(m){return 'bullets steer to enemies (+'+pc(0.5*m)+')';},a:function(s,m){s.homing+=0.5*m;}},
{id:'boom',n:'Volatile Rounds',t:'gun',max:4,d:function(m){return 'hits explode, radius +'+Math.round(30*m);},a:function(s,m){s.boom+=30*m;}},
{id:'crit',n:'Predator Eye',t:'gun',max:5,d:function(m){return '+'+pc(0.12*m)+' crit chance, bigger crits';},a:function(s,m){s.crit+=0.12*m;s.critMul+=0.3*m;}},
{id:'size',n:'Heavy Slugs',t:'gun',max:4,d:function(m){return 'bigger bullets +'+pc(0.35*m)+', +15% dmg, -8% rate';},a:function(s,m){s.bsize*=1+0.35*m;s.dmg*=1.15;s.rate*=0.92;}},
{id:'burn',n:'Plasma Seeds',t:'gun',max:4,d:function(m){return 'hits ignite foes (burn x'+(0.6*m).toFixed(1)+')';},a:function(s,m){s.burn+=0.6*m;}},
{id:'freeze',n:'Cryo Tips',t:'gun',max:4,d:function(m){return pc(0.12*m)+' chance to freeze on hit';},a:function(s,m){s.freeze+=0.12*m;}},
{id:'orbit',n:'Blade Halo',t:'aux',max:6,d:function(m){return '+'+cnt(m)+' orbiting blade'+pl(cnt(m));},a:function(s,m){s.orbit+=cnt(m);}},
{id:'drone',n:'Wingman',t:'aux',max:3,d:function(m){return '+'+cnt(m)+' firing drone'+pl(cnt(m));},a:function(s,m){s.drone+=cnt(m);}},
{id:'chain',n:'Arc Coil',t:'aux',max:4,d:function(m){return 'kills arc lightning (power '+m.toFixed(1)+')';},a:function(s,m){s.chain+=m;}},
{id:'mines',n:'Mine Layer',t:'aux',max:4,d:function(m){return 'drop mines as you fly (+'+m.toFixed(1)+')';},a:function(s,m){s.mines+=m;}},
{id:'rear',n:'Tail Gunner',t:'aux',max:3,d:function(m){return '+'+cnt(m)+' rear gun'+pl(cnt(m));},a:function(s,m){s.rear+=cnt(m);}},
{id:'nova',n:'Pulse Nova',t:'aux',max:4,d:function(m){return 'periodic shockwave (power '+m.toFixed(1)+')';},a:function(s,m){s.nova+=m;}},
{id:'thorns',n:'Spiked Hull',t:'def',max:4,d:function(m){return 'ramming hurts foes (x'+m.toFixed(1)+')';},a:function(s,m){s.thorns+=m;}},
{id:'life',n:'Leech Field',t:'def',max:5,d:function(m){return pc(0.06*m)+' chance to heal on kill';},a:function(s,m){s.leech+=0.06*m;}},
{id:'regen',n:'Nanofoam',t:'def',max:5,d:function(m){return '+'+(0.8*m).toFixed(1)+' hp/sec';},a:function(s,m){s.regen+=0.8*m;}},
{id:'maxhp',n:'Reinforced Hull',t:'def',d:function(m){return '+'+Math.round(25*m)+' max HP and heal';},a:function(s,m,p){p.maxhp+=25*m;p.hp+=25*m;}},
{id:'shield',n:'Aegis Matrix',t:'def',max:5,d:function(m){return '+'+Math.round(20*m)+' regenerating shield';},a:function(s,m,p){s.shieldMax+=20*m;p.sh+=20*m;}},
{id:'speed',n:'Ion Thrusters',t:'def',max:5,d:function(m){return '+'+pc(0.12*m)+' move speed';},a:function(s,m){s.spd*=1+0.12*m;}},
{id:'dash',n:'Phase Drive',t:'def',max:5,d:function(m){return 'dash cooldown -'+pc(0.15*m)+', dash cuts enemies';},a:function(s,m){s.dashCd*=1-0.15*m;s.dashDmg+=m;}},
{id:'magnet',n:'Gravity Well',t:'util',max:5,d:function(m){return 'pickup range +'+pc(0.5*m);},a:function(s,m){s.magnet*=1+0.5*m;}},
{id:'xp',n:'Data Siphon',t:'util',max:5,d:function(m){return '+'+pc(0.25*m)+' XP gain';},a:function(s,m){s.xpMul+=0.25*m;}},
{id:'slow',n:'Chrono Residue',t:'util',max:4,d:function(m){return 'kills may slow time ('+pc(0.05*m)+')';},a:function(s,m){s.chrono+=0.05*m;}},
{id:'luck',n:'Fortune Engine',t:'util',max:4,d:function(m){return 'better rarity odds'+(m>=1.6?', one more card':'');},a:function(s,m){s.luck+=m;}},
{id:'revive',n:'Phoenix Core',t:'def',max:1,d:function(){return 'once: revive at half HP with a blast';},a:function(s){s.revive+=1;}}
];
var CURSES=[
{id:'glass',n:'Glass Cannon',d:function(){return '+80% damage, but -40% max HP';},a:function(s,m,p){s.dmg*=1.8;p.maxhp*=0.6;p.hp=Math.min(p.hp,p.maxhp);}},
{id:'berserk',n:'Berserker Pact',d:function(){return 'fire faster the lower your HP; -20% max HP';},a:function(s,m,p){s.berserk+=1;p.maxhp*=0.8;p.hp=Math.min(p.hp,p.maxhp);}},
{id:'bargain',n:'Void Bargain',d:function(){return '+70% XP, but enemies have +30% HP';},a:function(s){s.xpMul+=0.7;G.hpMul*=1.3;}},
{id:'overclock',n:'Overclock',d:function(){return '+50% fire rate, wild aim, -20% damage';},a:function(s){s.rate*=1.5;s.spread+=0.12;s.inacc+=0.1;s.dmg*=0.8;}},
{id:'ballast',n:'Dark Matter Ballast',d:function(){return 'pierce +2, but -20% speed';},a:function(s){s.pierce+=2;s.spd*=0.8;}},
{id:'unstable',n:'Unstable Core',d:function(){return '??? four stats mutate randomly';},a:function(s){
var ks=['dmg','rate','spd','magnet','bsize','bspd','dashCd'],out=[];
for(var i=0;i<4;i++){var k=ks.splice(Math.floor(Math.random()*ks.length),1)[0],m=rnd(0.65,1.7);s[k]*=m;out.push(k+' x'+m.toFixed(2));}
toast('MUTATION: '+out.join(', '),'#f8a',5);}}
];
var SYN=[
{id:'railgun',n:'Rail Detonation',need:['pierce','boom'],msg:'piercing bullets detonate when they end'},
{id:'pinball',n:'Pinball Wizard',need:['bounce','homing'],msg:'each bounce adds +30% damage'},
{id:'bladestorm',n:'Bladestorm',need:['orbit','thorns'],msg:'bigger, faster, deadlier blades'},
{id:'bloodlust',n:'Bloodlust',need:['crit','life'],msg:'critical hits heal you'},
{id:'frostmine',n:'Cryo Mines',need:['mines','freeze'],msg:'mines freeze everything nearby'},
{id:'swarm',n:'Hive Mind',need:['drone','multi'],msg:'drones fire your full spread'},
{id:'stormcoil',n:'Storm Front',need:['chain','nova'],msg:'your nova calls down lightning'},
{id:'timelord',n:'Time Lord',need:['slow','dash'],msg:'dashing bends time'}
];
var RAR=[{n:'common',m:1,c:'#bcd'},{n:'rare',m:1.6,c:'#6af'},{n:'epic',m:2.4,c:'#e6f'}];
var RPRE=[[''],['Tuned ','Refined ','Prime '],['Quantum ','Mythic ','Apex ']];
function baseStats(){return{dmg:10,rate:3.2,spd:250,shots:1,spread:0.13,inacc:0.02,pierce:0,bounce:0,homing:0,boom:0,crit:0.05,critMul:1.8,bsize:1,bspd:640,burn:0,freeze:0,orbit:0,drone:0,chain:0,mines:0,rear:0,nova:0,thorns:0,leech:0,regen:0,shieldMax:0,dashCd:2.2,dashDmg:0,magnet:90,xpMul:1,chrono:0,luck:0,revive:0,berserk:0};}
function completes(id){var out=null;SYN.forEach(function(s){if(G.syn[s.id]||s.need.indexOf(id)<0)return;if(s.need.every(function(x){return x===id||G.pc[x];}))out=s;});return out;}
function rollOffers(n,minR){
var cards=[],used={},tries=0;
while(cards.length<n&&tries++<60){
var curse=Math.random()<0.12&&minR<2,pool=curse?CURSES:PERKS,p=pick(pool);
if(used[p.id]||(p.max&&(G.pc[p.id]||0)>=p.max))continue;
if(!curse&&Math.random()<0.5){var w=SYN.some(function(s){return s.need.indexOf(p.id)>=0&&s.need.some(function(x){return x!==p.id&&G.pc[x];})&&!G.syn[s.id];});if(!w&&Math.random()<0.4)continue;}
used[p.id]=1;
var rr=Math.random()-G.stats.luck*0.02,ri=rr<0.05+G.stats.luck*0.01?2:rr<0.25+G.stats.luck*0.03?1:0;
ri=Math.max(ri,minR);if(curse)ri=0;
var m=RAR[ri].m,stack=(G.pc[p.id]||0)+1,sy=curse?null:completes(p.id);
cards.push({p:p,m:m,ri:ri,curse:curse,name:(curse?'':pick(RPRE[ri]))+p.n+(stack>1?' Mk'+stack:''),desc:p.d(m),syn:sy});
}
return cards;
}
function openPerks(q){state='perk';G.offer={title:q.title,minR:q.minR,cards:rollOffers(3+(G.stats.luck>=1.6?1:0),q.minR)};renderOffer();}
function renderOffer(){
var o=G.offer,h='<div class="panel"><h2>'+o.title+'</h2><p class="hint">choose an upgrade · keys 1-'+o.cards.length+' · R reroll ('+G.rerolls+' left)</p><div class="cards">';
o.cards.forEach(function(c,i){h+='<button class="card '+(c.curse?'curse':'r-'+RAR[c.ri].n)+'" data-act="pick" data-i="'+i+'"><span class="k">['+(i+1)+']</span><b style="color:'+(c.curse?'#f86':RAR[c.ri].c)+'">'+c.name+'</b><i>'+(c.curse?'cursed':RAR[c.ri].n+' · '+c.p.t)+'</i><span>'+c.desc+'</span>'+(c.syn?'<u>✦ unlocks a hidden synergy</u>':'')+'</button>';});
h+='</div><button data-act="reroll"'+(G.rerolls<1?' disabled':'')+'>Reroll</button></div>';ui.innerHTML=h;
}
function reroll(){if(G.rerolls<1)return;G.rerolls--;G.offer.cards=rollOffers(G.offer.cards.length,G.offer.minR);renderOffer();}
function choose(i){
var c=G.offer.cards[i];if(!c)return;
c.p.a(G.stats,c.m,G.p);G.pc[c.p.id]=(G.pc[c.p.id]||0)+1;G.have.push({t:c.name,c:c.curse?'#f86':RAR[c.ri].c});
SYN.forEach(function(s){if(!G.syn[s.id]&&s.need.every(function(x){return G.pc[x];})){G.syn[s.id]=1;banner('SYNERGY: '+s.n,s.msg,'#fd6',4);sfx('lvl');}});
ui.innerHTML='';state='play';G.offer=null;
}
function startGame(seed){
audioInit();lastSeed=seed;var r=rng(seed);
var ship={hue:Math.floor(r()*360),pts:[]},wing=0.5+r()*0.9,sweep=-0.3-r()*0.6,nose=1.1+r()*0.5;
ship.pts=[[nose,0],[0.3,0.2+r()*0.2],[sweep,wing],[sweep-0.4,wing*0.6+r()*0.2],[-0.7,0.2+r()*0.1],[-0.55,0]];ship.pod=r()<0.5;ship.podX=r()*0.6-0.2;ship.podY=0.35+r()*0.4;
G={seed:seed,ship:ship,t:0,ts:1,tsT:0,stage:0,stageKills:0,stageNeed:12,kills:0,score:0,xp:0,lvl:1,xpNext:xpFor(1),combo:0,comboT:0,shake:0,flash:0,hpMul:1,magAll:0,
p:{x:0,y:0,vx:0,vy:0,hp:100,maxhp:100,sh:0,ang:-Math.PI/2,inv:0,dashT:0,dashCd:0,dvx:0,dvy:0,fireT:0,over:0,mineT:1,novaT:6,shT:0,thr:0,hitMap:[]},
stats:baseStats(),pc:{},syn:{},have:[],pend:[],rerolls:2,offer:null,en:[],bl:[],eb:[],parts:[],gems:[],pu:[],mines:[],txt:[],bolts:[],rings:[],toasts:[],
cam:{x:0,y:0},orbA:0,droneA:0,droneT:0,spawnT:2,evT:22,lastEv:'',bossAlive:false,bossT:0,bh:null,bc:null,astT:0,astDir:0,crate:0,mut:'',sector:null,banner:null,bgHue:200,time0:Date.now(),maxCombo:0};
ui.innerHTML='';state='play';nextStage();
}
function xpFor(l){return Math.floor(12+l*9+l*l*1.6);}
function nextStage(){
var g=G;g.stage++;g.stageKills=0;var st=g.stage,r=rng((g.seed*2654435761 ^ st*40503)>>>0),hue=Math.floor(r()*360),boss=st%5===0;
var sp=[],n=Math.min(4,2+Math.floor(st/3));for(var i=0;i<n;i++)sp.push(genSpecies(r,st,hue));
var mut=(!boss&&st>1&&r()<0.65)?MUTS[Math.floor(r()*MUTS.length)]:null;
g.mut=mut?mut.id:'';g.sector={name:nameGen(r,2)+' '+['Reach','Drift','Expanse','Maw','Veil','Belt','Rift','Gate'][Math.floor(r()*8)],hue:hue,species:sp,root:55*Math.pow(2,Math.floor(r()*12)/12)*2,arp:[0,2,4,2,5,3,4,1].map(function(x){return(x+Math.floor(r()*3))%7;}),boss:null};
g.stageNeed=boss?1e9:14+st*7;
for(var j=g.eb.length-1;j>=0;j--){if(g.gems.length<260)g.gems.push({x:g.eb[j].x,y:g.eb[j].y,vx:0,vy:0,v:1,life:20});}g.eb.length=0;
g.p.hp=Math.min(g.p.maxhp,g.p.hp+g.p.maxhp*0.15);
if(boss){g.sector.boss=genBoss(r,st,hue);g.bossT=3.5;banner('WARNING','something huge approaches...','#f55',3.5);sfx('warn');}
else banner('SECTOR '+st+' — '+g.sector.name,(mut?mut.n+': '+mut.d+'. ':'')+'Contacts: '+sp.map(function(s){return s.name;}).join(', '),'#8ef',5);
}
function banner(a,b,c,t){G.banner={a:a,b:b,c:c||'#8ef',t:t||3,T:t||3};}
function toast(s,c,t){if(G)G.toasts.push({s:s,c:c||'#fff',t:t||2.5});}
var ASTSP={name:'Asteroid',sides:7,size:20,hp:20,spd:0,beh:'drift',wep:'none',hue:32,xp:2,dmg:14,spin:0.6,pack:1,core:0,sp:{},ast:true};
var WRSP={name:'Treasure Wraith',sides:4,size:15,hp:40,spd:215,beh:'flee',wep:'none',hue:48,xp:3,dmg:0,spin:3,pack:1,core:2,sp:{},wraith:true};
function hpScale(){var st=G.stage;return(1+0.27*(st-1))*(1+0.012*st*st)*((G.mut==='armored'||G.mut==='rich')?1.35:1)*G.hpMul;}
function spawnEnemy(sp,x,y,extra){
var e={x:x,y:y,vx:0,vy:0,sp:sp,hp:sp.hp*hpScale(),r:sp.size,ang:rnd(0,TAU),t:0,seed:Math.random(),dir:Math.random()<0.5?-1:1,fireT:rnd(0.8,2.5),cd:rnd(1.2,3),flash:0,burn:0,burnDps:0,freeze:0,cloak:0,cloakT:rnd(1,3),dashT:0,tele:false,dead:false,speedMul:G.mut==='swift'?1.25:1,blT:0,life:0,enr:false};
if(extra)for(var k in extra)e[k]=extra[k];
e.maxhp=e.hp;G.en.push(e);return e;
}
function ringPos(rad,a){return[G.p.x+Math.cos(a)*rad,G.p.y+Math.sin(a)*rad];}
function spawnGroup(){
var sp=G.sector.species,s=sp[Math.floor(Math.pow(Math.random(),1.4)*sp.length)],R=hyp(W,H)/2+70,f=pick(['cluster','cluster','ring','line','pincer']),n=s.pack+Math.floor(G.stage/6),a=rnd(0,TAU),i,p;
if(G.mut==='dense')n=Math.ceil(n*1.5);
if(f==='ring'&&s.pack>1||f==='ring'&&G.stage>3){n=Math.max(n,8);for(i=0;i<n;i++){p=ringPos(R,a+i*TAU/n);spawnEnemy(s,p[0],p[1]);}}
else if(f==='line'){p=ringPos(R,a);for(i=0;i<n;i++)spawnEnemy(s,p[0]+Math.cos(a+1.57)*(i-n/2)*40,p[1]+Math.sin(a+1.57)*(i-n/2)*40);}
else if(f==='pincer'){for(i=0;i<n;i++){p=ringPos(R,a+(i%2)*Math.PI);spawnEnemy(s,p[0]+rnd(-50,50),p[1]+rnd(-50,50));}}
else{p=ringPos(R,a);for(i=0;i<n;i++)spawnEnemy(s,p[0]+rnd(-60,60),p[1]+rnd(-60,60));}
}
function eb(e,a,sp,o){var s=e.sp,ra=e.r||0;G.eb.push({x:e.x+Math.cos(a)*ra,y:e.y+Math.sin(a)*ra,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp,r:5,dmg:s.bdmg,hue:s.hue,life:8,dead:false});}
function aimAt(e){return Math.atan2(G.p.y-e.y,G.p.x-e.x);}
function spawnBoss(){
var b=G.sector.boss,p=ringPos(420,rnd(0,TAU)),e=spawnEnemy(b,p[0],p[1],{boss:true,r:b.size});
e.hp=e.maxhp=b.hp*(1+0.1*G.stage/5)*G.hpMul;e.pt={};G.bossAlive=true;G.bossE=e;G.stageNeed=1e9;sfx('warn');
banner(b.name,'SECTOR GUARDIAN','#f66',4);
}
var BP={
ring:{cd:2.3,f:function(e){var n=14+Math.floor(G.stage/2),o=Math.random()*TAU;for(var i=0;i<n;i++)eb(e,o+i*TAU/n,170);}},
fan:{cd:1.7,f:function(e){var a=aimAt(e);for(var i=-3;i<=3;i++)eb(e,a+i*0.14,235);}},
spiral:{cd:0.1,f:function(e){e.sp2=(e.sp2||0)+0.37;eb(e,e.sp2,200);eb(e,e.sp2+Math.PI,200);}},
cross:{cd:0.65,f:function(e){for(var i=0;i<5;i++)eb(e,e.ang+i*TAU/5,190);}},
burst:{cd:1.4,f:function(e){var a=aimAt(e);for(var i=0;i<5;i++)eb(e,a,310-i*38);}},
rain:{cd:0.17,f:function(){G.eb.push({x:G.p.x+rnd(-W/2,W/2),y:G.p.y-H/2-20,vx:rnd(-20,20),vy:240,r:5,dmg:G.sector.boss.bdmg,hue:G.sector.boss.hue,life:6,dead:false});}},
summon:{cd:6,f:function(e){var s=G.sector.species[0];for(var i=0;i<3;i++)spawnEnemy(s,e.x+rnd(-80,80),e.y+rnd(-80,80));}}
};
function updateBoss(e,dt){
var s=e.sp,f=e.hp/e.maxhp,np=f>0.66?1:f>0.33?2:f>0.15?3:4,dx=G.p.x-e.x,dy=G.p.y-e.y,d=hyp(dx,dy)||1,k=clamp((d-330)/80,-1,1);
e.vx+=((dx/d*k+(-dy/d)*e.dir*0.4)*s.spd*e.speedMul-e.vx)*Math.min(1,dt*1.5);e.vy+=((dy/d*k+(dx/d)*e.dir*0.4)*s.spd*e.speedMul-e.vy)*Math.min(1,dt*1.5);
if(e.freeze>0){e.vx*=0.5;e.vy*=0.5;}
for(var i=0;i<np;i++){var name=s.pats[i],pt=BP[name];e.pt[name]=(e.pt[name]===undefined?1.5+i:e.pt[name])-dt*(e.freeze>0?0.3:1);if(e.pt[name]<=0){pt.f(e);e.pt[name]=pt.cd*(np>=4?0.8:1)*(G.mut==='storm'?0.8:1);}}
}
function nearest(x,y,range,ex){var best=null,bd=range*range;for(var i=0;i<G.en.length;i++){var e=G.en[i];if(e.dead||e.cloak>0||(ex&&ex.indexOf(e)>=0)||e.sp.wraith&&false)continue;var d=(e.x-x)*(e.x-x)+(e.y-y)*(e.y-y);if(d<bd){bd=d;best=e;}}return best;}
function pop(x,y,v,c,big){if(G.txt.length<40)G.txt.push({x:x,y:y,s:v,c:c,life:0.7,big:big||1});}
function burst(x,y,hue,n,sp){for(var i=0;i<n&&G.parts.length<700;i++){var a=Math.random()*TAU,v=Math.random()*(sp||220);G.parts.push({x:x,y:y,vx:Math.cos(a)*v,vy:Math.sin(a)*v,life:rnd(0.3,0.8),max:0.8,hue:hue,sz:rnd(1,3)});}}
function dealDamage(e,d,crit){
if(e.dead||e.cloak>0)return;if(e.sp.sp.armor)d*=0.6;
e.hp-=d;e.flash=0.09;if(d>=1)pop(e.x,e.y-e.r,Math.round(d),crit?'#ffd34d':'#cfe',crit?1.4:1);
if(e.hp<=0)kill(e);
}
function heal(n){var P=G.p;P.hp=Math.min(P.maxhp,P.hp+n);pop(P.x,P.y-20,'+'+Math.round(n),'#6f8',1);}
function addXP(v){var g=G;g.xp+=v*g.stats.xpMul*(g.mut==='rich'?2:g.mut==='armored'?1.3:1);while(g.xp>=g.xpNext){g.xp-=g.xpNext;g.lvl++;g.xpNext=xpFor(g.lvl);g.pend.push({title:'LEVEL '+g.lvl,minR:0});sfx('lvl');if(g.lvl%4===0)g.rerolls++;}}
function dropGem(x,y,v){if(G.gems.length>260){addXP(v);return;}G.gems.push({x:x,y:y,vx:rnd(-90,90),vy:rnd(-90,90),v:v,life:30});}
function lightning(e,power){
var hit=[e],cur=e,n=2+Math.floor(power),pts=[[e.x,e.y]];
for(var i=0;i<n;i++){var t=nearest(cur.x,cur.y,240,hit);if(!t)break;hit.push(t);pts.push([t.x,t.y]);dealDamage(t,G.stats.dmg*1.4*Math.max(1,power),false);cur=t;}
if(pts.length>1)G.bolts.push({pts:pts,life:0.18});
}
function kill(e){
if(e.dead)return;e.dead=true;var s=e.sp,g=G,st=g.stats;
burst(e.x,e.y,s.hue,e.boss?90:10+Math.floor(e.r),e.boss?380:220);sfx('kill');g.shake=Math.max(g.shake,e.boss?14:2);
if(!s.ast&&!s.wraith&&!e.boss&&!e.mini)g.stageKills++;
if(!s.ast){g.kills++;g.combo++;g.comboT=3;g.maxCombo=Math.max(g.maxCombo,g.combo);}
var mult=1+Math.min(4,Math.floor(g.combo/10)*0.25);g.score+=Math.round(10*s.xp*mult*(e.boss?25:1));
var val=Math.max(1,Math.round(s.xp*(1+0.1*g.stage))),n=e.boss?40:s.wraith?20:s.ast?2:e.r>20?2:1;
for(var i=0;i<n;i++)dropGem(e.x,e.y,e.boss?val:s.wraith?val*2:val);
if(Math.random()<(s.wraith?1:0.025))g.pu.push({x:e.x,y:e.y,kind:pick(['hp','bomb','over','mag']),life:20});
if(s.sp.split&&!e.mini)for(i=0;i<2;i++)spawnEnemy(s,e.x+rnd(-10,10),e.y+rnd(-10,10),{r:s.size*0.6,hp:e.maxhp*0.3,mini:true});
if(s.sp.explode){var d=hyp(g.p.x-e.x,g.p.y-e.y);explode(e.x,e.y,80,0,s.hue,false);if(d<80+10)hurt(s.dmg);for(i=0;i<8;i++)eb(e,i*TAU/8,150);}
if(st.chain>0)lightning(e,st.chain);
if(st.leech>0&&Math.random()<st.leech)heal(2+g.stage*0.2);
if(st.chrono>0&&Math.random()<st.chrono){g.tsT=1.2;}
if(e.boss){
g.bossAlive=false;g.eb.length=0;heal(g.p.maxhp*0.5);banner('GUARDIAN DESTROYED','a treasure drifts in the wreckage','#fd6',4);
g.pend.push({title:'BOSS REWARD',minR:2});g.stageKills=g.stageNeed=0;g.stageNeed=0;setTimeout(function(){},0);
}
}
function explode(x,y,rad,dmg,hue,clearB,skip){
for(var i=0;i<G.en.length;i++){var e=G.en[i];if(e.dead||e===skip)continue;if(dmg>0&&hyp(e.x-x,e.y-y)<rad+e.r)dealDamage(e,dmg,false);}
if(clearB)for(i=0;i<G.eb.length;i++)if(hyp(G.eb[i].x-x,G.eb[i].y-y)<rad)G.eb[i].dead=true;
G.rings.push({x:x,y:y,r:4,max:rad,hue:hue,life:0.35});burst(x,y,hue,12,200);if(rad>60)sfx('boom');
}
function hurt(d){
var P=G.p,st=G.stats;if(P.inv>0||G.p.dead)return;
d=Math.max(1,d);P.shT=3;
if(P.sh>0){var a=Math.min(P.sh,d);P.sh-=a;d-=a;}
P.inv=0.7;G.flash=0.25;G.shake=Math.max(G.shake,7);sfx('hurt');
if(d>0)P.hp-=d;
if(P.hp<=0){
if(st.revive>0){st.revive--;P.hp=P.maxhp*0.5;P.inv=2.5;explode(P.x,P.y,300,st.dmg*10,40,true);banner('PHOENIX CORE','you rise again','#fa4',3);}
else gameOver();
}
}
function gameOver(){G.p.dead=true;best=Math.max(best,G.score);burst(G.p.x,G.p.y,G.ship.hue,120,400);G.shake=20;sfx('boom');setTimeout(function(){if(state!=='play')return;state='over';showOver();},900);}
function startEvent(){
var opts=['asteroids','beacon','blackhole','wraith','ambush','crate'].filter(function(x){return x!==G.lastEv;});
if(G.stage<2)opts=['asteroids','crate','wraith'];var ev=pick(opts),P=G.p,a=rnd(0,TAU),p;
G.lastEv=ev;
if(ev==='asteroids'){G.astT=9;G.astDir=a;banner('ASTEROID SHOWER','shoot them for gems','#fb6',3);sfx('warn');}
else if(ev==='beacon'&&!G.bc){p=ringPos(rnd(500,750),a);G.bc={x:p[0],y:p[1],r:85,prog:0,life:50,guard:false};banner('DERELICT BEACON','hold position inside the ring - but something guards it','#6fd',4);}
else if(ev==='blackhole'&&!G.bh){p=ringPos(rnd(380,520),a);G.bh={x:p[0],y:p[1],life:16,rot:0};banner('SINGULARITY','don\'t get too close... or lure enemies in','#a6f',4);sfx('warn');}
else if(ev==='wraith'){p=ringPos(hyp(W,H)/2+60,a);spawnEnemy(WRSP,p[0],p[1],{life:16,hp:40*hpScale()*1.5});banner('TREASURE WRAITH','catch it before it flees','#fd4',3);}
else if(ev==='ambush'){var s=G.sector.species[0];for(var i=0;i<14;i++){p=ringPos(380,i*TAU/14);spawnEnemy(s,p[0],p[1]);}banner('AMBUSH','surrounded!','#f66',2.5);sfx('warn');}
else{p=ringPos(rnd(260,420),a);G.pu.push({x:p[0],y:p[1],kind:'crate',life:40});banner('SUPPLY DROP','grab the crate','#6fa',3);}
}
function givePickup(u){
var P=G.p;sfx('lvl');
if(u.kind==='hp')heal(P.maxhp*0.3);
else if(u.kind==='bomb'){explode(P.x,P.y,400,G.stats.dmg*8,20,true);G.shake=14;}
else if(u.kind==='over'){P.over=8;toast('OVERDRIVE','#fd4');}
else if(u.kind==='mag'){G.magAll=3;toast('MAGNET','#6af');}
else{for(var i=0;i<12;i++)dropGem(P.x,P.y,Math.ceil(G.stage*0.8)+1);G.pu.push({x:P.x+rnd(-60,60),y:P.y+rnd(-60,60),kind:pick(['hp','over','bomb','mag']),life:20});if(Math.random()<0.25)G.pend.push({title:'CRATE UPGRADE',minR:1});}
}
function sweep(a){var j=0;for(var i=0;i<a.length;i++)if(!a[i].dead)a[j++]=a[i];a.length=j;}
function inputVec(){
var ix=(down('d')||down('arrowright')?1:0)-(down('a')||down('arrowleft')?1:0),iy=(down('s')||down('arrowdown')?1:0)-(down('w')||down('arrowup')?1:0);
if(stick.id!==null){ix=stick.x;iy=stick.y;}var l=hyp(ix,iy);if(l>1){ix/=l;iy/=l;}return[ix,iy];
}
function playerFire(x,y,a,mul){
var st=G.stats,crit=Math.random()<st.crit;
G.bl.push({x:x,y:y,vx:Math.cos(a)*st.bspd,vy:Math.sin(a)*st.bspd,r:4*st.bsize,dmg:st.dmg*mul,crit:crit,pierce:st.pierce,p0:st.pierce,bounce:st.bounce,home:st.homing,boom:st.boom,life:1.25,hit:[],dead:false});
}
function endBullet(b){if(b.dead)return;b.dead=true;if(G.syn.railgun&&b.p0>0)explode(b.x,b.y,(b.boom||30)+40,b.dmg*1.5,190,false);}
function hitEnemy(b,e){
var st=G.stats,d=b.dmg*(b.crit?st.critMul:1);b.hit.push(e);dealDamage(e,d,b.crit);sfx('hit');burst(b.x,b.y,e.sp.hue,2,120);
if(st.burn>0){e.burn=3;e.burnDps=st.dmg*0.3*st.burn;}
if(st.freeze>0&&Math.random()<st.freeze)e.freeze=1.2;
if(b.crit&&G.syn.bloodlust)heal(1);
if(b.boom>0)explode(b.x,b.y,b.boom+25,d*0.5,30,false,e);
if(b.pierce>0){b.pierce--;return;}
if(b.bounce>0){var t=nearest(b.x,b.y,420,b.hit);if(t){b.bounce--;var a=Math.atan2(t.y-b.y,t.x-b.x),sp=hyp(b.vx,b.vy);b.vx=Math.cos(a)*sp;b.vy=Math.sin(a)*sp;if(G.syn.pinball)b.dmg*=1.3;b.life=Math.max(b.life,0.6);return;}}
endBullet(b);
}
function steer(e,dt){
var s=e.sp,P=G.p,dx=P.x-e.x,dy=P.y-e.y,d=hyp(dx,dy)||1,ux=dx/d,uy=dy/d,px=-uy,py=ux,tx=0,ty=0,sp=s.spd*e.speedMul*(e.freeze>0?0.25:1);
switch(s.beh){
case 'chase':case 'swarm':tx=ux;ty=uy;break;
case 'orbit':{var k=clamp((d-(230+e.seed*120))/100,-1,1);tx=ux*k+px*e.dir*0.9;ty=uy*k+py*e.dir*0.9;break;}
case 'zig':{var w=Math.sin(e.t*3+e.seed*6);tx=ux+px*w*1.2;ty=uy+py*w*1.2;break;}
case 'weave':{var w2=Math.sin(e.t*1.7+e.seed*6)*1.6;tx=ux*0.6+px*w2;ty=uy*0.6+py*w2;break;}
case 'sniper':{var k2=clamp((d-380)/80,-1,1);tx=ux*k2+px*e.dir*0.5;ty=uy*k2+py*e.dir*0.5;break;}
case 'dash':
if(e.dashT>0){e.dashT-=dt;sp*=3.6;tx=e.dvx;ty=e.dvy;}
else{e.cd-=dt;if(e.cd<0.8){e.tele=true;sp*=0.15;tx=ux;ty=uy;if(e.cd<=0){e.tele=false;e.dashT=0.5;e.dvx=ux;e.dvy=uy;e.cd=rnd(2,3.5);}}else{tx=ux;ty=uy;}}
break;
case 'flee':{var k3=d<500?-1:0;tx=ux*k3+px*Math.sin(e.t*2)*0.8;ty=uy*k3+py*Math.sin(e.t*2)*0.8;break;}
case 'drift':return;
}
var a=Math.min(1,dt*3);e.vx+=(tx*sp-e.vx)*a;e.vy+=(ty*sp-e.vy)*a;
}
function enemyShoot(e,dt){
var s=e.sp;if(s.wep==='none'||e.freeze>0||e.cloak>0)return;e.fireT-=dt*(G.mut==='storm'?1.3:1);if(e.fireT>0)return;
var d=hyp(G.p.x-e.x,G.p.y-e.y);if(d>720){e.fireT=0.3;return;}
var a=aimAt(e),sp=s.bspd,i;
switch(s.wep){
case 'aim':eb(e,a,sp);e.fireT=s.rate;break;
case 'tri':for(i=-1;i<=1;i++)eb(e,a+i*0.28,sp);e.fireT=s.rate*1.2;break;
case 'ring':for(i=0;i<10;i++)eb(e,e.ang+i*TAU/10,sp*0.8);e.fireT=s.rate*1.8;break;
case 'spiral':e.sp2=(e.sp2||0)+0.55;e.n=(e.n||0)+1;eb(e,e.sp2,sp*0.9);e.fireT=e.n%14===0?s.rate*2:0.12;break;
case 'burst':for(i=0;i<3;i++)eb(e,a,sp*(1-i*0.15));e.fireT=s.rate*1.3;break;
case 'cross':for(i=0;i<4;i++)eb(e,e.ang+i*TAU/4,sp*0.9);e.fireT=s.rate*0.6;break;
}
}
function update(dt0){
var g=G,P=g.p,st=g.stats,i,j,e,b;
if(g.tsT>0){g.tsT-=dt0;g.ts+=(0.4-g.ts)*Math.min(1,dt0*8);}else g.ts+=(1-g.ts)*Math.min(1,dt0*3);
var dt=dt0*g.ts;g.t+=dt;
if(g.banner){g.banner.t-=dt0;if(g.banner.t<=0)g.banner=null;}
for(i=g.toasts.length-1;i>=0;i--){g.toasts[i].t-=dt0;if(g.toasts[i].t<=0)g.toasts.splice(i,1);}
g.shake*=Math.pow(0.02,dt0);g.flash=Math.max(0,g.flash-dt0);g.bgHue+=angDiff(g.sector.hue,g.bgHue)*dt0*0.5;g.bgHue=(g.bgHue+360)%360;
if(g.comboT>0){g.comboT-=dt;if(g.comboT<=0)g.combo=0;}
if(P.dead){updateFx(dt);sweep(g.en);return;}
var iv=inputVec(),spd=st.spd,acc=g.mut==='ice'?2.2:12,sdt=dt;
if(dashBuf>0){dashBuf-=dt0;if(P.dashCd<=0&&P.dashT<=0){dashBuf=0;var dl=hyp(iv[0],iv[1]),dx=dl>0.1?iv[0]/dl:Math.cos(P.ang),dy=dl>0.1?iv[1]/dl:Math.sin(P.ang);
P.dashT=0.2;P.dvx=dx;P.dvy=dy;P.inv=Math.max(P.inv,0.35);P.dashCd=st.dashCd;P.hitMap=[];sfx('dash');if(g.syn.timelord)g.tsT=1.2;}}
P.dashCd-=dt;P.inv-=dt;
if(P.dashT>0){P.dashT-=dt;P.vx=P.dvx*820;P.vy=P.dvy*820;if(g.stats.dashDmg>0)for(i=0;i<g.en.length;i++){e=g.en[i];if(!e.dead&&P.hitMap.indexOf(e)<0&&hyp(e.x-P.x,e.y-P.y)<e.r+22){P.hitMap.push(e);dealDamage(e,st.dmg*3*st.dashDmg,false);}}
if(g.parts.length<700)g.parts.push({x:P.x,y:P.y,vx:0,vy:0,life:0.3,max:0.3,hue:g.ship.hue,sz:5});}
else{var ta=Math.min(1,acc*dt);P.vx+=(iv[0]*spd-P.vx)*ta;P.vy+=(iv[1]*spd-P.vy)*ta;}
P.x+=P.vx*dt;P.y+=P.vy*dt;
var useMouse=!touchMode&&!autoAim&&mouse.has&&performance.now()-mouse.t<6000,tgt=nearest(P.x,P.y,760);
if(useMouse)P.ang=Math.atan2(mouse.y-H/2+g.cam.y-P.y,mouse.x-W/2+g.cam.x-P.x);
else if(tgt)P.ang=Math.atan2(tgt.y-P.y,tgt.x-P.x);
else if(hyp(iv[0],iv[1])>0.2)P.ang=Math.atan2(iv[1],iv[0]);
g.cam.x+=(P.x+P.vx*0.2-g.cam.x)*Math.min(1,dt0*6);g.cam.y+=(P.y+P.vy*0.2-g.cam.y)*Math.min(1,dt0*6);
P.over=Math.max(0,P.over-dt);P.fireT-=dt;
var rate=st.rate*(1+st.berserk*0.9*(1-P.hp/P.maxhp))*(P.over>0?1.8:1);
if(P.fireT<=0&&P.dashT<=0){
P.fireT=1/rate;var n=st.shots,ca=Math.cos(P.ang),sa=Math.sin(P.ang);
for(i=0;i<n;i++)playerFire(P.x+ca*14,P.y+sa*14,P.ang+(n===1?0:(i-(n-1)/2)*st.spread)+rnd(-st.inacc,st.inacc),1);
for(i=0;i<st.rear;i++)playerFire(P.x-ca*10,P.y-sa*10,P.ang+Math.PI+(i-(st.rear-1)/2)*0.28,0.7);
sfx('shot');
}
P.hp=Math.min(P.maxhp,P.hp+st.regen*dt);
P.shT-=dt;if(P.shT<=0&&P.sh<st.shieldMax)P.sh=Math.min(st.shieldMax,P.sh+st.shieldMax*0.15*dt);
g.orbA+=dt*(g.syn.bladestorm?5:3);var br=g.syn.bladestorm?14:9,orr=g.syn.bladestorm?72:52;
for(i=0;i<st.orbit;i++){var oa=g.orbA+i*TAU/st.orbit,bx=P.x+Math.cos(oa)*orr,by=P.y+Math.sin(oa)*orr;
for(j=0;j<g.en.length;j++){e=g.en[j];if(!e.dead&&e.blT<=0&&!e.sp.wraith&&hyp(e.x-bx,e.y-by)<e.r+br){dealDamage(e,st.dmg*1.5*(g.syn.bladestorm?1.6:1),false);e.blT=0.3;}}
for(j=0;j<g.eb.length;j++)if(hyp(g.eb[j].x-bx,g.eb[j].y-by)<br+5)g.eb[j].dead=true;}
g.droneA+=dt*1.6;g.droneT-=dt;
if(st.drone>0&&g.droneT<=0){g.droneT=0.7/Math.sqrt(st.rate/3);var dn=g.syn.swarm?st.shots:1;
for(i=0;i<st.drone;i++){var da=g.droneA+i*TAU/st.drone,dx2=P.x+Math.cos(da)*80,dy2=P.y+Math.sin(da)*80,tt=nearest(dx2,dy2,600);if(tt){var aa=Math.atan2(tt.y-dy2,tt.x-dx2);for(j=0;j<dn;j++)playerFire(dx2,dy2,aa+(dn===1?0:(j-(dn-1)/2)*st.spread),0.6);}}}
if(st.mines>0&&hyp(P.vx,P.vy)>40){P.mineT-=dt;if(P.mineT<=0&&g.mines.length<14){g.mines.push({x:P.x,y:P.y,t:0,life:22,dead:false});P.mineT=Math.max(0.5,2.2/(1+st.mines));}}
for(i=0;i<g.mines.length;i++){var m=g.mines[i];m.t+=dt;m.life-=dt;if(m.life<=0)m.dead=true;
if(m.t>0.6&&!m.dead)for(j=0;j<g.en.length;j++){e=g.en[j];if(!e.dead&&hyp(e.x-m.x,e.y-m.y)<e.r+34){m.dead=true;explode(m.x,m.y,95,st.dmg*4,160,false);
if(g.syn.frostmine)for(var q=0;q<g.en.length;q++)if(hyp(g.en[q].x-m.x,g.en[q].y-m.y)<150)g.en[q].freeze=2;break;}}}
if(st.nova>0){P.novaT-=dt;if(P.novaT<=0){P.novaT=Math.max(2.5,7-st.nova);var nr=170+st.nova*20;explode(P.x,P.y,nr,st.dmg*3,200,true);
if(g.syn.stormcoil){var ex=[],cur;for(i=0;i<3;i++){cur=nearest(P.x,P.y,600,ex);if(cur){ex.push(cur);lightning(cur,2);}}}}}
for(i=0;i<g.bl.length;i++){b=g.bl[i];if(b.dead)continue;
if(b.home>0){var tg=nearest(b.x,b.y,320,b.hit);if(tg){var ca2=Math.atan2(b.vy,b.vx),da2=angDiff(Math.atan2(tg.y-b.y,tg.x-b.x),ca2),sp2=hyp(b.vx,b.vy);ca2+=clamp(da2,-b.home*5*dt,b.home*5*dt);b.vx=Math.cos(ca2)*sp2;b.vy=Math.sin(ca2)*sp2;}}
if(g.bh){var bx2=g.bh.x-b.x,by2=g.bh.y-b.y,bd=hyp(bx2,by2);if(bd<380){b.vx+=bx2/bd*900*dt;b.vy+=by2/bd*900*dt;}}
b.x+=b.vx*dt;b.y+=b.vy*dt;b.life-=dt;if(b.life<=0){endBullet(b);continue;}
for(j=0;j<g.en.length;j++){e=g.en[j];if(e.dead||e.cloak>0||b.hit.indexOf(e)>=0)continue;var rr=e.r+b.r;if((e.x-b.x)*(e.x-b.x)+(e.y-b.y)*(e.y-b.y)<rr*rr){hitEnemy(b,e);if(b.dead)break;}}}
for(i=0;i<g.en.length;i++){e=g.en[i];if(e.dead)continue;var s=e.sp;e.t+=dt;e.flash-=dt;e.blT-=dt;e.ang+=s.spin*dt*(e.freeze>0?0.2:1);
if(e.burn>0){e.burn-=dt;dealDamage(e,e.burnDps*dt,false);if(e.dead)continue;}if(e.freeze>0)e.freeze-=dt;
if(s.sp.regen)e.hp=Math.min(e.maxhp,e.hp+e.maxhp*0.04*dt);
if(s.sp.enrage&&!e.enr&&e.hp<e.maxhp*0.5){e.enr=true;e.speedMul*=1.5;}
if(s.sp.cloak){e.cloakT-=dt;if(e.cloakT<=0){e.cloak=e.cloak>0?0:1.2;e.cloakT=e.cloak>0?1.2:2.5;}}
if(s.sp.summon){e.cd-=dt;if(e.cd<=0&&g.en.length<70){e.cd=rnd(5,8);spawnEnemy(g.sector.species[g.sector.species.length-1],e.x,e.y,{mini:true});}}
if(e.boss)updateBoss(e,dt);else{steer(e,dt);enemyShoot(e,dt);}
if(g.bh){var hx=g.bh.x-e.x,hy=g.bh.y-e.y,hd=hyp(hx,hy);if(hd<420&&!e.boss){e.vx+=hx/hd*500*dt;e.vy+=hy/hd*500*dt;}if(hd<34&&!e.boss){e.dead=true;for(j=0;j<3;j++)dropGem(g.bh.x,g.bh.y,e.sp.xp+1);burst(e.x,e.y,280,8);if(!s.ast)g.kills++;continue;}}
e.x+=e.vx*dt;e.y+=e.vy*dt;
if(e.life>0||s.wraith){e.life-=dt;if(e.life<=0){e.dead=true;toast('the wraith escaped...','#fd4');continue;}}
var pd=hyp(P.x-e.x,P.y-e.y);if(pd>1700&&!e.boss){e.dead=true;continue;}
for(j=i+1;j<g.en.length;j++){var o=g.en[j];if(o.dead||o.boss!==e.boss)continue;var ox=o.x-e.x,oy=o.y-e.y,od=hyp(ox,oy),mn=(e.r+o.r)*0.8;if(od<mn&&od>0.01){var pu=(mn-od)*0.5/od;if(e.boss)continue;e.x-=ox*pu;e.y-=oy*pu;o.x+=ox*pu;o.y+=oy*pu;}}
if(pd<e.r+10&&!e.cloak&&s.dmg>0&&P.dashT<=0){
if(st.thorns>0&&e.blT<=0){dealDamage(e,st.dmg*3*st.thorns,false);e.blT=0.4;}
if(P.inv<=0){hurt(s.dmg);var kx=(P.x-e.x)/(pd||1),ky=(P.y-e.y)/(pd||1);P.vx+=kx*300;P.vy+=ky*300;if(!e.boss){e.vx-=kx*200;e.vy-=ky*200;}if(s.sp.explode)kill(e);}
}
}
sweep(g.en);
for(i=0;i<g.eb.length;i++){b=g.eb[i];if(b.dead)continue;b.x+=b.vx*dt;b.y+=b.vy*dt;b.life-=dt;if(b.life<=0){b.dead=true;continue;}
if(g.bh){var bx3=g.bh.x-b.x,by3=g.bh.y-b.y,bd3=hyp(bx3,by3);if(bd3<380){b.vx+=bx3/bd3*700*dt;b.vy+=by3/bd3*700*dt;}if(bd3<30){b.dead=true;continue;}}
if(P.dashT<=0&&(P.x-b.x)*(P.x-b.x)+(P.y-b.y)*(P.y-b.y)<13*13&&P.inv<=0){b.dead=true;hurt(b.dmg);}}
sweep(g.bl);sweep(g.eb);sweep(g.mines);
g.magAll=Math.max(0,g.magAll-dt);
for(i=0;i<g.gems.length;i++){var gm=g.gems[i];gm.life-=dt;gm.x+=gm.vx*dt;gm.y+=gm.vy*dt;gm.vx*=Math.pow(0.05,dt);gm.vy*=Math.pow(0.05,dt);var gd=hyp(P.x-gm.x,P.y-gm.y);
if(gd<st.magnet||g.magAll>0){var pull=520*dt;gm.x+=(P.x-gm.x)/(gd||1)*pull;gm.y+=(P.y-gm.y)/(gd||1)*pull;}
if(gd<16){addXP(gm.v);gm.dead=true;sfx('gem');}else if(gm.life<=0)gm.dead=true;}
sweep(g.gems);
for(i=0;i<g.pu.length;i++){var u=g.pu[i];u.life-=dt;var ud=hyp(P.x-u.x,P.y-u.y);if(ud<(u.kind==='crate'?34:22)){u.dead=true;givePickup(u);}else if(u.life<=0)u.dead=true;}
sweep(g.pu);
if(g.bossT>0){g.bossT-=dt;if(g.bossT<=0)spawnBoss();}
if(g.stage%5===0&&!g.bossAlive&&g.bossT<=0&&g.stageNeed===0)nextStage();
else if(g.stage%5!==0&&g.stageKills>=g.stageNeed)nextStage();
g.spawnT-=dt;
if(g.spawnT<=0){var cap=Math.min(70,12+g.stage*5)*(g.mut==='dense'?1.5:1);if(g.en.length<cap&&g.bossT<=0||g.bossAlive&&g.en.length<14)spawnGroup();g.spawnT=rnd(1.1,2.3)/(1+g.stage*0.07)*(g.mut==='dense'?0.7:1)*(g.bossAlive?2.5:1);}
g.evT-=dt;if(g.evT<=0&&!g.bossAlive&&g.bossT<=0){startEvent();g.evT=rnd(28,45);}
if(g.astT>0){g.astT-=dt;g.crate-=dt;if(g.crate<=0){g.crate=0.45;var aa2=g.astDir+rnd(-0.6,0.6),ap=ringPos(hyp(W,H)/2+60,aa2),sz=rnd(14,34),sp3=rnd(120,210),ta2=aa2+Math.PI+rnd(-0.35,0.35);
spawnEnemy(ASTSP,ap[0],ap[1],{r:sz,hp:sz*1.3*hpScale(),vx:Math.cos(ta2)*sp3,vy:Math.sin(ta2)*sp3,life:14});}}
if(g.bh){var h=g.bh;h.life-=dt;h.rot+=dt;var hx2=h.x-P.x,hy2=h.y-P.y,hd2=hyp(hx2,hy2);if(hd2<420){P.vx+=hx2/hd2*420*dt*(1-hd2/420);P.vy+=hy2/hd2*420*dt*(1-hd2/420);}if(hd2<36&&P.dashT<=0){hurt(15);P.vx-=hx2/hd2*500;P.vy-=hy2/hd2*500;}if(h.life<=0){explode(h.x,h.y,220,0,280,false);for(i=0;i<25;i++)dropGem(h.x,h.y,2);g.bh=null;}}
if(g.bc){var c=g.bc;c.life-=dt;var cd=hyp(P.x-c.x,P.y-c.y);
if(cd<c.r){c.prog+=dt/4;if(c.prog>0.12&&!c.guard){c.guard=true;banner('GUARDIANS!','defend the beacon','#f66',2.5);sfx('warn');var gs=g.sector.species[g.sector.species.length-1];for(i=0;i<9;i++){var gp=[c.x+Math.cos(i*TAU/9)*330,c.y+Math.sin(i*TAU/9)*330];spawnEnemy(gs,gp[0],gp[1]);}}}
else c.prog=Math.max(0,c.prog-dt*0.3);
if(c.prog>=1){g.bc=null;banner('BEACON DECODED','reward unlocked','#6fd',3);if(Math.random()<0.6)g.pend.push({title:'BEACON REWARD',minR:1});else{P.hp=P.maxhp;P.sh=st.shieldMax;for(i=0;i<25;i++)dropGem(c.x,c.y,g.stage+1);}}
else if(c.life<=0)g.bc=null;}
if(st.mines===0)P.mineT=1;
music(dt0);updateFx(dt);
}
function updateFx(dt){
var g=G,i;for(i=0;i<g.parts.length;i++){var p=g.parts[i];p.life-=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.vx*=Math.pow(0.1,dt);p.vy*=Math.pow(0.1,dt);if(p.life<=0)p.dead=true;}sweep(g.parts);
for(i=0;i<g.txt.length;i++){var t=g.txt[i];t.life-=dt;t.y-=40*dt;if(t.life<=0)t.dead=true;}sweep(g.txt);
for(i=0;i<g.rings.length;i++){var r=g.rings[i];r.life-=dt;r.r+=(r.max-r.r)*Math.min(1,dt*12);if(r.life<=0)r.dead=true;}sweep(g.rings);
for(i=0;i<g.bolts.length;i++){g.bolts[i].life-=dt;if(g.bolts[i].life<=0)g.bolts[i].dead=true;}sweep(g.bolts);
}
function hsl(h,s,l,a){return 'hsla('+Math.round(h)+','+s+'%,'+l+'%,'+(a===undefined?1:a)+')';}
function poly(n,r){ctx.beginPath();for(var i=0;i<n;i++){var a=i*TAU/n;if(i)ctx.lineTo(Math.cos(a)*r,Math.sin(a)*r);else ctx.moveTo(r,0);}ctx.closePath();}
function txt(s,x,y,size,col,al){ctx.font=Math.round(size*S)+'px ui-monospace,Menlo,Consolas,monospace';ctx.fillStyle=col;ctx.textAlign=al||'left';ctx.fillText(s,x,y);}
function drawBg(cx,cy,hue){
ctx.fillStyle=hsl(hue,40,4);ctx.fillRect(0,0,W,H);ctx.globalCompositeOperation='lighter';
var cell=700,par=0.1,ox=cx*par,oy=cy*par,gx,gy;
for(gx=Math.floor((ox-W/2-cell)/cell);gx<=Math.floor((ox+W/2+cell)/cell);gx++)for(gy=Math.floor((oy-H/2-cell)/cell);gy<=Math.floor((oy+H/2+cell)/cell);gy++){
if(hash(gx,gy,3)<0.4)continue;var px=(gx+hash(gx,gy,4))*cell-ox+W/2,py=(gy+hash(gx,gy,5))*cell-oy+H/2,rr=250+hash(gx,gy,6)*250,gr=ctx.createRadialGradient(px,py,0,px,py,rr);
gr.addColorStop(0,hsl(hue+hash(gx,gy,8)*70,70,35,0.14));gr.addColorStop(1,hsl(hue,70,30,0));ctx.fillStyle=gr;ctx.fillRect(px-rr,py-rr,rr*2,rr*2);}
ctx.globalCompositeOperation='source-over';
for(var L=0;L<3;L++){var pr=[0.15,0.35,0.65][L],c=[140,110,90][L],sx=cx*pr,sy=cy*pr;
for(gx=Math.floor((sx-W/2)/c);gx<=Math.floor((sx+W/2)/c);gx++)for(gy=Math.floor((sy-H/2)/c);gy<=Math.floor((sy+H/2)/c);gy++){
if(hash(gx,gy,L+1)<0.5)continue;var x=(gx+hash(gx,gy,7))*c-sx+W/2,y=(gy+hash(gx,gy,9))*c-sy+H/2,bb=0.3+hash(gx,gy,11)*0.7;
ctx.fillStyle='rgba(210,225,255,'+(bb*(0.35+L*0.25)).toFixed(2)+')';ctx.fillRect(x,y,1+L*0.6,1+L*0.6);}}
}
function drawEnemy(e){
var s=e.sp,col=hsl(s.hue,85,e.flash>0?92:60),r=e.r;ctx.save();ctx.translate(e.x,e.y);ctx.globalAlpha=e.cloak>0?0.15:1;ctx.rotate(e.ang);
poly(s.sides,r);ctx.fillStyle='rgba(8,10,22,.8)';ctx.fill();ctx.lineWidth=5;ctx.strokeStyle=hsl(s.hue,85,60,0.2);ctx.stroke();ctx.lineWidth=2;ctx.strokeStyle=e.tele?'#fff':e.freeze>0?'#9ef':col;ctx.stroke();
if(s.sp.armor){poly(s.sides,r+4);ctx.lineWidth=1;ctx.setLineDash([4,4]);ctx.stroke();ctx.setLineDash([]);}
if(s.sp.split){poly(s.sides,r*0.55);ctx.lineWidth=1;ctx.stroke();}
ctx.fillStyle=s.sp.explode?(Math.sin(e.t*12)>0?'#f64':'#a31'):col;
if(s.core===0){ctx.beginPath();ctx.arc(0,0,r*0.25,0,TAU);ctx.fill();}else if(s.core===1){ctx.fillRect(-r*0.5,-1,r,2);ctx.fillRect(-1,-r*0.5,2,r);}else{poly(3,r*0.35);ctx.fill();}
if(s.sp.regen){ctx.fillStyle='#6f8';ctx.fillRect(-2,-2,4,4);}if(s.sp.summon){ctx.beginPath();ctx.arc(0,0,r*0.7,0,TAU);ctx.lineWidth=1;ctx.stroke();}
ctx.restore();
if(e.hp<e.maxhp&&r>15&&!e.boss){ctx.fillStyle='rgba(0,0,0,.6)';ctx.fillRect(e.x-r,e.y-r-8,r*2,3);ctx.fillStyle=col;ctx.fillRect(e.x-r,e.y-r-8,r*2*clamp(e.hp/e.maxhp,0,1),3);}
}
function drawBoss(e){
var s=e.sp,col=hsl(s.hue,85,e.flash>0?92:60),r=e.r;ctx.save();ctx.translate(e.x,e.y);
ctx.rotate(e.ang);poly(s.sides,r);ctx.fillStyle='rgba(8,10,22,.85)';ctx.fill();ctx.lineWidth=6;ctx.strokeStyle=hsl(s.hue,85,60,0.25);ctx.stroke();ctx.lineWidth=2.5;ctx.strokeStyle=col;ctx.stroke();
ctx.rotate(-e.ang*2);poly(s.sides,r*0.6);ctx.lineWidth=1.5;ctx.stroke();ctx.rotate(e.ang*2+e.t);
for(var i=0;i<4;i++){ctx.save();ctx.rotate(i*TAU/4);ctx.beginPath();ctx.arc(r*0.8,0,7,0,TAU);ctx.fillStyle=col;ctx.fill();ctx.restore();}
ctx.restore();
}
function drawPlayer(){
var P=G.p,sh=G.ship;if(P.dead)return;if(P.inv>0&&Math.floor(G.t*20)%2===0)return;
ctx.save();ctx.translate(P.x,P.y);ctx.rotate(P.ang);var sc=15,col=hsl(sh.hue,90,62),i;
if(hyp(P.vx,P.vy)>30){ctx.fillStyle=hsl(sh.hue+40,100,70,0.8);ctx.beginPath();ctx.moveTo(-sc*0.6,-4);ctx.lineTo(-sc*(1+Math.random()*0.6),0);ctx.lineTo(-sc*0.6,4);ctx.fill();}
ctx.beginPath();for(i=0;i<sh.pts.length;i++)ctx.lineTo(sh.pts[i][0]*sc,sh.pts[i][1]*sc);for(i=sh.pts.length-1;i>=0;i--)ctx.lineTo(sh.pts[i][0]*sc,-sh.pts[i][1]*sc);ctx.closePath();
ctx.fillStyle='rgba(8,12,26,.9)';ctx.fill();ctx.lineWidth=5;ctx.strokeStyle=hsl(sh.hue,90,62,0.22);ctx.stroke();ctx.lineWidth=2;ctx.strokeStyle=col;ctx.stroke();
if(sh.pod){ctx.fillStyle=col;ctx.fillRect(sh.podX*sc-3,sh.podY*sc-2,6,4);ctx.fillRect(sh.podX*sc-3,-sh.podY*sc-2,6,4);}
ctx.beginPath();ctx.arc(2,0,3,0,TAU);ctx.fillStyle='#fff';ctx.fill();ctx.restore();
if(P.sh>0){ctx.beginPath();ctx.arc(P.x,P.y,26,0,TAU);ctx.strokeStyle='rgba(120,220,255,'+(0.2+0.5*P.sh/G.stats.shieldMax)+')';ctx.lineWidth=2;ctx.stroke();}
if(P.over>0){ctx.beginPath();ctx.arc(P.x,P.y,22,0,TAU);ctx.strokeStyle='rgba(255,220,80,.5)';ctx.lineWidth=1.5;ctx.stroke();}
}
function drawArrow(x,y,col,label){
var sx=x-G.cam.x+W/2,sy=y-G.cam.y+H/2,m=26;if(sx>m&&sx<W-m&&sy>m&&sy<H-m)return;
var dx=sx-W/2,dy=sy-H/2,k=Math.min((W/2-m)/Math.abs(dx||1e-6),(H/2-m)/Math.abs(dy||1e-6)),ax=W/2+dx*k,ay=H/2+dy*k,a=Math.atan2(dy,dx);
ctx.save();ctx.translate(ax,ay);ctx.rotate(a);ctx.fillStyle=col;ctx.beginPath();ctx.moveTo(10,0);ctx.lineTo(-6,-7);ctx.lineTo(-6,7);ctx.fill();ctx.restore();txt(label,clamp(ax,30,W-30),ay<H/2?ay+20:ay-12,10,col,'center');
}
function render(){
ctx.setTransform(DPR,0,0,DPR,0,0);
if(!G){drawBg(tcam.x,tcam.y,210);return;}
var g=G,P=g.p,i,j,sx=(Math.random()-0.5)*g.shake,sy=(Math.random()-0.5)*g.shake;
drawBg(g.cam.x,g.cam.y,g.bgHue);
ctx.setTransform(DPR,0,0,DPR,(W/2-g.cam.x+sx)*DPR,(H/2-g.cam.y+sy)*DPR);
var x0=g.cam.x-W/2-80,x1=g.cam.x+W/2+80,y0=g.cam.y-H/2-80,y1=g.cam.y+H/2+80;
if(g.bh){var h=g.bh;ctx.save();ctx.translate(h.x,h.y);ctx.globalCompositeOperation='lighter';for(i=0;i<4;i++){ctx.rotate(h.rot*(1+i*0.4));ctx.beginPath();ctx.ellipse(0,0,40+i*26,14+i*8,0,0,TAU);ctx.strokeStyle=hsl(280+i*20,90,60,0.35-i*0.06);ctx.lineWidth=2;ctx.stroke();}ctx.restore();ctx.beginPath();ctx.arc(h.x,h.y,24,0,TAU);ctx.fillStyle='#000';ctx.fill();ctx.strokeStyle='#c8f';ctx.lineWidth=2;ctx.stroke();}
if(g.bc){var c=g.bc;ctx.beginPath();ctx.arc(c.x,c.y,c.r,0,TAU);ctx.strokeStyle=hsl(160,80,60,0.6);ctx.lineWidth=2;ctx.setLineDash([8,8]);ctx.stroke();ctx.setLineDash([]);ctx.beginPath();ctx.arc(c.x,c.y,c.r,-Math.PI/2,-Math.PI/2+TAU*c.prog);ctx.lineWidth=6;ctx.strokeStyle=hsl(160,90,65);ctx.stroke();poly(4,12);ctx.save();ctx.translate(c.x,c.y);ctx.rotate(g.t);poly(4,12);ctx.strokeStyle='#6fd';ctx.lineWidth=2;ctx.stroke();ctx.restore();}
for(i=0;i<g.mines.length;i++){var m=g.mines[i];ctx.beginPath();ctx.arc(m.x,m.y,6,0,TAU);ctx.strokeStyle=m.t>0.6?(Math.sin(g.t*8)>0?'#f64':'#a42'):'#777';ctx.lineWidth=2;ctx.stroke();}
for(i=0;i<g.rings.length;i++){var rg=g.rings[i];ctx.beginPath();ctx.arc(rg.x,rg.y,rg.r,0,TAU);ctx.strokeStyle=hsl(rg.hue,90,65,rg.life/0.35);ctx.lineWidth=3;ctx.stroke();}
ctx.globalCompositeOperation='lighter';
for(i=0;i<g.gems.length;i++){var gm=g.gems[i];if(gm.x<x0||gm.x>x1||gm.y<y0||gm.y>y1)continue;ctx.fillStyle=gm.v>4?'#fd6':gm.v>2?'#6fd':'#5af';ctx.save();ctx.translate(gm.x,gm.y);ctx.rotate(g.t*3);ctx.fillRect(-2.5,-2.5,5,5);ctx.restore();}
for(i=0;i<g.pu.length;i++){var u=g.pu[i],pcol={hp:'#6f8',bomb:'#f64',over:'#fd4',mag:'#6af',crate:'#fd6'}[u.kind],rr=u.kind==='crate'?16:10;ctx.strokeStyle=pcol;ctx.lineWidth=2;ctx.beginPath();ctx.arc(u.x,u.y,rr+Math.sin(g.t*5)*2,0,TAU);ctx.stroke();txt({hp:'+',bomb:'*',over:'»',mag:'M',crate:'?'}[u.kind],u.x,u.y+5,14,pcol,'center');}
ctx.globalCompositeOperation='source-over';
for(i=0;i<g.en.length;i++){var e=g.en[i];if(e.x<x0-60||e.x>x1+60||e.y<y0-60||e.y>y1+60)continue;if(e.boss)drawBoss(e);else drawEnemy(e);}
ctx.globalCompositeOperation='lighter';
ctx.lineWidth=2;ctx.lineCap='round';
for(i=0;i<g.eb.length;i++){var b=g.eb[i];ctx.fillStyle=hsl(b.hue,90,65,0.3);ctx.beginPath();ctx.arc(b.x,b.y,b.r+3,0,TAU);ctx.fill();ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(b.x,b.y,b.r-1.5,0,TAU);ctx.fill();}
for(i=0;i<g.bl.length;i++){var pb=g.bl[i];ctx.strokeStyle=pb.crit?'#ffd34d':hsl(g.ship.hue,100,75);ctx.lineWidth=pb.r*1.6;ctx.beginPath();ctx.moveTo(pb.x,pb.y);ctx.lineTo(pb.x-pb.vx*0.03,pb.y-pb.vy*0.03);ctx.stroke();}
for(i=0;i<g.parts.length;i++){var p=g.parts[i];ctx.fillStyle=hsl(p.hue,90,65,clamp(p.life/p.max,0,1));ctx.fillRect(p.x-p.sz/2,p.y-p.sz/2,p.sz,p.sz);}
for(i=0;i<g.bolts.length;i++){var bo=g.bolts[i];ctx.strokeStyle='#9cf';ctx.lineWidth=2;ctx.beginPath();for(j=0;j<bo.pts.length;j++){var q=bo.pts[j];if(j)ctx.lineTo(q[0]+rnd(-6,6),q[1]+rnd(-6,6));else ctx.moveTo(q[0],q[1]);}ctx.stroke();}
ctx.globalCompositeOperation='source-over';
var st=g.stats,br=g.syn.bladestorm?14:9,orr=g.syn.bladestorm?72:52;
if(!P.dead){for(i=0;i<st.orbit;i++){var oa=g.orbA+i*TAU/st.orbit;ctx.save();ctx.translate(P.x+Math.cos(oa)*orr,P.y+Math.sin(oa)*orr);ctx.rotate(oa*3);ctx.beginPath();ctx.moveTo(br,0);ctx.lineTo(0,br*0.4);ctx.lineTo(-br,0);ctx.lineTo(0,-br*0.4);ctx.closePath();ctx.fillStyle='#cff';ctx.fill();ctx.restore();}
for(i=0;i<st.drone;i++){var da=g.droneA+i*TAU/st.drone;ctx.save();ctx.translate(P.x+Math.cos(da)*80,P.y+Math.sin(da)*80);poly(3,7);ctx.strokeStyle='#fd8';ctx.lineWidth=2;ctx.stroke();ctx.restore();}}
drawPlayer();
for(i=0;i<g.txt.length;i++){var t=g.txt[i];ctx.globalAlpha=clamp(t.life/0.4,0,1);txt(String(t.s),t.x,t.y,12*t.big,t.c,'center');ctx.globalAlpha=1;}
ctx.setTransform(DPR,0,0,DPR,0,0);
if(g.mut==='fog'){var fg=ctx.createRadialGradient(W/2,H/2,120*S,W/2,H/2,330*S);fg.addColorStop(0,'rgba(0,0,0,0)');fg.addColorStop(1,'rgba(0,0,0,.94)');ctx.fillStyle=fg;ctx.fillRect(0,0,W,H);}
if(g.flash>0){ctx.fillStyle='rgba(255,40,40,'+(g.flash*1.2).toFixed(2)+')';ctx.fillRect(0,0,W,H);}
if(g.ts<0.8){ctx.fillStyle='rgba(120,160,255,.08)';ctx.fillRect(0,0,W,H);}
if(g.bc)drawArrow(g.bc.x,g.bc.y,'#6fd','BEACON');if(g.bh)drawArrow(g.bh.x,g.bh.y,'#c8f','HOLE');
for(i=0;i<g.pu.length;i++)if(g.pu[i].kind==='crate')drawArrow(g.pu[i].x,g.pu[i].y,'#fd6','CRATE');
for(i=0;i<g.en.length;i++){if(g.en[i].sp.wraith)drawArrow(g.en[i].x,g.en[i].y,'#fd4','WRAITH');else if(g.en[i].boss)drawArrow(g.en[i].x,g.en[i].y,'#f66','BOSS');}
drawHUD();
}
function bar(x,y,w,h,f,col,bg){ctx.fillStyle=bg||'rgba(255,255,255,.12)';ctx.fillRect(x,y,w,h);ctx.fillStyle=col;ctx.fillRect(x,y,w*clamp(f,0,1),h);}
function drawHUD(){
var g=G,P=g.p,st=g.stats,m=12*S,bw=Math.min(190*S,W*0.42),i;
bar(m,m,bw,12*S,P.hp/P.maxhp,P.hp/P.maxhp<0.3?'#f55':'#4e8');if(st.shieldMax>0)bar(m,m+12*S,bw,4*S,P.sh/st.shieldMax,'#6df');
txt(Math.ceil(P.hp)+'/'+Math.ceil(P.maxhp),m+4,m+10*S,10,'#fff');var yy=m+24*S;
bar(m,yy,bw,6*S,g.xp/g.xpNext,'#a6f');txt('LV '+g.lvl,m,yy+20*S,12,'#c9f');
txt('SCORE '+g.score,W-m,m+12*S,13,'#fff','right');if(g.combo>4)txt('COMBO x'+g.combo,W-m,m+30*S,12,'#fd4','right');
txt('SECTOR '+g.stage+' · '+g.sector.name,W/2,m+12*S,12,'#8ac','center');
if(g.stage%5!==0)bar(W/2-70*S,m+18*S,140*S,4*S,g.stageKills/g.stageNeed,'#58f');
if(g.bossAlive&&g.bossE&&!g.bossE.dead){var be=g.bossE,bw2=Math.min(360*S,W*0.7);txt(be.sp.name,W/2,m+36*S,11,'#f88','center');bar(W/2-bw2/2,m+42*S,bw2,8*S,be.hp/be.maxhp,'#f44');}
var dr=1-clamp(P.dashCd/st.dashCd,0,1),dx=W/2,dy=H-22*S;bar(dx-40*S,dy,80*S,5*S,dr,dr>=1?'#6ff':'#456');txt(dr>=1?'DASH READY':'DASH',dx,dy-4,9,'#789','center');
var hv=g.have.slice(-8);for(i=0;i<hv.length;i++)txt(hv[i].t,m,H-m-(hv.length-1-i)*13*S,10,hv[i].c);
if(g.banner){var bn=g.banner,al=clamp(Math.min(bn.t,bn.T-bn.t)*2,0,1);ctx.globalAlpha=al;txt(bn.a,W/2,H*0.26,26,bn.c,'center');wrapTxt(bn.b,W/2,H*0.26+22*S,W*0.8,12,'#cde');ctx.globalAlpha=1;}
for(i=0;i<g.toasts.length;i++){ctx.globalAlpha=clamp(g.toasts[i].t,0,1);txt(g.toasts[i].s,W/2,H*0.4+i*16*S,12,g.toasts[i].c,'center');}ctx.globalAlpha=1;
if(stick.id!==null){ctx.beginPath();ctx.arc(stick.ox,stick.oy,56,0,TAU);ctx.strokeStyle='rgba(160,220,255,.3)';ctx.lineWidth=2;ctx.stroke();ctx.beginPath();ctx.arc(stick.ox+stick.x*56,stick.oy+stick.y*56,22,0,TAU);ctx.fillStyle='rgba(160,220,255,.3)';ctx.fill();}
else if(touchMode&&g.t<20)txt('touch & drag to fly · ship auto-aims & fires',W/2,H-50*S,11,'#789','center');
else if(!touchMode&&g.t<12)txt('WASD/arrows move · mouse aims · SPACE/SHIFT dash · P pause · M mute · T auto-aim',W/2,H-40*S,11,'#789','center');
}
function wrapTxt(s,x,y,maxW,size,col){
ctx.font=Math.round(size*S)+'px ui-monospace,Menlo,Consolas,monospace';var words=s.split(' '),line='',ly=y;
for(var i=0;i<words.length;i++){var t=line?line+' '+words[i]:words[i];if(ctx.measureText(t).width>maxW&&line){txt(line,x,ly,size,col,'center');line=words[i];ly+=(size+3)*S;}else line=t;}
txt(line,x,ly,size,col,'center');
}
function showTitle(){
ui.innerHTML='<div class="panel"><h1>VOID GENESIS</h1><p>procedural top-down space shooter</p><p class="hint">seed <b>'+seedStr(titleSeed)+'</b> · your ship, enemies, sectors, bosses and music are generated from it</p>'+
'<button class="go" data-act="start">LAUNCH</button><p class="hint">click here / press Enter to play<br>WASD or arrows: move · mouse: aim · Space/Shift/right-click: dash · weapons auto-fire<br>touch: drag to fly, DASH button · P pause · M mute · T toggle auto-aim</p><p class="hint">collect gems · level up · pick perks · find hidden synergies · beware cursed offers</p></div>';
}
function showOver(){
var g=G,secs=Math.round((Date.now()-g.time0)/1000),h='<div class="panel"><h2 style="color:#f66">SHIP LOST</h2><div class="stats"><div>Score <b>'+g.score+'</b></div><div>Best <b>'+best+'</b></div><div>Sector <b>'+g.stage+'</b></div><div>Level <b>'+g.lvl+'</b></div><div>Kills <b>'+g.kills+'</b></div><div>Max combo <b>'+g.maxCombo+'</b></div><div>Time <b>'+Math.floor(secs/60)+':'+('0'+secs%60).slice(-2)+'</b></div><div>Seed <b>'+seedStr(g.seed)+'</b></div></div>';
var syn=SYN.filter(function(s){return g.syn[s.id];}).map(function(s){return s.n;});if(syn.length)h+='<p>Synergies: <b>'+syn.join(', ')+'</b></p>';
h+='<p class="small">'+g.have.map(function(x){return x.t;}).join(' · ')+'</p><button class="go" data-act="new">NEW VOYAGE (R)</button><button class="go" data-act="same">SAME SEED (S)</button></div>';ui.innerHTML=h;
}
function pause(){if(state!=='play')return;state='pause';ui.innerHTML='<div class="panel"><h2>PAUSED</h2><p class="hint">P / Esc / Enter to resume</p><button class="go" data-act="resume">RESUME</button></div>';}
function resume(){if(state!=='pause')return;ui.innerHTML='';state='play';try{window.focus();}catch(_){}}
function choosePanel(e){
var t=e.target;while(t&&t!==ui&&!(t.getAttribute&&t.getAttribute('data-act')))t=t.parentNode;if(!t||t===ui)return;
var a=t.getAttribute('data-act');audioInit();
if(a==='start')startGame(titleSeed);else if(a==='new')startGame((Math.random()*4294967295)>>>0);else if(a==='same')startGame(lastSeed);
else if(a==='pick')choose(parseInt(t.getAttribute('data-i'),10));else if(a==='reroll')reroll();else if(a==='resume')resume();
}
ui.addEventListener('click',choosePanel);
var last=performance.now();
function loop(now){
var dt=Math.min(0.05,(now-last)/1000);last=now;
try{
if(state==='play'&&G){update(dt);if(G.pend.length&&state==='play'&&!G.p.dead)openPerks(G.pend.shift());}
else if(state==='over'&&G){updateFx(dt);G.shake*=Math.pow(0.02,dt);}
else if(state==='title'){tcam.x+=dt*40;tcam.y+=dt*15;}
render();
}catch(err){if(window.console)console.error(err);}
requestAnimationFrame(loop);
}
showTitle();requestAnimationFrame(loop);
})();
