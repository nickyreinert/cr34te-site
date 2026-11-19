(function (root) {
'use strict';
var W = root.World;
var BG = '#07080a', IV = '#efe9dd', MU = '#a59f94', AC = '#ff7a2f', CO = '#9fb4c9';
var ctx = null;

function hex(h) { var n = parseInt(h.slice(1), 16); return [n >> 16, (n >> 8) & 255, n & 255]; }
function rgba(c, a) { if (typeof c === 'string') c = hex(c); return 'rgba(' + (c[0] | 0) + ',' + (c[1] | 0) + ',' + (c[2] | 0) + ',' + a + ')'; }
function sub(a, b) { return [a[0] - b[0], a[1] - b[1], a[2] - b[2]]; }
function dot(a, b) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; }
function len(a) { return Math.sqrt(dot(a, a)); }
function circle(x, y, r) { ctx.beginPath(); ctx.arc(x, y, Math.max(0.5, r), 0, Math.PI * 2); }

// ---------- background stars ----------
var sky = null;
function initSky() {
var r = W.rng(99), s = [];
for (var i = 0; i < 700; i++) {
var band = i < 380, u = r() * 2 - 1, th = r() * Math.PI * 2;
if (band) u = (r() - 0.5) * 0.28;
var c = Math.sqrt(1 - u * u), v = [c * Math.cos(th), u, c * Math.sin(th)];
var tilt = 0.45, y = v[1] * Math.cos(tilt) - v[2] * Math.sin(tilt), z = v[1] * Math.sin(tilt) + v[2] * Math.cos(tilt);
s.push({ v: [v[0], y, z], m: band ? r() * 0.55 : r(), c: r() < 0.12 ? CO : r() < 0.1 ? '#ffc9a0' : IV });
}
sky = s;
}

// ---------- camera ----------
function basis(F) {
var cy = Math.cos(F.yaw), sy = Math.sin(F.yaw), cp = Math.cos(F.pitch), sp = Math.sin(F.pitch);
return { f: [cp * sy, sp, cp * cy], r: [cy, 0, -sy], u: [-sp * sy, cp, -sp * cy] };
}
function project(F, B, p, w, h) {
var d = sub(p, F.pos), z = dot(d, B.f); if (z < 1) return null;
var fl = h * 0.95;
return { x: w / 2 + dot(d, B.r) * fl / z, y: h / 2 - dot(d, B.u) * fl / z, z: z, s: fl / z };
}
function projectDir(B, v, w, h) { var z = dot(v, B.f); if (z < 0.05) return null; var fl = h * 0.95; return { x: w / 2 + dot(v, B.r) * fl / z, y: h / 2 - dot(v, B.u) * fl / z }; }

// ---------- flight ----------
function enter(S, sys) {
var far = sys.planets.length ? sys.planets[sys.planets.length - 1].orbit + 260 : 900, a = (W.hash(S.seed, S.jumps, 5) % 628) / 100;
var F = { sys: sys, pos: [Math.cos(a) * far, 30, Math.sin(a) * far], yaw: 0, pitch: -0.03, speed: 0, heat: 0, target: null, auto: false, t: 0, near: null, refuel: 0, cruise: false };
var to = sub([0, 0, 0], F.pos); F.yaw = Math.atan2(to[0], to[2]);
return F;
}
function objPos(F, o) {
if (!o) return null;
if (o.kind === 'star') return [0, 0, 0];
if (o.kind === 'planet') return W.planetPos(F.sys.planets[o.i], F.t);
if (o.kind === 'station') { var st = F.sys.station; return [Math.cos(st.ang) * st.orbit, 12, Math.sin(st.ang) * st.orbit]; }
return null;
}
function objRadius(F, o) { return o.kind === 'star' ? W.STARS[F.sys.star.type].r : o.kind === 'planet' ? F.sys.planets[o.i].r : 6; }
function stopDist(F, o) { return o.kind === 'star' ? objRadius(F, o) * 4.2 : o.kind === 'planet' ? objRadius(F, o) * 3.2 + 14 : 26; }
function setTarget(F, o, auto) { F.target = o; F.auto = !!auto; }
function warpTo(F, o) {
var p = objPos(F, o), sd = stopDist(F, o), back = sub(F.pos, p), l = len(back) || 1;
F.pos = [p[0] + back[0] / l * sd, p[1] + back[1] / l * sd + 4, p[2] + back[2] / l * sd];
var to = sub(p, F.pos); F.yaw = Math.atan2(to[0], to[2]); F.pitch = Math.atan2(to[1], Math.hypot(to[0], to[2])); F.speed = 0; F.auto = false; F.target = o;
}
function angDiff(a, b) { var d = b - a; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2; return d; }

function update(S, F, dt, inp) {
F.t += dt;
var B = basis(F), maxV = S.ship === 'falke' ? 110 : 85, cruiseV = S.ship === 'falke' ? 640 : 520;
var manual = Math.abs(inp.sx) > 0.05 || Math.abs(inp.sy) > 0.05 || inp.thrust || inp.brake;
if (manual && F.auto) F.auto = false;
if (F.auto && F.target) {
var tp = objPos(F, F.target), d = sub(tp, F.pos), dist = len(d), sd = stopDist(F, F.target);
var wy = Math.atan2(d[0], d[2]), wp = Math.atan2(d[1], Math.hypot(d[0], d[2]));
F.yaw += angDiff(F.yaw, wy) * Math.min(1, dt * 2.6); F.pitch += (wp - F.pitch) * Math.min(1, dt * 2.6);
var aligned = Math.abs(angDiff(F.yaw, wy)) < 0.25;
var want = dist - sd < 4 ? 0 : Math.min(dist - sd > 500 ? cruiseV : maxV * 1.4, (dist - sd) * 1.6 + 6);
if (!aligned) want = Math.min(want, 30);
F.speed += (want - F.speed) * Math.min(1, dt * 2.2);
F.cruise = F.speed > maxV * 1.2;
if (dist - sd < 4 && F.speed < 3) { F.auto = false; F.speed = 0; }
} else {
F.yaw += inp.sx * dt * 1.5; F.pitch = Math.max(-1.3, Math.min(1.3, F.pitch - inp.sy * dt * 1.2));
var tgt = inp.brake ? 0 : inp.thrust ? (F.cruise ? cruiseV : maxV) : F.speed * (F.cruise ? 1 : 0.995);
if (F.cruise && !inp.thrust) tgt = cruiseV;
if (inp.brake) F.cruise = false;
F.speed += (tgt - F.speed) * Math.min(1, dt * (inp.brake ? 3 : 1.4));
}
B = basis(F);
F.pos = [F.pos[0] + B.f[0] * F.speed * dt, F.pos[1] + B.f[1] * F.speed * dt, F.pos[2] + B.f[2] * F.speed * dt];
// keep out of bodies
var objs = [{ kind: 'star' }].concat(F.sys.planets.map(function (p, i) { return { kind: 'planet', i: i }; }));
objs.forEach(function (o) { var p = objPos(F, o), d = sub(F.pos, p), l = len(d), m = objRadius(F, o) * (o.kind === 'star' ? 2.6 : 1.6); if (l < m) { F.pos = [p[0] + d[0] / l * m, p[1] + d[1] / l * m, p[2] + d[2] / l * m]; F.speed = Math.min(F.speed, 20); } });
// star heat & refuel
var ds = len(F.pos), rf = W.refuelRate(S, ds);
F.inZone = rf.zone;
if (rf.zone) {
F.heat += rf.heat * dt;
if (inp.action && F.near && F.near.kind === 'star') { var add = Math.min(rf.rate * dt, W.tankMax(S) - S.fuel); S.fuel += Math.max(0, add); F.refuel = rf.rate; } else F.refuel = 0;
} else { F.refuel = 0; }
F.heat = Math.max(0, F.heat - dt * (rf.zone ? 4 : 22));
if (F.heat >= 100) { var out = [F.pos[0] / ds, F.pos[1] / ds, F.pos[2] / ds]; F.pos = [F.pos[0] + out[0] * 120 * dt * 6, F.pos[1] + out[1] * 120 * dt * 6, F.pos[2] + out[2] * 120 * dt * 6]; F.heat = 92; F.evade = 2; }
if (F.evade) F.evade = Math.max(0, F.evade - dt);
// what is near
F.near = null;
var best = 1e9;
objs.concat(F.sys.station ? [{ kind: 'station' }] : []).forEach(function (o) {
var p = objPos(F, o), l = len(sub(p, F.pos)), r = objRadius(F, o), lim = o.kind === 'star' ? r * 7 : o.kind === 'planet' ? r * 5 + 40 : 70;
if (l < lim && l - r < best) { best = l - r; F.near = { kind: o.kind, i: o.i, d: l }; }
});
}

// ---------- drawing space ----------
var SOLC = { merkur: ['#b4aca4', '#3a3632'], venus: ['#f0e0b4', '#6a5a3a'], erde: ['#6aa4e0', '#0e2a4e'], mars: ['#d4743e', '#4a1e10'], jupiter: ['#e0c49a', '#6a4a30'], saturn: ['#ecdcac', '#7a6a48'] };
function planetColors(p) {
if (p.sol && SOLC[p.sol]) return { lit: SOLC[p.sol][0], dark: SOLC[p.sol][1] };
var Wt = W.WORLDS[p.type], c0 = hex(Wt.c[0]), c1 = hex(Wt.c[1]), j = (p.hue - 0.5) * 30;
return { lit: 'rgb(' + Math.min(255, c0[0] + j) + ',' + Math.min(255, c0[1] + j * 0.5) + ',' + Math.min(255, c0[2] - j * 0.3) + ')', dark: 'rgb(' + c1[0] + ',' + c1[1] + ',' + c1[2] + ')' };
}
function drawPlanetDisc(x, y, r, p, lx, ly, lz) {
var col = planetColors(p), lit = Math.max(0.08, 0.55 + lz * 0.45);
ctx.save(); circle(x, y, r); ctx.clip();
ctx.fillStyle = col.dark; ctx.fillRect(x - r, y - r, r * 2, r * 2);
if (r > 6) {
var rr = W.rng(p.seed);
if (p.type === 'gas') { for (var i = 0; i < 9; i++) { ctx.fillStyle = rgba(i % 2 ? col.lit : '#2a1e18', 0.35); ctx.fillRect(x - r, y - r + i * r * 0.23 + rr() * 4, r * 2, r * (0.08 + rr() * 0.12)); } }
else if (p.sol === 'venus' || p.sol === 'merkur') { for (i = 0; i < 14; i++) { ctx.fillStyle = rgba(p.sol === 'venus' ? '#fff4d8' : '#2a2622', 0.18); circle(x + (rr() - 0.5) * r * 1.8, y + (rr() - 0.5) * r * 1.8, r * (0.04 + rr() * 0.12)); ctx.fill(); } }
else if (p.sol === 'erde') { for (i = 0; i < 26; i++) { ctx.fillStyle = rgba(i % 3 === 0 ? '#f4f6f8' : i % 3 === 1 ? '#4a7a3a' : '#9a8a5a', i % 3 === 0 ? 0.3 : 0.55); ctx.beginPath(); ctx.ellipse(x + (rr() - 0.5) * r * 1.7, y + (rr() - 0.5) * r * 1.7, r * (0.06 + rr() * 0.14) * (i % 3 === 0 ? 1.4 : 1), r * (0.04 + rr() * 0.08), rr() * 3, 0, Math.PI * 2); ctx.fill(); } }
else { for (i = 0; i < 22; i++) { ctx.fillStyle = rgba(p.type === 'leben' || p.type === 'ozean' ? (i % 3 ? '#3a5a3a' : '#e8ece8') : (i % 2 ? '#2a2420' : col.lit), p.type === 'ozean' ? 0.3 : 0.24); var bx = x + (rr() - 0.5) * r * 1.8, by = y + (rr() - 0.5) * r * 1.8, br = r * (0.05 + rr() * 0.17); ctx.beginPath(); ctx.ellipse(bx, by, br * 1.8, br, 0, 0, Math.PI * 2); ctx.fill(); } }
}
var gx = x + lx * r * 0.7, gy = y + ly * r * 0.7, g = ctx.createRadialGradient(gx, gy, 0, gx, gy, r * 1.9);
g.addColorStop(0, rgba(col.lit, 0.95 * lit)); g.addColorStop(0.45, rgba(col.lit, 0.55 * lit)); g.addColorStop(0.75, 'rgba(7,8,10,0.55)'); g.addColorStop(1, 'rgba(7,8,10,0.97)');
ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2);
if (p.sol === 'jupiter' && r > 5) { ctx.fillStyle = rgba('#c0603a', 0.7 * lit); ctx.beginPath(); ctx.ellipse(x + r * 0.25, y + r * 0.22, r * 0.18, r * 0.1, 0, 0, Math.PI * 2); ctx.fill(); }
if (p.sol === 'erde' && r > 6) { var cr = W.rng(7); for (i = 0; i < 70; i++) { var cx2 = (cr() - 0.5) * 1.8, cy2 = (cr() - 0.5) * 1.8; if (cx2 * cx2 + cy2 * cy2 > 0.8 || cx2 * lx + cy2 * ly > -0.25) continue; ctx.fillStyle = rgba('#ffc878', 0.5 + cr() * 0.4); ctx.fillRect(x + cx2 * r, y + cy2 * r, Math.max(1, r * 0.03), Math.max(1, r * 0.03)); } }
ctx.restore();
if (p.type !== 'gas' && p.type !== 'fels') { ctx.strokeStyle = rgba(p.type === 'wueste' ? '#ffd0a0' : '#c8e0ff', 0.25 * lit); ctx.lineWidth = Math.max(1, r * 0.06); circle(x, y, r * 1.02); ctx.stroke(); }
}
function draw(c, S, F, w, h, time) {
ctx = c; if (!sky) initSky();
var B = basis(F), st = F.sys.star, ST = W.STARS[st.type];
ctx.fillStyle = BG; ctx.fillRect(0, 0, w, h);
// sky
var streak = F.speed > 200 ? Math.min(1, (F.speed - 200) / 300) : 0;
sky.forEach(function (s) {
var q = projectDir(B, s.v, w, h); if (!q || q.x < -4 || q.y < -4 || q.x > w + 4 || q.y > h + 4) return;
ctx.fillStyle = rgba(s.c, 0.25 + s.m * 0.6);
if (streak > 0) { var dx = q.x - w / 2, dy = q.y - h / 2, l = Math.hypot(dx, dy) || 1, k = streak * 14 * (l / h); ctx.strokeStyle = rgba(s.c, 0.2 + s.m * 0.5); ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(q.x, q.y); ctx.lineTo(q.x + dx / l * k, q.y + dy / l * k); ctx.stroke(); }
else ctx.fillRect(q.x, q.y, s.m > 0.85 ? 2 : 1, s.m > 0.85 ? 2 : 1);
});
// bodies, far to near
var list = [{ kind: 'star', p: [0, 0, 0], r: ST.r }];
F.sys.planets.forEach(function (p, i) { list.push({ kind: 'planet', i: i, p: W.planetPos(p, F.t), r: p.r, pl: p }); });
if (F.sys.station) list.push({ kind: 'station', p: objPos(F, { kind: 'station' }), r: 6 });
list.forEach(function (o) { o.q = project(F, B, o.p, w, h); });
list.sort(function (a, b) { return (b.q ? b.q.z : 0) - (a.q ? a.q.z : 0); });
var sq = list.filter(function (o) { return o.kind === 'star'; })[0].q;
list.forEach(function (o) {
var q = o.q; if (!q) return;
var r = o.r * q.s;
if (o.kind === 'star') {
if (st.type === 'loch') {
var g0 = ctx.createRadialGradient(q.x, q.y, r * 0.8, q.x, q.y, r * 7); g0.addColorStop(0, rgba(AC, 0.7)); g0.addColorStop(0.3, rgba('#ffb37a', 0.25)); g0.addColorStop(1, rgba(AC, 0)); ctx.fillStyle = g0; circle(q.x, q.y, r * 7); ctx.fill();
ctx.strokeStyle = rgba('#ffd8a8', 0.55); ctx.lineWidth = Math.max(1, r * 0.18); ctx.beginPath(); ctx.ellipse(q.x, q.y, r * 2.6, r * 0.5, -0.2, 0, Math.PI * 2); ctx.stroke();
ctx.fillStyle = '#000'; circle(q.x, q.y, r); ctx.fill(); ctx.strokeStyle = rgba('#ffe2c0', 0.85); ctx.lineWidth = Math.max(1, r * 0.05); circle(q.x, q.y, r * 1.04); ctx.stroke();
ctx.strokeStyle = rgba('#ffd8a8', 0.75); ctx.lineWidth = Math.max(1, r * 0.18); ctx.beginPath(); ctx.ellipse(q.x, q.y, r * 2.6, r * 0.5, -0.2, 0.15, Math.PI - 0.15); ctx.stroke(); return;
}
var pul = st.type === 'pulsar' ? 0.6 + 0.4 * Math.abs(Math.sin(time * 6)) : 1;
if (st.type === 'pulsar') {
var ba = time * 2.2, bl = Math.max(w, h) * 1.2;
ctx.save(); ctx.globalCompositeOperation = 'lighter';
[0, Math.PI].forEach(function (o2) { var a1 = ba + o2, gb = ctx.createLinearGradient(q.x, q.y, q.x + Math.cos(a1) * bl, q.y + Math.sin(a1) * bl * 0.35); gb.addColorStop(0, rgba(ST.c, 0.55)); gb.addColorStop(1, rgba(ST.c, 0)); ctx.fillStyle = gb; ctx.beginPath(); ctx.moveTo(q.x, q.y); ctx.lineTo(q.x + Math.cos(a1 - 0.05) * bl, q.y + Math.sin(a1 - 0.05) * bl * 0.35); ctx.lineTo(q.x + Math.cos(a1 + 0.05) * bl, q.y + Math.sin(a1 + 0.05) * bl * 0.35); ctx.fill(); });
ctx.restore(); r = r * 0.3;
}
var g = ctx.createRadialGradient(q.x, q.y, 0, q.x, q.y, Math.max(8, r * 9));
g.addColorStop(0, rgba('#fff8ee', 1)); g.addColorStop(0.08, rgba(ST.c, 0.95 * pul)); g.addColorStop(0.25, rgba(ST.c, 0.32 * pul)); g.addColorStop(0.6, rgba(AC, 0.08)); g.addColorStop(1, rgba(AC, 0));
ctx.fillStyle = g; circle(q.x, q.y, Math.max(8, r * 9)); ctx.fill();
ctx.fillStyle = '#fffaf2'; circle(q.x, q.y, Math.max(2, r)); ctx.fill();
return;
}
if (o.kind === 'station') {
var rs = Math.max(2.5, r * 2.2); ctx.strokeStyle = rgba(IV, 0.85); ctx.lineWidth = Math.max(1, rs * 0.12);
ctx.beginPath(); ctx.ellipse(q.x, q.y, rs, rs * 0.35, 0, 0, Math.PI * 2); ctx.stroke();
ctx.beginPath(); ctx.moveTo(q.x, q.y - rs * 0.9); ctx.lineTo(q.x, q.y + rs * 0.9); ctx.stroke();
ctx.fillStyle = (Math.floor(time * 2) % 2) ? AC : IV; ctx.fillRect(q.x - 1, q.y - rs * 0.9 - 1, 2, 2);
return;
}
var ld = sub([0, 0, 0], o.p), ll = len(ld) || 1; ld = [ld[0] / ll, ld[1] / ll, ld[2] / ll];
var lx = dot(ld, B.r), ly = -dot(ld, B.u), lz = -dot(ld, B.f);
var lxy = Math.hypot(lx, ly) || 1; lx /= lxy; ly /= lxy;
var rings = o.pl.sol ? o.pl.sol === 'saturn' : o.pl.type === 'gas' && o.pl.hue > 0.45;
if (rings) { ctx.strokeStyle = rgba('#d8c8a0', 0.5); ctx.lineWidth = Math.max(1, r * 0.12); ctx.beginPath(); ctx.ellipse(q.x, q.y, r * 2.1, r * 0.42, -0.25, Math.PI, Math.PI * 2); ctx.stroke(); }
drawPlanetDisc(q.x, q.y, Math.max(1.2, r), o.pl, lx, ly, lz);
if (rings) { ctx.beginPath(); ctx.ellipse(q.x, q.y, r * 2.1, r * 0.42, -0.25, 0, Math.PI); ctx.stroke(); }
});
// heat haze near star
if (F.inZone) { ctx.fillStyle = rgba(AC, Math.min(0.25, F.heat / 400)); ctx.fillRect(0, 0, w, h); }
// target marker
if (F.target) {
var tp = objPos(F, F.target), tq = project(F, B, tp, w, h), name = targetName(F, F.target), dd = Math.round(len(sub(tp, F.pos)) - objRadius(F, F.target));
ctx.strokeStyle = IV; ctx.lineWidth = 1; ctx.fillStyle = IV; ctx.font = '12px ui-monospace, Menlo, monospace'; ctx.textAlign = 'center';
if (tq && tq.x > 20 && tq.x < w - 20 && tq.y > 20 && tq.y < h - 20) {
var b = Math.max(14, objRadius(F, F.target) * tq.s * 1.3);
[[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(function (s) { ctx.beginPath(); ctx.moveTo(tq.x + s[0] * b, tq.y + s[1] * (b - 8)); ctx.lineTo(tq.x + s[0] * b, tq.y + s[1] * b); ctx.lineTo(tq.x + s[0] * (b - 8), tq.y + s[1] * b); ctx.stroke(); });
ctx.fillText(name.toUpperCase() + ' · ' + Math.max(0, dd) + ' km', tq.x, tq.y + b + 16);
} else {
var d = sub(tp, F.pos), ax = dot(d, B.r), ay = -dot(d, B.u), al = Math.hypot(ax, ay) || 1, ex = w / 2 + ax / al * (Math.min(w, h) / 2 - 40), ey = h / 2 + ay / al * (Math.min(w, h) / 2 - 40);
ctx.save(); ctx.translate(ex, ey); ctx.rotate(Math.atan2(ay, ax)); ctx.beginPath(); ctx.moveTo(10, 0); ctx.lineTo(-6, -7); ctx.lineTo(-6, 7); ctx.closePath(); ctx.fillStyle = AC; ctx.fill(); ctx.restore();
ctx.fillStyle = AC; ctx.fillText(name.toUpperCase(), ex, ey + 22);
}
}
// crosshair
ctx.strokeStyle = rgba(IV, 0.5); ctx.lineWidth = 1; ctx.beginPath();
ctx.moveTo(w / 2, h / 2 - 14); ctx.lineTo(w / 2, h / 2 - 6); ctx.moveTo(w / 2, h / 2 + 6); ctx.lineTo(w / 2, h / 2 + 14);
ctx.moveTo(w / 2 - 14, h / 2); ctx.lineTo(w / 2 - 6, h / 2); ctx.moveTo(w / 2 + 6, h / 2); ctx.lineTo(w / 2 + 14, h / 2); ctx.stroke();
}
function targetName(F, o) { return o.kind === 'star' ? F.sys.star.name : o.kind === 'planet' ? F.sys.planets[o.i].name : F.sys.station.name; }
function pickInView(F, w, h, mx, my) {
var B = basis(F), best = null, bd = 40;
var objs = [{ kind: 'star' }].concat(F.sys.planets.map(function (p, i) { return { kind: 'planet', i: i }; }), F.sys.station ? [{ kind: 'station' }] : []);
objs.forEach(function (o) { var q = project(F, B, objPos(F, o), w, h); if (!q) return; var d = Math.hypot(q.x - mx, q.y - my) - objRadius(F, o) * q.s; if (d < bd) { bd = d; best = o; } });
return best;
}

// ---------- jump tunnel ----------
function drawTunnel(c, w, h, p, time) {
ctx = c; ctx.fillStyle = BG; ctx.fillRect(0, 0, w, h);
var r = W.rng(7), n = 160, cx = w / 2, cy = h / 2, k = Math.sin(Math.min(1, p) * Math.PI);
for (var i = 0; i < n; i++) {
var a = r() * Math.PI * 2, d0 = ((r() + time * (0.6 + r())) % 1), d = d0 * d0 * Math.hypot(w, h) * 0.6, l = 6 + k * 80 * d0;
ctx.strokeStyle = rgba(i % 9 ? IV : AC, 0.15 + d0 * 0.7 * k); ctx.lineWidth = 1 + d0;
ctx.beginPath(); ctx.moveTo(cx + Math.cos(a) * d, cy + Math.sin(a) * d); ctx.lineTo(cx + Math.cos(a) * (d + l), cy + Math.sin(a) * (d + l)); ctx.stroke();
}
var g = ctx.createRadialGradient(cx, cy, 0, cx, cy, h * 0.4 * k + 1); g.addColorStop(0, rgba('#fff4e6', 0.8 * k)); g.addColorStop(1, rgba(AC, 0)); ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
}

// ---------- galaxy map ----------
function galaxyView(S, w, h, zoom) {
var cur = W.findStar(S, S.star), R = W.range(S) * (zoom || 1.7);
return { cx: cur.x, cy: cur.y, R: R, s: Math.min(w, h * (w < 720 ? 0.6 : 1)) * 0.46 / R, w: w, h: h, oy: w < 720 ? h * 0.3 : h / 2, cur: cur };
}
function drawGalaxy(c, S, V, sel, time) {
ctx = c; var w = V.w, h = V.h, ox = w / 2, oy = V.oy;
ctx.fillStyle = BG; ctx.fillRect(0, 0, w, h);
function sx(x) { return ox + (x - V.cx) * V.s; } function sy(y) { return oy + (y - V.cy) * V.s; }
// section rings around Sol
ctx.font = '11px ui-monospace, Menlo, monospace'; ctx.textAlign = 'left';
[2000, 1500, 1000, 500].forEach(function (rad, i) {
ctx.strokeStyle = rgba(IV, 0.1); ctx.setLineDash([2, 6]); ctx.lineWidth = 1;
ctx.beginPath(); ctx.arc(sx(0), sy(0), rad * V.s, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
var d = Math.hypot(V.cx, V.cy); if (Math.abs(d - rad) < V.R * 1.4) { var ux = V.cx / d, uy = V.cy / d, px = sx(ux * rad), py = sy(uy * rad); ctx.fillStyle = rgba(MU, 0.9); ctx.fillText(W.SECTIONS[i + 2].toUpperCase(), px + 8, py - 6); }
});
var stars = W.starsNear(S, V.cx, V.cy, V.R * 1.5), fuelR = Math.min(W.range(S), S.fuel / 0.45);
// range rings
ctx.strokeStyle = rgba(AC, 0.55); ctx.setLineDash([3, 5]); ctx.beginPath(); ctx.arc(ox, oy, W.range(S) * V.s, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
if (fuelR < W.range(S) - 1) { ctx.strokeStyle = rgba(IV, 0.35); ctx.beginPath(); ctx.arc(ox, oy, fuelR * V.s, 0, Math.PI * 2); ctx.stroke(); }
// Sol direction
var dS = Math.hypot(V.cx, V.cy);
if (dS > 1) {
var ux = -V.cx / dS, uy = -V.cy / dS, e = Math.min(w, h * (w < 720 ? 0.6 : 1)) * 0.46;
ctx.strokeStyle = rgba(IV, 0.25); ctx.setLineDash([1, 5]); ctx.beginPath(); ctx.moveTo(ox, oy); ctx.lineTo(ox + ux * Math.min(e, dS * V.s), oy + uy * Math.min(e, dS * V.s)); ctx.stroke(); ctx.setLineDash([]);
if (dS * V.s > e) { var ax = ox + ux * e, ay = oy + uy * e; ctx.save(); ctx.translate(ax, ay); ctx.rotate(Math.atan2(uy, ux)); ctx.fillStyle = IV; ctx.beginPath(); ctx.moveTo(8, 0); ctx.lineTo(-5, -6); ctx.lineTo(-5, 6); ctx.fill(); ctx.restore(); ctx.fillStyle = IV; ctx.textAlign = ux > 0 ? 'right' : 'left'; ctx.fillText('SOL · ' + W.fmt(dS) + ' LJ', ax - ux * 16, ay - uy * 16 - 10); ctx.textAlign = 'left'; }
}
// stars
stars.forEach(function (st) {
var x = sx(st.x), y = sy(st.y); if (x < -10 || y < -10 || x > w + 10 || y > h + 10) return;
var T = W.STARS[st.type], vis = S.visited[st.id], r = st.type === 'blau' ? 3.2 : st.type === 'rot' ? 2 : st.id === 'sol' ? 4 : 2.6;
if (st.type === 'loch') { ctx.strokeStyle = IV; ctx.setLineDash([1, 2]); circle(x, y, 4); ctx.stroke(); ctx.setLineDash([]); }
else if (st.type === 'pulsar') { ctx.strokeStyle = CO; circle(x, y, 3.5); ctx.stroke(); ctx.fillStyle = CO; circle(x, y, 1.2); ctx.fill(); }
else { ctx.fillStyle = rgba(T.c, vis ? 0.45 : 0.95); circle(x, y, r); ctx.fill(); }
if (st.id === 'sol') { ctx.fillStyle = IV; ctx.fillText('SOL', x + 8, y + 4); }
});
// visited trail
if (S.trail && S.trail.length > 1) { ctx.strokeStyle = rgba(AC, 0.6); ctx.lineWidth = 1; ctx.beginPath(); S.trail.forEach(function (p, i) { if (i) ctx.lineTo(sx(p[0]), sy(p[1])); else ctx.moveTo(sx(p[0]), sy(p[1])); }); ctx.stroke(); }
// selection
if (sel) {
var x = sx(sel.x), y = sy(sel.y), ok = W.canJump(S, sel).ok;
ctx.strokeStyle = ok ? AC : MU; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(ox, oy); ctx.lineTo(x, y); ctx.stroke();
circle(x, y, 9); ctx.stroke();
ctx.fillStyle = ok ? AC : MU; ctx.textAlign = 'left'; ctx.fillText(sel.name.toUpperCase(), x + 13, y - 8);
}
// current
ctx.fillStyle = AC; circle(ox, oy, 4); ctx.fill(); ctx.strokeStyle = AC; circle(ox, oy, 9 + Math.sin(time * 3) * 1.5); ctx.stroke();
return stars;
}
function pickGalaxy(S, V, stars, mx, my) {
var best = null, bd = 22;
stars.forEach(function (st) { var d = Math.hypot(V.w / 2 + (st.x - V.cx) * V.s - mx, V.oy + (st.y - V.cy) * V.s - my); if (d < bd) { bd = d; best = st; } });
return best;
}

// ---------- system map ----------
function sysView(F, w, h) { var mo = 200; F.sys.planets.forEach(function (p) { mo = Math.max(mo, p.orbit); }); return { s: Math.min(w, h * (w < 720 ? 0.6 : 1)) * 0.44 / (mo + 60), w: w, h: h, oy: w < 720 ? h * 0.3 : h / 2 }; }
function drawSystem(c, S, F, V, time) {
ctx = c; var w = V.w, h = V.h, ox = w / 2, oy = V.oy, ST = W.STARS[F.sys.star.type];
ctx.fillStyle = BG; ctx.fillRect(0, 0, w, h);
ctx.font = '11px ui-monospace, Menlo, monospace'; ctx.textAlign = 'left';
var g = ctx.createRadialGradient(ox, oy, 0, ox, oy, 40); g.addColorStop(0, rgba(ST.c, 0.9)); g.addColorStop(1, rgba(AC, 0)); ctx.fillStyle = g; circle(ox, oy, 40); ctx.fill();
ctx.fillStyle = F.sys.star.type === 'loch' ? '#000' : '#fff6ea'; circle(ox, oy, 6); ctx.fill();
// refuel zone
ctx.strokeStyle = rgba(AC, 0.35); ctx.setLineDash([2, 4]); circle(ox, oy, ST.r * 7 * V.s); ctx.stroke(); ctx.setLineDash([]);
F.sys.planets.forEach(function (p, i) {
var sel = F.target && F.target.kind === 'planet' && F.target.i === i;
ctx.strokeStyle = rgba(IV, sel ? 0.4 : 0.13); ctx.lineWidth = 1; circle(ox, oy, p.orbit * V.s); ctx.stroke();
var pp = W.planetPos(p, F.t), x = ox + pp[0] * V.s, y = oy + pp[2] * V.s, r = Math.max(3, p.r * 0.32);
ctx.fillStyle = planetColors(p).lit; circle(x, y, r); ctx.fill();
if (sel) { ctx.strokeStyle = AC; circle(x, y, r + 6); ctx.stroke(); }
ctx.fillStyle = sel ? IV : MU; ctx.fillText(p.name.toUpperCase() + (S.scanned[p.key] ? '' : ' ?'), x + r + 6, y + 4);
});
if (F.sys.station) { var sp = objPos(F, { kind: 'station' }), x = ox + sp[0] * V.s, y = oy + sp[2] * V.s; ctx.strokeStyle = IV; ctx.strokeRect(x - 4, y - 4, 8, 8); ctx.fillStyle = MU; ctx.fillText('STATION', x + 9, y + 14); }
// ship
var sx = ox + F.pos[0] * V.s, sy = oy + F.pos[2] * V.s;
ctx.save(); ctx.translate(sx, sy); ctx.rotate(-F.yaw + Math.PI / 2); ctx.fillStyle = AC; ctx.beginPath(); ctx.moveTo(8, 0); ctx.lineTo(-5, -5); ctx.lineTo(-2, 0); ctx.lineTo(-5, 5); ctx.closePath(); ctx.fill(); ctx.restore();
}
function pickSystem(F, V, mx, my) {
var ox = V.w / 2, oy = V.oy, best = null, bd = 28;
F.sys.planets.forEach(function (p, i) { var pp = W.planetPos(p, F.t), d = Math.hypot(ox + pp[0] * V.s - mx, oy + pp[2] * V.s - my); if (d < bd) { bd = d; best = { kind: 'planet', i: i }; } });
if (F.sys.station) { var sp = objPos(F, { kind: 'station' }), d = Math.hypot(ox + sp[0] * V.s - mx, oy + sp[2] * V.s - my); if (d < bd) { bd = d; best = { kind: 'station' }; } }
if (Math.hypot(ox - mx, oy - my) < bd) best = { kind: 'star' };
return best;
}

// ---------- small planet preview for menus ----------
function drawPlanetIcon(c, p, size) { ctx = c; ctx.clearRect(0, 0, size, size); drawPlanetDisc(size / 2, size / 2, size * 0.42, p, -0.6, -0.5, 0.4); }

root.Space = {
enter: enter, update: update, draw: draw, setTarget: setTarget, warpTo: warpTo, objPos: objPos, targetName: targetName, pickInView: pickInView,
drawTunnel: drawTunnel, galaxyView: galaxyView, drawGalaxy: drawGalaxy, pickGalaxy: pickGalaxy, sysView: sysView, drawSystem: drawSystem, pickSystem: pickSystem,
drawPlanetIcon: drawPlanetIcon, planetColors: planetColors
};
})(window);
