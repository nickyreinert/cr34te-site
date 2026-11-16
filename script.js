(function () {
  'use strict';

  var canvas = document.getElementById('scene');
  var ctx = canvas.getContext('2d', { alpha: false });
  var app = document.getElementById('app');
  var TAU = Math.PI * 2;

  // ---------- helpers ----------
  function rng(seed) {
    var a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function clamp(x, a, b) { return x < a ? a : (x > b ? b : x); }

  // ---------- countdown ----------
  var TARGET = new Date(2026, 10, 19, 0, 0, 0, 0).getTime();
  var elD = document.getElementById('cd'), elH = document.getElementById('ch');
  var elM = document.getElementById('cm'), elS = document.getElementById('cs');
  var elClock = document.getElementById('clock'), elDone = document.getElementById('done');
  var elNote = document.getElementById('note');
  var lastShown = -1;
  function pad(n) { return n < 10 ? '0' + n : '' + n; }
  function tickClock() {
    var left = Math.floor((TARGET - Date.now()) / 1000);
    if (left === lastShown) return;
    lastShown = left;
    if (left <= 0) {
      elClock.hidden = true;
      elNote.hidden = true;
      elDone.hidden = false;
      return;
    }
    elD.textContent = pad(Math.floor(left / 86400));
    elH.textContent = pad(Math.floor(left % 86400 / 3600));
    elM.textContent = pad(Math.floor(left % 3600 / 60));
    elS.textContent = pad(left % 60);
  }

  // ---------- scene state ----------
  var W = 1, H = 1, PR = 1, hy = 1, cx = 1, focal = 1;
  var CAM_H = 1.55, ROAD = 7.4, NEARZ = 2.7, FARZ = 420, GAP = 44;
  var skyline = null, starList = [], clouds = [], ripples = [], asphalt = null;
  var time = 0, scroll = 0;
  var ZC = 4.2, CARW = 2.0, LANES = [-5.55, -1.85, 1.85, 5.55], TRAFFIC_V = 17;
  var mode = 'ready', speed = 24, playerX = 1.85, camX = 1.48, dist = 0, best = 0, crashT = 0;
  var SPEED_MIN = 9, SPEED_MAX = 58, brakeLights = 0;
  var traffic = [], rowRand = rng((Date.now() & 0xffffff) + 7);
  var PLAYER_PAL = ['#ffd9cf', '#e8574a', '#c0302a', '#7a140f', '#3a0a08'];
  var PALS = [
    ['#b8f0ea', '#3fb0a8', '#2a8f8a', '#143f52', '#0b1f30'],
    ['#ffffff', '#e6d8ee', '#b8a8d0', '#5a4680', '#241640'],
    ['#ffe0b0', '#ff9a4a', '#d8652e', '#6a2a2a', '#2a1020'],
    ['#ffc0c0', '#f0486a', '#c22a5a', '#551038', '#220a20'],
    ['#fff6c0', '#ffd24a', '#d8a030', '#6a4420', '#2a1620'],
    ['#9aa0a6', '#4a4e55', '#33363d', '#1a1c20', '#0d0e10']
  ];
  try { best = parseFloat(window.localStorage.getItem('causeway_best')) || 0; } catch (e) { best = 0; }

  function px(x, z) { return cx + (x - camX) * focal / z; }
  function py(y, z) { return hy + (CAM_H - y) * focal / z; }

  function buildSkyline() {
    var r = rng(606), c = document.createElement('canvas');
    var sh = Math.max(2, Math.round(H * 0.3));
    c.width = W; c.height = sh;
    var g = c.getContext('2d');
    var layers = [
      { n: 46, hMin: 0.05, hMax: 0.2, top: '#6b3a86', bot: '#8a4a8e', win: 0.25, a: 0.75 },
      { n: 34, hMin: 0.07, hMax: 0.36, top: '#2a1650', bot: '#4a2468', win: 0.5, a: 1 }
    ];
    for (var L = 0; L < layers.length; L++) {
      var ly = layers[L], x = -W * 0.02;
      for (var i = 0; i < ly.n && x < W * 1.02; i++) {
        var bw = W * (0.012 + r() * 0.022);
        var u = x / W;
        var bump = Math.exp(-Math.pow((u - 0.66) / 0.16, 2)) * 1.0 + Math.exp(-Math.pow((u - 0.3) / 0.12, 2)) * 0.6 + 0.25;
        var bh = H * (ly.hMin + r() * (ly.hMax - ly.hMin)) * clamp(bump, 0.25, 1.1);
        if (r() < 0.12) bh *= 1.35;
        bh = Math.min(bh, sh * 0.98);
        var top = sh - bh;
        var grad = g.createLinearGradient(0, top, 0, sh);
        grad.addColorStop(0, ly.top); grad.addColorStop(1, ly.bot);
        g.globalAlpha = ly.a;
        g.fillStyle = grad;
        g.fillRect(x, top, bw, bh);
        if (r() < 0.35) g.fillRect(x + bw * 0.25, top - bh * 0.06, bw * 0.5, bh * 0.06);
        if (r() < 0.2) g.fillRect(x + bw * 0.48, top - bh * 0.18, Math.max(1, bw * 0.05), bh * 0.18);
        // sunlit edge
        g.globalAlpha = 0.35 * ly.a;
        g.fillStyle = '#ff9a8a';
        g.fillRect(u < 0.55 ? x + bw - Math.max(1, bw * 0.08) : x, top, Math.max(1, bw * 0.08), bh);
        // windows
        var ws = Math.max(1.5, H * 0.0038), gapx = ws * 1.9, gapy = ws * 2.1;
        for (var wy = top + ws * 1.5; wy < sh - ws * 2; wy += gapy) {
          for (var wx = x + ws; wx < x + bw - ws * 1.4; wx += gapx) {
            var q = r();
            if (q > ly.win) continue;
            g.globalAlpha = (0.55 + r() * 0.45) * ly.a;
            g.fillStyle = q < ly.win * 0.6 ? '#ffd27a' : (q < ly.win * 0.85 ? '#ff8ad0' : '#9fe8ff');
            g.fillRect(wx, wy, ws, ws * 1.15);
          }
        }
        x += bw + (r() < 0.3 ? W * 0.004 : 0);
      }
    }
    g.globalAlpha = 1;
    skyline = c;
  }

  function buildSky() {
    var r = rng(1913), i;
    starList = [];
    for (i = 0; i < 70; i++) starList.push([r(), r() * 0.5, 0.5 + r() * 1.2, r() * TAU]);
    clouds = [];
    for (i = 0; i < 16; i++) {
      var y = 0.08 + r() * 0.72;
      clouds.push({ x: r() * 1.4 - 0.2, y: y, w: 0.14 + r() * 0.3, h: 0.012 + r() * 0.03, s: 0.002 + r() * 0.004, a: 0.25 + r() * 0.4, puffs: 3 + ((r() * 4) | 0), seed: r() });
    }
    ripples = [];
    for (i = 0; i < 90; i++) ripples.push([r(), Math.pow(r(), 1.8), 0.02 + r() * 0.07, r() * TAU, 0.4 + r() * 1.2]);
  }

  function resize() {
    PR = Math.min(window.devicePixelRatio || 1, 2);
    var w = Math.max(2, Math.floor(app.clientWidth * PR));
    var h = Math.max(2, Math.floor(app.clientHeight * PR));
    if (w === W && h === H && skyline) return;
    W = w; H = h;
    canvas.width = W; canvas.height = H;
    hy = Math.round(H * 0.56);
    cx = W / 2;
    focal = Math.min(H * 0.78, W * 0.62);
    NEARZ = Math.min(2.7, CAM_H * focal / (H - hy) * 0.97);
    buildSkyline();
  }

  // ---------- drawing ----------
  function drawSky() {
    var g = ctx.createLinearGradient(0, 0, 0, hy);
    g.addColorStop(0, '#1d1147');
    g.addColorStop(0.3, '#43207a');
    g.addColorStop(0.58, '#8a2f8f');
    g.addColorStop(0.8, '#e2527f');
    g.addColorStop(0.93, '#ff8d5c');
    g.addColorStop(1, '#ffc56e');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, hy + 1);

    var i;
    ctx.fillStyle = '#fff';
    for (i = 0; i < starList.length; i++) {
      var s = starList[i];
      ctx.globalAlpha = (1 - s[1] * 1.9) * (0.45 + 0.35 * Math.sin(time * 1.3 + s[3]));
      if (ctx.globalAlpha <= 0.02) continue;
      var sz = s[2] * PR;
      ctx.fillRect(s[0] * W, s[1] * hy, sz, sz);
    }
    ctx.globalAlpha = 1;

    // sun
    var sx = cx + W * 0.13, sy = hy - H * 0.012, sr = H * 0.075;
    var gl = ctx.createRadialGradient(sx, sy, sr * 0.3, sx, sy, sr * 6.5);
    gl.addColorStop(0, 'rgba(255,214,140,0.85)');
    gl.addColorStop(0.18, 'rgba(255,150,110,0.42)');
    gl.addColorStop(0.5, 'rgba(255,90,150,0.14)');
    gl.addColorStop(1, 'rgba(255,90,150,0)');
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = gl;
    ctx.fillRect(0, 0, W, hy + 1);
    ctx.globalCompositeOperation = 'source-over';
    var sg = ctx.createLinearGradient(0, sy - sr, 0, sy + sr);
    sg.addColorStop(0, '#fff6c8'); sg.addColorStop(0.55, '#ffc46b'); sg.addColorStop(1, '#ff7f7f');
    ctx.fillStyle = sg;
    ctx.beginPath(); ctx.arc(sx, sy, sr, 0, TAU); ctx.fill();

    // clouds: dark tops, glowing undersides
    for (i = 0; i < clouds.length; i++) {
      var c = clouds[i];
      var x = ((c.x + time * c.s) % 1.6 + 1.6) % 1.6 - 0.3;
      var cy = c.y * hy, cw = c.w * W, ch = c.h * H;
      var low = c.y;
      for (var p = 0; p < c.puffs; p++) {
        var off = (p / c.puffs - 0.5) * cw * 0.9 + Math.sin(c.seed * 50 + p * 2.3) * cw * 0.08;
        var pw = cw * (0.32 + 0.14 * Math.sin(c.seed * 90 + p * 1.7));
        var ph = ch * (0.8 + 0.4 * Math.sin(c.seed * 70 + p));
        ctx.globalAlpha = c.a * 0.8;
        ctx.fillStyle = low > 0.45 ? '#5a2a7c' : '#33206a';
        ctx.beginPath(); ctx.ellipse(x * W + off, cy, pw, ph, 0, 0, TAU); ctx.fill();
        ctx.globalAlpha = c.a * (0.35 + low * 0.6);
        ctx.fillStyle = low > 0.55 ? '#ff9a7a' : '#ff5fa8';
        ctx.beginPath(); ctx.ellipse(x * W + off, cy + ph * 0.55, pw * 0.96, ph * 0.42, 0, 0, TAU); ctx.fill();
      }
    }
    ctx.globalAlpha = 1;

    // distant jet with a contrail
    var jt = (time * 0.012) % 1.3;
    var jx = W * (0.15 + jt * 0.75), jy = hy * (0.42 - jt * 0.14);
    var tl = W * 0.16;
    var tg = ctx.createLinearGradient(jx - tl, jy + tl * 0.19, jx, jy);
    tg.addColorStop(0, 'rgba(255,190,220,0)'); tg.addColorStop(1, 'rgba(255,225,235,0.8)');
    ctx.strokeStyle = tg; ctx.lineWidth = Math.max(1, PR * 1.2);
    ctx.beginPath(); ctx.moveTo(jx - tl, jy + tl * 0.19); ctx.lineTo(jx, jy); ctx.stroke();
    ctx.fillStyle = '#1b1038';
    var js = Math.max(3, H * 0.006);
    ctx.beginPath();
    ctx.moveTo(jx + js * 2.4, jy - js * 0.45); ctx.lineTo(jx - js * 0.6, jy + js * 0.5);
    ctx.lineTo(jx - js * 1.6, jy - js * 0.5); ctx.lineTo(jx - js * 0.3, jy + js * 0.1);
    ctx.lineTo(jx + js * 0.2, jy + js * 1.5); ctx.lineTo(jx + js * 0.9, jy - js * 0.05);
    ctx.closePath(); ctx.fill();
  }

  function drawWater() {
    var g = ctx.createLinearGradient(0, hy, 0, H);
    g.addColorStop(0, '#ffb070');
    g.addColorStop(0.07, '#e0567f');
    g.addColorStop(0.3, '#7a2f8c');
    g.addColorStop(0.7, '#2c1658');
    g.addColorStop(1, '#170c36');
    ctx.fillStyle = g;
    ctx.fillRect(0, hy, W, H - hy);

    // skyline reflection
    ctx.save();
    ctx.globalAlpha = 0.42;
    ctx.translate(0, hy);
    ctx.scale(1, -0.75);
    ctx.drawImage(skyline, 0, -skyline.height);
    ctx.restore();

    // sun path
    var sx = cx + W * 0.13;
    var sp = ctx.createLinearGradient(0, hy, 0, hy + H * 0.3);
    sp.addColorStop(0, 'rgba(255,205,130,0.4)'); sp.addColorStop(1, 'rgba(255,120,130,0)');
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = sp;
    ctx.beginPath();
    ctx.moveTo(sx - H * 0.05, hy); ctx.lineTo(sx + H * 0.05, hy);
    ctx.lineTo(sx + H * 0.16, hy + H * 0.3); ctx.lineTo(sx - H * 0.16, hy + H * 0.3);
    ctx.closePath(); ctx.fill();

    // ripples
    for (var i = 0; i < ripples.length; i++) {
      var r = ripples[i];
      var y = hy + 2 + r[1] * (H - hy);
      var d = 0.25 + r[1];
      var w = r[2] * W * d;
      var x = ((r[0] + time * 0.006 * r[4]) % 1) * (W + w) - w;
      ctx.globalAlpha = (0.1 + 0.16 * (0.5 + 0.5 * Math.sin(time * 1.6 * r[4] + r[3]))) * (1.1 - r[1] * 0.6);
      ctx.fillStyle = r[1] < 0.25 ? '#ffd0a0' : '#ff8fc8';
      ctx.fillRect(x, y, w, Math.max(1, PR * (0.8 + r[1] * 1.6)));
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
  }

  function drawSkyline() {
    ctx.drawImage(skyline, 0, hy - skyline.height + 1);
    // haze over the far shore
    var hz = ctx.createLinearGradient(0, hy - H * 0.09, 0, hy + 1);
    hz.addColorStop(0, 'rgba(255,150,120,0)'); hz.addColorStop(1, 'rgba(255,170,120,0.5)');
    ctx.fillStyle = hz;
    ctx.fillRect(0, hy - H * 0.09, W, H * 0.09 + 1);
    // causeway lights along the far shore
    ctx.globalCompositeOperation = 'lighter';
    for (var i = 0; i < 60; i++) {
      var x = (i + 0.5) / 60 * W;
      ctx.globalAlpha = 0.5 + 0.4 * Math.sin(time * 2 + i * 1.9);
      ctx.fillStyle = i % 3 ? '#ffc070' : '#ff7ac0';
      ctx.fillRect(x, hy - PR, Math.max(1, PR * 1.5), Math.max(1, PR * 1.5));
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
  }

  function quad(x1, y1, z1, x2, y2, z2, x3, y3, z3, x4, y4, z4) {
    ctx.beginPath();
    ctx.moveTo(px(x1, z1), py(y1, z1)); ctx.lineTo(px(x2, z2), py(y2, z2));
    ctx.lineTo(px(x3, z3), py(y3, z3)); ctx.lineTo(px(x4, z4), py(y4, z4));
    ctx.closePath(); ctx.fill();
  }

  function drawRoad() {
    var i, z;
    // bridge deck
    var g = ctx.createLinearGradient(0, hy, 0, H);
    g.addColorStop(0, '#b0607a');
    g.addColorStop(0.05, '#6a3a72');
    g.addColorStop(0.3, '#3a2358');
    g.addColorStop(1, '#1e1438');
    ctx.fillStyle = g;
    quad(-ROAD - 0.9, 0, NEARZ, -ROAD - 0.9, 0, FARZ, ROAD + 0.9, 0, FARZ, ROAD + 0.9, 0, NEARZ);

    // wet sheen running down the middle of the deck
    var sh = ctx.createLinearGradient(0, hy, 0, H);
    sh.addColorStop(0, 'rgba(255,190,130,0.75)');
    sh.addColorStop(0.25, 'rgba(255,110,150,0.3)');
    sh.addColorStop(1, 'rgba(255,90,170,0.05)');
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = sh;
    quad(-2.6, 0, NEARZ, -1.4, 0, FARZ, 3.4, 0, FARZ, 5.6, 0, NEARZ);
    ctx.globalCompositeOperation = 'source-over';

    // lane markings
    var period = 12, dash = 4.5, off = scroll % period;
    var lanes = [-3.7, 3.7];
    for (var l = 0; l < lanes.length; l++) {
      for (z = period - off; z < 300; z += period) {
        var z1 = Math.max(z, NEARZ), z2 = z + dash;
        if (z2 <= NEARZ) continue;
        ctx.globalAlpha = clamp(1.15 - z / 280, 0, 1) * 0.9;
        ctx.fillStyle = '#ffe9f4';
        quad(lanes[l] - 0.09, 0, z1, lanes[l] - 0.09, 0, z2, lanes[l] + 0.09, 0, z2, lanes[l] + 0.09, 0, z1);
      }
    }
    ctx.globalAlpha = 0.85;
    ctx.fillStyle = '#ffc24a';
    quad(-0.2, 0, NEARZ, -0.2, 0, FARZ, -0.08, 0, FARZ, -0.08, 0, NEARZ);
    quad(0.08, 0, NEARZ, 0.08, 0, FARZ, 0.2, 0, FARZ, 0.2, 0, NEARZ);
    ctx.globalAlpha = 0.7;
    ctx.fillStyle = '#ffe9f4';
    quad(-ROAD + 0.1, 0, NEARZ, -ROAD + 0.1, 0, FARZ, -ROAD + 0.24, 0, FARZ, -ROAD + 0.24, 0, NEARZ);
    quad(ROAD - 0.24, 0, NEARZ, ROAD - 0.24, 0, FARZ, ROAD - 0.1, 0, FARZ, ROAD - 0.1, 0, NEARZ);
    ctx.globalAlpha = 1;

    // parapets with a neon strip
    for (i = -1; i <= 1; i += 2) {
      var wx = i * (ROAD + 0.9);
      var wg = ctx.createLinearGradient(0, hy, 0, H);
      wg.addColorStop(0, '#8a4a80'); wg.addColorStop(0.2, '#3d2460'); wg.addColorStop(1, '#170d2e');
      ctx.fillStyle = wg;
      quad(wx, 0, NEARZ, wx, 0, FARZ, wx, 1.05, FARZ, wx, 1.05, NEARZ);
      ctx.fillStyle = '#2a1848';
      quad(wx, 1.05, NEARZ, wx, 1.05, FARZ, wx + i * 0.45, 1.05, FARZ, wx + i * 0.45, 1.05, NEARZ);
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = 'rgba(255,70,170,0.28)';
      quad(wx, 0.55, NEARZ, wx, 0.55, FARZ, wx, 1.0, FARZ, wx, 1.0, NEARZ);
      ctx.fillStyle = '#ff5fb8';
      quad(wx, 0.74, NEARZ, wx, 0.74, FARZ, wx, 0.84, FARZ, wx, 0.84, NEARZ);
      // reflection of the strip on the wet deck
      ctx.fillStyle = 'rgba(255,70,170,0.16)';
      quad(wx, 0, NEARZ, wx, 0, FARZ, wx - i * 1.5, 0, FARZ, wx - i * 1.5, 0, NEARZ);
      ctx.globalCompositeOperation = 'source-over';
    }
  }

  function drawLamp(side, z, fade) {
    var s = focal / z;
    var bx = px(side * (ROAD + 1.1), z), by = py(1.05, z), ty = py(8.2, z);
    var ax = px(side * (ROAD - 1.9), z);
    ctx.globalAlpha = fade;
    ctx.strokeStyle = '#1a0e30';
    ctx.lineWidth = Math.max(1, s * 0.16);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(bx, by); ctx.lineTo(bx, ty + s * 0.6);
    ctx.quadraticCurveTo(bx, ty, bx - side * s * 0.8, ty);
    ctx.lineTo(ax, ty);
    ctx.stroke();
    ctx.globalCompositeOperation = 'lighter';
    var gr = s * 3.2;
    var g = ctx.createRadialGradient(ax, ty, 0, ax, ty, gr);
    g.addColorStop(0, 'rgba(255,238,200,0.95)');
    g.addColorStop(0.12, 'rgba(255,190,120,0.55)');
    g.addColorStop(0.45, 'rgba(255,120,160,0.14)');
    g.addColorStop(1, 'rgba(255,120,160,0)');
    ctx.fillStyle = g;
    ctx.fillRect(ax - gr, ty - gr, gr * 2, gr * 2);
    // pool of light on the wet deck
    var ry = py(0, z), rw = s * 3.4, rh = Math.max(1, s * 0.5);
    var pg = ctx.createRadialGradient(ax, ry, 0, ax, ry, rw);
    pg.addColorStop(0, 'rgba(255,200,140,0.5)'); pg.addColorStop(1, 'rgba(255,160,140,0)');
    ctx.save();
    ctx.translate(ax, ry); ctx.scale(1, rh / rw); ctx.translate(-ax, -ry);
    ctx.fillStyle = pg;
    ctx.beginPath(); ctx.arc(ax, ry, rw, 0, TAU); ctx.fill();
    ctx.restore();
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
  }

  function drawPalm(side, z, fade, seed) {
    var s = focal / z;
    var bx = px(side * (ROAD + 2.6), z), by = py(-0.5, z);
    var hgt = (9.5 + (seed % 3) * 1.3) * s;
    var lean = side * (0.6 + (seed % 4) * 0.35) * s * -1;
    var tx = bx + lean, ty = by - hgt;
    ctx.globalAlpha = fade;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#1c0d2e';
    ctx.lineWidth = Math.max(1, s * 0.42);
    ctx.beginPath();
    ctx.moveTo(bx, by);
    ctx.quadraticCurveTo(bx + lean * 0.1, by - hgt * 0.55, tx, ty);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255,120,150,0.55)';
    ctx.lineWidth = Math.max(0.6, s * 0.09);
    ctx.beginPath();
    ctx.moveTo(bx - side * s * 0.14, by);
    ctx.quadraticCurveTo(bx + lean * 0.1 - side * s * 0.14, by - hgt * 0.55, tx - side * s * 0.14, ty);
    ctx.stroke();
    var n = 9, sway = Math.sin(time * 0.9 + seed) * 0.05;
    for (var i = 0; i < n; i++) {
      var a = -Math.PI * (0.02 + 0.96 * i / (n - 1)) + sway;
      var len = s * (3.6 + ((seed + i * 7) % 5) * 0.28);
      var ex = tx + Math.cos(a) * len, ey = ty + Math.sin(a) * len * 0.62 + len * 0.42;
      var mx = tx + Math.cos(a) * len * 0.55, my = ty + Math.sin(a) * len * 0.75 - len * 0.05;
      ctx.fillStyle = '#1c0d2e';
      ctx.beginPath();
      ctx.moveTo(tx, ty);
      ctx.quadraticCurveTo(mx, my - len * 0.1, ex, ey);
      ctx.quadraticCurveTo(mx, my + len * 0.22, tx, ty);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,110,150,0.5)';
      ctx.lineWidth = Math.max(0.6, s * 0.06);
      ctx.beginPath();
      ctx.moveTo(tx, ty);
      ctx.quadraticCurveTo(mx, my - len * 0.1, ex, ey);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  function drawRoadside() {
    var first = Math.floor(scroll / (GAP / 2));
    for (var k = 18; k >= 0; k--) {
      var idx = first + k;
      var z = idx * (GAP / 2) - scroll;
      if (z < NEARZ + 0.4) continue;
      var fade = clamp(1.25 - z / 330, 0, 1);
      if (fade <= 0) continue;
      if (idx % 2 === 0) { drawLamp(-1, z, fade); drawLamp(1, z, fade); }
      else { drawPalm(-1, z, fade, idx * 3 + 1); drawPalm(1, z, fade, idx * 5 + 2); }
    }
  }

  function rr(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  function shade(hex, k) {
    var n = parseInt(hex.slice(1), 16), r = n >> 16, g = (n >> 8) & 255, b = n & 255;
    if (k >= 0) { r += (255 - r) * k; g += (255 - g) * k; b += (255 - b) * k; }
    else { r *= 1 + k; g *= 1 + k; b *= 1 + k; }
    return 'rgb(' + (r | 0) + ',' + (g | 0) + ',' + (b | 0) + ')';
  }

  function drawCar(x0, base, cw, pal, open) {
    var u = cw / 100, L = x0 - cw / 2, g, i;
    function X(v) { return L + v * u; }
    function Y(v) { return base - v * u; }
    var paint = pal[2];

    // tail light glow on the wet deck
    ctx.globalCompositeOperation = 'lighter';
    g = ctx.createLinearGradient(0, base - 6 * u, 0, base + 30 * u);
    g.addColorStop(0, 'rgba(255,40,60,0.35)'); g.addColorStop(1, 'rgba(255,40,60,0)');
    ctx.fillStyle = g;
    ctx.fillRect(X(2), base - 6 * u, 34 * u, 36 * u);
    ctx.fillRect(X(64), base - 6 * u, 34 * u, 36 * u);
    ctx.globalCompositeOperation = 'source-over';
    // contact shadow and ambient occlusion
    ctx.fillStyle = 'rgba(12,14,22,0.55)';
    ctx.beginPath(); ctx.ellipse(x0 + 7 * u, base + 1.5 * u, 58 * u, 6.5 * u, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = 'rgba(12,14,22,0.5)';
    ctx.beginPath(); ctx.ellipse(x0, base - 1 * u, 50 * u, 3.5 * u, 0, 0, TAU); ctx.fill();

    // rear tyres with sidewall, tread and a sliver of rim
    for (i = 0; i < 2; i++) {
      var tx = i ? X(85) : X(15);
      g = ctx.createLinearGradient(tx - 10 * u, 0, tx + 10 * u, 0);
      g.addColorStop(0, i ? '#111317' : '#2a2d33'); g.addColorStop(0.5, '#1c1e23'); g.addColorStop(1, i ? '#2a2d33' : '#111317');
      ctx.fillStyle = g;
      rr(tx - 10 * u, Y(16), 20 * u, 16 * u, 3.5 * u); ctx.fill();
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      for (var k = 0; k < 4; k++) ctx.fillRect(tx - 9 * u + k * 5 * u, Y(16), 1.2 * u, 16 * u);
      ctx.fillStyle = '#3a3d44';
      ctx.fillRect(tx - 10 * u, Y(2.2), 20 * u, 1.2 * u);
    }
    ctx.fillStyle = '#17181c';
    ctx.fillRect(X(24), Y(11), 52 * u, 6 * u);

    var cabT = Y(58), deck = Y(37);
    if (!open) {
      // hard top
      g = ctx.createLinearGradient(0, cabT, 0, deck);
      g.addColorStop(0, shade(paint, 0.45)); g.addColorStop(0.18, paint); g.addColorStop(1, shade(paint, -0.45));
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(X(9), deck);
      ctx.quadraticCurveTo(X(15), cabT + 2 * u, X(25), cabT);
      ctx.lineTo(X(75), cabT);
      ctx.quadraticCurveTo(X(85), cabT + 2 * u, X(91), deck);
      ctx.closePath(); ctx.fill();
      g = ctx.createLinearGradient(0, cabT, 0, deck);
      g.addColorStop(0, '#2a1a5e'); g.addColorStop(0.45, '#8a3a8e'); g.addColorStop(0.8, '#ff8a70'); g.addColorStop(1, '#3a2060');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(X(17), deck - 2 * u);
      ctx.quadraticCurveTo(X(21), cabT + 3.5 * u, X(28), cabT + 3 * u);
      ctx.lineTo(X(72), cabT + 3 * u);
      ctx.quadraticCurveTo(X(79), cabT + 3.5 * u, X(83), deck - 2 * u);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.18)';
      ctx.fillRect(X(20), cabT + 4 * u, 60 * u, 2 * u);
    } else {
      // interior: dashboard, windscreen, mirror, steering wheel, seats, people
      var wsT = Y(66), wsB = Y(44);
      // dashboard
      g = ctx.createLinearGradient(0, wsB - 2 * u, 0, wsB + 6 * u);
      g.addColorStop(0, '#5a4635'); g.addColorStop(1, '#2d2219');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(X(16), wsB + 6 * u); ctx.lineTo(X(18), wsB - 1 * u);
      ctx.lineTo(X(82), wsB - 1 * u); ctx.lineTo(X(84), wsB + 6 * u);
      ctx.closePath(); ctx.fill();
      // steering wheel behind the driver
      ctx.strokeStyle = '#1a1512'; ctx.lineWidth = 2.2 * u;
      ctx.beginPath(); ctx.ellipse(X(33), wsB + 1 * u, 9 * u, 3.5 * u, 0, 0, TAU); ctx.stroke();
      // windscreen glass with sky reflection and a bright streak
      g = ctx.createLinearGradient(0, wsT, 0, wsB);
      g.addColorStop(0, 'rgba(90,50,140,0.55)'); g.addColorStop(0.5, 'rgba(255,150,170,0.3)'); g.addColorStop(1, 'rgba(255,140,90,0.45)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(X(14), wsB); ctx.lineTo(X(20), wsT);
      ctx.lineTo(X(80), wsT); ctx.lineTo(X(86), wsB);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      ctx.beginPath();
      ctx.moveTo(X(21), wsT + 1 * u); ctx.lineTo(X(44), wsT + 1 * u);
      ctx.lineTo(X(40), wsB - 2 * u); ctx.lineTo(X(16.5), wsB - 2 * u);
      ctx.closePath(); ctx.fill();
      // frame
      ctx.strokeStyle = '#23262c'; ctx.lineWidth = Math.max(1, 1.6 * u); ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(X(14), wsB); ctx.lineTo(X(20), wsT); ctx.lineTo(X(80), wsT); ctx.lineTo(X(86), wsB);
      ctx.stroke();
      ctx.fillStyle = '#d9dde3';
      ctx.fillRect(X(20), wsT - 0.8 * u, 60 * u, 1.2 * u);
      // mirror
      ctx.fillStyle = '#1e2126';
      rr(X(45.5), wsT + 2 * u, 9 * u, 3.2 * u, 1 * u); ctx.fill();
      ctx.fillStyle = '#8fb3d6';
      rr(X(46.3), wsT + 2.6 * u, 7.4 * u, 2 * u, 0.6 * u); ctx.fill();

      var seatT = Y(52), seatB = Y(38), mx = X(33), fx = X(67);
      // seats, leather with piping
      for (i = 0; i < 2; i++) {
        var sc = i ? fx : mx;
        g = ctx.createLinearGradient(0, seatT, 0, seatB);
        g.addColorStop(0, '#d8c09a'); g.addColorStop(0.5, '#b89468'); g.addColorStop(1, '#6e5436');
        ctx.fillStyle = g;
        rr(sc - 14 * u, seatT, 28 * u, 15 * u, 4 * u); ctx.fill();
        ctx.strokeStyle = 'rgba(70,50,30,0.5)'; ctx.lineWidth = Math.max(0.6, 0.6 * u);
        rr(sc - 11 * u, seatT + 2.5 * u, 22 * u, 10 * u, 3 * u); ctx.stroke();
        ctx.fillStyle = 'rgba(60,40,25,0.4)';
        ctx.fillRect(sc - 9 * u, seatT + 5 * u, 18 * u, 0.8 * u);
        ctx.fillRect(sc - 9 * u, seatT + 8.5 * u, 18 * u, 0.8 * u);
      }
      // headrests behind the people
      ctx.fillStyle = '#9a7a52';
      rr(mx - 6 * u, Y(60), 12 * u, 7 * u, 2.5 * u); ctx.fill();
      rr(fx - 6 * u, Y(60), 12 * u, 7 * u, 2.5 * u); ctx.fill();

      // --- driver: man, short dark hair, blue shirt, hands on the wheel ---
      var hy0 = Y(63), hr = 5.2 * u;
      // torso
      g = ctx.createLinearGradient(mx - 11 * u, 0, mx + 11 * u, 0);
      g.addColorStop(0, '#2f8a88'); g.addColorStop(0.45, '#58c2b8'); g.addColorStop(1, '#1f5f66');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(mx - 12 * u, Y(44));
      ctx.quadraticCurveTo(mx - 12.5 * u, Y(54), mx - 8 * u, Y(56));
      ctx.lineTo(mx + 8 * u, Y(56));
      ctx.quadraticCurveTo(mx + 12.5 * u, Y(54), mx + 12 * u, Y(44));
      ctx.closePath(); ctx.fill();
      // collar and fold
      ctx.fillStyle = 'rgba(255,255,255,0.18)';
      ctx.fillRect(mx - 3 * u, Y(56), 6 * u, 1.2 * u);
      ctx.fillStyle = 'rgba(0,0,0,0.18)';
      ctx.fillRect(mx - 0.6 * u, Y(50), 1.2 * u, 6 * u);
      // upper arms angled forward to the wheel
      ctx.strokeStyle = '#3fa8a0'; ctx.lineWidth = 4.5 * u; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(mx - 10 * u, Y(53)); ctx.lineTo(mx - 10.5 * u, Y(46)); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(mx + 10 * u, Y(53)); ctx.lineTo(mx + 10.5 * u, Y(46)); ctx.stroke();
      // neck
      ctx.fillStyle = '#b9825f';
      ctx.fillRect(mx - 2.4 * u, hy0 + hr * 0.5, 4.8 * u, 5 * u);
      // head
      g = ctx.createRadialGradient(mx - hr * 0.4, hy0 - hr * 0.3, hr * 0.2, mx, hy0, hr * 1.2);
      g.addColorStop(0, '#d9a07c'); g.addColorStop(1, '#9c6a4c');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.ellipse(mx, hy0, hr * 0.92, hr, 0, 0, TAU); ctx.fill();
      // ears
      ctx.fillStyle = '#c48e6c';
      ctx.beginPath(); ctx.ellipse(mx - hr * 0.95, hy0 + hr * 0.1, hr * 0.22, hr * 0.3, 0, 0, TAU); ctx.fill();
      ctx.beginPath(); ctx.ellipse(mx + hr * 0.95, hy0 + hr * 0.1, hr * 0.22, hr * 0.3, 0, 0, TAU); ctx.fill();
      // hair: short fade, lighter crown
      g = ctx.createRadialGradient(mx - hr * 0.3, hy0 - hr * 0.9, hr * 0.1, mx, hy0 - hr * 0.2, hr * 1.1);
      g.addColorStop(0, '#4a3a30'); g.addColorStop(1, '#1b1410');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.ellipse(mx, hy0 - hr * 0.15, hr * 0.98, hr * 0.92, 0, Math.PI * 0.95, Math.PI * 2.05);
      ctx.quadraticCurveTo(mx + hr * 0.6, hy0 + hr * 0.55, mx, hy0 + hr * 0.4);
      ctx.quadraticCurveTo(mx - hr * 0.6, hy0 + hr * 0.55, mx - hr * 0.97, hy0 + hr * 0.12);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.1)';
      ctx.beginPath(); ctx.ellipse(mx - hr * 0.2, hy0 - hr * 0.75, hr * 0.45, hr * 0.15, 0.3, 0, TAU); ctx.fill();

      // --- passenger: woman, long dark hair in the wind, cream top ---
      g = ctx.createLinearGradient(fx - 10 * u, 0, fx + 10 * u, 0);
      g.addColorStop(0, '#d9c2a4'); g.addColorStop(0.45, '#f4e5cf'); g.addColorStop(1, '#bda483');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(fx - 10.5 * u, Y(44));
      ctx.quadraticCurveTo(fx - 11 * u, Y(54), fx - 7 * u, Y(56));
      ctx.lineTo(fx + 7 * u, Y(56));
      ctx.quadraticCurveTo(fx + 11 * u, Y(54), fx + 10.5 * u, Y(44));
      ctx.closePath(); ctx.fill();
      // shoulders and neck
      ctx.fillStyle = '#e3b896';
      ctx.beginPath(); ctx.ellipse(fx, Y(56), 9 * u, 2.6 * u, 0, Math.PI, TAU); ctx.fill();
      ctx.fillRect(fx - 2.1 * u, hy0 + hr * 0.5, 4.2 * u, 5 * u);
      // hair mass behind the shoulders
      g = ctx.createLinearGradient(fx - 9 * u, 0, fx + 9 * u, 0);
      g.addColorStop(0, '#2a1a14'); g.addColorStop(0.4, '#5a3a2a'); g.addColorStop(0.6, '#7a5238'); g.addColorStop(1, '#241510');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(fx - hr * 0.95, hy0 + hr * 0.3);
      ctx.quadraticCurveTo(fx - 9.5 * u, Y(50), fx - 8 * u, Y(45));
      ctx.lineTo(fx + 8 * u, Y(45));
      ctx.quadraticCurveTo(fx + 9.5 * u, Y(50), fx + hr * 0.95, hy0 + hr * 0.3);
      ctx.closePath(); ctx.fill();
      // head
      g = ctx.createRadialGradient(fx - hr * 0.4, hy0 - hr * 0.3, hr * 0.2, fx, hy0, hr * 1.2);
      g.addColorStop(0, '#f0c7a6'); g.addColorStop(1, '#c48c6c');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.ellipse(fx, hy0, hr * 0.88, hr * 0.98, 0, 0, TAU); ctx.fill();
      // hair cap with highlight
      g = ctx.createRadialGradient(fx - hr * 0.3, hy0 - hr * 0.9, hr * 0.1, fx, hy0 - hr * 0.1, hr * 1.15);
      g.addColorStop(0, '#7a5238'); g.addColorStop(0.5, '#3e2619'); g.addColorStop(1, '#1e120d');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.ellipse(fx, hy0 - hr * 0.1, hr * 1.02, hr * 1.0, 0, Math.PI * 0.9, Math.PI * 2.1);
      ctx.lineTo(fx + hr * 0.9, hy0 + hr * 0.9);
      ctx.lineTo(fx - hr * 0.9, hy0 + hr * 0.9);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = 'rgba(255,220,190,0.22)';
      ctx.beginPath(); ctx.ellipse(fx - hr * 0.25, hy0 - hr * 0.7, hr * 0.5, hr * 0.14, 0.25, 0, TAU); ctx.fill();
      // strands streaming back and to the right in the wind
      ctx.lineCap = 'round';
      for (i = 0; i < 16; i++) {
        var f = i / 15;
        var w1 = Math.sin(time * 5.2 + i * 0.9), w2 = Math.cos(time * 4.1 + i * 1.3);
        var x1 = fx + hr * (0.1 + f * 0.8), y1 = hy0 - hr * (0.85 - f * 1.6);
        var x3 = fx + (9 + f * 10) * u + w1 * 1.3 * u, y3 = hy0 + (-4 + f * 9) * u + w2 * 1.1 * u;
        var x2 = x1 + (x3 - x1) * 0.55 + w2 * 0.8 * u, y2 = Math.min(y1, y3) - (2.5 - f * 1.5) * u + w1 * 0.8 * u;
        ctx.strokeStyle = i % 4 === 1 ? '#8a5c3c' : (i % 4 === 3 ? '#1f120c' : '#4a2c1c');
        ctx.lineWidth = (1.7 - f * 0.9) * u;
        ctx.beginPath(); ctx.moveTo(x1, y1); ctx.quadraticCurveTo(x2, y2, x3, y3); ctx.stroke();
      }
    }

    // --- body: rear deck, fenders, paint with reflections ---
    var bt = Y(37), bb = Y(8);
    g = ctx.createLinearGradient(0, bt, 0, bb);
    g.addColorStop(0, shade(paint, 0.55));
    g.addColorStop(0.06, shade(paint, 0.15));
    g.addColorStop(0.2, paint);
    g.addColorStop(0.55, shade(paint, -0.25));
    g.addColorStop(0.8, shade(paint, -0.5));
    g.addColorStop(1, shade(paint, -0.7));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(X(-1), Y(14));
    ctx.quadraticCurveTo(X(-1.5), Y(30), X(3), Y(34));
    ctx.quadraticCurveTo(X(6), Y(37.5), X(12), Y(37));
    ctx.lineTo(X(88), Y(37));
    ctx.quadraticCurveTo(X(94), Y(37.5), X(97), Y(34));
    ctx.quadraticCurveTo(X(101.5), Y(30), X(101), Y(14));
    ctx.quadraticCurveTo(X(100.5), Y(9), X(96), Y(8));
    ctx.lineTo(X(4), Y(8));
    ctx.quadraticCurveTo(X(-0.5), Y(9), X(-1), Y(14));
    ctx.closePath(); ctx.fill();
    // sky reflection on the deck lid
    g = ctx.createLinearGradient(0, Y(37), 0, Y(31));
    g.addColorStop(0, 'rgba(255,170,200,0.55)'); g.addColorStop(1, 'rgba(255,170,200,0)');
    ctx.fillStyle = g;
    ctx.fillRect(X(10), Y(37), 80 * u, 6 * u);
    // fender flare highlights on the left (sunlit) side
    g = ctx.createLinearGradient(X(0), 0, X(12), 0);
    g.addColorStop(0, 'rgba(255,255,255,0.4)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(X(-1), Y(14)); ctx.quadraticCurveTo(X(-1.5), Y(30), X(3), Y(34));
    ctx.lineTo(X(12), Y(34)); ctx.lineTo(X(10), Y(14)); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,0.22)';
    ctx.beginPath();
    ctx.moveTo(X(101), Y(14)); ctx.quadraticCurveTo(X(101.5), Y(30), X(97), Y(34));
    ctx.lineTo(X(88), Y(34)); ctx.lineTo(X(90), Y(14)); ctx.closePath(); ctx.fill();
    // panel gap of the trunk
    ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.lineWidth = Math.max(0.6, 0.7 * u);
    ctx.beginPath(); ctx.moveTo(X(8), Y(33)); ctx.lineTo(X(8), Y(20)); ctx.moveTo(X(92), Y(33)); ctx.lineTo(X(92), Y(20)); ctx.stroke();

    // tail light cluster with chrome trim
    var lit = open ? brakeLights : 0, dusk = 1;
    ctx.fillStyle = '#b9bec6';
    rr(X(3), Y(31), 94 * u, 10.5 * u, 2.2 * u); ctx.fill();
    ctx.fillStyle = '#15171b';
    rr(X(4), Y(30.2), 92 * u, 9 * u, 1.8 * u); ctx.fill();
    for (i = 0; i < 2; i++) {
      var lx = i ? X(56) : X(5.5), lw = 38.5 * u;
      g = ctx.createLinearGradient(0, Y(29.5), 0, Y(22));
      g.addColorStop(0, lit ? '#ffd0c0' : '#ffb0a8'); g.addColorStop(0.4, lit ? '#ff3344' : '#ff2a3c'); g.addColorStop(1, lit ? '#b00a22' : '#9a0a22');
      ctx.fillStyle = g;
      rr(lx, Y(29.5), lw, 7.5 * u, 1.4 * u); ctx.fill();
      // reflector ribs
      ctx.fillStyle = 'rgba(255,255,255,0.22)';
      for (var rbx = lx + 2 * u; rbx < lx + lw - 1 * u; rbx += 3 * u) ctx.fillRect(rbx, Y(29.5), 0.9 * u, 7.5 * u);
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.fillRect(lx, Y(25.5), lw, 0.8 * u);
      // reverse light
      ctx.fillStyle = '#e6e9ee';
      rr(i ? lx + lw - 7 * u : lx + 1.5 * u, Y(28.8), 5.5 * u, 6 * u, 1 * u); ctx.fill();
    }
    // badge on the middle plate
    ctx.fillStyle = '#d0d4da';
    ctx.beginPath(); ctx.ellipse(X(50), Y(26), 2.6 * u, 2.6 * u, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = '#5a6068';
    ctx.beginPath(); ctx.ellipse(X(50), Y(26), 1.4 * u, 1.4 * u, 0, 0, TAU); ctx.fill();
    if (lit || dusk) {
      ctx.globalCompositeOperation = 'lighter';
      for (i = 0; i < 2; i++) {
        var gx = i ? X(75) : X(25), gy = Y(26), gr = (lit ? 30 : 18) * u;
        g = ctx.createRadialGradient(gx, gy, 0, gx, gy, gr);
        g.addColorStop(0, 'rgba(255,70,70,' + (lit ? 0.55 : 0.3) + ')'); g.addColorStop(0.4, 'rgba(255,30,60,' + (lit ? 0.15 : 0.08) + ')'); g.addColorStop(1, 'rgba(255,30,60,0)');
        ctx.fillStyle = g;
        ctx.fillRect(gx - gr, gy - gr, gr * 2, gr * 2);
      }
      ctx.globalCompositeOperation = 'source-over';
    }
    // third brake light on the deck
    ctx.fillStyle = lit ? '#ff4455' : '#d02a3a';
    rr(X(42), Y(36.5), 16 * u, 1.6 * u, 0.6 * u); ctx.fill();

    // chrome bumper reflecting sky above and road below
    g = ctx.createLinearGradient(0, Y(18), 0, Y(9));
    g.addColorStop(0, '#fff0f8'); g.addColorStop(0.3, '#e8a8d8'); g.addColorStop(0.5, '#6a4a90'); g.addColorStop(0.75, '#2a1a40'); g.addColorStop(1, '#c08ab8');
    ctx.fillStyle = g;
    rr(X(-2.5), Y(18.5), 105 * u, 9.5 * u, 3 * u); ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.fillRect(X(-2.5), Y(10.2), 105 * u, 1 * u);
    // licence plate
    ctx.fillStyle = '#f5f3ea';
    rr(X(41), Y(19.5), 18 * u, 8.5 * u, 0.8 * u); ctx.fill();
    ctx.fillStyle = '#2b4a8a';
    ctx.fillRect(X(41), Y(19.5), 1.6 * u, 8.5 * u);
    ctx.fillStyle = '#3a3d44';
    ctx.fillRect(X(44), Y(16.5), 12.5 * u, 2.6 * u);
    ctx.fillStyle = '#c0392b';
    ctx.fillRect(X(44), Y(13.2), 12.5 * u, 1.4 * u);
    // twin exhausts
    for (i = 0; i < 2; i++) {
      var ex = i ? X(74) : X(26);
      ctx.fillStyle = '#c9ced4';
      ctx.beginPath(); ctx.ellipse(ex, Y(6.5), 3.2 * u, 2 * u, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = '#17191d';
      ctx.beginPath(); ctx.ellipse(ex, Y(6.5), 2.1 * u, 1.2 * u, 0, 0, TAU); ctx.fill();
    }
    // specular streak across the deck edge
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.fillRect(X(14), Y(36.4), 40 * u, 0.9 * u);
  }

  function drawCars() {
    var list = [], i;
    for (i = 0; i < traffic.length; i++) if (traffic[i].z > NEARZ + 0.6) list.push(traffic[i]);
    var shake = mode === 'crash' ? Math.sin(time * 70) * 0.12 * clamp(crashT / 1.2, 0, 1) : 0;
    list.push({ x: playerX + shake, z: ZC, me: true });
    list.sort(function (a, b) { return b.z - a.z; });
    for (i = 0; i < list.length; i++) {
      var c = list[i], sc = focal / c.z, cw = CARW * sc;
      if (cw < 3) continue;
      ctx.globalAlpha = c.me ? 1 : clamp(1.3 - c.z / 300, 0, 1);
      drawCar(px(c.x, c.z), py(0, c.z) + (c.me ? Math.sin(time * 11) * PR * 0.5 : 0), cw, c.me ? PLAYER_PAL : PALS[c.pal], !!c.me);
    }
    ctx.globalAlpha = 1;
  }

  // ---------- game ----------
  var elScore = document.getElementById('score'), elMsg = document.getElementById('msg');
  var keys = { left: false, right: false, gas: false, brake: false }, touches = {}, pedals = {}, scoreShown = '';
  var elSpeed = document.getElementById('speed'), speedShown = '';
  function addRow(z) {
    var d = dist / 1000, n = 1 + (rowRand() < 0.45 + Math.min(0.3, d * 0.1) ? 1 : 0);
    if (d > 1.5 && rowRand() < 0.25) n = 3;
    var free = [0, 1, 2, 3], i;
    for (i = 0; i < n; i++) {
      var k = (rowRand() * free.length) | 0, lane = free.splice(k, 1)[0];
      traffic.push({ x: LANES[lane], z: z + rowRand() * 5, pal: (rowRand() * PALS.length) | 0 });
    }
  }
  function resetRun() {
    traffic = [];
    dist = 0;
    for (var z = 130; z <= 330; z += 50) addRow(z);
  }
  function startRun() {
    if (mode !== 'ready') return;
    resetRun();
    mode = 'run';
  }
  function steerDir() {
    var d = (keys.right ? 1 : 0) - (keys.left ? 1 : 0);
    for (var id in touches) d += touches[id];
    return clamp(d, -1, 1);
  }
  function pedal() {
    var d = (keys.gas ? 1 : 0) - (keys.brake ? 1 : 0);
    for (var id in pedals) d += pedals[id];
    return clamp(d, -1, 1);
  }
  function update(dt) {
    var i;
    if (mode === 'crash') {
      speed = 0;
      brakeLights = 0;
      crashT -= dt;
      if (crashT <= 0) { resetRun(); mode = 'run'; speed = 24; elMsg.hidden = true; }
    } else {
      var pd = mode === 'run' ? pedal() : 0;
      brakeLights = pd < 0 ? 1 : 0;
      if (pd > 0) speed += 14 * dt;
      else if (pd < 0) speed -= 32 * dt;
      else speed += (speed > 22 ? -2.5 : 1.5) * dt;
      speed = clamp(speed, SPEED_MIN, SPEED_MAX);
      playerX = clamp(playerX + steerDir() * (7 + speed * 0.1) * dt, -6.2, 6.2);
    }
    if (mode === 'run') {
      dist += speed * dt;
      var far = 0;
      for (i = traffic.length - 1; i >= 0; i--) {
        var c = traffic[i];
        c.z -= (speed - TRAFFIC_V) * dt;
        if (c.z < 1 || c.z > 420) { traffic.splice(i, 1); continue; }
        if (c.z > far) far = c.z;
        if (Math.abs(c.z - ZC) < 4.3 && Math.abs(c.x - playerX) < 1.85) {
          mode = 'crash';
          crashT = 1.2;
          elMsg.hidden = false;
          if (dist > best) {
            best = dist;
            try { window.localStorage.setItem('causeway_best', String(Math.round(best))); } catch (e) { /* no storage: keep playing */ }
          }
          break;
        }
      }
      if (mode === 'run' && far < 330 - Math.max(40, 62 - dist / 150)) addRow(330);
    }
    scroll += speed * dt;
    camX += (playerX * 0.8 - camX) * Math.min(1, dt * 8);
    var txt = (dist / 1000).toFixed(2) + ' km' + (best > 0 ? '  ·  best ' + (Math.max(best, dist) / 1000).toFixed(2) + ' km' : '');
    if (txt !== scoreShown) { scoreShown = txt; elScore.textContent = txt; }
    var sp = Math.round(speed * 3.6 * 0.85) + ' km/h';
    if (sp !== speedShown) { speedShown = sp; elSpeed.textContent = sp; }
  }

  function drawVignette() {
    var g = ctx.createRadialGradient(cx, H * 0.55, Math.min(W, H) * 0.4, cx, H * 0.55, Math.sqrt(W * W + H * H) * 0.62);
    g.addColorStop(0, 'rgba(10,0,30,0)'); g.addColorStop(1, 'rgba(10,0,30,0.5)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    // darker band behind the countdown
    var t = ctx.createLinearGradient(0, 0, 0, H * 0.3);
    t.addColorStop(0, 'rgba(14,4,36,0.6)'); t.addColorStop(1, 'rgba(14,4,36,0)');
    ctx.fillStyle = t;
    ctx.fillRect(0, 0, W, H * 0.3);
  }

  function render() {
    drawSky();
    drawWater();
    drawSkyline();
    drawRoad();
    drawRoadside();
    drawCars();
    drawVignette();
    if (mode === 'crash') {
      ctx.fillStyle = 'rgba(255,40,70,' + (0.45 * clamp(crashT / 1.2, 0, 1)) + ')';
      ctx.fillRect(0, 0, W, H);
    }
  }

  // ---------- music: an original synth loop made with Web Audio ----------
  var AC = window.AudioContext || window.webkitAudioContext;
  var ac = null, master = null, delayIn = null, noiseBuf = null;
  var musicOn = false, nextStep = 0, nextTime = 0, timer = null;
  var BPM = 96, STEP = 60 / BPM / 4;
  var BARS = [
    { bass: 38, pad: [62, 65, 69] },
    { bass: 34, pad: [62, 65, 70] },
    { bass: 41, pad: [60, 65, 69] },
    { bass: 36, pad: [60, 64, 67] }
  ];
  var LEAD = [
    [[0, 74, 3], [4, 77, 2], [8, 81, 4], [14, 79, 2]],
    [[0, 77, 6], [8, 74, 2], [12, 70, 4]],
    [[0, 72, 3], [4, 77, 2], [8, 81, 4], [14, 84, 2]],
    [[0, 79, 8], [10, 76, 2], [12, 72, 4]],
    [[0, 74, 3], [4, 77, 2], [8, 81, 4], [14, 82, 2]],
    [[0, 82, 4], [6, 81, 2], [8, 77, 6]],
    [[0, 81, 3], [4, 77, 2], [8, 72, 4], [14, 69, 2]],
    [[0, 72, 4], [4, 76, 4], [8, 79, 8]]
  ];
  function hz(m) { return 440 * Math.pow(2, (m - 69) / 12); }

  function voice(type, freq, t, dur, vol, cutoff, dest, detune) {
    var o = ac.createOscillator(), f = ac.createBiquadFilter(), g = ac.createGain();
    o.type = type; o.frequency.value = freq;
    if (detune) o.detune.value = detune;
    f.type = 'lowpass'; f.frequency.value = cutoff; f.Q.value = 1;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vol, t + Math.min(0.03, dur * 0.3));
    g.gain.setValueAtTime(vol, t + dur * 0.6);
    g.gain.linearRampToValueAtTime(0.0001, t + dur);
    o.connect(f); f.connect(g); g.connect(dest);
    o.start(t); o.stop(t + dur + 0.05);
  }
  function kick(t) {
    var o = ac.createOscillator(), g = ac.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(140, t);
    o.frequency.exponentialRampToValueAtTime(45, t + 0.14);
    g.gain.setValueAtTime(0.9, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.28);
    o.connect(g); g.connect(master);
    o.start(t); o.stop(t + 0.3);
  }
  function noise(t, dur, vol, hp) {
    var s = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain();
    s.buffer = noiseBuf;
    f.type = 'highpass'; f.frequency.value = hp;
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    s.connect(f); f.connect(g); g.connect(master);
    s.start(t); s.stop(t + dur + 0.02);
  }
  function scheduleStep(n, t) {
    var bar = Math.floor(n / 16), st = n % 16;
    var ch = BARS[bar % 4], loop = Math.floor(bar / 8);
    // bass pulse
    voice('sawtooth', hz(ch.bass + (st % 4 === 2 ? 12 : 0)), t, STEP * 0.92, 0.22, 420, master, 0);
    // pad
    if (st === 0) {
      for (var i = 0; i < ch.pad.length; i++) {
        voice('sawtooth', hz(ch.pad[i]), t, STEP * 16, 0.045, 1100, master, -7);
        voice('sawtooth', hz(ch.pad[i]), t, STEP * 16, 0.045, 1100, master, 7);
      }
    }
    // drums come in after the first four bars
    if (bar >= 4) {
      if (st % 4 === 0) kick(t);
      if (st === 4 || st === 12) noise(t, 0.2, 0.28, 1400);
      if (st % 2 === 0) noise(t, 0.04, st % 4 === 2 ? 0.1 : 0.05, 7000);
    }
    // lead from the second pass onwards
    if (loop >= 1 || bar >= 4) {
      var notes = LEAD[bar % 8];
      for (var k = 0; k < notes.length; k++) {
        if (notes[k][0] === st) {
          voice('square', hz(notes[k][1]), t, STEP * notes[k][2] * 0.95, 0.07, 2600, delayIn, 0);
          voice('sawtooth', hz(notes[k][1]), t, STEP * notes[k][2] * 0.95, 0.04, 2200, delayIn, 9);
        }
      }
    }
  }
  function pump() {
    if (!ac || !musicOn) return;
    if (nextTime < ac.currentTime) nextTime = ac.currentTime + 0.05;
    while (nextTime < ac.currentTime + 0.25) {
      scheduleStep(nextStep, nextTime);
      nextStep++;
      nextTime += STEP;
    }
  }
  function initAudio() {
    if (ac || !AC) return;
    ac = new AC();
    master = ac.createGain();
    master.gain.value = 0;
    var comp = ac.createDynamicsCompressor();
    master.connect(comp); comp.connect(ac.destination);
    delayIn = ac.createGain();
    var d = ac.createDelay(1), fb = ac.createGain(), wet = ac.createGain();
    d.delayTime.value = STEP * 3; fb.gain.value = 0.35; wet.gain.value = 0.4;
    delayIn.connect(master);
    delayIn.connect(d); d.connect(fb); fb.connect(d); d.connect(wet); wet.connect(master);
    noiseBuf = ac.createBuffer(1, ac.sampleRate * 0.5, ac.sampleRate);
    var data = noiseBuf.getChannelData(0);
    for (var i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  }
  var btn = document.getElementById('snd'), hint = document.getElementById('hint');
  function setMusic(on) {
    try {
      if (on) {
        initAudio();
        if (!ac) { btn.textContent = 'Music: unavailable'; hint.classList.add('gone'); return; }
        if (ac.state === 'suspended') ac.resume();
        musicOn = true;
        nextTime = ac.currentTime + 0.08;
        master.gain.cancelScheduledValues(ac.currentTime);
        master.gain.setTargetAtTime(0.55, ac.currentTime, 0.3);
        if (!timer) timer = setInterval(pump, 50);
        pump();
      } else {
        musicOn = false;
        if (ac) {
          master.gain.cancelScheduledValues(ac.currentTime);
          master.gain.setTargetAtTime(0, ac.currentTime, 0.08);
        }
      }
    } catch (e) {
      musicOn = false;
      btn.textContent = 'Music: unavailable';
      hint.classList.add('gone');
      return;
    }
    btn.textContent = musicOn ? 'Music: on' : 'Music: off';
    btn.setAttribute('aria-pressed', musicOn ? 'true' : 'false');
    hint.classList.add('gone');
  }
  var begun = false;
  function begin() {
    if (begun) return;
    begun = true;
    startRun();
    setMusic(true);
  }
  btn.addEventListener('pointerdown', function (e) { e.stopPropagation(); });
  btn.addEventListener('click', function (e) {
    e.stopPropagation();
    if (!begun) { begin(); return; }
    setMusic(!musicOn);
  });
  app.addEventListener('pointerdown', function (e) {
    var r = app.getBoundingClientRect();
    touches[e.pointerId] = e.clientX < r.left + r.width / 2 ? -1 : 1;
    begin();
  });
  function bindPedal(id, v) {
    var el = document.getElementById(id);
    el.addEventListener('pointerdown', function (e) {
      e.stopPropagation();
      e.preventDefault();
      pedals[e.pointerId] = v;
      begin();
    });
    el.addEventListener('contextmenu', function (e) { e.preventDefault(); });
  }
  bindPedal('gas', 1);
  bindPedal('brake', -1);
  function endTouch(e) { delete touches[e.pointerId]; delete pedals[e.pointerId]; }
  window.addEventListener('pointerup', endTouch);
  window.addEventListener('pointercancel', endTouch);
  app.addEventListener('contextmenu', function (e) { e.preventDefault(); });
  window.addEventListener('keydown', function (e) {
    var c = e.code;
    if (c === 'ArrowLeft' || c === 'KeyA') { keys.left = true; e.preventDefault(); }
    else if (c === 'ArrowRight' || c === 'KeyD') { keys.right = true; e.preventDefault(); }
    else if (c === 'ArrowUp' || c === 'KeyW') { keys.gas = true; e.preventDefault(); }
    else if (c === 'ArrowDown' || c === 'KeyS' || c === 'Space') { keys.brake = true; e.preventDefault(); }
    else if (c === 'KeyM' && !e.repeat && begun) { setMusic(!musicOn); return; }
    begin();
  });
  window.addEventListener('keyup', function (e) {
    var c = e.code;
    if (c === 'ArrowLeft' || c === 'KeyA') keys.left = false;
    else if (c === 'ArrowRight' || c === 'KeyD') keys.right = false;
    else if (c === 'ArrowUp' || c === 'KeyW') keys.gas = false;
    else if (c === 'ArrowDown' || c === 'KeyS' || c === 'Space') keys.brake = false;
  });
  window.addEventListener('blur', function () { keys.left = false; keys.right = false; keys.gas = false; keys.brake = false; touches = {}; pedals = {}; });

  // ---------- loop ----------
  var last = 0;
  function frame(ts) {
    var dt = Math.min(0.05, (ts - last) / 1000 || 0);
    last = ts;
    time += dt;
    resize();
    update(dt);
    render();
    tickClock();
    window.requestAnimationFrame(frame);
  }
  buildSky();
  resize();
  tickClock();
  setInterval(tickClock, 250);
  window.addEventListener('resize', resize);
  window.requestAnimationFrame(frame);
})();
