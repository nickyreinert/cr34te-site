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
var r = W.rng(99), s = [], tilt = 0.45;
function rot(v) { return [v[0], v[1] * Math.cos(tilt) - v[2] * Math.sin(tilt), v[1] * Math.sin(tilt) + v[2] * Math.cos(tilt)]; }
for (var i = 0; i < 1900; i++) {
var band = i < 1150, u = r() * 2 - 1, th = r() * Math.PI * 2;
if (band) u = (r() + r() + r() - 1.5) * 0.12;
var c = Math.sqrt(1 - u * u), m = Math.pow(r(), band ? 3.2 : 2.4);
s.push({ v: rot([c * Math.cos(th), u, c * Math.sin(th)]), m: m, c: r() < 0.1 ? CO : r() < 0.08 ? '#ffd8b0' : IV, tw: r() * 6 });
}
sky = s; MILKY = [];
for (i = 0; i < 70; i++) { var t2 = r() * Math.PI * 2, u2 = (r() - 0.5) * 0.08; MILKY.push({ v: rot([Math.cos(t2), u2, Math.sin(t2)]), a: 0.03 + r() * 0.05, s: 0.12 + r() * 0.16 }); }
}
var MILKY = [];

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
function setTarget(F, o, auto) { F.target = o; F.auto = !!auto; F.orbit = null; }
function startOrbit(F, o) { var c = objPos(F, o), d = sub(F.pos, c); F.orbit = { o: o, ang: Math.atan2(d[2], d[0]), r: Math.hypot(d[0], d[2]) }; }
function warpTo(F, o) {
var p = objPos(F, o), sd = stopDist(F, o), back = sub(F.pos, p), l = len(back) || 1;
F.pos = [p[0] + back[0] / l * sd, p[1] + back[1] / l * sd + 4, p[2] + back[2] / l * sd];
var to = sub(p, F.pos); F.yaw = Math.atan2(to[0], to[2]); F.pitch = Math.atan2(to[1], Math.hypot(to[0], to[2])); F.speed = 0; F.auto = false; F.target = o;
if (o.kind !== 'station') startOrbit(F, o);
}
function angDiff(a, b) { var d = b - a; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2; return d; }

function update(S, F, dt, inp) {
F.t += dt;
var B = basis(F), maxV = S.ship === 'falke' ? 110 : 85, cruiseV = S.ship === 'falke' ? 640 : 520;
var manual = Math.abs(inp.sx) > 0.05 || Math.abs(inp.sy) > 0.05 || inp.thrust || inp.brake;
if (manual && F.auto) F.auto = false;
if (F.orbit && manual) { F.orbit = null; F.speed = Math.max(F.speed, 12); }
var orbiting = !!F.orbit;
if (F.orbit) {
// gliding around the planet (or at the edge of the star's refuel zone), planet on the right
var O = F.orbit, oc = objPos(F, O.o), isStar = O.o.kind === 'star', SR = W.STARS[F.sys.star.type].r;
var want = isStar ? SR * (inp.action ? 4.6 : 6.3) : stopDist(F, O.o), ov = isStar ? 14 : 10;
O.r += (want - O.r) * Math.min(1, dt * 0.8); O.ang += dt * ov / Math.max(10, O.r);
F.pos = [oc[0] + Math.cos(O.ang) * O.r, F.pos[1] + (oc[1] + 4 - F.pos[1]) * Math.min(1, dt * 2), oc[2] + Math.sin(O.ang) * O.r];
F.yaw += angDiff(F.yaw, Math.atan2(-Math.sin(O.ang), Math.cos(O.ang))) * Math.min(1, dt * 3); F.pitch += (0 - F.pitch) * Math.min(1, dt * 2);
F.speed = ov; F.cruise = false; F.turn = (F.turn || 0) * (1 - Math.min(1, dt * 3));
} else if (F.auto && F.target) {
var tp = objPos(F, F.target), d = sub(tp, F.pos), dist = len(d), sd = stopDist(F, F.target);
var wy = Math.atan2(d[0], d[2]), wp = Math.atan2(d[1], Math.hypot(d[0], d[2]));
F.yaw += angDiff(F.yaw, wy) * Math.min(1, dt * 2.6); F.pitch += (wp - F.pitch) * Math.min(1, dt * 2.6);
var aligned = Math.abs(angDiff(F.yaw, wy)) < 0.25;
var want = dist - sd < 4 ? 0 : Math.min(dist - sd > 500 ? cruiseV : maxV * 1.4, (dist - sd) * 1.6 + 6);
if (!aligned) want = Math.min(want, 30);
F.speed += (want - F.speed) * Math.min(1, dt * 2.2);
F.cruise = F.speed > maxV * 1.2;
if (dist - sd < 4 && F.speed < 3) { F.auto = false; F.speed = 0; if (F.target.kind !== 'station') startOrbit(F, F.target); }
} else {
F.yaw += inp.sx * dt * 1.3; F.turn = (F.turn || 0) + (inp.sx - (F.turn || 0)) * Math.min(1, dt * 4);
// no up and down: the ship levels out towards its target, or the system plane
var tq0 = F.target ? objPos(F, F.target) : null, dd0 = tq0 ? sub(tq0, F.pos) : null, wp0 = dd0 ? Math.atan2(dd0[1], Math.hypot(dd0[0], dd0[2])) : Math.atan2(-F.pos[1], 400);
F.pitch += (Math.max(-0.5, Math.min(0.5, wp0)) - F.pitch) * Math.min(1, dt * 1.2);
var tgt = inp.brake ? 0 : inp.thrust ? (F.cruise ? cruiseV : maxV) : F.speed * (F.cruise ? 1 : 0.995);
if (F.cruise && !inp.thrust) tgt = cruiseV;
if (inp.brake) F.cruise = false;
F.speed += (tgt - F.speed) * Math.min(1, dt * (inp.brake ? 3 : 1.4));
}
B = basis(F);
if (!orbiting) F.pos = [F.pos[0] + B.f[0] * F.speed * dt, F.pos[1] + B.f[1] * F.speed * dt, F.pos[2] + B.f[2] * F.speed * dt];
F.orbK = (F.orbK || 0) + ((F.orbit ? 1 : 0) - (F.orbK || 0)) * Math.min(1, dt * 1.2);
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
// ---------- sprite-stacked ships: plan view slices, x forward, y right, z up ----------
function bx(x0, x1, y0, y1, z0, z1, t) { return { k: 'b', x0: x0, x1: x1, y0: y0, y1: y1, z0: z0, z1: z1, t: t || '' }; }
function pg(pts, z0, z1, tp, t) { return { k: 'p', pts: pts, z0: z0, z1: z1, tp: tp || 0, t: t || '' }; }
var SHIP3 = {
kranich: [bx(-90, 110, -4, 4, 20, 26), bx(-120, -90, -14, 14, 10, 36), bx(-128, -120, -8, 8, 16, 30, 'n'), bx(108, 136, -10, 10, 14, 32), bx(30, 60, -9, 9, 16, 30), bx(66, 80, -16, 16, 12, 34), { k: 'r', xc: 0, zc: 23, R: 44, th: 6, w: 4 }, bx(-3, 3, -44, 44, 21, 25), bx(-3, 3, -3, 3, -21, 67)],
elster: [pg([[130, 0], [40, -10], [-110, -12], [-110, 12], [40, 10]], 14, 26, 0.3), pg([[30, -8], [-60, -90], [-84, -86], [-60, -8]], 17, 21), pg([[30, 8], [-60, 90], [-84, 86], [-60, 8]], 17, 21), pg([[-40, -2], [-100, -2], [-110, 2], [-50, 2]], 26, 58, 0.5), bx(-118, -108, -6, 6, 15, 25, 'n'), pg([[90, -4], [60, -6], [60, 6], [90, 4]], 26, 32)],
schildkroete: [bx(-110, 110, -5, 5, 10, 16), bx(96, 128, -16, 16, 6, 34), bx(-128, -110, -14, 14, 8, 30), bx(-134, -128, -8, 8, 12, 26, 'n')],
falke: [pg([[140, 0], [90, -24], [-60, -30], [-110, -16], [-110, 16], [-60, 30], [90, 24]], 8, 30, 0.45), pg([[20, -26], [-40, -100], [-66, -98], [-50, -28]], 16, 20), pg([[20, 26], [-40, 100], [-66, 98], [-50, 28]], 16, 20), pg([[-30, -2], [-90, -2], [-100, 2], [-40, 2]], 30, 54, 0.6), bx(-122, -110, -12, -4, 14, 24, 'n'), bx(-122, -110, 4, 12, 14, 24, 'n')]
};
[[14, 20], [22, 12], [10, 24], [18, 14]].forEach(function (hh, i) { SHIP3.schildkroete.push(bx(-96 + i * 48, -56 + i * 48, -30, -2, 16, 16 + hh[0]), bx(-96 + i * 48, -56 + i * 48, 2, 30, 16, 16 + hh[1])); });
var SLICES = {};
function slices(key) {
if (SLICES[key]) return SLICES[key];
var L = [];
for (var z = -24; z <= 70; z += 2) {
var out = [];
SHIP3[key].forEach(function (p) {
if (p.k === 'b') { if (z >= p.z0 && z <= p.z1) out.push({ pts: [[p.x0, p.y0], [p.x1, p.y0], [p.x1, p.y1], [p.x0, p.y1]], t: p.t, top: z >= p.z1 - 2 }); }
else if (p.k === 'p') { if (z >= p.z0 && z <= p.z1) { var f = 1 - p.tp * (z - p.z0) / Math.max(1, p.z1 - p.z0), cx = 0, cy = 0; p.pts.forEach(function (q) { cx += q[0]; cy += q[1]; }); cx /= p.pts.length; cy /= p.pts.length; out.push({ pts: p.pts.map(function (q) { return [cx + (q[0] - cx) * f, cy + (q[1] - cy) * f]; }), t: p.t, top: z >= p.z1 - 2 }); } }
else { var dz = z - p.zc; if (Math.abs(dz) <= p.R) { var yo = Math.sqrt(p.R * p.R - dz * dz), yi = Math.abs(dz) < p.R - p.th ? Math.sqrt(Math.pow(p.R - p.th, 2) - dz * dz) : 0; [-1, 1].forEach(function (sg) { out.push({ pts: [[p.xc - p.w, sg * yi], [p.xc + p.w, sg * yi], [p.xc + p.w, sg * yo], [p.xc - p.w, sg * yo]], t: '', top: false }); }); } }
});
if (out.length) L.push({ z: z, s: out });
}
return (SLICES[key] = L);
}
// a = plan angle on screen (0 = nose right), tilt = vertical squash, zs = layer lift per unit, bank = roll
function drawStack(key, x, y, k, a, tilt, zs, bank, time, glow) {
var ca = Math.cos(a), sa = Math.sin(a), cb = Math.cos(bank), sb = Math.sin(bank);
function P(px, py, z) { var yy = py * cb, zz = z + py * sb; return [x + (px * ca - yy * sa) * k, y + (px * sa + yy * ca) * k * tilt - zz * k * zs]; }
if (glow > 0) { var e = P(-135, 0, 20), g = ctx.createRadialGradient(e[0], e[1], 0, e[0], e[1], 46 * k * glow + 4); g.addColorStop(0, 'rgba(255,200,140,0.5)'); g.addColorStop(1, 'rgba(255,122,47,0)'); ctx.fillStyle = g; circle(e[0], e[1], 46 * k * glow + 4); ctx.fill(); }
var sh = P(0, 0, -40); ctx.fillStyle = 'rgba(0,0,0,0.22)'; ctx.beginPath(); ctx.ellipse(x, y + 26 * k * zs, 120 * k, 34 * k * tilt + 2, a * 0.3, 0, Math.PI * 2); ctx.fill();
ctx.lineJoin = 'round';
slices(key).forEach(function (L) {
L.s.forEach(function (q) {
ctx.beginPath(); q.pts.forEach(function (pt, i) { var s = P(pt[0], pt[1], L.z); if (i) ctx.lineTo(s[0], s[1]); else ctx.moveTo(s[0], s[1]); }); ctx.closePath();
ctx.fillStyle = q.t === 'n' ? '#2a1a12' : '#15171b'; ctx.fill();
ctx.strokeStyle = q.t === 'n' ? 'rgba(255,122,47,' + (q.top ? 0.95 : 0.5) + ')' : 'rgba(239,233,221,' + (q.top ? 0.9 : 0.2) + ')'; ctx.lineWidth = q.top ? 1.1 : 0.8; ctx.stroke();
});
if (L.z === 22) [40, -20, -70].forEach(function (lx, i) { var s = P(lx, 0, 23); ctx.fillStyle = 'rgba(255,216,168,' + (0.6 + 0.4 * Math.sin(time * 2 + i)) + ')'; circle(s[0], s[1], 1.8); ctx.fill(); });
});
}
// ---------- camera: beside and behind the ship, heading shown to the right ----------
function basisYP(yaw, pitch) { var cy = Math.cos(yaw), sy = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch); return { f: [cp * sy, sp, cp * cy], r: [cy, 0, -sy], u: [-sp * sy, cp, -sp * cy] }; }
function cam(F, w, h, k) {
var port = w < h * 0.9, a0 = port ? 0.3 : 0.5, a = a0 + (F.orbK || 0) * (Math.PI / 2 - a0), fl = Math.min(h * 0.72, w * (port ? 0.7 : 0.6)), yaw = F.yaw - a, pit = F.pitch * 0.6 - 0.06, pos = [F.pos[0], F.pos[1] + 2, F.pos[2]], cy = h / 2;
if (F.lookAt && F.lookK > 0) { var dl = sub(F.lookAt, pos), ly = Math.atan2(dl[0], dl[2]); yaw += angDiff(yaw, ly) * F.lookK; pit += (Math.atan2(dl[1], Math.hypot(dl[0], dl[2])) - pit) * F.lookK; }
if (k > 0) { // camera rises above the system until it looks straight down, matching the system map
var V = sysView(F, w, h), e = k * k * (3 - 2 * k), H = fl / V.s, dy = angDiff(yaw, 0);
yaw = yaw + dy * e; pit = pit + (-Math.PI / 2 + 0.0005 - pit) * e; pos = [pos[0] * (1 - e), pos[1] + (H - pos[1]) * e, pos[2] * (1 - e)]; cy = h / 2 + (V.oy - h / 2) * e;
}
return { B: basisYP(yaw, pit), fl: fl, pos: pos, port: port, cx: w / 2, cy: cy, k: k || 0 };
}
function proj(C, p, w, h) { var d = sub(p, C.pos), z = dot(d, C.B.f); if (z < 1) return null; return { x: C.cx + dot(d, C.B.r) * C.fl / z, y: C.cy - dot(d, C.B.u) * C.fl / z, z: z, s: C.fl / z }; }
function projD(C, v, w, h) { var z = dot(v, C.B.f); if (z < 0.05) return null; return { x: C.cx + dot(v, C.B.r) * C.fl / z, y: C.cy - dot(v, C.B.u) * C.fl / z }; }
var TINT = { rot: ['#2a1424', '#8a4a5a', '#c8705a'], gelb: ['#1c1420', '#7a5a4a', '#d8a070'], blau: ['#0c1424', '#3a5a7a', '#9fc0e0'], weiss: ['#10141c', '#4a5468', '#b8c4d4'], pulsar: ['#081418', '#2a5a5a', '#7af0d0'], loch: ['#140c08', '#5a2a1a', '#ff9a50'] };
var DUST = null, PATH = {};
function nebula(C, F, w, h, tint, time) {
// almost black, only a breath of the star's colour; the Milky Way as a faint band
var g = ctx.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#030407'); g.addColorStop(1, rgba(tint[0], 0.35)); ctx.fillStyle = '#030407'; ctx.fillRect(0, 0, w, h); ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
MILKY.forEach(function (m) { var q = projD(C, m.v, w, h); if (!q) return; var R = h * m.s * 2; if (q.x < -R || q.x > w + R || q.y < -R || q.y > h + R) return; var cg = ctx.createRadialGradient(q.x, q.y, 0, q.x, q.y, R); cg.addColorStop(0, 'rgba(220,214,204,' + m.a + ')'); cg.addColorStop(1, 'rgba(220,214,204,0)'); ctx.fillStyle = cg; ctx.fillRect(q.x - R, q.y - R, R * 2, R * 2); });
}
function drawDust(F, w, h, time, dtv) {
if (!DUST) { var r = W.rng(5); DUST = []; for (var i = 0; i < 70; i++) DUST.push([r(), r(), 0.3 + r() * 0.7]); }
var v = Math.min(1, F.speed / 120), c = Math.min(1, Math.max(0, (F.speed - 150) / 300));
DUST.forEach(function (d) {
d[0] -= dtv * (0.02 + v * 0.35 + c * 1.2) * d[2]; d[1] += dtv * (F.turn || 0) * 0.02 * d[2]; if (d[0] < 0) { d[0] += 1; d[1] = Math.random(); } d[1] = (d[1] + 1) % 1;
var x = d[0] * w, y = d[1] * h;
if (c > 0.05) { ctx.strokeStyle = rgba(IV, 0.25 * d[2]); ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 40 * c * d[2], y); ctx.stroke(); }
else { ctx.fillStyle = rgba(IV, 0.1 + 0.3 * d[2] * (0.3 + v)); ctx.fillRect(x, y, d[2] > 0.8 ? 2 : 1, d[2] > 0.8 ? 2 : 1); }
});
}
function drawStation(x, y, rs, time) {
ctx.save(); ctx.translate(x, y); ctx.rotate(time * 0.05); ctx.strokeStyle = rgba(IV, 0.9); ctx.lineWidth = Math.max(1, rs * 0.012);
ctx.beginPath(); ctx.arc(0, 0, rs, 0, Math.PI * 2); ctx.stroke(); ctx.strokeStyle = rgba(IV, 0.25); ctx.lineWidth = Math.max(1, rs * 0.09); ctx.beginPath(); ctx.arc(0, 0, rs * 0.87, 0, Math.PI * 2); ctx.stroke();
ctx.strokeStyle = rgba(IV, 0.55); ctx.lineWidth = Math.max(0.6, rs * 0.008); for (var i = 0; i < 4; i++) { var a = 0.3 + i * 1.57; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(a) * rs * 0.87, Math.sin(a) * rs * 0.87); ctx.stroke(); }
for (i = 0; i < 16; i++) { var b = i * 0.393; ctx.fillStyle = 'rgba(255,216,168,' + (0.5 + 0.5 * Math.sin(time * 2 + i)) + ')'; ctx.fillRect(Math.cos(b) * rs - 1, Math.sin(b) * rs - 1, Math.max(2, rs * 0.018), Math.max(2, rs * 0.018)); }
ctx.restore(); ctx.save(); ctx.translate(x, y);
ctx.fillStyle = '#121316'; ctx.strokeStyle = IV; ctx.lineWidth = Math.max(1, rs * 0.012);
ctx.fillRect(-rs * 1.25, -rs * 0.05, rs * 2.5, rs * 0.1); ctx.strokeRect(-rs * 1.25, -rs * 0.05, rs * 2.5, rs * 0.1);
[-1.9, -1.58, 1.25, 1.58].forEach(function (px) { ctx.fillStyle = '#1a2434'; ctx.fillRect(px * rs, -rs * 0.33, rs * 0.32, rs * 0.66); ctx.strokeStyle = rgba(CO, 0.8); ctx.strokeRect(px * rs, -rs * 0.33, rs * 0.32, rs * 0.66); });
ctx.fillStyle = '#121316'; ctx.fillRect(-rs * 0.22, -rs * 0.22, rs * 0.44, rs * 0.44); ctx.strokeStyle = IV; ctx.strokeRect(-rs * 0.22, -rs * 0.22, rs * 0.44, rs * 0.44);
ctx.fillStyle = (Math.floor(time * 2) % 2) ? AC : IV; ctx.fillRect(-2, -rs * 0.22 - 4, 4, 4);
ctx.restore();
}
function draw(c, S, F, w, h, time, inp) {
ctx = c; if (!sky) initSky();
var ck = (inp && inp.camK) || 0, C = cam(F, w, h, ck), B = C.B, st = F.sys.star, ST = W.STARS[st.type], tint = TINT[st.type] || TINT.gelb, dtv = Math.min(0.05, time - (F._lt || time)); F._lt = time;
nebula(C, F, w, h, tint, time);
// sky
sky.forEach(function (s) {
var q = projD(C, s.v, w, h); if (!q || q.x < -4 || q.y < -4 || q.x > w + 4 || q.y > h + 4) return;
var a = 0.3 + s.m * 0.7 * (0.85 + 0.15 * Math.sin(time * 1.3 + s.tw)), z = s.m > 0.7 ? 2 : s.m > 0.3 ? 1.4 : 1;
ctx.fillStyle = rgba(s.c, a); ctx.fillRect(q.x, q.y, z, z);
if (s.m > 0.85) { ctx.fillStyle = rgba(s.c, 0.15); ctx.fillRect(q.x - 2, q.y + 0.5, 5, 1); ctx.fillRect(q.x + 0.5, q.y - 2, 1, 5); }
});
// small signs of life: a comet and the blinking light of a distant freighter
var lr = W.rng(F.sys.star.seed ^ 5), cth = lr() * 6.28, cel = 0.08 + lr() * 0.2, cq = projD(C, [Math.cos(cth + F.t * 0.0004), cel, Math.sin(cth + F.t * 0.0004)], w, h);
if (cq) { var ca = lr() * 6.28, cl = 60 + lr() * 60; var tg = ctx.createLinearGradient(cq.x, cq.y, cq.x + Math.cos(ca) * cl, cq.y + Math.sin(ca) * cl); tg.addColorStop(0, 'rgba(230,240,255,0.5)'); tg.addColorStop(1, 'rgba(230,240,255,0)'); ctx.strokeStyle = tg; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(cq.x, cq.y); ctx.lineTo(cq.x + Math.cos(ca) * cl, cq.y + Math.sin(ca) * cl); ctx.stroke(); ctx.fillStyle = '#f4f8ff'; circle(cq.x, cq.y, 1.8); ctx.fill(); }
var fth = lr() * 6.28 + F.t * 0.004, fq = projD(C, [Math.cos(fth), -0.03 + lr() * 0.06, Math.sin(fth)], w, h);
if (fq && Math.floor(time * 1.4) % 2) { ctx.fillStyle = 'rgba(255,170,110,0.9)'; circle(fq.x, fq.y, 1.4); ctx.fill(); ctx.fillStyle = 'rgba(239,233,221,0.6)'; circle(fq.x + 5, fq.y, 0.9); ctx.fill(); }
// the Stille: where it is, the stars simply stop
var ve = W.voidEdge ? W.voidEdge(S) : null; F.edge = ve && ve.d < 70 ? ve : null;
if (ve && ve.d < 220) {
var vd = Math.hypot(ve.dx, ve.dy) || 1, vq = projD(C, [ve.dx / vd, -0.05, ve.dy / vd], w, h);
if (vq) { var ang = Math.atan(ve.v.r / Math.max(ve.v.r * 0.6, vd)), VR = Math.tan(Math.min(1.3, ang)) * C.fl * 1.4;
var vg0 = ctx.createRadialGradient(vq.x, vq.y, VR * 0.75, vq.x, vq.y, VR * 1.08); vg0.addColorStop(0, 'rgba(0,0,0,1)'); vg0.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = vg0; circle(vq.x, vq.y, VR * 1.08); ctx.fill();
ctx.fillStyle = '#000'; circle(vq.x, vq.y, VR * 0.76); ctx.fill();
ctx.strokeStyle = 'rgba(159,180,201,' + (0.06 + 0.04 * Math.sin(time * 0.7)) + ')'; ctx.lineWidth = 14; circle(vq.x, vq.y, VR * 0.95); ctx.stroke(); }
}
// bodies, far to near
var list = [{ kind: 'star', p: [0, 0, 0], r: ST.r }];
F.sys.planets.forEach(function (p, i) { list.push({ kind: 'planet', i: i, p: W.planetPos(p, F.t), r: p.r, pl: p }); });
if (F.sys.station) list.push({ kind: 'station', p: objPos(F, { kind: 'station' }), r: 6 });
list.forEach(function (o) { o.q = proj(C, o.p, w, h); });
list.sort(function (a, b) { return (b.q ? b.q.z : 0) - (a.q ? a.q.z : 0); });
var nearRing = null;
list.forEach(function (o) {
var q = o.q; if (!q) return;
var r = o.r * q.s;
if (q.x < -r * 3 - 200 || q.x > w + r * 3 + 200 || q.y < -r * 3 - 200 || q.y > h + r * 3 + 200) return;
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
// light rays
ctx.save(); ctx.globalAlpha = 0.022; ctx.fillStyle = ST.c; for (var i = 0; i < 9; i++) { var ra = i * 0.7 + time * 0.01, L = Math.max(w, h) * 1.3; ctx.beginPath(); ctx.moveTo(q.x, q.y); ctx.lineTo(q.x + Math.cos(ra) * L, q.y + Math.sin(ra) * L); ctx.lineTo(q.x + Math.cos(ra + 0.05) * L, q.y + Math.sin(ra + 0.05) * L); ctx.fill(); } ctx.restore();
var R9 = Math.max(10, r * 9), g = ctx.createRadialGradient(q.x, q.y, 0, q.x, q.y, R9);
g.addColorStop(0, rgba('#fff8ee', 1)); g.addColorStop(0.08, rgba(ST.c, 0.95 * pul)); g.addColorStop(0.25, rgba(ST.c, 0.32 * pul)); g.addColorStop(0.6, rgba(AC, 0.08)); g.addColorStop(1, rgba(AC, 0));
ctx.fillStyle = g; circle(q.x, q.y, R9); ctx.fill();
ctx.fillStyle = '#fffaf2'; circle(q.x, q.y, Math.max(2.5, r)); ctx.fill();
if (r > 40) { // close to the surface: prominences
ctx.save(); ctx.lineCap = 'round';
for (i = 0; i < 6; i++) { var pa = i * 1.05 + 0.3, hh = r * (0.12 + 0.08 * Math.sin(time * 0.4 + i)), px = q.x + Math.cos(pa) * r, py = q.y + Math.sin(pa) * r, nx = Math.cos(pa), ny = Math.sin(pa), tx = -ny, ty = nx, wd = r * 0.08;
ctx.strokeStyle = rgba('#ff9a50', 0.5); ctx.lineWidth = Math.max(3, r * 0.015); ctx.beginPath(); ctx.moveTo(px - tx * wd, py - ty * wd); ctx.bezierCurveTo(px - tx * wd + nx * hh * 2, py - ty * wd + ny * hh * 2, px + tx * wd + nx * hh * 2, py + ty * wd + ny * hh * 2, px + tx * wd, py + ty * wd); ctx.stroke();
ctx.strokeStyle = rgba('#ffe0b0', 0.8); ctx.lineWidth = 1.2; ctx.stroke(); }
ctx.restore();
}
return;
}
if (o.kind === 'station') { drawStation(q.x, q.y, Math.max(3, r * 2.4), time); o.sq = q; return; }
var ld = sub([0, 0, 0], o.p), ll = len(ld) || 1; ld = [ld[0] / ll, ld[1] / ll, ld[2] / ll];
var lx = dot(ld, B.r), ly = -dot(ld, B.u), lz = -dot(ld, B.f);
var lxy = Math.hypot(lx, ly) || 1; lx /= lxy; ly /= lxy;
var rings = o.pl.sol ? o.pl.sol === 'saturn' : o.pl.type === 'gas' && o.pl.hue > 0.45;
// atmosphere glow
if (r > 4 && o.pl.type !== 'fels') { var ag = ctx.createRadialGradient(q.x, q.y, r * 0.9, q.x, q.y, r * 1.35), ac = planetColors(o.pl).lit; ag.addColorStop(0, rgba(o.pl.type === 'gas' ? '#e8d8b8' : o.pl.type === 'wueste' ? '#ffd0a0' : '#bfe0ff', 0.28)); ag.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = ag; circle(q.x, q.y, r * 1.35); ctx.fill(); }
function ringArc(a0, a1) { [[2.25, 0.16, 0.35], [1.95, 0.08, 0.5], [1.7, 0.05, 0.3]].forEach(function (rg) { ctx.strokeStyle = rgba('#e8dccb', rg[2]); ctx.lineWidth = Math.max(1, r * rg[1]); ctx.beginPath(); ctx.ellipse(q.x, q.y, r * rg[0], r * rg[0] * 0.2, -0.22, a0, a1); ctx.stroke(); }); }
if (rings) ringArc(Math.PI, Math.PI * 2);
drawPlanetDisc(q.x, q.y, Math.max(1.2, r), o.pl, lx, ly, lz);
var RV = S.rover; if (RV && RV.st === 'out' && RV.star === S.star && RV.pi === o.i && r > 3) {
var pr = 1 - Math.max(0, RV.t) / (RV.T || 30); ctx.strokeStyle = rgba(AC, 0.25); ctx.lineWidth = 2; circle(q.x, q.y, r * 1.22 + 6); ctx.stroke();
ctx.strokeStyle = AC; ctx.beginPath(); ctx.arc(q.x, q.y, r * 1.22 + 6, -Math.PI / 2, -Math.PI / 2 + pr * Math.PI * 2); ctx.stroke();
var ra = time * 0.7, rx = q.x + Math.cos(ra) * r * 0.55, ry = q.y + Math.sin(ra) * r * 0.3; ctx.fillStyle = 'rgba(255,216,168,' + (0.6 + 0.4 * Math.sin(time * 6)) + ')'; circle(rx, ry, Math.max(1.5, r * 0.03)); ctx.fill();
}
if (rings) { ringArc(0, Math.PI); if (o.q.z < o.r * 7) nearRing = o; }
});
// ring debris in front when flying close to a ringed giant
if (nearRing) { var rd = W.rng(3), sh = (time * Math.max(20, F.speed) * 0.6) % w; for (var j = 0; j < 22; j++) { var dx = ((rd() * w * 1.6 - sh * (0.5 + rd())) % (w * 1.2) + w * 1.2) % (w * 1.2) - w * 0.1, dy = h * (0.78 + rd() * 0.2), ds = 6 + rd() * 26; ctx.fillStyle = '#2a2420'; ctx.strokeStyle = 'rgba(138,122,106,0.8)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(dx, dy); ctx.lineTo(dx + ds * 1.4, dy - ds * 0.6); ctx.lineTo(dx + ds * 2, dy + ds * 0.5); ctx.lineTo(dx + ds * 0.4, dy + ds); ctx.closePath(); ctx.fill(); ctx.stroke(); } }
if (ck < 0.3) drawDust(F, w, h, time, dtv);
// heat near the star
if (F.inZone) { var hg = ctx.createLinearGradient(0, h, 0, 0); hg.addColorStop(0, rgba(AC, Math.min(0.35, F.heat / 260))); hg.addColorStop(1, rgba(AC, 0)); ctx.fillStyle = hg; ctx.fillRect(0, 0, w, h); }
if (ck > 0.4) { var fo = (ck - 0.4) / 0.6; ctx.fillStyle = rgba(BG, fo * fo * (3 - 2 * fo)); ctx.fillRect(0, 0, w, h); }
if (ck > 0) { ctx.strokeStyle = rgba(IV, 0.13 * ck); ctx.lineWidth = 1; F.sys.planets.forEach(function (p) { ctx.beginPath(); for (var a = 0, n = 0; a <= 6.3; a += 0.1) { var q = proj(C, [Math.cos(a) * p.orbit, 0, Math.sin(a) * p.orbit], w, h); if (!q) { n = 0; continue; } if (n++) ctx.lineTo(q.x, q.y); else ctx.moveTo(q.x, q.y); } ctx.stroke(); }); }
// the ship, in profile
var ok2 = F.orbK || 0, shx = (C.port ? w * 0.42 : w * 0.3) * (1 - ok2) + w * 0.5 * ok2, shy = h * (C.port ? 0.66 : 0.62) * (1 - ok2) + h * (C.port ? 0.7 : 0.76) * ok2, sk = Math.min(1.5, Math.max(0.7, Math.min(w, h * 1.6) / 760)) * (1 - 0.25 * ok2);
// docking light path to the station
if (ck === 0 && F.target && F.target.kind === 'station') { var stq = proj(C, objPos(F, F.target), w, h); if (stq) for (var t = 1; t < 10; t++) { var u = t / 10; ctx.fillStyle = rgba(AC, 0.9 - u * 0.6); circle(shx + (stq.x - shx) * u + 60 * sk, shy + (stq.y - shy) * u, 2.4); ctx.fill(); } }
if (!(inp && (inp.noShip || inp.desc > 0.65))) {
var key = SHIP3[S.ship] ? S.ship : 'kranich', vp = projD(C, [Math.sin(F.yaw) * Math.cos(F.pitch), Math.sin(F.pitch), Math.cos(F.yaw) * Math.cos(F.pitch)], w, h), af = vp ? Math.atan2((vp.y - shy) / 0.5, vp.x - shx) : -0.9;
var ssx = shx, ssy = shy, til = 0.5, zst = 1, kk = sk * 0.95, aa = (af - 0.45) * (1 - ok2) - 0.12 * ok2 + (F.turn || 0) * 0.18, bank = (F.turn || 0) * 0.35;
if (ck > 0) { var e = ck * ck * (3 - 2 * ck), sp = proj(C, F.pos, w, h), at = Math.atan2(-Math.cos(F.yaw), Math.sin(F.yaw)); var V2 = sysView(F, w, h); ssx = shx + (w / 2 + F.pos[0] * V2.s - shx) * e; ssy = shy + (V2.oy - F.pos[2] * V2.s - shy) * e; til = 0.5 + 0.5 * e; zst = 1 - 0.85 * e; kk = kk + (0.13 - kk) * e; aa = af + angDiff(af, at) * e; bank *= 1 - e; }
var thr = inp && inp.thrust, v = Math.min(1, F.speed / 110); drawStack(key, ssx, ssy + Math.sin(time * 1.3) * 2 * (1 - ck), kk, aa, til, zst, bank, time, (0.3 + v * 0.7 + (F.cruise ? 0.5 : 0) + (thr ? 0.3 : 0)) * (1 - ck * 0.7));
var cpx = ssx + Math.cos(aa) * 90 * kk, cpy = ssy + Math.sin(aa) * 90 * kk * til - 26 * kk * zst, cg2 = ctx.createRadialGradient(cpx, cpy, 0, cpx, cpy, 22 * kk); cg2.addColorStop(0, 'rgba(255,200,140,0.45)'); cg2.addColorStop(1, 'rgba(255,200,140,0)'); ctx.fillStyle = cg2; circle(cpx, cpy, 22 * kk); ctx.fill();
}
// target marker
if (F.target && ck === 0) {
var tp = objPos(F, F.target), tq = proj(C, tp, w, h), name = targetName(F, F.target), dd = Math.max(0, Math.round(len(sub(tp, F.pos)) - objRadius(F, F.target))), eta = F.speed > 2 ? dd / F.speed : 0;
ctx.font = '12px ui-monospace, Menlo, monospace'; ctx.textAlign = 'left';
var sub2 = F.orbit ? (F.orbit.o.kind === 'star' ? 'UMLAUF AM TANKRING' : 'IM ORBIT') : dd + ' KM' + (eta > 1 ? ' · ' + (eta < 60 ? Math.round(eta) + ' S' : Math.round(eta / 6) / 10 + ' MIN') : '');
if (tq && tq.x > 30 && tq.x < w - 30 && tq.y > 30 && tq.y < h - 30) {
var b = Math.max(16, objRadius(F, F.target) * tq.s * (F.target.kind === 'station' ? 2.8 : 1.25));
ctx.strokeStyle = AC; ctx.lineWidth = 1.2; ctx.setLineDash([3, 5]); circle(tq.x, tq.y, b); ctx.stroke(); ctx.setLineDash([]);
var lx2 = tq.x + b * 0.7, ly2 = tq.y - b * 0.7, flip = lx2 + 180 > w; ctx.beginPath(); ctx.moveTo(lx2, ly2); ctx.lineTo(lx2 + (flip ? -30 : 30), ly2 - 30); ctx.stroke();
ctx.textAlign = flip ? 'right' : 'left'; var tx2 = lx2 + (flip ? -34 : 34);
ctx.fillStyle = 'rgba(5,6,10,0.55)'; var tw = Math.max(ctx.measureText(name.toUpperCase()).width, ctx.measureText(sub2).width); ctx.fillRect(flip ? tx2 - tw - 6 : tx2 - 6, ly2 - 50, tw + 12, 36);
ctx.fillStyle = IV; ctx.fillText(name.toUpperCase(), tx2, ly2 - 34); ctx.fillStyle = MU; ctx.fillText(sub2, tx2, ly2 - 19);
} else {
var d = sub(tp, C.pos), ax = dot(d, B.r), ay = -dot(d, B.u); if (dot(d, B.f) < 0) { ax = ax >= 0 ? 1e4 : -1e4; }
var al = Math.hypot(ax, ay) || 1, ex = w / 2 + ax / al * (w / 2 - 50), ey = h / 2 + ay / al * (h / 2 - 60);
ctx.save(); ctx.translate(ex, ey); ctx.rotate(Math.atan2(ay, ax)); ctx.beginPath(); ctx.moveTo(10, 0); ctx.lineTo(-6, -7); ctx.lineTo(-6, 7); ctx.closePath(); ctx.fillStyle = AC; ctx.fill(); ctx.restore();
ctx.fillStyle = AC; ctx.textAlign = 'center'; ctx.fillText(name.toUpperCase(), ex, ey + 22);
}
}
// descent into the atmosphere
var dk = (inp && inp.desc) || 0;
if (dk > 0 && inp.descP) {
var col = planetColors(inp.descP).lit.replace(/[^0-9,.]/g, '').split(',').map(Number), ag = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, Math.max(w, h) * 0.8);
ag.addColorStop(0, rgba(col, 0.15 + dk * 0.6)); ag.addColorStop(1, rgba(col, dk * 0.85)); ctx.fillStyle = ag; ctx.fillRect(0, 0, w, h);
var sr = W.rng(9); ctx.lineWidth = 1.5;
for (var si = 0; si < 40; si++) { var sx0 = sr() * w, sp0 = ((sr() + time * (1.2 + sr()) * (0.5 + dk)) % 1), sy0 = h - sp0 * h * 1.2; ctx.strokeStyle = 'rgba(255,255,255,' + (0.25 * dk * (0.4 + sr())) + ')'; ctx.beginPath(); ctx.moveTo(sx0, sy0); ctx.lineTo(sx0, sy0 - 40 - dk * 120); ctx.stroke(); }
var rim = ctx.createLinearGradient(0, h, 0, h * 0.4); rim.addColorStop(0, 'rgba(255,170,110,' + (0.5 * Math.sin(dk * Math.PI)) + ')'); rim.addColorStop(1, 'rgba(255,170,110,0)'); ctx.fillStyle = rim; ctx.fillRect(0, 0, w, h);
}
// vignette
var vg = ctx.createRadialGradient(w / 2, h * 0.5, Math.min(w, h) * 0.4, w / 2, h * 0.5, Math.max(w, h) * 0.75); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,' + (0.4 * (1 - ck)) + ')'); ctx.fillStyle = vg; ctx.fillRect(0, 0, w, h);
}
function targetName(F, o) { return o.kind === 'star' ? F.sys.star.name : o.kind === 'planet' ? F.sys.planets[o.i].name : F.sys.station.name; }
function pickInView(F, w, h, mx, my) {
var C = cam(F, w, h), best = null, bd = 44;
var objs = [{ kind: 'star' }].concat(F.sys.planets.map(function (p, i) { return { kind: 'planet', i: i }; }), F.sys.station ? [{ kind: 'station' }] : []);
objs.forEach(function (o) { var q = proj(C, objPos(F, o), w, h); if (!q) return; var d = Math.hypot(q.x - mx, q.y - my) - objRadius(F, o) * q.s * (o.kind === 'station' ? 2.6 : 1); if (d < bd) { bd = d; best = o; } });
return best;
}

// ---------- jump tunnel ----------
function drawTunnel(c, w, h, p, time, worm) {
ctx = c; ctx.fillStyle = BG; ctx.fillRect(0, 0, w, h);
if (worm) { // slow swirl, orange and violet
var rw = W.rng(11), kw = Math.sin(Math.min(1, p) * Math.PI), cxw = w / 2, cyw = h / 2, R = Math.hypot(w, h) * 0.6;
for (var j = 0; j < 220; j++) {
var a0 = rw() * Math.PI * 2, dd = ((rw() + time * (0.25 + rw() * 0.3)) % 1), a1 = a0 + dd * 4 + time * 0.6, r0 = dd * dd * R, r1 = r0 + 4 + kw * 60 * dd;
ctx.strokeStyle = rgba(j % 3 ? '#c8a0f0' : j % 2 ? AC : '#ffd8a8', (0.12 + dd * 0.7) * kw); ctx.lineWidth = 1 + dd * 1.5;
ctx.beginPath(); ctx.moveTo(cxw + Math.cos(a1) * r0, cyw + Math.sin(a1) * r0); ctx.lineTo(cxw + Math.cos(a1 + 0.12) * r1, cyw + Math.sin(a1 + 0.12) * r1); ctx.stroke();
}
var gw = ctx.createRadialGradient(cxw, cyw, 0, cxw, cyw, h * 0.35 * kw + 1); gw.addColorStop(0, rgba('#f0e0ff', 0.7 * kw)); gw.addColorStop(0.4, rgba('#c8a0f0', 0.3 * kw)); gw.addColorStop(1, rgba(AC, 0)); ctx.fillStyle = gw; ctx.fillRect(0, 0, w, h);
return;
}
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
var pp = W.planetPos(p, F.t), x = ox + pp[0] * V.s, y = oy - pp[2] * V.s, r = Math.max(3, p.r * 0.32);
ctx.fillStyle = planetColors(p).lit; circle(x, y, r); ctx.fill();
if (sel) { ctx.strokeStyle = AC; circle(x, y, r + 6); ctx.stroke(); }
ctx.fillStyle = sel ? IV : MU; ctx.fillText(p.name.toUpperCase() + (S.scanned[p.key] ? '' : ' ?'), x + r + 6, y + 4);
});
if (F.sys.station) { var sp = objPos(F, { kind: 'station' }), x = ox + sp[0] * V.s, y = oy - sp[2] * V.s; ctx.strokeStyle = IV; ctx.strokeRect(x - 4, y - 4, 8, 8); ctx.fillStyle = MU; ctx.fillText('STATION', x + 9, y + 14); }
// ship
var sx = ox + F.pos[0] * V.s, sy = oy - F.pos[2] * V.s;
if (F.target) { var tp2 = objPos(F, F.target); ctx.strokeStyle = rgba(AC, 0.6); ctx.setLineDash([3, 5]); ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(ox + tp2[0] * V.s, oy - tp2[2] * V.s); ctx.stroke(); ctx.setLineDash([]); }
drawStack(SHIP3[S.ship] ? S.ship : 'kranich', sx, sy, 0.13, Math.atan2(-Math.cos(F.yaw), Math.sin(F.yaw)), 1, 0.15, 0, time, 0.3);
}
function pickSystem(F, V, mx, my) {
var ox = V.w / 2, oy = V.oy, best = null, bd = 28;
F.sys.planets.forEach(function (p, i) { var pp = W.planetPos(p, F.t), d = Math.hypot(ox + pp[0] * V.s - mx, oy - pp[2] * V.s - my); if (d < bd) { bd = d; best = { kind: 'planet', i: i }; } });
if (F.sys.station) { var sp = objPos(F, { kind: 'station' }), d = Math.hypot(ox + sp[0] * V.s - mx, oy - sp[2] * V.s - my); if (d < bd) { bd = d; best = { kind: 'station' }; } }
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
