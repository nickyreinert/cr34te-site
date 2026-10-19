// Start menu and mini programs for the Windows 95 desktop
(function () {
  'use strict';

  const desktop = document.getElementById('desktop');
  const tasks = document.querySelector('.taskbar-tasks');
  const startBtn = document.getElementById('start-button');
  const TASKBAR_HEIGHT = 30;
  const BASE_Z = 20;

  // Open windows in z-order, the last entry is on top
  const stack = [];

  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  // The active window is inferred from the stack: topmost window that is not minimized
  function topVisible() {
    for (let i = stack.length - 1; i >= 0; i--) {
      if (!stack[i].win.hidden) return stack[i];
    }
    return null;
  }

  function refresh() {
    const top = topVisible();
    stack.forEach((entry, i) => {
      entry.win.style.zIndex = BASE_Z + i;
      entry.task.classList.toggle('inactive', entry !== top);
    });
  }

  function raise(entry) {
    stack.splice(stack.indexOf(entry), 1);
    stack.push(entry);
    entry.win.hidden = false;
    refresh();
  }

  function closeWindow(entry) {
    stack.splice(stack.indexOf(entry), 1);
    entry.win.remove();
    entry.task.remove();
    refresh();
  }

  // Keep a window fully inside the desktop area above the taskbar
  function place(win, left, top) {
    const maxLeft = desktop.clientWidth - win.offsetWidth;
    const maxTop = desktop.clientHeight - TASKBAR_HEIGHT - win.offsetHeight;
    win.style.left = Math.max(0, Math.min(left, maxLeft)) + 'px';
    win.style.top = Math.max(0, Math.min(top, maxTop)) + 'px';
  }

  function createWindow(id, title, body, width) {
    const win = el('div', 'win-dialog app-window');
    win.style.width = width + 'px';

    const bar = el('div', 'dialog-titlebar');
    const controls = el('div', 'titlebar-controls');
    const minBtn = el('button', 'win-btn', '_');
    const closeBtn = el('button', 'win-btn', 'X');
    controls.append(minBtn, closeBtn);
    bar.append(el('span', '', title), controls);
    win.append(bar, body);

    const task = el('div', 'task-btn app-task');
    task.append(el('span', 'mini-app-icon'), el('span', '', title));

    const entry = { id, win, task };

    desktop.appendChild(win);
    tasks.appendChild(task);
    const offset = 30 + stack.length * 24;
    place(win, offset, offset);
    stack.push(entry);
    refresh();

    win.addEventListener('pointerdown', () => raise(entry));

    bar.addEventListener('pointerdown', (e) => {
      if (e.target.closest('.win-btn')) return;
      const dx = e.clientX - win.offsetLeft;
      const dy = e.clientY - win.offsetTop;
      bar.setPointerCapture(e.pointerId);
      const move = (ev) => place(win, ev.clientX - dx, ev.clientY - dy);
      bar.addEventListener('pointermove', move);
      bar.addEventListener('lostpointercapture', () => bar.removeEventListener('pointermove', move), { once: true });
    });

    minBtn.addEventListener('click', () => {
      win.hidden = true;
      refresh();
    });
    closeBtn.addEventListener('click', () => closeWindow(entry));

    task.addEventListener('click', () => {
      if (entry === topVisible()) {
        win.hidden = true;
        refresh();
      } else {
        raise(entry);
      }
    });

    return entry;
  }

  // Editor
  function buildNotepad() {
    const body = el('div', 'app-body');
    const text = el('textarea', 'np-text');
    text.spellcheck = false;
    body.appendChild(text);
    return body;
  }

  // Calculator
  const CALC_OPS = {
    '÷': (a, b) => a / b,
    '×': (a, b) => a * b,
    '−': (a, b) => a - b,
    '+': (a, b) => a + b
  };

  const CALC_KEYS = [
    ['C', 'clear'], ['<-', 'back'], ['±', 'sign'], ['÷', 'op'],
    ['7', 'digit'], ['8', 'digit'], ['9', 'digit'], ['×', 'op'],
    ['4', 'digit'], ['5', 'digit'], ['6', 'digit'], ['−', 'op'],
    ['1', 'digit'], ['2', 'digit'], ['3', 'digit'], ['+', 'op'],
    ['0', 'digit', 'calc-wide'], ['.', 'dot'], ['=', 'equals']
  ];

  function buildCalculator() {
    const body = el('div', 'app-body');
    const display = el('div', 'calc-display', '0');
    const grid = el('div', 'calc-grid');
    body.append(display, grid);

    let acc = null;
    let pending = null;
    let cur = '0';
    let fresh = true;

    const valid = () => !Number.isNaN(parseFloat(cur));

    // Applies the pending operator to acc and the current entry, false on error
    function compute() {
      const res = CALC_OPS[pending](acc, parseFloat(cur));
      if (!Number.isFinite(res)) {
        cur = 'Fehler';
        acc = null;
        pending = null;
        return false;
      }
      cur = String(parseFloat(res.toPrecision(12)));
      return true;
    }

    const actions = {
      digit(d) {
        if (fresh) {
          cur = d;
          fresh = false;
        } else if (cur.length < 14) {
          cur = cur === '0' ? d : cur + d;
        }
      },
      dot() {
        if (fresh) {
          cur = '0.';
          fresh = false;
        } else if (!cur.includes('.')) {
          cur += '.';
        }
      },
      op(o) {
        if (!valid()) return;
        if (pending && !fresh && !compute()) return;
        acc = parseFloat(cur);
        pending = o;
        fresh = true;
      },
      equals() {
        if (!pending || !valid()) return;
        compute();
        acc = null;
        pending = null;
        fresh = true;
      },
      clear() {
        acc = null;
        pending = null;
        cur = '0';
        fresh = true;
      },
      back() {
        if (fresh) return;
        cur = cur.slice(0, -1);
        if (cur === '' || cur === '-') cur = '0';
      },
      sign() {
        if (!valid() || cur === '0') return;
        cur = cur.startsWith('-') ? cur.slice(1) : '-' + cur;
      }
    };

    CALC_KEYS.forEach(([label, action, cls]) => {
      const btn = el('button', 'app-btn' + (cls ? ' ' + cls : ''), label);
      btn.addEventListener('click', () => {
        actions[action](label);
        display.textContent = cur;
      });
      grid.appendChild(btn);
    });

    return body;
  }

  // Paint
  const PAINT_COLORS = ['#000000', '#808080', '#ff0000', '#ffff00', '#00ff00', '#0000ff', '#ff00ff', '#ffffff'];
  const ERASER = '#ffffff'; // white doubles as the eraser and draws wider

  function buildPaint() {
    const body = el('div', 'app-body');
    const bar = el('div', 'paint-bar');
    const canvas = el('canvas', 'paint-canvas');
    canvas.width = 240;
    canvas.height = 150;
    body.append(bar, canvas);

    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = PAINT_COLORS[0];
    ctx.lineWidth = 2;

    PAINT_COLORS.forEach((color, i) => {
      const sw = el('button', 'paint-sw' + (i === 0 ? ' sel' : ''));
      sw.style.background = color;
      sw.addEventListener('click', () => {
        bar.querySelectorAll('.paint-sw').forEach((s) => s.classList.toggle('sel', s === sw));
        ctx.strokeStyle = color;
        ctx.lineWidth = color === ERASER ? 10 : 2;
      });
      bar.appendChild(sw);
    });

    const clearBtn = el('button', 'app-btn', 'Löschen');
    clearBtn.addEventListener('click', () => ctx.fillRect(0, 0, canvas.width, canvas.height));
    bar.appendChild(clearBtn);

    const pos = (e) => {
      const r = canvas.getBoundingClientRect();
      return [(e.clientX - r.left) * canvas.width / r.width, (e.clientY - r.top) * canvas.height / r.height];
    };

    canvas.addEventListener('pointerdown', (e) => {
      canvas.setPointerCapture(e.pointerId);
      const [x, y] = pos(e);
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x, y);
      ctx.stroke();
      const move = (ev) => {
        const [mx, my] = pos(ev);
        ctx.lineTo(mx, my);
        ctx.stroke();
      };
      canvas.addEventListener('pointermove', move);
      canvas.addEventListener('lostpointercapture', () => canvas.removeEventListener('pointermove', move), { once: true });
    });

    return body;
  }

  // Minesweeper
  const MS_SIZE = 9;
  const MS_MINES = 10;
  const MS_COLORS = ['', '#0000ff', '#008000', '#ff0000', '#000080', '#800000', '#008080', '#000000', '#808080'];

  function buildMinesweeper() {
    const body = el('div', 'app-body');
    const head = el('div', 'ms-head');
    const status = el('div', 'ms-status');
    const flagBtn = el('button', 'app-btn', 'Flagge');
    const newBtn = el('button', 'app-btn', 'Neu');
    const grid = el('div', 'ms-grid');
    head.append(status, flagBtn, newBtn);
    body.append(head, grid);

    let cells = [];

    // Game state is inferred from the cells instead of being stored
    const lost = () => cells.some((c) => c.mine && c.open);
    const won = () => !lost() && cells.every((c) => c.mine || c.open);
    const started = () => cells.some((c) => c.mine);

    function neighbors(i) {
      const x = i % MS_SIZE;
      const y = Math.floor(i / MS_SIZE);
      const out = [];
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const nx = x + dx;
          const ny = y + dy;
          if ((dx || dy) && nx >= 0 && ny >= 0 && nx < MS_SIZE && ny < MS_SIZE) out.push(ny * MS_SIZE + nx);
        }
      }
      return out;
    }

    // Mines are placed on the first reveal, keeping that cell and its neighbours clear
    function placeMines(safe) {
      const around = neighbors(safe);
      const free = cells.map((_, i) => i).filter((i) => i !== safe && !around.includes(i));
      for (let m = 0; m < MS_MINES; m++) {
        const pick = Math.floor(Math.random() * free.length);
        cells[free.splice(pick, 1)[0]].mine = true;
      }
      cells.forEach((c, i) => {
        c.count = neighbors(i).filter((n) => cells[n].mine).length;
      });
    }

    function reveal(i) {
      if (lost() || won() || cells[i].flag || cells[i].open) return;
      if (!started()) placeMines(i);
      if (cells[i].mine) {
        cells.forEach((c) => {
          if (c.mine) c.open = true;
        });
        return;
      }
      const todo = [i];
      while (todo.length) {
        const j = todo.pop();
        const c = cells[j];
        if (c.open || c.flag) continue;
        c.open = true;
        if (c.count === 0) todo.push(...neighbors(j));
      }
    }

    function toggleFlag(i) {
      if (lost() || won() || cells[i].open) return;
      cells[i].flag = !cells[i].flag;
    }

    function render() {
      grid.textContent = '';
      cells.forEach((c, i) => {
        const btn = el('button', 'ms-cell' + (c.open ? ' open' : ''));
        if (c.open) {
          if (c.mine) {
            btn.textContent = '*';
          } else if (c.count) {
            btn.textContent = c.count;
            btn.style.color = MS_COLORS[c.count];
          }
        } else if (c.flag) {
          btn.textContent = 'F';
        }
        btn.addEventListener('click', () => {
          if (flagBtn.classList.contains('active')) {
            toggleFlag(i);
          } else {
            reveal(i);
          }
          render();
        });
        btn.addEventListener('contextmenu', (e) => {
          e.preventDefault();
          toggleFlag(i);
          render();
        });
        grid.appendChild(btn);
      });
      if (lost()) {
        status.textContent = 'Verloren';
      } else if (won()) {
        status.textContent = 'Gewonnen';
      } else {
        status.textContent = 'Minen: ' + (MS_MINES - cells.filter((c) => c.flag).length);
      }
    }

    function reset() {
      cells = Array.from({ length: MS_SIZE * MS_SIZE }, () => ({ mine: false, open: false, flag: false, count: 0 }));
      render();
    }

    flagBtn.addEventListener('click', () => flagBtn.classList.toggle('active'));
    newBtn.addEventListener('click', reset);
    reset();

    return body;
  }

  // Meta Versa: procedural world raymarched in a WebGPU fragment shader
  const MV_SHADER = `
struct U { pos: vec3f, time: f32, yaw: f32, pitch: f32, res: vec2f };
@group(0) @binding(0) var<uniform> u: U;

const CELL = 14.0;

fn hash2(p: vec2f) -> f32 {
  return fract(sin(dot(p, vec2f(127.1, 311.7))) * 43758.5453);
}

fn ground(x: f32, z: f32) -> f32 {
  return 1.6 * sin(x * 0.11) * cos(z * 0.09) + 0.8 * sin(x * 0.31 + z * 0.27);
}

fn avPos(k: i32) -> vec3f {
  let fk = f32(k);
  let a = u.time * (0.25 + 0.1 * fk) + fk * 1.7;
  let x = -12.0 + 9.0 * fk + 4.0 * cos(a);
  let z = -16.0 - 12.0 * fract(fk * 0.37) + 4.0 * sin(a);
  return vec3f(x, ground(x, z) + 1.3 + 0.15 * sin(u.time * 2.0 + fk), z);
}

fn un(a: vec2f, b: vec2f) -> vec2f {
  if (b.x < a.x) { return b; }
  return a;
}

fn boxes(p: vec3f) -> vec2f {
  let c = floor(p.xz / CELL);
  let h = hash2(c);
  let h2 = hash2(c + 17.0);
  let center = (c + 0.5) * CELL + (vec2f(h, h2) - 0.5) * 4.0;
  let hgt = 6.0 + 9.0 * hash2(c + 41.0);
  let hw = 1.5 + 1.5 * h2;
  let q = vec3f(p.x - center.x, p.y - (hgt * 0.5 - 4.0), p.z - center.y);
  let b = abs(q) - vec3f(hw, hgt * 0.5, hw);
  var d = length(max(b, vec3f(0.0))) + min(max(b.x, max(b.y, b.z)), 0.0);
  if (h < 0.35) { d = 1000.0; }
  return vec2f(d, 1.0);
}

// Legless torso, floating hands and a round head, material 10+k body and 20+k head
fn avatar(p: vec3f, k: i32) -> vec2f {
  let q = p - avPos(k);
  let head = length(q - vec3f(0.0, 1.0, 0.0)) - 0.32;
  var t = q - vec3f(0.0, 0.1, 0.0);
  t.y = t.y - clamp(t.y, -0.3, 0.3);
  let torso = length(t) - 0.38;
  let hands = min(length(q - vec3f(0.75, 0.3, 0.2)), length(q - vec3f(-0.75, 0.3, 0.2))) - 0.14;
  let low = min(torso, hands);
  if (head < low) { return vec2f(head, 20.0 + f32(k)); }
  return vec2f(low, 10.0 + f32(k));
}

fn map(p: vec3f) -> vec2f {
  var r = vec2f((p.y - ground(p.x, p.z)) * 0.7, 0.0);
  r = un(r, boxes(p));
  for (var k = 0; k < 4; k++) {
    r = un(r, avatar(p, k));
  }
  return r;
}

fn skyCol(rd: vec3f) -> vec3f {
  let g = clamp(rd.y * 1.5 + 0.3, 0.0, 1.0);
  return floor(mix(vec3f(1.0, 0.45, 0.9), vec3f(0.2, 0.9, 1.0), g) * 6.0) / 6.0;
}

@vertex
fn vs(@builtin(vertex_index) i: u32) -> @builtin(position) vec4f {
  var p = array<vec2f, 3>(vec2f(-1.0, -1.0), vec2f(3.0, -1.0), vec2f(-1.0, 3.0));
  return vec4f(p[i], 0.0, 1.0);
}

@fragment
fn fs(@builtin(position) frag: vec4f) -> @location(0) vec4f {
  let uv = vec2f(frag.x - 0.5 * u.res.x, 0.5 * u.res.y - frag.y) / u.res.y;
  let fwd = vec3f(sin(u.yaw) * cos(u.pitch), sin(u.pitch), -cos(u.yaw) * cos(u.pitch));
  let right = vec3f(cos(u.yaw), 0.0, sin(u.yaw));
  let up = cross(right, fwd);
  let rd = normalize(right * uv.x + up * uv.y + fwd * 0.9);

  var t = 0.0;
  var m = -1.0;
  for (var i = 0; i < 90; i++) {
    let r = map(u.pos + rd * t);
    if (r.x < 0.01 * (1.0 + t * 0.05)) {
      m = r.y;
      break;
    }
    t += clamp(r.x * 0.8, 0.02, 1.9);
    if (t > 160.0) { break; }
  }

  let sky = skyCol(rd);
  if (m < 0.0) { return vec4f(sky, 1.0); }

  let p = u.pos + rd * t;
  let d0 = map(p).x;
  let e = vec2f(0.05, 0.0);
  let n = normalize(vec3f(map(p + e.xyy).x - d0, map(p + e.yxy).x - d0, map(p + e.yyx).x - d0));

  var col = vec3f(0.5);
  if (m < 0.5) {
    let g = floor(p.x * 0.5) + floor(p.z * 0.5);
    col = mix(vec3f(0.1, 0.9, 0.2), vec3f(0.9, 0.2, 0.9), step(0.25, fract(g * 0.5)));
  } else if (m < 5.0) {
    let c = floor(p.xz / CELL);
    col = vec3f(hash2(c + 3.0), hash2(c + 5.0), hash2(c + 9.0));
    col = col * (0.6 + 0.4 * step(0.5, fract(p.y * 0.8)));
  } else if (m < 15.0) {
    let k = m - 10.0;
    col = vec3f(hash2(vec2f(k, 1.0)), hash2(vec2f(k, 2.0)), hash2(vec2f(k, 3.0))) * 0.5 + 0.5;
  } else {
    col = vec3f(1.0, 0.8, 0.6);
  }

  let diff = max(dot(n, normalize(vec3f(0.5, 0.8, 0.3))), 0.0);
  col = col * (0.35 + 0.65 * diff);
  col = mix(col, sky, 1.0 - exp(-t * 0.012));
  return vec4f(floor(col * 5.0) / 5.0, 1.0);
}
`;

  // Same formula as ground() in the shader, keeps the camera above the terrain
  function mvGround(x, z) {
    return 1.6 * Math.sin(x * 0.11) * Math.cos(z * 0.09) + 0.8 * Math.sin(x * 0.31 + z * 0.27);
  }

  const MV_KEYS = {
    w: 'fwd', arrowup: 'fwd', s: 'back', arrowdown: 'back',
    a: 'sl', d: 'sr', arrowleft: 'tl', arrowright: 'tr'
  };

  function buildMetaVersa() {
    const body = el('div', 'app-body');
    body.tabIndex = 0;
    body.style.outline = 'none';

    const title = el('div', '', 'Meta Versa  -  Horizon Welt 1  -  4 Avatare online');
    Object.assign(title.style, { background: '#0866ff', color: '#fff', fontWeight: 'bold', padding: '3px 6px', marginBottom: '4px' });

    const canvas = el('canvas');
    canvas.width = 320;
    canvas.height = 200;
    Object.assign(canvas.style, {
      display: 'block',
      width: '100%',
      height: 'max(120px, min(325px, calc(100dvh - 150px)))',
      imageRendering: 'pixelated',
      touchAction: 'none',
      cursor: 'grab',
      background: '#000'
    });

    const pad = el('div');
    Object.assign(pad.style, { display: 'flex', alignItems: 'center', gap: '3px', marginTop: '4px' });
    const status = el('span', '', 'Klicken, dann WASD / Pfeiltasten. Ziehen = umsehen.');
    status.style.marginLeft = '4px';

    // Movement state is a set of held actions, so no key press is dropped between frames
    const keys = new Set();

    [['<', 'tl'], ['^', 'fwd'], ['v', 'back'], ['>', 'tr']].forEach(([label, action]) => {
      const btn = el('button', 'app-btn', label);
      btn.style.width = '28px';
      btn.style.padding = '0';
      btn.addEventListener('pointerdown', (e) => {
        btn.setPointerCapture(e.pointerId);
        keys.add(action);
      });
      ['pointerup', 'pointercancel', 'lostpointercapture'].forEach((type) => {
        btn.addEventListener(type, () => keys.delete(action));
      });
      pad.appendChild(btn);
    });
    pad.appendChild(status);
    body.append(title, canvas, pad);

    body.addEventListener('keydown', (e) => {
      const action = MV_KEYS[e.key.toLowerCase()];
      if (!action) return;
      keys.add(action);
      e.preventDefault();
    });
    body.addEventListener('keyup', (e) => {
      const action = MV_KEYS[e.key.toLowerCase()];
      if (action) keys.delete(action);
    });
    body.addEventListener('focusout', (e) => {
      if (!body.contains(e.relatedTarget)) keys.clear();
    });

    let yaw = 0;
    let pitch = -0.1;
    const pos = [0, mvGround(0, 10) + 3, 10];

    canvas.addEventListener('pointerdown', (e) => {
      body.focus();
      canvas.setPointerCapture(e.pointerId);
      let lx = e.clientX;
      let ly = e.clientY;
      const move = (ev) => {
        yaw += (ev.clientX - lx) * 0.006;
        pitch = Math.max(-1.4, Math.min(1.4, pitch - (ev.clientY - ly) * 0.006));
        lx = ev.clientX;
        ly = ev.clientY;
      };
      canvas.addEventListener('pointermove', move);
      canvas.addEventListener('lostpointercapture', () => canvas.removeEventListener('pointermove', move), { once: true });
    });

    async function run() {
      if (!navigator.gpu) throw new Error('WebGPU wird von diesem Browser nicht unterstützt.');
      const adapter = await navigator.gpu.requestAdapter();
      if (!adapter) throw new Error('Kein WebGPU-Adapter gefunden.');
      const device = await adapter.requestDevice();
      device.addEventListener('uncapturederror', (e) => {
        status.textContent = 'GPU-Fehler: ' + e.error.message;
      });

      const gpuCtx = canvas.getContext('webgpu');
      const format = navigator.gpu.getPreferredCanvasFormat();
      gpuCtx.configure({ device, format, alphaMode: 'opaque' });

      const shader = device.createShaderModule({ code: MV_SHADER });
      const pipeline = device.createRenderPipeline({
        layout: 'auto',
        vertex: { module: shader, entryPoint: 'vs' },
        fragment: { module: shader, entryPoint: 'fs', targets: [{ format }] },
        primitive: { topology: 'triangle-list' }
      });
      const ubo = device.createBuffer({ size: 32, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
      const bind = device.createBindGroup({
        layout: pipeline.getBindGroupLayout(0),
        entries: [{ binding: 0, resource: { buffer: ubo } }]
      });

      const uniforms = new Float32Array(8);
      let last = performance.now();

      function frame(now) {
        // Closing the window ends the loop and frees the GPU device
        if (!body.isConnected) {
          device.destroy();
          return;
        }
        requestAnimationFrame(frame);
        const dt = Math.min((now - last) / 1000, 0.1);
        last = now;
        if (!body.offsetParent) return;

        const turn = (keys.has('tr') ? 1 : 0) - (keys.has('tl') ? 1 : 0);
        const fwd = (keys.has('fwd') ? 1 : 0) - (keys.has('back') ? 1 : 0);
        const side = (keys.has('sr') ? 1 : 0) - (keys.has('sl') ? 1 : 0);
        const step = 9 * dt;
        yaw += turn * 1.6 * dt;
        pos[0] += (Math.sin(yaw) * Math.cos(pitch) * fwd + Math.cos(yaw) * side) * step;
        pos[1] += Math.sin(pitch) * fwd * step;
        pos[2] += (-Math.cos(yaw) * Math.cos(pitch) * fwd + Math.sin(yaw) * side) * step;
        pos[1] = Math.max(pos[1], mvGround(pos[0], pos[2]) + 0.8);

        uniforms.set([pos[0], pos[1], pos[2], now / 1000, yaw, pitch, canvas.width, canvas.height]);
        device.queue.writeBuffer(ubo, 0, uniforms);

        const enc = device.createCommandEncoder();
        const pass = enc.beginRenderPass({
          colorAttachments: [{
            view: gpuCtx.getCurrentTexture().createView(),
            clearValue: { r: 0, g: 0, b: 0, a: 1 },
            loadOp: 'clear',
            storeOp: 'store'
          }]
        });
        pass.setPipeline(pipeline);
        pass.setBindGroup(0, bind);
        pass.draw(3);
        pass.end();
        device.queue.submit([enc.finish()]);
      }

      requestAnimationFrame(frame);
    }

    run().catch((err) => {
      status.textContent = err.message;
    });

    return body;
  }

  const APPS = {
    notepad: { title: 'Editor', width: 270, build: buildNotepad, color: '#ffffff' },
    calc: { title: 'Rechner', width: 180, build: buildCalculator, color: '#808080' },
    paint: { title: 'Paint', width: 260, build: buildPaint, color: '#ff00ff' },
    mines: { title: 'Minesweeper', width: 200, build: buildMinesweeper, color: '#00aa00' },
    meta: { title: 'Meta Versa', width: 520, build: buildMetaVersa, color: '#0866ff', top: true }
  };

  function launch(id) {
    const existing = stack.find((e) => e.id === id);
    if (existing) {
      raise(existing);
      return;
    }
    const app = APPS[id];
    createWindow(id, app.title, app.build(), app.width);
  }

  // Shutdown
  function powerOff() {
    stopPlayback();
    document.getElementById('win-folder-modal').style.display = 'none';
    document.getElementById('win-error-modal').style.display = 'none';

    const screen = el('div');
    screen.id = 'shutdown-screen';
    screen.textContent = 'Sie können den Computer jetzt ausschalten.\n\nKlicken Sie, um Windows neu zu starten.';
    screen.addEventListener('click', () => {
      screen.remove();
      [...stack].forEach(closeWindow);
      startPlayback(0);
    }, { once: true });
    desktop.appendChild(screen);
  }

  function shutdown() {
    if (desktop.querySelector('.sd-dialog')) return;
    const dlg = el('div', 'win-dialog sd-dialog');
    const body = el('div', 'dialog-body');
    body.append(el('div', 'error-icon', '?'), el('div', 'error-msg', 'Möchten Sie Windows wirklich beenden?'));
    const foot = el('div', 'dialog-footer');
    const yes = el('button', 'dialog-btn', 'Ja');
    const no = el('button', 'dialog-btn', 'Nein');
    foot.append(yes, no);
    dlg.append(el('div', 'dialog-titlebar', 'Windows beenden'), body, foot);
    desktop.appendChild(dlg);
    no.addEventListener('click', () => dlg.remove());
    yes.addEventListener('click', () => {
      dlg.remove();
      powerOff();
    });
  }

  // Start menu
  const menu = el('div');
  menu.id = 'start-menu';
  menu.hidden = true;
  const list = el('div', 'sm-list');
  menu.append(el('div', 'sm-banner', 'Windows 95'), list);

  function closeMenu() {
    menu.hidden = true;
    startBtn.classList.remove('pressed');
    menu.querySelectorAll('.sm-item.open').forEach((item) => item.classList.remove('open'));
  }

  function menuItem(label, color, onClick) {
    const item = el('div', 'sm-item');
    const icon = el('span', 'sm-icon');
    icon.style.background = color;
    item.append(icon, el('span', '', label));
    if (onClick) {
      item.addEventListener('click', (e) => {
        e.stopPropagation();
        closeMenu();
        onClick();
      });
    }
    return item;
  }

  const programs = menuItem('Programme', '#ffcc00');
  const sub = el('div', 'sm-sub');
  Object.keys(APPS).filter((id) => !APPS[id].top).forEach((id) => {
    sub.appendChild(menuItem(APPS[id].title, APPS[id].color, () => launch(id)));
  });
  programs.append(el('span', 'sm-arrow', '>'), sub);
  programs.addEventListener('click', () => programs.classList.add('open'));

  list.append(
    programs,
    menuItem('Dokumente', '#ffcc00', () => openFolder('Hausaufgaben')),
    menuItem('Meta Versa', APPS.meta.color, () => launch('meta')),
    el('div', 'sm-sep'),
    menuItem('Herunterfahren...', '#c00000', shutdown)
  );

  startBtn.addEventListener('click', () => {
    if (menu.hidden) {
      menu.hidden = false;
      startBtn.classList.add('pressed');
    } else {
      closeMenu();
    }
  });

  document.addEventListener('pointerdown', (e) => {
    if (!menu.hidden && !menu.contains(e.target) && !startBtn.contains(e.target)) closeMenu();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeMenu();
  });

  desktop.appendChild(menu);
})();
