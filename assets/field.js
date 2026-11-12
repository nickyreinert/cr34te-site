// Field world (sheep): a second playthrough of the same idea. Loaded before script.js; it relies on script.js globals at call time.
const FIELD_INITIAL={studium:0,studiumEnd:0,sheep:0,grass:0,fleece:0,wool:0,yarn:0,sweater:0,breed:0,hunger:0,shepherds:0,sowers:0,halls:0,pasture:0,spinneries:0,knitters:0,sheepBought:0,shearer:0,seeder:0,merino:0,fmarket:0,press:0,spinEdu:0,knitEdu:0,fdealers:0,ftrader:0,dog:0,ffence:0,vet:0,well:0,fEvNext:0,autoWool:1,autoSpin:1,autoKnit:1,autoDeal:1};
const grassCap=()=>100+100*state.pasture;
const sheepCap=()=>20+15*state.pasture;
const fieldPurchases=()=>state.shepherds+state.sowers+state.halls+state.pasture+state.spinneries+state.knitters;
const fieldLevel=()=>1+Math.floor(fieldPurchases()/3);
const hallRate=()=>[4,8,16,32,64][state.press];
const hallPrice=()=>3.9;
// Dealers keep back the yarn the cheapest visible yarn upgrade needs
const yarnNeed=()=>{let n=Infinity;for(const u of upgrades){if(u.world!=='field'||isMaxed(u)||!visible(u))continue;const p=prices(u).yarn;if(p>0&&p<n)n=p}return isFinite(n)?n:0};
// Wage per work step (shepherds, sowers, spinneries, knitters): scales with hall throughput, only paid when work happens
const fWage=()=>0.08*hallRate()*hallPrice();
const shearAmt=()=>[10,30,100,300][state.shearer];
const sowN=()=>[1,3,10,30][state.seeder];
const WOOL_N=[20,60,200,600],YARN_N=[10,30,100,300],SWE_N=[5,15,50,150];
const SPIN=[[10,2],[40,8],[200,40]],KNIT=[[8,2],[40,10],[200,50]];
let pWool=3,pYarn=18,pSweater=100,fLastWage=0,fLastNet=0,fFed=1,world='forest';
function fieldRefreshPrices(){pWool=state.fmarket?3.8+Math.random()*1.4:3;pYarn=state.fmarket?24+Math.random()*6:18;pSweater=state.fmarket?130+Math.random()*40:100}
const fmmss=s=>String(Math.max(0,Math.floor(s/60))).padStart(2,'0')+':'+String(Math.max(0,Math.floor(s%60))).padStart(2,'0');

const FIELD_UPGRADES=[
{world:'field',id:'shepherds',name:'Schäfer einstellen',desc:'Schert automatisch 5 Wolle pro Takt, bekommt Lohn pro Arbeitsschritt',base:2400,scale:1.5,icon:'🧑‍🌾',res:'coins',count:()=>state.shepherds},
{world:'field',id:'sowers',name:'Sämann einstellen',desc:'Sät automatisch Gras, bekommt Lohn pro Arbeitsschritt',base:1800,scale:1.5,icon:'🌾',res:'coins',count:()=>state.sowers},
{world:'field',id:'halls',name:'Wollhalle',desc:()=>'Verkauft '+hallRate()+' Wolle pro Takt für je 3,9 Münzen, abschaltbar',base:1800,scale:1.55,icon:'🏠',res:'coins',count:()=>state.halls},
{world:'field',id:'pasture',name:'Weide erweitern',desc:'+100 Gras-Kapazität und Platz für 15 weitere Schafe',base:3600,scale:1.55,icon:'🏞️',res:'coins',count:()=>state.pasture,minLevel:2},
{world:'field',id:'sheepBought',name:'Schaf kaufen',desc:'+1 Schaf (die Herde vermehrt sich bei genug Gras von selbst)',base:900,scale:1.12,icon:'🐑',res:'coins',count:()=>state.sheepBought,can:()=>state.sheep<sheepCap(),onBuy:()=>{state.sheep=Math.min(sheepCap(),state.sheep+1)}},
{world:'field',id:'seeder',name:'Sämaschine',icon:'🚜',count:()=>state.seeder,tiers:[
  {lvl:4,c:3000,desc:'Ein Klick auf „Gras säen“ sät 3 Portionen'},
  {lvl:12,c:30000,desc:'Ein Klick auf „Gras säen“ sät 10 Portionen'},
  {lvl:20,c:300000,desc:'Ein Klick auf „Gras säen“ sät 30 Portionen'}]},
{world:'field',id:'shearer',name:'Schermaschine',icon:'✂️',count:()=>state.shearer,tiers:[
  {lvl:3,c:5000,desc:'Scheren: bis zu 30 Wolle pro Klick'},
  {lvl:10,c:50000,desc:'Scheren: bis zu 100 Wolle pro Klick'},
  {lvl:18,c:500000,desc:'Scheren: bis zu 300 Wolle pro Klick'}]},
{world:'field',id:'spinneries',name:'Spinnerei',desc:'Macht aus 5 Wolle 1 Garn pro Takt, abschaltbar',base:12000,scale:1.8,icon:'🧵',res:'coins',count:()=>state.spinneries,minLevel:4},
{world:'field',id:'spinEdu',name:'Spinn-Weiterbildung',icon:'🎓',msg:'Weiterbildung abgeschlossen! „Garn spinnen“ (Taste F) ist jetzt freigeschaltet.',count:()=>state.spinEdu,tiers:[
  {lvl:5,c:5000,desc:'Schaltet „Garn spinnen“ frei: 10 Wolle → 2 Garn pro Klick'},
  {lvl:12,c:50000,desc:'Garn spinnen: 40 Wolle → 8 Garn pro Klick'},
  {lvl:20,c:500000,desc:'Garn spinnen: 200 Wolle → 40 Garn pro Klick'}]},
{world:'field',id:'fdealers',name:'Wollhändler einstellen',desc:'Verkauft automatisch 8 Garn und 2 Pullover pro Takt zum vollen Marktpreis, Garn nur über dem Bedarf des nächsten Upgrades, abschaltbar',base:3000,scale:1.6,icon:'🧑‍💼',res:'coins',count:()=>state.fdealers,minLevel:8},
{world:'field',id:'fmarket',name:'Wollmarkt',icon:'🏪',pres:'yarn',msg:'Wollmarkt gebaut! Wolle, Garn und Pullover erzielen jetzt schwankende Marktpreise.',count:()=>state.fmarket,tiers:[{lvl:10,c:12000,p:40,desc:'Besserer Preis: Wolle Ø 4,5 (statt 3), Garn Ø 27 (statt 18), Pullover Ø 150 (statt 100)'}]},
{world:'field',id:'press',name:'Wollpresse',icon:'⚙️',pres:'yarn',count:()=>state.press,tiers:[
  {lvl:12,c:6000,p:50,desc:'Hallen verkaufen 8 Wolle pro Takt'},
  {lvl:16,c:18000,p:150,desc:'Hallen verkaufen 16 Wolle pro Takt'},
  {lvl:20,c:54000,p:450,desc:'Hallen verkaufen 32 Wolle pro Takt'},
  {lvl:24,c:162000,p:1350,desc:'Hallen verkaufen 64 Wolle pro Takt'}]},
{world:'field',id:'ftrader',name:'Marktschreier',icon:'📣',pres:'yarn',req:()=>state.fmarket>0,count:()=>state.ftrader,tiers:[
  {lvl:14,c:3000,p:100,desc:'Verkauf pro Klick: 60 Wolle · 30 Garn · 15 Pullover'},
  {lvl:20,c:12000,p:400,desc:'Verkauf pro Klick: 200 Wolle · 100 Garn · 50 Pullover'},
  {lvl:26,c:48000,p:1600,desc:'Verkauf pro Klick: 600 Wolle · 300 Garn · 150 Pullover'}]},
{world:'field',id:'knitters',name:'Strickerei einstellen',desc:'Strickt automatisch aus 4 Garn 1 Pullover pro Takt, abschaltbar',base:90000,scale:1.7,icon:'🧶',res:'coins',count:()=>state.knitters,minLevel:16},
{world:'field',id:'knitEdu',name:'Strick-Weiterbildung',icon:'🎓',msg:'Weiterbildung abgeschlossen! „Pullover stricken“ (Taste H) ist jetzt freigeschaltet.',count:()=>state.knitEdu,tiers:[
  {lvl:18,c:7500,desc:'Schaltet „Pullover stricken“ frei: 8 Garn → 2 Pullover pro Klick'},
  {lvl:26,c:75000,desc:'Pullover stricken: 40 Garn → 10 Pullover pro Klick'},
  {lvl:34,c:750000,desc:'Pullover stricken: 200 Garn → 50 Pullover pro Klick'}]},
{world:'field',id:'merino',name:'Merino-Zucht',icon:'🐏',pres:'yarn',count:()=>state.merino,tiers:[{lvl:15,c:60000,p:200,desc:'Merino: ×1,5 Wolle pro Schaf'}]},
{world:'field',id:'dog',name:'Hütehund',desc:'Schützt vor Wölfen (−70 % Schaden)',base:8,scale:1,icon:'🐕',res:'yarn',count:()=>state.dog,minLevel:6,max:1,unlock:'Gefahr auf dem Feld! Schutz ist verfügbar.'},
{world:'field',id:'well',name:'Brunnen',desc:'Schützt vor Dürre (−70 % Schaden)',base:10,scale:1,icon:'⛲',res:'yarn',count:()=>state.well,minLevel:6,max:1},
{world:'field',id:'vet',name:'Tierarzt',desc:'Schützt vor Seuchen (−70 % Schaden)',base:12,scale:1,icon:'🩺',res:'yarn',count:()=>state.vet,minLevel:6,max:1},
{world:'field',id:'ffence',name:'Weidezaun',desc:'Schützt vor Viehdieben (−70 % Schaden)',base:15,scale:1,icon:'🚧',res:'yarn',count:()=>state.ffence,minLevel:6,max:1}
];

// One tick of the field. Returns counts for the song; everything is scaled by the attention stage like the forest.
function fieldStep(){
  if(!state.studium)return{};
  const am=attEff(),cnt=n=>Math.floor(n*am+Math.random());
  let paid=0,sheared=0,spun=0,knit=0,sold=0;const c0=state.coins;
  const gcap=grassCap(),scap=sheepCap();
  state.grass=Math.min(gcap,state.grass+1+Math.floor(state.grass*0.05));
  for(let i=0;i<cnt(state.sowers);i++){const w=fWage();if(state.coins>=w){state.grass=Math.min(gcap,state.grass+5*sowN());state.coins-=w;paid+=w}}
  const need=0.5*state.sheep,eaten=Math.min(state.grass,need);fFed=need?eaten/need:1;state.grass-=eaten;
  state.fleece=Math.min(state.sheep*20,state.fleece+state.sheep*fFed*(state.merino?1.5:1));
  if(fFed>0.9&&state.sheep<scap){state.breed+=state.sheep*0.03;while(state.breed>=1&&state.sheep<scap){state.sheep++;state.breed--}}
  if(fFed<0.3){state.hunger++;if(state.hunger>=5){state.sheep=Math.max(2,state.sheep-1);state.hunger=0}}else state.hunger=0;
  for(let i=0;i<cnt(state.shepherds);i++){const w=fWage();if(state.coins<w||state.fleece<=0)continue;const take=Math.min(state.fleece,5);state.fleece-=take;state.wool+=take;state.coins-=w;paid+=w;sheared++}
  for(let i=0;i<(state.autoSpin?cnt(state.spinneries):0);i++){const w=fWage();if(state.wool>=5&&state.coins>=w){state.wool-=5;state.yarn++;state.coins-=w;paid+=w;spun++}}
  for(let i=0;i<(state.autoKnit?cnt(state.knitters):0);i++){const w=fWage();if(state.yarn>=4&&state.coins>=w){state.yarn-=4;state.sweater++;state.coins-=w;paid+=w;knit++}}
  for(let i=0;i<(state.autoWool?cnt(state.halls):0);i++){const n=Math.min(state.wool,hallRate());if(n>0){state.wool-=n;state.coins+=n*hallPrice();sold++}}
  if(state.autoDeal){const dn=Math.floor(state.fdealers*am+Math.random());for(let i=0;i<dn;i++){const n=Math.min(Math.max(0,Math.floor(state.yarn)-yarnNeed()),8);if(n>0){state.yarn-=n;state.coins+=n*pYarn;sold++}const k=Math.min(Math.floor(state.sweater),2);if(k>=1){state.sweater-=k;state.coins+=k*pSweater;sold++}}}
  fLastWage=paid;fLastNet=state.coins-c0;
  return{ok:true,sheared,spun,knit,sold,fed:fFed,sheep:state.sheep};
}

// Field events: same idea as the forest (rare, protected by a building), independent of the forest.
const FEVENTS=[
  {key:'dog',ok:()=>state.sheep>=4,hit:p=>{const n=Math.max(1,Math.floor(state.sheep*0.15*p));state.sheep=Math.max(2,state.sheep-n);return '🐺 Wolf! '+n+' Schafe gerissen.'}},
  {key:'well',ok:()=>state.grass>=20,hit:p=>{const n=Math.floor(state.grass*0.6*p);state.grass-=n;return '☀️ Dürre! '+n+' Gras verdorrt.'}},
  {key:'vet',ok:()=>state.sheep>=4,hit:p=>{const n=Math.max(1,Math.floor(state.sheep*0.1*p));state.sheep=Math.max(2,state.sheep-n);state.fleece=Math.floor(state.fleece*(1-0.5*p));return '🦠 Seuche! '+n+' Schafe erkrankt.'}},
  {key:'ffence',ok:()=>state.wool>=10,hit:p=>{const n=Math.max(1,Math.floor(state.wool*0.25*p));state.wool-=n;return '🥷 Viehdiebe! '+n+' Wolle gestohlen.'}}
];
function fieldFire(e){
  const shielded=state[e.key]>0;
  const msg=e.hit(shielded?0.3:1);
  if(shielded){const bd=document.querySelector('#fbadges [data-k="'+e.key+'"]');if(bd){bd.classList.add('pulse');setTimeout(()=>bd.classList.remove('pulse'),2500)}}
  sfx.event();sfx.bleat();
  const w=$('fieldWorld');w.classList.add('hit');setTimeout(()=>w.classList.remove('hit'),600);
  if(world!=='field')$('fdot').hidden=false;
  toast('🐑 '+msg+(shielded?' Der Schutz hat gewirkt.':''),6000);
  render();
}
function fieldRoll(){
  if(!state.studium||fieldLevel()<4||document.hidden)return;
  const now=Date.now();
  if(!state.fEvNext){state.fEvNext=now+300000;return}
  if(now<state.fEvNext||Math.random()>=0.2*ATT[attStage(idleSec())].ev)return;
  const pool=FEVENTS.filter(e=>e.ok());
  if(!pool.length)return;
  fieldFire(pool[Math.floor(Math.random()*pool.length)]);
  state.fEvNext=now+300000;
}

// Studium: a timed upgrade (also runs while the game is closed); finishing it opens the field
function studyTick(){
  if(state.studiumEnd>0&&Date.now()>=state.studiumEnd){
    state.studiumEnd=0;state.studium=1;
    if(!state.sheep){state.sheep=3;state.grass=60}
    toast('📚 Studium abgeschlossen! Das Feld ist offen – Reiter „🐑 Feld“, Wischen oder Pfeiltasten wechseln die Welt.',9000);sfx.levelUp();render();save();if(!document.hidden)setWorld('field');
  }else if(state.studiumEnd>0)renderUpgrades();
}

// ---------- locks (an action appears only once it is unlocked), keys, toggles ----------
const FLOCK={fSellWool:()=>!(state.wool>0||state.shepherds>0||state.halls>0),fSpin:()=>!state.spinEdu,fSellYarn:()=>!(state.yarn>0||state.spinneries>0||state.spinEdu>0),fKnit:()=>!state.knitEdu,fSellSwe:()=>!(state.sweater>0||state.knitters>0||state.knitEdu>0)};
const fgate=id=>FLOCK[id]&&FLOCK[id]();
const FKEYMAP={a:'fSow',s:'fShear',d:'fSellWool',f:'fSpin',g:'fSellYarn',h:'fKnit',j:'fSellSwe',1:'autoWool',2:'autoSpin',3:'autoKnit',4:'autoDeal',5:'autoMusic'};
const FHOLDABLE=['fSow','fShear','fSellWool','fSpin','fSellYarn','fKnit','fSellSwe'];
const FTOGGLES=[['autoWool','🏠','1','Wolle verkaufen',()=>state.halls>0],['autoSpin','🧵','2','Spinnerei arbeitet',()=>state.spinneries>0],['autoKnit','🧶','3','Strickerei arbeitet',()=>state.knitters>0],['autoDeal','🧑‍💼','4','Händler verkaufen',()=>state.fdealers>0]];
const FBADGES=[['dog','🐕','Hütehund'],['well','⛲','Brunnen'],['vet','🩺','Tierarzt'],['ffence','🚧','Weidezaun'],['halls','🏠','Wollhalle'],['spinneries','🧵','Spinnerei'],['knitters','🧶','Strickerei'],['fmarket','🏪','Wollmarkt'],['press','⚙️','Wollpresse'],['merino','🐏','Merino-Zucht'],['seeder','🚜','Sämaschine'],['shearer','✂️','Schermaschine'],['spinEdu','🎓','Spinn-Weiterbildung'],['knitEdu','🎓','Strick-Weiterbildung'],['fdealers','🧑‍💼','Wollhändler']];

const FIELD_HTML=`
<section class="world fieldworld" id="fieldWorld" aria-label="Dein Feld">
  <div class="sky"><span class="sun">☀</span><span class="cloud cloud1">☁</span><span class="cloud cloud2">☁</span></div>
  <div class="fhills"></div>
  <div class="fgrass" id="fgrass"></div>
  <div class="barn">🏚️</div>
  <div class="flock" id="flock"></div>
  <div class="fcrew" id="fcrew"></div>
  <div class="badges" id="fbadges"></div>
  <div class="world-caption"><span>DEIN ERSTES FELD</span><span id="fday">TAG 1</span></div>
</section>
<section class="controls">
  <div class="section-heading"><div><h2>Dein Feld</h2><p>Ein Schaf nach dem anderen.</p></div><span class="level" id="flevel">LEVEL 1</span></div>
  <div class="actions" id="factions">
    <button class="primary" id="fSow" title="Gras säen (Taste A)"><span>🌾</span><strong><i class="lbl">Gras säen </i>(A)</strong><small id="fSowInfo">gratis</small></button>
    <button id="fShear" title="Schafe scheren (Taste S)"><span>✂️</span><strong><i class="lbl">Scheren </i>(S)</strong><small id="fShearInfo"></small></button>
    <button id="fSellWool" title="Wolle verkaufen (Taste D)"><span>🪙</span><strong><i class="lbl">Wolle verkaufen </i>(D)</strong><small id="fSellWoolInfo"></small></button>
    <button id="fSpin"><span>🧵</span><strong><i class="lbl">Garn spinnen </i>(F)</strong><small id="fSpinInfo"></small></button>
    <button id="fSellYarn"><span>🏪</span><strong><i class="lbl">Garn verkaufen </i>(G)</strong><small id="fSellYarnInfo"></small></button>
    <button id="fKnit"><span>🧶</span><strong><i class="lbl">Pullover stricken </i>(H)</strong><small id="fKnitInfo"></small></button>
    <button id="fSellSwe"><span>🧥</span><strong><i class="lbl">Pullover verkaufen </i>(J)</strong><small id="fSellSweInfo"></small></button>
  </div>
  <div class="toggles" id="ftoggles"></div>
  <div class="production">
    <div><span>🐑 Herde</span><strong id="fHerd">0</strong><small id="fHerdInfo"></small></div>
    <div><span>🌾 Weide</span><strong id="fGrass">0</strong><small id="fGrassInfo"></small></div>
    <div><span>🧑‍🌾 Schäfer</span><strong id="fShep">0</strong><small id="fShepInfo"></small></div>
    <div><span>💰 Bilanz</span><strong id="fNet">0</strong><small id="fNetInfo">Einnahmen − Löhne</small></div>
  </div>
</section>
<section class="upgrades">
  <div class="section-heading"><div><h2>Ausbau & Upgrades</h2><p>Mehr Schafe, mehr Wolle.</p></div></div>
  <div class="upgrade-list" id="fupgrades"></div>
</section>`;

function setWorld(w){
  if(w==='field'&&!state.studium)return;
  world=w;
  // hidden attribute instead of inline styles: the platform turns inline style attributes in the HTML into fixed hiding rules
  $('pageForest').hidden=w!=='forest';
  $('pageField').hidden=w!=='field';
  $('topbar').dataset.w=w;
  $('tabForest').classList.toggle('on',w==='forest');
  $('tabField').classList.toggle('on',w==='field');
  if(w==='field')$('fdot').hidden=true;else $('wdot').hidden=true;
  window.scrollTo(0,0);
  render();
}

function fieldInit(){
  $('pageField').innerHTML=FIELD_HTML;
  fieldRefreshPrices();
  const on=(id,fn)=>$(id).addEventListener('click',fn);
  const cool=(id,ms)=>{$(id).disabled=true;setTimeout(()=>{$(id).disabled=false},ms)};
  on('fSow',()=>{const add=Math.min(5*sowN(),grassCap()-state.grass);if(add<=0){sfx.error();toast('Die Weide ist voll bewachsen.');return}state.grass+=add;sfx.plant();render();save()});
  on('fShear',()=>{const take=Math.min(Math.floor(state.fleece),shearAmt());if(take<1){sfx.error();toast('Die Schafe haben noch keine Wolle.');return}state.fleece-=take;state.wool+=take;sfx.snip();render();save()});
  on('fSellWool',()=>{if(fgate('fSellWool'))return;const n=Math.min(Math.floor(state.wool),WOOL_N[state.ftrader]);if(n<1){sfx.error();toast('Keine Wolle zum Verkaufen.');return}state.wool-=n;state.coins+=n*pWool;sfx.sellWood();toast(n+' Wolle verkauft: +'+Math.floor(n*pWool)+' Münzen');cool('fSellWool',2000);render();save()});
  on('fSpin',()=>{if(fgate('fSpin'))return;const [w,y]=SPIN[state.spinEdu-1];if(state.wool<w){sfx.error();toast('Zu wenig Wolle: '+w+' nötig.');return}state.wool-=w;state.yarn+=y;sfx.whirr();cool('fSpin',1000);render();save()});
  on('fSellYarn',()=>{if(fgate('fSellYarn'))return;const n=Math.min(Math.floor(state.yarn),YARN_N[state.ftrader]);if(n<1){sfx.error();toast('Kein Garn zum Verkaufen.');return}state.yarn-=n;state.coins+=n*pYarn;sfx.sellPlanks();toast(n+' Garn verkauft: +'+Math.floor(n*pYarn)+' Münzen');cool('fSellYarn',2000);render();save()});
  on('fKnit',()=>{if(fgate('fKnit'))return;const [y,p]=KNIT[state.knitEdu-1];if(state.yarn<y){sfx.error();toast('Zu wenig Garn: '+y+' nötig.');return}state.yarn-=y;state.sweater+=p;sfx.knit();cool('fKnit',1000);render();save()});
  on('fSellSwe',()=>{if(fgate('fSellSwe'))return;const n=Math.min(Math.floor(state.sweater),SWE_N[state.ftrader]);if(n<1){sfx.error();toast('Keine Pullover zum Verkaufen.');return}state.sweater-=n;state.coins+=n*pSweater;sfx.sellFurn();toast(n+' Pullover verkauft: +'+Math.floor(n*pSweater)+' Münzen');cool('fSellSwe',2000);render();save()});
  $('ftoggles').addEventListener('click',e=>{const b=e.target.closest('button');if(b&&b.id in state){state[b.id]=state[b.id]?0:1;render();save()}});
  on('tabForest',()=>setWorld('forest'));
  on('tabField',()=>setWorld('field'));
  // swipe: any clearly horizontal gesture switches between forest and field
  let sx=0,sy=0;
  document.addEventListener('touchstart',e=>{sx=e.touches[0].clientX;sy=e.touches[0].clientY},{passive:true});
  document.addEventListener('touchend',e=>{const t=e.changedTouches[0],dx=t.clientX-sx,dy=t.clientY-sy;if(Math.abs(dx)>70&&Math.abs(dx)>2*Math.abs(dy))setWorld(world==='forest'?'field':'forest')},{passive:true});
}

function renderField(){
  const has=!!state.studium;
  $('tabs').hidden=!has;
  if(!has&&world==='field')setWorld('forest');
  $('fsheepBox').hidden=!has;$('fwoolBox').hidden=!has;$('fyarnBox').hidden=!(has&&(state.yarn>0||state.spinneries>0||state.spinEdu>0));$('fsweaterBox').hidden=!(has&&(state.sweater>0||state.knitters>0||state.knitEdu>0));
  if(!has)return;
  $('fsheep').textContent=state.sheep;$('fwool').textContent=fmtN(state.wool);$('fyarn').textContent=fmtN(state.yarn);$('fsweater').textContent=fmtN(state.sweater);
  $('flevel').textContent='LEVEL '+fieldLevel();
  $('fday').textContent='TAG '+state.day;
  // actions: only unlocked ones are visible, details as short info plus tooltip
  let n=2;for(const id in FLOCK){const hide=FLOCK[id]();$(id).style.display=hide?'none':'';if(!hide)n++}$('factions').dataset.n=n;
  const set=(id,text,tip)=>{$(id+'Info').textContent=text;$(id).title=tip};
  set('fSow',sowN()>1?sowN()+' Portionen':'gratis','Gras säen (Taste A)');
  set('fShear','bis '+shearAmt(),'Schafe scheren (Taste S): bis zu '+shearAmt()+' Wolle pro Klick, '+Math.floor(state.fleece)+' bereit');
  set('fSellWool',WOOL_N[state.ftrader]+' à '+pWool.toFixed(1).replace('.',','),'Wolle verkaufen (Taste D): '+WOOL_N[state.ftrader]+' Wolle à '+pWool.toFixed(1).replace('.',',')+' Münzen');
  if(!FLOCK.fSpin())set('fSpin',SPIN[state.spinEdu-1][0]+' → '+SPIN[state.spinEdu-1][1],'Garn spinnen (Taste F): '+SPIN[state.spinEdu-1][0]+' Wolle → '+SPIN[state.spinEdu-1][1]+' Garn');
  if(!FLOCK.fSellYarn())set('fSellYarn',YARN_N[state.ftrader]+' à '+pYarn.toFixed(0),'Garn verkaufen (Taste G): '+YARN_N[state.ftrader]+' Garn à '+pYarn.toFixed(0)+' Münzen');
  if(!FLOCK.fKnit())set('fKnit',KNIT[state.knitEdu-1][0]+' → '+KNIT[state.knitEdu-1][1],'Pullover stricken (Taste H): '+KNIT[state.knitEdu-1][0]+' Garn → '+KNIT[state.knitEdu-1][1]+' Pullover');
  if(!FLOCK.fSellSwe())set('fSellSwe',SWE_N[state.ftrader]+' à '+pSweater.toFixed(0),'Pullover verkaufen (Taste J): '+SWE_N[state.ftrader]+' Pullover à '+pSweater.toFixed(0)+' Münzen');
  // cards
  const am=attEff(),d1=x=>x<1e6?x.toLocaleString('de-DE',{maximumFractionDigits:1}):fmtN(x);
  $('fHerd').textContent=state.sheep+' / '+sheepCap();
  $('fHerdInfo').textContent=fFed<0.9?'⚠ Hunger – säe Gras!':'+'+Math.floor(state.sheep*(state.merino?1.5:1))+' Wolle/Takt wächst';
  $('fGrass').textContent=fmtN(state.grass)+' / '+fmtN(grassCap());
  $('fGrassInfo').textContent=Math.floor(state.grass/grassCap()*100)+' % frisch';
  $('fShep').textContent=state.shepherds;
  $('fShepInfo').textContent='+'+Math.floor(state.shepherds*am)*5+' geschoren/Takt';
  const net=fLastNet,nb=$('fNet');
  nb.textContent=(net>=0?'+':'−')+d1(Math.abs(net))+'/Takt';nb.classList.toggle('pos',net>0);nb.classList.toggle('neg',net<0);
  $('fNetInfo').textContent='+'+d1(net+fLastWage)+' Einnahmen − '+d1(fLastWage)+' Löhne';
  // toggles (rebuilt only when something changes)
  const list=FTOGGLES.filter(t=>t[4]());
  const html=list.length?'<i class="tlabel">Automatik:</i>'+list.map(t=>'<button id="'+t[0]+'" class="'+(state[t[0]]?'on':'off')+'">'+t[1]+' ['+t[2]+'] '+t[3]+': '+(state[t[0]]?'AN':'AUS')+'</button>').join(''):'';
  const tb=$('ftoggles');if(tb.dataset.sig!==html){tb.dataset.sig=html;tb.innerHTML=html}
  // scene
  const fr=state.grass/grassCap(),sig=[Math.min(state.sheep,16),Math.min(state.shepherds,3),state.dog,Math.round(fr*4),FBADGES.map(b=>state[b[0]]>0?1:0).join('')].join(',');
  const fl=$('flock');
  if(fl.dataset.sig!==sig){
    fl.dataset.sig=sig;
    let h='';for(let i=0;i<Math.min(state.sheep,16);i++)h+='<span style="animation-delay:'+((i%5)*0.2)+'s">🐑</span>';
    if(state.sheep>16)h+='<span class="more">+'+(state.sheep-16)+'</span>';
    fl.innerHTML=h;
    let c='';for(let i=0;i<Math.min(state.shepherds,3);i++)c+='<span style="animation-delay:'+(i*0.3)+'s">🧑‍🌾</span>';if(state.dog)c+='<span>🐕</span>';
    $('fcrew').innerHTML=c;
    $('fgrass').style.filter='saturate('+(0.45+0.55*fr)+') brightness('+(0.85+0.15*fr)+')';
    $('fbadges').innerHTML=FBADGES.filter(b=>state[b[0]]>0).map(b=>'<span class="badge" data-k="'+b[0]+'" title="'+b[2]+'">'+b[1]+'</span>').join('');
  }
  for(const el of [$('fcrew')])el.classList.toggle('dozing',attStage(idleSec())>=2);
}
