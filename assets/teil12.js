// Teil 12: Planeten-Spielplatz. Sprungpilze, Geysire, Felsinseln, Kristallketten,
// Erbauer-Kammern, Wind, Sternschnuppen, Lichtspur des Sammlers, Planeten ohne Sonne.
(function (root) {
'use strict';
var W = root.World, PL = root.Planet, T = PL.terrain, IV = '#efe9dd', CY = '#9fe8ff';
// stärkere Unterschiede in der Schwerkraft
[['fels', 0.4, 1.6], ['wueste', 0.5, 1.3], ['eis', 0.3, 0.9], ['kristall', 0.3, 0.9], ['lava', 1.0, 1.6], ['leben', 0.6, 1.2]].forEach(function (g) { if (W.WORLDS[g[0]]) W.WORLDS[g[0]].grav = [g[1], g[2]]; });
function snd(k, n) { if (root.Sound) root.Sound.sfx(k, n); }
function free(P, x) { return Math.abs(x) > 300 && Math.abs(x + 310) > 90 && Math.abs(x) < P.w - 60; }
function hs(p, a) { return W.hash(p.seed, 12, a) % 100; }
function vUp(P, hgt) { return Math.sqrt(2 * P.g * hgt); }

var enter0 = PL.enter;
PL.enter = function (S, p, starType) {
var j, q, P = enter0(S, p, starType), r = W.rng(p.seed ^ 0x12a1), F = p.force12 || {}, key = p.key, m = S.mined;
P.k12 = 1; P.bnc = []; P.isl = []; P.chain = []; P.met = []; P.trail = [];
var t = P.type;
P.dark = F.dark != null ? !!F.dark : !p.sol && (t === 'fels' || t === 'eis' || t === 'kristall' || t === 'leben') && hs(p, 1) < 14;
// Sprungpilze und Geysire
var nb = 2 + Math.floor(r() * 3);
for (var i = 0; i < nb * 3 && P.bnc.length < nb; i++) { var x = (r() - 0.5) * 2 * (P.w - 100); if (free(P, x) && !P.bnc.some(function (b) { return Math.abs(b.x - x) < 160; })) P.bnc.push({ k: t === 'eis' || t === 'lava' || r() < 0.3 ? 'gey' : 'pilz', x: x, ph: r() * 6, sq: 0, c: ['#ffb37a', '#ff9ad0', '#9fe8ff', '#b8f0a0'][Math.floor(r() * 4)] }); }
// Felsinseln mit Kristallkette und Kammer
if (t !== 'ozean' && (F.isl || (F.isl == null && hs(p, 2) < 50))) {
var side = r() < 0.5 ? -1 : 1, x0 = side * (620 + r() * 260);
if (Math.abs(x0) > P.w - 520) x0 = side * Math.max(420, P.w - 520);
var hgt = [120, 210, 300];
for (i = 0; i < 3; i++) { var ix = x0 + side * i * 190; P.isl.push({ x: ix, y: T(P, ix) + hgt[i], w: 110 - i * 8, seed: r() }); }
P.isl.forEach(function (s, j) { if (j) s.y = Math.max(s.y, P.isl[j - 1].y + 70); });
var top = P.isl[2]; P.kam = { x: top.x, y: top.y, done: !!m[key + ':kam'] };
P.chainDone = !!m[key + ':kette'];
if (!P.chainDone) { var pts = [[x0 - side * 160, T(P, x0 - side * 160)]].concat(P.isl.map(function (s) { return [s.x, s.y]; }));
for (j = 0; j < pts.length - 1; j++) for (var q = 1; q <= 3; q++) { var u = q / 4, ax = pts[j][0] + (pts[j + 1][0] - pts[j][0]) * u, ay = pts[j][1] + (pts[j + 1][1] - pts[j][1]) * u + 70 * 4 * u * (1 - u) + 30; P.chain.push({ x: ax, y: ay, got: false }); } }
P.bnc.push({ k: 'pilz', x: x0 - side * 160, ph: 0, sq: 0, c: CY });
}
// Wind
var wtr = P.weather; P.wind = F.wind != null ? F.wind : (wtr === 'sand' || wtr === 'staub' || wtr === 'schnee' || hs(p, 3) < 18) ? (r() < 0.5 ? -1 : 1) * (40 + r() * 40) : 0;
P.wl = []; for (i = 0; i < 26; i++) P.wl.push([r(), r(), r()]);
P.metT = 8 + r() * 14;
// Lichtspur des Sammlers
if ((F.wisp || (F.wisp == null && S.sam && S.sam.met && hs(p, 4) < 35)) && !m[key + ':spur']) {
var sd = r() < 0.5 ? -1 : 1, wx = sd * 380; if (P.isl.length && Math.sign(P.isl[0].x) === sd) { sd = -sd; wx = -wx; }
P.wisp = { x0: wx, x1: wx + sd * Math.min(900, P.w - 420), x: wx, y: T(P, wx) + 40, on: false, done: false, dir: sd, ph: 0 };
}
// Planet ohne Sonne: leuchtende Pflanzen und Quallen
if (P.dark) {
P.glow = []; P.jel = [];
for (x = -P.w; x < P.w; x += 70 + r() * 160) P.glow.push({ x: x, c: ['#7affc8', '#9fe8ff', '#ffb37a', '#c8a8ff'][Math.floor(r() * 4)], h: 20 + r() * 30, n: 3 + Math.floor(r() * 4), s: r() * 9 });
for (i = 0; i < 7; i++) P.jel.push({ x: (r() - 0.5) * 2 * P.w, a: 160 + r() * 260, ph: r() * 6, sz: 0.6 + r() * 0.7 });
P.fx.push({ x: 0, y: T(P, 0) + 215, s: 'Ewige Nacht · nur deine Lampe', t: -1.2, c: '#c8a8ff' });
}
P.fx.push({ x: 0, y: T(P, 0) + 140, s: 'Schwerkraft ' + String(p.grav).replace('.', ',') + ' g' + (P.ice ? ' · rutschig' : ''), t: -0.6, c: IV });
return P;
};

var update0 = PL.update;
PL.update = function (S, P, dt, inp) {
if (!P.k12) return update0(S, P, dt, inp);
var py = P.y, extra = P.vy > 340 ? P.vy - 340 : 0;
update0(S, P, dt, inp);
if (extra) { P.vy += extra; P.y += extra * dt; }
var gy = T(P, P.x), cy = P.y + 28;
// Inseln: man kann von oben darauf landen
P.onIsle = false;
P.isl.forEach(function (s) { if (P.vy <= 0 && py >= s.y - 1 && P.y <= s.y && Math.abs(P.x - s.x) < s.w / 2) { P.y = s.y; P.vy = 0; P.ground = true; P.onIsle = true; } });
if (P.onIsle) P.jet = Math.min(1, P.jet + dt * 0.5);
// Pilze und Geysire
P.bnc.forEach(function (b) {
b.sq = Math.max(0, b.sq - dt * 3);
var by = T(P, b.x);
if (b.k === 'pilz') { if (P.ground && !P.onIsle && Math.abs(P.x - b.x) < 26 && P.y < by + 30) { P.vy = vUp(P, 270); P.ground = false; P.y += 2; b.sq = 1; snd('boing'); } }
else { b.on = ((P.t + b.ph) % 6) < 2.2; if (b.on && Math.abs(P.x - b.x) < 28 && P.y < by + 330) { P.vy = Math.max(P.vy, 260 + 200 * (1 - (P.y - by) / 330)); P.ground = false; } }
});
// Wind trägt, am Boden nur ein bisschen
if (P.wind) { var gust = P.wind * (0.55 + 0.45 * Math.sin(P.t * 0.5)); P.x = Math.max(-P.w, Math.min(P.w, P.x + gust * dt * (P.ground ? 0.15 : 1))); P.gust = gust; }
// Kristallkette
if (P.chain.length && !P.chainDone) {
P.chain.forEach(function (c) { if (!c.got && Math.abs(c.x - P.x) < 24 && Math.abs(c.y - cy) < 36) { c.got = true; var n = P.chain.filter(function (q) { return q.got; }).length; snd('ton', n - 1); P.fx.push({ x: c.x, y: c.y + 20, s: n + ' / ' + P.chain.length, t: 0, c: CY });
if (n === P.chain.length) { P.chainDone = true; S.mined[P.p.key + ':kette'] = 1; var g = W.addRes(S, 'kristall', 2); P.loot.kristall += g; S.cr += 150; P.cr += 150; P.fx.push({ x: P.x, y: P.y + 80, s: 'Kette komplett · +' + g + ' t Kristall · +150 Cr', t: 0, c: CY }); } } });
}
if (P.kam && !P.kam.done && P.onIsle && Math.abs(P.x - P.kam.x) < 30 && Math.abs(P.y - P.kam.y) < 4) {
P.kam.done = true; S.mined[P.p.key + ':kam'] = 1; S.forschung += 12; S.flags.ftot = (S.flags.ftot || 0) + 12; S.cr += 200; P.cr += 200;
P.fx.push({ x: P.x, y: P.y + 90, s: 'Erbauer-Kammer · +12 Forschung · +200 Cr', t: 0, c: '#ffd8a8' }); snd('signal');
}
// Sternschnuppen
P.metT -= dt;
if (P.metT <= 0) { P.metT = 18 + Math.random() * 20; var dx = (Math.random() - 0.5) * 2; P.met.push({ x: P.x + dx * 260, y: P.y + 430, vx: -dx * 30 + (Math.random() - 0.5) * 30, vy: -60, t: 0 }); }
P.met = P.met.filter(function (mt) {
mt.t += dt; mt.x += mt.vx * dt; mt.y += mt.vy * dt;
if (Math.hypot(mt.x - P.x, mt.y - cy) < 46) { if (Math.random() < 0.5) { var g = W.addRes(S, 'kristall', 1); P.loot.kristall += g; P.fx.push({ x: P.x, y: P.y + 70, s: 'Sternschnuppe gefangen · +' + g + ' t Kristall', t: 0, c: '#fff2dc' }); } else { S.cr += 120; P.cr += 120; P.fx.push({ x: P.x, y: P.y + 70, s: 'Sternschnuppe gefangen · +120 Cr', t: 0, c: '#fff2dc' }); } snd('ton', 9); return false; }
return mt.y > T(P, mt.x) && mt.t < 14;
});
// Lichtspur: das Licht wartet, wenn man zurückfällt
var wp = P.wisp;
if (wp && !wp.done) {
var d = Math.abs(P.x - wp.x);
if (!wp.on && d < 110) { wp.on = true; P.fx.push({ x: wp.x, y: wp.y + 40, s: 'Folge dem Licht', t: 0, c: CY }); }
if (wp.on && Math.abs(wp.x - wp.x1) > 4) {
if (d < 240) { wp.x += wp.dir * 120 * dt; wp.ph += dt * 1.8; }
if (wp.dir * (wp.x - wp.x1) > 0) wp.x = wp.x1;
wp.y = Math.max(T(P, wp.x), P.type === 'ozean' ? 0 : -999) + 40 + 110 * Math.abs(Math.sin(wp.ph));
if (!P.trail.length || Math.abs(P.trail[P.trail.length - 1][0] - wp.x) > 9) P.trail.push([wp.x, wp.y]);
if (P.trail.length > 90) P.trail.shift();
} else if (wp.on) wp.y = T(P, wp.x) + 30;
if (wp.on && Math.abs(wp.x - wp.x1) < 5 && Math.abs(P.x - wp.x1) < 40) {
wp.done = true; S.mined[P.p.key + ':spur'] = 1; S.forschung += 6; S.flags.ftot = (S.flags.ftot || 0) + 6; S.cr += 250; P.cr += 250;
P.fx.push({ x: P.x, y: P.y + 80, s: 'Versteckter Fundort · +6 Forschung · +250 Cr', t: 0, c: CY }); snd('peil');
}
}
};

// ---------- Zeichnen ----------
var oc = null;
function glow(c, x, y, r, col, a) { var g = c.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, col); g.addColorStop(1, 'rgba(0,0,0,0)'); c.globalAlpha = a == null ? 1 : a; c.fillStyle = g; c.beginPath(); c.arc(x, y, r, 0, 6.3); c.fill(); c.globalAlpha = 1; }
function a2(col, a) { var n = parseInt(col.slice(1), 16); return 'rgba(' + (n >> 16) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + a + ')'; }
root.PlanetX = function (c, S, P, w, h, time, s, X, Y) {
if (!P.k12) return;
var x0 = P.x - w / 2 / s - 60, x1 = P.x + w / 2 / s + 60;
function vis(x) { return x > x0 && x < x1; }
// Inseln
P.isl.forEach(function (il) {
if (!vis(il.x)) return; var hw = il.w / 2, sx = X(il.x), sy = Y(il.y);
c.fillStyle = P.dark ? '#16181c' : '#2a2a30'; c.strokeStyle = 'rgba(239,233,221,0.25)'; c.lineWidth = 1.2;
c.beginPath(); c.moveTo(sx - hw * s, sy); for (var k = 1; k < 8; k++) c.lineTo(sx + (-hw + k * il.w / 8) * s, sy - (Math.sin(k * 2.1 + il.seed * 9) * 3 + 2) * s);
c.lineTo(sx + hw * s, sy); c.lineTo(sx + hw * 0.4 * s, sy + il.w * 0.32 * s); c.lineTo(sx, sy + il.w * 0.55 * s); c.lineTo(sx - hw * 0.5 * s, sy + il.w * 0.3 * s); c.closePath(); c.fill(); c.stroke();
});
if (P.kam && vis(P.kam.x)) { var kx = X(P.kam.x), ky = Y(P.kam.y); c.fillStyle = '#12161c'; c.strokeStyle = 'rgba(255,216,168,0.6)'; c.lineWidth = 1.2; c.beginPath(); c.rect(kx - 22 * s, ky - 38 * s, 44 * s, 38 * s); c.fill(); c.stroke(); c.beginPath(); c.moveTo(kx - 22 * s, ky - 38 * s); c.lineTo(kx, ky - 54 * s); c.lineTo(kx + 22 * s, ky - 38 * s); c.stroke(); }
// Geysire
P.bnc.forEach(function (b) { if (b.k !== 'gey' || !vis(b.x)) return; var bx = X(b.x), by = Y(T(P, b.x)); c.fillStyle = 'rgba(10,12,16,0.9)'; c.beginPath(); c.ellipse(bx, by, 18 * s, 4 * s, 0, 0, 6.3); c.fill();
var ph = (P.t + b.ph) % 6; if (ph < 2.6) { var hh = Math.min(1, ph * 3) * (ph > 2.2 ? (2.6 - ph) / 0.4 : 1) * 330; for (var i = 0; i < 26; i++) { var u = ((i * 0.37 + time * 1.3) % 1), px = bx + Math.sin(i * 7.1 + time * 3) * (6 + u * 18) * s, pyy = by - u * hh * s; c.fillStyle = 'rgba(220,236,244,' + (0.5 * (1 - u)).toFixed(2) + ')'; c.beginPath(); c.arc(px, pyy, (2 + u * 5) * s, 0, 6.3); c.fill(); } }
else if (ph > 5.2) { c.fillStyle = 'rgba(220,236,244,0.3)'; c.beginPath(); c.arc(bx, by - 6 * s, 3 * s, 0, 6.3); c.fill(); } });
// Dunkelheit mit Lampe
if (P.dark) {
var cw = c.canvas.width, ch = c.canvas.height, k2 = cw / w;
if (!oc) oc = document.createElement('canvas'); if (oc.width !== cw || oc.height !== ch) { oc.width = cw; oc.height = ch; }
var o = oc.getContext('2d'); o.setTransform(k2, 0, 0, k2, 0, 0); o.globalCompositeOperation = 'source-over'; o.clearRect(0, 0, w, h); o.fillStyle = 'rgba(2,2,4,0.975)'; o.fillRect(0, 0, w, h);
o.globalCompositeOperation = 'destination-out';
var hx = X(P.x) + 4 * P.face * s, hy = Y(P.y + 42), R = 480 * s, ang = P.jetting ? 0.25 : 0.12;
var g = o.createRadialGradient(hx, hy, 0, hx, hy, R); g.addColorStop(0, 'rgba(0,0,0,0.95)'); g.addColorStop(0.6, 'rgba(0,0,0,0.75)'); g.addColorStop(1, 'rgba(0,0,0,0)');
o.fillStyle = g; o.beginPath(); o.moveTo(hx, hy); o.lineTo(hx + P.face * R, hy - R * (0.26 - ang)); o.lineTo(hx + P.face * R, hy + R * (0.3 + ang)); o.closePath(); o.fill();
g = o.createRadialGradient(hx, hy + 10 * s, 0, hx, hy + 10 * s, 120 * s); g.addColorStop(0, 'rgba(0,0,0,0.85)'); g.addColorStop(1, 'rgba(0,0,0,0)'); o.fillStyle = g; o.beginPath(); o.arc(hx, hy + 10 * s, 120 * s, 0, 6.3); o.fill();
c.save(); c.setTransform(1, 0, 0, 1, 0, 0); c.drawImage(oc, 0, 0); c.restore();
// Lichtkegel als feiner Schein
g = c.createRadialGradient(hx, hy, 0, hx, hy, R); g.addColorStop(0, 'rgba(255,242,220,0.16)'); g.addColorStop(1, 'rgba(255,242,220,0)'); c.fillStyle = g; c.beginPath(); c.moveTo(hx, hy); c.lineTo(hx + P.face * R, hy - R * (0.26 - ang)); c.lineTo(hx + P.face * R, hy + R * (0.3 + ang)); c.closePath(); c.fill();
// Sterne, Schiffslichter, leuchtende Pflanzen und Quallen
var rr = W.rng(P.p.seed + 5); c.fillStyle = 'rgba(239,233,221,0.7)'; for (var i = 0; i < 90; i++) c.fillRect(rr() * w, rr() * h * 0.4, 1, 1);
if (vis(0)) [-50, 0, 50].forEach(function (lx, j) { glow(c, X(lx), Y(T(P, 0) + 60), 24 * s, 'rgba(255,200,140,0.6)', 0.5 + 0.3 * Math.sin(time * 2 + j)); });
P.glow.forEach(function (f) {
if (!vis(f.x)) return; var gx = X(f.x), gy = Y(T(P, f.x)), sw = Math.sin(time * 1.1 + f.s) * 3 * s, pul = 0.7 + 0.3 * Math.sin(time * 1.7 + f.s);
glow(c, gx, gy - f.h * 0.6 * s, f.h * 1.4 * s, a2(f.c, 0.22), pul);
c.strokeStyle = a2(f.c, 0.55); c.lineWidth = 1.2; c.beginPath(); c.moveTo(gx, gy); c.quadraticCurveTo(gx - 3 * s, gy - f.h * 0.6 * s, gx + sw, gy - f.h * s); c.stroke();
c.fillStyle = f.c; for (var q = 0; q < f.n; q++) { c.globalAlpha = pul; c.beginPath(); c.arc(gx + sw * (q / f.n) + Math.sin(q * 2.3 + f.s) * 7 * s, gy - (f.h * (0.35 + 0.65 * q / f.n)) * s, (1.6 + (q % 2)) * s, 0, 6.3); c.fill(); } c.globalAlpha = 1;
});
P.jel.forEach(function (j) {
var jx = j.x + Math.sin(time * 0.2 + j.ph) * 60; if (!vis(jx)) return; var sx = X(jx), sy = Y(T(P, jx) + j.a + Math.sin(time * 0.6 + j.ph) * 14), z = j.sz * s, pul = 0.65 + 0.35 * Math.sin(time * 0.9 + j.ph);
glow(c, sx, sy, 46 * z, 'rgba(184,154,255,0.3)', pul);
c.fillStyle = 'rgba(184,154,255,' + (0.55 * pul).toFixed(2) + ')'; c.beginPath(); c.moveTo(sx - 20 * z, sy); c.quadraticCurveTo(sx, sy - 28 * z, sx + 20 * z, sy); c.closePath(); c.fill();
c.strokeStyle = 'rgba(216,200,255,0.45)'; c.lineWidth = 1; for (var q = -1.5; q <= 1.5; q++) { c.beginPath(); c.moveTo(sx + q * 8 * z, sy); c.quadraticCurveTo(sx + q * 8 * z + Math.sin(time * 1.5 + q) * 5 * z, sy + 18 * z, sx + q * 7 * z, sy + 34 * z); c.stroke(); }
});
}
// Pilze (leuchtende Hüte)
P.bnc.forEach(function (b) {
if (b.k !== 'pilz' || !vis(b.x)) return; var bx = X(b.x), by = Y(T(P, b.x)), q = 1 - b.sq * 0.35, z = s * 1.2;
glow(c, bx, by - 26 * z * q, 50 * z, a2(b.c, 0.28), 0.8);
c.fillStyle = '#2a2228'; c.beginPath(); c.moveTo(bx - 5 * z, by); c.lineTo(bx - 4 * z, by - 22 * z * q); c.lineTo(bx + 4 * z, by - 22 * z * q); c.lineTo(bx + 5 * z, by); c.fill();
c.fillStyle = '#3a2c34'; c.strokeStyle = b.c; c.lineWidth = 1.5; c.beginPath(); c.moveTo(bx - 30 * z / q, by - 20 * z * q); c.quadraticCurveTo(bx, by - 52 * z * q, bx + 30 * z / q, by - 20 * z * q); c.quadraticCurveTo(bx, by - 27 * z * q, bx - 30 * z / q, by - 20 * z * q); c.fill(); c.stroke();
c.fillStyle = b.c; [-16, -5, 7, 18].forEach(function (dx) { c.beginPath(); c.arc(bx + dx * z / q, by - (32 - Math.abs(dx) * 0.25) * z * q, 2 * z, 0, 6.3); c.fill(); });
});
// Kammer leuchtet
if (P.kam && vis(P.kam.x)) { var kx2 = X(P.kam.x), ky2 = Y(P.kam.y); glow(c, kx2, ky2 - 18 * s, 50 * s, 'rgba(255,216,168,0.35)', P.kam.done ? 0.3 : 0.6 + 0.3 * Math.sin(time * 2)); c.fillStyle = P.kam.done ? 'rgba(255,216,168,0.25)' : 'rgba(255,216,168,0.7)'; c.fillRect(kx2 - 6 * s, ky2 - 26 * s, 12 * s, 26 * s); }
// Kristallkette
if (!P.chainDone) P.chain.forEach(function (cr, i) {
if (cr.got || !vis(cr.x)) return; var cx = X(cr.x), cy = Y(cr.y + Math.sin(time * 2 + i) * 4), z = s;
glow(c, cx, cy, 16 * z, 'rgba(159,232,255,0.45)', 0.9); c.fillStyle = '#bff8ff'; c.beginPath(); c.moveTo(cx, cy - 8 * z); c.lineTo(cx + 5 * z, cy); c.lineTo(cx, cy + 8 * z); c.lineTo(cx - 5 * z, cy); c.closePath(); c.fill();
});
// Sternschnuppen
P.met.forEach(function (mt) { var mx = X(mt.x), my = Y(mt.y), l = Math.hypot(mt.vx, mt.vy) || 1; c.strokeStyle = 'rgba(255,242,220,0.5)'; c.lineWidth = 2; c.beginPath(); c.moveTo(mx, my); c.lineTo(mx - mt.vx / l * 60 * s, my + mt.vy / l * 60 * s); c.stroke(); glow(c, mx, my, 18 * s, 'rgba(255,242,220,0.7)', 0.8 + 0.2 * Math.sin(time * 9)); c.fillStyle = '#fff'; c.beginPath(); c.arc(mx, my, 3 * s, 0, 6.3); c.fill(); });
// Lichtspur und Licht des Sammlers
var wp = P.wisp;
if (wp && !wp.done) {
P.trail.forEach(function (tp, i) { c.fillStyle = 'rgba(232,251,255,' + (0.15 + 0.6 * i / P.trail.length).toFixed(2) + ')'; c.beginPath(); c.arc(X(tp[0]), Y(tp[1]), 1.8 * s, 0, 6.3); c.fill(); });
if (vis(wp.x)) { var wx = X(wp.x), wy = Y(wp.y); glow(c, wx, wy, 34 * s, 'rgba(159,232,255,0.5)', 0.8 + 0.2 * Math.sin(time * 5)); c.fillStyle = '#e8fbff'; c.beginPath(); c.moveTo(wx, wy - 9 * s); c.lineTo(wx + 6 * s, wy); c.lineTo(wx, wy + 9 * s); c.lineTo(wx - 6 * s, wy); c.closePath(); c.fill(); }
if (wp.on && Math.abs(wp.x - wp.x1) < 5 && vis(wp.x1)) glow(c, X(wp.x1), Y(T(P, wp.x1) + 10), 40 * s, 'rgba(159,232,255,0.4)', 0.6 + 0.4 * Math.sin(time * 3));
}
// Wind als feine Linien
if (P.wind) { var gu = P.gust || P.wind; c.strokeStyle = 'rgba(207,216,224,0.16)'; c.lineWidth = 1; P.wl.forEach(function (q) { var px = ((q[0] * w + time * gu * 4 * (0.6 + q[2])) % w + w) % w, py = q[1] * h * 0.85, L = 40 + q[2] * 60; c.beginPath(); c.moveTo(px, py); c.quadraticCurveTo(px + L / 2, py - 4, px + L * Math.sign(gu), py); c.stroke(); }); }
};
})(window);
