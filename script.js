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
  var SPEED_MIN = 9, SPEED_MAX = 58, brakeLights = 0, drive = 0, alt = 0, wing = 0, boostVis = 0;
  var traffic = [], rowRand = rng((Date.now() & 0xffffff) + 7);
  var PLAYER_PAL = ['#e9a6d6', '#9a62c4', '#4c2c82', '#2a1754', '#150b2c'];
  var PALS = [
    ['#b8f0ea', '#3fb0a8', '#1f6f78', '#143f52', '#0b1f30'],
    ['#ffe0b0', '#ff9a4a', '#c2552a', '#6a2a2a', '#2a1020'],
    ['#ffffff', '#e6d8ee', '#a890c0', '#5a4680', '#241640'],
    ['#ffc0c0', '#f0486a', '#a01e4a', '#551038', '#220a20'],
    ['#fff6c0', '#ffd24a', '#c08a2a', '#6a4420', '#2a1620']
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
      { n: 46, hMin: 0.05, hMax: 0.2, top: '#4a2a72', bot: '#6a3a80', win: 0.35, a: 1 },
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
        g.globalAlpha = 0.1 * ly.a;
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
        r();
        x += bw - Math.max(1, PR);
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
    if (gl) { glc.width = W; glc.height = H; }
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
    var sg = ctx.createRadialGradient(sx, sy, 0, sx, sy, sr);
    sg.addColorStop(0, 'rgba(255,246,200,0.85)'); sg.addColorStop(0.6, 'rgba(255,196,107,0.55)'); sg.addColorStop(1, 'rgba(255,127,127,0.1)');
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
    g.addColorStop(0, '#f27a86');
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
    ctx.globalCompositeOperation = 'lighter';
    ctx.save();
    ctx.beginPath(); ctx.rect(0, hy, W, H - hy); ctx.clip();
    ctx.translate(sx, hy); ctx.scale(1, 2.2);
    var sp = ctx.createRadialGradient(0, 0, 0, 0, 0, H * 0.14);
    sp.addColorStop(0, 'rgba(255,205,130,0.25)'); sp.addColorStop(0.5, 'rgba(255,140,150,0.1)'); sp.addColorStop(1, 'rgba(255,120,130,0)');
    ctx.fillStyle = sp;
    ctx.beginPath(); ctx.arc(0, 0, H * 0.14, 0, TAU); ctx.fill();
    ctx.restore();

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
    hz.addColorStop(0, 'rgba(255,150,120,0)'); hz.addColorStop(1, 'rgba(255,170,120,0.28)');
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
    var gk = clamp(90 / z, 0.2, 1);
    g.addColorStop(0, 'rgba(255,238,200,' + 0.95 * gk + ')');
    g.addColorStop(0.12, 'rgba(255,190,120,' + 0.55 * gk + ')');
    g.addColorStop(0.45, 'rgba(255,120,160,' + 0.14 * gk + ')');
    g.addColorStop(1, 'rgba(255,120,160,0)');
    ctx.fillStyle = g;
    ctx.fillRect(ax - gr, ty - gr, gr * 2, gr * 2);
    // pool of light on the wet deck
    var ry = py(0, z), rw = s * 3.4, rh = Math.max(1, s * 0.5);
    var pg = ctx.createRadialGradient(ax, ry, 0, ax, ry, rw);
    pg.addColorStop(0, 'rgba(255,200,140,' + 0.5 * gk + ')'); pg.addColorStop(1, 'rgba(255,160,140,0)');
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

  function drawCar(x0, base, cw, pal, open) {
    var bh = cw * 0.25, bodyTop = base - cw * 0.06 - bh;
    var L = x0 - cw / 2, g, i;
    // the player's rear lights are dim until the brake is used
    var lit = open ? (brakeLights ? 1 : 0.5) : 1;

    // glow of the tail lights on the wet deck
    ctx.globalCompositeOperation = 'lighter';
    for (i = 0; i < 2 && !(open && alt > 0); i++) {
      var gx = L + cw * (i ? 0.81 : 0.19), gy = base + cw * 0.05, gr = cw * 0.2;
      ctx.save();
      ctx.translate(gx, gy); ctx.scale(1, 1.7);
      g = ctx.createRadialGradient(0, 0, 0, 0, 0, gr);
      g.addColorStop(0, 'rgba(255,40,60,' + 0.32 * lit + ')'); g.addColorStop(0.45, 'rgba(255,40,60,' + 0.12 * lit + ')'); g.addColorStop(1, 'rgba(255,40,60,0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(0, 0, gr, 0, TAU); ctx.fill();
      ctx.restore();
    }
    ctx.globalCompositeOperation = 'source-over';

    // shadow
    if (!(open && alt > 0)) {
      ctx.fillStyle = 'rgba(8,3,20,0.78)';
      ctx.beginPath(); ctx.ellipse(x0, base, cw * 0.55, cw * 0.045, 0, 0, TAU); ctx.fill();
    }

    // tyres
    ctx.fillStyle = '#0b0714';
    rr(L + cw * 0.035, base - cw * 0.135, cw * 0.16, cw * 0.135, cw * 0.03); ctx.fill();
    rr(L + cw * 0.805, base - cw * 0.135, cw * 0.16, cw * 0.135, cw * 0.03); ctx.fill();
    ctx.fillStyle = '#120b20';
    ctx.fillRect(L + cw * 0.19, base - cw * 0.1, cw * 0.62, cw * 0.05);

    if (open && wing > 0.02) {
      // wings fold out of the sides of the body and tilt up a little
      var wy = bodyTop + bh * 0.3, span = cw * 0.62 * wing, sd, rx, tx, tipY;
      for (sd = -1; sd <= 1; sd += 2) {
        rx = sd < 0 ? L + cw * 0.04 : L + cw * 0.96;
        tx = rx + sd * span;
        tipY = wy - cw * 0.07 * wing;
        g = ctx.createLinearGradient(rx, 0, tx, 0);
        g.addColorStop(0, pal[3]); g.addColorStop(0.5, pal[2]); g.addColorStop(1, pal[1]);
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.moveTo(rx, wy - bh * 0.1); ctx.lineTo(tx, tipY); ctx.lineTo(tx, tipY + bh * 0.08); ctx.lineTo(rx, wy + bh * 0.12);
        ctx.closePath(); ctx.fill();
        ctx.strokeStyle = 'rgba(255,225,240,0.8)'; ctx.lineWidth = Math.max(1, cw * 0.006);
        ctx.beginPath(); ctx.moveTo(rx, wy - bh * 0.1); ctx.lineTo(tx, tipY); ctx.stroke();
        ctx.globalCompositeOperation = 'lighter';
        g = ctx.createRadialGradient(tx, tipY, 0, tx, tipY, cw * 0.06);
        g.addColorStop(0, sd < 0 ? 'rgba(255,60,70,0.9)' : 'rgba(80,255,140,0.9)'); g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = g;
        ctx.fillRect(tx - cw * 0.06, tipY - cw * 0.06, cw * 0.12, cw * 0.12);
        ctx.globalCompositeOperation = 'source-over';
      }
    }
    var cabT = bodyTop - cw * 0.17, deck = bodyTop + cw * 0.02;
    if (!open) {
      // hard top with a rear window that mirrors the sky
      var cabB = bodyTop + cw * 0.035;
      g = ctx.createLinearGradient(0, cabT, 0, cabB);
      g.addColorStop(0, pal[0]); g.addColorStop(0.14, pal[2]); g.addColorStop(1, pal[3]);
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(L + cw * 0.1, cabB);
      ctx.quadraticCurveTo(L + cw * 0.16, cabT + cw * 0.01, L + cw * 0.25, cabT);
      ctx.lineTo(L + cw * 0.75, cabT);
      ctx.quadraticCurveTo(L + cw * 0.84, cabT + cw * 0.01, L + cw * 0.9, cabB);
      ctx.closePath(); ctx.fill();
      g = ctx.createLinearGradient(0, cabT, 0, cabB);
      g.addColorStop(0, '#2a1a5e'); g.addColorStop(0.45, '#8a3a8e'); g.addColorStop(0.8, '#ff8a70'); g.addColorStop(1, '#3a2060');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(L + cw * 0.185, cabB - cw * 0.018);
      ctx.quadraticCurveTo(L + cw * 0.22, cabT + cw * 0.03, L + cw * 0.285, cabT + cw * 0.025);
      ctx.lineTo(L + cw * 0.715, cabT + cw * 0.025);
      ctx.quadraticCurveTo(L + cw * 0.78, cabT + cw * 0.03, L + cw * 0.815, cabB - cw * 0.018);
      ctx.closePath(); ctx.fill();
    } else {
    // open cabin: windscreen, seats and two people
    ctx.fillStyle = 'rgba(255,170,160,0.16)';
    ctx.beginPath();
    ctx.moveTo(L + cw * 0.14, deck); ctx.lineTo(L + cw * 0.21, cabT);
    ctx.lineTo(L + cw * 0.79, cabT); ctx.lineTo(L + cw * 0.86, deck);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#ecd2f4'; ctx.lineWidth = Math.max(1, cw * 0.011); ctx.lineJoin = 'round';
    ctx.stroke();
    ctx.fillStyle = '#2a1848';
    rr(L + cw * 0.46, cabT + cw * 0.012, cw * 0.08, cw * 0.022, cw * 0.006); ctx.fill();

    var seatY = bodyTop - cw * 0.062, headY = bodyTop - cw * 0.108, hr = cw * 0.04;
    var mx = L + cw * 0.33, fx = L + cw * 0.67;
    // shoulders
    ctx.fillStyle = '#58c2b8';
    ctx.beginPath(); ctx.ellipse(mx, bodyTop - cw * 0.03, cw * 0.1, cw * 0.045, 0, Math.PI, TAU); ctx.fill();
    ctx.fillStyle = '#d79a7c';
    ctx.beginPath(); ctx.ellipse(fx, bodyTop - cw * 0.028, cw * 0.082, cw * 0.04, 0, Math.PI, TAU); ctx.fill();
    // seat backs
    for (i = 0; i < 2; i++) {
      var sxc = i ? fx : mx;
      g = ctx.createLinearGradient(0, seatY, 0, seatY + cw * 0.1);
      g.addColorStop(0, '#f2e2d6'); g.addColorStop(0.25, '#b98a8e'); g.addColorStop(1, '#4a2a52');
      ctx.fillStyle = g;
      rr(sxc - cw * 0.068, seatY, cw * 0.136, cw * 0.1, cw * 0.03); ctx.fill();
    }
    // arms: the driver's elbows out towards the wheel, the passenger resting an arm on the door
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.strokeStyle = '#3f9a98'; ctx.lineWidth = cw * 0.034;
    ctx.beginPath(); ctx.moveTo(mx - cw * 0.086, bodyTop - cw * 0.052); ctx.lineTo(mx - cw * 0.104, bodyTop + cw * 0.002); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(mx + cw * 0.086, bodyTop - cw * 0.052); ctx.lineTo(mx + cw * 0.104, bodyTop + cw * 0.002); ctx.stroke();
    ctx.strokeStyle = '#c98a6c'; ctx.lineWidth = cw * 0.03;
    ctx.beginPath(); ctx.moveTo(fx - cw * 0.075, bodyTop - cw * 0.04); ctx.lineTo(fx - cw * 0.09, bodyTop + cw * 0.002); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(fx + cw * 0.076, bodyTop - cw * 0.038); ctx.lineTo(fx + cw * 0.118, bodyTop - cw * 0.012); ctx.lineTo(fx + cw * 0.16, bodyTop - cw * 0.004); ctx.stroke();
    ctx.fillStyle = '#d79a7c';
    ctx.beginPath(); ctx.arc(fx + cw * 0.168, bodyTop - cw * 0.002, cw * 0.016, 0, TAU); ctx.fill();

    // driver: a man with short hair
    ctx.fillStyle = '#c58a6c';
    ctx.fillRect(mx - cw * 0.014, headY + hr * 0.6, cw * 0.028, cw * 0.035);
    ctx.beginPath(); ctx.arc(mx - hr * 0.98, headY + hr * 0.1, hr * 0.2, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.arc(mx + hr * 0.98, headY + hr * 0.1, hr * 0.2, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.arc(mx, headY, hr, 0, TAU); ctx.fill();
    ctx.fillStyle = '#20121c';
    ctx.beginPath(); ctx.arc(mx, headY - hr * 0.12, hr * 1.02, Math.PI * 0.93, Math.PI * 2.07); 
    ctx.quadraticCurveTo(mx, headY + hr * 0.75, mx - hr * 0.99, headY + hr * 0.1);
    ctx.closePath(); ctx.fill();

    // passenger: a woman with long hair streaming in the wind
    ctx.fillStyle = '#d79a7c';
    ctx.beginPath(); ctx.arc(fx, headY, hr * 0.96, 0, TAU); ctx.fill();
    ctx.fillStyle = '#2b121c';
    ctx.beginPath();
    ctx.arc(fx, headY - hr * 0.05, hr * 1.08, Math.PI * 0.85, Math.PI * 2.15);
    ctx.quadraticCurveTo(fx + hr * 1.3, headY + hr * 1.9, fx + hr * 0.7, bodyTop - cw * 0.012);
    ctx.lineTo(fx - hr * 0.75, bodyTop - cw * 0.012);
    ctx.quadraticCurveTo(fx - hr * 1.3, headY + hr * 1.9, fx - hr * 0.92, headY + hr * 0.5);
    ctx.closePath(); ctx.fill();
    ctx.lineCap = 'round';
    for (i = 0; i < 10; i++) {
      var w1 = Math.sin(time * 5.2 + i * 1.1), w2 = Math.cos(time * 4.1 + i * 1.7), hf = i / 9;
      var x1 = fx + hr * (0.2 + hf * 0.7), y1 = headY - hr * (0.75 - hf * 1.5);
      var x3 = fx + cw * (0.095 + hf * 0.035) + w1 * cw * 0.012, y3 = headY + cw * (-0.025 + hf * 0.05) + w2 * cw * 0.01;
      var x2 = (x1 + x3) / 2 + w2 * cw * 0.008, y2 = Math.min(y1, y3) - cw * 0.02 + w1 * cw * 0.008;
      ctx.strokeStyle = i % 3 === 1 ? '#4a2032' : '#2b121c';
      ctx.lineWidth = cw * (0.017 - hf * 0.008);
      ctx.beginPath(); ctx.moveTo(x1, y1); ctx.quadraticCurveTo(x2, y2, x3, y3); ctx.stroke();
    }
    // sunset rim light on the driver
    ctx.strokeStyle = 'rgba(255,170,130,0.75)'; ctx.lineWidth = Math.max(1, cw * 0.006);
    ctx.beginPath(); ctx.arc(mx, headY - hr * 0.1, hr * 1.02, -Math.PI * 0.42, Math.PI * 0.12); ctx.stroke();
    }

    // body
    g = ctx.createLinearGradient(0, bodyTop, 0, bodyTop + bh);
    g.addColorStop(0, pal[0]); g.addColorStop(0.07, pal[1]); g.addColorStop(0.22, pal[2]);
    g.addColorStop(0.6, pal[3]); g.addColorStop(1, pal[4]);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(L, bodyTop + bh * 0.2);
    ctx.quadraticCurveTo(L + cw * 0.005, bodyTop, L + cw * 0.06, bodyTop);
    ctx.lineTo(L + cw * 0.94, bodyTop);
    ctx.quadraticCurveTo(L + cw * 0.995, bodyTop, L + cw, bodyTop + bh * 0.2);
    ctx.lineTo(L + cw * 0.985, bodyTop + bh * 0.9);
    ctx.quadraticCurveTo(L + cw * 0.98, bodyTop + bh, L + cw * 0.95, bodyTop + bh);
    ctx.lineTo(L + cw * 0.05, bodyTop + bh);
    ctx.quadraticCurveTo(L + cw * 0.02, bodyTop + bh, L + cw * 0.015, bodyTop + bh * 0.9);
    ctx.closePath(); ctx.fill();

    // tail light panel
    var ty = bodyTop + bh * 0.3, th = bh * 0.3;
    ctx.fillStyle = '#0d0718';
    rr(L + cw * 0.035, ty - th * 0.12, cw * 0.93, th * 1.24, th * 0.25); ctx.fill();
    g = ctx.createLinearGradient(0, ty, 0, ty + th);
    g.addColorStop(0, '#ff8a70'); g.addColorStop(0.45, '#ff2a3c'); g.addColorStop(1, '#a00a28');
    ctx.fillStyle = g;
    rr(L + cw * 0.05, ty, cw * 0.31, th, th * 0.2); ctx.fill();
    rr(L + cw * 0.64, ty, cw * 0.31, th, th * 0.2); ctx.fill();
    ctx.fillStyle = 'rgba(255,60,70,0.55)';
    ctx.fillRect(L + cw * 0.37, ty + th * 0.36, cw * 0.26, th * 0.28);
    ctx.fillStyle = 'rgba(13,7,24,0.55)';
    for (i = 1; i < 4; i++) {
      ctx.fillRect(L + cw * (0.05 + 0.31 * i / 4), ty, cw * 0.006, th);
      ctx.fillRect(L + cw * (0.64 + 0.31 * i / 4), ty, cw * 0.006, th);
    }
    if (lit < 1) {
      ctx.fillStyle = 'rgba(13,7,24,0.5)';
      rr(L + cw * 0.05, ty, cw * 0.31, th, th * 0.2); ctx.fill();
      rr(L + cw * 0.64, ty, cw * 0.31, th, th * 0.2); ctx.fill();
      ctx.fillRect(L + cw * 0.37, ty + th * 0.36, cw * 0.26, th * 0.28);
    }
    ctx.globalCompositeOperation = 'lighter';
    for (i = 0; i < 2; i++) {
      var lx = L + cw * (i ? 0.795 : 0.205), lyc = ty + th / 2, gr = cw * (brakeLights && open ? 0.36 : 0.3);
      g = ctx.createRadialGradient(lx, lyc, 0, lx, lyc, gr);
      g.addColorStop(0, 'rgba(255,70,70,' + 0.6 * lit + ')'); g.addColorStop(0.35, 'rgba(255,30,60,' + 0.2 * lit + ')'); g.addColorStop(1, 'rgba(255,30,60,0)');
      ctx.fillStyle = g;
      ctx.fillRect(lx - gr, lyc - gr, gr * 2, gr * 2);
    }
    ctx.globalCompositeOperation = 'source-over';

    // bumper, plate and exhausts
    var by = bodyTop + bh * 0.76;
    g = ctx.createLinearGradient(0, by, 0, by + bh * 0.17);
    g.addColorStop(0, '#fff0f8'); g.addColorStop(0.35, '#c79ad6'); g.addColorStop(0.6, '#5a3a80'); g.addColorStop(1, '#e58aa8');
    ctx.fillStyle = g;
    rr(L - cw * 0.012, by, cw * 1.024, bh * 0.17, bh * 0.07); ctx.fill();
    ctx.fillStyle = '#efe6f4';
    rr(L + cw * 0.43, by - bh * 0.01, cw * 0.14, bh * 0.19, bh * 0.02); ctx.fill();
    ctx.fillStyle = '#6a4a8a';
    ctx.fillRect(L + cw * 0.45, by + bh * 0.07, cw * 0.1, bh * 0.04);
    ctx.fillStyle = '#d8c0e8';
    ctx.beginPath(); ctx.ellipse(L + cw * 0.27, base - cw * 0.062, cw * 0.022, cw * 0.014, 0, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.ellipse(L + cw * 0.73, base - cw * 0.062, cw * 0.022, cw * 0.014, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = '#12091e';
    ctx.beginPath(); ctx.ellipse(L + cw * 0.27, base - cw * 0.062, cw * 0.015, cw * 0.009, 0, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.ellipse(L + cw * 0.73, base - cw * 0.062, cw * 0.015, cw * 0.009, 0, 0, TAU); ctx.fill();
    if (open && boostVis > 0.02) {
      // afterburner: a flickering blast from each exhaust
      ctx.globalCompositeOperation = 'lighter';
      for (i = 0; i < 2; i++) {
        var fx0 = L + cw * (i ? 0.73 : 0.27), fy0 = base - cw * 0.062, fr = cw * (0.07 + 0.14 * boostVis) * (0.8 + 0.2 * Math.sin(time * 60 + i * 3));
        g = ctx.createRadialGradient(fx0, fy0, 0, fx0, fy0, fr);
        g.addColorStop(0, 'rgba(255,250,220,' + 0.95 * boostVis + ')'); g.addColorStop(0.3, 'rgba(255,170,60,' + 0.7 * boostVis + ')'); g.addColorStop(1, 'rgba(255,80,20,0)');
        ctx.fillStyle = g;
        ctx.fillRect(fx0 - fr, fy0 - fr, fr * 2, fr * 2);
      }
      ctx.globalCompositeOperation = 'source-over';
    }
  }

  // oncoming car seen from the front: windscreen, grille, headlights with a glow on the wet deck
  function drawCarFront(x0, base, cw, pal, flash) {
    var bh = cw * 0.25, bodyTop = base - cw * 0.06 - bh, L = x0 - cw / 2, cabT = bodyTop - cw * 0.17, cabB = bodyTop + cw * 0.035, g, i;
    // a car in your lane flashes its headlights: two short flashes, then a pause
    var fl = flash && (time % 1.6 < 0.12 || (time % 1.6 > 0.28 && time % 1.6 < 0.4));
    ctx.fillStyle = 'rgba(8,3,20,0.78)';
    ctx.beginPath(); ctx.ellipse(x0, base, cw * 0.55, cw * 0.045, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = '#0b0714';
    rr(L + cw * 0.035, base - cw * 0.135, cw * 0.16, cw * 0.135, cw * 0.03); ctx.fill();
    rr(L + cw * 0.805, base - cw * 0.135, cw * 0.16, cw * 0.135, cw * 0.03); ctx.fill();
    g = ctx.createLinearGradient(0, cabT, 0, cabB);
    g.addColorStop(0, pal[0]); g.addColorStop(0.14, pal[2]); g.addColorStop(1, pal[3]);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(L + cw * 0.1, cabB);
    ctx.quadraticCurveTo(L + cw * 0.16, cabT + cw * 0.01, L + cw * 0.25, cabT);
    ctx.lineTo(L + cw * 0.75, cabT);
    ctx.quadraticCurveTo(L + cw * 0.84, cabT + cw * 0.01, L + cw * 0.9, cabB);
    ctx.closePath(); ctx.fill();
    g = ctx.createLinearGradient(0, cabT, 0, cabB);
    g.addColorStop(0, '#2a1a5e'); g.addColorStop(0.45, '#8a3a8e'); g.addColorStop(0.8, '#ff8a70'); g.addColorStop(1, '#3a2060');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(L + cw * 0.15, cabB - cw * 0.01);
    ctx.quadraticCurveTo(L + cw * 0.2, cabT + cw * 0.03, L + cw * 0.27, cabT + cw * 0.025);
    ctx.lineTo(L + cw * 0.73, cabT + cw * 0.025);
    ctx.quadraticCurveTo(L + cw * 0.8, cabT + cw * 0.03, L + cw * 0.85, cabB - cw * 0.01);
    ctx.closePath(); ctx.fill();
    g = ctx.createLinearGradient(0, bodyTop, 0, bodyTop + bh);
    g.addColorStop(0, pal[0]); g.addColorStop(0.2, pal[1]); g.addColorStop(0.6, pal[2]); g.addColorStop(1, pal[3]);
    ctx.fillStyle = g;
    rr(L, bodyTop, cw, bh, cw * 0.06); ctx.fill();
    ctx.fillStyle = '#150b2c';
    rr(L + cw * 0.34, bodyTop + bh * 0.3, cw * 0.32, bh * 0.35, cw * 0.01); ctx.fill();
    g = ctx.createLinearGradient(0, bodyTop + bh * 0.75, 0, bodyTop + bh);
    g.addColorStop(0, '#fff0f8'); g.addColorStop(0.5, '#8a6aa8'); g.addColorStop(1, '#2a1a40');
    ctx.fillStyle = g;
    rr(L - cw * 0.01, bodyTop + bh * 0.75, cw * 1.02, bh * 0.22, cw * 0.02); ctx.fill();
    for (i = 0; i < 2; i++) {
      var hx = L + cw * (i ? 0.8 : 0.2), hy = bodyTop + bh * 0.4;
      ctx.fillStyle = '#150b2c';
      ctx.beginPath(); ctx.ellipse(hx, hy, cw * 0.085, cw * 0.05, 0, 0, TAU); ctx.fill();
      var hg = cw * (fl ? 0.7 : 0.28), rg = cw * (fl ? 0.45 : 0.2);
      ctx.fillStyle = fl ? '#ffffff' : '#fff6d0';
      ctx.beginPath(); ctx.ellipse(hx, hy, cw * 0.065, cw * 0.036, 0, 0, TAU); ctx.fill();
      ctx.globalCompositeOperation = 'lighter';
      g = ctx.createRadialGradient(hx, hy, 0, hx, hy, hg);
      g.addColorStop(0, 'rgba(255,240,200,' + (fl ? 0.95 : 0.55) + ')'); g.addColorStop(1, 'rgba(255,240,200,0)');
      ctx.fillStyle = g;
      ctx.fillRect(hx - hg, hy - hg, hg * 2, hg * 2);
      ctx.save();
      ctx.translate(hx, base + cw * 0.05); ctx.scale(1, 1.7);
      g = ctx.createRadialGradient(0, 0, 0, 0, 0, rg);
      g.addColorStop(0, 'rgba(255,235,190,' + (fl ? 0.6 : 0.3) + ')'); g.addColorStop(0.45, 'rgba(255,235,190,' + (fl ? 0.25 : 0.1) + ')'); g.addColorStop(1, 'rgba(255,235,190,0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(0, 0, rg, 0, TAU); ctx.fill();
      ctx.restore();
      ctx.globalCompositeOperation = 'source-over';
    }
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
      if (c.onc) drawCarFront(px(c.x, c.z), py(0, c.z), cw, PALS[c.pal], playerX < 0 && Math.abs(c.x - playerX) < 3.7 && c.z < 180);
      else if (c.me) {
        var lift = Math.min(alt, 40) / 40 * H * 0.12;
        if (alt > 0) {
          var gy = py(0, c.z);
          if (gy < H * 1.2) {
            ctx.fillStyle = 'rgba(8,3,20,' + 0.5 / (1 + alt * 0.05) + ')';
            ctx.beginPath(); ctx.ellipse(px(c.x, c.z), gy, cw * 0.5 / (1 + alt * 0.05), cw * 0.04 / (1 + alt * 0.05), 0, 0, TAU); ctx.fill();
          }
        }
        drawCar(px(c.x, c.z), hy + 1.55 * focal / c.z - lift + Math.sin(time * 11) * PR * 0.5, cw, PLAYER_PAL, true);
      }
      else drawCar(px(c.x, c.z), py(0, c.z), cw, c.me ? PLAYER_PAL : PALS[c.pal], !!c.me);
    }
    ctx.globalAlpha = 1;
  }

  // ---------- random scene events: a distant helicopter now and then ----------
  var events = [], eventIn = 150;
  function updateEvents(dt) {
    for (var i = events.length - 1; i >= 0; i--) {
      events[i].t += dt;
      if (events[i].t >= events[i].dur) events.splice(i, 1);
    }
    eventIn -= dt;
    if (eventIn <= 0) {
      if (events.length < 1) events.push({ t: 0, dur: 40 + Math.random() * 20, dir: Math.random() < 0.5 ? -1 : 1, k: Math.random() });
      eventIn = 300 + Math.random() * 300;
    }
  }
  function glow(x, y, r, rgb, a) {
    var g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, 'rgba(' + rgb + ',' + a + ')');
    g.addColorStop(1, 'rgba(' + rgb + ',0)');
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
    ctx.globalCompositeOperation = 'source-over';
  }
  function drawHeli(e) {
    var s = H * 0.0055 * (0.8 + e.k * 0.5), p = e.t / e.dur;
    var x = (e.dir > 0 ? p : 1 - p) * (W + 12 * s) - 6 * s;
    var y = hy * (0.6 + e.k * 0.25);
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(e.dir, 1);
    ctx.globalAlpha = 0.8;
    ctx.fillStyle = '#1d1040'; ctx.strokeStyle = '#1d1040'; ctx.lineWidth = Math.max(1, s * 0.25);
    ctx.beginPath(); ctx.ellipse(0, 0, 1.4 * s, 0.6 * s, 0, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.moveTo(-1 * s, -0.1 * s); ctx.lineTo(-3.6 * s, -0.25 * s); ctx.stroke();
    ctx.globalAlpha = 0.45; ctx.lineWidth = Math.max(1, s * 0.15);
    ctx.beginPath(); ctx.moveTo(-2.6 * s, -0.9 * s); ctx.lineTo(2.6 * s, -0.9 * s); ctx.stroke();
    ctx.globalAlpha = 1;
    if ((time * 0.7 + e.k * 5) % 1 < 0.1) glow(0, 0.6 * s, s * 2.5, '255,255,255', 0.9);
    if (Math.sin(time * 4 + e.k * 20) > 0.5) glow(-3.6 * s, -0.25 * s, s * 2, '255,40,50', 0.9);
    ctx.restore();
  }
  function drawEvents() {
    for (var i = 0; i < events.length; i++) drawHeli(events[i]);
  }

  // ---------- game ----------
  var elScore = document.getElementById('score'), elMsg = document.getElementById('msg');
  var keys = { left: false, right: false, gas: false, brake: false, boost: false }, touches = {}, pedals = {}, scoreShown = '';
  var elSpeed = document.getElementById('speed'), speedShown = '';
  function addRow(z) {
    var d = dist / 1000, n = 1 + (rowRand() < 0.45 + Math.min(0.3, d * 0.1) ? 1 : 0);
    if (d > 1.5 && rowRand() < 0.25) n = 3;
    var free = [0, 1, 2, 3], i, rightUsed = false;
    for (i = 0; i < n; i++) {
      var k = (rowRand() * free.length) | 0, lane = free.splice(k, 1)[0];
      // lanes 0 and 1 carry oncoming traffic; keep at least one same-direction lane open
      if (lane > 1 && rightUsed) continue;
      if (lane > 1) rightUsed = true;
      traffic.push({ x: LANES[lane], z: z + rowRand() * 5, pal: (rowRand() * PALS.length) | 0, onc: lane < 2 });
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
      drive = 0;
      alt = 0; wing = 0; boostVis = 0;
      crashT -= dt;
      if (crashT <= 0) { resetRun(); mode = 'run'; speed = 24; elMsg.hidden = true; }
    } else {
      var pd = mode === 'run' ? pedal() : 0;
      drive += (pd - drive) * Math.min(1, dt * 5);
      brakeLights = drive < -0.2 ? 1 : 0;
      // pedals ease in; power falls off with speed; brakes are strong; drag and engine braking slow the car when coasting
      if (mode === 'run') speed += ((drive > 0 ? drive * 8 * (1 - speed / 70) : drive * 9) - 0.3 - 0.0003 * speed * speed) * dt;
      // hidden afterburner on the space bar: up to about 300 km/h on the display, then the wings come out and the car takes off
      if (mode === 'run' && keys.boost) speed += 12 * dt;
      speed = clamp(speed, SPEED_MIN, 100);
      boostVis += ((mode === 'run' && keys.boost ? 1 : 0) - boostVis) * Math.min(1, dt * 6);
      wing += (((mode === 'run' && ((keys.boost && speed >= 98.2) || alt > 0)) ? 1 : 0) - wing) * Math.min(1, dt * 2.5);
      if (mode === 'run') {
        if (wing > 0.9 && keys.boost) alt = Math.min(120, alt + 14 * dt);
        else if (alt > 0) alt = Math.max(0, alt - 12 * dt);
      }
      playerX = clamp(playerX + steerDir() * (7 + speed * 0.1) * dt, -6.2, 6.2);
    }
    if (mode === 'run') {
      dist += speed * dt;
      var far = 0;
      for (i = traffic.length - 1; i >= 0; i--) {
        var c = traffic[i];
        c.z -= (c.onc ? speed + TRAFFIC_V : speed - TRAFFIC_V) * dt;
        if (c.z < 1 || c.z > 420) { traffic.splice(i, 1); continue; }
        if (c.z > far) far = c.z;
        if (alt < 1.2 && Math.abs(c.z - ZC) < 4.3 && Math.abs(c.x - playerX) < 1.85) {
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
    CAM_H = 1.55 + alt * 0.85;
    FARZ = Math.max(420, CAM_H * focal / 2);
    var sp = Math.round(speed * 3.6 * 0.85) + ' km/h' + (alt > 0.5 ? '  ·  ' + Math.round(alt) + ' m' : '');
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
    drawEvents();
    drawRoad();
    drawRoadside();
    drawCars();
    drawVignette();
    if (mode === 'crash') {
      ctx.fillStyle = 'rgba(255,40,70,' + (0.45 * clamp(crashT / 1.2, 0, 1)) + ')';
      ctx.fillRect(0, 0, W, H);
    }
  }

  // ---------- radio: four original stations made with Web Audio ----------
  var AC = window.AudioContext || window.webkitAudioContext;
  var ac = null, master = null, duck = null, noiseBuf = null, bus = null;
  var musicOn = false, nextStep = 0, nextTime = 0, timer = null, STEP = 60 / 96 / 4;
  function hz(m) { return 440 * Math.pow(2, (m - 69) / 12); }

  // sustained note with a soft attack
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
  // plucked note: hard attack, decaying level and filter
  function pluck(type, freq, t, dur, vol, cutoff, dest, detune) {
    var o = ac.createOscillator(), f = ac.createBiquadFilter(), g = ac.createGain();
    o.type = type; o.frequency.value = freq;
    if (detune) o.detune.value = detune;
    f.type = 'lowpass'; f.Q.value = 2;
    f.frequency.setValueAtTime(cutoff, t);
    f.frequency.exponentialRampToValueAtTime(Math.max(90, cutoff * 0.25), t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(f); f.connect(g); g.connect(dest);
    o.start(t); o.stop(t + dur + 0.05);
  }
  // electric piano: sine body with a little bell on top
  function rhodes(freq, t, dur, vol, dest) {
    var o = ac.createOscillator(), o2 = ac.createOscillator(), g = ac.createGain(), g2 = ac.createGain();
    o.type = 'sine'; o.frequency.value = freq;
    o2.type = 'triangle'; o2.frequency.value = freq * 2;
    g2.gain.setValueAtTime(0.3, t);
    g2.gain.exponentialRampToValueAtTime(0.01, t + 0.3);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); o2.connect(g2); g2.connect(g); g.connect(dest);
    o.start(t); o2.start(t); o.stop(t + dur + 0.05); o2.stop(t + dur + 0.05);
  }
  // bright bell for pop hooks
  function bell(freq, t, dur, vol, dest) {
    var o = ac.createOscillator(), o2 = ac.createOscillator(), g = ac.createGain(), g2 = ac.createGain();
    o.type = 'triangle'; o.frequency.value = freq;
    o2.type = 'sine'; o2.frequency.value = freq * 3;
    g2.gain.setValueAtTime(0.35, t);
    g2.gain.exponentialRampToValueAtTime(0.01, t + 0.2);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); o2.connect(g2); g2.connect(g); g.connect(dest);
    o.start(t); o2.start(t); o.stop(t + dur + 0.05); o2.stop(t + dur + 0.05);
  }
  function kick(t, dest, f0, f1, len, vol) {
    var o = ac.createOscillator(), g = ac.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(f0, t);
    o.frequency.exponentialRampToValueAtTime(f1, t + len * 0.5);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + len);
    o.connect(g); g.connect(dest);
    o.start(t); o.stop(t + len + 0.02);
  }
  // filtered noise; gate=true holds the level and cuts it off (80s gated snare)
  function noise(t, dur, vol, freq, dest, type, gate) {
    var s = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain();
    s.buffer = noiseBuf;
    f.type = type || 'highpass'; f.frequency.value = freq;
    g.gain.setValueAtTime(vol, t);
    if (gate) {
      g.gain.setValueAtTime(vol * 0.8, t + dur * 0.8);
      g.gain.linearRampToValueAtTime(0.0001, t + dur);
    } else {
      g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    }
    s.connect(f); f.connect(g); g.connect(dest);
    s.start(t, Math.random() * 0.4); s.stop(t + dur + 0.02);
  }
  // turntable scratch: a swept band of noise, forwards and back
  function scratch(t, dest, len) {
    var s = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain();
    s.buffer = noiseBuf;
    f.type = 'bandpass'; f.Q.value = 7;
    f.frequency.setValueAtTime(450, t);
    f.frequency.exponentialRampToValueAtTime(2600, t + len * 0.4);
    f.frequency.exponentialRampToValueAtTime(380, t + len);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.55, t + 0.02);
    g.gain.setValueAtTime(0.55, t + len * 0.4);
    g.gain.linearRampToValueAtTime(0.04, t + len * 0.5);
    g.gain.linearRampToValueAtTime(0.45, t + len * 0.6);
    g.gain.exponentialRampToValueAtTime(0.001, t + len);
    s.connect(f); f.connect(g); g.connect(dest);
    s.start(t, Math.random() * 0.4); s.stop(t + len + 0.02);
  }

  // --- 96.0 Causeway FM: the original synthwave loop ---
  var CW_BARS = [
    { bass: 38, pad: [62, 65, 69] },
    { bass: 34, pad: [62, 65, 70] },
    { bass: 41, pad: [60, 65, 69] },
    { bass: 36, pad: [60, 64, 67] }
  ];
  var CW_LEAD = [
    [[0, 74, 3], [4, 77, 2], [8, 81, 4], [14, 79, 2]],
    [[0, 77, 6], [8, 74, 2], [12, 70, 4]],
    [[0, 72, 3], [4, 77, 2], [8, 81, 4], [14, 84, 2]],
    [[0, 79, 8], [10, 76, 2], [12, 72, 4]],
    [[0, 74, 3], [4, 77, 2], [8, 81, 4], [14, 82, 2]],
    [[0, 82, 4], [6, 81, 2], [8, 77, 6]],
    [[0, 81, 3], [4, 77, 2], [8, 72, 4], [14, 69, 2]],
    [[0, 72, 4], [4, 76, 4], [8, 79, 8]]
  ];
  function playCauseway(n, t, b) {
    var bar = Math.floor(n / 16), st = n % 16, ch = CW_BARS[bar % 4], i;
    voice('sawtooth', hz(ch.bass + (st % 4 === 2 ? 12 : 0)), t, STEP * 0.92, 0.22, 420, b.out, 0);
    if (st === 0) {
      for (i = 0; i < ch.pad.length; i++) {
        voice('sawtooth', hz(ch.pad[i]), t, STEP * 16, 0.045, 1100, b.out, -7);
        voice('sawtooth', hz(ch.pad[i]), t, STEP * 16, 0.045, 1100, b.out, 7);
      }
    }
    if (bar >= 4) {
      if (st % 4 === 0) kick(t, b.out, 140, 45, 0.28, 0.9);
      if (st === 4 || st === 12) noise(t, 0.2, 0.28, 1400, b.out);
      if (st % 2 === 0) noise(t, 0.04, st % 4 === 2 ? 0.1 : 0.05, 7000, b.out);
      var notes = CW_LEAD[bar % 8];
      for (i = 0; i < notes.length; i++) {
        if (notes[i][0] === st) {
          voice('square', hz(notes[i][1]), t, STEP * notes[i][2] * 0.95, 0.07, 2600, b.fx, 0);
          voice('sawtooth', hz(notes[i][1]), t, STEP * notes[i][2] * 0.95, 0.04, 2200, b.fx, 9);
        }
      }
    }
  }

  // --- 104.2 Neon Drive: fast italo / outrun with octave bass and arpeggios ---
  var ND_BARS = [
    { bass: 33, ch: [57, 60, 64] },
    { bass: 29, ch: [57, 60, 65] },
    { bass: 36, ch: [55, 60, 64] },
    { bass: 31, ch: [55, 59, 62] }
  ];
  var ND_ARP = [0, 1, 2, 3, 2, 1, 0, 1, 2, 3, 2, 1, 0, 1, 2, 3];
  var ND_LEAD = [
    [[0, 76, 4], [4, 74, 2], [6, 72, 2], [8, 76, 6], [14, 79, 2]],
    [[0, 77, 6], [8, 76, 2], [10, 74, 2], [12, 72, 4]],
    [[0, 72, 4], [4, 74, 2], [6, 76, 2], [8, 79, 8]],
    [[0, 79, 4], [4, 77, 2], [6, 76, 2], [8, 74, 8]]
  ];
  function playNeon(n, t, b) {
    var bar = Math.floor(n / 16), st = n % 16, c = ND_BARS[bar % 4], i;
    pluck('sawtooth', hz(c.bass + (st % 2 ? 12 : 0)), t, STEP * 0.9, 0.2, 1000, b.out, 0);
    if (st === 0) {
      for (i = 0; i < c.ch.length; i++) {
        voice('sawtooth', hz(c.ch[i]), t, STEP * 16, 0.028, 900, b.out, -10);
        voice('sawtooth', hz(c.ch[i]), t, STEP * 16, 0.028, 900, b.out, 10);
      }
    }
    if (bar >= 2) {
      var tones = [c.ch[0], c.ch[1], c.ch[2], c.ch[0] + 12];
      pluck('square', hz(tones[ND_ARP[st]] + 12), t, STEP * 1.6, 0.035, 3200, b.fx, 0);
    }
    if (bar >= 4) {
      if (st % 4 === 0) kick(t, b.out, 150, 48, 0.25, 0.85);
      if (st === 4 || st === 12) {
        noise(t, 0.3, 0.26, 1200, b.fx);
        voice('triangle', 190, t, 0.08, 0.12, 2000, b.out, 0);
      }
      if (st % 4 === 2) noise(t, 0.09, 0.08, 8000, b.out);
      else if (st % 2 === 1) noise(t, 0.03, 0.035, 9000, b.out);
      if (bar % 8 === 7 && st >= 12) kick(t, b.out, 260 - (st - 12) * 40, 90, 0.18, 0.45);
    }
    if (bar % 16 >= 8) {
      var notes = ND_LEAD[bar % 4];
      for (i = 0; i < notes.length; i++) {
        if (notes[i][0] === st) {
          voice('sawtooth', hz(notes[i][1]), t, STEP * notes[i][2] * 0.95, 0.05, 3000, b.fx, -6);
          voice('sawtooth', hz(notes[i][1]), t, STEP * notes[i][2] * 0.95, 0.05, 3000, b.fx, 6);
        }
      }
    }
  }

  // --- 89.7 Block Party: swung boom-bap with dusty keys, horns and scratches ---
  var BP_BARS = [
    { bass: 38, ch: [60, 64, 65, 69] },
    { bass: 38, ch: [60, 64, 65, 69] },
    { bass: 43, ch: [58, 62, 65, 69] },
    { bass: 45, ch: [61, 64, 67, 71] }
  ];
  var BP_BASS = [[0, 0, 5], [7, 0, 2], [10, 0, 3], [14, -2, 2]];
  function playBlock(n, t, b) {
    var bar = Math.floor(n / 16), st = n % 16, c = BP_BARS[bar % 4], i;
    if (Math.random() < 0.35) noise(t + Math.random() * STEP, 0.006, 0.06 + Math.random() * 0.08, 2500, b.out);
    if (st === 0 || (st === 10 && bar % 2 === 1)) {
      for (i = 0; i < c.ch.length; i++) rhodes(hz(c.ch[i]), t + i * 0.008, STEP * (st === 0 ? 9 : 5), 0.05, b.fx);
    }
    if (bar >= 1) {
      for (i = 0; i < BP_BASS.length; i++) {
        if (BP_BASS[i][0] === st) voice('triangle', hz(c.bass + BP_BASS[i][1]), t, STEP * BP_BASS[i][2], 0.32, 500, b.out, 0);
      }
    }
    if (bar >= 2) {
      if (st === 0 || st === 7 || st === 10 || (st === 15 && bar % 2 === 1)) kick(t, b.out, 120, 42, 0.4, 1.0);
      if (st === 4 || st === 12) {
        noise(t, 0.22, 0.34, 1100, b.out, 'bandpass');
        voice('triangle', 180, t, 0.1, 0.15, 1500, b.out, 0);
      }
      if (st % 2 === 0) noise(t, 0.035, st % 4 === 2 ? 0.07 : 0.045, 7000, b.out);
      else if (Math.random() < 0.25) noise(t, 0.02, 0.025, 8000, b.out);
    }
    if (bar >= 3 && bar % 4 === 3 && (st === 12 || st === 14)) scratch(t, b.out, STEP * 1.8);
    if (bar >= 8 && bar % 8 >= 4 && (st === 0 || st === 3)) {
      for (i = 1; i < c.ch.length; i++) {
        pluck('sawtooth', hz(c.ch[i]), t, STEP * (st === 0 ? 2.5 : 1.5), 0.03, 2200, b.out, -8);
        pluck('sawtooth', hz(c.ch[i]), t, STEP * (st === 0 ? 2.5 : 1.5), 0.03, 2200, b.out, 8);
      }
    }
  }

  // --- 101.5 Palmline Pop: bright 80s pop with gated snare and a bell hook ---
  var PP_BARS = [
    { bass: 36, ch: [60, 64, 67] },
    { bass: 43, ch: [59, 62, 67] },
    { bass: 45, ch: [60, 64, 69] },
    { bass: 41, ch: [60, 65, 69] }
  ];
  var PP_LEAD = [
    [[0, 72, 2], [2, 72, 2], [4, 74, 2], [6, 76, 4], [12, 74, 2], [14, 72, 2]],
    [[0, 74, 4], [4, 71, 2], [6, 67, 6], [12, 71, 2], [14, 74, 2]],
    [[0, 76, 2], [2, 76, 2], [4, 77, 2], [6, 79, 4], [12, 77, 2], [14, 76, 2]],
    [[0, 77, 4], [4, 76, 2], [6, 74, 2], [8, 72, 8]]
  ];
  function playPalm(n, t, b) {
    var bar = Math.floor(n / 16), st = n % 16, c = PP_BARS[bar % 4], i;
    if (st % 2 === 0) pluck('sawtooth', hz(c.bass + (st === 6 || st === 14 ? 12 : 0)), t, STEP * 1.8, 0.22, 1200, b.out, 0);
    if (st === 0 || st === 3 || st === 6 || st === 10) {
      for (i = 0; i < c.ch.length; i++) {
        pluck('sawtooth', hz(c.ch[i]), t, STEP * (st === 10 ? 5 : 2.5), 0.03, 2600, b.fx, -8);
        pluck('sawtooth', hz(c.ch[i]), t, STEP * (st === 10 ? 5 : 2.5), 0.03, 2600, b.fx, 8);
      }
    }
    if (bar >= 2) {
      if (st % 8 === 0 || st === 10) kick(t, b.out, 130, 50, 0.3, 0.9);
      if (st === 4 || st === 12) {
        // tighter snare: tonal body plus a short band of noise, kept out of the echo
        voice('triangle', 200, t, 0.09, 0.2, 1800, b.out, 0);
        noise(t, 0.16, 0.22, 1900, b.out, 'bandpass', true);
        noise(t + 0.012, 0.05, 0.12, 1400, b.out, 'bandpass');
      }
      if (st % 2 === 0) noise(t, 0.025, st % 4 === 2 ? 0.05 : 0.03, 8000, b.out);
    }
    if (bar >= 4 && bar % 8 >= 4) {
      var notes = PP_LEAD[bar % 4];
      for (i = 0; i < notes.length; i++) {
        if (notes[i][0] === st) bell(hz(notes[i][1] + 12), t, STEP * notes[i][2] * 1.4, 0.09, b.fx);
      }
    }
  }

  var STATIONS = [
    {
      freq: '96.0', name: 'Causeway FM', genre: 'Synthwave', bpm: 96, swing: 0, delay: 3, play: playCauseway, clips: [0, 1, 2]
    },
    {
      freq: '104.2', name: 'Neon Drive', genre: 'Italo and outrun', bpm: 118, swing: 0, delay: 3, play: playNeon, clips: [3]
    },
    {
      freq: '89.7', name: 'Block Party', genre: 'Golden-era hip-hop', bpm: 88, swing: 0.22, delay: 2, play: playBlock, clips: []
    },
    {
      freq: '101.5', name: 'Palmline Pop', genre: '80s pop hits', bpm: 120, swing: 0, delay: 3, play: playPalm, clips: []
    }
  ];
  var station = 0;
  try { station = parseInt(window.localStorage.getItem('causeway_station'), 10) || 0; } catch (e) { station = 0; }
  if (!(station >= 0 && station < STATIONS.length)) station = 0;

  function makeBus(delaySteps) {
    var b = { out: ac.createGain(), fx: ac.createGain(), d: ac.createDelay(1) };
    var fb = ac.createGain(), wet = ac.createGain();
    b.out.connect(duck);
    b.d.delayTime.value = Math.min(0.95, STEP * delaySteps);
    fb.gain.value = 0.35; wet.gain.value = 0.4;
    b.fx.connect(b.out);
    b.fx.connect(b.d); b.d.connect(fb); fb.connect(b.d); b.d.connect(wet); wet.connect(b.out);
    return b;
  }
  function dropBus(b) {
    if (!b) return;
    var t = ac.currentTime;
    b.out.gain.cancelScheduledValues(t);
    b.out.gain.setValueAtTime(b.out.gain.value, t);
    b.out.gain.linearRampToValueAtTime(0, t + 0.06);
    setTimeout(function () {
      try { b.out.disconnect(); b.fx.disconnect(); b.d.disconnect(); } catch (e) { /* already gone */ }
    }, 3000);
  }
  function duckTo(v) {
    if (!ac || !duck) return;
    duck.gain.cancelScheduledValues(ac.currentTime);
    duck.gain.setTargetAtTime(v, ac.currentTime, 0.12);
  }

  // --- host: recorded voice clips (assets/radio-clips.js) plus radio-text captions ---
  var hostVoice = true;
  try { hostVoice = window.localStorage.getItem('causeway_host') !== 'off'; } catch (e) { hostVoice = true; }
  var talking = false, talkEnd = 0, nextTalk = Infinity, nextTaxi = Infinity, talkIdent = false;
  var lastClip = -1, playing = [];
  var talkRand = rng((Date.now() & 0xffff) + 99);
  var clips = { stat: null, taxi: null, voice: [] }, clipsLoading = false;
  function b64buf(s) {
    var bin = window.atob(s), a = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) a[i] = bin.charCodeAt(i);
    return a.buffer;
  }
  function decodeClip(s, done) {
    try {
      var p = ac.decodeAudioData(b64buf(s), function (buf) { done(buf); }, function () { /* undecodable: skip it */ });
      if (p && p.catch) p.catch(function () { /* handled by the error callback */ });
    } catch (e) { /* skip it */ }
  }
  // voice slots 0-2: the 96.0 announcer; 3: the 104.2 announcer
  function keepClip(i, data) {
    decodeClip(data, function (b) { clips.voice[i] = b; });
  }
  function loadClips() {
    var src = window.CAUSEWAY_CLIPS, i;
    if (clipsLoading || !ac || !src) return;
    clipsLoading = true;
    if (src.static) decodeClip(src.static, function (b) { clips.stat = b; });
    if (src.taxi) decodeClip(src.taxi, function (b) { clips.taxi = b; });
    var all = src.voice || [];
    for (i = 0; i < all.length; i++) if (all[i]) keepClip(i, all[i]);
  }
  // play a decoded clip; radio=true squeezes it into a narrow, AM-like band
  function playClip(buf, vol, offset, dur, radio) {
    var s = ac.createBufferSource(), hp = ac.createBiquadFilter(), lp = ac.createBiquadFilter(), g = ac.createGain();
    var t = ac.currentTime + 0.02;
    s.buffer = buf;
    hp.type = 'highpass'; hp.frequency.value = radio ? 400 : 110;
    lp.type = 'lowpass'; lp.frequency.value = radio ? 3000 : 7500;
    g.gain.setValueAtTime(vol, t);
    s.connect(hp); hp.connect(lp); lp.connect(g); g.connect(master);
    if (dur) {
      g.gain.setValueAtTime(vol, t + Math.max(0, dur - 0.08));
      g.gain.linearRampToValueAtTime(0.0001, t + dur);
      s.start(t, offset || 0, dur);
    } else {
      s.start(t, offset || 0);
    }
    return s;
  }
  function sting() {
    var t = ac.currentTime + 0.05, n = [0, 4, 7, 12];
    for (var i = 0; i < n.length; i++) bell(hz(79 + n[i]), t + i * 0.08, 0.5, 0.05, master);
  }
  function startTalk(ms, duckLevel) {
    talking = true;
    talkEnd = Date.now() + ms;
    duckTo(duckLevel);
  }
  function quiet() {
    talking = false;
    for (var i = 0; i < playing.length; i++) { try { playing[i].stop(); } catch (e) { /* already stopped */ } }
    playing = [];
    duckTo(1);
  }
  function endTalk() {
    quiet();
    nextTalk = Date.now() + 25000 + talkRand() * 25000;
  }
  function stopTalk() {
    quiet();
    nextTalk = Infinity;
  }
  function checkTalk() {
    var now = Date.now();
    if (talking) { if (now > talkEnd) endTalk(); return; }
    var S = STATIONS[station];
    // now and then a taxi dispatcher bleeds into the signal
    if (hostVoice && clips.taxi && now > nextTaxi && now < nextTalk - 8000) {
      nextTaxi = now + 100000 + talkRand() * 120000;
      startTalk(clips.taxi.duration * 1000 + 200, 0.6);
      playing.push(playClip(clips.taxi, 0.7, 0, 0, true));
      return;
    }
    if (now < nextTalk) return;
    var ident = talkIdent;
    talkIdent = false;
    var mine = [], i;
    for (i = 0; i < S.clips.length; i++) if (clips.voice[S.clips[i]]) mine.push(S.clips[i]);
    // no voice on this station (or the host is muted): stay with the music
    if (!hostVoice || !mine.length) { nextTalk = now + 25000 + talkRand() * 25000; return; }
    if (!ident && talkRand() < 0.35) { nextTalk = now + 15000 + talkRand() * 15000; return; }
    if (ident) sting();
    var k = mine[(talkRand() * mine.length) | 0];
    if (k === lastClip && mine.length > 1) k = mine[(mine.indexOf(k) + 1) % mine.length];
    lastClip = k;
    startTalk(clips.voice[k].duration * 1000 + 300, 0.25);
    playing.push(playClip(clips.voice[k], 1, 0, 0, false));
  }

  // --- tuner ---
  var elRadio = document.getElementById('radio'), elFreq = document.getElementById('stFreq');
  var elStName = document.getElementById('stName');
  function showStation() {
    var S = STATIONS[station];
    elFreq.textContent = S.freq;
    elStName.textContent = S.name;
    elRadio.classList.remove('flash');
    void elRadio.offsetWidth;
    elRadio.classList.add('flash');
  }
  function tune(idx, withStatic) {
    station = ((idx % STATIONS.length) + STATIONS.length) % STATIONS.length;
    try { window.localStorage.setItem('causeway_station', String(station)); } catch (e) { /* no storage */ }
    showStation();
    if (!ac || !musicOn) return;
    var S = STATIONS[station];
    STEP = 60 / S.bpm / 4;
    dropBus(bus);
    bus = makeBus(S.delay);
    nextStep = 0;
    nextTime = ac.currentTime + (withStatic ? 0.3 : 0.08);
    if (withStatic && clips.stat) {
      playClip(clips.stat, 0.6, talkRand() * Math.max(0, clips.stat.duration - 0.6), 0.45, false);
    } else if (withStatic) {
      noise(ac.currentTime, 0.3, 0.2, 700, master, 'bandpass');
      noise(ac.currentTime + 0.05, 0.2, 0.1, 3000, master, 'bandpass');
    }
    stopTalk();
    talkIdent = true;
    nextTalk = Date.now() + 2200;
    nextTaxi = Date.now() + 60000 + talkRand() * 90000;
    pump();
  }

  function pump() {
    if (!ac || !musicOn || !bus) return;
    if (nextTime < ac.currentTime) nextTime = ac.currentTime + 0.05;
    var S = STATIONS[station];
    while (nextTime < ac.currentTime + 0.25) {
      S.play(nextStep, nextTime + (nextStep % 2 ? S.swing * STEP : 0), bus);
      nextStep++;
      nextTime += STEP;
    }
    checkTalk();
  }
  function initAudio() {
    if (ac || !AC) return;
    ac = new AC();
    master = ac.createGain();
    master.gain.value = 0;
    var comp = ac.createDynamicsCompressor();
    master.connect(comp); comp.connect(ac.destination);
    duck = ac.createGain();
    duck.connect(master);
    noiseBuf = ac.createBuffer(1, ac.sampleRate, ac.sampleRate);
    var data = noiseBuf.getChannelData(0);
    for (var i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    loadClips();
  }
  var btn = document.getElementById('snd'), hint = document.getElementById('hint');
  function setMusic(on) {
    try {
      if (on) {
        initAudio();
        if (!ac) { btn.textContent = 'Music: unavailable'; hint.classList.add('gone'); return; }
        if (ac.state === 'suspended') ac.resume();
        musicOn = true;
        master.gain.cancelScheduledValues(ac.currentTime);
        master.gain.setTargetAtTime(0.55, ac.currentTime, 0.3);
        if (!timer) timer = setInterval(pump, 50);
        tune(station, false);
      } else {
        musicOn = false;
        stopTalk();
        if (ac) {
          master.gain.cancelScheduledValues(ac.currentTime);
          master.gain.setTargetAtTime(0, ac.currentTime, 0.08);
          dropBus(bus);
          bus = null;
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
  // next or previous station; turns the radio on if it was off
  function changeStation(dir) {
    begin();
    if (musicOn) tune(station + dir, true);
    else { tune(station + dir, false); setMusic(true); }
  }
  showStation();
  function noSteer(el) { el.addEventListener('pointerdown', function (e) { e.stopPropagation(); }); }
  noSteer(btn);
  btn.addEventListener('click', function (e) {
    e.stopPropagation();
    if (!begun) { begin(); return; }
    setMusic(!musicOn);
  });
  var stUp = document.getElementById('stUp'), stDown = document.getElementById('stDown');
  noSteer(stUp); noSteer(stDown);
  stUp.addEventListener('click', function (e) { e.stopPropagation(); changeStation(1); });
  stDown.addEventListener('click', function (e) { e.stopPropagation(); changeStation(-1); });
  // host voice on/off (captions stay either way)
  var hostBtn = document.getElementById('hostBtn');
  function showHost() {
    hostBtn.setAttribute('aria-pressed', hostVoice ? 'true' : 'false');
    hostBtn.title = hostVoice ? 'Host voice on (H)' : 'Host voice off (H)';
  }
  function toggleHost() {
    hostVoice = !hostVoice;
    try { window.localStorage.setItem('causeway_host', hostVoice ? 'on' : 'off'); } catch (e) { /* no storage */ }
    if (!hostVoice && talking && playing.length) endTalk();
    showHost();
  }
  showHost();
  noSteer(hostBtn);
  hostBtn.addEventListener('click', function (e) { e.stopPropagation(); toggleHost(); });
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
    else if (c === 'ArrowDown' || c === 'KeyS') { keys.brake = true; e.preventDefault(); }
    else if (c === 'Space') { keys.boost = true; e.preventDefault(); }
    else if (c === 'KeyM' && !e.repeat && begun) { setMusic(!musicOn); return; }
    else if (c === 'KeyO' || c === 'KeyP') { e.preventDefault(); if (!e.repeat) changeStation(c === 'KeyP' ? 1 : -1); return; }
    else if (c === 'KeyH') { if (!e.repeat) toggleHost(); return; }
    begin();
  });
  window.addEventListener('keyup', function (e) {
    var c = e.code;
    if (c === 'ArrowLeft' || c === 'KeyA') keys.left = false;
    else if (c === 'ArrowRight' || c === 'KeyD') keys.right = false;
    else if (c === 'ArrowUp' || c === 'KeyW') keys.gas = false;
    else if (c === 'ArrowDown' || c === 'KeyS') keys.brake = false;
    else if (c === 'Space') keys.boost = false;
  });
  window.addEventListener('blur', function () { keys.left = false; keys.right = false; keys.gas = false; keys.brake = false; keys.boost = false; touches = {}; pedals = {}; });

  // ---------- WebGL post-processing: pixelation, bloom, speed blur, dithered palette ----------
  var glc = null, gl = null, glTex = null, glU = {};
  var GL_VS = 'attribute vec2 p;varying vec2 v;void main(){v=p*.5+.5;gl_Position=vec4(p,0.,1.);}';
  var GL_FS = [
    '#ifdef GL_FRAGMENT_PRECISION_HIGH',
    'precision highp float;',
    '#else',
    'precision mediump float;',
    '#endif',
    'uniform sampler2D t;uniform vec2 uSize;uniform vec2 uFocus;uniform float uBlur;varying vec2 v;',
    'void main(){',
    '  vec2 r=(v-uFocus)*vec2(uSize.x/uSize.y,1.);',
    '  float m=smoothstep(.5,1.1,length(r));',
    '  vec2 d=(uFocus-v)*uBlur*m*.03;',
    '  vec3 c=vec3(0.);',
    '  for(int i=0;i<6;i++){c+=texture2D(t,v+d*float(i)).rgb;}',
    '  c/=6.;',
    '  vec2 px=1./uSize;vec3 b=vec3(0.);',
    '  for(int i=0;i<8;i++){',
    '    float a=float(i)*.7854;vec2 o=vec2(cos(a),sin(a));',
    '    b+=max(texture2D(t,v+o*px*4.).rgb-.6,0.)+max(texture2D(t,v+o*px*12.).rgb-.6,0.)*.8;',
    '  }',
    '  gl_FragColor=vec4(c+b/16.*1.2,1.);',
    '}'
  ].join('\n');
  function glShader(type, src) {
    var s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    return gl.getShaderParameter(s, gl.COMPILE_STATUS) ? s : null;
  }
  function glOff() {
    gl = null;
    canvas.style.visibility = 'visible';
    if (glc && glc.parentNode) glc.parentNode.removeChild(glc);
  }
  function initGL() {
    try {
      glc = document.createElement('canvas');
      glc.id = 'gl';
      gl = glc.getContext('webgl', { alpha: false, antialias: false });
      if (!gl) return;
      var vs = glShader(gl.VERTEX_SHADER, GL_VS), fs = glShader(gl.FRAGMENT_SHADER, GL_FS);
      var pr = gl.createProgram();
      if (!vs || !fs) { gl = null; return; }
      gl.attachShader(pr, vs); gl.attachShader(pr, fs);
      gl.linkProgram(pr);
      if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) { gl = null; return; }
      gl.useProgram(pr);
      var buf = gl.createBuffer(), loc = gl.getAttribLocation(pr, 'p');
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
      gl.enableVertexAttribArray(loc);
      gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
      glTex = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, glTex);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      glU.size = gl.getUniformLocation(pr, 'uSize');
      glU.focus = gl.getUniformLocation(pr, 'uFocus');
      glU.blur = gl.getUniformLocation(pr, 'uBlur');
      glc.addEventListener('webglcontextlost', function (ev) { ev.preventDefault(); glOff(); });
      app.insertBefore(glc, canvas.nextSibling);
      canvas.style.visibility = 'hidden';
    } catch (err) {
      glOff();
    }
  }
  function present() {
    if (!gl) return;
    try {
      gl.viewport(0, 0, glc.width, glc.height);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, canvas);
      gl.uniform2f(glU.size, W, H);
      gl.uniform2f(glU.focus, cx / W, 1 - hy / H);
      gl.uniform1f(glU.blur, clamp((speed - 34) / 24, 0, 1));
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    } catch (err) {
      glOff();
    }
  }

  // ---------- loop ----------
  var last = 0;
  function frame(ts) {
    var dt = Math.min(0.05, (ts - last) / 1000 || 0);
    last = ts;
    time += dt;
    resize();
    update(dt);
    updateEvents(dt);
    render();
    present();
    tickClock();
    window.requestAnimationFrame(frame);
  }
  initGL();
  buildSky();
  resize();
  tickClock();
  setInterval(tickClock, 250);
  window.addEventListener('resize', resize);
  window.requestAnimationFrame(frame);
})();
