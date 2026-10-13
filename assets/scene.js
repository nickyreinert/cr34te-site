(function () {
  'use strict';
  var H = 100, BASE = 72, LX = 105, LY = 40, MX = 82, MY = 88;
  var VW = window.innerWidth || 800, VH = window.innerHeight || 500, ASP = VW / VH;
  var W = Math.max(160, Math.min(320, Math.round(100 * ASP)));
  var OX = Math.floor((W - 160) / 2), XMIN = -OX, XMAX = 160 + OX;
  var cv = document.getElementById('scene');
  if (!cv || !cv.getContext) return;
  var ctx = cv.getContext('2d');
  cv.width = W; cv.height = H;
  ctx.imageSmoothingEnabled = false;
  (function () {
    var cw = VW, ch = VH, top = 0;
    if (ASP < 1.6) { ch = VW / 1.6; top = (VH - ch) / 2; }
    cv.style.cssText = 'position:fixed;left:0;top:' + top + 'px;width:' + cw + 'px;height:' + ch + 'px;display:block;image-rendering:pixelated;touch-action:none';
    document.documentElement.style.cssText = 'margin:0;height:100%;overflow:hidden;background:#03040a';
    document.body.style.cssText = 'margin:0;height:100%;overflow:hidden;background:#03040a';
  })();

  var calm = false;
  try { calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) {}
  var SPEED = calm ? 0.4 : 1;

  var seed = 7131;
  function rnd() { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; }
  function mk() { var c = document.createElement('canvas'); c.width = W; c.height = H; return c; }
  function R(c, x, y, w, h, col) { c.fillStyle = col; c.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); }
  function ell(c, cx, cy, rx, ry, col) {
    c.fillStyle = col;
    var d = (ry + 0.5) * (ry + 0.5);
    for (var y = -ry; y <= ry; y++) {
      var hw = Math.round(rx * Math.sqrt(Math.max(0, 1 - (y * y) / d)));
      c.fillRect(cx - hw, cy + y, hw * 2 + 1, 1);
    }
  }

  /* ---------- palettes for rain / splashes depending on distance to the lantern ---------- */
  var LV = 8;
  function mix(a, b, t) { return Math.round(a + (b - a) * t); }
  function pal(c0, c1) {
    var out = [];
    for (var i = 0; i < LV; i++) {
      var t = i / (LV - 1);
      out.push('rgba(' + mix(c0[0], c1[0], t) + ',' + mix(c0[1], c1[1], t) + ',' + mix(c0[2], c1[2], t) + ',' + (c0[3] + (c1[3] - c0[3]) * t).toFixed(2) + ')');
    }
    return out;
  }
  var palFar = pal([255, 205, 140, 0.55], [100, 125, 175, 0.30]);
  var palNear = pal([255, 230, 170, 0.95], [150, 175, 225, 0.55]);
  function lvl(x, y) {
    var dx = x - LX, dy = (y - LY) * 0.7;
    var i = Math.floor(Math.sqrt(dx * dx + dy * dy) / 56 * (LV - 1));
    return i < LV - 1 ? i : LV - 1;
  }

  /* ---------- static layers ---------- */
  var sky = mk(), s = sky.getContext('2d');
  for (var sy = 0; sy < H; sy += 4) {
    var st = Math.min(1, sy / 76);
    R(s, 0, sy, W, 4, 'rgb(' + Math.round(3 + 9 * st) + ',' + Math.round(4 + 14 * st) + ',' + Math.round(10 + 26 * st) + ')');
  }

  var hl = mk(), h = hl.getContext('2d');
  h.translate(OX, 0);
  var palettes = ['#0d1120', '#10152a', '#0b0f1c', '#121829'];
  var wins = [];
  var houses = [];
  function gen(a, b) {
    var x = a;
    while (x < b) {
      var w = 22 + Math.floor(rnd() * 13), hh = 26 + Math.floor(rnd() * 15);
      houses.push({ x: x, w: w, h: hh, roof: Math.floor(rnd() * 3), tone: Math.floor(rnd() * 4) });
      x += w + Math.floor(rnd() * 3);
    }
  }
  gen(XMIN - 6, 125);
  gen(139, XMAX + 4);

  function drawHouse(o) {
    var x = o.x, w = o.w, hh = o.h, top = BASE - hh, r;
    R(h, x, top, w, hh, palettes[o.tone]);
    R(h, x + w - 1, top, 1, hh, '#080b16');
    if (o.roof < 2) {
      var rh = Math.min(11, Math.floor((w + 2) / 2));
      for (r = 0; r < rh; r++) R(h, x - 1 + r, top - 1 - r, w + 2 - 2 * r, 1, r === 0 ? '#151b30' : '#070a14');
      var cy = top - 1 - Math.min(5, rh - 1);
      R(h, x + 4, cy - 4, 3, 6, '#0a0e1b');
      R(h, x + 4, cy - 4, 3, 1, '#151b30');
    } else {
      R(h, x - 1, top - 2, w + 2, 2, '#070a14');
      R(h, x - 1, top - 2, w + 2, 1, '#151b30');
    }
    var cols = Math.max(1, Math.floor((w - 2) / 10));
    var rows = Math.max(1, Math.floor((hh - 16) / 11));
    var gap = (w - cols * 7) / (cols + 1);
    for (var c = 0; c < cols; c++) {
      for (r = 0; r < rows; r++) {
        var fx = Math.round(x + gap * (c + 1) + 7 * c), fy = top + 4 + r * 11;
        R(h, fx, fy, 7, 8, '#04060b');
        if (rnd() < 0.38) {
          wins.push({ x: fx + 1, y: fy + 1, ph: rnd() * 6.28 });
        } else {
          R(h, fx + 1, fy + 1, 5, 6, '#0b1328');
          R(h, fx + 3, fy + 1, 1, 6, '#04060b');
          if (rnd() < 0.5) R(h, fx + 1, fy + 1, 2, 1, '#141f3a');
        }
      }
    }
    R(h, x + Math.floor(w / 2) - 2, BASE - 10, 5, 10, '#05070d');
    R(h, x + Math.floor(w / 2) - 2, BASE - 10, 5, 1, '#0f1424');
  }
  for (var hi = 0; hi < houses.length; hi++) drawHouse(houses[hi]);

  /* church tower */
  var TX = 125, TW = 14, TH = 50, TTOP = BASE - TH;
  R(h, TX, TTOP, TW, TH, '#0b0f1c');
  R(h, TX + TW - 1, TTOP, 1, TH, '#070a13');
  for (var tr = 0; tr < TW + 1; tr++) R(h, TX - 1 + Math.floor(tr / 2), TTOP - 1 - tr, TW + 2 - tr, 1, tr === 0 ? '#151b30' : '#070a14');
  R(h, TX + 6, TTOP - 21, 1, 6, '#0a0e1a');
  R(h, TX + 5, TTOP - 19, 3, 1, '#0a0e1a');
  R(h, TX + 4, TTOP + 4, 6, 9, '#04060b');
  R(h, TX + 4, TTOP + 7, 6, 1, '#0b0f1c');
  R(h, TX + 4, TTOP + 10, 6, 1, '#0b0f1c');
  R(h, TX + 4, TTOP + 16, 6, 6, '#2a2d3a');
  R(h, TX + 5, TTOP + 17, 4, 4, '#7d7048');
  R(h, TX + 6, TTOP + 17, 1, 2, '#1b160a');
  R(h, TX + 6, TTOP + 18, 2, 1, '#1b160a');
  R(h, TX + 5, BASE - 13, 4, 1, '#04060b');
  R(h, TX + 4, BASE - 12, 6, 12, '#04060b');

  /* sidewalk, curb, wet road */
  R(h, XMIN, BASE, W, 6, '#161a29');
  for (var jx = XMIN; jx < XMAX; jx += 9) { R(h, jx, BASE + 1, 1, 2, '#0d101c'); R(h, jx + 4, BASE + 3, 1, 2, '#0d101c'); }
  R(h, XMIN, BASE + 5, W, 1, '#272d44');
  R(h, XMIN, BASE + 6, W, H - BASE - 6, '#0a0c15');
  for (var n = 0; n < 340; n++) {
    R(h, rnd() * W + XMIN, BASE + 7 + rnd() * (H - BASE - 8), 1 + Math.floor(rnd() * 2), 1, rnd() < 0.5 ? '#0f121e' : '#06080e');
  }
  var puddles = [
    { x: 84, y: 89, rx: 16, ry: 3 }, { x: 112, y: 88, rx: 11, ry: 3 }, { x: 38, y: 90, rx: 18, ry: 3 },
    { x: 146, y: 91, rx: 12, ry: 3 }, { x: 12, y: 86, rx: 10, ry: 2 }
  ];
  for (var pi = 0; pi < puddles.length; pi++) {
    var p = puddles[pi];
    ell(h, p.x, p.y, p.rx, p.ry, '#0f1627');
    ell(h, p.x, p.y, p.rx - 2, p.ry - 1, '#131c32');
  }
  function inPuddle(x, y) {
    for (var i = 0; i < puddles.length; i++) {
      var q = puddles[i], dx = (x - q.x) / q.rx, dy = (y - q.y) / q.ry;
      if (dx * dx + dy * dy < 1) return true;
    }
    return false;
  }

  /* lantern post */
  R(h, 104, 45, 2, 28, '#14161f');
  R(h, 104, 45, 1, 28, '#222636');
  R(h, 102, 73, 6, 4, '#1b1e29');
  R(h, 100, 36, 10, 2, '#14161f');
  R(h, 104, 34, 2, 2, '#14161f');
  R(h, 102, 44, 6, 1, '#14161f');
  R(h, 101, 38, 1, 6, '#14161f');
  R(h, 108, 38, 1, 6, '#14161f');

  /* ---------- dynamic state ---------- */
  var farDrops = [], nearDrops = [], splashes = [], ripples = [], clouds = [], i0;
  function spawnDrop(near, init) {
    var d = {
      vx: near ? -26 : -14,
      vy: near ? 150 + Math.random() * 50 : 85 + Math.random() * 30,
      len: near ? 3 : 2,
      land: near ? 80 + Math.floor(Math.random() * 19) : 73 + Math.floor(Math.random() * 7),
      near: near
    };
    d.x = Math.random() * (W + 50) + XMIN;
    d.y = init ? Math.random() * d.land : -Math.random() * 24;
    return d;
  }
  for (i0 = 0; i0 < 90; i0++) farDrops.push(spawnDrop(false, true));
  for (i0 = 0; i0 < 60; i0++) nearDrops.push(spawnDrop(true, true));
  for (i0 = 0; i0 < 6; i0++) clouds.push({ x: rnd() * W - OX, y: 6 + rnd() * 34, w: 30 + Math.floor(rnd() * 40), sp: 2 + rnd() * 4 });

  var t = 0, rippleT = 0, flickT = 0, flickTarget = 1, flick = 1;

  function stepDrops(arr, dt) {
    for (var i = 0; i < arr.length; i++) {
      var d = arr[i];
      d.x += d.vx * dt; d.y += d.vy * dt;
      if (d.y >= d.land) {
        if (d.x >= XMIN && d.x < XMAX && splashes.length < 80) splashes.push({ x: Math.round(d.x), y: d.land, a: 0 });
        if (d.near && Math.random() < 0.3 && ripples.length < 40 && inPuddle(d.x, d.land)) ripples.push({ x: Math.round(d.x), y: d.land, a: 0 });
        arr[i] = spawnDrop(d.near, false);
      }
    }
  }

  function update(dt) {
    var i, k;
    t += dt;
    moveMan(dt);
    stepDrops(farDrops, dt);
    stepDrops(nearDrops, dt);
    k = 0;
    for (i = 0; i < splashes.length; i++) { var sp = splashes[i]; sp.a += dt / 0.28; if (sp.a < 1) splashes[k++] = sp; }
    splashes.length = k;
    k = 0;
    for (i = 0; i < ripples.length; i++) { var rp = ripples[i]; rp.a += dt / 0.9; if (rp.a < 1) ripples[k++] = rp; }
    ripples.length = k;
    rippleT += dt;
    while (rippleT > 0.12) {
      rippleT -= 0.12;
      if (ripples.length < 40) {
        var q = puddles[Math.floor(Math.random() * puddles.length)];
        ripples.push({ x: q.x + Math.round((Math.random() * 2 - 1) * q.rx * 0.8), y: q.y + Math.round((Math.random() * 2 - 1) * q.ry * 0.7), a: 0 });
      }
    }
    for (i = 0; i < clouds.length; i++) { clouds[i].x -= clouds[i].sp * dt; if (clouds[i].x < XMIN - clouds[i].w) clouds[i].x = XMAX; }
    if (!calm) {
      flickT += dt;
      if (flickT > 0.08) { flickT = 0; flickTarget = Math.random() < 0.04 ? 0.7 : 0.94 + Math.random() * 0.12; }
      flick += (flickTarget - flick) * Math.min(1, dt * 18);
    }
  }

  /* ---------- the man in swim trunks ---------- */
  var SKIN = '#d9a081', SKIN_D = '#a8705a', LIT = '#f3b27a', HAIR = '#2b1b14';
  var TR = '#c93a2e', TR_D = '#8e2620', TR_L = '#e8584a', TR_W = '#eadfce';
  function drawMan(c, fx, fy) {
    var wk = (moving && (Math.floor(walkT * 9) % 2)) ? 1 : 0;
    fy -= wk;
    var shiverOn = !calm && !moving && Math.sin(t * 0.9) > 0.55;
    var tx = fx + (shiverOn ? Math.floor(t * 18) % 2 : 0);
    var blink = (t % 3.7) > 3.58;
    /* legs and feet */
    R(c, fx - 3, fy - 5, 3, 5, SKIN); R(c, fx + 1, fy - 5, 3, 5, SKIN);
    R(c, fx - 3, fy - 5, 1, 5, SKIN_D); R(c, fx + 3, fy - 5, 1, 5, LIT);
    R(c, fx - 4, fy, 4, 1, SKIN_D); R(c, fx + 1, fy, 4, 1, SKIN_D);
    /* trunks */
    R(c, fx - 3, fy - 9, 7, 3, TR);
    R(c, fx - 3, fy - 6, 3, 1, TR); R(c, fx + 1, fy - 6, 3, 1, TR);
    R(c, fx - 3, fy - 9, 1, 4, TR_D); R(c, fx + 3, fy - 9, 1, 4, TR_L);
    R(c, fx, fy - 9, 1, 2, TR_W);
    /* torso */
    R(c, tx - 3, fy - 16, 7, 7, SKIN);
    R(c, tx - 3, fy - 16, 1, 7, SKIN_D); R(c, tx + 3, fy - 16, 1, 7, LIT);
    R(c, tx, fy - 14, 1, 3, SKIN_D); R(c, tx, fy - 11, 1, 1, SKIN_D);
    /* arms */
    R(c, tx - 5, fy - 16, 2, 9, SKIN); R(c, tx + 4, fy - 16, 2, 9, SKIN);
    R(c, tx - 5, fy - 16, 1, 9, SKIN_D); R(c, tx + 5, fy - 16, 1, 9, LIT);
    /* neck and head */
    R(c, tx - 1, fy - 17, 3, 1, SKIN_D);
    R(c, tx - 2, fy - 22, 5, 5, SKIN);
    R(c, tx - 2, fy - 22, 5, 2, HAIR);
    R(c, tx - 2, fy - 20, 1, 1, HAIR);
    R(c, tx + 2, fy - 20, 1, 1, LIT);
    R(c, tx - 3, fy - 19, 1, 2, SKIN_D); R(c, tx + 3, fy - 19, 1, 2, LIT);
    if (!blink) { R(c, tx - 1, fy - 20, 1, 1, '#14090a'); R(c, tx + 1, fy - 20, 1, 1, '#14090a'); }
    R(c, tx, fy - 19, 1, 1, SKIN_D);
    R(c, tx, fy - 18, 1, 1, '#7a3b32');
    /* cold breath */
    var u = (t % 3.4) / 3.4;
    if (u < 0.5) {
      var k = u * 2, ga = c.globalAlpha;
      c.globalAlpha = ga * (1 - k) * 0.5;
      R(c, tx + 3 + k * 5, fy - 18 - k * 3, 2, 1, '#cfd8ea');
      R(c, tx + 3 + k * 3, fy - 18 - k * 2, 1, 1, '#cfd8ea');
      c.globalAlpha = ga;
    }
  }

  /* ---------- rendering ---------- */
  function glow(cx, cy, rx, ry, steps, a) {
    var col = 'rgba(255,155,60,' + a.toFixed(3) + ')';
    for (var i = 0; i < steps; i++) {
      var f = 1 - i / steps;
      ell(ctx, cx, cy, Math.round(rx * f), Math.max(1, Math.round(ry * f)), col);
    }
  }
  function drawRain(arr, p) {
    for (var i = 0; i < arr.length; i++) {
      var d = arr[i], x = Math.round(d.x), y = Math.round(d.y);
      if (x < XMIN || x >= XMAX) continue;
      ctx.fillStyle = p[lvl(x, y)];
      ctx.fillRect(x, y - d.len, 1, d.len);
    }
  }
  var vig = ctx.createRadialGradient(W * 0.6, 52, 28, W * 0.6, 52, Math.max(105, W * 0.65));
  vig.addColorStop(0, 'rgba(0,0,0,0)');
  vig.addColorStop(1, 'rgba(0,0,0,0.55)');

  function render() {
    var i, y;
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
    ctx.drawImage(sky, 0, 0);
    ctx.save();
    ctx.translate(OX, 0);
    ctx.fillStyle = 'rgba(26,38,66,0.55)';
    for (i = 0; i < clouds.length; i++) {
      var cl = clouds[i], cx = Math.round(cl.x), cy = Math.round(cl.y);
      ctx.fillRect(cx, cy, cl.w, 3);
      ctx.fillRect(cx + 4, cy - 2, Math.round(cl.w * 0.5), 2);
      ctx.fillRect(cx + Math.round(cl.w * 0.25), cy + 3, Math.round(cl.w * 0.55), 2);
    }
    ctx.drawImage(hl, -OX, 0);
    for (i = 0; i < wins.length; i++) {
      var w = wins[i];
      R(ctx, w.x, w.y, 5, 6, Math.sin(t * 0.9 + w.ph) > 0.92 ? '#b87a2c' : '#dc9c3e');
      R(ctx, w.x + 2, w.y, 1, 6, '#5a3812');
    }

    /* man: shadow, puddle reflection, body */
    ell(ctx, MX, MY + 1, 7, 1, 'rgba(0,0,0,0.5)');
    ctx.save();
    ctx.beginPath(); ctx.rect(MX - 9, MY + 2, 18, 5); ctx.clip();
    ctx.globalAlpha = 0.22;
    ctx.translate(0, 2 * MY + 2); ctx.scale(1, -1);
    drawMan(ctx, MX, MY);
    ctx.restore();
    drawMan(ctx, MX, MY);

    drawRain(farDrops, palFar);

    /* lantern light, additive */
    ctx.globalCompositeOperation = 'lighter';
    glow(LX, LY, 46, 42, 9, 0.024 * flick);
    glow(LX, LY, 14, 13, 5, 0.07 * flick);
    ctx.fillStyle = 'rgba(255,170,90,' + (0.032 * flick).toFixed(3) + ')';
    for (y = 45; y < 94; y++) { var hw = 3 + Math.floor((y - 45) * 0.75); ctx.fillRect(LX - hw, y, hw * 2 + 1, 1); }
    glow(LX, 84, 40, 9, 6, 0.03 * flick);
    /* lamp reflection on the wet road */
    var shim = Math.floor(t * 6);
    for (y = 79; y < 100; y++) {
      if ((y + shim) % 2) continue;
      var a = 0.14 * (1 - (y - 79) / 30);
      if (inPuddle(LX, y)) a *= 2.2;
      var rw = 1 + ((y * 7 + shim) % 3);
      ctx.fillStyle = 'rgba(255,190,100,' + a.toFixed(3) + ')';
      ctx.fillRect(LX - Math.floor(rw / 2), y, rw, 1);
    }
    ctx.globalCompositeOperation = 'source-over';

    /* lamp glass */
    R(ctx, 102, 38, 6, 6, '#ffcf7a');
    R(ctx, 103, 39, 4, 4, '#ffe7ae');
    R(ctx, 104, 40, 2, 2, '#fffbe6');

    drawRain(nearDrops, palNear);

    /* splashes */
    for (i = 0; i < splashes.length; i++) {
      var sp = splashes[i];
      ctx.fillStyle = palNear[lvl(sp.x, sp.y)];
      ctx.globalAlpha = 1 - sp.a;
      if (sp.a < 0.34) ctx.fillRect(sp.x, sp.y - 1, 1, 1);
      else if (sp.a < 0.67) { ctx.fillRect(sp.x - 1, sp.y - 1, 1, 1); ctx.fillRect(sp.x + 1, sp.y - 1, 1, 1); ctx.fillRect(sp.x, sp.y - 2, 1, 1); }
      else { ctx.fillRect(sp.x - 2, sp.y - 1, 1, 1); ctx.fillRect(sp.x + 2, sp.y - 1, 1, 1); }
    }
    /* puddle ripples */
    for (i = 0; i < ripples.length; i++) {
      var rp = ripples[i], rx = 1 + rp.a * 7, ry = Math.max(1, rx * 0.38);
      ctx.fillStyle = palNear[lvl(rp.x, rp.y)];
      ctx.globalAlpha = (1 - rp.a) * 0.7;
      for (var k = 0; k < 18; k++) {
        var ang = k / 18 * Math.PI * 2;
        ctx.fillRect(Math.round(rp.x + rx * Math.cos(ang)), Math.round(rp.y + ry * Math.sin(ang)), 1, 1);
      }
    }
    ctx.globalAlpha = 1;

    ctx.restore();
    ctx.fillStyle = vig;
    ctx.fillRect(0, 0, W, H);
  }

  /* ---------- controls ---------- */
  var px = MX, py = MY, keys = {}, target = null, moving = false, walkT = 0, stepT = 0;
  function moveMan(dt) {
    var dx = 0, dy = 0;
    if (keys.left) dx -= 1;
    if (keys.right) dx += 1;
    if (keys.up) dy -= 1;
    if (keys.down) dy += 1;
    if (dx || dy) { target = null; }
    else if (target) {
      var tx = target.x - px, ty = target.y - py, dd = Math.sqrt(tx * tx + ty * ty);
      if (dd < 1.5) target = null; else { dx = tx / dd; dy = ty / dd; }
    }
    moving = !!(dx || dy);
    if (moving) {
      var len = Math.sqrt(dx * dx + dy * dy);
      px += dx / len * 26 * dt; py += dy / len * 26 * dt * 0.6;
      walkT += dt; stepT += dt;
      if (stepT > 0.2) { stepT = 0; footstep(); }
    }
    px = Math.max(XMIN + 8, Math.min(XMAX - 8, px));
    py = Math.max(80, Math.min(97, py));
    MX = Math.round(px); MY = Math.round(py);
    if (humGain) {
      var ddx = MX - LX, ddy = MY - 84;
      humGain.gain.value = muted ? 0 : 0.045 * Math.max(0, 1 - Math.sqrt(ddx * ddx + ddy * ddy) / 60) * flick;
    }
  }
  function footstep() {
    var wet = inPuddle(MX, MY);
    if (wet) {
      if (splashes.length < 80) { splashes.push({ x: MX - 2, y: MY, a: 0 }); splashes.push({ x: MX + 3, y: MY, a: 0 }); }
      if (ripples.length < 40) ripples.push({ x: MX, y: MY, a: 0 });
    }
    stepSound(wet);
  }
  function keyName(k) {
    if (k === 'ArrowLeft' || k === 'a' || k === 'A') return 'left';
    if (k === 'ArrowRight' || k === 'd' || k === 'D') return 'right';
    if (k === 'ArrowUp' || k === 'w' || k === 'W') return 'up';
    if (k === 'ArrowDown' || k === 's' || k === 'S') return 'down';
    return null;
  }
  window.addEventListener('keydown', function (e) {
    var m = keyName(e.key);
    if (m) { keys[m] = true; e.preventDefault(); startAudio(); hideHint(); return; }
    if (e.key === 'm' || e.key === 'M') { toggleMute(); return; }
    startAudio();
  });
  window.addEventListener('keyup', function (e) { var m = keyName(e.key); if (m) keys[m] = false; });
  window.addEventListener('blur', function () { keys = {}; });
  cv.addEventListener('pointerdown', function (e) {
    var r = cv.getBoundingClientRect();
    target = {
      x: Math.max(XMIN + 8, Math.min(XMAX - 8, (e.clientX - r.left) / r.width * W - OX)),
      y: Math.max(80, Math.min(97, (e.clientY - r.top) / r.height * H))
    };
    startAudio(); hideHint();
  });
  var hint = document.getElementById('hint');
  function hideHint() { if (hint) hint.style.opacity = '0'; }
  setTimeout(hideHint, 12000);

  /* ---------- rain sound (Web Audio, synthesized, no files) ---------- */
  var au = null, master = null, humGain = null, noiseBuf = null, muted = false;
  function startAudio() {
    if (au) { if (au.state === 'suspended' && !muted) { try { au.resume(); } catch (e) {} } return; }
    try {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      au = new AC();
      master = au.createGain(); master.gain.value = muted ? 0 : 0.9; master.connect(au.destination);
      noiseBuf = au.createBuffer(1, au.sampleRate * 2, au.sampleRate);
      var d = noiseBuf.getChannelData(0);
      for (var i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      var src = au.createBufferSource(); src.buffer = noiseBuf; src.loop = true;
      var hp = au.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 900;
      var lp = au.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 7000;
      var g = au.createGain(); g.gain.value = 0.1;
      src.connect(hp); hp.connect(lp); lp.connect(g); g.connect(master); src.start();
      var s2 = au.createBufferSource(); s2.buffer = noiseBuf; s2.loop = true; s2.playbackRate.value = 0.5;
      var l2 = au.createBiquadFilter(); l2.type = 'lowpass'; l2.frequency.value = 260;
      var g2 = au.createGain(); g2.gain.value = 0.16;
      s2.connect(l2); l2.connect(g2); g2.connect(master); s2.start();
      var o = au.createOscillator(); o.type = 'sawtooth'; o.frequency.value = 100;
      var of = au.createBiquadFilter(); of.type = 'lowpass'; of.frequency.value = 240;
      humGain = au.createGain(); humGain.gain.value = 0;
      o.connect(of); of.connect(humGain); humGain.connect(master); o.start();
      scheduleDrop();
    } catch (e) { au = null; }
  }
  function scheduleDrop() { if (!au) return; plop(); setTimeout(scheduleDrop, 70 + Math.random() * 220); }
  function plop() {
    if (muted || !au || au.state !== 'running') return;
    try {
      var o = au.createOscillator(), g = au.createGain(), now = au.currentTime, f = 700 + Math.random() * 900;
      o.type = 'sine';
      o.frequency.setValueAtTime(f, now); o.frequency.exponentialRampToValueAtTime(f * 0.5, now + 0.05);
      g.gain.setValueAtTime(0.018, now); g.gain.exponentialRampToValueAtTime(0.0001, now + 0.06);
      o.connect(g); g.connect(master); o.start(now); o.stop(now + 0.07);
    } catch (e) {}
  }
  function stepSound(wet) {
    if (!au || muted || au.state !== 'running') return;
    try {
      var sN = au.createBufferSource(); sN.buffer = noiseBuf;
      var bp = au.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = wet ? 1800 : 700; bp.Q.value = 0.8;
      var g = au.createGain(), now = au.currentTime;
      g.gain.setValueAtTime(wet ? 0.22 : 0.1, now); g.gain.exponentialRampToValueAtTime(0.0001, now + (wet ? 0.16 : 0.09));
      sN.connect(bp); bp.connect(g); g.connect(master); sN.start(now, Math.random()); sN.stop(now + 0.2);
    } catch (e) {}
  }
  function toggleMute() {
    muted = !muted;
    startAudio();
    if (master) master.gain.value = muted ? 0 : 0.9;
    if (hint) { hint.textContent = muted ? 'Ton aus (M)' : 'Ton an (M)'; hint.style.opacity = '1'; setTimeout(hideHint, 2500); }
  }

  var last = 0;
  function frame(now) {
    if (!last) last = now;
    var dt = Math.min(0.05, (now - last) / 1000) * SPEED;
    last = now;
    update(dt);
    render();
    requestAnimationFrame(frame);
  }
  update(0.016);
  render();
  requestAnimationFrame(frame);
})();
