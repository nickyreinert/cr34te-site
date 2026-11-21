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

// palettes per world: moody dusk-leaning skies, layered haze
var PAL = {
fels: { sky: '#4a5468', mid: '#8a8a92', hor: '#c9c0b4', gr: '#3a3430', edge: '#7a7068', far: '#6a6a72', haze: '#b8b0a8', night: '#0c0d12' },
wueste: { sky: '#4a5a74', mid: '#b8a894', hor: '#ecc9a0', gr: '#a8784e', edge: '#d9a37a', far: '#a8846a', haze: '#e8c8a0', night: '#120c10' },
leben: { sky: '#2a2a40', mid: '#6a4a5a', hor: '#e2a06c', gr: '#1c161a', edge: '#4a3a3a', far: '#6a4a54', haze: '#c8826a', night: '#0a0b10' },
ozean: { sky: '#34506e', mid: '#7a9ab0', hor: '#d8e4e8', gr: '#1c2622', edge: '#5a6a4a', far: '#3a5a6a', haze: '#a8c0cc', night: '#060a12' },
eis: { sky: '#2c3c58', mid: '#6a80a0', hor: '#c8d6e4', gr: '#c4d2e0', edge: '#eef2f6', far: '#8a9cb4', haze: '#c8d6e4', night: '#0a0e18' },
kristall: { sky: '#1c1c3a', mid: '#4a4a7a', hor: '#b0a8e0', gr: '#2a2a48', edge: '#b8c8f0', far: '#5a5a8a', haze: '#8a8ac0', night: '#080818' },
lava: { sky: '#1e1214', mid: '#5a2a24', hor: '#c86a4a', gr: '#140e0c', edge: '#4a2a22', far: '#3a2220', haze: '#8a3a2a', night: '#0e0808' },
gift: { sky: '#2e3828', mid: '#6a7a4a', hor: '#d8d890', gr: '#161a10', edge: '#4a5a2a', far: '#5a6a3a', haze: '#a8b870', night: '#0a0e08' }
};
var MOOD = {
leben: { obj: 'monde', lm: ['baum', 'baum', 'baum'], acc: '#ffc890', rays: 1, fg: 'gras' },
gift: { obj: 'monde', lm: ['pilz', 'pilz', 'baum'], acc: '#d8f080', mist: 1, fg: 'gras' },
ozean: { obj: 'sichel', lm: ['stack', 'stack'], acc: '#7af0d0', aur: 1, fg: 'gras' },
wueste: { obj: 'riese', lm: ['tafel', 'bogen', 'tafel'], acc: '#ffd8a8', rays: 1, fg: 'stein' },
fels: { obj: 'riese', lm: ['tafel', 'nadel'], acc: '#ffd8a8', fg: 'stein' },
lava: { obj: 'riese', lm: ['vulkan', 'tafel'], acc: '#ff7a2f', fg: 'stein' },
eis: { obj: 'ring', lm: ['nadel', 'nadel'], acc: '#bfe0ff', aur: 1, mist: 1, fg: 'stein' },
kristall: { obj: 'ring', lm: ['nadel', 'nadel'], acc: '#bfe0ff', mist: 1, fg: 'stein' }
};
var AMP = { fels: 70, wueste: 45, leben: 40, ozean: 50, eis: 55, kristall: 50, lava: 45, gift: 40 };
function lavaAt(P, x) { return P.type === 'lava' && Math.abs(x) > 300 && Math.sin(x / 53 + P.ph[4]) > 0.8; }

function terrain(P, x) {
var a = P.amp, q = P.ph, ax = Math.abs(x);
var h = a * (0.55 * Math.sin(x / 210 + q[0]) + 0.3 * Math.sin(x / 97 + q[1]) + 0.15 * Math.sin(x / 41 + q[2]));
if (P.type === 'fels') h += Math.max(0, Math.sin(x / 63 + q[3]) - 0.7) * 120;
if (P.type === 'eis') h += Math.max(0, Math.sin(x / 37 + q[3]) - 0.85) * 160;
if (P.type === 'kristall') h += Math.max(0, Math.sin(x / 29 + q[3]) - 0.75) * 190;
if (lavaAt(P, x)) h -= 14;
if (P.type === 'ozean') h -= 26;
var flat = sm(((x < -400 ? -400 - x : x > 240 ? x - 240 : 0)) / 160);
h = h * flat + (1 - flat) * (P.type === 'ozean' ? 6 : 0);
if (P.feat) for (var i = 0; i < P.feat.length; i++) { var f = P.feat[i], e = f.k === 'spalte' ? 9 : 14, m = sm((x - f.x + f.w / 2) / e) * sm((f.x + f.w / 2 - x) / e); if (m > 0) h += (f.k === 'spalte' ? -f.h : f.h) * m; }
return h;
}
function hill(P, x, k) { return P.amp * 2.2 * (0.6 * Math.sin(x / (420 * k) + P.ph[k]) + 0.4 * Math.sin(x / (170 * k) + P.ph[k + 1])) + 70 * k; }

// ---------- alien archetypes (drawn in design units, 1 unit = 0.4 world units) ----------
var SIL = '#14161a', RIM = 'rgba(239,233,221,0.55)', PC = {}, LW = 1;
function PD(d) { return PC[d] || (PC[d] = new Path2D(d)); }
function body(d, fill, st) { var p = PD(d); ctx.fillStyle = fill || SIL; ctx.fill(p); ctx.strokeStyle = st || RIM; ctx.lineWidth = 1.3 * LW; ctx.stroke(p); }
function line(d, col, wpx) { ctx.strokeStyle = col; ctx.lineWidth = wpx * LW; ctx.stroke(PD(d)); }
function limb(pts, wpx) { ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.beginPath(); ctx.moveTo(pts[0], pts[1]); for (var i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]); ctx.strokeStyle = RIM; ctx.lineWidth = (wpx + 1.6 * 1) * LW; ctx.stroke(); ctx.strokeStyle = SIL; ctx.lineWidth = wpx * LW; ctx.stroke(); }
function gl(x, y, r, col, a) { var c = hex(col), g = ctx.createRadialGradient(x, y, 0, x, y, r * 5); g.addColorStop(0, rgb(c, 0.38 * (a == null ? 1 : a))); g.addColorStop(1, rgb(c, 0)); ctx.fillStyle = g; circle(x, y, r * 5); ctx.fill(); ctx.fillStyle = rgb(mix(c, [255, 255, 255], 0.35), a == null ? 1 : a); circle(x, y, r); ctx.fill(); }
var ARCH = {
schreithals: { n: 'Schreithals', w: 260, h: 300, spd: 16, face: -1, cols: ['#ffc890', '#ffb37a', '#f0d070', '#e8a0c0'], draw: function (t, st, c) {
[[-48, 1], [-24, -1], [30, 1], [54, -1]].forEach(function (l) { var sw = st * l[1] * 9; limb([l[0], -110, l[0] + 14 * l[1] + sw * 0.5, -60, l[0] + 4 * l[1] + sw, 0], 4); });
line('M86 -118 C 120 -120, 140 -100, 150 -70', RIM, 3);
body('M-80 -112 C -80 -150, 70 -160, 86 -118 C 92 -96, 40 -84, -10 -88 C -50 -90, -82 -96, -80 -112Z');
ctx.save(); ctx.translate(0, Math.sin(t * 1.3) * 3); limb([-70, -126, -92, -180, -100, -236, -82, -280], 8);
body('M-80 -282 C -70 -296, -40 -296, -34 -284 C -44 -276, -64 -274, -80 -282Z'); gl(-44, -285, 2, '#fff2dc');
[[-92, -200], [-100, -240]].forEach(function (q) { line('M' + q[0] + ' ' + q[1] + 'v18', RIM, 1); gl(q[0], q[1] + 22, 2.6, c, 0.6 + 0.4 * Math.sin(t * 2 + q[1])); }); ctx.restore();
[[-60, -140], [-30, -150], [0, -152], [30, -148], [58, -136]].forEach(function (q, i) { gl(q[0], q[1], 3.2, c, 0.55 + 0.45 * Math.sin(t * 1.5 + i)); });
} },
krusten: { n: 'Krustenroller', w: 190, h: 90, spd: 22, face: -1, cols: ['#9fb4c9', '#bfe0ff', '#ffc890', '#8fd0a0'], draw: function (t, st, c) {
for (var x = -60, i = 0; x < 70; x += 14, i++) limb([x, -10, x + (x < 0 ? -6 : 6) + (i % 2 ? st : -st) * 4, 0], 2.5);
body('M-80 -8 C -80 -90, 80 -90, 84 -8 Z');
for (i = 0; i < 5; i++) line('M' + (-80 + i * 32) + ' -8 C ' + (-74 + i * 32) + ' -' + (60 + (i % 2) * 12) + ', ' + (-46 + i * 32) + ' -' + (70 + (i % 3) * 6) + ', ' + (-30 + i * 32) + ' -12', RIM, 1.1);
var e = Math.sin(t * 2) * 4; limb([-80, -24, -100, -40 + e, -94, -58 + e], 2); limb([-72, -20, -76, -40 - e, -72, -50 - e], 2);
gl(-94, -58 + e, 3, c); gl(-72, -50 - e, 2.5, c); gl(0, -52, 3, c, 0.5 + 0.5 * Math.sin(t * 1.2));
} },
duenen: { n: 'Dünenschleicher', w: 440, h: 190, spd: 26, face: -1, cols: ['#ff7a2f', '#ffb37a', '#e07a8a'], draw: function (t, st, c) {
[-110, -60, -10, 40, 90, 130].forEach(function (lx, i) { var sw = (i % 2 ? st : -st) * 8; limb([lx, -30, lx - 18 + sw * 0.5, -18, lx - 24 + sw, 0], 3); });
body('M-170 -26 C -150 -48, 120 -54, 170 -30 C 200 -20, 220 -14, 240 -16 C 210 -6, 150 -12, 120 -14 C 40 -20, -120 -10, -170 -26Z');
var sail = 'M-120 -44 C -80 -190, 60 -200, 110 -48'; var cc = hex(c);
ctx.fillStyle = rgb(cc, 0.16); ctx.fill(PD(sail)); line(sail, rgb(mix(cc, [255, 255, 255], 0.4), 0.75), 1.3);
for (var x = -100; x < 110; x += 20) { var top = -46 - 140 * Math.sin(Math.PI * (x + 120) / 230); ctx.beginPath(); ctx.moveTo(x, -46); ctx.lineTo(x + (x + 5) * 0.2, top); ctx.strokeStyle = rgb(mix(cc, [255, 255, 255], 0.5), 0.45); ctx.lineWidth = LW; ctx.stroke(); }
body('M-170 -26 L-196 -34 L-186 -22 Z'); gl(-182, -30, 2, '#ffd8a8');
} },
glocke: { n: 'Glockenläufer', w: 180, h: 240, spd: 9, face: 1, cols: ['#bfe0ff', '#e8f4ff', '#c8a0f0'], draw: function (t, st, c) {
[-30, 0, 30].forEach(function (a, i) { var sw = st * (i - 1) * 10; limb([a, -150, a * 2.3 + sw * 0.4, -70, a * 1.6 + sw, 0], 4); });
ctx.save(); ctx.translate(0, Math.sin(t * 1.1) * 3);
[-44, -26, -8, 10, 28, 44].forEach(function (x, i) { var L = 50 + (Math.abs(x) % 17) * 2, sw = Math.sin(t * 1.6 + i) * 5; ctx.beginPath(); ctx.moveTo(x, -146); ctx.quadraticCurveTo(x + 4 + sw, -146 + L * 0.6, x - 2 + sw, -146 + L); ctx.strokeStyle = rgb(hex(c), 0.55); ctx.lineWidth = LW; ctx.stroke(); gl(x - 2 + sw, -146 + L, 2.4, c, 0.5 + 0.5 * Math.sin(t * 2 + i)); });
body('M-60 -150 C -66 -240, 66 -240, 60 -150 C 40 -140, -40 -140, -60 -150Z'); line('M-30 -214 C -10 -232, 18 -230, 30 -212', rgb(hex(c), 0.5), 1); gl(0, -196, 4, '#e8f4ff', 0.7 + 0.3 * Math.sin(t)); ctx.restore();
} },
kaefer: { n: 'Glutkäfer', w: 170, h: 80, spd: 12, face: 1, cols: ['#ff7a2f', '#ffb040', '#ff5030'], draw: function (t, st, c) {
[-34, -12, 12, 34].forEach(function (x, i) { var sw = (i % 2 ? st : -st) * 4; limb([x, -20, x * 1.4 + sw * 0.5, -8, x * 1.7 + sw, 0], 2.5); });
body('M-56 -18 C -56 -76, 56 -80, 60 -18 Z'); body('M60 -26 C 76 -30, 84 -20, 78 -12 L 58 -14Z'); line('M76 -26 q 16 -16 30 -10', RIM, 1.5); line('M0 -74 L2 -18', RIM, 1.3);
var cr = 'M-40 -30 l12 -14 l-4 -10 l14 -8 M20 -60 l8 12 l16 2 l4 14 M-20 -60 l-6 14', p = 0.55 + 0.45 * Math.sin(t * 1.8), cc = hex(c);
line(cr, rgb(cc, 0.25 * p), 8); line(cr, rgb(cc, p), 2.2);
} },
qualle: { n: 'Segelqualle', alt: 110, w: 160, h: 380, spd: 8, face: 0, fly: 1, cols: ['#d8b0ff', '#ffb0d0', '#b0d0ff'], draw: function (t, st, c) {
ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.beginPath(); ctx.ellipse(0, 0, 60, 5, 0, 0, Math.PI * 2); ctx.fill();
ctx.save(); ctx.translate(0, Math.sin(t * 0.8) * 14); var cc = hex(c);
for (var x = -50, i = 0; x < 60; x += 12, i++) { var sw = Math.sin(t * 1.2 + i) * 10; ctx.beginPath(); ctx.moveTo(x, -230); ctx.bezierCurveTo(x + 10 + sw, -180, x - 12 - sw, -120, x + sw, -50 - (i % 3) * 12); ctx.strokeStyle = rgb(cc, 0.45); ctx.lineWidth = 1.4 * LW; ctx.stroke(); }
body('M-70 -230 C -76 -320, 76 -320, 70 -230 C 40 -216, -40 -216, -70 -230Z', 'rgba(30,24,40,0.9)');
body('M-24 -292 C 10 -380, 60 -370, 70 -296 C 50 -306, 10 -300, -24 -292Z', rgb(cc, 0.14), rgb(cc, 0.7));
gl(0, -262, 6, c, 0.7 + 0.3 * Math.sin(t * 1.4)); for (x = -56; x < 60; x += 16) gl(x, -232, 2, c, 0.8); ctx.restore();
} },
rochen: { n: 'Lichtrochen', alt: 14, w: 340, h: 90, spd: 34, face: 0, fly: 1, cols: ['#7af0d0', '#9fd8ff', '#c8a0f0'], draw: function (t, st, c) {
ctx.save(); ctx.translate(0, Math.sin(t * 1.5) * 4); ctx.scale(1, 1 + 0.18 * Math.sin(t * 2.2));
body('M-170 -40 C -120 -80, -40 -70, 0 -86 C 40 -70, 120 -80, 170 -40 C 120 -46, 60 -40, 20 -52 L 10 -30 C 30 -10, 50 0, 120 10 C 40 6, 0 -10, -10 -30 L -20 -52 C -60 -40, -120 -46, -170 -40Z', SIL, rgb(hex(c), 0.8));
[[-150, -44], [-110, -60], [-60, -66], [60, -66], [110, -60], [150, -44]].forEach(function (q, i) { gl(q[0], q[1], 2.2, c, 0.6 + 0.4 * Math.sin(t * 2 + i)); }); gl(-8, -74, 3, '#e8fff8'); ctx.restore();
} },
falter: { n: 'Sporenfalter', alt: 78, w: 280, h: 260, spd: 20, face: 0, fly: 1, k: 0.5, cols: ['#d8f080', '#f0d070', '#80f0c0'], draw: function (t, st, c) {
ctx.save(); ctx.translate(0, -60 + Math.sin(t * 1.7) * 18); var f = 0.35 + 0.65 * Math.abs(Math.cos(t * 5));
for (var i = 0; i < 14; i++) { var a = t * 0.5 + i * 0.9; gl(Math.sin(a * 1.3 + i) * 110, -150 + Math.cos(a + i * 2) * 90, 1.4, c, 0.35); }
ctx.save(); ctx.scale(f, 1);
body('M0 -150 C -60 -230, -150 -220, -130 -150 C -150 -110, -60 -100, 0 -140Z'); body('M0 -150 C 60 -230, 150 -220, 130 -150 C 150 -110, 60 -100, 0 -140Z');
body('M0 -140 C -40 -110, -80 -60, -50 -50 C -30 -60, -10 -100, 0 -134Z'); body('M0 -140 C 40 -110, 80 -60, 50 -50 C 30 -60, 10 -100, 0 -134Z');
[-80, 80].forEach(function (x) { ctx.beginPath(); ctx.arc(x, -178, 14, 0, Math.PI * 2); ctx.strokeStyle = c; ctx.lineWidth = 2 * LW; ctx.stroke(); gl(x, -178, 4, c); }); ctx.restore();
body('M-4 -170 C -8 -140, -6 -100, 0 -90 C 6 -100, 8 -140, 4 -170 Z'); line('M-2 -170 q -14 -26 -30 -30 M2 -170 q 14 -26 30 -30', RIM, 1); ctx.restore();
} },
splitter: { n: 'Splitterschwarm', alt: 70, w: 240, h: 260, spd: 10, face: 0, fly: 1, cols: ['#bfe0ff', '#d8c8ff', '#c8fff0'], draw: function (t, st, c) {
ctx.fillStyle = rgb(hex(c), 0.12); ctx.beginPath(); ctx.ellipse(0, 0, 50, 4, 0, 0, Math.PI * 2); ctx.fill();
gl(0, -170, 7, c, 0.8 + 0.2 * Math.sin(t * 2));
for (var i = 0; i < 14; i++) {
var a = i / 14 * 6.283 + t * (0.25 + (i % 3) * 0.08), d = 50 + (i * 37 % 60), x = Math.cos(a) * d, y = -170 + Math.sin(a) * d * 0.7, hh = 14 + (i * 13 % 20), ww = hh * 0.35;
ctx.save(); ctx.translate(x, y); ctx.rotate(a * 1.7 + i);
ctx.fillStyle = '#c8d8ec'; ctx.beginPath(); ctx.moveTo(0, -hh); ctx.lineTo(ww, 0); ctx.lineTo(0, hh * 0.4); ctx.fill();
ctx.fillStyle = '#5a6e8c'; ctx.beginPath(); ctx.moveTo(0, -hh); ctx.lineTo(-ww, 0); ctx.lineTo(0, hh * 0.4); ctx.fill(); ctx.restore();
}
} }
};
var ARCHT = { leben: ['schreithals', 'qualle', 'falter'], gift: ['falter', 'krusten'], fels: ['krusten', 'duenen'], wueste: ['duenen', 'krusten'], ozean: ['rochen', 'schreithals'], eis: ['glocke', 'krusten'], kristall: ['splitter', 'glocke'], lava: ['kaefer', 'krusten'] };
function archK(sp) { return (ARCH[sp.arch].k || 1) * 0.4 * sp.size; }
function drawWal(x, y, s, t, a) {
ctx.save(); ctx.translate(x, y); var k = s * 0.85; ctx.scale(k, k); LW = 1 / k; ctx.globalAlpha = a;
for (var i = 0; i < 5; i++) { var bx = [-150, -110, -70, 60, 100][i]; ctx.beginPath(); ctx.moveTo(bx, -198); ctx.quadraticCurveTo(bx + Math.sin(t + i) * 10, -140, bx + Math.sin(t * 0.7 + i) * 6, -90 - i * 8); ctx.strokeStyle = 'rgba(239,233,221,0.18)'; ctx.lineWidth = LW; ctx.stroke(); }
body('M-200 -250 C -170 -310, 40 -320, 150 -270 C 190 -250, 200 -230, 230 -236 L 250 -260 L 254 -220 L 232 -224 C 200 -214, 170 -200, 120 -196 C 20 -190, -160 -200, -200 -250Z', 'rgba(20,22,28,0.92)', 'rgba(239,233,221,0.35)');
body('M-40 -200 C -30 -170, 0 -160, 20 -170 C 10 -180, 0 -192, -10 -196Z', 'rgba(20,22,28,0.92)', 'rgba(239,233,221,0.3)');
[[-160, -262], [-120, -280], [-80, -290], [-40, -294], [0, -292], [40, -286], [80, -276]].forEach(function (q, i) { gl(q[0], q[1], 2.4, '#ffd8a8', 0.5 + 0.5 * Math.sin(t * 0.8 + i * 0.6)); });
gl(-178, -246, 2.4, '#fff2dc'); ctx.globalAlpha = 1; ctx.restore();
}

// ---------- species kit ----------
var PLANTS = ['laterne', 'farn', 'pilz', 'spitze', 'kugel'];
function makeSpecies(P, r, i) {
var plant = r() < (P.type === 'leben' ? 0.5 : 0.65), cols = ['#ff7a2f', '#efe9dd', '#9fb4c9', '#c8a0d8', '#8fd0a0', '#f0d070', '#e07a8a'];
var sp = { key: P.p.key + '/s' + i, kind: plant ? 'plant' : 'animal', c1: cols[Math.floor(r() * cols.length)], c2: cols[Math.floor(r() * cols.length)], size: 0.7 + r() * 0.8, rare: r() < 0.18, inst: [] };
var nm = W.word(r, 2);
if (plant) { sp.name = nm + ' ' + W.word(r, 1 + (r() < 0.5 ? 1 : 0)).toLowerCase(); sp.style = PLANTS[Math.floor(r() * PLANTS.length)]; if (P.type === 'eis' || P.type === 'kristall') sp.style = r() < 0.6 ? 'spitze' : 'kugel'; if (P.type === 'lava') sp.style = 'spitze'; }
else {
var L = ARCHT[P.type] || ARCHT.fels, A; sp.arch = L[Math.floor(r() * L.length)]; A = ARCH[sp.arch];
sp.name = A.n + ' ' + nm; sp.c1 = A.cols[Math.floor(r() * A.cols.length)]; sp.size = 0.85 + r() * 0.3; sp.fly = !!A.fly; sp.spd = A.spd * (0.8 + r() * 0.4);
}
var n = plant ? 2 + Math.floor(r() * 4) : (sp.arch === 'duenen' || sp.arch === 'schreithals' ? 1 : 1 + Math.floor(r() * 2));
for (var k = 0; k < n; k++) { var x = (r() - 0.5) * 2 * (P.w - 150); x = clear(P, x); sp.inst.push({ x: x, x0: x, dir: r() < 0.5 ? -1 : 1, ph: r() * 6 }); }
return sp;
}
// keep things out of the landing zone around the ship and base
function clear(P, x) { if (x > -440 && x < 280) x = x < -80 ? x - 460 : x + 300; return Math.max(-P.w + 40, Math.min(P.w - 40, x)); }

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
// cliffs and chasms: reasons to use the jetpack
var fr = W.rng(p.seed ^ 0xfea7); P.feat = [];
for (var fx0 = -P.w + 120; fx0 < P.w - 120; fx0 += 380 + fr() * 420) {
if (fx0 > -560 && fx0 < 420) continue;
var chasm = type !== 'ozean' && fr() < 0.42;
P.feat.push(chasm ? { k: 'spalte', x: fx0, w: 70 + fr() * 60, h: 120 + fr() * 40 } : { k: 'plateau', x: fx0, w: 160 + fr() * 160, h: 60 + fr() * 55 });
}
var kinds = Object.keys(p.res); if (!kinds.length) kinds = [type === 'eis' || type === 'kristall' ? 'kristall' : type === 'leben' || type === 'gift' ? 'sporen' : 'eisen'];
var nn = 6 + Math.floor(r() * 5);
for (var i = 0; i < nn; i++) {
var k = kinds[Math.floor(r() * kinds.length)], x = clear(P, (r() - 0.5) * 2 * (P.w - 120));
P.nodes.push({ i: i, x: x, k: k, amt: 3 + Math.floor(r() * 4), done: !!S.mined[p.key + ':' + i] });
}
for (i = 0; i < p.life; i++) P.species.push(makeSpecies(P, r, i));
if (p.wreck) P.wreck = { x: (r() < 0.5 ? -1 : 1) * (P.w * 0.55 + r() * P.w * 0.3), done: !!S.wrecks[p.key] };
for (i = 0; i < 90; i++) P.wx.push([r(), r(), r()]);
if (W.curSection(S) >= 2) P.site = { x: -310, built: (S.bases || []).some(function (b) { return b.key === p.key; }) };
// rich veins on top of some plateaus
var rk = kinds.concat(type === 'eis' || type === 'kristall' || type === 'lava' ? ['kristall'] : []);
P.feat.forEach(function (f, j) { if (f.k !== 'plateau' || (W.hash(p.seed, j, 3) % 10) > 5) return; var ni = P.nodes.length; P.nodes.push({ i: ni, x: f.x, k: rk[W.hash(p.seed, j, 4) % rk.length], amt: 6 + W.hash(p.seed, j, 5) % 4, rich: 1, done: !!S.mined[p.key + ':' + ni] }); });
if (S.roverDone && S.roverDone[p.key]) P.nodes.forEach(function (n) { if (!n.rich) n.done = true; });
if (W.signalHas && W.signalHas(S, p)) { var sx0 = (P.ruin && P.ruin.x > 0 ? -1 : P.wreck && P.wreck.x > 0 ? -1 : 1) * (P.w * (0.5 + (W.hash(p.seed, 2, 2) % 30) / 100)); P.sig = { x: sx0, done: false }; }
P.parts = []; P.walk = 0; P.dust = 0;
var dr = S.mods.drohnen || 0, dg = {};
if (dr) P.nodes.filter(function (n) { return !n.done; }).sort(function (a, b) { return Math.abs(a.x) - Math.abs(b.x); }).slice(0, dr).forEach(function (n) { var g = W.addRes(S, n.k, n.amt); if (g) { n.done = true; S.mined[p.key + ':' + n.i] = 1; P.loot[n.k] += g; dg[n.k] = (dg[n.k] || 0) + g; } });
if (Object.keys(dg).length) P.events.push({ k: 'drones', got: dg });
P.grass = []; for (var gx = -P.w; gx < P.w; gx += 9) if (r() < 0.6) P.grass.push([gx + r() * 6, 4 + r() * 9, r()]);
// scenery: landmarks on two haze layers, foreground silhouettes, sky object
var M = MOOD[type]; P.mood = M; P.lm = [];
[1, 2].forEach(function (L) { for (var lx = -2600; lx < 2600; lx += 420 + r() * 520) if (r() < 0.75) P.lm.push({ L: L, x: lx, k: M.lm[Math.floor(r() * M.lm.length)], h: (L === 1 ? 150 : 110) * (0.7 + r() * 0.6), q: r() }); });
P.fg = []; for (var fx = -P.w * 1.5; fx < P.w * 1.5; fx += 60 + r() * 140) P.fg.push([fx, 18 + r() * 40, r()]);
P.so = { x: 0.15 + r() * 0.7, y: r(), sz: 0.8 + r() * 0.4 };
// Erbauer ruin and the rare sky whale
if (p.ruin) P.ruin = { x: (P.wreck && P.wreck.x > 0 ? -1 : 1) * (P.w * 0.35 + r() * P.w * 0.35), done: !!S.ruins[p.key] };
if (W.hash(p.seed, 7, 7) % 100 < 3 && !p.sol) P.wal = { x: -900, key: p.key + '/wal', done: !!S.species[p.key + '/wal'] };
// biologist scans everything nearby on arrival
if (W.hasCrew(S, 'rena')) P.species.forEach(function (sp) { if (!sp.rare && !S.species[sp.key]) { var res = W.scanSpecies(S, sp.key, false); if (res) { P.cr += res.cr; P.events.push({ k: 'species', sp: sp, res: res, auto: true }); } } });
return P;
}
function isNight(P) { var ph = (P.t0 + P.t / P.day) % 1; return ph > 0.58 && ph < 0.94; }
function dayLight(P) { var ph = (P.t0 + P.t / P.day) % 1; return 0.5 + 0.5 * Math.cos((ph - 0.25) * Math.PI * 2); }

// ---------- update ----------
function update(S, P, dt, inp) {
P.t += dt; P.o2 -= dt * (P.type === 'gift' ? 1.4 : 1) * (W.hasTech(S, 'membran') ? 0.75 : 1);
var spd = 150 * (P.inWater ? 0.6 : 1), acc = P.ice && P.ground ? 2.2 : 9;
P.vx += (inp.ax * spd - P.vx) * Math.min(1, dt * acc);
if (inp.ax) P.face = inp.ax > 0 ? 1 : -1;
if (inp.jet && P.jet > 0 && !P.inWater) { P.vy += 1250 * dt; P.jet = Math.max(0, P.jet - dt * 0.38 * (W.hasTech(S, 'gleit') ? 0.5 : 1)); P.jetting = true; } else P.jetting = false;
if (P.vy > 340) P.vy = 340;
P.vy -= P.g * dt;
var nx = Math.max(-P.w, Math.min(P.w, P.x + P.vx * dt));
if (terrain(P, nx) > P.y + 14 && terrain(P, nx) > terrain(P, P.x) + 6) { nx = P.x; P.vx = 0; }
P.x = nx;
P.y += P.vy * dt;
var gy = terrain(P, P.x);
P.inWater = P.type === 'ozean' && gy < 0 && P.y < 2;
if (P.inWater) { P.vy += (0 - P.y) * 6 * dt + P.g * dt * 0.95; P.vy *= 0.9; }
P.walk += dt * Math.abs(P.vx) * 0.08; var wasG = P.ground;
if (P.y <= gy) { P.y = gy; if (!wasG && P.vy < -160) P.dust = 1; if (P.vy < 0) P.vy = 0; P.ground = true; } else if (P.y > gy + 2) P.ground = false;
if (P.ground && lavaAt(P, P.x)) { P.vy = 330; P.ground = false; P.o2 = Math.max(0, P.o2 - 8); P.fx.push({ x: P.x, y: gy + 40, s: 'Zu heiß! −8 s Sauerstoff', t: 0, c: AC }); }
if (P.ground) P.jet = Math.min(1, P.jet + dt * 0.5);
// animals
P.species.forEach(function (sp) {
if (sp.kind !== 'animal') return;
sp.inst.forEach(function (a) {
a.x += a.dir * sp.spd * dt; if (Math.abs(a.x - a.x0) > 200) a.dir = a.x > a.x0 ? -1 : 1;
if (Math.abs(a.x - P.x) < 60 && Math.random() < dt) a.dir = a.x > P.x ? 1 : -1; if (Math.abs(a.x) < 260) a.dir = a.x < 0 ? -1 : 1;
});
});
// what is near
var best = null, bd = 48, hi = null;
function cand(o, x, y, rad) { var d = Math.abs(x - P.x) - (rad || 0); if (d < bd && Math.abs(y - P.y) < 70) { bd = Math.max(0, d); best = o; } }
P.nodes.forEach(function (n) { if (!n.done) cand({ k: 'node', n: n }, n.x, terrain(P, n.x)); });
var night = isNight(P);
P.species.forEach(function (sp) { if (S.species[sp.key] || (sp.rare && !night)) return; sp.inst.forEach(function (a) { var A = sp.arch && ARCH[sp.arch], gy0 = Math.max(terrain(P, a.x), P.type === 'ozean' ? 0 : -999), ay = A && A.alt ? gy0 + A.alt * sp.size : sp.fly && !A ? P.y : terrain(P, a.x), rad = A ? A.w * archK(sp) * 0.3 : 0; cand({ k: 'species', sp: sp, a: a }, a.x, ay, rad); if (A && A.alt > 40 && Math.abs(a.x - P.x) - rad < 48 && ay - P.y >= 70) hi = sp; }); });
if (P.ruin && !P.ruin.done) cand({ k: 'ruin' }, P.ruin.x, terrain(P, P.ruin.x), 30);
if (P.sig && !P.sig.done) cand({ k: 'signal' }, P.sig.x, terrain(P, P.sig.x), 20);
if (P.wal) { P.wal.x += dt * 9; if (P.wal.x > P.w) P.wal.x = -P.w; if (!P.wal.done && Math.abs(P.wal.x - P.x * 0.5) < 220) cand({ k: 'wal' }, P.x, P.y, 40); }
if (P.wreck && !P.wreck.done) cand({ k: 'wreck' }, P.wreck.x, terrain(P, P.wreck.x));
if (P.site && Math.abs(P.x - P.site.x) < 40 && (!best || bd > 20)) { best = { k: 'site' }; bd = 20; }
if (Math.abs(P.x) < 60) { if (!best || bd > 30) best = { k: 'ship' }; }
P.near = best; P.hi = best ? null : hi;
// hold-to-act
if (inp.action && P.near && P.near.k !== 'ship' && P.near.k !== 'site') {
var key = P.near.k + (P.near.n ? P.near.n.i : P.near.sp ? P.near.sp.key : '');
if (P.actKey !== key) { P.actKey = key; P.prog = 0; }
P.prog += dt / (P.near.k === 'node' ? 1.5 : P.near.k === 'ruin' ? 2.2 : P.near.k === 'signal' ? 1.8 : P.near.k === 'wal' ? 2.5 : 1.0);
if (P.prog >= 1) { finish(S, P, P.near); P.prog = 0; P.actKey = null; }
} else { P.prog = Math.max(0, P.prog - dt * (P.actKey && P.actKey.indexOf('species') === 0 ? 0.35 : 2)); }
if (inp.actionPressed && P.near && P.near.k === 'ship') P.events.push({ k: 'leave' });
if (inp.actionPressed && P.near && P.near.k === 'site' && !P.site.built) P.events.push({ k: 'build' });
if (P.o2 <= 0) { P.o2 = 0; P.events.push({ k: 'o2out' }); }
P.fx = P.fx.filter(function (f) { f.t += dt; return f.t < 2.4; });
P.dust = Math.max(0, P.dust - dt * 1.6);
if (P.near && P.near.k === 'node' && P.prog > 0 && Math.random() < dt * 14) { var nn = P.near.n, ny0 = terrain(P, nn.x); P.parts.push({ x: nn.x + (Math.random() - 0.5) * 16, y: ny0 + 8, c: nn.k, t: 0 }); }
P.parts = P.parts.filter(function (q) { q.t += dt * 1.8; return q.t < 1; });
if (P.sig) P.sigD = Math.abs(P.sig.x - P.x);
P.camY += (P.y - P.camY) * Math.min(1, dt * 4);
}
function finish(S, P, n) {
var y = terrain(P, P.x) + 40;
if (n.k === 'node') {
var got = W.addRes(S, n.n.k, n.n.amt);
if (!got) { P.fx.push({ x: P.x, y: y, s: 'Laderaum voll', t: 0, c: AC }); return; }
n.n.done = true; S.mined[P.p.key + ':' + n.n.i] = 1; P.loot[n.n.k] += got; P.events.push({ k: 'mined' });
P.fx.push({ x: n.n.x, y: y, s: '+' + got + ' t ' + W.RES[n.n.k].n, t: 0 });
} else if (n.k === 'species') {
var res = W.scanSpecies(S, n.sp.key, n.sp.rare); if (!res) return;
P.cr += res.cr; P.fx.push({ x: P.x, y: y, s: 'Neue Art · +' + res.cr + ' Cr', t: 0 }); P.events.push({ k: 'species', sp: n.sp, res: res });
} else if (n.k === 'wreck') {
P.wreck.done = true; S.wrecks[P.p.key] = 1; S.cr += 300; P.cr += 300;
P.events.push({ k: 'wreck', text: W.WRECKS[(P.p.wreck - 1) % W.WRECKS.length] }); P.fx.push({ x: P.x, y: y, s: 'Fundstück · +300 Cr', t: 0 });
} else if (n.k === 'signal') {
P.sig.done = true; P.events.push({ k: 'signal' }); P.fx.push({ x: P.x, y: y, s: 'Signal gefunden', t: 0, c: '#bfe0ff' });
} else if (n.k === 'ruin') {
P.ruin.done = true; P.events.push({ k: 'ruin', text: W.findRuin(S, P.p) }); P.fx.push({ x: P.x, y: y, s: 'Bruchstück geborgen · +10 Forschung', t: 0, c: '#bfe0ff' });
} else if (n.k === 'wal') {
var rw = W.scanSpecies(S, P.wal.key, true); P.wal.done = true; if (!rw) return;
S.forschung += 20; S.flags.ftot = (S.flags.ftot || 0) + 20; S.flags.wal = (S.flags.wal || 0) + 1; S.cr += 400; rw.cr += 400; rw.f += 20; P.cr += rw.cr;
P.events.push({ k: 'species', sp: { name: 'Himmelswal', rare: true }, res: rw }); P.fx.push({ x: P.x, y: y + 60, s: 'Himmelswal erfasst', t: 0, c: '#ffd8a8' });
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
var A = ARCH[sp.arch], k = archK(sp) * s, step = Math.sin(time * (4 + A.spd * 0.08) + a.ph), fx = A.face ? a.dir * A.face : 1;
if (A.fly && sp.arch === 'falter') y -= 30 * s;
ctx.save(); ctx.translate(x, y); ctx.scale(fx * k, k);
LW = 1 / k; A.draw(time + a.ph, step, sp.c1); ctx.restore();
}
var YM = { kranich: 102, elster: 106, schildkroete: 94, falke: 110 };
function drawShip(x, y, s, S, time, night) {
var k = 1.3 * s, vy = 0.88, key = W.SHIPSVG[S.ship] ? S.ship : 'kranich', ty = y - (20 * s + YM[key] * k * vy), tx = x - 123 * k;
ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.beginPath(); ctx.ellipse(x, y + 2 * s, 170 * s, 9 * s, 0, 0, Math.PI * 2); ctx.fill();
ctx.strokeStyle = IV; ctx.lineWidth = 1.6 * s; ctx.lineCap = 'round';
[[70, -16], [120, 0], [175, 16]].forEach(function (l) { var top = ty + (key === 'schildkroete' ? 84 : 68) * k * vy, lx = tx + l[0] * k; ctx.beginPath(); ctx.moveTo(lx, top); ctx.lineTo(lx + l[1] * s, y - 2 * s); ctx.stroke(); ctx.fillStyle = IV; ctx.fillRect(lx + l[1] * s - 9 * s, y - 3 * s, 18 * s, 3 * s); });
// ramp to the hatch
ctx.beginPath(); ctx.moveTo(x + 6 * s, ty + 62 * k * vy); ctx.lineTo(x + 40 * s, y); ctx.lineWidth = 3 * s; ctx.strokeStyle = '#3a3c42'; ctx.stroke(); ctx.lineWidth = 1 * s; ctx.strokeStyle = IV; ctx.stroke();
ctx.save(); ctx.translate(tx, ty); ctx.scale(k, k * vy); var pth = PD(W.SHIPSVG[key]);
ctx.fillStyle = '#121316'; ctx.fill(pth); ctx.strokeStyle = IV; ctx.lineWidth = 1.5 / k; ctx.lineJoin = 'round'; ctx.stroke(pth); ctx.restore();
var lights = [40, 110, 180]; lights.forEach(function (lx, i) { var a = night ? 0.9 : 0.55, px = tx + lx * k, py = ty + 60 * k * vy, g = ctx.createRadialGradient(px, py, 0, px, py, 16 * s); g.addColorStop(0, 'rgba(255,190,130,' + 0.35 * a + ')'); g.addColorStop(1, 'rgba(255,190,130,0)'); ctx.fillStyle = g; circle(px, py, 16 * s); ctx.fill(); ctx.fillStyle = 'rgba(255,216,168,' + a + ')'; circle(px, py, 2.2 * s); ctx.fill(); });
if (night) { var hg = ctx.createRadialGradient(x + 40 * s, y, 0, x + 40 * s, y, 70 * s); hg.addColorStop(0, 'rgba(255,190,130,0.28)'); hg.addColorStop(1, 'rgba(255,190,130,0)'); ctx.fillStyle = hg; ctx.beginPath(); ctx.ellipse(x + 40 * s, y, 70 * s, 14 * s, 0, 0, Math.PI * 2); ctx.fill(); }
}
function drawWreck(x, y, s, done) {
s *= 2; ctx.strokeStyle = done ? MU : IV; ctx.lineWidth = 1.3 * s / 2; ctx.fillStyle = '#121416';
ctx.beginPath(); ctx.moveTo(x - 40 * s, y); ctx.lineTo(x - 30 * s, y - 22 * s); ctx.lineTo(x + 6 * s, y - 30 * s); ctx.lineTo(x + 20 * s, y - 12 * s); ctx.lineTo(x + 36 * s, y - 18 * s); ctx.lineTo(x + 30 * s, y); ctx.closePath(); ctx.fill(); ctx.stroke();
ctx.beginPath(); ctx.moveTo(x - 20 * s, y - 24 * s); ctx.lineTo(x - 14 * s, y - 4 * s); ctx.moveTo(x + 6 * s, y - 30 * s); ctx.lineTo(x + 2 * s, y - 40 * s); ctx.stroke();
}
function drawBase(x, y, s, built, time) {
s *= 1.6; ctx.strokeStyle = built ? IV : MU; ctx.lineWidth = 1.3 * s / 1.6;
if (!built) { ctx.setLineDash([3, 4]); ctx.beginPath(); ctx.arc(x, y, 30 * s, Math.PI, 0); ctx.stroke(); ctx.setLineDash([]); return; }
ctx.fillStyle = '#16181c'; ctx.beginPath(); ctx.arc(x, y, 30 * s, Math.PI, 0); ctx.closePath(); ctx.fill(); ctx.stroke();
ctx.beginPath(); ctx.arc(x + 42 * s, y, 14 * s, Math.PI, 0); ctx.closePath(); ctx.fill(); ctx.stroke();
ctx.beginPath(); ctx.moveTo(x - 10 * s, y - 30 * s); ctx.lineTo(x - 10 * s, y - 52 * s); ctx.stroke();
ctx.fillStyle = (Math.floor(time * 1.5) % 2) ? AC : IV; ctx.fillRect(x - 12 * s, y - 55 * s, 4 * s, 4 * s);
ctx.fillStyle = 'rgba(255,200,140,0.8)'; for (var k = 0; k < 3; k++) ctx.fillRect(x - 16 * s + k * 12 * s, y - 14 * s, 5 * s, 4 * s);
}
function drawRuin(x, y, s, done, time) {
ctx.save(); ctx.translate(x, y); ctx.scale(s, s); LW = 1 / s;
for (var i = 0; i < 7; i++) { ctx.fillStyle = SIL; ctx.beginPath(); ctx.ellipse(-70 + i * 23, -3, 8, 5, 0, 0, Math.PI * 2); ctx.fill(); }
body('M-62 0 L-58 -138 L-40 -142 L-40 0Z'); body('M40 0 L44 -112 L52 -120 L60 -104 L58 0Z');
var b = Math.sin(time * 0.9) * 4, c = done ? 'rgba(191,224,255,0.25)' : 'rgba(191,224,255,' + (0.6 + 0.3 * Math.sin(time * 1.6)) + ')';
ctx.beginPath(); ctx.arc(0, -86 + b, 36, 0, Math.PI * 2); ctx.strokeStyle = RIM; ctx.lineWidth = 7 * LW; ctx.stroke(); ctx.strokeStyle = SIL; ctx.lineWidth = 5 * LW; ctx.stroke();
ctx.strokeStyle = c; ctx.lineWidth = 1.4 * LW; ctx.beginPath();
for (i = 0; i < 9; i++) { var a = i / 9 * 6.283 + time * 0.2; ctx.moveTo(Math.cos(a) * 36, -86 + b + Math.sin(a) * 36); ctx.lineTo(Math.cos(a) * 30, -86 + b + Math.sin(a) * 30); }
ctx.stroke(); line('M-51 -120 h6 v8 h-4 M-50 -96 h8 M-49 -70 v10 h5 M47 -90 h6 v-6 M48 -60 h7', c, 1.4);
if (!done) { ctx.save(); ctx.translate(0, -86 + b); ctx.rotate(time * 0.6); ctx.fillStyle = '#c8d8ec'; ctx.beginPath(); ctx.moveTo(0, -9); ctx.lineTo(6, 0); ctx.lineTo(0, 9); ctx.lineTo(-6, 0); ctx.fill(); ctx.restore(); gl(0, -86 + b, 3, '#bfe0ff'); }
ctx.restore();
}
var NCOL = { eisen: '#c8603a', kristall: '#9fd8ff', sporen: '#a8e08a', exotik: '#d8b0ff' };
function drawNode(n, x, y, s, near, time, prog) {
if (n.rich) s *= 1.6;
if (n.done) { ctx.fillStyle = 'rgba(0,0,0,0.28)'; ctx.beginPath(); ctx.ellipse(x, y, 12 * s, 3 * s, 0, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = 'rgba(60,54,50,0.8)'; [[-8, 1.6], [3, 2.2], [9, 1.4]].forEach(function (q) { circle(x + q[0] * s, y - q[1] * s, q[1] * s); ctx.fill(); }); return; }
var k = 1 - (prog || 0) * 0.45, pulse = 0.5 + 0.5 * Math.sin(time * 2.2 + n.i), c = NCOL[n.k] || NCOL.sporen, sh = prog ? Math.sin(time * 40) * 0.8 * s : 0;
var g = ctx.createRadialGradient(x, y - 8 * s, 0, x, y - 8 * s, 30 * s); g.addColorStop(0, rgb(hex(near ? AC : c), near ? 0.4 : 0.1 + pulse * 0.1)); g.addColorStop(1, rgb(hex(c), 0)); ctx.fillStyle = g; circle(x, y - 8 * s, 30 * s); ctx.fill();
ctx.save(); ctx.translate(x + sh, y); ctx.scale(s * k, s * k);
if (n.k === 'eisen') {
[[-13, 0, -9, -13, 2, -17, 12, -7, 14, 0], [4, 0, 7, -9, 15, -11, 20, -4, 20, 0], [-20, 0, -18, -6, -11, -5, -10, 0]].forEach(function (p, i) { ctx.fillStyle = i ? '#2e2a28' : '#3a3430'; ctx.beginPath(); ctx.moveTo(p[0], p[1]); for (var j = 2; j < p.length; j += 2) ctx.lineTo(p[j], p[j + 1]); ctx.closePath(); ctx.fill(); ctx.strokeStyle = 'rgba(239,233,221,0.25)'; ctx.lineWidth = 0.8; ctx.stroke(); });
ctx.strokeStyle = '#c8603a'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(-9, -10); ctx.lineTo(-3, -7); ctx.lineTo(2, -12); ctx.moveTo(-6, -3); ctx.lineTo(4, -5); ctx.moveTo(9, -6); ctx.lineTo(15, -8); ctx.stroke();
[[-4, -9], [6, -4], [13, -6]].forEach(function (q, i) { var a = Math.max(0, Math.sin(time * 1.7 + i * 2.1 + n.i)); ctx.fillStyle = 'rgba(255,240,220,' + a + ')'; ctx.fillRect(q[0] - 1, q[1] - 1, 2, 2); });
} else if (n.k === 'kristall') {
[[-10, 14, -0.3, 5], [-3, 24, -0.08, 6], [5, 18, 0.2, 5], [11, 10, 0.45, 4], [-15, 8, -0.6, 3]].forEach(function (q) {
ctx.save(); ctx.translate(q[0], 0); ctx.rotate(q[2]); ctx.fillStyle = '#d8eeff'; ctx.beginPath(); ctx.moveTo(-q[3], 0); ctx.lineTo(-q[3] * 0.7, -q[1] * 0.8); ctx.lineTo(0, -q[1]); ctx.lineTo(0, 0); ctx.fill();
ctx.fillStyle = '#5a8ab8'; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -q[1]); ctx.lineTo(q[3] * 0.7, -q[1] * 0.8); ctx.lineTo(q[3], 0); ctx.fill(); ctx.restore();
});
ctx.fillStyle = 'rgba(191,224,255,' + (0.25 + 0.35 * pulse) + ')'; circle(-3, -12, 6); ctx.fill(); ctx.fillStyle = '#2a2a34'; ctx.beginPath(); ctx.ellipse(0, 0, 18, 3, 0, 0, Math.PI * 2); ctx.fill();
} else if (n.k === 'exotik') {
var fy = -16 + Math.sin(time * 1.4 + n.i) * 3; ctx.strokeStyle = 'rgba(216,176,255,' + (0.3 + 0.3 * pulse) + ')'; ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(0, fy, 14, 4, 0, 0, Math.PI * 2); ctx.stroke();
ctx.save(); ctx.translate(0, fy); ctx.rotate(time * 0.7 + n.i); ctx.fillStyle = '#e8d8ff'; ctx.beginPath(); ctx.moveTo(0, -9); ctx.lineTo(5, 0); ctx.lineTo(0, 9); ctx.lineTo(-5, 0); ctx.fill(); ctx.fillStyle = '#7a5aa8'; ctx.beginPath(); ctx.moveTo(0, -9); ctx.lineTo(5, 0); ctx.lineTo(0, 9); ctx.fill(); ctx.restore();
ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.beginPath(); ctx.ellipse(0, 0, 8, 2, 0, 0, Math.PI * 2); ctx.fill();
} else {
[[-9, 10, 7], [0, 15, 9], [9, 8, 6], [15, 5, 4]].forEach(function (q, i) { ctx.fillStyle = '#d8ccbc'; ctx.fillRect(q[0] - 1.2, -q[1], 2.4, q[1]); ctx.fillStyle = i % 2 ? '#6a8a4a' : '#8fb070'; ctx.beginPath(); ctx.ellipse(q[0], -q[1], q[2], q[2] * 0.55, 0, Math.PI, 0); ctx.fill(); ctx.fillStyle = '#e8f0c0'; circle(q[0] - q[2] * 0.3, -q[1] - q[2] * 0.25, 1); ctx.fill(); });
var pt = (time * 0.5 + n.i * 0.3) % 1; ctx.fillStyle = 'rgba(200,240,160,' + (0.5 * (1 - pt)) + ')'; for (var j = 0; j < 5; j++) { circle(Math.sin(j * 2.3) * 8 * pt, -16 - pt * 18 - j * 2, 1.4 + pt * 2); ctx.fill(); }
}
ctx.restore();
}
function drawAstro(P, x, y, s, time, lamp) {
var f = P.face, mv = P.ground && Math.abs(P.vx) > 10, ph = P.walk || 0, w = mv ? Math.sin(ph) : P.ground ? 0 : 0.35, lift = mv ? Math.max(0, Math.cos(ph)) * 3 : 0, k = 0.4 * s;
if (lamp) { var hx = x + f * 5 * s, hy = y - 36 * s, g = ctx.createLinearGradient(hx, 0, hx + f * 170 * s, 0); g.addColorStop(0, 'rgba(255,242,220,0.32)'); g.addColorStop(1, 'rgba(255,242,220,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(hx, hy - 2 * s); ctx.lineTo(hx + f * 170 * s, hy - 40 * s); ctx.lineTo(hx + f * 170 * s, hy + 34 * s); ctx.closePath(); ctx.fill(); }
if (P.dust > 0) { ctx.fillStyle = 'rgba(200,190,170,' + 0.35 * P.dust + ')'; [-1, 1].forEach(function (d) { ctx.beginPath(); ctx.ellipse(x + d * (1 - P.dust) * 26 * s, y - 2 * s, (6 + (1 - P.dust) * 10) * s, 3 * s, 0, 0, Math.PI * 2); ctx.fill(); }); }
ctx.save(); ctx.translate(x, y + (mv ? -Math.abs(Math.sin(ph)) * 1.2 * s : 0)); ctx.scale(f * k, k); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
if (P.jetting) { var fl = 26 + Math.random() * 14, jg = ctx.createLinearGradient(0, -46, 0, -46 + fl); jg.addColorStop(0, '#fff4e6'); jg.addColorStop(0.35, AC); jg.addColorStop(1, 'rgba(255,122,47,0)'); ctx.fillStyle = jg; ctx.beginPath(); ctx.moveTo(-20, -46); ctx.lineTo(-16 - 6, -46 + fl); ctx.lineTo(-10, -46); ctx.fill(); }
ctx.fillStyle = '#8a847a'; ctx.fillRect(-22, -78, 12, 32); ctx.fillStyle = '#5a544c'; ctx.fillRect(-21, -74, 10, 3);
function leg(x0, kx, fx, fy, col) { ctx.strokeStyle = col; ctx.lineWidth = 9; ctx.beginPath(); ctx.moveTo(x0, -40); ctx.lineTo(x0 + kx, -20); ctx.lineTo(fx, -fy); ctx.stroke(); }
leg(-3, 8 * w, -6 + 14 * w, w > 0 ? lift : 0, '#c9c2b6'); leg(3, -8 * w, 6 - 14 * w, w < 0 ? lift : 0, '#efe9dd');
ctx.fillStyle = '#5a544c'; ctx.fillRect(-8 + 14 * w, -4 - (w > 0 ? lift : 0), 14, 5); ctx.fillStyle = '#6a645c'; ctx.fillRect(-2 - 14 * w, -4 - (w < 0 ? lift : 0), 14, 5);
ctx.fillStyle = IV; ctx.beginPath(); ctx.moveTo(-12, -78); ctx.quadraticCurveTo(-14, -42, -8, -38); ctx.lineTo(10, -38); ctx.quadraticCurveTo(14, -60, 12, -78); ctx.closePath(); ctx.fill();
ctx.fillStyle = AC; ctx.fillRect(-12, -62, 24, 3); ctx.strokeStyle = '#c9c2b6'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(-4, -70); ctx.lineTo(-4, -56); ctx.stroke();
var aw = mv ? -w : P.ground ? 0 : -0.6; ctx.strokeStyle = '#e2dbcf'; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(4, -72); ctx.lineTo(6 + 9 * aw, -56); ctx.lineTo(8 + 13 * aw, -44); ctx.stroke();
ctx.fillStyle = IV; circle(0, -90, 13); ctx.fill();
ctx.fillStyle = '#1a1c22'; ctx.beginPath(); ctx.moveTo(2, -98); ctx.quadraticCurveTo(14, -97, 13, -88); ctx.quadraticCurveTo(12, -82, 2, -83); ctx.closePath(); ctx.fill();
ctx.strokeStyle = '#ffd8a8'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(5, -95); ctx.quadraticCurveTo(10, -95, 11, -91); ctx.stroke();
ctx.restore();
}
function drawSignal(P, x, y, s, time, done) {
ctx.save(); ctx.translate(x, y);
ctx.fillStyle = '#16181c'; ctx.strokeStyle = 'rgba(239,233,221,0.6)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(-9 * s, 0); ctx.lineTo(-6 * s, -12 * s); ctx.lineTo(6 * s, -14 * s); ctx.lineTo(9 * s, 0); ctx.closePath(); ctx.fill(); ctx.stroke();
if (!done) {
ctx.fillStyle = 'rgba(191,224,255,' + (0.6 + 0.4 * Math.sin(time * 4)) + ')'; circle(0, -10 * s, 2.2 * s); ctx.fill();
for (var i = 0; i < 4; i++) { var t = (time * 0.45 + i / 4) % 1; ctx.strokeStyle = 'rgba(191,224,255,' + (0.6 * (1 - t)) + ')'; ctx.beginPath(); ctx.ellipse(0, -2 * s, (10 + t * 90) * s, (3 + t * 22) * s, 0, 0, Math.PI * 2); ctx.stroke(); }
ctx.strokeStyle = 'rgba(191,224,255,0.35)'; ctx.setLineDash([2, 4]); ctx.beginPath(); ctx.moveTo(0, -14 * s); ctx.lineTo(0, -110 * s); ctx.stroke(); ctx.setLineDash([]);
}
ctx.restore();
}
// ---------- scenery ----------
function drawSkyObj(P, w, h, L, top, camX) {
var o = P.so, kind = P.mood.obj, dx = -camX * 0.01, al = 0.5 + (1 - L) * 0.4, c;
ctx.save(); ctx.globalAlpha = al;
if (kind === 'riese') {
var R = h * 0.4 * o.sz, cx = w * (0.55 + o.x * 0.4) + dx, cy = h * (0.02 + o.y * 0.1), g = ctx.createLinearGradient(cx - R, cy - R, cx + R, cy + R);
c = P.type === 'lava' ? ['#c88a6a', '#3a1a14'] : ['#d8c8b0', '#5a4a48']; g.addColorStop(0, c[0]); g.addColorStop(1, c[1]);
ctx.fillStyle = g; circle(cx, cy, R); ctx.fill(); ctx.save(); circle(cx, cy, R); ctx.clip();
for (var i = 0; i < 9; i++) { ctx.fillStyle = i % 2 ? 'rgba(90,70,64,0.16)' : 'rgba(255,240,220,0.08)'; ctx.beginPath(); ctx.ellipse(cx, cy - R + i * R * 0.24, R * 1.1, R * 0.05, 0.08, 0, Math.PI * 2); ctx.fill(); }
ctx.restore();
} else if (kind === 'ring') {
var R2 = h * 0.17 * o.sz, cx2 = w * (0.12 + o.x * 0.5) + dx, cy2 = h * (0.24 + o.y * 0.1), g2 = ctx.createLinearGradient(cx2 - R2, cy2 - R2, cx2 + R2, cy2 + R2);
g2.addColorStop(0, P.type === 'kristall' ? '#a89ad8' : '#8a9ab8'); g2.addColorStop(1, '#141a2a');
function ring(a0, a1) { ctx.beginPath(); ctx.ellipse(cx2, cy2, R2 * 1.75, R2 * 0.25, -0.21, a0, a1); ctx.strokeStyle = 'rgba(200,214,228,0.5)'; ctx.lineWidth = R2 * 0.09; ctx.stroke(); ctx.strokeStyle = 'rgba(200,214,228,0.25)'; ctx.lineWidth = R2 * 0.03; ctx.beginPath(); ctx.ellipse(cx2, cy2, R2 * 1.58, R2 * 0.22, -0.21, a0, a1); ctx.stroke(); }
ring(Math.PI, Math.PI * 2); ctx.fillStyle = g2; circle(cx2, cy2, R2); ctx.fill(); ring(0, Math.PI);
} else if (kind === 'sichel') {
var R3 = h * 0.09 * o.sz, cx3 = w * (0.6 + o.x * 0.3) + dx, cy3 = h * (0.14 + o.y * 0.08);
ctx.fillStyle = '#d8dce8'; circle(cx3, cy3, R3); ctx.fill(); ctx.fillStyle = rgb(top); circle(cx3 + R3 * 0.38, cy3 - R3 * 0.16, R3 * 0.95); ctx.fill();
} else {
[[0.7, 0.16, 0.05], [0.82, 0.26, 0.028]].forEach(function (m, i) { var mx = w * (m[0] - o.x * 0.25) + dx, my = h * (m[1] + o.y * 0.05), mr = h * m[2] * o.sz; ctx.fillStyle = i ? '#c8b8b0' : '#e8dccb'; circle(mx, my, mr); ctx.fill(); ctx.fillStyle = 'rgba(20,16,24,0.55)'; circle(mx + mr * 0.4, my - mr * 0.1, mr * 0.9); ctx.fill(); });
}
ctx.restore();
}
function drawLandmark(m, x, y, s, col, lit, time, acc) {
var H = m.h * s; ctx.fillStyle = col; ctx.strokeStyle = col; ctx.lineCap = 'round';
if (m.k === 'baum') {
ctx.lineWidth = Math.max(2, H * 0.035); ctx.beginPath(); ctx.moveTo(x, y); ctx.bezierCurveTo(x - H * 0.04, y - H * 0.4, x + H * 0.05, y - H * 0.7, x, y - H); ctx.stroke();
for (var k = 0; k < 6; k++) {
var a = -1.2 + k * 0.48, ex = x + Math.sin(a) * H * 0.32, ey = y - H - Math.cos(a) * H * 0.07;
ctx.strokeStyle = col; ctx.lineWidth = Math.max(1.5, H * 0.015); ctx.beginPath(); ctx.moveTo(x, y - H); ctx.quadraticCurveTo((x + ex) / 2, ey - H * 0.14, ex, ey); ctx.stroke();
ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(ex, ey); ctx.lineTo(ex, ey + H * 0.05); ctx.stroke();
var gx = ex, gy = ey + H * 0.065, rr = Math.max(1.5, H * 0.016), g = ctx.createRadialGradient(gx, gy, 0, gx, gy, rr * 7), c = hex(acc), aa = lit * (0.7 + 0.3 * Math.sin(time * 1.3 + k + m.q * 9));
g.addColorStop(0, rgb(c, 0.35 * aa)); g.addColorStop(1, rgb(c, 0)); ctx.fillStyle = g; circle(gx, gy, rr * 7); ctx.fill(); ctx.fillStyle = rgb(mix(c, [255, 255, 255], 0.3), aa); circle(gx, gy, rr); ctx.fill();
}
} else if (m.k === 'pilz') {
ctx.fillRect(x - H * 0.05, y - H * 0.8, H * 0.1, H * 0.8); ctx.beginPath(); ctx.ellipse(x, y - H * 0.8, H * 0.42, H * 0.2, 0, Math.PI, 0); ctx.fill();
for (k = 0; k < 5; k++) { var px = x - H * 0.3 + k * H * 0.15, py = y - H * 0.84 - (k % 2) * H * 0.06, c2 = hex(acc); ctx.fillStyle = rgb(c2, lit * (0.5 + 0.4 * Math.sin(time + k))); circle(px, py, Math.max(1.2, H * 0.012)); ctx.fill(); }
} else if (m.k === 'tafel') {
ctx.beginPath(); ctx.moveTo(x - H * 1.1, y); ctx.lineTo(x - H * 0.75, y - H * 0.55); ctx.lineTo(x - H * 0.7, y - H * 0.62); ctx.lineTo(x + H * 0.55, y - H * 0.64); ctx.lineTo(x + H * 0.62, y - H * 0.5); ctx.lineTo(x + H * 1.0, y); ctx.fill();
} else if (m.k === 'bogen') {
ctx.beginPath(); ctx.moveTo(x - H * 0.75, y); ctx.lineTo(x - H * 0.62, y - H * 1.05); ctx.quadraticCurveTo(x - H * 0.1, y - H * 1.7, x + H * 0.5, y - H * 1.15); ctx.lineTo(x + H * 0.72, y); ctx.lineTo(x + H * 0.45, y); ctx.lineTo(x + H * 0.32, y - H * 0.95); ctx.quadraticCurveTo(x - H * 0.1, y - H * 1.3, x - H * 0.42, y - H * 0.85); ctx.lineTo(x - H * 0.5, y); ctx.fill();
} else if (m.k === 'vulkan') {
ctx.beginPath(); ctx.moveTo(x - H * 1.3, y); ctx.lineTo(x - H * 0.18, y - H * 0.9); ctx.lineTo(x + H * 0.18, y - H * 0.9); ctx.lineTo(x + H * 1.3, y); ctx.fill();
var vg = ctx.createRadialGradient(x, y - H * 0.9, 0, x, y - H * 0.9, H * 0.5); vg.addColorStop(0, 'rgba(255,122,47,' + (0.5 * lit) + ')'); vg.addColorStop(1, 'rgba(255,122,47,0)'); ctx.fillStyle = vg; circle(x, y - H * 0.9, H * 0.5); ctx.fill();
for (k = 0; k < 4; k++) { var t2 = (time * 0.08 + k * 0.25 + m.q) % 1; ctx.fillStyle = 'rgba(60,40,40,' + (0.35 * (1 - t2)) + ')'; circle(x + t2 * H * 0.6, y - H * 0.95 - t2 * H * 0.9, H * (0.1 + t2 * 0.25)); ctx.fill(); }
} else if (m.k === 'nadel') {
[[-0.5, 0.7, 0.14], [-0.2, 1.1, 0.2], [0.15, 0.8, 0.15], [0.42, 1.35, 0.22], [0.7, 0.6, 0.12]].forEach(function (q) { var bx = x + q[0] * H, hh = q[1] * H, ww = q[2] * H; ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(bx - ww, y); ctx.lineTo(bx, y - hh); ctx.lineTo(bx + ww * 0.2, y); ctx.fill(); ctx.fillStyle = rgb(mix(hex(col), [255, 255, 255], 0.18)); ctx.beginPath(); ctx.moveTo(bx + ww * 0.2, y); ctx.lineTo(bx, y - hh); ctx.lineTo(bx + ww, y); ctx.fill(); });
if (acc && lit > 0.3) { var cg = ctx.createRadialGradient(x + 0.42 * H, y - 0.8 * H, 0, x + 0.42 * H, y - 0.8 * H, H * 0.4); cg.addColorStop(0, rgb(hex(acc), 0.2 * lit)); cg.addColorStop(1, rgb(hex(acc), 0)); ctx.fillStyle = cg; circle(x + 0.42 * H, y - 0.8 * H, H * 0.4); ctx.fill(); }
} else if (m.k === 'stack') {
ctx.beginPath(); ctx.moveTo(x - H * 0.22, y); ctx.lineTo(x - H * 0.2, y - H * 0.9); ctx.lineTo(x - H * 0.05, y - H); ctx.lineTo(x + H * 0.15, y - H * 0.94); ctx.lineTo(x + H * 0.2, y); ctx.fill();
ctx.beginPath(); ctx.moveTo(x + H * 0.45, y); ctx.lineTo(x + H * 0.48, y - H * 0.5); ctx.lineTo(x + H * 0.62, y - H * 0.55); ctx.lineTo(x + H * 0.68, y); ctx.fill();
}
}
function draw(c, S, P, w, h, time) {
ctx = c;
var s = Math.max(0.85, Math.min(h / 560, w / 520)), camX = P.x, baseY = h * (w < h ? 0.62 : 0.68), night = isNight(P), L = dayLight(P), pal = P.pal, M = P.mood;
function X(x) { return w / 2 + (x - camX) * s; } function Y(y) { return baseY - (y - P.camY) * s; }
// sky: three stops, warm band when the sun is low
var top = mix(pal.night, pal.sky, L), mid = mix(mix(pal.night, '#1a1a2a', 0.3), pal.mid, L), hor = mix(mix(pal.night, '#3a2a3a', 0.4), pal.hor, L);
if (L > 0.12 && L < 0.6) hor = mix(hor, '#ff9a6a', (0.6 - L) * 0.9);
var g = ctx.createLinearGradient(0, 0, 0, baseY); g.addColorStop(0, rgb(top)); g.addColorStop(0.55, rgb(mid)); g.addColorStop(1, rgb(hor));
ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
if (L < 0.55) { var r = W.rng(P.p.seed); ctx.fillStyle = 'rgba(239,233,221,' + (0.85 - L * 1.5) + ')'; for (var i = 0; i < 160; i++) { var sz = r() < 0.1 ? 2 : 1; ctx.fillRect(r() * w, r() * baseY * 0.85, sz, sz); } }
if (M.aur && L < 0.4) {
var aa = Math.min(1, (0.4 - L) * 3);
for (i = 0; i < 2; i++) { var ay = h * (0.12 + i * 0.1), ag = ctx.createLinearGradient(0, ay - 40, 0, ay + 80); ag.addColorStop(0, 'rgba(122,240,208,0)'); ag.addColorStop(0.6, 'rgba(122,240,208,' + (0.38 * aa / (i + 1)) + ')'); ag.addColorStop(1, 'rgba(122,240,208,0)'); ctx.fillStyle = ag; ctx.beginPath(); ctx.moveTo(0, ay); for (var ax = 0; ax <= w + 20; ax += 20) ctx.lineTo(ax, ay + Math.sin(ax * 0.004 + time * 0.15 + i * 2) * 40 - camX * 0.01); for (ax = w + 20; ax >= 0; ax -= 20) ctx.lineTo(ax, ay + 90 + Math.sin(ax * 0.005 + time * 0.12 + i) * 30); ctx.fill(); }
}
drawSkyObj(P, w, h, L, top, camX);
var ph = (P.t0 + P.t / P.day) % 1, sa = (ph - 0.25) * Math.PI * 2, sunX = w / 2 + Math.sin(sa) * w * 0.42, sunY = baseY - Math.cos(sa) * h * 0.6;
var sc = W.STARS[P.starType] || W.STARS.gelb;
if (sunY < baseY + 20) {
if (M.rays !== 0 && L > 0.1 && L < 0.75) { ctx.save(); ctx.globalAlpha = 0.05 * (1 - Math.abs(L - 0.4) * 2.2); ctx.fillStyle = '#ffd8a8'; for (i = 0; i < 8; i++) { var ra = 3.3 + i * 0.36 + Math.sin(time * 0.05 + i) * 0.03; ctx.beginPath(); ctx.moveTo(sunX, sunY); ctx.lineTo(sunX + Math.cos(ra) * w * 1.5, sunY + Math.sin(ra) * w * 1.5); ctx.lineTo(sunX + Math.cos(ra + 0.05) * w * 1.5, sunY + Math.sin(ra + 0.05) * w * 1.5); ctx.fill(); } ctx.restore(); }
var sg = ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, h * 0.35); sg.addColorStop(0, rgb(hex('#fff6e8'), 0.95)); sg.addColorStop(0.08, rgb(hex(sc.c), 0.7)); sg.addColorStop(1, rgb(hex(sc.c), 0)); ctx.fillStyle = sg; circle(sunX, sunY, h * 0.35); ctx.fill();
ctx.fillStyle = '#fff4e4'; circle(sunX, sunY, 9 + h * 0.012); ctx.fill();
}
// the sky whale drifts above the far hills
if (P.wal) drawWal(w / 2 + (P.wal.x - camX * 0.5) * s * 0.7, h * 0.36 + Math.sin(time * 0.3) * 8, s * 0.7, time, 0.85);
// haze layers with landmarks
var PAR = [0.06, 0.15, 0.3, 0.55], OFF = [170, 120, 75, 35], AMPL = [70, 55, 38, 22], HZ = [0.72, 0.52, 0.32, 0.14], haze = mix(pal.haze, pal.night, (1 - L) * 0.75);
function ridge(k, sx) { var wx = camX * PAR[k] + (sx - w / 2) / s, a = P.ph[k] || 0; return baseY - (OFF[k] + AMPL[k] * (0.6 * Math.sin(wx / (380 + k * 90) + a) + 0.4 * Math.sin(wx / (140 + k * 40) + a * 2))) * s + P.camY * PAR[k] * s; }
for (var k = 0; k < 4; k++) {
var col = rgb(mix(mix(mix(pal.far, pal.gr, k * 0.22), pal.night, (1 - L) * 0.7), haze, HZ[k]));
if (k === 1 || k === 2) P.lm.forEach(function (m) { if (m.L !== k) return; var lx = w / 2 + (m.x - camX * PAR[k]) * s; if (lx < -400 * s || lx > w + 400 * s) return; drawLandmark(m, lx, ridge(k, lx) + 6 * s, s * (k === 1 ? 0.9 : 1.1), col, (1 - HZ[k]) * (night ? 1 : 0.55), time, M.acc); });
ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(0, h); for (var sx = 0; sx <= w + 8; sx += 8) ctx.lineTo(sx, ridge(k, sx)); ctx.lineTo(w, h); ctx.fill();
var hy = ridge(k, w / 2), hg = ctx.createLinearGradient(0, hy - 90 * s, 0, h); hg.addColorStop(0, rgb(haze, 0)); hg.addColorStop(Math.min(0.99, Math.max(0.05, 150 * s / (h - hy + 90 * s))), rgb(haze, 0.3)); hg.addColorStop(1, rgb(haze, 0.3)); ctx.fillStyle = hg; ctx.fillRect(0, hy - 90 * s, w, h - hy + 90 * s);
}
// ground
var gcol = mix(pal.gr, pal.night, (1 - L) * 0.6), ecol = mix(pal.edge, pal.night, (1 - L) * 0.5);
var gg = ctx.createLinearGradient(0, baseY - 40 * s, 0, h); gg.addColorStop(0, rgb(mix(gcol, haze, 0.12))); gg.addColorStop(1, rgb(mix(gcol, [0, 0, 0], 0.45))); ctx.fillStyle = gg; ctx.beginPath(); ctx.moveTo(0, h);
var x0 = camX - w / 2 / s - 10, x1 = camX + w / 2 / s + 10;
for (var x = x0; x <= x1; x += 6) ctx.lineTo(X(x), Y(terrain(P, x)));
ctx.lineTo(w, h); ctx.fill();
ctx.strokeStyle = rgb(ecol); ctx.lineWidth = 2 * s; ctx.beginPath(); for (x = x0; x <= x1; x += 6) { if (x === x0) ctx.moveTo(X(x), Y(terrain(P, x))); else ctx.lineTo(X(x), Y(terrain(P, x))); } ctx.stroke();
if (P.type === 'ozean') {
var wy = Y(0), wg = ctx.createLinearGradient(0, wy, 0, h); wg.addColorStop(0, rgb(mix(mix('#2a5a7a', haze, 0.3), pal.night, (1 - L) * 0.6), 0.88)); wg.addColorStop(1, rgb(mix('#0c1a28', pal.night, 0.5), 0.95)); ctx.fillStyle = wg; ctx.fillRect(0, wy, w, h - wy);
var rr = W.rng(P.p.seed ^ 77); for (i = 0; i < 40; i++) { var ly = wy + 4 + rr() * (h - wy), lx2 = ((rr() * w * 2 - camX * s * 0.8) % w + w) % w; ctx.fillStyle = night ? 'rgba(122,240,208,' + (0.05 + rr() * 0.08) + ')' : 'rgba(239,233,221,' + (0.04 + rr() * 0.06) + ')'; ctx.fillRect(lx2, ly, 30 + rr() * 90, 1); }
ctx.strokeStyle = 'rgba(239,233,221,0.4)'; ctx.lineWidth = 1; ctx.beginPath(); for (sx = 0; sx < w; sx += 4) ctx.lineTo(sx, wy + Math.sin(sx * 0.05 + time * 2) * 1.5); ctx.stroke();
}
if (P.type === 'lava') for (x = Math.floor(x0 / 6) * 6; x <= x1; x += 6) if (lavaAt(P, x)) { var lyy = Y(terrain(P, x)); ctx.fillStyle = 'rgba(255,' + (90 + Math.sin(time * 3 + x * 0.1) * 30 | 0) + ',40,0.9)'; ctx.fillRect(X(x), lyy - 2 * s, 6 * s + 1, 5 * s); }
if (M.mist) { var my = Y(0), mg = ctx.createLinearGradient(0, my - 70 * s, 0, my + 30 * s); mg.addColorStop(0, rgb(haze, 0)); mg.addColorStop(0.7, rgb(haze, 0.3)); mg.addColorStop(1, rgb(haze, 0.1)); ctx.fillStyle = mg; ctx.fillRect(0, my - 70 * s, w, 100 * s); }
// grass
if (P.type === 'leben' || P.type === 'ozean' || P.type === 'wueste' || P.type === 'gift') {
ctx.strokeStyle = rgb(mix(ecol, '#000000', 0.2)); ctx.lineWidth = 1;
P.grass.forEach(function (gr) { if (gr[0] < x0 || gr[0] > x1) return; var gy = terrain(P, gr[0]); if (P.type === 'ozean' && gy < 0) return; var bx = X(gr[0]), by = Y(gy); ctx.beginPath(); ctx.moveTo(bx, by); ctx.quadraticCurveTo(bx - 2 * s, by - gr[1] * s * 0.6, bx + Math.sin(time + gr[2] * 6) * 3 * s, by - gr[1] * s); ctx.stroke(); });
}
// objects
if (P.ruin) drawRuin(X(P.ruin.x), Y(terrain(P, P.ruin.x)), s, P.ruin.done, time);
if (P.site) drawBase(X(P.site.x), Y(terrain(P, P.site.x)), s, P.site.built, time);
drawShip(X(0), Y(terrain(P, 0)), s, S, time, L < 0.45);
if (P.wreck) drawWreck(X(P.wreck.x), Y(terrain(P, P.wreck.x)), s, P.wreck.done);
P.species.forEach(function (sp) {
if (sp.rare && !night) return;
sp.inst.forEach(function (a) {
if (a.x < x0 - 200 || a.x > x1 + 200) return;
var gy = terrain(P, a.x); if (P.type === 'ozean' && gy < 0 && sp.kind === 'plant') return;
if (sp.kind === 'plant') drawPlant(sp, X(a.x), Y(gy), s, night, time); else drawAnimal(sp, a, X(a.x), Y(Math.max(gy, P.type === 'ozean' ? 0 : gy)), s, time);
});
});
P.nodes.forEach(function (n) { if (n.x < x0 - 30 || n.x > x1 + 30) return; drawNode(n, X(n.x), Y(terrain(P, n.x)), s, P.near && P.near.n === n, time, P.near && P.near.n === n ? P.prog : 0); });
if (P.sig) drawSignal(P, X(P.sig.x), Y(terrain(P, P.sig.x)), s, time, P.sig.done);
P.parts.forEach(function (q) { var e = q.t * q.t, px = q.x + (P.x - q.x) * e, py = q.y + 30 * Math.sin(q.t * Math.PI) + (P.y + 14 - q.y) * e; ctx.fillStyle = rgb(hex(NCOL[q.c] || NCOL.sporen), 1 - q.t * 0.6); ctx.fillRect(X(px) - 1.5 * s, Y(py) - 1.5 * s, 3 * s, 3 * s); });
// night tint, then lights that cut through it
if (L < 0.6) { ctx.fillStyle = 'rgba(6,8,16,' + ((0.6 - L) * 0.45) + ')'; ctx.fillRect(0, 0, w, h); }
drawAstro(P, X(P.x), Y(P.y), s, time, L < 0.4);
if (P.sig && !P.sig.done && P.sigD > 90) { var dir = P.sig.x > P.x ? 1 : -1, cx0 = X(P.x) + dir * 28 * s, cy0 = Y(P.y) - 28 * s, al = 0.5 + 0.5 * Math.sin(time * 4); ctx.strokeStyle = 'rgba(191,224,255,' + al + ')'; ctx.lineWidth = 2; for (var ci = 0; ci < 2; ci++) { var ox2 = cx0 + dir * ci * 9 * s; ctx.beginPath(); ctx.moveTo(ox2, cy0 - 6 * s); ctx.lineTo(ox2 + dir * 6 * s, cy0); ctx.lineTo(ox2, cy0 + 6 * s); ctx.stroke(); } }
// foreground silhouettes
var fcol = rgb(mix(gcol, [0, 0, 0], 0.65));
ctx.fillStyle = fcol; ctx.strokeStyle = fcol; ctx.lineWidth = 2 * s;
P.fg.forEach(function (f) {
var fx = w / 2 + (f[0] - camX * 1.4) * s; if (fx < -80 * s || fx > w + 80 * s) return; var fy = h + 6, fh = f[1] * s;
if (M.fg === 'gras') { for (var q = -3; q <= 3; q++) { ctx.beginPath(); ctx.moveTo(fx + q * 5 * s, fy); ctx.quadraticCurveTo(fx + q * 7 * s, fy - fh * 0.6, fx + q * 11 * s + Math.sin(time * 0.8 + f[2] * 6) * 4 * s, fy - fh * (1 - Math.abs(q) * 0.1)); ctx.stroke(); } }
else { ctx.beginPath(); ctx.moveTo(fx - fh, fy); ctx.lineTo(fx - fh * 0.6, fy - fh * 0.7); ctx.lineTo(fx + fh * 0.1, fy - fh * 0.9); ctx.lineTo(fx + fh * 0.8, fy - fh * 0.4); ctx.lineTo(fx + fh * 1.1, fy); ctx.fill(); }
});
if (root.PlanetX) root.PlanetX(ctx, S, P, w, h, time, s, X, Y);
// vignette
var vg = ctx.createRadialGradient(w / 2, h * 0.55, Math.min(w, h) * 0.35, w / 2, h * 0.55, Math.max(w, h) * 0.75); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,0.38)'); ctx.fillStyle = vg; ctx.fillRect(0, 0, w, h);
// weather
var wt = P.weather;
if (wt && wt !== 'klar') {
ctx.lineWidth = 1;
P.wx.forEach(function (q, i) {
var px = ((q[0] * w + time * (wt === 'sand' ? 220 : wt === 'regen' ? 40 : 15) * (0.6 + q[2])) % w + w) % w, py = ((q[1] * h + time * (wt === 'regen' ? 380 : wt === 'schnee' ? 40 : wt === 'sand' ? 30 : 12) * (0.6 + q[2])) % h + h) % h;
if (wt === 'regen') { ctx.strokeStyle = 'rgba(200,220,240,0.35)'; ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px - 2, py + 9); ctx.stroke(); }
else if (wt === 'schnee') { ctx.fillStyle = 'rgba(255,255,255,0.8)'; ctx.fillRect(px, py, 2, 2); }
else if (wt === 'sand' || wt === 'staub') { ctx.strokeStyle = rgb(hex(pal.edge), 0.35); ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px + 14, py + 1); ctx.stroke(); }
else if (wt === 'glitzer') { ctx.fillStyle = 'rgba(220,230,255,' + (0.5 + 0.5 * Math.sin(time * 5 + i)) + ')'; ctx.fillRect(px, py, 1.5, 1.5); }
else if (wt === 'asche') { ctx.fillStyle = 'rgba(120,110,105,0.6)'; ctx.fillRect(px, py, 2, 2); }
else if (wt === 'nebel') { if (i % 6 === 0) { ctx.fillStyle = 'rgba(168,192,112,0.06)'; ctx.fillRect(0, py, w, 40); } }
else if (wt === 'sporen') { ctx.fillStyle = 'rgba(216,240,128,' + (0.3 + 0.4 * Math.sin(time * 2 + i)) + ')'; circle(px, py, 1.6); ctx.fill(); }
});
}
// floating texts and progress
ctx.font = '13px ui-monospace, Menlo, monospace'; ctx.textAlign = 'center';
P.fx.forEach(function (f) { ctx.fillStyle = f.c || IV; ctx.globalAlpha = 1 - f.t / 2.4; ctx.fillText(f.s, X(f.x), Y(f.y) - f.t * 24); ctx.globalAlpha = 1; });
if (!P.near && P.hi) { var hs = P.hi, hx = hs.inst.reduce(function (b, a) { return Math.abs(a.x - P.x) < Math.abs(b.x - P.x) ? a : b; }).x, hl = (ARCH[hs.arch].n + ' · Jetpack, höher').toUpperCase(); ctx.fillStyle = 'rgba(0,0,0,0.45)'; var hw = ctx.measureText(hl).width; ctx.fillRect(X(hx) - hw / 2 - 6, Y(P.y) - 70 * s - 14, hw + 12, 20); ctx.fillStyle = '#bfe0ff'; ctx.fillText(hl, X(hx), Y(P.y) - 70 * s); }
if (P.near) {
var nk = P.near.k, nx = nk === 'node' ? P.near.n.x : nk === 'wreck' ? P.wreck.x : nk === 'ship' ? 0 : nk === 'site' ? P.site.x : nk === 'ruin' ? P.ruin.x : nk === 'signal' ? P.sig.x : nk === 'species' && P.near.a ? P.near.a.x : P.x, ny = terrain(P, nx);
var lh = nk === 'ship' ? 175 : nk === 'ruin' ? 160 : nk === 'signal' ? 70 : nk === 'site' ? 110 : nk === 'wreck' ? 95 : nk === 'species' && P.near.sp.arch ? Math.min(160, ARCH[P.near.sp.arch].h * archK(P.near.sp) + 22) + (P.near.sp.arch === 'falter' ? 30 : 0) : nk === 'wal' ? 120 : 62;
var lab = nk === 'site' ? (P.site.built ? 'Deine Basis' : 'Bauplatz für eine Basis') : nk === 'node' ? (P.near.n.rich ? 'Reiche Ader · ' : '') + W.RES[P.near.n.k].n + ' · ' + P.near.n.amt + ' t' : nk === 'species' ? (P.near.sp.rare ? 'Seltene Art' : P.near.sp.arch ? ARCH[P.near.sp.arch].n + ' · unbekannt' : 'Unbekannte Art') : nk === 'wreck' ? 'Wrack' : nk === 'ruin' ? 'Ruine der Erbauer' : nk === 'signal' ? 'Signalquelle' : nk === 'wal' ? 'Himmelswal' : 'Dein Schiff';
ctx.fillStyle = 'rgba(0,0,0,0.45)'; var tw = ctx.measureText(lab.toUpperCase()).width; ctx.fillRect(X(nx) - tw / 2 - 6, Y(ny) - lh * s - 14, tw + 12, 20);
ctx.fillStyle = IV; ctx.fillText(lab.toUpperCase(), X(nx), Y(ny) - lh * s);
if (P.prog > 0) { ctx.strokeStyle = AC; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(X(P.x), Y(P.y) - 60 * s, 12, -Math.PI / 2, -Math.PI / 2 + P.prog * Math.PI * 2); ctx.stroke(); }
}
}

root.Planet = { terrain: terrain, enter: enter, update: update, draw: draw, abort: abort, isNight: isNight };
})(window);
