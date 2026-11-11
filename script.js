(() => {
  'use strict';

  const STEPS = 16;
  const MAX_PATTERNS = 8;
  const STORE_KEY = 'tracker-v1';
  const LOOKAHEAD = 0.15;

  // Spuren: h = Harmonie, b = Bass, k = Kick, s = Snare, x = Hi-Hat
  const TRACKS = [
    { key: 'h', name: 'Harmonie' },
    { key: 'b', name: 'Bass' },
    { key: 'k', name: 'Kick' },
    { key: 's', name: 'Snare' },
    { key: 'x', name: 'Hi-Hat' }
  ];

  const NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const BASE = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

  const midi = name => {
    const m = /^([A-G])(#?)(\d)$/.exec(name);
    return m ? 12 * (Number(m[3]) + 1) + BASE[m[1]] + (m[2] ? 1 : 0) : NaN;
  };
  const freq = m => 440 * Math.pow(2, (m - 69) / 12);

  // Akkord- und Tonvorrat: id -> Liste von MIDI-Noten
  const CHORDS = new Map();
  const GROUPS = { Dur: [], Moll: [], Einzeltöne: [] };
  NAMES.forEach((n, i) => {
    const root = 48 + i;
    const major = n;
    const minor = n + 'm';
    // offene Lage: Grundton, Quinte, Terz eine Oktave höher
    CHORDS.set(major, [root, root + 7, root + 12 + 4]);
    CHORDS.set(minor, [root, root + 7, root + 12 + 3]);
    GROUPS.Dur.push(major);
    GROUPS.Moll.push(minor);
  });
  for (let o = 4; o <= 6; o++) {
    NAMES.forEach(n => {
      CHORDS.set(n + o, [midi(n + o)]);
      GROUPS.Einzeltöne.push(n + o);
    });
  }

  const BASS_NOTES = [];
  for (let o = 1; o <= 2; o++) NAMES.forEach(n => BASS_NOTES.push(n + o));

  const sparse = map => Array.from({ length: STEPS }, (_, i) => (i in map ? map[i] : null));

  const PRESETS = [
    {
      name: 'One Way (Kanye West)',
      h: ['E6', 'E6', 'E6', 'E5', 'D#6', 'D#6', 'D#6', 'D#5', 'C#6', 'C#6', 'C#6', 'C#5', 'A5', 'A5', 'G#5', 'E5'],
      b: sparse({ 0: 'E2', 4: 'D#2', 8: 'C#2', 12: 'A1' })
    },
    {
      name: 'Für Elise (Anfang)',
      h: ['E5', 'D#5', 'E5', 'D#5', 'E5', 'B4', 'D5', 'C5', 'A4', null, 'C4', 'E4', 'A4', 'B4', null, null],
      b: sparse({})
    },
    { name: 'Let It Be: C G Am F', h: sparse({ 0: 'C', 4: 'G', 8: 'Am', 12: 'F' }), b: sparse({}) },
    { name: 'Stand By Me: C Am F G', h: sparse({ 0: 'C', 4: 'Am', 8: 'F', 12: 'G' }), b: sparse({}) },
    { name: 'Pop-Axis: Am F C G', h: sparse({ 0: 'Am', 4: 'F', 8: 'C', 12: 'G' }), b: sparse({}) }
  ];

  // ---------- Zustand ----------

  const blank = () => ({
    h: sparse({}),
    b: sparse({}),
    k: Array(STEPS).fill(false),
    s: Array(STEPS).fill(false),
    x: Array(STEPS).fill(false)
  });

  const fromPreset = p => Object.assign(blank(), { h: p.h.slice(), b: p.b.slice() });

  const defaults = () => ({ bpm: 90, patterns: [fromPreset(PRESETS[0])] });

  const validPattern = p =>
    Boolean(p) &&
    TRACKS.every(t => Array.isArray(p[t.key]) && p[t.key].length === STEPS) &&
    p.h.every(v => v === null || CHORDS.has(v)) &&
    p.b.every(v => v === null || Number.isFinite(midi(v))) &&
    ['k', 's', 'x'].every(k => p[k].every(v => typeof v === 'boolean'));

  const load = () => {
    try {
      const d = JSON.parse(localStorage.getItem(STORE_KEY));
      if (
        d &&
        Number.isFinite(d.bpm) && d.bpm >= 50 && d.bpm <= 200 &&
        Array.isArray(d.patterns) && d.patterns.length >= 1 && d.patterns.length <= MAX_PATTERNS &&
        d.patterns.every(validPattern)
      ) return d;
    } catch (e) {
      // Speicher leer oder blockiert: Standardwerte verwenden
    }
    return defaults();
  };

  const state = load();

  const save = () => {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(state));
    } catch (e) {
      // Speicher nicht verfuegbar: Stand bleibt nur im Arbeitsspeicher
    }
  };

  // ---------- Klangerzeugung ----------

  const noiseBuffer = c => {
    const buf = c.createBuffer(1, c.sampleRate, c.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    return buf;
  };

  // Synthetischer Raumhall: abklingendes Rauschen als Impulsantwort
  const impulse = c => {
    const len = Math.floor(c.sampleRate * 1.4);
    const buf = c.createBuffer(2, len, c.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = buf.getChannelData(ch);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.5);
    }
    return buf;
  };

  const makeBus = c => {
    const comp = c.createDynamicsCompressor();
    const master = c.createGain();
    master.gain.value = 0.8;
    comp.connect(master);
    master.connect(c.destination);

    const conv = c.createConvolver();
    conv.buffer = impulse(c);
    const wet = c.createGain();
    wet.gain.value = 0.25;
    conv.connect(wet);
    wet.connect(comp);

    const piano = c.createGain();
    piano.connect(comp);
    piano.connect(conv);

    const kit = c.createGain();
    kit.connect(comp);

    return { piano, kit, noise: noiseBuffer(c) };
  };

  // Klavier: Obertonreihe mit leichter Unharmonizitaet, pro Oberton eigene
  // Abklingzeit, verstimmte Doppelsaiten, Hammergeraeusch, Klangfarbe dunkelt ab
  const piano = (c, bus, m, t, level) => {
    const f0 = freq(m);
    const decay = Math.min(3, Math.max(0.5, 2.2 * Math.pow(2, -(m - 60) / 24)));
    const inharm = 0.00015 * Math.pow(2, (60 - m) / -18);

    const out = c.createGain();
    out.gain.value = level;
    const lp = c.createBiquadFilter();
    lp.type = 'lowpass';
    lp.Q.value = 0.5;
    lp.frequency.setValueAtTime(Math.min(f0 * 14, 14000), t);
    lp.frequency.exponentialRampToValueAtTime(Math.max(f0 * 3, 500), t + decay);
    out.connect(lp);
    lp.connect(bus.piano);

    for (let n = 1; n <= 10; n++) {
      const f = n * f0 * Math.sqrt(1 + inharm * n * n);
      if (f > 12000) break;
      const tc = (decay * 0.35) / (1 + 0.4 * (n - 1));
      const detunes = n <= 3 ? [-1.2, 1.2] : [0];
      const amp = (Math.pow(n, -1.15) * (n <= 3 ? 0.6 : 1));
      detunes.forEach(cents => {
        const o = c.createOscillator();
        o.frequency.value = f;
        o.detune.value = cents;
        const g = c.createGain();
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(amp, t + 0.004);
        g.gain.setTargetAtTime(0, t + 0.004, tc * (cents > 0 ? 1.15 : 1));
        o.connect(g);
        g.connect(out);
        o.start(t);
        o.stop(t + tc * 8);
      });
    }

    const src = c.createBufferSource();
    src.buffer = bus.noise;
    const bp = c.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = Math.min(f0 * 4, 6000);
    bp.Q.value = 1;
    const ng = c.createGain();
    ng.gain.setValueAtTime(0.35, t);
    ng.gain.exponentialRampToValueAtTime(0.001, t + 0.03);
    src.connect(bp);
    bp.connect(ng);
    ng.connect(out);
    src.start(t, Math.random() * 0.5);
    src.stop(t + 0.04);
  };

  const bass = (c, bus, m, t) => {
    const f = freq(m);
    const lp = c.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(900, t);
    lp.frequency.exponentialRampToValueAtTime(200, t + 0.4);
    const g = c.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.5, t + 0.01);
    g.gain.setTargetAtTime(0, t + 0.01, 0.25);
    lp.connect(g);
    g.connect(bus.kit);
    [['sawtooth', 0.35], ['sine', 0.7]].forEach(([type, level]) => {
      const o = c.createOscillator();
      o.type = type;
      o.frequency.value = f;
      const og = c.createGain();
      og.gain.value = level;
      o.connect(og);
      og.connect(lp);
      o.start(t);
      o.stop(t + 1.6);
    });
  };

  const kick = (c, bus, t) => {
    const o = c.createOscillator();
    const g = c.createGain();
    o.frequency.setValueAtTime(160, t);
    o.frequency.exponentialRampToValueAtTime(45, t + 0.12);
    g.gain.setValueAtTime(1, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
    o.connect(g);
    g.connect(bus.kit);
    o.start(t);
    o.stop(t + 0.41);
  };

  const noiseHit = (c, bus, t, type, f, gain, dur) => {
    const src = c.createBufferSource();
    src.buffer = bus.noise;
    const filt = c.createBiquadFilter();
    filt.type = type;
    filt.frequency.value = f;
    const g = c.createGain();
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    src.connect(filt);
    filt.connect(g);
    g.connect(bus.kit);
    src.start(t, Math.random() * 0.5);
    src.stop(t + dur);
  };

  const snare = (c, bus, t) => {
    noiseHit(c, bus, t, 'highpass', 1500, 0.5, 0.18);
    const o = c.createOscillator();
    o.type = 'triangle';
    o.frequency.setValueAtTime(190, t);
    o.frequency.exponentialRampToValueAtTime(120, t + 0.08);
    const g = c.createGain();
    g.gain.setValueAtTime(0.5, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
    o.connect(g);
    g.connect(bus.kit);
    o.start(t);
    o.stop(t + 0.11);
  };

  const hat = (c, bus, t) => noiseHit(c, bus, t, 'highpass', 7500, 0.25, 0.05);

  const scheduleStep = (c, bus, t, pat, s) => {
    const chord = pat.h[s];
    if (chord !== null) {
      const notes = CHORDS.get(chord);
      notes.forEach(m => piano(c, bus, m, t, 0.3 / Math.sqrt(notes.length)));
    }
    if (pat.b[s] !== null) bass(c, bus, midi(pat.b[s]), t);
    if (pat.k[s]) kick(c, bus, t);
    if (pat.s[s]) snare(c, bus, t);
    if (pat.x[s]) hat(c, bus, t);
  };

  const stepDur = () => 60 / state.bpm / 4;

  // ---------- Wiedergabe ----------

  const playBtn = document.getElementById('play');
  const wavBtn = document.getElementById('wav');
  const bpmEl = document.getElementById('bpm');
  const bpmOut = document.getElementById('bpmOut');
  const tabs = document.getElementById('tabs');
  const addBtn = document.getElementById('addPat');
  const delBtn = document.getElementById('delPat');
  const presetSel = document.getElementById('preset');
  const loadBtn = document.getElementById('load');
  const chordSel = document.getElementById('chord');
  const bassSel = document.getElementById('bassNote');
  const grid = document.getElementById('grid');

  let ctx = null;
  let bus = null;
  let timer = null; // null = gestoppt
  let raf = 0;
  let nextTime = 0;
  let cursor = { p: 0, s: 0 };
  let queue = [];
  let lit = null;
  let litEls = [];
  let cells = [];
  let view = 0;

  const tick = () => {
    if (nextTime < ctx.currentTime) nextTime = ctx.currentTime + 0.02;
    while (nextTime < ctx.currentTime + LOOKAHEAD) {
      if (cursor.p >= state.patterns.length) cursor.p = 0;
      scheduleStep(ctx, bus, nextTime, state.patterns[cursor.p], cursor.s);
      queue.push({ t: nextTime, p: cursor.p, s: cursor.s });
      nextTime += stepDur();
      cursor.s += 1;
      if (cursor.s === STEPS) {
        cursor.s = 0;
        cursor.p = (cursor.p + 1) % state.patterns.length;
      }
    }
  };

  const paintNow = () => {
    litEls.forEach(el => el.classList.remove('now'));
    litEls = [];
    if (lit !== null && lit.p === view) {
      litEls = cells[lit.s];
      litEls.forEach(el => el.classList.add('now'));
    }
  };

  const frame = () => {
    while (queue.length && queue[0].t <= ctx.currentTime) lit = queue.shift();
    paintNow();
    raf = requestAnimationFrame(frame);
  };

  const syncPlay = () => {
    playBtn.textContent = timer === null ? 'Play' : 'Stop';
  };

  const start = () => {
    if (ctx === null) {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      bus = makeBus(ctx);
    }
    ctx.resume();
    cursor = { p: view, s: 0 };
    queue = [];
    lit = null;
    nextTime = ctx.currentTime + 0.08;
    timer = setInterval(tick, 25);
    tick();
    raf = requestAnimationFrame(frame);
    syncPlay();
  };

  const stop = () => {
    clearInterval(timer);
    timer = null;
    cancelAnimationFrame(raf);
    queue = [];
    lit = null;
    paintNow();
    syncPlay();
  };

  playBtn.addEventListener('click', () => (timer === null ? start() : stop()));

  // ---------- WAV-Export ----------

  const encodeWav = buf => {
    const ch = buf.numberOfChannels;
    const len = buf.length;
    const sr = buf.sampleRate;
    const view16 = new DataView(new ArrayBuffer(44 + len * ch * 2));
    const text = (o, s) => {
      for (let i = 0; i < s.length; i++) view16.setUint8(o + i, s.charCodeAt(i));
    };
    text(0, 'RIFF');
    view16.setUint32(4, 36 + len * ch * 2, true);
    text(8, 'WAVE');
    text(12, 'fmt ');
    view16.setUint32(16, 16, true);
    view16.setUint16(20, 1, true);
    view16.setUint16(22, ch, true);
    view16.setUint32(24, sr, true);
    view16.setUint32(28, sr * ch * 2, true);
    view16.setUint16(32, ch * 2, true);
    view16.setUint16(34, 16, true);
    text(36, 'data');
    view16.setUint32(40, len * ch * 2, true);
    const chans = [];
    for (let c = 0; c < ch; c++) chans.push(buf.getChannelData(c));
    let o = 44;
    for (let i = 0; i < len; i++) {
      for (let c = 0; c < ch; c++) {
        const v = Math.max(-1, Math.min(1, chans[c][i]));
        view16.setInt16(o, v < 0 ? v * 0x8000 : v * 0x7fff, true);
        o += 2;
      }
    }
    return new Blob([view16], { type: 'audio/wav' });
  };

  const exportWav = async () => {
    wavBtn.disabled = true;
    try {
      const sr = 44100;
      const sd = stepDur();
      const total = state.patterns.length * STEPS * sd;
      const off = new OfflineAudioContext(2, Math.ceil((total + 3) * sr), sr);
      const offBus = makeBus(off);
      state.patterns.forEach((pat, pi) => {
        for (let s = 0; s < STEPS; s++) scheduleStep(off, offBus, 0.05 + (pi * STEPS + s) * sd, pat, s);
      });
      const rendered = await off.startRendering();
      const url = URL.createObjectURL(encodeWav(rendered));
      const a = document.createElement('a');
      a.href = url;
      a.download = 'tracker.wav';
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 10000);
    } finally {
      wavBtn.disabled = false;
    }
  };

  wavBtn.addEventListener('click', exportWav);

  // ---------- Bedienung ----------

  const paintCell = el => {
    const v = state.patterns[view][el.dataset.t][Number(el.dataset.s)];
    el.classList.toggle('on', Boolean(v));
    el.textContent = typeof v === 'string' ? v : '';
  };

  const renderGrid = () => {
    grid.replaceChildren();
    cells = Array.from({ length: STEPS }, () => []);
    litEls = [];
    TRACKS.forEach(tr => {
      const name = document.createElement('div');
      name.className = 'name';
      name.textContent = tr.name;
      grid.appendChild(name);
      for (let s = 0; s < STEPS; s++) {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = s % 4 === 0 ? 'cell beat' : 'cell';
        b.dataset.t = tr.key;
        b.dataset.s = String(s);
        paintCell(b);
        grid.appendChild(b);
        cells[s].push(b);
      }
    });
    paintNow();
  };

  const renderTabs = () => {
    tabs.replaceChildren();
    state.patterns.forEach((_, i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = String(i + 1);
      b.dataset.i = String(i);
      b.classList.toggle('active', i === view);
      tabs.appendChild(b);
    });
    addBtn.disabled = state.patterns.length >= MAX_PATTERNS;
    delBtn.disabled = state.patterns.length <= 1;
  };

  grid.addEventListener('click', e => {
    const el = e.target.closest('.cell');
    if (!el) return;
    const t = el.dataset.t;
    const s = Number(el.dataset.s);
    const pat = state.patterns[view];
    if (t === 'h' || t === 'b') {
      const brush = (t === 'h' ? chordSel : bassSel).value;
      pat[t][s] = pat[t][s] === brush ? null : brush;
    } else {
      pat[t][s] = !pat[t][s];
    }
    paintCell(el);
    save();
  });

  tabs.addEventListener('click', e => {
    const b = e.target.closest('button');
    if (!b) return;
    view = Number(b.dataset.i);
    renderTabs();
    renderGrid();
  });

  addBtn.addEventListener('click', () => {
    if (state.patterns.length >= MAX_PATTERNS) return;
    state.patterns.push(blank());
    view = state.patterns.length - 1;
    save();
    renderTabs();
    renderGrid();
  });

  delBtn.addEventListener('click', () => {
    if (state.patterns.length <= 1) return;
    state.patterns.splice(view, 1);
    view = Math.min(view, state.patterns.length - 1);
    save();
    renderTabs();
    renderGrid();
  });

  loadBtn.addEventListener('click', () => {
    const p = PRESETS[Number(presetSel.value)];
    const pat = state.patterns[view];
    pat.h = p.h.slice();
    pat.b = p.b.slice();
    save();
    renderGrid();
  });

  bpmEl.addEventListener('input', () => {
    state.bpm = Number(bpmEl.value);
    bpmOut.textContent = String(state.bpm);
    save();
  });

  // ---------- Start ----------

  const option = (parent, value, label) => {
    const o = document.createElement('option');
    o.value = value;
    o.textContent = label;
    parent.appendChild(o);
  };

  PRESETS.forEach((p, i) => option(presetSel, String(i), p.name));
  Object.keys(GROUPS).forEach(name => {
    const g = document.createElement('optgroup');
    g.label = name;
    GROUPS[name].forEach(id => option(g, id, id));
    chordSel.appendChild(g);
  });
  BASS_NOTES.forEach(n => option(bassSel, n, n));
  chordSel.value = 'C';
  bassSel.value = 'E2';

  bpmEl.value = String(state.bpm);
  bpmOut.textContent = String(state.bpm);
  syncPlay();
  renderTabs();
  renderGrid();
})();
