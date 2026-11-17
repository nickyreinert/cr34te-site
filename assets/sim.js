(function (root) {
'use strict';
var VERSION = 3, NT = 12;

var PHASES = [
{ n: 'Morgen', t: '09–12', h: 9 }, { n: 'Mittag', t: '12–15', h: 12 }, { n: 'Nachmittag', t: '15–18', h: 15 }, { n: 'Sunset', t: '18–21', h: 18 }, { n: 'Nacht', t: '21–24', h: 21 }
];
var STAGES = [null,
{ n: 'Strandbude', cost: 0, need: 0, base: 40, cap: 35, slots: 2, menu: 5, store: 400, fix: 40, wage: 13, ops: 0.2, rmax: 2.6, sm: 1.0, d: 'Eine Holzbude, eine Kühlbox, zwei Hocker.' },
{ n: 'Strandbar', cost: 2000, need: 2, base: 80, cap: 75, slots: 3, menu: 8, store: 900, fix: 150, wage: 20, ops: 0.5, rmax: 3.5, sm: 1.15, d: 'Richtige Theke, Strohdach, Wein und Liegen-Verleih.' },
{ n: 'Cocktail Lounge', cost: 12000, need: 3, base: 140, cap: 140, slots: 5, menu: 11, store: 2000, fix: 500, wage: 35, ops: 1.5, rmax: 4.2, sm: 1.35, d: 'Cocktails, Spritz und Shots. Abends Partyvolk und After-Work.' },
{ n: 'Vice Beach Club', cost: 80000, need: 3.8, base: 220, cap: 230, slots: 7, menu: 14, store: 3500, fix: 2500, wage: 60, ops: 4, rmax: 4.7, sm: 1.7, d: 'Pool, Champagner, Sushi – das Publikum wird zahlungskräftig.' },
{ n: 'Vice Beach Resort', cost: 200000, need: 4.3, base: 320, cap: 340, slots: 9, menu: 18, store: 5500, fix: 8000, wage: 100, ops: 8, rmax: 5, sm: 2.3, d: 'Zwei Decks, Infinity-Pool, VIP-Deck. Jetset bestellt Austern.' }
];
var CONS = [0, 1.3, 1.1, 0.85, 0.7, 0.6];
var SUNSET = [0, 0.9, 1.0, 1.15, 1.25, 1.35], NIGHT = [0, 0.3, 0.45, 0.75, 1.05, 1.35], DAYF = [0.55, 1.0, 1.2];

var CATS = {
soft:     { n: 'Softdrinks', base: 0.36, time: [1.3, 1.2, 1.0, 0.6, 0.4], hot: 1.25 },
coffee:   { n: 'Kaffee', base: 0.22, time: [1.6, 0.7, 0.8, 0.2, 0.1], hot: 0.8 },
beer:     { n: 'Bier', base: 0.33, time: [0.15, 0.7, 1.1, 1.1, 1.0], hot: 1.2 },
wine:     { n: 'Wein & Sekt', base: 0.2, time: [0, 0.3, 0.6, 1.3, 1.1], hot: 1.0 },
cocktail: { n: 'Cocktails', base: 0.22, time: [0, 0.2, 0.6, 1.3, 1.4], hot: 1.1 },
shots:    { n: 'Shots', base: 0.15, time: [0, 0, 0.1, 0.6, 1.8], hot: 1.0 },
food:     { n: 'Essen', base: 0.32, time: [0.5, 1.4, 1.0, 0.9, 0.6], hot: 0.9 }
};
var CKEYS = ['soft', 'coffee', 'beer', 'wine', 'cocktail', 'shots', 'food'];

var ITEMS = {
wasser:     { n: 'Wasser', cat: 'soft', stage: 1, cost: 0.4, ref: 2.5, w: 0.4, time: [1.2, 1.2, 1, 0.7, 0.5], c: '#9fd8ff' },
limo:       { n: 'Cola & Limo', cat: 'soft', stage: 1, cost: 0.7, ref: 3.5, w: 0.5, time: [1.1, 1.2, 1.1, 0.8, 0.7], c: '#e04040' },
eistee:     { n: 'Eistee', cat: 'soft', stage: 2, cost: 0.8, ref: 4, w: 0.6, time: [0.9, 1.3, 1.2, 0.6, 0.3], c: '#d89040' },
smoothie:   { n: 'Smoothie', cat: 'soft', stage: 2, cost: 1.8, ref: 6.5, w: 1.2, spoil: 0.4, time: [1.5, 1.1, 0.8, 0.3, 0.1], c: '#ff70a0' },
kaffee:     { n: 'Kaffee', cat: 'coffee', stage: 1, eq: 'kaffee', cost: 0.5, ref: 3.5, w: 0.8, time: [1.6, 0.8, 0.8, 0.4, 0.2], c: '#6a3a1a' },
eiskaffee:  { n: 'Eiskaffee', cat: 'coffee', stage: 1, eq: 'kaffee', cost: 0.9, ref: 5, w: 1.0, time: [0.7, 1.3, 1.3, 0.3, 0.1], c: '#c8a070' },
bier:       { n: 'Bier', cat: 'beer', stage: 1, cost: 1.2, ref: 4.5, w: 0.6, time: [0.6, 1, 1.1, 1.1, 1.1], c: '#e8b830' },
radler:     { n: 'Radler', cat: 'beer', stage: 2, cost: 1.0, ref: 4, w: 0.6, time: [1.2, 1.3, 1.1, 0.6, 0.4], c: '#f0e070' },
craft:      { n: 'Craft Beer', cat: 'beer', stage: 3, cost: 2.2, ref: 7, w: 0.7, time: [0.5, 0.9, 1.1, 1.2, 1.1], c: '#b05a20' },
weisswein:  { n: 'Weißwein', cat: 'wine', stage: 2, cost: 2.0, ref: 7, w: 0.7, time: [0.6, 1, 1, 1.1, 1], c: '#f0f0b0' },
rose:       { n: 'Rosé', cat: 'wine', stage: 3, cost: 2.2, ref: 7.5, w: 0.7, time: [0.6, 1.1, 1.2, 1.1, 0.8], c: '#ffb0c0' },
spritz:     { n: 'Aperol Spritz', cat: 'wine', stage: 3, cost: 2.0, ref: 8.5, w: 1.0, time: [0.3, 0.9, 1.4, 1.3, 0.7], c: '#ff7a20' },
champagner: { n: 'Champagner', cat: 'wine', stage: 4, cost: 9, ref: 24, w: 0.8, time: [0.3, 0.6, 0.8, 1.2, 1.5], c: '#fff0a0', lux: 1 },
mojito:     { n: 'Mojito', cat: 'cocktail', stage: 3, cost: 2.6, ref: 11, w: 1.8, spoil: 0.35, time: [0, 0.8, 1.2, 1.2, 1], c: '#a0f080' },
pina:       { n: 'Piña Colada', cat: 'cocktail', stage: 3, cost: 2.8, ref: 11.5, w: 1.8, spoil: 0.35, time: [0, 1, 1.3, 1.1, 0.8], c: '#fff8e0' },
gintonic:   { n: 'Gin Tonic', cat: 'cocktail', stage: 3, cost: 2.4, ref: 10, w: 1.2, time: [0, 0.4, 0.8, 1.2, 1.5], c: '#d0f0ff' },
signature:  { n: 'Signature-Cocktail', cat: 'cocktail', stage: 5, cost: 4.5, ref: 19, w: 2.5, spoil: 0.4, time: [0, 0.6, 1, 1.4, 1.3], c: '#40e0d8', lux: 1 },
shots:      { n: 'Tequila-Shots', cat: 'shots', stage: 3, cost: 0.8, ref: 4, w: 0.5, time: [0, 0, 0.5, 1, 1.4], c: '#f8f0c0' },
pommes:     { n: 'Pommes', cat: 'food', stage: 1, cost: 0.9, ref: 5, w: 1.0, spoil: 0.2, time: [0.5, 1.3, 1.1, 0.9, 0.9], c: '#ffd040' },
eis:        { n: 'Eis am Stiel', cat: 'food', stage: 1, cost: 0.8, ref: 3.5, w: 0.5, spoil: 0.2, time: [0.6, 1.1, 1.6, 0.6, 0.2], c: '#ff9ad0' },
hotdog:     { n: 'Hot Dog', cat: 'food', stage: 2, cost: 1.4, ref: 6.5, w: 1.2, spoil: 0.3, time: [0.3, 1.3, 0.9, 0.9, 1.2], c: '#c86030' },
nachos:     { n: 'Nachos', cat: 'food', stage: 2, cost: 1.5, ref: 7, w: 1.0, spoil: 0.2, time: [0.1, 0.8, 1.1, 1.3, 1.2], c: '#f0b030' },
bowl:       { n: 'Poké Bowl', cat: 'food', stage: 3, eq: 'kueche', cost: 3.5, ref: 13, w: 1.5, spoil: 0.45, time: [0.6, 1.5, 0.8, 0.6, 0.2], c: '#60c080' },
sushi:      { n: 'Sushi-Platte', cat: 'food', stage: 4, eq: 'kueche', cost: 6, ref: 24, w: 1.8, spoil: 0.6, time: [0, 1, 0.7, 1.3, 0.9], c: '#ff8070', lux: 1 },
austern:    { n: 'Austern', cat: 'food', stage: 5, eq: 'kueche', cost: 12, ref: 45, w: 1.5, spoil: 0.6, time: [0, 0.6, 0.7, 1.5, 1], c: '#d0d8e0', lux: 1 }
};
var IKEYS = Object.keys(ITEMS);

var RENTALS = {
liege:  { n: 'Liegen-Miete', ref: 8, stage: 2, rate: [0.45, 0.5, 0.4, 0.15, 0] },
pool:   { n: 'Pool-Eintritt', ref: 12, stage: 4, rate: [0.3, 0.45, 0.45, 0.25, 0.15] },
cabana: { n: 'Cabana', ref: 30, stage: 4, rate: [0.06, 0.08, 0.08, 0.07, 0.05], needUp: 'cabanas' },
vip:    { n: 'VIP-Deck', ref: 50, cost: 20, stage: 5, rate: [0, 0.02, 0.04, 0.09, 0.11] }
};
var RKEYS = ['liege', 'pool', 'cabana', 'vip'];

var SEGS = {
fam:   { n: 'Familien', stg: [0, 0.4, 0.25, 0.12, 0.05, 0.02], ph: [1.3, 1.2, 1.1, 0.4, 0], pm: 0.85, rate: 0.9, cat: { soft: 1.6, coffee: 1.0, beer: 0.3, wine: 0.2, cocktail: 0.05, shots: 0, food: 1.5 }, fav: { eis: 2, pommes: 1.5, limo: 1.3 }, c: '#40a0e0' },
surf:  { n: 'Surfer & Locals', stg: [0, 0.3, 0.2, 0.1, 0.05, 0.02], ph: [1.2, 0.8, 1, 1, 0.6], pm: 0.8, rate: 1.0, cat: { soft: 1, coffee: 1.2, beer: 1.4, wine: 0.3, cocktail: 0.4, shots: 0.6, food: 1.2 }, fav: { smoothie: 1.6, bier: 1.3, bowl: 1.4 }, c: '#40e0a0' },
stud:  { n: 'Studenten', stg: [0, 0.3, 0.25, 0.15, 0.08, 0.03], ph: [0.6, 0.9, 1.1, 1.2, 1.4], pm: 0.75, rate: 1.1, cat: { soft: 0.8, coffee: 0.5, beer: 1.6, wine: 0.4, cocktail: 0.8, shots: 1.6, food: 1 }, fav: { bier: 1.4, shots: 1.4, hotdog: 1.3 }, c: '#ffd040' },
tour:  { n: 'Touristen', stg: [0, 0, 0.2, 0.25, 0.25, 0.18], ph: [1, 1.1, 1.1, 1, 0.6], pm: 1.0, rate: 1.0, cat: { soft: 1, coffee: 1, beer: 1, wine: 1, cocktail: 1, shots: 0.5, food: 1.2 }, fav: { pina: 1.4, spritz: 1.2, eis: 1.2 }, c: '#ff8c3c' },
party: { n: 'Partyvolk', stg: [0, 0, 0.1, 0.2, 0.22, 0.2], ph: [0.2, 0.4, 0.8, 1.3, 1.8], pm: 1.1, rate: 1.3, cat: { soft: 0.5, coffee: 0.2, beer: 1.2, wine: 0.6, cocktail: 1.6, shots: 1.8, food: 0.6 }, fav: { shots: 1.4, mojito: 1.3, gintonic: 1.2 }, c: '#ff5fb0' },
after: { n: 'After-Work', stg: [0, 0, 0, 0.18, 0.23, 0.2], ph: [0.2, 0.5, 0.9, 1.5, 1], pm: 1.3, rate: 1.0, cat: { soft: 0.6, coffee: 0.8, beer: 1, wine: 1.6, cocktail: 1.4, shots: 0.4, food: 1 }, fav: { spritz: 1.5, rose: 1.3, craft: 1.3, gintonic: 1.3 }, c: '#a070ff' },
jet:   { n: 'Jetset & VIP', stg: [0, 0, 0, 0, 0.12, 0.35], ph: [0.3, 0.7, 0.9, 1.4, 1.4], pm: 2.2, rate: 1.0, cat: { soft: 0.5, coffee: 0.6, beer: 0.3, wine: 1.8, cocktail: 1.5, shots: 0.3, food: 1.2 }, fav: { champagner: 2.5, austern: 2, sushi: 1.6, signature: 1.8 }, c: '#ffffff' }
};
var SKEYS2 = ['fam', 'surf', 'stud', 'tour', 'party', 'after', 'jet'];

var UPGRADES = {
kaffee:   { n: 'Kaffeemaschine', cost: [400], max: 1, stage: 1, d: 'Schaltet Kaffee und Eiskaffee frei – morgens gefragt' },
kuehl:    { n: 'Kühlraum', cost: [600, 1500], max: 2, stage: 1, d: '+30 % Lagerplatz, Verderb −35 % je Stufe' },
liegen:   { n: 'Liegen-Set (+4 Liegen)', cost: [400, 700, 1100], max: 3, stage: 2, d: '+12 Plätze pro Phase, mehr Liegen zum Vermieten' },
licht:    { n: 'Lichterketten', cost: [500], max: 1, stage: 2, d: '+15 % Gäste bei Sunset und Nacht' },
theke:    { n: 'Zweite Theke', cost: [2500], max: 1, stage: 2, d: '+2 Personalplätze, +20 Plätze pro Phase, +2 Kartenplätze' },
maschine: { n: 'Cocktailmaschine', cost: [5000], max: 1, stage: 3, d: 'Personal bedient 35 % schneller' },
kueche:   { n: 'Profi-Küche', cost: [4000], max: 1, stage: 3, d: 'Schaltet Poké Bowl, Sushi und Austern frei' },
djpult:   { n: 'DJ-Pult', cost: [6000], max: 1, stage: 3, d: 'Ermöglicht DJ bei Sunset und Nacht' },
flamingo: { n: 'Neon-Flamingo', cost: [6000], max: 1, stage: 4, d: 'Mehr Ambiente: Zufriedenheit +4' },
cabanas:  { n: 'Cabanas', cost: [20000], max: 1, stage: 4, d: 'Schaltet Cabana-Vermietung frei (6 pro Phase)' },
feuer:    { n: 'Feuerwerk-Anlage', cost: [40000], max: 1, stage: 5, d: '+25 % Gäste in der Nacht, Zufriedenheit +4' }
};
var UKEYS = ['kaffee', 'kuehl', 'liegen', 'licht', 'theke', 'maschine', 'kueche', 'djpult', 'flamingo', 'cabanas', 'feuer'];

var MKT = {
flyer:  { n: 'Flyer am Strand', cost: 150, days: 1, boost: 0.15, stage: 1 },
social: { n: 'Social-Media-Kampagne', cost: 600, days: 2, boost: 0.3, stage: 2 },
influ:  { n: 'Influencer-Party', cost: 2500, days: 2, boost: 0.6, stage: 3 }
};
var WEATHER = {
sonnig:   { n: 'Sonnig', f: 1.0, t: [27, 31] },
heiss:    { n: 'Hitze', f: 1.3, t: [33, 37], hot: 1 },
bewoelkt: { n: 'Bewölkt', f: 0.7, t: [22, 26], cool: 1 },
regen:    { n: 'Regen', f: 0.3, t: [19, 22], cool: 1 }
};
var GOALS = [
{ id: 'g1', n: 'Mache $300 Gewinn an einem Tag', r: 200, ok: function (s) { return s.bestProfit >= 300; } },
{ id: 'g2', n: 'Erreiche einen Ruf von 2★', r: 300, ok: function (s) { return s.bestRating >= 2; } },
{ id: 'g3', n: 'Baue zur Strandbar aus', r: 500, ok: function (s) { return s.stage >= 2; } },
{ id: 'g4', n: 'Bediene 250 Gäste an einem Tag', r: 500, ok: function (s) { return s.bestGuests >= 250; } },
{ id: 'g5', n: 'Erreiche einen Ruf von 3★', r: 900, ok: function (s) { return s.bestRating >= 3; } },
{ id: 'g6', n: 'Eröffne die Cocktail Lounge', r: 1500, ok: function (s) { return s.stage >= 3; } },
{ id: 'g7', n: 'Mache $3.000 Gewinn an einem Tag', r: 2000, ok: function (s) { return s.bestProfit >= 3000; } },
{ id: 'g8', n: 'Erreiche einen Ruf von 4★', r: 4000, ok: function (s) { return s.bestRating >= 4; } },
{ id: 'g9', n: 'Eröffne den Vice Beach Club', r: 6000, ok: function (s) { return s.stage >= 4; } },
{ id: 'g10', n: 'Mache $12.000 Gewinn an einem Tag', r: 10000, ok: function (s) { return s.bestProfit >= 12000; } },
{ id: 'g11', n: 'Eröffne das Vice Beach Resort', r: 15000, ok: function (s) { return s.stage >= 5; } },
{ id: 'g12', n: 'Resort mit 4,8★ – Legende von Vice Beach', r: 0, ok: function (s) { return s.stage >= 5 && s.bestRating >= 4.8; } }
];

function rnd(s) {
s.rs = (s.rs + 0x6D2B79F5) | 0;
var t = Math.imul(s.rs ^ (s.rs >>> 15), 1 | s.rs);
t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
function rr(s, a, b) { return a + rnd(s) * (b - a); }
function clamp(x, a, b) { return x < a ? a : (x > b ? b : x); }
function r2(x) { return Math.round(x * 100) / 100; }
function money(v) { var a = Math.round(Math.abs(v)); return (v < 0 ? '−$' : '$') + String(a).replace(/\B(?=(\d{3})+(?!\d))/g, '.'); }
function log(s, text, kind) { s.log.push({ id: ++s.logId, day: s.day, text: text, kind: kind || 'info' }); if (s.log.length > 40) s.log.shift(); }
function st(s) { return STAGES[s.stage]; }

function rollWeather(s) {
var x = rnd(s), k = x < 0.5 ? 'sonnig' : x < 0.7 ? 'heiss' : x < 0.92 ? 'bewoelkt' : 'regen';
return { k: k, temp: Math.round(rr(s, WEATHER[k].t[0], WEATHER[k].t[1])) };
}
function newGame(seed) {
var s = {
v: VERSION, rs: (seed >>> 0) || 1, day: 1, phase: 0, mode: 'plan', cash: 1500, loan: 0, rating: 1.5, bestRating: 1.5, stage: 1,
up: {}, prices: {}, stock: {}, avg: {}, cost: {}, menu: ['wasser', 'limo', 'bier', 'pommes', 'eis'], plan: { staff: 1, happy: false, dj: false },
weather: [], mkt: [], comp: 0, today: null, run: null, reports: [], goalsDone: {}, event: null, earned: 0, bestProfit: 0, bestGuests: 0,
debtDays: 0, over: false, won: false, log: [], logId: 0, mods: {}, history: []
};
UKEYS.forEach(function (k) { s.up[k] = 0; });
IKEYS.forEach(function (k) { s.stock[k] = 0; });
for (var i = 0; i < 4; i++) s.weather.push(rollWeather(s));
s.weather[0] = { k: 'sonnig', temp: 29 };
s.stock.wasser = 50; s.stock.limo = 70; s.stock.bier = 90; s.stock.pommes = 40; s.stock.eis = 40;
IKEYS.forEach(function (k) { s.prices[k] = fairFor(s, k); });
RKEYS.forEach(function (k) { s.prices[k] = fairPrice(s, k); });
startDay(s, true);
return s;
}
function startDay(s, first) {
s.phase = 0; s.mode = 'plan'; s.mods = {}; s.run = null;
IKEYS.forEach(function (k) { s.cost[k] = r2(ITEMS[k].cost * (first ? 1 : rr(s, 0.85, 1.15))); });
s.today = { phases: [], rev: {}, revTot: 0, cogs: 0, wages: 0, dj: 0, ops: 0, mkt: 0, buy: 0, rush: 0, invest: 0, guests: 0, demand: 0, turned: 0, lost: { stock: 0, service: 0, place: 0, menu: 0 }, satSum: 0, satW: 0, startCash: s.cash, startRating: s.rating, sold: {} };
s.event = (!first && s.day >= 3 && rnd(s) < 0.45) ? rollEvent(s) : null;
}

function unlocked(s, k) { var it = ITEMS[k]; return s.stage >= it.stage && (!it.eq || s.up[it.eq] > 0); }
function lockWhy(s, k) { var it = ITEMS[k]; if (s.stage < it.stage) return 'ab ' + STAGES[it.stage].n; if (it.eq && !s.up[it.eq]) return 'braucht ' + UPGRADES[it.eq].n; return ''; }
function onMenu(s, k) { return s.menu.indexOf(k) >= 0; }
function menuSlots(s) { return st(s).menu + s.up.theke * 2; }
function rentOffered(s, k) { var r = RENTALS[k]; return s.stage >= r.stage && (!r.needUp || s.up[r.needUp] > 0); }
function refOf(k) { return ITEMS[k] ? ITEMS[k].ref : RENTALS[k].ref; }
function fairPrice(s, k) { return r2(refOf(k) * st(s).sm * (0.8 + 0.08 * s.rating)); }
function dayPm(s) { var t = 0, w = 0; for (var ph = 0; ph < 5; ph++) { var f = phaseFactor(s, ph); t += f * avgPm(segMix(s, ph, null)); w += f; } return Math.max(0.6, t / w); }
function fairFor(s, k) { return r2(fairPrice(s, k) * (ITEMS[k] ? dayPm(s) : 1)); }
function slots(s) { return st(s).slots + s.up.theke * 2; }
function wage(s) { return st(s).wage; }
function staffCap(s) { return 55 * (s.up.maschine ? 1.35 : 1) * (1 + 0.1 * (s.stage - 1)); }
function placeCap(s) { return st(s).cap + s.up.liegen * 12 + s.up.theke * 20; }
function storeCap(s) { return Math.round(st(s).store * (1 + 0.3 * s.up.kuehl)); }
function stockUsed(s) { var n = 0; IKEYS.forEach(function (k) { n += s.stock[k]; }); return n; }
function rentCap(s, k) {
if (k === 'liege') return s.stage >= 2 ? (4 + 4 * s.up.liegen) * 1.6 : 0;
if (k === 'pool') return s.stage >= 4 ? 70 : 0;
if (k === 'cabana') return s.up.cabanas ? 6 : 0;
if (k === 'vip') return s.stage >= 5 ? 25 : 0;
return 0;
}
function djCost(s) { return [0, 0, 0, 250, 700, 1500][s.stage]; }
function canDJ(s, ph) { return s.up.djpult > 0 && ph >= 3; }
function canHappy(s, ph) { return ph === 2 || ph === 3; }
function mktBoost(s) { var b = 0; s.mkt.forEach(function (m) { b += MKT[m.k].boost; }); return b; }
function phaseFactor(s, ph) { return ph < 3 ? DAYF[ph] : (ph === 3 ? SUNSET[s.stage] : NIGHT[s.stage]); }
function weatherFactor(s, ph) { var w = WEATHER[s.weather[0].k].f; if (s.stage >= 3 && ph >= 3) w = Math.max(w, 0.6); return w; }
function effPrice(s, k, plan, ph) { var it = ITEMS[k]; return s.prices[k] * (plan.happy && canHappy(s, ph) && it && it.cat !== 'food' ? 0.7 : 1); }

function segMix(s, ph, plan) {
var w = {}, tot = 0;
SKEYS2.forEach(function (g) {
var x = SEGS[g].stg[s.stage] * SEGS[g].ph[ph];
if (g === 'party' && plan && plan.dj && canDJ(s, ph)) x *= 1.6;
if ((g === 'after' || g === 'jet') && s.rating > 3.5) x *= 1 + (s.rating - 3.5) * 0.4;
w[g] = x; tot += x;
});
SKEYS2.forEach(function (g) { w[g] = tot ? w[g] / tot : 0; });
return w;
}
function avgPm(mix) { var pm = 0; SKEYS2.forEach(function (g) { pm += mix[g] * SEGS[g].pm; }); return pm; }
function priceIndex(s, plan, ph) {
var pm = Math.max(0.6, avgPm(segMix(s, ph, plan))), sum = 0, wt = 0;
s.menu.forEach(function (k) { if (!unlocked(s, k)) return; sum += effPrice(s, k, plan, ph) / (fairPrice(s, k) * pm); wt++; });
return wt ? sum / wt : 1;
}
function demandGuests(s, ph, plan, noise) {
var g = st(s).base * phaseFactor(s, ph) * weatherFactor(s, ph) * (0.45 + 0.22 * s.rating) * (1 + mktBoost(s));
g *= clamp(1.25 - 0.25 * priceIndex(s, plan, ph), 0.5, 1.15);
if (plan.happy && canHappy(s, ph)) g *= 1.35;
if (plan.dj && canDJ(s, ph)) g *= 1.3;
if (s.up.licht && ph >= 3) g *= 1.15;
if (s.up.feuer && ph === 4) g *= 1.25;
if (s.comp > 0) g *= 0.8;
if (s.mods.fest && ph >= 3) g *= 1.4;
return g * (0.9 + 0.2 * Math.min(1, s.menu.length / menuSlots(s))) * (noise || 1);
}
function itemDemand(s, ph, guests, plan, menu) {
var mix = segMix(s, ph, plan), w = WEATHER[s.weather[0].k], out = { units: {}, missing: {}, potential: {} };
var hh = plan.happy && canHappy(s, ph), dj = plan.dj && canDJ(s, ph);
var byCat = {}; menu.forEach(function (k) { if (!unlocked(s, k)) return; var c = ITEMS[k].cat; (byCat[c] = byCat[c] || []).push(k); });
CKEYS.forEach(function (c) {
var C = CATS[c], wf = w.hot ? C.hot : (w.cool && c === 'coffee' ? 1.25 : 1);
var offered = byCat[c] || [], variety = Math.min(1.4, 1 + 0.12 * Math.max(0, offered.length - 1));
var cand = IKEYS.filter(function (k) { return ITEMS[k].cat === c && unlocked(s, k); });
SKEYS2.forEach(function (g) {
var G = SEGS[g], gg = guests * mix[g]; if (!gg) return;
var cd = gg * G.rate * (G.cat[c] || 0) * C.base * C.time[ph] * wf * CONS[s.stage];
if (c !== 'food' && hh) cd *= 1.2;
if (c === 'cocktail' && dj) cd *= 1.3;
if (cd <= 0) return;
var app = {}, sumOff = 0;
cand.forEach(function (k) { var a = Math.pow(ITEMS[k].time[ph], 2) * (G.fav[k] || 1) * (ITEMS[k].lux ? (g === 'jet' || g === 'after' ? 1.5 : 0.35) : 1); app[k] = a; if (offered.indexOf(k) >= 0) sumOff += a; });
cand.forEach(function (k) {
var on = offered.indexOf(k) >= 0, p = s.prices[k] * (hh && c !== 'food' ? 0.7 : 1), wp = fairPrice(s, k) * G.pm;
var el = clamp(Math.pow(wp / Math.max(0.1, p), 1.6), 0, 1.3), den = on ? sumOff : sumOff + app[k];
if (den > 0) out.potential[k] = (out.potential[k] || 0) + cd * (app[k] / den) * el;
if (on && sumOff > 0) out.units[k] = (out.units[k] || 0) + cd * variety * (app[k] / sumOff) * el;
});
if (!offered.length && cand.length) out.missing[c] = (out.missing[c] || 0) + cd;
});
});
if (s.mods.warmBeer) ['bier', 'radler', 'craft'].forEach(function (k) { if (out.units[k]) out.units[k] *= 0.8; });
return out;
}
function forecast(s, ph, plan) {
plan = plan || s.plan;
var dem = demandGuests(s, ph, plan, 1), cap = placeCap(s) * (s.mods.jga && ph === 3 ? 0.75 : 1), g = Math.min(dem, cap);
var d = itemDemand(s, ph, g, plan, s.menu), load = 0;
s.menu.forEach(function (k) { if (d.units[k]) load += d.units[k] * ITEMS[k].w; });
var rent = {}; RKEYS.forEach(function (k) { if (rentOffered(s, k)) rent[k] = g * RENTALS[k].rate[ph]; });
return { demand: dem, guests: g, cap: cap, units: d.units, potential: d.potential, missing: d.missing, mix: segMix(s, ph, plan), load: load, rent: rent, staffNeed: Math.ceil(load / staffCap(s)) };
}
function forecastDay(s) {
var tot = {}; IKEYS.forEach(function (k) { tot[k] = 0; });
for (var ph = 0; ph < 5; ph++) { var f = forecast(s, ph, { staff: s.plan.staff, happy: false, dj: canDJ(s, ph) }); for (var k in f.units) tot[k] += f.units[k]; }
return tot;
}

function beginPhase(s) {
if (s.mode !== 'plan' || s.phase > 4 || s.event) return false;
var ph = s.phase;
s.mode = 'run';
s.run = { ph: ph, tick: 0, noise: rr(s, 0.88, 1.12), occ: 0, last: null, R: { ph: ph, prod: {}, rent: {}, rev: 0, cogs: 0, wages: 0, dj: 0, ops: 0, demand: 0, guests: 0, turned: 0, load: 0, capU: 0, lost: { stock: 0, service: 0, place: 0, menu: 0 }, missing: {}, satSum: 0, satW: 0, mix: segMix(s, ph, s.plan), staffSum: 0 } };
return true;
}
function tick(s) {
var run = s.run; if (!run || s.mode !== 'run') return null;
var ph = run.ph, R = run.R;
var plan = { staff: clamp(s.plan.staff | 0, 0, slots(s)), happy: s.plan.happy && canHappy(s, ph), dj: s.plan.dj && canDJ(s, ph) };
var shape = 0.75 + 0.5 * Math.sin((run.tick + 0.5) / NT * Math.PI);
var dem = demandGuests(s, ph, plan, run.noise * rr(s, 0.9, 1.1)) / NT * shape;
var cap = placeCap(s) * (s.mods.jga && ph === 3 ? 0.75 : 1) / NT * 1.15;
var guests = Math.min(dem, cap), turned = Math.max(0, dem - cap);
var d = itemDemand(s, ph, guests, plan, s.menu);
var eff = {}, load = 0, totalReq = 0, lostStock = 0, lostService = 0, lostPlace = 0, missing = 0, sales = [];
s.menu.forEach(function (k) {
var q = d.units[k] || 0; if (!q) return;
var want = q * rr(s, 0.9, 1.1), have = Math.min(want, s.stock[k]);
eff[k] = { want: want, have: have };
load += have * ITEMS[k].w; totalReq += want; lostStock += want - have;
});
var capU = plan.staff * staffCap(s) / NT, scale = load > capU ? capU / load : 1, tickRev = 0;
Object.keys(eff).forEach(function (k) {
var e = eff[k], sold = e.have * scale, price = effPrice(s, k, plan, ph);
s.stock[k] = Math.max(0, s.stock[k] - sold);
var P = R.prod[k] || (R.prod[k] = { req: 0, sold: 0, lostStock: 0, lostService: 0, rev: 0, price: price });
P.req += e.want; P.sold += sold; P.lostStock += e.want - e.have; P.lostService += e.have - sold; P.rev += sold * price; P.price = price;
lostService += e.have - sold; tickRev += sold * price; R.cogs += sold * (s.avg[k] || s.cost[k]);
if (sold >= 0.3) sales.push([k, sold]);
});
RKEYS.forEach(function (k) {
if (!rentOffered(s, k)) return;
var r = guests * RENTALS[k].rate[ph] * rr(s, 0.9, 1.1), c = rentCap(s, k) / NT * 1.1, sold = Math.min(r, c), price = s.prices[k];
var P = R.rent[k] || (R.rent[k] = { req: 0, sold: 0, lostPlace: 0, rev: 0, price: price });
P.req += r; P.sold += sold; P.lostPlace += r - sold; P.rev += sold * price; P.price = price;
lostPlace += r - sold; totalReq += r; tickRev += sold * price;
if (RENTALS[k].cost) R.cogs += sold * RENTALS[k].cost;
});
for (var c in d.missing) { missing += d.missing[c]; R.missing[c] = (R.missing[c] || 0) + d.missing[c]; }
var wages = plan.staff * wage(s) / NT, dj = plan.dj ? djCost(s) / NT : 0, ops = guests * st(s).ops;
s.cash += tickRev - wages - dj - ops; s.earned += tickRev;
R.rev += tickRev; R.wages += wages; R.dj += dj; R.ops += ops; R.demand += dem; R.guests += guests; R.turned += turned; R.load += load; R.capU += capU;
R.lost.stock += lostStock; R.lost.service += lostService; R.lost.place += lostPlace; R.lost.menu += missing; R.staffSum += plan.staff;
var amb = s.stage * 3 + s.up.licht * 3 + s.up.flamingo * 4 + s.up.feuer * (ph === 4 ? 4 : 0) + (plan.dj ? 5 : 0) + (plan.happy ? 4 : 0) + s.up.liegen + s.up.theke * 2 + s.up.maschine * 2 + s.up.cabanas * 3;
var pi = priceIndex(s, plan, ph), util = capU > 0 ? load / capU : (load > 0 ? 2 : 0);
var lostShare = (totalReq + missing) ? (lostStock + lostService + lostPlace * 0.5 + missing * 0.6) / (totalReq + missing) : 0;
var turnShare = dem ? turned / dem : 0;
var sat = 66 + amb - (s.rating - 2) * 7 - 42 * lostShare - 12 * turnShare;
sat += pi > 1 ? -35 * (pi - 1) : 20 * (1 - pi);
if (util > 0.95) sat -= Math.min(15, 60 * (util - 0.95));
sat = clamp(sat, 0, 100);
R.satSum += sat * Math.max(0.1, guests); R.satW += Math.max(0.1, guests);
run.occ = clamp(guests / (placeCap(s) / NT), 0, 1);
run.last = { guests: guests, turned: turned, rev: tickRev, sat: sat, util: util, sales: sales, lostStock: lostStock, lostService: lostService, missing: missing };
run.tick++;
if (run.tick >= NT) return finishPhase(s);
return null;
}
function finishPhase(s) {
var R = s.run.R, T = s.today;
['demand', 'guests', 'turned'].forEach(function (k) { R[k] = Math.round(R[k]); });
Object.keys(R.prod).forEach(function (k) { var p = R.prod[k]; ['req', 'sold', 'lostStock', 'lostService'].forEach(function (x) { p[x] = Math.round(p[x]); }); });
Object.keys(R.rent).forEach(function (k) { var p = R.rent[k]; ['req', 'sold', 'lostPlace'].forEach(function (x) { p[x] = Math.round(p[x]); }); });
R.sat = R.satW ? R.satSum / R.satW : 50; R.util = R.capU ? R.load / R.capU : 0; R.staff = R.staffSum / NT; R.cap = Math.round(placeCap(s));
R.profit = R.rev - R.cogs - R.wages - R.dj - R.ops;
R.hints = hints(s, R);
T.phases.push(R); T.revTot += R.rev; T.cogs += R.cogs; T.wages += R.wages; T.dj += R.dj; T.ops += R.ops; T.guests += R.guests; T.demand += R.demand; T.turned += R.turned;
['stock', 'service', 'place', 'menu'].forEach(function (k) { T.lost[k] += R.lost[k]; });
T.satSum += R.satSum; T.satW += R.satW;
Object.keys(R.prod).forEach(function (k) { T.rev[k] = (T.rev[k] || 0) + R.prod[k].rev; T.sold[k] = (T.sold[k] || 0) + R.prod[k].sold; });
Object.keys(R.rent).forEach(function (k) { T.rev[k] = (T.rev[k] || 0) + R.rent[k].rev; T.sold[k] = (T.sold[k] || 0) + R.rent[k].sold; });
R.last = s.run.last; R.occ = s.run.occ;
s.run = null; s.phase++; s.mode = 'plan';
if (s.plan.happy && !canHappy(s, s.phase)) s.plan.happy = false;
if (s.phase > 4) endDay(s);
return R;
}
function runPhase(s) { if (!beginPhase(s)) return null; var R = null; while (!R) R = tick(s); return R; }
function hints(s, R) {
var h = [];
if (R.turned > R.demand * 0.08) h.push({ k: 'bad', t: R.turned + ' Gäste abgewiesen – kein Platz. Ausbau, Liegen oder zweite Theke bringen mehr Plätze.' });
if (R.lost.service > 5) h.push({ k: 'bad', t: Math.round(R.lost.service) + ' Bestellungen nicht bedient – zu wenig Personal (Auslastung ' + Math.round(R.util * 100) + ' %).' });
Object.keys(R.prod).forEach(function (k) { var p = R.prod[k]; if (p.lostStock > 2) h.push({ k: 'bad', t: ITEMS[k].n + ' ausverkauft – ' + p.lostStock + ' Verkäufe verloren.' }); });
Object.keys(R.missing).filter(function (c) { return R.missing[c] > 3; }).sort(function (a, b) { return R.missing[b] - R.missing[a]; }).slice(0, 2)
.forEach(function (c) { h.push({ k: 'warn', t: Math.round(R.missing[c]) + '× nach ' + CATS[c].n + ' gefragt – nichts davon auf der Karte.' }); });
if (R.lost.place > 5) h.push({ k: 'bad', t: Math.round(R.lost.place) + ' Vermietungen abgelehnt – zu wenig Liegen oder Plätze.' });
if (R.util < 0.45 && R.staff > 1.2) h.push({ k: 'warn', t: 'Personal kaum ausgelastet (' + Math.round(R.util * 100) + ' %) – weniger Leute sparen ' + money(wage(s)) + ' je Kopf.' });
var slow = Object.keys(R.prod).filter(function (k) { return R.prod[k].req < 2; });
if (slow.length) h.push({ k: 'warn', t: 'Kaum bestellt: ' + slow.map(function (k) { return ITEMS[k].n; }).join(', ') + ' – passt nicht zu Tageszeit oder Publikum.' });
if (!h.length) h.push({ k: 'good', t: 'Gut gelaufen! Zufriedenheit ' + Math.round(R.sat) + ' %.' });
return h;
}

function upkeep(s) { var u = 0; UKEYS.forEach(function (k) { for (var i = 0; i < s.up[k]; i++) u += UPGRADES[k].cost[i] * 0.01; }); return Math.round(u); }
function endDay(s) {
var T = s.today, fix = st(s).fix, upk = upkeep(s), interest = Math.round(s.loan * 0.015), spoil = 0, spoilVal = 0;
IKEYS.forEach(function (k) {
var it = ITEMS[k]; if (!it.spoil || s.stock[k] < 1) return;
var lost = Math.floor(s.stock[k] * clamp(it.spoil * (1 - 0.35 * s.up.kuehl) * (s.mods.powerCut ? 2 : 1), 0, 0.9));
s.stock[k] -= lost; spoil += lost; spoilVal += lost * (s.avg[k] || s.cost[k]);
});
IKEYS.forEach(function (k) { s.stock[k] = Math.round(s.stock[k]); });
s.cash -= fix + upk + interest;
var avgSat = T.satW ? T.satSum / T.satW : 50, stars = clamp((avgSat - 20) / 13, 0, 5), r0 = s.rating;
s.rating = clamp(s.rating + (stars - s.rating) * 0.3 + (s.mods.vipBoost || 0), 0, st(s).rmax);
if (s.rating > s.bestRating) s.bestRating = s.rating;
var profit = T.revTot - T.cogs - T.wages - T.dj - T.ops - fix - upk - interest - T.mkt - spoilVal;
var rep = {
day: s.day, stage: s.stage, rev: T.rev, revTot: T.revTot, cogs: T.cogs, wages: T.wages, dj: T.dj, ops: T.ops, mkt: T.mkt, fix: fix, upkeep: upk, interest: interest,
spoil: spoil, spoilVal: spoilVal, profit: profit, guests: T.guests, demand: T.demand, turned: T.turned, lost: T.lost, sat: avgSat, stars: stars,
rating0: r0, rating1: s.rating, cash: s.cash, invest: T.invest, buy: T.buy + T.rush, sold: T.sold, phases: T.phases, weather: s.weather[0]
};
if (T.guests > s.bestGuests) s.bestGuests = T.guests;
if (profit > s.bestProfit) s.bestProfit = profit;
s.history.push({ d: s.day, p: Math.round(profit), r: r2(s.rating), c: Math.round(s.cash) }); if (s.history.length > 30) s.history.shift();
s.mkt.forEach(function (m) { m.left--; }); s.mkt = s.mkt.filter(function (m) { return m.left > 0; });
if (s.comp > 0) s.comp--;
if (s.cash < 0) { var room = loanLimit(s) - s.loan; if (room > 0) { var need = Math.min(room, Math.ceil(-s.cash / 100) * 100); s.loan += need; s.cash += need; rep.autoLoan = need; } }
if (s.cash < 0) { s.debtDays++; rep.debt = s.debtDays; if (s.debtDays >= 3) s.over = true; } else s.debtDays = 0;
checkGoals(s, rep);
s.reports.push(rep); if (s.reports.length > 7) s.reports.shift();
s.mode = 'night';
return rep;
}
function nextDay(s) {
if (s.over || s.mode !== 'night') return;
s.day++; s.weather.shift(); s.weather.push(rollWeather(s));
if (rnd(s) < 0.2) s.weather[0] = rollWeather(s);
startDay(s, false);
}
function checkGoals(s, rep) {
rep.goals = [];
for (var i = 0; i < GOALS.length; i++) {
var g = GOALS[i]; if (s.goalsDone[g.id]) continue;
if (g.ok(s)) { s.goalsDone[g.id] = true; s.cash += g.r; rep.goals.push(g); if (g.id === 'g12') s.won = true; } else break;
}
}
function currentGoal(s) { for (var i = 0; i < GOALS.length; i++) if (!s.goalsDone[GOALS[i].id]) return GOALS[i]; return null; }

function setPrice(s, k, v) { s.prices[k] = clamp(Math.round(v * 2) / 2, 0, 999); }
function toggleMenu(s, k) {
var i = s.menu.indexOf(k);
if (i >= 0) { s.menu.splice(i, 1); return ''; }
if (!unlocked(s, k)) return lockWhy(s, k);
if (s.menu.length >= menuSlots(s)) return 'Karte ist voll (' + menuSlots(s) + ' Plätze)';
s.menu.push(k);
return '';
}
function rushActive(s) { return s.mode === 'run' || (s.mode === 'plan' && s.phase > 0); }
function buy(s, k, qty) {
qty = Math.floor(qty); if (qty <= 0) return 'Menge fehlt';
if (!unlocked(s, k)) return lockWhy(s, k);
var free = storeCap(s) - stockUsed(s); if (free < 1) return 'Lager ist voll';
qty = Math.min(qty, Math.floor(free));
var rush = rushActive(s), unit = s.cost[k] * (rush ? 1.5 : 1), total = r2(unit * qty);
if (s.cash < total) { qty = Math.floor(s.cash / unit); total = r2(unit * qty); if (qty <= 0) return 'Nicht genug Geld'; }
var old = s.stock[k], oa = s.avg[k] || s.cost[k];
s.avg[k] = r2((old * oa + qty * unit) / (old + qty));
s.stock[k] += qty; s.cash -= total;
if (rush) s.today.rush += total; else s.today.buy += total;
return '';
}
function upgradeInfo(s, k) {
var u = UPGRADES[k], lvl = s.up[k];
if (lvl >= u.max) return { ok: false, done: true, why: 'Voll ausgebaut' };
if (s.stage < u.stage) return { ok: false, why: 'ab Stufe ' + u.stage + ' (' + STAGES[u.stage].n + ')', cost: u.cost[lvl] };
return { ok: s.cash >= u.cost[lvl], why: s.cash >= u.cost[lvl] ? '' : 'Nicht genug Geld', cost: u.cost[lvl] };
}
function buyUpgrade(s, k) { var i = upgradeInfo(s, k); if (!i.ok) return i.why; s.cash -= i.cost; s.up[k]++; s.today.invest += i.cost; IKEYS.forEach(function (j) { if (ITEMS[j].eq === k) s.prices[j] = fairFor(s, j); }); return ''; }
function stageInfo(s) {
var n = STAGES[s.stage + 1]; if (!n) return null;
var locked = s.bestRating < n.need;
return { stage: s.stage + 1, n: n.n, cost: n.cost, ok: !locked && s.cash >= n.cost, locked: locked, why: locked ? 'Ruf ' + String(n.need).replace('.', ',') + '★' : (s.cash >= n.cost ? '' : 'Nicht genug Geld'), def: n };
}
function expand(s) {
var i = stageInfo(s); if (!i) return 'Maximal ausgebaut'; if (!i.ok) return i.why;
s.cash -= i.cost; s.stage++; s.today.invest += i.cost;
RKEYS.forEach(function (k) { if (RENTALS[k].stage === s.stage) s.prices[k] = fairPrice(s, k); });
IKEYS.forEach(function (k) { if (ITEMS[k].stage === s.stage || (ITEMS[k].eq && ITEMS[k].stage <= s.stage)) s.prices[k] = fairFor(s, k); });
return '';
}
function mktCost(s, k) { return MKT[k].cost * s.stage; }
function buyMkt(s, k) {
var m = MKT[k], c = mktCost(s, k);
if (s.stage < m.stage) return 'ab Stufe ' + m.stage;
for (var i = 0; i < s.mkt.length; i++) if (s.mkt[i].k === k) return 'Läuft bereits';
if (s.cash < c) return 'Nicht genug Geld';
s.cash -= c; s.mkt.push({ k: k, left: m.days }); s.today.mkt += c; return '';
}
function loanLimit(s) { return 2000 * s.stage + Math.round(s.bestRating * 500); }
function borrow(s, a) { a = Math.min(a, loanLimit(s) - s.loan); if (a <= 0) return 'Kreditrahmen ausgeschöpft'; s.loan += a; s.cash += a; return ''; }
function repay(s, a) { a = Math.min(a, s.loan, Math.floor(s.cash)); if (a <= 0) return 'Nichts zu tilgen'; s.loan -= a; s.cash -= a; return ''; }

function rollEvent(s) {
var list = ['jga', 'supplier', 'konkurrenz', 'kontrolle', 'strom', 'fest'];
if (s.stage >= 3) list.push('promi');
var k = list[Math.floor(rnd(s) * list.length)], e = { k: k };
if (k === 'jga') { e.amount = 150 * s.stage + 100; e.t = 'Ein Junggesellinnenabschied will beim Sunset die Bar teilreservieren. Sie zahlen ' + money(e.amount) + ' sofort, dafür hast du beim Sunset 25 % weniger Plätze.'; e.yes = 'Annehmen (+' + money(e.amount) + ')'; e.no = 'Ablehnen'; }
if (k === 'supplier') { e.qty = 200; e.unit = r2(s.cost.bier * 0.65); e.t = 'Ein Großhändler bietet 200 Flaschen Bier für ' + money(e.unit * 200) + ' an (35 % unter heutigem Preis). Braucht Lagerplatz.'; e.yes = 'Kaufen (' + money(e.unit * 200) + ')'; e.no = 'Nein danke'; }
if (k === 'konkurrenz') { e.amount = 200 + 150 * s.stage; e.t = 'Nebenan eröffnet eine Konkurrenz-Bar. Ohne Gegenaktion verlierst du 3 Tage lang 20 % der Gäste. Eine Gegenaktion kostet ' + money(e.amount) + '.'; e.yes = 'Gegenaktion (' + money(e.amount) + ')'; e.no = 'Ignorieren'; }
if (k === 'kontrolle') { e.amount = 100; e.fine = 300 * s.stage; e.t = 'Heute kommt das Gesundheitsamt. Aufräumen kostet ' + money(e.amount) + ' und wirft 20 % der verderblichen Ware weg. Sonst 50 % Risiko auf ' + money(e.fine) + ' Strafe.'; e.yes = 'Aufräumen (' + money(e.amount) + ')'; e.no = 'Risiko eingehen'; }
if (k === 'strom') { e.amount = 80 + 60 * s.stage; e.t = 'Es droht ein Stromausfall. Ein Notstromaggregat kostet ' + money(e.amount) + '. Sonst 50 % Risiko: Bier wird warm (−20 % Bierverkauf) und über Nacht verdirbt doppelt so viel.'; e.yes = 'Aggregat mieten (' + money(e.amount) + ')'; e.no = 'Riskieren'; }
if (k === 'fest') { e.t = 'Stadtfest heute Abend! Bei Sunset und Nacht kommen 40 % mehr Leute. Genug Personal und Ware einplanen.'; e.yes = 'Super!'; e.info = 1; }
if (k === 'promi') { e.amount = 300 * s.stage; e.t = 'Ein Promi will heute Abend kommen, wenn die Drinks aufs Haus gehen (' + money(e.amount) + '). Das bringt deinem Ruf einen Schub.'; e.yes = 'Einladen (' + money(e.amount) + ')'; e.no = 'Absagen'; }
return e;
}
function answerEvent(s, yes) {
var e = s.event; if (!e) return '';
if (e.k === 'jga' && yes) { s.cash += e.amount; s.mods.jga = 1; }
if (e.k === 'supplier' && yes) {
var q = Math.min(e.qty, Math.floor(storeCap(s) - stockUsed(s))), cost = r2(q * e.unit);
if (q > 0 && s.cash >= cost) { var o = s.stock.bier, oa = s.avg.bier || s.cost.bier; s.avg.bier = r2((o * oa + q * e.unit) / (o + q)); s.stock.bier += q; s.cash -= cost; s.today.buy += cost; }
}
if (e.k === 'konkurrenz') { if (yes && s.cash >= e.amount) { s.cash -= e.amount; s.today.mkt += e.amount; } else s.comp = 3; }
if (e.k === 'kontrolle') {
if (yes && s.cash >= e.amount) { s.cash -= e.amount; s.today.mkt += e.amount; IKEYS.forEach(function (k) { if (ITEMS[k].spoil) s.stock[k] = Math.floor(s.stock[k] * 0.8); }); }
else if (rnd(s) < 0.5) { s.cash -= e.fine; s.today.mkt += e.fine; log(s, 'Strafe vom Gesundheitsamt: ' + money(e.fine), 'bad'); }
}
if (e.k === 'strom') { if (yes && s.cash >= e.amount) { s.cash -= e.amount; s.today.mkt += e.amount; } else if (rnd(s) < 0.5) { s.mods.warmBeer = 1; s.mods.powerCut = 1; log(s, 'Stromausfall! Das Bier ist warm.', 'bad'); } }
if (e.k === 'fest') s.mods.fest = 1;
if (e.k === 'promi' && yes && s.cash >= e.amount) { s.cash -= e.amount; s.today.mkt += e.amount; s.mods.vipBoost = 0.25; }
s.event = null; return '';
}

function serialize(s) { return JSON.stringify(s); }
function deserialize(str) {
var s = JSON.parse(str); if (!s || s.v !== VERSION || !s.today) return null;
if (s.mode === 'run') { s.mode = 'plan'; s.run = null; }
return s;
}

root.BarSim = {
NT: NT, PHASES: PHASES, STAGES: STAGES, CATS: CATS, CKEYS: CKEYS, ITEMS: ITEMS, IKEYS: IKEYS, RENTALS: RENTALS, RKEYS: RKEYS, SEGS: SEGS, SEGKEYS: SKEYS2,
UPGRADES: UPGRADES, UKEYS: UKEYS, MKT: MKT, WEATHER: WEATHER, GOALS: GOALS,
newGame: newGame, beginPhase: beginPhase, tick: tick, runPhase: runPhase, nextDay: nextDay, setPrice: setPrice, toggleMenu: toggleMenu, buy: buy, rushActive: rushActive,
upgradeInfo: upgradeInfo, buyUpgrade: buyUpgrade, stageInfo: stageInfo, expand: expand, buyMkt: buyMkt, mktCost: mktCost, borrow: borrow, repay: repay, loanLimit: loanLimit,
answerEvent: answerEvent, currentGoal: currentGoal, unlocked: unlocked, lockWhy: lockWhy, onMenu: onMenu, menuSlots: menuSlots, rentOffered: rentOffered,
fairPrice: fairPrice, fairFor: fairFor, slots: slots, wage: wage, staffCap: staffCap, placeCap: placeCap, storeCap: storeCap, stockUsed: stockUsed, rentCap: rentCap, djCost: djCost,
canDJ: canDJ, canHappy: canHappy, forecast: forecast, forecastDay: forecastDay, segMix: segMix, upkeep: upkeep, money: money, serialize: serialize, deserialize: deserialize
};
})(typeof window !== 'undefined' ? window : globalThis);
