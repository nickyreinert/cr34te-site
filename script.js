// Brick Dino: drop bricks, then remove same-colored groups for points. Reach the round target to pick an upgrade; a dino eats whatever is left.
(function () {
  'use strict';

  var COLS = 12;          // studs across the build area
  var ROWS = 11;          // max brick rows in the pile
  var BATCH = 4;          // bricks dropped per build tap
  var ASPECT = 1.2;       // brick height relative to one stud width
  var WIDTHS = [1, 2, 2, 2, 3, 4];
  var FALL_G = 70;        // gravity for falling bricks, rows per second squared
  var DEBRIS_G = 50;      // gravity for flying bricks, studs per second squared
  var SCALE = [0, 2, 4, 7, 9];  // pentatonic semitone steps for group notes
  var DINO_SPEED = 8;     // studs per second
  var DINO_BOOST = 24;    // studs per second after a tap
  var DINO_LEN = 3.4;     // studs from the dino's origin to its mouth
  var PALETTE = [
    { base: '#d01012', light: '#ee4a4c', dark: '#8a0a0c' },
    { base: '#0055bf', light: '#3f85e0', dark: '#003a85' },
    { base: '#f2cd37', light: '#fae27a', dark: '#b8960f' },
    { base: '#237841', light: '#4da56a', dark: '#154d29' },
    { base: '#923978', light: '#bf6aa3', dark: '#62214f' }
  ];
  var WILD_PAL = { base: '#f2f3f2', light: '#ffffff', dark: '#a9adaa' };

  var stage = document.getElementById('stage');
  var canvas = document.getElementById('view');
  var ctx = canvas.getContext('2d');

  // Bricks in the pile or still falling: { col, w, row, y, vy, delay, ci, wild, pal }
  var bricks = [];
  var debris = [];  // flying bricks: { x, y, n, pal, a, vx, vy, spin }
  var popups = [];  // floating text: { s, x, y, life, size, color }
  var tops = [];    // number of filled rows per column
  var choices = []; // upgrade options while the pick screen is open
  var dino = null;  // set while the dino runs: { x, mouth, boost }
  var lost = false;

  // Run and round state, set by newGame and startRound
  var level = 1;
  var bestLevel = 0;  // session best, kept in memory only because storage is blocked
  var roundScore = 0;
  var target = 0;
  var buildTaps = 5;
  var removeTaps = 5;
  var buildLeft = 0;
  var removeLeft = 0;
  var colorCount = 5;
  var uniform = false;
  var wildChance = 0;
  var sweepLevel = 0;
  var sweepsLeft = 0;

  var view = { w: 0, h: 0, u: 0, bh: 0, ox: 0, floorY: 0, plate: 0 };
  var last = null;
  var clock = 0;

  for (var i = 0; i < COLS; i++) {
    tops.push(0);
  }

  // Upgrades offered after a cleared round
  var UPGRADES = [
    {
      name: 'Color focus',
      desc: 'One color fewer in the drops',
      ok: function () { return colorCount > 2; },
      apply: function () { colorCount--; }
    },
    {
      name: 'Uniform',
      desc: 'Each drop uses one brick width',
      ok: function () { return !uniform; },
      apply: function () { uniform = true; }
    },
    {
      name: 'Wild bricks',
      desc: 'Rainbow bricks connect to anything',
      ok: function () { return wildChance < 0.4; },
      apply: function () { wildChance += 0.1; }
    },
    {
      name: 'Extra drop',
      desc: '+1 drop tap every round',
      ok: function () { return true; },
      apply: function () { buildTaps++; }
    },
    {
      name: 'Extra removal',
      desc: '+1 removal tap every round',
      ok: function () { return true; },
      apply: function () { removeTaps++; }
    },
    {
      name: 'Color sweep',
      desc: 'First removal each round takes a color',
      ok: function () { return sweepLevel < 3; },
      apply: function () { sweepLevel++; }
    }
  ];

  function rand(n) {
    return Math.floor(Math.random() * n);
  }

  var audio = null;  // created on the first tap because browsers require a user gesture
  var noise = null;  // one second of white noise reused for clacks and chomps

  function initAudio() {
    if (audio) {
      if (audio.state === 'suspended') {
        audio.resume();
      }
      return;
    }
    var Ctor = window.AudioContext || window.webkitAudioContext;
    if (!Ctor) {
      return;
    }
    audio = new Ctor();
    noise = audio.createBuffer(1, audio.sampleRate, audio.sampleRate);
    var data = noise.getChannelData(0);
    for (var n = 0; n < data.length; n++) {
      data[n] = Math.random() * 2 - 1;
    }
  }

  // Sine blip that sweeps from one pitch to another while fading out; "at" delays the start in seconds
  function blip(from, to, dur, vol, at) {
    var t = audio.currentTime + (at || 0);
    var osc = audio.createOscillator();
    var g = audio.createGain();
    osc.frequency.setValueAtTime(from, t);
    osc.frequency.exponentialRampToValueAtTime(to, t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    osc.connect(g);
    g.connect(audio.destination);
    osc.start(t);
    osc.stop(t + dur);
  }

  // Filtered noise burst; the filter cutoff sweeps while the volume fades out
  function burst(type, from, to, dur, vol) {
    var t = audio.currentTime;
    var src = audio.createBufferSource();
    var f = audio.createBiquadFilter();
    var g = audio.createGain();
    src.buffer = noise;
    f.type = type;
    f.frequency.setValueAtTime(from, t);
    f.frequency.exponentialRampToValueAtTime(to, t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    src.connect(f);
    f.connect(g);
    g.connect(audio.destination);
    src.start(t);
    src.stop(t + dur);
  }

  function soundTap() {
    if (audio) {
      blip(280, 520, 0.09, 0.15);
    }
  }

  // Plastic clack when a brick snaps onto the pile; wider bricks sound lower
  function soundClack(w) {
    if (audio) {
      burst('bandpass', 3000, 1500, 0.05, 0.25);
      blip(900 - w * 100 + rand(150), 400, 0.07, 0.12);
    }
  }

  // Group removed: one rising note per brick, so big groups sound bigger
  function soundPop(n) {
    if (audio) {
      for (var k = 0; k < Math.min(n, 8); k++) {
        var f = 330 * Math.pow(2, (SCALE[k % SCALE.length] + 12 * Math.floor(k / SCALE.length)) / 12);
        blip(f, f * 0.99, 0.15, 0.12, k * 0.05);
      }
    }
  }

  function soundMiss() {
    if (audio) {
      blip(200, 150, 0.06, 0.1);
    }
  }

  function soundChomp() {
    if (audio) {
      burst('bandpass', 800, 300, 0.07, 0.3);
      blip(240, 110, 0.09, 0.25);
    }
  }

  function soundThunk() {
    if (audio) {
      burst('lowpass', 900, 150, 0.2, 0.4);
      blip(170, 60, 0.3, 0.3);
    }
  }

  function soundChime() {
    if (audio) {
      blip(660, 660, 0.2, 0.14);
      blip(880, 880, 0.2, 0.14, 0.08);
      blip(1320, 1320, 0.3, 0.14, 0.16);
    }
  }

  // Recompute canvas size and the scale that fits the whole pile into the frame
  function resize() {
    var dpr = window.devicePixelRatio || 1;
    var w = stage.clientWidth;
    var h = stage.clientHeight;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    var u = Math.min(w / (COLS + 1), h / (ROWS * ASPECT + 3.2));
    view.w = w;
    view.h = h;
    view.u = u;
    view.bh = u * ASPECT;
    view.ox = (w - COLS * u) / 2;
    view.plate = u * 0.5;
    view.floorY = h - u * 0.3 - view.plate;
  }

  function popup(s, x, y, size, color) {
    popups.push({ s: s, x: x, y: y, life: 1, size: size, color: color });
  }

  // Pixel center of a brick at its current position
  function centerOf(b) {
    return {
      x: view.ox + (b.col + b.w / 2) * view.u,
      y: view.floorY - (b.y + 0.5) * view.bh
    };
  }

  // Reserve a spot for one brick near the aimed column; returns false if nothing fits
  function placeBrick(delay, aim, w, wild) {
    var pick = null;
    for (var attempt = 0; attempt < 5 && !pick; attempt++) {
      var col;
      if (aim === null || attempt > 0) {
        col = rand(COLS - w + 1);
      } else {
        col = Math.min(COLS - w, Math.max(0, aim - Math.floor(w / 2) + rand(3) - 1));
      }
      var row = 0;
      for (var c = col; c < col + w; c++) {
        row = Math.max(row, tops[c]);
      }
      if (row < ROWS) {
        pick = { col: col, row: row };
      }
    }
    if (!pick) {
      return false;
    }
    for (var k = pick.col; k < pick.col + w; k++) {
      tops[k] = pick.row + 1;
    }
    var ci = wild ? -1 : rand(colorCount);
    bricks.push({
      col: pick.col,
      w: w,
      row: pick.row,
      y: ROWS + 3,
      vy: 0,
      delay: delay,
      ci: ci,
      wild: wild,
      pal: wild ? WILD_PAL : PALETTE[ci]
    });
    return true;
  }

  function spawnBatch(aim) {
    var batchW = WIDTHS[rand(WIDTHS.length)];
    for (var n = 0; n < BATCH; n++) {
      var w = uniform ? batchW : WIDTHS[rand(WIDTHS.length)];
      placeBrick(n * 0.2 + Math.random() * 0.1, aim, w, Math.random() < wildChance);
    }
  }

  // Turn one brick into a flying piece
  function launch(br, power) {
    var u = view.u;
    var cx = view.ox + (br.col + br.w / 2) * u;
    var cy = view.floorY - (br.y + 0.5) * view.bh;
    if (cy < -view.bh) {
      return;
    }
    var away = (cx - view.w / 2) / u;
    debris.push({
      x: cx,
      y: cy,
      n: br.w,
      pal: br.pal,
      a: 0,
      vx: (away * 2.5 + (Math.random() - 0.5) * 8) * u * power,
      vy: -(10 + Math.random() * 16) * u * power,
      spin: (Math.random() - 0.5) * 16
    });
  }

  // Recompute every brick's row bottom-up so everything above a removed brick falls down
  function resettle() {
    var order = bricks.slice().sort(function (a, b) {
      return a.row - b.row;
    });
    var c;
    for (c = 0; c < COLS; c++) {
      tops[c] = 0;
    }
    for (var i = 0; i < order.length; i++) {
      var b = order[i];
      var row = 0;
      for (c = b.col; c < b.col + b.w; c++) {
        row = Math.max(row, tops[c]);
      }
      b.row = row;
      for (c = b.col; c < b.col + b.w; c++) {
        tops[c] = row + 1;
      }
    }
  }

  // Destroy the given bricks, then let the rest fall
  function removeBricks(victims, power) {
    for (var i = 0; i < victims.length; i++) {
      launch(victims[i], power);
    }
    bricks = bricks.filter(function (b) {
      return victims.indexOf(b) === -1;
    });
    resettle();
  }

  // Bricks touch when they share an edge: side by side in one row, or stacked with overlapping studs
  function touches(a, b) {
    if (a.row === b.row) {
      return a.col + a.w === b.col || b.col + b.w === a.col;
    }
    return Math.abs(a.row - b.row) === 1 && a.col < b.col + b.w && b.col < a.col + a.w;
  }

  // Same color connects; wild bricks connect to anything
  function matches(a, b) {
    return a.wild || b.wild || a.ci === b.ci;
  }

  // All bricks connected to start through touching, matching bricks
  function groupOf(start) {
    var group = [start];
    for (var i = 0; i < group.length; i++) {
      for (var j = 0; j < bricks.length; j++) {
        var b = bricks[j];
        if (group.indexOf(b) === -1 && touches(group[i], b) && matches(group[i], b)) {
          group.push(b);
        }
      }
    }
    return group;
  }

  // Brick drawn at a pixel position, or null
  function brickAt(px, py) {
    var col = Math.floor((px - view.ox) / view.u);
    var rowF = (view.floorY - py) / view.bh;
    for (var i = 0; i < bricks.length; i++) {
      var b = bricks[i];
      if (col >= b.col && col < b.col + b.w && rowF >= b.y && rowF < b.y + 1) {
        return b;
      }
    }
    return null;
  }

  // Brick that belongs to the biggest group, used when there is no pointer position
  function bestBrick() {
    var top = null;
    var topN = 0;
    for (var i = 0; i < bricks.length; i++) {
      var n = groupOf(bricks[i]).length;
      if (n > topN) {
        top = bricks[i];
        topN = n;
      }
    }
    return top;
  }

  // True when every brick has landed
  function settled() {
    for (var i = 0; i < bricks.length; i++) {
      if (bricks[i].delay > 0 || bricks[i].y > bricks[i].row) {
        return false;
      }
    }
    return true;
  }

  function startRound() {
    roundScore = 0;
    target = 200 + 150 * (level - 1);
    buildLeft = buildTaps;
    removeLeft = removeTaps;
    sweepsLeft = sweepLevel;
    bestLevel = Math.max(bestLevel, level);
  }

  function newGame() {
    level = 1;
    buildTaps = 5;
    removeTaps = 5;
    colorCount = 5;
    uniform = false;
    wildChance = 0;
    sweepLevel = 0;
    lost = false;
    startRound();
  }

  // Win: offer three random upgrades. Lose: game over.
  function endRound() {
    if (roundScore >= target) {
      var pool = UPGRADES.filter(function (g) {
        return g.ok();
      });
      while (choices.length < 3 && pool.length) {
        choices.push(pool.splice(rand(pool.length), 1)[0]);
      }
      soundChime();
    } else {
      lost = true;
      soundThunk();
    }
  }

  function startDino() {
    dino = {
      x: view.ox - 4 * view.u,
      mouth: view.ox - 4 * view.u + DINO_LEN * view.u,
      boost: false
    };
  }

  // Move the dino and eat the bottom two rows of whatever its mouth sweeps over
  function runDino(dt) {
    var u = view.u;
    var prev = dino.mouth;
    dino.x += u * (dino.boost ? DINO_BOOST : DINO_SPEED) * dt;
    dino.mouth = dino.x + DINO_LEN * u;
    var eaten = bricks.filter(function (b) {
      var left = view.ox + b.col * u;
      return b.y <= b.row && b.row <= 1 && left < dino.mouth && left + b.w * u > prev;
    });
    if (eaten.length) {
      soundChomp();
      removeBricks(eaten, 0.35);
    }
    if (dino.x > view.ox + (COLS + 1) * u) {
      if (bricks.length) {
        // Leftovers fell down behind it: run another pass
        dino.x = view.ox - 4 * u;
        dino.mouth = dino.x + DINO_LEN * u;
      } else {
        dino = null;
      }
    }
  }

  function cardRects() {
    var u = view.u;
    var w = Math.min(view.w - 24, u * 22);
    var h = u * 2.8;
    var gap = u * 0.5;
    var total = choices.length * h + (choices.length - 1) * gap;
    var top = (view.h - total) / 2 + u;
    var rects = [];
    for (var i = 0; i < choices.length; i++) {
      rects.push({ x: (view.w - w) / 2, y: top + i * (h + gap), w: w, h: h });
    }
    return rects;
  }

  // Tap on a card takes that upgrade and starts the next level; without a pointer the first card is taken
  function pickChoice(px, py) {
    var rects = cardRects();
    for (var i = 0; i < choices.length; i++) {
      var r = rects[i];
      var hit = px === null ? i === 0 : px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h;
      if (hit) {
        choices[i].apply();
        choices = [];
        level++;
        startRound();
        soundTap();
        return;
      }
    }
  }

  // Build tap: drop a batch near the tapped column
  function build(px) {
    var aim = null;
    if (px !== null) {
      aim = Math.min(COLS - 1, Math.max(0, Math.floor((px - view.ox) / view.u)));
    }
    soundTap();
    spawnBatch(aim);
    buildLeft--;
  }

  // Remove tap: take the tapped brick's group (or all of its color while a sweep is left)
  function remove(px, py) {
    var hit = px === null ? bestBrick() : brickAt(px, py);
    if (!hit) {
      soundMiss();
      return;
    }
    var group;
    if (sweepsLeft > 0) {
      sweepsLeft--;
      group = bricks.filter(function (b) {
        return b.wild || b.ci === hit.ci;
      });
    } else {
      group = groupOf(hit);
    }
    var pts = group.length * group.length * 10;
    var c = centerOf(hit);
    roundScore += pts;
    popup('+' + pts, c.x, c.y, view.u * (0.9 + Math.min(group.length, 8) * 0.1), '#ffd24a');
    soundPop(group.length);
    removeLeft--;
    removeBricks(group, 0.7);
  }

  // One tap does whatever the current state asks for
  function tap(px, py) {
    initAudio();
    if (lost) {
      newGame();
    } else if (choices.length) {
      pickChoice(px, py);
    } else if (dino) {
      dino.boost = true;
    } else if (buildLeft > 0) {
      build(px);
    } else if (removeLeft > 0) {
      remove(px, py);
    }
  }

  function update(dt) {
    var i;
    clock += dt;
    for (i = 0; i < bricks.length; i++) {
      var b = bricks[i];
      if (b.delay > 0) {
        b.delay -= dt;
        continue;
      }
      if (b.y > b.row) {
        b.vy += FALL_G * dt;
        b.y -= b.vy * dt;
        if (b.y <= b.row) {
          b.y = b.row;
          b.vy = 0;
          soundClack(b.w);
        }
      }
    }
    // The round ends once all drops are made and everything has landed
    if (!dino && !lost && !choices.length && buildLeft === 0 && settled()) {
      if (bricks.length === 0) {
        endRound();
      } else if (removeLeft === 0) {
        startDino();
      }
    }
    if (dino) {
      runDino(dt);
    }
    for (i = debris.length - 1; i >= 0; i--) {
      var d = debris[i];
      d.vy += DEBRIS_G * view.u * dt;
      d.x += d.vx * dt;
      d.y += d.vy * dt;
      d.a += d.spin * dt;
      if (d.y > view.h + view.u * 3) {
        debris.splice(i, 1);
      }
    }
    for (i = popups.length - 1; i >= 0; i--) {
      popups[i].y -= view.u * 2 * dt;
      popups[i].life -= dt;
      if (popups[i].life <= 0) {
        popups.splice(i, 1);
      }
    }
  }

  // Draw one brick with its top-left corner at x, y
  function drawBrick(x, y, n, pal) {
    var u = view.u;
    var w = n * u;
    var h = view.bh;
    var sw = u * 0.56;
    var sh = u * 0.2;
    ctx.fillStyle = pal.base;
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = pal.light;
    ctx.fillRect(x, y, w, h * 0.12);
    ctx.fillStyle = pal.dark;
    ctx.fillRect(x, y + h * 0.88, w, h * 0.12);
    ctx.strokeStyle = pal.dark;
    ctx.lineWidth = 1;
    ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
    for (var s = 0; s < n; s++) {
      var sx = x + (s + 0.5) * u - sw / 2;
      ctx.fillStyle = pal.base;
      ctx.fillRect(sx, y - sh, sw, sh);
      ctx.fillStyle = pal.light;
      ctx.fillRect(sx, y - sh, sw, sh * 0.35);
    }
  }

  function fillEllipse(cx, cy, rx, ry) {
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // Green dinosaur facing right; its origin is the bottom-left of the body
  function drawDino() {
    var u = view.u;
    var t = clock * 12;
    var bob = Math.abs(Math.sin(t)) * u * 0.15;
    var leg = Math.sin(t) * u * 0.25;
    var open = (Math.sin(clock * 14) + 1) / 2;
    ctx.save();
    ctx.translate(dino.x, view.floorY - bob);
    ctx.fillStyle = '#2f9e6a';
    ctx.beginPath();
    ctx.moveTo(0, -u * 1.3);
    ctx.lineTo(-u * 1.6, -u * 0.5);
    ctx.lineTo(0, -u * 0.6);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#23805a';
    ctx.fillRect(u * 0.4 + leg, -u * 0.6, u * 0.45, u * 0.6);
    ctx.fillRect(u * 1.4 - leg, -u * 0.6, u * 0.45, u * 0.6);
    ctx.fillStyle = '#2f9e6a';
    fillEllipse(u * 1.2, -u * 1.2, u * 1.3, u * 0.8);
    ctx.fillStyle = '#bfe8a8';
    fillEllipse(u * 1.5, -u * 1.0, u * 0.9, u * 0.5);
    ctx.fillStyle = '#ff9a2a';
    for (var p = 0; p < 3; p++) {
      var px = u * (0.5 + p * 0.55);
      ctx.beginPath();
      ctx.moveTo(px, -u * 1.85);
      ctx.lineTo(px + u * 0.25, -u * 2.3);
      ctx.lineTo(px + u * 0.5, -u * 1.9);
      ctx.closePath();
      ctx.fill();
    }
    ctx.fillStyle = '#2f9e6a';
    fillEllipse(u * 2.5, -u * 1.9, u * 0.8, u * 0.65);
    ctx.fillRect(u * 2.6, -u * 2.25, u * 0.8, u * 0.4);
    ctx.fillStyle = '#23805a';
    ctx.fillRect(u * 2.6, -u * 1.7 + open * u * 0.3, u * 0.8, u * 0.3);
    ctx.fillStyle = '#ffffff';
    fillEllipse(u * 2.45, -u * 2.15, u * 0.2, u * 0.2);
    ctx.fillStyle = '#000000';
    fillEllipse(u * 2.52, -u * 2.15, u * 0.1, u * 0.1);
    ctx.restore();
  }

  function phaseText() {
    if (lost) {
      return 'Game over';
    }
    if (choices.length) {
      return 'Pick an upgrade';
    }
    if (dino) {
      return 'Dino time: tap to hurry it';
    }
    if (buildLeft > 0) {
      return 'Drops left ' + buildLeft + ': tap to aim';
    }
    if (removeLeft > 0) {
      return 'Removals left ' + removeLeft + (sweepsLeft > 0 ? ': SWEEP, tap a color' : ': tap a brick');
    }
    return '';
  }

  function draw() {
    var u = view.u;
    ctx.clearRect(0, 0, view.w, view.h);

    // Baseplate
    var px = view.ox - u * 0.5;
    var pw = COLS * u + u;
    ctx.fillStyle = '#3a7d44';
    ctx.fillRect(px, view.floorY, pw, view.plate);
    ctx.fillStyle = '#285a30';
    ctx.fillRect(px, view.floorY + view.plate * 0.8, pw, view.plate * 0.2);
    ctx.fillStyle = '#4f9a5a';
    for (var c = 0; c < COLS; c++) {
      ctx.fillRect(view.ox + (c + 0.5) * u - u * 0.28, view.floorY - u * 0.12, u * 0.56, u * 0.12);
    }

    var i;
    for (i = 0; i < bricks.length; i++) {
      var b = bricks[i];
      if (b.wild) {
        ctx.shadowColor = 'hsl(' + Math.round((clock * 200) % 360) + ',90%,60%)';
        ctx.shadowBlur = u * 0.8;
      }
      drawBrick(view.ox + b.col * u, view.floorY - (b.y + 1) * view.bh, b.w, b.pal);
      ctx.shadowBlur = 0;
    }
    if (dino) {
      drawDino();
    }
    for (i = 0; i < debris.length; i++) {
      var d = debris[i];
      ctx.save();
      ctx.translate(d.x, d.y);
      ctx.rotate(d.a);
      drawBrick(-d.n * u / 2, -view.bh / 2, d.n, d.pal);
      ctx.restore();
    }

    // Floating text
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (i = 0; i < popups.length; i++) {
      var p = popups[i];
      ctx.globalAlpha = Math.min(1, p.life * 2);
      ctx.fillStyle = p.color;
      ctx.font = 'bold ' + Math.round(p.size) + 'px system-ui, sans-serif';
      ctx.fillText(p.s, p.x, p.y);
    }
    ctx.globalAlpha = 1;

    var fs = Math.max(11, Math.round(u * 0.55));

    // Upgrade pick screen
    if (choices.length) {
      var rects = cardRects();
      ctx.fillStyle = 'rgba(20, 24, 32, 0.85)';
      ctx.fillRect(0, 0, view.w, view.h);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#7dff9a';
      ctx.font = 'bold ' + Math.round(fs * 1.4) + 'px system-ui, sans-serif';
      ctx.fillText('Level ' + level + ' cleared', view.w / 2, rects[0].y - u * 0.9);
      for (i = 0; i < choices.length; i++) {
        var r = rects[i];
        ctx.fillStyle = '#2d3340';
        ctx.fillRect(r.x, r.y, r.w, r.h);
        ctx.strokeStyle = '#4f5a6e';
        ctx.lineWidth = 2;
        ctx.strokeRect(r.x, r.y, r.w, r.h);
        ctx.textAlign = 'left';
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold ' + fs + 'px system-ui, sans-serif';
        ctx.fillText(choices[i].name, r.x + u * 0.7, r.y + r.h * 0.32);
        ctx.fillStyle = '#aab3c2';
        ctx.font = Math.max(10, Math.round(fs * 0.85)) + 'px system-ui, sans-serif';
        ctx.fillText(choices[i].desc, r.x + u * 0.7, r.y + r.h * 0.7);
      }
    }

    // Game over screen
    if (lost) {
      ctx.fillStyle = 'rgba(20, 24, 32, 0.85)';
      ctx.fillRect(0, 0, view.w, view.h);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#ff6b6b';
      ctx.font = 'bold ' + Math.round(u * 1.6) + 'px system-ui, sans-serif';
      ctx.fillText('GAME OVER', view.w / 2, view.h / 2 - u);
      ctx.fillStyle = '#c8cfdb';
      ctx.font = 'bold ' + fs + 'px system-ui, sans-serif';
      ctx.fillText('Reached level ' + level + '  (' + roundScore + ' / ' + target + ')', view.w / 2, view.h / 2 + u * 0.6);
      ctx.fillText('Tap to restart', view.w / 2, view.h / 2 + u * 1.8);
    }

    // HUD
    ctx.font = 'bold ' + fs + 'px system-ui, sans-serif';
    ctx.textBaseline = 'top';
    ctx.fillStyle = '#c8cfdb';
    ctx.textAlign = 'left';
    ctx.fillText('Lv ' + level, 12, 8);
    ctx.textAlign = 'right';
    ctx.fillText('Best Lv ' + bestLevel, view.w - 12, 8);
    ctx.textAlign = 'center';
    ctx.fillText('Score ' + roundScore + ' / ' + target, view.w / 2, 8);
    ctx.fillStyle = '#ffa030';
    ctx.fillText(phaseText(), view.w / 2, 8 + fs * 1.3);
  }

  function frame(t) {
    var dt = last === null ? 0 : Math.min((t - last) / 1000, 0.05);
    last = t;
    update(dt);
    draw();
    requestAnimationFrame(frame);
  }

  // Tap position picks the drop column, the brick to remove, or the upgrade card
  document.addEventListener('pointerdown', function (e) {
    var rect = stage.getBoundingClientRect();
    tap(e.clientX - rect.left, e.clientY - rect.top);
  });
  // Keyboard has no pointer position: random drops, biggest group, first upgrade
  document.addEventListener('keydown', function (e) {
    if (e.code === 'Space' || e.code === 'Enter') {
      e.preventDefault();
      if (!e.repeat) {
        tap(null, null);
      }
    }
  });
  window.addEventListener('resize', resize);

  newGame();
  resize();
  requestAnimationFrame(frame);
})();
