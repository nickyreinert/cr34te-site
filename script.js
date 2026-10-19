// Brick toy: tap to drop random bricks that stack up; once the pile is big, the next tap blows it apart and drops a new batch.
(function () {
  'use strict';

  var COLS = 12;        // studs across the build area
  var ROWS = 11;        // max brick rows in the pile
  var BATCH = 4;        // bricks dropped per tap
  var MAX_BRICKS = 16;  // pile size that makes the next tap an explosion
  var ASPECT = 1.2;     // brick height relative to one stud width
  var WIDTHS = [1, 2, 2, 2, 3, 4];
  var FALL_G = 70;      // gravity for falling bricks, rows per second squared
  var DEBRIS_G = 50;    // gravity for exploded bricks, studs per second squared
  var PALETTE = [
    { base: '#d01012', light: '#ee4a4c', dark: '#8a0a0c' },
    { base: '#0055bf', light: '#3f85e0', dark: '#003a85' },
    { base: '#f2cd37', light: '#fae27a', dark: '#b8960f' },
    { base: '#237841', light: '#4da56a', dark: '#154d29' },
    { base: '#fe8a18', light: '#ffb15c', dark: '#b85d05' },
    { base: '#f2f3f2', light: '#ffffff', dark: '#a9adaa' },
    { base: '#a5ca18', light: '#c8e55a', dark: '#6f8c0a' },
    { base: '#923978', light: '#bf6aa3', dark: '#62214f' }
  ];

  var stage = document.getElementById('stage');
  var canvas = document.getElementById('view');
  var hint = document.getElementById('hint');
  var ctx = canvas.getContext('2d');

  var bricks = [];  // bricks in the pile or still falling: { col, w, row, y, vy, delay, pal }
  var debris = [];  // exploded bricks: { x, y, n, pal, a, vx, vy, spin }
  var tops = [];    // number of filled rows per column
  var view = { w: 0, h: 0, u: 0, bh: 0, ox: 0, floorY: 0, plate: 0 };
  var last = null;

  for (var i = 0; i < COLS; i++) {
    tops.push(0);
  }

  function rand(n) {
    return Math.floor(Math.random() * n);
  }

  var audio = null;  // created on the first tap because browsers require a user gesture
  var noise = null;  // one second of white noise reused for clacks and the explosion

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

  // Sine blip that sweeps from one pitch to another while fading out
  function blip(from, to, dur, vol) {
    var t = audio.currentTime;
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

  function soundBoom() {
    if (audio) {
      burst('lowpass', 3000, 80, 0.7, 0.45);
      blip(140, 35, 0.5, 0.4);
      burst('highpass', 4000, 1000, 0.15, 0.15);
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
    var u = Math.min(w / (COLS + 1), h / (ROWS * ASPECT + 2.2));
    view.w = w;
    view.h = h;
    view.u = u;
    view.bh = u * ASPECT;
    view.ox = (w - COLS * u) / 2;
    view.plate = u * 0.5;
    view.floorY = h - u * 0.3 - view.plate;
  }

  // Reserve a spot for one random brick; returns false if nothing fits
  function placeBrick(delay) {
    var w = WIDTHS[rand(WIDTHS.length)];
    var best = null;
    for (var attempt = 0; attempt < 5; attempt++) {
      var col = rand(COLS - w + 1);
      var row = 0;
      var c;
      for (c = col; c < col + w; c++) {
        row = Math.max(row, tops[c]);
      }
      if (row >= ROWS) {
        continue;
      }
      var gaps = 0;
      for (c = col; c < col + w; c++) {
        gaps += row - tops[c];
      }
      // Prefer the candidate that leaves the fewest hollow gaps below it
      if (!best || gaps < best.gaps) {
        best = { col: col, row: row, gaps: gaps };
      }
    }
    if (!best) {
      return false;
    }
    for (var k = best.col; k < best.col + w; k++) {
      tops[k] = best.row + 1;
    }
    bricks.push({
      col: best.col,
      w: w,
      row: best.row,
      y: ROWS + 3,
      vy: 0,
      delay: delay,
      pal: PALETTE[rand(PALETTE.length)]
    });
    return true;
  }

  function spawnBatch() {
    var placed = 0;
    for (var n = 0; n < BATCH; n++) {
      if (placeBrick(n * 0.2 + Math.random() * 0.1)) {
        placed++;
      }
    }
    return placed;
  }

  // Turn every visible brick into a flying piece and clear the pile
  function explode() {
    var u = view.u;
    for (var b = 0; b < bricks.length; b++) {
      var br = bricks[b];
      var cy = view.floorY - (br.y + 0.5) * view.bh;
      if (cy < -view.bh) {
        continue;
      }
      var cx = view.ox + (br.col + br.w / 2) * u;
      var away = (cx - view.w / 2) / u;
      debris.push({
        x: cx,
        y: cy,
        n: br.w,
        pal: br.pal,
        a: 0,
        vx: (away * 2.5 + (Math.random() - 0.5) * 8) * u,
        vy: -(10 + Math.random() * 16) * u,
        spin: (Math.random() - 0.5) * 16
      });
    }
    bricks.length = 0;
    for (var c = 0; c < COLS; c++) {
      tops[c] = 0;
    }
  }

  // One tap: explode first if the pile is big, then always drop a new batch
  function tap() {
    initAudio();
    if (bricks.length >= MAX_BRICKS || Math.max.apply(null, tops) >= ROWS - 1) {
      explode();
      soundBoom();
    } else {
      soundTap();
    }
    if (spawnBatch() === 0) {
      explode();
      soundBoom();
      spawnBatch();
    }
  }

  function update(dt) {
    var i;
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
      drawBrick(view.ox + b.col * u, view.floorY - (b.y + 1) * view.bh, b.w, b.pal);
    }
    for (i = 0; i < debris.length; i++) {
      var d = debris[i];
      ctx.save();
      ctx.translate(d.x, d.y);
      ctx.rotate(d.a);
      drawBrick(-d.n * u / 2, -view.bh / 2, d.n, d.pal);
      ctx.restore();
    }

    hint.style.opacity = (bricks.length || debris.length) ? '0' : '1';
  }

  function frame(t) {
    var dt = last === null ? 0 : Math.min((t - last) / 1000, 0.05);
    last = t;
    update(dt);
    draw();
    requestAnimationFrame(frame);
  }

  document.addEventListener('pointerdown', function () {
    tap();
  });
  document.addEventListener('keydown', function (e) {
    if (e.code === 'Space' || e.code === 'Enter') {
      e.preventDefault();
      if (!e.repeat) {
        tap();
      }
    }
  });
  window.addEventListener('resize', resize);

  resize();
  requestAnimationFrame(frame);
})();
