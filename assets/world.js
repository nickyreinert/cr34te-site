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
if (sec >= 3) w.pulsar = 12;
if (sec >= 4) w.loch = 8;
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
sys.planets.push(makePlanet(S, star, i, p[1], r, p[0], p[2], p[3])); sys.planets[i].sol = p[0].toLowerCase();
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
var hasStation = star.id === 'start' || star.type === 'loch' || r() < 0.38 || (hash(S.seed, star.seed, 9) % 3 === 0 && r() < 0.5);
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
if ((star.type === 'pulsar' || star.type === 'loch') && W.land) p.res.exotik = 2 + Math.floor(pr() * 4);
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
function baseRange(S) { return modVal(S, 'antrieb'); }
function sling(S) { var st = findStar(S, S.star); return st && st.type === 'loch' && S.mods.gravi > 0 ? MODS.gravi.val[S.mods.gravi] : 0; }
function range(S) { return Math.max(baseRange(S), sling(S)); }
function tankMax(S) { return modVal(S, 'tank'); }
function cargoMax(S) { return modVal(S, 'laderaum'); }
function cargoUsed(S) { var n = 0; RKEYS.forEach(function (k) { n += S.res[k] || 0; }); return n; }
function crewMax(S) { return modVal(S, 'quartiere'); }
function o2Max(S) { return modVal(S, 'anzug'); }
function hasCrew(S, k) { return S.crew.indexOf(k) >= 0; }
function fuelCost(S, d) { return Math.ceil(d * 0.45 * (S.ship === 'elster' ? 0.9 : 1) * (S.techs && S.techs.indexOf('resonanz') >= 0 ? 0.8 : 1)); }
function yearsFor(d) { return 1 + d / 60; }
function dist(S) { var st = findStar(S, S.star); return Math.hypot(st.x, st.y); }
function curSection(S) { return section(dist(S)); }

// ---------- state ----------
function newGame(seed, ship) {
var S = {
v: VERSION, seed: seed >>> 0, ship: ship || 'kranich', star: 'start', jumps: 0, year: START_YEAR, cr: 600, res: { eisen: 0, kristall: 0, sporen: 0 }, forschung: 0,
fuel: 0, techs: [], ruins: {}, frags: 0, mapLvl: 0, mods: {}, crew: [], recruitable: [], bases: [], msgs: [], scanned: {}, species: {}, mined: {}, wrecks: {}, visited: {}, flags: {}, music: true, stats: { ly: 0, planets: 0, species: 0 }
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
var sl = d > baseRange(S), f = fuelCost(S, Math.min(d, baseRange(S)));
if (S.fuel < f) return { ok: false, why: 'Zu wenig Treibstoff', d: d, fuel: f };
return { ok: true, d: d, fuel: f, years: yearsFor(d) + (sl ? 8 : 0), sling: sl };
}
function jump(S, target) {
var c = canJump(S, target); if (!c.ok) return c;
var before = curSection(S), prod = production(S, findStar(S, S.star));
S.fuel -= c.fuel; S.star = target.id; S.jumps++; S.year += c.years; S.stats.ly += c.d;
S.visited[target.id] = 1;
var after = curSection(S);
var news = { sectionUp: after > before ? after : 0, msgs: deliver(S), crew: [], auto: prod };
CKEYS.forEach(function (k) { var C = CREW[k]; if (S.recruitable.indexOf(k) < 0 && !hasCrew(S, k) && after >= C.sec && S.jumps >= C.jumps && (!C.sec || after >= C.sec)) { S.recruitable.push(k); news.crew.push(k); } });
if (hasCrew(S, 'ida')) { var st = STARS[target.type]; if (st.fuel > 0) { var add = tankMax(S) - S.fuel; if (add > 0) { S.fuel = tankMax(S); news.auto.push('Ida hat am Stern ' + Math.round(add) + ' E nachgetankt.'); } } }
return { ok: true, d: c.d, years: c.years, sling: c.sling, news: news };
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
var oldT = tankMax(S); S.mods[k] = (S.mods[k] || 0) + 1; if (k === 'tank') S.fuel += tankMax(S) - oldT;
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
S.cr += cr; S.forschung += f; S.flags.ftot = (S.flags.ftot || 0) + f;
return { cr: cr, f: f };
}
function scanSpecies(S, key, rare) {
if (S.species[key]) return null;
S.species[key] = 1; S.stats.species++;
var f = Math.round((rare ? 4 : 2) * MODS.labor.val[S.mods.labor] * (S.ship === 'kranich' ? 1.25 : 1) * (S.techs && S.techs.indexOf('licht') >= 0 ? 2 : 1)), cr = rare ? 120 : 45;
S.cr += cr; S.forschung += f; S.flags.ftot = (S.flags.ftot || 0) + f;
return { cr: cr, f: f };
}

// ---------- story ----------
var MSG = [
{ id: 'm0', at: { jumps: 0 }, from: 'Logbuch', t: 'Der Sprung', b: 'Testflug 7, Sprungantrieb Mark II. Ein Lichtblitz, dann Stille. Die Sternkarte erkennt nichts wieder. Nach der Rechnung des Bordcomputers liegt die Erde 2.500 Lichtjahre entfernt.\n\nDer Antrieb funktioniert noch, nur nicht so weit. Ich werde nach Hause springen, ein System nach dem anderen. Und mit jedem Sprung vergehen dort Jahre, die ich nicht erlebe.' },
{ id: 'm1', at: { jumps: 0 }, from: 'Lena', t: 'Papa', b: "Mama sagt, ich soll nicht weinen, weil du nicht kaputt bist, nur sehr weit weg. Ich weine trotzdem. Aber nur abends, wenn sie es nicht sieht.\n\nIch habe dein Hemd mit den Sternen genommen. Ich schlafe darin. Es riecht noch nach dir, nach Kaffee und ein bisschen nach Maschine.\n\nDer Mann vom Raumfahrtzentrum sagt, sie schicken meine Nachricht hinter dir her, so schnell es geht. Er sagt, sie braucht sehr lange. Ich habe gesagt, das macht nichts. Ich kann warten. Ich bin gut im Warten.\n\nIch habe einen Kalender gemalt. Jeden Abend mache ich ein Kreuz. Wenn er voll ist, male ich einen neuen.\n\nKomm nach Hause, Papa. Ich lasse das Licht im Flur an.\n\nDeine Lena, neun Dreiviertel" },
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
var a = m.at, ok = (a.jumps != null && S.jumps >= a.jumps) || (a.section && sec >= a.section) || (a.crew && hasCrew(S, a.crew)) || (a.flag && (S.flags[a.flag] || 0) >= a.n) || (a.bases && (S.bases || []).length >= a.bases) || (a.dist && dist(S) <= a.dist) || (a.star && S.star === a.star);
if (ok && a.near && dist(S) > a.near) ok = false;
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

// ---------- bases, measuring, production ----------
function mainRes(p) { var best = null; for (var k in p.res) if (!best || p.res[k] > p.res[best]) best = k; return best || 'eisen'; }
function canBuild(S, p) {
if ((S.bases || []).some(function (b) { return b.key === p.key; })) return { ok: false, built: true, why: 'Hier steht schon eine Basis' };
if (curSection(S) < 2) return { ok: false, why: 'Basen ab Abschnitt 2 (Nebelgürtel)' };
var c = root.World.BASE_COST || { cr: 2500, eisen: 20, kristall: 8 }, miss = [];
if (S.cr < c.cr) miss.push(fmt(c.cr - S.cr) + ' Cr');
RKEYS.forEach(function (k) { if (c[k] && (S.res[k] || 0) < c[k]) miss.push((c[k] - (S.res[k] || 0)) + ' t ' + RES[k].n); });
return { ok: !miss.length, why: miss.length ? 'Es fehlen ' + miss.join(', ') : '', cost: c };
}
function buildBase(S, p) {
var u = canBuild(S, p); if (!u.ok) return u.why;
S.cr -= u.cost.cr; RKEYS.forEach(function (k) { if (u.cost[k]) S.res[k] -= u.cost[k]; });
S.bases.push({ key: p.key, name: p.name, k: mainRes(p) });
deliver(S); return '';
}
function production(S, leaving) {
var out = [], mult = hasCrew(S, 'ben') ? 2 : 1, cr = 0, got = {};
(S.bases || []).forEach(function (b) { var a = addRes(S, b.k, 3 * mult); got[b.k] = (got[b.k] || 0) + a; cr += 120 * mult + (3 * mult - a) * 20; });
if (S.bases && S.bases.length) { S.cr += cr; out.push('Deine ' + S.bases.length + ' Basen liefern ' + Object.keys(got).filter(function (k) { return got[k]; }).map(function (k) { return got[k] + ' t ' + RES[k].n; }).concat([fmt(cr) + ' Cr']).join(', ') + '.'); }
if (hasCrew(S, 'kofi') && leaving) {
var sys = system(S, leaving), cnt = {}, best = 'eisen';
sys.planets.forEach(function (p) { for (var k in p.res) cnt[k] = (cnt[k] || 0) + p.res[k]; });
for (var k in cnt) if (!cnt[best] || cnt[k] > cnt[best]) best = k;
var n = addRes(S, best, 2 + 3 * (S.mods.drohnen || 0));
if (n) out.push('Kofis Drohnen bringen ' + n + ' t ' + RES[best].n + ' mit.');
}
return out;
}
function measurable(S) { var st = findStar(S, S.star); return (st.type === 'pulsar' || st.type === 'loch') && !(S.flags.measured && S.flags.measured[st.id]); }
function measure(S) {
if (!measurable(S)) return null;
var st = findStar(S, S.star), hole = st.type === 'loch';
S.flags.measured = S.flags.measured || {}; S.flags.measured[st.id] = 1;
var key = hole ? 'holes' : 'pulsars'; S.flags[key] = (S.flags[key] || 0) + 1;
var f = hole ? 30 : 20, ex = addRes(S, 'exotik', hole ? 4 : 2), cr = hole ? 900 : 600;
S.forschung += f; S.flags.ftot = (S.flags.ftot || 0) + f; S.cr += cr;
return { hole: hole, f: f, ex: ex, cr: cr, msgs: deliver(S) };
}

function serialize(S) { return JSON.stringify(S); }
function deserialize(s) {
var o = JSON.parse(s); if (!o || o.v !== VERSION || !o.mods) return null;
MKEYS.forEach(function (k) { if (o.mods[k] == null) o.mods[k] = 0; }); RKEYS.forEach(function (k) { if (o.res[k] == null) o.res[k] = 0; });
o.bases = o.bases || []; o.flags = o.flags || {}; o.techs = o.techs || []; o.ruins = o.ruins || {}; o.frags = o.frags || 0; o.mapLvl = o.mapLvl || 0;
return o;
}

root.World = {
VERSION: VERSION, SECT: SECT, START_YEAR: START_YEAR, hash: hash, rng: rng, clamp: clamp, fmt: fmt, word: word,
STARS: STARS, WORLDS: WORLDS, RES: RES, RKEYS: RKEYS, SECTIONS: SECTIONS, SHIPS: SHIPS, SKEYS: SKEYS, MODS: MODS, MKEYS: MKEYS, CREW: CREW, CKEYS: CKEYS, MSG: MSG, WRECKS: WRECKS,
section: section, curSection: curSection, dist: dist, starsNear: starsNear, findStar: findStar, solStar: solStar, system: system, planetPos: planetPos,
newGame: newGame, ageLena: ageLena, baseRange: baseRange, sling: sling, canBuild: canBuild, buildBase: buildBase, measurable: measurable, measure: measure, canJump: canJump, jump: jump, refuelRate: refuelRate, range: range, tankMax: tankMax, cargoMax: cargoMax, cargoUsed: cargoUsed,
crewMax: crewMax, o2Max: o2Max, modVal: modVal, hasCrew: hasCrew, fuelCost: fuelCost, yearsFor: yearsFor, addRes: addRes, sell: sell, buyFuel: buyFuel,
modCost: modCost, canUpgrade: canUpgrade, upgrade: upgrade, recruit: recruit, scanPlanet: scanPlanet, scanSpecies: scanSpecies, msgById: msgById, deliver: deliver,
serialize: serialize, deserialize: deserialize
};
})(typeof window !== 'undefined' ? window : globalThis);
(function (root) {
'use strict';
var W = root.World;

// ---------- worlds of the Pulsarfeld and the Schlund ----------
W.WORLDS.kristall = { n: 'Kristallwelt', land: 1, sec: 3, c: ['#b8c8e8', '#4a5a8a'], grav: [0.6, 1.0], res: { kristall: 4, exotik: 0.6 }, life: [0, 3], weather: ['klar', 'glitzer'] };
W.WORLDS.lava = { n: 'Lavawelt', land: 1, sec: 4, c: ['#c8603a', '#2a1410'], grav: [0.9, 1.4], res: { eisen: 3, exotik: 1 }, life: [0, 2], weather: ['asche', 'klar'] };
W.WORLDS.gift = { n: 'Giftwelt', land: 1, sec: 4, c: ['#a8c070', '#3a4a22'], grav: [0.7, 1.2], res: { sporen: 3, exotik: 0.6 }, life: [2, 5], weather: ['nebel', 'sporen'] };

W.RES.exotik = { n: 'Exotische Materie', p: 260 };
W.RKEYS.push('exotik');

// ---------- modules ----------
W.MODS.drohnen = { n: 'Drohnen-Hangar', d: 'Drohnen bauen beim Landen selbst ab', val: [0, 1, 2, 3], unit: 'Drohnen', sec: 3, cost: [{ cr: 4000, eisen: 25, kristall: 10 }, { cr: 8000, kristall: 20, exotik: 4 }, { cr: 14000, exotik: 10, forschung: 40 }] };
W.MODS.gravi = { n: 'Gravitationsschild', d: 'Schleudersprung an schwarzen Löchern', val: [0, 300, 400, 500], unit: 'Lj', sec: 4, cost: [{ cr: 9000, kristall: 20, exotik: 8 }, { cr: 15000, exotik: 16, forschung: 40 }, { cr: 24000, exotik: 24, forschung: 60 }] };
W.MKEYS.push('drohnen', 'gravi');

// ---------- crew ----------
W.CREW.kofi = { n: 'Kofi Mensah', role: 'Geologe', auto: 'bringt bei jedem Sprung Rohstoffe aus dem verlassenen System mit', cost: 2500, sec: 3, jumps: 0, intro: 'Kofi hat drei Jahre lang allein Asteroiden vermessen und spricht mit seinen Drohnen wie mit Kollegen. „Gib mir einen Hangar und einen Grund, morgens aufzustehen.“' };
W.CREW.mira = { n: 'Mira Castell', role: 'Händlerin', auto: 'verkauft beim Andocken Überschüsse zum guten Preis', cost: 2000, sec: 3, jumps: 0, intro: 'Mira kennt die Preise jeder Station im Pulsarfeld auswendig. „Du fliegst, ich rechne. Am Ende bist du reicher und ich bin näher an der Erde. Abgemacht?“' };
W.CREW.ben = { n: 'Ben Arvidsson', role: 'Baumeister', auto: 'Basen liefern doppelt so viel', cost: 3000, sec: 4, jumps: 0, intro: 'Ben hat Habitate auf Monden gebaut, die heute niemand mehr besucht. „Ich will etwas bauen, das bleibt. Am besten entlang eines Weges, den andere nach uns gehen.“' };
W.CKEYS.push('kofi', 'mira', 'ben');

// ---------- story: chapters 3 and 4 ----------
[
{ id: 'm11', at: { flag: 'pulsars', n: 1 }, from: 'Lena', t: 'Ich habe dich', b: 'Heute Nacht hat die Antenne ein Signal aufgefangen, das im Takt eines Pulsars schwingt. Es war deins. Ich habe dreimal nachgerechnet und dann geweint, im Kontrollraum, vor allen.\n\nIch weiß jetzt, wo du bist. Nicht genau, aber genug. Miss weiter, Papa. Jeder Pulsar macht dein Signal schärfer.' },
{ id: 'm12', at: { crew: 'kofi' }, from: 'Logbuch', t: 'Kofis Drohnen', b: 'Kofi hat seinen drei Drohnen Namen gegeben: Ebbe, Flut und Mittwoch. Er sagt, Mittwoch sei die fleißigste. Seit er an Bord ist, kommen wir aus jedem System mit vollen Kisten zurück.' },
{ id: 'm13', at: { flag: 'pulsars', n: 2 }, from: 'Lena', t: 'Mara', b: 'Du hast eine Enkelin. Sie heißt Mara und ist heute vier Jahre alt geworden. Sie fragt, warum Opa im Himmel wohnt, und ich sage: Er wohnt nicht dort, er ist auf dem Heimweg.\n\nSie hat ein Raumschiff aus Pappe gebaut. Es hat einen Ring in der Mitte, so wie deins.' },
{ id: 'm14', at: { crew: 'mira' }, from: 'Logbuch', t: 'Mira rechnet', b: 'Mira hat eine Tabelle aller Stationen angelegt, die wir passiert haben, mit Preisen, Ankunftszeiten und einer Spalte „Kaffee: gut/schlecht“. Sie sagt, die Spalte sei die wichtigste.' },
{ id: 'm15', at: { flag: 'pulsars', n: 3 }, from: 'Raumfahrtzentrum', t: 'Empfangsprogramm', b: 'An Testflug 7: Mit den Pulsardaten Ihrer Tochter können wir Ihren Kurs vorausberechnen. Das Programm „Heimkehr“ ist genehmigt. Wenn Sie Sol erreichen, wird jemand auf Sie warten.\n\nDr. Lena Weiss leitet das Programm.' },
{ id: 'm16', at: { section: 4 }, from: 'Logbuch', t: 'Der Schlund', b: 'Hier verschlucken schwarze Löcher das Licht ganzer Sternhaufen. Die Karte zeigt Lavawelten und Planeten, deren Luft nach Metall schmeckt. Der Peilsender der Albatros ist jetzt laut und klar.\n\nNoch 1.000 Lichtjahre. Zum ersten Mal fühlt sich die Erde nah an.' },
{ id: 'm17', at: { flag: 'holes', n: 1 }, from: 'Logbuch', t: 'Die Zeit am Rand', b: 'Wir haben ein schwarzes Loch vermessen. Nahe am Rand vergehen für uns Minuten, auf der Erde Wochen. Rena hat die Uhren verglichen und nichts gesagt. Wir wissen beide, was das bedeutet: Abkürzungen gibt es hier, aber sie kosten Zeit, die nicht uns gehört.' },
{ id: 'm18', at: { crew: 'ben' }, from: 'Logbuch', t: 'Ben baut', b: 'Ben hat die Pläne aller unserer Basen an die Kabinenwand gepinnt und mit einer roten Schnur verbunden. „Das ist kein Fluchtweg“, sagt er, „das ist eine Straße.“' },
{ id: 'm19', at: { bases: 3 }, from: 'Lena', t: 'Eine Straße nach Hause', b: 'Die Sender deiner Basen kommen hier an, einer nach dem anderen. Das Zentrum nennt sie „die Brotkrumen“. Mara will Pilotin werden, um sie eines Tages abzufliegen.\n\nIch habe ihr gesagt, dass sie das von dir hat.' },
{ id: 'm20', at: { flag: 'albatros', n: 1 }, from: 'Lena', t: 'Die Albatros', b: 'Das Zentrum hat deinen Bericht über die Albatros bestätigt. Sie galt seit 140 Jahren als verschollen. Auf der Erde gibt es noch Nachfahren der Crew. Sie haben mir geschrieben. Sie danken dir.\n\nIch bin so stolz auf dich, dass es wehtut.' }
].forEach(function (m) { W.MSG.push(m); });

W.WRECKS.push(
'Ein Messgerät, noch warm von einer Batterie, die seit Jahrzehnten leer sein müsste. Auf dem Display ein Puls im Takt eines fernen Pulsars, darunter: „Takt 7 von 12 vermessen“.',
'Ein Grabstein aus einem Rumpfblech, sorgfältig geschweißt: „Jonas Varga, Maschinist der Albatros. Er hat den Antrieb bis zuletzt am Leben gehalten.“',
'Ein Kartentisch, auf dem jemand mit Kreide eine Route zu einem schwarzen Loch gezeichnet hat. Daneben: „Die Schlafkapsel bleibt im Orbit. Irgendwer wird kommen.“'
);

W.BASE_COST = { cr: 2500, eisen: 20, kristall: 8 };
W.ALBATROS = {
t: 'Die Kapsel der Albatros',
b: 'Im Orbit des schwarzen Lochs treibt eine Rettungskapsel. Ihr Peilsender ist der, dem wir seit dem Nebelgürtel folgen. Darin schlafen zwei Menschen der Albatros, seit 140 Jahren, kaum gealtert.\n\nRena sagt, wir könnten sie mitnehmen, schlafend, bis zur Erde. Oder wir setzen eine Boje mit ihrer Position und lassen die Erde sie holen. Dann bekommen wir ihre Sternkarten.',
a: 'Mitnehmen bis zur Erde', bb: 'Boje setzen, Karten nehmen'
};

[    { id: 'm21', at: { section: 5 }, from: 'Logbuch', t: 'Heimat', b: "Heute habe ich den Orion wiedererkannt. Verzerrt, die Schulter zu weit links, aber er ist es. Ida hat gelacht, als ich es gesagt habe, und dann hat sie lange aus dem Fenster geschaut.\n\nNoch 500 Lichtjahre. Zum ersten Mal sind die Sterne vor uns welche, die auch von der Erde aus zu sehen sind." },
{ id: 'm22', at: { dist: 420 }, from: 'Raumfahrtzentrum', t: 'Der schnelle Kanal', b: "An Testflug 7: Ab jetzt laufen unsere Nachrichten über die Relaiskette, die das Programm „Heimkehr“ für Sie gebaut hat. Sie werden uns schneller erreichen als je zuvor.\n\nJemand möchte Ihnen etwas sagen." },
{ id: 'm23', at: { dist: 300 }, from: 'Lena', t: 'Deine Stimme', b: "Papa. Ich habe heute zum ersten Mal deine Stimme gehört. Nur zwölf Sekunden, verrauscht, aus deinem Logbuch, aber es war deine Stimme.\n\nIch bin jetzt älter, als du warst, als du losgeflogen bist. Das ist seltsam, oder? Ich habe graue Haare. Ich habe deine Hände.\n\nDas Licht im Flur ist immer noch an. Mara sagt, das ist Verschwendung. Ich sage, das ist ein Versprechen." },
{ id: 'm24', at: { dist: 120 }, from: 'Mara', t: 'Hallo Opa', b: "Hallo Opa, ich bin Mara. Ich kenne dich nur aus Mamas Geschichten und von einem Foto, auf dem du einen Helm unter dem Arm trägst und lachst.\n\nIch bin Pilotin geworden, so wie du. Mama ist sehr aufgeregt, auch wenn sie so tut, als wäre sie es nicht. Sie hat einen Kuchen gebacken. Er wird alt sein, wenn du ankommst. Sie backt einfach einen neuen.\n\nWir sehen uns bald." },
{ id: 'm25', at: { star: 'sol' }, from: 'Lena', t: 'Ich sehe dich', b: "Das Teleskop zeigt einen hellen Punkt neben Jupiter. Das bist du.\n\nIch habe mein halbes Leben auf diesen Punkt gewartet, und jetzt, wo er da ist, weiß ich nicht, was ich sagen soll. Also nur das: Wir warten am Raumhafen. Lande auf der Erde, Papa. Komm nach Hause." }
].forEach(function (m) { W.MSG.push(m); });

// ---------- homecoming ----------
W.epilogue = function (S) {
var y = Math.floor(S.year), age = Math.floor(W.ageLena(S)), out = [];
out.push('Es ist das Jahr ' + y + '. Du warst ' + S.jumps + ' Sprünge und ' + W.fmt(S.stats.ly) + ' Lichtjahre unterwegs. Für dich waren es Monate. Auf der Erde sind ' + (y - W.START_YEAR) + ' Jahre vergangen.');
out.push(age < 60 ? 'Lena läuft dir über das Landefeld entgegen, schneller, als es sich für eine Frau von ' + age + ' gehört. Sie sagt nichts. Sie hält dich einfach fest, lange.' : age < 76 ? 'Lena steht am Rand des Landefelds, ' + age + ' Jahre alt, die Haare weiß. Als du die Rampe herunterkommst, legt sie die Hand auf den Mund. Dann sagt sie: „Du bist zu spät zum Abendessen.“ Und lacht und weint gleichzeitig.' : 'Lena sitzt am Rand des Landefelds, eine Decke über den Knien, ' + age + ' Jahre alt. Sie steht auf, als sie dich sieht, ganz allein, und niemand wagt, ihr zu helfen. „Ich habe das Licht angelassen“, sagt sie.');
out.push('Neben ihr steht Mara in einer Pilotenjacke, die deiner sehr ähnlich sieht.');
var cn = S.crew.map(function (k) { return W.CREW[k].n.split(' ')[0]; });
out.push(cn.length ? (cn.length > 1 ? cn.slice(0, -1).join(', ') + ' und ' + cn[cn.length - 1] : cn[0]) + ' gehen hinter dir die Rampe hinunter. Ihr seid zusammen angekommen, und das wird so bleiben.' : 'Du gehst allein die Rampe hinunter. Das Schiff hinter dir knistert, als es abkühlt.');
if (S.flags.albWahl === 'mit') out.push('Die beiden Schläfer der Albatros werden im Krankenhaus des Raumhafens geweckt. Draußen warten ihre Nachfahren, die sie nur aus Familienalben kennen.');
else if (S.flags.albWahl === 'boje') out.push('Ein Bergungsschiff bricht in derselben Woche zur Boje der Albatros auf, entlang deiner Route.');
var nb = (S.bases || []).length;
if (nb) out.push(nb === 1 ? 'Deine Basis sendet weiter ihr Signal durch die Nacht. Sie ist der erste Stein eines Weges.' : 'Deine ' + nb + ' Basen senden weiter ihr Signal. Auf den Karten des Raumfahrtzentrums sind sie mit einer roten Linie verbunden. Darüber steht: „Die Straße“.');
if (S.flags.pulsars) out.push('Lenas Observatorium hat deine ' + S.flags.pulsars + ' Pulsarmessungen veröffentlicht. Man nennt sie die Weiss-Uhren.');
if (S.stats.species) out.push('Der Katalog deiner Reise umfasst ' + S.stats.species + ' Arten, die kein Mensch je zuvor gesehen hat.');
out.push('Am Abend sitzt du in Lenas Küche. Im Flur brennt das Licht. Du bist zu Hause.');
return out;
};
})(typeof window !== 'undefined' ? window : globalThis);
(function (root) {
'use strict';
var W = root.World;

// ---------- ship silhouettes (title, landing site) ----------
W.SHIPSVG = {
kranich: 'M30 60L200 60M30 56L200 56M8 48h22v20H8zM8 52L-2 46M8 64L-2 70M84 58a16 44 0 1 0 32 0a16 44 0 1 0-32 0M100 14V102M128 50h34v16h-34zM166 40h12v36h-12zM168 40l-4-16h12l2 16M168 76l-4 16h12l2-16M200 44h30v28h-30zM230 48l14-4v10h-14M230 62h14v10l-14-4',
elster: 'M10 60L120 50L236 58L240 60L236 62L120 70ZM150 54L196 14L214 16L190 56M150 66L196 106L214 104L190 64M40 58Q60 50 84 54L84 60ZM120 50V70M236 56L250 54V66L236 64',
schildkroete: 'M8 46L40 40V80L8 74ZM40 56H210M40 64H210M50 28h34v28H50zM88 34h30v22H88zM122 28h34v28h-34zM160 36h28v20h-28zM50 64h34v24H50zM88 64h34v30H88zM126 64h30v22h-30zM160 64h28v28h-28zM210 40h26v40h-26zM236 44l14-2v10h-14M236 58l14-2v8h-14M236 68h14v10l-14-2M24 40V26h6',
falke: 'M12 60L70 44L150 40L214 52L230 60L214 68L150 80L70 76ZM70 44L100 60L70 76M150 40L130 60L150 80M100 60H130M110 42L140 10L162 12L150 41M110 78L140 110L162 108L150 79M30 56L-4 54M30 64L-4 66M214 54L238 52V58M214 66L238 68V62'
};

// ---------- alien technology of the Erbauer ----------
W.TECH = [
{ k: 'resonanz', n: 'Resonanzkern', d: 'Sprünge kosten 20 % weniger Treibstoff.', f: 15 },
{ k: 'membran', n: 'Atemmembran', d: 'Der Sauerstoff im Anzug hält ein Viertel länger.', f: 25 },
{ k: 'licht', n: 'Lichtsprache', d: 'Neue Arten geben doppelt so viel Forschung.', f: 35 },
{ k: 'falt', n: 'Faltkarte', d: 'Die Sternkarte sieht 300 Lichtjahre weiter voraus.', f: 45 },
{ k: 'gleit', n: 'Gleitfeld', d: 'Das Jetpack hält doppelt so lange.', f: 55 },
{ k: 'echo', n: 'Echo-Sender', d: 'Ein Signal, das schneller ist als jedes Licht. Jemand zu Hause wird es hören.', f: 70 }
];
W.RUINS = [
'Zwei Säulen aus einem Stein, den der Scanner nicht kennt, und dazwischen ein Ring, der knapp über dem Boden schwebt. In seiner Mitte liegt ein Bruchstück, warm wie eine Hand.\n\nRena sagt, die Zeichen darauf seien keine Schrift. Eher eine Melodie.',
'Wieder die Säulen, wieder der schwebende Ring. Wer immer das gebaut hat, kam hier vorbei, so wie wir. Die Ruinen liegen auf einer Linie. Die Linie zeigt ungefähr in Richtung Sol.',
'Unter dem Ring liegen Steine in einem Kreis, sorgfältig gelegt. Einer für jeden, der nicht weitergekommen ist, vermutet Ida. Es sind sehr viele.',
'Diese Ruine ist jünger als die anderen. Die Zeichen sind hastiger, kleiner. Als hätte jemand gewusst, dass die Zeit knapp wird.',
'In den Ring ist ein Muster geritzt, das wir kennen: die Takte der Pulsare, die Lena vermisst. Die Erbauer haben dieselben Uhren benutzt, um nach Hause zu finden.',
'Die letzte Ruine auf der Linie. Kein Ring mehr, nur eine einzelne Säule und ein Bruchstück, das leise summt, wenn man es in der Hand hält.'
];
W.RUIN_MORE = 'Noch eine Ruine der Erbauer. Das Bruchstück ist ein Duplikat eines anderen, aber Rena nimmt es trotzdem mit. „Man lässt so etwas nicht allein liegen.“';
W.MAP_COST = [10, 25, 50];
W.MAP_R = [0, 200, 350, 550];
W.hasTech = function (S, k) { return !!(S.techs && S.techs.indexOf(k) >= 0); };
W.mapRadius = function (S) { return W.MAP_R[S.mapLvl || 0] + (W.hasTech(S, 'falt') ? 300 : 0); };
W.mapUp = function (S) {
var l = S.mapLvl || 0; if (l >= 3) return 'Die Sternkarte ist vollständig ausgebaut';
if (S.forschung < W.MAP_COST[l]) return 'Dir fehlen ' + (W.MAP_COST[l] - S.forschung) + ' Forschung';
S.forschung -= W.MAP_COST[l]; S.mapLvl = l + 1; return null;
};
W.decodable = function (S) { return (S.frags || 0) > S.techs.length && S.techs.length < W.TECH.length; };
W.decode = function (S) {
var i = S.techs.length, T = W.TECH[i]; if (!T) return { err: 'Alles entschlüsselt' };
if ((S.frags || 0) <= i) return { err: 'Dir fehlt ein Bruchstück. Suche Ruinen der Erbauer.' };
if (S.forschung < T.f) return { err: 'Dir fehlen ' + (T.f - S.forschung) + ' Forschung' };
S.forschung -= T.f; S.techs.push(T.k); S.flags.tech = S.techs.length;
return { tech: T, msgs: W.deliver(S) };
};
W.findRuin = function (S, p) { S.ruins[p.key] = 1; S.frags = (S.frags || 0) + 1; S.forschung += 10; S.flags.ftot = (S.flags.ftot || 0) + 10; return S.frags <= W.RUINS.length ? W.RUINS[S.frags - 1] : W.RUIN_MORE; };

// ruins in systems (seeded, never at start or Sol)
var sys0 = W.system;
W.system = function (S, star) {
var s = sys0(S, star);
if (!s._ru) {
s._ru = 1;
if (star.id !== 'start' && star.id !== 'sol') {
var r = W.rng(W.hash(S.seed, star.seed, 31)), lp = s.planets.filter(function (p) { return W.WORLDS[p.type].land; });
if (lp.length && r() < 0.1) lp[Math.floor(r() * lp.length)].ruin = 1;
}
}
return s;
};
// what the star map can tell about a star
W.preview = function (S, st) {
var cur = W.findStar(S, S.star), d = Math.hypot(st.x - cur.x, st.y - cur.y);
if (!S.visited[st.id] && d > W.mapRadius(S)) return null;
var s = W.system(S, st), ty = {}, o = { n: s.planets.length, types: [], station: !!s.station, ruin: false, wreck: false, life: 0 };
s.planets.forEach(function (p) { ty[W.WORLDS[p.type].n] = 1; if (p.ruin && !S.ruins[p.key]) o.ruin = true; if (p.wreck && !S.wrecks[p.key]) o.wreck = true; o.life += p.life; });
o.types = Object.keys(ty); return o;
};

// ---------- story: research and the Erbauer ----------
[
{ id: 'm26', at: { flag: 'ftot', n: 30 }, from: 'Raumfahrtzentrum', t: 'Ihre Daten', b: 'An Testflug 7: Ihre Scans kommen hier an, verrauscht und Jahre zu spät, aber sie kommen an. Wir haben einen Katalog angelegt. Er heißt „Funde von Testflug 7“.\n\nEine Schulklasse hat gefragt, ob sie Ihnen Fragen schicken darf. Wir haben ja gesagt.' },
{ id: 'm27', at: { flag: 'ftot', n: 80 }, from: 'Lena', t: 'Dein Katalog', b: 'Ich habe deinen Katalog gelesen. Alles. Die Pflanzen, die nachts leuchten. Die Tiere mit den langen Hälsen.\n\nIch habe mir vorgestellt, wie du davorstehst und dich nicht traust, näher zu gehen. Du hattest früher auch Angst vor Gänsen. Ich weiß das noch.' },
{ id: 'm28', at: { flag: 'ftot', n: 150 }, from: 'Lena', t: 'Für Mara', b: 'Mara hat ein Poster über dem Bett, mit allen Arten, die du gefunden hast. Sie kennt die Namen auswendig, auch die, die du dir ausgedacht hast, weil es keine gab.\n\nSie sagt, wenn du zurück bist, sollst du ihr zeigen, welches dein Lieblingstier ist.' },
{ id: 'm29', at: { flag: 'ftot', n: 250 }, from: 'Raumfahrtzentrum', t: 'Ein neues Fach', b: 'An Testflug 7: Die Universität hat ein Institut nach Ihren Daten benannt. Ihre Tochter hält dort die erste Vorlesung.\n\nSie hat darum gebeten, dass wir Ihnen eines ausrichten: Der erste Satz der Vorlesung war „Mein Vater ist kein Beispiel. Er ist unterwegs.“' },
{ id: 'm30', at: { flag: 'tech', n: 1 }, from: 'Die Erbauer', t: 'Erstes Bruchstück', b: 'Die Übersetzung ist unsicher. Rena hat drei Nächte daran gesessen.\n\n„Wir sind vom Weg abgekommen. Unser Zuhause ist ein Licht unter vielen, und wir wissen nicht mehr, welches. Wir bauen diese Zeichen, damit die nach uns es leichter haben.“' },
{ id: 'm31', at: { flag: 'tech', n: 2 }, from: 'Die Erbauer', t: 'Zweites Bruchstück', b: '„Wir atmen die Luft fremder Welten, und sie schmeckt nach nichts, das wir kennen. Die Kinder fragen nach dem Geruch von Regen auf warmem Stein. Wir erzählen ihnen davon, bis sie es selbst zu riechen glauben.“' },
{ id: 'm32', at: { flag: 'tech', n: 3 }, from: 'Die Erbauer', t: 'Drittes Bruchstück', b: '„Die Tiere dieser Welten sprechen in Licht. Wir haben gelernt, ihnen zu antworten. Es ist leichter, als mit den eigenen Leuten über das Heimweh zu reden.“' },
{ id: 'm33', at: { flag: 'tech', n: 4 }, from: 'Die Erbauer', t: 'Viertes Bruchstück', b: '„Wir haben die Karte gefaltet, bis sie klein genug war, um sie in der Hand zu halten. Der Weg nach Hause ist darauf nur ein Strich. Er fühlt sich länger an.“' },
{ id: 'm34', at: { flag: 'tech', n: 5 }, from: 'Die Erbauer', t: 'Fünftes Bruchstück', b: '„Viele von uns sind auf den Welten geblieben, an denen wir vorbeikamen. Nicht aus Müdigkeit. Sie haben dort etwas gefunden, das sie Zuhause nennen konnten. Vielleicht ist das auch ein Weg, anzukommen.“' },
{ id: 'm35', at: { flag: 'tech', n: 6 }, from: 'Die Erbauer', t: 'Sechstes Bruchstück', b: '„Wir haben einen Ruf gebaut, der schneller ist als das Licht. Er reicht nur bis zu denen, die auf uns warten. Wir schicken ihn ab, jeden Abend. Wir wissen nicht, ob jemand antwortet.“\n\nIda hat den Echo-Sender ans Schiff angeschlossen. Er brummt. Dann wird es still.' },
{ id: 'm37', at: { flag: 'tech', n: 6 }, from: 'Lena', t: 'Ein Echo', b: 'Papa? Heute Nacht war da etwas auf der Antenne. Kein Rauschen. Ein Ton, ganz kurz, und dann noch einmal, im selben Abstand, wie du früher an meine Tür geklopft hast. Zweimal lang, einmal kurz.\n\nDie anderen sagen, das kann nicht sein, so schnell kommt nichts an. Ich habe zurückgeklopft. Zweimal lang, einmal kurz. Ich weiß, dass du es warst.' },
{ id: 'm36', at: { flag: 'tech', n: 6, near: 400 }, from: 'Die Erbauer', t: 'Die letzte Botschaft', b: 'Der Echo-Sender hat ein Signal aufgefangen, alt, sehr alt, das ganz in der Nähe unserer Sonne abgeschickt wurde.\n\n„Wir sind angekommen. Nicht alle, und nicht dort, wo wir losgeflogen sind. Unser Zuhause war längst ein anderes geworden. Aber jemand hat gewartet. Wer das hier findet: Es lohnt sich. Flieg weiter.“\n\nRena hat es zweimal vorgelesen. Dann sind wir alle eine Weile still gewesen.' },
{ id: 'm38', at: { flag: 'wal', n: 1 }, from: 'Logbuch', t: 'Der Himmelswal', b: 'Heute stand etwas über dem Schiff, so groß wie eine Stadt, und hat sich nicht bewegt. Es hat geleuchtet, langsam, wie ein Atem. Dann ist es weitergezogen.\n\nIch habe die Aufnahme an Lena geschickt. Sie wird sie in vielen Jahren sehen. Ich hoffe, sie zeigt sie Mara.' }
].forEach(function (m) { W.MSG.push(m); });
})(typeof window !== 'undefined' ? window : globalThis);
