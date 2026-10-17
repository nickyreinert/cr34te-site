(function () {
  'use strict';

  var LY = 9.4607e15; // metres per light-year
  var HALF = Math.log10(2); // selected object fills half of the view width

  // [name, approximate diameter in metres], ascending
  var items = [
    ['Quark (upper limit)', 1e-18],
    ['Proton', 1.7e-15],
    ['Uranium nucleus', 1.5e-14],
    ['Hydrogen atom', 1.06e-10],
    ['Water molecule', 2.8e-10],
    ['DNA double helix (width)', 2e-9],
    ['SARS-CoV-2 virus', 1e-7],
    ['E. coli bacterium (length)', 2e-6],
    ['Red blood cell', 7e-6],
    ['Human hair (width)', 7e-5],
    ['Ant', 5e-3],
    ['Human', 1.7],
    ['Blue whale (length)', 30],
    ['Eiffel Tower (height)', 330],
    ['Mount Everest (height)', 8849],
    ['Moon', 3.474e6],
    ['Earth', 1.2742e7],
    ['Jupiter', 1.3982e8],
    ['Sun', 1.3927e9],
    ['Betelgeuse (approx.)', 1.2e12],
    ['Solar system (Neptune orbit)', 9.0e12],
    ['Oort cloud (outer edge, estimated)', 3e16],
    ['Orion Nebula', 2.4e17],
    ['Milky Way', 1.0e21],
    ['Andromeda Galaxy', 2.1e21],
    ['Local Group', 9.5e22],
    ['Virgo Supercluster', 1.0e24],
    ['Laniakea Supercluster', 4.9e24],
    ['Observable universe', 8.8e26]
  ].map(function (e) {
    return { n: e[0], d: e[1], lg: Math.log10(e[1]) };
  });

  var UNITS = [[1e-18, 'am'], [1e-15, 'fm'], [1e-12, 'pm'], [1e-9, 'nm'], [1e-6, '\u00b5m'], [1e-3, 'mm']];

  var ZMIN = items[0].lg + HALF;
  var ZMAX = items[items.length - 1].lg + HALF;

  var cv = document.getElementById('view');
  var stage = document.getElementById('stage');
  var ctx = cv.getContext('2d');
  var zoom = document.getElementById('zoom');
  var chipsEl = document.getElementById('chips');
  var nameEl = document.getElementById('name');
  var sizeEl = document.getElementById('size');
  var rel1 = document.getElementById('rel1');
  var rel2 = document.getElementById('rel2');

  var w = 0;
  var h = 0;
  var raf = 0;
  var target = zFor(items.findIndex(function (o) { return o.n === 'Human'; }));
  var cur = target;

  function zFor(i) {
    return items[i].lg + HALF;
  }

  function clamp(z) {
    return Math.min(ZMAX, Math.max(ZMIN, z));
  }

  function num(x) {
    if (x >= 1e6 || x < 1e-2) {
      return x.toExponential(2).replace('e+', 'e');
    }
    return String(parseFloat(x.toPrecision(3)));
  }

  function fmt(m) {
    if (m >= LY) { return num(m / LY) + ' ly'; }
    if (m >= 1e3) { return num(m / 1e3) + ' km'; }
    if (m >= 1) { return num(m) + ' m'; }
    var u = UNITS[0];
    UNITS.forEach(function (e) { if (m >= e[0]) { u = e; } });
    return num(m / u[0]) + ' ' + u[1];
  }

  // index of the item closest (in log scale) to the one shown at half view width
  function selIndex(z) {
    var best = 0;
    items.forEach(function (o, i) {
      if (Math.abs(o.lg - (z - HALF)) < Math.abs(items[best].lg - (z - HALF))) { best = i; }
    });
    return best;
  }

  function hue(i) {
    return 220 - 200 * ((items[i].lg + 18) / 45);
  }

  // visible rings at the current zoom, largest first
  function rings() {
    var D = Math.pow(10, cur);
    var r0 = Math.min(w, h) * 0.46;
    var list = [];
    for (var i = items.length - 1; i >= 0; i--) {
      var ratio = items[i].d / D;
      var r = ratio * r0;
      if (ratio <= 1.05 && r >= 2) { list.push({ i: i, r: r }); }
    }
    return { list: list, D: D };
  }

  function draw() {
    ctx.clearRect(0, 0, w, h);
    var cx = w / 2;
    var cy = h / 2;
    var view = rings();
    var sel = selIndex(cur);

    view.list.forEach(function (k) {
      var c = 'hsl(' + hue(k.i) + ',80%,62%)';
      ctx.beginPath();
      ctx.arc(cx, cy, k.r, 0, Math.PI * 2);
      ctx.fillStyle = 'hsla(' + hue(k.i) + ',80%,60%,0.08)';
      ctx.fill();
      ctx.lineWidth = k.i === sel ? 3 : 1.5;
      ctx.strokeStyle = k.i === sel ? '#ffffff' : c;
      ctx.stroke();
    });

    ctx.font = '12px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    var lastY = -1e9;
    view.list.forEach(function (k) {
      var y = cy - k.r + 13;
      if (k.i === sel || y - lastY >= 15) {
        ctx.fillStyle = k.i === sel ? '#ffffff' : 'hsl(' + hue(k.i) + ',80%,70%)';
        ctx.fillText(items[k.i].n, cx, y);
        lastY = y;
      }
    });

    ctx.textAlign = 'left';
    ctx.fillStyle = '#9aa3b5';
    ctx.fillText('View width: ' + fmt(view.D), 10, 14);
  }

  function step() {
    raf = 0;
    var diff = target - cur;
    if (Math.abs(diff) < 1e-3) {
      cur = target;
    } else {
      cur += diff * 0.15;
    }
    draw();
    if (cur !== target) { go(); }
  }

  function go() {
    if (!raf) { raf = requestAnimationFrame(step); }
  }

  function updateUi() {
    var s = selIndex(target);
    var o = items[s];
    nameEl.textContent = o.n;
    sizeEl.textContent = 'Diameter \u2248 ' + fmt(o.d);
    rel1.textContent = s > 0 ? num(o.d / items[s - 1].d) + '\u00d7 larger than ' + items[s - 1].n : '';
    rel2.textContent = s < items.length - 1 ? items[s + 1].n + ' is ' + num(items[s + 1].d / o.d) + '\u00d7 larger' : '';
    zoom.value = target;
    Array.prototype.forEach.call(chipsEl.children, function (b, i) {
      b.classList.toggle('on', i === s);
    });
    var chip = chipsEl.children[s];
    chipsEl.scrollLeft = chip.offsetLeft - chipsEl.clientWidth / 2 + chip.offsetWidth / 2;
  }

  function sync() {
    updateUi();
    go();
  }

  function resize() {
    var r = stage.getBoundingClientRect();
    var dpr = window.devicePixelRatio || 1;
    w = r.width;
    h = r.height;
    cv.width = Math.round(w * dpr);
    cv.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    draw();
  }

  function stepTo(dir) {
    var found = -1;
    if (dir < 0) {
      items.forEach(function (o, i) { if (zFor(i) < target - 0.01) { found = i; } });
    } else {
      for (var i = items.length - 1; i >= 0; i--) {
        if (zFor(i) > target + 0.01) { found = i; }
      }
    }
    if (found >= 0) {
      target = zFor(found);
      sync();
    }
  }

  items.forEach(function (o, i) {
    var b = document.createElement('button');
    b.type = 'button';
    b.textContent = o.n;
    b.addEventListener('click', function () {
      target = zFor(i);
      sync();
    });
    chipsEl.appendChild(b);
  });

  zoom.min = ZMIN;
  zoom.max = ZMAX;
  zoom.step = 'any';
  zoom.addEventListener('input', function () {
    target = cur = clamp(parseFloat(zoom.value));
    sync();
  });

  document.getElementById('smaller').addEventListener('click', function () { stepTo(-1); });
  document.getElementById('larger').addEventListener('click', function () { stepTo(1); });

  cv.addEventListener('wheel', function (e) {
    e.preventDefault();
    target = cur = clamp(target + e.deltaY * 0.002);
    sync();
  }, { passive: false });

  // tapping a ring selects the object it represents
  cv.addEventListener('click', function (e) {
    var r = cv.getBoundingClientRect();
    var dist = Math.hypot(e.clientX - r.left - w / 2, e.clientY - r.top - h / 2);
    var best = null;
    rings().list.forEach(function (k) {
      if (best === null || Math.abs(k.r - dist) < Math.abs(best.r - dist)) { best = k; }
    });
    if (best !== null && Math.abs(best.r - dist) <= 14) {
      target = zFor(best.i);
      sync();
    }
  });

  window.addEventListener('resize', resize);
  resize();
  updateUi();
})();
