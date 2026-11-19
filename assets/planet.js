(function (root) {
'use strict';
var W = root.World;
var IV = '#efe9dd', MU = '#a59f94', AC = '#ff7a2f', K = '#07080a';
var ctx = null;

function hex(h) { var n = parseInt(h.slice(1), 16); return [n >> 16, (n >> 8) & 255, n & 255]; }
function rgb(c, a) { return a == null ? 'rgb(' + (c[0] | 0) + ',' + (c[1] | 0) + ',' + (c[2] | 0) + ')' : 'rgba(' + (c[0] | 0) + ',' + (c[1] | 0) + ',' + (c[2] | 0) + ',' + a + ')'; }
function mix(a, b, t) { if (typeof a === 'string') a = hex(a); if (typeof b === 'string') b = hex(b); return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]; }
function circle(x, y, r) { ctx.beginPath(); ctx.arc(x, y, Math.max(0.4, r), 0, Math.PI * 2); }
function sm(t) { t = Math.max(0, Math.min(1, t)); return t * t * (3 - 2 * t); }

// palettes per world: sky day, sky horizon, ground, ground edge, far hills
var PAL = {
fels: { sky: '#6a7486', hor: '#c9c0b4', gr: '#3a3430', edge: '#7a7068', far: '#5a5a62', night: '#0c0d12' },
wueste: { sky: '#7a8fb0', hor: '#f0c9a0', gr: '#8a5a3a', edge: '#d9a37a', far: '#b07a5a', night: '#120c10' },
leben: { sky: '#5a7a8a', hor: '#e8c4a8', gr: '#1e2a22', edge: '#5a7a4a', far: '#3a5248', night: '#0a0e12' },
ozean: { sky: '#6a8eaa', hor: '#d8e4e8', gr: '#3a4a3a', edge: '#8a9a6a', far: '#4a6a7a', night: '#080c14' },
eis: { sky: '#8aa0c0', hor: '#eef2f6', gr: '#9ab0c4', edge: '#f2f6fa', far: '#b8c8da', night: '#0a0e18' }
};
var AMP = { fels: 70, wueste: 45, leben: 40, ozean: 50, eis: 55 };

function terrain(P, x) {
var a = P.amp, q = P.ph, ax = Math.abs(x);
var h = a * (0.55 * Math.sin(x / 210 + q[0]) + 0.3 * Math.sin(x / 97 + q[1]) + 0.15 * Math.sin(x / 41 + q[2]));
if (P.type === 'fels') h += Math.max(0, Math.sin(x / 63 + q[3]) - 0.7) * 120;
if (P.type === 'eis') h += Math.max(0, Math.sin(x / 37 + q[3]) - 0.85) * 160;
if (P.type === 'ozean') h -= 26;
var flat = sm((ax - 70) / 160);
return h * flat + (1 - flat) * (P.type === 'ozean' ? 6 : 0);
}
function hill(P, x, k) { return P.amp * 2.2 * (0.6 * Math.sin(x / (420 * k) + P.ph[k]) + 0.4 * Math.sin(x / (170 * k) + P.ph[k + 1])) + 70 * k; }

// ---------- species kit ----------
var PLANTS = ['laterne', 'farn', 'pilz', 'spitze', 'kugel'];
function makeSpecies(P, r, i) {
var plant = r() < (P.type === 'leben' ? 0.5 : 0.65), cols = ['#ff7a2f', '#efe9dd', '#9fb4c9', '#c8a0d8', '#8fd0a0', '#f0d070', '#e07a8a'];
var sp = {
key: P.p.key + '/s' + i, kind: plant ? 'plant' : 'animal', name: W.word(r, 2) + ' ' + W.word(r, 1 + (r() < 0.5 ? 1 : 0)).toLowerCase(),
c1: cols[Math.floor(r() * cols.length)], c2: cols[Math.floor(r() * cols.length)], size: 0.7 + r() * 0.8, rare: r() < 0.18, inst: []
};
if (plant) { sp.style = PLANTS[Math.floor(r() * PLANTS.length)]; if (P.type === 'eis') sp.style = r() < 0.6 ? 'spitze' : 'kugel'; }
else { sp.legs = [2, 4, 6][Math.floor(r() * 3)]; sp.bw = 14 + r() * 18; sp.bh = 7 + r() * 9; sp.neck = r() * 14; sp.head = 4 + r() * 4; sp.fly = r() < 0.22; sp.pat = Math.floor(r() * 3); sp.spd = 18 + r() * 30; sp.tail = r() < 0.6; }
var n = plant ? 2 + Math.floor(r() * 4) : 1 + Math.floor(r() * 2);
for (var k = 0; k < n; k++) { var x = (r() - 0.5) * 2 * (P.w - 150); if (Math.abs(x) < 120) x += x < 0 ? -140 : 140; sp.inst.push({ x: x, x0: x, dir: r() < 0.5 ? -1 : 1, ph: r() * 6 }); }
return sp;
}

// ---------- enter ----------
function enter(S, p, starType) {
var r = W.rng(p.seed ^ 0x51ed), type = W.WORLDS[p.type].land ? p.type : 'fels';
var P = {
p: p, type: type, pal: PAL[type], amp: AMP[type], ph: [r() * 6, r() * 6, r() * 6, r() * 6, r() * 6, r() * 6], w: 1300 + Math.floor(r() * 900),
g: 620 * p.grav, x: 50, y: 0, vx: 0, vy: 0, ground: true, face: 1, jet: 1, o2: W.o2Max(S), o2max: W.o2Max(S), t: 0, day: p.day, t0: r(),
loot: { eisen: 0, kristall: 0, sporen: 0 }, cr: 0, nodes: [], species: [], fx: [], events: [], act: null, prog: 0, near: null, starType: starType,
weather: p.weather, wx: [], camY: 0, ice: type === 'eis'
};
P.y = terrain(P, P.x);
var kinds = Object.keys(p.res); if (!kinds.length) kinds = [type === 'eis' ? 'kristall' : type === 'leben' ? 'sporen' : 'eisen'];
var nn = 6 + Math.floor(r() * 5);
for (var i = 0; i < nn; i++) {
var k = kinds[Math.floor(r() * kinds.length)], x = (r() - 0.5) * 2 * (P.w - 120); if (Math.abs(x) < 150) x += x < 0 ? -170 : 170;
P.nodes.push({ i: i, x: x, k: k, amt: 3 + Math.floor(r() * 4), done: !!S.mined[p.key + ':' + i] });
}
for (i = 0; i < p.life; i++) P.species.push(makeSpecies(P, r, i));
if (p.wreck) P.wreck = { x: (r() < 0.5 ? -1 : 1) * (P.w * 0.55 + r() * P.w * 0.3), done: !!S.wrecks[p.key] };
for (i = 0; i < 90; i++) P.wx.push([r(), r(), r()]);
P.grass = []; for (var gx = -P.w; gx < P.w; gx += 9) if (r() < 0.6) P.grass.push([gx + r() * 6, 4 + r() * 9, r()]);
// biologist scans everything nearby on arrival
if (W.hasCrew(S, 'rena')) P.species.forEach(function (sp) { if (!sp.rare && !S.species[sp.key]) { var res = W.scanSpecies(S, sp.key, false); if (res) { P.cr += res.cr; P.events.push({ k: 'species', sp: sp, res: res, auto: true }); } } });
return P;
}
function isNight(P) { var ph = (P.t0 + P.t / P.day) % 1; return ph > 0.58 && ph < 0.94; }
function dayLight(P) { var ph = (P.t0 + P.t / P.day) % 1; return 0.5 + 0.5 * Math.cos((ph - 0.25) * Math.PI * 2); }

// ---------- update ----------
function update(S, P, dt, inp) {
P.t += dt; P.o2 -= dt;
var spd = 150 * (P.inWater ? 0.6 : 1), acc = P.ice && P.ground ? 2.2 : 9;
P.vx += (inp.ax * spd - P.vx) * Math.min(1, dt * acc);
if (inp.ax) P.face = inp.ax > 0 ? 1 : -1;
if (inp.jump && P.ground) { P.vy = 300; P.ground = false; }
if (inp.jet && P.jet > 0 && !P.inWater) { P.vy += 1250 * dt; P.jet = Math.max(0, P.jet - dt * 0.38); P.jetting = true; } else P.jetting = false;
if (P.vy > 340) P.vy = 340;
P.vy -= P.g * dt;
P.x = Math.max(-P.w, Math.min(P.w, P.x + P.vx * dt));
P.y += P.vy * dt;
var gy = terrain(P, P.x);
P.inWater = P.type === 'ozean' && gy < 0 && P.y < 2;
if (P.inWater) { P.vy += (0 - P.y) * 6 * dt + P.g * dt * 0.95; P.vy *= 0.9; }
if (P.y <= gy) { P.y = gy; if (P.vy < 0) P.vy = 0; P.ground = true; } else if (P.y > gy + 2) P.ground = false;
if (P.ground) P.jet = Math.min(1, P.jet + dt * 0.5);
// animals
P.species.forEach(function (sp) {
if (sp.kind !== 'animal') return;
sp.inst.forEach(function (a) {
a.x += a.dir * sp.spd * dt; if (Math.abs(a.x - a.x0) > 160) a.dir *= -1;
if (Math.abs(a.x - P.x) < 50 && Math.random() < dt) a.dir = a.x > P.x ? 1 : -1;
});
});
// what is near
var best = null, bd = 48;
function cand(o, x, y) { var d = Math.abs(x - P.x); if (d < bd && Math.abs(y - P.y) < 70) { bd = d; best = o; } }
P.nodes.forEach(function (n) { if (!n.done) cand({ k: 'node', n: n }, n.x, terrain(P, n.x)); });
var night = isNight(P);
P.species.forEach(function (sp) { if (S.species[sp.key] || (sp.rare && !night)) return; sp.inst.forEach(function (a) { cand({ k: 'species', sp: sp }, a.x, sp.fly ? P.y : terrain(P, a.x)); }); });
if (P.wreck && !P.wreck.done) cand({ k: 'wreck' }, P.wreck.x, terrain(P, P.wreck.x));
if (Math.abs(P.x) < 60) { if (!best || bd > 30) best = { k: 'ship' }; }
P.near = best;
// hold-to-act
if (inp.action && P.near && P.near.k !== 'ship') {
var key = P.near.k + (P.near.n ? P.near.n.i : P.near.sp ? P.near.sp.key : '');
if (P.actKey !== key) { P.actKey = key; P.prog = 0; }
P.prog += dt / (P.near.k === 'node' ? 1.5 : 1.0);
if (P.prog >= 1) { finish(S, P, P.near); P.prog = 0; P.actKey = null; }
} else { P.prog = Math.max(0, P.prog - dt * 2); }
if (inp.actionPressed && P.near && P.near.k === 'ship') P.events.push({ k: 'leave' });
if (P.o2 <= 0) { P.o2 = 0; P.events.push({ k: 'o2out' }); }
P.fx = P.fx.filter(function (f) { f.t += dt; return f.t < 2.4; });
P.camY += (P.y - P.camY) * Math.min(1, dt * 4);
}
function finish(S, P, n) {
var y = terrain(P, P.x) + 40;
if (n.k === 'node') {
var got = W.addRes(S, n.n.k, n.n.amt);
if (!got) { P.fx.push({ x: P.x, y: y, s: 'Laderaum voll', t: 0, c: AC }); return; }
n.n.done = true; S.mined[P.p.key + ':' + n.n.i] = 1; P.loot[n.n.k] += got;
P.fx.push({ x: n.n.x, y: y, s: '+' + got + ' t ' + W.RES[n.n.k].n, t: 0 });
} else if (n.k === 'species') {
var res = W.scanSpecies(S, n.sp.key, n.sp.rare); if (!res) return;
P.cr += res.cr; P.fx.push({ x: P.x, y: y, s: 'Neue Art · +' + res.cr + ' Cr', t: 0 }); P.events.push({ k: 'species', sp: n.sp, res: res });
} else if (n.k === 'wreck') {
P.wreck.done = true; S.wrecks[P.p.key] = 1; S.cr += 300; P.cr += 300;
P.events.push({ k: 'wreck', text: W.WRECKS[(P.p.wreck - 1) % W.WRECKS.length] }); P.fx.push({ x: P.x, y: y, s: 'Fundstück · +300 Cr', t: 0 });
}
}
function abort(S, P) { // oxygen ran out: half the loot of this trip stays behind
var lost = {};
W.RKEYS.forEach(function (k) { var l = Math.floor(P.loot[k] / 2); if (l) { S.res[k] -= l; lost[k] = l; } });
return lost;
}

// ---------- drawing ----------
function drawPlant(sp, x, y, s, night, time) {
var c1 = sp.c1, c2 = sp.c2, st = sp.style, sw = Math.sin(time * 1.2 + x * 0.01) * 2;
ctx.lineCap = 'round';
if (st === 'laterne') {
var hgt = 70 * sp.size * s; ctx.strokeStyle = '#1a1416'; ctx.lineWidth = 3 * s;
ctx.beginPath(); ctx.moveTo(x, y); ctx.bezierCurveTo(x - 6 * s, y - hgt * 0.4, x + 7 * s, y - hgt * 0.7, x + sw, y - hgt); ctx.stroke();
for (var k = 0; k < 5; k++) {
var a = -1.1 + k * 0.55, ex = x + sw + Math.sin(a) * hgt * 0.32, ey = y - hgt - Math.cos(a) * hgt * 0.06;
ctx.lineWidth = 2 * s; ctx.beginPath(); ctx.moveTo(x + sw, y - hgt); ctx.quadraticCurveTo((x + ex) / 2, ey - hgt * 0.15, ex, ey); ctx.stroke();
ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(ex, ey); ctx.lineTo(ex, ey + 9 * s); ctx.stroke();
ctx.fillStyle = c1; circle(ex, ey + 12 * s, 3.4 * s); ctx.fill();
if (night) { var g = ctx.createRadialGradient(ex, ey + 12 * s, 0, ex, ey + 12 * s, 16 * s); g.addColorStop(0, rgb(hex(c1), 0.45)); g.addColorStop(1, rgb(hex(c1), 0)); ctx.fillStyle = g; circle(ex, ey + 12 * s, 16 * s); ctx.fill(); }
}
} else if (st === 'farn') {
var h2 = 40 * sp.size * s; ctx.strokeStyle = c1; ctx.lineWidth = 1.5 * s;
for (k = -3; k <= 3; k++) { ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + k * 6 * s + sw, y - h2 * 0.7, x + k * 13 * s + sw, y - h2 * (1 - Math.abs(k) * 0.12)); ctx.stroke(); }
ctx.fillStyle = c2; for (k = -3; k <= 3; k += 2) { circle(x + k * 13 * s + sw, y - h2 * (1 - Math.abs(k) * 0.12), 2 * s); ctx.fill(); }
} else if (st === 'pilz') {
var h3 = 30 * sp.size * s; ctx.fillStyle = '#d8ccbc'; ctx.fillRect(x - 3 * s, y - h3, 6 * s, h3);
ctx.fillStyle = c1; ctx.beginPath(); ctx.ellipse(x, y - h3, 18 * s * sp.size, 10 * s * sp.size, 0, Math.PI, 0); ctx.fill();
ctx.fillStyle = c2; for (k = 0; k < 4; k++) { circle(x - 10 * s + k * 7 * s, y - h3 - 4 * s - (k % 2) * 3 * s, 1.8 * s); ctx.fill(); }
if (night) { var g2 = ctx.createRadialGradient(x, y - h3, 0, x, y - h3, 30 * s); g2.addColorStop(0, rgb(hex(c1), 0.3)); g2.addColorStop(1, rgb(hex(c1), 0)); ctx.fillStyle = g2; circle(x, y - h3, 30 * s); ctx.fill(); }
} else if (st === 'spitze') {
for (k = 0; k < 4; k++) { var hh = (24 + k * 9) * sp.size * s, ox = (k - 1.5) * 7 * s; ctx.fillStyle = k % 2 ? c1 : rgb(mix(c1, '#ffffff', 0.4)); ctx.beginPath(); ctx.moveTo(x + ox - 4 * s, y); ctx.lineTo(x + ox + (k - 1.5) * 2 * s, y - hh); ctx.lineTo(x + ox + 4 * s, y); ctx.fill(); }
} else {
var rr = 9 * sp.size * s; ctx.fillStyle = c1; for (k = 0; k < 3; k++) { circle(x + Math.sin(k * 2) * 3 * s, y - rr - k * rr * 1.4, rr * (1 - k * 0.2)); ctx.fill(); }
ctx.strokeStyle = c2; ctx.lineWidth = 1; for (k = 0; k < 3; k++) { ctx.beginPath(); ctx.moveTo(x - rr, y - rr - k * rr * 1.4); ctx.lineTo(x + rr, y - rr - k * rr * 1.4); ctx.stroke(); }
}
}
function drawAnimal(sp, a, x, y, s, time) {
var bw = sp.bw * s * sp.size, bh = sp.bh * s * sp.size, step = Math.sin(time * 8 + a.ph), d = a.dir;
if (sp.fly) { y -= 60 * s + Math.sin(time * 2 + a.ph) * 10 * s; }
var lh = sp.fly ? 0 : 9 * s * sp.size, by = y - lh - bh / 2;
ctx.strokeStyle = sp.c1; ctx.lineWidth = 2 * s; ctx.lineCap = 'round';
if (!sp.fly) for (var k = 0; k < sp.legs; k++) { var lx = x - bw * 0.35 + k * (bw * 0.7 / Math.max(1, sp.legs - 1)), sw = (k % 2 ? step : -step) * 3 * s; ctx.beginPath(); ctx.moveTo(lx, by); ctx.lineTo(lx + sw, y); ctx.stroke(); }
if (sp.fly) { var fl = Math.sin(time * 14 + a.ph) * bh * 1.2; ctx.fillStyle = sp.c2; ctx.beginPath(); ctx.moveTo(x - bw * 0.2, by); ctx.lineTo(x, by - bh * 0.6 - fl); ctx.lineTo(x + bw * 0.2, by); ctx.fill(); }
if (sp.tail) { ctx.beginPath(); ctx.moveTo(x - d * bw / 2, by); ctx.quadraticCurveTo(x - d * bw * 0.9, by - bh * 0.8, x - d * bw * 1.05, by - bh * 0.2 + step * 2); ctx.stroke(); }
ctx.fillStyle = sp.c1; ctx.beginPath(); ctx.ellipse(x, by, bw / 2, bh / 2, 0, 0, Math.PI * 2); ctx.fill();
ctx.fillStyle = sp.c2;
if (sp.pat === 1) for (k = -1; k <= 1; k++) ctx.fillRect(x + k * bw * 0.22 - 1.5 * s, by - bh / 2, 3 * s, bh * 0.8);
if (sp.pat === 2) for (k = -1; k <= 1; k++) { circle(x + k * bw * 0.22, by - bh * 0.1, 1.8 * s); ctx.fill(); }
var hx = x + d * (bw / 2 + sp.neck * s * 0.6), hy = by - sp.neck * s - bh * 0.2;
ctx.strokeStyle = sp.c1; ctx.lineWidth = 3 * s; ctx.beginPath(); ctx.moveTo(x + d * bw * 0.35, by); ctx.lineTo(hx, hy); ctx.stroke();
ctx.fillStyle = sp.c1; circle(hx, hy, sp.head * s); ctx.fill(); ctx.fillStyle = K; circle(hx + d * sp.head * 0.45 * s, hy - 1 * s, 1.1 * s); ctx.fill();
}
function drawNode(n, x, y, s, near, time) {
if (n.done) { ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.beginPath(); ctx.ellipse(x, y, 10 * s, 3 * s, 0, 0, Math.PI * 2); ctx.fill(); return; }
if (n.k === 'kristall') { for (var k = 0; k < 3; k++) { ctx.fillStyle = k === 1 ? '#e8f4ff' : '#9fd8ff'; ctx.beginPath(); ctx.moveTo(x - 7 * s + k * 5 * s, y); ctx.lineTo(x - 4 * s + k * 5 * s + (k - 1) * 3 * s, y - (14 + k * 6) * s); ctx.lineTo(x - 1 * s + k * 5 * s, y); ctx.fill(); } }
else if (n.k === 'eisen') { ctx.fillStyle = '#4a403a'; ctx.beginPath(); ctx.moveTo(x - 12 * s, y); ctx.lineTo(x - 8 * s, y - 10 * s); ctx.lineTo(x + 2 * s, y - 13 * s); ctx.lineTo(x + 11 * s, y - 5 * s); ctx.lineTo(x + 12 * s, y); ctx.fill(); ctx.fillStyle = AC; [[-5, -6], [3, -9], [6, -3]].forEach(function (p) { ctx.fillRect(x + p[0] * s, y + p[1] * s, 2 * s, 2 * s); }); }
else { for (k = 0; k < 3; k++) { ctx.fillStyle = '#8fd0a0'; circle(x - 6 * s + k * 6 * s, y - 5 * s - (k % 2) * 4 * s, 4 * s); ctx.fill(); } }
var pulse = 0.5 + 0.5 * Math.sin(time * 3 + n.i);
var g = ctx.createRadialGradient(x, y - 6 * s, 0, x, y - 6 * s, 22 * s); g.addColorStop(0, rgb(hex(near ? AC : '#ffd8a0'), near ? 0.45 : 0.12 + pulse * 0.1)); g.addColorStop(1, 'rgba(255,122,47,0)'); ctx.fillStyle = g; circle(x, y - 6 * s, 22 * s); ctx.fill();
}
function drawShip(x, y, s, S) {
ctx.strokeStyle = IV; ctx.lineWidth = 1.4 * s; ctx.fillStyle = '#16181c';
ctx.beginPath(); ctx.moveTo(x - 46 * s, y - 12 * s); ctx.quadraticCurveTo(x, y - 58 * s, x + 46 * s, y - 12 * s); ctx.closePath(); ctx.fill(); ctx.stroke();
ctx.beginPath(); ctx.moveTo(x - 52 * s, y - 10 * s); ctx.lineTo(x + 52 * s, y - 10 * s); ctx.stroke();
ctx.beginPath(); ctx.moveTo(x - 32 * s, y - 10 * s); ctx.lineTo(x - 42 * s, y); ctx.moveTo(x + 32 * s, y - 10 * s); ctx.lineTo(x + 42 * s, y); ctx.stroke();
ctx.fillStyle = AC; ctx.fillRect(x - 10 * s, y - 36 * s, 20 * s, 7 * s);
ctx.fillStyle = IV; ctx.fillRect(x - 6 * s, y - 10 * s, 12 * s, 10 * s);
}
function drawWreck(x, y, s, done) {
ctx.strokeStyle = done ? MU : IV; ctx.lineWidth = 1.3 * s; ctx.fillStyle = '#121416';
ctx.beginPath(); ctx.moveTo(x - 40 * s, y); ctx.lineTo(x - 30 * s, y - 22 * s); ctx.lineTo(x + 6 * s, y - 30 * s); ctx.lineTo(x + 20 * s, y - 12 * s); ctx.lineTo(x + 36 * s, y - 18 * s); ctx.lineTo(x + 30 * s, y); ctx.closePath(); ctx.fill(); ctx.stroke();
ctx.beginPath(); ctx.moveTo(x - 20 * s, y - 24 * s); ctx.lineTo(x - 14 * s, y - 4 * s); ctx.moveTo(x + 6 * s, y - 30 * s); ctx.lineTo(x + 2 * s, y - 40 * s); ctx.stroke();
}
function drawAstro(P, x, y, s, time) {
var walk = P.ground && Math.abs(P.vx) > 10 ? Math.sin(time * 12) : 0, f = P.face;
if (P.jetting) { var fl = 18 + Math.random() * 10; var g = ctx.createLinearGradient(0, y - 12 * s, 0, y - 12 * s + fl * s); g.addColorStop(0, '#fff4e6'); g.addColorStop(0.4, AC); g.addColorStop(1, 'rgba(255,122,47,0)'); ctx.fillStyle = g; ctx.fillRect(x - f * 6 * s - 2 * s, y - 12 * s, 4 * s, fl * s); }
ctx.fillStyle = '#a59f94'; ctx.fillRect(x - f * 7 * s - 3 * s, y - 22 * s, 6 * s, 13 * s);
ctx.fillStyle = IV; ctx.fillRect(x - 2.5 * s + walk * 2 * s, y - 9 * s, 3 * s, 9 * s); ctx.fillRect(x + 0.5 * s - walk * 2 * s, y - 9 * s, 3 * s, 9 * s);
ctx.fillRect(x - 4 * s, y - 22 * s, 8 * s, 14 * s);
circle(x, y - 26 * s, 5.5 * s); ctx.fill();
ctx.fillStyle = '#1a1c22'; ctx.fillRect(x + f * 0.5 * s - (f > 0 ? 0 : 5 * s), y - 29 * s, 5 * s, 4 * s);
ctx.fillStyle = AC; ctx.fillRect(x - 4 * s, y - 17 * s, 8 * s, 1.5 * s);
}
function draw(c, S, P, w, h, time) {
ctx = c;
var s = Math.min(h / 380, w / 430), camX = P.x, baseY = h * (w < h ? 0.6 : 0.66), night = isNight(P), L = dayLight(P), pal = P.pal;
function X(x) { return w / 2 + (x - camX) * s; } function Y(y) { return baseY - (y - P.camY) * s; }
// sky
var top = mix(pal.night, pal.sky, L), hor = mix(mix(pal.night, '#3a2a3a', 0.3), pal.hor, L);
if (L > 0.15 && L < 0.55) hor = mix(hor, '#ff9a6a', (0.55 - L) * 1.2);
var g = ctx.createLinearGradient(0, 0, 0, h); g.addColorStop(0, rgb(top)); g.addColorStop(0.75, rgb(hor)); g.addColorStop(1, rgb(hor));
ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
if (L < 0.5) { var r = W.rng(P.p.seed); ctx.fillStyle = 'rgba(239,233,221,' + (0.8 - L * 1.6) + ')'; for (var i = 0; i < 120; i++) { ctx.fillRect(r() * w, r() * h * 0.6, r() < 0.1 ? 2 : 1, 1); } }
var ph = (P.t0 + P.t / P.day) % 1, sa = (ph - 0.25) * Math.PI * 2, sunX = w / 2 + Math.sin(sa) * w * 0.42, sunY = h * 0.62 - Math.cos(sa) * h * 0.55;
var sc = W.STARS[P.starType] || W.STARS.gelb;
if (sunY < h * 0.7) { var sg = ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, 70); sg.addColorStop(0, rgb(hex('#fff6e8'), 0.95)); sg.addColorStop(0.15, rgb(hex(sc.c), 0.7)); sg.addColorStop(1, rgb(hex(sc.c), 0)); ctx.fillStyle = sg; circle(sunX, sunY, 70); ctx.fill(); }
var mx = w / 2 - Math.sin(sa) * w * 0.38, my = h * 0.62 + Math.cos(sa) * h * 0.5;
if (my < h * 0.6) { ctx.fillStyle = rgb(mix('#efe9dd', top, 0.2)); circle(mx, my, 16); ctx.fill(); ctx.fillStyle = rgb(top); circle(mx + 7, my - 3, 14); ctx.fill(); }
// far hills
for (var layer = 2; layer >= 1; layer--) {
var par = layer === 2 ? 0.15 : 0.4, col = mix(pal.far, hor, layer === 2 ? 0.55 : 0.25); col = mix(col, pal.night, (1 - L) * 0.7);
ctx.fillStyle = rgb(col); ctx.beginPath(); ctx.moveTo(0, h);
for (var sx = 0; sx <= w + 8; sx += 8) { var wx = camX * par + (sx - w / 2) / s; ctx.lineTo(sx, baseY - (hill(P, wx, layer) - P.camY * par) * s * 0.6 - (layer === 2 ? 40 : 10) * s); }
ctx.lineTo(w, h); ctx.fill();
}
// ground
var gcol = mix(pal.gr, pal.night, (1 - L) * 0.6), ecol = mix(pal.edge, pal.night, (1 - L) * 0.5);
ctx.fillStyle = rgb(gcol); ctx.beginPath(); ctx.moveTo(0, h);
var x0 = camX - w / 2 / s - 10, x1 = camX + w / 2 / s + 10;
for (var x = x0; x <= x1; x += 6) ctx.lineTo(X(x), Y(terrain(P, x)));
ctx.lineTo(w, h); ctx.fill();
ctx.strokeStyle = rgb(ecol); ctx.lineWidth = 2 * s; ctx.beginPath(); for (x = x0; x <= x1; x += 6) { if (x === x0) ctx.moveTo(X(x), Y(terrain(P, x))); else ctx.lineTo(X(x), Y(terrain(P, x))); } ctx.stroke();
if (P.type === 'ozean') { var wy = Y(0); ctx.fillStyle = rgb(mix('#2a5a7a', pal.night, (1 - L) * 0.6), 0.85); ctx.fillRect(0, wy, w, h - wy); ctx.strokeStyle = 'rgba(239,233,221,0.4)'; ctx.lineWidth = 1; ctx.beginPath(); for (sx = 0; sx < w; sx += 4) ctx.lineTo(sx, wy + Math.sin(sx * 0.05 + time * 2) * 1.5); ctx.stroke(); }
// grass
if (P.type === 'leben' || P.type === 'ozean' || P.type === 'wueste') {
ctx.strokeStyle = rgb(mix(ecol, '#000000', 0.2)); ctx.lineWidth = 1;
P.grass.forEach(function (gr) { if (gr[0] < x0 || gr[0] > x1) return; var gy = terrain(P, gr[0]); if (P.type === 'ozean' && gy < 0) return; var bx = X(gr[0]), by = Y(gy); ctx.beginPath(); ctx.moveTo(bx, by); ctx.quadraticCurveTo(bx - 2 * s, by - gr[1] * s * 0.6, bx + Math.sin(time + gr[2] * 6) * 3 * s, by - gr[1] * s); ctx.stroke(); });
}
// objects
drawShip(X(0), Y(terrain(P, 0)), s, S);
if (P.wreck) drawWreck(X(P.wreck.x), Y(terrain(P, P.wreck.x)), s, P.wreck.done);
P.species.forEach(function (sp) {
if (sp.rare && !night) return;
sp.inst.forEach(function (a) {
if (a.x < x0 - 80 || a.x > x1 + 80) return;
var gy = terrain(P, a.x); if (P.type === 'ozean' && gy < 0 && sp.kind === 'plant') return;
if (sp.kind === 'plant') drawPlant(sp, X(a.x), Y(gy), s, night, time); else drawAnimal(sp, a, X(a.x), Y(Math.max(gy, P.type === 'ozean' ? 0 : gy)), s, time);
});
});
P.nodes.forEach(function (n) { if (n.x < x0 - 30 || n.x > x1 + 30) return; drawNode(n, X(n.x), Y(terrain(P, n.x)), s, P.near && P.near.n === n, time); });
drawAstro(P, X(P.x), Y(P.y), s, time);
// night tint and weather
if (L < 0.6) { ctx.fillStyle = 'rgba(6,8,16,' + ((0.6 - L) * 0.5) + ')'; ctx.fillRect(0, 0, w, h); }
var wt = P.weather;
if (wt && wt !== 'klar') {
ctx.lineWidth = 1;
P.wx.forEach(function (q, i) {
var px = ((q[0] * w + time * (wt === 'sand' ? 220 : wt === 'regen' ? 40 : 15) * (0.6 + q[2])) % w + w) % w, py = ((q[1] * h + time * (wt === 'regen' ? 380 : wt === 'schnee' ? 40 : wt === 'sand' ? 30 : 12) * (0.6 + q[2])) % h + h) % h;
if (wt === 'regen') { ctx.strokeStyle = 'rgba(200,220,240,0.35)'; ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px - 2, py + 9); ctx.stroke(); }
else if (wt === 'schnee') { ctx.fillStyle = 'rgba(255,255,255,0.8)'; ctx.fillRect(px, py, 2, 2); }
else if (wt === 'sand' || wt === 'staub') { ctx.strokeStyle = rgb(hex(pal.edge), 0.35); ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px + 14, py + 1); ctx.stroke(); }
else if (wt === 'sporen') { ctx.fillStyle = 'rgba(143,208,160,' + (0.3 + 0.4 * Math.sin(time * 2 + i)) + ')'; circle(px, py, 1.6); ctx.fill(); }
});
}
// floating texts and progress
ctx.font = '13px ui-monospace, Menlo, monospace'; ctx.textAlign = 'center';
P.fx.forEach(function (f) { ctx.fillStyle = f.c || IV; ctx.globalAlpha = 1 - f.t / 2.4; ctx.fillText(f.s, X(f.x), Y(f.y) - f.t * 24); ctx.globalAlpha = 1; });
if (P.near) {
var nx = P.near.k === 'node' ? P.near.n.x : P.near.k === 'wreck' ? P.wreck.x : P.near.k === 'ship' ? 0 : P.x, ny = terrain(P, nx);
var lab = P.near.k === 'node' ? W.RES[P.near.n.k].n + ' · ' + P.near.n.amt + ' t' : P.near.k === 'species' ? (P.near.sp.rare ? 'Seltene Art' : 'Unbekannte Art') : P.near.k === 'wreck' ? 'Wrack' : 'Dein Schiff';
ctx.fillStyle = IV; ctx.fillText(lab.toUpperCase(), X(nx), Y(ny) - 70 * s);
if (P.prog > 0) { ctx.strokeStyle = AC; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(X(P.x), Y(P.y) - 50 * s, 12, -Math.PI / 2, -Math.PI / 2 + P.prog * Math.PI * 2); ctx.stroke(); }
}
}

root.Planet = { enter: enter, update: update, draw: draw, abort: abort, isNight: isNight };
})(window);
