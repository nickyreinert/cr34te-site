(function () {
'use strict';
var A = window.AC_ASSETS;
var cv = document.getElementById('game');
var ov = document.getElementById('overlay');
if (!A || !cv || !cv.getContext) return;
var ctx = cv.getContext('2d');
var T = 32, N = 96, L = 84, W = N * T, PI = Math.PI, TAU = PI * 2;
var DX = [1, 0, -1, 0], DY = [0, 1, 0, -1];
var G_GRASS = 0, G_SAND = 1, G_CONC = 2, G_DIRT = 3, G_ROAD = 4, G_SIDE = 5, G_WATER = 6, G_DARK = 7;
var TEXN = ['grass', 'sand', 'conc', 'dirt', 'road', 'side', 'water', 'dark'];
var MMG = [[76, 154, 63], [217, 195, 138], [163, 159, 151], [122, 98, 72], [52, 54, 60], [143, 146, 153], [42, 111, 176], [77, 70, 86]];
var DIST = [
  { n: 'Downtown', g: G_CONC, b: [96, 108, 128] },
  { n: 'Garden Heights', g: G_GRASS, b: [176, 84, 62] },
  { n: 'Rust Belt', g: G_DIRT, b: [110, 84, 60] },
  { n: 'City Park', g: G_GRASS, b: [40, 110, 50] },
  { n: 'Neon Quarter', g: G_DARK, b: [170, 60, 150] },
  { n: 'Harbor', g: G_CONC, b: [70, 90, 100] },
  { n: 'Dune Flats', g: G_SAND, b: [150, 125, 85] }
];

// ---------- helpers
var seed = Math.floor(Math.random() * 2147483646) + 1;
function rnd() { seed = seed * 48271 % 2147483647; return (seed - 1) / 2147483646; }
function ri(a, b) { return a + Math.floor(rnd() * (b - a + 1)); }
function pick(a) { return a[Math.floor(rnd() * a.length)]; }
function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
function hyp(x, y) { return Math.sqrt(x * x + y * y); }
function angd(a, b) { var d = (a - b) % TAU; if (d > PI) d -= TAU; if (d < -PI) d += TAU; return d; }
function idx(x, y) { return x + y * N; }
function inb(x, y) { return x >= 0 && y >= 0 && x < N && y < N; }
function hx(s) { return [parseInt(s.substr(1, 2), 16), parseInt(s.substr(3, 2), 16), parseInt(s.substr(5, 2), 16)]; }
function mul(c, f) { return [clamp(Math.round(c[0] * f), 0, 255), clamp(Math.round(c[1] * f), 0, 255), clamp(Math.round(c[2] * f), 0, 255)]; }
function rgb(c, f) { var m = mul(c, f); return 'rgb(' + m[0] + ',' + m[1] + ',' + m[2] + ')'; }
function b64(s) { var b = atob(s), u = new Uint8Array(b.length); for (var i = 0; i < b.length; i++) u[i] = b.charCodeAt(i); return u; }

// ---------- sprites (base64 palette images)
var PAL = A.pal.map(function (h) { return hx('#' + h); });
var RAW = {};
Object.keys(A.spr).forEach(function (k) { var s = A.spr[k]; RAW[k] = { w: s[0], h: s[1], d: b64(s[2]) }; });
var sprCache = {};
function spr(name, tint, key) {
  var id = name + (key || ''), c = sprCache[id];
  if (c) return c;
  var s = RAW[name];
  c = document.createElement('canvas'); c.width = s.w; c.height = s.h;
  var g = c.getContext('2d'), im = g.createImageData(s.w, s.h), d = im.data;
  for (var i = 0; i < s.d.length; i++) {
    var p = s.d[i]; if (!p) continue;
    var col = (tint && tint[p]) || PAL[p];
    d[i * 4] = col[0]; d[i * 4 + 1] = col[1]; d[i * 4 + 2] = col[2]; d[i * 4 + 3] = 255;
  }
  g.putImageData(im, 0, 0);
  sprCache[id] = c; return c;
}
var CARCOL = ['#c83232', '#2f6fd0', '#e0b020', '#2f9a55', '#e8e8e8', '#30323a', '#d8702a', '#8a4fb0', '#3aa0a8'].map(hx);
var SHIRT = ['#3070c0', '#c04040', '#40a060', '#d0a030', '#8050b0', '#e0e0e0', '#404858', '#d06a9a', '#e07a30'].map(hx);
var HAIR = ['#3a2a1a', '#1a1a1a', '#b08040', '#7a3a1a', '#c8c8c8'].map(hx);
function carSpr(type, ci) {
  if (type === 'police') return spr('police');
  var c = CARCOL[ci]; return spr(type, { 1: c, 2: mul(c, 0.68), 3: mul(c, 1.25) }, 'c' + ci);
}
function pedSpr(f, si, hi) {
  var c = SHIRT[si]; return spr('ped' + f, { 11: c, 12: mul(c, 0.7), 13: HAIR[hi] }, 's' + si + 'h' + hi);
}
var PLAYER_TINT = { 11: [245, 197, 24], 12: [170, 130, 10], 13: [26, 26, 26] };
function plSpr(f) { return spr('ped' + f, PLAYER_TINT, 'pl'); }
var GANG_TINT = { 11: [44, 44, 52], 12: [22, 22, 28], 13: [190, 30, 44] };
function gangSpr(f) { return spr('ped' + f, GANG_TINT, 'gang'); }
var CARTYPES = {
  sedan: { max: 300, acc: 250, turn: 2.9, hp: 100 },
  taxi: { max: 300, acc: 250, turn: 2.9, hp: 100 },
  sport: { max: 395, acc: 340, turn: 3.2, hp: 80 },
  van: { max: 240, acc: 190, turn: 2.4, hp: 150 },
  police: { max: 285, acc: 225, turn: 2.7, hp: 130 }
};

// ---------- world
var tile = new Uint8Array(N * N), solid = new Uint8Array(N * N), lane = new Uint8Array(N * N),
  deco = new Uint8Array(N * N), dist = new Uint8Array(N * N);
var buildings = [], mm = null, startTile = [40, 48];

function addB(x, y, w, h, ht, st, inset, col) {
  for (var yy = y; yy < y + h; yy++) for (var xx = x; xx < x + w; xx++) { solid[idx(xx, yy)] = 1; deco[idx(xx, yy)] = 0; }
  buildings.push({
    x: x * T + inset, y: y * T + inset, w: w * T - inset * 2, h: h * T - inset * 2, ht: ht, st: st,
    roof: rgb(col, 1), hi: rgb(col, 1.22), lo: rgb(col, 0.8), w1: rgb(col, 0.56), w2: rgb(col, 0.4), r: rnd(), d: 0
  });
}
function lot(x, y) { if (!inb(x, y)) return false; var i = idx(x, y), t = tile[i]; return !solid[i] && !deco[i] && t !== G_ROAD && t !== G_SIDE && t !== G_WATER; }
function chunksOf(n) {
  var o = [];
  while (n > 0) { var c = n <= 3 ? n : ri(2, 3); if (n - c === 1) c = 2; o.push(c); n -= c; }
  return o;
}
var COLS = {
  tower: ['#7d8794', '#6b7686', '#8e9aa6', '#59657a', '#9aa0a8', '#4f6f8f'].map(hx),
  neon: ['#b03060', '#7a3fa0', '#c9a227', '#2a8f8f', '#d0503a', '#3b3f8f'].map(hx),
  house: ['#b5523b', '#a8432f', '#7a5a44', '#56708a', '#8c8c6a', '#c07850'].map(hx),
  ware: ['#7f6a55', '#8a8f93', '#6e7f6a', '#93705a', '#5f6a75'].map(hx),
  cont: ['#c0392b', '#2d6fb3', '#e0a020', '#2f8f4f', '#d06a20'].map(hx),
  shack: ['#9a8468', '#b29a72', '#8a6f52'].map(hx)
};
function fillBlock(d, ix, iy, iw, ih) {
  var x, y, i, j;
  if (iw < 1 || ih < 1) return;
  if (d === 0) {
    if (rnd() < 0.12 || iw < 2 || ih < 2) {
      for (y = iy; y < iy + ih; y++) for (x = ix; x < ix + iw; x++) if (rnd() < 0.1) { deco[idx(x, y)] = 1; solid[idx(x, y)] = 2; }
    } else if (Math.max(iw, ih) >= 6) {
      if (iw >= ih) { var a = Math.floor((iw - 1) / 2); addB(ix, iy, a, ih, 0.3 + rnd() * 0.3, 'tower', 0, pick(COLS.tower)); addB(ix + a + 1, iy, iw - a - 1, ih, 0.3 + rnd() * 0.3, 'tower', 0, pick(COLS.tower)); }
      else { var b = Math.floor((ih - 1) / 2); addB(ix, iy, iw, b, 0.3 + rnd() * 0.3, 'tower', 0, pick(COLS.tower)); addB(ix, iy + b + 1, iw, ih - b - 1, 0.3 + rnd() * 0.3, 'tower', 0, pick(COLS.tower)); }
    } else addB(ix, iy, iw, ih, 0.3 + rnd() * 0.3, 'tower', 0, pick(COLS.tower));
  } else if (d === 4) {
    var cxs = chunksOf(iw), cys = chunksOf(ih); y = iy;
    for (j = 0; j < cys.length; j++) {
      x = ix;
      for (i = 0; i < cxs.length; i++) { if (rnd() > 0.1) addB(x, y, cxs[i], cys[j], 0.12 + rnd() * 0.2, 'neon', 0, pick(COLS.neon)); x += cxs[i]; }
      y += cys[j];
    }
  } else if (d === 1) {
    for (y = iy; y + 2 <= iy + ih; y += 3) for (x = ix; x + 2 <= ix + iw; x += 3) {
      if (rnd() < 0.82) addB(x, y, 2, 2, 0.09 + rnd() * 0.04, 'house', 3, pick(COLS.house));
    }
    for (y = iy; y < iy + ih; y++) for (x = ix; x < ix + iw; x++) if (lot(x, y) && rnd() < 0.18) { deco[idx(x, y)] = 1; solid[idx(x, y)] = 2; }
  } else if (d === 2 || d === 5) {
    if (rnd() > 0.2 && iw >= 3 && ih >= 3) {
      var ww = Math.max(3, iw - ri(0, 2)), hh = Math.max(3, ih - ri(0, 2));
      addB(ix + (rnd() < 0.5 ? 0 : iw - ww), iy + (rnd() < 0.5 ? 0 : ih - hh), ww, hh, 0.14 + rnd() * 0.08, 'ware', 0, pick(COLS.ware));
    }
    for (y = iy; y < iy + ih; y++) for (x = ix; x < ix + iw; x++) if (lot(x, y) && rnd() < 0.22) {
      if (x + 1 < ix + iw && lot(x + 1, y) && rnd() < 0.7) addB(x, y, 2, 1, 0.05, 'cont', 2, pick(COLS.cont));
      else addB(x, y, 1, 1, 0.05, 'cont', 2, pick(COLS.cont));
    }
  } else if (d === 3) {
    var pond = rnd() < 0.5 && iw >= 4 && ih >= 4;
    for (y = iy - 2; y < iy + ih + 2; y++) for (x = ix - 2; x < ix + iw + 2; x++) {
      if (!lot(x, y)) continue;
      var ex = (x + 0.5 - ix - iw / 2) / (iw * 0.33), ey = (y + 0.5 - iy - ih / 2) / (ih * 0.33);
      if (pond && ex * ex + ey * ey < 1) tile[idx(x, y)] = G_WATER;
      else if (rnd() < 0.26) { deco[idx(x, y)] = 1; solid[idx(x, y)] = 2; }
    }
  } else {
    for (y = iy; y < iy + ih; y++) for (x = ix; x < ix + iw; x++) {
      if (!lot(x, y)) continue;
      var r = rnd();
      if (r < 0.07) addB(x, y, 1, 1, 0.07, 'shack', 2, pick(COLS.shack));
      else if (r < 0.13) { deco[idx(x, y)] = 2; solid[idx(x, y)] = 2; }
      else if (r < 0.2) { deco[idx(x, y)] = 3; solid[idx(x, y)] = 2; }
    }
  }
}
function axisRoads(end) {
  var a = [1], last = 1;
  while (last + 19 <= end) { last += ri(8, 12); a.push(last); }
  if (end - last > 13) { last += Math.floor((end - last) / 2); a.push(last); }
  a.push(end); return a;
}
function gen() {
  var x, y, i, j, k;
  var seeds = [{ x: 40, y: 48, t: 0 }, { x: L - 6, y: ri(22, 74), t: 5 }];
  var ts = [1, 2, 3, 4, 6, 1], off = rnd() * TAU;
  for (i = ts.length - 1; i > 0; i--) { j = Math.floor(rnd() * (i + 1)); k = ts[i]; ts[i] = ts[j]; ts[j] = k; }
  for (i = 0; i < ts.length; i++) {
    var an = off + i * TAU / ts.length + (rnd() - 0.5) * 0.5, rr = 27 + rnd() * 9;
    seeds.push({ x: clamp(40 + Math.cos(an) * rr, 6, L - 14), y: clamp(48 + Math.sin(an) * rr, 6, N - 6), t: ts[i] });
  }
  var p1 = rnd() * TAU, p2 = rnd() * TAU;
  for (y = 0; y < N; y++) for (x = 0; x < N; x++) {
    var wx = x + 3 * Math.sin(y * 0.33 + p1), wy = y + 3 * Math.sin(x * 0.29 + p2), bd = 1e9, bt = 0;
    for (i = 0; i < seeds.length; i++) { var dd = (wx - seeds[i].x) * (wx - seeds[i].x) + (wy - seeds[i].y) * (wy - seeds[i].y); if (dd < bd) { bd = dd; bt = seeds[i].t; } }
    dist[idx(x, y)] = bt;
  }
  var xs = axisRoads(L - 2), ys = axisRoads(N - 3);
  function keep(d, rim) { return rim || rnd() > (d === 3 ? 0.6 : d === 6 ? 0.3 : 0.12); }
  for (i = 0; i < xs.length; i++) for (j = 0; j < ys.length - 1; j++) {
    var my = Math.floor((ys[j] + ys[j + 1]) / 2);
    if (!keep(dist[idx(xs[i], my)], i === 0 || i === xs.length - 1)) continue;
    for (y = ys[j]; y <= ys[j + 1] + 1; y++) { lane[idx(xs[i], y)] |= 2; lane[idx(xs[i] + 1, y)] |= 8; }
  }
  for (j = 0; j < ys.length; j++) for (i = 0; i < xs.length - 1; i++) {
    var mx = Math.floor((xs[i] + xs[i + 1]) / 2);
    if (!keep(dist[idx(mx, ys[j])], j === 0 || j === ys.length - 1)) continue;
    for (x = xs[i]; x <= xs[i + 1] + 1; x++) { lane[idx(x, ys[j])] |= 4; lane[idx(x, ys[j] + 1)] |= 1; }
  }
  for (y = 0; y < N; y++) for (x = 0; x < N; x++) {
    i = idx(x, y);
    if (lane[i]) { tile[i] = G_ROAD; continue; }
    if (x > L) {
      var bx = L + 3 + Math.round(1.6 * Math.sin(y * 0.21 + p1) + 1.2 * Math.sin(y * 0.07 + p2));
      tile[i] = x < bx ? G_SAND : G_WATER;
      if (tile[i] === G_SAND && rnd() < 0.07) { deco[i] = 2; solid[i] = 2; }
      continue;
    }
    var adj = false;
    for (k = 0; k < 9 && !adj; k++) { var ax = x + k % 3 - 1, ay = y + Math.floor(k / 3) - 1; if (inb(ax, ay) && lane[idx(ax, ay)]) adj = true; }
    tile[i] = adj ? G_SIDE : DIST[dist[i]].g;
  }
  for (y = 6; y < N - 8; y++) {
    if (dist[idx(L - 4, y)] === 5 && rnd() < 0.5) {
      for (x = L + 1; x <= L + 9; x++) for (k = 0; k < 2; k++) { i = idx(x, y + k); tile[i] = G_CONC; deco[i] = 0; solid[i] = 0; }
      y += 6;
    }
  }
  for (i = 0; i < xs.length - 1; i++) for (j = 0; j < ys.length - 1; j++) {
    var ix = xs[i] + 3, iy = ys[j] + 3, iw = xs[i + 1] - xs[i] - 4, ih = ys[j + 1] - ys[j] - 4;
    fillBlock(dist[idx(ix + (iw >> 1), iy + (ih >> 1))], ix, iy, iw, ih);
  }
  // minimap
  mm = document.createElement('canvas'); mm.width = N; mm.height = N;
  var g = mm.getContext('2d'), im = g.createImageData(N, N), d = im.data;
  for (i = 0; i < N * N; i++) {
    var c = solid[i] === 1 ? DIST[dist[i]].b : deco[i] ? [38, 110, 48] : MMG[tile[i]];
    d[i * 4] = c[0]; d[i * 4 + 1] = c[1]; d[i * 4 + 2] = c[2]; d[i * 4 + 3] = 255;
  }
  g.putImageData(im, 0, 0);
  // start position: nearest sidewalk to the centre
  var bestD = 1e9;
  for (y = 30; y < 66; y++) for (x = 22; x < 58; x++) if (tile[idx(x, y)] === G_SIDE) {
    var q = (x - 40) * (x - 40) + (y - 48) * (y - 48); if (q < bestD) { bestD = q; startTile = [x, y]; }
  }
}
function solidAt(x, y) {
  if (x < 0 || y < 0 || x >= W || y >= W) return true;
  var tx = Math.floor(x / T), ty = Math.floor(y / T), s = solid[tx + ty * N];
  if (s === 1) return true;
  if (s === 2) { var dx = x - (tx + 0.5) * T, dy = y - (ty + 0.5) * T; return dx * dx + dy * dy < 81; }
  return false;
}
function tileAt(x, y) { if (x < 0 || y < 0 || x >= W || y >= W) return G_SIDE; return tile[Math.floor(x / T) + Math.floor(y / T) * N]; }

// ---------- ground chunks
var CH = 8, CS = CH * T, NC = N / CH, chunkMap = new Map(), TEX = [];
function getChunk(cx, cy) {
  var k = cx + cy * 64, c = chunkMap.get(k);
  if (c) return c;
  c = document.createElement('canvas'); c.width = c.height = CS;
  var g = c.getContext('2d'); g.imageSmoothingEnabled = false;
  for (var ty = 0; ty < CH; ty++) for (var tx = 0; tx < CH; tx++) {
    var i = idx(cx * CH + tx, cy * CH + ty), t = tile[i], m = lane[i];
    g.drawImage(TEX[t], tx * T, ty * T, T, T);
    if (t === G_ROAD) {
      g.fillStyle = '#d9d6b8';
      if (m === 2) { g.fillRect(tx * T + T - 1, ty * T + 3, 1, 10); g.fillRect(tx * T + T - 1, ty * T + 19, 1, 10); }
      else if (m === 8) { g.fillRect(tx * T, ty * T + 3, 1, 10); g.fillRect(tx * T, ty * T + 19, 1, 10); }
      else if (m === 4) { g.fillRect(tx * T + 3, ty * T + T - 1, 10, 1); g.fillRect(tx * T + 19, ty * T + T - 1, 10, 1); }
      else if (m === 1) { g.fillRect(tx * T + 3, ty * T, 10, 1); g.fillRect(tx * T + 19, ty * T, 10, 1); }
    }
  }
  if (chunkMap.size > 56) chunkMap.delete(chunkMap.keys().next().value);
  chunkMap.set(k, c); return c;
}

// ---------- audio (base64 PCM)
var AC = null, master = null, bufs = {}, engSrc = null, engGain = null, sirGain = null, muted = false;
function loopSrc(name) {
  var s = AC.createBufferSource(), g = AC.createGain();
  s.buffer = bufs[name]; s.loop = true; g.gain.value = 0; s.connect(g); g.connect(master); s.start(0);
  return [s, g];
}
function initAudio() {
  if (AC) { try { if (AC.state === 'suspended') AC.resume(); } catch (e) { } return; }
  try {
    var C = window.AudioContext || window.webkitAudioContext; if (!C) return;
    AC = new C(); master = AC.createGain(); master.gain.value = muted ? 0 : 0.6; master.connect(AC.destination);
    Object.keys(A.snd).forEach(function (k) {
      var u = b64(A.snd[k]), n = u.length, buf = AC.createBuffer(1, n * 3, A.rate * 3), ch = buf.getChannelData(0);
      for (var i = 0; i < n; i++) {
        var a = (u[i] - 128) / 128, b = (u[(i + 1) % n] - 128) / 128;
        ch[i * 3] = a; ch[i * 3 + 1] = a + (b - a) / 3; ch[i * 3 + 2] = a + (b - a) * 2 / 3;
      }
      bufs[k] = buf;
    });
    var e = loopSrc('engine'); engSrc = e[0]; engGain = e[1];
    sirGain = loopSrc('siren')[1];
    if (AC.state === 'suspended') AC.resume();
  } catch (err) { AC = null; }
}
function sfx(name, vol, rate) {
  if (!AC || muted || !bufs[name]) return;
  try {
    var s = AC.createBufferSource(), g = AC.createGain();
    s.buffer = bufs[name]; s.playbackRate.value = rate || 1; g.gain.value = vol == null ? 1 : vol;
    s.connect(g); g.connect(master); s.start(0);
  } catch (e) { }
}
function sfxAt(name, x, y, vol, rate) {
  var v = (vol || 1) * Math.max(0, 1 - hyp(x - cam.x, y - cam.y) / 620);
  if (v > 0.03) sfx(name, v, rate);
}

// ---------- state
var cars = [], peds = [], bullets = [], parts = [], decals = [], pickups = [];
var player = { x: 0, y: 0, a: -PI / 2, hp: 100, car: null, weapon: 0, ammo: 0, cool: 0, walk: 0, dead: false, flash: 0, shootT: 0 };
var cam = { x: 0, y: 0, z: 1 }, baseZ = 1, PR = 1;
var time = 0, cash = 0, heat = 0, wanted = 0, crimeT = 0, bustT = 0, kills = 0, best = 0;
var over = { t: 0, msg: '', sub: '' }, banner = { t: 0, txt: '' }, note = { t: 0, txt: '' }, curDist = -1, mission = null;
var started = false, paused = false, spawnR = 600;
try { best = parseInt(localStorage.getItem('asphaltkiez_best') || '0', 10) || 0; } catch (e) { best = 0; }
function saveBest() { if (cash > best) { best = cash; try { localStorage.setItem('asphaltkiez_best', String(best)); } catch (e) { } } }
function say(t) { note.txt = t; note.t = 3; }
var polT = 0, steerMode = 0, steerSet = false, jobs = 0, lastJob = '';
var JOBS = ['deliver', 'gang', 'steal', 'taxi', 'courier', 'van'];
var RANKS = [[0, 'Errand Boy'], [2, 'Henchman'], [4, 'Bruiser'], [7, 'Enforcer'], [10, 'Lieutenant'], [14, 'Underboss'], [19, 'Kingpin']];
try { var sm = localStorage.getItem('asphaltkiez_steer'); if (sm === '0' || sm === '1') { steerMode = +sm; steerSet = true; } } catch (e) { }
function rank() { var r = 0; for (var i = 0; i < RANKS.length; i++) if (jobs >= RANKS[i][0]) r = i; return r; }
function steerLabel() { return steerMode ? 'Steering: screen direction (left = drive left)' : 'Steering: driver view (left = turn left)'; }
function showSteer() { var b = document.getElementById('steer'); if (b) b.textContent = steerLabel(); }
function toggleSteer() {
  steerMode = steerMode ? 0 : 1; steerSet = true;
  try { localStorage.setItem('asphaltkiez_steer', String(steerMode)); } catch (e) { }
  showSteer(); if (started) say(steerMode ? 'Steering: screen direction' : 'Steering: driver view');
}
function enableTouch() { if (touchUI) return; touchUI = true; document.body.className = 'touch'; if (!steerSet) { steerMode = 1; showSteer(); } }

// ---------- input
var keys = {}, eBuf = 0, mouse = { x: 0, y: 0, wx: 0, wy: 0, down: false, t: -99 };
var stick = { id: -1, ox: 0, oy: 0, x: 0, y: 0 }, tFire = false, touchUI = false;
var KEYMAP = { w: 'KeyW', a: 'KeyA', s: 'KeyS', d: 'KeyD', e: 'KeyE', f: 'KeyF', q: 'KeyQ', m: 'KeyM', p: 'KeyP', c: 'KeyC', ' ': 'Space', '1': 'Digit1', '2': 'Digit2' };
function codeOf(e) { if (e.code) return e.code; var k = e.key || ''; return KEYMAP[k.toLowerCase()] || k; }
function startGame() {
  initAudio();
  if (!started) { started = true; ov.className = 'hidden'; say('Grab a car: E or right click'); }
  try { window.focus(); cv.focus(); } catch (e) { }
}
function switchWeapon(w) {
  if (w == null) w = player.weapon ? 0 : 1;
  if (w === 1 && player.ammo <= 0) { say('No SMG ammo'); w = 0; }
  player.weapon = w;
}
window.addEventListener('keydown', function (e) {
  var c = codeOf(e);
  if (c === 'Space' || c.indexOf('Arrow') === 0 || c === 'Tab') e.preventDefault();
  keys[c] = true;
  if (!started) { startGame(); return; }
  if (e.repeat) return;
  if (c === 'KeyE' || c === 'KeyF' || c === 'Enter') eBuf = 0.7;
  else if (c === 'KeyQ' || c === 'Tab') switchWeapon();
  else if (c === 'Digit1') switchWeapon(0);
  else if (c === 'Digit2') switchWeapon(1);
  else if (c === 'KeyM') { muted = !muted; if (master) master.gain.value = muted ? 0 : 0.6; say(muted ? 'Sound off' : 'Sound on'); }
  else if (c === 'KeyC') toggleSteer();
  else if (c === 'KeyP') paused = !paused;
});
window.addEventListener('keyup', function (e) { keys[codeOf(e)] = false; });
window.addEventListener('blur', function () { keys = {}; mouse.down = false; stick.id = -1; stick.x = stick.y = 0; tFire = false; });
function setMouse(e) { mouse.x = e.clientX * PR; mouse.y = e.clientY * PR; mouse.t = time; }
cv.addEventListener('pointerdown', function (e) {
  if (e.pointerType === 'touch') e.preventDefault();
  if (!started) { startGame(); return; }
  initAudio();
  try { cv.focus(); } catch (er) { }
  if (e.pointerType === 'touch') {
    enableTouch();
    if (stick.id < 0) { stick.id = e.pointerId; stick.ox = e.clientX; stick.oy = e.clientY; stick.x = stick.y = 0; }
  } else {
    setMouse(e);
    if (e.button === 2) eBuf = 0.7; else if (e.button === 0) mouse.down = true;
  }
  try { cv.setPointerCapture(e.pointerId); } catch (er) { }
});
cv.addEventListener('pointermove', function (e) {
  if (e.pointerType === 'touch') {
    if (e.pointerId === stick.id) {
      var dx = (e.clientX - stick.ox) / 42, dy = (e.clientY - stick.oy) / 42, l = hyp(dx, dy);
      if (l > 1) { dx /= l; dy /= l; }
      stick.x = dx; stick.y = dy;
    }
  } else setMouse(e);
});
function pUp(e) {
  if (e.pointerType === 'touch') { if (e.pointerId === stick.id) { stick.id = -1; stick.x = stick.y = 0; } }
  else if (e.button === 0 || e.type === 'pointercancel') mouse.down = false;
}
cv.addEventListener('pointerup', pUp);
cv.addEventListener('pointercancel', pUp);
cv.addEventListener('contextmenu', function (e) { e.preventDefault(); });
ov.addEventListener('pointerdown', function (e) {
  if (e.pointerType === 'touch') enableTouch();
  startGame();
});
ov.addEventListener('click', startGame);
function bindBtn(id, down, up) {
  var b = document.getElementById(id); if (!b) return;
  b.addEventListener('pointerdown', function (e) { e.preventDefault(); b.className = 'on'; initAudio(); down(); });
  var u = function (e) { e.preventDefault(); b.className = ''; if (up) up(); };
  b.addEventListener('pointerup', u); b.addEventListener('pointercancel', u); b.addEventListener('pointerleave', u);
  b.addEventListener('contextmenu', function (e) { e.preventDefault(); });
}
bindBtn('bE', function () { eBuf = 0.7; });
bindBtn('bF', function () { tFire = true; }, function () { tFire = false; });

// ---------- entities
function newCar(type, x, y, a, ci) {
  var s = RAW[type];
  return {
    type: type, t: CARTYPES[type], pol: type === 'police', x: x, y: y, a: a, vx: 0, vy: 0, s: 0, hp: CARTYPES[type].hp,
    ci: ci, hw: s.w, hl: s.h, ai: null, chase: false, driver: null, burn: false, fire: 0, dead: false, byP: false,
    wait: 0, honked: false, stuck: 0, revT: 0, shootT: 1, panic: false
  };
}
function newPed(x, y) {
  return { x: x, y: y, a: rnd() * TAU, tx: x, ty: y, dir: ri(0, 3), sp: 26 + rnd() * 22, state: 0, fleeT: 0, si: ri(0, SHIRT.length - 1), hi: ri(0, HAIR.length - 1), t: rnd() * 9, dead: false, g: false, hp: 1, hostile: false, cool: 0.6, m: false, wait: false };
}
function makeGang(p, hostile) { p.g = true; p.hp = 2; p.hostile = hostile; p.sp = 30; return p; }
function provoke(x, y, r) {
  for (var i = 0; i < peds.length; i++) { var p = peds[i]; if (p.g && Math.abs(p.x - x) < r && Math.abs(p.y - y) < r) p.hostile = true; }
}
function puff(x, y, n, col, spd, life, size) {
  for (var i = 0; i < n && parts.length < 320; i++) {
    var a = rnd() * TAU, s = spd * (0.3 + rnd() * 0.7);
    parts.push({ x: x, y: y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, l: life * (0.5 + rnd() * 0.5), m: life, c: col, s: size });
  }
}
function decal(o) { decals.push(o); if (decals.length > 60) decals.shift(); }
function carCircles(c) { var ox = Math.cos(c.a) * c.hl * 0.5, oy = Math.sin(c.a) * c.hl * 0.5; return [c.x + ox, c.y + oy, c.x - ox, c.y - oy]; }
function carDist(c, x, y) { var q = carCircles(c); return Math.min(hyp(q[0] - x, q[1] - y), hyp(q[2] - x, q[3] - y), hyp(c.x - x, c.y - y)); }
var HITP = [[1, 1], [1, -1], [-1, 1], [-1, -1], [1, 0], [-1, 0], [0, 1], [0, -1]];
function carHits(c, x, y, a) {
  var ca = Math.cos(a), sa = Math.sin(a), hl = c.hl - 2, hw = c.hw - 2;
  for (var i = 0; i < 8; i++) {
    var lx = HITP[i][0] * hl, ly = HITP[i][1] * hw;
    if (solidAt(x + ca * lx - sa * ly, y + sa * lx + ca * ly)) return true;
  }
  return false;
}
function crime(h) { heat += h; crimeT = 0; }
function scare(x, y, r) {
  for (var i = 0; i < peds.length; i++) {
    var p = peds[i]; if (!p.g && !p.wait && Math.abs(p.x - x) < r && Math.abs(p.y - y) < r) { if (!p.state) { p.tx = p.x; p.ty = p.y; } p.state = 1; p.fleeT = 5 + rnd() * 3; }
  }
}
function killPed(p, byP) {
  if (p.dead) return;
  p.dead = true;
  decal({ x: p.x, y: p.y, k: 2, r: 9 + rnd() * 5, a: p.a, si: p.si, hi: p.hi, g: p.g });
  puff(p.x, p.y, 8, '#b01818', 70, 0.5, 2.5);
  sfxAt('hit', p.x, p.y, 0.7, 0.9 + rnd() * 0.4);
  scare(p.x, p.y, 230);
  if (byP) { kills++; if (p.g) { cash += 40; crime(0.3); provoke(p.x, p.y, 320); } else { cash += 10; crime(0.7); } }
}
function eject(c) {
  if (c.driver === 'npc') {
    var x = c.x + Math.cos(c.a - PI / 2) * (c.hw + 9), y = c.y + Math.sin(c.a - PI / 2) * (c.hw + 9);
    if (solidAt(x, y) || tileAt(x, y) === G_WATER) { x = c.x; y = c.y; }
    var p = newPed(x, y); p.state = 1; p.fleeT = 8; if (c.pol) p.si = 0;
    peds.push(p);
  }
  c.driver = null; c.ai = null; c.chase = false;
}
function damageCar(c, d, byP) {
  if (c.dead) return;
  c.hp -= d; if (byP) c.byP = true;
  if (c.hp <= 0 && !c.burn) { c.burn = true; c.fire = 2.6; if (c.driver === 'npc') eject(c); }
}
function hurt(d) {
  if (over.t > 0 || !started) return;
  player.hp -= d; player.flash = 0.25;
  if (player.hp <= 0) die('TAKEN OUT', 'The hospital patches you up.');
}
function die(msg, sub) {
  if (over.t > 0) return;
  over.t = 2.8; over.msg = msg; over.sub = sub || '';
  if (player.car) { player.car.driver = null; player.car = null; }
  player.dead = true; player.hp = 0; mouse.down = false; saveBest();
  sfx('crash', 0.6, 0.6);
}
function explode(c) {
  c.dead = true;
  sfxAt('boom', c.x, c.y, 1.2);
  puff(c.x, c.y, 26, '#ff9a1a', 190, 0.7, 5); puff(c.x, c.y, 16, '#333', 90, 1.2, 6); puff(c.x, c.y, 10, '#ffe27a', 240, 0.4, 3);
  decal({ x: c.x, y: c.y, k: 1, r: 26 });
  var i, d;
  for (i = 0; i < peds.length; i++) if (hyp(peds[i].x - c.x, peds[i].y - c.y) < 80) killPed(peds[i], c.byP);
  for (i = 0; i < cars.length; i++) {
    var o = cars[i]; if (o === c || o.dead) continue;
    d = hyp(o.x - c.x, o.y - c.y);
    if (d < 85) { damageCar(o, 25 + 70 * (1 - d / 85), c.byP); o.vx += (o.x - c.x) / (d + 1) * 120; o.vy += (o.y - c.y) / (d + 1) * 120; }
  }
  if (player.car === c) die('TAKEN OUT', 'Leave burning cars a little earlier.');
  else if (!player.car && !player.dead) { d = hyp(player.x - c.x, player.y - c.y); if (d < 85) hurt(15 + 60 * (1 - d / 85)); }
  if (c.byP) { cash += 150; crime(c.pol ? 3 : 1); }
}

// ---------- driving
function drive(c, thr, steer, hb, dt) {
  var t = c.t, ca = Math.cos(c.a), sa = Math.sin(c.a);
  var f = c.vx * ca + c.vy * sa, lx = c.vx - ca * f, ly = c.vy - sa * f;
  if (c.burn) thr = 0;
  if (thr > 0) f += t.acc * thr * dt * (f < 0 ? 2 : 1);
  else if (thr < 0) f += t.acc * thr * dt * (f > 0 ? 1.9 : 0.6);
  var mx = t.max * (c.hp < 30 ? 0.65 : 1);
  if (f > mx) f = mx; if (f < -mx * 0.35) f = -mx * 0.35;
  var g = tileAt(c.x, c.y), fr = hb ? 2.2 : (thr === 0 ? 0.9 : 0.22);
  if (g === G_GRASS || g === G_SAND || g === G_DIRT) fr += 0.55;
  f -= f * Math.min(1, fr * dt);
  var k = Math.exp(-(hb ? 1.8 : 7) * dt); lx *= k; ly *= k;
  var na = c.a + steer * t.turn * clamp(f / 110, -1, 1) * dt * (hb ? 1.4 : 1);
  if (na !== c.a && !carHits(c, c.x, c.y, na)) c.a = na;
  ca = Math.cos(c.a); sa = Math.sin(c.a);
  c.vx = ca * f + lx; c.vy = sa * f + ly;
  var nx = c.x + c.vx * dt, ny = c.y + c.vy * dt;
  if (carHits(c, nx, ny, c.a)) {
    var sp = hyp(c.vx, c.vy);
    if (!carHits(c, nx, c.y, c.a)) { c.x = nx; c.vy *= -0.3; c.vx *= 0.8; }
    else if (!carHits(c, c.x, ny, c.a)) { c.y = ny; c.vx *= -0.3; c.vy *= 0.8; }
    else { c.vx *= -0.35; c.vy *= -0.35; }
    if (sp > 90) { damageCar(c, (sp - 90) * 0.08, false); sfxAt('crash', c.x, c.y, clamp(sp / 300, 0.2, 1)); puff(c.x + ca * c.hl, c.y + sa * c.hl, 5, '#ffd27a', 120, 0.3, 2); }
  } else { c.x = nx; c.y = ny; }
  c.s = f;
}
function nextTarget(c) {
  var ai = c.ai, cx = ai.tx, cy = ai.ty, m = lane[idx(cx, cy)], cd = ai.dir, opts = [], straight = false, d, nx, ny, nd;
  for (d = 0; d < 4; d++) {
    if (!(m & (1 << d)) || d === (cd + 2) % 4) continue;
    nx = cx + DX[d]; ny = cy + DY[d];
    if (!inb(nx, ny) || !(lane[idx(nx, ny)] & (1 << d))) continue;
    opts.push(d); if (d === cd) straight = true;
  }
  if (!opts.length) {
    for (d = 0; d < 4; d++) { if (d === (cd + 2) % 4) continue; nx = cx + DX[d]; ny = cy + DY[d]; if (inb(nx, ny) && lane[idx(nx, ny)]) opts.push(d); }
    nd = opts.length ? pick(opts) : (cd + 2) % 4;
  } else if (straight && (ai.turned || rnd() < 0.6)) nd = cd;
  else nd = pick(opts);
  nx = cx + DX[nd]; ny = cy + DY[nd];
  if (!inb(nx, ny) || !lane[idx(nx, ny)]) { eject(c); return; }
  ai.turned = nd !== cd; ai.dir = nd; ai.tx = nx; ai.ty = ny;
}
function ahead(c, x, y, r, ca, sa) {
  var ox = x - c.x, oy = y - c.y, dd = ox * ox + oy * oy;
  if (dd > r * r || dd < 1) return false;
  var f = ox * ca + oy * sa; return f > 0 && f * f > dd * 0.62;
}
function updAI(c, dt) {
  var ai = c.ai, tx = (ai.tx + 0.5) * T, ty = (ai.ty + 0.5) * T, dx = tx - c.x, dy = ty - c.y, i;
  if (dx * dx + dy * dy < 64) { nextTarget(c); if (!c.ai) return; tx = (ai.tx + 0.5) * T; ty = (ai.ty + 0.5) * T; dx = tx - c.x; dy = ty - c.y; }
  var ca = Math.cos(c.a), sa = Math.sin(c.a), blocked = false;
  for (i = 0; i < cars.length && !blocked; i++) if (cars[i] !== c && ahead(c, cars[i].x, cars[i].y, 72, ca, sa)) blocked = true;
  if (!c.panic) {
    for (i = 0; i < peds.length && !blocked; i++) if (ahead(c, peds[i].x, peds[i].y, 48, ca, sa)) blocked = true;
    if (!blocked && !player.car && !player.dead && ahead(c, player.x, player.y, 52, ca, sa)) blocked = true;
  }
  if (blocked) {
    c.wait += dt;
    if (c.wait > 1.6 && !c.honked) { c.honked = true; sfxAt('horn', c.x, c.y, 0.5, 0.9 + rnd() * 0.3); }
    if (c.wait > 3.2) { blocked = false; if (c.wait > 4.6) { c.wait = 0; c.honked = false; } }
  } else { c.wait = 0; c.honked = false; }
  var want = Math.atan2(dy, dx), df = angd(want, c.a), ts = blocked ? 0 : (c.panic ? 230 : ai.sp);
  if (Math.abs(df) > 0.4) ts = Math.min(ts, 45);
  if (Math.abs(df) > 1.2) c.s = Math.min(c.s, 45);
  c.s += clamp(ts - c.s, -420 * dt, 150 * dt);
  if (c.s > 4) c.a += clamp(df, -7 * dt, 7 * dt);
  c.vx = Math.cos(c.a) * c.s; c.vy = Math.sin(c.a) * c.s;
  c.x += c.vx * dt; c.y += c.vy * dt;
}
function toLane(c) {
  var tx = Math.floor(c.x / T), ty = Math.floor(c.y / T);
  c.chase = false;
  if (!inb(tx, ty) || !lane[idx(tx, ty)]) return;
  var m = lane[idx(tx, ty)], d = (m & 1) ? 0 : (m & 2) ? 1 : (m & 4) ? 2 : 3;
  c.ai = { tx: tx, ty: ty, dir: d, turned: false, sp: 100 + rnd() * 40 }; c.s = Math.max(0, c.s);
}
function updChase(c, dt) {
  var dx = player.x - c.x, dy = player.y - c.y, d = hyp(dx, dy), df = angd(Math.atan2(dy, dx), c.a);
  if (c.revT > 0) { c.revT -= dt; drive(c, -1, df > 0 ? -1 : 1, false, dt); }
  else {
    var thr = Math.abs(df) > 2 ? 0.45 : 0.85;
    if (d < 62 && (!player.car || hyp(player.car.vx, player.car.vy) < 40)) thr = 0;
    drive(c, thr, clamp(df * 1.8, -1, 1), thr === 0, dt);
    if (thr > 0 && Math.abs(c.s) < 25) c.stuck += dt; else c.stuck = 0;
    if (c.stuck > 0.9) { c.revT = 0.8; c.stuck = 0; }
  }
  c.shootT -= dt;
  if (wanted >= 3 && d < 250 && d > 40 && c.shootT <= 0 && !player.dead) {
    c.shootT = 2.1 - wanted * 0.2;
    var a = Math.atan2(dy, dx) + (rnd() - 0.5) * 0.42;
    bullets.push({ x: c.x + Math.cos(a) * (c.hl + 4), y: c.y + Math.sin(a) * (c.hl + 4), vx: Math.cos(a) * 620, vy: Math.sin(a) * 620, l: 0.7, own: 1, dmg: 8 });
    sfxAt('shot', c.x, c.y, 0.5, 0.85);
  }
}
function collide(a, b) {
  if (Math.abs(a.x - b.x) > 64 || Math.abs(a.y - b.y) > 64) return;
  var A1 = carCircles(a), B1 = carCircles(b), r = a.hw + b.hw;
  for (var p = 0; p < 4; p += 2) for (var q = 0; q < 4; q += 2) {
    var dx = B1[q] - A1[p], dy = B1[q + 1] - A1[p + 1], d = hyp(dx, dy);
    if (d >= r || d < 0.01) continue;
    var nx = dx / d, ny = dy / d, o = (r - d) * 0.5;
    if (!carHits(a, a.x - nx * o, a.y - ny * o, a.a)) { a.x -= nx * o; a.y -= ny * o; }
    if (!carHits(b, b.x + nx * o, b.y + ny * o, b.a)) { b.x += nx * o; b.y += ny * o; }
    var vn = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
    if (vn < 0) {
      var j = -vn * 0.75;
      a.vx -= nx * j; a.vy -= ny * j; b.vx += nx * j; b.vy += ny * j;
      if (a.ai) a.s = Math.max(0, a.vx * Math.cos(a.a) + a.vy * Math.sin(a.a));
      if (b.ai) b.s = Math.max(0, b.vx * Math.cos(b.a) + b.vy * Math.sin(b.a));
      if (-vn > 80) {
        var dm = (-vn - 80) * 0.07;
        damageCar(a, dm, b === player.car); damageCar(b, dm, a === player.car);
        sfxAt('crash', a.x, a.y, clamp(-vn / 300, 0.25, 1), 1.1);
        puff((A1[p] + B1[q]) / 2, (A1[p + 1] + B1[q + 1]) / 2, 5, '#ffd27a', 120, 0.3, 2);
        var pc = a === player.car ? b : b === player.car ? a : null;
        if (pc && pc.pol && pc.driver === 'npc') crime(0.5);
      }
    }
    return;
  }
}

// ---------- player
var inp = { mx: 0, my: 0, fire: false, hb: false, abs: false };
function readInput() {
  var kx = (keys.KeyD || keys.ArrowRight ? 1 : 0) - (keys.KeyA || keys.ArrowLeft ? 1 : 0);
  var ky = (keys.KeyS || keys.ArrowDown ? 1 : 0) - (keys.KeyW || keys.ArrowUp ? 1 : 0);
  var useStick = stick.id >= 0 && hyp(stick.x, stick.y) > 0.18 && !kx && !ky;
  inp.mx = useStick ? stick.x : kx; inp.my = useStick ? stick.y : ky;
  inp.abs = steerMode === 1 && (useStick || kx !== 0 || ky !== 0);
  inp.hb = !!keys.Space || tFire;
  inp.fire = mouse.down || (!player.car && (!!keys.Space || tFire));
  mouse.wx = cam.x + (mouse.x - cv.width / 2) / cam.z; mouse.wy = cam.y + (mouse.y - cv.height / 2) / cam.z;
}
function pfree(x, y) { return !solidAt(x - 5, y - 5) && !solidAt(x + 5, y - 5) && !solidAt(x - 5, y + 5) && !solidAt(x + 5, y + 5); }
function updFoot(dt) {
  var mx = inp.mx, my = inp.my, l = hyp(mx, my), i;
  if (l > 1) { mx /= l; my /= l; }
  var run = keys.ShiftLeft || keys.ShiftRight || keys.Shift || (stick.id >= 0 && hyp(stick.x, stick.y) > 0.92), fs = run ? 190 : 112;
  var nx = player.x + mx * fs * dt, ny = player.y + my * fs * dt;
  if (pfree(nx, player.y)) player.x = nx;
  if (pfree(player.x, ny)) player.y = ny;
  if (l > 0.1) player.walk += dt * (run ? 1.7 : 1);
  if (!touchUI && time - mouse.t < 4) player.a = Math.atan2(mouse.wy - player.y, mouse.wx - player.x);
  else if (l > 0.1) player.a = Math.atan2(my, mx);
  for (i = 0; i < cars.length; i++) {
    var c = cars[i]; if (c.dead || Math.abs(c.x - player.x) > 50 || Math.abs(c.y - player.y) > 50) continue;
    var q = carCircles(c), sp = hyp(c.vx, c.vy);
    for (var k = 0; k < 4; k += 2) {
      var dx = player.x - q[k], dy = player.y - q[k + 1], d = hyp(dx, dy), r = c.hw + 5;
      if (d < r && d > 0.01) {
        if (sp > 90) { hurt(sp * 0.13); player.x += dx / d * 14; player.y += dy / d * 14; sfx('hit', 0.6); c.vx *= 0.7; c.vy *= 0.7; if (!pfree(player.x, player.y)) { player.x -= dx / d * 14; player.y -= dy / d * 14; } }
        else { var px = player.x + dx / d * (r - d), py = player.y + dy / d * (r - d); if (pfree(px, py)) { player.x = px; player.y = py; } }
      }
    }
  }
  if (tileAt(player.x, player.y) === G_WATER) { puff(player.x, player.y, 14, '#cfe6ff', 80, 0.6, 3); die('DROWNED', 'Swimming was not on your resume.'); }
}
function updPlayerCar(dt) {
  var c = player.car, thr, steer;
  if (inp.abs) {
    var want = Math.atan2(inp.my, inp.mx), df = angd(want, c.a), mag = Math.min(1, hyp(inp.mx, inp.my));
    if (Math.abs(df) > 2.3 && c.s < 60) { thr = -mag; steer = df > 0 ? -1 : 1; }
    else { thr = mag; steer = clamp(df * 2, -1, 1); }
  } else { thr = -inp.my; steer = inp.mx; }
  drive(c, thr, steer, inp.hb, dt);
  player.x = c.x; player.y = c.y; player.a = c.a;
}
function nearestCar(r) {
  var b = null, bd = r;
  for (var i = 0; i < cars.length; i++) { var c = cars[i]; if (c.dead) continue; var d = carDist(c, player.x, player.y); if (d < bd) { bd = d; b = c; } }
  return b;
}
function handleE(dt) {
  if (eBuf <= 0) return;
  eBuf -= dt;
  var c = player.car, i;
  if (c) {
    if (hyp(c.vx, c.vy) > 150) return;
    var offs = [[-PI / 2, c.hw + 10], [PI / 2, c.hw + 10], [PI, c.hl + 10], [0, c.hl + 10]];
    for (i = 0; i < 4; i++) {
      var x = c.x + Math.cos(c.a + offs[i][0]) * offs[i][1], y = c.y + Math.sin(c.a + offs[i][0]) * offs[i][1];
      if (pfree(x, y) && tileAt(x, y) !== G_WATER) {
        player.x = x; player.y = y; player.car = null; c.driver = null; eBuf = 0; sfx('door', 0.7); return;
      }
    }
  } else {
    c = nearestCar(30);
    if (!c) return;
    if (c.driver === 'npc') { var pol = c.pol; eject(c); crime(pol ? 2 : 0.4); scare(c.x, c.y, 120); }
    c.ai = null; c.chase = false; c.driver = 'player'; c.panic = false; player.car = c; eBuf = 0; sfx('door', 0.7);
  }
}
function shooting(dt) {
  player.cool -= dt; player.shootT -= dt;
  if (!inp.fire || player.cool > 0) return;
  var c = player.car, a;
  if (c) { if (!mouse.down) return; a = Math.atan2(mouse.wy - c.y, mouse.wx - c.x); } else a = player.a;
  var w = player.weapon;
  if (w === 1 && player.ammo <= 0) { w = player.weapon = 0; }
  a += (rnd() - 0.5) * (w ? 0.14 : 0.03);
  var o = c ? 6 : 12;
  bullets.push({ x: player.x + Math.cos(a) * o, y: player.y + Math.sin(a) * o, vx: Math.cos(a) * 720, vy: Math.sin(a) * 720, l: 0.6, own: 0, dmg: w ? 22 : 36 });
  player.cool = w ? 0.085 : 0.32; player.shootT = 0.25;
  if (w) player.ammo--;
  sfx('shot', 0.45, w ? 1.5 : 1.05);
  puff(player.x + Math.cos(a) * (o + 4), player.y + Math.sin(a) * (o + 4), 2, '#ffe27a', 40, 0.12, 2);
  scare(player.x, player.y, 250); provoke(player.x, player.y, 220);
}
function respawn() {
  var busted = over.msg === 'ARRESTED';
  var t = findTile(function (x, y, i) { return tile[i] === G_SIDE && !solid[i]; }, 220, 700, 300);
  if (t) { player.x = (t[0] + 0.5) * T; player.y = (t[1] + 0.5) * T; }
  else { player.x = (startTile[0] + 0.5) * T; player.y = (startTile[1] + 0.5) * T; }
  player.hp = 100; player.dead = false; player.car = null; heat = 0; wanted = 0; bustT = 0;
  cash = Math.floor(cash * 0.9);
  if (mission) endMission();
  if (busted) { player.ammo = 0; player.weapon = 0; }
  for (var i = 0; i < cars.length; i++) if (cars[i].chase) toLane(cars[i]);
  cam.x = player.x; cam.y = player.y; curDist = -1;
}

// ---------- spawning
function findTile(test, rmin, rmax, tries) {
  for (var k = 0; k < tries; k++) {
    var a = rnd() * TAU, r = rmin + rnd() * (rmax - rmin);
    var x = Math.floor((player.x + Math.cos(a) * r) / T), y = Math.floor((player.y + Math.sin(a) * r) / T);
    if (inb(x, y) && test(x, y, idx(x, y))) return [x, y];
  }
  return null;
}
function oneLane(x, y, i) { var m = lane[i]; return m === 1 || m === 2 || m === 4 || m === 8; }
function spawnCar(rmin, rmax, pol) {
  var t = findTile(oneLane, rmin, rmax, 14); if (!t) return null;
  var x = (t[0] + 0.5) * T, y = (t[1] + 0.5) * T, i;
  for (i = 0; i < cars.length; i++) if (Math.abs(cars[i].x - x) < 84 && Math.abs(cars[i].y - y) < 84) return null;
  var m = lane[idx(t[0], t[1])], d = m === 1 ? 0 : m === 2 ? 1 : m === 4 ? 2 : 3, r = rnd();
  var type = pol ? 'police' : r < 0.5 ? 'sedan' : r < 0.62 ? 'taxi' : r < 0.8 ? 'sport' : 'van';
  var c = newCar(type, x, y, d * PI / 2, type === 'taxi' ? 2 : ri(0, CARCOL.length - 1));
  c.driver = 'npc';
  if (pol) c.chase = true; else c.ai = { tx: t[0], ty: t[1], dir: d, turned: false, sp: 95 + rnd() * 55 };
  cars.push(c); return c;
}
function pedTile(x, y, i) {
  if (solid[i]) return false;
  var t = tile[i];
  return t === G_SIDE || ((t === G_GRASS || t === G_SAND || t === G_CONC || t === G_DARK) && rnd() < 0.2);
}
function spawnPed(rmin, rmax) {
  var t = findTile(pedTile, rmin, rmax, 10); if (!t) return;
  var p = newPed((t[0] + 0.5) * T + (rnd() - 0.5) * 12, (t[1] + 0.5) * T + (rnd() - 0.5) * 12), d = dist[idx(t[0], t[1])];
  if ((d === 4 || d === 2) && rnd() < 0.28) makeGang(p, false);
  peds.push(p);
}
function spawnPickup() {
  var t = findTile(function (x, y, i) { return tile[i] === G_SIDE && !solid[i]; }, 260, 900, 20); if (!t) return;
  var r = rnd();
  pickups.push({ x: (t[0] + 0.5) * T, y: (t[1] + 0.5) * T, k: r < 0.3 ? 'health' : r < 0.65 ? 'mp' : 'cash' });
}
function farTile(test, minD) {
  for (var k = 0; k < 600; k++) {
    var x = ri(2, L - 2), y = ri(2, N - 3);
    if (test(x, y, idx(x, y)) && hyp((x + 0.5) * T - player.x, (y + 0.5) * T - player.y) > (k < 400 ? minD : 260)) return [x, y];
  }
  return null;
}
function sideTile(x, y, i) { return tile[i] === G_SIDE && !solid[i] && x > 0 && x < L && y > 0 && y < N - 1; }
function dname(x, y) { return DIST[dist[idx(clamp(Math.floor(x / T), 0, N - 1), clamp(Math.floor(y / T), 0, N - 1))]].n; }
function newMission() {
  var ty = 'deliver', k, x, y, i, c, p;
  if (lastJob) do { ty = pick(JOBS); } while (ty === lastJob);
  var a = farTile(ty === 'deliver' || ty === 'van' ? oneLane : sideTile, ty === 'courier' ? 500 : 900);
  if (!a) { mission = null; return; }
  lastJob = ty;
  var px = (a[0] + 0.5) * T, py = (a[1] + 0.5) * T;
  var m = mission = { type: ty, stage: 0, x: px, y: py, mx: px, my: py, t: 110, d: dname(px, py), n: 0, left: 0, car: null, ped: null, pk: [] };
  if (ty === 'gang') {
    var want = 3 + Math.min(3, rank());
    for (k = 0; k < 120 && m.n < want; k++) {
      x = a[0] + ri(-2, 2); y = a[1] + ri(-2, 2); if (!inb(x, y)) continue; i = idx(x, y);
      if (solid[i] || tile[i] === G_WATER || tile[i] === G_ROAD) continue;
      p = makeGang(newPed((x + 0.5) * T + (rnd() - 0.5) * 14, (y + 0.5) * T + (rnd() - 0.5) * 14), true); p.m = true; peds.push(p); m.n++;
    }
    m.left = m.n;
  } else if (ty === 'steal') {
    var hor = (inb(a[0], a[1] - 1) && lane[idx(a[0], a[1] - 1)]) || (inb(a[0], a[1] + 1) && lane[idx(a[0], a[1] + 1)]);
    c = newCar('sport', px, py, hor ? 0 : PI / 2, 7); c.m = true; cars.push(c); m.car = c;
  } else if (ty === 'taxi') {
    p = newPed(px, py); p.wait = true; p.m = true; p.si = 5; peds.push(p); m.ped = p;
  } else if (ty === 'courier') {
    for (k = 0; k < 400 && m.pk.length < 4; k++) {
      x = a[0] + ri(-13, 13); y = a[1] + ri(-13, 13);
      if (inb(x, y) && sideTile(x, y, idx(x, y))) m.pk.push({ x: (x + 0.5) * T, y: (y + 0.5) * T });
    }
    if (!m.pk.length) m.pk.push({ x: px, y: py });
    m.n = m.pk.length;
  } else if (ty === 'van') {
    var lm = lane[idx(a[0], a[1])], d = lm === 1 ? 0 : lm === 2 ? 1 : lm === 4 ? 2 : 3;
    c = newCar('van', px, py, d * PI / 2, 5); c.driver = 'npc'; c.hp = 260; c.m = true;
    c.ai = { tx: a[0], ty: a[1], dir: d, turned: false, sp: 125 }; cars.push(c); m.car = c;
  }
}
function endMission() {
  var i;
  for (i = 0; i < peds.length; i++) if (peds[i].m) { peds[i].m = false; peds[i].wait = false; }
  for (i = 0; i < cars.length; i++) cars[i].m = false;
  mission = null;
}
function failMission(why) { say('Job failed: ' + why); sfx('horn', 0.4, 0.6); endMission(); }
function doneMission(base) {
  var r0 = rank(), rew = Math.round((base + Math.floor(mission.t) * 4) * (1 + r0 * 0.15));
  cash += rew; jobs++; sfx('win', 0.7);
  banner.txt = rank() > r0 ? 'Promoted: ' + RANKS[rank()][1] + '  +$' + rew : 'Job done  +$' + rew; banner.t = 3.2;
  endMission(); saveBest();
}
function nextDest(m, t) {
  var a = farTile(oneLane, 800); if (!a) return false;
  m.x = (a[0] + 0.5) * T; m.y = (a[1] + 0.5) * T; m.d = dname(m.x, m.y); m.t = t; m.stage = 1; return true;
}
function updMission(dt) {
  var m = mission, i, inCar = !!player.car, ty = m.type;
  m.t = Math.max(0, m.t - dt);
  m.mx = m.x; m.my = m.y;
  if (ty === 'steal' || ty === 'van') {
    if (m.car.dead) { if (ty === 'van') doneMission(700); else failMission('The car is wrecked.'); return; }
    if (ty === 'van' || player.car !== m.car) { m.mx = m.car.x; m.my = m.car.y; }
    if (ty === 'van') m.d = dname(m.car.x, m.car.y);
  } else if (ty === 'taxi' && m.stage === 0) {
    if (m.ped.dead) { failMission('Your accomplice is dead.'); return; }
    m.mx = m.ped.x; m.my = m.ped.y;
  } else if (ty === 'courier') {
    var bd = 1e9;
    for (i = m.pk.length - 1; i >= 0; i--) {
      var q = m.pk[i], d = hyp(q.x - player.x, q.y - player.y);
      if (d < (inCar ? 28 : 18)) { m.pk.splice(i, 1); sfx('pick', 0.7, 1.2); say('Package collected'); continue; }
      if (d < bd) { bd = d; m.mx = q.x; m.my = q.y; }
    }
    if (!m.pk.length) doneMission(380 + 40 * m.n);
    return;
  } else if (ty === 'gang') {
    var n = 0; for (i = 0; i < peds.length; i++) if (peds[i].m && !peds[i].dead) n++;
    m.left = n; if (!n) doneMission(450 + 60 * m.n);
    return;
  }
  var dd = hyp(m.mx - player.x, m.my - player.y);
  if (ty === 'deliver') { if (inCar && dd < 52) doneMission(300); }
  else if (ty === 'steal') {
    if (m.stage === 0) { if (player.car === m.car) { if (nextDest(m, 90)) say('Off to the workshop, keep it dent-free'); else doneMission(300); } }
    else if (player.car === m.car && dd < 52) doneMission(300 + Math.round(clamp(m.car.hp, 0, 80) * 5));
  } else if (ty === 'taxi') {
    if (m.stage === 0) {
      if (inCar && dd < 66 && hyp(player.car.vx, player.car.vy) < 50) {
        m.ped.dead = true; sfx('door', 0.7);
        if (nextDest(m, 75)) say('Accomplice on board. Floor it!'); else doneMission(300);
      }
    } else if (inCar && dd < 52) doneMission(450);
  }
}
function missionText() {
  var m = mission, s, inCar = !!player.car;
  if (m.type === 'deliver') s = (inCar ? 'Drive this car to ' : 'Steal a car, then drive to ') + m.d;
  else if (m.type === 'gang') s = 'Take out the gang in ' + m.d + ' (' + m.left + ' left)';
  else if (m.type === 'steal') s = m.stage === 0 ? 'Steal the purple sports car in ' + m.d : player.car === m.car ? 'Sports car to the workshop: ' + m.d : 'Get back in the sports car';
  else if (m.type === 'taxi') s = m.stage === 0 ? 'Pick up your accomplice in ' + m.d + ' (stop next to him in a car)' : 'Drive your accomplice to ' + m.d;
  else if (m.type === 'courier') s = 'Collect the packages in ' + m.d + ' (' + m.pk.length + ' left)';
  else s = 'Destroy the money van: ' + m.d;
  return 'Job: ' + s + (m.t > 0 ? '  ·  Bonus ' + Math.ceil(m.t) + 's' : '');
}
function populate() {
  var n = 0, ai = 0, pol = 0, i, d, lim = spawnR + 480;
  for (i = cars.length - 1; i >= 0; i--) {
    var c = cars[i];
    if (c.dead || (c !== player.car && !c.m && hyp(c.x - player.x, c.y - player.y) > lim)) { cars.splice(i, 1); continue; }
    if (c.ai) ai++; if (c.chase) pol++; n++;
  }
  for (i = peds.length - 1; i >= 0; i--) if (peds[i].dead || (!peds[i].m && hyp(peds[i].x - player.x, peds[i].y - player.y) > lim)) peds.splice(i, 1);
  for (i = pickups.length - 1; i >= 0; i--) if (hyp(pickups[i].x - player.x, pickups[i].y - player.y) > 1600) pickups.splice(i, 1);
  if (ai < 16 && n < 30) spawnCar(spawnR, spawnR + 320, false);
  if (peds.length < 42) spawnPed(spawnR, spawnR + 320);
  if (pickups.length < 6) spawnPickup();
  if (pol < [0, 1, 1, 2, 3][wanted] && started && !player.dead && time > polT && spawnCar(spawnR + 120, spawnR + 380, true)) polT = time + 6;
}

// ---------- update
function updPeds(dt) {
  var live = started && !player.dead;
  for (var i = 0; i < peds.length; i++) {
    var p = peds[i]; if (p.dead) continue;
    var hold = p.wait, chase = false, gx = player.x - p.x, gy = player.y - p.y, gd = hyp(gx, gy);
    if (p.g && p.hostile && live) {
      if (gd < 340) {
        p.cool -= dt;
        if (p.cool <= 0) {
          p.cool = 1 + rnd();
          var ga = Math.atan2(gy, gx) + (rnd() - 0.5) * 0.34;
          bullets.push({ x: p.x + Math.cos(ga) * 10, y: p.y + Math.sin(ga) * 10, vx: Math.cos(ga) * 560, vy: Math.sin(ga) * 560, l: 0.7, own: 2, dmg: 6 });
          sfxAt('shot', p.x, p.y, 0.4, 1.25);
        }
        if (gd < 150) hold = true;
      }
      chase = gd < 620;
    }
    if (p.state) { p.fleeT -= dt; if (p.fleeT <= 0) p.state = 0; }
    var sp = chase ? 74 : p.state ? 118 : p.sp, dx = p.tx - p.x, dy = p.ty - p.y, d = hyp(dx, dy);
    if (hold) { if (gd < 340) p.a = Math.atan2(gy, gx); }
    else if (d < 3) {
      var cx = Math.floor(p.x / T), cy = Math.floor(p.y / T), w = [0, 0, 0, 0], tot = 0, k;
      var onRoad = inb(cx, cy) && tile[idx(cx, cy)] === G_ROAD, pd = gd * gd;
      for (k = 0; k < 4; k++) {
        var nx = cx + DX[k], ny = cy + DY[k]; if (!inb(nx, ny)) continue;
        var j = idx(nx, ny), t = tile[j]; if (solid[j] === 1 || t === G_WATER) continue;
        var wt, ex = (nx + 0.5) * T - player.x, ey = (ny + 0.5) * T - player.y;
        if (chase) wt = ex * ex + ey * ey < pd ? 6 : 0.2;
        else if (p.state) wt = (ex * ex + ey * ey > pd ? 6 : 0.2) * (k === (p.dir + 2) % 4 ? 0.5 : 1);
        else {
          wt = t === G_ROAD ? (onRoad ? 1 : 0.06) : t === G_SIDE ? 1 : 0.5;
          if (k === p.dir) wt *= onRoad ? 12 : 4; else if (k === (p.dir + 2) % 4) wt *= 0.08;
        }
        w[k] = wt; tot += wt;
      }
      if (tot > 0) {
        var r = rnd() * tot; for (k = 0; k < 4; k++) { r -= w[k]; if (w[k] > 0 && r <= 0) break; }
        if (k > 3) k = 3;
        if (!w[k]) for (k = 0; k < 4 && !w[k]; k++) { }
        p.dir = k; p.tx = (cx + DX[k] + 0.5) * T + (rnd() - 0.5) * 16; p.ty = (cy + DY[k] + 0.5) * T + (rnd() - 0.5) * 16;
      }
    } else {
      p.a = Math.atan2(dy, dx); p.x += dx / d * Math.min(d, sp * dt); p.y += dy / d * Math.min(d, sp * dt); p.t += dt * (p.state || chase ? 2 : 1);
      if (chase && gd < 340) p.a = Math.atan2(gy, gx);
    }
    for (var c = 0; c < cars.length; c++) {
      var o = cars[c]; if (Math.abs(o.x - p.x) > 40 || Math.abs(o.y - p.y) > 40) continue;
      if (o.vx * o.vx + o.vy * o.vy > 3600 && carDist(o, p.x, p.y) < o.hw + 5) { killPed(p, o === player.car); break; }
    }
  }
}
function updBullets(dt) {
  for (var i = bullets.length - 1; i >= 0; i--) {
    var b = bullets[i], steps = Math.max(1, Math.ceil(hyp(b.vx, b.vy) * dt / 9)), sd = dt / steps, hit = false, k, j;
    b.l -= dt;
    for (k = 0; k < steps && !hit; k++) {
      b.x += b.vx * sd; b.y += b.vy * sd;
      if (solidAt(b.x, b.y)) { puff(b.x, b.y, 3, '#d8d8d8', 60, 0.2, 2); hit = true; break; }
      for (j = 0; j < peds.length; j++) {
        var p = peds[j];
        if (p.dead || (b.own === 2 && p.g) || Math.abs(p.x - b.x) > 9 || Math.abs(p.y - b.y) > 9) continue;
        if (p.g && b.own === 0 && --p.hp > 0) { p.hostile = true; provoke(p.x, p.y, 320); puff(b.x, b.y, 4, '#b01818', 60, 0.3, 2); }
        else killPed(p, b.own === 0);
        hit = true; break;
      }
      if (hit) break;
      for (j = 0; j < cars.length; j++) {
        var c = cars[j];
        if (c.dead || (b.own === 0 && c === player.car) || (b.own === 1 && c.chase)) continue;
        if (Math.abs(c.x - b.x) > 40 || Math.abs(c.y - b.y) > 40 || carDist(c, b.x, b.y) > c.hw) continue;
        damageCar(c, b.dmg * 0.5, b.own === 0); puff(b.x, b.y, 3, '#ffd27a', 80, 0.2, 2);
        if (b.own === 0) { if (c.ai) c.panic = true; if (c.pol && c.driver === 'npc') crime(0.5); }
        if (b.own !== 0 && c === player.car) hurt(3);
        hit = true; break;
      }
      if (hit) break;
      if (b.own !== 0 && !player.car && !player.dead && Math.abs(player.x - b.x) < 8 && Math.abs(player.y - b.y) < 8) { hurt(b.dmg); puff(b.x, b.y, 4, '#b01818', 60, 0.3, 2); hit = true; }
    }
    if (hit || b.l <= 0) bullets.splice(i, 1);
  }
}
function update(dt) {
  var i, j, c;
  time += dt;
  if (over.t > 0) { over.t -= dt; if (over.t <= 0) respawn(); }
  readInput();
  var live = started && over.t <= 0 && !player.dead;
  if (live) { if (player.car) updPlayerCar(dt); else updFoot(dt); }
  if (live) { handleE(dt); shooting(dt); } else eBuf = 0;
  if (player.flash > 0) player.flash -= dt;

  for (i = 0; i < cars.length; i++) {
    c = cars[i]; if (c.dead) continue;
    if (c === player.car) { if (!live) drive(c, 0, 0, true, dt); }
    else if (c.ai) updAI(c, dt);
    else if (c.chase) updChase(c, dt);
    else if (c.vx * c.vx + c.vy * c.vy > 1) drive(c, 0, 0, false, dt);
    else { c.vx = c.vy = 0; c.s = 0; }
    if (tileAt(c.x, c.y) === G_WATER) {
      puff(c.x, c.y, 22, '#cfe6ff', 130, 0.7, 4); sfxAt('crash', c.x, c.y, 0.8, 0.5); c.dead = true;
      if (c === player.car) die('DROWNED', 'That car was never meant to be a boat.');
      continue;
    }
    if (c.burn) {
      c.fire -= dt;
      if (rnd() < 0.7) puff(c.x + (rnd() - 0.5) * 14, c.y + (rnd() - 0.5) * 14, 1, rnd() < 0.5 ? '#ff9a1a' : '#ffd23a', 30, 0.4, 4);
      if (c.fire <= 0) explode(c);
    } else if (c.hp < 45 && rnd() < 0.25) puff(c.x + Math.cos(c.a) * c.hl * 0.7, c.y + Math.sin(c.a) * c.hl * 0.7, 1, '#555', 18, 0.8, 4);
  }
  for (i = 0; i < cars.length; i++) for (j = i + 1; j < cars.length; j++) if (!cars[i].dead && !cars[j].dead) collide(cars[i], cars[j]);
  if (player.car) { player.x = player.car.x; player.y = player.car.y; }
  updPeds(dt); updBullets(dt);
  for (i = parts.length - 1; i >= 0; i--) { var q = parts[i]; q.l -= dt; q.x += q.vx * dt; q.y += q.vy * dt; q.vx *= 0.94; q.vy *= 0.94; if (q.l <= 0) parts.splice(i, 1); }

  if (live) {
    for (i = pickups.length - 1; i >= 0; i--) {
      var pk = pickups[i];
      if (hyp(pk.x - player.x, pk.y - player.y) < (player.car ? 26 : 17)) {
        if (pk.k === 'health') { player.hp = Math.min(100, player.hp + 50); say('First aid +50'); }
        else if (pk.k === 'mp') { player.ammo += 60; player.weapon = 1; say('SMG +60'); }
        else { cash += 100; say('Found +$100'); }
        sfx('pick', 0.7); pickups.splice(i, 1);
      }
    }
    if (!mission) newMission();
    if (mission) updMission(dt);
    // law
    var near = 1e9, cop = null;
    for (i = 0; i < cars.length; i++) if (cars[i].chase && !cars[i].dead) { var dd = hyp(cars[i].x - player.x, cars[i].y - player.y); if (dd < near) { near = dd; cop = cars[i]; } }
    crimeT += near > 260 ? dt : dt * 0.35;
    if (heat > 0 && crimeT > 11) { heat = Math.max(0, heat - 2); crimeT = 4; }
    heat = Math.min(heat, 8.4);
    var nw = Math.min(4, Math.floor(heat / 2 + 0.5));
    if (nw > wanted) say('The police are after you');
    if (nw === 0 && wanted > 0) { say('The police lost interest'); for (i = 0; i < cars.length; i++) if (cars[i].chase) toLane(cars[i]); }
    wanted = nw;
    var slow = !player.car || hyp(player.car.vx, player.car.vy) < 30;
    if (wanted > 0 && cop && near < 58 && slow && hyp(cop.vx, cop.vy) < 60) { bustT += dt; if (bustT > (player.car ? 3.5 : 2.4)) die('ARRESTED', 'Weapons gone, bail paid.'); }
    else bustT = Math.max(0, bustT - dt * 2);
    var di = dist[idx(clamp(Math.floor(player.x / T), 0, N - 1), clamp(Math.floor(player.y / T), 0, N - 1))];
    if (di !== curDist) { curDist = di; if (banner.t <= 0) { banner.txt = DIST[di].n; banner.t = 2.6; } }
  }
  if (banner.t > 0) banner.t -= dt;
  if (note.t > 0) note.t -= dt;
  populate();

  // camera
  var vx = player.car ? player.car.vx : 0, vy = player.car ? player.car.vy : 0, sp = hyp(vx, vy);
  var k = Math.min(1, dt * 6);
  cam.x += (player.x + vx * 0.28 - cam.x) * k; cam.y += (player.y + vy * 0.28 - cam.y) * k;
  cam.z += (baseZ * (1 - Math.min(1, sp / 400) * 0.3) - cam.z) * Math.min(1, dt * 2.5);
  spawnR = Math.max(560, hyp(cv.width, cv.height) / 2 / cam.z + 70);

  if (AC && engGain) {
    try {
      var on = player.car && !paused && !muted;
      engGain.gain.value = on ? 0.2 : 0;
      if (on) engSrc.playbackRate.value = 0.55 + Math.min(1.9, Math.abs(player.car.s) / 165);
      var sn = 0; for (i = 0; i < cars.length; i++) if (cars[i].chase && hyp(cars[i].x - cam.x, cars[i].y - cam.y) < 650) sn = 0.13;
      sirGain.gain.value = sn;
    } catch (e) { }
  }
}

// ---------- render
var roofPat = null, PED_S = 2, CAR_S = 2;
function drawSpr(c, x, y, a, s) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(a + PI / 2);
  ctx.drawImage(c, -c.width * s / 2, -c.height * s / 2, c.width * s, c.height * s);
  ctx.restore();
}
function drawCar(c) {
  var s = carSpr(c.type, c.ci), w = s.width * CAR_S, h = s.height * CAR_S;
  ctx.save(); ctx.translate(c.x, c.y); ctx.rotate(c.a + PI / 2);
  ctx.fillStyle = 'rgba(0,0,0,0.28)'; ctx.fillRect(-w / 2 + 3, -h / 2 + 4, w, h);
  ctx.drawImage(s, -w / 2, -h / 2, w, h);
  if (c.hp < 45) { ctx.fillStyle = 'rgba(20,20,20,0.35)'; ctx.fillRect(-w / 2 + 3, -h / 2 + 2, w - 6, 12); }
  if (c.chase) {
    var f = Math.floor(time * 6) % 2;
    ctx.fillStyle = f ? '#ff3030' : '#3060ff'; ctx.fillRect(f ? -8 : 0, -3, 8, 4);
    ctx.globalAlpha = 0.22; ctx.beginPath(); ctx.arc(f ? -6 : 6, -1, 22, 0, TAU); ctx.fill(); ctx.globalAlpha = 1;
  }
  ctx.restore();
}
function drawBuilding(b, cx, cy) {
  var f = 1 + b.ht, rx = cx + (b.x - cx) * f, ry = cy + (b.y - cy) * f, rw = b.w * f, rh = b.h * f;
  var x0 = b.x, y0 = b.y, x1 = b.x + b.w, y1 = b.y + b.h;
  function quad(ax, ay, bx, by, ex, ey, fx, fy, col) { ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.lineTo(ex, ey); ctx.lineTo(fx, fy); ctx.closePath(); ctx.fill(); }
  if (x0 > cx) quad(x0, y0, rx, ry, rx, ry + rh, x0, y1, b.w1);
  if (x1 < cx) quad(x1, y0, rx + rw, ry, rx + rw, ry + rh, x1, y1, b.w1);
  if (y0 > cy) quad(x0, y0, x1, y0, rx + rw, ry, rx, ry, b.w2);
  if (y1 < cy) quad(x0, y1, x1, y1, rx + rw, ry + rh, rx, ry + rh, b.w2);
  ctx.fillStyle = b.roof; ctx.fillRect(rx, ry, rw, rh);
  var st = b.st, i, n;
  if (st === 'tower') {
    ctx.fillStyle = b.lo; ctx.fillRect(rx + 5 * f, ry + 5 * f, rw - 10 * f, rh - 10 * f);
    ctx.fillStyle = b.hi; ctx.fillRect(rx + rw * (0.15 + b.r * 0.4), ry + rh * 0.2, 12 * f, 9 * f); ctx.fillRect(rx + rw * 0.6, ry + rh * (0.5 + b.r * 0.25), 9 * f, 12 * f);
    if (b.r > 0.72 && rw > 80 && rh > 80) {
      ctx.strokeStyle = '#e8e2c0'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(rx + rw / 2, ry + rh / 2, 20 * f, 0, TAU); ctx.stroke();
      ctx.fillStyle = '#e8e2c0'; ctx.fillRect(rx + rw / 2 - 8 * f, ry + rh / 2 - 9 * f, 3.5 * f, 18 * f); ctx.fillRect(rx + rw / 2 + 4.5 * f, ry + rh / 2 - 9 * f, 3.5 * f, 18 * f); ctx.fillRect(rx + rw / 2 - 8 * f, ry + rh / 2 - 1.7 * f, 16 * f, 3.5 * f);
    }
  } else if (st === 'house') {
    ctx.fillStyle = b.hi;
    if (b.r < 0.5) { ctx.fillRect(rx, ry, rw, rh / 2); ctx.fillStyle = b.w1; ctx.fillRect(rx, ry + rh / 2 - 1, rw, 2); }
    else { ctx.fillRect(rx, ry, rw / 2, rh); ctx.fillStyle = b.w1; ctx.fillRect(rx + rw / 2 - 1, ry, 2, rh); }
    ctx.fillStyle = '#5a5048'; ctx.fillRect(rx + rw * 0.7, ry + rh * 0.18, 6 * f, 6 * f);
  } else if (st === 'ware') {
    ctx.fillStyle = b.lo; n = Math.floor(rw / (12 * f));
    for (i = 1; i < n; i++) ctx.fillRect(rx + i * 12 * f, ry, 2, rh);
    ctx.fillStyle = b.hi; ctx.fillRect(rx, ry + rh / 2 - 2 * f, rw, 4 * f);
  } else if (st === 'neon') {
    ctx.fillStyle = b.w2; ctx.fillRect(rx + 4 * f, ry + 4 * f, rw - 8 * f, rh - 8 * f);
    ctx.fillStyle = b.hi; ctx.globalAlpha = 0.55 + 0.35 * Math.sin(time * 3 + b.r * 20);
    ctx.fillRect(rx + 8 * f, ry + 8 * f, rw - 16 * f, 3 * f); ctx.fillRect(rx + 8 * f, ry + rh - 11 * f, rw - 16 * f, 3 * f);
    ctx.globalAlpha = 1;
  } else if (st === 'cont') {
    ctx.fillStyle = b.lo; n = Math.floor(rw / 7);
    for (i = 1; i < n; i++) ctx.fillRect(rx + i * 7, ry + 2, 1.5, rh - 4);
  } else { ctx.fillStyle = b.lo; ctx.fillRect(rx + 3, ry + 3, rw - 6, rh * 0.4); }
  if (roofPat && rw > 30) { ctx.save(); ctx.translate(rx, ry); ctx.globalAlpha = 0.1; ctx.fillStyle = roofPat; ctx.fillRect(0, 0, rw, rh); ctx.restore(); }
  ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.lineWidth = 1; ctx.strokeRect(rx + 0.5, ry + 0.5, rw - 1, rh - 1);
}
function txt(s, x, y, size, col, align, font) {
  ctx.font = (font ? '' : 'bold ') + Math.round(size) + 'px ' + (font || '"Trebuchet MS","Segoe UI",Verdana,sans-serif');
  ctx.textAlign = align || 'left'; ctx.textBaseline = 'middle';
  ctx.lineWidth = Math.max(2, size * 0.22); ctx.strokeStyle = 'rgba(15,16,20,0.9)'; ctx.lineJoin = 'round';
  ctx.strokeText(s, x, y); ctx.fillStyle = col; ctx.fillText(s, x, y);
}
var DISPLAY = 'Impact,"Arial Narrow Bold","Haettenschweiler","Arial Black",sans-serif';
function star(x, y, r, on) {
  ctx.beginPath();
  for (var i = 0; i < 10; i++) { var a = -PI / 2 + i * PI / 5, q = i % 2 ? r * 0.45 : r; ctx[i ? 'lineTo' : 'moveTo'](x + Math.cos(a) * q, y + Math.sin(a) * q); }
  ctx.closePath(); ctx.fillStyle = on ? '#f5c518' : 'rgba(20,20,24,0.55)'; ctx.fill();
  ctx.lineWidth = Math.max(1, r * 0.16); ctx.strokeStyle = '#15161a'; ctx.stroke();
}
var visB = [];
function render() {
  var cw = cv.width, ch = cv.height, z = cam.z, i, x, y;
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1;
  ctx.fillStyle = '#2a6fb0'; ctx.fillRect(0, 0, cw, ch);
  ctx.setTransform(z, 0, 0, z, Math.round(cw / 2 - cam.x * z), Math.round(ch / 2 - cam.y * z));
  ctx.imageSmoothingEnabled = false;
  var vx0 = cam.x - cw / 2 / z, vy0 = cam.y - ch / 2 / z, vx1 = cam.x + cw / 2 / z, vy1 = cam.y + ch / 2 / z;
  var c0 = Math.max(0, Math.floor(vx0 / CS)), c1 = Math.min(NC - 1, Math.floor(vx1 / CS)), r0 = Math.max(0, Math.floor(vy0 / CS)), r1 = Math.min(NC - 1, Math.floor(vy1 / CS));
  for (y = r0; y <= r1; y++) for (x = c0; x <= c1; x++) ctx.drawImage(getChunk(x, y), x * CS, y * CS, CS + 0.6, CS + 0.6);

  for (i = 0; i < decals.length; i++) {
    var d = decals[i]; if (d.x < vx0 - 40 || d.x > vx1 + 40 || d.y < vy0 - 40 || d.y > vy1 + 40) continue;
    ctx.fillStyle = d.k === 1 ? 'rgba(15,15,15,0.55)' : 'rgba(150,16,16,0.75)';
    ctx.beginPath(); ctx.arc(d.x, d.y, d.r, 0, TAU); ctx.fill();
    if (d.k === 2) { ctx.globalAlpha = 0.85; drawSpr(d.g ? gangSpr(2) : pedSpr(2, d.si, d.hi), d.x, d.y, d.a, PED_S); ctx.globalAlpha = 1; }
  }
  if (mission && started) {
    var pr = 26 + Math.sin(time * 5) * 5, mk0 = mission.pk.length ? mission.pk : [{ x: mission.mx, y: mission.my }];
    for (i = 0; i < mk0.length; i++) {
      ctx.strokeStyle = '#f5c518'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(mk0[i].x, mk0[i].y, pr, 0, TAU); ctx.stroke();
      ctx.fillStyle = 'rgba(245,197,24,0.22)'; ctx.beginPath(); ctx.arc(mk0[i].x, mk0[i].y, pr, 0, TAU); ctx.fill();
      if (mission.pk.length) ctx.drawImage(spr('cash'), mk0[i].x - 10, mk0[i].y - 10, 20, 20);
    }
  }
  for (i = 0; i < pickups.length; i++) {
    var pk = pickups[i], bs = 2 + Math.sin(time * 4 + i) * 0.25, ps = spr(pk.k);
    ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fillRect(pk.x - 9, pk.y - 7, 20, 20);
    ctx.drawImage(ps, pk.x - 5 * bs, pk.y - 5 * bs, 10 * bs, 10 * bs);
  }
  for (i = 0; i < peds.length; i++) {
    var p = peds[i]; if (p.dead || p.x < vx0 - 20 || p.x > vx1 + 20 || p.y < vy0 - 20 || p.y > vy1 + 20) continue;
    if (p.g) {
      if (p.hostile) { ctx.fillStyle = 'rgba(226,58,48,0.3)'; ctx.beginPath(); ctx.arc(p.x, p.y, 12, 0, TAU); ctx.fill(); }
      drawSpr(gangSpr(p.hostile ? 2 : Math.floor(p.t * 6) % 2), p.x, p.y, p.a, PED_S);
    } else drawSpr(pedSpr(Math.floor(p.t * 6) % 2, p.si, p.hi), p.x, p.y, p.a, PED_S);
  }
  if (!player.car && !player.dead) {
    ctx.fillStyle = 'rgba(245,197,24,0.25)'; ctx.beginPath(); ctx.arc(player.x, player.y, 13, 0, TAU); ctx.fill();
    drawSpr(plSpr(player.shootT > 0 ? 2 : Math.floor(player.walk * 7) % 2), player.x, player.y, player.a, PED_S + 0.2);
  }
  for (i = 0; i < cars.length; i++) { var c = cars[i]; if (!c.dead && c.x > vx0 - 60 && c.x < vx1 + 60 && c.y > vy0 - 60 && c.y < vy1 + 60) drawCar(c); }
  ctx.strokeStyle = '#fff3b0'; ctx.lineWidth = 2; ctx.beginPath();
  for (i = 0; i < bullets.length; i++) { var b = bullets[i]; ctx.moveTo(b.x, b.y); ctx.lineTo(b.x - b.vx * 0.016, b.y - b.vy * 0.016); }
  ctx.stroke();
  for (i = 0; i < parts.length; i++) { var q = parts[i]; ctx.globalAlpha = clamp(q.l / q.m, 0, 1); ctx.fillStyle = q.c; ctx.fillRect(q.x - q.s / 2, q.y - q.s / 2, q.s, q.s); }
  ctx.globalAlpha = 1;

  var tx0 = Math.max(0, Math.floor(vx0 / T) - 1), tx1 = Math.min(N - 1, Math.floor(vx1 / T) + 1), ty0 = Math.max(0, Math.floor(vy0 / T) - 1), ty1 = Math.min(N - 1, Math.floor(vy1 / T) + 1);
  for (y = ty0; y <= ty1; y++) for (x = tx0; x <= tx1; x++) {
    var dc = deco[x + y * N]; if (!dc) continue;
    var ds = spr(dc === 1 ? 'tree' : dc === 2 ? 'palm' : 'bush'), sc = dc === 3 ? 2 : 2.7, wd = ds.width * sc;
    ctx.drawImage(ds, (x + 0.5) * T - wd / 2, (y + 0.5) * T - wd / 2, wd, wd);
  }
  visB.length = 0;
  for (i = 0; i < buildings.length; i++) {
    var bb = buildings[i]; if (bb.x > vx1 || bb.x + bb.w < vx0 || bb.y > vy1 || bb.y + bb.h < vy0) continue;
    bb.d = Math.max(Math.abs(bb.x + bb.w / 2 - cam.x), Math.abs(bb.y + bb.h / 2 - cam.y)); visB.push(bb);
  }
  visB.sort(function (a, b) { return b.d - a.d; });
  for (i = 0; i < visB.length; i++) drawBuilding(visB[i], cam.x, cam.y);

  // ---------- HUD
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  var u = PR * clamp(Math.min(cw, ch) / PR / 430, 0.62, 1.5), pad = 10 * u;
  if (player.flash > 0) { ctx.fillStyle = 'rgba(200,20,20,' + (player.flash * 1.2) + ')'; ctx.fillRect(0, 0, cw, ch); }
  if (!started) return;
  if (!touchUI && !player.dead && time - mouse.t < 4) {
    ctx.strokeStyle = 'rgba(255,255,255,0.85)'; ctx.lineWidth = Math.max(1, 1.5 * PR); ctx.beginPath();
    ctx.moveTo(mouse.x - 8 * PR, mouse.y); ctx.lineTo(mouse.x - 3 * PR, mouse.y); ctx.moveTo(mouse.x + 3 * PR, mouse.y); ctx.lineTo(mouse.x + 8 * PR, mouse.y);
    ctx.moveTo(mouse.x, mouse.y - 8 * PR); ctx.lineTo(mouse.x, mouse.y - 3 * PR); ctx.moveTo(mouse.x, mouse.y + 3 * PR); ctx.lineTo(mouse.x, mouse.y + 8 * PR); ctx.stroke();
  }
  txt('$' + cash, pad, pad + 13 * u, 28 * u, '#f5c518', 'left', DISPLAY);
  var bw = 120 * u, bh = 9 * u, by = pad + 33 * u;
  ctx.fillStyle = 'rgba(15,16,20,0.8)'; ctx.fillRect(pad - 2, by - 2, bw + 4, bh + 4);
  ctx.fillStyle = player.hp > 35 ? '#d83a32' : (Math.floor(time * 5) % 2 ? '#ff6a5a' : '#8a1a14'); ctx.fillRect(pad, by, bw * clamp(player.hp / 100, 0, 1), bh);
  if (player.car) { ctx.fillStyle = 'rgba(15,16,20,0.8)'; ctx.fillRect(pad - 2, by + bh + 3 * u, bw + 4, bh * 0.6 + 4); ctx.fillStyle = '#9aa4b0'; ctx.fillRect(pad, by + bh + 3 * u + 2, bw * clamp(player.car.hp / player.car.t.hp, 0, 1), bh * 0.6); }
  txt(player.weapon ? 'SMG ' + player.ammo : 'Pistol', pad, by + 30 * u, 13 * u, '#f1ede2');
  txt(RANKS[rank()][1] + ' · ' + jobs + (jobs === 1 ? ' job' : ' jobs'), pad, by + 46 * u, 11 * u, '#f5c518');
  if (best > 0) txt('Best $' + best, pad, by + 61 * u, 10 * u, '#b9bcc4');
  if (player.car && !touchUI) txt(steerMode ? 'C: steering by screen' : 'C: steering by driver view', pad, by + (best > 0 ? 75 : 61) * u, 10 * u, '#b9bcc4');
  for (i = 0; i < 4; i++) star(cw / 2 + (i - 1.5) * 24 * u, pad + 12 * u, 10 * u, i < wanted && (wanted < 3 || Math.floor(time * 4 + i) % 2 === 0 || i < wanted - 1));
  // minimap
  var ms = clamp(Math.min(cw, ch) * 0.27, 84 * PR, 190 * PR), mx = cw - ms - pad, my = pad;
  ctx.fillStyle = '#15161a'; ctx.fillRect(mx - 3, my - 3, ms + 6, ms + 6);
  ctx.imageSmoothingEnabled = false; ctx.drawImage(mm, mx, my, ms, ms);
  var mk = ms / W;
  if (mission) {
    var mdots = mission.pk.length ? mission.pk : [{ x: mission.mx, y: mission.my }];
    ctx.fillStyle = Math.floor(time * 3) % 2 ? '#f5c518' : '#fff';
    for (i = 0; i < mdots.length; i++) ctx.fillRect(mx + mdots[i].x * mk - 3 * u, my + mdots[i].y * mk - 3 * u, 6 * u, 6 * u);
  }
  for (i = 0; i < cars.length; i++) if (cars[i].chase) { ctx.fillStyle = Math.floor(time * 6) % 2 ? '#ff3030' : '#4a7aff'; ctx.fillRect(mx + cars[i].x * mk - 2 * u, my + cars[i].y * mk - 2 * u, 4 * u, 4 * u); }
  ctx.save(); ctx.translate(mx + player.x * mk, my + player.y * mk); ctx.rotate(player.a);
  ctx.fillStyle = '#fff'; ctx.strokeStyle = '#15161a'; ctx.lineWidth = Math.max(1, u);
  ctx.beginPath(); ctx.moveTo(6 * u, 0); ctx.lineTo(-4 * u, -4 * u); ctx.lineTo(-2 * u, 0); ctx.lineTo(-4 * u, 4 * u); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore();
  if (curDist >= 0) txt(DIST[curDist].n, mx + ms, my + ms + 11 * u, 11 * u, '#f1ede2', 'right');
  // mission arrow + text
  if (mission && !player.dead) {
    var sx = (mission.mx - cam.x) * z + cw / 2, sy = (mission.my - cam.y) * z + ch / 2;
    if (sx < 0 || sy < 0 || sx > cw || sy > ch) {
      var aa = Math.atan2(sy - ch / 2, sx - cw / 2), rad = Math.min(cw, ch) * 0.36;
      ctx.save(); ctx.translate(cw / 2 + Math.cos(aa) * rad, ch / 2 + Math.sin(aa) * rad); ctx.rotate(aa);
      ctx.fillStyle = '#f5c518'; ctx.strokeStyle = '#15161a'; ctx.lineWidth = 2 * u;
      ctx.beginPath(); ctx.moveTo(13 * u, 0); ctx.lineTo(-8 * u, -9 * u); ctx.lineTo(-3 * u, 0); ctx.lineTo(-8 * u, 9 * u); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore();
    }
    var bx = touchUI ? cw / 2 : pad, al = touchUI ? 'center' : 'left', byy = touchUI ? pad + 34 * u : ch - pad - 8 * u;
    txt(missionText(), bx, byy, 12 * u, '#f5c518', al);
  }
  if (!player.car && !player.dead && !touchUI && nearestCar(30)) txt('E / right click: get in', cw / 2, ch * 0.62, 13 * u, '#fff', 'center');
  if (note.t > 0) { ctx.globalAlpha = clamp(note.t, 0, 1); txt(note.txt, cw / 2, ch * 0.76, 14 * u, '#fff', 'center'); ctx.globalAlpha = 1; }
  if (banner.t > 0) { ctx.globalAlpha = clamp(banner.t, 0, 1); txt(banner.txt, cw / 2, ch * 0.24, 30 * u, '#f1ede2', 'center', DISPLAY); ctx.globalAlpha = 1; }
  if (bustT > 0.2) txt('Police closing in ...', cw / 2, ch * 0.4, 14 * u, '#7aa2ff', 'center');
  if (stick.id >= 0) {
    ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 3 * PR; ctx.beginPath(); ctx.arc(stick.ox * PR, stick.oy * PR, 42 * PR, 0, TAU); ctx.stroke();
    ctx.fillStyle = 'rgba(245,197,24,0.7)'; ctx.beginPath(); ctx.arc((stick.ox + stick.x * 42) * PR, (stick.oy + stick.y * 42) * PR, 18 * PR, 0, TAU); ctx.fill();
  }
  if (over.t > 0) {
    ctx.fillStyle = 'rgba(15,16,20,0.45)'; ctx.fillRect(0, 0, cw, ch);
    txt(over.msg, cw / 2, ch * 0.45, 58 * u, over.msg === 'ARRESTED' ? '#6f9aff' : '#e23a30', 'center', DISPLAY);
    txt(over.sub, cw / 2, ch * 0.45 + 44 * u, 13 * u, '#f1ede2', 'center');
  } else if (paused) {
    ctx.fillStyle = 'rgba(15,16,20,0.5)'; ctx.fillRect(0, 0, cw, ch);
    txt('Paused', cw / 2, ch / 2, 50 * u, '#f5c518', 'center', DISPLAY);
    txt('Press P to continue', cw / 2, ch / 2 + 40 * u, 13 * u, '#f1ede2', 'center');
  }
}

// ---------- boot
function resize() {
  var w = cv.clientWidth || window.innerWidth || 640, h = cv.clientHeight || window.innerHeight || 400;
  var pr = Math.min(window.devicePixelRatio || 1, 2);
  if (w * h * pr * pr > 2.4e6) pr = Math.sqrt(2.4e6 / (w * h));
  var W2 = Math.max(2, Math.round(w * pr)), H2 = Math.max(2, Math.round(h * pr));
  if (cv.width !== W2 || cv.height !== H2) { cv.width = W2; cv.height = H2; }
  PR = pr; baseZ = clamp(Math.sqrt(W2 * H2) / 520, 0.55 * pr, 3.2 * pr);
}
var lastT = 0;
function frame(ts) {
  requestAnimationFrame(frame);
  var dt = Math.min(0.05, Math.max(0, (ts - lastT) / 1000 || 0)); lastT = ts;
  resize();
  if (!paused) update(dt);
  render();
}
function boot() {
  var i;
  gen();
  for (i = 0; i < TEXN.length; i++) TEX.push(spr(TEXN[i]));
  try { roofPat = ctx.createPattern(spr('roofn'), 'repeat'); } catch (e) { roofPat = null; }
  player.x = (startTile[0] + 0.5) * T; player.y = (startTile[1] + 0.5) * T;
  resize(); cam.x = player.x; cam.y = player.y; cam.z = baseZ;
  for (i = 0; i < 90 && cars.length < 17; i++) spawnCar(110, 900, false);
  for (i = 0; i < 90 && peds.length < 42; i++) spawnPed(50, 900);
  for (i = 0; i < 12 && pickups.length < 6; i++) spawnPickup();
  var sb = document.getElementById('steer');
  if (sb) {
    sb.addEventListener('pointerdown', function (e) { e.stopPropagation(); });
    sb.addEventListener('click', function (e) { e.stopPropagation(); toggleSteer(); });
  }
  showSteer();
  var bl = document.getElementById('best');
  if (bl && best > 0) bl.textContent = 'Your best on this device: $' + best;
  requestAnimationFrame(frame);
}
boot();
})();
