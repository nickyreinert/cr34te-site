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

  const APPS = {
    notepad: { title: 'Editor', width: 270, build: buildNotepad, color: '#ffffff' },
    calc: { title: 'Rechner', width: 180, build: buildCalculator, color: '#808080' },
    paint: { title: 'Paint', width: 260, build: buildPaint, color: '#ff00ff' },
    mines: { title: 'Minesweeper', width: 200, build: buildMinesweeper, color: '#00aa00' }
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
  Object.keys(APPS).forEach((id) => {
    sub.appendChild(menuItem(APPS[id].title, APPS[id].color, () => launch(id)));
  });
  programs.append(el('span', 'sm-arrow', '>'), sub);
  programs.addEventListener('click', () => programs.classList.add('open'));

  list.append(
    programs,
    menuItem('Dokumente', '#ffcc00', () => openFolder('Hausaufgaben')),
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
