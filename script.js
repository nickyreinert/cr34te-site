// Brick toy: tap to aim a batch of random bricks. Flat landings build a combo, combos earn laser, bomb and gold bricks, full rows clear, and a big pile explodes for a payout.
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
  var FX_LIFE = 0.35;   // seconds a beam or ring stays visible
  var SCALE = [0, 2, 4, 7, 9];  // pentatonic semitone steps for the combo notes
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
  // Perk bricks are earned every 5 combo, in this order
  var PERK_ORDER = ['laser', 'bomb', 'gold'];
  var PERKS = {
    laser: { label: 'LASER', pal: { base: '#ff2a2a', light: '#ff9a9a', dark: '#8a0000' } },
    bomb: { label: 'BOMB', pal: { base: '#2b2b33', light: '#ff9030', dark: '#000000' } },
    gold: { label: 'GOLD', pal: { base: '#ffd21f', light: '#fff2a0', dark: '#b8860b' } }
  };

  var stage = document.getElementById('stage');
  var canvas = document.getElementById('view');
  var hint = document.getElementById('hint');
  var ctx = canvas.getContext('2d');

  // Bricks in the pile or still falling: { col, w, row, y, vy, delay, pal, kind, perfect, fresh }
  var bricks = [];
  var debris = [];  // exploded bricks: { x, y, n, pal, a, vx, vy, spin }
  var popups = [];  // floating text: { s, x, y, life, size, color }
  var fx = [];      // beams and rings: { kind, x, y, life, color }
  var perks = [];   // earned perk bricks waiting for the next batch
  var tops = [];    // number of filled rows per column
  var score = 0;
  var combo = 0;
  var best = 0;     // session best, kept in memory only because storage is blocked
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

  // Perfect landing: a pentatonic note that climbs with the combo
  function soundNote(c) {
    if (audio) {
      var step = c - 1;
      var semi = SCALE[step % SCALE.length] + 12 * Math.min(2, Math.floor(step / SCALE.length));
      var f = 330 * Math.pow(2, semi / 12);
      burst('bandpass', 3000, 1500, 0.05, 0.2);
      blip(f, f * 0.99, 0.18, 0.14);
    }
  }

  // Imperfect landing: dull thunk, combo lost
  function soundThunk() {
    if (audio) {
      burst('lowpass', 900, 150, 0.08, 0.3);
      blip(170, 90, 0.1, 0.2);
    }
  }

  function soundReady() {
    if (audio) {
      blip(880, 880, 0.1, 0.14);
      blip(1320, 1320, 0.15, 0.14, 0.09);
    }
  }

  function soundLaser() {
    if (audio) {
      blip(2000, 150, 0.4, 0.2);
      burst('bandpass', 5000, 600, 0.4, 0.25);
    }
  }

  function soundBomb() {
    if (audio) {
      burst('lowpass', 2500, 100, 0.45, 0.4);
      blip(130, 40, 0.35, 0.35);
    }
  }

  function soundChime() {
    if (audio) {
      blip(660, 660, 0.2, 0.14);
      blip(880, 880, 0.2, 0.14, 0.08);
      blip(1320, 1320, 0.3, 0.14, 0.16);
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

  // Pixel center of a brick at its current rows
  function centerOf(b) {
    return {
      x: view.ox + (b.col + b.w / 2) * view.u,
      y: view.floorY - (b.y + 0.5) * view.bh
    };
  }

  // Reserve a spot for one random brick near the aimed column; returns false if nothing fits
  function placeBrick(delay, aim, kind) {
    var w = WIDTHS[rand(WIDTHS.length)];
    var pick = null;
    for (var attempt = 0; attempt < 5 && !pick; attempt++) {
      var col;
      if (aim === null || attempt > 0) {
        col = rand(COLS - w + 1);
      } else {
        col = Math.min(COLS - w, Math.max(0, aim - Math.floor(w / 2) + rand(3) - 1));
      }
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
      pick = { col: col, row: row, gaps: gaps };
    }
    if (!pick) {
      return false;
    }
    for (var k = pick.col; k < pick.col + w; k++) {
      tops[k] = pick.row + 1;
    }
    bricks.push({
      col: pick.col,
      w: w,
      row: pick.row,
      y: ROWS + 3,
      vy: 0,
      delay: delay,
      pal: kind ? PERKS[kind].pal : PALETTE[rand(PALETTE.length)],
      kind: kind,
      perfect: pick.gaps === 0 || kind === 'gold',  // flat landing, gold fits anywhere
      fresh: true                                   // scores once, on the first landing only
    });
    return true;
  }

  // Drop a batch; the first brick takes the oldest earned perk
  function spawnBatch(aim) {
    var placed = 0;
    for (var n = 0; n < BATCH; n++) {
      var kind = n === 0 ? perks[0] : undefined;
      if (placeBrick(n * 0.2 + Math.random() * 0.1, aim, kind)) {
        placed++;
        if (kind) {
          perks.shift();
        }
      }
    }
    return placed;
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

  // Blow up every brick and clear the pile
  function explode() {
    for (var b = 0; b < bricks.length; b++) {
      launch(bricks[b], 1);
    }
    bricks.length = 0;
    for (var c = 0; c < COLS; c++) {
      tops[c] = 0;
    }
  }

  // Explosion with payout: tower height times combo
  function blow() {
    var h = Math.max.apply(null, tops);
    var bonus = h * 10 * Math.max(combo, 1);
    if (bonus > 0) {
      score += bonus;
      best = Math.max(best, score);
      popup('+' + bonus, view.w / 2, view.floorY - h * view.bh / 2, view.u * 1.8, '#ffd24a');
    }
    explode();
    soundBoom();
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

  // A row with all studs filled by landed bricks is cleared for a bonus
  function clearFullRows() {
    var filled = [];
    var r;
    for (r = 0; r < ROWS; r++) {
      filled.push(0);
    }
    bricks.forEach(function (b) {
      if (b.y <= b.row) {
        filled[b.row] += b.w;
      }
    });
    var victims = [];
    for (r = 0; r < ROWS; r++) {
      if (filled[r] === COLS) {
        var bonus = 100 * Math.max(combo, 1);
        var rowY = view.floorY - (r + 0.5) * view.bh;
        score += bonus;
        popup('ROW +' + bonus, view.w / 2, rowY, view.u * 1.2, '#7dff9a');
        fx.push({ kind: 'beam', x: 0, y: rowY, life: FX_LIFE, color: '#ffffff' });
        soundChime();
        victims = victims.concat(bricks.filter(function (b) {
          return b.y <= b.row && b.row === r;
        }));
      }
    }
    if (victims.length) {
      removeBricks(victims, 0.5);
    }
  }

  // Called once each time a brick reaches its row
  function land(b) {
    var c = centerOf(b);
    if (b.fresh) {
      b.fresh = false;
      if (b.perfect) {
        combo++;
        var gain = 10 * combo * (b.kind === 'gold' ? 5 : 1);
        score += gain;
        popup('+' + gain, c.x, c.y, view.u * 0.9, b.kind === 'gold' ? '#ffd21f' : '#ffffff');
        soundNote(combo);
        if (combo % 5 === 0) {
          var earned = PERK_ORDER[(combo / 5 - 1) % PERK_ORDER.length];
          perks.push(earned);
          popup(PERKS[earned].label + ' READY', view.w / 2, view.u * 3.6, view.u * 1.1, '#ffa030');
          soundReady();
        }
      } else {
        combo = 0;
        soundThunk();
      }
      var victims = [];
      if (b.kind === 'laser') {
        victims = bricks.filter(function (x) {
          return x.y <= x.row && x.row === b.row;
        });
        fx.push({ kind: 'beam', x: 0, y: c.y, life: FX_LIFE, color: '#ff4040' });
        soundLaser();
      } else if (b.kind === 'bomb') {
        victims = bricks.filter(function (x) {
          return x.y <= x.row && Math.abs(x.row - b.row) <= 2 &&
            x.col <= b.col + b.w + 1 && x.col + x.w - 1 >= b.col - 2;
        });
        fx.push({ kind: 'ring', x: c.x, y: c.y, life: FX_LIFE, color: '#ffa030' });
        soundBomb();
      }
      if (victims.length) {
        var pts = 20 * Math.max(combo, 1) * victims.length;
        score += pts;
        popup('+' + pts, c.x, c.y - view.u * 1.2, view.u * 1.1, '#ff9a9a');
        removeBricks(victims, 0.7);
      }
    } else {
      soundClack(b.w);
    }
    clearFullRows();
    best = Math.max(best, score);
  }

  // One tap: explode first if the pile is big, then always drop a new batch near the aimed column
  function tap(aim) {
    initAudio();
    if (bricks.length >= MAX_BRICKS || Math.max.apply(null, tops) >= ROWS - 1) {
      blow();
    } else {
      soundTap();
    }
    if (spawnBatch(aim) === 0) {
      blow();
      spawnBatch(aim);
    }
  }

  function update(dt) {
    var i;
    var landed = [];
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
          landed.push(b);
        }
      }
    }
    // Handled after the loop because landings can remove bricks
    for (i = 0; i < landed.length; i++) {
      if (bricks.indexOf(landed[i]) !== -1) {
        land(landed[i]);
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
    for (i = popups.length - 1; i >= 0; i--) {
      popups[i].y -= view.u * 2 * dt;
      popups[i].life -= dt;
      if (popups[i].life <= 0) {
        popups.splice(i, 1);
      }
    }
    for (i = fx.length - 1; i >= 0; i--) {
      fx[i].life -= dt;
      if (fx[i].life <= 0) {
        fx.splice(i, 1);
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
      if (b.kind) {
        ctx.shadowColor = b.pal.light;
        ctx.shadowBlur = u * 0.8;
      }
      drawBrick(view.ox + b.col * u, view.floorY - (b.y + 1) * view.bh, b.w, b.pal);
      ctx.shadowBlur = 0;
    }
    for (i = 0; i < debris.length; i++) {
      var d = debris[i];
      ctx.save();
      ctx.translate(d.x, d.y);
      ctx.rotate(d.a);
      drawBrick(-d.n * u / 2, -view.bh / 2, d.n, d.pal);
      ctx.restore();
    }

    // Beams and rings
    for (i = 0; i < fx.length; i++) {
      var f = fx[i];
      var k = f.life / FX_LIFE;
      ctx.globalAlpha = k;
      if (f.kind === 'beam') {
        ctx.fillStyle = f.color;
        ctx.fillRect(0, f.y - u * 0.25, view.w, u * 0.5);
      } else {
        ctx.strokeStyle = f.color;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(f.x, f.y, u * (1 + (1 - k) * 3), 0, Math.PI * 2);
        ctx.stroke();
      }
    }
    ctx.globalAlpha = 1;

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

    // HUD
    var fs = Math.max(11, Math.round(u * 0.55));
    ctx.font = 'bold ' + fs + 'px system-ui, sans-serif';
    ctx.textBaseline = 'top';
    ctx.fillStyle = '#c8cfdb';
    ctx.textAlign = 'left';
    ctx.fillText('Score ' + score, 12, 8);
    ctx.textAlign = 'right';
    ctx.fillText('Best ' + best, view.w - 12, 8);
    ctx.textAlign = 'center';
    ctx.fillStyle = combo >= 5 ? '#ffa030' : '#c8cfdb';
    ctx.fillText('Combo x' + combo, view.w / 2, 8);
    if (perks.length) {
      ctx.fillStyle = '#ffa030';
      ctx.fillText('next: ' + PERKS[perks[0]].label, view.w / 2, 8 + fs * 1.3);
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

  // Tap position picks the column the batch drops near
  document.addEventListener('pointerdown', function (e) {
    var rect = stage.getBoundingClientRect();
    var col = Math.floor((e.clientX - rect.left - view.ox) / view.u);
    tap(Math.min(COLS - 1, Math.max(0, col)));
  });
  // Keyboard has no pointer position, so the drop is random
  document.addEventListener('keydown', function (e) {
    if (e.code === 'Space' || e.code === 'Enter') {
      e.preventDefault();
      if (!e.repeat) {
        tap(null);
      }
    }
  });
  window.addEventListener('resize', resize);

  resize();
  requestAnimationFrame(frame);
})();
