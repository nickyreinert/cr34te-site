const $=id=>document.getElementById(id);
const initial={wood:0,trees:0,coins:0,workers:1,foresters:0,mills:0,capacity:100,axe:0,day:1,planted:0};
let state={...initial};
try{const saved=localStorage.getItem('lumberjack-save-v1');if(saved){const parsed=JSON.parse(saved);for(const k of Object.keys(initial)){if(Number.isFinite(parsed[k])&&parsed[k]>=0)state[k]=parsed[k];}}}catch(e){}
const upgrades=[
{id:'axe',name:'Stahl-Axt',desc:'+2 Holz pro Baum',base:25,scale:1.65,icon:'🪓'},
{id:'workers',name:'Weiterer Holzfäller',desc:'Fällt automatisch Bäume',base:60,scale:1.8,icon:'🧑‍🌾'},
{id:'foresters',name:'Förster einstellen',desc:'Pflanzt automatisch Bäume',base:90,scale:1.85,icon:'🌱'},
{id:'mills',name:'Sägewerk',desc:'Verkauft Holz für Münzen',base:150,scale:1.9,icon:'🏭'},
{id:'capacity',name:'Größeres Lager',desc:'+100 Lagerkapazität',base:45,scale:1.55,icon:'📦'}
];
const cost=u=>Math.floor(u.base*Math.pow(u.scale,state[u.id]));
let toastTimer;
function toast(msg){const el=$('toast');el.textContent=msg;el.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('show'),1800)}
function save(){try{localStorage.setItem('lumberjack-save-v1',JSON.stringify(state))}catch(e){}}
function addTree(){if(state.trees>=state.capacity){toast('Dein Wald ist voll!');return false}state.trees++;state.planted++;renderForest();return true}
function renderForest(){const forest=$('forest');forest.replaceChildren();const count=Math.min(state.trees,12);for(let i=0;i<count;i++){const tree=document.createElement('span');tree.className='tree';tree.textContent=i%4===0?'🌳':'🌲';forest.appendChild(tree)}if(state.trees>12){const extra=document.createElement('span');extra.className='tree';extra.textContent='+'+(state.trees-12);forest.appendChild(extra)}}
function renderUpgrades(){const root=$('upgrades');root.replaceChildren();for(const u of upgrades){const price=cost(u);const btn=document.createElement('button');btn.className='upgrade';btn.disabled=state.wood<price;const title=document.createElement('strong');title.textContent=u.icon+' '+u.name;const desc=document.createElement('span');desc.textContent=u.desc;const priceEl=document.createElement('em');priceEl.textContent='🪵 '+price+' Holz';btn.append(title,desc,priceEl);btn.addEventListener('click',()=>buy(u));root.appendChild(btn)}}
function render(){ $('wood').textContent=Math.floor(state.wood);$('trees').textContent=state.trees;$('coins').textContent=Math.floor(state.coins);$('workerCount').textContent=state.workers;$('foresterCount').textContent=state.foresters;$('millCount').textContent=state.mills;$('capacity').textContent=state.capacity;$('chopGain').textContent=5+state.axe*2;$('day').textContent='TAG '+state.day;$('level').textContent='LEVEL '+(1+Math.floor((state.workers+state.foresters+state.mills+state.axe)/3));renderUpgrades()}
function chop(){if(!state.trees){toast('Pflanze zuerst einen Baum! 🌱');return}state.trees--;state.wood=Math.min(state.capacity*10,state.wood+5+state.axe*2);$('worker').classList.add('chopping');setTimeout(()=>$('worker').classList.remove('chopping'),350);renderForest();render();save()}
function buy(u){const price=cost(u);if(state.wood<price)return;state.wood-=price;state[u.id]++;if(u.id==='capacity')state.capacity+=100;toast(u.name+' gekauft!');render();save()}
$('plant').addEventListener('click',()=>{if(addTree()){render();save();toast('Ein neuer Baum wächst! 🌲')}});
$('chop').addEventListener('click',chop);
$('reset').addEventListener('click',()=>{if(!confirm('Wirklich den gesamten Fortschritt löschen?'))return;state={...initial};save();renderForest();render();toast('Neuer Wald, neues Glück!')});
setInterval(()=>{let changed=false;for(let i=0;i<state.workers;i++){if(state.trees>0){state.trees--;state.wood=Math.min(state.capacity*10,state.wood+5+state.axe*2);changed=true}}for(let i=0;i<state.foresters;i++){if(addTree())changed=true}for(let i=0;i<state.mills;i++){const processed=Math.min(state.wood,2);if(processed>0){state.wood-=processed;state.coins+=processed*1.5;changed=true}}if(changed){renderForest();render();save()}},2000);
setInterval(()=>{state.day++;render();save()},60000);
renderForest();render();
