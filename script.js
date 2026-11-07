(() => {
'use strict';
const cv = document.getElementById('game');
const ctx = cv.getContext('2d');
const dashBtn = document.getElementById('dashBtn');
const T = 16, ROWS = 15, VH = ROWS * T, TAU = Math.PI * 2;
let scale = 1, VW = 320, SH = VH, offY = 0, touch = false, dpr = 1;

function resize() {
  dpr = Math.min(window.devicePixelRatio || 1, 2);
  cv.width = Math.max(1, Math.floor(innerWidth * dpr));
  cv.height = Math.max(1, Math.floor(innerHeight * dpr));
  const ex = touch ? 46 : 0;
  scale = Math.min(cv.height / (VH + ex), cv.width / 224);
  VW = cv.width / scale;
  SH = cv.height / scale;
  offY = SH - (VH + ex);
}
function setTouch() {
  if (touch) return;
  touch = true;
  document.body.classList.add('touch');
  resize();
}
resize();
try { if (window.matchMedia('(pointer: coarse)').matches) setTouch(); } catch (e) {}
addEventListener('resize', resize);

function rng(seed) {
  return () => {
    seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ---------- audio ---------- */
let ac = null, master = null, musicGain = null, nbuf = null, muted = false;
function initAudio() {
  if (ac) { if (ac.state === 'suspended') ac.resume(); return; }
  try {
    ac = new (window.AudioContext || window.webkitAudioContext)();
    master = ac.createGain(); master.gain.value = muted ? 0 : 0.5; master.connect(ac.destination);
    musicGain = ac.createGain(); musicGain.gain.value = 0.4; musicGain.connect(master);
    nbuf = ac.createBuffer(1, ac.sampleRate, ac.sampleRate);
    const d = nbuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  } catch (e) { ac = null; }
}
function toggleMute() {
  muted = !muted;
  if (master) master.gain.value = muted ? 0 : 0.5;
}
const note = n => 261.63 * Math.pow(2, n / 12);
function tn(f, d, type, vol, at, slide, dest) {
  const o = ac.createOscillator(), g = ac.createGain();
  o.type = type; o.frequency.setValueAtTime(f, at);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, f + slide), at + d);
  g.gain.setValueAtTime(vol, at); g.gain.exponentialRampToValueAtTime(0.001, at + d);
  o.connect(g); g.connect(dest || master); o.start(at); o.stop(at + d + 0.02);
}
function nz(d, vol, at, hp, dest) {
  const s = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain();
  s.buffer = nbuf; f.type = 'highpass'; f.frequency.value = hp;
  g.gain.setValueAtTime(vol, at); g.gain.exponentialRampToValueAtTime(0.001, at + d);
  s.connect(f); f.connect(g); g.connect(dest || master); s.start(at); s.stop(at + d + 0.02);
}
function S(f, d, type = 'square', vol = 0.1, delay = 0, slide = 0) { if (ac) tn(f, d, type, vol, ac.currentTime + delay, slide); }
function N(d, vol, delay = 0, hp = 1000) { if (ac) nz(d, vol, ac.currentTime + delay, hp); }
const arp = (ns, step, type, vol, dur) => ns.forEach((n, i) => S(note(n), dur, type, vol, i * step));
const sfx = {
  jump() { S(330, 0.14, 'square', 0.09, 0, 330); },
  dj() { S(520, 0.16, 'square', 0.09, 0, 520); N(0.1, 0.05, 0, 3000); },
  coin() { S(988, 0.07, 'square', 0.07); S(1319, 0.22, 'square', 0.07, 0.07); },
  stomp() { S(240, 0.15, 'triangle', 0.3, 0, -180); N(0.08, 0.12, 0, 800); },
  bump() { S(110, 0.1, 'triangle', 0.3, 0, -40); },
  brk() { N(0.25, 0.25, 0, 400); S(160, 0.1, 'square', 0.07, 0, -110); },
  power() { arp([0, 4, 7, 12, 16, 19, 24], 0.05, 'square', 0.08, 0.1); },
  surprise() { S(700, 0.3, 'sawtooth', 0.06, 0, -500); S(250, 0.3, 'square', 0.06, 0.12, 700); },
  hurt() { S(440, 0.35, 'sawtooth', 0.12, 0, -330); },
  lvl() { arp([12, 16, 19, 24, 19, 24, 28, 31, 36], 0.07, 'square', 0.08, 0.12); },
  clear() { arp([0, 4, 7, 12, 16, 12, 16, 19, 24], 0.11, 'square', 0.09, 0.18); [0, 7, 12].forEach((n, i) => S(note(n - 12), 0.4, 'triangle', 0.25, i * 0.33)); },
  dash() { N(0.2, 0.15, 0, 2000); S(200, 0.2, 'square', 0.06, 0, 600); },
  over() { arp([7, 4, 0, -5, -12], 0.25, 'triangle', 0.25, 0.3); },
  gem() { arp([12, 19, 24, 31], 0.06, 'triangle', 0.15, 0.14); },
  locked() { S(150, 0.12, 'square', 0.06); }
};

/* ---------- music: procedural catchy loop per world ---------- */
const PROG = [0, -3, 5, 7];
let song = null, mStep = 0, mNext = 0;
function makeSong(n) {
  const r = rng(n * 7919 + 3);
  const pent = [0, 2, 4, 7, 9, 12, 14, 16, 19];
  const motif = () => {
    const m = []; let i = 3 + (r() * 3 | 0);
    for (let k = 0; k < 8; k++) {
      if (k % 2 && r() < 0.25) { m.push(-1); continue; }
      i = Math.max(0, Math.min(8, i + ((r() * 5 | 0) - 2)));
      m.push(pent[i]);
    }
    return m;
  };
  const A = motif(), B = motif(), C = motif();
  return { root: [0, 2, -3, 5, -5, 3][n % 6], bars: [A, B, A, C], tempo: Math.max(0.12, 0.16 - n * 0.002) };
}
function music() {
  if (!ac || !song || muted || !(state === 'play' || state === 'title')) { if (ac) mNext = ac.currentTime + 0.1; return; }
  if (mNext < ac.currentTime) mNext = ac.currentTime + 0.05;
  while (mNext < ac.currentTime + 0.25) {
    const s = mStep % 32, bar = s >> 3, k = s & 7, m = song.bars[bar][k];
    const tp = song.tempo * (P.star > 0 ? 0.75 : 1);
    if (m >= 0) tn(note(song.root + m), tp * 0.85, 'square', 0.05, mNext, 0, musicGain);
    if (k % 2 === 0) tn(note(song.root + PROG[bar] - 12 + (k === 4 ? 7 : 0)), tp * 1.6, 'triangle', 0.22, mNext, 0, musicGain);
    else nz(0.04, 0.05, mNext, 6000, musicGain);
    if (k === 0 || k === 4) tn(150, 0.12, 'sine', 0.35, mNext, -110, musicGain);
    mStep++; mNext += tp;
  }
}

/* ---------- state ---------- */
let state = 'title', stT = 0, world = 1, hp = 3, coins = 0, camX = 0, time = 0, combo = 0, shake = 0;
let map, W, ents, coinL, items, parts, texts, bumps, flagX, mod, safe, rainT = 0, startReq = false;
const banners = [];
const prog = { lv: 1, xp: 0 };
const P = { x: 0, y: 0, w: 12, h: 14, vx: 0, vy: 0, on: false, face: 1, air: 1, coy: 0, inv: 0, star: 0, boots: 0, dash: 0, dcd: 0, anim: 0, glide: false, jumping: false };
const held = { left: 0, right: 0, jump: 0, dash: 0 };
let jb = 0, db = 0;

const perk = { dj: () => prog.lv >= 2, mag: () => prog.lv >= 3, dash: () => prog.lv >= 5, glide: () => prog.lv >= 7 };
const maxHp = () => Math.min(8, 3 + (prog.lv >= 4) + (prog.lv >= 6) + Math.max(0, Math.floor((prog.lv - 6) / 2)));
const speed = () => 100 * (1 + Math.min(0.25, (prog.lv - 1) * 0.02)) * (mod === 'TURBO' ? 1.3 : 1);
const xpNeed = l => 50 + l * 30;
const PERKS = { 2: 'DOUBLE JUMP!', 3: 'COIN MAGNET!', 4: '+1 MAX HEART', 5: 'DASH! (Shift / X)', 6: '+1 MAX HEART', 7: 'GLIDE! (hold jump)' };

function banner(s, sub, t = 2.2) { banners.push({ s, sub: sub || '', t, max: t }); }
function float(x, y, s, col) { texts.push({ x, y, s, col: col || '#fff', t: 1 }); }
function addXp(n) {
  prog.xp += n;
  while (prog.xp >= xpNeed(prog.lv)) {
    prog.xp -= xpNeed(prog.lv); prog.lv++;
    const l = prog.lv;
    const msg = PERKS[l] || (l % 2 === 0 && l <= 12 ? '+1 MAX HEART' : 'SPEED UP!');
    hp = maxHp();
    banner('LEVEL ' + l + '!', msg, 2.6);
    sfx.lvl();
    for (let i = 0; i < 24; i++) parts.push({ x: P.x + 6, y: P.y + 7, vx: Math.cos(i / 24 * TAU) * 120, vy: Math.sin(i / 24 * TAU) * 120, g: 0, life: 0.6, col: 'hsl(' + i * 15 + ',90%,65%)', s: 2 });
    updDash();
  }
}
function updDash() { if (dashBtn) dashBtn.textContent = perk.dash() ? 'DASH' : 'Lv5'; }

/* ---------- level generation ---------- */
const tileAt = (tx, ty) => tx < 0 ? 1 : (tx >= W || ty < 0 || ty >= ROWS) ? 0 : map[ty * W + tx];
const solid = t => t === 1 || t === 2 || t === 3 || t === 4 || t === 6 || t === 8;
function mkFoe(x, y, type, diff) {
  return { x, y, w: 14, h: 14, vx: -(28 + diff * 22), vy: 0, type, act: 0, ht: 1 + Math.random(), on: false, dead: 0, sqd: 0, sq: 0 };
}
function gen(n) {
  const r = rng(n * 9973 + 17);
  W = Math.min(400, 100 + n * 16);
  map = new Uint8Array(W * ROWS);
  ents = []; coinL = []; items = []; parts = []; texts = []; bumps = [];
  const set = (x, y, t) => { if (x >= 0 && x < W && y >= 0 && y < ROWS) map[y * W + x] = t; };
  const gnd = x => { set(x, 13, 1); set(x, 14, 1); };
  const coin = (tx, ty) => coinL.push({ x: tx * T + 4, y: ty * T + 4, w: 8, h: 8 });
  const diff = Math.min(1, (n - 1) / 10);
  const foe = (tx, ty = 12) => {
    const k = r();
    const type = n >= 4 && k < 0.05 + 0.15 * diff ? 'spiky' : (n >= 2 && k < 0.45 ? 'hop' : 'walk');
    ents.push(mkFoe(tx * T + 1, ty * T + 2, type, diff));
  };
  let x = 0;
  for (; x < 14; x++) gnd(x);
  const end = W - 24;
  while (x < end) {
    const c = r();
    if (c < 0.2) { // flat run
      const L = 4 + (r() * 6 | 0);
      for (let i = 0; i < L; i++) gnd(x + i);
      if (r() < 0.6) for (let i = 1; i < L - 1; i++) coin(x + i, i === 1 || i === L - 2 ? 11 : 10);
      if (r() < 0.35 + diff * 0.45) foe(x + L - 2);
      x += L;
    } else if (c < 0.36) { // gap
      const g = 2 + (r() < 0.3 + diff * 0.4 ? 1 : 0);
      for (let i = 0; i < g; i++) coin(x + i, 9);
      x += g;
      for (let i = 0; i < 3; i++) gnd(x + i);
      x += 3;
    } else if (c < 0.52) { // block row
      const L = 3 + (r() * 4 | 0);
      for (let i = 0; i < L + 2; i++) gnd(x + i);
      for (let i = 0; i < L; i++) set(x + 1 + i, 9, r() < 0.35 ? 3 : 2);
      if (r() < 0.35) set(x + 1 + (L >> 1), 5, 3);
      else for (let i = 0; i < L; i++) coin(x + 1 + i, 8);
      if (r() < 0.5) foe(x + L);
      if (r() < 0.18) set(x + L + 1, 9, 7); // hidden block
      x += L + 2;
    } else if (c < 0.64) { // crystal tower
      const h = 2 + (r() * 2 | 0);
      for (let i = 0; i < 7; i++) gnd(x + i);
      for (let y = 13 - h; y < 13; y++) { set(x + 2, y, 6); set(x + 3, y, 6); }
      coin(x + 2, 12 - h); coin(x + 3, 12 - h);
      if (r() < 0.5) foe(x + 5);
      x += 7;
    } else if (c < 0.75) { // stairs
      const s = 3 + (r() * 2 | 0);
      for (let i = 0; i < s; i++) { gnd(x + i); for (let k = 0; k <= i; k++) set(x + i, 12 - k, 8); }
      x += s;
      if (r() < 0.5) { coin(x, 12 - s); coin(x + 1, 12 - s); x += 2; }
      for (let i = 0; i < s; i++) { gnd(x + i); for (let k = 0; k < s - i; k++) set(x + i, 12 - k, 8); }
      x += s;
      gnd(x); gnd(x + 1); x += 2;
    } else if (c < 0.86) { // spikes
      const s = 1 + (r() * (1 + diff * 2) | 0);
      for (let i = 0; i < 7; i++) gnd(x + i);
      for (let i = 0; i < s; i++) { set(x + 2 + i, 12, 5); coin(x + 2 + i, 9); }
      x += 7;
    } else { // floating platform over a wide pit
      const g = 5 + (r() * 2 | 0);
      const p = 1 + (r() * (g - 4) | 0);
      for (let i = 0; i < 3; i++) { set(x + p + i, 10, 8); coin(x + p + i, 9); }
      x += g;
      for (let i = 0; i < 3; i++) gnd(x + i);
      x += 3;
    }
  }
  for (; x < W; x++) gnd(x);
  flagX = (W - 10) * T;
  const mods = ['LOW GRAVITY', 'NIGHT RUN', 'COIN RAIN', 'TURBO', 'BOUNCY'];
  mod = n >= 2 && r() < 0.5 ? mods[r() * mods.length | 0] : '';
  Object.assign(P, { x: 3 * T, y: 13 * T - P.h, vx: 0, vy: 0, on: true, face: 1, air: 1, inv: 0, star: 0, boots: 0, dash: 0, dcd: 0, jumping: false });
  safe = { x: P.x, y: P.y };
  camX = 0; combo = 0;
  song = makeSong(n); mStep = 0;
}

/* ---------- physics ---------- */
function colX(b) {
  const y0 = Math.floor(b.y / T), y1 = Math.floor((b.y + b.h - 0.01) / T);
  if (b.vx > 0) {
    const tx = Math.floor((b.x + b.w) / T);
    for (let ty = y0; ty <= y1; ty++) if (solid(tileAt(tx, ty))) { b.x = tx * T - b.w - 0.001; return true; }
  } else if (b.vx < 0) {
    const tx = Math.floor(b.x / T);
    for (let ty = y0; ty <= y1; ty++) if (solid(tileAt(tx, ty))) { b.x = (tx + 1) * T + 0.001; return true; }
  }
  return false;
}
function colY(b, pl) {
  const x0 = Math.floor(b.x / T), x1 = Math.floor((b.x + b.w - 0.01) / T);
  if (b.vy >= 0) {
    const ty = Math.floor((b.y + b.h) / T);
    for (let tx = x0; tx <= x1; tx++) if (solid(tileAt(tx, ty))) { b.y = ty * T - b.h; b.vy = 0; b.on = true; return; }
  } else {
    const ty = Math.floor(b.y / T);
    let best = -1, bd = 99;
    for (let tx = x0; tx <= x1; tx++) {
      const t = tileAt(tx, ty);
      if (solid(t) || (pl && t === 7)) { const d = Math.abs(tx * T + 8 - (b.x + b.w / 2)); if (d < bd) { bd = d; best = tx; } }
    }
    if (best >= 0) { b.y = (ty + 1) * T; b.vy = 0; if (pl) bump(best, ty); }
  }
}
const overlap = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

function getCoin(x, y) {
  coins++; addXp(2); sfx.coin();
  float(x, y, '+1', '#ffe066');
  if (coins % 50 === 0) {
    if (hp < maxHp()) { hp++; banner('+1 HEART', '50 coins!'); } else addXp(25);
  }
}
function kill(e) { e.dead = 1; e.vy = -220; e.vx = P.face * 70; sfx.stomp(); addXp(10); float(e.x, e.y, '+10'); }
function bump(tx, ty) {
  const t = tileAt(tx, ty), cx = tx * T, cy = ty * T;
  if (t === 3 || t === 7) {
    map[ty * W + tx] = 4; bumps.push({ tx, ty, t: 0.15 }); addXp(5); sfx.bump();
    surprise(cx, cy, t === 7);
  } else if (t === 2) {
    map[ty * W + tx] = 0; sfx.brk(); addXp(2);
    for (let i = 0; i < 4; i++) parts.push({ x: cx + 4 + (i % 2) * 8, y: cy + 4 + (i >> 1) * 8, vx: (i % 2 ? 1 : -1) * 60, vy: i < 2 ? -260 : -160, g: 900, life: 0.8, col: '#c8642e', s: 5 });
  } else sfx.bump();
  for (const e of ents) if (!e.dead && !e.sqd && e.x + e.w > cx && e.x < cx + T && Math.abs(e.y + e.h - cy) < 4) kill(e);
}
function surprise(cx, cy, hidden) {
  if (hidden) {
    sfx.gem(); float(cx, cy - 10, 'SECRET!', '#7ff');
    for (let i = 0; i < 5; i++) { parts.push({ x: cx + 8, y: cy, vx: (i - 2) * 40, vy: -260, g: 700, life: 0.6, coin: 1 }); getCoin(cx, cy - 16); }
    items.push({ x: cx + 2, y: cy, w: 12, h: 12, type: 'gem', rise: 16 });
    return;
  }
  const k = Math.random();
  if (k < 0.4) { parts.push({ x: cx + 8, y: cy, vx: 0, vy: -240, g: 800, life: 0.45, coin: 1 }); getCoin(cx, cy - 16); return; }
  if (k < 0.85) {
    const type = k < 0.5 ? 'heart' : k < 0.6 ? 'star' : k < 0.75 ? 'boots' : 'gem';
    items.push({ x: cx + 2, y: cy, w: 12, h: 12, type, rise: 16 });
    sfx.power(); return;
  }
  const e = mkFoe(cx + 1, cy - 15, 'walk', 0.3); e.act = 1; e.vy = -200; e.vx = -e.vx * (P.x < cx ? -1 : 1);
  ents.push(e); sfx.surprise(); float(cx - 8, cy - 18, 'SURPRISE!', '#ff8');
}
function hurt() {
  if (P.inv > 0 || P.star > 0 || P.dash > 0) return;
  hp--; sfx.hurt(); P.inv = 1.6; P.vy = -260; P.vx = -P.face * 120; shake = 0.25;
  if (hp <= 0) gameOver();
}
function fallPit() {
  hp--; sfx.hurt(); shake = 0.3;
  if (hp <= 0) { gameOver(); return; }
  P.x = safe.x; P.y = safe.y - 2; P.vx = 0; P.vy = 0; P.inv = 2; P.dash = 0;
}
function gameOver() { hp = 0; state = 'over'; stT = 0; startReq = false; sfx.over(); }

function updPlayer(dt) {
  const g = mod === 'LOW GRAVITY' ? 800 : 1400;
  const jv = 430 * (P.boots > 0 ? 1.3 : 1) * (mod === 'BOUNCY' ? 1.12 : 1) * (mod === 'LOW GRAVITY' ? 0.85 : 1);
  P.inv = Math.max(0, P.inv - dt); P.star = Math.max(0, P.star - dt); P.boots = Math.max(0, P.boots - dt); P.dcd -= dt;
  const dir = (held.right ? 1 : 0) - (held.left ? 1 : 0);
  if (dir) P.face = dir;
  if (db > 0) {
    if (!perk.dash()) { db = 0; float(P.x - 10, P.y - 10, 'DASH: Lv5', '#faa'); sfx.locked(); }
    else if (P.dcd <= 0 && P.dash <= 0) { db = 0; P.dash = 0.22; P.dcd = 0.7; P.vx = P.face * 330; P.vy = 0; sfx.dash(); }
  }
  if (P.dash > 0) {
    P.dash -= dt; P.vy = 0;
    parts.push({ x: P.x + 6, y: P.y + 7, vx: 0, vy: 0, g: 0, life: 0.25, col: 'rgba(47,212,196,.6)', s: 8 });
  } else {
    P.vx += (dir * speed() - P.vx) * Math.min(1, dt * (P.on ? 14 : 7));
    P.vy += g * dt;
    if (!held.jump && P.jumping && P.vy < -150) P.vy = -150;
    if (P.vy >= 0) P.jumping = false;
    P.glide = perk.glide() && held.jump && P.vy > 50 && !P.on;
    if (P.glide) P.vy = 50;
    if (P.vy > 480) P.vy = 480;
  }
  if (P.on) P.coy = 0.1; else P.coy -= dt;
  if (jb > 0) {
    if (P.on || P.coy > 0) {
      P.vy = -jv; P.on = false; P.coy = 0; jb = 0; P.jumping = true; P.dash = 0; sfx.jump();
      for (let i = 0; i < 5; i++) parts.push({ x: P.x + 6, y: P.y + 14, vx: (Math.random() - 0.5) * 80, vy: -Math.random() * 40, g: 0, life: 0.3, col: 'rgba(255,255,255,.7)', s: 3 });
    } else if (perk.dj() && P.air > 0) {
      P.air--; P.vy = -jv * 0.9; jb = 0; P.jumping = true; P.dash = 0; sfx.dj();
      for (let i = 0; i < 10; i++) parts.push({ x: P.x + 6, y: P.y + 14, vx: Math.cos(i / 10 * TAU) * 70, vy: Math.sin(i / 10 * TAU) * 20, g: 0, life: 0.3, col: '#bff7ef', s: 2 });
    }
  }
  const wasOn = P.on;
  P.on = false;
  P.x += P.vx * dt;
  if (colX(P)) { P.vx = 0; P.dash = 0; }
  if (P.x < 0) P.x = 0;
  if (P.x > W * T - P.w) P.x = W * T - P.w;
  P.y += P.vy * dt;
  colY(P, true);
  if (P.on) {
    P.air = 1; combo = 0;
    if (!wasOn) for (let i = 0; i < 4; i++) parts.push({ x: P.x + 6, y: P.y + 14, vx: (i - 1.5) * 30, vy: -10, g: 0, life: 0.25, col: 'rgba(255,255,255,.6)', s: 2 });
    const by = Math.floor((P.y + P.h) / T), a = tileAt(Math.floor(P.x / T), by), b = tileAt(Math.floor((P.x + P.w) / T), by);
    if ((a === 1 || a === 8 || a === 6) && (b === 1 || b === 8 || b === 6)) { safe.x = P.x; safe.y = P.y; }
  }
  if (Math.abs(P.vx) > 10 && P.on) P.anim += dt;
  // spikes
  const x0 = Math.floor(P.x / T), x1 = Math.floor((P.x + P.w - 0.01) / T), y0 = Math.floor(P.y / T), y1 = Math.floor((P.y + P.h - 0.01) / T);
  for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) {
    if (tileAt(tx, ty) === 5 && overlap(P, { x: tx * T + 2, y: ty * T + 7, w: 12, h: 9 })) {
      if (P.star <= 0 && P.inv <= 0) { hurt(); P.vy = -330; }
    }
  }
  if (P.y > VH + 16) fallPit();
  if (state === 'play' && P.x + P.w / 2 >= flagX + 8) {
    state = 'clear'; stT = 0;
    P.x = flagX + 8 - P.w; P.vx = 0; P.vy = 0; P.dash = 0;
    const bonus = 20 + world * 5 + hp * 5;
    banner('WORLD CLEAR!', '+' + bonus + ' XP', 2.5);
    sfx.clear(); addXp(bonus);
  }
}

function updWorld(dt) {
  const g = mod === 'LOW GRAVITY' ? 800 : 1400;
  for (const e of ents) {
    if (!e.act) { if (e.x < camX + VW + 40) e.act = 1; else continue; }
    if (e.dead) { e.vy += 1400 * dt; e.y += e.vy * dt; e.x += e.vx * dt; if (e.y > VH + 40) e.gone = 1; continue; }
    if (e.sqd) { e.sq -= dt; if (e.sq <= 0) e.gone = 1; continue; }
    e.vy = Math.min(480, e.vy + g * dt);
    if (e.type === 'hop' && e.on) { e.ht -= dt; if (e.ht <= 0) { e.vy = -300; e.ht = 1 + Math.random() * 1.2; } }
    const vx = e.vx;
    e.x += e.vx * dt;
    if (colX(e)) e.vx = -vx;
    e.on = false;
    e.y += e.vy * dt;
    colY(e, false);
    if (e.y > VH + 40) { e.gone = 1; continue; }
    if (state === 'play' && overlap(P, e)) {
      if (P.star > 0 || P.dash > 0) kill(e);
      else if (P.vy > 0 && P.y + P.h - e.y < 10 && e.type !== 'spiky') {
        e.sqd = 1; e.sq = 0.35; combo++;
        const pts = 10 * combo; addXp(pts); float(e.x, e.y - 6, '+' + pts + (combo > 1 ? ' x' + combo : ''), '#ff8');
        P.vy = -(held.jump ? 430 * 0.95 : 280) * (mod === 'BOUNCY' ? 1.3 : 1); P.jumping = false; P.air = 1;
        sfx.stomp();
      } else if (P.inv <= 0) hurt();
    }
  }
  ents = ents.filter(e => !e.gone);
  for (const it of items) {
    if (it.rise > 0) { const d = Math.min(it.rise, 50 * dt); it.y -= d; it.rise -= d; continue; }
    if (state === 'play' && overlap(P, it)) {
      it.gone = 1;
      if (it.type === 'heart') { if (hp < maxHp()) { hp++; float(it.x, it.y, '+1 HEART', '#f77'); } else { addXp(20); float(it.x, it.y, '+20 XP'); } sfx.gem(); }
      else if (it.type === 'star') { P.star = 8; banner('STAR POWER!', 'smash everything', 1.4); sfx.power(); }
      else if (it.type === 'boots') { P.boots = 12; banner('ROCKET BOOTS!', 'super jumps', 1.4); sfx.power(); }
      else { addXp(40); float(it.x, it.y, '+40 XP', '#7ff'); sfx.gem(); }
    }
  }
  items = items.filter(i => !i.gone);
  const cx = P.x + 6, cy = P.y + 7;
  for (const c of coinL) {
    if (c.fall) { c.y += 70 * dt; c.life -= dt; if (c.life <= 0 || c.y > VH) c.gone = 1; }
    if (perk.mag() && state === 'play') {
      const dx = cx - (c.x + 4), dy = cy - (c.y + 4), d = Math.hypot(dx, dy);
      if (d < 60 && d > 0.1) { c.x += dx / d * 220 * dt; c.y += dy / d * 220 * dt; }
    }
    if (!c.gone && state === 'play' && overlap(P, c)) { c.gone = 1; getCoin(c.x, c.y); }
  }
  coinL = coinL.filter(c => !c.gone);
  if (mod === 'COIN RAIN' && state === 'play') {
    rainT -= dt;
    if (rainT <= 0) { rainT = 0.45; coinL.push({ x: camX + Math.random() * VW, y: -10, w: 8, h: 8, fall: 1, life: 5 }); }
  }
  for (const p of parts) { p.vy += p.g * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; }
  parts = parts.filter(p => p.life > 0);
  for (const t of texts) { t.y -= 30 * dt; t.t -= dt; }
  texts = texts.filter(t => t.t > 0);
  for (const b of bumps) b.t -= dt;
  bumps = bumps.filter(b => b.t > 0);
  if (banners.length) { banners[0].t -= dt; if (banners[0].t <= 0) banners.shift(); }
}

function camera(dt) {
  const tx = Math.max(0, Math.min(W * T - VW, P.x + P.w / 2 - VW * 0.4));
  camX += (tx - camX) * Math.min(1, dt * 8);
}

function update(dt) {
  time += dt; shake = Math.max(0, shake - dt);
  jb = Math.max(0, jb - dt); db = Math.max(0, db - dt);
  if (state === 'title' || state === 'over') {
    stT += dt;
    if (state === 'title') camX = (Math.sin(time * 0.15) * 0.5 + 0.5) * (W * T - VW) * 0.3;
    if (startReq && stT > 0.4) {
      startReq = false; jb = 0; db = 0;
      if (state === 'over') coins = 0;
      hp = maxHp(); gen(world); state = 'play';
      banner('WORLD ' + world, mod ? 'SURPRISE: ' + mod : 'Let\'s go!', 2.2);
    }
    updWorld(dt);
    return;
  }
  if (state === 'clear') {
    stT += dt;
    if (P.y + P.h < 13 * T - 0.5) P.y = Math.min(13 * T - P.h, P.y + 90 * dt);
    else { P.x += 55 * dt; P.anim += dt; P.on = true; }
    updWorld(dt); camera(dt);
    if (stT > 2.8) {
      world++; gen(world); state = 'play';
      banner('WORLD ' + world, mod ? 'SURPRISE: ' + mod : 'Keep going!', 2.2);
    }
    return;
  }
  updPlayer(dt);
  updWorld(dt);
  camera(dt);
}

/* ---------- drawing ---------- */
let hue = 200;
function txt(s, x, y, sz, col, al) {
  ctx.font = 'bold ' + sz + 'px "Trebuchet MS", Verdana, sans-serif';
  ctx.textAlign = al || 'center'; ctx.textBaseline = 'middle';
  ctx.lineWidth = Math.max(2, sz / 4); ctx.lineJoin = 'round'; ctx.strokeStyle = 'rgba(0,0,0,.75)';
  ctx.strokeText(s, x, y); ctx.fillStyle = col; ctx.fillText(s, x, y);
}
function heart(x, y, s, col) {
  ctx.fillStyle = col; ctx.beginPath();
  ctx.moveTo(x + s / 2, y + s * 0.9);
  ctx.bezierCurveTo(x - s * 0.2, y + s * 0.4, x + s * 0.1, y - s * 0.1, x + s / 2, y + s * 0.25);
  ctx.bezierCurveTo(x + s * 0.9, y - s * 0.1, x + s * 1.2, y + s * 0.4, x + s / 2, y + s * 0.9);
  ctx.fill();
}
function star(x, y, r, col, rot) {
  ctx.fillStyle = col; ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = rot + i * Math.PI / 5 - Math.PI / 2, rr = i % 2 ? r * 0.45 : r;
    ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  ctx.closePath(); ctx.fill();
}
function hills(off, base, amp, col) {
  ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(0, VH + 60);
  for (let x = 0; x <= VW + 8; x += 6) {
    const w = x + off;
    ctx.lineTo(x, base - amp * (Math.sin(w * 0.013) + 0.5 * Math.sin(w * 0.031 + 1.7) + 0.6));
  }
  ctx.lineTo(VW + 8, VH + 60); ctx.fill();
}
function drawTile(t, x, y, tx, ty) {
  switch (t) {
    case 1: {
      ctx.fillStyle = '#8a5a2b'; ctx.fillRect(x, y, T, T);
      ctx.fillStyle = '#6e4420';
      ctx.fillRect(x + 3 + (tx % 3), y + 9, 2, 2); ctx.fillRect(x + 10, y + 4 + (tx % 2) * 6, 2, 2);
      if (ty === 0 || map[(ty - 1) * W + tx] !== 1) {
        ctx.fillStyle = 'hsl(' + ((hue + 100) % 360) + ',55%,42%)'; ctx.fillRect(x, y, T, 5);
        ctx.fillStyle = 'hsl(' + ((hue + 100) % 360) + ',60%,58%)'; ctx.fillRect(x, y, T, 2);
      }
      break;
    }
    case 2:
      ctx.fillStyle = '#c8642e'; ctx.fillRect(x, y, T, T);
      ctx.fillStyle = '#7a3412';
      ctx.fillRect(x, y + 7, T, 1); ctx.fillRect(x, y + 15, T, 1);
      ctx.fillRect(x + 7, y, 1, 7); ctx.fillRect(x + 3, y + 8, 1, 7); ctx.fillRect(x + 12, y + 8, 1, 7);
      ctx.fillStyle = '#f09060'; ctx.fillRect(x, y, T, 1);
      break;
    case 3:
      ctx.fillStyle = '#8a5a00'; ctx.fillRect(x, y, T, T);
      ctx.fillStyle = 'hsl(45,95%,' + (55 + Math.sin(time * 6) * 8) + '%)'; ctx.fillRect(x + 1, y + 1, T - 2, T - 2);
      txt('?', x + 8, y + 8.5, 11, '#fff');
      break;
    case 4:
      ctx.fillStyle = '#5a4020'; ctx.fillRect(x, y, T, T);
      ctx.fillStyle = '#9a7650'; ctx.fillRect(x + 1, y + 1, T - 2, T - 2);
      break;
    case 5:
      ctx.fillStyle = '#dfe6f0'; ctx.strokeStyle = '#59627a'; ctx.lineWidth = 1;
      for (let i = 0; i < 2; i++) {
        ctx.beginPath(); ctx.moveTo(x + i * 8, y + 16); ctx.lineTo(x + i * 8 + 4, y + 6); ctx.lineTo(x + i * 8 + 8, y + 16); ctx.closePath(); ctx.fill(); ctx.stroke();
      }
      break;
    case 6: {
      const top = ty === 0 || map[(ty - 1) * W + tx] !== 6;
      ctx.fillStyle = 'hsl(' + ((hue + 180) % 360) + ',55%,45%)'; ctx.fillRect(x, y, T, T);
      ctx.fillStyle = 'hsl(' + ((hue + 180) % 360) + ',70%,70%)'; ctx.fillRect(x + 3, y, 3, T);
      if (top) { ctx.fillStyle = 'hsl(' + ((hue + 180) % 360) + ',60%,30%)'; ctx.fillRect(x, y, T, 4); }
      break;
    }
    case 8:
      ctx.fillStyle = '#5a5a6a'; ctx.fillRect(x, y, T, T);
      ctx.fillStyle = '#b8b8c8'; ctx.fillRect(x, y, T - 1, T - 1);
      ctx.fillStyle = '#8c8c9c'; ctx.fillRect(x + 1, y + 1, T - 3, T - 3);
      break;
  }
}
function drawPip() {
  if (P.inv > 0 && ((time * 16) | 0) % 2) return;
  if (state === 'clear' && P.x > flagX + 62) return;
  const run = P.on && Math.abs(P.vx) > 10 || state === 'clear';
  const ph = Math.sin(P.anim * 18);
  const sy = P.on ? 1 : (P.vy < 0 ? 1.1 : 0.94);
  ctx.save();
  ctx.translate(P.x + 6, P.y + 14);
  ctx.scale(P.face / sy, sy);
  const col = P.star > 0 ? 'hsl(' + (time * 600 % 360) + ',90%,60%)' : '#2fd4c4';
  if (P.glide) { ctx.fillStyle = '#7ed957'; ctx.beginPath(); ctx.ellipse(0, -19, 9, 2.5, 0, 0, TAU); ctx.fill(); ctx.fillRect(-0.5, -18, 1, 4); }
  ctx.fillStyle = P.boots > 0 ? '#ff8a1f' : '#1d4d63';
  ctx.fillRect(-5 + (run ? ph * 1.5 : 0), -3, 4, 3); ctx.fillRect(1 - (run ? ph * 1.5 : 0), -3, 4, 3);
  ctx.fillStyle = col;
  ctx.beginPath(); ctx.moveTo(-4, -12); ctx.lineTo(-2, -17); ctx.lineTo(0, -13); ctx.lineTo(1, -13); ctx.lineTo(3, -17); ctx.lineTo(5, -12); ctx.fill();
  ctx.beginPath(); ctx.ellipse(0, -8, 6.5, 6.5, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = '#bff7ef'; ctx.beginPath(); ctx.ellipse(1.5, -5.5, 3.5, 3, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = '#ff4d6d'; ctx.fillRect(-6, -9, 12, 2); ctx.fillRect(-10, -9 + Math.sin(time * 20), 5, 2);
  ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.ellipse(2.5, -11, 2.4, 2.8, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = '#111'; ctx.beginPath(); ctx.ellipse(3.4, -11, 1.2, 1.7, 0, 0, TAU); ctx.fill();
  ctx.restore();
}
function drawFoe(e) {
  ctx.save();
  ctx.translate(e.x + 7, e.y + 14);
  if (e.dead) { ctx.scale(1, -1); ctx.translate(0, 14); }
  const col = e.type === 'walk' ? '#8e5bd8' : e.type === 'hop' ? '#3fbf6a' : '#e2453c';
  ctx.fillStyle = col;
  if (e.sqd) { ctx.beginPath(); ctx.ellipse(0, -2, 8, 2.5, 0, 0, TAU); ctx.fill(); ctx.restore(); return; }
  const w = e.act ? Math.sin(time * 10 + e.x) * 1.5 : 0;
  ctx.fillStyle = '#2a1840'; ctx.fillRect(-6 + w, -3, 4, 3); ctx.fillRect(2 - w, -3, 4, 3);
  if (e.type === 'spiky') {
    ctx.fillStyle = '#fff';
    for (let i = -1; i <= 1; i++) { ctx.beginPath(); ctx.moveTo(i * 4 - 2, -11); ctx.lineTo(i * 4, -17); ctx.lineTo(i * 4 + 2, -11); ctx.fill(); }
  }
  ctx.fillStyle = col; ctx.beginPath();
  if (e.type === 'hop') ctx.ellipse(0, -7 - (e.on ? 0 : 1), 7, 6, 0, 0, TAU);
  else { ctx.arc(0, -7, 7, Math.PI, 0); ctx.lineTo(7, -2); ctx.lineTo(-7, -2); }
  ctx.fill();
  const d = e.vx > 0 ? 1 : -1;
  ctx.fillStyle = '#fff';
  ctx.beginPath(); ctx.ellipse(-2.5, -8, 2, 2.4, 0, 0, TAU); ctx.ellipse(2.5, -8, 2, 2.4, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = '#111';
  ctx.beginPath(); ctx.ellipse(-2.5 + d, -7.6, 1, 1.4, 0, 0, TAU); ctx.ellipse(2.5 + d, -7.6, 1, 1.4, 0, 0, TAU); ctx.fill();
  ctx.strokeStyle = '#111'; ctx.lineWidth = 1.2;
  ctx.beginPath(); ctx.moveTo(-5, -11.5); ctx.lineTo(-1, -10); ctx.moveTo(5, -11.5); ctx.lineTo(1, -10); ctx.stroke();
  ctx.restore();
}
function drawCoin(x, y) {
  const w = Math.max(1, 4 * Math.abs(Math.cos(time * 5 + x * 0.05)));
  ctx.fillStyle = '#b07800'; ctx.beginPath(); ctx.ellipse(x + 4, y + 4, w + 0.8, 4.8, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = '#ffd23f'; ctx.beginPath(); ctx.ellipse(x + 4, y + 4, w, 4, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = '#fff6b0'; ctx.fillRect(x + 3.5, y + 1.5, 1, 3);
}
function drawItem(it) {
  const x = it.x, y = it.y + (it.rise > 0 ? 0 : Math.sin(time * 4 + x) * 1.5);
  if (it.type === 'heart') heart(x, y + 1, 12, '#ff4d6d');
  else if (it.type === 'star') star(x + 6, y + 6, 7, 'hsl(' + (time * 400 % 360) + ',95%,60%)', time * 2);
  else if (it.type === 'boots') {
    ctx.fillStyle = '#ff8a1f'; ctx.fillRect(x + 2, y + 2, 5, 8); ctx.fillRect(x + 2, y + 7, 9, 4);
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.moveTo(x + 2, y + 3); ctx.lineTo(x - 2, y); ctx.lineTo(x + 2, y + 7); ctx.fill();
  } else {
    ctx.fillStyle = '#5ff2ff'; ctx.beginPath(); ctx.moveTo(x + 6, y); ctx.lineTo(x + 12, y + 5); ctx.lineTo(x + 6, y + 12); ctx.lineTo(x, y + 5); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#e6fdff'; ctx.fillRect(x + 4, y + 3, 2, 2);
  }
}

function draw() {
  hue = (world * 47 + 190) % 360;
  const night = mod === 'NIGHT RUN';
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.imageSmoothingEnabled = false;
  ctx.setTransform(scale, 0, 0, scale, 0, offY * scale);
  const gr = ctx.createLinearGradient(0, -offY, 0, VH);
  gr.addColorStop(0, night ? '#070b26' : 'hsl(' + hue + ',70%,62%)');
  gr.addColorStop(1, night ? '#2a2050' : 'hsl(' + ((hue + 40) % 360) + ',85%,86%)');
  ctx.fillStyle = gr; ctx.fillRect(0, -offY, VW, SH);
  // sun / moon
  ctx.fillStyle = night ? '#f4f1d0' : 'rgba(255,250,210,.9)';
  ctx.beginPath(); ctx.arc(VW * 0.8, 40, 16, 0, TAU); ctx.fill();
  if (night) {
    ctx.fillStyle = '#fff';
    for (let i = 0; i < 40; i++) ctx.fillRect((i * 97.3 - camX * 0.05) % VW + (i * 97.3 - camX * 0.05 < 0 ? VW : 0), (i * 53.7) % 120, 1, 1);
  }
  // clouds
  ctx.fillStyle = night ? 'rgba(160,170,220,.25)' : 'rgba(255,255,255,.85)';
  for (let i = 0; i < 6; i++) {
    const span = VW + 120;
    let cx = ((i * 170 - camX * 0.15 + time * 6) % span + span) % span - 60, cy = 20 + (i * 37) % 60;
    ctx.beginPath(); ctx.ellipse(cx, cy, 22, 7, 0, 0, TAU); ctx.ellipse(cx + 10, cy - 5, 12, 7, 0, 0, TAU); ctx.fill();
  }
  hills(camX * 0.2, 150, 22, night ? '#1f2a55' : 'hsl(' + ((hue + 120) % 360) + ',35%,72%)');
  hills(camX * 0.45 + 300, 180, 16, night ? '#17203f' : 'hsl(' + ((hue + 130) % 360) + ',40%,52%)');

  const sx = shake > 0 ? (Math.random() - 0.5) * 4 : 0;
  ctx.save();
  ctx.translate(-Math.round(camX * scale) / scale + sx, 0);
  const c0 = Math.max(0, Math.floor(camX / T) - 1), c1 = Math.min(W - 1, Math.ceil((camX + VW) / T) + 1);
  ctx.fillStyle = '#5a3418';
  for (let tx = c0; tx <= c1; tx++) if (map[14 * W + tx] === 1) ctx.fillRect(tx * T, VH - 1, T + 0.5, SH - offY - VH + 2);
  // flag & hut
  if (flagX + 80 > camX && flagX < camX + VW + 20) {
    const fx = flagX + 7, drop = state === 'clear' ? Math.min(1, stT / 1.1) : 0;
    ctx.fillStyle = '#ddd'; ctx.fillRect(fx, 13 * T - 112, 2, 112);
    ctx.fillStyle = '#ffd23f'; ctx.beginPath(); ctx.arc(fx + 1, 13 * T - 113, 3, 0, TAU); ctx.fill();
    const fy = 13 * T - 108 + drop * 86, wv = Math.sin(time * 6) * 2;
    ctx.fillStyle = '#ff4d6d'; ctx.beginPath(); ctx.moveTo(fx + 2, fy); ctx.lineTo(fx + 22, fy + 7 + wv); ctx.lineTo(fx + 2, fy + 14); ctx.fill();
    star(fx + 9, fy + 7, 3, '#fff', 0);
    const hx = flagX + 48;
    ctx.fillStyle = '#c98b52'; ctx.fillRect(hx, 13 * T - 28, 32, 28);
    ctx.fillStyle = '#ff4d6d'; ctx.beginPath(); ctx.moveTo(hx - 4, 13 * T - 28); ctx.lineTo(hx + 16, 13 * T - 44); ctx.lineTo(hx + 36, 13 * T - 28); ctx.fill();
    ctx.fillStyle = '#3a2210'; ctx.fillRect(hx + 11, 13 * T - 16, 10, 16);
  }
  for (let ty = 0; ty < ROWS; ty++) for (let tx = c0; tx <= c1; tx++) {
    const t = map[ty * W + tx];
    if (!t || t === 7) continue;
    let oy = 0;
    for (const b of bumps) if (b.tx === tx && b.ty === ty) oy = -Math.sin((1 - b.t / 0.15) * Math.PI) * 4;
    drawTile(t, tx * T, ty * T + oy, tx, ty);
  }
  for (const c of coinL) if (c.x > camX - 10 && c.x < camX + VW + 10) drawCoin(c.x, c.y);
  for (const it of items) drawItem(it);
  for (const e of ents) if (e.x > camX - 20 && e.x < camX + VW + 20) drawFoe(e);
  if (state !== 'title') drawPip();
  for (const p of parts) {
    ctx.globalAlpha = Math.min(1, p.life * 3);
    if (p.coin) drawCoin(p.x - 4, p.y - 4);
    else { ctx.fillStyle = p.col; ctx.fillRect(p.x - p.s / 2, p.y - p.s / 2, p.s, p.s); }
  }
  ctx.globalAlpha = 1;
  for (const t of texts) { ctx.globalAlpha = Math.min(1, t.t * 2); txt(t.s, t.x + 6, t.y, 8, t.col); }
  ctx.globalAlpha = 1;
  ctx.restore();

  if (night && state !== 'title') {
    const px = P.x + 6 - camX, py = P.y + 7;
    const rg = ctx.createRadialGradient(px, py, 10, px, py, 120);
    rg.addColorStop(0, 'rgba(4,4,20,0)'); rg.addColorStop(0.35, 'rgba(4,4,20,.15)'); rg.addColorStop(1, 'rgba(4,4,20,.93)');
    ctx.fillStyle = rg; ctx.fillRect(0, -offY, VW, SH);
  }

  // HUD (screen space)
  ctx.setTransform(scale, 0, 0, scale, 0, 0);
  const mh = maxHp();
  for (let i = 0; i < mh; i++) heart(6 + i * 11, 5, 10, i < hp ? '#ff4d6d' : 'rgba(0,0,0,.35)');
  drawCoin(6, 19); txt('x' + coins, 17, 23.5, 9, '#fff', 'left');
  txt('WORLD ' + world, VW / 2, 10, 10, '#fff');
  if (mod) txt(mod, VW / 2, 22, 8, '#ffe066');
  const bx = VW - 84;
  txt('Lv ' + prog.lv, bx, 10, 10, '#fff', 'left');
  ctx.fillStyle = 'rgba(0,0,0,.45)'; ctx.fillRect(bx, 17, 56, 5);
  ctx.fillStyle = '#7ed957'; ctx.fillRect(bx, 17, 56 * prog.xp / xpNeed(prog.lv), 5);
  const perks = [perk.dj() ? '2J' : '', perk.mag() ? 'MAG' : '', perk.dash() ? 'DASH' : '', perk.glide() ? 'GLIDE' : ''].filter(Boolean).join(' ');
  if (perks) txt(perks, bx, 29, 7, '#bff7ef', 'left');
  // speaker icon
  const ix = VW - 20, iy = 6;
  ctx.fillStyle = '#fff'; ctx.fillRect(ix, iy + 3, 3, 5);
  ctx.beginPath(); ctx.moveTo(ix + 3, iy + 3); ctx.lineTo(ix + 7, iy); ctx.lineTo(ix + 7, iy + 11); ctx.lineTo(ix + 3, iy + 8); ctx.fill();
  ctx.strokeStyle = muted ? '#ff4d6d' : '#fff'; ctx.lineWidth = 1.3; ctx.beginPath();
  if (muted) { ctx.moveTo(ix + 9, iy + 2); ctx.lineTo(ix + 14, iy + 9); ctx.moveTo(ix + 14, iy + 2); ctx.lineTo(ix + 9, iy + 9); }
  else { ctx.arc(ix + 7, iy + 5.5, 4, -0.9, 0.9); ctx.moveTo(ix + 13, iy + 1); ctx.arc(ix + 7, iy + 5.5, 7, -0.9, 0.9); }
  ctx.stroke();
  if (P.star > 0 || P.boots > 0) txt(P.star > 0 ? 'STAR ' + Math.ceil(P.star) : 'BOOTS ' + Math.ceil(P.boots), 6, 36, 8, '#ffe066', 'left');

  const cy = SH / 2 - (touch ? 20 : 0);
  if (banners.length && state !== 'title') {
    const b = banners[0], a = Math.min(1, b.t * 3, (b.max - b.t) * 6);
    ctx.globalAlpha = a;
    txt(b.s, VW / 2, cy - 30, Math.min(20, VW / 11), '#fff');
    if (b.sub) txt(b.sub, VW / 2, cy - 10, 10, '#ffe066');
    ctx.globalAlpha = 1;
  }
  if (state === 'title' || state === 'over') {
    ctx.fillStyle = 'rgba(10,12,40,.55)'; ctx.fillRect(0, 0, VW, SH);
    if (state === 'title') {
      txt("PIP'S ENDLESS RUN", VW / 2, cy - 44, Math.min(22, VW / 11), '#2fd4c4');
      txt('endless worlds · surprises · level up', VW / 2, cy - 24, 9, '#ffe066');
    } else {
      txt('OUT OF HEARTS', VW / 2, cy - 44, Math.min(20, VW / 10), '#ff4d6d');
      txt('Pip keeps Lv ' + prog.lv + ' - retry World ' + world, VW / 2, cy - 24, 9, '#ffe066');
    }
    const blink = Math.floor(time * 2.5) % 2;
    if (blink || state === 'over') txt(touch ? 'Tap to play' : 'Click to play', VW / 2, cy, 11, '#fff');
    if (!touch) {
      txt('Arrows / A D move  ·  Space / W / Up jump', VW / 2, cy + 18, 8, '#ddd');
      txt('Shift / X dash (Lv5)  ·  M mute  ·  click = jump', VW / 2, cy + 30, 8, '#ddd');
    }
  }
}

/* ---------- input ---------- */
function press(k) {
  initAudio();
  held[k] = 1;
  if (k === 'jump') jb = 0.15;
  if (k === 'dash') db = 0.15;
}
const KM = { ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right', Space: 'jump', ArrowUp: 'jump', KeyW: 'jump', KeyZ: 'jump', KeyK: 'jump', Enter: 'jump', ShiftLeft: 'dash', ShiftRight: 'dash', KeyX: 'dash', KeyJ: 'dash' };
addEventListener('keydown', e => {
  if (e.code === 'KeyM') { if (!e.repeat) toggleMute(); return; }
  const k = KM[e.code];
  if (!k) return;
  e.preventDefault();
  if (state === 'title' || state === 'over') startReq = true;
  if (e.repeat) held[k] = 1; else press(k);
});
addEventListener('keyup', e => { const k = KM[e.code]; if (k) { held[k] = 0; e.preventDefault(); } });
addEventListener('blur', () => { for (const k in held) held[k] = 0; });

let mouseJump = false;
cv.addEventListener('pointerdown', e => {
  e.preventDefault();
  initAudio();
  try { cv.focus(); } catch (_) {}
  if (e.pointerType === 'touch' || e.pointerType === 'pen') setTouch();
  const lx = e.clientX * dpr / scale, ly = e.clientY * dpr / scale;
  if (lx > VW - 30 && ly < 26) { toggleMute(); return; }
  if (state === 'title' || state === 'over') { startReq = true; return; }
  if (state === 'play' && e.pointerType === 'mouse') { press('jump'); mouseJump = true; }
});
const mouseUp = () => { if (mouseJump) { held.jump = 0; mouseJump = false; } };
addEventListener('pointerup', mouseUp);
addEventListener('pointercancel', mouseUp);

document.querySelectorAll('#pad button').forEach(b => {
  const k = b.dataset.k;
  b.addEventListener('pointerdown', e => {
    e.preventDefault(); e.stopPropagation();
    setTouch(); press(k);
    if (state === 'title' || state === 'over') startReq = true;
    b.classList.add('on');
    try { b.setPointerCapture(e.pointerId); } catch (_) {}
  });
  const up = () => { held[k] = 0; b.classList.remove('on'); };
  b.addEventListener('pointerup', up);
  b.addEventListener('pointercancel', up);
  b.addEventListener('lostpointercapture', up);
  b.addEventListener('contextmenu', e => e.preventDefault());
});

/* ---------- loop ---------- */
gen(1);
hp = maxHp();
updDash();
let last = performance.now(), acc = 0;
function frame(now) {
  let dt = (now - last) / 1000; last = now;
  if (dt > 0.1) dt = 0.1;
  if (dt < 0) dt = 0;
  acc += dt;
  const step = 1 / 120;
  while (acc >= step) { update(step); acc -= step; }
  draw();
  try { music(); } catch (e) {}
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
})();
