(function (root) {
'use strict';
// Homecoming: landing at a spaceport on Earth at dusk.
var W = root.World, ctx = null, IV = '#efe9dd', AC = '#ff7a2f';
function circle(x, y, r) { ctx.beginPath(); ctx.arc(x, y, Math.max(0.5, r), 0, Math.PI * 2); }
function sm(t) { t = Math.max(0, Math.min(1, t)); return t * t * (3 - 2 * t); }

function start(S) {
var r = W.rng(S.seed ^ 0xe47), city = [], x = 0;
while (x < 1.2) { var bw = 0.012 + r() * 0.03, bh = 0.03 + Math.pow(r(), 2) * 0.16, wins = []; for (var i = 0; i < 26; i++) if (r() < 0.55) wins.push([r(), r(), r() < 0.85]); city.push({ x: x, w: bw, h: bh, wins: wins, mast: r() < 0.15 }); x += bw + r() * 0.006; }
var crowd = []; for (i = 0; i < 26; i++) crowd.push([0.08 + r() * 0.22 + (i % 2 ? 0.52 : 0), 0.9 + r() * 0.15, r()]);
return { t: 0, city: city, crowd: crowd, crew: S.crew.length, stars: (function () { var o = []; for (var k = 0; k < 120; k++) o.push([r(), r() * 0.5, r()]); return o; })() };
}
function person(x, y, s, hair, rim, walk, time) {
var b = Math.sin(time * 8) * (walk ? 1.5 : 0) * s;
ctx.fillStyle = '#0c0c10';
ctx.fillRect(x - 3 * s, y - 13 * s, 2.4 * s, 13 * s + b); ctx.fillRect(x + 0.6 * s, y - 13 * s, 2.4 * s, 13 * s - b);
ctx.fillRect(x - 4.5 * s, y - 27 * s, 9 * s, 15 * s);
circle(x, y - 31 * s, 4 * s); ctx.fill();
if (hair) { ctx.fillStyle = hair; ctx.beginPath(); ctx.arc(x, y - 32 * s, 4.2 * s, Math.PI, 0); ctx.fill(); }
if (rim) { ctx.strokeStyle = rim; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(x, y - 31 * s, 4.2 * s, -Math.PI * 0.9, -Math.PI * 0.2); ctx.stroke(); ctx.beginPath(); ctx.moveTo(x + 4.5 * s, y - 26 * s); ctx.lineTo(x + 4.5 * s, y - 13 * s); ctx.stroke(); }
}
function draw(c, E, w, h, time, dt) {
ctx = c; E.t += dt;
var t = E.t, hor = h * 0.6, s = Math.max(0.7, Math.min(w, h * 1.4) / 900);
// dusk sky
var g = ctx.createLinearGradient(0, 0, 0, hor);
g.addColorStop(0, '#0b0c12'); g.addColorStop(0.45, '#262236'); g.addColorStop(0.78, '#6a4a5a'); g.addColorStop(1, '#d08a62');
ctx.fillStyle = g; ctx.fillRect(0, 0, w, hor + 1);
E.stars.forEach(function (st) { ctx.fillStyle = 'rgba(239,233,221,' + (0.2 + st[2] * 0.6) * (1 - st[1] * 1.6) + ')'; ctx.fillRect(st[0] * w, st[1] * hor, 1, 1); });
var mg = ctx.createRadialGradient(w * 0.78, hor, 0, w * 0.78, hor, w * 0.4); mg.addColorStop(0, 'rgba(255,170,110,0.45)'); mg.addColorStop(1, 'rgba(255,122,47,0)'); ctx.fillStyle = mg; ctx.fillRect(0, 0, w, hor);
// city
E.city.forEach(function (b) {
var bx = b.x * w - w * 0.1, bh = b.h * h, bw = b.w * w;
ctx.fillStyle = '#16141c'; ctx.fillRect(bx, hor - bh, bw, bh);
b.wins.forEach(function (q) { if (!q[2]) return; ctx.fillStyle = q[1] > 0.6 ? 'rgba(255,214,150,0.85)' : 'rgba(255,190,120,0.55)'; ctx.fillRect(bx + 2 + q[0] * (bw - 5), hor - bh + 3 + q[1] * (bh - 6), 1.6, 1.6); });
if (b.mast) { ctx.fillStyle = '#16141c'; ctx.fillRect(bx + bw / 2, hor - bh - 14, 1, 14); if (Math.floor(time * 1.2 + b.x * 9) % 2) { ctx.fillStyle = '#ff4a3a'; ctx.fillRect(bx + bw / 2 - 1, hor - bh - 16, 3, 3); } }
});
// sea
var sg = ctx.createLinearGradient(0, hor, 0, h * 0.72); sg.addColorStop(0, '#3a2e3a'); sg.addColorStop(1, '#141218'); ctx.fillStyle = sg; ctx.fillRect(0, hor, w, h * 0.12);
for (var i = 0; i < 40; i++) { var rx = ((i * 97) % 1000) / 1000 * w, ry = hor + 3 + (i * 13 % 60) / 60 * h * 0.1; ctx.fillStyle = 'rgba(255,190,130,' + (0.12 + 0.12 * Math.sin(time * 2 + i)) + ')'; ctx.fillRect(rx + Math.sin(time + i) * 4, ry, 10 + i % 12, 1); }
// pad
var py = h * 0.8;
ctx.fillStyle = '#0e0e12'; ctx.fillRect(0, h * 0.72, w, h * 0.28);
ctx.strokeStyle = 'rgba(239,233,221,0.15)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(w / 2, py, 160 * s, 26 * s, 0, 0, Math.PI * 2); ctx.stroke();
for (i = 0; i < 16; i++) { var a = i / 16 * Math.PI * 2, on = Math.floor(time * 6 - i) % 16 < 3 && t < 7.5; ctx.fillStyle = on ? AC : 'rgba(255,122,47,0.35)'; circle(w / 2 + Math.cos(a) * 160 * s, py + Math.sin(a) * 26 * s, 2); ctx.fill(); }
// crowd at the edge
E.crowd.forEach(function (p, k) { person(p[0] * w, py + (p[1] - 0.9) * 60 * s + 30 * s, 1.1 * s, null, 'rgba(255,190,130,0.35)', false, time); });
// ship
var land = sm(t / 7), sy = -140 * s + (py - 6 * s + 140 * s) * land, sx = w / 2;
if (t < 7.2) { var fl = (30 + Math.random() * 14) * s * (1 - land * 0.4); var fg = ctx.createLinearGradient(0, sy, 0, sy + fl * 3); fg.addColorStop(0, '#fff4e6'); fg.addColorStop(0.3, AC); fg.addColorStop(1, 'rgba(255,122,47,0)'); ctx.fillStyle = fg; ctx.beginPath(); ctx.moveTo(sx - 14 * s, sy); ctx.lineTo(sx + 14 * s, sy); ctx.lineTo(sx, sy + fl * 3); ctx.fill(); var lg = ctx.createRadialGradient(sx, py, 0, sx, py, 220 * s); lg.addColorStop(0, 'rgba(255,150,80,' + 0.35 * land + ')'); lg.addColorStop(1, 'rgba(255,122,47,0)'); ctx.fillStyle = lg; ctx.fillRect(sx - 220 * s, py - 220 * s, 440 * s, 440 * s); }
ctx.fillStyle = '#16181c'; ctx.strokeStyle = IV; ctx.lineWidth = 1.4;
ctx.beginPath(); ctx.moveTo(sx - 70 * s, sy - 16 * s); ctx.quadraticCurveTo(sx, sy - 88 * s, sx + 70 * s, sy - 16 * s); ctx.closePath(); ctx.fill(); ctx.stroke();
ctx.beginPath(); ctx.moveTo(sx - 78 * s, sy - 14 * s); ctx.lineTo(sx + 78 * s, sy - 14 * s); ctx.stroke();
ctx.beginPath(); ctx.moveTo(sx - 48 * s, sy - 14 * s); ctx.lineTo(sx - 62 * s, sy); ctx.moveTo(sx + 48 * s, sy - 14 * s); ctx.lineTo(sx + 62 * s, sy); ctx.stroke();
ctx.fillStyle = AC; ctx.fillRect(sx - 14 * s, sy - 54 * s, 28 * s, 9 * s);
for (i = 0; i < 5; i++) { ctx.fillStyle = 'rgba(255,214,160,0.8)'; ctx.fillRect(sx - 40 * s + i * 18 * s, sy - 32 * s, 6 * s, 4 * s); }
// ramp, light and walking crew
var rmp = sm((t - 7.6) / 1.2);
if (rmp > 0) {
ctx.fillStyle = 'rgba(255,220,170,' + 0.5 * rmp + ')'; ctx.beginPath(); ctx.moveTo(sx - 8 * s, sy - 14 * s); ctx.lineTo(sx + 8 * s, sy - 14 * s); ctx.lineTo(sx + 14 * s + rmp * 40 * s, py + 14 * s); ctx.lineTo(sx - 14 * s + rmp * 40 * s, py + 14 * s); ctx.fill();
var wk = sm((t - 8.8) / 4), n = 1 + Math.min(4, E.crew);
for (i = 0; i < n; i++) { var d = Math.max(0, wk - i * 0.12); if (d <= 0) continue; person(sx + 30 * s + d * 150 * s - i * 14 * s, py + 22 * s, 1.15 * s, i === 0 ? null : null, 'rgba(255,200,140,0.7)', d < 1, time); }
}
// Lena and Mara
var lx = w / 2 + 230 * s, ly = py + 26 * s;
var gw = ctx.createRadialGradient(lx, ly - 20 * s, 0, lx, ly - 20 * s, 60 * s); gw.addColorStop(0, 'rgba(255,190,130,' + 0.25 * sm((t - 6) / 3) + ')'); gw.addColorStop(1, 'rgba(255,122,47,0)'); ctx.fillStyle = gw; ctx.fillRect(lx - 60 * s, ly - 80 * s, 120 * s, 120 * s);
person(lx, ly, 1.1 * s, '#d8d4cc', 'rgba(255,200,140,0.9)', false, time);
person(lx + 18 * s, ly, 1.25 * s, '#3a2a22', 'rgba(255,200,140,0.9)', false, time);
// vignette
var vg = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.3, w / 2, h / 2, Math.max(w, h) * 0.75); vg.addColorStop(0, 'rgba(7,8,10,0)'); vg.addColorStop(1, 'rgba(7,8,10,0.75)'); ctx.fillStyle = vg; ctx.fillRect(0, 0, w, h);
if (t < 1.5) { ctx.fillStyle = 'rgba(7,8,10,' + (1 - t / 1.5) + ')'; ctx.fillRect(0, 0, w, h); }
}
root.Ending = { start: start, draw: draw };
})(window);
