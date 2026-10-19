(function () {
  var desktop = document.getElementById('desktop');
  if (!desktop) return;

  // ---------- procedural file system ----------
  function rng(str) {
    var h = 1779033703 ^ str.length, i;
    for (i = 0; i < str.length; i++) {
      h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
      h = (h << 13) | (h >>> 19);
    }
    var a = h >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function pick(arr, n, r) {
    var pool = arr.slice(), out = [];
    while (n-- > 0 && pool.length) out.push(pool.splice(Math.floor(r() * pool.length), 1)[0]);
    return out;
  }
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function ext(n) { var i = n.lastIndexOf('.'); return i < 0 ? '' : n.slice(i + 1).toUpperCase(); }

  var TYPES = {
    EXE: ['Anwendung', 'exe'], COM: ['MS-DOS-Anwendung', 'bat'], BAT: ['MS-DOS-Batchdatei', 'bat'],
    TXT: ['Textdokument', 'txt'], LOG: ['Textdokument', 'txt'], DOC: ['WordPad-Dokument', 'doc'],
    INI: ['Konfigurationseinstellungen', 'ini'], INF: ['Setup-Informationen', 'ini'],
    DLL: ['Anwendungserweiterung', 'dll'], SYS: ['Systemdatei', 'dll'], DRV: ['Gerätetreiber', 'dll'],
    VXD: ['Virtueller Gerätetreiber', 'dll'], BMP: ['Bitmap', 'img'], GIF: ['GIF-Bild', 'img'],
    JPG: ['JPEG-Bild', 'img'], WAV: ['Wave-Audio', 'snd'], MID: ['MIDI-Sequenz', 'snd'],
    MP3: ['MP3-Audio', 'snd'], HLP: ['Hilfedatei', 'doc'], FON: ['Schriftartdatei', 'file'],
    TTF: ['TrueType-Schriftart', 'file'], TMP: ['TMP-Datei', 'file'], BAK: ['BAK-Datei', 'file'],
    DAT: ['DAT-Datei', 'file'], LNK: ['Verknüpfung', 'file'], CPL: ['Systemsteuerungsmodul', 'cpanel']
  };
  var EXEC = { EXE: 1, COM: 1, BAT: 1 };

  var DRIVES = [
    { name: '3½-Diskette (A:)', key: 'A:', cls: 'floppy', type: 'Diskettenlaufwerk', ready: false, msg: 'A:\\ ist nicht verfügbar. Das Laufwerk ist nicht bereit.' },
    { name: 'MS-DOS_6 (C:)', key: 'C:', cls: 'hdd', type: 'Lokaler Datenträger', ready: true },
    { name: 'Win95 CD (D:)', key: 'D:', cls: 'cd', type: 'CD-ROM-Laufwerk', ready: true },
    { name: 'Netz auf Server (Z:)', key: 'Z:', cls: 'net', type: 'Netzlaufwerk', ready: false, msg: 'Z:\\ ist nicht verfügbar. Die Netzwerkverbindung wurde getrennt.' }
  ];
  var SPECIAL = {
    'Drucker': ['Neuer Drucker', 'HP LaserJet 5L', 'Faxdrucker'],
    'Systemsteuerung': ['Anzeige', 'Software', 'System', 'Maus', 'Tastatur', 'Sounds', 'Netzwerk', 'Datum/Uhrzeit']
  };

  var NAMES_DIR = ['Daten', 'Backup', 'Alt', 'Neu', 'Projekte', 'Archiv', 'Sonstiges', 'Tools', 'Dokumente', 'Bilder', 'Setup', 'Kopie von Daten'];
  var FILES = ['README.TXT', 'LIESMICH.TXT', 'NOTIZEN.TXT', 'BRIEF.DOC', 'BILD01.BMP', 'SOUND.WAV', 'SETUP.EXE', 'START.BAT', 'CONFIG.INI', 'DATA.DAT', 'LOG.TXT', 'TOOL.EXE', 'HELP.HLP', 'LIED.MID', 'TEMP.TMP', 'ALT.BAK'];
  var SYSPRE = ['KERNEL', 'USER', 'GDI', 'SHELL', 'COMCTL', 'MMSYSTEM', 'VGA', 'SOUND', 'MOUSE', 'KEYBOARD', 'NETAPI', 'WINSOCK', 'OLE', 'CTL3D', 'MSVCRT', 'DDRAW', 'DSOUND', 'COMDLG', 'VMM', 'VSHARE', 'VFAT', 'NDIS'];
  var SYSEXT = ['DLL', 'DLL', 'DRV', 'VXD', 'SYS', 'FON'];

  var TPL = {
    'c:': { d: ['Windows', 'Programme', 'Eigene Dateien', 'Spiele', 'Temp', 'DOS'], f: ['AUTOEXEC.BAT', 'COMMAND.COM', 'CONFIG.SYS', 'IO.SYS', 'MSDOS.SYS', 'SCANDISK.LOG'] },
    'd:': { d: ['Install', 'Treiber', 'Demos', 'Extras'], f: ['SETUP.EXE', 'AUTORUN.INF', 'README.TXT', 'INSTALL.BAT'] },
    'windows': { d: ['System', 'Command', 'Fonts', 'Help', 'Startmenü', 'Desktop', 'Temp'], f: ['EXPLORER.EXE', 'NOTEPAD.EXE', 'CALC.EXE', 'PBRUSH.EXE', 'REGEDIT.EXE', 'WIN.INI', 'SYSTEM.INI', 'WINVER.EXE', 'SCANREG.EXE'] },
    'dos': { d: [], f: ['EDIT.COM', 'FORMAT.COM', 'MEM.EXE', 'XCOPY.EXE', 'ATTRIB.EXE', 'DELTREE.EXE', 'SCANDISK.EXE', 'FDISK.EXE', 'MORE.COM', 'CHKDSK.EXE'] },
    'command': { d: [], f: ['EDIT.COM', 'FORMAT.COM', 'MEM.EXE', 'XCOPY.EXE', 'ATTRIB.EXE', 'DELTREE.EXE', 'SCANDISK.EXE', 'FDISK.EXE', 'MORE.COM', 'CHKDSK.EXE'] },
    'system': { d: [], f: [], sys: 1 },
    'fonts': { d: [], f: ['ARIAL.TTF', 'COURIER.FON', 'SERIF.FON', 'SYMBOL.TTF', 'TIMES.TTF', 'VGAOEM.FON'] },
    'programme': { d: ['Zubehör', 'Winamp', 'Internet Explorer', 'Microsoft Office', 'Norton Utilities', 'WinZip', 'Spiele'], f: [] },
    'zubehör': { d: [], f: ['WORDPAD.EXE', 'PBRUSH.EXE', 'NOTEPAD.EXE', 'CALC.EXE', 'CHARMAP.EXE', 'MPLAYER.EXE'] },
    'spiele': { d: ['Doom', 'Command & Conquer', 'Worms', 'Siedler', 'Prince of Persia', 'Duke Nukem 3D'], f: ['SOL.EXE', 'WINMINE.EXE', 'FREECELL.EXE'] },
    'eigene dateien': { d: ['Bilder', 'Musik', 'Briefe', 'Hausaufgaben', 'Urlaub 1997'], f: ['Notizen.TXT', 'Brief an Oma.DOC'] },
    'bilder': { d: [], f: [], gen: ['BMP', 'GIF', 'JPG'], names: ['Urlaub', 'Party', 'Schule', 'Katze', 'Auto', 'Strand', 'Klassenfahrt'] },
    'urlaub 1997': { d: [], f: [], gen: ['JPG', 'BMP'], names: ['Strand', 'Hotel', 'Sonnenuntergang', 'Eis', 'Pool'] },
    'musik': { d: [], f: [], gen: ['MID', 'WAV', 'MP3'], names: ['Hyper', 'Rave', 'Techno', 'Mix', 'Intro', 'Charts', 'Dance'] },
    'briefe': { d: [], f: [], gen: ['DOC'], names: ['Brief an Oma', 'Bewerbung', 'Einladung', 'Referat', 'Beschwerde', 'Entschuldigung'] },
    'temp': { d: [], f: [], tmp: 1 }
  };

  function fileSize(e, r) {
    var base = { EXE: 60000, COM: 20000, DLL: 40000, SYS: 15000, BMP: 300000, MP3: 3000000, WAV: 500000, MID: 20000, JPG: 90000, GIF: 40000, DOC: 15000 }[e] || 2000;
    return Math.max(1, Math.round(base * (0.3 + r() * 2) / 1024));
  }
  function fmtSize(kb) { return String(kb).replace(/\B(?=(\d{3})+(?!\d))/g, '.') + ' KB'; }
  function stamp(r) { return pad(1 + Math.floor(r() * 28)) + '.' + pad(1 + Math.floor(r() * 12)) + '.' + (95 + Math.floor(r() * 5)) + ' ' + pad(Math.floor(r() * 24)) + ':' + pad(Math.floor(r() * 60)); }

  function children(path) {
    var out = [], i;
    if (!path.length) {
      DRIVES.forEach(function (d) { out.push({ name: d.name, kind: 'drive', drive: d, cls: d.cls, type: d.type }); });
      out.push({ name: 'Drucker', kind: 'dir', cls: 'printer', type: 'Systemordner' });
      out.push({ name: 'Systemsteuerung', kind: 'dir', cls: 'cpanel', type: 'Systemordner' });
      return out;
    }
    if (SPECIAL[path[0]]) {
      SPECIAL[path[0]].forEach(function (n) { out.push({ name: n, kind: 'sys', cls: path[0] === 'Drucker' ? 'printer' : 'cpanel', type: path[0] === 'Drucker' ? 'Drucker' : 'Systemsteuerungsmodul', size: '', date: '' }); });
      return out;
    }
    var key = path[path.length - 1], low = key.toLowerCase();
    var parent = path.length > 1 ? path[path.length - 2].toLowerCase() : '';
    var r = rng(path.join('\\'));
    function dir(n) { out.push({ name: n, kind: 'dir', cls: 'folder', type: 'Dateiordner', size: '', date: stamp(r) }); }
    function file(n) {
      var e = ext(n), t = TYPES[e] || [e ? e + '-Datei' : 'Datei', 'file'];
      out.push({ name: n, kind: 'file', ext: e, cls: t[1], type: t[0], size: fmtSize(fileSize(e, r)), date: stamp(r) });
    }
    if (path.length > 8) return out;
    var t = TPL[low];
    if (t) {
      t.d.forEach(dir);
      if (t.sys) {
        pick(SYSPRE, 12 + Math.floor(r() * 8), r).forEach(function (p) {
          file(p + ['', '32', '16'][Math.floor(r() * 3)] + '.' + SYSEXT[Math.floor(r() * SYSEXT.length)]);
        });
      } else if (t.tmp) {
        for (i = 0; i < 4 + Math.floor(r() * 5); i++) file('~DF' + Math.floor(r() * 65535).toString(16).toUpperCase() + '.TMP');
      } else if (t.gen) {
        for (i = 0; i < 6 + Math.floor(r() * 5); i++) file(t.names[Math.floor(r() * t.names.length)] + ' ' + pad(i + 1) + '.' + t.gen[Math.floor(r() * t.gen.length)]);
      }
      t.f.forEach(file);
    } else if (parent === 'programme' || parent === 'spiele') {
      var n = key.replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 8) || 'APP';
      pick(['Data', 'Sounds', 'Saves', 'Hilfe'], 1 + Math.floor(r() * 2), r).forEach(dir);
      [n + '.EXE', 'README.TXT', 'UNINSTAL.EXE', n + '.INI', n + '.HLP'].forEach(file);
    } else {
      pick(NAMES_DIR, Math.floor(r() * (path.length < 5 ? 4 : 2)), r).forEach(dir);
      pick(FILES, 2 + Math.floor(r() * 6), r).forEach(file);
    }
    out.sort(function (a, b) {
      if ((a.kind === 'dir') !== (b.kind === 'dir')) return a.kind === 'dir' ? -1 : 1;
      return a.name.toLowerCase() < b.name.toLowerCase() ? -1 : 1;
    });
    return out;
  }

  // ---------- window ----------
  function mk(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  var win = mk('div', 'ex-win');
  win.id = 'explorer-win';
  win.style.display = 'none';
  var title = mk('div', 'ex-title');
  var titleText = mk('span', '', 'Arbeitsplatz');
  var closeBtn = mk('button', 'ex-x', 'X');
  closeBtn.type = 'button';
  title.append(titleText, closeBtn);
  var menu = mk('div', 'ex-menu');
  ['Datei', 'Bearbeiten', 'Ansicht', '?'].forEach(function (m) { menu.appendChild(mk('span', '', m)); });
  var bar = mk('div', 'ex-bar');
  var backBtn = mk('button', 'ex-btn', '← Zurück');
  var upBtn = mk('button', 'ex-btn', '↑ Nach oben');
  backBtn.type = upBtn.type = 'button';
  var addr = mk('div', 'ex-addr');
  bar.append(backBtn, upBtn, addr);
  var head = mk('div', 'ex-row ex-head');
  ['Name', 'Größe', 'Typ', 'Geändert'].forEach(function (h, i) { head.appendChild(mk('span', 'ex-c' + i, h)); });
  var list = mk('div', 'ex-list');
  list.tabIndex = 0;
  var status = mk('div', 'ex-status');
  var dlg = mk('div', 'ex-dlg');
  dlg.style.display = 'none';
  var dlgText = mk('div', 'ex-dlg-text');
  var dlgOk = mk('button', 'ex-btn', 'OK');
  dlgOk.type = 'button';
  dlg.append(mk('div', 'ex-dlg-title', 'Systemhinweis'), dlgText, dlgOk);
  win.append(title, menu, bar, head, list, status, dlg);
  desktop.appendChild(win);

  var path = [], hist = [], items = [], sel = -1, last = { i: -1, t: 0 };

  function alertMsg(text) { dlgText.textContent = text; dlg.style.display = 'block'; dlgOk.focus(); }
  dlgOk.addEventListener('click', function () { dlg.style.display = 'none'; list.focus(); });

  function setStatus() {
    if (sel >= 0) {
      var it = items[sel];
      status.textContent = it.name + (it.size ? '  –  ' + it.size : '');
    } else {
      status.textContent = items.length + ' Objekt(e)';
    }
  }

  function select(i) {
    sel = i;
    var rows = list.children;
    for (var k = 0; k < rows.length; k++) rows[k].classList.toggle('sel', k === i);
    if (i >= 0 && rows[i] && rows[i].scrollIntoView) rows[i].scrollIntoView({ block: 'nearest' });
    setStatus();
  }

  function render() {
    items = children(path);
    list.textContent = '';
    items.forEach(function (it, i) {
      var row = mk('div', 'ex-row ex-item');
      var c0 = mk('span', 'ex-c0');
      c0.append(mk('i', 'ex-ico ico-' + it.cls), mk('span', '', it.name));
      row.append(c0, mk('span', 'ex-c1', it.size || ''), mk('span', 'ex-c2', it.type || ''), mk('span', 'ex-c3', it.date || ''));
      row.addEventListener('click', function () {
        var now = Date.now();
        if (last.i === i && last.p === path.join('\\') && now - last.t < 500) { last = { i: -1, t: 0 }; activate(i); return; }
        last = { i: i, t: now, p: path.join('\\') };
        select(i);
      });
      list.appendChild(row);
    });
    var a = path.length === 1 && /:$/.test(path[0]) ? path[0] + '\\' : (path.length ? path.join('\\') : 'Arbeitsplatz');
    addr.textContent = a;
    titleText.textContent = a;
    upBtn.disabled = !path.length;
    backBtn.disabled = !hist.length;
    list.scrollTop = 0;
    select(-1);
  }

  function go(p, push) {
    if (push) hist.push(path);
    path = p;
    render();
  }

  function activate(i) {
    var it = items[i];
    if (!it) return;
    if (it.kind === 'drive') {
      if (!it.drive.ready) alertMsg(it.drive.msg);
      else go([it.drive.key], true);
    } else if (it.kind === 'dir') {
      go(path.concat(it.name), true);
    } else if (it.kind === 'sys') {
      alertMsg('Funktion nicht verfügbar. Systemressource gesperrt.');
    } else if (EXEC[it.ext]) {
      rabbit();
    } else {
      alertMsg('Für diese Datei ist keine Anwendung zugeordnet.');
    }
  }

  backBtn.addEventListener('click', function () { if (hist.length) { path = hist.pop(); render(); } });
  upBtn.addEventListener('click', function () { if (path.length) go(path.slice(0, -1), true); });
  list.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowDown') { select(Math.min(items.length - 1, sel + 1)); e.preventDefault(); }
    else if (e.key === 'ArrowUp') { select(Math.max(0, sel - 1)); e.preventDefault(); }
    else if (e.key === 'Enter') { activate(sel); }
    else if (e.key === 'Backspace') { if (path.length) go(path.slice(0, -1), true); e.preventDefault(); }
  });
  closeBtn.addEventListener('click', function () { win.style.display = 'none'; });

  // drag by title bar
  var drag = null;
  title.addEventListener('pointerdown', function (e) {
    if (e.target === closeBtn) return;
    drag = { x: e.clientX - win.offsetLeft, y: e.clientY - win.offsetTop };
    try { title.setPointerCapture(e.pointerId); } catch (_) {}
  });
  title.addEventListener('pointermove', function (e) {
    if (!drag) return;
    win.style.left = Math.max(0, e.clientX - drag.x) + 'px';
    win.style.top = Math.max(0, e.clientY - drag.y) + 'px';
  });
  title.addEventListener('pointerup', function () { drag = null; });

  function openExplorer() {
    try { if (typeof audioCtx !== 'undefined' && audioCtx && audioCtx.state === 'suspended') audioCtx.resume(); } catch (_) {}
    hist = [];
    dlg.style.display = 'none';
    path = [];
    render();
    win.style.display = 'flex';
    list.focus();
  }
  document.addEventListener('click', function (e) {
    if (e.target.closest && e.target.closest('#icon-pc')) {
      e.stopPropagation();
      openExplorer();
    }
  }, true);

  // ---------- white rabbit ----------
  var broken = false;
  function rabbit() {
    if (broken) return;
    broken = true;
    try { stopPlayback(); } catch (_) {}
    var W = window.innerWidth, H = window.innerHeight, cols = 6, rows = 4;
    var tw = Math.ceil(W / cols), th = Math.ceil(H / rows);
    var ov = mk('div', 'rabbit-screen');
    var tiles = [], c, r;
    for (r = 0; r < rows; r++) {
      for (c = 0; c < cols; c++) {
        var tile = mk('div', 'rabbit-tile');
        tile.style.cssText = 'left:' + c * tw + 'px;top:' + r * th + 'px;width:' + (tw + 1) + 'px;height:' + (th + 1) + 'px';
        var inner = mk('div', 'rabbit-inner');
        inner.style.cssText = 'left:' + -c * tw + 'px;top:' + -r * th + 'px;width:' + W + 'px;height:' + H + 'px';
        inner.appendChild(desktop.cloneNode(true));
        tile.appendChild(inner);
        ov.appendChild(tile);
        tiles.push(tile);
      }
    }
    var note = mk('div', 'rabbit-note');
    ov.appendChild(note);
    document.body.appendChild(ov);
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        tiles.forEach(function (t) {
          var d = (Math.random() * 0.9).toFixed(2);
          t.style.transition = 'transform 1.6s cubic-bezier(.5,0,1,.5) ' + d + 's, opacity 1.2s ease-in ' + (+d + 0.4) + 's';
          t.style.transform = 'translate(' + Math.round((Math.random() - 0.5) * 160) + 'px,' + Math.round(H * 1.1) + 'px) rotate(' + Math.round((Math.random() - 0.5) * 90) + 'deg)';
          t.style.opacity = '0';
        });
      });
    });
    setTimeout(function () {
      tiles.forEach(function (t) { t.remove(); });
      var msg = 'follow the white rabbit', k = 0;
      (function type() {
        note.textContent = msg.slice(0, ++k);
        if (k < msg.length) setTimeout(type, 110);
      })();
    }, 3000);
  }
})();
