(function () {
  'use strict';

  const TIERS = 6;
  const POOLS = [
    [['Spark', 'Kindler'], ['Dust', 'Sifter'], ['Drop', 'Dripper']],
    [['Ore', 'Smelter'], ['Ember', 'Furnace'], ['Shard', 'Crusher']],
    [['Alloy', 'Foundry'], ['Glass', 'Kiln'], ['Resin', 'Press']],
    [['Core', 'Reactor'], ['Lattice', 'Weaver'], ['Gear', 'Assembler']],
    [['Prism', 'Refractor'], ['Plasma', 'Collider'], ['Nectar', 'Distillery']],
    [['Essence', 'Nexus'], ['Aether', 'Spire'], ['Void', 'Engine']]
  ];
  const GLYPHS = ['\u2726', '\u25C6', '\u25B2', '\u25CF', '\u25A0', '\u2605'];
  const ADJ = ['Gilded', 'Hollow', 'Resonant', 'Brittle', 'Humming', 'Obsidian', 'Woven', 'Tidal', 'Static', 'Lucid'];
  const NOUN = ['Lens', 'Anvil', 'Loom', 'Sigil', 'Cog', 'Chalice', 'Prism', 'Vessel', 'Idol', 'Compass'];
  const TH = [10, 25, 50, 100, 150, 200];
  const KINDS = ['out', 'cost', 'eff', 'click', 'glob'];
  const MAX_FUSE = 10;
  const PERKS = [
    { id: 'head', name: 'Head Start', desc: 'Begin each run with 250 of the first resource per level', base: 1, max: 10 },
    { id: 'thrift', name: 'Thrift', desc: 'Building cost growth -0.002 per level', base: 2, max: 5 },
    { id: 'auto', name: 'Auto-Clicker', desc: '1 automatic click per second per level', base: 3, max: 5 },
    { id: 'seer', name: 'Seer', desc: 'Golden orbs appear 12% sooner per level', base: 2, max: 4 },
    { id: 'mind', name: 'Scholar', desc: '+10% Insight gained per level', base: 3, max: 5 }
  ];
  const SUF = ['', 'K', 'M', 'B', 'T', 'Qa', 'Qi', 'Sx', 'Sp', 'Oc', 'No', 'Dc'];

  const $ = id => document.getElementById(id);
  const appEl = $('app');
  const topEl = $('top');
  const stageEl = $('stage');
  const orbitEl = $('orbit');
  const coreEl = $('core');
  const cnameEl = $('cname');
  const cpowEl = $('cpow');
  const orbEl = $('orb');
  const msgEl = $('msg');
  const i1El = $('i1');
  const i2El = $('i2');
  const modeEl = $('mode');
  const pwrEl = $('pwr');
  const sideEl = $('side');
  const tabsEl = $('tabs');
  const panelEl = $('panel');
  const tabBtns = Array.prototype.slice.call(tabsEl.querySelectorAll('button'));

  const meta = {
    insight: 0,
    insightTotal: 0,
    ascensions: 0,
    perks: { head: 0, thrift: 0, auto: 0, seer: 0, mind: 0 }
  };
  let run = null;
  let mode = 1;
  let tab = 'up';
  let armed = false;
  let lastHtml = '';
  let resEls = [];
  let nodes = [];
  let insEl = null;
  let panelCount = 0;

  function rng(a) {
    return function () {
      a |= 0;
      a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function fmt(n) {
    if (!isFinite(n)) return '\u221E';
    if (n < 0) n = 0;
    if (n < 1000) return String(Math.floor(n * 10) / 10);
    const e = Math.floor(Math.log10(n) / 3);
    if (e >= SUF.length) return n.toExponential(2);
    return (n / Math.pow(1000, e)).toFixed(2) + SUF[e];
  }

  function fmtRate(r) {
    return (r >= 0 ? '+' : '-') + fmt(Math.abs(r));
  }

  function genWorld(seed) {
    const r = rng(seed);
    const tiers = [];
    for (let t = 0; t < TIERS; t++) {
      const p = POOLS[t][Math.floor(r() * POOLS[t].length)];
      tiers.push({
        res: p[0],
        bld: p[1],
        glyph: GLYPHS[t],
        base: t === 0 ? 15 : Math.round(100 * Math.pow(2.5 + r() * 0.3, t - 1)),
        growth: 1.13 + r() * 0.04,
        ratio: t === 0 ? 0 : 1.8 + r() * 0.6
      });
    }
    const kinds = KINDS.slice();
    for (let i = kinds.length - 1; i > 0; i--) {
      const j = Math.floor(r() * (i + 1));
      const x = kinds[i];
      kinds[i] = kinds[j];
      kinds[j] = x;
    }
    const recipes = kinds.map((kind, i) => {
      const target = kind === 'eff' ? 1 + Math.floor(r() * (TIERS - 1)) : Math.floor(r() * TIERS);
      const name = ADJ[Math.floor(r() * ADJ.length)] + ' ' + NOUN[Math.floor(r() * NOUN.length)];
      return { kind: kind, a: i, b: i + 1, target: target, name: name };
    });
    return { seed: seed, tiers: tiers, recipes: recipes };
  }

  function nextOrb() {
    return (40 + Math.random() * 50) * Math.max(0.3, 1 - 0.12 * meta.perks.seer);
  }

  function newRun(seed) {
    const z = () => new Array(TIERS).fill(0);
    run = {
      seed: seed,
      world: genWorld(seed),
      stock: z(),
      total: z(),
      owned: z(),
      on: new Array(TIERS).fill(true),
      eff: z(),
      rate: z(),
      revealed: [true, false, false, false, false, false],
      upOut: z(),
      upSyn: z(),
      upClick: 0,
      upReson: 0,
      fuse: [0, 0, 0, 0, 0],
      buffs: [],
      time: 0,
      clicks: 0,
      autoAcc: 0,
      orbIn: nextOrb(),
      orbLeft: 0,
      sel: 0,
      note: 'Click the core.'
    };
    run.stock[0] = 250 * meta.perks.head;
  }

  function say(text) {
    run.note = text;
  }

  function fuseLvl(kind, target) {
    let s = 0;
    run.world.recipes.forEach((rc, i) => {
      if (rc.kind === kind && (target === undefined || rc.target === target)) s += run.fuse[i];
    });
    return s;
  }

  function hasBuff(k) {
    return run.buffs.some(b => b.k === k);
  }

  function gm() {
    return (1 + 0.08 * meta.insightTotal) * (1 + 0.12 * fuseLvl('glob'));
  }

  function unit(t) {
    let m = Math.pow(2, run.upOut[t]) * (1 + 0.35 * fuseLvl('out', t)) * gm();
    if (t > 0 && run.upSyn[t]) m *= 1 + 0.02 * run.owned[t - 1];
    if (hasBuff('frenzy')) m *= 5;
    return m;
  }

  function need(t) {
    return run.world.tiers[t].ratio * Math.max(0.4, 1 - 0.08 * fuseLvl('eff', t));
  }

  function prod0() {
    return run.owned[0] * unit(0);
  }

  function clickPower() {
    let c = (Math.pow(2, run.upClick) * gm() + 0.04 * run.upReson * prod0()) * (1 + 0.5 * fuseLvl('click'));
    if (hasBuff('storm')) c *= 25;
    return c;
  }

  function growth(t) {
    return Math.max(1.05, run.world.tiers[t].growth - 0.002 * meta.perks.thrift);
  }

  function costMult(t) {
    return Math.max(0.25, 1 - 0.07 * fuseLvl('cost', t));
  }

  function resOf(t) {
    return t === 0 ? 0 : t - 1;
  }

  function firstCost(t) {
    return run.world.tiers[t].base * Math.pow(growth(t), run.owned[t]) * costMult(t);
  }

  function bulkCost(t, k) {
    const g = growth(t);
    const f = firstCost(t);
    return k === 1 ? f : f * (Math.pow(g, k) - 1) / (g - 1);
  }

  function maxBuy(t) {
    const s = run.stock[resOf(t)];
    const f = firstCost(t);
    const g = growth(t);
    if (s < f) return 0;
    let k = Math.floor(Math.log(1 + s * (g - 1) / f) / Math.log(g));
    while (k > 0 && bulkCost(t, k) > s) k--;
    return k;
  }

  function buyCount(t) {
    return mode === 'max' ? Math.max(1, maxBuy(t)) : mode;
  }

  function buy(t) {
    const k = buyCount(t);
    const c = bulkCost(t, k);
    const rs = resOf(t);
    if (run.stock[rs] < c) return false;
    run.stock[rs] -= c;
    run.owned[t] += k;
    return true;
  }

  function doClick() {
    const c = clickPower();
    run.stock[0] += c;
    run.total[0] += c;
    run.clicks++;
    return c;
  }

  function upgrades() {
    const T = run.world.tiers;
    const L = [];
    const cc = 80 * Math.pow(6, run.upClick);
    if (run.upClick < 8) {
      L.push({
        id: 'click', name: 'Reinforced Core', desc: 'Click power x2',
        cost: [0, cc], vis: run.total[0] >= cc * 0.3,
        apply: () => { run.upClick++; }
      });
    }
    const rc = 300 * Math.pow(5, run.upReson);
    if (run.upReson < 10) {
      L.push({
        id: 'reson', name: 'Resonance', desc: 'Clicks add 4% of ' + T[0].res + ' per second',
        cost: [0, rc], vis: run.owned[0] >= 5 && run.total[0] >= rc * 0.3,
        apply: () => { run.upReson++; }
      });
    }
    for (let t = 0; t < TIERS; t++) {
      const u = run.upOut[t];
      if (u < TH.length) {
        L.push({
          id: 'out' + t, name: T[t].bld + ' Tuning ' + (u + 1), desc: T[t].bld + ' output x2',
          cost: [t, 100 * Math.pow(5, u) * Math.pow(3.2, t)], vis: run.owned[t] >= TH[u],
          apply: () => { run.upOut[t]++; }
        });
      }
      if (t > 0 && !run.upSyn[t]) {
        L.push({
          id: 'syn' + t, name: 'Chain: ' + T[t].bld, desc: T[t].bld + ' output +2% per ' + T[t - 1].bld,
          cost: [t, 100 * Math.pow(3.5, t)], vis: run.owned[t] >= 1 && run.owned[t - 1] >= 10,
          apply: () => { run.upSyn[t] = 1; }
        });
      }
    }
    return L;
  }

  function fuseCost(i) {
    const rc = run.world.recipes[i];
    const m = Math.pow(2.4, run.fuse[i]);
    return [Math.round(25 * Math.pow(2.8, rc.a) * m), Math.round(12 * Math.pow(2.8, rc.b) * m)];
  }

  function recipeDesc(rc) {
    const T = run.world.tiers;
    if (rc.kind === 'out') return T[rc.target].bld + ' output +35% per level';
    if (rc.kind === 'cost') return T[rc.target].bld + ' cost -7% per level';
    if (rc.kind === 'eff') return T[rc.target].bld + ' input need -8% per level';
    if (rc.kind === 'click') return 'Click power +50% per level';
    return 'All production +12% per level';
  }

  function gainInsight() {
    return Math.floor(Math.sqrt(run.total[0] / 2e5) * (1 + 0.1 * meta.perks.mind));
  }

  function spawnOrb() {
    orbEl.style.left = (8 + Math.random() * 72) + '%';
    orbEl.style.top = (8 + Math.random() * 72) + '%';
    orbEl.hidden = false;
    run.orbLeft = 9;
  }

  function addBuff(k, label, secs) {
    run.buffs = run.buffs.filter(b => b.k !== k);
    run.buffs.push({ k: k, label: label, until: run.time + secs });
  }

  function orbReward() {
    const r = Math.random();
    if (r < 0.4) {
      addBuff('frenzy', 'Frenzy x5', 25);
      say('Frenzy: production x5 for 25s');
    } else if (r < 0.7) {
      const g = Math.max(100, prod0() * 90, clickPower() * 30);
      run.stock[0] += g;
      run.total[0] += g;
      say('Windfall: +' + fmt(g) + ' ' + run.world.tiers[0].res);
    } else {
      addBuff('storm', 'Click storm x25', 15);
      say('Click storm: click power x25 for 15s');
    }
  }

  function tick(dt) {
    const T = run.world.tiers;
    run.time += dt;
    run.buffs = run.buffs.filter(b => b.until > run.time);
    const flow = new Array(TIERS).fill(0);
    const made0 = prod0() * dt;
    run.stock[0] += made0;
    run.total[0] += made0;
    flow[0] += made0;
    for (let t = 1; t < TIERS; t++) {
      const n = run.owned[t];
      if (!n || !run.on[t]) {
        run.eff[t] = 0;
        continue;
      }
      const want = n * need(t) * dt;
      const have = run.stock[t - 1];
      const f = want > 0 ? Math.min(1, have / want) : 0;
      const used = want * f;
      const made = n * unit(t) * f * dt;
      run.stock[t - 1] = Math.max(0, have - used);
      flow[t - 1] -= used;
      run.stock[t] += made;
      run.total[t] += made;
      flow[t] += made;
      run.eff[t] = f;
    }
    for (let t = 0; t < TIERS; t++) {
      run.rate[t] += (flow[t] / dt - run.rate[t]) * Math.min(1, dt * 3);
      if (t > 0 && !run.revealed[t] && run.total[t - 1] >= T[t].base * 0.5) {
        run.revealed[t] = true;
        say(T[t].bld + ' unlocked');
      }
    }
    run.autoAcc += meta.perks.auto * dt;
    while (run.autoAcc >= 1) {
      run.autoAcc -= 1;
      doClick();
    }
    if (orbEl.hidden) {
      run.orbIn -= dt;
      if (run.orbIn <= 0) spawnOrb();
    } else {
      run.orbLeft -= dt;
      if (run.orbLeft <= 0) {
        orbEl.hidden = true;
        run.orbIn = nextOrb();
      }
    }
  }

  function buildStatic() {
    const T = run.world.tiers;
    topEl.innerHTML = '';
    resEls = T.map(t => {
      const d = document.createElement('div');
      d.className = 'res';
      d.hidden = true;
      d.innerHTML = '<span></span><b></b><i></i>';
      d.children[0].textContent = t.res;
      topEl.appendChild(d);
      return { d: d, v: d.children[1], r: d.children[2] };
    });
    const id = document.createElement('div');
    id.className = 'res';
    id.hidden = true;
    id.innerHTML = '<span>Insight</span><b></b><i></i>';
    topEl.appendChild(id);
    insEl = { d: id, v: id.children[1], r: id.children[2] };

    nodes.forEach(n => n.el.remove());
    nodes = T.map((t, i) => {
      const a = -Math.PI / 2 + i * 2 * Math.PI / TIERS;
      const el = document.createElement('button');
      el.type = 'button';
      el.className = 'node';
      el.hidden = true;
      el.title = t.bld;
      el.style.left = (50 + 39 * Math.cos(a)) + '%';
      el.style.top = (50 + 39 * Math.sin(a)) + '%';
      el.innerHTML = '<span class="g"></span><span class="c"></span><span class="p"></span>';
      el.children[0].textContent = t.glyph;
      el.addEventListener('click', () => {
        run.sel = i;
        buy(i);
        updateAll();
      });
      orbitEl.appendChild(el);
      return { el: el, c: el.children[1], p: el.children[2] };
    });
    cnameEl.textContent = T[0].res;
    orbEl.hidden = true;
    lastHtml = '';
  }

  function updateTop() {
    resEls.forEach((e, t) => {
      const show = t === 0 || run.total[t] > 0 || run.stock[t] > 0;
      e.d.hidden = !show;
      if (!show) return;
      e.v.textContent = fmt(run.stock[t]);
      const net = run.rate[t];
      e.r.textContent = fmtRate(net) + '/s';
      e.r.className = net < -0.005 ? 'neg' : '';
    });
    insEl.d.hidden = meta.insightTotal < 1;
    insEl.v.textContent = fmt(meta.insight);
    insEl.r.textContent = '+' + Math.round(meta.insightTotal * 8) + '%';
  }

  function updateNodes() {
    nodes.forEach((n, t) => {
      n.el.hidden = !run.revealed[t];
      if (!run.revealed[t]) return;
      const k = buyCount(t);
      const c = bulkCost(t, k);
      n.c.textContent = run.owned[t];
      n.p.textContent = fmt(c);
      n.el.classList.toggle('can', run.stock[resOf(t)] >= c);
      n.el.classList.toggle('off', t > 0 && run.owned[t] > 0 && !run.on[t]);
      n.el.classList.toggle('starve', t > 0 && run.owned[t] > 0 && run.on[t] && run.eff[t] < 0.95);
      n.el.classList.toggle('sel', run.sel === t);
    });
  }

  function updateInfo() {
    const t = run.sel;
    const W = run.world.tiers;
    const T = W[t];
    const n = run.owned[t];
    const k = buyCount(t);
    i1El.textContent = T.bld + ' x' + n + ' | buy x' + k + ': ' + fmt(bulkCost(t, k)) + ' ' + W[resOf(t)].res;
    let s;
    if (t === 0) {
      s = 'makes ' + fmt(unit(0)) + ' ' + T.res + '/s each';
    } else {
      s = 'eats ' + fmt(need(t)) + ' ' + W[t - 1].res + '/s, makes ' + fmt(unit(t)) + ' ' + T.res + '/s each';
      if (n) s += run.on[t] ? ', running ' + Math.round(run.eff[t] * 100) + '%' : ', paused';
    }
    i2El.textContent = s;
    modeEl.textContent = mode === 'max' ? 'Max' : 'x' + mode;
    pwrEl.hidden = t === 0 || n === 0;
    pwrEl.textContent = run.on[t] ? 'Pause' : 'Run';
  }

  function updateCore() {
    cpowEl.textContent = '+' + fmt(clickPower()) + ' / click';
  }

  function updateMsg() {
    const b = run.buffs.map(x => x.label + ' ' + Math.ceil(x.until - run.time) + 's').join(' | ');
    msgEl.textContent = b || run.note;
  }

  function item(attrs, can, title, desc, cost) {
    return '<button type="button" class="item' + (can ? ' can' : '') + '" ' + attrs + '><b>' + title +
      '</b><em>' + cost + '</em><span>' + desc + '</span></button>';
  }

  function htmlUp() {
    const T = run.world.tiers;
    const list = upgrades().filter(u => u.vis);
    if (!list.length) return '<p class="empty">No upgrades available yet. Build more.</p>';
    return list.map(u => item(
      'data-a="up" data-id="' + u.id + '"',
      run.stock[u.cost[0]] >= u.cost[1],
      u.name, u.desc, fmt(u.cost[1]) + ' ' + T[u.cost[0]].res
    )).join('');
  }

  function htmlFuse() {
    const T = run.world.tiers;
    let h = '';
    run.world.recipes.forEach((rc, i) => {
      const L = run.fuse[i];
      if (!(run.total[rc.b] > 0 || L > 0)) return;
      const c = fuseCost(i);
      const can = L < MAX_FUSE && run.stock[rc.a] >= c[0] && run.stock[rc.b] >= c[1];
      const cost = L < MAX_FUSE ? fmt(c[0]) + ' ' + T[rc.a].res + ' + ' + fmt(c[1]) + ' ' + T[rc.b].res : 'Maxed';
      h += item('data-a="fuse" data-i="' + i + '"', can, rc.name + ' (Lv ' + L + ')', recipeDesc(rc), cost);
    });
    return h || '<p class="empty">Nothing to fuse yet. Produce more resources.</p>';
  }

  function htmlAsc() {
    const T = run.world.tiers;
    const g = gainInsight();
    let h = '<div class="asc"><p>Ascending resets this run and rerolls the world. Insight is kept and gives +8% production each.</p>';
    h += item(
      'data-a="asc"', g > 0,
      armed ? 'Confirm: reset run' : 'Ascend',
      g > 0 ? 'Gain ' + g + ' Insight' : 'Needs ' + fmt(2e5) + ' ' + T[0].res + ' earned in this run',
      fmt(run.total[0]) + ' ' + T[0].res + ' earned'
    );
    PERKS.forEach((p, i) => {
      const L = meta.perks[p.id];
      const c = p.base * (L + 1);
      h += item(
        'data-a="perk" data-i="' + i + '"', L < p.max && meta.insight >= c,
        p.name + ' (Lv ' + L + '/' + p.max + ')', p.desc, L < p.max ? c + ' Insight' : 'Maxed'
      );
    });
    h += '<p class="meta">Seed ' + run.seed + ' | ' + Math.floor(run.time / 60) + ' min</p></div>';
    return h;
  }

  function refreshPanel() {
    const vis = { up: run.total[0] >= 25, fuse: run.total[1] >= 30, asc: run.total[0] >= 1e5 || meta.ascensions > 0 };
    const any = vis.up || vis.fuse || vis.asc;
    sideEl.hidden = !any;
    appEl.classList.toggle('noside', !any);
    if (!any) return;
    if (!vis[tab]) tab = vis.up ? 'up' : vis.fuse ? 'fuse' : 'asc';
    if (tab !== 'asc') armed = false;
    tabBtns.forEach(b => {
      b.hidden = !vis[b.dataset.tab];
      b.classList.toggle('on', b.dataset.tab === tab);
    });
    const html = tab === 'up' ? htmlUp() : tab === 'fuse' ? htmlFuse() : htmlAsc();
    if (html !== lastHtml) {
      const st = panelEl.scrollTop;
      panelEl.innerHTML = html;
      panelEl.scrollTop = st;
      lastHtml = html;
    }
  }

  function updateAll() {
    updateTop();
    updateNodes();
    updateInfo();
    updateCore();
    updateMsg();
    panelCount++;
    if (panelCount >= 5) {
      panelCount = 0;
      refreshPanel();
    }
  }

  function pop(txt, x, y) {
    if (stageEl.querySelectorAll('.pop').length > 14) return;
    const d = document.createElement('div');
    d.className = 'pop';
    d.textContent = txt;
    d.style.left = x + 'px';
    d.style.top = y + 'px';
    d.addEventListener('animationend', () => d.remove());
    stageEl.appendChild(d);
  }

  coreEl.addEventListener('click', e => {
    const c = doClick();
    const r = stageEl.getBoundingClientRect();
    let x;
    let y;
    if (e.clientX || e.clientY) {
      x = e.clientX - r.left;
      y = e.clientY - r.top;
    } else {
      const q = coreEl.getBoundingClientRect();
      x = q.left - r.left + q.width / 2;
      y = q.top - r.top + q.height / 2;
    }
    pop('+' + fmt(c), x, y);
    updateAll();
  });

  orbEl.addEventListener('click', () => {
    orbEl.hidden = true;
    run.orbIn = nextOrb();
    orbReward();
    updateAll();
  });

  modeEl.addEventListener('click', () => {
    mode = mode === 1 ? 10 : mode === 10 ? 'max' : 1;
    updateAll();
  });

  pwrEl.addEventListener('click', () => {
    const t = run.sel;
    if (t > 0 && run.owned[t] > 0) run.on[t] = !run.on[t];
    updateAll();
  });

  tabsEl.addEventListener('click', e => {
    const b = e.target.closest('[data-tab]');
    if (!b) return;
    tab = b.dataset.tab;
    armed = false;
    lastHtml = '';
    refreshPanel();
  });

  panelEl.addEventListener('click', e => {
    const el = e.target.closest('[data-a]');
    if (!el) return;
    const a = el.dataset.a;
    if (a === 'up') {
      const u = upgrades().find(x => x.id === el.dataset.id);
      if (u && u.vis && run.stock[u.cost[0]] >= u.cost[1]) {
        run.stock[u.cost[0]] -= u.cost[1];
        u.apply();
      }
    } else if (a === 'fuse') {
      const i = Number(el.dataset.i);
      const rc = run.world.recipes[i];
      const c = fuseCost(i);
      if (run.fuse[i] < MAX_FUSE && run.stock[rc.a] >= c[0] && run.stock[rc.b] >= c[1]) {
        run.stock[rc.a] -= c[0];
        run.stock[rc.b] -= c[1];
        run.fuse[i]++;
        say(rc.name + ' reached level ' + run.fuse[i]);
      }
    } else if (a === 'perk') {
      const p = PERKS[Number(el.dataset.i)];
      const L = meta.perks[p.id];
      const c = p.base * (L + 1);
      if (L < p.max && meta.insight >= c) {
        meta.insight -= c;
        meta.perks[p.id]++;
      }
    } else if (a === 'asc') {
      const g = gainInsight();
      if (g >= 1) {
        if (!armed) {
          armed = true;
        } else {
          armed = false;
          meta.insight += g;
          meta.insightTotal += g;
          meta.ascensions++;
          newRun(Math.floor(Math.random() * 2147483646) + 1);
          buildStatic();
          say('Ascended. New world, seed ' + run.seed);
        }
      }
    }
    refreshPanel();
    updateAll();
  });

  let last = performance.now();
  setInterval(() => {
    const now = performance.now();
    let dt = Math.min(30, (now - last) / 1000);
    last = now;
    while (dt > 0) {
      const s = Math.min(0.25, dt);
      tick(s);
      dt -= s;
    }
    updateAll();
  }, 100);

  newRun(Math.floor(Math.random() * 2147483646) + 1);
  buildStatic();
  updateAll();
  refreshPanel();
})();
