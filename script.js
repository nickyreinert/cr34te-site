const $=id=>document.getElementById(id);
const initial={wood:0,trees:0,saplings:0,coins:0,workers:1,foresters:0,mills:0,storage:0,axe:0,day:1,planted:0};
let state={...initial};
const capacity=()=>100+state.storage*100;
const maxTrees=()=>20+state.foresters*10;
const chopGain=()=>5+state.axe*2;
function clampState(){state.wood=Math.min(state.wood,capacity());const over=state.trees+state.saplings-maxTrees();if(over>0){const s=Math.min(over,state.saplings);state.saplings-=s;state.trees-=over-s}}
try{const saved=localStorage.getItem('lumberjack-save-v1');if(saved){const parsed=JSON.parse(saved);for(const k of Object.keys(initial)){if(Number.isFinite(parsed[k])&&parsed[k]>=0)state[k]=parsed[k];}}}catch(e){}
clampState();
const upgrades=[
{id:'axe',name:'Stahl-Axt',desc:'+2 Holz pro Baum',base:25,scale:1.65,icon:'🪓',res:'wood',count:()=>state.axe},
{id:'storage',name:'Größeres Lager',desc:'+100 Lagerkapazität (Holz)',base:45,scale:1.55,icon:'📦',res:'wood',count:()=>state.storage},
{id:'mills',name:'Sägewerk',desc:'Verkauft 2 Holz pro Takt für je 1,5 Münzen',base:150,scale:1.9,icon:'🏭',res:'wood',count:()=>state.mills},
{id:'workers',name:'Weiterer Holzfäller',desc:'Fällt automatisch Bäume (Lohn in Münzen)',base:30,scale:1.8,icon:'🧔',res:'coins',count:()=>state.workers-1},
{id:'foresters',name:'Förster einstellen',desc:'Pflanzt automatisch Bäume, +10 Waldfläche',base:50,scale:1.85,icon:'🌱',res:'coins',count:()=>state.foresters}
];
const cost=u=>Math.floor(u.base*Math.pow(u.scale,u.count()));
let toastTimer;
function toast(msg){const el=$('toast');el.textContent=msg;el.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('show'),1800)}
function save(){try{localStorage.setItem('lumberjack-save-v1',JSON.stringify(state))}catch(e){}}
function addTree(silent){if(state.trees+state.saplings>=maxTrees()){if(!silent)toast('Der Wald ist voll! (max. '+maxTrees()+' Bäume)');return false}state.saplings++;state.planted++;renderForest();return true}
function fellTree(){if(state.trees<1||state.wood>=capacity())return 0;const g=Math.min(chopGain(),capacity()-state.wood);state.trees--;state.wood+=g;return g}
function renderForest(){const forest=$('forest');forest.replaceChildren();const mature=Math.min(state.trees,12);const young=Math.min(state.saplings,12-mature);for(let i=0;i<mature;i++){const tree=document.createElement('span');tree.className='tree';tree.textContent=i%4===0?'🌳':'🌲';forest.appendChild(tree)}for(let i=0;i<young;i++){const s=document.createElement('span');s.className='tree';s.textContent='🌱';forest.appendChild(s)}const rest=state.trees+state.saplings-mature-young;if(rest>0){const extra=document.createElement('span');extra.className='tree';extra.textContent='+'+rest;forest.appendChild(extra)}}
function renderUpgrades(){const root=$('upgrades');root.replaceChildren();for(const u of upgrades){const price=cost(u);const unit=u.res==='wood'?'🪵':'🪙';const btn=document.createElement('button');btn.className='upgrade';btn.disabled=state[u.res]<price;const title=document.createElement('strong');title.textContent=u.icon+' '+u.name;const desc=document.createElement('span');desc.textContent=u.desc;const priceEl=document.createElement('em');priceEl.textContent=unit+' '+price+(u.res==='wood'?' Holz':' Münzen')+(u.res==='wood'&&price>capacity()?' – Lager zu klein':'');btn.append(title,desc,priceEl);btn.addEventListener('click',()=>buy(u));root.appendChild(btn)}}
function render(){$('wood').textContent=Math.floor(state.wood)+'/'+capacity();$('trees').textContent=state.trees+(state.saplings?' (+'+state.saplings+'🌱)':'');$('coins').textContent=Math.floor(state.coins);$('workerCount').textContent=state.workers;$('foresterCount').textContent=state.foresters;$('millCount').textContent=state.mills;$('capacity').textContent=capacity();$('chopGain').textContent=chopGain();$('day').textContent='TAG '+state.day;$('level').textContent='LEVEL '+(1+Math.floor((state.workers-1+state.foresters+state.mills+state.axe+state.storage)/3));renderUpgrades()}
function chop(){if(state.trees<1){toast(state.saplings?'Die Setzlinge wachsen noch… 🌱':'Pflanze zuerst einen Baum! 🌱');return}if(state.wood>=capacity()){toast('Lager voll! Baue es aus oder verkaufe Holz im Sägewerk.');return}fellTree();$('worker').classList.add('chopping');setTimeout(()=>$('worker').classList.remove('chopping'),350);renderForest();render();save()}
function buy(u){const price=cost(u);if(state[u.res]<price)return;state[u.res]-=price;state[u.id]++;clampState();toast(u.name+' gekauft!');renderForest();render();save()}
$('plant').addEventListener('click',()=>{if(addTree(false)){render();save();toast('Ein Setzling wurde gepflanzt – er braucht etwas Zeit. 🌱')}});
$('chop').addEventListener('click',chop);
$('reset').addEventListener('click',()=>{if(!confirm('Wirklich den gesamten Fortschritt löschen?'))return;state={...initial};save();renderForest();render();toast('Neuer Wald, neues Glück!')});
setInterval(()=>{let changed=false;for(let i=0;i<state.mills;i++){const processed=Math.min(state.wood,2);if(processed>0){state.wood-=processed;state.coins+=processed*1.5;changed=true}}for(let i=0;i<state.workers;i++){if(fellTree()>0)changed=true}for(let i=0;i<state.foresters;i++){if(addTree(true))changed=true}if(state.saplings>0){const grown=Math.ceil(state.saplings/2);state.saplings-=grown;state.trees+=grown;changed=true}if(changed){renderForest();render();save()}},2000);
setInterval(()=>{state.day++;render();save()},60000);
renderForest();render();
