const $=id=>document.getElementById(id);
const initial={wood:0,trees:0,saplings:0,coins:0,workers:1,foresters:0,mills:0,storage:0,axe:0,day:1,planted:0,muted:0,land:0,last:0};
let state={...initial};
const capacity=()=>Math.max(100+state.storage*100,Math.floor(100*Math.pow(1.6,state.storage)));
const maxTrees=()=>20+state.foresters*10+state.land*10;
const chopGain=()=>5+state.axe*2;
function clampState(){state.wood=Math.min(state.wood,capacity());const over=state.trees+state.saplings-maxTrees();if(over>0){const s=Math.min(over,state.saplings);state.saplings-=s;state.trees-=over-s}}
try{const saved=localStorage.getItem('lumberjack-save-v1');if(saved){const parsed=JSON.parse(saved);for(const k of Object.keys(initial)){if(Number.isFinite(parsed[k])&&parsed[k]>=0)state[k]=parsed[k];}}}catch(e){}
clampState();
const upgrades=[
{id:'axe',name:'Stahl-Axt',desc:'+2 Holz pro Baum',base:25,scale:1.65,icon:'🪓',res:'wood',count:()=>state.axe},
{id:'storage',name:'Größeres Lager',desc:'+100 Lagerkapazität, später ×1,6 (Holz)',base:45,scale:1.55,icon:'📦',res:'wood',count:()=>state.storage},
{id:'mills',name:'Sägewerk',desc:'Verkauft 2 Holz pro Takt für je 1,5 Münzen',base:150,scale:1.9,icon:'🏭',res:'wood',count:()=>state.mills},
{id:'workers',name:'Weiterer Holzfäller',desc:'Fällt automatisch Bäume (Lohn in Münzen)',base:30,scale:1.8,icon:'🧔',res:'coins',count:()=>state.workers-1},
{id:'foresters',name:'Förster einstellen',desc:'Pflanzt automatisch Bäume, +10 Waldfläche',base:50,scale:1.85,icon:'🌱',res:'coins',count:()=>state.foresters},
{id:'land',name:'Land kaufen',desc:'Neue Parzelle: +10 Waldfläche',base:80,scale:2,icon:'🏞️',res:'coins',count:()=>state.land,minLevel:2}
];
const cost=u=>Math.floor(u.base*Math.pow(u.scale,u.count()));
const purchases=()=>state.workers-1+state.foresters+state.mills+state.axe+state.storage+state.land;
const level=()=>1+Math.floor(purchases()/3);
// Synthesized sound effects (Web Audio); the audio context is created lazily inside a user gesture
const sfx=(()=>{
  let ctx=null,master=null,noiseBuf=null;
  const ready=auto=>{
    if(state.muted)return false;
    try{
      if(!ctx){
        if(auto)return false;
        const AC=window.AudioContext||window.webkitAudioContext;
        if(!AC)return false;
        const c=new AC();
        const m=c.createGain();m.gain.value=0.6;
        const comp=c.createDynamicsCompressor();
        m.connect(comp);comp.connect(c.destination);
        const buf=c.createBuffer(1,Math.floor(c.sampleRate*0.4),c.sampleRate);
        const d=buf.getChannelData(0);
        for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1;
        ctx=c;master=m;noiseBuf=buf;
      }
      if(ctx.state!=='running'){ctx.resume();if(auto)return false}
      return true;
    }catch(e){return false}
  };
  const tone=(type,f0,f1,t0,dur,vol)=>{
    const o=ctx.createOscillator(),g=ctx.createGain(),t=ctx.currentTime+t0;
    o.type=type;o.frequency.setValueAtTime(f0,t);
    if(f1!==f0)o.frequency.exponentialRampToValueAtTime(f1,t+dur);
    g.gain.setValueAtTime(0.0001,t);
    g.gain.exponentialRampToValueAtTime(vol,t+0.01);
    g.gain.exponentialRampToValueAtTime(0.0001,t+dur);
    o.connect(g);g.connect(master);o.start(t);o.stop(t+dur+0.02);
  };
  const noise=(freq,q,t0,dur,vol)=>{
    const s=ctx.createBufferSource(),f=ctx.createBiquadFilter(),g=ctx.createGain(),t=ctx.currentTime+t0;
    s.buffer=noiseBuf;f.type='bandpass';f.frequency.value=freq;f.Q.value=q;
    g.gain.setValueAtTime(vol,t);
    g.gain.exponentialRampToValueAtTime(0.0001,t+dur);
    s.connect(f);f.connect(g);g.connect(master);s.start(t);s.stop(t+dur+0.02);
  };
  return{
    chop:v=>{if(!ready(v<1))return;noise(2200,0.9,0,0.07,0.5*v);tone('sine',240,60,0,0.16,0.7*v);tone('triangle',620,300,0,0.05,0.25*v);noise(500,0.7,0.14,0.28,0.25*v);tone('sawtooth',150,45,0.12,0.26,0.12*v)},
    plant:()=>{if(!ready())return;tone('sine',330,660,0,0.18,0.3);tone('triangle',660,990,0.1,0.2,0.2);tone('sine',1320,1320,0.2,0.25,0.1)},
    buy:()=>{if(!ready())return;tone('square',988,988,0,0.08,0.1);tone('square',1319,1319,0.07,0.35,0.1);tone('triangle',1976,1976,0.07,0.4,0.12)},
    levelUp:()=>{if(!ready())return;[523,659,784,1047,1319].forEach((f,i)=>{tone('triangle',f,f,i*0.09,0.3,0.25);tone('square',f*2,f*2,i*0.09,0.15,0.04)})},
    sell:a=>{if(!ready(a))return;tone('sine',1568,1568,0,0.12,0.12);tone('sine',2093,2093,0.06,0.18,0.12)},
    error:()=>{if(!ready())return;tone('square',160,110,0,0.2,0.1)},
    reset:()=>{if(!ready())return;tone('sawtooth',440,110,0,0.5,0.15)}
  };
})();
let toastTimer;
function toast(msg,ms){const el=$('toast');el.textContent=msg;el.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('show'),ms||1800)}
function save(){try{state.last=Date.now();localStorage.setItem('lumberjack-save-v1',JSON.stringify(state))}catch(e){}}
let quiet=false;
function addTree(silent){if(state.trees+state.saplings>=maxTrees()){if(!silent)toast('Der Wald ist voll! (max. '+maxTrees()+' Bäume)');return false}state.saplings++;state.planted++;if(!quiet)renderForest();return true}
function fellTree(){if(state.trees<1||state.wood>=capacity())return 0;const g=Math.min(chopGain(),capacity()-state.wood);state.trees--;state.wood+=g;return g}
function renderForest(){const forest=$('forest');forest.replaceChildren();const mature=Math.min(state.trees,12);const young=Math.min(state.saplings,12-mature);for(let i=0;i<mature;i++){const tree=document.createElement('span');tree.className='tree';tree.textContent=i%4===0?'🌳':'🌲';forest.appendChild(tree)}for(let i=0;i<young;i++){const s=document.createElement('span');s.className='tree';s.textContent='🌱';forest.appendChild(s)}const rest=state.trees+state.saplings-mature-young;if(rest>0){const extra=document.createElement('span');extra.className='tree';extra.textContent='+'+rest;forest.appendChild(extra)}}
function renderFences(){const f=$('fences');const key=''+state.land;if(f.dataset.n===key)return;f.dataset.n=key;f.replaceChildren();for(let i=0;i<Math.min(state.land,12);i++){const p=document.createElement('span');p.className='fence';f.appendChild(p)}if(state.land>12){const m=document.createElement('span');m.textContent='+'+(state.land-12);f.appendChild(m)}}
// Teaser: announces that more is coming without naming it; hidden once nothing is left to unlock
let teaser=null,teaserNote=null,teaserFill=null;
function renderTeaser(){
  let next=Infinity;for(const u of upgrades)if((u.minLevel||0)>level())next=Math.min(next,u.minLevel);
  if(!teaser){teaser=document.createElement('div');teaser.className='teaser';const t=document.createElement('strong');t.textContent='❓ ???';teaserNote=document.createElement('span');const bar=document.createElement('div');bar.className='bar';teaserFill=document.createElement('i');bar.appendChild(teaserFill);teaser.append(t,teaserNote,bar);$('upgrades').appendChild(teaser)}
  teaser.style.display=next===Infinity?'none':'';
  if(next===Infinity)return;
  teaserNote.textContent='Noch '+(next-level())+' Level bis zur Überraschung';
  teaserFill.style.width=Math.min(100,Math.round(purchases()/((next-1)*3)*100))+'%';
}
const upgradeEls=new Map();
function renderUpgrades(){const root=$('upgrades');for(const u of upgrades){let el=upgradeEls.get(u.id);if(!el){const btn=document.createElement('button');btn.className='upgrade';const title=document.createElement('strong');title.textContent=u.icon+' '+u.name;const desc=document.createElement('span');desc.textContent=u.desc;const priceEl=document.createElement('em');btn.append(title,desc,priceEl);btn.addEventListener('click',()=>buy(u));root.appendChild(btn);el={btn,priceEl};upgradeEls.set(u.id,el)}const price=cost(u);const unit=u.res==='wood'?'🪵':'🪙';el.btn.style.display=level()>=(u.minLevel||0)?'':'none';el.btn.disabled=state[u.res]<price;el.priceEl.textContent=unit+' '+price+(u.res==='wood'?' Holz':' Münzen')+(u.res==='wood'&&price>capacity()?' – Lager zu klein':'')}renderTeaser()}
function render(){$('wood').textContent=Math.floor(state.wood)+'/'+capacity();$('trees').textContent=state.trees+(state.saplings?' (+'+state.saplings+'🌱)':'');$('coins').textContent=Math.floor(state.coins);$('workerCount').textContent=state.workers;$('foresterCount').textContent=state.foresters;$('millCount').textContent=state.mills;$('capacity').textContent=capacity();$('chopGain').textContent=chopGain();$('day').textContent='TAG '+state.day;$('level').textContent='LEVEL '+level();$('mute').textContent=state.muted?'🔇 Ton aus':'🔊 Ton an';renderFences();renderUpgrades()}
function chop(){if(state.trees<1){sfx.error();toast(state.saplings?'Die Setzlinge wachsen noch… 🌱':'Pflanze zuerst einen Baum! 🌱');return}if(state.wood>=capacity()){sfx.error();toast('Lager voll! Baue es aus oder verkaufe Holz im Sägewerk.');return}fellTree();sfx.chop(1);$('worker').classList.add('chopping');setTimeout(()=>$('worker').classList.remove('chopping'),350);renderForest();render();save()}
function buy(u){const price=cost(u);if(state[u.res]<price||level()<(u.minLevel||0))return;const lv=level();state[u.res]-=price;state[u.id]++;clampState();sfx.buy();if(level()>lv){setTimeout(sfx.levelUp,350);const nu=upgrades.find(x=>x.minLevel&&x.minLevel===level());if(nu)setTimeout(()=>toast('Neu freigeschaltet: '+nu.name+'!'),900)}toast(u.name+' gekauft!');renderForest();render();save()}
$('plant').addEventListener('click',()=>{if(addTree(false)){sfx.plant();render();save();toast('Ein Setzling wurde gepflanzt – er braucht etwas Zeit. 🌱')}else sfx.error()});
$('chop').addEventListener('click',chop);
let resetArmed=false,resetTimer;
const disarmReset=()=>{resetArmed=false;clearTimeout(resetTimer);$('reset').textContent='Spiel zurücksetzen'};
$('reset').addEventListener('click',()=>{if(!resetArmed){resetArmed=true;$('reset').textContent='Wirklich löschen? Nochmal klicken';resetTimer=setTimeout(disarmReset,3000);return}disarmReset();state={...initial,muted:state.muted};save();sfx.reset();renderForest();render();toast('Neuer Wald, neues Glück!')});
$('mute').addEventListener('click',()=>{state.muted=state.muted?0:1;save();render();sfx.sell()});
function step(){let changed=false,sold=false,chopped=false;for(let i=0;i<state.mills;i++){const processed=Math.min(state.wood,2);if(processed>0){state.wood-=processed;state.coins+=processed*1.5;changed=true;sold=true}}for(let i=0;i<state.workers;i++){if(fellTree()>0){changed=true;chopped=true}}for(let i=0;i<state.foresters;i++){if(addTree(true))changed=true}if(state.saplings>0){const grown=Math.ceil(state.saplings/2);state.saplings-=grown;state.trees+=grown;changed=true}return{changed,sold,chopped}}
setInterval(()=>{const r=step();if(r.sold)sfx.sell(true);if(r.chopped)sfx.chop(0.35);if(r.changed){renderForest();render();save()}},2000);
setInterval(()=>{state.day++;render();save()},60000);
window.addEventListener('pagehide',save);document.addEventListener('visibilitychange',()=>{if(document.hidden)save()});
// Offline progress: capped at 8 h, random 20-60 % efficiency (the boss was not looking)
(()=>{
  const away=state.last?(Date.now()-state.last)/1000:0;
  if(away<60)return;
  const eff=0.2+Math.random()*0.4;
  const ticks=Math.floor(Math.min(away,28800)*eff/2);
  const before={wood:state.wood,coins:state.coins};
  quiet=true;for(let i=0;i<ticks;i++)step();quiet=false;
  save();
  const gain=Math.floor(state.coins-before.coins);
  if(gain>0||state.wood>before.wood){
    const lines=['Woodie Ellen hat gepennt','Chef hat nicht hingeschaut','Alle haben Unsinn gemacht'];
    toast(lines[Math.floor(Math.random()*lines.length)]+': nur '+Math.round(eff*100)+' % Leistung, +'+gain+' Münzen',5000);
  }
})();
renderForest();render();
