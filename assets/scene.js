(function () {
  'use strict';
  var H = 100, BASE = 72, MX = 82, MY = 88, CW = 160;
  var VW = window.innerWidth || 800, VH = window.innerHeight || 500, ASP = VW / VH;
  var W = Math.max(160, Math.min(320, Math.round(100 * ASP)));
  var HW = Math.floor(W / 2);
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
  function rnd() { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; }
  function hash(n) { n = Math.imul(n ^ 0x5bd1e995, 0x85ebca6b); n ^= n >>> 13; n = Math.imul(n, 0xc2b2ae35); n ^= n >>> 16; return n >>> 0; }
  function mkRnd(s) { return function () { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; }; }
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

  /* camera: the world is endless, x runs from -infinity to +infinity */
  var cam = MX, camX = MX, camL = MX - HW, vis = [];

  /* ---------- palettes for rain / splashes depending on distance to the nearest lantern ---------- */
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
  function lampX(k) { return 105 + 120 * k; }
  function lvl(x, y) {
    var dx = x - lampX(Math.round((x - 105) / 120)), dy = (y - 40) * 0.7;
    var i = Math.floor(Math.sqrt(dx * dx + dy * dy) / 56 * (LV - 1));
    return i < LV - 1 ? i : LV - 1;
  }

  /* ---------- sky (screen space) ---------- */
  var sky = mk(), s = sky.getContext('2d');
  for (var sy = 0; sy < H; sy += 4) {
    var st = Math.min(1, sy / 76);
    R(s, 0, sy, W, 4, 'rgb(' + Math.round(3 + 9 * st) + ',' + Math.round(4 + 14 * st) + ',' + Math.round(10 + 26 * st) + ')');
  }

  /* ---------- endless generated town, built chunk by chunk ---------- */
  var palettes = ['#0d1120', '#10152a', '#0b0f1c', '#121829'];
  var chunks = {};
  var GL = { S: '111100111001111', C: '111100100100111', H: '101101111101101', U: '101101101101111', L: '100100100100111', E: '111100111100111' };
  function text(g, str, x, y, col) {
    for (var i = 0; i < str.length; i++) {
      var m = GL[str.charAt(i)];
      for (var k = 0; k < 15; k++) if (m.charAt(k) === '1') R(g, x + i * 4 + k % 3, y + Math.floor(k / 3), 1, 1, col);
    }
  }

  function drawHouse(g, r, c, o) {
    var x = o.x, w = o.w, hh = o.h, top = BASE - hh, rr, cc, ri;
    R(g, x, top, w, hh, palettes[o.tone]);
    R(g, x + w - 1, top, 1, hh, '#080b16');
    if (o.roof < 2) {
      var rh = Math.min(11, Math.floor((w + 2) / 2));
      for (rr = 0; rr < rh; rr++) R(g, x - 1 + rr, top - 1 - rr, w + 2 - 2 * rr, 1, rr === 0 ? '#151b30' : '#070a14');
      var cy = top - 1 - Math.min(5, rh - 1);
      R(g, x + 4, cy - 4, 3, 6, '#0a0e1b');
      R(g, x + 4, cy - 4, 3, 1, '#151b30');
    } else {
      R(g, x - 1, top - 2, w + 2, 2, '#070a14');
      R(g, x - 1, top - 2, w + 2, 1, '#151b30');
    }
    var cols = Math.max(1, Math.floor((w - 2) / 10));
    var rows = Math.max(1, Math.floor((hh - 16) / 11));
    var gap = (w - cols * 7) / (cols + 1);
    for (cc = 0; cc < cols; cc++) {
      for (ri = 0; ri < rows; ri++) {
        var fx = Math.round(x + gap * (cc + 1) + 7 * cc), fy = top + 4 + ri * 11;
        R(g, fx, fy, 7, 8, '#04060b');
        if (r() < 0.34) {
          c.wins.push({ x: fx + 1, y: fy + 1, ph: r() * 6.28 });
        } else {
          R(g, fx + 1, fy + 1, 5, 6, '#0b1328');
          R(g, fx + 3, fy + 1, 1, 6, '#04060b');
          if (r() < 0.5) R(g, fx + 1, fy + 1, 2, 1, '#141f3a');
        }
      }
    }
    R(g, x + Math.floor(w / 2) - 2, BASE - 10, 5, 10, '#05070d');
    R(g, x + Math.floor(w / 2) - 2, BASE - 10, 5, 1, '#0f1424');
  }

  function houses(g, r, c, a, b) {
    var x = a, w;
    while (b - x >= 18) {
      w = 22 + Math.floor(r() * 13);
      if (b - x - w < 18) w = b - x;
      drawHouse(g, r, c, { x: x, w: w, h: 26 + Math.floor(r() * 15), roof: Math.floor(r() * 3), tone: Math.floor(r() * 4) });
      x += w + (r() < 0.12 ? 7 : Math.floor(r() * 3));
    }
  }

  /* church: nave with coloured windows, tall tower with clock and spire (50 px wide) */
  function drawChurch(g, r, c, x) {
    var nw = 34, nh = 28, top = BASE - nh, tx = x + nw, TW = 14, TH = 54, tt = BASE - TH, i, wx;
    R(g, x, top, nw, nh, '#0b0f1c');
    R(g, x + nw - 1, top, 1, nh, '#080b16');
    for (i = 0; i < 17; i++) R(g, x - 1 + i, top - 1 - i, nw + 2 - 2 * i, 1, i === 0 ? '#151b30' : '#070a14');
    R(g, x + 16, top - 23, 2, 6, '#0a0e1a');
    R(g, x + 15, top - 21, 4, 1, '#0a0e1a');
    for (i = 0; i < 3; i++) {
      wx = x + 5 + i * 10;
      R(g, wx, top + 4, 5, 11, '#04060b');
      R(g, wx + 1, top + 3, 3, 1, '#04060b');
      R(g, wx + 1, top + 5, 3, 9, i === 1 ? '#3a2d52' : '#1d2547');
      R(g, wx + 2, top + 5, 1, 9, '#04060b');
    }
    R(g, x + 14, BASE - 12, 7, 12, '#05070d');
    R(g, x + 15, BASE - 13, 5, 1, '#05070d');
    R(g, x + 12, BASE - 1, 11, 1, '#222636');
    R(g, tx, tt, TW, TH, '#0b0f1c');
    R(g, tx + TW - 1, tt, 1, TH, '#070a13');
    for (i = 0; i < TW + 1; i++) R(g, tx - 1 + Math.floor(i / 2), tt - 1 - i, TW + 2 - i, 1, i === 0 ? '#151b30' : '#070a14');
    R(g, tx + 6, tt - 21, 1, 6, '#0a0e1a');
    R(g, tx + 5, tt - 19, 3, 1, '#0a0e1a');
    R(g, tx + 4, tt + 4, 6, 9, '#04060b');
    R(g, tx + 4, tt + 7, 6, 1, '#0b0f1c');
    R(g, tx + 4, tt + 10, 6, 1, '#0b0f1c');
    R(g, tx + 4, tt + 16, 6, 6, '#2a2d3a');
    R(g, tx + 5, tt + 17, 4, 4, '#7d7048');
    R(g, tx + 6, tt + 17, 1, 2, '#1b160a');
    R(g, tx + 6, tt + 18, 2, 1, '#1b160a');
    R(g, tx + 6, tt + 28, 2, 7, '#04060b');
    R(g, tx + 4, BASE - 12, 6, 12, '#04060b');
  }

  /* fortress: curtain wall, two towers, keep behind the gate, torches (148 px wide) */
  function drawFort(g, r, c, x) {
    var wt = BASE - 30, gx = x + 66, i, t2, tx2, TXS = [x + 2, x + 126];
    R(g, x + 50, BASE - 56, 48, 30, '#0c101d');
    R(g, x + 97, BASE - 56, 1, 30, '#070a14');
    for (i = 0; i < 48; i += 6) R(g, x + 50 + i, BASE - 60, 4, 4, '#0c101d');
    c.wins.push({ x: x + 58, y: BASE - 50, ph: r() * 6.28 });
    c.wins.push({ x: x + 85, y: BASE - 46, ph: r() * 6.28 });
    R(g, x, wt, 148, 30, '#0a0d19');
    R(g, x, wt, 148, 1, '#151b30');
    for (i = 0; i < 148; i += 6) R(g, x + i, wt - 4, 3, 4, '#0a0d19');
    for (i = 0; i < 70; i++) R(g, x + r() * 146, wt + 2 + r() * 27, 3, 1, '#0e1220');
    for (t2 = 0; t2 < 2; t2++) {
      tx2 = TXS[t2];
      R(g, tx2, BASE - 52, 20, 52, '#0b0f1c');
      R(g, tx2 + 19, BASE - 52, 1, 52, '#070a13');
      for (i = 0; i < 20; i += 5) R(g, tx2 + i, BASE - 56, 3, 4, '#0b0f1c');
      R(g, tx2 + 9, BASE - 44, 2, 7, '#04060b');
      R(g, tx2 + 9, BASE - 18, 2, 7, '#04060b');
      if (r() < 0.8) c.wins.push({ x: tx2 + 7, y: BASE - 32, ph: r() * 6.28 });
      R(g, tx2 + 10, BASE - 70, 1, 14, '#1b1e29');
      R(g, tx2 + 11, BASE - 70, 5, 3, '#6b2630');
    }
    R(g, gx - 2, BASE - 26, 20, 2, '#151b30');
    R(g, gx, BASE - 22, 16, 22, '#03040a');
    R(g, gx + 2, BASE - 24, 12, 2, '#03040a');
    for (i = 1; i < 16; i += 3) R(g, gx + i, BASE - 22, 1, 17, '#1a1d29');
    R(g, gx, BASE - 17, 16, 1, '#1a1d29');
    R(g, gx, BASE - 11, 16, 1, '#1a1d29');
    R(g, gx - 4, BASE - 16, 1, 3, '#14161f');
    R(g, gx + 19, BASE - 16, 1, 3, '#14161f');
    c.torches.push({ x: gx - 5, y: BASE - 18 });
    c.torches.push({ x: gx + 19, y: BASE - 18 });
  }

  /* school: long building, bell cupola, flag, sign over the door (78 px wide) */
  function drawSchool(g, r, c, x) {
    var top = BASE - 30, cols = [3, 13, 23, 47, 57, 67], i, j, fx, fy, rr, hgt;
    R(g, x, top, 78, 30, '#10152a');
    R(g, x + 77, top, 1, 30, '#080b16');
    R(g, x - 1, top - 3, 80, 3, '#070a14');
    R(g, x - 1, top - 3, 80, 1, '#151b30');
    R(g, x + 34, top - 15, 10, 12, '#0d1120');
    R(g, x + 37, top - 12, 4, 6, '#04060b');
    for (rr = 0; rr < 6; rr++) R(g, x + 33 + rr, top - 16 - rr, 12 - 2 * rr, 1, '#070a14');
    R(g, x + 70, top - 19, 1, 16, '#1b1e29');
    R(g, x + 71, top - 19, 6, 4, '#6b2630');
    for (i = 0; i < 6; i++) {
      for (j = 0; j < 2; j++) {
        fx = x + cols[i]; fy = top + (j ? 20 : 3); hgt = j ? 8 : 7;
        R(g, fx, fy, 7, hgt, '#04060b');
        if (r() < 0.2) {
          c.wins.push({ x: fx + 1, y: fy + 1, ph: r() * 6.28 });
        } else {
          R(g, fx + 1, fy + 1, 5, hgt - 2, '#0b1328');
          R(g, fx + 3, fy + 1, 1, hgt - 2, '#04060b');
        }
      }
    }
    R(g, x + 35, BASE - 11, 8, 11, '#05070d');
    R(g, x + 36, BASE - 11, 6, 2, '#6b4a1e');
    R(g, x + 33, BASE - 1, 12, 1, '#222636');
    R(g, x + 27, top + 12, 24, 7, '#1b1e29');
    text(g, 'SCHULE', x + 28, top + 13, '#7d7048');
  }

  /* park: iron fence, two bare trees, benches and a statue (70 px wide) */
  function drawPark(g, r, c, x) {
    var i, tx, n;
    for (i = 0; i < 70; i += 3) R(g, x + i, BASE - 6, 1, 6, '#14161f');
    R(g, x, BASE - 5, 70, 1, '#14161f');
    R(g, x + 32, BASE - 8, 7, 8, '#161a29');
    R(g, x + 31, BASE - 9, 9, 1, '#222636');
    R(g, x + 34, BASE - 17, 3, 8, '#10152a');
    R(g, x + 34, BASE - 19, 3, 2, '#10152a');
    R(g, x + 37, BASE - 18, 1, 3, '#10152a');
    R(g, x + 16, BASE - 3, 10, 1, '#1b1e29'); R(g, x + 17, BASE - 2, 1, 2, '#1b1e29'); R(g, x + 24, BASE - 2, 1, 2, '#1b1e29');
    R(g, x + 45, BASE - 3, 10, 1, '#1b1e29'); R(g, x + 46, BASE - 2, 1, 2, '#1b1e29'); R(g, x + 53, BASE - 2, 1, 2, '#1b1e29');
    for (i = 0; i < 2; i++) {
      tx = x + 10 + i * 50;
      R(g, tx, BASE - 16, 2, 16, '#0a0c14');
      ell(g, tx, BASE - 25, 9, 8, '#0a1018');
      ell(g, tx - 5, BASE - 20, 6, 5, '#0a1018');
      ell(g, tx + 6, BASE - 21, 6, 5, '#0a1018');
      for (n = 0; n < 14; n++) R(g, tx - 9 + r() * 19, BASE - 33 + r() * 16, 1, 1, '#050810');
    }
  }

  function ground(g, r, c) {
    var cx = c.cx, wx, n, i, q, p, rx;
    R(g, cx, BASE, CW, 6, '#161a29');
    for (wx = Math.floor(cx / 9) * 9 - 9; wx < cx + CW; wx += 9) { R(g, wx, BASE + 1, 1, 2, '#0d101c'); R(g, wx + 4, BASE + 3, 1, 2, '#0d101c'); }
    R(g, cx, BASE + 5, CW, 1, '#272d44');
    R(g, cx, BASE + 6, CW, H - BASE - 6, '#0a0c15');
    for (n = 0; n < 170; n++) R(g, cx + r() * CW, BASE + 7 + r() * (H - BASE - 8), 1 + Math.floor(r() * 2), 1, r() < 0.5 ? '#0f121e' : '#06080e');
    q = 2 + Math.floor(r() * 3);
    for (i = 0; i < q; i++) {
      rx = 8 + Math.floor(r() * 11);
      p = { x: cx + rx + 1 + Math.floor(r() * (CW - 2 * rx - 2)), y: 84 + Math.floor(r() * 8), rx: rx, ry: 2 + Math.floor(r() * 2) };
      c.puddles.push(p);
      ell(g, p.x, p.y, p.rx, p.ry, '#0f1627');
      ell(g, p.x, p.y, p.rx - 2, p.ry - 1, '#131c32');
    }
  }

  function buildChunk(ci) {
    var r = mkRnd(hash(ci * 7919 + 13)), cx = ci * CW, end = cx + CW;
    var cn = document.createElement('canvas');
    cn.width = CW; cn.height = H;
    var g = cn.getContext('2d');
    g.translate(-cx, 0);
    var c = { cx: cx, cv: cn, wins: [], torches: [], puddles: [] };
    var roll = r(), theme = roll < 0.5 ? 0 : roll < 0.64 ? 1 : roll < 0.76 ? 2 : roll < 0.88 ? 3 : 4;
    var LW = [0, 50, 148, 78, 70][theme];
    var lx = cx + 4 + Math.floor(r() * (CW - LW - 8));
    if (!theme) {
      houses(g, r, c, cx, end);
    } else {
      houses(g, r, c, cx, lx - 2);
      [null, drawChurch, drawFort, drawSchool, drawPark][theme](g, r, c, lx);
      houses(g, r, c, lx + LW + 2, end);
    }
    ground(g, r, c);
    return c;
  }
  function getChunk(ci) { return chunks[ci] || (chunks[ci] = buildChunk(ci)); }
  function visible() {
    var a = Math.floor(camL / CW), b = Math.floor((camL + W) / CW), mid = Math.floor(camX / CW), i, k;
    vis.length = 0;
    for (i = a; i <= b; i++) vis.push(getChunk(i));
    for (k in chunks) if (Math.abs(k - mid) > 3) delete chunks[k];
  }
  function inPuddle(x, y) {
    var ps = getChunk(Math.floor(x / CW)).puddles, i, q, dx, dy;
    for (i = 0; i < ps.length; i++) {
      q = ps[i]; dx = (x - q.x) / q.rx; dy = (y - q.y) / q.ry;
      if (dx * dx + dy * dy < 1) return true;
    }
    return false;
  }

  /* far skyline, parallax, screen space */
  function drawFar() {
    var p = Math.round(camX * 0.3), a = Math.floor(p / 8), b = Math.floor((p + W) / 8), id, hv, ht, sx;
    for (id = a; id <= b; id++) {
      hv = hash(id * 31 + 5); ht = 20 + hv % 34; sx = id * 8 - p;
      ctx.fillStyle = '#0b1124';
      ctx.fillRect(sx, BASE - ht, 8, ht);
      if (hv % 9 === 0) { ctx.fillRect(sx + 3, BASE - ht - 10, 2, 10); ctx.fillRect(sx + 2, BASE - ht - 3, 4, 3); }
      else if (hv % 7 === 0) ctx.fillRect(sx + 1, BASE - ht - 3, 6, 3);
      if (hv % 4 === 1) { ctx.fillStyle = '#5a3d18'; ctx.fillRect(sx + 2 + hv % 4, BASE - ht + 4 + (hv >> 3) % 10, 1, 1); }
    }
  }

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
    d.x = camL - 4 + Math.random() * (W + 38);
    d.y = init ? Math.random() * d.land : -Math.random() * 24;
    return d;
  }
  for (i0 = 0; i0 < 90; i0++) farDrops.push(spawnDrop(false, true));
  for (i0 = 0; i0 < 60; i0++) nearDrops.push(spawnDrop(true, true));
  for (i0 = 0; i0 < 6; i0++) clouds.push({ x: rnd() * W, y: 6 + rnd() * 34, w: 30 + Math.floor(rnd() * 40), sp: 2 + rnd() * 4 });

  var t = 0, rippleT = 0, flickT = 0, flickTarget = 1, flick = 1;

  function stepDrops(arr, dt) {
    for (var i = 0; i < arr.length; i++) {
      var d = arr[i];
      d.x += d.vx * dt; d.y += d.vy * dt;
      if (d.x < camL - 4) d.x += W + 38; else if (d.x > camL + W + 34) d.x -= W + 38;
      if (d.y >= d.land) {
        if (d.x >= camL && d.x < camL + W && splashes.length < 80) splashes.push({ x: Math.round(d.x), y: d.land, a: 0 });
        if (d.near && Math.random() < 0.3 && ripples.length < 40 && inPuddle(d.x, d.land)) ripples.push({ x: Math.round(d.x), y: d.land, a: 0 });
        arr[i] = spawnDrop(d.near, false);
      }
    }
  }

  function update(dt) {
    var i, k;
    t += dt;
    moveMan(dt);
    cam += (px - cam) * Math.min(1, dt * 5);
    camX = Math.round(cam); camL = camX - HW;
    visible();
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
        var vc = vis[Math.floor(Math.random() * vis.length)], q = vc.puddles[Math.floor(Math.random() * vc.puddles.length)];
        ripples.push({ x: q.x + Math.round((Math.random() * 2 - 1) * q.rx * 0.8), y: q.y + Math.round((Math.random() * 2 - 1) * q.ry * 0.7), a: 0 });
      }
    }
    for (i = 0; i < clouds.length; i++) clouds[i].x -= clouds[i].sp * dt;
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
    var wk = (moving && jz < 1 && (Math.floor(walkT * 9) % 2)) ? 1 : 0;
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
      if (x < camL || x >= camL + W) continue;
      ctx.fillStyle = p[lvl(x, y)];
      ctx.fillRect(x, y - d.len, 1, d.len);
    }
  }
  var vig = ctx.createRadialGradient(W * 0.5, 52, 28, W * 0.5, 52, Math.max(105, W * 0.65));
  vig.addColorStop(0, 'rgba(0,0,0,0)');
  vig.addColorStop(1, 'rgba(0,0,0,0.55)');

  function render() {
    var i, j, y, k, ka, kb, lx, fk, ch, w, o, cl, cxs;
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
    ctx.drawImage(sky, 0, 0);
    ctx.fillStyle = 'rgba(26,38,66,0.55)';
    for (i = 0; i < clouds.length; i++) {
      cl = clouds[i];
      cxs = Math.round((((cl.x - cam * 0.12) % (W + 70)) + (W + 70)) % (W + 70)) - 70;
      ctx.fillRect(cxs, Math.round(cl.y), cl.w, 3);
      ctx.fillRect(cxs + 4, Math.round(cl.y) - 2, Math.round(cl.w * 0.5), 2);
      ctx.fillRect(cxs + Math.round(cl.w * 0.25), Math.round(cl.y) + 3, Math.round(cl.w * 0.55), 2);
    }
    drawFar();
    ctx.save();
    ctx.translate(-camL, 0);
    for (i = 0; i < vis.length; i++) ctx.drawImage(vis[i].cv, vis[i].cx, 0);
    for (i = 0; i < vis.length; i++) {
      ch = vis[i];
      for (j = 0; j < ch.wins.length; j++) {
        w = ch.wins[j];
        R(ctx, w.x, w.y, 5, 6, Math.sin(t * 0.9 + w.ph) > 0.92 ? '#b87a2c' : '#dc9c3e');
        R(ctx, w.x + 2, w.y, 1, 6, '#5a3812');
      }
    }

    /* lantern posts */
    ka = Math.floor((camL - 165) / 120); kb = Math.ceil((camL + W - 45) / 120);
    for (k = ka; k <= kb; k++) {
      lx = lampX(k);
      R(ctx, lx - 1, 45, 2, 28, '#14161f');
      R(ctx, lx - 1, 45, 1, 28, '#222636');
      R(ctx, lx - 3, 73, 6, 4, '#1b1e29');
      R(ctx, lx - 5, 36, 10, 2, '#14161f');
      R(ctx, lx - 1, 34, 2, 2, '#14161f');
      R(ctx, lx - 3, 44, 6, 1, '#14161f');
      R(ctx, lx - 4, 38, 1, 6, '#14161f');
      R(ctx, lx + 3, 38, 1, 6, '#14161f');
    }

    /* man: shadow, puddle reflection, body */
    ell(ctx, MX, MY + 1, 7, 1, 'rgba(0,0,0,0.5)');
    ctx.save();
    ctx.beginPath(); ctx.rect(MX - 9, MY + 2, 18, 5); ctx.clip();
    ctx.globalAlpha = 0.22;
    ctx.translate(0, 2 * MY + 2); ctx.scale(1, -1);
    drawMan(ctx, MX, MY);
    ctx.restore();
    drawMan(ctx, MX, MY - Math.round(jz));

    drawRain(farDrops, palFar);

    /* lantern and torch light, additive */
    ctx.globalCompositeOperation = 'lighter';
    var shim = Math.floor(t * 6);
    for (k = ka; k <= kb; k++) {
      lx = lampX(k);
      fk = calm ? flick : flick * (1 + 0.05 * Math.sin(t * 7 + k * 2.1));
      glow(lx, 40, 46, 42, 9, 0.024 * fk);
      glow(lx, 40, 14, 13, 5, 0.07 * fk);
      ctx.fillStyle = 'rgba(255,170,90,' + (0.032 * fk).toFixed(3) + ')';
      for (y = 45; y < 94; y++) { var hw = 3 + Math.floor((y - 45) * 0.75); ctx.fillRect(lx - hw, y, hw * 2 + 1, 1); }
      glow(lx, 84, 40, 9, 6, 0.03 * fk);
      /* lamp reflection on the wet road */
      for (y = 79; y < 100; y++) {
        if ((y + shim) % 2) continue;
        var a = 0.14 * (1 - (y - 79) / 30);
        if (inPuddle(lx, y)) a *= 2.2;
        var rw = 1 + ((y * 7 + shim) % 3);
        ctx.fillStyle = 'rgba(255,190,100,' + a.toFixed(3) + ')';
        ctx.fillRect(lx - Math.floor(rw / 2), y, rw, 1);
      }
    }
    for (i = 0; i < vis.length; i++) {
      for (j = 0; j < vis[i].torches.length; j++) {
        o = vis[i].torches[j];
        glow(o.x + 1, o.y, 13, 12, 4, 0.05 * (0.85 + 0.15 * Math.sin(t * 23 + o.x)));
      }
    }
    ctx.globalCompositeOperation = 'source-over';

    /* lamp glass and torch flames */
    for (k = ka; k <= kb; k++) {
      lx = lampX(k);
      R(ctx, lx - 3, 38, 6, 6, '#ffcf7a');
      R(ctx, lx - 2, 39, 4, 4, '#ffe7ae');
      R(ctx, lx - 1, 40, 2, 2, '#fffbe6');
    }
    for (i = 0; i < vis.length; i++) {
      for (j = 0; j < vis[i].torches.length; j++) {
        o = vis[i].torches[j];
        R(ctx, o.x, o.y - 1, 2, 2, '#ffd27a');
        R(ctx, o.x, o.y - 3 + (Math.floor(t * 12 + o.x) % 2), 2, 2, '#ff8a2a');
      }
    }

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
      for (var q = 0; q < 18; q++) {
        var ang = q / 18 * Math.PI * 2;
        ctx.fillRect(Math.round(rp.x + rx * Math.cos(ang)), Math.round(rp.y + ry * Math.sin(ang)), 1, 1);
      }
    }
    ctx.globalAlpha = 1;

    ctx.restore();
    ctx.fillStyle = vig;
    ctx.fillRect(0, 0, W, H);
  }

  /* ---------- controls ---------- */
  var jz = 0, jv = 0, jumping = false, lastTap = 0, px = MX, py = MY, keys = {}, target = null, moving = false, walkT = 0, stepT = 0;
  function jump() { if (jumping) return; jumping = true; jv = 75; startAudio(); hideHint(); }
  function moveMan(dt) {
    if (jumping) {
      jz += jv * dt; jv -= 260 * dt;
      if (jz <= 0) {
        jz = 0; jv = 0; jumping = false;
        if (inPuddle(MX, MY)) {
          if (splashes.length < 80) { splashes.push({ x: MX - 3, y: MY, a: 0 }); splashes.push({ x: MX + 4, y: MY, a: 0 }); }
          if (ripples.length < 40) ripples.push({ x: MX, y: MY, a: 0 });
        }
      }
    }
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
      px += dx / len * 32 * dt; py += dy / len * 32 * dt * 0.6;
      walkT += dt; stepT += dt;
      if (stepT > 0.2) { stepT = 0; footstep(); }
    }
    py = Math.max(80, Math.min(97, py));
    MX = Math.round(px); MY = Math.round(py);
  }
  function footstep() {
    var wet = inPuddle(MX, MY);
    if (wet) {
      if (splashes.length < 80) { splashes.push({ x: MX - 2, y: MY, a: 0 }); splashes.push({ x: MX + 3, y: MY, a: 0 }); }
      if (ripples.length < 40) ripples.push({ x: MX, y: MY, a: 0 });
    }
  }
  function keyName(k) {
    if (k === 'ArrowLeft' || k === 'a' || k === 'A') return 'left';
    if (k === 'ArrowRight' || k === 'd' || k === 'D') return 'right';
    if (k === 'ArrowUp' || k === 'w' || k === 'W') return 'up';
    if (k === 'ArrowDown' || k === 's' || k === 'S') return 'down';
    return null;
  }
  window.addEventListener('keydown', function (e) {
    if (e.code === 'Space' || e.key === ' ') { e.preventDefault(); jump(); return; }
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
      x: camL + (e.clientX - r.left) / r.width * W,
      y: Math.max(80, Math.min(97, (e.clientY - r.top) / r.height * H))
    };
    var nowT = Date.now();
    if (nowT - lastTap < 300) jump();
    lastTap = nowT;
    startAudio(); hideHint();
  });
  var hint = document.getElementById('hint');
  function hideHint() { if (hint) hint.style.opacity = '0'; }
  setTimeout(hideHint, 12000);

  /* ---------- 1995-style adventure music (synthesized in the browser, no files) ---------- */
  var au = null, master = null, noiseBuf = null, muted = false, seqTimer = 0, nextTime = 0, seqStep = 0;
  var SD = 60 / 88 / 2;
  var ROOT = [57, 53, 55, 52, 57, 53, 50, 52];
  var MIN = [1, 0, 0, 1, 1, 0, 1, 0];
  var MEL = [
    [69, 0, 72, 0, 76, 0, 72, 69], [65, 0, 69, 0, 72, 0, 77, 0],
    [67, 0, 71, 0, 74, 0, 71, 67], [64, 0, 67, 0, 71, 0, 76, 0],
    [69, 0, 72, 0, 76, 0, 81, 79], [77, 0, 76, 0, 72, 0, 69, 72],
    [74, 0, 77, 0, 81, 0, 77, 74], [76, 0, 80, 0, 83, 0, 80, 76]
  ];
  var ARP = [0, 1, 2, 1, 0, 1, 2, 1];
  function freq(n) { return 440 * Math.pow(2, (n - 69) / 12); }
  function tone(type, n, t0, dur, vol, cut) {
    var o = au.createOscillator(), f = au.createBiquadFilter(), g = au.createGain();
    o.type = type; o.frequency.value = freq(n);
    f.type = 'lowpass'; f.frequency.value = cut;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.linearRampToValueAtTime(vol, t0 + 0.012);
    g.gain.exponentialRampToValueAtTime(vol * 0.55, t0 + Math.min(0.12, dur * 0.5));
    g.gain.setValueAtTime(vol * 0.55, t0 + dur);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur + 0.08);
    o.connect(f); f.connect(g); g.connect(master);
    o.start(t0); o.stop(t0 + dur + 0.1);
  }
  function noiseHit(t0, dur, vol, hz, type) {
    var sN = au.createBufferSource(); sN.buffer = noiseBuf;
    var bp = au.createBiquadFilter(); bp.type = type; bp.frequency.value = hz;
    var g = au.createGain();
    g.gain.setValueAtTime(vol, t0); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    sN.connect(bp); bp.connect(g); g.connect(master);
    sN.start(t0, Math.random()); sN.stop(t0 + dur + 0.02);
  }
  function kick(t0) {
    var o = au.createOscillator(), g = au.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(120, t0); o.frequency.exponentialRampToValueAtTime(45, t0 + 0.12);
    g.gain.setValueAtTime(0.14, t0); g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.14);
    o.connect(g); g.connect(master); o.start(t0); o.stop(t0 + 0.16);
  }
  function playStep(st, t0) {
    var bar = Math.floor(st / 8), i = st % 8, root = ROOT[bar];
    var ch = [root, root + (MIN[bar] ? 3 : 4), root + 7];
    var m = MEL[bar][i];
    if (m) {
      var len = 1;
      while (i + len < 8 && !MEL[bar][i + len] && len < 4) len++;
      tone('square', m, t0, len * SD * 0.9, 0.045, 2600);
    }
    tone('triangle', ch[ARP[i]], t0, SD * 0.8, 0.03, 2000);
    if (i === 0 || i === 4) tone('triangle', root - 12, t0, SD * 3.6, 0.09, 500);
    noiseHit(t0, 0.03, i % 2 ? 0.012 : 0.02, 7000, 'highpass');
    if (i === 2 || i === 6) noiseHit(t0, 0.1, 0.03, 1800, 'bandpass');
    if (i === 0 || i === 4) kick(t0);
  }
  function schedule() {
    if (!au) return;
    if (nextTime < au.currentTime) nextTime = au.currentTime + 0.05;
    while (nextTime < au.currentTime + 0.25) {
      playStep(seqStep, nextTime);
      nextTime += SD;
      seqStep = (seqStep + 1) % 64;
    }
  }
  function startAudio() {
    if (au) { if (au.state === 'suspended') { try { au.resume(); } catch (e) {} } return; }
    try {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      au = new AC();
      master = au.createGain(); master.gain.value = muted ? 0 : 0.55; master.connect(au.destination);
      noiseBuf = au.createBuffer(1, au.sampleRate * 2, au.sampleRate);
      var d = noiseBuf.getChannelData(0);
      for (var i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      try { au.resume(); } catch (e) {}
      nextTime = au.currentTime + 0.1;
      seqTimer = setInterval(schedule, 60);
    } catch (e) { au = null; }
  }
  function toggleMute() {
    muted = !muted;
    startAudio();
    if (master) master.gain.value = muted ? 0 : 0.55;
    if (hint) { hint.textContent = muted ? 'Musik aus (M)' : 'Musik an (M)'; hint.style.opacity = '1'; setTimeout(hideHint, 2500); }
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
