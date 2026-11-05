(function () {
  'use strict';

  // Logical resolution; CSS scales the canvas to the frame.
  var W = 256, H = 128, TPS = 20;
  var SKILLS = [['climb', 'Climb'], ['float', 'Float'], ['bomb', 'Bomb'], ['block', 'Block'],
                ['build', 'Build'], ['bash', 'Bash'], ['dig', 'Dig']];

  var cv = document.getElementById('c');
  var cx = cv.getContext('2d');
  var tcv = document.createElement('canvas');
  tcv.width = W;
  tcv.height = H;
  var tcx = tcv.getContext('2d');
  var timg = tcx.createImageData(W, H);
  // Terrain map: 0 empty, 1 dirt, 2 grass, 3 brick
  var terr = new Uint8Array(W * H);
  var dirty = true;
  var S = null;       // current level state
  var sel = 0;        // selected skill index
  var sbtn = [];

  var elLvl = document.getElementById('lvl');
  var elStat = document.getElementById('stat');
  var elHint = document.getElementById('hint');
  var ov = document.getElementById('overlay');
  var msg = document.getElementById('msg');
  var ovbtn = document.getElementById('ovbtn');
  var bPause = document.getElementById('bPause');
  var bFast = document.getElementById('bFast');

  // Seeded PRNG (mulberry32): same level number gives the same level.
  function mulberry(a) {
    return function () {
      a |= 0;
      a = a + 0x6D2B79F5 | 0;
      var t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }

  // ---- terrain helpers ----
  // Left/right edges count as walls, top is open, bottom is a void.
  function solid(x, y) {
    if (x < 0 || x >= W) return true;
    if (y < 0 || y >= H) return false;
    return terr[y * W + x] > 0;
  }
  function rock(x, y) {
    return x >= 0 && x < W && y >= 0 && y < H && terr[y * W + x] > 0;
  }
  function setT(x, y, v) {
    if (x >= 0 && x < W && y >= 0 && y < H) {
      terr[y * W + x] = v;
      dirty = true;
    }
  }
  function carve(x0, y0, w, h) {
    for (var j = 0; j < h; j++) {
      for (var i = 0; i < w; i++) setT(x0 + i, y0 + j, 0);
    }
  }
  function carveCircle(ccx, ccy, r) {
    for (var dy = -r; dy <= r; dy++) {
      for (var dx = -r; dx <= r; dx++) {
        if (dx * dx + dy * dy <= r * r) setT(ccx + dx, ccy + dy, 0);
      }
    }
  }
  // True if a lemming body (7 px tall) standing with feet on row y fits in column x.
  function clear(x, y) {
    for (var j = 0; j < 7; j++) {
      if (solid(x, y - j)) return false;
    }
    return true;
  }

  // ---- level generation ----
  function loadLevel(n) {
    var r = mulberry(n * 7919 + 13);
    var g = [], x = 0, y = 70, t, len, h, i, j;

    function cl(v) { return v < 34 ? 34 : (v > 104 ? 104 : v); }
    // Run of len columns changing height by dy (len 1 = vertical step).
    function seg(l, dy) {
      var y0 = y, k;
      for (k = 1; k <= l && x < W; k++, x++) g[x] = cl(Math.round(y0 + dy * k / l));
      y = g[x - 1];
    }
    function gap(w) {
      for (var k = 0; k < w && x < W; k++, x++) g[x] = H + 5;
    }

    seg(64, 0);
    while (x < W - 84) {
      t = Math.floor(r() * (n < 2 ? 5 : 6));
      if (t === 0) {
        seg(14 + Math.floor(r() * 24), 0);
      } else if (t === 1) {
        len = 12 + Math.floor(r() * 20);
        h = Math.round(len * (0.4 + 0.5 * r()));
        seg(len, r() < 0.5 ? -h : h);
      } else if (t === 2) {
        seg(1, 8 + Math.floor(r() * Math.min(40, 20 + n * 2)));
        seg(10 + Math.floor(r() * 14), 0);
      } else if (t === 3) {
        h = 10 + Math.floor(r() * Math.min(18, 8 + n * 3));
        seg(1, -h);
        seg(6 + Math.floor(r() * 6), 0);
        seg(1, h);
        seg(8, 0);
      } else if (t === 4) {
        seg(1, -(8 + Math.floor(r() * 14)));
        seg(14 + Math.floor(r() * 16), 0);
      } else {
        seg(10, 0);
        gap(10 + Math.floor(r() * Math.min(14, 4 + n * 2)));
        seg(12, 0);
      }
    }
    seg(W - x, 0);

    terr.fill(0);
    for (i = 0; i < W; i++) {
      if (g[i] >= H) continue;
      for (j = g[i]; j < H; j++) terr[j * W + i] = (j - g[i] < 2) ? 2 : 1;
    }
    dirty = true;

    var total = Math.min(40, 8 + 2 * n);
    var need = Math.ceil(total * Math.min(0.9, 0.4 + 0.05 * n));
    S = {
      n: n, lems: [], tk: 0, sp: 10, spawned: 0, total: total, saved: 0, need: need,
      sk: { climb: 3, float: 3, bomb: 3, block: 2, build: 5, bash: 4, dig: 3 },
      paused: false, fast: false, nuked: false, over: false, win: false,
      ent: { x: 32, y: g[32] - 36 },
      ex: { x: W - 20, y: g[W - 20] - 1 }
    };
    ov.hidden = true;
    bPause.classList.remove('on');
    bPause.textContent = 'Pause';
    bFast.classList.remove('on');
    updateUi();
  }

  // ---- lemming logic ----
  function newLem() {
    return { x: S.ent.x, y: S.ent.y, dir: 1, st: 'fall', fd: 0, clm: false, flt: false, fuse: 0, t: 0, b: 0, gone: false };
  }

  function land(l) {
    if (l.fd > 60 && !l.flt) {
      l.gone = true;
      return;
    }
    l.fd = 0;
    l.st = 'walk';
  }

  function fall(l) {
    var n = (l.flt && l.fd > 10) ? 1 : 2;
    for (; n > 0; n--) {
      if (solid(l.x, l.y + 1)) {
        land(l);
        return;
      }
      l.y++;
      l.fd++;
    }
    if (solid(l.x, l.y + 1)) land(l);
  }

  function walk(l) {
    var i, b, d, up, nx = l.x + l.dir;
    if (!solid(l.x, l.y + 1)) {
      l.st = 'fall';
      l.fd = 0;
      return;
    }
    // Blockers turn walkers around.
    for (i = 0; i < S.lems.length; i++) {
      b = S.lems[i];
      if (b !== l && !b.gone && b.st === 'block' && Math.abs(b.y - l.y) < 8) {
        d = (b.x - l.x) * l.dir;
        if (d > 0 && d <= 4) {
          l.dir = -l.dir;
          return;
        }
      }
    }
    for (up = 0; up <= 3; up++) {
      if (clear(nx, l.y - up)) break;
    }
    if (up > 3) {
      if (l.clm) l.st = 'climb';
      else l.dir = -l.dir;
      return;
    }
    l.x = nx;
    l.y -= up;
    for (i = 0; i < 3 && !solid(l.x, l.y + 1); i++) l.y++;
    if (!solid(l.x, l.y + 1)) {
      l.st = 'fall';
      l.fd = 0;
    }
  }

  function climb(l) {
    if (solid(l.x, l.y - 7)) {
      l.dir = -l.dir;
      l.st = 'fall';
      l.fd = 0;
      return;
    }
    if (clear(l.x + l.dir, l.y)) {
      l.x += l.dir;
      l.st = 'walk';
      return;
    }
    l.y--;
  }

  function dig(l) {
    if (++l.t % 3) return;
    if (!solid(l.x, l.y + 1)) {
      l.st = 'fall';
      l.fd = 0;
      return;
    }
    carve(l.x - 3, l.y + 1, 7, 1);
    l.y++;
    if (!solid(l.x, l.y + 1)) {
      l.st = 'fall';
      l.fd = 0;
    }
  }

  function bash(l) {
    var k, j, any = false, a, b;
    if (!solid(l.x, l.y + 1)) {
      l.st = 'fall';
      l.fd = 0;
      return;
    }
    if (++l.t % 3) return;
    for (k = 1; k <= 3; k++) {
      for (j = 0; j < 7; j++) {
        if (rock(l.x + l.dir * k, l.y - j)) any = true;
      }
    }
    if (!any) {
      l.st = 'walk';
      return;
    }
    a = l.x + l.dir;
    b = l.x + 2 * l.dir;
    carve(Math.min(a, b), l.y - 6, 2, 7);
    if (clear(l.x + l.dir, l.y)) l.x += l.dir;
  }

  function build(l) {
    var k;
    if (++l.t % 6) return;
    for (k = 1; k <= 4; k++) setT(l.x + l.dir * k, l.y, 3);
    if (clear(l.x + l.dir * 2, l.y - 1)) {
      l.x += l.dir * 2;
      l.y--;
    } else {
      l.dir = -l.dir;
      l.st = 'walk';
      return;
    }
    if (--l.b <= 0) l.st = 'walk';
  }

  function boom(l) {
    carveCircle(l.x, l.y - 3, 9);
    l.gone = true;
  }

  function step(l) {
    if (l.fuse > 0 && --l.fuse === 0) {
      boom(l);
      return;
    }
    switch (l.st) {
      case 'fall': fall(l); break;
      case 'walk': walk(l); break;
      case 'climb': climb(l); break;
      case 'dig': dig(l); break;
      case 'bash': bash(l); break;
      case 'build': build(l); break;
      case 'block':
        if (!solid(l.x, l.y + 1)) {
          l.st = 'fall';
          l.fd = 0;
        }
        break;
    }
    if (l.gone) return;
    if (l.y >= H) {
      l.gone = true;
      return;
    }
    if (l.st !== 'block' && Math.abs(l.x - S.ex.x) <= 3 && Math.abs(l.y - S.ex.y) <= 6) {
      l.gone = true;
      S.saved++;
    }
  }

  function finish() {
    S.over = true;
    S.win = S.saved >= S.need;
    if (S.win) {
      msg.textContent = 'Level ' + S.n + ' cleared. Saved ' + S.saved + ' of ' + S.total + '.';
      ovbtn.textContent = 'Next level';
    } else {
      msg.textContent = 'Level ' + S.n + ' failed. Saved ' + S.saved + ', needed ' + S.need + '.';
      ovbtn.textContent = 'Retry';
    }
    ov.hidden = false;
  }

  function tick() {
    var i, alive = false;
    if (S.over) return;
    S.tk++;
    if (S.spawned < S.total && !S.nuked && --S.sp <= 0) {
      S.lems.push(newLem());
      S.spawned++;
      S.sp = 24;
    }
    for (i = 0; i < S.lems.length; i++) {
      if (!S.lems[i].gone) {
        step(S.lems[i]);
        if (!S.lems[i].gone) alive = true;
      }
    }
    updateUi();
    if (!alive && (S.spawned >= S.total || S.nuked)) finish();
  }

  // ---- skills ----
  function apply(l, sk) {
    if (S.sk[sk] <= 0 || l.gone) return false;
    switch (sk) {
      case 'climb':
        if (l.clm) return false;
        l.clm = true;
        return true;
      case 'float':
        if (l.flt) return false;
        l.flt = true;
        return true;
      case 'bomb':
        if (l.fuse) return false;
        l.fuse = 5 * TPS;
        return true;
    }
    if (l.st !== 'walk') return false;
    l.t = 0;
    if (sk === 'block') l.st = 'block';
    else if (sk === 'build') {
      l.st = 'build';
      l.b = 12;
    } else if (sk === 'bash') l.st = 'bash';
    else if (sk === 'dig') l.st = 'dig';
    return true;
  }

  function pick(px, py) {
    var best = null, bd = 100, i, l, dx, dy, d;
    for (i = 0; i < S.lems.length; i++) {
      l = S.lems[i];
      if (l.gone) continue;
      dx = l.x - px;
      dy = l.y - 4 - py;
      d = dx * dx + dy * dy;
      if (d < bd) {
        bd = d;
        best = l;
      }
    }
    return best;
  }

  // ---- UI ----
  function updateUi() {
    var i;
    elLvl.textContent = 'Level ' + S.n;
    elStat.textContent = 'Saved ' + S.saved + '/' + S.need + '  Out ' + S.spawned + '/' + S.total;
    for (i = 0; i < SKILLS.length; i++) {
      sbtn[i].lastChild.textContent = S.sk[SKILLS[i][0]];
      sbtn[i].classList.toggle('sel', i === sel);
      sbtn[i].classList.toggle('out', S.sk[SKILLS[i][0]] <= 0);
    }
  }

  function select(i) {
    sel = i;
    updateUi();
  }

  function togglePause() {
    S.paused = !S.paused;
    bPause.classList.toggle('on', S.paused);
    bPause.textContent = S.paused ? 'Resume' : 'Pause';
  }

  function toggleFast() {
    S.fast = !S.fast;
    bFast.classList.toggle('on', S.fast);
  }

  function nuke() {
    var i, l;
    if (S.nuked || S.over) return;
    S.nuked = true;
    for (i = 0; i < S.lems.length; i++) {
      l = S.lems[i];
      if (!l.gone && !l.fuse) l.fuse = TPS + Math.floor(Math.random() * 3 * TPS);
    }
  }

  function buildSkillButtons() {
    var box = document.getElementById('skills'), i, b, s;
    for (i = 0; i < SKILLS.length; i++) {
      b = document.createElement('button');
      b.type = 'button';
      b.dataset.i = i;
      b.appendChild(document.createTextNode(SKILLS[i][1]));
      s = document.createElement('b');
      b.appendChild(s);
      box.appendChild(b);
      sbtn.push(b);
    }
    box.addEventListener('click', function (e) {
      var b = e.target.closest('button');
      if (!b) return;
      select(+b.dataset.i);
      b.blur();
    });
  }

  document.getElementById('ctrl').addEventListener('click', function (e) {
    var id = e.target.id;
    if (id === 'bPause') togglePause();
    else if (id === 'bFast') toggleFast();
    else if (id === 'bNuke') nuke();
    else if (id === 'bRestart') loadLevel(S.n);
    else if (id === 'bPrev') loadLevel(Math.max(1, S.n - 1));
    else if (id === 'bNext') loadLevel(S.n + 1);
    e.target.blur();
  });

  ovbtn.addEventListener('click', function () {
    loadLevel(S.win ? S.n + 1 : S.n);
  });

  // Map a pointer event to logical canvas coordinates (canvas uses object-fit: contain).
  function toLogical(e) {
    var rc = cv.getBoundingClientRect();
    var s = Math.min(rc.width / W, rc.height / H);
    var ox = (rc.width - W * s) / 2;
    var oy = (rc.height - H * s) / 2;
    return { x: (e.clientX - rc.left - ox) / s, y: (e.clientY - rc.top - oy) / s };
  }

  cv.addEventListener('pointerdown', function (e) {
    var p, l;
    e.preventDefault();
    if (S.over) return;
    p = toLogical(e);
    l = pick(p.x, p.y);
    if (l && apply(l, SKILLS[sel][0])) {
      S.sk[SKILLS[sel][0]]--;
      updateUi();
    }
  });

  document.addEventListener('pointerdown', function () {
    elHint.hidden = true;
  });

  window.addEventListener('keydown', function (e) {
    var k = e.key;
    if (k >= '1' && k <= '7') select(+k - 1);
    else if (k === ' ') {
      e.preventDefault();
      togglePause();
    } else if (k === 'f' || k === 'F') toggleFast();
    else if (k === 'r' || k === 'R') loadLevel(S.n);
    else return;
    elHint.hidden = true;
  });

  // ---- rendering ----
  function renderTerrain() {
    var d = timg.data, i, o, v, xx, yy, s;
    for (i = 0; i < W * H; i++) {
      o = i * 4;
      v = terr[i];
      if (!v) {
        d[o + 3] = 0;
        continue;
      }
      xx = i % W;
      yy = (i / W) | 0;
      if (v === 1) {
        s = ((xx * 13 + yy * 7) % 5) * 6;
        d[o] = 130 + s;
        d[o + 1] = 84 + s;
        d[o + 2] = 44 + s / 2;
      } else if (v === 2) {
        d[o] = 70;
        d[o + 1] = 170 + (xx % 3) * 10;
        d[o + 2] = 70;
      } else {
        d[o] = 190;
        d[o + 1] = 190;
        d[o + 2] = 210;
      }
      d[o + 3] = 255;
    }
    tcx.putImageData(timg, 0, 0);
  }

  function drawLem(l) {
    var x = l.x, y = l.y, col = '#59f';
    if (l.st === 'block') col = '#e44';
    else if (l.st === 'dig' || l.st === 'bash' || l.st === 'build') col = '#fc4';
    else if (l.st === 'climb') col = '#f94';
    cx.fillStyle = col;
    cx.fillRect(x - 2, y - 5, 4, 6);
    cx.fillStyle = '#3c3';
    cx.fillRect(x - 2, y - 7, 4, 2);
    cx.fillStyle = '#fc9';
    cx.fillRect(l.dir > 0 ? x + 1 : x - 2, y - 5, 1, 2);
    if (l.clm) {
      cx.fillStyle = '#f60';
      cx.fillRect(l.dir > 0 ? x - 2 : x + 1, y - 3, 1, 2);
    }
    if (l.flt) {
      cx.fillStyle = '#fff';
      if (l.st === 'fall' && l.fd > 10) {
        cx.fillRect(x - 3, y - 10, 7, 1);
        cx.fillRect(x - 2, y - 11, 5, 1);
      } else {
        cx.fillRect(x, y - 9, 1, 1);
      }
    }
    if (l.fuse > 0) {
      cx.fillStyle = '#fff';
      cx.font = '7px monospace';
      cx.fillText(String(Math.ceil(l.fuse / TPS)), x - 2, y - 12);
    }
  }

  function draw() {
    var i;
    if (dirty) {
      renderTerrain();
      dirty = false;
    }
    cx.fillStyle = '#4a78b8';
    cx.fillRect(0, 0, W, H);
    cx.drawImage(tcv, 0, 0);
    cx.fillStyle = '#6b3f1a';
    cx.fillRect(S.ent.x - 8, S.ent.y - 7, 16, 4);
    cx.fillStyle = '#2b1808';
    cx.fillRect(S.ent.x - 4, S.ent.y - 3, 8, 1);
    cx.fillStyle = '#c9a227';
    cx.fillRect(S.ex.x - 6, S.ex.y - 12, 12, 13);
    cx.fillStyle = '#222';
    cx.fillRect(S.ex.x - 4, S.ex.y - 10, 8, 11);
    for (i = 0; i < S.lems.length; i++) {
      if (!S.lems[i].gone) drawLem(S.lems[i]);
    }
  }

  var last = 0, acc = 0;
  function frame(ts) {
    var dt = Math.min(100, ts - last);
    var per = 1000 / TPS;
    last = ts;
    if (!S.paused) {
      acc += dt * (S.fast ? 3 : 1);
      while (acc >= per) {
        acc -= per;
        tick();
      }
    }
    draw();
    requestAnimationFrame(frame);
  }

  buildSkillButtons();
  loadLevel(1);
  requestAnimationFrame(frame);
})();
