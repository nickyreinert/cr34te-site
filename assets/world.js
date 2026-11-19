(function (root) {
'use strict';
var VERSION = 1, SECT = 40, START_DIST = 2500, START_YEAR = 2187, LENA_AGE = 9;

// ---------- random ----------
function hash(a, b, c) {
var h = Math.imul(a | 0, 374761393) ^ Math.imul(b | 0, 668265263) ^ Math.imul(c | 0, 2246822519);
h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16;
return h >>> 0;
}
function rng(seed) {
var s = seed >>> 0;
return function () {
s = (s + 0x6D2B79F5) | 0;
var t = Math.imul(s ^ (s >>> 15), 1 | s);
t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
}
function pick(r, a) { return a[Math.floor(r() * a.length)]; }
function wpick(r, w) { var t = 0, k; for (k in w) t += w[k]; var x = r() * t; for (k in w) { x -= w[k]; if (x <= 0) return k; } return k; }
function clamp(x, a, b) { return x < a ? a : x > b ? b : x; }
function fmt(n) { return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '.'); }

// ---------- names ----------
var SYL = ['ka', 've', 'lo', 'mir', 'san', 'tor', 'el', 'ri', 'dun', 'ar', 'ze', 'no', 'qua', 'li', 'sor', 'tha', 'bel', 'or', 'un', 'ce', 'vas', 'ky', 'ma', 'ren', 'is', 'dra', 'po', 'lun', 'he', 'tes', 'ob', 'ny'];
var ROM = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'];
function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
function word(r, n) { var s = ''; for (var i = 0; i < n; i++) s += pick(r, SYL); return cap(s); }
function starName(r) {
var x = r();
if (x < 0.45) return word(r, 2) + '-' + word(r, 2);
if (x < 0.75) return word(r, 2 + (r() < 0.3 ? 1 : 0));
return word(r, 2) + ' ' + (10 + Math.floor(r() * 890));
}

// ---------- star and world types ----------
var STARS = {
gelb: { n: 'Gelbe Sonne', c: '#ffd9a8', r: 34, heat: 1, fuel: 1 },
rot: { n: 'Roter Zwerg', c: '#ff9a72', r: 24, heat: 0.6, fuel: 0.6 },
blau: { n: 'Blauer Riese', c: '#c8dcff', r: 52, heat: 1.8, fuel: 2.2 },
weiss: { n: 'Weißer Zwerg', c: '#f2f2ff', r: 14, heat: 1.3, fuel: 0.8 },
pulsar: { n: 'Pulsar', c: '#9fd8ff', r: 10, heat: 2.2, fuel: 0.5 },
loch: { n: 'Schwarzes Loch', c: '#ff7a2f', r: 20, heat: 0.4, fuel: 0 }
};
var WORLDS = {
fels: { n: 'Felswelt', land: 1, sec: 1, c: ['#8a8078', '#5a524c'], grav: [0.7, 1.3], res: { eisen: 3, kristall: 0.5 }, life: [0, 2], weather: ['klar', 'staub'] },
wueste: { n: 'Wüstenwelt', land: 1, sec: 1, c: ['#d9a37a', '#9a6a48'], grav: [0.6, 1.1], res: { eisen: 2, kristall: 1 }, life: [1, 3], weather: ['klar', 'sand'] },
leben: { n: 'Lebende Welt', land: 1, sec: 1, c: ['#8fa07a', '#3a5a44'], grav: [0.7, 1.1], res: { sporen: 3, eisen: 0.5 }, life: [4, 7], weather: ['klar', 'regen', 'sporen'] },
ozean: { n: 'Ozeanwelt', land: 1, sec: 2, c: ['#6f9fbf', '#2a4a6a'], grav: [0.8, 1.2], res: { sporen: 1.5, kristall: 1 }, life: [3, 6], weather: ['klar', 'regen'] },
eis: { n: 'Eiswelt', land: 1, sec: 2, c: ['#d8e4ee', '#8aa0b8'], grav: [0.5, 1.0], res: { kristall: 3 }, life: [0, 3], weather: ['klar', 'schnee'] },
gas: { n: 'Gasriese', land: 0, sec: 1, c: ['#c9b48a', '#8a6a4a'], grav: [2, 3], res: {}, life: [0, 0], weather: [] }
};
var RES = {
eisen: { n: 'Eisen', p: 38 },
kristall: { n: 'Kristall', p: 92 },
sporen: { n: 'Sporen', p: 70 }
};
var RKEYS = ['eisen', 'kristall', 'sporen'];

function section(d) { return d > 2000 ? 1 : d > 1500 ? 2 : d > 1000 ? 3 : d > 500 ? 4 : 5; }
var SECTIONS = [null, 'Der Rand', 'Nebelgürtel', 'Pulsarfeld', 'Der Schlund', 'Heimat'];

// ---------- galaxy ----------
var cacheSect = {};
function sectorStars(seed, sx, sy) {
var key = seed + ':' + sx + ',' + sy;
if (cacheSect[key]) return cacheSect[key];
var r = rng(hash(seed, sx * 7919 + 13, sy * 104729 + 7)), x = r(), n = x < 0.25 ? 0 : x < 0.65 ? 1 : x < 0.88 ? 2 : 3, out = [];
for (var i = 0; i < n; i++) {
var px = (sx + r()) * SECT, py = (sy + r()) * SECT, d = Math.hypot(px, py);
if (d < 60) continue;
var sec = section(d), w = { gelb: 30, rot: 40, blau: 8, weiss: 10 };
if (sec >= 3) w.pulsar = 3;
if (sec >= 4) w.loch = 2;
var st = { id: sx + '_' + sy + '_' + i, x: px, y: py, seed: hash(seed, sx * 31 + i, sy * 17 + i * 3) };
var rr = rng(st.seed); st.type = wpick(rr, w); st.name = starName(rr);
out.push(st);
}
if (cacheSect.n > 4000) { cacheSect = {}; }
cacheSect[key] = out; cacheSect.n = (cacheSect.n || 0) + 1;
return out;
}
function solStar() { return { id: 'sol', x: 0, y: 0, type: 'gelb', name: 'Sol', seed: 4242 }; }
function startStar(seed) {
var r = rng(hash(seed, 1, 2)), a = r() * Math.PI * 2;
var st = { id: 'start', x: Math.cos(a) * START_DIST, y: Math.sin(a) * START_DIST, type: 'gelb', seed: hash(seed, 3, 4) };
st.name = starName(rng(st.seed));
return st;
}
function starsNear(S, x, y, rad) {
var out = [], s0x = Math.floor((x - rad) / SECT), s1x = Math.floor((x + rad) / SECT), s0y = Math.floor((y - rad) / SECT), s1y = Math.floor((y + rad) / SECT);
for (var sx = s0x; sx <= s1x; sx++) for (var sy = s0y; sy <= s1y; sy++) {
sectorStars(S.seed, sx, sy).forEach(function (st) { if (Math.hypot(st.x - x, st.y - y) <= rad) out.push(st); });
}
var sol = solStar(); if (Math.hypot(x, y) <= rad) out.push(sol);
var stt = startStar(S.seed); if (Math.hypot(stt.x - x, stt.y - y) <= rad) out.push(stt);
return out;
}
function findStar(S, id) {
if (id === 'sol') return solStar();
if (id === 'start') return startStar(S.seed);
var p = id.split('_'), list = sectorStars(S.seed, +p[0], +p[1]);
for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
return null;
}

// ---------- systems ----------
var cacheSys = {};
function system(S, star) {
var ck = S.seed + ':' + star.id;
if (cacheSys[ck]) return cacheSys[ck];
var r = rng(star.seed ^ 0x9e3779b9), d = Math.hypot(star.x, star.y), sec = section(d);
var sys = { star: star, sec: sec, planets: [], station: null };
if (star.id === 'sol') {
[['Merkur', 'fels', 9, 320], ['Venus', 'wueste', 14, 470], ['Erde', 'leben', 15, 640], ['Mars', 'wueste', 11, 820], ['Jupiter', 'gas', 34, 1150], ['Saturn', 'gas', 30, 1500]].forEach(function (p, i) {
sys.planets.push(makePlanet(S, star, i, p[1], r, p[0], p[2], p[3]));
});
sys.station = { orbit: 700, ang: 1.2, name: 'Luna-Werft' };
cacheSys[ck] = sys; return sys;
}
var n = 2 + Math.floor(r() * 5), orbit = 260;
var types = Object.keys(WORLDS).filter(function (k) { return WORLDS[k].sec <= Math.max(sec, 1); });
for (var i = 0; i < n; i++) {
orbit += 170 + r() * 160;
var t = pick(r, types);
if (i === 0 && star.type === 'blau') t = 'fels';
if (star.id === 'start' && i === 1) t = 'leben';
if (star.id === 'start' && i === 0) t = 'fels';
sys.planets.push(makePlanet(S, star, i, t, r, null, null, orbit));
}
var hasStation = star.id === 'start' || r() < 0.38 || (hash(S.seed, star.seed, 9) % 3 === 0 && r() < 0.5);
if (hasStation) { var pp = sys.planets[Math.floor(r() * sys.planets.length)]; sys.station = { orbit: pp.orbit + 90, ang: pp.ang + 0.25, name: word(r, 2) + '-Hafen', price: {} }; RKEYS.forEach(function (k) { sys.station.price[k] = Math.round(RES[k].p * (0.75 + r() * 0.55)); }); sys.station.fuel = Math.round(3 + r() * 3); }
if (sys.station && !sys.station.price) { sys.station.price = {}; RKEYS.forEach(function (k) { sys.station.price[k] = RES[k].p; }); sys.station.fuel = 4; }
var wr = r();
if (wr < 0.16 && star.id !== 'start') { var lp = sys.planets.filter(function (p) { return WORLDS[p.type].land; }); if (lp.length) pick(r, lp).wreck = 1 + Math.floor(r() * 3); }
cacheSys[ck] = sys;
return sys;
}
function makePlanet(S, star, i, type, r, name, size, orbit) {
var W = WORLDS[type], pr = rng(hash(star.seed, i + 1, 77));
var p = {
key: star.id + '#' + i, i: i, type: type, name: name || (star.name + ' ' + ROM[i]),
r: size || (type === 'gas' ? 26 + pr() * 14 : 8 + pr() * 9), orbit: orbit, ang: pr() * Math.PI * 2,
grav: Math.round((W.grav[0] + pr() * (W.grav[1] - W.grav[0])) * 10) / 10,
hue: pr(), seed: hash(star.seed, i + 11, 5), day: 160 + Math.floor(pr() * 160),
life: W.life[0] + Math.floor(pr() * (W.life[1] - W.life[0] + 1)),
weather: W.weather.length ? pick(pr, W.weather) : '', res: {}
};
for (var k in W.res) if (pr() < 0.4 + W.res[k] * 0.18) p.res[k] = Math.round(W.res[k] * (2 + pr() * 3));
if (star.id === 'sol') { p.life = type === 'leben' ? 6 : 0; }
return p;
}
function planetPos(p, t) { var a = p.ang + (t || 0) * 0.002 / Math.sqrt(p.orbit / 300); return [Math.cos(a) * p.orbit, Math.sin(a * 0.9) * p.orbit * 0.04, Math.sin(a) * p.orbit]; }

// ---------- ships, modules, crew ----------
var SHIPS = {
kranich: { n: 'Kranich', d: 'Forschungsschiff · Habitatring', range: 0, tank: 0, cargo: 10, o2: 0, quarters: 1, bonus: 'Scans bringen 25 % mehr Forschung' },
elster: { n: 'Elster', d: 'Kurier · schnell und leicht', range: 30, tank: 20, cargo: -10, o2: 0, quarters: 0, bonus: 'größte Sprungreichweite' },
schildkroete: { n: 'Schildkröte', d: 'Frachter · Container-Rücken', range: -15, tank: 0, cargo: 40, o2: 0, quarters: 1, bonus: 'riesiger Laderaum' },
falke: { n: 'Falke', d: 'Patrouillenschiff · gepanzert', range: 10, tank: 0, cargo: 0, o2: 60, quarters: 0, bonus: 'mehr Sauerstoff, schnellster Flug' }
};
var SKEYS = ['kranich', 'elster', 'schildkroete', 'falke'];
var MODS = {
antrieb: { n: 'Antrieb', d: 'Sprungreichweite', val: [110, 150, 190, 230], unit: 'Lj', sec: 1, cost: [{ cr: 1200, eisen: 12 }, { cr: 3500, eisen: 20, kristall: 8 }, { cr: 8000, kristall: 18, forschung: 25 }] },
tank: { n: 'Tank', d: 'Treibstoff für Sprünge', val: [100, 140, 190, 250], unit: 'E', sec: 1, cost: [{ cr: 900, eisen: 10 }, { cr: 2600, eisen: 18 }, { cr: 6000, kristall: 14, forschung: 15 }] },
laderaum: { n: 'Laderaum', d: 'Rohstoffe an Bord', val: [30, 50, 80, 120], unit: 't', sec: 1, cost: [{ cr: 700, eisen: 8 }, { cr: 2000, eisen: 16 }, { cr: 5000, kristall: 10, forschung: 10 }] },
quartiere: { n: 'Quartiere', d: 'Platz für Crew', val: [1, 2, 4, 6], unit: 'Pers.', sec: 1, cost: [{ cr: 800, eisen: 10 }, { cr: 2500, eisen: 14, sporen: 8 }, { cr: 6000, sporen: 16, forschung: 20 }] },
anzug: { n: 'Raumanzug', d: 'Sauerstoff auf Planeten', val: [180, 240, 330, 480], unit: 's', sec: 1, cost: [{ cr: 600, sporen: 6 }, { cr: 1800, sporen: 12 }, { cr: 4500, kristall: 10, forschung: 15 }] },
scanner: { n: 'Scanner', d: 'Rohstoffe und Arten aus dem Orbit', val: [0, 1, 2, 3], unit: '', sec: 2, cost: [{ cr: 1500, kristall: 8 }, { cr: 3500, kristall: 16 }, { cr: 7000, kristall: 24, forschung: 20 }] },
labor: { n: 'Labor', d: 'mehr Forschung aus Scans', val: [1, 1.5, 2, 3], unit: '×', sec: 2, cost: [{ cr: 2000, sporen: 10 }, { cr: 4500, sporen: 18, kristall: 8 }, { cr: 9000, sporen: 24, forschung: 30 }] }
};
var MKEYS = ['antrieb', 'tank', 'laderaum', 'quartiere', 'anzug', 'scanner', 'labor'];
var CREW = {
ida: { n: 'Ida Brandt', role: 'Ingenieurin', auto: 'tankt am Stern von selbst auf', cost: 0, sec: 1, jumps: 2, intro: 'Ida sitzt seit zwei Jahren an dieser Station fest. Ihr Frachter wurde verschrottet, sie nicht. „Ich repariere alles, was einen Antrieb hat. Nimmst du mich mit?“' },
tomas: { n: 'Tomas Okafor', role: 'Pilot', auto: 'fliegt Ziele im System sofort an', cost: 1500, sec: 1, jumps: 5, intro: 'Tomas war Lotse im Nebelgürtel, bis der Verkehr ausblieb. „Ich kenne jede Abkürzung zwischen hier und dem Kern. Für ein Bett und ein Ziel fliege ich dich.“' },
rena: { n: 'Rena Solberg', role: 'Biologin', auto: 'scannt beim Landen alle sichtbaren Arten', cost: 0, sec: 2, jumps: 0, intro: 'Rena hat zwanzig Jahre lang Leben auf fremden Welten katalogisiert. „Ich will sehen, was zwischen hier und der Erde wächst. Und ich will dabei sein, wenn du ankommst.“' }
};
var CKEYS = ['ida', 'tomas', 'rena'];

function modVal(S, k) { var v = MODS[k].val[S.mods[k] || 0], sh = SHIPS[S.ship]; if (k === 'antrieb') v += sh.range; if (k === 'tank') v += sh.tank; if (k === 'laderaum') v += sh.cargo; if (k === 'anzug') v += sh.o2; if (k === 'quartiere') v += sh.quarters; return v; }
function range(S) { return modVal(S, 'antrieb'); }
function tankMax(S) { return modVal(S, 'tank'); }
function cargoMax(S) { return modVal(S, 'laderaum'); }
function cargoUsed(S) { var n = 0; RKEYS.forEach(function (k) { n += S.res[k] || 0; }); return n; }
function crewMax(S) { return modVal(S, 'quartiere'); }
function o2Max(S) { return modVal(S, 'anzug'); }
function hasCrew(S, k) { return S.crew.indexOf(k) >= 0; }
function fuelCost(S, d) { return Math.ceil(d * 0.45 * (S.ship === 'elster' ? 0.9 : 1)); }
function yearsFor(d) { return 1 + d / 60; }
function dist(S) { var st = findStar(S, S.star); return Math.hypot(st.x, st.y); }
function curSection(S) { return section(dist(S)); }

// ---------- state ----------
function newGame(seed, ship) {
var S = {
v: VERSION, seed: seed >>> 0, ship: ship || 'kranich', star: 'start', jumps: 0, year: START_YEAR, cr: 600, res: { eisen: 0, kristall: 0, sporen: 0 }, forschung: 0,
fuel: 0, mods: {}, crew: [], recruitable: [], msgs: [], scanned: {}, species: {}, mined: {}, wrecks: {}, visited: {}, flags: {}, music: true, stats: { ly: 0, planets: 0, species: 0 }
};
MKEYS.forEach(function (k) { S.mods[k] = 0; });
S.fuel = Math.round(tankMax(S) * 0.6);
S.visited.start = 1;
deliver(S);
return S;
}
function ageLena(S) { return LENA_AGE + (S.year - START_YEAR); }

// ---------- jumping ----------
function canJump(S, target) {
var cur = findStar(S, S.star), d = Math.hypot(target.x - cur.x, target.y - cur.y);
if (target.id === S.star) return { ok: false, why: 'Hier bist du schon', d: 0 };
if (d > range(S)) return { ok: false, why: 'Außer Reichweite (' + Math.round(range(S)) + ' Lj)', d: d };
var f = fuelCost(S, d);
if (S.fuel < f) return { ok: false, why: 'Zu wenig Treibstoff', d: d, fuel: f };
return { ok: true, d: d, fuel: f, years: yearsFor(d) };
}
function jump(S, target) {
var c = canJump(S, target); if (!c.ok) return c;
var before = curSection(S);
S.fuel -= c.fuel; S.star = target.id; S.jumps++; S.year += c.years; S.stats.ly += c.d;
S.visited[target.id] = 1;
var after = curSection(S);
var news = { sectionUp: after > before ? after : 0, msgs: deliver(S), crew: [], auto: [] };
CKEYS.forEach(function (k) { var C = CREW[k]; if (S.recruitable.indexOf(k) < 0 && !hasCrew(S, k) && after >= C.sec && S.jumps >= C.jumps && (!C.sec || after >= C.sec)) { S.recruitable.push(k); news.crew.push(k); } });
if (hasCrew(S, 'ida')) { var st = STARS[target.type]; if (st.fuel > 0) { var add = tankMax(S) - S.fuel; if (add > 0) { S.fuel = tankMax(S); news.auto.push('Ida hat am Stern ' + Math.round(add) + ' E nachgetankt.'); } } }
return { ok: true, d: c.d, years: c.years, news: news };
}

// ---------- refuel ----------
function refuelRate(S, distToStar) {
var st = STARS[findStar(S, S.star).type]; if (!st.fuel) return { rate: 0, heat: 0 };
var rr = st.r, k = clamp((rr * 7 - distToStar) / (rr * 5), 0, 1);
return { rate: k * 15 * st.fuel, heat: k * k * 38 * st.heat, zone: k > 0 };
}

// ---------- economy ----------
function addRes(S, k, n) { var free = cargoMax(S) - cargoUsed(S), a = Math.max(0, Math.min(n, free)); S.res[k] = (S.res[k] || 0) + a; return a; }
function sell(S, k, n, station) {
n = Math.min(n, S.res[k] || 0); if (n <= 0) return 0;
var v = n * station.price[k]; S.res[k] -= n; S.cr += v; return v;
}
function buyFuel(S, station) {
var need = Math.ceil(tankMax(S) - S.fuel), c = need * station.fuel;
if (need <= 0) return 'Tank ist voll';
if (S.cr < c) { need = Math.floor(S.cr / station.fuel); c = need * station.fuel; if (need <= 0) return 'Nicht genug Credits'; }
S.fuel += need; S.cr -= c; return '';
}
function modCost(S, k) { var l = S.mods[k] || 0; return l >= 3 ? null : MODS[k].cost[l]; }
function canUpgrade(S, k) {
var c = modCost(S, k); if (!c) return { ok: false, why: 'Höchste Stufe' };
if (curSection(S) < MODS[k].sec) return { ok: false, why: 'ab Abschnitt ' + MODS[k].sec + ' (' + SECTIONS[MODS[k].sec] + ')' };
var miss = [];
if (S.cr < c.cr) miss.push(fmt(c.cr - S.cr) + ' Cr');
RKEYS.forEach(function (r) { if (c[r] && (S.res[r] || 0) < c[r]) miss.push((c[r] - (S.res[r] || 0)) + ' t ' + RES[r].n); });
if (c.forschung && S.forschung < c.forschung) miss.push((c.forschung - S.forschung) + ' Forschung');
return { ok: !miss.length, why: miss.length ? 'Es fehlen ' + miss.join(', ') : '', cost: c };
}
function upgrade(S, k) {
var u = canUpgrade(S, k); if (!u.ok) return u.why;
var c = u.cost; S.cr -= c.cr; RKEYS.forEach(function (r) { if (c[r]) S.res[r] -= c[r]; }); if (c.forschung) S.forschung -= c.forschung;
var oldT = tankMax(S); S.mods[k]++; if (k === 'tank') S.fuel += tankMax(S) - oldT;
return '';
}
function recruit(S, k) {
if (S.recruitable.indexOf(k) < 0) return 'Nicht verfügbar';
if (S.crew.length >= crewMax(S)) return 'Kein Platz in den Quartieren';
if (S.cr < CREW[k].cost) return 'Nicht genug Credits';
S.cr -= CREW[k].cost; S.crew.push(k); S.recruitable.splice(S.recruitable.indexOf(k), 1);
deliver(S); return '';
}

// ---------- scanning ----------
function scanPlanet(S, p) {
if (S.scanned[p.key]) return null;
S.scanned[p.key] = 1; S.stats.planets++;
var f = Math.round((2 + p.life) * MODS.labor.val[S.mods.labor] * (S.ship === 'kranich' ? 1.25 : 1));
var cr = 60 + Math.round(p.r * 4) + p.life * 25;
S.cr += cr; S.forschung += f;
return { cr: cr, f: f };
}
function scanSpecies(S, key, rare) {
if (S.species[key]) return null;
S.species[key] = 1; S.stats.species++;
var f = Math.round((rare ? 4 : 2) * MODS.labor.val[S.mods.labor] * (S.ship === 'kranich' ? 1.25 : 1)), cr = rare ? 120 : 45;
S.cr += cr; S.forschung += f;
return { cr: cr, f: f };
}

// ---------- story ----------
var MSG = [
{ id: 'm0', at: { jumps: 0 }, from: 'Logbuch', t: 'Der Sprung', b: 'Testflug 7, Sprungantrieb Mark II. Ein Lichtblitz, dann Stille. Die Sternkarte erkennt nichts wieder. Nach der Rechnung des Bordcomputers liegt die Erde 2.500 Lichtjahre entfernt.\n\nDer Antrieb funktioniert noch, nur nicht so weit. Ich werde nach Hause springen, ein System nach dem anderen. Und mit jedem Sprung vergehen dort Jahre, die ich nicht erlebe.' },
{ id: 'm1', at: { jumps: 1 }, from: 'Lena', t: 'Papa?', b: 'Mama sagt, dein Schiff ist verschwunden, aber nicht kaputt. Ich glaube ihr. Ich habe dir ein Bild gemalt, mit einem Raumschiff und einem großen Stern. Der Mann vom Raumfahrtzentrum sagt, er schickt es mit dem Funk hinterher.\n\nKommst du zu meinem Geburtstag?' },
{ id: 'm2', at: { jumps: 3 }, from: 'Raumfahrtzentrum', t: 'Signal empfangen', b: 'An den Piloten von Testflug 7: Wir haben Ihre Sprungsignatur aufgefangen. Sie sind am Leben, und Sie sind weit weg. Ihre Familie ist informiert.\n\nUnsere Nachrichten sind langsamer als Sie. Wenn Sie diese lesen, sind hier Jahre vergangen. Wir halten den Kanal offen.' },
{ id: 'm3', at: { jumps: 5 }, from: 'Lena', t: 'Zwölf', b: 'Ich bin jetzt zwölf. Ich habe einen Teleskop-Kurs angefangen, weil ich wissen will, wo du bist. Man kann dich nicht sehen. Aber ich weiß ungefähr, in welche Richtung ich schauen muss.\n\nMama hat wieder angefangen zu lachen. Das ist gut, oder?' },
{ id: 'm4', at: { crew: 'ida' }, from: 'Logbuch', t: 'Nicht mehr allein', b: 'Ida hat in einer Nacht den Wärmetauscher neu verkabelt. Wir tanken jetzt am Stern, ohne dass ich daran denken muss. Sie redet nicht viel, aber sie summt bei der Arbeit. Das Schiff klingt anders, seit sie da ist.' },
{ id: 'm5', at: { jumps: 8 }, from: 'Lena', t: 'Sechzehn', b: 'Ich habe das Teleskop-Programm gewonnen. Mein Projekt heißt „Wo ist Testflug 7?“. Die Jury fand den Titel komisch. Ich nicht.\n\nIch habe jetzt Zugang zum Observatorium in den Bergen. Wenn du an hellen Sternen vorbeikommst, schick ein Signal. Vielleicht finde ich dich.' },
{ id: 'm6', at: { section: 2 }, from: 'Logbuch', t: 'Der Nebelgürtel', b: 'Die Sterne stehen hier dichter, und zwischen ihnen hängt Staub, der im Licht glimmt. Die Karte zeigt Ozeanwelten und Eis. Und Spuren: ein Peilsender, älter als mein Schiff, auf einer Frequenz, die niemand mehr benutzt.\n\nJemand war vor mir hier.' },
{ id: 'm7', at: { crew: 'rena' }, from: 'Logbuch', t: 'Rena', b: 'Rena hat drei Kisten mit Proben an Bord gebracht und gefragt, ob das Labor einen Kühlschrank hat. Hat es nicht. Jetzt schon. Sie sagt, auf jeder Welt wächst etwas, das man nirgendwo sonst findet. Ich glaube, sie meint auch uns.' },
{ id: 'm8', at: { jumps: 12 }, from: 'Lena', t: 'Studium', b: 'Ich studiere jetzt Astrophysik. Im ersten Semester hat ein Professor dein Unglück als Beispiel benutzt, für Sprungfehler. Ich habe aufgezeigt und gesagt: Das ist mein Vater, und er ist kein Beispiel, er ist unterwegs.\n\nEr hat sich entschuldigt. Ich habe ihm trotzdem eine Zwei gegeben, innerlich.' },
{ id: 'm9', at: { jumps: 16 }, from: 'Lena', t: 'Das Observatorium', b: 'Ich arbeite jetzt hier. Nachts, wenn die anderen schlafen, richte ich die Antenne in deine Richtung. Meistens kommt nur Rauschen. Aber manchmal ein Echo, das genau so aussieht wie deine Sprünge.\n\nDu kommst näher. Ich kann es messen.' },
{ id: 'm10', at: { section: 3 }, from: 'Logbuch', t: 'Das Pulsarfeld', b: 'Vor mir liegt eine Region, in der tote Sterne ticken wie Uhren. Lenas Observatorium könnte mich hier orten, wenn ich ihre Takte vermesse. Der alte Peilsender führt weiter in diese Richtung.\n\nNoch 1.500 Lichtjahre.' }
];
function deliver(S) {
var got = [], sec = curSection(S);
MSG.forEach(function (m) {
if (S.msgs.some(function (x) { return x.id === m.id; })) return;
var a = m.at, ok = (a.jumps != null && S.jumps >= a.jumps) || (a.section && sec >= a.section) || (a.crew && hasCrew(S, a.crew));
if (ok) { S.msgs.push({ id: m.id, year: Math.floor(S.year), read: false }); got.push(m.id); }
});
return got;
}
function msgById(id) { for (var i = 0; i < MSG.length; i++) if (MSG[i].id === id) return MSG[i]; return null; }
var WRECKS = [
'Logbuch der Albatros, Tag 412: Der Antrieb hält nicht mehr lange. Wir setzen auf diesem Planeten auf und warten. Wenn das jemand findet: Wir wollten nur nach Hause.',
'Notiz in einem Helm: „Pulsare zählen. Wer ihre Takte kennt, kennt die Zeit. Wer die Zeit kennt, findet den Weg.“ Darunter eine Kursliste in Richtung Sol.',
'Ein halb verschütteter Container. Darin Saatgut, sorgfältig beschriftet, und ein Kinderfoto. Auf der Rückseite: „Für die Erde. Falls wir es schaffen.“'
];

function serialize(S) { return JSON.stringify(S); }
function deserialize(s) { var o = JSON.parse(s); return o && o.v === VERSION && o.mods ? o : null; }

root.World = {
VERSION: VERSION, SECT: SECT, START_YEAR: START_YEAR, hash: hash, rng: rng, clamp: clamp, fmt: fmt, word: word,
STARS: STARS, WORLDS: WORLDS, RES: RES, RKEYS: RKEYS, SECTIONS: SECTIONS, SHIPS: SHIPS, SKEYS: SKEYS, MODS: MODS, MKEYS: MKEYS, CREW: CREW, CKEYS: CKEYS, MSG: MSG, WRECKS: WRECKS,
section: section, curSection: curSection, dist: dist, starsNear: starsNear, findStar: findStar, solStar: solStar, system: system, planetPos: planetPos,
newGame: newGame, ageLena: ageLena, canJump: canJump, jump: jump, refuelRate: refuelRate, range: range, tankMax: tankMax, cargoMax: cargoMax, cargoUsed: cargoUsed,
crewMax: crewMax, o2Max: o2Max, modVal: modVal, hasCrew: hasCrew, fuelCost: fuelCost, yearsFor: yearsFor, addRes: addRes, sell: sell, buyFuel: buyFuel,
modCost: modCost, canUpgrade: canUpgrade, upgrade: upgrade, recruit: recruit, scanPlanet: scanPlanet, scanSpecies: scanSpecies, msgById: msgById, deliver: deliver,
serialize: serialize, deserialize: deserialize
};
})(typeof window !== 'undefined' ? window : globalThis);
