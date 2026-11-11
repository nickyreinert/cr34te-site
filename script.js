(function () {
  'use strict';

  // ---------- constants ----------
  const SAVE_KEY = 'alienhop.save.v1';
  const NEAR = 0.3;
  const OBJ_BIAS = 3;
  const MAX_POLYS = 6000;
  const ICO_LEVEL = 4;
  const TAU = Math.PI * 2;
  const COST = { 1: 3, 2: 8, 3: 18, 4: 40 };
  const FUEL_BY_TIER = { 1: 3, 2: 8, 3: 18, 4: 40 };

  // ---------- math helpers ----------
  function clamp(x, a, b) { return x < a ? a : (x > b ? b : x); }
  function lerp(a, b, t) { return a + (b - a) * t; }

  function mulberry32(a) {
    return function () {
      a |= 0;
      a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function vdot(a, b) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; }
  function vcross(a, b) {
    return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  }
  function vlen(a) { return Math.sqrt(vdot(a, a)); }
  function vnorm(a) { const l = vlen(a) || 1; return [a[0] / l, a[1] / l, a[2] / l]; }
  function vadd(a, b) { return [a[0] + b[0], a[1] + b[1], a[2] + b[2]]; }
  function vsub(a, b) { return [a[0] - b[0], a[1] - b[1], a[2] - b[2]]; }
  function vscale(a, s) { return [a[0] * s, a[1] * s, a[2] * s]; }

  function randUnit(rnd) {
    const z = rnd() * 2 - 1;
    const a = rnd() * TAU;
    const r = Math.sqrt(1 - z * z);
    return [r * Math.cos(a), r * Math.sin(a), z];
  }

  // Orthonormal frame at unit vector u: f is a tangent near hint, r = f x u (right), (r, u, f).
  function basisFrom(u, hint) {
    let h = hint;
    if (Math.abs(vdot(h, u)) > 0.95) h = Math.abs(u[0]) < 0.9 ? [1, 0, 0] : [0, 0, 1];
    const f = vnorm(vsub(h, vscale(u, vdot(h, u))));
    const r = vnorm(vcross(f, u));
    return { r: r, u: u, f: f };
  }

  function hsl(h, s, l) {
    h = (((h % 360) + 360) % 360) / 360;
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    function hue(t) {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    }
    return [hue(h + 1 / 3) * 255, hue(h) * 255, hue(h - 1 / 3) * 255];
  }

  function mixc(a, b, t) { return [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)]; }
  function css(c) { return 'rgb(' + (c[0] | 0) + ',' + (c[1] | 0) + ',' + (c[2] | 0) + ')'; }
  function rseed() { return (Math.random() * 4294967296) >>> 0; }

  // ---------- game data ----------
  const ELEMENTS = [
    { id: 'e0', sym: 'C', name: 'Carbon', rank: 0, col: [78, 78, 88], w: 10, sh: 1.0 },
    { id: 'e1', sym: 'Fe', name: 'Iron', rank: 0, col: [176, 86, 52], w: 9, sh: 0.7 },
    { id: 'e2', sym: 'Si', name: 'Silicon', rank: 0, col: [160, 190, 205], w: 8, sh: 1.5 },
    { id: 'e3', sym: 'S', name: 'Sulfur', rank: 0, col: [235, 215, 60], w: 7, sh: 0.8 },
    { id: 'e4', sym: 'Cu', name: 'Copper', rank: 0, col: [224, 130, 60], w: 6, sh: 1.0 },
    { id: 'e5', sym: 'Li', name: 'Lithium', rank: 1, col: [240, 120, 170], w: 4, sh: 1.4, where: ['archi', 'gloom'] },
    { id: 'e6', sym: 'Ti', name: 'Titanium', rank: 1, col: [210, 215, 225], w: 4, sh: 1.7, where: ['spires', 'terr'] },
    { id: 'e7', sym: 'Co', name: 'Cobalt', rank: 1, col: [60, 110, 230], w: 4, sh: 1.0, where: ['dust', 'gloom', 'spires'] },
    { id: 'e8', sym: 'Ir', name: 'Iridium', rank: 2, col: [150, 90, 230], w: 3, sh: 1.3, where: ['dust', 'terr'] },
    { id: 'e9', sym: 'Au', name: 'Gold', rank: 2, col: [250, 200, 60], w: 3, sh: 0.7, where: ['terr', 'archi'] },
    { id: 'e10', sym: 'U', name: 'Uranium', rank: 2, col: [110, 235, 90], w: 3, sh: 1.2, where: ['gloom', 'dust'] },
    { id: 'e11', sym: 'Os', name: 'Osmium', rank: 3, col: [120, 225, 225], w: 2, sh: 1.6, where: ['spires', 'gloom'] }
  ];
  ELEMENTS.forEach(function (e) { e.kind = 'element'; });

  // Relics are only found at anomalies.
  const RELICS = [
    { id: 'r0', sym: 'Rs', name: 'Resonite', rank: 3, col: [255, 90, 210], kind: 'relic' },
    { id: 'r1', sym: 'Sc', name: 'Salvage Core', rank: 3, col: [255, 150, 60], kind: 'relic' },
    { id: 'r2', sym: 'Mo', name: 'Meridian Orb', rank: 3, col: [80, 240, 255], kind: 'relic' },
    { id: 'r3', sym: 'Gs', name: 'Grove Seed', rank: 3, col: [140, 255, 120], kind: 'relic' }
  ];

  // Byproduct of failed combinations.
  const SLAG = { id: 's0', sym: 'Sl', name: 'Slag', rank: 0, col: [110, 98, 90], fuel: 1, kind: 'junk' };

  const ANOMS = [
    { id: 'monolith', name: 'Monolith', relic: 'r0' },
    { id: 'wreck', name: 'Wreck', relic: 'r1' },
    { id: 'ring', name: 'Stone Ring', relic: 'r2' },
    { id: 'grove', name: 'Crystal Grove', relic: 'r3' }
  ];

  const COMPOUND_NAMES = [
    ['Brimstone', 'Verdigris', 'Ferrite', 'Slate Glass', 'Cinder Gel', 'Pyrite Dust'],
    ['Voltaic Cell', 'Cryo Alloy', 'Prism Glass', 'Azure Resin', 'Lumen Powder'],
    ['Plasma Coil', 'Gilded Lattice', 'Fission Pellet', 'Nova Salt'],
    ['Warp Catalyst', 'Singularity Seed', 'Aether Core', 'Starfold Crystal']
  ];
  const COMPOUNDS = [];
  COMPOUND_NAMES.forEach(function (names, ti) {
    names.forEach(function (name, k) {
      const idx = COMPOUNDS.length;
      COMPOUNDS.push({
        id: 'c' + idx, sym: name.slice(0, 2), name: name, kind: 'compound',
        tier: ti + 1, rank: ti + 1, fuel: FUEL_BY_TIER[ti + 1],
        col: hsl(idx * 47, 0.6, 0.55), relicIdx: k
      });
    });
  });

  const ITEMS = [].concat(ELEMENTS, RELICS, [SLAG], COMPOUNDS);
  const ITEM_BY_ID = {};
  ITEMS.forEach(function (it) { ITEM_BY_ID[it.id] = it; });

  // Each archetype changes the generator itself (terrain rule, gravity, light, visibility).
  const ARCHS = [
    { id: 'meadow', name: 'Rolling Plains', g: 18, fog: [14, 55], amb: 0.4, s: [0.4, 0.7], l: [0.4, 0.55], dark: false },
    { id: 'spires', name: 'Spire Field', g: 13, fog: [10, 38], amb: 0.36, s: [0.08, 0.35], l: [0.35, 0.5], dark: false },
    { id: 'dust', name: 'Crater Waste', g: 9, fog: [12, 45], amb: 0.38, s: [0.4, 0.7], l: [0.42, 0.58], dark: false },
    { id: 'terr', name: 'Terrace World', g: 22, fog: [14, 55], amb: 0.4, s: [0.3, 0.6], l: [0.4, 0.55], dark: false },
    { id: 'archi', name: 'Archipelago', g: 6, fog: [16, 60], amb: 0.42, s: [0.4, 0.65], l: [0.42, 0.56], dark: false },
    { id: 'gloom', name: 'Gloomfield', g: 14, fog: [4, 17], amb: 0.24, s: [0.3, 0.6], l: [0.28, 0.4], dark: true }
  ];

  function pairKey(a, b) { return a < b ? a + '+' + b : b + '+' + a; }

  // Recipe table is generated from the save seed, so each save has its own hidden recipes.
  function buildRecipes(seed) {
    const rnd = mulberry32((seed ^ 0x5bd1e995) >>> 0);
    const map = {};
    const used = {};
    function pick(arr) { return arr[Math.floor(rnd() * arr.length)]; }
    COMPOUNDS.forEach(function (c) {
      const T = c.tier;
      const poolA = T === 4 ? [RELICS[c.relicIdx]] : ITEMS.filter(function (i) { return i.rank === T - 1; });
      const poolB = ITEMS.filter(function (i) { return i.rank <= T - 1; });
      for (let tries = 0; tries < 800; tries++) {
        const a = pick(poolA);
        const b = pick(poolB);
        if (a.id === b.id) continue;
        const key = pairKey(a.id, b.id);
        if (used[key]) continue;
        used[key] = true;
        map[key] = c.id;
        break;
      }
    });
    return map;
  }

  function planetName(seed) {
    const r = mulberry32((seed ^ 0x85ebca6b) >>> 0);
    const A = ['Ka', 'Vel', 'Zor', 'Mi', 'Tal', 'Xu', 'Oro', 'Nem', 'Qua', 'Thy', 'Bre', 'Ul', 'Sor', 'Ily', 'Dra'];
    const B = ['ra', 'no', 'thi', 'xa', 'lu', 'mir', 'dun', 'vo', 'ket', 'sa'];
    const C = ['', 'n', 's', 'th', 'x', 'r'];
    return A[Math.floor(r() * A.length)] + B[Math.floor(r() * B.length)] + C[Math.floor(r() * C.length)] + '-' + (1 + Math.floor(r() * 98));
  }

  // ---------- noise ----------
  function makeNoise(seed) {
    const rnd = mulberry32(seed);
    const perm = new Uint8Array(512);
    const p = [];
    for (let i = 0; i < 256; i++) p.push(i);
    for (let i = 255; i > 0; i--) {
      const j = Math.floor(rnd() * (i + 1));
      const t = p[i]; p[i] = p[j]; p[j] = t;
    }
    for (let i = 0; i < 512; i++) perm[i] = p[i & 255];
    const vals = new Float32Array(256);
    for (let i = 0; i < 256; i++) vals[i] = rnd() * 2 - 1;
    function lat(x, y, z) { return vals[perm[perm[perm[x & 255] + (y & 255)] + (z & 255)]]; }
    return function (x, y, z) {
      const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
      const xf = x - xi, yf = y - yi, zf = z - zi;
      const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf), w = zf * zf * (3 - 2 * zf);
      const c000 = lat(xi, yi, zi), c100 = lat(xi + 1, yi, zi);
      const c010 = lat(xi, yi + 1, zi), c110 = lat(xi + 1, yi + 1, zi);
      const c001 = lat(xi, yi, zi + 1), c101 = lat(xi + 1, yi, zi + 1);
      const c011 = lat(xi, yi + 1, zi + 1), c111 = lat(xi + 1, yi + 1, zi + 1);
      const x00 = c000 + (c100 - c000) * u, x10 = c010 + (c110 - c010) * u;
      const x01 = c001 + (c101 - c001) * u, x11 = c011 + (c111 - c011) * u;
      const y0 = x00 + (x10 - x00) * v, y1 = x01 + (x11 - x01) * v;
      return y0 + (y1 - y0) * w;
    };
  }

  // Returns { fn(x,y,z) -> height above base radius for unit direction, sea -> flat water height or null }.
  function makeTerrain(archId, rnd) {
    const noise = makeNoise((rnd() * 4294967296) >>> 0);
    function fb(x, y, z, oct) {
      let a = 1, f = 1, s = 0, n = 0;
      for (let i = 0; i < oct; i++) {
        s += a * noise(x * f, y * f, z * f);
        n += a; a *= 0.5; f *= 2;
      }
      return s / n;
    }
    let fn;
    let sea = null;
    if (archId === 'spires') {
      const f = 1.8 + rnd() * 0.8, amp = 10 + rnd() * 4, off = rnd() * 40;
      fn = function (x, y, z) {
        const a = 1 - Math.abs(noise(x * f + off, y * f, z * f));
        const b = 1 - Math.abs(noise(x * f * 1.3, y * f * 1.3 + off, z * f * 1.3));
        const k = a * b;
        return amp * k * k * k - amp * 0.2 + 0.8 * noise(x * 4.5, y * 4.5, z * 4.5);
      };
    } else if (archId === 'dust') {
      const n = 9 + Math.floor(rnd() * 6);
      const cr = [];
      for (let i = 0; i < n; i++) {
        const d = randUnit(rnd);
        const rho = 0.13 + rnd() * 0.2;
        cr.push({ d: d, rho: rho, cosCut: Math.cos(rho * 1.6), depth: rho * 13, rim: rho * 5 });
      }
      const f = 1.4 + rnd() * 0.6, amp = 1.5 + rnd() * 1.5;
      fn = function (x, y, z) {
        let h = amp * fb(x * f, y * f, z * f, 3);
        for (let i = 0; i < cr.length; i++) {
          const c = cr[i];
          const dt = x * c.d[0] + y * c.d[1] + z * c.d[2];
          if (dt < c.cosCut) continue;
          const u = Math.acos(Math.min(1, dt)) / c.rho;
          if (u < 1) h -= c.depth * (1 - u * u);
          const e = (u - 1) * 3.2;
          h += c.rim * Math.exp(-e * e);
        }
        return h;
      };
    } else if (archId === 'terr') {
      const f = 1.1 + rnd() * 0.7, amp = 9 + rnd() * 5, steps = 4 + Math.floor(rnd() * 4);
      fn = function (x, y, z) {
        const q = clamp(fb(x * f, y * f, z * f, 3) * 0.9 + 0.5, 0, 0.999);
        const s = q * steps;
        const fl = Math.floor(s);
        const sm = clamp((s - fl - 0.75) / 0.25, 0, 1);
        const st = (fl + sm * sm * (3 - 2 * sm)) / steps;
        return amp * (st - 0.5);
      };
    } else if (archId === 'archi') {
      const f = 1.3 + rnd() * 0.7, amp = 8 + rnd() * 3, seaN = -0.02 + rnd() * 0.14;
      sea = seaN * amp;
      fn = function (x, y, z) {
        const b = fb(x * f, y * f, z * f, 4);
        return (b < seaN ? seaN : b) * amp;
      };
    } else if (archId === 'gloom') {
      const f = 2.2 + rnd() * 1.0, amp = 5 + rnd() * 3;
      fn = function (x, y, z) { return amp * fb(x * f, y * f, z * f, 3); };
    } else {
      const f = 1.3 + rnd() * 0.9, amp = 3.5 + rnd() * 2.5;
      fn = function (x, y, z) { return amp * fb(x * f, y * f, z * f, 3); };
    }
    return { fn: fn, sea: sea };
  }

  // ---------- icosphere ----------
  function buildIco(level) {
    const t = (1 + Math.sqrt(5)) / 2;
    const verts = [
      [-1, t, 0], [1, t, 0], [-1, -t, 0], [1, -t, 0],
      [0, -1, t], [0, 1, t], [0, -1, -t], [0, 1, -t],
      [t, 0, -1], [t, 0, 1], [-t, 0, -1], [-t, 0, 1]
    ].map(vnorm);
    let faces = [
      [0, 11, 5], [0, 5, 1], [0, 1, 7], [0, 7, 10], [0, 10, 11],
      [1, 5, 9], [5, 11, 4], [11, 10, 2], [10, 7, 6], [7, 1, 8],
      [3, 9, 4], [3, 4, 2], [3, 2, 6], [3, 6, 8], [3, 8, 9],
      [4, 9, 5], [2, 4, 11], [6, 2, 10], [8, 6, 7], [9, 8, 1]
    ];
    for (let l = 0; l < level; l++) {
      const cache = new Map();
      const nf = [];
      const mid = function (a, b) {
        const k = a < b ? a * 8192 + b : b * 8192 + a;
        let m = cache.get(k);
        if (m === undefined) {
          const va = verts[a], vb = verts[b];
          m = verts.length;
          verts.push(vnorm([(va[0] + vb[0]) / 2, (va[1] + vb[1]) / 2, (va[2] + vb[2]) / 2]));
          cache.set(k, m);
        }
        return m;
      };
      for (let i = 0; i < faces.length; i++) {
        const f = faces[i];
        const a = mid(f[0], f[1]), b = mid(f[1], f[2]), c = mid(f[2], f[0]);
        nf.push([f[0], a, c], [f[1], b, a], [f[2], c, b], [a, b, c]);
      }
      faces = nf;
    }
    const dirs = new Float32Array(verts.length * 3);
    for (let i = 0; i < verts.length; i++) {
      dirs[i * 3] = verts[i][0]; dirs[i * 3 + 1] = verts[i][1]; dirs[i * 3 + 2] = verts[i][2];
    }
    const fa = new Uint16Array(faces.length * 3);
    for (let i = 0; i < faces.length; i++) {
      fa[i * 3] = faces[i][0]; fa[i * 3 + 1] = faces[i][1]; fa[i * 3 + 2] = faces[i][2];
    }
    return { dirs: dirs, faces: fa };
  }

  const ICO = buildIco(ICO_LEVEL);
  const NV = ICO.dirs.length / 3;
  const NF = ICO.faces.length / 3;

  // Small convex meshes in local space: x right, y up, z forward. Triangle = [a, b, c, colorIndex].
  const MESH = {
    oct: {
      v: [[0, 1, 0], [0.5, 0.35, 0], [0, 0.35, 0.5], [-0.5, 0.35, 0], [0, 0.35, -0.5], [0, 0, 0]],
      t: [[0, 1, 2, 0], [0, 2, 3, 0], [0, 3, 4, 0], [0, 4, 1, 0], [5, 2, 1, 0], [5, 3, 2, 0], [5, 4, 3, 0], [5, 1, 4, 0]]
    },
    pyr: {
      v: [[-0.5, 0, -0.5], [0.5, 0, -0.5], [0.5, 0, 0.5], [-0.5, 0, 0.5], [0, 1, 0]],
      t: [[0, 1, 4, 0], [1, 2, 4, 0], [2, 3, 4, 0], [3, 0, 4, 0], [0, 1, 2, 0], [0, 2, 3, 0]]
    },
    box: {
      v: [[-0.5, 0, -0.5], [0.5, 0, -0.5], [0.5, 0, 0.5], [-0.5, 0, 0.5], [-0.5, 1, -0.5], [0.5, 1, -0.5], [0.5, 1, 0.5], [-0.5, 1, 0.5]],
      t: [[0, 1, 2, 0], [0, 2, 3, 0], [4, 5, 6, 0], [4, 6, 7, 0], [0, 1, 5, 0], [0, 5, 4, 0],
        [1, 2, 6, 0], [1, 6, 5, 0], [2, 3, 7, 0], [2, 7, 6, 0], [3, 0, 4, 0], [3, 4, 7, 0]]
    },
    tet: {
      v: [[0, 0, 0.9], [-0.55, 0, -0.6], [0.55, 0, -0.6], [0, 1.5, -0.1]],
      t: [[0, 1, 2, 0], [0, 1, 3, 0], [0, 2, 3, 0], [1, 2, 3, 0]]
    }
  };
  Object.keys(MESH).forEach(function (k) {
    const m = MESH[k];
    const c = [0, 0, 0];
    m.v.forEach(function (v) { c[0] += v[0]; c[1] += v[1]; c[2] += v[2]; });
    m.cen = [c[0] / m.v.length, c[1] / m.v.length, c[2] / m.v.length];
  });

  // ---------- planet generation ----------
  function genPlanet(seed, depth, avoid) {
    const rnd = mulberry32(seed >>> 0);
    let arch;
    do { arch = ARCHS[Math.floor(rnd() * ARCHS.length)]; } while (arch.id === avoid);

    const R = 34 + rnd() * 12;
    const g = arch.g * (0.85 + rnd() * 0.3);
    const jumpV = 9;
    const jumpH = jumpV * jumpV / (2 * g);

    const H = rnd() * 360;
    const S = lerp(arch.s[0], arch.s[1], rnd());
    const L = lerp(arch.l[0], arch.l[1], rnd());
    const cLow = hsl(H, S * 0.8, L * 0.78);
    const cMid = hsl(H + 24, S, L);
    const cHigh = hsl(H + 10, S * 0.3, Math.min(0.88, L + 0.32));
    const cRock = hsl(H + 200, 0.1, 0.3);
    const cWater = hsl(190 + rnd() * 50, 0.55, 0.36);
    const skyH = rnd() * 360;
    const skyTop = arch.dark ? hsl(skyH, 0.4, 0.04) : hsl(skyH, 0.55, 0.2);
    const skyHor = arch.dark ? hsl(skyH, 0.4, 0.09) : hsl(skyH + 25, 0.6, 0.58);
    const fogCol = arch.dark ? [6, 6, 12] : skyHor.slice();
    const sun = randUnit(rnd);
    const tint = [0.85 + rnd() * 0.15, 0.85 + rnd() * 0.15, 0.85 + rnd() * 0.15];

    const terrain = makeTerrain(arch.id, rnd);
    const hf = terrain.fn;
    const sea = terrain.sea;

    function surf(d) { const r = R + hf(d[0], d[1], d[2]); return [d[0] * r, d[1] * r, d[2] * r]; }
    function isLand(d) { return sea === null || hf(d[0], d[1], d[2]) > sea + 0.05; }
    function offDir(d, b, dx, dz) { return vnorm(vadd(vscale(d, R), vadd(vscale(b.r, dx), vscale(b.f, dz)))); }
    function mkInst(mesh, d, s, cols, extra) {
      const b = basisFrom(d, [0, 1, 0]);
      const inst = { mesh: mesh, o: surf(d), r: b.r, u: b.u, f: b.f, s: s, cols: cols, minLit: 0, glow: false, up: 0, bob: false, phase: 0 };
      if (extra) { for (const k in extra) inst[k] = extra[k]; }
      return inst;
    }

    // terrain mesh
    const pos = new Float32Array(NV * 3);
    const vh = new Float32Array(NV);
    let hmin = 1e9, hmax = -1e9;
    for (let i = 0; i < NV; i++) {
      const dx = ICO.dirs[i * 3], dy = ICO.dirs[i * 3 + 1], dz = ICO.dirs[i * 3 + 2];
      const h = hf(dx, dy, dz);
      vh[i] = h;
      if (h < hmin) hmin = h;
      if (h > hmax) hmax = h;
      const rr = R + h;
      pos[i * 3] = dx * rr; pos[i * 3 + 1] = dy * rr; pos[i * 3 + 2] = dz * rr;
    }
    const hr = (hmax - hmin) || 1;
    const fc = new Float32Array(NF * 3);
    const fnr = new Float32Array(NF * 3);
    const fcol = new Float32Array(NF * 3);
    const fwat = new Uint8Array(NF);
    const skyMax = Math.max(skyHor[0], skyHor[1], skyHor[2], 1);
    const skyAmb = [0.5 + 0.5 * skyHor[0] / skyMax, 0.5 + 0.5 * skyHor[1] / skyMax, 0.5 + 0.5 * skyHor[2] / skyMax];
    const sunCol = [1.08, 1.0, 0.9];
    for (let f = 0; f < NF; f++) {
      const ia = ICO.faces[f * 3], ib = ICO.faces[f * 3 + 1], ic = ICO.faces[f * 3 + 2];
      const a = ia * 3, b = ib * 3, c = ic * 3;
      const cx = (pos[a] + pos[b] + pos[c]) / 3;
      const cy = (pos[a + 1] + pos[b + 1] + pos[c + 1]) / 3;
      const cz = (pos[a + 2] + pos[b + 2] + pos[c + 2]) / 3;
      const e1x = pos[b] - pos[a], e1y = pos[b + 1] - pos[a + 1], e1z = pos[b + 2] - pos[a + 2];
      const e2x = pos[c] - pos[a], e2y = pos[c + 1] - pos[a + 1], e2z = pos[c + 2] - pos[a + 2];
      let nx = e1y * e2z - e1z * e2y, ny = e1z * e2x - e1x * e2z, nz = e1x * e2y - e1y * e2x;
      const nl = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1;
      nx /= nl; ny /= nl; nz /= nl;
      if (nx * cx + ny * cy + nz * cz < 0) { nx = -nx; ny = -ny; nz = -nz; }
      fc[f * 3] = cx; fc[f * 3 + 1] = cy; fc[f * 3 + 2] = cz;
      fnr[f * 3] = nx; fnr[f * 3 + 1] = ny; fnr[f * 3 + 2] = nz;
      const cl = Math.sqrt(cx * cx + cy * cy + cz * cz) || 1;
      const slope = 1 - (nx * cx + ny * cy + nz * cz) / cl;
      const hv = (vh[ia] + vh[ib] + vh[ic]) / 3;
      const t = (hv - hmin) / hr;
      let col;
      if (sea !== null && Math.max(vh[ia], vh[ib], vh[ic]) <= sea + 0.001) {
        col = cWater;
        fwat[f] = 1;
      } else {
        col = t < 0.5 ? mixc(cLow, cMid, t * 2) : mixc(cMid, cHigh, (t - 0.5) * 2);
        col = mixc(col, cRock, clamp((slope - 0.05) / 0.12, 0, 1) * 0.85);
      }
      const jit = 0.93 + rnd() * 0.12;
      const diff = Math.max(0, nx * sun[0] + ny * sun[1] + nz * sun[2]);
      const occ = fwat[f] ? 1 : 0.8 + 0.2 * clamp(t, 0, 1);
      const ambL = arch.amb * (1.12 - slope * 1.2) * occ * jit;
      const dirL = (1 - arch.amb) * diff * (0.75 + 0.25 * diff) * jit;
      fcol[f * 3] = col[0] * (ambL * skyAmb[0] + dirL * sunCol[0]) * tint[0];
      fcol[f * 3 + 1] = col[1] * (ambL * skyAmb[1] + dirL * sunCol[1]) * tint[1];
      fcol[f * 3 + 2] = col[2] * (ambL * skyAmb[2] + dirL * sunCol[2]) * tint[2];
    }

    // landing site: lit side, on land
    let startDir = null;
    for (let i = 0; i < 80 && !startDir; i++) {
      const d = randUnit(rnd);
      if (vdot(d, sun) > 0.3 && isLand(d)) startDir = d;
    }
    if (!startDir) startDir = vnorm(sun);

    // ship at the landing site
    const ship = [
      mkInst(MESH.box, startDir, [7, 0.25, 7], [[70, 72, 84, 0]], { minLit: 0.3 }),
      mkInst(MESH.pyr, startDir, [2.4, 7, 2.4], [[205, 210, 222, 0]], { minLit: 0.35, up: 0.25 }),
      mkInst(MESH.oct, startDir, [0.7, 1.2, 0.7], [[255, 130, 60, 1]], { up: 7.2 })
    ];

    // resources
    const elig = ELEMENTS.filter(function (e) {
      return depth >= e.rank && (!e.where || e.where.indexOf(arch.id) >= 0);
    });
    let totalW = 0;
    elig.forEach(function (e) { totalW += e.w; });
    const nRes = 24 + Math.floor(rnd() * 14);
    const floaty = jumpH >= 3.4;
    const maxAlt = Math.min(5, jumpH * 0.7);
    const resources = [];
    for (let i = 0; i < nRes; i++) {
      let w = rnd() * totalW;
      let el = elig[0];
      for (let k = 0; k < elig.length; k++) {
        w -= elig[k].w;
        if (w <= 0) { el = elig[k]; break; }
      }
      let d = null;
      for (let k = 0; k < 12; k++) {
        const c = randUnit(rnd);
        if (vdot(c, startDir) < 0.985 && isLand(c)) { d = c; break; }
      }
      if (!d) continue;
      const alt = (floaty && rnd() < 0.35) ? 2.2 + rnd() * Math.max(0, maxAlt - 2.2) : 0;
      const size = 0.85 + rnd() * 0.5;
      const phase = rnd() * TAU;
      const inst = mkInst(MESH.oct, d, [0.6 * size, 1.1 * size * el.sh, 0.6 * size], [[el.col[0], el.col[1], el.col[2], 0]],
        { minLit: 0.6, glow: arch.dark, up: alt + 0.1, bob: true, phase: phase });
      resources.push({ index: resources.length, el: el.id, dir: d, alt: alt, base: inst.o, u: inst.u, taken: false, inst: inst });
    }

    // anomaly
    function makeAnom(typeIdx) {
      const type = ANOMS[typeIdx];
      const rc = ITEM_BY_ID[type.relic].col;
      let dir = null;
      for (let k = 0; k < 60; k++) {
        const c = randUnit(rnd);
        if (vdot(c, startDir) < 0.2 && isLand(c)) { dir = c; break; }
      }
      if (!dir) dir = vnorm(vscale(startDir, -1));
      const b = basisFrom(dir, [0, 1, 0]);
      const pos0 = surf(dir);
      const parts = [];
      const glowCol = [rc[0], rc[1], rc[2], 1];
      if (type.id === 'monolith') {
        parts.push(mkInst(MESH.box, dir, [1.6, 13, 0.8], [[24, 26, 38, 0]], { minLit: 0.15 }));
        const s1 = mkInst(MESH.box, dir, [0.25, 10, 0.1], [glowCol.slice()]);
        s1.o = vadd(s1.o, vadd(vscale(b.f, 0.45), vscale(b.u, 1)));
        const s2 = mkInst(MESH.box, dir, [0.25, 10, 0.1], [glowCol.slice()]);
        s2.o = vadd(s2.o, vadd(vscale(b.f, -0.45), vscale(b.u, 1)));
        parts.push(s1, s2);
        parts.push(mkInst(MESH.oct, dir, [0.9, 1.8, 0.9], [glowCol.slice()], { up: 14.5, bob: true, phase: rnd() * TAU }));
      } else if (type.id === 'wreck') {
        const tb = basisFrom(vnorm(vadd(b.u, vscale(b.r, 0.45))), b.f);
        parts.push({
          mesh: MESH.pyr, o: vadd(pos0, vscale(b.u, 0.6)), r: tb.r, u: tb.u, f: tb.f,
          s: [5, 9, 5], cols: [[118, 124, 138, 0]], minLit: 0.2, glow: false, up: 0, bob: false, phase: 0
        });
        for (let k = 0; k < 3; k++) {
          const ang = rnd() * TAU;
          const dd = offDir(dir, b, Math.cos(ang) * (5 + rnd() * 3), Math.sin(ang) * (5 + rnd() * 3));
          parts.push(mkInst(MESH.box, dd, [1 + rnd() * 1.6, 0.6 + rnd() * 0.8, 1 + rnd() * 1.6], [[92, 98, 110, 0]], { minLit: 0.2 }));
        }
        parts.push(mkInst(MESH.oct, offDir(dir, b, 3.2, 1), [0.9, 1.4, 0.9], [glowCol.slice()], { up: 0.2, bob: true, phase: rnd() * TAU }));
      } else if (type.id === 'ring') {
        parts.push(mkInst(MESH.box, dir, [3, 0.6, 3], [[60, 58, 72, 0]], { minLit: 0.2 }));
        parts.push(mkInst(MESH.oct, dir, [1.2, 2.4, 1.2], [glowCol.slice()], { up: 3, bob: true, phase: rnd() * TAU }));
        for (let k = 0; k < 8; k++) {
          const ang = k * TAU / 8;
          const dd = offDir(dir, b, Math.cos(ang) * 7, Math.sin(ang) * 7);
          parts.push(mkInst(MESH.box, dd, [1.1, 4.5 + rnd() * 2.2, 1.1], [[150, 146, 164, 0]], { minLit: 0.2 }));
        }
      } else {
        for (let k = 0; k < 7; k++) {
          const dd = offDir(dir, b, (rnd() * 2 - 1) * 4, (rnd() * 2 - 1) * 4);
          parts.push(mkInst(MESH.oct, dd, [1 + rnd(), 3 + rnd() * 5, 1 + rnd()], [[rc[0], rc[1], rc[2], 0]], { minLit: 0.7, glow: true }));
        }
      }
      return {
        type: type.id, name: type.name, relic: type.relic, dir: dir,
        center: vadd(pos0, vscale(b.u, 1)), parts: parts, done: false,
        trigR: type.id === 'monolith' ? 4.5 : 5
      };
    }
    let anomaly = null;
    const chance = depth === 0 ? 0 : 0.12 + 0.05 * depth;
    if (rnd() < chance) anomaly = makeAnom(Math.floor(rnd() * ANOMS.length));

    // stars
    const sr = mulberry32((seed ^ 0xdeadbeef) >>> 0);
    const stars = new Float32Array(150 * 3);
    for (let i = 0; i < 150; i++) {
      const s = randUnit(sr);
      stars[i * 3] = s[0]; stars[i * 3 + 1] = s[1]; stars[i * 3 + 2] = s[2];
    }

    return {
      seed: seed, depth: depth, arch: arch, name: planetName(seed), R: R, g: g, jumpV: jumpV,
      hf: hf, sea: sea, pos: pos, fc: fc, fnr: fnr, fcol: fcol, fwat: fwat, sun: sun, tint: tint,
      skyTop: skyTop, skyHor: skyHor, fogCol: fogCol, startDir: startDir, ship: ship,
      resources: resources, anomaly: anomaly, stars: stars
    };
  }

  // ---------- save ----------
  const store = {
    get: function () { try { return window.localStorage.getItem(SAVE_KEY); } catch (e) { return null; } },
    set: function (v) { try { window.localStorage.setItem(SAVE_KEY, v); } catch (e) { /* storage unavailable: play without saving */ } }
  };

  function makeOpts() {
    const pickD = function (a, b) { return Math.random() < 0.6 ? a : b; };
    return [1, pickD(2, 3), pickD(3, 4)].map(function (d) { return { seed: rseed(), d: d }; });
  }

  function newSave() {
    return {
      v: 1, seed: rseed(), inv: {}, known: {}, failed: {},
      codex: { e: {}, r: {}, c: {}, a: {}, n: {} },
      fuel: 0, visited: 1,
      cur: { seed: rseed(), depth: 0, avoid: 'gloom', got: [], anomDone: false },
      opts: makeOpts()
    };
  }

  function isObj(x) { return x && typeof x === 'object' && !Array.isArray(x); }

  function loadSave() {
    const raw = store.get();
    if (!raw) return newSave();
    let o;
    try { o = JSON.parse(raw); } catch (e) { return newSave(); }
    if (!isObj(o) || o.v !== 1) return newSave();
    const s = newSave();
    if (typeof o.seed === 'number') s.seed = o.seed >>> 0;
    if (isObj(o.inv)) s.inv = o.inv;
    if (isObj(o.known)) s.known = o.known;
    if (isObj(o.failed)) s.failed = o.failed;
    if (isObj(o.codex)) {
      ['e', 'r', 'c', 'a', 'n'].forEach(function (k) { if (isObj(o.codex[k])) s.codex[k] = o.codex[k]; });
    }
    if (typeof o.fuel === 'number' && o.fuel >= 0) s.fuel = o.fuel;
    if (typeof o.visited === 'number') s.visited = o.visited;
    const c = o.cur;
    if (isObj(c) && typeof c.seed === 'number' && typeof c.depth === 'number' && c.depth >= 0 && c.depth <= 4 && Array.isArray(c.got)) {
      s.cur = { seed: c.seed >>> 0, depth: c.depth, avoid: typeof c.avoid === 'string' ? c.avoid : 'gloom', got: c.got.filter(function (x) { return typeof x === 'number'; }), anomDone: !!c.anomDone };
    }
    if (Array.isArray(o.opts) && o.opts.length === 3 && o.opts.every(function (p) { return isObj(p) && typeof p.seed === 'number' && p.d >= 1 && p.d <= 4; })) {
      s.opts = o.opts.map(function (p) { return { seed: p.seed >>> 0, d: p.d | 0 }; });
    }
    return s;
  }

  // ---------- dom ----------
  const app = document.getElementById('app');
  const view = document.getElementById('view');
  const ctx = view.getContext('2d', { alpha: false });
  const hudA = document.getElementById('hudA');
  const hudB = document.getElementById('hudB');
  const hudAnom = document.getElementById('hudAnom');
  const toastEl = document.getElementById('toast');
  const flashEl = document.getElementById('flash');
  const fadeEl = document.getElementById('fade');
  const startEl = document.getElementById('start');
  const panelEl = document.getElementById('panel');
  const panelTitle = document.getElementById('panelTitle');
  const panelBody = document.getElementById('panelBody');

  function el(tag, cls, text) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text !== undefined && text !== null) e.textContent = text;
    return e;
  }
  function setText(node, s) { if (node.textContent !== s) node.textContent = s; }

  // ---------- state ----------
  let save = loadSave();
  let RECIPES = buildRecipes(save.seed);
  let planet = null;
  const player = { p: [0, 1, 0], f: [0, 0, 1], alt: 0, vy: 0, P: [0, 0, 0] };
  const held = { fwd: false, back: false, left: false, right: false, jump: false };
  const tapped = { fwd: false, back: false, left: false, right: false };
  let jumpBuf = 0;
  let started = false;
  let busy = false;
  let panel = null;
  let time = 0;
  let lastTs = 0;
  let craftSel = [null, null];
  let craftMsg = '';
  let toastTimer = 0;

  function persist() { store.set(JSON.stringify(save)); }

  function toast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.classList.remove('show'); }, 3600);
  }

  function flash() {
    flashEl.classList.add('on');
    setTimeout(function () { flashEl.classList.remove('on'); }, 60);
  }

  function refreshHud() {
    setText(hudA, planet.name + '  |  ' + planet.arch.name);
    setText(hudB, 'Depth ' + planet.depth + '  |  Gravity ' + (planet.g / 18).toFixed(2) + '  |  Fuel ' + save.fuel);
  }

  function addItem(id, n) { save.inv[id] = (save.inv[id] || 0) + n; }

  // ---------- rendering ----------
  const cam = { p: [0, 0, 0], r: [1, 0, 0], u: [0, 1, 0], f: [0, 0, 1], dir: [0, 1, 0], focal: 1, cx: 0, cy: 0 };
  const camV = new Float32Array(NV * 3);
  const cvIn = new Float64Array(24);
  const cvOut = new Float64Array(24);
  const wv = new Float64Array(24);
  const px = new Float32Array(MAX_POLYS * 4);
  const py = new Float32Array(MAX_POLYS * 4);
  const pn = new Uint8Array(MAX_POLYS);
  const pk = new Float32Array(MAX_POLYS);
  const pcol = new Array(MAX_POLYS);
  const ord = new Uint16Array(MAX_POLYS);
  let pc = 0;

  function resize() {
    const scale = Math.min(window.devicePixelRatio || 1, 1.5);
    const w = Math.max(1, Math.floor(app.clientWidth * scale));
    const h = Math.max(1, Math.floor(app.clientHeight * scale));
    if (view.width !== w || view.height !== h) { view.width = w; view.height = h; }
  }

  // Clip polygon in cvIn (n verts) against z >= NEAR into cvOut. Returns vertex count.
  function clipNear(n) {
    let m = 0;
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      const ax = cvIn[i * 3], ay = cvIn[i * 3 + 1], az = cvIn[i * 3 + 2];
      const bx = cvIn[j * 3], by = cvIn[j * 3 + 1], bz = cvIn[j * 3 + 2];
      const ain = az >= NEAR, bin = bz >= NEAR;
      if (ain) {
        cvOut[m * 3] = ax; cvOut[m * 3 + 1] = ay; cvOut[m * 3 + 2] = az; m++;
      }
      if (ain !== bin) {
        const t = (NEAR - az) / (bz - az);
        cvOut[m * 3] = ax + (bx - ax) * t;
        cvOut[m * 3 + 1] = ay + (by - ay) * t;
        cvOut[m * 3 + 2] = NEAR;
        m++;
      }
    }
    return m;
  }

  // Project cvOut polygon and store it if on screen.
  function emit(n, key, r, g, b) {
    if (pc >= MAX_POLYS) return;
    const o = pc * 4;
    let minx = 1e9, maxx = -1e9, miny = 1e9, maxy = -1e9;
    for (let i = 0; i < n; i++) {
      const z = cvOut[i * 3 + 2];
      const sx = cam.cx + cvOut[i * 3] / z * cam.focal;
      const sy = cam.cy - cvOut[i * 3 + 1] / z * cam.focal;
      px[o + i] = sx; py[o + i] = sy;
      if (sx < minx) minx = sx;
      if (sx > maxx) maxx = sx;
      if (sy < miny) miny = sy;
      if (sy > maxy) maxy = sy;
    }
    if (maxx < 0 || minx > view.width || maxy < 0 || miny > view.height) return;
    pn[pc] = n;
    pk[pc] = key;
    pcol[pc] = 'rgb(' + (r | 0) + ',' + (g | 0) + ',' + (b | 0) + ')';
    pc++;
  }

  function instUp(inst) { return inst.up + (inst.bob ? Math.sin(time * 2 + inst.phase) * 0.2 : 0); }

  function drawInst(inst) {
    const mesh = inst.mesh, o = inst.o, r = inst.r, u = inst.u, f = inst.f, s = inst.s;
    const upOff = instUp(inst);
    const ox = o[0] + u[0] * upOff, oy = o[1] + u[1] * upOff, oz = o[2] + u[2] * upOff;
    const verts = mesh.v, nv = verts.length;
    for (let i = 0; i < nv; i++) {
      const v = verts[i];
      const lx = v[0] * s[0], ly = v[1] * s[1], lz = v[2] * s[2];
      wv[i * 3] = ox + r[0] * lx + u[0] * ly + f[0] * lz;
      wv[i * 3 + 1] = oy + r[1] * lx + u[1] * ly + f[1] * lz;
      wv[i * 3 + 2] = oz + r[2] * lx + u[2] * ly + f[2] * lz;
    }
    const cl = mesh.cen;
    const clx = cl[0] * s[0], cly = cl[1] * s[1], clz = cl[2] * s[2];
    const wcx = ox + r[0] * clx + u[0] * cly + f[0] * clz;
    const wcy = oy + r[1] * clx + u[1] * cly + f[1] * clz;
    const wcz = oz + r[2] * clx + u[2] * cly + f[2] * clz;
    const cp = cam.p, amb = planet.arch.amb, sun = planet.sun, tint = planet.tint;
    const fogC = planet.fogCol, fogN = planet.arch.fog[0], fogF = planet.arch.fog[1];
    for (let ti = 0; ti < mesh.t.length; ti++) {
      const t = mesh.t[ti];
      const a = t[0] * 3, b = t[1] * 3, c = t[2] * 3;
      const e1x = wv[b] - wv[a], e1y = wv[b + 1] - wv[a + 1], e1z = wv[b + 2] - wv[a + 2];
      const e2x = wv[c] - wv[a], e2y = wv[c + 1] - wv[a + 1], e2z = wv[c + 2] - wv[a + 2];
      let nx = e1y * e2z - e1z * e2y, ny = e1z * e2x - e1x * e2z, nz = e1x * e2y - e1y * e2x;
      const nl = Math.sqrt(nx * nx + ny * ny + nz * nz);
      if (nl < 1e-9) continue;
      nx /= nl; ny /= nl; nz /= nl;
      const tx = (wv[a] + wv[b] + wv[c]) / 3, ty = (wv[a + 1] + wv[b + 1] + wv[c + 1]) / 3, tz = (wv[a + 2] + wv[b + 2] + wv[c + 2]) / 3;
      if (nx * (tx - wcx) + ny * (ty - wcy) + nz * (tz - wcz) < 0) { nx = -nx; ny = -ny; nz = -nz; }
      const vx = tx - cp[0], vy = ty - cp[1], vz = tz - cp[2];
      if (nx * vx + ny * vy + nz * vz >= 0) continue;
      const col = inst.cols[t[3]];
      let rr, gg, bb;
      if (col[3]) {
        rr = col[0]; gg = col[1]; bb = col[2];
      } else {
        let lit = amb + (1 - amb) * Math.max(0, nx * sun[0] + ny * sun[1] + nz * sun[2]);
        if (lit < inst.minLit) lit = inst.minLit;
        rr = col[0] * lit * tint[0]; gg = col[1] * lit * tint[1]; bb = col[2] * lit * tint[2];
        const vd = Math.sqrt(vx * vx + vy * vy + vz * vz) || 1;
        let hx = sun[0] - vx / vd, hy = sun[1] - vy / vd, hz = sun[2] - vz / vd;
        const hl = Math.sqrt(hx * hx + hy * hy + hz * hz) || 1;
        const nh = (nx * hx + ny * hy + nz * hz) / hl;
        if (nh > 0 && nx * sun[0] + ny * sun[1] + nz * sun[2] > 0) {
          const sp = Math.pow(nh, 22) * 90;
          rr += sp * tint[0]; gg += sp * tint[1]; bb += sp * tint[2];
        }
        if (!inst.glow) {
          const ft = clamp((Math.sqrt(vx * vx + vy * vy + vz * vz) - fogN) / (fogF - fogN), 0, 1);
          rr += (fogC[0] - rr) * ft; gg += (fogC[1] - gg) * ft; bb += (fogC[2] - bb) * ft;
        }
      }
      for (let k = 0; k < 3; k++) {
        const idx = t[k] * 3;
        const dx = wv[idx] - cp[0], dy = wv[idx + 1] - cp[1], dz = wv[idx + 2] - cp[2];
        cvIn[k * 3] = dx * cam.r[0] + dy * cam.r[1] + dz * cam.r[2];
        cvIn[k * 3 + 1] = dx * cam.u[0] + dy * cam.u[1] + dz * cam.u[2];
        cvIn[k * 3 + 2] = dx * cam.f[0] + dy * cam.f[1] + dz * cam.f[2];
      }
      const m = clipNear(3);
      if (m < 3) continue;
      emit(m, (cvIn[2] + cvIn[5] + cvIn[8]) / 3 - OBJ_BIAS, rr, gg, bb);
    }
  }

  const pBody = { mesh: MESH.tet, o: [0, 0, 0], r: [1, 0, 0], u: [0, 1, 0], f: [0, 0, 1], s: [1.2, 1.2, 1.2], cols: [[236, 236, 242, 0]], minLit: 0.5, glow: true, up: 0, bob: false, phase: 0 };
  const pHead = { mesh: MESH.oct, o: [0, 0, 0], r: [1, 0, 0], u: [0, 1, 0], f: [0, 0, 1], s: [0.7, 0.8, 0.7], cols: [[90, 210, 255, 1]], minLit: 0, glow: true, up: 1.3, bob: false, phase: 0 };

  const post = { w: 0, h: 0, vig: null, grain: null };
  try {
    const gc = document.createElement('canvas');
    gc.width = 128; gc.height = 128;
    const g2 = gc.getContext('2d');
    const gi = g2.createImageData(128, 128);
    for (let i = 0; i < gi.data.length; i += 4) {
      const v = (Math.random() * 255) | 0;
      gi.data[i] = v; gi.data[i + 1] = v; gi.data[i + 2] = v; gi.data[i + 3] = 255;
    }
    g2.putImageData(gi, 0, 0);
    post.grain = ctx.createPattern(gc, 'repeat');
  } catch (e) { post.grain = null; }

  function computeCamera() {
    const p = player.p, f = player.f, P = player.P;
    let C = vadd(P, vadd(vscale(p, 3.0), vscale(f, -7.5)));
    const cl = vlen(C);
    const cd = [C[0] / cl, C[1] / cl, C[2] / cl];
    const minR = planet.R + planet.hf(cd[0], cd[1], cd[2]) + 1.4;
    if (cl < minR) C = vscale(cd, minR);
    const T = vadd(P, vadd(vscale(p, 1.3), vscale(f, 10)));
    const cf = vnorm(vsub(T, C));
    const right = vnorm(vcross(cf, p));
    const up = vcross(right, cf);
    cam.p = C; cam.r = right; cam.u = up; cam.f = cf;
    cam.dir = vnorm(C);
  }

  function render() {
    const W = view.width, H = view.height;
    cam.focal = Math.sqrt(W * H) * 0.9;
    cam.cx = W / 2; cam.cy = H / 2;
    computeCamera();

    // sky
    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, css(planet.skyTop));
    grad.addColorStop(0.55, css(mixc(planet.skyTop, planet.skyHor, 0.55)));
    grad.addColorStop(0.85, css(planet.skyHor));
    grad.addColorStop(1, css(mixc(planet.skyHor, [255, 255, 255], planet.arch.dark ? 0.04 : 0.22)));
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    const cr = cam.r, cu = cam.u, cf = cam.f, cp = cam.p;

    // stars and sun (rotation only)
    ctx.fillStyle = '#fff';
    const starA = planet.arch.dark ? 0.95 : 0.4;
    const st = planet.stars;
    const ss = Math.max(1.5, W / 500);
    for (let i = 0; i < 150; i++) {
      const x = st[i * 3], y = st[i * 3 + 1], z = st[i * 3 + 2];
      const zz = x * cf[0] + y * cf[1] + z * cf[2];
      if (zz < 0.05) continue;
      const sx = cam.cx + (x * cr[0] + y * cr[1] + z * cr[2]) / zz * cam.focal;
      const sy = cam.cy - (x * cu[0] + y * cu[1] + z * cu[2]) / zz * cam.focal;
      const sq = ss * (0.5 + (i % 5) * 0.22);
      ctx.globalAlpha = starA * (0.6 + 0.4 * Math.sin(time * 1.7 + i * 12.9898));
      ctx.fillRect(sx, sy, sq, sq);
    }
    ctx.globalAlpha = 1;
    const sn = planet.sun;
    const sz = sn[0] * cf[0] + sn[1] * cf[1] + sn[2] * cf[2];
    if (sz > 0.05) {
      const sx = cam.cx + (sn[0] * cr[0] + sn[1] * cr[1] + sn[2] * cr[2]) / sz * cam.focal;
      const sy = cam.cy - (sn[0] * cu[0] + sn[1] * cu[1] + sn[2] * cu[2]) / sz * cam.focal;
      const sr = Math.max(8, cam.focal * 0.03);
      const tr = (255 * planet.tint[0]) | 0, tg = (255 * planet.tint[1]) | 0, tb = (255 * planet.tint[2]) | 0;
      const gr = sr * 11;
      const glow = ctx.createRadialGradient(sx, sy, sr * 0.6, sx, sy, gr);
      const gA = planet.arch.dark ? 0.3 : 0.6;
      glow.addColorStop(0, 'rgba(' + tr + ',' + tg + ',' + tb + ',' + gA + ')');
      glow.addColorStop(0.25, 'rgba(' + tr + ',' + tg + ',' + tb + ',' + (gA * 0.3) + ')');
      glow.addColorStop(1, 'rgba(' + tr + ',' + tg + ',' + tb + ',0)');
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = glow;
      ctx.fillRect(sx - gr, sy - gr, gr * 2, gr * 2);
      ctx.globalCompositeOperation = 'source-over';
      const disc = ctx.createRadialGradient(sx, sy, 0, sx, sy, sr);
      disc.addColorStop(0, '#fff');
      disc.addColorStop(0.7, 'rgb(' + tr + ',' + tg + ',' + tb + ')');
      disc.addColorStop(1, 'rgba(' + tr + ',' + tg + ',' + tb + ',0.55)');
      ctx.fillStyle = disc;
      ctx.beginPath();
      ctx.arc(sx, sy, sr, 0, TAU);
      ctx.fill();
    }

    // terrain vertices into camera space
    const pos = planet.pos;
    for (let i = 0; i < NV; i++) {
      const dx = pos[i * 3] - cp[0], dy = pos[i * 3 + 1] - cp[1], dz = pos[i * 3 + 2] - cp[2];
      camV[i * 3] = dx * cr[0] + dy * cr[1] + dz * cr[2];
      camV[i * 3 + 1] = dx * cu[0] + dy * cu[1] + dz * cu[2];
      camV[i * 3 + 2] = dx * cf[0] + dy * cf[1] + dz * cf[2];
    }

    pc = 0;
    const fc = planet.fc, fnr = planet.fnr, fcol = planet.fcol, faces = ICO.faces;
    const fwat = planet.fwat, wsun = planet.sun, wsky = planet.skyHor, wtint = planet.tint;
    const fogC = planet.fogCol, fogN = planet.arch.fog[0], fogF = planet.arch.fog[1];
    for (let f = 0; f < NF; f++) {
      const f3 = f * 3;
      const vx = fc[f3] - cp[0], vy = fc[f3 + 1] - cp[1], vz = fc[f3 + 2] - cp[2];
      if (fnr[f3] * vx + fnr[f3 + 1] * vy + fnr[f3 + 2] * vz >= 0) continue;
      const ia = faces[f3] * 3, ib = faces[f3 + 1] * 3, ic = faces[f3 + 2] * 3;
      const za = camV[ia + 2], zb = camV[ib + 2], zc = camV[ic + 2];
      if (za < NEAR && zb < NEAR && zc < NEAR) continue;
      cvIn[0] = camV[ia]; cvIn[1] = camV[ia + 1]; cvIn[2] = za;
      cvIn[3] = camV[ib]; cvIn[4] = camV[ib + 1]; cvIn[5] = zb;
      cvIn[6] = camV[ic]; cvIn[7] = camV[ic + 1]; cvIn[8] = zc;
      const m = clipNear(3);
      if (m < 3) continue;
      const ft = clamp((Math.sqrt(vx * vx + vy * vy + vz * vz) - fogN) / (fogF - fogN), 0, 1);
      let br = fcol[f3], bg = fcol[f3 + 1], bb = fcol[f3 + 2];
      if (fwat[f]) {
        const vd = Math.sqrt(vx * vx + vy * vy + vz * vz) || 1;
        const nxw = fnr[f3], nyw = fnr[f3 + 1], nzw = fnr[f3 + 2];
        const nv = clamp(-(nxw * vx + nyw * vy + nzw * vz) / vd, 0, 1);
        const fres = Math.pow(1 - nv, 3) * 0.65;
        br += (wsky[0] - br) * fres; bg += (wsky[1] - bg) * fres; bb += (wsky[2] - bb) * fres;
        if (nxw * wsun[0] + nyw * wsun[1] + nzw * wsun[2] > 0) {
          const hx = wsun[0] - vx / vd, hy = wsun[1] - vy / vd, hz = wsun[2] - vz / vd;
          const hl = Math.sqrt(hx * hx + hy * hy + hz * hz) || 1;
          const nh = (nxw * hx + nyw * hy + nzw * hz) / hl;
          if (nh > 0) {
            const sp = Math.pow(nh, 70) * 230 * (0.85 + 0.15 * Math.sin(time * 3 + f * 1.7));
            br += sp * wtint[0]; bg += sp * wtint[1]; bb += sp * wtint[2];
          }
        }
      }
      const r = br + (fogC[0] - br) * ft;
      const g = bg + (fogC[1] - bg) * ft;
      const b = bb + (fogC[2] - bb) * ft;
      emit(m, vx * cf[0] + vy * cf[1] + vz * cf[2], r, g, b);
    }

    // objects
    const cd = cam.dir;
    for (let i = 0; i < planet.resources.length; i++) {
      const res = planet.resources[i];
      if (res.taken || vdot(res.dir, cd) < 0.5) continue;
      drawInst(res.inst);
    }
    if (planet.anomaly && vdot(planet.anomaly.dir, cd) > 0.3) {
      for (let i = 0; i < planet.anomaly.parts.length; i++) drawInst(planet.anomaly.parts[i]);
    }
    if (vdot(planet.startDir, cd) > 0.5) {
      for (let i = 0; i < planet.ship.length; i++) drawInst(planet.ship[i]);
    }
    const pr = vcross(player.f, player.p);
    pBody.o = player.P; pBody.r = pr; pBody.u = player.p; pBody.f = player.f;
    pHead.o = player.P; pHead.r = pr; pHead.u = player.p; pHead.f = player.f;
    drawInst(pBody);
    drawInst(pHead);

    // painter's algorithm: far to near
    const order = ord.subarray(0, pc);
    for (let i = 0; i < pc; i++) order[i] = i;
    order.sort(function (a, b) { return pk[b] - pk[a]; });
    ctx.lineJoin = 'round';
    ctx.lineWidth = 1;
    for (let q = 0; q < pc; q++) {
      const i = order[q];
      const n = pn[i];
      const o = i * 4;
      ctx.fillStyle = pcol[i];
      ctx.strokeStyle = pcol[i];
      ctx.beginPath();
      ctx.moveTo(px[o], py[o]);
      for (let k = 1; k < n; k++) ctx.lineTo(px[o + k], py[o + k]);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }

    // lens pass: soft vignette and fine film grain
    if (post.w !== W || post.h !== H) {
      post.w = W; post.h = H;
      const vg = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.35, W / 2, H / 2, Math.sqrt(W * W + H * H) * 0.56);
      vg.addColorStop(0, 'rgba(0,0,0,0)');
      vg.addColorStop(1, 'rgba(0,0,0,0.42)');
      post.vig = vg;
    }
    ctx.fillStyle = post.vig;
    ctx.fillRect(0, 0, W, H);
    if (post.grain) {
      const gx = ((time * 613) | 0) % 128, gy = ((time * 397) | 0) % 128;
      ctx.save();
      ctx.globalAlpha = 0.05;
      ctx.translate(-gx, -gy);
      ctx.fillStyle = post.grain;
      ctx.fillRect(0, 0, W + 128, H + 128);
      ctx.restore();
    }
  }

  // ---------- gameplay ----------
  function placePlayer() {
    const p = player.p;
    const gh = planet.hf(p[0], p[1], p[2]);
    const rr = planet.R + gh + 0.15 + player.alt;
    player.P = [p[0] * rr, p[1] * rr, p[2] * rr];
  }

  function resetPlayer() {
    const S = planet.startDir;
    const b = basisFrom(S, [0, 1, 0]);
    const phi = 7 / planet.R, c = Math.cos(phi), s = Math.sin(phi);
    player.p = vnorm([S[0] * c + b.f[0] * s, S[1] * c + b.f[1] * s, S[2] * c + b.f[2] * s]);
    player.f = vnorm([b.f[0] * c - S[0] * s, b.f[1] * c - S[1] * s, b.f[2] * c - S[2] * s]);
    player.alt = 0;
    player.vy = 0;
    jumpBuf = 0;
    placePlayer();
  }

  function collectResource(res) {
    res.taken = true;
    const it = ITEM_BY_ID[res.el];
    addItem(res.el, 1);
    save.cur.got.push(res.index);
    if (!save.codex.e[res.el]) {
      save.codex.e[res.el] = 1;
      toast('New element: ' + it.name + ' (' + it.sym + ')');
    } else {
      toast('+1 ' + it.name);
    }
    persist();
  }

  function dimAnomaly(an) {
    an.parts.forEach(function (p) { p.cols.forEach(function (c) { c[3] = 0; }); });
  }

  function collectAnomaly(an) {
    an.done = true;
    dimAnomaly(an);
    addItem(an.relic, 1);
    save.codex.n[an.type] = 1;
    save.codex.r[an.relic] = 1;
    save.cur.anomDone = true;
    flash();
    toast('Anomaly: ' + an.name + '. Recovered ' + ITEM_BY_ID[an.relic].name + '.');
    persist();
  }

  function update(dt) {
    if (busy) return;
    const mv = ((held.fwd || tapped.fwd) ? 1 : 0) - ((held.back || tapped.back) ? 1 : 0);
    const tn = ((held.left || tapped.left) ? 1 : 0) - ((held.right || tapped.right) ? 1 : 0);

    if (tn) {
      const a = tn * 2.2 * dt;
      const c = Math.cos(a), s = Math.sin(a);
      const w = vcross(player.p, player.f);
      player.f = vnorm([player.f[0] * c + w[0] * s, player.f[1] * c + w[1] * s, player.f[2] * c + w[2] * s]);
    }
    if (mv) {
      const phi = (mv > 0 ? 9 : -5) * dt / planet.R;
      const c = Math.cos(phi), s = Math.sin(phi);
      const p = player.p, f = player.f;
      const np = vnorm([p[0] * c + f[0] * s, p[1] * c + f[1] * s, p[2] * c + f[2] * s]);
      const nf = [f[0] * c - p[0] * s, f[1] * c - p[1] * s, f[2] * c - p[2] * s];
      const d = vdot(nf, np);
      player.p = np;
      player.f = vnorm([nf[0] - np[0] * d, nf[1] - np[1] * d, nf[2] - np[2] * d]);
    }

    // jump: a press is buffered until the player can actually jump
    if (held.jump) jumpBuf = 0.25;
    if (jumpBuf > 0) {
      jumpBuf -= dt;
      if (player.alt <= 0.001 && player.vy <= 0) { player.vy = planet.jumpV; jumpBuf = 0; }
    }
    player.vy -= planet.g * dt;
    player.alt += player.vy * dt;
    if (player.alt < 0) { player.alt = 0; player.vy = 0; }

    placePlayer();

    // pickups
    const pcen = vadd(player.P, vscale(player.p, 0.9));
    let changed = false;
    for (let i = 0; i < planet.resources.length; i++) {
      const res = planet.resources[i];
      if (res.taken) continue;
      const c = vadd(res.base, vscale(res.u, res.alt + 0.7));
      const d = vsub(c, pcen);
      if (vdot(d, d) < 2.1 * 2.1) { collectResource(res); changed = true; }
    }
    const an = planet.anomaly;
    if (an && !an.done) {
      const d = vsub(an.center, pcen);
      if (vlen(d) < an.trigR) { collectAnomaly(an); changed = true; }
    }
    if (changed) refreshHud();
  }

  function updateAnomHud() {
    let s = '';
    const an = planet.anomaly;
    if (an && !an.done) {
      const v = vsub(an.center, player.P);
      const dist = vlen(v);
      const fx = vdot(v, player.f);
      const rx = vdot(v, vcross(player.f, player.p));
      const ang = Math.atan2(rx, fx);
      const aa = Math.abs(ang);
      let dir = 'ahead';
      if (aa > 2.4) dir = 'behind';
      else if (aa > 0.5) dir = ang > 0 ? 'right' : 'left';
      s = 'Anomaly signal: ' + Math.round(dist) + ' m, ' + dir;
    }
    setText(hudAnom, s);
  }

  function loadPlanet() {
    const c = save.cur;
    planet = genPlanet(c.seed, c.depth, c.avoid);
    c.got.forEach(function (i) { if (planet.resources[i]) planet.resources[i].taken = true; });
    if (c.anomDone && planet.anomaly) { planet.anomaly.done = true; dimAnomaly(planet.anomaly); }
    save.codex.a[planet.arch.id] = 1;
    resetPlayer();
    refreshHud();
    toast('Landed on ' + planet.name + (planet.anomaly && !planet.anomaly.done ? '. Anomaly signal detected.' : '.'));
    persist();
  }

  function launch(opt) {
    if (busy || save.fuel < COST[opt.d]) return;
    save.fuel -= COST[opt.d];
    save.cur = { seed: opt.seed, depth: opt.d, avoid: planet.arch.id, got: [], anomDone: false };
    save.opts = makeOpts();
    save.visited += 1;
    persist();
    closePanel();
    busy = true;
    releaseKeys();
    fadeEl.classList.add('on');
    setTimeout(function () {
      loadPlanet();
      fadeEl.classList.remove('on');
      busy = false;
    }, 800);
  }

  // ---------- panels ----------
  function openPanel(name) {
    if (busy || !started) return;
    panel = name;
    releaseKeys();
    panelEl.hidden = false;
    panelTitle.textContent = name === 'craft' ? 'Craft' : (name === 'codex' ? 'Codex' : 'Launch');
    renderPanel();
  }

  function closePanel() {
    panel = null;
    panelEl.hidden = true;
  }

  function renderPanel() {
    panelBody.textContent = '';
    if (panel === 'craft') renderCraft();
    else if (panel === 'codex') renderCodex();
    else if (panel === 'launch') renderLaunch();
  }

  function chipEl(it, n, fn) {
    const b = el('button', 'chip');
    b.type = 'button';
    const sw = el('span', 'sw');
    sw.style.background = css(it.col);
    b.appendChild(sw);
    b.appendChild(el('span', null, it.name + ' x' + n));
    b.addEventListener('click', fn);
    return b;
  }

  function pickItem(id) {
    craftMsg = '';
    if (craftSel[0] === null) craftSel[0] = id;
    else if (craftSel[1] === null) {
      if (craftSel[0] === id) craftMsg = 'Pick two different items.';
      else craftSel[1] = id;
    } else if (id !== craftSel[0]) craftSel[1] = id;
    renderPanel();
  }

  function combine() {
    const a = craftSel[0], b = craftSel[1];
    if (!a || !b) { craftMsg = 'Pick two items.'; renderPanel(); return; }
    if (a === b) { craftMsg = 'Pick two different items.'; renderPanel(); return; }
    if ((save.inv[a] || 0) < 1 || (save.inv[b] || 0) < 1) { craftMsg = 'Not enough of an item.'; renderPanel(); return; }
    const key = pairKey(a, b);
    const res = RECIPES[key];
    if (res) {
      save.inv[a] -= 1;
      save.inv[b] -= 1;
      addItem(res, 1);
      const isNew = !save.codex.c[res];
      save.codex.c[res] = 1;
      save.known[key] = res;
      craftMsg = (isNew ? 'New compound: ' : 'Made ') + ITEM_BY_ID[res].name + '.';
      toast(craftMsg);
    } else if (save.failed[key]) {
      craftMsg = 'Already tried: no reaction. Nothing was used.';
    } else {
      save.failed[key] = 1;
      save.inv[a] -= 1;
      save.inv[b] -= 1;
      addItem(SLAG.id, 1);
      craftMsg = 'No reaction. Residue: Slag.';
    }
    if ((save.inv[a] || 0) < 1) craftSel[0] = null;
    if ((save.inv[b] || 0) < 1) craftSel[1] = null;
    persist();
    renderPanel();
  }

  function renderCraft() {
    const slots = el('div', 'row');
    for (let i = 0; i < 2; i++) {
      const id = craftSel[i];
      const b = el('button', 'slot', id ? ITEM_BY_ID[id].name : (i === 0 ? 'Slot A' : 'Slot B'));
      b.type = 'button';
      b.addEventListener('click', (function (idx) {
        return function () { craftSel[idx] = null; craftMsg = ''; renderPanel(); };
      })(i));
      slots.appendChild(b);
    }
    const go = el('button', 'btn primary', 'Combine');
    go.type = 'button';
    go.addEventListener('click', combine);
    slots.appendChild(go);
    panelBody.appendChild(slots);
    panelBody.appendChild(el('div', 'msg', craftMsg));

    panelBody.appendChild(el('h3', null, 'Inventory'));
    const grid = el('div', 'chips');
    let any = false;
    ITEMS.forEach(function (it) {
      const n = save.inv[it.id] || 0;
      if (n < 1) return;
      any = true;
      grid.appendChild(chipEl(it, n, function () { pickItem(it.id); }));
    });
    if (!any) grid.appendChild(el('div', 'dim', 'Nothing collected yet. Walk into the crystals.'));
    panelBody.appendChild(grid);

    panelBody.appendChild(el('h3', null, 'Known recipes'));
    let rows = 0;
    Object.keys(save.known).forEach(function (key) {
      const parts = key.split('+');
      const cid = save.known[key];
      if (parts.length !== 2 || !ITEM_BY_ID[cid] || !ITEM_BY_ID[parts[0]] || !ITEM_BY_ID[parts[1]]) return;
      rows++;
      const row = el('div', 'row');
      row.appendChild(el('span', 'grow', ITEM_BY_ID[cid].name + ' = ' + ITEM_BY_ID[parts[0]].name + ' + ' + ITEM_BY_ID[parts[1]].name));
      const use = el('button', 'btn', 'Use');
      use.type = 'button';
      use.addEventListener('click', function () { craftSel = [parts[0], parts[1]]; craftMsg = ''; renderPanel(); });
      row.appendChild(use);
      panelBody.appendChild(row);
    });
    if (!rows) panelBody.appendChild(el('div', 'dim', 'None yet. Recipes are hidden; try combinations.'));
  }

  function codexSection(title, defs, flags) {
    let have = 0;
    defs.forEach(function (d) { if (flags[d.id]) have++; });
    panelBody.appendChild(el('h3', null, title + ' ' + have + '/' + defs.length));
    const grid = el('div', 'tiles');
    defs.forEach(function (d) {
      const t = el('div', flags[d.id] ? 'tile' : 'tile locked');
      if (flags[d.id]) {
        if (d.col) {
          const sw = el('span', 'sw');
          sw.style.background = css(d.col);
          t.appendChild(sw);
        }
        t.appendChild(el('span', null, d.name));
      } else {
        t.appendChild(el('span', null, '???'));
      }
      grid.appendChild(t);
    });
    panelBody.appendChild(grid);
  }

  function renderCodex() {
    codexSection('Elements', ELEMENTS, save.codex.e);
    codexSection('Relics', RELICS, save.codex.r);
    codexSection('Compounds', COMPOUNDS, save.codex.c);
    codexSection('Planet types', ARCHS, save.codex.a);
    codexSection('Anomalies', ANOMS, save.codex.n);
    panelBody.appendChild(el('h3', null, 'Planets visited ' + save.visited));
  }

  function burn(id) {
    const it = ITEM_BY_ID[id];
    if (!it || !it.fuel || (save.inv[id] || 0) < 1) return;
    save.inv[id] -= 1;
    save.fuel += it.fuel;
    persist();
    refreshHud();
    renderPanel();
  }

  function renderLaunch() {
    panelBody.appendChild(el('div', 'row', 'Fuel: ' + save.fuel));

    panelBody.appendChild(el('h3', null, 'Burn for fuel'));
    let any = false;
    ITEMS.forEach(function (it) {
      const n = save.inv[it.id] || 0;
      if (!it.fuel || n < 1) return;
      any = true;
      const row = el('div', 'row');
      row.appendChild(el('span', 'grow', it.name + ' x' + n + '  (+' + it.fuel + ' fuel each)'));
      const b = el('button', 'btn', 'Burn 1');
      b.type = 'button';
      b.addEventListener('click', function () { burn(it.id); });
      row.appendChild(b);
      panelBody.appendChild(row);
    });
    if (!any) panelBody.appendChild(el('div', 'dim', 'Nothing to burn. Compounds and slag work as fuel.'));

    panelBody.appendChild(el('h3', null, 'Destinations'));
    save.opts.forEach(function (opt) {
      const cost = COST[opt.d];
      const row = el('div', 'row');
      row.appendChild(el('span', 'grow', planetName(opt.seed) + '  |  distance class ' + opt.d + '  |  cost ' + cost));
      const b = el('button', 'btn primary', 'Launch');
      b.type = 'button';
      b.disabled = save.fuel < cost;
      b.addEventListener('click', function () { launch(opt); });
      row.appendChild(b);
      panelBody.appendChild(row);
    });
  }

  // ---------- input ----------
  function setKey(name, down) {
    held[name] = down;
    if (down) {
      if (name === 'jump') jumpBuf = 0.25;
      else tapped[name] = true;
    }
  }

  function releaseKeys() {
    held.fwd = held.back = held.left = held.right = held.jump = false;
    tapped.fwd = tapped.back = tapped.left = tapped.right = false;
  }

  const KEYMAP = {
    KeyW: 'fwd', ArrowUp: 'fwd', KeyS: 'back', ArrowDown: 'back',
    KeyA: 'left', ArrowLeft: 'left', KeyD: 'right', ArrowRight: 'right', Space: 'jump'
  };

  function start() {
    if (started) return;
    started = true;
    startEl.classList.add('hide');
    window.focus();
  }

  window.addEventListener('keydown', function (e) {
    if (!started) start();
    if (panel) {
      if (e.key === 'Escape') closePanel();
      return;
    }
    const name = KEYMAP[e.code];
    if (!name) return;
    e.preventDefault();
    if (busy) return;
    setKey(name, true);
  });

  window.addEventListener('keyup', function (e) {
    const name = KEYMAP[e.code];
    if (!name) return;
    held[name] = false;
  });

  window.addEventListener('blur', releaseKeys);
  window.addEventListener('resize', resize);

  startEl.addEventListener('pointerdown', start);

  Array.prototype.forEach.call(document.querySelectorAll('[data-k]'), function (btn) {
    const name = btn.getAttribute('data-k');
    btn.addEventListener('pointerdown', function (e) {
      e.preventDefault();
      if (busy || panel) return;
      setKey(name, true);
    });
    ['pointerup', 'pointercancel', 'pointerleave'].forEach(function (ev) {
      btn.addEventListener(ev, function () { held[name] = false; });
    });
    btn.addEventListener('contextmenu', function (e) { e.preventDefault(); });
  });

  document.getElementById('btnCraft').addEventListener('click', function () { openPanel('craft'); });
  document.getElementById('btnCodex').addEventListener('click', function () { openPanel('codex'); });
  document.getElementById('btnLaunch').addEventListener('click', function () { openPanel('launch'); });
  document.getElementById('panelClose').addEventListener('click', closePanel);

  // ---------- main loop ----------
  function frame(ts) {
    const dt = clamp((ts - lastTs) / 1000, 0, 0.05);
    lastTs = ts;
    time += dt;
    if (started && !panel) update(dt);
    tapped.fwd = tapped.back = tapped.left = tapped.right = false;
    render();
    updateAnomHud();
    requestAnimationFrame(frame);
  }

  resize();
  loadPlanet();
  lastTs = performance.now();
  requestAnimationFrame(frame);
})();
