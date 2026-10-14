(function () {
  'use strict';
  var base = document.getElementById('scene');
  var canvas = document.getElementById('future');
  if (!base || !canvas || !canvas.getContext) return;
  var ctx = canvas.getContext('2d');
  var W = base.width, H = base.height, t0 = 0;
  canvas.width = W;
  canvas.height = H;
  ctx.imageSmoothingEnabled = false;
  var calm = false;
  try { calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) {}
  function sync() {
    var r = base.getBoundingClientRect();
    canvas.style.left = r.left + 'px';
    canvas.style.top = r.top + 'px';
    canvas.style.width = r.width + 'px';
    canvas.style.height = r.height + 'px';
  }
  sync();
  window.addEventListener('resize', sync);
  function box(x, y, w, h, color) {
    ctx.fillStyle = color;
    ctx.fillRect(Math.round(x), Math.round(y), Math.max(1, Math.round(w)), Math.max(1, Math.round(h)));
  }
  function hash(n) {
    var q = Math.sin(n * 127.1 + 78.23) * 43758.5453;
    return q - Math.floor(q);
  }
  var towers = [], stars = [], i, x, k;
  for (i = 0; i < 125; i++) stars.push([hash(i + 10) * W, hash(i + 876) * 45, hash(i + 281) > .9 ? 2 : 1]);
  for (x = -8, k = 0; x < W + 15; k++) {
    var wid = 13 + Math.floor(hash(k + 100) * 16);
    towers.push({ x: x, w: wid, top: 27 + Math.floor(hash(k + 210) * 23), id: k });
    x += wid - 2;
  }
  var neon = ['#49f8ff', '#fc57d8', '#ffcd69'];
  function ship(x, y, pink) {
    box(x - 9, y, 18, 2, '#091226');
    box(x - 5, y - 2, 11, 2, '#497b9f');
    box(x - 2, y - 3, 5, 2, '#d0faff');
    box(x - 11, y + 1, 4, 1, pink ? neon[1] : neon[0]);
    box(x + 7, y + 1, 4, 1, pink ? neon[0] : neon[1]);
    box(x - 2, y + 2, 4, 1, '#ffe89d');
  }
  function tower(b, t) {
    var x = b.x, y = b.top, w = b.w, id = b.id;
    box(x, y, w, 72 - y, id % 3 === 0 ? '#061328' : id % 3 === 1 ? '#09132a' : '#0b172d');
    box(x, y, 1, 72 - y, '#225078');
    box(x + w - 2, y, 1, 72 - y, '#142f52');
    box(x - 1, y, w + 1, 1, neon[id % 3]);
    if (id % 3 === 0) {
      box(x + 2, y - 6, 1, 6, '#387cb2');
      box(x + 1, y - 7, 3, 1, neon[id % 3]);
      box(x + w - 4, y + 6, 1, 25, neon[id % 3]);
    }
    for (var yy = y + 4; yy < 69; yy += 5) {
      for (var xx = x + 3; xx < x + w - 3; xx += 4) {
        if (hash(xx * 17 + yy * 7 + id) > .24) box(xx, yy, 2, 2, hash(xx + yy) > .8 ? '#b75fc3' : '#197b9c');
      }
    }
    if (id % 4 === 1) {
      box(x + 3, y + 9, w - 6, 7, '#1a2148');
      box(x + 4, y + 10, w - 8, 1, neon[id % 3]);
      box(x + 5, y + 13, w - 10, 1, '#b5f9ff');
    }
    if (id % 5 === 3) {
      box(x + 1, y + 3, 1, 22, neon[id % 3]);
      box(x + 2, y + 4, 1, 18, 'rgba(74,221,255,.25)');
    }
  }
  function draw(now) {
    if (!t0) t0 = now;
    var t = calm ? 5 : (now - t0) / 1000;
    ctx.clearRect(0, 0, W, H);
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, W, 73);
    ctx.clip();
    // Pixel-space backdrop above the original walkable street.
    for (var y = 0; y < 73; y += 2) {
      var n = y / 73;
      box(0, y, W, 2, 'rgb(' + Math.round(3 + n * 10) + ',' + Math.round(5 + n * 13) + ',' + Math.round(22 + n * 28) + ')');
    }
    for (i = 0; i < stars.length; i++) {
      var st = stars[i];
      box(st[0], st[1], st[2], 1, i % 6 ? '#426d98' : '#bafaff');
    }
    // Distant planetary system with an illuminated ring.
    var px = Math.round(W * .76), py = 19;
    ctx.fillStyle = '#303b78';
    ctx.beginPath(); ctx.arc(px, py, 12, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#6773b5';
    ctx.beginPath(); ctx.arc(px - 3, py - 3, 8, 0, Math.PI * 2); ctx.fill();
    ctx.save();
    ctx.translate(px, py); ctx.rotate(-.23);
    ctx.strokeStyle = '#73d7f2'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(0, 0, 21, 5, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.restore();
    for (i = 0; i < towers.length; i++) tower(towers[i], t);
    // Elevated magnetic railway.
    box(0, 69, W, 3, '#070d21');
    box(0, 69, W, 1, '#31d2e8');
    for (i = 0; i < W; i += 18) box(i, 70, 2, 3, '#344566');
    var train = ((t * 12) % (W + 65)) - 65;
    box(train, 64, 47, 5, '#102940');
    box(train + 1, 64, 45, 1, '#48f3ff');
    box(train + 1, 68, 45, 1, '#e34ce1');
    for (i = 0; i < 9; i++) box(train + 4 + i * 4, 66, 2, 1, '#f0f5ff');
    // Two layers of independent air traffic.
    ship(((t * 15 + 27) % (W + 50)) - 25, 32, false);
    ship(W + 23 - ((t * 9 + 11) % (W + 65)), 43, true);
    for (i = 0; i < 11; i++) {
      var xx = hash(i + 21) * W, yy = 37 + hash(i + 41) * 24;
      box(xx + Math.sin(t * .6 + i) * 2, yy, 1, 1, i % 2 ? '#f06bc8' : '#45f3ff');
    }
    ctx.restore();
    // Reflections decorate the original rain-soaked pavement.
    ctx.save();
    ctx.globalAlpha = .35;
    for (i = 0; i < 19; i++) {
      var rx = (i * 37 + 11) % W, ry = 77 + (i * 11) % 23;
      box(rx, ry, 1 + (i % 4), 1, neon[i % 3]);
    }
    ctx.restore();
    // Tiny transparent HUD keeps the gameplay area unobstructed.
    ctx.font = '5px monospace';
    ctx.textBaseline = 'top';
    ctx.fillStyle = '#74f8ff';
    ctx.fillText('NEON // 2089', 4, 13);
    box(4, 19, 28, 1, '#34b7d1');
    if (!calm) requestAnimationFrame(draw);
  }
  requestAnimationFrame(draw);
})();
