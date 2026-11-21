// Teil 13: Planeten als drehende Kugeln (2.5D). Jede Oberfläche wird einmal als Karte
// erzeugt und dann pro Bild auf eine Kugel gelegt, beleuchtet vom Stern des Systems.
(function (root) {
'use strict';
var W = root.World;
function hash(x, y, z, s) { var h = (x * 374761393 + y * 668265263 + z * 1440662683 + s * 1274126177) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967295; }
function sm(t) { return t * t * (3 - 2 * t); }
function vn(x, y, z, s) {
var xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z), xf = sm(x - xi), yf = sm(y - yi), zf = sm(z - zi);
function L(a, b, t) { return a + (b - a) * t; }
return L(L(L(hash(xi, yi, zi, s), hash(xi + 1, yi, zi, s), xf), L(hash(xi, yi + 1, zi, s), hash(xi + 1, yi + 1, zi, s), xf), yf),
L(L(hash(xi, yi, zi + 1, s), hash(xi + 1, yi, zi + 1, s), xf), L(hash(xi, yi + 1, zi + 1, s), hash(xi + 1, yi + 1, zi + 1, s), xf), yf), zf);
}
function fbm(x, y, z, s, o) { var a = 0, f = 1, amp = 0.5; for (var i = 0; i < (o || 5); i++) { a += amp * vn(x * f, y * f, z * f, s + i); f *= 2.03; amp *= 0.5; } return a; }
function mix(a, b, t) { t = t < 0 ? 0 : t > 1 ? 1 : t; return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]; }
function hx(h) { var n = parseInt(h.slice(1), 16); return [n >> 16, (n >> 8) & 255, n & 255]; }
function pc(s) { if (s[0] === '#') return hx(s); return s.replace(/[^0-9,.]/g, '').split(',').map(Number); }
var C = {}; ['#4a4440', '#9a9088', '#2a2622', '#9a6a48', '#ecc9a0', '#14304a', '#24506a', '#3a5a34', '#6a7a44', '#e8ece8', '#12304e', '#2a5a7a', '#5a6a4a', '#c8c0a0', '#8aa0b8', '#eef4f8', '#4a6a8a', '#3a4a7a', '#c8d0f0', '#1a1210', '#4a3428', '#ff7a2f', '#8a6a4a', '#e0cca0', '#b07a50'].forEach(function (h) { C[h] = hx(h); });
var PAL = {
fels: function (x, y, z, s) { var n = fbm(x * 2.2, y * 2.2, z * 2.2, s), c = fbm(x * 7, y * 7, z * 7, s + 9, 3); var col = mix(C['#4a4440'], C['#9a9088'], n * 1.4 - 0.2); return { c: mix(col, C['#2a2622'], Math.max(0, 0.42 - c) * 3) }; },
wueste: function (x, y, z, s) { var n = fbm(x * 2, y * 2, z * 2, s), d = Math.sin(y * 14 + fbm(x * 3, y * 3, z * 3, s + 3, 3) * 6) * 0.5 + 0.5; return { c: mix(C['#9a6a48'], C['#ecc9a0'], n * 0.9 + d * 0.25) }; },
leben: function (x, y, z, s) { var n = fbm(x * 1.8, y * 1.8, z * 1.8, s); if (n < 0.5) return { c: mix(C['#14304a'], C['#24506a'], n * 2), sea: 1 }; var col = mix(C['#3a5a34'], C['#6a7a44'], (n - 0.5) * 3); return { c: mix(col, C['#e8ece8'], Math.max(0, Math.abs(y) - 0.82) * 6) }; },
ozean: function (x, y, z, s) { var n = fbm(x * 2, y * 2, z * 2, s); if (n < 0.66) return { c: mix(C['#12304e'], C['#2a5a7a'], n * 1.5), sea: 1 }; return { c: mix(C['#5a6a4a'], C['#c8c0a0'], (n - 0.66) * 4) }; },
eis: function (x, y, z, s) { var n = fbm(x * 2.5, y * 2.5, z * 2.5, s), cr = Math.abs(fbm(x * 5, y * 5, z * 5, s + 4, 4) - 0.5), col = mix(C['#8aa0b8'], C['#eef4f8'], n * 1.3 - 0.1); return { c: mix(col, C['#4a6a8a'], Math.max(0, 0.05 - cr) * 14) }; },
kristall: function (x, y, z, s) { var n = fbm(x * 3, y * 3, z * 3, s); return { c: mix(C['#3a4a7a'], C['#c8d0f0'], Math.floor(n * 9) / 9), e: n > 0.68 ? (n - 0.68) * 3 : 0, ec: [200, 220, 255] }; },
lava: function (x, y, z, s) { var n = fbm(x * 2.4, y * 2.4, z * 2.4, s), cr = Math.abs(fbm(x * 4, y * 4, z * 4, s + 7, 4) - 0.5), col = mix(C['#1a1210'], C['#4a3428'], n); if (cr < 0.05) return { c: mix(C['#ff7a2f'], col, cr * 20), e: 1 - cr * 20, ec: [255, 120, 50] }; return { c: col }; },
gas: function (x, y, z, s) { var t = fbm(x * 2, y * 2, z * 2, s, 4), b = Math.sin(y * 11 + t * 5) * 0.5 + 0.5, col = mix(C['#8a6a4a'], C['#e0cca0'], b); return { c: mix(col, C['#b07a50'], Math.max(0, Math.sin(y * 4 + 1) * 0.6)) }; }
};
var SOLT = { merkur: 'fels', venus: 'gas', erde: 'leben', mars: 'wueste', jupiter: 'gas', saturn: 'gas' };
var ATM = { leben: [159, 200, 255], ozean: [168, 208, 255], wueste: [255, 208, 160], eis: [216, 236, 255], kristall: [200, 208, 255], lava: [255, 179, 122], gas: [232, 208, 160] };
var TW = 256, TH = 128, cache = {}, built = 0, renders = 0, lastF = 0;
function key(p) { return p.key || (p.sol || p.type) + ':' + p.seed; }
function build(p, col) {
var t = p.sol ? SOLT[p.sol] || 'fels' : PAL[p.type] ? p.type : 'fels', pal = PAL[t], s = (p.seed | 0) % 100000, tint = pc(col.lit), tk = p.sol ? 0.35 : 0.22;
var tex = new Float32Array(TW * TH * 3), em = new Float32Array(TW * TH * 3), sea = new Uint8Array(TW * TH), cl = null, cloudy = t === 'leben' || t === 'ozean' || p.sol === 'venus';
if (cloudy) cl = new Float32Array(TW * TH);
for (var j = 0; j < TH; j++) {
var lat = (j + 0.5) / TH * Math.PI - Math.PI / 2, y = Math.sin(lat), cr = Math.cos(lat);
for (var i = 0; i < TW; i++) {
var lon = (i + 0.5) / TW * Math.PI * 2, x = cr * Math.cos(lon), z = cr * Math.sin(lon), r = pal(x, y, z, s), c = mix(r.c, tint, tk), k = j * TW + i;
tex[k * 3] = c[0]; tex[k * 3 + 1] = c[1]; tex[k * 3 + 2] = c[2]; sea[k] = r.sea ? 1 : 0;
if (r.e > 0) { em[k * 3] = r.ec[0] * r.e; em[k * 3 + 1] = r.ec[1] * r.e; em[k * 3 + 2] = r.ec[2] * r.e; }
if (cl) { var v = fbm(x * 3, y * 6, z * 3, s + 50, 4); cl[k] = Math.max(0, Math.min(1, (v - (p.sol === 'venus' ? 0.3 : 0.52)) * 3)); }
}
}
var A = p.sol === 'erde' ? ATM.leben : p.sol === 'mars' ? null : ATM[t] || null;
return { tex: tex, em: em, sea: sea, cl: cl, atm: p.type === 'fels' && !p.sol ? null : A, tilt: 0.2 + hash(s, 3, 3, 1) * 0.4, spin: (0.012 + hash(s, 5, 5, 2) * 0.02) * (hash(s, 1, 1, 7) < 0.5 ? -1 : 1), ph: hash(s, 9, 9, 3) * 6, cv: null, N: 0, map: null };
}
function table(g, N) {
var R = N / 2, n = N * N, T = { nx: new Float32Array(n), ny: new Float32Array(n), nz: new Float32Array(n), lon: new Float32Array(n), row: new Int32Array(n), a: new Float32Array(n) }, ct = Math.cos(g.tilt), st = Math.sin(g.tilt);
for (var j = 0; j < N; j++) for (var i = 0; i < N; i++) {
var k = j * N + i, x = (i + 0.5 - R) / R, y = (j + 0.5 - R) / R, q = x * x + y * y; if (q > 1) { T.a[k] = 0; continue; }
var z = Math.sqrt(1 - q), y1 = y * ct - z * st, z1 = y * st + z * ct, lat = Math.asin(Math.max(-1, Math.min(1, y1))), lon = Math.atan2(z1, x);
T.nx[k] = x; T.ny[k] = y; T.nz[k] = z; T.lon[k] = lon / (Math.PI * 2) * TW; T.row[k] = Math.min(TH - 1, Math.floor((lat / Math.PI + 0.5) * TH)) * TW; T.a[k] = Math.min(1, (1 - Math.sqrt(q)) * R * 1.2);
}
return T;
}
function render(g, N, L, rot) {
if (!g.cv) g.cv = document.createElement('canvas');
if (g.N !== N) { g.N = N; g.cv.width = g.cv.height = N; g.T = table(g, N); g.im = g.cv.getContext('2d').createImageData(N, N); }
var T = g.T, d = g.im.data, tex = g.tex, em = g.em, cl = g.cl, sea = g.sea, A = g.atm, n = N * N, ro = rot / (Math.PI * 2) * TW, rc = rot * 1.25 / (Math.PI * 2) * TW, hz = Math.hypot(L[0], L[1], L[2] + 1) || 1;
for (var k = 0; k < n; k++) {
var a = T.a[k], o = k * 4; if (a <= 0) { d[o + 3] = 0; continue; }
var x = T.nx[k], y = T.ny[k], z = T.nz[k], u = ((T.lon[k] + ro) % TW + TW) % TW | 0, t = T.row[k] + u, t3 = t * 3;
var lam = x * L[0] + y * L[1] + z * L[2], term = lam < -0.12 ? 0 : lam > 0.18 ? 1 : sm((lam + 0.12) / 0.3), sh = 0.06 + 0.94 * Math.pow(lam > 0 ? lam : 0, 0.8) * term;
var r = tex[t3] * sh, gg = tex[t3 + 1] * sh, b = tex[t3 + 2] * sh;
if (sea[t]) { var sp = (x * L[0] + y * L[1] + z * (L[2] + 1)) / hz; if (sp > 0.9) { sp = Math.pow(sp, 40) * 0.7 * term; r += 255 * sp; gg += 240 * sp; b += 220 * sp; } }
if (cl) { var cu = ((T.lon[k] + rc) % TW + TW) % TW | 0, cv = cl[T.row[k] + cu]; if (cv > 0) { var cs = (0.08 + 0.92 * term * (lam > 0.15 ? lam : 0.15)) * 236; r += (cs - r) * cv; gg += (cs - gg) * cv; b += (cs * 1.02 - b) * cv; } }
if (em[t3] || em[t3 + 2]) { var e = 1 - term * 0.7; r += em[t3] * e; gg += em[t3 + 1] * e; b += em[t3 + 2] * e; }
if (A) { var f = (1 - z) * (1 - z) * 0.85 * (0.15 + 0.85 * (lam < -0.35 ? 0 : lam > 0.15 ? 1 : (lam + 0.35) / 0.5)); r += (A[0] - r) * f; gg += (A[1] - gg) * f; b += (A[2] - b) * f; }
var lu = r * 0.3 + gg * 0.59 + b * 0.11; d[o] = r + (lu - r) * 0.2; d[o + 1] = gg + (lu - gg) * 0.2; d[o + 2] = b + (lu - b) * 0.2; d[o + 3] = 255 * a;
}
g.cv.getContext('2d').putImageData(g.im, 0, 0); g.rot = rot; g.L = L.slice(); renders++;
}
function draw(ctx, x, y, r, p, lx, ly, lz, col) {
var now = performance.now(); if (now - lastF > 8) { lastF = now; built = 0; renders = 0; }
var k = key(p), g = cache[k];
if (!g) { if (built >= 1) return false; built++; var t0 = performance.now(); g = cache[k] = build(p, col); root.Globe.bt = performance.now() - t0; }
var N = Math.min(r > 200 ? 420 : 300, Math.max(8, Math.ceil(r * 2 / 8) * 8)), q = Math.sqrt(Math.max(0, 1 - lz * lz)), L = [lx * q, ly * q, lz], rot = g.ph + now / 1000 * g.spin;
var stale = !g.L || g.N !== N || Math.abs(g.L[0] - L[0]) + Math.abs(g.L[1] - L[1]) + Math.abs(g.L[2] - L[2]) > 0.03 || Math.abs(rot - g.rot) > (N > 200 ? 0.01 : 0.004);
if (stale && (renders < 3 || !g.L || N <= 40)) render(g, N, L, rot);
if (!g.L) return false;
if (g.atm && r > 3) { var ag = ctx.createRadialGradient(x, y, r * 0.94, x, y, r * 1.22), c = g.atm; ag.addColorStop(0, 'rgba(' + c + ',0.16)'); ag.addColorStop(1, 'rgba(' + c + ',0)'); ctx.fillStyle = ag; ctx.beginPath(); ctx.arc(x, y, r * 1.22, 0, Math.PI * 2); ctx.fill(); }
ctx.drawImage(g.cv, x - r, y - r, r * 2, r * 2);
return true;
}
root.Globe = { draw: draw, _cache: cache };
})(window);
