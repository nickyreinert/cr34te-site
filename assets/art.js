(function (root) {
'use strict';
var W = 320, H = 150, HOR = 56, SAND = 74;
var ctx = null;
var PINK = '#ff5fb0', CY = '#40e0d8', Y = '#ffd040', WH = '#f4f0e8', K = '#140a1c', OR = '#ff8c3c', LG = '#a0ff78', RED = '#e04050', VIO = '#a060e0';
var WOOD = '#96603a', WOODD = '#643e22', WOODL = '#b47a48', THATCH = '#c8a050', THATCHD = '#a07832';

function hex(h) { if (h.length === 4) h = '#' + h[1] + h[1] + h[2] + h[2] + h[3] + h[3]; var n = parseInt(h.slice(1), 16); return [n >> 16, (n >> 8) & 255, n & 255]; }
function mix(a, b, t) { return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]; }
function css(c, a) { return a === undefined ? 'rgb(' + (c[0] | 0) + ',' + (c[1] | 0) + ',' + (c[2] | 0) + ')' : 'rgba(' + (c[0] | 0) + ',' + (c[1] | 0) + ',' + (c[2] | 0) + ',' + a + ')'; }
function shade(c, t) { return css(mix(hex(c), t < 0 ? [0, 0, 0] : [255, 255, 255], Math.abs(t))); }
function R(x, y, w, h, c) { ctx.fillStyle = typeof c === 'string' ? c : css(c); ctx.fillRect(Math.round(x), Math.round(y), Math.max(1, Math.round(w)), Math.max(1, Math.round(h))); }
function P(x, y, c) { R(x, y, 1, 1, c); }
function ell(x0, y0, w, h, c) {
var cx = x0 + w / 2 - 0.5, cy = y0 + h / 2 - 0.5;
for (var y = 0; y < h; y++) { var dy = (y0 + y - cy) / (h / 2), hw = (w / 2) * Math.sqrt(Math.max(0, 1 - dy * dy)); var a = Math.round(cx - hw + 0.5), b = Math.round(cx + hw - 0.5); if (b >= a) R(a, y0 + y, b - a + 1, 1, c); }
}
function line(x0, y0, x1, y1, c) {
x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
var dx = Math.abs(x1 - x0), sx = x0 < x1 ? 1 : -1, dy = -Math.abs(y1 - y0), sy = y0 < y1 ? 1 : -1, e = dx + dy;
for (var n = 0; n < 600; n++) { P(x0, y0, c); if (x0 === x1 && y0 === y1) break; var e2 = 2 * e; if (e2 >= dy) { e += dy; x0 += sx; } if (e2 <= dx) { e += dx; y0 += sy; } }
}
function tri(x0, y0, x1, y1, x2, y2, c) { ctx.fillStyle = c; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.lineTo(x2, y2); ctx.closePath(); ctx.fill(); }
// EGA-style 50 % dither between two colours
function dith(x, y, w, h, a, b) {
if (typeof a !== 'string') a = css(a); if (typeof b !== 'string') b = css(b);
var cache = ctx.__p || (ctx.__p = {}), k = a + b, p = cache[k];
if (!p) { var c = document.createElement('canvas'); c.width = c.height = 2; var q = c.getContext('2d'); q.fillStyle = a; q.fillRect(0, 0, 2, 2); q.fillStyle = b; q.fillRect(0, 0, 1, 1); q.fillRect(1, 1, 1, 1); p = cache[k] = ctx.createPattern(c, 'repeat'); }
ctx.fillStyle = p; ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
}

// 5x7 sign font
var F = {
A: '01110100011000111111100011000110001', B: '11110100011000111110100011000111110', C: '01111100001000010000100001000001111', D: '11110100011000110001100011000111110',
E: '11111100001000011110100001000011111', G: '01111100001000010011100011000101111', H: '10001100011000111111100011000110001', I: '11111001000010000100001000010011111',
J: '00111000100001000010000101001001100', K: '10001100101010011000101001001010001', L: '10000100001000010000100001000011111', N: '10001110011010110011100011000110001',
O: '01110100011000110001100011000101110', R: '11110100011000111110101001001010001', S: '01111100001000001110000010000111110', T: '11111001000010000100001000010000100',
U: '10001100011000110001100011000101110', V: '10001100011000110001100010101000100', ' ': '00000000000000000000000000000000000'
};
function ptext(x, y, s, col) { for (var i = 0; i < s.length; i++) { var g = F[s[i]] || F[' ']; for (var j = 0; j < 35; j++) if (g[j] === '1') P(x + i * 6 + (j % 5), y + Math.floor(j / 5), col); } }
function sign(cx, y, s, col, border, bg) {
var w = s.length * 6 - 1, x = Math.round(cx - w / 2);
R(x - 4, y - 3, w + 8, 13, bg || K); ctx.strokeStyle = border; ctx.lineWidth = 1; ctx.strokeRect(x - 3.5, y - 2.5, w + 7, 12);
ptext(x, y, s, col); glow(cx, y + 3, w * 0.6, col, 0.12 + NIGHT * 0.22);
}
// 3x5 font for menu boards and tickers
var T3 = { A: '25755', B: '65656', C: '34443', D: '65556', E: '74647', F: '74644', G: '34553', H: '55755', I: '72227', J: '11152', K: '55655', L: '44447', M: '57755', N: '65555', O: '25552', P: '65644', Q: '25563', R: '65655', S: '34216', T: '72222', U: '55557', V: '55552', W: '55775', X: '55255', Y: '55222', Z: '71247', '0': '75557', '1': '26227', '2': '61247', '3': '61216', '4': '55711', '5': '74616', '6': '34656', '7': '71222', '8': '75757', '9': '75711', '.': '00002', '-': '00700', ' ': '00000', '$': '36236', '!': '22202', '*': '05250', '+': '02720', '%': '41241' };
var CLIP0 = -99, CLIP1 = 999;
function tt(x, y, s, c) {
for (var i = 0; i < s.length; i++) {
var cx = x + i * 4; if (cx < CLIP0 - 4 || cx > CLIP1) continue;
var g = T3[s[i]] || T3[' '];
for (var r = 0; r < 5; r++) { var b = +g[r]; if (b & 4) P(cx, y + r, c); if (b & 2) P(cx + 1, y + r, c); if (b & 1) P(cx + 2, y + r, c); }
}
}
var LBL = { wasser: 'WASSER', limo: 'LIMO', eistee: 'EISTEE', smoothie: 'SMOOTHIE', kaffee: 'KAFFEE', eiskaffee: 'EISKAFFEE', bier: 'BIER', radler: 'RADLER', craft: 'CRAFT BEER', weisswein: 'WEISSWEIN', rose: 'ROSE', spritz: 'SPRITZ', champagner: 'CHAMPAGNER', mojito: 'MOJITO', pina: 'PINA COLADA', gintonic: 'GIN TONIC', signature: 'VICE SPECIAL', shots: 'TEQUILA', pommes: 'POMMES', eis: 'EIS', hotdog: 'HOT DOG', nachos: 'NACHOS', bowl: 'POKE BOWL', sushi: 'SUSHI', austern: 'AUSTERN' };
function pr(p) { var r = Math.round(p * 10) / 10; return '$' + (r % 1 ? r.toFixed(1) : String(r)); }

// ---------- palettes ----------
var PAL = [
{ sky: ['#3a4aa0', '#5a6ac8', '#8a8ad8', '#c8a0d8', '#f0b8c0', '#ffd0b0', '#ffe4c0'], sea: '#3a8ac4', seaHi: '#c8e8ff', sand: '#e6c49a', sun: [60, 40], sunC: '#fff0c0', night: 0 },
{ sky: ['#1f5fc0', '#2a72cc', '#3c88d8', '#58a2e4', '#78bcee', '#98d0f4', '#c0e4f8'], sea: '#1f9ad0', seaHi: '#d0f4ff', sand: '#f0d4a4', sun: [150, 10], sunC: '#fffbe0', night: 0 },
{ sky: ['#2a4cb0', '#3a62c4', '#5a7ed4', '#8a92d8', '#c8a8d0', '#f4bca8', '#ffd4a0'], sea: '#2a84c4', seaHi: '#ffe0c8', sand: '#e8c496', sun: [236, 24], sunC: '#fff0b0', night: 0 },
{ sky: ['#24125e', '#46207a', '#782a8c', '#aa378a', '#d7477a', '#fa735a', '#ff965a'], sea: '#5c2c7e', seaHi: '#ffbe64', sand: '#a06a80', sun: [268, 46], sunC: '#ffbe64', night: 0.3 },
{ sky: ['#08061e', '#0c0828', '#120c34', '#180e3e', '#1e1046', '#24124e', '#2c1656'], sea: '#1c1036', seaHi: '#c050a0', sand: '#4a2e5c', sun: null, sunC: '#f0eee0', night: 1 }
];
function palMix(a, b, t) {
var o = { sky: [], night: a.night + (b.night - a.night) * t };
for (var i = 0; i < 7; i++) o.sky.push(mix(hex(a.sky[i]), hex(b.sky[i]), t));
['sea', 'seaHi', 'sand', 'sunC'].forEach(function (k) { o[k] = mix(hex(a[k]), hex(b[k]), t); });
o.sun = a.sun && b.sun ? [a.sun[0] + (b.sun[0] - a.sun[0]) * t, a.sun[1] + (b.sun[1] - a.sun[1]) * t] : (a.sun && t < 0.6 ? [a.sun[0] + 20 * t, a.sun[1] + 30 * t] : null);
return o;
}

var sky = null, NIGHT = 0;
function initStatic() {
var s = 99;
function r() { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; }
sky = { blds: [], dots: [], stars: [] };
var x = 0;
while (x < 150) {
var w = 5 + Math.floor(r() * 6), h = 6 + Math.floor(r() * 16), wins = [];
for (var wy = 2; wy < h - 1; wy += 2) for (var wx = 1; wx < w - 1; wx += 2) if (r() < 0.45) wins.push([wx, wy, Math.floor(r() * 3)]);
sky.blds.push({ x: x, w: w, h: h, wins: wins, ant: r() < 0.2 }); x += w + (r() < 0.3 ? 2 : 0);
}
for (var i = 0; i < 160; i++) sky.dots.push([Math.floor(r() * W), SAND + 3 + Math.floor(r() * (H - SAND - 3)), r() < 0.5]);
for (i = 0; i < 60; i++) sky.stars.push([Math.floor(r() * W), Math.floor(r() * 44)]);
}

var glows = [];
function glow(x, y, r, col, a) { if (a > 0.01) glows.push([x, y, r, hex(col), Math.min(1, a)]); }
function flushGlow() {
ctx.save(); ctx.globalCompositeOperation = 'lighter';
glows.forEach(function (g) { var gr = ctx.createRadialGradient(g[0], g[1], 0, g[0], g[1], g[2]); gr.addColorStop(0, css(g[3], g[4])); gr.addColorStop(1, css(g[3], 0)); ctx.fillStyle = gr; ctx.fillRect(g[0] - g[2], g[1] - g[2], g[2] * 2, g[2] * 2); });
ctx.restore(); glows = [];
}

function backdrop(p, time) {
var bh = HOR / 7;
for (var i = 0; i < 7; i++) R(0, i * bh, W, bh + 1, p.sky[i]);
for (i = 1; i < 7; i++) dith(0, Math.round(i * bh) - 1, W, 2, p.sky[i - 1], p.sky[i]);
if (p.night > 0.3) sky.stars.forEach(function (st, j) { if (((time * 1.5 + j) | 0) % 9) P(st[0], st[1], css([255, 255, 255], p.night * (j % 3 ? 0.6 : 1))); });
if (p.sun) {
var sx = p.sun[0], sy = p.sun[1];
glow(sx, sy, 26, '#ffe8b0', 0.35);
ell(sx - 8, sy - 8, 16, 16, css(p.sunC));
dith(sx - 8, sy - 2, 16, 1, css(p.sunC), p.sky[4]);
if (p.night > 0.1) for (var k = 0; k < 4; k++) R(sx - 8, sy + 1 + k * 2, 16, 1, p.sky[5]);
} else if (p.night > 0.6) { ell(262, 8, 11, 11, '#f0eee0'); ell(266, 6, 10, 10, p.sky[0]); glow(265, 13, 18, '#c0c8ff', 0.15); }
if (p.night < 0.2) { // gulls & a sailboat
for (i = 0; i < 3; i++) { var gx = (i * 97 + time * (6 + i)) % 360 - 20, gy = 18 + i * 7 + Math.sin(time + i) * 2, wf = ((time * 4 + i) | 0) % 2; P(gx, gy, K); P(gx + 1, gy - wf, K); P(gx - 1, gy - wf, K); P(gx + 2, gy - 1 + wf, K); P(gx - 2, gy - 1 + wf, K); }
}
var bc = mix(hex('#7a8ab8'), hex('#2c164a'), Math.min(1, p.night * 1.4 + 0.15)), bc2 = mix(bc, [0, 0, 0], 0.18);
sky.blds.forEach(function (b) {
R(b.x, HOR - b.h, b.w, b.h, bc); R(b.x + b.w - 1, HOR - b.h, 1, b.h, bc2);
if (b.ant) R(b.x + 2, HOR - b.h - 4, 1, 4, bc2);
b.wins.forEach(function (w) { if (p.night > 0.2) P(b.x + w[0], HOR - b.h + w[1], ['#ffd27a', '#ff8ad0', '#9ae8ff'][w[2]]); else if (w[2] === 0) P(b.x + w[0], HOR - b.h + w[1], bc2); });
});
// sea
var sea = p.sea, seaD = mix(p.sea, [0, 0, 0], 0.3);
for (var y = HOR; y < SAND; y += 3) { var t = (y - HOR) / (SAND - HOR); R(0, y, W, 3, mix(sea, seaD, t)); dith(0, y + 2, W, 1, css(mix(sea, seaD, t)), css(mix(sea, seaD, t + 0.15))); }
if (p.sun) for (y = HOR + 1; y < SAND - 2; y += 2) { var ww = 14 - (y - HOR) / 1.6; R(p.sun[0] - ww / 2 + Math.sin(time * 2 + y) * 1.5, y, ww, 1, css(p.seaHi, 0.7)); }
else if (p.night > 0.6) for (y = HOR + 1; y < SAND - 2; y += 2) R(262 + Math.sin(time * 2 + y) * 2, y, 6, 1, css([220, 220, 255], 0.35));
for (i = 0; i < 22; i++) { var wx = ((i * 41 + time * (5 + i % 3)) % 340) - 10; R(wx, HOR + 2 + (i * 5) % 14, 4 + i % 3, 1, css(p.seaHi, 0.35)); }
if (p.night < 0.5) { var bx = (time * 3) % 380 - 30; tri(bx, HOR + 4, bx + 6, HOR - 8, bx + 6, HOR + 4, '#f4f0e8'); tri(bx + 7, HOR + 4, bx + 7, HOR - 5, bx + 11, HOR + 4, '#ffffff'); R(bx - 1, HOR + 4, 13, 2, '#c84040'); }
for (var x = 0; x < W; x += 2) { var fy = SAND - 1 + Math.round(Math.sin(x * 0.15 + time * 1.4) * 0.8); R(x, fy, 2, 1, css([255, 255, 255], 0.6)); }
// sand with dithered depth
var sand = p.sand, wet = mix(sand, [80, 60, 60], 0.25), sandD = mix(sand, [60, 30, 60], 0.18), sandL = mix(sand, [255, 255, 255], 0.12);
R(0, SAND, W, H - SAND, sand);
R(0, SAND, W, 2, wet); dith(0, SAND + 2, W, 2, css(wet), css(sand));
dith(0, H - 22, W, 22, css(sand), css(sandD));
R(0, H - 8, W, 8, sandD);
sky.dots.forEach(function (d) { P(d[0], d[1], d[2] ? sandL : sandD); });
}

// ---------- props ----------
function palm(x, y, h, n, time) {
var tr = n > 0.5 ? ['#24122e', '#1a0c22'] : ['#6a4428', '#4a2c1c'];
for (var j = 0; j < h; j++) { var xx = x + Math.round(Math.sin(j / h * 1.6) * 6); R(xx, y - j, 4, 1, j % 3 ? tr[0] : tr[1]); P(xx + 3, y - j, tr[1]); }
var tx = x + Math.round(Math.sin(1.6) * 6) + 2, ty = y - h, c = n > 0.5 ? '#160a20' : '#1f5a2c', c2 = n > 0.5 ? '#2a1640' : '#3e9448', c3 = n > 0.5 ? '#2a1640' : '#70c060';
var sw = Math.sin(time * 0.9 + x) * 1.2;
[[-16, 7], [-12, -2], [-5, -8], [4, -8], [12, -3], [17, 6], [-8, 10], [9, 10]].forEach(function (f) {
var ex = tx + f[0] + sw, ey = ty + f[1];
line(tx, ty, ex, ey, c); line(tx, ty + 1, ex, ey + 1, c);
line(tx + f[0] * 0.3, ty + f[1] * 0.3 - 1, ex, ey, c2);
for (var k = 0.35; k < 1; k += 0.18) P(tx + f[0] * k + sw * k, ty + f[1] * k + 2, c3);
});
ell(tx - 2, ty, 4, 3, n > 0.5 ? '#1a0c22' : '#5a3a1a'); ell(tx + 1, ty + 1, 3, 3, n > 0.5 ? '#1a0c22' : '#4a2c14');
}
function lounger(x, y, col) {
R(x, y, 18, 2, WH); R(x, y + 2, 18, 1, '#b8b0a8'); R(x - 1, y - 4, 4, 4, WH); P(x - 1, y - 5, WH);
R(x + 4, y, 14, 1, col); R(x + 1, y + 3, 1, 3, '#8a8a96'); R(x + 16, y + 3, 1, 3, '#8a8a96');
}
function umbrella(x, y, c1, c2) {
R(x, y - 22, 1, 22, '#dcdce6'); R(x + 1, y - 22, 1, 22, '#9a9aa8');
for (var i = 0; i < 6; i++) tri(x - 13 + i * 4.5, y - 17 + Math.abs(i - 2.5) * -0.6, x, y - 26, x - 8.5 + i * 4.5, y - 17 + Math.abs(i - 1.5) * -0.6, i % 2 ? c1 : c2);
for (i = 0; i < 27; i += 3) P(x - 13 + i, y - 17, WH);
dith(x - 12, y + 1, 24, 2, 'rgba(0,0,0,0)', 'rgba(60,30,40,0.35)');
}
function stool(x, y, top) { R(x, y, 6, 2, top); R(x + 1, y + 2, 4, 1, shade(top, -0.3)); R(x + 2, y + 3, 1, 7, '#8a8a96'); R(x + 3, y + 3, 1, 7, '#5a5a66'); R(x, y + 9, 6, 1, '#5a5a66'); }
function lights(x0, x1, y, n, time) {
for (var x = x0, i = 0; x < x1; x += 3, i++) {
var t = (x - x0) / (x1 - x0), yy = y + Math.round(Math.sin(t * Math.PI) * 5);
var c = [PINK, Y, CY, OR][i % 4], on = n > 0.2 && ((time * 3 + i) | 0) % 7;
P(x, yy - 1, '#3a3040'); P(x, yy, on ? c : '#c0b0a0');
if (on && i % 2 === 0) glow(x, yy, 5, c, n * 0.5);
}
}
function cabana(x, y, col, occ, time) {
dith(x - 2, y + 26, 34, 3, 'rgba(0,0,0,0)', 'rgba(60,30,40,0.35)');
R(x, y, 30, 26, '#3a2030'); R(x + 3, y + 18, 24, 4, WH); R(x + 3, y + 17, 24, 1, col);
if (occ) lie(x + 6, y + 15, 7, time);
for (var i = 0; i < 4; i++) { R(x + i, y, 1, 26, i % 2 ? '#e8e0e0' : '#fff8f4'); R(x + 26 + i, y, 1, 26, i % 2 ? '#e8e0e0' : '#fff8f4'); }
R(x - 1, y, 1, 27, WOODD); R(x + 30, y, 1, 27, WOODD);
tri(x - 3, y + 1, x + 15, y - 9, x + 33, y + 1, col); for (i = 0; i < 36; i += 2) P(x - 3 + i, y + 1, i % 4 ? WH : col);
}
function pool(x, y, w, h, time, swimmers) {
R(x, y, w, h, '#e8e8f2'); R(x, y + h - 1, w, 1, '#b0b0c0'); R(x + 2, y + 2, w - 4, h - 4, '#2cb8e8');
dith(x + 2, y + 2, w - 4, 3, '#1c90c8', '#2cb8e8'); dith(x + 2, y + h - 5, w - 4, 3, '#2cb8e8', '#5cd8f8');
for (var i = 0; i < 10; i++) { var rx = x + 5 + ((i * 23 + time * 4) % (w - 14)), ry = y + 4 + (i * 7) % (h - 8); R(rx, ry, 4, 1, '#c0f4ff'); }
for (i = 0; i < swimmers; i++) {
var sx = x + 10 + (i * 29) % (w - 20), sy = y + 6 + (i * 11) % (h - 14), bob = Math.round(Math.sin(time * 2 + i));
var sk = SK[(i + 1) % 4]; R(sx - 2, sy + 5 + bob, 9, 1, '#a0ecff');
if (i % 2) { R(sx - 1, sy + bob - 1, 7, 6, HR[i % 5]); }
ell(sx, sy + bob, 5, 5, sk); R(sx, sy + bob, 5, 2, HR[i % 5]); R(sx - 1, sy + 4 + bob, 7, 2, sk); P(sx + 1, sy + 2 + bob, K); P(sx + 3, sy + 2 + bob, K);
}
}
function fireworks(time) {
[[70, 16, PINK], [290, 18, CY], [180, 9, Y], [130, 22, LG]].forEach(function (f, i) {
var ph = (time * 0.6 + i * 0.29) % 1; if (ph > 0.65) return;
var r = 3 + ph * 16;
for (var a = 0; a < 16; a++) { var an = a / 16 * Math.PI * 2; P(f[0] + Math.cos(an) * r, f[1] + Math.sin(an) * r + ph * 4, f[2]); if (a % 2) P(f[0] + Math.cos(an) * r * 0.6, f[1] + Math.sin(an) * r * 0.6, WH); }
glow(f[0], f[1], r + 8, f[2], 0.45 * (1 - ph));
});
}
function djBooth(x, y, on, time, n) {
R(x - 10, y - 18, 8, 20, '#1a1424'); ell(x - 9, y - 15, 6, 6, '#3a3048'); ell(x - 8, y - 6, 4, 4, '#3a3048');
R(x + 28, y - 18, 8, 20, '#1a1424'); ell(x + 29, y - 15, 6, 6, '#3a3048'); ell(x + 30, y - 6, 4, 4, '#3a3048');
if (on) { var a = (time * 6 | 0) % 2; ell(x - 8 + a, y - 14, 4, 4, '#5a4a70'); ell(x + 30 - a, y - 14, 4, 4, '#5a4a70'); }
var sk = SK[2], up = on ? Math.round(Math.sin(time * 8)) : 0;
ell(x + 10, y - 22, 7, 8, sk); R(x + 10, y - 22, 7, 2, '#28181a'); R(x + 9, y - 21, 1, 4, '#222'); R(x + 17, y - 21, 1, 4, '#222'); R(x + 10, y - 23, 7, 1, '#222');
R(x + 9, y - 14, 9, 8, '#1a1a24'); P(x + 13, y - 13, CY);
if (on) { R(x + 6, y - 22 + up, 2, 8, sk); R(x + 19, y - 22 - up, 2, 8, sk); } else { R(x + 7, y - 13, 2, 6, sk); R(x + 18, y - 13, 2, 6, sk); }
R(x - 1, y - 7, 28, 9, '#22202c'); R(x - 1, y - 7, 28, 1, '#6a6880');
ell(x + 2, y - 6, 7, 3, '#0c0c10'); ell(x + 17, y - 6, 7, 3, '#0c0c10');
for (var i = 0; i < 6; i++) { var bh = on ? 1 + ((Math.sin(time * 9 + i * 1.7) + 1) * 2.5 | 0) : 1; R(x + 6 + i * 3, y + 1 - bh, 2, bh, i < 2 ? LG : i < 4 ? Y : PINK); }
ptext(x + 7, y - 31, 'DJ', on ? Y : '#6a6070');
if (on) glow(x + 13, y - 10, 22, [PINK, CY, Y][(time * 2 | 0) % 3], 0.3 + n * 0.3);
}
function aframe(x, y, txt, col, time) {
line(x, y, x + 5, y - 22, WOODD); line(x + 22, y, x + 17, y - 22, WOODD);
R(x + 3, y - 20, 17, 16, '#1e3a2a'); ctx.strokeStyle = WOOD; ctx.strokeRect(x + 2.5, y - 20.5, 18, 17);
var lines = txt.split('|'); for (var i = 0; i < lines.length; i++) tt(x + 11 - lines[i].length * 2, y - 18 + i * 7, lines[i], i ? WH : col);
}

// ---------- people ----------
var SK = ['#f6d4b4', '#e8b08a', '#c88a62', '#8a5a3a'], HR = ['#5a3220', '#e0bc60', '#24161a', '#963c1e', '#f0e0a0'];
var SEG = ['fam', 'surf', 'stud', 'tour', 'party', 'after', 'jet'];
function hsh(i) { var x = (i + 11) * 2654435761 >>> 0; x ^= x >>> 13; x = Math.imul(x, 1274126177) >>> 0; return (x >>> 8) / 16777216; }
function pickSeg(mix, i) {
var r = hsh(i * 3 + 1), acc = 0, keys = SEG.filter(function (k) { return mix[k] > 0; });
for (var j = 0; j < keys.length; j++) { acc += mix[keys[j]]; if (r <= acc) return keys[j]; }
return keys[keys.length - 1] || 'fam';
}
function outfit(seg, v) {
var f = hsh(v * 7 + 3) < (seg === 'surf' ? 0.4 : seg === 'party' ? 0.65 : 0.55), r = hsh(v * 5 + 2);
var o = { f: f, sk: SK[v % 4], hr: HR[(v >> 1) % 5], long: f && r < 0.8 };
var bright = [PINK, CY, Y, RED, VIO, '#ff7a30', '#3c78c8', '#ffffff'];
var c = bright[(v * 3) % bright.length], c2 = bright[(v * 5 + 2) % bright.length];
if (seg === 'fam') { if (f) { o.top = r < 0.5 ? 'one' : 'bik'; o.topC = c; o.bot = 'bik'; o.botC = c; o.hat = r < 0.6 ? 'sun' : 0; o.hatC = '#f0e0b0'; } else { o.top = 'tee'; o.topC = c2; o.bot = 'shorts'; o.botC = '#3c5a8c'; } o.kid = hsh(v + 9) < 0.55; }
else if (seg === 'surf') { if (f) { o.top = 'bik'; o.topC = c; o.bot = 'bik'; o.botC = c; } else { o.top = 0; o.bot = 'board'; o.botC = c2; } o.sk = SK[1 + v % 3]; o.hr = f ? HR[1] : HR[(v % 2) ? 1 : 4]; o.prop = r < 0.55 ? 'surf' : 0; o.propC = c2; }
else if (seg === 'stud') { if (f) { o.top = 'bik'; o.topC = c; o.bot = 'shorts'; o.botC = '#5a7ac8'; } else { o.top = 'tank'; o.topC = c2; o.bot = 'shorts'; o.botC = '#2a2a3a'; o.hat = 'cap'; o.hatC = c; } }
else if (seg === 'tour') { o.sk = r < 0.6 ? '#f4a888' : o.sk; if (f) { o.top = 'dress'; o.topC = ['#ffe070', '#ff9ac0', '#9ad0ff'][v % 3]; o.hat = 'sun'; o.hatC = '#f8f0d0'; } else { o.top = 'hawaii'; o.topC = ['#e04050', '#2a8ad0', '#ff8c3c'][v % 3]; o.bot = 'shorts'; o.botC = '#d8c8a0'; o.prop = 'cam'; o.hat = r < 0.5 ? 'cap' : 0; o.hatC = WH; } o.glasses = r > 0.6; }
else if (seg === 'party') { var neon = [PINK, LG, CY, Y][v % 4]; if (f) { o.top = 'bik'; o.topC = neon; o.bot = 'skirt'; o.botC = '#1a1424'; } else { o.top = 'tank'; o.topC = neon; o.bot = 'shorts'; o.botC = '#1a1424'; } o.prop = 'glow'; o.propC = [CY, PINK, LG][v % 3]; }
else if (seg === 'after') { if (f) { o.top = 'dress'; o.topC = ['#7a1a3a', '#1a5a6a', '#2a2a4a'][v % 3]; } else { o.top = 'shirt'; o.topC = ['#a8c8f0', '#f0f0f0', '#e8b0b0'][v % 3]; o.bot = 'pants'; o.botC = '#c8b48a'; } }
else if (seg === 'jet') { if (f) { o.top = 'dress'; o.topC = '#fcfcfc'; } else { o.top = 'shirt'; o.topC = '#fcfcfc'; o.bot = 'pants'; o.botC = '#f0f0f0'; } o.glasses = 1; o.gold = 1; }
return o;
}
function fig(x, fy, o, time, drink, v) {
var sk = o.sk, sd = shade(sk, -0.22), b = Math.round(Math.sin(time * 2 + v) * 0.5), hy = fy - 27 + b;
x = Math.round(x);
dith(x - 2, fy - 1, 11, 2, 'rgba(0,0,0,0)', 'rgba(50,20,40,0.4)');
if (o.prop === 'surf') { ell(x + 9, fy - 31, 6, 31, '#f8f4ec'); R(x + 11, fy - 30, 2, 29, o.propC); ell(x + 10, fy - 31, 4, 3, WH); }
if (o.long) R(x, hy + 1, 7, 10 + (o.top === 'bik' ? 2 : 0), o.hr);
// legs
R(x + 1, fy - 10, 2, 10, sk); R(x + 4, fy - 10, 2, 10, sk); R(x + 5, fy - 10, 1, 10, sd);
R(x + 1, fy - 1, 2, 1, '#5a3a2a'); R(x + 4, fy - 1, 2, 1, '#5a3a2a');
// torso
R(x, fy - 20, 7, 1, sk); R(x + 1, fy - 19, 5, 8, sk); R(x + 5, fy - 19, 1, 8, sd);
if (o.f) { P(x + 1, fy - 15, shade(sk, -0.1)); P(x + 5, fy - 15, sd); }
// bottoms
var bc = o.botC, bd = bc ? shade(bc, -0.25) : 0;
if (o.bot === 'bik') { R(x + 1, fy - 12, 5, 2, bc); P(x + 3, fy - 10, bc); }
else if (o.bot === 'shorts' || o.bot === 'board') { R(x + 1, fy - 12, 5, 3, bc); R(x + 1, fy - 9, 2, o.bot === 'board' ? 4 : 2, bc); R(x + 4, fy - 9, 2, o.bot === 'board' ? 4 : 2, bc); R(x + 5, fy - 12, 1, 5, bd); if (o.bot === 'board') { P(x + 2, fy - 8, WH); P(x + 4, fy - 10, WH); } }
else if (o.bot === 'skirt') { R(x, fy - 12, 7, 4, bc); P(x + 2, fy - 11, PINK); }
else if (o.bot === 'pants') { R(x + 1, fy - 12, 5, 2, bc); R(x + 1, fy - 10, 2, 9, bc); R(x + 4, fy - 10, 2, 9, bc); R(x + 5, fy - 12, 1, 11, bd); }
// tops
var tc = o.topC, td = tc ? shade(tc, -0.25) : 0;
if (o.top === 'bik') { R(x + 1, fy - 18, 2, 2, tc); R(x + 4, fy - 18, 2, 2, tc); P(x + 3, fy - 18, tc); P(x + 1, fy - 19, tc); P(x + 5, fy - 19, tc); }
else if (o.top === 'one') { R(x + 1, fy - 18, 5, 8, tc); R(x + 5, fy - 18, 1, 8, td); P(x + 3, fy - 17, sk); }
else if (o.top === 'tank') { R(x + 1, fy - 19, 5, 8, tc); R(x + 5, fy - 19, 1, 8, td); P(x + 3, fy - 19, sk); }
else if (o.top === 'tee' || o.top === 'shirt' || o.top === 'hawaii') {
R(x, fy - 20, 7, 9, tc); R(x + 6, fy - 20, 1, 9, td); R(x - 1, fy - 20, 1, 3, tc); R(x + 7, fy - 20, 1, 3, td);
if (o.top === 'shirt') { P(x + 2, fy - 20, WH); P(x + 4, fy - 20, WH); P(x + 3, fy - 19, sk); P(x + 3, fy - 17, td); P(x + 3, fy - 14, td); }
if (o.top === 'hawaii') { P(x + 1, fy - 19, Y); P(x + 4, fy - 18, WH); P(x + 2, fy - 16, Y); P(x + 5, fy - 15, WH); P(x + 1, fy - 13, WH); P(x + 4, fy - 13, Y); }
} else if (o.top === 'dress') {
R(x + 1, fy - 19, 5, 8, tc); R(x + 5, fy - 19, 1, 8, td); P(x + 2, fy - 19, sk); P(x + 4, fy - 19, sk);
R(x, fy - 11, 7, 4, tc); R(x - 1, fy - 7, 9, 2, tc); R(x + 6, fy - 11, 1, 6, td);
}
if (o.gold) { P(x + 3, fy - 19, Y); P(x + 2, fy - 20, Y); P(x + 4, fy - 20, Y); }
if (o.prop === 'cam') { R(x + 2, fy - 17, 3, 2, '#222'); P(x + 3, fy - 17, '#8cf'); line(x + 1, fy - 20, x + 2, fy - 17, '#222'); }
// arms
var armC = (o.top === 'tee' || o.top === 'shirt' || o.top === 'hawaii') ? tc : sk;
R(x - 1, fy - 17, 1, 6, sk); R(x - 1, fy - 20, 1, 3, armC);
if (drink) { R(x + 7, fy - 20, 1, 3, armC === sk ? sd : td); R(x + 7, fy - 18, 2, 1, sk); R(x + 8, fy - 22, 2, 4, drink); P(x + 8, fy - 22, 'rgba(255,255,255,0.7)'); P(x + 9, fy - 23, o.gold ? Y : LG); }
else { R(x + 7, fy - 17, 1, 6, sd); R(x + 7, fy - 20, 1, 3, armC === sk ? sd : td); }
if (o.prop === 'glow') { var gy = fy - 24 + Math.round(Math.sin(time * 6 + v) * 2); R(x - 2, gy, 1, 5, o.propC); glow(x - 2, gy + 2, 7, o.propC, 0.5); }
// head
R(x + 2, fy - 21, 3, 1, sk);
ell(x + 1, hy, 5, 6, sk); P(x + 5, hy + 2, sd); P(x + 5, hy + 3, sd);
R(x + 1, hy, 5, 2, o.hr); P(x + 1, hy + 2, o.hr); if (o.long) { P(x + 5, hy + 2, o.hr); P(x, hy + 2, o.hr); P(x + 6, hy + 2, o.hr); }
if (o.glasses) { R(x + 1, hy + 3, 5, 1, '#0c0c10'); P(x + 2, hy + 3, '#5a5a70'); }
else { P(x + 2, hy + 3, K); P(x + 4, hy + 3, K); }
P(x + 3, hy + 5, shade(sk, -0.35));
if (o.hat === 'sun') { R(x - 1, hy, 9, 1, o.hatC); R(x + 1, hy - 2, 5, 2, o.hatC); R(x + 1, hy - 1, 5, 1, PINK); }
if (o.hat === 'cap') { R(x + 1, hy - 1, 5, 2, o.hatC); R(x + 5, hy, 3, 1, shade(o.hatC, -0.2)); }
}
function kid(x, fy, v, time) {
var sk = SK[v % 4], hr = HR[(v + 1) % 5], c = [Y, LG, PINK, CY][v % 4], j = Math.abs(Math.round(Math.sin(time * 4 + v) * 1));
fy -= j;
R(x + 1, fy - 5, 1, 5, sk); R(x + 3, fy - 5, 1, 5, sk);
R(x, fy - 10, 5, 5, c); R(x + 4, fy - 10, 1, 5, shade(c, -0.25));
R(x - 1, fy - 10, 1, 3, sk); R(x + 5, fy - 11, 1, 3, sk);
R(x + 5, fy - 14, 2, 3, '#e8b060'); ell(x + 5, fy - 16, 3, 3, [PINK, '#ffe0f0', '#8a5030'][v % 3]);
ell(x, fy - 15, 5, 5, sk); R(x, fy - 15, 5, 2, hr); P(x + 1, fy - 13, K); P(x + 3, fy - 13, K);
}
function lie(x, y, v, time) {
var sk = SK[v % 4], hr = HR[(v >> 1) % 5], sw = [PINK, CY, Y, RED, VIO, '#ffffff'][(v >> 2) % 6];
R(x - 1, y - 2, 5, 4, hr); ell(x, y - 2, 4, 4, sk); R(x, y - 2, 2, 4, hr); P(x + 3, y - 1, '#0c0c10');
R(x + 4, y - 1, 13, 2, sk); R(x + 4, y + 1, 13, 1, shade(sk, -0.2));
R(x + 6, y - 2, 3, 1, sw); R(x + 6, y - 1, 3, 1, sw); R(x + 11, y - 1, 3, 2, sw);
if (v % 3 === 0) { R(x + 15, y - 3 - Math.round(Math.abs(Math.sin(time + v))), 1, 2, sk); }
}
function back(x, seatY, o, drink) {
var sk = o.sk, sd = shade(sk, -0.25);
R(x + 1, seatY - 11, 6, 11, sk); R(x + 6, seatY - 11, 1, 11, sd); R(x, seatY - 11, 8, 2, sk);
if (o.top === 'tee' || o.top === 'shirt' || o.top === 'hawaii' || o.top === 'tank' || o.top === 'dress' || o.top === 'one') {
R(x + (o.top === 'tank' || o.top === 'dress' ? 1 : 0), seatY - 11, o.top === 'tank' || o.top === 'dress' ? 6 : 8, 10, o.topC);
if (o.top === 'dress' || o.top === 'one') { R(x + 2, seatY - 11, 4, 3, sk); }
if (o.top === 'hawaii') { P(x + 2, seatY - 9, Y); P(x + 5, seatY - 6, WH); P(x + 3, seatY - 4, Y); }
} else if (o.top === 'bik') R(x + 1, seatY - 8, 6, 1, o.topC);
R(x + 1, seatY - 2, 6, 3, o.botC || o.topC || '#3c5a8c');
if (o.long) { R(x + 1, seatY - 18, 6, 10, o.hr); ell(x + 1, seatY - 19, 6, 6, o.hr); P(x + 2, seatY - 9, o.hr); }
else { R(x + 3, seatY - 13, 2, 2, sk); ell(x + 1, seatY - 19, 6, 7, o.hr); P(x + 1, seatY - 15, sk); }
if (o.hat === 'cap') R(x + 1, seatY - 20, 6, 2, o.hatC);
if (o.hat === 'sun') { R(x - 1, seatY - 19, 10, 1, o.hatC); R(x + 1, seatY - 21, 6, 2, o.hatC); }
if (drink) { R(x + 8, seatY - 10, 1, 4, sk); R(x + 8, seatY - 14, 2, 4, drink); }
}
function silhouette(x, by, v, rim) {
var c = '#0a0410';
ell(x, by - 14, 9, 11, c); ell(x - 5, by - 5, 19, 12, c);
if (hsh(v) < 0.5) { R(x - 1, by - 10, 11, 6, c); }
if (rim) { for (var i = 0; i < 6; i++) P(x + 1 + i, by - 14 + (i === 0 || i === 5 ? 1 : 0), rim); P(x - 3, by - 5, rim); P(x - 2, by - 6, rim); P(x + 11, by - 6, rim); }
}

// ---------- bar interior ----------
function bartender(x, cy, v, s, time, act, n) {
var sk = SK[(v + 2) % 4], hr = HR[(v * 3 + 1) % 5], fem = v % 2 === 1, sd = shade(sk, -0.22);
var uni = [0, ['#e04050', 0], ['#ff8c3c', 'hawaii'], ['#18101e', 'vest'], ['#101018', 'black'], ['#fcfcfc', 'white']][s];
var t = cy - 23;
if (fem) R(x - 1, t + 1, 9, 13, hr);
R(x + 2, t + 8, 3, 2, sk);
R(x - 1, t + 10, 9, cy - t - 10, uni[0]); R(x + 7, t + 10, 1, cy - t - 10, shade(uni[0], uni[0] === '#fcfcfc' ? -0.15 : 0.12));
if (uni[1] === 'vest') { R(x + 2, t + 10, 3, cy - t - 10, WH); P(x + 3, t + 10, PINK); P(x + 2, t + 10, PINK); P(x + 4, t + 10, PINK); }
if (uni[1] === 'hawaii') { P(x, t + 12, Y); P(x + 4, t + 13, WH); P(x + 2, t + 16, Y); P(x + 6, t + 15, WH); P(x + 1, t + 19, WH); P(x + 5, t + 19, Y); }
if (uni[1] === 'black') { P(x + 3, t + 11, CY); R(x + 3, t + 12, 1, 6, '#2a2a38'); }
if (uni[1] === 'white') { P(x + 1, t + 13, Y); P(x + 1, t + 16, Y); P(x + 5, t + 13, Y); P(x + 5, t + 16, Y); P(x + 3, t + 10, '#101018'); }
if (s === 1) { R(x, t + 10, 2, 1, sk); R(x + 5, t + 10, 2, 1, sk); }
ell(x, t, 7, 9, sk); R(x + 6, t + 3, 1, 4, sd);
R(x, t, 7, 2, hr); P(x, t + 2, hr); P(x + 6, t + 2, hr); if (fem) { P(x, t + 3, hr); P(x + 6, t + 3, hr); }
P(x + 2, t + 4, K); P(x + 4, t + 4, K); P(x + 3, t + 7, '#a04848');
if (act === 2) { var sh = Math.round(Math.sin(time * (14 + v)) * 1.5); R(x + 8, t + 6 + sh, 2, 6, sk); R(x + 8, t + 2 + sh, 2, 4, '#d0d4dc'); P(x + 8, t + 2 + sh, WH); R(x - 2, t + 11, 2, 6, sk); }
else if (act === 1) { var pp = Math.round(Math.sin(time * 3 + v) * 2); R(x + 8, t + 12, 2, 4, sk); R(x + 8, t + 9 + pp, 2, 3, '#e8d070'); R(x - 2, t + 11, 2, 7, sk); }
else { var wp = Math.round(Math.sin(time * 1.5 + v) * 3); R(x - 2, t + 12, 2, 6, sk); R(x + 8, t + 14, 2, 5, sk); R(x + 6 + wp, cy - 1, 4, 1, WH); }
}
function shelf(x0, x1, y, menu, n, time) {
R(x0, y + 7, x1 - x0, 1, '#b8c8d8'); R(x0, y + 8, x1 - x0, 1, 'rgba(0,0,0,0.4)');
var drinks = menu.filter(function (m) { return m.cat !== 'food' && m.cat !== 'coffee'; });
if (!drinks.length) drinks = [{ c: '#5a7ac8', cat: 'soft' }];
for (var x = x0 + 2, i = 0; x < x1 - 2; x += 4, i++) {
var m = drinks[(i * 7 + (y | 0)) % drinks.length], c = m.c;
if (m.cat === 'soft') { R(x, y + 4, 2, 3, c); P(x, y + 4, WH); }
else if (m.cat === 'beer') { R(x, y + 2, 2, 5, '#3a6a2a'); P(x, y + 1, '#3a6a2a'); R(x, y + 4, 2, 2, c); }
else if (m.cat === 'wine') { R(x, y + 2, 2, 5, m.k === 'champagner' ? '#1a3a1a' : shade(c, -0.3)); P(x, y, '#c8a040'); P(x, y + 1, shade(c, -0.3)); R(x, y + 4, 2, 2, m.k === 'champagner' ? Y : WH); }
else { R(x, y + 2, 2, 5, c); P(x, y + 1, shade(c, -0.2)); P(x, y, shade(c, -0.4)); }
P(x, y + 3, 'rgba(255,255,255,0.6)');
}
if (n > 0.2) glow((x0 + x1) / 2, y + 4, (x1 - x0) * 0.5, '#ffd8a0', 0.12 * n);
}
function ticker(x, y, w, menu, time, col, closed) {
R(x, y, w, 7, '#0e0610'); R(x, y, w, 1, '#3a2a40'); R(x, y + 7, w, 1, '#3a2a40');
var str = closed ? 'GESCHLOSSEN  *  MORGEN AB 9 UHR  *  ' : menu.map(function (m) { return (LBL[m.k] || '?') + ' ' + pr(m.p); }).join('  *  ') + '  *  ';
var tw = str.length * 4, off = (time * 14) % tw;
CLIP0 = x + 1; CLIP1 = x + w - 2;
ctx.save(); ctx.beginPath(); ctx.rect(x + 1, y, w - 2, 7); ctx.clip();
tt(x + 2 - off, y + 1, str, col); tt(x + 2 - off + tw, y + 1, str, col);
ctx.restore(); CLIP0 = -99; CLIP1 = 999;
glow(x + w / 2, y + 3, w * 0.35, col, 0.12 + NIGHT * 0.2);
}
function board(x, y, menu) {
var rows = Math.min(6, menu.length), w = 48;
R(x - 2, y - 2, w + 4, rows * 6 + 11, WOODD); R(x, y, w, rows * 6 + 7, '#1c3426');
dith(x, y, w, rows * 6 + 7, '#1c3426', '#203a2c');
tt(x + 2, y + 1, 'KARTE', Y);
for (var i = 0; i < rows; i++) { var m = menu[i], lb = (LBL[m.k] || '').slice(0, 7), p = pr(m.p); tt(x + 2, y + 8 + i * 6, lb, WH); tt(x + w - 1 - p.length * 4, y + 8 + i * 6, p, '#ffd8a0'); }
}
function interior(g, p, time, x0, x1, top, cy, wall, s) {
var n = p.night, menu = g.menu, closed = g.phase >= 5;
R(x0, top, x1 - x0, cy - top, wall); dith(x0, top, x1 - x0, 4, shade(wall, -0.3), wall);
var light = closed ? 0.2 : 1;
// boards & shelves
var bx = x0 + 4, hasBoard = (x1 - x0) > 100 && menu.length;
if (hasBoard) board(bx, top + 4, menu);
var sx0 = hasBoard ? bx + 54 : x0 + 4;
shelf(sx0, x1 - 4, top + 3, menu, n * light, time);
if (cy - top > 34) shelf(sx0, x1 - 4, top + 13, menu.slice().reverse(), n * light, time);
// back counter appliances
var bcY = cy - 9, mx = x1 - 14;
if (g.up.kaffee) { R(mx, bcY - 7, 9, 8, '#c8ccd4'); R(mx, bcY - 7, 9, 1, WH); R(mx + 2, bcY - 4, 5, 2, '#1a1a20'); P(mx + 3, bcY - 1, '#6a3a1a'); if (!closed) for (var k = 0; k < 3; k++) P(mx + 3 + k, bcY - 9 - ((time * 6 + k * 2) | 0) % 4, 'rgba(255,255,255,0.6)'); mx -= 12; }
if (g.up.maschine) { R(mx, bcY - 9, 10, 10, '#3a3a48'); R(mx + 1, bcY - 8, 2, 6, PINK); R(mx + 4, bcY - 8, 2, 6, CY); R(mx + 7, bcY - 8, 2, 6, Y); P(mx + 4, bcY, ((time * 3) | 0) % 2 ? LG : '#203020'); }
if (g.up.kueche) { var kx = x0 + (hasBoard ? 4 : (x1 - x0) / 2 - 10), ky = hasBoard ? top + 50 : top + 4; if (cy - ky > 18) { R(kx, ky, 22, 14, '#d8d0c0'); R(kx + 1, ky + 1, 20, 12, '#3a2a20'); if (!closed) { ell(kx + 6, ky + 2, 6, 5, WH); R(kx + 7, ky + 6, 4, 4, SK[1]); R(kx + 5, ky + 10, 8, 3, WH); R(kx + 14, ky + 9, 6, 2, '#a0a0a8'); glow(kx + 11, ky + 8, 10, OR, 0.15); } } }
if (n > 0.3 && !closed) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = css(hex('#ffb070'), 0.07 * n); ctx.fillRect(x0, top, x1 - x0, cy - top); ctx.restore(); }
// bartenders
var bl = hasBoard ? bx + 52 : x0 + 8, br = x1 - 8;
var staff = closed ? 1 : g.staff, maxB = Math.max(1, Math.floor((br - bl) / 15));
var nb = Math.min(staff, maxB), busy = g.occ;
for (var i = 0; i < nb; i++) {
var bxp = bl + (i + 0.5) * ((br - bl) / nb) - 4 + Math.round(Math.sin(time * 0.7 + i * 2) * 3 * busy);
bartender(bxp, cy, i * 3 + s, s, time, closed ? 0 : (i % 2 === 0 && menu.some(function (m) { return m.cat === 'cocktail'; }) ? 2 : 1), n);
}
}
function counterRow(g, p, time, x0, x1, cy, top, front, trim) {
R(x0 - 2, cy, x1 - x0 + 4, 3, top); R(x0 - 2, cy, x1 - x0 + 4, 1, shade(top, 0.3)); R(x0 - 2, cy + 3, x1 - x0 + 4, 1, shade(top, -0.4));
R(x0, cy + 4, x1 - x0, 11, front);
if (front === WOOD) for (var x = x0; x < x1; x += 6) R(x, cy + 4, 1, 11, WOODD);
else dith(x0, cy + 4, x1 - x0, 11, front, shade(front, -0.15));
if (trim) { R(x0, cy + 13, x1 - x0, 1, trim); glow((x0 + x1) / 2, cy + 13, (x1 - x0) * 0.45, trim, 0.15 + p.night * 0.3); }
// taps and glasses on the counter
var menu = g.menu;
if (menu.some(function (m) { return m.cat === 'beer'; })) for (var t = 0; t < 2; t++) { R(x0 + 20 + t * 5, cy - 6, 1, 6, '#c0c4cc'); R(x0 + 19 + t * 5, cy - 8, 3, 2, t ? RED : Y); }
var sold = g.sales || [];
for (var i = 0; i < Math.min(6, Math.round(g.occ * 8)); i++) { var it = sold.length ? sold[i % sold.length] : null; if (!it) break; var gx = x0 + 34 + i * ((x1 - x0 - 50) / 6); R(gx, cy - 3, 2, 3, it); P(gx, cy - 3, 'rgba(255,255,255,0.7)'); }
}
function seats(g, time, x0, x1, cy, stoolC) {
var seatY = cy + 12, pos = [];
for (var x = x0 + 6; x < x1 - 8; x += 13) pos.push(x);
var filled = g.phase >= 5 ? 0 : Math.round(pos.length * Math.min(1, g.occ * 1.2));
pos.forEach(function (x, i) {
stool(x, seatY, stoolC);
var idx = (i * 5) % pos.length;
if (idx < filled) { var v = 50 + i * 3, o = outfit(pickSeg(g.mix, v), v); back(x - 1, seatY, o, hsh(v) < 0.6 ? drinkFor(g, v) : 0); }
});
}
function drinkFor(g, v) { var s = g.sales; if (!s || !s.length) return 0; return s[(v * 7) % s.length]; }

// ---------- spots for standing guests ----------
function spots(s, x0, x1) {
var out = [], i, rows = [102, 122, 144];
var rx = x1 + 10, lx = s >= 4 ? 0 : (s === 1 ? 6 : -1);
rows.forEach(function (fy, r) { for (var x = rx + (r % 2) * 8; x < 314; x += 17) out.push([x, fy + ((x * 7) % 5)]); });
if (lx >= 0 && s === 1) rows.forEach(function (fy, r) { for (var x = 20 + (r % 2) * 9; x < x0 - 14; x += 18) out.push([x, fy + 2]); });
if (s >= 4) for (i = 0; i < 5; i++) out.push([6 + i * 15, 148]);
for (i = out.length - 1; i > 0; i--) { var j = Math.floor(hsh(i * 13) * (i + 1)), t = out[i]; out[i] = out[j]; out[j] = t; }
return out;
}

// ---------- stages ----------
var LAY = [null, [122, 198, 90, 112], [98, 222, 82, 114], [90, 230, 78, 114], [86, 234, 74, 116], [78, 242, 74, 116]];
function drawStage(g, p, time) {
var s = g.stage, up = g.up, n = p.night, L = LAY[s], x0 = L[0], x1 = L[1], top = L[2], cy = L[3], closed = g.phase >= 5;
var people = [], i, cols = [PINK, CY, Y, OR];
// background palms & lights
palm(14, 104, 44, n, time); palm(304, 100, 46, n, time); if (s >= 3) palm(250, 92, 40, n, time);
if (up.licht) { lights(2, x0 - 4, 70, n, time); lights(x1 + 4, 318, 70, n, time); }
// left zone
if (s < 4) {
var lc = s === 1 ? 2 : Math.min(12, 4 + (up.liegen || 0) * 4);
for (i = 0; i < lc; i++) {
var row = Math.floor(i / 4), lx = 6 + (i % 4) * 22 - row * 3, ly = (s === 1 ? 124 : 100) + row * 18;
if (lx + 18 > x0 - 2) continue;
if (i % 2 === 0) umbrella(lx + 20, ly, cols[i % 4], WH);
lounger(lx, ly, cols[(i + 1) % 4]);
if (!closed && hsh(i + 3) < g.occ * 1.1 && g.phase < 4) lie(lx + 2, ly - 2, i * 7 + 3, time);
}
} else {
pool(4, 92, x0 - 12, 30, time, closed ? 0 : Math.round(g.occ * 5 + (g.phase < 3 ? 1 : 0)));
for (i = 0; i < 3; i++) { lounger(8 + i * 22, 138, cols[i]); if (!closed && hsh(i + 20) < g.occ) lie(10 + i * 22, 136, i * 9 + 1, time); }
}
// building per stage
var wall, ctop, cfront, trim, stoolC = Y;
if (s === 1) {
R(x0 - 8, top - 6, x1 - x0 + 16, cy - top + 22, WOOD); for (var x = x0 - 8; x < x1 + 8; x += 5) R(x, top - 6, 1, cy - top + 22, WOODD);
dith(x0 - 8, cy + 10, x1 - x0 + 16, 6, WOOD, WOODD);
tri(x0 - 14, top - 5, (x0 + x1) / 2, top - 18, x1 + 14, top - 5, '#b8b0a8'); for (x = x0 - 12; x < x1 + 12; x += 3) line(x, top - 5, (x0 + x1) / 2 + (x - (x0 + x1) / 2) * 0.1, top - 17, '#9a9290');
R(x0 - 14, top - 5, x1 - x0 + 28, 1, WOODD);
sign((x0 + x1) / 2, top - 15, 'BAR', '#c82828', WOODD, WH);
wall = '#2a1a1a'; ctop = WOODL; cfront = WOOD; trim = 0;
interior(g, p, time, x0, x1, top + 6, cy, wall, s);
ticker(x0, top - 3, x1 - x0, g.menu, time, '#ffb040', closed);
if (up.kuehl) { R(x1 + 12, cy + 4, 16, 12, '#3c78c8'); R(x1 + 12, cy + 4, 16, 3, WH); R(x1 + 14, cy + 8, 4, 1, '#2a5aa0'); }
if (closed) { for (var sy = top + 6; sy < cy; sy += 2) R(x0, sy, x1 - x0, 1, sy % 4 ? '#7a7a84' : '#5a5a64'); }
counterRow(g, p, time, x0, x1, cy, ctop, cfront, trim);
} else if (s === 2) {
R(x0 - 4, top, x1 - x0 + 8, cy - top, '#3c1e46');
R(x0 - 6, top - 2, 3, cy - top + 20, WOODD); R(x1 + 3, top - 2, 3, cy - top + 20, WOODD);
wall = '#3a1e3e'; interior(g, p, time, x0, x1, top + 4, cy, wall, s);
tri(x0 - 18, top + 4, (x0 + x1) / 2, top - 18, x1 + 18, top + 4, THATCH);
for (x = x0 - 16; x < x1 + 18; x += 3) { line(x, top + 4, x + 2, top + 8, THATCHD); P(x + 1, top + 2, THATCHD); }
dith(x0 - 12, top - 2, x1 - x0 + 24, 3, THATCH, THATCHD);
sign((x0 + x1) / 2, top - 10, 'BEACH BAR', CY, CY);
ticker(x0 + 6, top + 5, x1 - x0 - 12, g.menu, time, Y, closed);
if (up.theke) { R(x1 + 14, cy - 20, 30, 34, '#3c1e46'); tri(x1 + 10, cy - 18, x1 + 29, cy - 30, x1 + 48, cy - 18, THATCH); R(x1 + 14, cy, 30, 4, WOODL); R(x1 + 14, cy + 4, 30, 10, WOOD); if (!closed) bartender(x1 + 25, cy, 9, 2, time, 1, n); }
if (up.kuehl) { R(x0 - 26, cy + 4, 14, 12, '#3c78c8'); R(x0 - 26, cy + 4, 14, 3, WH); }
ctop = WOODL; cfront = WOOD; trim = 0;
counterRow(g, p, time, x0, x1, cy, ctop, cfront, trim);
if (closed) for (sy = top + 8; sy < cy; sy += 2) R(x0, sy, x1 - x0, 1, sy % 4 ? '#8a6a4a' : '#6a4a2a');
} else if (s === 3) {
R(x0 - 6, top - 6, x1 - x0 + 12, cy - top + 22, '#2a1240');
wall = '#2c1238'; interior(g, p, time, x0, x1, top + 6, cy, wall, s);
R(x0 - 8, top - 8, x1 - x0 + 16, 3, PINK); R(x0 - 8, top - 8, 2, cy - top + 24, PINK); R(x1 + 6, top - 8, 2, cy - top + 24, PINK);
glow(x0 - 7, cy - 10, 16, PINK, 0.15 + n * 0.3); glow(x1 + 7, cy - 10, 16, PINK, 0.15 + n * 0.3);
sign((x0 + x1) / 2, top - 20, 'COCKTAIL LOUNGE', PINK, PINK);
ticker(x0, top - 3, x1 - x0, g.menu, time, CY, closed);
ctop = PINK; cfront = '#6a1a50'; trim = CY; stoolC = CY;
counterRow(g, p, time, x0, x1, cy, ctop, cfront, trim);
// lounge sofas
R(x1 + 14, 128, 34, 8, WH); R(x1 + 14, 124, 34, 4, '#e8e0e8'); R(x1 + 18, 127, 8, 3, PINK); R(x1 + 36, 127, 8, 3, CY); R(x1 + 15, 136, 2, 3, '#8a8a96'); R(x1 + 45, 136, 2, 3, '#8a8a96');
if (up.djpult) djBooth(x1 + 50, 108, g.dj && !closed, time, n);
} else {
var club = s === 4;
if (!club) {
// upper VIP deck
R(x0 - 4, 34, x1 - x0 + 8, 30, '#22102e'); dith(x0 - 4, 34, x1 - x0 + 8, 30, '#22102e', '#2a1438');
for (x = x0 + 8; x < x1 - 4; x += 22) { R(x, 38, 12, 22, n > 0.3 ? '#b07850' : '#6a8ab8'); dith(x, 38, 12, 22, n > 0.3 ? '#b07850' : '#6a8ab8', n > 0.3 ? '#8a5a40' : '#8aaad0'); }
if (!closed) for (i = 0; i < 6; i++) if (hsh(i + 70) < g.occ + 0.2) { var vv = 90 + i; fig(x0 + 12 + i * 26, 64, outfit('jet', vv), time, i % 2 ? '#fff0a0' : 0, vv); }
R(x0 - 8, 62, x1 - x0 + 16, 4, WH); R(x0 - 8, 66, x1 - x0 + 16, 2, '#9a9aa8');
ctx.fillStyle = 'rgba(160,240,255,0.25)'; ctx.fillRect(x0 - 8, 52, x1 - x0 + 16, 10); R(x0 - 8, 52, x1 - x0 + 16, 1, '#c0f0ff');
R(x0 - 10, 30, x1 - x0 + 20, 4, WH); R(x0 - 10, 34, x1 - x0 + 20, 1, Y);
sign((x0 + x1) / 2, 18, 'VICE BEACH RESORT', Y, Y);
if (up.djpult) djBooth(x1 - 40, 62, g.dj && !closed, time, n);
}
R(x0 - 4, top - 4, x1 - x0 + 8, cy - top + 20, '#1c0c28');
wall = '#1e0c2a'; interior(g, p, time, x0, x1, top + 4, cy, wall, s);
for (x = x0 - 4; x <= x1 + 4; x += 38) R(x, top - 4, 2, cy - top + 20, '#c8ccd4');
R(x0 - 8, top - 8, x1 - x0 + 16, 4, club ? CY : WH); R(x0 - 8, top - 4, x1 - x0 + 16, 1, PINK);
if (club) sign((x0 + x1) / 2, top - 22, 'VICE BEACH CLUB', CY, CY);
ticker(x0 + 2, top, x1 - x0 - 4, g.menu, time, club ? PINK : Y, closed);
ctop = club ? CY : '#f0f0f8'; cfront = club ? '#14202c' : '#2a1838'; trim = club ? PINK : Y; stoolC = club ? PINK : WH;
counterRow(g, p, time, x0, x1, cy, ctop, cfront, trim);
if (up.flamingo) { var fx = x0 - 30, fyy = 100; ctx.strokeStyle = PINK; ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(fx + 8, fyy + 6, 7, 4, 0, 0, 7); ctx.stroke(); line(fx + 3, fyy + 4, fx + 1, fyy - 8, PINK); line(fx + 1, fyy - 8, fx + 4, fyy - 12, PINK); line(fx + 4, fyy - 12, fx + 7, fyy - 10, PINK); line(fx + 8, fyy + 10, fx + 8, fyy + 22, PINK); glow(fx + 6, fyy + 2, 18, PINK, 0.3 + n * 0.5); }
if (up.cabanas) { cabana(x1 + 12, 108, PINK, !closed && g.occ > 0.3, time); cabana(x1 + 46, 108, club ? CY : Y, !closed && g.occ > 0.6, time); }
if (club && up.djpult) djBooth(x1 + 30, 146, g.dj && !closed, time, n);
if (up.feuer && n > 0.6) fireworks(time);
}
if (!closed) seats(g, time, x0, x1, cy, stoolC); else { for (x = x0 + 6; x < x1 - 8; x += 13) stool(x, cy + 12, stoolC); }
// happy hour / best seller board
if (!closed && g.phase < 5) {
var bxp = s >= 4 ? x1 + 2 : x0 - 28;
if (s >= 4 && up.cabanas) bxp = x0 - 26;
if (g.happy) aframe(bxp, 146, 'HAPPY|HOUR|-30%', PINK, time);
else if (g.top) aframe(bxp, 146, 'TOP|' + (LBL[g.top.k] || '').slice(0, 5) + '|' + pr(g.top.p), Y, time);
}
// standing guests
if (!closed) {
var sp = spots(s, x0, x1), cnt = Math.round(Math.min(1, g.occ) * Math.min(sp.length, [0, 12, 16, 20, 22, 24][s]));
if (s >= 4 && up.cabanas) sp = sp.filter(function (q) { return q[0] < x1 + 8 || q[1] > 138; });
for (i = 0; i < Math.min(cnt, sp.length); i++) {
var v = i * 5 + 1, seg = pickSeg(g.mix, v), o = outfit(seg, v);
people.push({ x: sp[i][0], y: sp[i][1], o: o, v: v, d: drinkFor(g, v + 1) && hsh(v + 5) < 0.75 ? drinkFor(g, v + 1) : 0 });
if (o.kid && sp[i][0] + 9 < 316) people.push({ kid: 1, x: sp[i][0] + 9, y: sp[i][1], v: v });
}
}
people.sort(function (a, b) { return a.y - b.y; });
people.forEach(function (q) { if (q.kid) kid(q.x, q.y, q.v, time); else fig(q.x, q.y, q.o, time, q.d, q.v); });
}

function spotlights(g, time, n) {
var beams = g.stage >= 4 ? 4 : 2, cols = [PINK, CY, Y, VIO];
ctx.save(); ctx.globalCompositeOperation = 'lighter';
for (var i = 0; i < beams; i++) {
var ox = [30, 290, 120, 200][i], tx = 160 + Math.sin(time * (0.5 + i * 0.13) + i * 2) * 130, ty = 140, c = hex(cols[i]);
var gr = ctx.createLinearGradient(ox, 0, tx, ty); gr.addColorStop(0, css(c, 0.22 * n)); gr.addColorStop(1, css(c, 0.05 * n));
ctx.fillStyle = gr; ctx.beginPath(); ctx.moveTo(ox - 2, 0); ctx.lineTo(ox + 2, 0); ctx.lineTo(tx + 16, ty); ctx.lineTo(tx - 16, ty); ctx.closePath(); ctx.fill();
glows.push([tx, ty, 18, c, 0.18 * n]);
}
ctx.restore();
}

// ---------- public draw ----------
function draw(c, g, time) {
ctx = c;
if (!sky) initStatic();
g.menu = g.menu || []; g.mix = g.mix || { fam: 0.5, surf: 0.3, stud: 0.2 }; g.up = g.up || {}; g.staff = g.staff == null ? 1 : g.staff; g.occ = g.occ || 0;
var a = PAL[Math.min(4, g.phase)], b = PAL[Math.min(4, g.phase + 1)] || PAL[4];
var p = g.phase >= 5 ? palMix(PAL[4], PAL[4], 0) : palMix(a, b, g.mode === 'run' ? g.t * 0.85 : 0.05);
NIGHT = p.night;
backdrop(p, time);
drawStage(g, p, time);
if (p.night > 0) { ctx.globalAlpha = p.night * 0.38; R(0, SAND - 18, W, H - SAND + 18, '#120626'); ctx.globalAlpha = 1; }
var crowd = g.phase < 5 && g.stage >= 3 && p.night > 0.4 && g.occ > 0.45;
if (g.phase < 5 && g.stage >= 3 && (p.night > 0.4 || g.dj)) spotlights(g, time, Math.max(p.night, g.dj ? 0.6 : 0));
if (crowd) { var k = Math.round((g.occ - 0.45) * 2 * 14); for (var i = 0; i < k; i++) { var sx = 10 + ((i * 47) % 300); silhouette(sx, H + 2 + (i % 3), i, [PINK, CY, Y][i % 3]); } }
flushGlow();
if (g.rain) { for (i = 0; i < 90; i++) { var rx = (i * 53 + time * 120) % 330 - 5, ry = (i * 29 + time * 220) % (H + 10) - 5; line(rx, ry, rx - 1, ry + 5, 'rgba(190,210,255,0.5)'); } }
}

root.BarArt = { draw: draw, W: W, H: H };
})(window);
