const $=id=>document.getElementById(id);
const initial={wood:0,trees:0,saplings:0,coins:0,workers:1,foresters:0,mills:0,storage:0,axe:0,day:1,planted:0,muted:0,land:0,last:0,carpentry:0,planks:0,windbreak:0,watchtower:0,cats:0,fence:0,evNext:0,belt:0,saw:0,stall:0,trader:0,oak:0,robots:0,firmware:0,robotsOff:0,rbNext:0,tischler:0};
let state={...initial};
const capacity=()=>Math.max(100+state.storage*100,Math.floor(100*Math.pow(1.6,state.storage)));
const maxTrees=()=>20+state.foresters*10+state.land*10;
const chopGain=()=>Math.floor((5+state.axe*2)*(state.oak?1.5:1));
const millRate=()=>[2,4,8,16,32][state.belt];
const millPrice=()=>[1.5,2,2.5][state.saw];
const robotMult=()=>Date.now()<state.robotsOff?1:1+0.5*state.robots;
function clampState(){state.wood=Math.min(state.wood,capacity());const over=state.trees+state.saplings-maxTrees();if(over>0){const s=Math.min(over,state.saplings);state.saplings-=s;state.trees-=over-s}}
try{const saved=localStorage.getItem('lumberjack-save-v1');if(saved){const parsed=JSON.parse(saved);for(const k of Object.keys(initial)){if(Number.isFinite(parsed[k])&&parsed[k]>=0)state[k]=parsed[k];}}}catch(e){}
clampState();
const upgrades=[
{id:'axe',name:'Stahl-Axt',desc:'+2 Holz pro Baum',base:25,scale:1.65,icon:'🪓',res:'wood',count:()=>state.axe},
{id:'storage',name:'Größeres Lager',desc:'+100 Lagerkapazität, später ×1,6 (Holz)',base:45,scale:1.55,icon:'📦',res:'wood',count:()=>state.storage},
{id:'mills',name:'Sägewerk',desc:()=>'Verkauft '+millRate()+' Holz pro Takt für je '+String(millPrice()).replace('.',',')+' Münzen',base:150,scale:1.7,icon:'🏭',res:'wood',count:()=>state.mills},
{id:'workers',name:'Weiterer Holzfäller',desc:'Fällt automatisch Bäume (Lohn in Münzen)',base:30,scale:1.6,icon:'🧔',res:'coins',count:()=>state.workers-1},
{id:'foresters',name:'Förster einstellen',desc:'Pflanzt automatisch Bäume, +10 Waldfläche',base:50,scale:1.65,icon:'🌱',res:'coins',count:()=>state.foresters},
{id:'land',name:'Land kaufen',desc:'Neue Parzelle: +10 Waldfläche',base:80,scale:1.7,icon:'🏞️',res:'coins',count:()=>state.land,minLevel:2},
{id:'carpentry',name:'Tischlerei',desc:'Macht aus 5 Holz je 1 Brett pro Takt',base:250,scale:2.2,icon:'🪚',res:'coins',count:()=>state.carpentry,minLevel:4},
{id:'tischler',name:'Tischler-Weiterbildung',icon:'🎓',msg:'Weiterbildung abgeschlossen! Oben im Forstbetrieb: „Brett sägen“ (Taste S).',count:()=>state.tischler,tiers:[
  {lvl:5,c:400,desc:'Schaltet „Brett sägen“ frei: 10 Holz → 2 Bretter pro Klick'},
  {lvl:12,c:4000,desc:'Brett sägen: 40 Holz → 8 Bretter pro Klick'},
  {lvl:20,c:40000,desc:'Brett sägen: 200 Holz → 40 Bretter pro Klick'}]},
{id:'windbreak',name:'Windbrecher',desc:'Schützt vor Sturm (−70 % Schaden)',base:8,scale:1,icon:'🌬️',res:'planks',count:()=>state.windbreak,minLevel:6,max:1,unlock:'Gefahr im Wald! Schutzbauten sind verfügbar.'},
{id:'watchtower',name:'Wachturm',desc:'Schützt vor Feuer (−70 % Schaden)',base:12,scale:1,icon:'🗼',res:'planks',count:()=>state.watchtower,minLevel:6,max:1},
{id:'cats',name:'Katzen',desc:'Schützen vor Ungeziefer (−70 % Schaden)',base:6,scale:1,icon:'🐈',res:'planks',count:()=>state.cats,minLevel:6,max:1},
{id:'fence',name:'Zaun',desc:'Schützt vor Dieben (−70 % Schaden)',base:15,scale:1,icon:'🚧',res:'planks',count:()=>state.fence,minLevel:6,max:1},
{id:'stall',name:'Marktstand',icon:'🏪',msg:'Marktstand gebaut! Oben im Forstbetrieb gibt es jetzt „Bretter verkaufen“. Holz verkaufen die Sägewerke weiter automatisch.',count:()=>state.stall,tiers:[{lvl:10,c:1000,p:80,desc:'Schaltet „Bretter verkaufen“ frei (Holz verkaufen die Sägewerke automatisch)'}]},
{id:'belt',name:'Förderband',icon:'⚙️',count:()=>state.belt,tiers:[
  {lvl:12,c:1500,p:100,desc:'Sägewerke verkaufen 4 Holz pro Takt'},
  {lvl:16,c:6000,p:400,desc:'Sägewerke verkaufen 8 Holz pro Takt'},
  {lvl:20,c:24000,p:1600,desc:'Sägewerke verkaufen 16 Holz pro Takt'},
  {lvl:24,c:100000,p:6400,desc:'Sägewerke verkaufen 32 Holz pro Takt'}]},
{id:'saw',name:'Kreissäge',icon:'🌀',count:()=>state.saw,tiers:[
  {lvl:14,c:3000,p:200,desc:'Sägewerke zahlen 2,0 Münzen pro Holz'},
  {lvl:22,c:20000,p:1500,desc:'Sägewerke zahlen 2,5 Münzen pro Holz'}]},
{id:'trader',name:'Händlerruf',icon:'📣',count:()=>state.trader,req:()=>state.stall>0,tiers:[
  {lvl:14,c:3000,p:300,desc:'Markt: 30 Bretter pro Klick'},
  {lvl:20,c:12000,p:1200,desc:'Markt: 100 Bretter pro Klick'},
  {lvl:26,c:48000,p:4800,desc:'Markt: 300 Bretter pro Klick'}]},
{id:'oak',name:'Eichen-Saatgut',icon:'🌳',count:()=>state.oak,tiers:[{lvl:15,c:8000,p:400,desc:'Eichen: ×1,5 Holz pro Baum, größere Bäume'}]},
{id:'robots',name:'KI-Roboter',desc:()=>'Alle Arbeit +50 % pro Roboter (jetzt ×'+robotMult().toFixed(1).replace('.',',')+(Date.now()<state.robotsOff?', defekt!':'')+')',base:100000,scale:2,icon:'🤖',res:'coins',count:()=>state.robots,minLevel:30,max:6,unlock:'KI-Roboter verfügbar! Sie beschleunigen alles – aber nicht ohne Risiko.'},
{id:'firmware',name:'Firmware-Update',icon:'🛡️',count:()=>state.firmware,req:()=>state.robots>0,tiers:[{lvl:30,c:150000,p:3000,desc:'Aufstände: halbe Chance, 60 % weniger Schaden'}]}
];
const cost=u=>Math.floor(u.base*Math.pow(u.scale,u.count()));
// Tiered upgrades list their tiers (level, coins, planks, text); classic ones use base/scale/res
const tierOf=u=>u.tiers&&u.tiers[u.count()];
const prices=u=>u.tiers?(tierOf(u)?{coins:tierOf(u).c,...(tierOf(u).p?{planks:tierOf(u).p}:{})}:{}):{[u.res]:cost(u)};
const levelOf=u=>u.tiers?(tierOf(u)?tierOf(u).lvl:0):(u.minLevel||0);
const isMaxed=u=>u.tiers?!tierOf(u):!!(u.max&&u.count()>=u.max);
const visible=u=>isMaxed(u)||(level()>=levelOf(u)&&(!u.req||u.req()));
const canBuy=u=>!isMaxed(u)&&visible(u)&&Object.entries(prices(u)).every(([r,v])=>state[r]>=v);
const nameOf=u=>u.tiers&&u.tiers.length>1?u.name+' '+['I','II','III','IV'][Math.min(u.count(),u.tiers.length-1)]:u.name;
const descOf=u=>{const d=(tierOf(u)&&tierOf(u).desc)||u.desc||'';return typeof d==='function'?d():d};
const purchases=()=>state.workers-1+state.foresters+state.mills+state.axe+state.storage+state.land+state.carpentry;
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
    reset:()=>{if(!ready())return;tone('sawtooth',440,110,0,0.5,0.15)},
    event:()=>{if(!ready())return;tone('sawtooth',90,50,0,0.6,0.25);tone('square',70,40,0.1,0.5,0.12);noise(300,0.6,0,0.35,0.3)}
  };
})();
let toastTimer;
function toast(msg,ms){const el=$('toast');el.textContent=msg;el.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('show'),ms||1800)}
function save(){try{state.last=Date.now();localStorage.setItem('lumberjack-save-v1',JSON.stringify(state))}catch(e){}}
let quiet=false;
function addTree(silent){if(state.trees+state.saplings>=maxTrees()){if(!silent)toast('Der Wald ist voll! (max. '+maxTrees()+' Bäume)');return false}state.saplings++;state.planted++;if(!quiet)renderForest();return true}
function fellTree(){if(state.trees<1||state.wood>=capacity())return 0;const g=Math.min(chopGain(),capacity()-state.wood);state.trees--;state.wood+=g;return g}
function renderForest(){const forest=$('forest');forest.replaceChildren();const capN=state.oak?10:12;const mature=Math.min(state.trees,capN);const young=Math.min(state.saplings,capN-mature);for(let i=0;i<mature;i++){const tree=document.createElement('span');tree.className=state.oak?'tree oak':'tree';tree.textContent=state.oak||i%4===0?'🌳':'🌲';forest.appendChild(tree)}for(let i=0;i<young;i++){const s=document.createElement('span');s.className='tree';s.textContent='🌱';forest.appendChild(s)}const rest=state.trees+state.saplings-mature-young;if(rest>0){const extra=document.createElement('span');extra.className='tree';extra.textContent='+'+rest;forest.appendChild(extra)}}
function renderFences(){const f=$('fences');const key=''+state.land;if(f.dataset.n===key)return;f.dataset.n=key;f.replaceChildren();for(let i=0;i<Math.min(state.land,12);i++){const p=document.createElement('span');p.className='fence';f.appendChild(p)}if(state.land>12){const m=document.createElement('span');m.textContent='+'+(state.land-12);f.appendChild(m)}}
function renderCrew(){const n=Math.min(3,state.workers-1);const c=$('crew');if(c.dataset.n===''+n)return;c.dataset.n=''+n;c.replaceChildren();for(let i=0;i<n;i++){const p=document.createElement('span');p.textContent='🧑‍🌾';p.style.animationDelay=(i*0.3)+'s';c.appendChild(p)}}
// Badges: small icons in the scene for owned buildings and protections
const BADGES=[
  ['windbreak','🌬️','Windbrecher',()=>state.windbreak>0],
  ['watchtower','🗼','Wachturm',()=>state.watchtower>0],
  ['cats','🐈','Katzen',()=>state.cats>0],
  ['fence','🚧','Zaun',()=>state.fence>0],
  ['carpentry','🪚','Tischlerei',()=>state.carpentry>0],
  ['stall','🏪','Marktstand',()=>state.stall>0],
  ['belt','⚙️','Förderband',()=>state.belt>0],
  ['saw','🌀','Kreissäge',()=>state.saw>0],
  ['oak','🌳','Eichen-Saatgut',()=>state.oak>0],
  ['robots','🤖','KI-Roboter',()=>state.robots>0],
  ['firmware','🛡️','Firmware-Update',()=>state.firmware>0],
  ['tischler','🎓','Tischler-Weiterbildung',()=>state.tischler>0]
];
function renderBadges(){const root=$('badges');const key=BADGES.map(b=>b[3]()?1:0).join('');if(root.dataset.k===key)return;root.dataset.k=key;root.replaceChildren();for(const b of BADGES){if(!b[3]())continue;const el=document.createElement('span');el.className='badge';el.dataset.k=b[0];el.textContent=b[1];el.title=b[2];root.appendChild(el)}}
// Teaser: announces that more is coming without naming it; hidden once nothing is left to unlock
let teaser=null,teaserIcons=null,teaserNote=null,teaserFill=null;
function renderTeaser(){
  let next=Infinity,locked=0;
  for(const u of upgrades){
    if(isMaxed(u))continue;
    const gated=!!(u.req&&!u.req());
    const lvls=u.tiers?u.tiers.slice(u.count()).map(t=>t.lvl):[levelOf(u)];
    for(const lv of lvls){if(gated||lv>level())locked++;if(!gated&&lv>level())next=Math.min(next,lv)}
  }
  if(!teaser){teaser=document.createElement('div');teaser.className='teaser';const t=document.createElement('strong');t.textContent='❓ ???';teaserIcons=document.createElement('div');teaserNote=document.createElement('span');const bar=document.createElement('div');bar.className='bar';teaserFill=document.createElement('i');bar.appendChild(teaserFill);teaser.append(t,teaserIcons,teaserNote,bar);$('upgrades').appendChild(teaser)}
  teaser.style.display=locked?'':'none';
  if(!locked)return;
  teaserIcons.textContent='🔒'.repeat(Math.min(locked,12));
  teaserNote.textContent=locked+(locked===1?' weiteres Upgrade':' weitere Upgrades')+' gesperrt'+(next===Infinity?'':' – nächste Überraschung in '+(next-level())+' Level');
  teaserFill.style.width=next===Infinity?'100%':Math.min(100,Math.round(purchases()/((next-1)*3)*100))+'%';
}
const UNITS={wood:['🪵','Holz'],coins:['🪙','Münzen'],planks:['🪚','Bretter']};
const upgradeEls=new Map();
function renderUpgrades(){const root=$('upgrades');for(const u of upgrades){let el=upgradeEls.get(u.id);if(!el){const btn=document.createElement('button');btn.className='upgrade';const title=document.createElement('strong');const desc=document.createElement('span');const priceEl=document.createElement('em');btn.append(title,desc,priceEl);btn.addEventListener('click',()=>buy(u));root.appendChild(btn);el={btn,title,desc,priceEl};upgradeEls.set(u.id,el)}const pr=prices(u);el.title.textContent=u.icon+' '+nameOf(u);el.desc.textContent=descOf(u);el.btn.style.display=visible(u)?'':'none';el.btn.disabled=!canBuy(u);el.priceEl.textContent=isMaxed(u)?'✓ Gebaut':Object.keys(pr).map(r=>UNITS[r][0]+' '+pr[r].toLocaleString('de-DE')+' '+UNITS[r][1]).join(' + ')+(pr.wood>capacity()?' – Lager zu klein':'')}renderTeaser()}
function render(){$('wood').textContent=Math.floor(state.wood)+'/'+capacity();$('trees').textContent=state.trees+(state.saplings?' (+'+state.saplings+'🌱)':'');$('coins').textContent=Math.floor(state.coins);$('workerCount').textContent=state.workers;$('foresterCount').textContent=state.foresters;$('millCount').textContent=state.mills;$('capacity').textContent=capacity();$('chopGain').textContent=chopGain();$('day').textContent='TAG '+state.day;$('level').textContent='LEVEL '+level();$('mute').textContent=state.muted?'🔇 Ton aus':'🔊 Ton an';$('planks').textContent=Math.floor(state.planks);$('planksBox').hidden=!(state.carpentry>0||state.planks>0);renderFences();renderBadges();renderCrew();$('cabin').dataset.s=level()>=25?3:level()>=15?2:level()>=8?1:0;$('sell').style.display=state.stall?'':'none';$('cut').style.display=state.tischler?'':'none';if(state.tischler)$('cutInfo').textContent=CUT[state.tischler-1][0]+' Holz → '+CUT[state.tischler-1][1]+' Bretter';$('sellInfo').textContent=SELL_AMOUNTS[state.trader]+' Bretter · '+marketPrice.toFixed(1).replace('.',',')+' Münzen/Brett';renderUpgrades()}
function chop(){if(state.trees<1){sfx.error();toast(state.saplings?'Die Setzlinge wachsen noch… 🌱':'Pflanze zuerst einen Baum! 🌱');return}if(state.wood>=capacity()){sfx.error();toast('Lager voll! Baue es aus oder verkaufe Holz im Sägewerk.');return}fellTree();sfx.chop(1);$('worker').classList.add('chopping');setTimeout(()=>$('worker').classList.remove('chopping'),350);renderForest();render();save()}
function buy(u){if(!canBuy(u))return;const nm=nameOf(u);const lv=level();const pr=prices(u);for(const r of Object.keys(pr))state[r]-=pr[r];state[u.id]++;clampState();sfx.buy();if(level()>lv){setTimeout(sfx.levelUp,350);const nu=upgrades.find(x=>!isMaxed(x)&&visible(x)&&levelOf(x)===level());if(nu)setTimeout(()=>toast(nu.unlock||'Neu freigeschaltet: '+nameOf(nu)+'!',3000),900)}toast(u.msg||nm+' gekauft!',u.msg?4000:undefined);renderForest();render();save()}
$('plant').addEventListener('click',()=>{if(addTree(false)){sfx.plant();render();save();toast('Ein Setzling wurde gepflanzt – er braucht etwas Zeit. 🌱')}else sfx.error()});
$('chop').addEventListener('click',chop);
let resetArmed=false,resetTimer;
const disarmReset=()=>{resetArmed=false;clearTimeout(resetTimer);$('reset').textContent='Spiel zurücksetzen'};
$('reset').addEventListener('click',()=>{if(!resetArmed){resetArmed=true;$('reset').textContent='Wirklich löschen? Nochmal klicken';resetTimer=setTimeout(disarmReset,3000);return}disarmReset();state={...initial,muted:state.muted};save();sfx.reset();renderForest();render();toast('Neuer Wald, neues Glück!')});
$('mute').addEventListener('click',()=>{state.muted=state.muted?0:1;save();render();sfx.sell()});
// Market: manual plank sales (sawmills sell wood automatically); amount grows with Händlerruf, price fluctuates every minute, 3 s cooldown
const SELL_AMOUNTS=[10,30,100,300];
let marketPrice=6,sellLocked=false;
$('sell').addEventListener('click',()=>{if(sellLocked)return;const n=Math.min(Math.floor(state.planks),SELL_AMOUNTS[state.trader]);if(n<1){sfx.error();toast('Keine Bretter zum Verkaufen.');return}state.planks-=n;state.coins+=n*marketPrice;sfx.sell();toast(n+' Bretter verkauft: +'+Math.floor(n*marketPrice)+' Münzen');sellLocked=true;$('sell').disabled=true;setTimeout(()=>{sellLocked=false;$('sell').disabled=false},3000);render();save()});
// Manual sawing (needs Tischler-Weiterbildung): wood -> planks per click, 1 s cooldown
const CUT=[[10,2],[40,8],[200,40]];
let cutLocked=false;
$('cut').addEventListener('click',()=>{if(!state.tischler||cutLocked)return;const [w,p]=CUT[state.tischler-1];if(state.wood<w){sfx.error();toast('Zu wenig Holz: '+w+' nötig.');return}state.wood-=w;state.planks+=p;sfx.chop(1);cutLocked=true;$('cut').disabled=true;setTimeout(()=>{cutLocked=false;$('cut').disabled=false},1000);render();save()});
// Keyboard: A plant, L chop, S saw (the frame needs a click first); presses are applied immediately
document.addEventListener('keydown',e=>{if(e.repeat||e.ctrlKey||e.metaKey||e.altKey)return;const k=e.key.toLowerCase();if(k==='a')$('plant').click();else if(k==='l')$('chop').click();else if(k==='s')$('cut').click()});
function step(){let changed=false,sold=false,chopped=false;const m=robotMult();for(let i=0;i<Math.floor(state.mills*m);i++){const processed=Math.min(state.wood,millRate());if(processed>0){state.wood-=processed;state.coins+=processed*millPrice();changed=true;sold=true}}for(let i=0;i<Math.floor(state.carpentry*m);i++){if(state.wood>=5){state.wood-=5;state.planks++;changed=true}}for(let i=0;i<Math.floor(state.workers*m);i++){if(fellTree()>0){changed=true;chopped=true}}for(let i=0;i<Math.floor(state.foresters*m);i++){if(addTree(true))changed=true}if(state.saplings>0){const grown=Math.ceil(state.saplings/2);state.saplings-=grown;state.trees+=grown;changed=true}return{changed,sold,chopped}}
setInterval(()=>{const r=step();if(r.sold)sfx.sell(true);if(r.chopped)sfx.chop(0.35);if(r.changed){renderForest();render();save()}},2000);
// Random events (level 6+): rare by design - 10 min grace after unlock, 10 min minimum gap, ~10 % chance per minute afterwards,
// only while the game is open and visible. The matching protection building cuts the damage by 70 %.
const EVENTS=[
  {key:'windbreak',ok:()=>state.trees>=1,hit:p=>{const n=Math.max(1,Math.floor(state.trees*0.15*p));state.trees-=n;return '⛈ Sturm! '+n+' Bäume umgeknickt.'}},
  {key:'watchtower',ok:()=>state.wood>=10,hit:p=>{const n=Math.max(1,Math.floor(state.wood*0.2*p));state.wood-=n;return '🔥 Feuer im Holzlager! '+n+' Holz verbrannt.'}},
  {key:'cats',ok:()=>state.wood>=10,hit:p=>{const n=Math.max(1,Math.floor(state.wood*0.15*p));state.wood-=n;return '🐛 Ungeziefer! '+n+' Holz zerfressen.'}},
  {key:'fence',ok:()=>state.coins>=10,hit:p=>{const n=Math.max(1,Math.floor(state.coins*0.1*p));state.coins-=n;return '🥷 Diebe! '+n+' Münzen gestohlen.'}}
];
function rollEvent(){
  if(level()<6||document.hidden)return;
  const now=Date.now();
  if(!state.evNext){state.evNext=now+600000;return}
  if(now<state.evNext||Math.random()>=0.1)return;
  const pool=EVENTS.filter(e=>e.ok());
  if(!pool.length)return;
  const e=pool[Math.floor(Math.random()*pool.length)];
  const shielded=state[e.key]>0;
  const msg=e.hit(shielded?0.3:1);
  if(shielded){const bd=document.querySelector('#badges [data-k="'+e.key+'"]');if(bd){bd.classList.add('pulse');setTimeout(()=>bd.classList.remove('pulse'),2500)}}
  state.evNext=now+600000;
  clampState();sfx.event();renderForest();
  toast(msg+(shielded?' Der Schutz hat gewirkt.':''),4500);
}
// Robot uprising (needs robots): 10 min grace, 15 min minimum gap, small chance per minute that grows with robot count,
// only while the game is open and visible. 12 s warning: NOT-AUS prevents it. Otherwise 25 % of trees and stored wood are lost
// and the robots are down for 3 min. Buildings, land and upgrades are never touched. Firmware-Update halves chance and cuts damage by 60 %.
let alertTimer=null;
function robotDamage(){const f=state.firmware?0.4:1;const t=Math.min(state.trees,Math.max(1,Math.floor(state.trees*0.25*f)));const w=Math.floor(state.wood*0.25*f);state.trees-=t;state.wood-=w;state.robotsOff=Date.now()+180000;state.rbNext=Date.now()+900000;clampState();sfx.event();renderForest();render();save();toast('🤖 Aufstand! '+t+' Bäume und '+w+' Holz zerstört. Roboter 3 Min. defekt.',5000)}
function rollRobots(){
  if(state.robots<1||document.hidden||alertTimer)return;
  const now=Date.now();
  if(!state.rbNext){state.rbNext=now+600000;return}
  if(now<state.rbNext)return;
  if(Math.random()>=Math.min(0.15,0.03*state.robots)*(state.firmware?0.5:1))return;
  toast('⚠ Roboter laufen Amok! Schnell: NOT-AUS!',12000);sfx.event();
  $('panic').style.display='';
  alertTimer=setTimeout(()=>{$('panic').style.display='none';alertTimer=null;robotDamage()},12000);
}
$('panic').addEventListener('click',()=>{if(!alertTimer)return;clearTimeout(alertTimer);alertTimer=null;$('panic').style.display='none';state.rbNext=Date.now()+900000;sfx.buy();toast('Not-Aus gedrückt: Aufstand gestoppt!',3000);save()});
setInterval(()=>{state.day++;rollEvent();rollRobots();marketPrice=4.5+Math.random()*3;render();save()},60000);
window.addEventListener('pagehide',save);document.addEventListener('visibilitychange',()=>{if(document.hidden)save()});
// Offline progress: capped at 8 h, random 20-60 % efficiency (the boss was not looking)
(()=>{
  const away=state.last?(Date.now()-state.last)/1000:0;
  if(away<60)return;
  const tier=away<1800?{lo:0.5,hi:0.7,lines:['Kaffeepause','Mittagsschlaf']}:away<7200?{lo:0.3,hi:0.6,lines:['Woodie Ellen hat gepennt','Chef hat nicht hingeschaut','Alle haben Unsinn gemacht']}:{lo:0.2,hi:0.4,lines:['Betriebsausflug','Alle im Urlaub','Woodie Ellen liegt am See']};
  const eff=tier.lo+Math.random()*(tier.hi-tier.lo);
  const ticks=Math.floor(Math.min(away,28800)*eff/2);
  const before={wood:state.wood,coins:state.coins};
  quiet=true;for(let i=0;i<ticks;i++)step();quiet=false;
  if(state.evNext)state.evNext=Math.max(state.evNext,Date.now()+120000);
  if(state.rbNext)state.rbNext=Math.max(state.rbNext,Date.now()+120000);
  save();
  const gain=Math.floor(state.coins-before.coins);
  if(gain>0||state.wood>before.wood){
    const lines=tier.lines;
    toast((away>=28800?'Urlaubsende! ':'')+lines[Math.floor(Math.random()*lines.length)]+': nur '+Math.round(eff*100)+' % Leistung, +'+gain+' Münzen',5000);
  }
})();
renderForest();render();
