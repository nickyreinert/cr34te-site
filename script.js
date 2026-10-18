(function () {
  const $ = (id) => document.getElementById(id);
  const stage = $('stage');
  const canvas = $('board');
  const ctx = canvas.getContext('2d');

  let cols = 0;
  let rows = 0;
  let cells = new Uint16Array(0); // 0 = dead, n > 0 = alive with age n
  let generation = 0;
  let born = 0;
  let died = 0;
  let peak = 0;
  let raf = 0; // nonzero = running
  let last = 0;
  let acc = 0;

  const birthSet = () => parseSet($('birth').value);
  const surviveSet = () => parseSet($('survive').value);

  function parseSet(text) {
    return new Set(text.split(/[\s,]+/).filter(Boolean).map(Number).filter(Number.isInteger));
  }

  function countAlive() {
    let n = 0;
    for (let i = 0; i < cells.length; i++) if (cells[i]) n++;
    return n;
  }

  function resize() {
    const size = +$('cell').value;
    const w = stage.clientWidth;
    const h = stage.clientHeight;
    if (!w || !h) return;
    canvas.width = w;
    canvas.height = h;
    const nc = Math.max(1, Math.floor(w / size));
    const nr = Math.max(1, Math.floor(h / size));
    const next = new Uint16Array(nc * nr);
    // keep the overlapping area of the old grid
    for (let y = 0; y < Math.min(rows, nr); y++) {
      for (let x = 0; x < Math.min(cols, nc); x++) next[y * nc + x] = cells[y * cols + x];
    }
    cols = nc;
    rows = nr;
    cells = next;
    draw();
  }

  function step() {
    const r = +$('radius').value;
    const maxAge = +$('maxAge').value;
    const mut = +$('mut').value / 100;
    const wrap = $('wrap').checked;
    const birth = birthSet();
    const survive = surviveSet();
    const next = new Uint16Array(cells.length);
    let b = 0;
    let d = 0;
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        let n = 0;
        for (let dy = -r; dy <= r; dy++) {
          let yy = y + dy;
          if (wrap) yy = (yy + rows) % rows;
          else if (yy < 0 || yy >= rows) continue;
          for (let dx = -r; dx <= r; dx++) {
            if (!dx && !dy) continue;
            let xx = x + dx;
            if (wrap) xx = (xx + cols) % cols;
            else if (xx < 0 || xx >= cols) continue;
            if (cells[yy * cols + xx]) n++;
          }
        }
        const i = y * cols + x;
        const age = cells[i];
        let live = age ? survive.has(n) : birth.has(n);
        if (live && age && maxAge && age >= maxAge) live = false;
        if (mut && Math.random() < mut) live = !live;
        if (live) {
          next[i] = age ? age + 1 : 1;
          if (!age) b++;
        } else if (age) {
          d++;
        }
      }
    }
    cells = next;
    generation++;
    born = b;
    died = d;
  }

  function draw() {
    const size = +$('cell').value;
    const byAge = $('ageColor').checked;
    const gap = size >= 6 ? 1 : 0;
    ctx.fillStyle = '#10131a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    let alive = 0;
    let sum = 0;
    let oldest = 0;
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const age = cells[y * cols + x];
        if (!age) continue;
        alive++;
        sum += age;
        if (age > oldest) oldest = age;
        ctx.fillStyle = byAge ? 'hsl(' + (200 - Math.min(age, 40) * 4) + ',80%,55%)' : '#6ec1ff';
        ctx.fillRect(x * size, y * size, size - gap, size - gap);
      }
    }
    if (alive > peak) peak = alive;
    $('sGen').textContent = generation;
    $('sAlive').textContent = alive;
    $('sFlow').textContent = born + ' / ' + died;
    $('sPeak').textContent = peak;
    $('sAge').textContent = (alive ? (sum / alive).toFixed(1) : 0) + ' / ' + oldest;
  }

  function resetStats() {
    generation = 0;
    born = 0;
    died = 0;
    peak = 0;
  }

  function randomize() {
    for (let i = 0; i < cells.length; i++) cells[i] = Math.random() < 0.25 ? 1 : 0;
    resetStats();
    draw();
  }

  function clearBoard() {
    cells.fill(0);
    resetStats();
    draw();
  }

  function frame(t) {
    raf = requestAnimationFrame(frame);
    acc += t - last;
    last = t;
    const interval = 1000 / +$('speed').value;
    let n = 0;
    while (acc >= interval && n < 5) {
      step();
      acc -= interval;
      n++;
    }
    if (n === 5) acc = 0;
    if (n) draw();
  }

  function toggle() {
    if (raf) {
      cancelAnimationFrame(raf);
      raf = 0;
    } else {
      last = performance.now();
      acc = 0;
      raf = requestAnimationFrame(frame);
    }
    $('toggle').textContent = raf ? 'Pause' : 'Play';
  }

  // pointer drawing: the first touched cell decides draw or erase
  let paintValue = null;
  function paint(e) {
    const rect = canvas.getBoundingClientRect();
    const size = +$('cell').value;
    const x = Math.floor((e.clientX - rect.left) / size);
    const y = Math.floor((e.clientY - rect.top) / size);
    if (x < 0 || y < 0 || x >= cols || y >= rows) return;
    const i = y * cols + x;
    if (paintValue === null) paintValue = cells[i] ? 0 : 1;
    cells[i] = paintValue;
    draw();
  }
  canvas.addEventListener('pointerdown', (e) => {
    canvas.setPointerCapture(e.pointerId);
    paintValue = null;
    paint(e);
  });
  canvas.addEventListener('pointermove', (e) => {
    if (paintValue !== null) paint(e);
  });
  const endPaint = () => { paintValue = null; };
  canvas.addEventListener('pointerup', endPaint);
  canvas.addEventListener('pointercancel', endPaint);

  document.addEventListener('keydown', (e) => {
    const tag = e.target.tagName;
    if (e.code === 'Space' && tag !== 'INPUT' && tag !== 'BUTTON') {
      e.preventDefault();
      toggle();
    }
  });

  const bindOut = (id, out, fmt) => {
    const el = $(id);
    const update = () => { $(out).textContent = fmt(el.value); };
    el.addEventListener('input', update);
    update();
  };
  bindOut('speed', 'speedOut', (v) => v + '/s');
  bindOut('radius', 'radiusOut', (v) => v);
  bindOut('maxAge', 'maxAgeOut', (v) => (+v ? v : 'off'));
  bindOut('mut', 'mutOut', (v) => (+v).toFixed(2));
  bindOut('cell', 'cellOut', (v) => v + 'px');

  $('cell').addEventListener('input', resize);
  $('ageColor').addEventListener('change', draw);
  $('toggle').addEventListener('click', toggle);
  $('step').addEventListener('click', () => {
    step();
    draw();
  });
  $('random').addEventListener('click', randomize);
  $('clear').addEventListener('click', clearBoard);

  new ResizeObserver(resize).observe(stage);
  resize();
  randomize();
})();
