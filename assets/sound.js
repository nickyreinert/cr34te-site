(function (root) {
'use strict';
// Spherical, melancholic ambient music, synthesised live. No audio files.
var A = null, master, dry, wet, on = true, vol = 1, scene = null, nextChord = 0, nextBell = 0, nextTick = 0, chord = 0, prog = null, wind = null, drone = null, failed = false;
var MODES = { aeolisch: [0, 2, 3, 5, 7, 8, 10], dorisch: [0, 2, 3, 5, 7, 9, 10], phrygisch: [0, 1, 3, 5, 7, 8, 10] };
var PROGS = [[0, 5, 3, 6], [0, 3, 5, 4], [0, 6, 5, 3], [0, 4, 5, 3], [5, 3, 0, 6]];

function hz(m) { return 440 * Math.pow(2, (m - 69) / 12); }
function rng(seed) { var s = seed >>> 0; return function () { s = (s + 0x6D2B79F5) | 0; var t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function noiseBuf(sec) { var n = A.sampleRate * sec, b = A.createBuffer(1, n, A.sampleRate), d = b.getChannelData(0); for (var i = 0; i < n; i++) d[i] = Math.random() * 2 - 1; return b; }
function impulse(sec) {
var n = Math.floor(A.sampleRate * sec), b = A.createBuffer(2, n, A.sampleRate);
for (var c = 0; c < 2; c++) { var d = b.getChannelData(c); for (var i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 2.8); }
return b;
}
function init() {
if (A || failed) return;
try { A = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { failed = true; return; }
var comp = A.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 4; comp.connect(A.destination);
master = A.createGain(); master.gain.value = 0; master.connect(comp);
var rev = A.createConvolver(); rev.buffer = impulse(5);
wet = A.createGain(); wet.gain.value = 0.9; wet.connect(rev); var rg = A.createGain(); rg.gain.value = 0.9; rev.connect(rg); rg.connect(master);
dry = A.createGain(); dry.gain.value = 0.7; dry.connect(master);
setOn(on);
}
function resume() { init(); if (A && A.state === 'suspended') A.resume(); if (A && scene && !scene.key) { var s0 = scene; scene = null; setScene(s0); } }
function setOn(v) { on = v; if (!A) return; master.gain.cancelScheduledValues(A.currentTime); master.gain.setTargetAtTime(on ? vol : 0, A.currentTime, 0.8); }
function out(node, wetAmt) { var g1 = A.createGain(), g2 = A.createGain(); g1.gain.value = 1 - wetAmt; g2.gain.value = wetAmt; node.connect(g1); node.connect(g2); g1.connect(dry); g2.connect(wet); }

// ---------- voices ----------
function pad(m, t, dur, bright, level) {
var f = A.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 500 + bright * 900; f.Q.value = 0.6;
var g = A.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(level, t + dur * 0.35); g.gain.setValueAtTime(level, t + dur * 0.6); g.gain.linearRampToValueAtTime(0, t + dur);
[-7, 0, 7].forEach(function (cents, i) { var o = A.createOscillator(); o.type = i === 1 ? 'triangle' : 'sawtooth'; o.frequency.value = hz(m); o.detune.value = cents; var og = A.createGain(); og.gain.value = i === 1 ? 0.5 : 0.18; o.connect(og); og.connect(f); o.start(t); o.stop(t + dur + 0.1); });
f.connect(g); out(g, 0.6);
}
function bell(m, t, level) {
var c = A.createOscillator(), mo = A.createOscillator(), mg = A.createGain(), g = A.createGain();
c.frequency.value = hz(m); mo.frequency.value = hz(m) * 3.5; mg.gain.setValueAtTime(hz(m) * 2, t); mg.gain.exponentialRampToValueAtTime(1, t + 2.5);
mo.connect(mg); mg.connect(c.frequency);
g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(level, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + 4);
c.connect(g); out(g, 0.8); c.start(t); mo.start(t); c.stop(t + 4.2); mo.stop(t + 4.2);
}
function box(m, t, level) { // music box note
var o = A.createOscillator(), o2 = A.createOscillator(), g = A.createGain();
o.type = 'sine'; o2.type = 'triangle'; o.frequency.value = hz(m); o2.frequency.value = hz(m) * 2.01;
var g2 = A.createGain(); g2.gain.value = 0.25; o2.connect(g2); g2.connect(g); o.connect(g);
g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(level, t + 0.005); g.gain.exponentialRampToValueAtTime(0.0001, t + 1.6);
out(g, 0.5); o.start(t); o2.start(t); o.stop(t + 1.7); o2.stop(t + 1.7);
}
function tick(t, level, freq) { var s = A.createBufferSource(); s.buffer = noiseBuf(0.05); var f = A.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = freq || 2400; f.Q.value = 8; var g = A.createGain(); g.gain.setValueAtTime(level, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.05); s.connect(f); f.connect(g); out(g, 0.7); s.start(t); }
function stopNode(n) { if (!n) return; try { n.g.gain.setTargetAtTime(0, A.currentTime, 1.2); var s = n.src; setTimeout(function () { try { s.stop(); } catch (e) { } }, 5000); } catch (e) { } }
function startWind(level, freq) {
var s = A.createBufferSource(); s.buffer = noiseBuf(4); s.loop = true;
var f = A.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = 0.9;
var lfo = A.createOscillator(), lg = A.createGain(); lfo.frequency.value = 0.07; lg.gain.value = freq * 0.5; lfo.connect(lg); lg.connect(f.frequency); lfo.start();
var g = A.createGain(); g.gain.value = 0; g.gain.setTargetAtTime(level, A.currentTime, 2);
s.connect(f); f.connect(g); out(g, 0.3); s.start();
return { src: s, g: g };
}
function startDrone(m, level) {
var o = A.createOscillator(); o.type = 'sine'; o.frequency.value = hz(m);
var lfo = A.createOscillator(), lg = A.createGain(); lfo.frequency.value = 0.05; lg.gain.value = 3; lfo.connect(lg); lg.connect(o.frequency); lfo.start();
var g = A.createGain(); g.gain.value = 0; g.gain.setTargetAtTime(level, A.currentTime, 3);
o.connect(g); out(g, 0.5); o.start();
return { src: o, g: g };
}

// ---------- scenes ----------
function setScene(sc) {
if (!A) { scene = sc; return; }
var key = sc.kind + ':' + sc.seed + ':' + (sc.weather || '');
if (scene && scene.key === key) return;
sc.key = key; scene = sc;
var r = rng(sc.seed || 1), modeNames = Object.keys(MODES);
var mode = MODES[sc.star === 'loch' ? 'phrygisch' : modeNames[Math.floor(r() * 2)]];
var root = 45 + Math.floor(r() * 7) - (sc.star === 'rot' ? 3 : 0) + (sc.star === 'blau' ? 3 : 0);
prog = { mode: mode, root: root, seq: PROGS[Math.floor(r() * PROGS.length)], bright: sc.star === 'blau' ? 0.9 : sc.star === 'rot' ? 0.25 : sc.kind === 'planet' ? 0.35 : 0.55, len: sc.kind === 'title' ? 11 : 9 };
chord = 0; nextChord = A.currentTime + 0.5; nextBell = A.currentTime + 4;
stopNode(wind); wind = null; stopNode(drone); drone = null;
if (sc.kind === 'planet') wind = startWind(sc.weather === 'sand' || sc.weather === 'asche' ? 0.4 : 0.22, sc.weather === 'regen' ? 1800 : 500);
if (sc.star === 'loch') drone = startDrone(33, 0.5);
}
function note(deg, oct) { var m = prog.mode, d = ((deg % 7) + 7) % 7, o = Math.floor(deg / 7); return prog.root + m[d] + 12 * (o + (oct || 0)); }
function update() {
if (!A || !on || !scene || !prog || A.state !== 'running') return;
var t = A.currentTime;
if (t >= nextChord) {
var deg = prog.seq[chord % prog.seq.length], L = prog.len;
[0, 2, 4].forEach(function (k, i) { pad(note(deg + k, 0), nextChord, L + 2, prog.bright, 0.3); });
pad(note(deg, -1), nextChord, L + 2, prog.bright * 0.5, 0.34);
chord++; nextChord += L;
}
if (t >= nextBell) { var r = Math.random(); bell(note([0, 2, 4, 6, 7][Math.floor(r * 5)], 2), nextBell, 0.12); nextBell += 4 + Math.random() * 7; }
if (scene.star === 'pulsar' && scene.kind === 'space') { if (t >= nextTick) { tick(nextTick, 0.3, 1800); nextTick = Math.max(nextTick + 0.75, t); } }
else nextTick = t;
}

// ---------- themes and effects ----------
var LENA = [[76, 0], [79, 0.45], [81, 0.9], [83, 1.35], [81, 2.0], [79, 2.45], [76, 2.9], [74, 3.6], [76, 4.2]];
function lena(chapter) {
resume(); if (!A || !on) return;
var t = A.currentTime + 0.2, slow = 1 + (chapter || 1) * 0.08;
LENA.forEach(function (n) { box(n[0], t + n[1] * slow, 0.28); });
if (chapter >= 3) LENA.forEach(function (n, i) { if (i % 3 === 0) box(n[0] - 12, t + n[1] * slow, 0.16); });
if (chapter >= 4) pad(64, t, 6 * slow, 0.4, 0.15);
}
function sfx(k) {
if (!A || !on) return;
var t = A.currentTime;
if (k === 'scan') { box(88, t, 0.16); box(93, t + 0.12, 0.16); }
else if (k === 'mine') { tick(t, 0.4, 900); tick(t + 0.09, 0.3, 1300); }
else if (k === 'dock') { bell(72, t, 0.18); bell(79, t + 0.25, 0.15); }
else if (k === 'jump') {
var s = A.createBufferSource(); s.buffer = noiseBuf(2.6); var f = A.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = 2; f.frequency.setValueAtTime(200, t); f.frequency.exponentialRampToValueAtTime(3000, t + 2.2);
var g = A.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.6, t + 1.2); g.gain.exponentialRampToValueAtTime(0.0001, t + 2.5);
s.connect(f); f.connect(g); out(g, 0.6); s.start(t);
}
}

root.Sound = { resume: resume, setOn: setOn, scene: setScene, update: update, lena: lena, sfx: sfx, isOn: function () { return on; } };
})(window);
