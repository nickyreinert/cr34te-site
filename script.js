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
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

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
  muted = !muted; saveGame();
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
  flap() { N(0.12, 0.08, 0, 1500); S(300, 0.1, 'triangle', 0.12, 0, 250); },
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
  locked() { S(150, 0.12, 'square', 0.06); },
  shoot() { S(900, 0.07, 'square', 0.03, 0, -500); },
  pipe() { arp([12, 7, 3, 0, -5, -9], 0.07, 'square', 0.07, 0.09); }
};
/* character voices: each letter is a tiny pitched blip, birds chirp */
function voice(who, ch) {
  if (!ac) return;
  const c = ch.toLowerCase().charCodeAt(0), at = ac.currentTime, k = 1 + (c % 7) / 12;
  if (who === 'bird') { tn(2300 * k, 0.06, 'sine', 0.05, at, 1100); if (c % 3 === 0) tn(2800 * k, 0.05, 'sine', 0.04, at + 0.05, 900); }
  else if (who === 'pip') tn(520 * k, 0.05, 'square', 0.03, at, 40);
  else if (who === 'grumble') tn(120 * k, 0.07, 'sawtooth', 0.05, at, -20);
  else if (who === 'princess') tn(900 * k, 0.07, 'triangle', 0.07, at, 120);
  else if (who === 'baron') tn(90 * k, 0.08, 'square', 0.04, at, -30);
  else if (who === 'snail') tn(150 * k, 0.12, 'triangle', 0.07, at, -20);
  else if (who === 'frog') tn(180 * k, 0.07, 'square', 0.035, at, -90);
  else if (who === 'robot') tn(Math.round(k * 4) * 150, 0.04, 'square', 0.03, at, 0);
  else if (who === 'ghost') tn(380 * k, 0.12, 'sine', 0.06, at, 180);
  else if (who === 'granny') tn(620 * k, 0.08, 'triangle', 0.06, at, -60);
  else if (who === 'firefly') tn(1400 * k, 0.04, 'sine', 0.04, at, 300);
  else tn(210 * k, 0.07, 'triangle', 0.07, at, -40);
}

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
  if (!ac || !song || muted || !(state === 'play' || state === 'title' || state === 'pipe' || state === 'select' || state === 'talk')) { if (ac) mNext = ac.currentTime + 0.1; return; }
  if (mNext < ac.currentTime) mNext = ac.currentTime + 0.05;
  const root = song.root + (under ? -5 : 0), lead = under ? 'triangle' : 'square';
  while (mNext < ac.currentTime + 0.25) {
    const s = mStep % 32, bar = s >> 3, k = s & 7, m = song.bars[bar][k];
    const tp = song.tempo * (P.star > 0 ? 0.75 : 1) * (mode === 'fly' ? 0.85 : 1) * (frenzy && !frenzy.done ? 0.7 : 1);
    if (m >= 0) tn(note(root + m), tp * 0.85, lead, under ? 0.09 : 0.05, mNext, 0, musicGain);
    if (k % 2 === 0) tn(note(root + PROG[bar] - 12 + (k === 4 ? 7 : 0)), tp * 1.6, 'triangle', 0.22, mNext, 0, musicGain);
    else nz(0.04, 0.05, mNext, 6000, musicGain);
    if (k === 0 || k === 4) tn(150, 0.12, 'sine', 0.35, mNext, -110, musicGain);
    mStep++; mNext += tp;
  }
}

/* ---------- biomes ---------- */
const BIOMES = [
  { name: 'MEADOW', top: '#3fa34d', hi: '#6fd16a', dirt: '#8a5a2b', dot: '#6e4420' },
  { name: 'DESERT', sky: ['#f2a65a', '#fde3a7'], top: '#e8c06a', hi: '#f7dc94', dirt: '#c98d45', dot: '#a8702f', h1: '#f0c27a', h2: '#d9a050' },
  { name: 'SNOWY PEAKS', sky: ['#7fb2e5', '#e6f2ff'], top: '#f4f8ff', hi: '#ffffff', dirt: '#6d7fa8', dot: '#56658a', h1: '#cfe0f5', h2: '#a9c0e0', slip: 1, snow: 1 },
  { name: 'VOLCANO', sky: ['#2a0a14', '#b8401f'], top: '#5b2b25', hi: '#ff7a3a', dirt: '#35201e', dot: '#4f2c28', h1: '#4a1c1c', h2: '#2c1212', lava: 1, ember: 1 },
  { name: 'CANDY LAND', sky: ['#ff9fd6', '#fff0fa'], top: '#ff6fbf', hi: '#ffc0e6', dirt: '#9b5fd1', dot: '#c08af0', h1: '#ffd0ec', h2: '#e9a6ff' }
];
const UNDER = { name: 'UNDERGROUND', sky: ['#0a0816', '#1d1836'], top: '#6b6b8a', hi: '#9a9ac0', dirt: '#3a3550', dot: '#2c2840' };
const REALB = { name: 'REAL WORLD', top: '#4f7a3a', hi: '#7aa35a', dirt: '#5d4632', dot: '#3f2f22' };
let biome = BIOMES[0];
const UNDERS = [
  { name: 'CRYSTAL CAVE', sky: ['#060a1a', '#122a44'], top: '#5fa8d3', hi: '#a8e4ff', dirt: '#24364d', dot: '#1a2738', glow: [195, 100, 70] },
  { name: 'MOSSY GROTTO', sky: ['#07120a', '#1b3320'], top: '#4f8a3a', hi: '#8fd16a', dirt: '#2e3a28', dot: '#202a1c', glow: [100, 100, 65] },
  { name: 'MAGMA DEN', sky: ['#1a0604', '#3d120a'], top: '#8a3a20', hi: '#ff8a3a', dirt: '#3a1e18', dot: '#2a1410', glow: [25, 100, 60] },
  { name: 'AMETHYST HALL', sky: ['#0d0618', '#2a1640'], top: '#8a5ad8', hi: '#d0b0ff', dirt: '#2c2040', dot: '#20172f', glow: [280, 100, 72] },
  { name: 'OLD MINE', sky: ['#0c0a08', '#26201a'], top: '#8a7a5a', hi: '#c9b48a', dirt: '#3a3026', dot: '#2a221a', glow: [42, 100, 65] }
];
const POCKET = { name: 'SPIRIT WORLD', sky: ['#1a0630', '#4b1a6e'], top: '#b28cff', hi: '#e0ccff', dirt: '#3a1d5c', dot: '#5a2d8c', glow: [285, 90, 80] };
const FRENZYB = { name: 'COIN FRENZY', sky: ['#2a1600', '#6a4200'], top: '#ffd23f', hi: '#fff3a0', dirt: '#7a5200', dot: '#5a3c00', glow: [45, 100, 65] };
let underB = UNDERS[0], roomDecor = [], roomKind = '', frenzy = null;
const goldPipe = tx => warps.some(w => w.gold && !w.used && (tx === w.tx || tx === w.tx + 1));
function buildFrenzy() {
  underB = FRENZYB; roomKind = 'frenzy';
  W = Math.max(Math.ceil(VW / T) + 2, 44);
  map = new Uint8Array(W * ROWS);
  ents = []; coinL = []; items = []; bumps = []; shots = []; roomDecor = [];
  const set = (x, y, t) => { if (x >= 0 && x < W && y >= 0 && y < ROWS) map[y * W + x] = t; };
  for (let x = 0; x < W; x++) { set(x, 0, 8); set(x, 13, 1); set(x, 14, 1); if (x % 5 === 2) roomDecor.push({ x: x * T + 8, y: 13 * T, up: 1, s: 1 }); }
  for (let y = 0; y < ROWS; y++) { set(0, y, 8); set(W - 1, y, 8); }
  for (let x = 6; x < W - 7; x++) { if (x % 9 < 5) set(x, 10, 11); if ((x + 4) % 9 < 4) set(x, 7, 11); }
  for (const px of [2, W - 5]) { set(px, 11, 10); set(px + 1, 11, 10); set(px, 12, 9); set(px + 1, 12, 9); }
  warps = [{ tx: 2, ty: 11, used: false }, { tx: W - 5, ty: 11, used: false }];
  flagX = 1e9;
  frenzy = { t: 20, spawn: 0, chain: 0, chainT: 0, got: 0, best: 0, done: false };
}
function frenzyPick(c) {
  const v = c.gem ? 5 : 1;
  coins += v; frenzy.got += v;
  frenzy.chain++; frenzy.chainT = 1.2; frenzy.best = Math.max(frenzy.best, frenzy.chain);
  const n = Math.min(frenzy.chain, 48), f = 660 * Math.pow(2, n / 24);
  if (ac) { const at = ac.currentTime; tn(f, 0.09, 'square', 0.045, at, f * 0.4); if (c.gem) tn(f * 1.5, 0.15, 'triangle', 0.08, at + 0.03, 400); }
  for (let i = 0; i < (c.gem ? 10 : 4); i++) parts.push({ x: c.x + 4, y: c.y + 4, vx: (Math.random() - 0.5) * 140, vy: -Math.random() * 120, g: 300, life: 0.4, col: c.gem ? '#7ff' : '#ffe066', s: 2 });
  if (frenzy.chain % 10 === 0) { float(P.x - 10, P.y - 18, 'CHAIN x' + frenzy.chain + '!', '#fff'); sfx.power(); shake = Math.max(shake, 0.12); }
}
function updFrenzy(dt) {
  if (state !== 'play') return;
  frenzy.chainT -= dt; if (frenzy.chainT <= 0) frenzy.chain = 0;
  if (frenzy.done) return;
  frenzy.t -= dt;
  frenzy.spawn -= dt;
  while (frenzy.spawn <= 0) {
    frenzy.spawn += 0.055;
    coinL.push({ x: camX + 8 + Math.random() * (VW - 16), y: -10, w: 8, h: 8, fall: 1, life: 5, gem: Math.random() < 0.08 });
  }
  if (frenzy.t <= 0) {
    frenzy.done = true; addXp(frenzy.got);
    banner('TIME!', frenzy.got + ' coins - best chain x' + frenzy.best + ' (+' + frenzy.got + ' XP)', 3);
    sfx.clear(); setTimeout(saveGame, 0);
  }
}
const B = () => under ? underB : biome;

/* ---------- state ---------- */
let state = 'title', stT = 0, world = 1, hp = 3, coins = 0, camX = 0, time = 0, combo = 0, shake = 0;
let map, W, ents, coinL, items, parts, texts, bumps, shots, warps, flagX, mod, safe, rainT = 0, startReq = false;
let mode = 'run', under = false, saved = null, pipe = null, real = false, npc = null, rumbleT = 0;
let RH = ROWS, camY = 0, lavaY = 0, lavaWait = 0, goalY = 0;
// story chapters: 5 worlds per biome - run in, run deeper, climb the Baron's tower, chase his balloon, reach his hut
const CH_KIND = ['run', 'run', 'real', 'climb', 'fly', 'run'];
const CH_LEN = CH_KIND.length;
const chPos = n => (n - 1) % CH_LEN;
const chNum = n => Math.floor((n - 1) / CH_LEN);
const isReal = n => CH_KIND[chPos(n)] === 'real';
const modeFor = n => isReal(n) ? 'run' : CH_KIND[chPos(n)];
const biomeFor = n => BIOMES[chNum(n) % BIOMES.length];
const banners = [];
const prog = { lv: 1, xp: 0 };
const P = { x: 0, y: 0, w: 12, h: 14, vx: 0, vy: 0, on: false, face: 1, air: 1, coy: 0, inv: 0, star: 0, boots: 0, blaster: 0, wings: 0, spread: 0, fcd: 0, dash: 0, dcd: 0, anim: 0, glide: false, jumping: false };
const held = { left: 0, right: 0, jump: 0, dash: 0, down: 0, fire: 0 };
let jb = 0, db = 0, dnb = 0, fb = 0;

const PREQ = { dj: 2, mag: 3, dash: 5, glide: 7 };
const perkSet = { dj: null, mag: null, dash: null, glide: null };
const perkVal = (k, lv) => perkSet[k] !== null ? perkSet[k] : lv >= PREQ[k];
const perk = { dj: () => perkVal('dj', prog.lv), mag: () => perkVal('mag', prog.lv), dash: () => perkVal('dash', prog.lv), glide: () => perkVal('glide', prog.lv) };
const cheat = { start: 0, keep: false, story: true };
const START_OPTS = ['NONE', 'STAR', 'BOOTS', 'BLASTER', 'WINGS', 'ALL'];
const SEL_ROWS = ['WORLD', 'PIP LEVEL', 'DOUBLE JUMP', 'COIN MAGNET', 'DASH', 'GLIDE', 'START WITH', 'ENDLESS POWER-UPS', 'STORY', 'START!'];
const sel = { row: 0, w: 1, lv: 1 };
let secretTaps = 0, secretT = -9;

/* ---------- story ---------- */
const NAMES = { pip: 'PIP', bird: 'TWEETSY', grumble: 'GRUMBLE', princess: 'PRINCESS MARZIPAN', baron: 'BARON GRUMBLETON', mole: 'MO THE MOLE',
  snail: 'SHELLY THE SNAIL', frog: 'CHEF RIBBIT', robot: 'BOLT-3000', ghost: 'GUS THE GHOST', granny: 'GRANNY PRICKLES', firefly: 'LUMI THE FIREFLY' };
const NCOL = { pip: '#2fd4c4', bird: '#ffb02e', grumble: '#b58cff', princess: '#ff8fd0', baron: '#c77dff', mole: '#d9a066',
  snail: '#c9e07a', frog: '#6fd16a', robot: '#9fd8ff', ghost: '#e6ecff', granny: '#e0b48a', firefly: '#fff27a' };
const QUESTS = {
  thief: { id: 'frog', item: 'spoon', itemName: 'golden spoon', reward: 'star',
    ask: 'RIBBIT! A Grumble stole my golden spoon! Look, there he goes!', acc: 'I will catch him!', dec: 'Just order takeout?',
    accR: 'Stomp that thief! Ribbit!', decR: 'TAKEOUT?! I am a CHEF!',
    wait: 'He ran that way! Catch him!', done: 'My spoon! Here, a star-shaped cookie. Eat it fast! (STAR)' },
  sky: { id: 'granny', item: 'yarn', itemName: 'ball of yarn', reward: 'wings',
    ask: 'Dearie! The wind blew my yarn way up into the sky!', acc: 'I will get it, Granny!', dec: 'Looks too high for me.',
    accR: 'Hold still, I will knit you a ladder. Knit-knit-knit!', decR: 'Young folks these days. No sense of altitude.',
    wait: 'Climb my ladder, dear! Up, up!', done: 'My yarn! I knitted you tiny wings, too. Flap away! (WINGS)' },
  portal: { id: 'ghost', item: 'teddy', itemName: 'teddy bear', reward: 'coins',
    ask: 'Boooo... my teddy fell into the spirit world. Could you fetch it?', acc: 'Open the portal!', dec: 'The SPIRIT world?! No thanks.',
    accR: 'Abra-ca-BOO! The portal is open. Do not touch the void.', decR: 'Fair. It is spooky. Even for me.',
    wait: 'The portal is right there! Teddy is waiting.', done: 'TEDDY! Take these coins from the afterlife. (+20 coins)' },
  pacifist: { id: 'snail', reward: 'heart',
    ask: 'Could you please not squash anyone until the flag? Squashing is so... final.', acc: 'Okay! No squashing!', dec: 'But squashing is my whole thing.',
    accR: 'Thank you! I will be watching. Slowly.', decR: '...I will pretend I did not hear that.',
    wait: 'Remember: no squashing!', fail: 'Shelly saw that. "...Wow."', win: 'Shelly is proud of you! (+1 heart)' },
  fireflies: { id: 'firefly', reward: 'xp',
    ask: 'Bzzz! My five little fireflies flew off! Some went back, some went up!', acc: 'I will round them up!', dec: 'Maybe they need some space.',
    accR: 'Bless you! They glow, and they love to follow you. Bzzz!', decR: 'They are FIREFLIES. They need SUPERVISION.',
    wait: 'Still missing some! Look back, and look up!', win: 'All five fireflies are home! (+60 XP)' },
  race: { id: 'robot', reward: 'xp',
    ask: 'BEEP. RACE MODE ACTIVATED. BEAT. ME. TO. THE. FLAG.', acc: 'You are ON!', dec: 'I do not race toasters.',
    accR: 'COUNTDOWN. INITIATED.', decR: 'I. AM. NOT. A. TOASTER. ...I AM A KETTLE.',
    wait: 'BEEP. RACE. IN. PROGRESS.', fail: 'BOLT-3000: "BEEP. BETTER. LUCK. NEXT. CYCLE."', win: 'You beat BOLT-3000! (+60 XP)' },
  block: { id: 'mole', item: 'pebble', itemName: 'lucky pebble', reward: 'heart',
    ask: 'Psst. I hid my lucky pebble in a ? box back there. Which one? ...I forget.', acc: 'I will find it!', dec: 'Sounds like a you problem.',
    accR: 'It is the one that sparkles a bit. Probably.', decR: 'Rude. Accurate, but rude.',
    wait: 'A ? box. Back there. Sparkly. That is all I know.', done: 'My lucky pebble! You may hold it for one second. ...Done. (+1 heart)' }
};
const QORDER = ['thief', 'sky', 'portal', 'pacifist', 'fireflies', 'race', 'block'];
const INTRO = [
  ['bird', 'TWEET TWEET! Pip! Emergency! A big one!'],
  ['pip', 'Did someone eat the last cookie again?'],
  ['bird', 'Worse! Baron Grumbleton kidnapped Princess Marzipan!'],
  ['pip', 'Again?! That is the third time this week.'],
  ['bird', 'He left a note. It says: "Not sorry."', [
    { t: 'Rude. Let\'s go!', f: () => { flags.brave = 1; return [['pip', 'Rude. Let\'s go!'], ['bird', 'That is the spirit! Tweet!']]; } },
    { t: 'Can I finish my nap first?', f: () => { flags.lazy = 1; return [['pip', 'Can I finish my nap first?'], ['bird', 'NO! ...Okay, five seconds.'], ['bird', '...Time is up! GO GO GO!']]; } }
  ]]
];
const CLEARS = [
  [['grumble', 'Grr! The princess? She is not here.'], ['pip', 'Then where is she?'], ['grumble', 'Not here. Also not telling. Grr.']],
  [['bird', 'Tweet! I saw her! She went that way!'], ['pip', 'Which way?'], ['bird', '...Forward. It is always forward.']],
  [['grumble', 'I am on my lunch break. Try the next hut.', [
    { t: 'Can I have a bite?', f: () => { hp = Math.min(maxHp(), hp + 1); return [['pip', 'Can I have a bite?'], ['grumble', '...Fine. Here. Do not tell the Baron. (+1 heart)']]; } },
    { t: 'You are ALWAYS on break.', f: () => [['pip', 'You have been on lunch break for six worlds.'], ['grumble', 'It is a very big sandwich.']] }
  ]]],
  [['mole', 'Psst. Want to buy a map? Only 10 coins.', [
    { t: 'Sure! (10 coins)', f: () => {
      if (coins < 10) return [['pip', 'Sure! ...Oh. I only have ' + coins + ' coins.'], ['mole', 'Then you get a map of HALF a hole.']];
      coins -= 10; flags.map = 1;
      return [['pip', 'Sure!'], ['mole', 'It is a drawing of a hole. Pleasure doing business!']];
    } },
    { t: 'No thanks.', f: () => [['pip', 'No thanks.'], ['mole', 'Your loss. It was a really good hole.']] }
  ]]],
  [['baron', 'MWAHAHA! You will never catch me!'], ['pip', 'You are standing right there.'], ['baron', '...MWAHAHA! *runs away very fast*']],
  [['grumble', 'Why do you always jump on our heads?'], ['pip', 'Why do you always walk into me?'], ['grumble', '...Fair point. Grr.']],
  [['pip', 'Princess? Are you in there?'], ['grumble', 'Wrong door. This is my bathroom.'], ['pip', 'Sorry! Sorry!']],
  [['bird', 'Tweet! The Baron has an evil plan: step one, steal princess...'], ['pip', 'And step two?'], ['bird', 'He has not decided yet. He is very busy being evil.']],
  [['bird', 'Fun fact: I am the only bird here who is NOT trying to bonk you.'], ['pip', 'Thanks... I guess?']]
];
const flags = {};
let bonusStar = false;
function rescueScene(ch) {
  const L = [];
  L.push(['princess', flags.snacks ? 'Pip! You found me! Did you bring snacks THIS time?' : 'Pip! You found me! Did you bring snacks?', [
    { t: 'I brought a RESCUE!', f: () => { flags.snacks = 0; return [['pip', 'I brought a RESCUE!'], ['princess', 'Even better! ...Slightly.']]; } },
    { t: 'I ate them on the way.', f: () => { const again = flags.snacks; flags.snacks = 1; return [['pip', again ? 'I ate them on the way. Again.' : 'I ate them on the way. Sorry.'], ['princess', again ? 'PIP!' : 'Fair. Heroing is hungry work.']]; } }
  ]]);
  L.push(ch % 2 ? ['princess', 'The Baron made me listen to his poetry. All of it.'] : ['princess', 'The Baron was teaching me the bagpipes. It was LOUD.']);
  L.push(ch % 2 ? ['baron', 'Not so fast! I have a balloon, a net, and NO shame!'] : ['baron', 'MWAHAHA! And now... I steal her AGAIN!']);
  if (flags.charm) {
    flags.charm = 0; bonusStar = true;
    L.push(['baron', 'But you were nice about my balloon. Take this star. Fair is fair.']);
  }
  L.push(['princess', 'Ugh, fine. See you in six worlds, Pip!']);
  L.push(['pip', flags.lazy ? 'Every. Single. Time. ...I need a nap.' : 'Every. Single. Time.']);
  return L;
}
const FLYS = [
  [['bird', 'Tweet! You have a plane now.'], ['pip', 'Since when?'], ['bird', 'Do not ask. Physics is on a coffee break.']],
  [['bird', 'My cousins up here are cranky. Sorry in advance.'], ['pip', 'How cranky?'], ['bird', '...Dodge cranky.']],
  [['pip', 'Who keeps leaving planes everywhere?'], ['bird', 'The Baron buys them in bulk. He has a coupon.'], ['pip', 'Thanks, evil coupon!']],
  [['bird', 'Tweet! Pilot tip: the shooty end goes forward.'], ['pip', 'Which end is the shooty end?'], ['bird', '...We will find out together!']]
];
const CLIMBS = [
  [['pip', 'Is that... lava rising?'], ['bird', 'Lava does not rise, Pip.'], ['pip', 'It is rising.'], ['bird', 'TWEET! CLIMB! CLIMB FASTER!']],
  [['grumble', 'Welcome to the tower! There is no elevator.'], ['pip', 'And why is there lava?'], ['grumble', 'Ambience. Grr.']],
  [['pip', 'Another tower? Does he collect them?'], ['bird', 'He says towers are "very villain chic".'], ['pip', 'And the lava?'], ['bird', 'Also chic. CLIMB!']],
  [['grumble', 'Grr. The Baron installed the lava himself.'], ['pip', 'Is it safe?'], ['grumble', 'It is lava. Read the room. CLIMB.']]
];
const MOLES = [
  [['mole', 'You did not see me. I am not here.']],
  [['mole', 'Take the coins. I only collect pebbles. Far superior currency.']],
  [['mole', 'Shh! The Baron thinks this is his broom closet.']]
];
let talk = null, talkAdv = false, talkSkip = false, introSeen = false, pendingTalk = null;
function say(lines, done) {
  if (!cheat.story || !lines) { if (done) done(); return; }
  talk = { lines: lines.slice(), i: 0, n: 0, acc: 0, sel: 0, done };
  talkAdv = false; talkSkip = false;
  state = 'talk';
}
function updTalk(dt) {
  const L = talk.lines[talk.i], len = L[1].length;
  if (talk.n < len) {
    talk.acc += dt * 40;
    while (talk.acc >= 1 && talk.n < len) {
      talk.acc--; talk.n++;
      const ch = L[1][talk.n - 1];
      if (ch !== ' ' && talk.n % 2) voice(L[0], ch);
    }
  }
  if (talkSkip) {
    talkSkip = false; talkAdv = false;
    let j = talk.i;
    while (j < talk.lines.length && !talk.lines[j][2]) j++;
    if (j !== talk.i) { talk.i = j; talk.acc = 0; }
    if (j < talk.lines.length) talk.n = talk.lines[j][1].length;
  } else if (talkAdv) {
    talkAdv = false;
    if (talk.n < len) talk.n = len;
    else {
      if (L[2]) { const extra = L[2][talk.sel].f() || []; talk.lines.splice(talk.i + 1, 0, ...extra); sfx.coin(); }
      talk.i++; talk.n = 0; talk.acc = 0; talk.sel = 0;
    }
  }
  if (talk.i >= talk.lines.length) {
    const d = talk.done; talk = null; state = 'play';
    if (d) d();
  }
}
const talkChoosing = () => talk && talk.i < talk.lines.length && talk.lines[talk.i][2] && talk.n >= talk.lines[talk.i][1].length;
function talkMove(d) { if (!talkChoosing()) return false; const n = talk.lines[talk.i][2].length; talk.sel = (talk.sel + d + n) % n; sfx.bump(); return true; }
let choiceRects = [];
function wrapText(str, maxW) {
  const out = []; let line = '';
  for (const w of str.split(' ')) {
    const t = line ? line + ' ' + w : w;
    if (line && ctx.measureText(t).width > maxW) { out.push(line); line = w; } else line = t;
  }
  out.push(line);
  return out;
}
function drawFace(who, x, y, talking) {
  const m = talking ? 2.5 : 1;
  ctx.save(); ctx.translate(x, y);
  if (who === 'pip') {
    ctx.fillStyle = '#2fd4c4';
    ctx.beginPath(); ctx.moveTo(-8, -10); ctx.lineTo(-4, -20); ctx.lineTo(0, -12); ctx.lineTo(2, -12); ctx.lineTo(6, -20); ctx.lineTo(10, -10); ctx.fill();
    ctx.beginPath(); ctx.arc(0, 0, 14, 0, TAU); ctx.fill();
    ctx.fillStyle = '#ff4d6d'; ctx.fillRect(-14, 9, 28, 4);
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.ellipse(5, -3, 4.5, 5.5, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = '#111'; ctx.beginPath(); ctx.ellipse(6.5, -3, 2.2, 3, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = '#0d5c55'; ctx.fillRect(1, 5, 7, m);
  } else if (who === 'bird') {
    ctx.fillStyle = '#ffb02e'; ctx.beginPath(); ctx.ellipse(0, 2, 14, 12, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = '#e07a10'; ctx.beginPath(); ctx.ellipse(-6, 6, 7, 4, 0.5 + Math.sin(time * 20) * 0.3, 0, TAU); ctx.fill();
    ctx.fillStyle = '#ff6a3d'; ctx.beginPath(); ctx.moveTo(10, -1); ctx.lineTo(19, 1 + (talking ? -2 : 0)); ctx.lineTo(10, 2); ctx.fill();
    ctx.beginPath(); ctx.moveTo(10, 3); ctx.lineTo(18, 3 + m); ctx.lineTo(10, 5); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(4, -4, 4, 0, TAU); ctx.fill();
    ctx.fillStyle = '#111'; ctx.beginPath(); ctx.arc(5, -4, 2, 0, TAU); ctx.fill();
    ctx.fillStyle = '#ffb02e'; ctx.fillRect(-2, -14, 2, 5); ctx.fillRect(1, -15, 2, 6);
  } else if (who === 'princess') {
    ctx.fillStyle = '#ffd0e6'; ctx.beginPath(); ctx.arc(0, 2, 13, 0, TAU); ctx.fill();
    ctx.fillStyle = '#ff7ac8'; ctx.beginPath(); ctx.arc(0, -2, 15, Math.PI, 0); ctx.fill(); ctx.fillRect(-15, -2, 5, 16); ctx.fillRect(10, -2, 5, 16);
    ctx.fillStyle = '#ffd23f'; ctx.beginPath(); ctx.moveTo(-8, -14); ctx.lineTo(-8, -24); ctx.lineTo(-4, -18); ctx.lineTo(0, -26); ctx.lineTo(4, -18); ctx.lineTo(8, -24); ctx.lineTo(8, -14); ctx.fill();
    ctx.fillStyle = '#111'; ctx.beginPath(); ctx.arc(-4, 2, 1.8, 0, TAU); ctx.arc(4, 2, 1.8, 0, TAU); ctx.fill();
    ctx.fillStyle = 'rgba(255,90,140,.5)'; ctx.beginPath(); ctx.arc(-7, 6, 2.5, 0, TAU); ctx.arc(7, 6, 2.5, 0, TAU); ctx.fill();
    ctx.fillStyle = '#c2304f'; ctx.fillRect(-2, 8, 4, m);
  } else if (who === 'baron') {
    ctx.fillStyle = '#6b3fa0'; ctx.beginPath(); ctx.arc(0, 2, 14, 0, TAU); ctx.fill();
    ctx.fillStyle = '#111'; ctx.fillRect(-10, -14, 20, 4); ctx.fillRect(-7, -28, 14, 15);
    ctx.fillStyle = '#ff4d6d'; ctx.fillRect(-7, -17, 14, 2);
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(-5, -2, 3, 0, TAU); ctx.arc(5, -2, 3, 0, TAU); ctx.fill();
    ctx.fillStyle = '#111'; ctx.beginPath(); ctx.arc(-5, -1, 1.5, 0, TAU); ctx.arc(5, -1, 1.5, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#ffd23f'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(5, -2, 4.5, 0, TAU); ctx.moveTo(9, 0); ctx.lineTo(10, 10); ctx.stroke();
    ctx.fillStyle = '#2a1840'; ctx.beginPath(); ctx.moveTo(-10, 8); ctx.quadraticCurveTo(0, 2, 10, 8); ctx.quadraticCurveTo(0, 5, -10, 8); ctx.fill();
    ctx.fillStyle = '#111'; ctx.fillRect(-3, 9, 6, m);
  } else if (who === 'mole') {
    ctx.fillStyle = '#8a5a3c'; ctx.beginPath(); ctx.arc(0, 2, 14, 0, TAU); ctx.fill();
    ctx.fillStyle = '#ff9fb0'; ctx.beginPath(); ctx.arc(0, 5, 4, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#222'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(-5, -3, 4, 0, TAU); ctx.moveTo(9, -3); ctx.arc(5, -3, 4, 0, TAU); ctx.moveTo(-1, -3); ctx.lineTo(1, -3); ctx.stroke();
    ctx.fillStyle = '#fff'; ctx.fillRect(-2, 9, 4, 2 + m);
  } else if (who === 'snail') {
    const sg = ctx.createRadialGradient(-7, -3, 1, -4, 2, 12); sg.addColorStop(0, '#f0c08a'); sg.addColorStop(1, '#a8682e');
    ctx.fillStyle = sg; ctx.beginPath(); ctx.arc(-4, 2, 11, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#7a4a22'; ctx.lineWidth = 1.4; ctx.beginPath(); for (let a = 0; a < 12; a += 0.3) ctx.lineTo(-4 + Math.cos(a) * a * 0.8, 2 + Math.sin(a) * a * 0.8); ctx.stroke();
    ctx.fillStyle = '#b9d36a'; ctx.beginPath(); ctx.ellipse(8, 9, 9, 5, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#8aa64a'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(9, 5); ctx.lineTo(8, -8); ctx.moveTo(13, 5); ctx.lineTo(15, -7); ctx.stroke();
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(8, -9, 2.5, 0, TAU); ctx.fill(); ctx.beginPath(); ctx.arc(15, -8, 2.5, 0, TAU); ctx.fill();
    ctx.fillStyle = '#111'; ctx.beginPath(); ctx.arc(8.6, -9, 1.2, 0, TAU); ctx.fill(); ctx.beginPath(); ctx.arc(15.6, -8, 1.2, 0, TAU); ctx.fill();
    ctx.fillStyle = '#5a6a2a'; ctx.fillRect(12, 10, 4, m * 0.6);
  } else if (who === 'frog') {
    blob(0, 3, 14, 11, [120, 50, 45]);
    ctx.fillStyle = '#fff'; ctx.fillRect(-9, -18, 18, 8);
    for (const [hx, hy, hr] of [[-6, -18, 5], [0, -21, 6], [6, -18, 5]]) { ctx.beginPath(); ctx.arc(hx, hy, hr, 0, TAU); ctx.fill(); }
    eyes(0, -3, 1, 0, 1.6);
    ctx.strokeStyle = '#1d4d22'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(0, 4, 7, 0.2, Math.PI - 0.2); ctx.stroke();
    ctx.fillStyle = '#c2304f'; ctx.fillRect(-2, 9, 4, m);
  } else if (who === 'robot') {
    const rg = ctx.createLinearGradient(-12, 0, 12, 0); rg.addColorStop(0, '#6c7a89'); rg.addColorStop(0.5, '#cfd8e0'); rg.addColorStop(1, '#5a6672');
    ctx.fillStyle = rg; ctx.fillRect(-12, -10, 24, 22); ctx.strokeStyle = '#333'; ctx.lineWidth = 1; ctx.strokeRect(-12, -10, 24, 22);
    ctx.beginPath(); ctx.moveTo(0, -10); ctx.lineTo(0, -17); ctx.stroke();
    ctx.fillStyle = (time * 4 | 0) % 2 ? '#ff3b3b' : '#ffd23f'; ctx.beginPath(); ctx.arc(0, -18, 2.5, 0, TAU); ctx.fill();
    ctx.fillStyle = '#0ff'; ctx.fillRect(-8, -5, 5, 4); ctx.fillRect(3, -5, 5, 4);
    ctx.fillStyle = '#222'; ctx.fillRect(-7, 4, 14, 3); ctx.fillStyle = '#0f0';
    for (let i = 0; i < 4; i++) if (talking || i < 2) ctx.fillRect(-6 + i * 3.5, 4.5, 2, 2);
  } else if (who === 'ghost') {
    const gg = ctx.createRadialGradient(-4, -6, 1, 0, 0, 16); gg.addColorStop(0, '#fff'); gg.addColorStop(1, '#c9d6ff');
    ctx.globalAlpha *= 0.9; ctx.fillStyle = gg; ctx.beginPath(); ctx.arc(0, -2, 13, Math.PI, 0);
    for (let i = 0; i <= 6; i++) ctx.lineTo(13 - i * 26 / 6, 12 + (i % 2 ? -3 : 1) + Math.sin(time * 6 + i));
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#223'; ctx.beginPath(); ctx.ellipse(-4, -3, 2.2, 3.2, 0, 0, TAU); ctx.fill(); ctx.beginPath(); ctx.ellipse(4, -3, 2.2, 3.2, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = 'rgba(255,120,160,.5)'; ctx.beginPath(); ctx.arc(-8, 2, 2.2, 0, TAU); ctx.fill(); ctx.beginPath(); ctx.arc(8, 2, 2.2, 0, TAU); ctx.fill();
    ctx.fillStyle = '#223'; ctx.beginPath(); ctx.ellipse(0, 4, 2, 0.8 + m * 0.6, 0, 0, TAU); ctx.fill();
  } else if (who === 'granny') {
    ctx.fillStyle = '#5a4030';
    for (let i = 0; i < 9; i++) { const a = Math.PI + i * Math.PI / 8; ctx.beginPath(); ctx.moveTo(Math.cos(a - 0.2) * 11, Math.sin(a - 0.2) * 11 + 2); ctx.lineTo(Math.cos(a) * 18, Math.sin(a) * 18 + 2); ctx.lineTo(Math.cos(a + 0.2) * 11, Math.sin(a + 0.2) * 11 + 2); ctx.fill(); }
    blob(0, 3, 12, 11, [30, 45, 70]);
    ctx.fillStyle = '#ddd'; ctx.beginPath(); ctx.arc(0, -12, 5, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#333'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(-4.5, 1, 3, 0, TAU); ctx.stroke(); ctx.beginPath(); ctx.arc(4.5, 1, 3, 0, TAU); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-1.5, 1); ctx.lineTo(1.5, 1); ctx.stroke();
    ctx.fillStyle = '#111'; ctx.beginPath(); ctx.arc(-4.5, 1, 1.1, 0, TAU); ctx.fill(); ctx.beginPath(); ctx.arc(4.5, 1, 1.1, 0, TAU); ctx.fill();
    ctx.fillStyle = '#3a2a20'; ctx.beginPath(); ctx.arc(0, 6, 1.8, 0, TAU); ctx.fill();
    ctx.fillStyle = '#c2304f'; ctx.fillRect(-2, 9, 4, m * 0.8);
  } else if (who === 'firefly') {
    const fg = ctx.createRadialGradient(0, 10, 1, 0, 10, 18); fg.addColorStop(0, 'rgba(255,250,150,.95)'); fg.addColorStop(1, 'rgba(255,250,150,0)');
    ctx.fillStyle = fg; ctx.fillRect(-18, -8, 36, 36);
    const fl = Math.sin(time * 30) * 0.4;
    ctx.fillStyle = 'rgba(220,240,255,.75)'; ctx.beginPath(); ctx.ellipse(-9, -8, 7, 3.5, -0.5 + fl, 0, TAU); ctx.fill(); ctx.beginPath(); ctx.ellipse(9, -8, 7, 3.5, 0.5 - fl, 0, TAU); ctx.fill();
    blob(0, 1, 10, 9, [35, 35, 32]);
    eyes(0, 0, 1, 0, 1.4);
    ctx.strokeStyle = '#333'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(-3, -7); ctx.lineTo(-6, -15); ctx.moveTo(3, -7); ctx.lineTo(6, -15); ctx.stroke();
    ctx.fillStyle = '#fff27a'; ctx.beginPath(); ctx.arc(-6, -15, 1.8, 0, TAU); ctx.fill(); ctx.beginPath(); ctx.arc(6, -15, 1.8, 0, TAU); ctx.fill();
    ctx.fillStyle = '#5a3a20'; ctx.fillRect(-2, 6, 4, m * 0.8);
  } else {
    ctx.fillStyle = '#8e5bd8'; ctx.beginPath(); ctx.arc(0, 4, 14, Math.PI, 0); ctx.lineTo(14, 12); ctx.lineTo(-14, 12); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.ellipse(-5, 0, 3.5, 4, 0, 0, TAU); ctx.ellipse(5, 0, 3.5, 4, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = '#111'; ctx.beginPath(); ctx.ellipse(-4, 1, 1.8, 2.4, 0, 0, TAU); ctx.ellipse(6, 1, 1.8, 2.4, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#111'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-10, -6); ctx.lineTo(-2, -3); ctx.moveTo(10, -6); ctx.lineTo(2, -3); ctx.stroke();
    ctx.fillStyle = '#2a1840'; ctx.fillRect(-4, 7, 8, m);
  }
  ctx.restore();
}
const ARRIVE = {
  'MEADOW': [['bird', 'Tweet! The balloon went back to the MEADOW!'], ['pip', 'Grass. Flowers. Evil. A classic.']],
  'DESERT': [['bird', 'Tweet! The Baron flew to the DESERT!'], ['pip', 'Great. Sand. In my everything.'], ['bird', 'Stay hydrated! Tweet!']],
  'SNOWY PEAKS': [['bird', 'Brrr-tweet! He is hiding in the SNOWY PEAKS!'], ['pip', 'My ears will freeze off. Both of them.'], ['bird', 'Careful, the ground is slippery!']],
  'VOLCANO': [['bird', 'Tweet! His balloon landed on a VOLCANO!'], ['pip', 'Who builds a hideout on a volcano?'], ['bird', 'Villains. It is always villains.']],
  'CANDY LAND': [['bird', 'Tweet! He took her to CANDY LAND!'], ['pip', 'Finally a world I can eat!'], ['bird', 'Do NOT lick the scenery, Pip.']]
};
const TOWERTOP = [
  [['baron', 'MWAHAHA! You climbed my whole tower?', [
    { t: 'Give back the princess!', f: () => [['pip', 'Give back the princess!'], ['baron', 'Never! I have... a BALLOON! Toodle-oo!']] },
    { t: 'Nice balloon. Is it new?', f: () => { flags.charm = 1; return [['pip', 'Nice balloon. Is it new?'], ['baron', '...It IS new! Nobody ever notices! Thank you!'], ['baron', 'Still escaping, though. Toodle-oo!']]; } }
  ]]],
  [['baron', 'Impressive! Most heroes quit at the stairs.'], ['pip', 'There were no stairs. Only lava.'], ['baron', 'Exactly! Byeee!'], ['bird', 'Tweet! He is escaping by air! Follow him!']]
];
const LANDED = [
  [['bird', 'Tweet! He landed! His hut is just ahead!'], ['pip', 'This time for real.']],
  [['bird', 'His balloon popped! He has to walk now!'], ['pip', 'Ha! Let us catch him at his hut!']]
];
const REAL_IN = [
  ['bird', 'Tweet?! Pip... why do I have REAL feathers now?'],
  ['pip', 'Everything looks so... expensive.'],
  ['bird', 'The Baron tripped over a cable and opened a portal to the REAL WORLD!'],
  ['pip', 'That explains why my shadow has a shadow.'],
  ['bird', 'So? Explore, or go straight home?', [
    { t: 'Cool! Let\'s explore!', f: () => { flags.realFan = 1; return [['pip', 'Cool! Let\'s explore!'], ['bird', 'Do not touch anything. Everything costs money here.']]; } },
    { t: 'I want to go home.', f: () => [['pip', 'I want to go home. I miss my outlines.'], ['bird', 'Same. The flag is the portal back!']] }
  ]]
];
const REAL_OUT = [['grumble', 'Grr. I tried to stomp a real rock. Do not recommend.'], ['pip', 'Back to normal, then?'], ['grumble', 'Normal? You are a teal ball with ears.']];
function realIn(ch) {
  if (ch === 0) return REAL_IN;
  const v = (ch - 1) % 4;
  if (v === 0) return [['pip', 'Wait. The portal is back?!'], ['bird', 'The Baron tripped over the SAME cable. Again.'], ['pip', 'Someone should tape that cable down.'],
    ['bird', flags.realFan ? 'You loved it last time. Go on, tourist!' : 'I know you wanted to go home. Sorry, Pip.']];
  if (v === 1) return [['bird', 'Tweet! Bad news. The real world has... taxes.'], ['pip', 'What are taxes?'], ['bird', 'Nobody knows. Not even the real people.', [
    { t: 'Pay them (5 coins)', f: () => { if (coins < 5) return [['pip', 'I only have ' + coins + ' coins...'], ['bird', 'Then you are exempt. Lucky ball.']]; coins -= 5; hp = Math.min(maxHp(), hp + 1); flags.taxes = 1; return [['pip', 'Here. Five coins.'], ['bird', 'A responsible ball! Have a heart for honesty. (+1 heart)']]; } },
    { t: 'RUN!', f: () => [['pip', 'RUN!'], ['bird', 'Tweet! Tax evasion speedrun! Go go go!']] }
  ]]];
  if (v === 2) return [['grumble', 'Grr. Welcome back. I am a REAL Grumble now.'], ['pip', 'You look exactly the same.'], ['grumble', 'I have PORES now. Look at my pores.'], ['pip', 'Please do not show me your pores.']];
  return [['bird', 'Pip... I think I am getting used to the real world.'], ['pip', 'Me too. I named a rock.'], ['bird', 'What is its name?'], ['pip', 'Rock. It is a very realistic name.']];
}
function realOut(ch) {
  const v = ch % 3;
  if (v === 0) return REAL_OUT;
  if (v === 1) return [['bird', 'Phew! Back to cartoons!'], ['pip', 'I kind of miss the shadows.'], ['bird', flags.taxes ? 'And the taxes?' : 'And the rocks?'], ['pip', '...No.']];
  return [['grumble', 'Grr. I brought a real souvenir.'], ['pip', 'What is it?'], ['grumble', 'Dust. Real dust. Very expensive.']];
}
function startScene(n) {
  if (n === 1 && !introSeen) { introSeen = true; return INTRO; }
  const pos = chPos(n), ch = chNum(n);
  if (pos === 0 && n > 1) return ARRIVE[biomeFor(n).name];
  if (pos === 2) return realIn(ch);
  if (pos === 3) return CLIMBS[ch % CLIMBS.length];
  if (pos === 4) return FLYS[ch % FLYS.length];
  return null;
}
function clearScene(n) {
  const pos = chPos(n), ch = chNum(n);
  if (pos === 5) return rescueScene(ch);
  if (pos === 2) return realOut(ch);
  if (pos === 3) return TOWERTOP[ch % TOWERTOP.length];
  if (pos === 4) return LANDED[ch % LANDED.length];
  return CLEARS[(ch * 2 + pos) % CLEARS.length];
}
const maxHp = () => Math.min(8, 3 + (prog.lv >= 4) + (prog.lv >= 6) + Math.max(0, Math.floor((prog.lv - 6) / 2)));
const speed = () => 100 * (1 + Math.min(0.25, (prog.lv - 1) * 0.02)) * (mod === 'TURBO' ? 1.3 : 1);
const xpNeed = l => 50 + l * 30;
const PERKS = { 2: 'DOUBLE JUMP!', 3: 'COIN MAGNET!', 4: '+1 MAX HEART', 5: 'DASH! (Shift / X)', 6: '+1 MAX HEART', 7: 'GLIDE! (hold jump)' };

const SAVE_KEY = 'pip-marzipan-caper-save-v1';
let hasSave = false;
function saveGame() {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify({ w: world, lv: prog.lv, xp: prog.xp, c: coins, f: flags, i: introSeen, p: perkSet, ch: cheat, m: muted })); hasSave = true; } catch (e) {}
}
function loadGame() {
  try {
    const d = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null');
    if (!d || typeof d !== 'object') return;
    world = Math.max(1, d.w | 0) || 1; prog.lv = Math.max(1, d.lv | 0) || 1; prog.xp = Math.max(0, +d.xp || 0); coins = Math.max(0, d.c | 0);
    if (d.f && typeof d.f === 'object') Object.assign(flags, d.f);
    introSeen = !!d.i; muted = !!d.m;
    if (d.p) for (const k in perkSet) if (d.p[k] === true || d.p[k] === false || d.p[k] === null) perkSet[k] = d.p[k];
    if (d.ch) { cheat.start = (d.ch.start | 0) % START_OPTS.length; cheat.keep = !!d.ch.keep; cheat.story = d.ch.story !== false; }
    hasSave = true;
  } catch (e) {}
}
function banner(s, sub, t = 2.2) { banners.push({ s, sub: sub || '', t, max: t }); }
function float(x, y, s, col) { texts.push({ x, y, s, col: col || '#fff', t: 1 }); }
function addXp(n) {
  prog.xp += n;
  while (prog.xp >= xpNeed(prog.lv)) {
    prog.xp -= xpNeed(prog.lv); prog.lv++;
    const l = prog.lv;
    const msg = PERKS[l] || (l % 2 === 0 && l <= 12 ? '+1 MAX HEART' : 'SPEED UP!');
    hp = maxHp(); saveGame();
    banner('LEVEL ' + l + '!', msg, 2.6);
    sfx.lvl();
    for (let i = 0; i < 24; i++) parts.push({ x: P.x + 6, y: P.y + 7, vx: Math.cos(i / 24 * TAU) * 120, vy: Math.sin(i / 24 * TAU) * 120, g: 0, life: 0.6, col: 'hsl(' + i * 15 + ',90%,65%)', s: 2 });
    updDash();
  }
}
function updDash() { if (dashBtn) dashBtn.textContent = perk.dash() ? 'DASH' : 'Lv5'; }
function worldSub() {
  if (mode === 'fly') return 'SKY SHOOTER! fly & auto-fire';
  if (mode === 'climb') return 'TOWER CLIMB! the lava is rising';
  if (real) return 'THE REAL WORLD?! - another universe';
  const part = ['the way in', 'deeper', '', '', '', "the Baron's hut"][chPos(world)];
  return biome.name + ' - ' + part + (mod ? ' - SURPRISE: ' + mod : '');
}

/* ---------- level generation ---------- */
// tiles: 1 ground, 2 brick, 3 ?block, 4 used, 5 spikes, 6 crystal, 7 hidden, 8 stone, 9 pipe body, 10 pipe top
const tileAt = (tx, ty) => tx < 0 ? 1 : (tx >= W || ty < 0 || ty >= RH) ? 0 : map[ty * W + tx];
const solid = t => t === 1 || t === 2 || t === 3 || t === 4 || t === 6 || t === 8 || t === 9 || t === 10;
const firm = t => t === 1 || t === 6 || t === 8 || t === 9 || t === 10 || t === 11;
function mkFoe(x, y, type, diff) {
  return { x, y, w: 14, h: 14, vx: -(28 + diff * 22), sp: 28 + diff * 22, rage: 0, vy: 0, type, act: 0, ht: 1 + Math.random(), on: false, dead: 0, sqd: 0, sq: 0, hp: 1 };
}
function resetP(x, y) {
  Object.assign(P, { x, y, vx: 0, vy: 0, on: true, face: 1, air: 1, inv: 0, star: 0, boots: 0, blaster: 0, wings: 0, spread: 0, fcd: 0, dash: 0, dcd: 0, jumping: false });
}
function gen(n) {
  const r = rng(n * 9973 + 17);
  real = isReal(n); npc = null;
  biome = real ? REALB : biomeFor(n);
  if (real) initReal();
  mode = modeFor(n); RH = ROWS; camY = 0;
  under = false; saved = null; pipe = null; frenzy = null;
  ents = []; coinL = []; items = []; parts = []; texts = []; bumps = []; shots = []; warps = [];
  camX = 0; combo = 0;
  song = makeSong(n); mStep = 0;
  if (mode === 'fly') { genFly(n, r); return; }
  if (mode === 'climb') { genClimb(n, r); return; }
  W = Math.min(400, 100 + n * 16);
  map = new Uint8Array(W * ROWS);
  const set = (x, y, t) => { if (x >= 0 && x < W && y >= 0 && y < ROWS) map[y * W + x] = t; };
  const gnd = x => { set(x, 13, 1); set(x, 14, 1); };
  const coin = (tx, ty) => coinL.push({ x: tx * T + 4, y: ty * T + 4, w: 8, h: 8 });
  const diff = Math.min(1, (n - 1) / 10);
  const foe = (tx, ty = 12) => {
    const k = r();
    let type = 'walk';
    if (n >= 4 && k < 0.05 + 0.12 * diff) type = 'spiky';
    else if (n >= 3 && k < 0.27) type = 'charge';
    else if (n >= 2 && k < 0.44) type = 'fly';
    else if (n >= 2 && k < 0.62) type = 'hop';
    const e = mkFoe(tx * T + 1, ty * T + 2, type, diff);
    if (type === 'fly') { e.y = (8 + (r() * 3 | 0)) * T; e.by = e.y; e.t = r() * 6; e.h = 12; }
    ents.push(e);
  };
  let x = 0;
  for (; x < 14; x++) gnd(x);
  const end = W - 24;
  while (x < end) {
    const c = r();
    if (c < 0.17) { // flat run
      const L = 4 + (r() * 6 | 0);
      for (let i = 0; i < L; i++) gnd(x + i);
      if (r() < 0.6) for (let i = 1; i < L - 1; i++) coin(x + i, i === 1 || i === L - 2 ? 11 : 10);
      if (r() < 0.35 + diff * 0.45) foe(x + L - 2);
      x += L;
    } else if (c < 0.31) { // gap
      const g = 2 + (r() < 0.3 + diff * 0.4 ? 1 : 0);
      for (let i = 0; i < g; i++) coin(x + i, 9);
      x += g;
      for (let i = 0; i < 3; i++) gnd(x + i);
      x += 3;
    } else if (c < 0.45) { // block row
      const L = 3 + (r() * 4 | 0);
      for (let i = 0; i < L + 2; i++) gnd(x + i);
      for (let i = 0; i < L; i++) set(x + 1 + i, 9, r() < 0.35 ? 3 : 2);
      if (r() < 0.35) set(x + 1 + (L >> 1), 5, 3);
      else for (let i = 0; i < L; i++) coin(x + 1 + i, 8);
      if (r() < 0.5) foe(x + L);
      if (r() < 0.18) set(x + L + 1, 9, 7); // hidden block
      x += L + 2;
    } else if (c < 0.55) { // crystal tower
      const h = 2 + (r() * 2 | 0);
      for (let i = 0; i < 7; i++) gnd(x + i);
      for (let y = 13 - h; y < 13; y++) { set(x + 2, y, 6); set(x + 3, y, 6); }
      coin(x + 2, 12 - h); coin(x + 3, 12 - h);
      if (r() < 0.5) foe(x + 5);
      x += 7;
    } else if (c < 0.67) { // pipe (some lead underground)
      const h = 2 + (r() * 2 | 0), ty = 13 - h;
      for (let i = 0; i < 7; i++) gnd(x + i);
      set(x + 2, ty, 10); set(x + 3, ty, 10);
      for (let y = ty + 1; y < 13; y++) { set(x + 2, y, 9); set(x + 3, y, 9); }
      if (r() < 0.65) warps.push({ tx: x + 2, ty, used: false, gold: r() < 0.25 });
      else { coin(x + 2, ty - 1); coin(x + 3, ty - 1); }
      if (r() < 0.4) foe(x + 5);
      x += 7;
    } else if (c < 0.77) { // stairs
      const s = 3 + (r() * 2 | 0);
      for (let i = 0; i < s; i++) { gnd(x + i); for (let k = 0; k <= i; k++) set(x + i, 12 - k, 8); }
      x += s;
      if (r() < 0.5) { coin(x, 12 - s); coin(x + 1, 12 - s); x += 2; }
      for (let i = 0; i < s; i++) { gnd(x + i); for (let k = 0; k < s - i; k++) set(x + i, 12 - k, 8); }
      x += s;
      gnd(x); gnd(x + 1); x += 2;
    } else if (c < 0.87) { // spikes
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
  const mods = ['LOW GRAVITY', 'NIGHT RUN', 'COIN RAIN', 'TURBO', 'BOUNCY', 'AUTO RUN'];
  mod = n >= 2 && !real && r() < 0.5 ? mods[r() * mods.length | 0] : '';
  if ([0, 1, 2, 5].includes(chPos(n))) placeNpc(r);
  resetP(3 * T, 13 * T - P.h);
  safe = { x: P.x, y: P.y };
}
function genFly(n, r) {
  W = Math.min(300, 130 + n * 6);
  map = new Uint8Array(W * ROWS);
  flagX = 1e9; mod = '';
  for (let x = 28; x < W - 8;) {
    const k = r();
    if (k < 0.28) { // coin line
      const y = 2 + (r() * 10 | 0), wave = r() < 0.5;
      for (let i = 0; i < 6; i++) coinL.push({ x: (x + i) * T + 4, y: (wave ? y + Math.sin(i) * 1.5 : y) * T + 4, w: 8, h: 8 });
      x += 7;
    } else { // enemy wave
      const cnt = 1 + (r() * (2 + Math.min(3, n / 4)) | 0), spin = n >= 4 && r() < 0.3;
      const y = 2 + (r() * 9 | 0);
      for (let i = 0; i < cnt; i++) {
        const e = mkFoe((x + i * 2) * T, (spin ? 2 + r() * 10 : y) * T, spin ? 'drone' : 'bird', 0);
        e.by = e.y; e.t = r() * 6; e.vx = spin ? -25 : -(45 + Math.min(40, n * 2)); e.hp = spin ? 3 : 1; e.st = 1.5 + r(); e.h = 12;
        ents.push(e);
        if (spin) break;
      }
      x += 4 + (r() * 5 | 0);
    }
  }
  resetP(40, 100);
  P.on = false;
  safe = { x: P.x, y: P.y };
}
function genClimb(n, r) {
  W = 20; RH = Math.min(220, 64 + n * 3);
  map = new Uint8Array(W * RH);
  mod = ''; flagX = 1e9;
  const set = (x, y, t) => { if (x >= 0 && x < W && y >= 0 && y < RH) map[y * W + x] = t; };
  const coin = (tx, ty) => coinL.push({ x: tx * T + 4, y: ty * T + 4, w: 8, h: 8 });
  const diff = Math.min(1, (n - 1) / 10);
  for (let y = 0; y < RH; y++) { set(0, y, 8); set(W - 1, y, 8); }
  for (let x = 1; x < W - 1; x++) { set(x, RH - 2, 1); set(x, RH - 1, 1); }
  let y = RH - 5, lx = 7, ll = 5;
  while (y > 9) {
    const L = 3 + (r() * 4 | 0);
    const x = clamp(lx - L - 2 + (r() * (ll + L + 5) | 0), 1, W - 1 - L);
    for (let i = 0; i < L; i++) set(x + i, y, 11);
    if (r() < 0.55) for (let i = 0; i < L; i++) coin(x + i, y - 1);
    else if (L >= 4 && r() < 0.25 + diff * 0.4) ents.push(mkFoe((x + 1) * T, (y - 1) * T + 2, r() < 0.3 ? 'hop' : 'walk', diff));
    if (L >= 4 && r() < 0.15) set(x + (L >> 1), y - 2, 3);
    lx = x; ll = L; y -= 3;
  }
  for (let x = 1; x < W - 1; x++) set(x, y, 11);
  goalY = y * T;
  resetP(9 * T, (RH - 2) * T - P.h);
  safe = { x: P.x, y: P.y };
  camX = (W * T - VW) / 2; camY = RH * T - VH; lavaY = RH * T + 30; lavaWait = 3;
}
function updClimb(dt) {
  if (lavaWait > 0) lavaWait -= dt; else lavaY -= (20 + Math.min(16, world * 0.6)) * dt;
  lavaY = Math.max(goalY + 2 * T, Math.min(lavaY, camY + VH + 18));
  const gap = lavaY - (P.y + P.h);
  if (gap < 80) {
    rumbleT -= dt;
    if (rumbleT <= 0) { rumbleT = 0.45; N(0.35, 0.04 + 0.12 * (1 - gap / 80), 0, 60); S(55, 0.3, 'sawtooth', 0.05, 0, -15); shake = Math.max(shake, 0.06); }
  }
  if (P.y + P.h > lavaY + 3) {
    hurt();
    if (state === 'play') {
      P.vy = -560; P.on = false; P.jumping = false; lavaWait = 1.5;
      for (let i = 0; i < 8; i++) parts.push({ x: P.x + 6, y: lavaY, vx: (Math.random() - 0.5) * 120, vy: -Math.random() * 200, g: 600, life: 0.6, col: '#ff8a1f', s: 3 });
    }
  }
  if (state === 'play' && P.on && P.y + P.h <= goalY + 1) worldClear('TOWER CLEAR!');
}
function climbCam(dt) {
  camX = (W * T - VW) / 2;
  const ty = clamp(P.y - VH * 0.55, 0, RH * T - VH);
  camY += (ty - camY) * Math.min(1, dt * 6);
}
function placeNpc(r) {
  const okCol = x => x > 1 && x < W - 2 && map[13 * W + x] === 1 && map[13 * W + x + 1] === 1 &&
    !map[12 * W + x] && !map[12 * W + x + 1] && !map[11 * W + x] && !map[10 * W + x] && !map[9 * W + x];
  const find = (a, b) => { for (let k = 0; k < 80; k++) { const x = a + (r() * Math.max(1, b - a) | 0); if (okCol(x)) return x; } return -1; };
  const nx = find(Math.floor(W * 0.45), Math.floor(W * 0.7));
  if (nx < 0) return;
  const ix = find(16, nx - 16);
  if (ix < 0) return;
  const q = QORDER[(world * 5 + chNum(world) * 3) % QORDER.length], def = QUESTS[q];
  npc = { q, def, x: nx * T, y: 13 * T - 16, w: 16, h: 16, stage: 0, cool: false, t: 0, ix: ix * T + 2, iy: 13 * T - 14, ff: 0 };
  ents = ents.filter(e => Math.abs(e.x - npc.x) > 56);
  coinL = coinL.filter(c => Math.abs(c.x - npc.ix) > 14 || c.y < 11 * T);
}
const qn = () => npc || (saved && saved.npc);
function npcReward() {
  const n = qn(), d = n.def;
  n.stage = 3; addXp(20); sfx.gem(); setTimeout(saveGame, 0);
  if (d.reward === 'heart') hp = Math.min(maxHp(), hp + 1);
  else if (d.reward === 'star') P.star = 8;
  else if (d.reward === 'xp') addXp(60);
  else if (d.reward === 'coins') coins += 20;
  else if (d.reward === 'wings') P.wings = 12;
  float(P.x - 8, P.y - 20, 'QUEST DONE!', '#7ff');
}
function questFail() {
  const n = qn(); if (!n || n.stage !== 1) return;
  n.stage = 4; sfx.locked(); banner('QUEST FAILED', n.def.fail || '', 2);
}
function questWin() { const n = qn(); npcReward(); banner('QUEST COMPLETE!', n.def.win, 2.2); }
function onKill() { const n = qn(); if (n && n.q === 'pacifist' && n.stage === 1) questFail(); }
function questGot() {
  const n = qn(); if (!n || n.stage !== 1) return;
  n.stage = 2; sfx.gem(); banner('GOT IT!', 'bring it back to ' + NAMES[n.def.id], 2);
}
function dropQuest(x, y) {
  const n = qn(); if (!n) return;
  items.push({ x, y, w: 12, h: 12, type: 'quest', rise: 16, qi: n.def.item });
  sfx.power(); float(x, y - 10, 'DROPPED IT!', '#ffe066');
}
function startQuest() {
  const n = npc, nx = Math.floor(n.x / T);
  n.stage = 1; sfx.power();
  const freeAir = (x, y) => x > 1 && x < W - 1 && !map[y * W + x] && !map[(y + 1) * W + x];
  if (n.q === 'thief') {
    const e = mkFoe(n.x + 3 * T, 12 * T + 2, 'thief', 0.5); e.act = 1; e.vx = 92; e.lx = e.x; ents.push(e); n.thief = e;
  } else if (n.q === 'sky') {
    const spots = [[nx - 4, 10], [nx - 1, 7], [nx + 2, 4]];
    n.grow = [];
    for (const [sx, sy] of spots) for (let i = 0; i < 3; i++) if (sx + i > 0 && sx + i < W - 1 && !map[sy * W + sx + i]) n.grow.push([sx + i, sy]);
    n.ladder = spots.map(([sx, sy]) => [(sx + 1.5) * T, sy * T + 3]);
    n.ix = (nx + 3) * T + 2; n.iy = 2 * T; n.gt = 0.3; n.itemOn = false;
  } else if (n.q === 'portal') {
    let px = nx - 6;
    if (!(map[13 * W + px] === 1 && map[13 * W + px + 1] === 1 && !map[12 * W + px])) px = nx + 4;
    n.portal = { tx: px, ty: 13, used: false, pocket: true };
    sfx.surprise(); shake = 0.3;
    for (let i = 0; i < 20; i++) parts.push({ x: px * T + 16, y: 12 * T, vx: Math.cos(i) * 90, vy: Math.sin(i) * 90, g: 0, life: 0.6, col: '#d78aff', s: 2 });
  } else if (n.q === 'fireflies') {
    const pick = (a, b, ra, rb) => { for (let k = 0; k < 60; k++) { const x = a + (Math.random() * Math.max(1, b - a) | 0), y = ra + (Math.random() * (rb - ra) | 0); if (freeAir(x, y)) return [x, y]; } return [a, ra]; };
    const far = Math.min(W - 14, nx + 40);
    for (const pt of [pick(16, nx - 6, 6, 11), pick(16, nx - 6, 3, 6), pick(nx + 6, far, 6, 11), pick(nx + 6, far, 3, 7), pick(nx - 3, nx + 3, 3, 5)])
      items.push({ x: pt[0] * T + 2, y: pt[1] * T + 2, bx: pt[0] * T + 2, by: pt[1] * T + 2, w: 12, h: 12, type: 'firefly', rise: 0, t: Math.random() * 6 });
  } else if (n.q === 'race') {
    n.raceT = -2; banner('READY...', 'first to the flag wins', 1.6);
  } else if (n.q === 'block') {
    const cand = [];
    for (let tx = 15; tx < nx - 6; tx++) for (let ty = 3; ty < 13; ty++) if (map[ty * W + tx] === 3) cand.push({ tx, ty });
    if (!cand.length) for (let tx = 15; tx < nx - 6; tx++) if (map[13 * W + tx] === 1 && !map[8 * W + tx] && !map[9 * W + tx] && !map[10 * W + tx] && !map[11 * W + tx] && !map[12 * W + tx]) cand.push({ tx, ty: 9, make: 1 });
    if (cand.length) { const c = cand[Math.random() * cand.length | 0]; if (c.make) map[c.ty * W + c.tx] = 3; n.qb = c; }
    else { n.itemOn = true; }
  }
}
function npcTalk() {
  const n = npc, d = n.def;
  if (!cheat.story) { if (n.stage === 0) startQuest(); else if (n.stage === 2) npcReward(); return; }
  if (n.stage === 0) say([[d.id, d.ask, [
    { t: d.acc, f: () => { startQuest(); return [['pip', d.acc], [d.id, d.accR]]; } },
    { t: d.dec, f: () => [['pip', d.dec], [d.id, d.decR]] }
  ]]]);
  else if (n.stage === 1 && n.q !== 'race') say([[d.id, d.wait]]);
  else if (n.stage === 2) say([['pip', 'Is this yours?'], [d.id, d.done]], npcReward);
}
function updNpc(dt) {
  const n = npc;
  n.t += dt;
  if (state !== 'play') return;
  if (n.q === 'race' && n.stage === 1) {
    const before = n.raceT; n.raceT += dt;
    if (before < 0 && n.raceT >= 0) { banner('GO!', '', 0.8); sfx.power(); }
    if (n.raceT >= 0) {
      n.x += speed() * 0.72 * dt; n.y = 11 * T - 6 + Math.sin(time * 6) * 2;
      if (Math.random() < dt * 30) parts.push({ x: n.x + 8, y: n.y + 16, vx: -40, vy: 20, g: 0, life: 0.3, col: 'rgba(255,170,60,.8)', s: 3 });
      if (n.x >= flagX) { n.x = flagX; questFail(); }
    }
    return;
  }
  const near = overlap(P, { x: n.x - 4, y: n.y - 6, w: n.w + 8, h: n.h + 6 });
  if (!near) n.cool = false;
  else if (!n.cool && n.stage !== 3 && n.stage !== 4) { n.cool = true; npcTalk(); }
  if (n.grow && n.grow.length) {
    n.gt -= dt;
    if (n.gt <= 0) {
      n.gt = 0.09; const [gx, gy] = n.grow.shift();
      if (!map[gy * W + gx]) map[gy * W + gx] = 11;
      S(700 + gy * 40, 0.06, 'triangle', 0.06);
      parts.push({ x: gx * T + 8, y: gy * T, vx: 0, vy: -30, g: 0, life: 0.4, col: '#ff4d6d', s: 2 });
      if (!n.grow.length) { n.itemOn = true; sfx.gem(); }
    }
  }
  if (n.stage === 1 && n.itemOn && overlap(P, { x: n.ix - 2, y: n.iy - 2, w: 16, h: 16 })) questGot();
  if (n.portal && !n.portal.used && n.stage === 1 && P.on && Math.abs(P.x + 6 - (n.portal.tx * T + 16)) < 8 && Math.abs(P.y + P.h - 13 * T) < 2) {
    state = 'pipe'; pipe = { phase: 'in', t: 0, w: n.portal, y0: P.y };
    P.x = n.portal.tx * T + 10; P.vx = 0; P.vy = 0; P.dash = 0; sfx.surprise();
  }
}
function questHud() {
  const n = qn(); if (!n || (n.stage !== 1 && n.stage !== 2)) return null;
  if (n.stage === 2) return { t: 'bring it to ' + NAMES[n.def.id], x: under ? null : n.x + 8 };
  if (n.q === 'thief') return { t: 'catch the spoon thief!', x: n.thief && !n.thief.gone && !n.thief.dead && !n.thief.sqd ? n.thief.x : (items.find(i => i.type === 'quest') || {}).x };
  if (n.q === 'sky') return { t: n.itemOn ? 'climb the yarn ladder!' : 'Granny is knitting...', x: n.ix };
  if (n.q === 'portal') return { t: under ? 'find the teddy bear' : 'jump into the portal!', x: under ? (items.find(i => i.type === 'quest') || {}).x : n.portal && n.portal.tx * T + 16 };
  if (n.q === 'pacifist') return { t: 'no squashing until the flag!', x: null };
  if (n.q === 'fireflies') { const f = items.filter(i => i.type === 'firefly'); let best = null; for (const i of f) if (!best || Math.abs(i.x - P.x) < Math.abs(best.x - P.x)) best = i; return { t: 'fireflies found: ' + n.ff + '/5', x: best && best.x }; }
  if (n.q === 'race') return { t: n.raceT < 0 ? 'get ready...' : 'beat BOLT-3000 to the flag!', x: null };
  if (n.q === 'block') return { t: n.itemOn ? 'find the ' + n.def.itemName : 'find the sparkly ? box', x: n.itemOn ? n.ix : n.qb && n.qb.tx * T + 8 };
  return null;
}
function drawQuestItem(id, x, y) {
  ctx.save(); ctx.translate(x + 6, y + 6);
  if (id === 'spoon') { ctx.rotate(-0.7); const g = ctx.createLinearGradient(-3, -6, 3, 6); g.addColorStop(0, '#fff3a0'); g.addColorStop(1, '#c08a00'); ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(0, -3, 3, 4, 0, 0, TAU); ctx.fill(); ctx.fillRect(-0.8, 0, 1.6, 7); }
  else if (id === 'teddy') { blob(0, 1, 5, 5, [30, 50, 45]); blob(-4, -3, 2, 2, [30, 50, 45]); blob(4, -3, 2, 2, [30, 50, 45]); ctx.fillStyle = '#e8c9a0'; ctx.beginPath(); ctx.ellipse(0, 2.5, 2.2, 1.6, 0, 0, TAU); ctx.fill(); ctx.fillStyle = '#111'; ctx.fillRect(-2, -0.5, 1, 1); ctx.fillRect(1, -0.5, 1, 1); }
  else if (id === 'pebble') { blob(0, 1, 5, 4, [210, 8, 60]); ctx.fillStyle = '#7ff'; ctx.beginPath(); ctx.arc(1, 0, 1.2, 0, TAU); ctx.fill(); }
  else { blob(0, 0, 5, 5, [355, 75, 50]); ctx.strokeStyle = 'rgba(120,10,20,.7)'; ctx.lineWidth = 0.7; ctx.beginPath(); ctx.arc(-6, 0, 6, -0.8, 0.8); ctx.stroke(); ctx.beginPath(); ctx.arc(6, 0, 6, Math.PI - 0.8, Math.PI + 0.8); ctx.stroke(); }
  ctx.restore();
  if (Math.floor(time * 3) % 2) star(x + 11, y - 1, 2, '#fff', time);
}
function drawNpc() {
  const n = npc, x = n.x + 8, y = n.y + 16;
  if (n.portal && !n.portal.used) {
    const px = n.portal.tx * T + 16, py = 13 * T - 14;
    const pg = ctx.createRadialGradient(px, py, 1, px, py, 18); pg.addColorStop(0, 'rgba(40,0,60,.95)'); pg.addColorStop(0.6, 'rgba(150,60,220,.6)'); pg.addColorStop(1, 'rgba(200,120,255,0)');
    ctx.fillStyle = pg; ctx.beginPath(); ctx.ellipse(px, py, 12, 16, 0, 0, TAU); ctx.fill();
    for (let i = 0; i < 4; i++) {
      ctx.strokeStyle = 'hsla(' + (270 + i * 20) + ',90%,' + (60 + i * 8) + '%,.85)'; ctx.lineWidth = 1.3;
      ctx.beginPath(); ctx.ellipse(px, py, 10 - i * 2, 14 - i * 3, 0, time * 3 + i, time * 3 + i + 4.5); ctx.stroke();
    }
  }
  if (n.ladder && (n.itemOn || (n.grow && n.grow.length < 9))) {
    ctx.strokeStyle = 'rgba(255,77,109,.8)'; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.moveTo(x, n.y + 4);
    for (const [lx, ly] of n.ladder) ctx.lineTo(lx, ly + Math.sin(time * 3 + lx) * 1.5);
    ctx.lineTo(n.ix + 6, n.iy + 6); ctx.stroke();
  }
  if (n.qb && n.stage === 1 && map[n.qb.ty * W + n.qb.tx] === 3 && Math.floor(time * 2.5) % 2) star(n.qb.tx * T + 8 + Math.sin(time * 3) * 5, n.qb.ty * T - 3, 2.2, '#fff', time);
  const racing = n.q === 'race' && n.stage === 1 && n.raceT >= 0;
  if (!racing) { ctx.fillStyle = 'rgba(0,0,0,.22)'; ctx.beginPath(); ctx.ellipse(x, y, 8, 2, 0, 0, TAU); ctx.fill(); }
  ctx.save(); ctx.translate(x, y - 9 + Math.sin(n.t * 3) * 0.6); ctx.scale(racing || P.x >= n.x ? 0.58 : -0.58, 0.58);
  drawFace(n.def.id, 0, 0, state === 'talk' && talk && talk.lines[talk.i] && talk.lines[talk.i][0] === n.def.id && ((time * 14) | 0) % 2 === 0);
  ctx.restore();
  if (racing) { ctx.fillStyle = '#ffb02e'; ctx.beginPath(); ctx.moveTo(x - 4, y - 2); ctx.lineTo(x + 4, y - 2); ctx.lineTo(x, y + 6 + Math.random() * 3); ctx.fill(); }
  const by = n.y - 16 + Math.sin(time * 5) * 1.5;
  if (n.stage === 3) heart(x - 4, by - 4, 8, '#ff4d6d');
  else if (n.stage < 3 && !racing) {
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.ellipse(x, by, 5.5, 5.5, 0, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.moveTo(x - 2, by + 4); ctx.lineTo(x, by + 8); ctx.lineTo(x + 2, by + 4); ctx.fill();
    txt(['!', '?', '!'][n.stage], x, by + 0.5, 9, ['#e8a000', '#3a7bd5', '#2a9a3a'][n.stage]);
  }
  if (n.stage === 1 && n.itemOn) drawQuestItem(n.def.item || 'yarn', n.ix, n.iy + Math.sin(time * 4) * 1.5);
}
function buildRoom(seed, pocket) {
  const r = rng(seed);
  underB = pocket ? POCKET : UNDERS[r() * UNDERS.length | 0];
  const kinds = ['cavern', 'vault', 'ledges', 'pillars', 'spikepit', 'cavern'];
  const kind = pocket ? 'ledges' : kinds[r() * kinds.length | 0];
  W = Math.max(Math.ceil(VW / T) + 2, 34 + (r() * 34 | 0));
  map = new Uint8Array(W * ROWS);
  ents = []; coinL = []; items = []; bumps = []; shots = []; roomDecor = [];
  const set = (x, y, t) => { if (x >= 0 && x < W && y >= 0 && y < ROWS) map[y * W + x] = t; };
  const coin = (tx, ty) => { if (!map[ty * W + tx]) coinL.push({ x: tx * T + 4, y: ty * T + 4, w: 8, h: 8 }); };
  const floor = new Array(W).fill(13);
  let h = 13;
  for (let x = 0; x < W; x++) {
    if ((kind === 'cavern' || kind === 'pillars') && x > 7 && x < W - 8 && r() < 0.22) h = clamp(h + (r() < 0.5 ? -1 : 1), 10, 13);
    floor[x] = x <= 5 || x >= W - 7 ? 13 : h;
  }
  for (let x = 0; x < W; x++) {
    for (let y = floor[x]; y < ROWS; y++) set(x, y, 1);
    set(x, 0, 8);
    const stal = kind === 'cavern' ? r() * 4 | 0 : r() < 0.2 ? 1 + (r() * 2 | 0) : 0;
    for (let y = 1; y <= stal; y++) set(x, y, 8);
    if (r() < 0.08 && x > 4 && x < W - 5) roomDecor.push({ x: x * T + 8, y: (stal + 1) * T, up: 0, s: 0.6 + r() * 0.6 });
    if (r() < 0.1 && x > 4 && x < W - 5) roomDecor.push({ x: x * T + 8, y: floor[x] * T, up: 1, s: 0.6 + r() * 0.8 });
  }
  for (let y = 0; y < ROWS; y++) { set(0, y, 8); set(W - 1, y, 8); }
  const mid0 = 8, mid1 = W - 9;
  if (kind === 'vault') {
    for (let x = mid0; x < mid1; x += 3) set(x, 9, r() < 0.6 ? 3 : 2);
    for (let k = 0; k < 3; k++) { const cx = mid0 + 2 + (r() * (mid1 - mid0 - 6) | 0); for (let row = 0; row < 3; row++) for (let i = -2 + row; i <= 2 - row; i++) coin(cx + i, 12 - row); }
    for (let x = mid0; x < mid1; x++) if (r() < 0.4) coin(x, 6 + (r() * 2 | 0));
  } else if (kind === 'ledges' || kind === 'spikepit') {
    let x = mid0;
    while (x < mid1 - 4) {
      const ys = [10, 7, 4];
      for (let k = 0; k < 3 && x < mid1 - 3; k++) {
        const L = 2 + (r() * 3 | 0);
        for (let i = 0; i < L; i++) { set(x + i, ys[k], 11); coin(x + i, ys[k] - 1); }
        x += L + 1;
      }
      if (r() < 0.5) set(x, 3, 3);
      x += 2;
    }
    if (kind === 'spikepit') for (let x2 = mid0 + 2; x2 < mid1 - 2; x2++) if (floor[x2] === 13 && r() < 0.45) set(x2, 12, 5);
  } else if (kind === 'pillars') {
    for (let x = mid0; x < mid1; x += 4 + (r() * 3 | 0)) {
      const ph = 2 + (r() * 3 | 0), base = floor[x];
      for (let y = base - ph; y < base; y++) set(x, y, 8);
      coin(x, base - ph - 1); coin(x, base - ph - 2);
      if (r() < 0.3) set(x, Math.max(2, base - ph - 4), 3);
    }
  } else {
    for (let x = mid0; x < mid1; x++) { if (r() < 0.35) coin(x, floor[x] - 1 - (r() * 3 | 0)); if (r() < 0.06) set(x, floor[x] - 4, 3); }
  }
  for (const px of [2, W - 5]) { set(px, 11, 10); set(px + 1, 11, 10); set(px, 12, 9); set(px + 1, 12, 9); }
  warps = [{ tx: 2, ty: 11, used: false }, { tx: W - 5, ty: 11, used: false }];
  const nf = world >= 2 ? 1 + (r() * 3 | 0) : 0;
  for (let i = 0; i < nf; i++) {
    const fx = 10 + (r() * (W - 22) | 0), ft = r() < 0.3 ? 'fly' : r() < 0.5 ? 'hop' : 'walk';
    const e = mkFoe(fx * T, (floor[fx] - 1) * T + 2, ft, 0.2);
    if (ft === 'fly') { e.y = 6 * T; e.by = e.y; e.t = r() * 6; e.h = 12; }
    ents.push(e);
  }
  if (pocket) items.push({ x: (W - 9) * T + 2, y: 12 * T, w: 12, h: 12, type: 'quest', rise: 0, qi: 'teddy' });
  roomKind = kind;
  flagX = 1e9;
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
    for (let tx = x0; tx <= x1; tx++) {
      const t = tileAt(tx, ty);
      if (solid(t) || (t === 11 && b.y + b.h - ty * T <= 6)) { b.y = ty * T - b.h; b.vy = 0; b.on = true; return; }
    }
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
function kill(e) { if (e.type === 'thief') dropQuest(e.x, e.y); onKill(); e.dead = 1; e.vy = -220; e.vx = P.face * 70; sfx.stomp(); addXp(10); float(e.x, e.y, '+10'); }
function breakBrick(tx, ty) {
  const cx = tx * T, cy = ty * T;
  map[ty * W + tx] = 0; sfx.brk(); addXp(2);
  for (let i = 0; i < 4; i++) parts.push({ x: cx + 4 + (i % 2) * 8, y: cy + 4 + (i >> 1) * 8, vx: (i % 2 ? 1 : -1) * 60, vy: i < 2 ? -260 : -160, g: 900, life: 0.8, col: '#c8642e', s: 5 });
}
function bump(tx, ty) {
  const t = tileAt(tx, ty), cx = tx * T, cy = ty * T;
  const qq = qn();
  if (t === 3 && qq && qq.qb && qq.stage === 1 && qq.qb.tx === tx && qq.qb.ty === ty) {
    map[ty * W + tx] = 4; bumps.push({ tx, ty, t: 0.15 }); sfx.gem();
    items.push({ x: cx + 2, y: cy, w: 12, h: 12, type: 'quest', rise: 16, qi: qq.def.item });
    float(cx - 4, cy - 12, 'FOUND IT!', '#7ff');
    return;
  }
  if (t === 3 || t === 7) {
    map[ty * W + tx] = 4; bumps.push({ tx, ty, t: 0.15 }); addXp(5); sfx.bump();
    surprise(cx, cy, t === 7);
  } else if (t === 2) breakBrick(tx, ty);
  else sfx.bump();
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
  if (k < 0.35) { parts.push({ x: cx + 8, y: cy, vx: 0, vy: -240, g: 800, life: 0.45, coin: 1 }); getCoin(cx, cy - 16); return; }
  if (k < 0.87) {
    const type = k < 0.43 ? 'heart' : k < 0.51 ? 'star' : k < 0.61 ? 'boots' : k < 0.69 ? 'gem' : k < 0.79 ? 'blaster' : 'wings';
    items.push({ x: cx + 2, y: cy, w: 12, h: 12, type, rise: 16 });
    sfx.power(); return;
  }
  const e = mkFoe(cx + 1, cy - 15, 'walk', 0.3); e.act = 1; e.vy = -200; e.vx = -e.vx * (P.x < cx ? -1 : 1);
  ents.push(e); sfx.surprise(); float(cx - 8, cy - 18, 'SURPRISE!', '#ff8');
}
function hurt() {
  if (P.inv > 0 || P.star > 0 || P.dash > 0) return;
  hp--; sfx.hurt(); P.inv = 1.6; shake = 0.25;
  if (mode !== 'fly') { P.vy = -260; P.vx = -P.face * 120; }
  if (hp <= 0) gameOver();
}
function fallPit() {
  hp--; sfx.hurt(); shake = 0.3;
  if (hp <= 0) { gameOver(); return; }
  P.x = safe.x; P.y = safe.y - 2; P.vx = 0; P.vy = 0; P.inv = 2; P.dash = 0;
}
function gameOver() { hp = 0; state = 'over'; stT = 0; startReq = false; sfx.over(); }
function worldClear(label) {
  { const qq = qn(); if (qq && qq.stage === 1 && (qq.q === 'pacifist' || qq.q === 'race')) questWin(); }
  state = 'clear'; stT = 0;
  P.vx = 0; P.vy = 0; P.dash = 0;
  const bonus = 20 + world * 5 + hp * 5;
  banner(label, '+' + bonus + ' XP', 2.5);
  sfx.clear(); addXp(bonus);
}
function fireShot(dir) {
  const ys = P.spread > 0 ? [-70, 0, 70] : [0];
  for (const vy of ys) shots.push({ x: P.x + (dir > 0 ? 12 : -6), y: P.y + 6, w: 6, h: 3, vx: dir * 300, vy, life: 1.2 });
  sfx.shoot();
}

/* ---------- pipes ---------- */
function tryPipe() {
  if (!P.on || !(held.down || dnb > 0)) return;
  const by = Math.floor((P.y + P.h) / T), cx = P.x + P.w / 2;
  for (const w of warps) {
    if (w.used || w.ty !== by || cx < w.tx * T + 3 || cx > w.tx * T + 29) continue;
    dnb = 0;
    state = 'pipe'; pipe = { phase: 'in', t: 0, w, y0: P.y };
    P.x = w.tx * T + 10; P.vx = 0; P.vy = 0; P.dash = 0;
    sfx.pipe();
    return;
  }
}
function warp(w) {
  let tgt;
  if (!under) {
    saved = { map, W, ents, coinL, items, flagX, warps, w, npc };
    under = true; npc = null;
    if (w.gold) buildFrenzy(); else buildRoom(world * 131 + w.tx * 7 + 1 + (Math.random() * 1000 | 0), w.pocket);
    tgt = warps[0];
    if (w.gold) banner('COIN FRENZY!', 'go wild - grab everything for 20 seconds!', 2);
    else if (w.pocket) banner('THE SPIRIT WORLD', 'find the teddy, then take a pipe back', 1.8);
    else banner(underB.name + '!', 'grab the loot, then take a pipe back', 1.8);
    if (w.pocket || w.gold) pendingTalk = null;
    else if (flags.map && !flags.mapGem) { flags.mapGem = 1; addXp(40); pendingTalk = [['mole', 'My best customer! Here, a gem. Do NOT spend it on maps. (+40 XP)']]; }
    else pendingTalk = MOLES[(world + w.tx) % MOLES.length];
  } else {
    ({ map, W, ents, coinL, items, flagX, warps, npc } = saved);
    frenzy = null;
    under = false;
    tgt = saved.w; tgt.used = true;
    shots = []; bumps = [];
  }
  parts = [];
  P.x = tgt.tx * T + 10; P.y = tgt.ty * T; P.vx = 0; P.vy = 0;
  pipe.phase = 'out'; pipe.t = 0; pipe.top = tgt.ty * T;
  camX = clamp(P.x + 6 - VW * 0.4, 0, Math.max(0, W * T - VW));
  safe = { x: P.x, y: pipe.top - P.h };
  sfx.pipe();
}

/* ---------- update ---------- */
function updPlayer(dt) {
  const g = mod === 'LOW GRAVITY' ? 800 : 1400;
  const jv = 430 * (P.boots > 0 ? 1.3 : 1) * (mod === 'BOUNCY' ? 1.12 : 1) * (mod === 'LOW GRAVITY' ? 0.85 : 1);
  const pd = cheat.keep ? 0 : dt;
  P.inv = Math.max(0, P.inv - dt); P.star = Math.max(0, P.star - pd); P.boots = Math.max(0, P.boots - pd);
  P.blaster = Math.max(0, P.blaster - pd); P.wings = Math.max(0, P.wings - pd); P.dcd -= dt; P.fcd -= dt;
  let dir = (held.right ? 1 : 0) - (held.left ? 1 : 0);
  if (mod === 'AUTO RUN' && !under) dir = held.left ? 0 : 1;
  if (dir) P.face = dir;
  if (db > 0) {
    if (!perk.dash()) { db = 0; float(P.x - 10, P.y - 10, 'DASH: Lv5', '#faa'); sfx.locked(); }
    else if (P.dcd <= 0 && P.dash <= 0) { db = 0; P.dash = 0.22; P.dcd = 0.7; P.vx = P.face * 330; P.vy = 0; sfx.dash(); }
  }
  if (fb > 0 && P.blaster > 0 && P.fcd <= 0 && shots.filter(s => !s.foe).length < 4) { fb = 0; P.fcd = 0.2; fireShot(P.face); }
  if (P.dash > 0) {
    P.dash -= dt; P.vy = 0;
    parts.push({ x: P.x + 6, y: P.y + 7, vx: 0, vy: 0, g: 0, life: 0.25, col: 'rgba(47,212,196,.6)', s: 8 });
  } else {
    P.vx += (dir * speed() - P.vx) * Math.min(1, dt * (P.on ? (B().slip ? 3 : 14) : 7));
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
    } else if (P.wings > 0) {
      P.vy = -jv * 0.75; jb = 0; P.jumping = true; P.dash = 0; sfx.flap();
      for (let i = 0; i < 4; i++) parts.push({ x: P.x + 6, y: P.y + 10, vx: (i - 1.5) * 40, vy: 30, g: 0, life: 0.3, col: '#fff', s: 2 });
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
    const by = Math.floor((P.y + P.h) / T);
    if (firm(tileAt(Math.floor(P.x / T), by)) && firm(tileAt(Math.floor((P.x + P.w) / T), by))) { safe.x = P.x; safe.y = P.y; }
  }
  if (Math.abs(P.vx) > 10 && P.on) P.anim += dt;
  // spikes
  const x0 = Math.floor(P.x / T), x1 = Math.floor((P.x + P.w - 0.01) / T), y0 = Math.floor(P.y / T), y1 = Math.floor((P.y + P.h - 0.01) / T);
  for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) {
    if (tileAt(tx, ty) === 5 && overlap(P, { x: tx * T + 2, y: ty * T + 7, w: 12, h: 9 })) {
      if (P.star <= 0 && P.inv <= 0) { hurt(); P.vy = -330; }
    }
  }
  if (P.y > RH * T + 16) fallPit();
  if (state === 'play') tryPipe();
  if (state === 'play' && P.x + P.w / 2 >= flagX + 8) { P.x = flagX + 8 - P.w; worldClear('WORLD CLEAR!'); }
}
function updFly(dt) {
  const sp = 50 + Math.min(30, world * 1.5), end = W * T - VW;
  const pd = cheat.keep ? 0 : dt;
  P.inv = Math.max(0, P.inv - dt); P.star = Math.max(0, P.star - pd); P.spread = Math.max(0, P.spread - pd); P.fcd -= dt;
  const move = camX < end ? sp : 0;
  camX = Math.min(end, camX + sp * dt);
  const dx = (held.right ? 1 : 0) - (held.left ? 1 : 0), dy = (held.down ? 1 : 0) - (held.jump ? 1 : 0);
  P.x += (move + dx * 140) * dt; P.y += dy * 140 * dt;
  P.x = clamp(P.x, camX + 4, camX + VW - 22); P.y = clamp(P.y, 4, VH - 18);
  P.vy = dy * 140; P.face = 1; P.anim += dt;
  if (P.fcd <= 0) { P.fcd = 0.2; fireShot(1); }
  if (camX >= end - 0.5) worldClear('SKY CLEAR!');
}

function updFlyFoe(e, dt) {
  e.t += dt; e.x += e.vx * dt;
  if (e.type === 'bird') e.y = e.by + Math.sin(e.t * 3) * 18;
  else {
    e.y += Math.sign(P.y - e.y) * Math.min(30 * dt, Math.abs(P.y - e.y));
    e.st -= dt;
    if (e.st <= 0 && e.x < camX + VW - 10) {
      e.st = 2.2;
      const dx = P.x - e.x, dy = P.y - e.y, d = Math.hypot(dx, dy) || 1;
      shots.push({ x: e.x, y: e.y + 4, w: 6, h: 6, vx: dx / d * 90, vy: dy / d * 90, life: 4, foe: 1 });
    }
  }
  if (e.x < camX - 40) e.gone = 1;
  if (state === 'play' && overlap(P, e)) { if (P.star <= 0) hurt(); kill(e); }
}
function updWorld(dt) {
  const g = mod === 'LOW GRAVITY' ? 800 : 1400;
  for (const e of ents) {
    if (!e.act) { if (e.x < camX + VW + 40) e.act = 1; else continue; }
    if (e.dead) { e.vy += 1400 * dt; e.y += e.vy * dt; e.x += e.vx * dt; if (e.y > RH * T + 40) e.gone = 1; continue; }
    if (e.sqd) { e.sq -= dt; if (e.sq <= 0) e.gone = 1; continue; }
    if (e.flash > 0) e.flash -= dt;
    if (mode === 'fly') { updFlyFoe(e, dt); continue; }
    if (e.type === 'fly') {
      e.t = (e.t || 0) + dt; e.turn = (e.turn || 0) + dt;
      const fvx = e.vx; e.x += e.vx * dt;
      if (colX(e) || e.turn > 3.5) { e.vx = -fvx; e.turn = 0; }
      e.y = e.by + Math.sin(e.t * 2.5) * 12;
    } else {
      e.vy = Math.min(480, e.vy + g * dt);
      if (e.type === 'hop' && e.on) { e.ht -= dt; if (e.ht <= 0) { e.vy = -300; e.ht = 1 + Math.random() * 1.2; } }
      if (e.type === 'thief') {
        const dx = e.x - P.x, dir = dx >= 0 ? 1 : -1;
        if (e.x > flagX - 3 * T) e.vx = 0;
        else e.vx = Math.abs(dx) < 160 ? dir * 92 : e.vx * 0.95;
        if (e.on && Math.abs(e.vx) > 5) {
          const ax = Math.floor((e.x + (e.vx > 0 ? e.w + 3 : -3)) / T);
          if (solid(tileAt(ax, Math.floor((e.y + e.h - 3) / T))) || !solid(tileAt(ax, Math.floor((e.y + e.h + 2) / T)))) e.vy = -420;
        }
        if (e.on) e.lx = e.x;
      }
      if (e.type === 'charge' && e.on) {
        const dx = P.x - e.x, dir = e.vx >= 0 ? 1 : -1;
        const sees = Math.abs(dx) < 120 && Math.abs(P.y - e.y) < 26 && Math.sign(dx) === dir;
        e.rage = sees ? Math.min(1, e.rage + dt * 3) : Math.max(0, e.rage - dt * 0.8);
        e.vx = dir * (e.sp + e.rage * 115);
        if (e.rage > 0.6 && Math.random() < dt * 12) parts.push({ x: e.x + (dir > 0 ? 0 : 14), y: e.y + 4, vx: -dir * 30, vy: -20, g: 0, life: 0.35, col: 'rgba(255,255,255,.7)', s: 3 });
      }
      const vx = e.vx;
      e.x += e.vx * dt;
      if (colX(e)) { e.vx = -vx; e.rage = 0; }
      e.on = false;
      e.y += e.vy * dt;
      colY(e, false);
    }
    if (e.y > RH * T + 40) { e.gone = 1; if (e.type === 'thief') dropQuest(e.lx || e.x, 12 * T); continue; }
    if (state === 'play' && overlap(P, e)) {
      if (P.star > 0 || P.dash > 0) kill(e);
      else if (P.vy > 0 && P.y + P.h - e.y < 10 && e.type !== 'spiky') {
        e.sqd = 1; e.sq = 0.35; combo++; onKill();
        if (e.type === 'thief') dropQuest(e.x, e.y - 2);
        const pts = 10 * combo; addXp(pts); float(e.x, e.y - 6, '+' + pts + (combo > 1 ? ' x' + combo : ''), '#ff8');
        P.vy = -(held.jump ? 430 * 0.95 : 280) * (mod === 'BOUNCY' ? 1.3 : 1); P.jumping = false; P.air = 1;
        sfx.stomp();
      } else if (P.inv <= 0) hurt();
    }
  }
  for (const s of shots) {
    s.x += s.vx * dt; s.y += s.vy * dt; s.life -= dt;
    if (s.foe) { if (state === 'play' && overlap(P, s)) { s.life = 0; hurt(); } continue; }
    if (mode !== 'fly') {
      const tx = Math.floor((s.x + 3) / T), ty = Math.floor((s.y + 1) / T), t = tileAt(tx, ty);
      if (solid(t)) { s.life = 0; if (t === 2) breakBrick(tx, ty); continue; }
    }
    for (const e of ents) {
      if (e.dead || e.sqd || !e.act || !overlap(s, e)) continue;
      s.life = 0; e.hp--; e.flash = 0.1;
      if (e.hp <= 0) {
        kill(e);
        if (mode === 'fly' && Math.random() < 0.12) items.push({ x: e.x, y: e.y, w: 12, h: 12, type: Math.random() < 0.6 ? 'spread' : 'heart', rise: 0 });
      } else sfx.bump();
      break;
    }
  }
  shots = shots.filter(s => s.life > 0 && s.x > camX - 40 && s.x < camX + VW + 40);
  ents = ents.filter(e => !e.gone);
  if (npc && !under && mode === 'run') updNpc(dt);
  for (const it of items) {
    if (it.rise > 0) { const d = Math.min(it.rise, 50 * dt); it.y -= d; it.rise -= d; continue; }
    if (it.type === 'firefly') {
      it.t += dt;
      const dx = P.x - it.bx, dy = P.y - it.by, dd = Math.hypot(dx, dy);
      if (dd < 70 && dd > 1) { it.bx += dx / dd * 28 * dt; it.by += dy / dd * 28 * dt; }
      it.x = it.bx + Math.sin(it.t * 1.7) * 6; it.y = it.by + Math.cos(it.t * 2.3) * 4;
    }
    if (state === 'play' && overlap(P, it)) {
      it.gone = 1;
      if (it.type === 'heart') { if (hp < maxHp()) { hp++; float(it.x, it.y, '+1 HEART', '#f77'); } else { addXp(20); float(it.x, it.y, '+20 XP'); } sfx.gem(); }
      else if (it.type === 'star') { P.star = 8; banner('STAR POWER!', 'smash everything', 1.4); sfx.power(); }
      else if (it.type === 'boots') { P.boots = 12; banner('ROCKET BOOTS!', 'super jumps', 1.4); sfx.power(); }
      else if (it.type === 'blaster') { P.blaster = 15; banner('BLASTER!', touch ? 'tap FIRE' : 'press F / C to fire', 1.6); sfx.power(); }
      else if (it.type === 'wings') { P.wings = 10; banner('WINGS!', 'jump again and again in the air', 1.6); sfx.power(); }
      else if (it.type === 'spread') { P.spread = 10; banner('TRIPLE SHOT!', '', 1.2); sfx.power(); }
      else if (it.type === 'quest') questGot();
      else if (it.type === 'firefly') {
        const n = qn(); if (n) { n.ff++; float(it.x, it.y - 6, n.ff + '/5', '#fff27a'); sfx.coin(); if (n.ff >= 5 && n.stage === 1) questWin(); }
      }
      else { addXp(40); float(it.x, it.y, '+40 XP', '#7ff'); sfx.gem(); }
    }
  }
  items = items.filter(i => !i.gone && (mode !== 'fly' || i.x > camX - 60));
  const cx = P.x + 6, cy = P.y + 7;
  for (const c of coinL) {
    if (c.fall) {
      c.life -= dt;
      if (c.fall === 1) { c.y += (frenzy ? 120 : 70) * dt; if (frenzy && solid(tileAt(Math.floor((c.x + 4) / T), Math.floor((c.y + 8) / T)))) c.fall = 2; }
      if (c.life <= 0 || c.y > VH) c.gone = 1;
    }
    if ((perk.mag() || frenzy) && state === 'play') {
      const dx = cx - (c.x + 4), dy = cy - (c.y + 4), d = Math.hypot(dx, dy), rad = frenzy ? 90 : 60;
      if (d < rad && d > 0.1) { c.x += dx / d * (frenzy ? 280 : 220) * dt; c.y += dy / d * (frenzy ? 280 : 220) * dt; }
    }
    if (!c.gone && state === 'play' && overlap(P, c)) { c.gone = 1; if (frenzy) frenzyPick(c); else getCoin(c.x, c.y); }
  }
  coinL = coinL.filter(c => !c.gone);
  if (frenzy) updFrenzy(dt);
  if (mod === 'COIN RAIN' && state === 'play' && !under) {
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
  const tx = clamp(P.x + P.w / 2 - VW * 0.4, 0, Math.max(0, W * T - VW));
  camX += (tx - camX) * Math.min(1, dt * 8);
}

function startWorld() {
  gen(world); state = 'play';
  banner('WORLD ' + world, worldSub(), 2.4);
  const o = START_OPTS[cheat.start], all = o === 'ALL';
  if (all || o === 'STAR') P.star = 8;
  if (all || o === 'BOOTS') P.boots = 12;
  if (all || o === 'BLASTER') P.blaster = 15;
  if (all || o === 'WINGS') P.wings = 10;
  if (all) P.spread = 10;
  if (bonusStar) { bonusStar = false; P.star = 8; }
  saveGame();
  say(startScene(world));
}
function nextWorld() { world++; startWorld(); }
function openSelect() {
  state = 'select'; stT = 0; startReq = false;
  sel.row = 0; sel.w = world; sel.lv = prog.lv;
  sfx.gem();
}
function selVal(i) {
  if (i === 0) { const m = modeFor(sel.w); return sel.w + ' ' + (m === 'fly' ? 'SKY SHOOTER' : m === 'climb' ? 'TOWER CLIMB' : isReal(sel.w) ? 'REAL WORLD' : biomeFor(sel.w).name); }
  if (i === 1) return String(sel.lv);
  if (i >= 2 && i <= 5) return perkVal(['dj', 'mag', 'dash', 'glide'][i - 2], sel.lv) ? 'ON' : 'OFF';
  if (i === 6) return START_OPTS[cheat.start];
  if (i === 7) return cheat.keep ? 'ON' : 'OFF';
  if (i === 8) return cheat.story ? 'ON' : 'OFF';
  return '';
}
function selChange(d) {
  const r = sel.row;
  if (r === 0) sel.w = clamp(sel.w + d, 1, 999);
  else if (r === 1) sel.lv = clamp(sel.lv + d, 1, 99);
  else if (r >= 2 && r <= 5) { const k = ['dj', 'mag', 'dash', 'glide'][r - 2]; perkSet[k] = !perkVal(k, sel.lv); }
  else if (r === 6) cheat.start = ((cheat.start + Math.sign(d)) % START_OPTS.length + START_OPTS.length) % START_OPTS.length;
  else if (r === 7) cheat.keep = !cheat.keep;
  else if (r === 8) cheat.story = !cheat.story;
  else return;
  sfx.coin();
}
function selectInput(k) {
  const n = SEL_ROWS.length;
  if (k === 'left') selChange(-1);
  else if (k === 'right') selChange(1);
  else if (k === 'dash') selChange(10);
  else if (k === 'fire') selChange(-10);
  else if (k === 'down') { sel.row = (sel.row + 1) % n; sfx.bump(); }
  else if (k === 'up') { sel.row = (sel.row + n - 1) % n; sfx.bump(); }
  else if (k === 'back') { state = 'title'; stT = 0; startReq = false; }
  else if (k === 'jump') {
    world = sel.w;
    if (sel.lv !== prog.lv) { prog.lv = sel.lv; prog.xp = 0; }
    updDash(); coins = 0; hp = maxHp();
    startReq = false; jb = 0; db = 0;
    startWorld();
  }
}
function update(dt) {
  time += dt; shake = Math.max(0, shake - dt);
  jb = Math.max(0, jb - dt); db = Math.max(0, db - dt); dnb = Math.max(0, dnb - dt); fb = Math.max(0, fb - dt);
  if (held.fire) fb = Math.max(fb, 0.05);
  if (state === 'talk') { updTalk(dt); return; }
  if (state === 'select') { stT += dt; updWorld(dt); return; }
  if (state === 'title' || state === 'over') {
    stT += dt;
    if (state === 'title') camX = (Math.sin(time * 0.15) * 0.5 + 0.5) * (W * T - VW) * 0.3;
    if (startReq && stT > 0.4) {
      startReq = false; jb = 0; db = 0;
      if (state === 'over') coins = 0;
      hp = maxHp(); startWorld();
    }
    updWorld(dt);
    return;
  }
  if (state === 'pipe') {
    pipe.t += dt;
    if (pipe.phase === 'in') {
      P.y = pipe.y0 + P.h * Math.min(1, pipe.t / 0.45);
      if (pipe.t >= 0.5) warp(pipe.w);
    } else {
      P.y = pipe.top - P.h * Math.min(1, pipe.t / 0.45);
      if (pipe.t >= 0.45) {
        state = 'play'; P.vy = 0; P.on = true; P.inv = Math.max(P.inv, 0.5);
        if (pendingTalk) { const l = pendingTalk; pendingTalk = null; say(l); }
      }
    }
    updWorld(dt); camera(dt);
    return;
  }
  if (state === 'clear') {
    stT += dt;
    if (mode === 'fly') P.x += 160 * dt;
    else if (mode === 'climb') climbCam(dt);
    else {
      if (P.y + P.h < 13 * T - 0.5) P.y = Math.min(13 * T - P.h, P.y + 90 * dt);
      else { P.x += 55 * dt; P.anim += dt; P.on = true; }
      camera(dt);
    }
    updWorld(dt);
    if (stT > 2.8) say(clearScene(world), nextWorld);
    return;
  }
  if (mode === 'fly') updFly(dt);
  else { updPlayer(dt); if (mode === 'climb' && state === 'play') updClimb(dt); }
  updWorld(dt);
  if (mode === 'run') camera(dt); else if (mode === 'climb') climbCam(dt);
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
let RT = null;
function mkCanvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
function noiseCanvas(w, h, base, vari, seed) {
  const c = mkCanvas(w, h), g = c.getContext('2d'), im = g.createImageData(w, h), r = rng(seed), G = 8, grid = [];
  for (let i = 0; i < G * G; i++) grid.push(r());
  const at = (a, b) => grid[(b % G) * G + (a % G)];
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const gx = x / w * G, gy = y / h * G, x0 = gx | 0, y0 = gy | 0, fx = gx - x0, fy = gy - y0;
    const v = (at(x0, y0) * (1 - fx) + at(x0 + 1, y0) * fx) * (1 - fy) + (at(x0, y0 + 1) * (1 - fx) + at(x0 + 1, y0 + 1) * fx) * fy;
    const n = (v - 0.5) * vari + (r() - 0.5) * vari * 0.6, i = (y * w + x) * 4;
    im.data[i] = clamp(base[0] + n, 0, 255); im.data[i + 1] = clamp(base[1] + n * 0.9, 0, 255); im.data[i + 2] = clamp(base[2] + n * 0.8, 0, 255); im.data[i + 3] = 255;
  }
  g.putImageData(im, 0, 0);
  return { c, g, r };
}
function cracks(o, n, col, wdt) {
  o.g.strokeStyle = col; o.g.lineWidth = wdt;
  for (let i = 0; i < n; i++) { o.g.beginPath(); let x = o.r() * 128, y = o.r() * 128; o.g.moveTo(x, y); for (let k = 0; k < 4; k++) { x += (o.r() - 0.5) * 26; y += (o.r() - 0.5) * 26; o.g.lineTo(x, y); } o.g.stroke(); }
}
function initReal() {
  if (RT) return;
  RT = {};
  try {
    const pat = c => { const p = ctx.createPattern(c, 'repeat'); try { p.setTransform(new DOMMatrix([0.25, 0, 0, 0.25, 0, 0])); } catch (e) {} return p; };
    const d = noiseCanvas(128, 128, [104, 76, 52], 46, 11);
    for (let i = 0; i < 70; i++) {
      const x = d.r() * 128, y = d.r() * 128, sz = 1.5 + d.r() * 4;
      d.g.fillStyle = d.r() < 0.5 ? 'rgba(60,45,32,.6)' : 'rgba(150,125,100,.6)';
      d.g.beginPath(); d.g.ellipse(x, y, sz, sz * 0.7, d.r() * 3, 0, TAU); d.g.fill();
      d.g.fillStyle = 'rgba(255,255,255,.15)'; d.g.beginPath(); d.g.ellipse(x - sz * 0.3, y - sz * 0.3, sz * 0.35, sz * 0.25, 0, 0, TAU); d.g.fill();
    }
    cracks(d, 6, 'rgba(40,28,18,.35)', 1);
    const k = noiseCanvas(128, 128, [128, 126, 120], 42, 23);
    cracks(k, 9, 'rgba(35,35,35,.5)', 1.2); cracks(k, 5, 'rgba(255,255,255,.15)', 0.8);
    const bc = noiseCanvas(128, 128, [150, 138, 122], 34, 37);
    bc.g.fillStyle = 'rgba(50,44,38,.9)';
    for (let row = 0; row < 4; row++) {
      bc.g.fillRect(0, row * 32, 128, 3);
      for (let j = 0; j < 3; j++) bc.g.fillRect(((row % 2) * 32 + j * 64) % 128, row * 32, 3, 32);
      bc.g.fillStyle = 'rgba(255,255,255,.12)'; bc.g.fillRect(0, row * 32 + 3, 128, 3);
      bc.g.fillStyle = 'rgba(0,0,0,.22)'; bc.g.fillRect(0, row * 32 + 28, 128, 4);
      bc.g.fillStyle = 'rgba(50,44,38,.9)';
    }
    const w = noiseCanvas(128, 32, [128, 86, 50], 30, 41);
    w.g.strokeStyle = 'rgba(60,35,15,.45)'; w.g.lineWidth = 1;
    for (let i = 0; i < 9; i++) { w.g.beginPath(); const y = 3 + i * 3.2; w.g.moveTo(0, y); for (let x = 0; x <= 128; x += 8) w.g.lineTo(x, y + Math.sin(x * 0.08 + i) * 1.2); w.g.stroke(); }
    const gs = mkCanvas(128, 40), gg = gs.getContext('2d'), gr = rng(51);
    const band = gg.createLinearGradient(0, 26, 0, 40); band.addColorStop(0, '#3e6b2a'); band.addColorStop(1, '#2b4a1d');
    gg.fillStyle = band; gg.fillRect(0, 28, 128, 12);
    for (let i = 0; i < 280; i++) {
      const x = gr() * 128, h = 8 + gr() * 22, lean = (gr() - 0.5) * 8;
      gg.strokeStyle = 'hsl(' + (80 + gr() * 35) + ',' + (35 + gr() * 30) + '%,' + (20 + gr() * 28) + '%)'; gg.lineWidth = 0.8 + gr() * 1.2;
      gg.beginPath(); gg.moveTo(x, 40); gg.quadraticCurveTo(x + lean * 0.4, 40 - h * 0.6, x + lean, 40 - h); gg.stroke();
    }
    RT.dirt = pat(d.c); RT.rock = pat(k.c); RT.brick = pat(bc.c); RT.wood = pat(w.c); RT.grass = gs;
  } catch (e) { RT.fail = 1; }
}
function drawRealTile(t, x, y, tx, ty) {
  const above = ty > 0 ? map[(ty - 1) * W + tx] : 0;
  switch (t) {
    case 1:
      ctx.fillStyle = RT.dirt; ctx.fillRect(x, y, T, T);
      if (tileAt(tx - 1, ty) === 0) { ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.fillRect(x, y, 3, T); }
      if (tileAt(tx + 1, ty) === 0) { ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.fillRect(x + T - 3, y, 3, T); }
      if (above !== 1) { ctx.fillStyle = 'rgba(25,18,10,.45)'; ctx.fillRect(x, y + 3, T, 4); ctx.drawImage(RT.grass, (tx % 8) * 16, 0, 16, 40, x, y - 7, T, 11); }
      break;
    case 2: ctx.fillStyle = RT.brick; ctx.fillRect(x, y, T, T); ctx.fillStyle = 'rgba(0,0,0,.18)'; ctx.fillRect(x, y + T - 2, T, 2); break;
    case 3: {
      const pulse = 0.5 + Math.sin(time * 4) * 0.2;
      const gl = ctx.createRadialGradient(x + 8, y + 8, 2, x + 8, y + 8, 18); gl.addColorStop(0, 'rgba(255,220,120,' + pulse * 0.5 + ')'); gl.addColorStop(1, 'rgba(255,220,120,0)');
      ctx.fillStyle = gl; ctx.fillRect(x - 10, y - 10, T + 20, T + 20);
      ctx.fillStyle = RT.rock; ctx.fillRect(x, y, T, T);
      const gd = ctx.createLinearGradient(x, y, x + T, y + T); gd.addColorStop(0, 'rgba(255,225,110,.8)'); gd.addColorStop(1, 'rgba(150,100,15,.85)');
      ctx.fillStyle = gd; ctx.fillRect(x + 1, y + 1, T - 2, T - 2);
      ctx.font = 'bold 11px Georgia, serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillStyle = 'rgba(70,40,0,.85)'; ctx.fillText('?', x + 8, y + 9); ctx.fillStyle = 'rgba(255,250,220,.6)'; ctx.fillText('?', x + 7.5, y + 8.5);
      break;
    }
    case 4: ctx.fillStyle = RT.rock; ctx.fillRect(x, y, T, T); ctx.fillStyle = 'rgba(30,20,10,.35)'; ctx.fillRect(x, y, T, T); break;
    case 5:
      for (let i = 0; i < 2; i++) {
        const sg = ctx.createLinearGradient(x + i * 8, 0, x + i * 8 + 8, 0); sg.addColorStop(0, '#4a5058'); sg.addColorStop(0.45, '#eef2f6'); sg.addColorStop(1, '#3d434b');
        ctx.fillStyle = sg; ctx.beginPath(); ctx.moveTo(x + i * 8, y + 16); ctx.lineTo(x + i * 8 + 4, y + 5); ctx.lineTo(x + i * 8 + 8, y + 16); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = '#22262b'; ctx.lineWidth = 0.6; ctx.stroke();
      }
      break;
    case 6: {
      ctx.fillStyle = RT.rock; ctx.fillRect(x, y, T, T);
      const cg = ctx.createLinearGradient(x, 0, x + T, 0); cg.addColorStop(0, 'rgba(255,255,255,.18)'); cg.addColorStop(1, 'rgba(0,0,0,.35)');
      ctx.fillStyle = cg; ctx.fillRect(x, y, T, T);
      if (above !== 6) { ctx.fillStyle = 'rgba(70,120,50,.85)'; ctx.fillRect(x, y, T, 3); ctx.drawImage(RT.grass, (tx % 8) * 16, 20, 16, 20, x, y - 3, T, 5); }
      break;
    }
    case 8:
      ctx.fillStyle = RT.rock; ctx.fillRect(x, y, T, T);
      ctx.fillStyle = 'rgba(255,255,255,.22)'; ctx.fillRect(x, y, T, 1.5); ctx.fillRect(x, y, 1.5, T);
      ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.fillRect(x, y + T - 1.5, T, 1.5); ctx.fillRect(x + T - 1.5, y, 1.5, T);
      break;
    case 11: ctx.fillStyle = RT.wood; ctx.fillRect(x, y, T, 6); ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.fillRect(x, y + 6, T, 2); break;
    case 9: case 10: {
      const left = tileAt(tx - 1, ty) !== t, px0 = left ? x : x - T;
      const mg = ctx.createLinearGradient(px0, 0, px0 + 32, 0);
      mg.addColorStop(0, '#1b241d'); mg.addColorStop(0.22, '#5f7a64'); mg.addColorStop(0.38, '#d2e0d4'); mg.addColorStop(0.55, '#6f8a74'); mg.addColorStop(1, '#121914');
      ctx.fillStyle = mg;
      if (t === 10) { ctx.fillRect(x, y, T, T); ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.fillRect(x, y + T - 3, T, 3); ctx.fillStyle = 'rgba(255,255,255,.25)'; ctx.fillRect(x, y, T, 1.5);
        ctx.fillStyle = '#9aa69c'; ctx.beginPath(); ctx.arc(x + (left ? 4 : 12), y + 7, 1.2, 0, TAU); ctx.fill(); }
      else ctx.fillRect(x + (left ? 2 : 0), y, T - 2, T);
      break;
    }
  }
}
function ridge(off, base, amp, cols, f, sd) {
  const g = ctx.createLinearGradient(0, base - amp, 0, VH); g.addColorStop(0, cols[0]); g.addColorStop(1, cols[1]);
  ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(0, VH + 60);
  for (let x = 0; x <= VW + 4; x += 3) {
    const w = x + off;
    ctx.lineTo(x, base - amp * (0.55 * Math.sin(w * f + sd) + 0.3 * Math.sin(w * f * 2.7 + sd * 2) + 0.15 * Math.sin(w * f * 7.3 + sd) + 0.06 * Math.sin(w * f * 19 + sd)));
  }
  ctx.lineTo(VW + 4, VH + 60); ctx.fill();
}
function forest(off, base, c1, c2) {
  const g = ctx.createLinearGradient(0, base - 30, 0, VH); g.addColorStop(0, c2); g.addColorStop(1, c1);
  ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(0, VH + 60);
  const step = 7, start = -(((off % step) + step) % step);
  for (let x = start; x <= VW + step; x += step) {
    const i = Math.floor((x + off) / step), h = 12 + (Math.imul(i, 2654435761) >>> 0) % 18;
    ctx.lineTo(x, base - 2); ctx.lineTo(x + step / 2, base - h); ctx.lineTo(x + step, base - 2);
  }
  ctx.lineTo(VW + step, VH + 60); ctx.fill();
}
function drawRealBg() {
  const top = -offY, g = ctx.createLinearGradient(0, top, 0, VH);
  g.addColorStop(0, '#2f5d8f'); g.addColorStop(0.55, '#8fb3d6'); g.addColorStop(0.85, '#e8d9c2'); g.addColorStop(1, '#f2e2c8');
  ctx.fillStyle = g; ctx.fillRect(0, top, VW, SH);
  const sx = VW * 0.72, sy = 46, rg = ctx.createRadialGradient(sx, sy, 2, sx, sy, 140);
  rg.addColorStop(0, 'rgba(255,252,235,1)'); rg.addColorStop(0.06, 'rgba(255,245,210,.95)'); rg.addColorStop(0.25, 'rgba(255,230,180,.35)'); rg.addColorStop(1, 'rgba(255,220,170,0)');
  ctx.fillStyle = rg; ctx.fillRect(0, top, VW, SH);
  for (let i = 0; i < 5; i++) {
    const span = VW + 200, cx = ((i * 230 - camX * 0.08 + time * 3) % span + span) % span - 100, cy = 28 + (i * 29) % 50;
    for (let k = 0; k < 5; k++) {
      const ox = cx + (k - 2) * 14, oy = cy + Math.sin(i + k) * 4, r = 14 + ((i + k) % 3) * 5;
      const cg = ctx.createRadialGradient(ox, oy - r * 0.3, 1, ox, oy, r); cg.addColorStop(0, 'rgba(255,255,255,.55)'); cg.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = cg; ctx.fillRect(ox - r, oy - r, r * 2, r * 2);
    }
  }
  ridge(camX * 0.06, 125, 60, ['#8a9db5', '#b6c3d1'], 0.004, 7);
  ridge(camX * 0.14, 155, 45, ['#5f7088', '#93a3b4'], 0.007, 13);
  forest(camX * 0.3, 180, '#2e4430', '#4d6a4c');
  forest(camX * 0.5, 198, '#1f3021', '#3a5338');
  const hz = ctx.createLinearGradient(0, 140, 0, VH); hz.addColorStop(0, 'rgba(240,230,210,0)'); hz.addColorStop(1, 'rgba(240,230,210,.25)');
  ctx.fillStyle = hz; ctx.fillRect(0, 140, VW, VH - 140);
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 4; i++) {
    const a = 1.9 + i * 0.25 + Math.sin(time * 0.2 + i) * 0.04;
    ctx.fillStyle = 'rgba(255,240,200,.035)'; ctx.beginPath(); ctx.moveTo(sx, sy);
    ctx.lineTo(sx + Math.cos(a) * 400, sy + Math.sin(a) * 400); ctx.lineTo(sx + Math.cos(a + 0.08) * 400, sy + Math.sin(a + 0.08) * 400); ctx.fill();
  }
  ctx.restore();
}
function drawTile(t, x, y, tx, ty) {
  if (real && !under && RT && !RT.fail) { drawRealTile(t, x, y, tx, ty); return; }
  const b = B();
  switch (t) {
    case 1: {
      ctx.fillStyle = b.dirt; ctx.fillRect(x, y, T, T);
      ctx.fillStyle = b.dot;
      ctx.fillRect(x + 3 + (tx % 3), y + 9, 2, 2); ctx.fillRect(x + 10, y + 4 + (tx % 2) * 6, 2, 2);
      if (ty === 0 || map[(ty - 1) * W + tx] !== 1) {
        ctx.fillStyle = b.top; ctx.fillRect(x, y, T, 5);
        ctx.fillStyle = b.hi; ctx.fillRect(x, y, T, 2);
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
    case 11:
      ctx.fillStyle = b.dirt; ctx.fillRect(x, y, T, 6);
      ctx.fillStyle = b.top; ctx.fillRect(x, y, T, 2);
      ctx.fillStyle = b.dot; ctx.fillRect(x + 7, y + 2, 1, 4);
      break;
    case 9: case 10: {
      const left = tileAt(tx - 1, ty) !== t;
      const inset = t === 9 ? 2 : 0;
      const x0 = x + (left ? inset : 0), w = T - inset;
      const gold = !under && goldPipe(tx);
      ctx.fillStyle = gold ? '#8a5a00' : '#1d6b34'; ctx.fillRect(x0, y, w, T);
      ctx.fillStyle = gold ? 'hsl(45,95%,' + (52 + Math.sin(time * 5) * 6) + '%)' : '#2fa84f'; ctx.fillRect(x0 + (left ? 1 : 0), y + (t === 10 ? 1 : 0), w - 1, T - (t === 10 ? 2 : 0));
      if (left) { ctx.fillStyle = gold ? '#fff3a0' : '#8be39d'; ctx.fillRect(x0 + 3, y + (t === 10 ? 2 : 0), 3, T - (t === 10 ? 4 : 0)); }
      break;
    }
  }
}
function drawPip() {
  if (P.inv > 0 && ((time * 16) | 0) % 2) return;
  if (state === 'clear' && mode === 'run' && P.x > flagX + 62) return;
  const fly = mode === 'fly';
  const run = P.on && Math.abs(P.vx) > 10 || (state === 'clear' && !fly);
  const ph = Math.sin(P.anim * 18);
  const sy = P.on || fly ? 1 : (P.vy < 0 ? 1.1 : 0.94);
  ctx.save();
  ctx.translate(P.x + 6, P.y + 14);
  if (fly) ctx.rotate(P.vy * 0.0015);
  ctx.scale(P.face / sy, sy);
  const col = P.star > 0 ? 'hsl(' + (time * 600 % 360) + ',90%,60%)' : '#2fd4c4';
  if (P.glide) { ctx.fillStyle = '#7ed957'; ctx.beginPath(); ctx.ellipse(0, -19, 9, 2.5, 0, 0, TAU); ctx.fill(); ctx.fillRect(-0.5, -18, 1, 4); }
  if (P.wings > 0 && !fly) {
    const f = Math.sin(time * 25) * 3;
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.ellipse(-7, -10 + f, 5, 2.5, -0.5, 0, TAU); ctx.fill();
  }
  if (!fly) {
    ctx.fillStyle = P.boots > 0 ? '#ff8a1f' : '#1d4d63';
    ctx.fillRect(-5 + (run ? ph * 1.5 : 0), -3, 4, 3); ctx.fillRect(1 - (run ? ph * 1.5 : 0), -3, 4, 3);
  }
  ctx.fillStyle = col;
  ctx.beginPath(); ctx.moveTo(-4, -12); ctx.lineTo(-2, -17); ctx.lineTo(0, -13); ctx.lineTo(1, -13); ctx.lineTo(3, -17); ctx.lineTo(5, -12); ctx.fill();
  if (P.star <= 0) { const pg = ctx.createRadialGradient(-2, -11, 0.5, 0, -8, 7.5); pg.addColorStop(0, '#8ff5ea'); pg.addColorStop(0.6, '#2fd4c4'); pg.addColorStop(1, '#16938a'); ctx.fillStyle = pg; }
  ctx.beginPath(); ctx.ellipse(0, -8, 6.5, 6.5, 0, 0, TAU); ctx.fill();
  ctx.strokeStyle = 'rgba(10,70,66,.8)'; ctx.lineWidth = 0.7; ctx.stroke();
  ctx.fillStyle = '#bff7ef'; ctx.beginPath(); ctx.ellipse(1.5, -5.5, 3.5, 3, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = '#ff4d6d'; ctx.fillRect(-6, -9, 12, 2); ctx.fillRect(-10, -9 + Math.sin(time * 20), 5, 2);
  ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.ellipse(2.5, -11, 2.4, 2.8, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = '#111'; ctx.beginPath(); ctx.ellipse(3.4, -11, 1.2, 1.7, 0, 0, TAU); ctx.fill();
  if (fly) { // little plane
    ctx.fillStyle = '#ff4d6d'; ctx.beginPath(); ctx.ellipse(1, -2, 11, 4, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = '#c2304f'; ctx.fillRect(-5, -3, 10, 2);
    ctx.beginPath(); ctx.moveTo(-10, -2); ctx.lineTo(-13, -9); ctx.lineTo(-7, -3); ctx.fill();
    ctx.fillStyle = '#ffd23f'; ctx.fillRect(11, -3, 2, 2);
    ctx.fillStyle = 'rgba(255,255,255,.8)'; ctx.fillRect(13, -2 - Math.abs(Math.sin(time * 50)) * 6, 1, Math.abs(Math.sin(time * 50)) * 12);
  } else if (P.blaster > 0) {
    ctx.fillStyle = '#4a5cff'; ctx.fillRect(3, -7, 8, 3); ctx.fillStyle = '#ffd23f'; ctx.fillRect(10, -7, 2, 3);
  }
  ctx.restore();
}
const SKINS = [
  { walk: [272, 55, 58], hop: [140, 55, 48], fly: [48, 90, 55], charge: [18, 65, 52], spiky: [28, 45, 42], acc: 'leaf', wing: 'bug' },
  { walk: [24, 70, 45], hop: [95, 45, 42], fly: [25, 25, 38], charge: [38, 55, 52], spiky: [88, 40, 45], acc: 'claws', wing: 'feather' },
  { walk: [220, 25, 30], hop: [210, 15, 92], fly: [200, 45, 68], charge: [205, 35, 48], spiky: [190, 60, 72], acc: 'ice', wing: 'bat' },
  { walk: [8, 80, 45], hop: [28, 95, 55], fly: [0, 0, 22], charge: [0, 65, 35], spiky: [14, 85, 42], acc: 'flame', wing: 'bat' },
  { walk: [330, 80, 66], hop: [160, 70, 58], fly: [290, 70, 70], charge: [48, 90, 60], spiky: [0, 85, 64], acc: 'sprinkle', wing: 'bug' }
];
const skin = () => under ? SKINS[0] : SKINS[Math.max(0, BIOMES.indexOf(biome))];
const hsl = (c, dl = 0, a = 1) => 'hsla(' + c[0] + ',' + c[1] + '%,' + clamp(c[2] + dl, 0, 100) + '%,' + a + ')';
function blob(x, y, rx, ry, c) {
  const g = ctx.createRadialGradient(x - rx * 0.35, y - ry * 0.45, 0.5, x, y, Math.max(rx, ry) * 1.1);
  g.addColorStop(0, hsl(c, 25)); g.addColorStop(0.55, hsl(c)); g.addColorStop(1, hsl(c, -20));
  ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, TAU); ctx.fill();
  ctx.strokeStyle = hsl(c, -38); ctx.lineWidth = 0.8; ctx.stroke();
}
function eyes(x, y, d, mood, sz = 1) {
  for (const s of [-1, 1]) {
    const ex = x + s * 2.6 * sz;
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.ellipse(ex, y, 2.1 * sz, 2.5 * sz, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,.5)'; ctx.lineWidth = 0.5; ctx.stroke();
    ctx.fillStyle = mood === 2 ? '#d00' : '#111'; ctx.beginPath(); ctx.ellipse(ex + d * 0.9 * sz, y + 0.4, 1.05 * sz, 1.45 * sz, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.fillRect(ex + d * 0.9 * sz - 0.6, y - 0.8, 0.7, 0.7);
  }
  if (mood) {
    ctx.strokeStyle = '#111'; ctx.lineWidth = 1.1; ctx.beginPath();
    ctx.moveTo(x - 5 * sz, y - 3.4 * sz); ctx.lineTo(x - 1 * sz, y - 2.2 * sz); ctx.moveTo(x + 5 * sz, y - 3.4 * sz); ctx.lineTo(x + 1 * sz, y - 2.2 * sz); ctx.stroke();
  }
}
function accessory(acc, y, c) {
  if (acc === 'leaf') {
    ctx.fillStyle = '#4caf50'; ctx.beginPath(); ctx.ellipse(1.5, y - 1.5, 3.5, 1.6, -0.6, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#2e7d32'; ctx.lineWidth = 0.6; ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(3.5, y - 3); ctx.stroke();
  } else if (acc === 'claws') {
    ctx.fillStyle = hsl(c, -10);
    for (const s of [-1, 1]) { ctx.beginPath(); ctx.ellipse(s * 8.5, y + 8, 2.6, 2, 0, 0, TAU); ctx.fill(); }
    ctx.strokeStyle = hsl(c, -15); ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(-5, y + 4); ctx.quadraticCurveTo(-11, y - 3, -6, y - 5); ctx.stroke();
    ctx.fillStyle = '#222'; ctx.beginPath(); ctx.arc(-6, y - 5, 1.2, 0, TAU); ctx.fill();
  } else if (acc === 'ice') {
    ctx.fillStyle = 'rgba(255,255,255,.9)'; ctx.beginPath(); ctx.ellipse(0, y + 8, 4.5, 4, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = '#ff9a1f'; ctx.beginPath(); ctx.moveTo(-1.5, y + 5); ctx.lineTo(1.5, y + 5); ctx.lineTo(0, y + 7); ctx.fill();
  } else if (acc === 'flame') {
    const f = Math.sin(time * 18) * 1.2;
    ctx.fillStyle = '#ffb02e'; ctx.beginPath(); ctx.moveTo(-3, y + 1); ctx.quadraticCurveTo(-2, y - 5 - f, 0, y - 7 + f); ctx.quadraticCurveTo(2, y - 4, 3, y + 1); ctx.fill();
    ctx.fillStyle = '#fff3a0'; ctx.beginPath(); ctx.ellipse(0, y - 1.5, 1.2, 2.2, 0, 0, TAU); ctx.fill();
  } else if (acc === 'sprinkle') {
    const cols = ['#fff', '#7ff', '#ff6', '#9f9'];
    for (let i = 0; i < 6; i++) { ctx.fillStyle = cols[i % 4]; ctx.save(); ctx.translate(-5 + i * 2, y + 3 + (i % 2) * 2); ctx.rotate(i); ctx.fillRect(-1, -0.4, 2, 0.8); ctx.restore(); }
  }
}
function wings(type, f, c) {
  if (type === 'bug') {
    ctx.fillStyle = 'rgba(225,245,255,.7)'; ctx.strokeStyle = 'rgba(80,110,140,.6)'; ctx.lineWidth = 0.5;
    for (const s of [-1, 1]) { ctx.beginPath(); ctx.ellipse(s * 3.5, -12, 5, 2.4, s * (0.6 - f * 0.5), 0, TAU); ctx.fill(); ctx.stroke(); }
  } else {
    ctx.fillStyle = hsl(c, type === 'bat' ? -15 : -8);
    for (const s of [-1, 1]) {
      ctx.beginPath(); ctx.moveTo(s * 3, -9);
      if (type === 'bat') { ctx.lineTo(s * 12, -11 - f * 5); ctx.lineTo(s * 10, -6); ctx.lineTo(s * 7.5, -8); ctx.lineTo(s * 5, -5); }
      else { ctx.lineTo(s * 11, -12 - f * 4); ctx.lineTo(s * 9, -8); ctx.lineTo(s * 6, -6); }
      ctx.closePath(); ctx.fill();
    }
  }
}
function drawFoe(e) {
  ctx.save();
  ctx.translate(e.x + 7, e.y + 14);
  if (e.dead) { ctx.scale(1, -1); ctx.translate(0, 14); }
  if (e.flash > 0) ctx.globalAlpha = 0.5;
  if (e.type === 'bird') {
    const f = Math.sin(time * 18 + e.x) * 4;
    ctx.fillStyle = '#e07a10'; ctx.beginPath(); ctx.moveTo(-2, -8); ctx.lineTo(4, -8 - 6 - f); ctx.lineTo(4, -7); ctx.fill();
    blob(0, -7, 7, 5, [36, 100, 58]);
    ctx.fillStyle = '#ff6a3d'; ctx.beginPath(); ctx.moveTo(-7, -8); ctx.lineTo(-11, -6); ctx.lineTo(-7, -5); ctx.fill();
    eyes(-2.5, -9, -1, 1, 0.7);
    ctx.restore(); ctx.globalAlpha = 1; return;
  }
  if (e.type === 'drone') {
    const sp = Math.abs(Math.sin(time * 30)) * 8;
    ctx.fillStyle = '#9aa3b5'; ctx.fillRect(-1, -15, 2, 4); ctx.fillRect(-sp, -15, sp * 2, 1.5);
    blob(0, -6, 8, 6, [220, 12, 40]);
    ctx.fillStyle = '#ff3b3b'; ctx.beginPath(); ctx.ellipse(-3, -6, 2.5, 2.5, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.fillRect(-3.8, -7, 1, 1);
    ctx.restore(); ctx.globalAlpha = 1; return;
  }
  const sk = skin(), thief = e.type === 'thief', c = thief ? [250, 15, 38] : sk[e.type] || sk.walk, d = e.vx > 0 ? 1 : -1;
  if (!e.dead && e.on) { ctx.fillStyle = 'rgba(0,0,0,.2)'; ctx.beginPath(); ctx.ellipse(0, 0, 7, 1.6, 0, 0, TAU); ctx.fill(); }
  if (e.sqd) { blob(0, -2, 8, 2.5, c); ctx.restore(); ctx.globalAlpha = 1; return; }
  const bob = e.act ? Math.sin(time * 10 + e.x) : 0;
  if (e.type === 'walk' || thief) {
    ctx.fillStyle = hsl(c, -35);
    ctx.beginPath(); ctx.ellipse(-3.5 + bob * 1.4, -1.3, 2.6, 1.6, 0, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.ellipse(3.5 - bob * 1.4, -1.3, 2.6, 1.6, 0, 0, TAU); ctx.fill();
    blob(0, -7, 7.5, 6.5, c);
    ctx.fillStyle = hsl(c, 18, 0.55); ctx.beginPath(); ctx.ellipse(d * 1.5, -4.5, 4, 3, 0, 0, TAU); ctx.fill();
    if (thief) { ctx.fillStyle = 'rgba(10,10,10,.9)'; ctx.fillRect(-7, -10.5, 14, 4); }
    eyes(d * 1.5, -8.5, d, 1);
    if (thief) { ctx.save(); ctx.translate(-d * 6, -11); ctx.rotate(-d * 0.7); ctx.fillStyle = '#e3b23c'; ctx.beginPath(); ctx.ellipse(0, -3, 2.2, 3, 0, 0, TAU); ctx.fill(); ctx.fillRect(-0.6, 0, 1.2, 6); ctx.restore(); }
    else accessory(sk.acc, -13.5, c);
  } else if (e.type === 'hop') {
    const st = e.on ? 1 : (e.vy < 0 ? 1.15 : 0.92);
    ctx.scale(1 / st, st);
    ctx.fillStyle = hsl(c, -20);
    ctx.beginPath(); ctx.ellipse(-5, -1.5, 3, 1.5, 0, 0, TAU); ctx.fill(); ctx.beginPath(); ctx.ellipse(5, -1.5, 3, 1.5, 0, 0, TAU); ctx.fill();
    blob(0, -6.5, 7, 6, c);
    eyes(d, -11, d, 0, 1.15);
    ctx.strokeStyle = hsl(c, -40); ctx.lineWidth = 0.8; ctx.beginPath(); ctx.arc(d, -5.5, 2.5, 0.2, Math.PI - 0.2); ctx.stroke();
    accessory(sk.acc, -12.5, c);
  } else if (e.type === 'fly') {
    wings(sk.wing, Math.sin(time * 22 + e.x), c);
    blob(0, -7, 6, 5, c);
    eyes(d * 1.2, -7.5, d, 1, 0.9);
    if (sk.wing === 'bug') { ctx.strokeStyle = '#222'; ctx.lineWidth = 0.6; ctx.beginPath(); ctx.moveTo(d * 1, -11.5); ctx.lineTo(d * 3, -15); ctx.stroke(); ctx.fillStyle = '#222'; ctx.beginPath(); ctx.arc(d * 3, -15, 0.9, 0, TAU); ctx.fill(); ctx.fillStyle = '#222'; ctx.beginPath(); ctx.moveTo(-d * 5.5, -7); ctx.lineTo(-d * 8.5, -6); ctx.lineTo(-d * 5.5, -5); ctx.fill(); }
    else if (sk.wing === 'feather') { ctx.fillStyle = '#ffb02e'; ctx.beginPath(); ctx.moveTo(d * 5, -8); ctx.lineTo(d * 9, -6.5); ctx.lineTo(d * 5, -5.5); ctx.fill(); }
    else { ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.moveTo(d * 0.5, -4); ctx.lineTo(d * 1.3, -2.5); ctx.lineTo(d * 2.1, -4); ctx.fill(); }
  } else if (e.type === 'charge') {
    ctx.fillStyle = hsl(c, -35);
    for (const lx of [-6, -2.5, 1.5, 5]) ctx.fillRect(lx + (Math.abs(lx) > 3 ? bob : -bob) * 1.2, -3, 2, 3);
    blob(0, -6.5, 8.5, 6, c);
    ctx.fillStyle = '#f4ead0'; ctx.strokeStyle = '#8a7a60'; ctx.lineWidth = 0.6;
    ctx.beginPath(); ctx.moveTo(d * 6, -8.5); ctx.lineTo(d * (12 + e.rage * 2), -12.5); ctx.lineTo(d * 7.5, -5.5); ctx.closePath(); ctx.fill(); ctx.stroke();
    eyes(d * 3, -8, d, e.rage > 0.5 ? 2 : 1, 0.85);
    accessory(sk.acc, -12.5, c);
  } else {
    ctx.fillStyle = hsl(c, 30); ctx.strokeStyle = hsl(c, -30); ctx.lineWidth = 0.6;
    for (let i = 0; i < 7; i++) {
      const a = Math.PI + 0.25 + i * (Math.PI - 0.5) / 6, cs = Math.cos(a), sn = Math.sin(a);
      ctx.beginPath(); ctx.moveTo(cs * 6 - sn * 1.8, -7 + sn * 5.5 + cs * 1.8); ctx.lineTo(cs * 11, -7 + sn * 10); ctx.lineTo(cs * 6 + sn * 1.8, -7 + sn * 5.5 - cs * 1.8); ctx.closePath(); ctx.fill(); ctx.stroke();
    }
    ctx.fillStyle = hsl(c, -35);
    ctx.beginPath(); ctx.ellipse(-3.5 + bob, -1.3, 2.4, 1.5, 0, 0, TAU); ctx.fill(); ctx.beginPath(); ctx.ellipse(3.5 - bob, -1.3, 2.4, 1.5, 0, 0, TAU); ctx.fill();
    blob(0, -7, 7, 6, c);
    eyes(d * 1.5, -7.5, d, 1, 0.9);
  }
  ctx.restore(); ctx.globalAlpha = 1;
}
function drawCoin(x, y) {
  const w = Math.max(1, 4 * Math.abs(Math.cos(time * 5 + x * 0.05)));
  if (real && !under) {
    const cg = ctx.createLinearGradient(x + 4 - w, y, x + 4 + w, y + 8);
    cg.addColorStop(0, '#fff2b0'); cg.addColorStop(0.4, '#e3b23c'); cg.addColorStop(1, '#8a5a10');
    ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.beginPath(); ctx.ellipse(x + 5, y + 5, w + 0.8, 4.6, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = cg; ctx.beginPath(); ctx.ellipse(x + 4, y + 4, w + 0.6, 4.6, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#6a440a'; ctx.lineWidth = 0.5; ctx.stroke();
    return;
  }
  ctx.fillStyle = '#b07800'; ctx.beginPath(); ctx.ellipse(x + 4, y + 4, w + 0.8, 4.8, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = '#ffd23f'; ctx.beginPath(); ctx.ellipse(x + 4, y + 4, w, 4, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = '#fff6b0'; ctx.fillRect(x + 3.5, y + 1.5, 1, 3);
}
function drawItem(it) {
  const x = it.x, y = it.y + (it.rise > 0 ? 0 : Math.sin(time * 4 + x) * 1.5);
  if (it.type === 'quest') { drawQuestItem(it.qi, x, y); return; }
  if (it.type === 'firefly') {
    const fg = ctx.createRadialGradient(it.x + 6, it.y + 6, 0.5, it.x + 6, it.y + 6, 12); fg.addColorStop(0, 'rgba(255,250,150,.9)'); fg.addColorStop(1, 'rgba(255,250,150,0)');
    ctx.fillStyle = fg; ctx.fillRect(it.x - 6, it.y - 6, 24, 24);
    ctx.fillStyle = 'rgba(230,245,255,.8)'; ctx.beginPath(); ctx.ellipse(it.x + 4, it.y + 3, 2.5, 1.3, -0.5 + Math.sin(time * 30) * 0.4, 0, TAU); ctx.fill(); ctx.beginPath(); ctx.ellipse(it.x + 8, it.y + 3, 2.5, 1.3, 0.5 - Math.sin(time * 30) * 0.4, 0, TAU); ctx.fill();
    ctx.fillStyle = '#3a2a1a'; ctx.beginPath(); ctx.arc(it.x + 6, it.y + 5, 2, 0, TAU); ctx.fill();
    ctx.fillStyle = '#fff27a'; ctx.beginPath(); ctx.arc(it.x + 6, it.y + 8, 2.3, 0, TAU); ctx.fill();
    return;
  }
  if (it.type === 'heart') heart(x, y + 1, 12, '#ff4d6d');
  else if (it.type === 'star') star(x + 6, y + 6, 7, 'hsl(' + (time * 400 % 360) + ',95%,60%)', time * 2);
  else if (it.type === 'boots') {
    ctx.fillStyle = '#ff8a1f'; ctx.fillRect(x + 2, y + 2, 5, 8); ctx.fillRect(x + 2, y + 7, 9, 4);
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.moveTo(x + 2, y + 3); ctx.lineTo(x - 2, y); ctx.lineTo(x + 2, y + 7); ctx.fill();
  } else if (it.type === 'blaster') {
    ctx.fillStyle = '#4a5cff'; ctx.fillRect(x, y + 3, 12, 4); ctx.fillRect(x + 2, y + 6, 3, 5);
    ctx.fillStyle = '#ffd23f'; ctx.fillRect(x + 10, y + 3, 2, 4);
  } else if (it.type === 'wings') {
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.ellipse(x + 3, y + 6, 4, 6, -0.4, 0, TAU); ctx.ellipse(x + 9, y + 6, 4, 6, 0.4, 0, TAU); ctx.fill();
  } else if (it.type === 'spread') {
    ctx.fillStyle = '#a24bff'; ctx.beginPath(); ctx.arc(x + 6, y + 6, 6, 0, TAU); ctx.fill();
    txt('3', x + 6, y + 6.5, 8, '#fff');
  } else {
    ctx.fillStyle = '#5ff2ff'; ctx.beginPath(); ctx.moveTo(x + 6, y); ctx.lineTo(x + 12, y + 5); ctx.lineTo(x + 6, y + 12); ctx.lineTo(x, y + 5); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#e6fdff'; ctx.fillRect(x + 4, y + 3, 2, 2);
  }
}

function draw() {
  hue = (world * 47 + 190) % 360;
  const b = B();
  const night = mod === 'NIGHT RUN' && !under;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.setTransform(scale, 0, 0, scale, 0, offY * scale);
  const gr = ctx.createLinearGradient(0, -offY, 0, VH);
  const sky = night ? ['#070b26', '#2a2050'] : b.sky || ['hsl(' + hue + ',70%,62%)', 'hsl(' + ((hue + 40) % 360) + ',85%,86%)'];
  gr.addColorStop(0, sky[0]); gr.addColorStop(1, sky[1]);
  ctx.fillStyle = gr; ctx.fillRect(0, -offY, VW, SH);
  if (real && !under && RT && !RT.fail) drawRealBg();
  else if (!under) {
    ctx.fillStyle = night ? '#f4f1d0' : b.lava ? 'rgba(255,140,80,.8)' : 'rgba(255,250,210,.9)';
    ctx.beginPath(); ctx.arc(VW * 0.8, 40, 16, 0, TAU); ctx.fill();
    if (night) {
      ctx.fillStyle = '#fff';
      for (let i = 0; i < 40; i++) { const sx = ((i * 97.3 - camX * 0.05) % VW + VW) % VW; ctx.fillRect(sx, (i * 53.7) % 120, 1, 1); }
    }
    ctx.fillStyle = night || b.lava ? 'rgba(160,170,220,.25)' : 'rgba(255,255,255,.85)';
    for (let i = 0; i < (mode === 'fly' ? 10 : 6); i++) {
      const span = VW + 120;
      const cx = ((i * 170 - camX * (mode === 'fly' ? 0.5 : 0.15) + time * 6) % span + span) % span - 60, cy = 20 + (i * 37) % (mode === 'fly' ? 180 : 60);
      ctx.beginPath(); ctx.ellipse(cx, cy, 22, 7, 0, 0, TAU); ctx.ellipse(cx + 10, cy - 5, 12, 7, 0, 0, TAU); ctx.fill();
    }
    const hy = mode === 'climb' ? (RH * T - VH - camY) * 0.25 : 0;
    hills(camX * 0.2, 150 + hy, 22, night ? '#1f2a55' : b.h1 || 'hsl(' + ((hue + 120) % 360) + ',35%,72%)');
    hills(camX * 0.45 + 300, 180 + hy * 1.6, 16, night ? '#17203f' : b.h2 || 'hsl(' + ((hue + 130) % 360) + ',40%,52%)');
    if (mode === 'fly') hills(camX * 0.8 + 900, 228, 10, night ? '#111833' : b.top);
  } else {
    ctx.fillStyle = 'rgba(255,255,255,.04)';
    for (let y = 0; y < VH; y += 8) for (let x = ((y / 8) % 2) * 8 - (camX * 0.5) % 16; x < VW; x += 16) ctx.fillRect(x, y, 15, 7);
  }

  const sx = shake > 0 ? (Math.random() - 0.5) * 4 : 0;
  ctx.save();
  ctx.translate(-Math.round(camX * scale) / scale + sx, -Math.round(camY * scale) / scale);
  const c0 = Math.max(0, Math.floor(camX / T) - 1), c1 = Math.min(W - 1, Math.ceil((camX + VW) / T) + 1);
  if (b.lava && !under && mode === 'run') {
    const lg = ctx.createLinearGradient(0, VH - 10, 0, VH + 40);
    lg.addColorStop(0, '#ffd23f'); lg.addColorStop(0.3, '#ff6a00'); lg.addColorStop(1, '#a01800');
    ctx.fillStyle = lg; ctx.fillRect(c0 * T, VH - 8 + Math.sin(time * 2) * 1.5, (c1 - c0 + 1) * T, SH);
  }
  ctx.fillStyle = real && !under && RT && !RT.fail ? RT.dirt : b.dirt;
  if (mode === 'run') for (let tx = c0; tx <= c1; tx++) if (map[14 * W + tx] === 1) ctx.fillRect(tx * T, VH - 1, T + 0.5, SH - offY - VH + 2);
  if (mode === 'run' && !under && flagX + 80 > camX && flagX < camX + VW + 20) {
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
  if (mode === 'climb') {
    ctx.fillStyle = '#3a3550';
    if (camX < 0) ctx.fillRect(camX - 1, camY - 1, -camX + 1, SH + 2);
    if (camX + VW > W * T) ctx.fillRect(W * T, camY - 1, camX + VW - W * T + 1, SH + 2);
    const fx = W * T / 2;
    ctx.fillStyle = '#ddd'; ctx.fillRect(fx, goalY - 48, 2, 48);
    ctx.fillStyle = '#ffd23f'; ctx.beginPath(); ctx.arc(fx + 1, goalY - 49, 3, 0, TAU); ctx.fill();
    const wv = Math.sin(time * 6) * 2;
    ctx.fillStyle = '#ff4d6d'; ctx.beginPath(); ctx.moveTo(fx + 2, goalY - 46); ctx.lineTo(fx + 22, goalY - 39 + wv); ctx.lineTo(fx + 2, goalY - 32); ctx.fill();
    star(fx + 9, goalY - 39, 3, '#fff', 0);
  }
  if (state === 'pipe') drawPip();
  const r0 = Math.max(0, Math.floor(camY / T)), r1 = Math.min(RH - 1, Math.floor((camY + SH) / T) + 1);
  for (let ty = r0; ty <= r1; ty++) for (let tx = c0; tx <= c1; tx++) {
    const t = map[ty * W + tx];
    if (!t || t === 7) continue;
    let oy = 0;
    for (const bb of bumps) if (bb.tx === tx && bb.ty === ty) oy = -Math.sin((1 - bb.t / 0.15) * Math.PI) * 4;
    drawTile(t, tx * T, ty * T + oy, tx, ty);
  }
  if (under) for (const dc of roomDecor) {
    if (dc.x < camX - 30 || dc.x > camX + VW + 30) continue;
    const gc = underB.glow, gy = dc.y + (dc.up ? -6 : 6), pulse = 0.35 + Math.sin(time * 2 + dc.x) * 0.12;
    const gl = ctx.createRadialGradient(dc.x, gy, 1, dc.x, gy, 26 * dc.s);
    gl.addColorStop(0, hsl(gc, 0, pulse)); gl.addColorStop(1, hsl(gc, 0, 0));
    ctx.fillStyle = gl; ctx.fillRect(dc.x - 30, gy - 30, 60, 60);
    const dir = dc.up ? -1 : 1, hh = 9 * dc.s;
    ctx.fillStyle = hsl(gc, 10, 0.9); ctx.strokeStyle = hsl(gc, -30); ctx.lineWidth = 0.6;
    ctx.beginPath(); ctx.moveTo(dc.x - 3 * dc.s, dc.y); ctx.lineTo(dc.x, dc.y + dir * hh); ctx.lineTo(dc.x + 3 * dc.s, dc.y); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(dc.x + 2 * dc.s, dc.y); ctx.lineTo(dc.x + 5 * dc.s, dc.y + dir * hh * 0.6); ctx.lineTo(dc.x + 6 * dc.s, dc.y); ctx.closePath(); ctx.fill(); ctx.stroke();
  }
  for (const w of warps) {
    if (w.used || w.tx * T < camX - 40 || w.tx * T > camX + VW + 10) continue;
    const ax = w.tx * T + 16, ay = w.ty * T - 12 + Math.sin(time * 5) * 2;
    ctx.fillStyle = 'rgba(255,255,255,.85)'; ctx.beginPath(); ctx.moveTo(ax - 4, ay - 3); ctx.lineTo(ax + 4, ay - 3); ctx.lineTo(ax, ay + 3); ctx.fill();
  }
  for (const c of coinL) {
    if (c.x < camX - 10 || c.x > camX + VW + 10) continue;
    if (c.gem) {
      ctx.fillStyle = '#5ff2ff'; ctx.beginPath(); ctx.moveTo(c.x + 4, c.y - 1); ctx.lineTo(c.x + 9, c.y + 4); ctx.lineTo(c.x + 4, c.y + 10); ctx.lineTo(c.x - 1, c.y + 4); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#e6fdff'; ctx.fillRect(c.x + 2, c.y + 2, 2, 2);
    } else drawCoin(c.x, c.y);
  }
  for (const it of items) drawItem(it);
  if (npc && !under) drawNpc();
  for (const e of ents) if (e.x > camX - 20 && e.x < camX + VW + 20) drawFoe(e);
  for (const s of shots) {
    if (s.foe) { ctx.fillStyle = '#ff3b3b'; ctx.beginPath(); ctx.arc(s.x + 3, s.y + 3, 3, 0, TAU); ctx.fill(); ctx.fillStyle = '#ffd0d0'; ctx.fillRect(s.x + 2, s.y + 2, 2, 2); }
    else { ctx.fillStyle = '#ffe066'; ctx.fillRect(s.x, s.y, s.w, s.h); ctx.fillStyle = '#fff'; ctx.fillRect(s.x + s.w - 2, s.y, 2, s.h); }
  }
  if (state !== 'title' && state !== 'pipe' && state !== 'select') {
    if (P.on && mode !== 'fly') { ctx.fillStyle = 'rgba(0,0,0,.22)'; ctx.beginPath(); ctx.ellipse(P.x + 6, P.y + 14, 7, 1.8, 0, 0, TAU); ctx.fill(); }
    drawPip();
  }
  for (const p of parts) {
    ctx.globalAlpha = Math.min(1, p.life * 3);
    if (p.coin) drawCoin(p.x - 4, p.y - 4);
    else { ctx.fillStyle = p.col; ctx.fillRect(p.x - p.s / 2, p.y - p.s / 2, p.s, p.s); }
  }
  ctx.globalAlpha = 1;
  for (const t of texts) { ctx.globalAlpha = Math.min(1, t.t * 2); txt(t.s, t.x + 6, t.y, 8, t.col); }
  ctx.globalAlpha = 1;
  if (mode === 'climb' && lavaY < camY + SH) {
    const ly = lavaY + Math.sin(time * 2) * 1.5;
    const lg = ctx.createLinearGradient(0, ly, 0, ly + 60);
    lg.addColorStop(0, '#ffd23f'); lg.addColorStop(0.25, '#ff6a00'); lg.addColorStop(1, '#a01800');
    ctx.fillStyle = lg; ctx.fillRect(camX - 2, ly, VW + 4, camY + SH - ly + 4);
    ctx.fillStyle = 'rgba(255,230,120,.8)';
    for (let i = 0; i < 6; i++) ctx.fillRect(camX + ((i * 83 + time * 20) % VW), ly + 3 + Math.sin(time * 3 + i) * 2, 3, 2);
  }
  ctx.restore();

  if (!under && (b.snow || b.ember)) {
    ctx.fillStyle = b.snow ? 'rgba(255,255,255,.85)' : 'rgba(255,150,60,.8)';
    for (let i = 0; i < 36; i++) {
      const sp = 18 + (i % 4) * 9, yy = (i * 41.3 + time * sp) % (VH + 10);
      const y = b.snow ? yy - 5 : VH - yy;
      const x = ((i * 67.7 + Math.sin(time + i) * 8 - camX * 0.3) % VW + VW) % VW;
      ctx.fillRect(x, y, i % 3 ? 1.5 : 2.5, i % 3 ? 1.5 : 2.5);
    }
  }
  if (night && state !== 'title') {
    const px = P.x + 6 - camX, py = P.y + 7 - camY;
    const rg = ctx.createRadialGradient(px, py, 10, px, py, 120);
    rg.addColorStop(0, 'rgba(4,4,20,0)'); rg.addColorStop(0.35, 'rgba(4,4,20,.15)'); rg.addColorStop(1, 'rgba(4,4,20,.93)');
    ctx.fillStyle = rg; ctx.fillRect(0, -offY, VW, SH);
  }

  if (mode === 'climb' && state === 'play') {
    const heat = clamp(1 - (lavaY - (P.y + P.h)) / 100, 0, 1);
    const lg2 = ctx.createLinearGradient(0, VH + 20 - 70, 0, VH + 20);
    lg2.addColorStop(0, 'rgba(255,80,0,0)'); lg2.addColorStop(1, 'rgba(255,80,0,' + (0.15 + heat * 0.5) + ')');
    ctx.fillStyle = lg2; ctx.fillRect(0, VH - 50, VW, SH);
    if (heat > 0.35 && Math.floor(time * 4) % 2) txt('HURRY! THE LAVA IS RISING!', VW / 2, VH - 30, 11, '#ffd23f');
  }
  if (real && !under && RT && !RT.fail) {
    const vg = ctx.createRadialGradient(VW / 2, VH / 2, VH * 0.35, VW / 2, VH / 2, Math.max(VW, VH) * 0.8);
    vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(10,5,0,.45)');
    ctx.fillStyle = vg; ctx.fillRect(0, -offY, VW, SH);
    ctx.fillStyle = 'rgba(255,170,90,.05)'; ctx.fillRect(0, -offY, VW, SH);
  }

  // HUD (screen space)
  ctx.setTransform(scale, 0, 0, scale, 0, 0);
  const mh = maxHp();
  for (let i = 0; i < mh; i++) heart(6 + i * 11, 5, 10, i < hp ? '#ff4d6d' : 'rgba(0,0,0,.35)');
  drawCoin(6, 19); txt('x' + coins, 17, 23.5, 9, '#fff', 'left');
  txt('WORLD ' + world, VW / 2, 10, 10, '#fff');
  const sub = under ? underB.name : real ? 'REAL WORLD' : mode === 'fly' ? 'SKY SHOOTER' : mode === 'climb' ? 'TOWER CLIMB' : mod || biome.name;
  txt(sub, VW / 2, 22, 8, '#ffe066');
  const bx = VW - 84;
  txt('Lv ' + prog.lv, bx, 10, 10, '#fff', 'left');
  ctx.fillStyle = 'rgba(0,0,0,.45)'; ctx.fillRect(bx, 17, 56, 5);
  ctx.fillStyle = '#7ed957'; ctx.fillRect(bx, 17, 56 * prog.xp / xpNeed(prog.lv), 5);
  const perks = [perk.dj() ? '2J' : '', perk.mag() ? 'MAG' : '', perk.dash() ? 'DASH' : '', perk.glide() ? 'GLIDE' : ''].filter(Boolean).join(' ');
  if (perks) txt(perks, bx, 29, 7, '#bff7ef', 'left');
  const ix = VW - 20, iy = 6;
  ctx.fillStyle = '#fff'; ctx.fillRect(ix, iy + 3, 3, 5);
  ctx.beginPath(); ctx.moveTo(ix + 3, iy + 3); ctx.lineTo(ix + 7, iy); ctx.lineTo(ix + 7, iy + 11); ctx.lineTo(ix + 3, iy + 8); ctx.fill();
  ctx.strokeStyle = muted ? '#ff4d6d' : '#fff'; ctx.lineWidth = 1.3; ctx.beginPath();
  if (muted) { ctx.moveTo(ix + 9, iy + 2); ctx.lineTo(ix + 14, iy + 9); ctx.moveTo(ix + 14, iy + 2); ctx.lineTo(ix + 9, iy + 9); }
  else { ctx.arc(ix + 7, iy + 5.5, 4, -0.9, 0.9); ctx.moveTo(ix + 13, iy + 1); ctx.arc(ix + 7, iy + 5.5, 7, -0.9, 0.9); }
  ctx.stroke();
  const timers = [['STAR', P.star], ['BOOTS', P.boots], ['BLASTER', P.blaster], ['WINGS', P.wings], ['TRIPLE', P.spread]].filter(a => a[1] > 0);
  timers.forEach((a, i) => txt(a[0] + ' ' + Math.ceil(a[1]), 6, 36 + i * 10, 8, '#ffe066', 'left'));
  if (frenzy && under) {
    txt(frenzy.done ? 'FRENZY OVER - take a pipe back' : 'FRENZY ' + Math.ceil(frenzy.t), VW / 2, 36, frenzy.done ? 9 : 14, frenzy.t < 5 && !frenzy.done ? '#ff6a3d' : '#ffd23f');
    if (frenzy.chain > 1) txt('CHAIN x' + frenzy.chain, VW / 2, 52, 10 + Math.min(8, frenzy.chain / 6), '#fff');
    txt('+' + frenzy.got, VW / 2, 64, 9, '#ffe066');
  }
  const qh = state !== 'title' ? questHud() : null;
  if (qh) {
    txt('QUEST: ' + qh.t, 6, 36 + timers.length * 10, 7, '#7ff', 'left');
    const tsx = qh.x == null ? VW / 2 : qh.x - camX;
    if (tsx < 0 || tsx > VW) {
      const dir = tsx < 0 ? -1 : 1, ax = dir < 0 ? 12 : VW - 12, ay = offY + 11 * T + Math.sin(time * 6) * 2;
      ctx.fillStyle = 'rgba(0,0,0,.4)'; ctx.beginPath(); ctx.arc(ax, ay, 8, 0, TAU); ctx.fill();
      ctx.fillStyle = '#7ff'; ctx.beginPath(); ctx.moveTo(ax + dir * 6, ay); ctx.lineTo(ax - dir * 3, ay - 5); ctx.lineTo(ax - dir * 3, ay + 5); ctx.fill();
    }
  }

  const cy = SH / 2 - (touch ? 20 : 0);
  if (banners.length && state !== 'title') {
    const bn = banners[0], a = Math.min(1, bn.t * 3, (bn.max - bn.t) * 6);
    ctx.globalAlpha = a;
    txt(bn.s, VW / 2, cy - 30, Math.min(20, VW / 11), '#fff');
    if (bn.sub) txt(bn.sub, VW / 2, cy - 10, 10, '#ffe066');
    ctx.globalAlpha = 1;
  }
  if (state === 'title' || state === 'over') {
    ctx.fillStyle = 'rgba(10,12,40,.55)'; ctx.fillRect(0, 0, VW, SH);
    if (state === 'title') {
      txt('PIP & THE MARZIPAN CAPER', VW / 2, cy - 44, Math.min(20, VW / 15), '#2fd4c4');
      txt('rescue Princess Marzipan (again)', VW / 2, cy - 24, 9, '#ffe066');
      if (hasSave && world > 1) txt('continue: World ' + world + ' - Lv ' + prog.lv, VW / 2, cy - 12, 8, '#7ff');
    } else {
      txt('OUT OF HEARTS', VW / 2, cy - 44, Math.min(20, VW / 10), '#ff4d6d');
      txt('Pip keeps Lv ' + prog.lv + ' - retry World ' + world, VW / 2, cy - 24, 9, '#ffe066');
    }
    const blink = Math.floor(time * 2.5) % 2;
    if (blink || state === 'over') txt(touch ? 'Tap to play' : 'Click to play', VW / 2, cy, 11, '#fff');
    if (!touch) {
      txt('Arrows / A D move  ·  Space / W / Up jump  ·  Down enter pipe', VW / 2, cy + 18, 8, '#ddd');
      txt('Shift / X dash (Lv5)  ·  F / C fire  ·  M mute  ·  click = jump', VW / 2, cy + 30, 8, '#ddd');
    }
  }
  if (state === 'talk' && talk && talk.i < talk.lines.length) {
    const L = talk.lines[talk.i], full = L[1];
    const bw = Math.min(VW - 12, 420), bh = 64, tbx = (VW - bw) / 2, tby = SH - (touch ? 66 : 8) - bh;
    ctx.fillStyle = 'rgba(12,14,40,.93)'; ctx.fillRect(tbx, tby, bw, bh);
    ctx.strokeStyle = NCOL[L[0]] || '#fff'; ctx.lineWidth = 1.5; ctx.strokeRect(tbx + 0.75, tby + 0.75, bw - 1.5, bh - 1.5);
    ctx.fillStyle = 'rgba(255,255,255,.08)'; ctx.fillRect(tbx + 4, tby + 4, 50, 56);
    const typing = talk.n < full.length;
    drawFace(L[0], tbx + 29, tby + 33, typing && ((time * 14) | 0) % 2 === 0);
    txt(NAMES[L[0]] || '', tbx + 60, tby + 10, 8, NCOL[L[0]] || '#fff', 'left');
    ctx.font = 'bold 9px "Trebuchet MS", Verdana, sans-serif';
    const lines = wrapText(full, bw - 68);
    let left = talk.n;
    lines.slice(0, 3).forEach((ln, i) => {
      if (left > 0) txt(ln.slice(0, left), tbx + 60, tby + 24 + i * 11, 9, '#fff', 'left');
      left -= ln.length + 1;
    });
    choiceRects = [];
    if (talkChoosing()) {
      const opts = L[2], pw = Math.min(bw - 40, 230), px = tbx + bw - pw;
      opts.forEach((o, i) => {
        const oy = tby - 4 - (opts.length - i) * 15, on = i === talk.sel;
        ctx.fillStyle = on ? 'rgba(47,212,196,.95)' : 'rgba(12,14,40,.93)'; ctx.fillRect(px, oy, pw, 13);
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 1; ctx.strokeRect(px + 0.5, oy + 0.5, pw - 1, 12);
        txt((on ? '> ' : '  ') + o.t, px + 6, oy + 7, 9, on ? '#fff' : '#ccc', 'left');
        choiceRects.push([px, oy, pw, 13]);
      });
      txt(touch ? 'LEFT/RIGHT choose · JUMP pick' : 'Up/Down choose · Space pick (or click)', tbx + 60, tby + bh - 7, 7, '#aaa', 'left');
    } else {
      if (!typing && Math.floor(time * 3) % 2) txt('>', tbx + bw - 10, tby + bh - 9, 10, '#ffe066');
      txt(touch ? 'JUMP next · DASH skip' : 'Space next · Shift skip', tbx + 60, tby + bh - 7, 7, '#888', 'left');
    }
  }
  if (state === 'select') {
    ctx.fillStyle = 'rgba(10,12,40,.85)'; ctx.fillRect(0, 0, VW, SH);
    const top = Math.max(34, cy - 70);
    txt('DAYDREAM', VW / 2, top, 16, '#ffd23f');
    SEL_ROWS.forEach((name, i) => {
      const y = top + 20 + i * 12, on = i === sel.row;
      if (on) { ctx.fillStyle = 'rgba(255,255,255,.15)'; ctx.fillRect(VW / 2 - 102, y - 6, 204, 12); }
      if (i === SEL_ROWS.length - 1) { txt(on ? '> START! <' : 'START!', VW / 2, y, 10, on ? '#7ed957' : '#fff'); return; }
      txt(name, VW / 2 - 96, y, 8, on ? '#fff' : '#bbb', 'left');
      txt((on ? '< ' : '') + selVal(i) + (on ? ' >' : ''), VW / 2 + 96, y, 8, on ? '#ffe066' : '#ddd', 'right');
    });
    const hy = top + 20 + SEL_ROWS.length * 12 + 2;
    txt(touch ? 'DOWN row · LEFT/RIGHT change · DASH +10 · FIRE -10 · JUMP start' : 'Up/Down row · Left/Right change · Shift +10 · F -10 · Enter start · Esc back', VW / 2, hy, 7, '#aaa');
  }
}

/* ---------- input ---------- */
function press(k) {
  initAudio();
  held[k] = 1;
  if (k === 'jump') jb = 0.15;
  if (k === 'dash') db = 0.15;
  if (k === 'down') dnb = 0.25;
  if (k === 'fire') fb = 0.15;
}
const KM = { ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right', Space: 'jump', ArrowUp: 'jump', KeyW: 'jump', KeyZ: 'jump', KeyK: 'jump', Enter: 'jump', ShiftLeft: 'dash', ShiftRight: 'dash', KeyX: 'dash', KeyJ: 'dash', ArrowDown: 'down', KeyS: 'down', KeyF: 'fire', KeyC: 'fire', KeyL: 'fire' };
const SK = { ArrowUp: 'up', KeyW: 'up', ArrowDown: 'down', KeyS: 'down', ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right', ShiftLeft: 'dash', ShiftRight: 'dash', KeyX: 'dash', KeyF: 'fire', KeyC: 'fire', Enter: 'jump', Space: 'jump', Escape: 'back', KeyP: 'back' };
addEventListener('keydown', e => {
  if (e.code === 'KeyM') { if (!e.repeat) toggleMute(); return; }
  if (state === 'talk') {
    const c = e.code;
    if ((c === 'ArrowUp' || c === 'KeyW' || c === 'ArrowLeft' || c === 'KeyA') && talkMove(-1)) { e.preventDefault(); return; }
    if ((c === 'ArrowDown' || c === 'KeyS' || c === 'ArrowRight' || c === 'KeyD') && talkMove(1)) { e.preventDefault(); return; }
    const tk = c === 'Escape' ? 'dash' : KM[c];
    if (!tk) return;
    e.preventDefault(); initAudio();
    if (tk === 'jump') { if (!e.repeat) talkAdv = true; }
    else if (tk === 'dash') { if (!e.repeat) talkSkip = true; }
    else held[tk] = 1;
    return;
  }
  if (state === 'select') {
    const sk = SK[e.code];
    if (sk) { e.preventDefault(); initAudio(); selectInput(sk); }
    return;
  }
  if (e.code === 'KeyP' && (state === 'title' || state === 'over')) { e.preventDefault(); if (!e.repeat) { initAudio(); openSelect(); } return; }
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
  if (state === 'select') return;
  if (state === 'talk') {
    choiceRects.forEach((r, i) => { if (lx >= r[0] && lx <= r[0] + r[2] && ly >= r[1] && ly <= r[1] + r[3] && talkChoosing()) talk.sel = i; });
    talkAdv = true; return;
  }
  if ((state === 'title' || state === 'over') && lx < 70 && ly < 32) {
    if (time - secretT > 2) secretTaps = 0;
    secretT = time; secretTaps++;
    if (secretTaps >= 5) { secretTaps = 0; openSelect(); }
    return;
  }
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
    setTouch();
    if (state === 'select') { initAudio(); selectInput(k); }
    else if (state === 'talk') { initAudio(); if ((k === 'left' && talkMove(-1)) || ((k === 'right' || k === 'down') && talkMove(1))) {} else if (k === 'jump') talkAdv = true; else if (k === 'dash') talkSkip = true; else held[k] = 1; }
    else {
      press(k);
      if (state === 'title' || state === 'over') startReq = true;
    }
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
loadGame();
gen(world);
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
