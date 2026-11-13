(() => {
  const canvas = document.getElementById('space-canvas');
  const ctx = canvas.getContext('2d');

  const hudStage = document.getElementById('hud-stage');
  const hudDist = document.getElementById('hud-dist');
  const hudTime = document.getElementById('hud-time');
  const hudGen = document.getElementById('hud-gen');
  const btnSound = document.getElementById('btn-sound');

  const levelTitle = document.getElementById('level-title');
  const levelSub = document.getElementById('level-sub');
  const levelText = document.getElementById('level-text');
  const controlsArea = document.getElementById('controls-area');

  const btnPrev = document.getElementById('btn-prev');
  const btnNext = document.getElementById('btn-next');
  const dotsContainer = document.getElementById('progress-dots');

  // --- 8-Bit Web Audio Synthesizer ---
  let audioCtx = null;
  let soundEnabled = false;
  let bgmTimer = null;
  let noteIndex = 0;
  const melody = [261.63, 329.63, 392.0, 523.25, 392.0, 329.63, 293.66, 392.0];

  function initAudio() {
    if (!audioCtx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) audioCtx = new AudioContext();
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
  }

  function playTone(freq, duration = 0.09, type = 'square', vol = 0.04) {
    if (!soundEnabled || !audioCtx) return;
    try {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
      gain.gain.setValueAtTime(vol, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + duration);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + duration);
    } catch (_) {}
  }

  function startBgm() {
    stopBgm();
    bgmTimer = setInterval(() => {
      if (!soundEnabled) return;
      const f = melody[noteIndex % melody.length];
      playTone(f, 0.16, 'triangle', 0.025);
      noteIndex++;
    }, 340);
  }

  function stopBgm() {
    if (bgmTimer) {
      clearInterval(bgmTimer);
      bgmTimer = null;
    }
  }

  btnSound.addEventListener('click', () => {
    initAudio();
    soundEnabled = !soundEnabled;
    btnSound.textContent = soundEnabled ? '♪ TON: AN' : '♪ TON: AUS';
    if (soundEnabled) {
      playTone(523.25, 0.1, 'square', 0.05);
      startBgm();
    } else {
      stopBgm();
    }
  });

  // --- Game / Story State ---
  const TOTAL_LEVELS = 5;
  let currentLevel = 0;
  let tick = 0;
  let stars = [];

  // Level 1 state (Earth -> Mars)
  let radioActive = false;
  let radioProgress = 0;
  let radioDone = false;

  // Level 2 state (Mars stay)
  let marsWorkoutBoost = 0;

  // Level 3 state (Zoom-out + Mini-Game)
  let miniGameActive = false;
  let miniGameWon = false;
  let shipY = 0.5;
  let pendingMoveY = 0;
  let asteroids = [];
  let cells = [];
  let gameScore = 0;
  let hitFlash = 0;

  // Level 4 state (Proxima race)
  let raceRunning = false;
  let raceTime = 0;

  // Level 5 state (Generation ship 0..42 years)
  let genYear = 0;

  // --- Safe localStorage ---
  function saveProgress() {
    try {
      localStorage.setItem('mars_proxima_lvl', String(currentLevel));
    } catch (_) {}
  }

  function loadProgress() {
    try {
      const saved = parseInt(localStorage.getItem('mars_proxima_lvl'), 10);
      if (!Number.isNaN(saved) && saved >= 0 && saved < TOTAL_LEVELS) {
        currentLevel = saved;
      }
    } catch (_) {}
  }

  // --- Canvas Sizing (100dvh frame-safe) ---
  let W = 320;
  let H = 180;

  function resizeCanvas() {
    const rect = canvas.getBoundingClientRect();
    const scale = 2; // crisp chunky pixels
    W = Math.max(240, Math.floor(rect.width / scale));
    H = Math.max(120, Math.floor(rect.height / scale));
    canvas.width = W;
    canvas.height = H;
    ctx.imageSmoothingEnabled = false;
    if (stars.length === 0) {
      for (let i = 0; i < 65; i++) {
        stars.push({
          x: Math.random() * 1000,
          y: Math.random() * 1000,
          s: Math.random() > 0.75 ? 2 : 1,
          b: Math.random()
        });
      }
    }
  }
  window.addEventListener('resize', resizeCanvas);

  // --- Pixel Art Helpers ---
  function pxRect(x, y, w, h, color) {
    ctx.fillStyle = color;
    ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
  }

  function pxCircle(cx, cy, r, color) {
    ctx.fillStyle = color;
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        if (dx * dx + dy * dy <= r * r) {
          ctx.fillRect(Math.round(cx + dx), Math.round(cy + dy), 1, 1);
        }
      }
    }
  }

  function drawShip(x, y, flameOn = true, scale = 1) {
    const s = scale;
    if (flameOn && Math.floor(tick / 4) % 2 === 0) {
      pxRect(x - 7 * s, y - 2 * s, 4 * s, 4 * s, '#f97316');
      pxRect(x - 5 * s, y - 1 * s, 3 * s, 2 * s, '#fde047');
    }
    pxRect(x - 3 * s, y - 4 * s, 8 * s, 8 * s, '#e2e8f0');
    pxRect(x + 5 * s, y - 2 * s, 3 * s, 4 * s, '#ef4444');
    pxRect(x - 5 * s, y - 6 * s, 4 * s, 2 * s, '#3b82f6');
    pxRect(x - 5 * s, y + 4 * s, 4 * s, 2 * s, '#3b82f6');
    pxRect(x + 1 * s, y - 2 * s, 3 * s, 4 * s, '#38bdf8');
  }

  function drawAstronaut(x, y, hairColor = '#92400e', suitColor = '#f8fafc', hasCane = false, scale = 1) {
    const s = scale;
    // Helmet / Head
    pxRect(x - 3 * s, y - 10 * s, 6 * s, 5 * s, '#e2e8f0');
    pxRect(x - 2 * s, y - 9 * s, 4 * s, 3 * s, '#38bdf8');
    pxRect(x - 2 * s, y - 11 * s, 4 * s, 1 * s, hairColor);
    // Body
    pxRect(x - 3 * s, y - 5 * s, 6 * s, 6 * s, suitColor);
    // Legs
    pxRect(x - 3 * s, y + 1 * s, 2 * s, 4 * s, '#cbd5e1');
    pxRect(x + 1 * s, y + 1 * s, 2 * s, 4 * s, '#cbd5e1');
    if (hasCane) {
      pxRect(x + 4 * s, y - 2 * s, 1 * s, 7 * s, '#d97706');
      pxRect(x + 3 * s, y - 2 * s, 2 * s, 1 * s, '#d97706');
    }
  }

  function drawHeart(x, y, size = 1) {
    const p = [
      '0110110',
      '1111111',
      '1111111',
      '0111110',
      '0011100',
      '0001000'
    ];
    ctx.fillStyle = '#f43f5e';
    for (let r = 0; r < p.length; r++) {
      for (let c = 0; c < p[r].length; c++) {
        if (p[r][c] === '1') {
          ctx.fillRect(Math.round(x + (c - 3) * size), Math.round(y + (r - 3) * size), size, size);
        }
      }
    }
  }

  function drawBubble(x, y, text) {
    ctx.font = 'bold 8px monospace';
    const w = ctx.measureText(text).width + 8;
    const h = 13;
    const bx = Math.max(4, Math.min(W - w - 4, Math.round(x - w / 2)));
    const by = Math.max(4, Math.round(y - h));
    pxRect(bx, by, w, h, '#0f172a');
    ctx.strokeStyle = '#7dd3fc';
    ctx.lineWidth = 1;
    ctx.strokeRect(bx + 0.5, by + 0.5, w - 1, h - 1);
    ctx.fillStyle = '#f8fafc';
    ctx.fillText(text, bx + 4, by + 9);
  }

  // --- Level Definitions & Controls ---
  function setupLevel(idx) {
    currentLevel = Math.max(0, Math.min(TOTAL_LEVELS - 1, idx));
    saveProgress();
    playTone(440 + currentLevel * 60, 0.08, 'square', 0.04);

    btnPrev.disabled = currentLevel === 0;
    btnNext.disabled = currentLevel === TOTAL_LEVELS - 1;
    hudStage.textContent = `LVL ${currentLevel + 1}/${TOTAL_LEVELS}`;

    // Update dots
    dotsContainer.innerHTML = '';
    for (let i = 0; i < TOTAL_LEVELS; i++) {
      const d = document.createElement('div');
      d.className = 'dot' + (i === currentLevel ? ' active' : '');
      d.title = `Level ${i + 1}`;
      d.addEventListener('click', () => setupLevel(i));
      dotsContainer.appendChild(d);
    }

    controlsArea.innerHTML = '';
    miniGameActive = false;

    if (currentLevel === 0) {
      hudDist.textContent = '55-400 MIO KM';
      hudTime.textContent = '~7 MONATE';
      hudGen.textContent = 'GEN 1 (CREW)';
      levelTitle.textContent = 'LEVEL 1: AB ZUM NACHBARN!';
      levelSub.textContent = 'ERDE → MARS';
      levelText.textContent =
        'Ca. 7 Monate Flug. Starten geht nur alle 26 Monate, wenn Erde & Mars günstig stehen. Live-Telefonate? Unmöglich!';

      const btnRadio = document.createElement('button');
      btnRadio.className = 'action-btn';
      btnRadio.textContent = '📡 WHATSAPP AN MAMA FUNKEN';
      const status = document.createElement('span');
      status.className = 'status-badge';
      status.textContent = radioDone ? 'Antwort nach 28 Min: „Zieh dir was Warmes an!“' : 'Funk-Verzögerung testen';

      btnRadio.addEventListener('click', () => {
        initAudio();
        radioActive = true;
        radioProgress = 0;
        radioDone = false;
        status.textContent = 'Signal unterwegs (Lichtgeschwindigkeit)...';
        playTone(660, 0.12, 'sine', 0.05);
      });

      controlsArea.appendChild(btnRadio);
      controlsArea.appendChild(status);
      controlsArea._radioStatus = status;
    } else if (currentLevel === 1) {
      hudDist.textContent = '225 MIO KM';
      hudTime.textContent = '2,5 - 3 JAHRE';
      hudGen.textContent = 'GEN 1 (CREW)';
      levelTitle.textContent = 'LEVEL 2: LAGERKOLLER AUF DEM MARS';
      levelSub.textContent = '16 MONATE WARTEN';
      levelText.textContent =
        'Einfach umdrehen geht nicht: 7 Mon. hin + 16 Mon. warten + 7 Mon. zurück = ~3 Jahre! Ohne Hanteln schmelzen Muskeln & Knochen.';

      const btnPump = document.createElement('button');
      btnPump.className = 'action-btn';
      btnPump.textContent = '🏋️ HANTELN STEMMEN';
      const badge = document.createElement('span');
      badge.className = 'status-badge';
      badge.textContent = `Muskelkraft: ${100 + marsWorkoutBoost}% | Duschwasser: 90% recycelt`;

      btnPump.addEventListener('click', () => {
        initAudio();
        marsWorkoutBoost = Math.min(50, marsWorkoutBoost + 10);
        badge.textContent = `Muskelkraft: ${100 + marsWorkoutBoost}% | Duschwasser: 90% recycelt`;
        playTone(330 + marsWorkoutBoost * 4, 0.09, 'square', 0.04);
      });

      controlsArea.appendChild(btnPump);
      controlsArea.appendChild(badge);
    } else if (currentLevel === 2) {
      hudDist.textContent = '7,5 MRD KM';
      hudTime.textContent = '~10 JAHRE';
      hudGen.textContent = 'GEN 1 (NOCH!)';
      levelTitle.textContent = 'LEVEL 3: SONNENSYSTEM-ZOOM-OUT';
      levelSub.textContent = 'BIS ZUM PLUTO';
      levelText.textContent =
        'Selbst bis zum Pluto (~10 Jahre) reicht EINE Crew! Weiche im Asteroidengürtel den Brocken aus (Klick auf Bühne oder ↑/↓).';

      const btnPlay = document.createElement('button');
      btnPlay.className = 'action-btn';
      btnPlay.textContent = miniGameWon ? '🎮 NOCHMAL FLIEGEN' : '🕹️ STEUERUNG ÜBERNEHMEN';
      const btnUp = document.createElement('button');
      btnUp.textContent = '▲ HOCH';
      const btnDown = document.createElement('button');
      btnDown.textContent = '▼ RUNTER';
      const info = document.createElement('span');
      info.className = 'status-badge';
      info.textContent = miniGameWon ? 'Pluto erreicht! (10 Jahre)' : 'Klick zum Spielen';

      function startArcade() {
        initAudio();
        miniGameActive = true;
        miniGameWon = false;
        shipY = 0.5;
        pendingMoveY = 0;
        asteroids = [];
        cells = [];
        gameScore = 0;
        hitFlash = 0;
        info.textContent = 'Ausweichen! Ziel: 10 Jahre';
        playTone(587.33, 0.1, 'square', 0.05);
      }

      btnPlay.addEventListener('click', startArcade);
      btnUp.addEventListener('click', () => {
        if (!miniGameActive) startArcade();
        pendingMoveY -= 0.14;
        playTone(440, 0.04, 'triangle', 0.03);
      });
      btnDown.addEventListener('click', () => {
        if (!miniGameActive) startArcade();
        pendingMoveY += 0.14;
        playTone(392, 0.04, 'triangle', 0.03);
      });

      controlsArea.appendChild(btnPlay);
      controlsArea.appendChild(btnUp);
      controlsArea.appendChild(btnDown);
      controlsArea.appendChild(info);
      controlsArea._gameInfo = info;
    } else if (currentLevel === 3) {
      hudDist.textContent = '40 BIO KM (4,24 LJ)';
      hudTime.textContent = '6.600 vs 42 J.';
      hudGen.textContent = '250 vs 2 GEN';
      levelTitle.textContent = 'LEVEL 4: DIE UNENDLICHE LEERE';
      levelSub.textContent = '→ PROXIMA CENTAURI B';
      levelText.textContent =
        '4,24 Lichtjahre zum nächsten Exoplaneten! Heutige Raketen bräuchten 6.600 Jahre. Ein Fusionsschiff (10% Lichtgeschw.) schafft es in ~42 Jahren.';

      const btnRace = document.createElement('button');
      btnRace.className = 'action-btn';
      btnRace.textContent = '🚀 ANTRIEBS-RENNEN STARTEN';
      const badge = document.createElement('span');
      badge.className = 'status-badge';
      badge.textContent = 'Heute: 6.600 J. | Fusionsantrieb: 42 J.';

      btnRace.addEventListener('click', () => {
        initAudio();
        raceRunning = true;
        raceTime = 0;
        playTone(523.25, 0.12, 'sawtooth', 0.04);
      });

      controlsArea.appendChild(btnRace);
      controlsArea.appendChild(badge);
    } else if (currentLevel === 4) {
      levelTitle.textContent = 'LEVEL 5: DAS 2-GENERATIONEN-SCHIFF';
      levelSub.textContent = 'ELTERN STARTEN, KIND LANDET';
      levelText.textContent =
        '42 Jahre Flugzeit: Ein junges Paar startet. Unterwegs wird das Kind geboren, wächst an Bord auf und übernimmt bei der Landung das Steuer!';

      const wrap = document.createElement('div');
      wrap.className = 'slider-wrap';
      const lbl = document.createElement('span');
      lbl.textContent = 'JAHR 0';
      const slider = document.createElement('input');
      slider.type = 'range';
      slider.min = '0';
      slider.max = '42';
      slider.value = String(genYear);

      const btnStep = document.createElement('button');
      btnStep.className = 'action-btn';
      btnStep.textContent = '⏩ NÄCHSTE PHASE';

      function updateGenUI(val) {
        genYear = Number(val);
        lbl.textContent = `JAHR ${genYear}`;
        hudDist.textContent = `${Math.round((genYear / 42) * 40)} BIO KM`;
        hudTime.textContent = `JAHR ${genYear} / 42`;
        if (genYear < 8) {
          hudGen.textContent = 'GEN 1 (ELTERN)';
        } else if (genYear < 28) {
          hudGen.textContent = 'GEN 1 + BABY/TEEN';
        } else {
          hudGen.textContent = 'GEN 2 ÜBERNIMMT!';
        }
      }

      slider.addEventListener('input', (e) => {
        initAudio();
        updateGenUI(e.target.value);
        if (Number(e.target.value) === 8) playTone(659.25, 0.12, 'sine', 0.05);
      });

      btnStep.addEventListener('click', () => {
        initAudio();
        const milestones = [0, 8, 25, 42];
        const next = milestones.find((m) => m > genYear) ?? 0;
        slider.value = String(next);
        updateGenUI(next);
        playTone(next === 8 ? 659.25 : 523.25, 0.12, 'square', 0.04);
      });

      updateGenUI(genYear);
      wrap.appendChild(lbl);
      wrap.appendChild(slider);
      controlsArea.appendChild(wrap);
      controlsArea.appendChild(btnStep);
    }
  }

  // --- Keyboard & Pointer Input (never dropped) ---
  window.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
      if (currentLevel === 2) {
        e.preventDefault();
        if (!miniGameActive) miniGameActive = true;
        pendingMoveY -= 0.12;
      }
    } else if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') {
      if (currentLevel === 2) {
        e.preventDefault();
        if (!miniGameActive) miniGameActive = true;
        pendingMoveY += 0.12;
      }
    } else if (e.key === 'ArrowRight') {
      if (currentLevel < TOTAL_LEVELS - 1) setupLevel(currentLevel + 1);
    } else if (e.key === 'ArrowLeft') {
      if (currentLevel > 0) setupLevel(currentLevel - 1);
    }
  });

  canvas.addEventListener('pointerdown', (e) => {
    canvas.focus();
    if (currentLevel === 2) {
      const rect = canvas.getBoundingClientRect();
      const clickNormY = (e.clientY - rect.top) / rect.height;
      if (!miniGameActive) {
        miniGameActive = true;
        miniGameWon = false;
        asteroids = [];
        cells = [];
        gameScore = 0;
      }
      pendingMoveY += clickNormY < shipY ? -0.14 : 0.14;
      playTone(440, 0.04, 'triangle', 0.03);
    }
  });

  btnPrev.addEventListener('click', () => setupLevel(currentLevel - 1));
  btnNext.addEventListener('click', () => setupLevel(currentLevel + 1));

  // --- Render Scenes ---
  function drawStars(speed = 0.15) {
    pxRect(0, 0, W, H, '#070913');
    for (let i = 0; i < stars.length; i++) {
      const st = stars[i];
      const sx = ((st.x - tick * speed * st.s) % W + W) % W;
      const sy = st.y % H;
      const blink = Math.sin(tick * 0.08 + st.b * 10) > -0.3;
      if (blink) {
        pxRect(sx, sy, st.s, st.s, st.s === 2 ? '#e0f2fe' : '#64748b');
      }
    }
  }

  function renderLevel1() {
    drawStars(0.2);
    const earthX = Math.round(W * 0.16);
    const marsX = Math.round(W * 0.84);
    const cy = Math.round(H * 0.54);

    // Trajectory arc
    ctx.fillStyle = '#334155';
    for (let t = 0; t <= 1; t += 0.04) {
      const ax = earthX + (marsX - earthX) * t;
      const ay = cy - Math.sin(t * Math.PI) * (H * 0.22);
      pxRect(ax, ay, 2, 1, '#475569');
    }

    // Earth
    pxCircle(earthX, cy, 14, '#2563eb');
    pxCircle(earthX - 4, cy - 3, 5, '#22c55e');
    pxCircle(earthX + 5, cy + 4, 4, '#22c55e');
    drawBubble(earthX, cy + 28, 'ERDE');

    // Mars
    pxCircle(marsX, cy, 11, '#dc2626');
    pxCircle(marsX - 3, cy - 2, 3, '#f87171');
    drawBubble(marsX, cy + 25, 'MARS');

    // Moving Ship
    const prog = ((tick % 240) / 240);
    const sx = earthX + (marsX - earthX) * prog;
    const sy = cy - Math.sin(prog * Math.PI) * (H * 0.22);
    drawShip(sx, sy, true, 1);

    const day = Math.round(prog * 210);
    drawBubble(sx, sy - 12, prog < 0.5 ? `Tag ${day}: Sind wir da?` : `Tag ${day}: Fast!`);

    // Radio signal animation
    if (radioActive) {
      radioProgress += 0.012;
      const pingPong = radioProgress <= 0.5 ? radioProgress * 2 : (1 - radioProgress) * 2;
      const rx = marsX - (marsX - earthX) * pingPong;
      const ry = cy - Math.sin(pingPong * Math.PI) * (H * 0.22);
      pxCircle(rx, ry, 3, '#fde047');
      const mins = Math.round(radioProgress * 28);
      drawBubble(W * 0.5, 22, `Funk-Laufzeit: ${mins} Min...`);
      if (radioProgress >= 1) {
        radioActive = false;
        radioDone = true;
        playTone(880, 0.14, 'square', 0.05);
        if (controlsArea._radioStatus) {
          controlsArea._radioStatus.textContent = 'Antwort (28 Min): „Zieh dir was Warmes an!“';
        }
      }
    }
  }

  function renderLevel2() {
    drawStars(0.05);
    const groundY = Math.round(H * 0.72);
    pxRect(0, groundY, W, H - groundY, '#991b1b');
    pxRect(0, groundY, W, 3, '#f87171');

    // Landed rocket
    const rx = Math.round(W * 0.2);
    pxRect(rx - 7, groundY - 26, 14, 24, '#e2e8f0');
    pxRect(rx - 5, groundY - 32, 10, 6, '#ef4444');
    pxRect(rx - 10, groundY - 4, 4, 4, '#64748b');
    pxRect(rx + 6, groundY - 4, 4, 4, '#64748b');

    // Signpost
    const signX = Math.round(W * 0.42);
    pxRect(signX, groundY - 16, 2, 16, '#94a3b8');
    drawBubble(signX, groundY - 18, 'Rückflug in 16 Mon.');

    // Astronaut 1 lifting weights
    const a1x = Math.round(W * 0.62);
    const lift = Math.abs(Math.sin(tick * 0.12)) * 5;
    drawAstronaut(a1x, groundY - 5, '#92400e', '#f8fafc', false, 1);
    // Barbell
    pxRect(a1x - 9, groundY - 13 - lift, 18, 1, '#94a3b8');
    pxRect(a1x - 10, groundY - 15 - lift, 3, 5, '#38bdf8');
    pxRect(a1x + 7, groundY - 15 - lift, 3, 5, '#38bdf8');
    drawBubble(a1x, groundY - 24, 'Pumpen gegen Schwund!');

    // Astronaut 2 water recycling
    const a2x = Math.round(W * 0.84);
    drawAstronaut(a2x, groundY - 5, '#1e293b', '#f8fafc', false, 1);
    pxRect(a2x - 8, groundY - 5, 5, 5, '#38bdf8');
    drawBubble(a2x, groundY - 20, 'Mmmh, Duschwasser!');
  }

  function renderLevel3() {
    drawStars(miniGameActive ? 1.4 : 0.35);

    if (!miniGameActive) {
      // Zoom-out solar system overview
      const cy = Math.round(H * 0.52);
      pxCircle(18, cy, 10, '#facc15'); // Sun
      pxCircle(42, cy, 2, '#3b82f6'); // Earth
      pxCircle(54, cy, 2, '#ef4444'); // Mars
      pxCircle(Math.round(W * 0.36), cy, 11, '#d97706'); // Jupiter
      pxCircle(Math.round(W * 0.56), cy, 8, '#eab308'); // Saturn
      pxRect(Math.round(W * 0.56) - 14, cy - 1, 28, 2, '#fde047'); // Rings
      pxCircle(Math.round(W * 0.72), cy, 5, '#06b6d4'); // Uranus
      pxCircle(Math.round(W * 0.84), cy, 5, '#2563eb'); // Neptune

      const plutoX = Math.round(W * 0.93);
      pxCircle(plutoX, cy, 3, '#cbd5e1');
      drawBubble(plutoX - 18, cy - 12, 'Noch ein Planet!');

      const sx = 42 + ((tick * 0.7) % (plutoX - 42));
      drawShip(sx, cy - 16, true, 1);
      drawBubble(W * 0.45, 22, miniGameWon ? 'Pluto erreicht! (10 J. = 1 Crew)' : 'Klick für Asteroiden-Minispiel!');
      return;
    }

    // Apply queued input immediately
    if (pendingMoveY !== 0) {
      shipY = Math.max(0.12, Math.min(0.88, shipY + pendingMoveY));
      pendingMoveY = 0;
    }

    // Spawn asteroids & fuel cells
    if (tick % 22 === 0) {
      asteroids.push({
        x: W + 10,
        y: 0.12 + Math.random() * 0.76,
        r: 4 + Math.floor(Math.random() * 4),
        spd: 1.6 + Math.random() * 1.1
      });
    }
    if (tick % 55 === 0) {
      cells.push({
        x: W + 10,
        y: 0.15 + Math.random() * 0.7,
        spd: 1.5
      });
    }

    const px = Math.round(W * 0.16);
    const py = Math.round(shipY * H);

    // Update & draw asteroids
    for (let i = asteroids.length - 1; i >= 0; i--) {
      const a = asteroids[i];
      a.x -= a.spd;
      const ay = Math.round(a.y * H);
      pxCircle(a.x, ay, a.r, '#78716c');
      pxCircle(a.x - 1, ay - 1, Math.max(1, a.r - 2), '#a8a29e');

      if (Math.abs(a.x - px) < a.r + 5 && Math.abs(ay - py) < a.r + 4) {
        asteroids.splice(i, 1);
        gameScore = Math.max(0, gameScore - 2);
        hitFlash = 8;
        playTone(130, 0.15, 'sawtooth', 0.06);
        continue;
      }
      if (a.x < -12) {
        asteroids.splice(i, 1);
        gameScore += 1;
      }
    }

    // Update & draw fuel cells
    for (let i = cells.length - 1; i >= 0; i--) {
      const c = cells[i];
      c.x -= c.spd;
      const cy = Math.round(c.y * H);
      pxRect(c.x - 3, cy - 3, 6, 6, '#4ade80');
      if (Math.abs(c.x - px) < 9 && Math.abs(cy - py) < 8) {
        cells.splice(i, 1);
        gameScore += 2;
        playTone(784, 0.08, 'square', 0.05);
        continue;
      }
      if (c.x < -10) cells.splice(i, 1);
    }

    if (hitFlash > 0) {
      hitFlash--;
      if (hitFlash % 2 === 0) drawShip(px, py, true, 1);
    } else {
      drawShip(px, py, true, 1);
    }

    const years = Math.min(10, Math.floor(gameScore / 2));
    drawBubble(W * 0.5, 18, `Flugzeit: ${years} / 10 Jahre bis Pluto`);

    if (years >= 10) {
      miniGameActive = false;
      miniGameWon = true;
      playTone(659.25, 0.15, 'square', 0.05);
      if (controlsArea._gameInfo) {
        controlsArea._gameInfo.textContent = 'Geschafft! 10 Jahre = 1 Crew reicht!';
      }
    }
  }

  function renderLevel4() {
    drawStars(0.25);
    const startX = Math.round(W * 0.12);
    const endX = Math.round(W * 0.88);
    const topY = Math.round(H * 0.34);
    const botY = Math.round(H * 0.72);

    // Sun dot & Proxima Centauri b
    pxCircle(startX, Math.round(H * 0.53), 5, '#facc15');
    drawBubble(startX + 8, Math.round(H * 0.53) + 22, 'Sonne');

    pxCircle(endX, Math.round(H * 0.53), 9, '#f97316');
    pxCircle(endX - 14, Math.round(H * 0.53) + 6, 4, '#38bdf8');
    drawBubble(endX - 16, Math.round(H * 0.53) - 14, 'Proxima b');

    // Track lines
    pxRect(startX + 10, topY, endX - startX - 24, 1, '#334155');
    pxRect(startX + 10, botY, endX - startX - 24, 1, '#334155');

    if (raceRunning) {
      raceTime = Math.min(1, raceTime + 0.006);
    }
    const progress = raceRunning ? raceTime : ((tick % 240) / 240);

    // Track 1: Today's rocket (crawls barely 2 pixels) + cobweb
    const r1x = startX + 14 + progress * 3;
    drawShip(r1x, topY, false, 1);
    // Cobweb pixel lines
    pxRect(r1x - 6, topY - 8, 6, 1, '#94a3b8');
    pxRect(r1x - 4, topY - 10, 1, 6, '#94a3b8');
    drawBubble(r1x + 42, topY - 10, 'Heute: 6.600 Jahre');

    // Track 2: Fusion Generation Ship (zooms across)
    const r2x = startX + 14 + progress * (endX - startX - 34);
    // Blue fusion trail
    pxRect(r2x - 16, botY - 2, 12, 4, '#38bdf8');
    drawShip(r2x, botY, true, 1.2);
    drawBubble(r2x, botY - 13, `Fusion: ${Math.round(progress * 42)} / 42 J.`);
  }

  function renderLevel5() {
    drawStars(0.45);

    // Cross-section of Generation Ship
    const sx = Math.round(W * 0.1);
    const sy = Math.round(H * 0.2);
    const sw = Math.round(W * 0.8);
    const sh = Math.round(H * 0.62);

    // Hull
    pxRect(sx, sy, sw, sh, '#1e293b');
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 2;
    ctx.strokeRect(sx, sy, sw, sh);
    // Nose cone
    pxRect(sx + sw, sy + 8, 12, sh - 16, '#475569');
    // Thruster flame
    if (genYear < 42 && Math.floor(tick / 4) % 2 === 0) {
      pxRect(sx - 12, sy + sh / 2 - 6, 12, 12, '#38bdf8');
    }

    // 3 Rooms: Bedroom (left), Greenhouse (middle), Cockpit (right)
    const roomW = Math.floor(sw / 3);
    const floorY = sy + sh - 8;

    // Room dividers
    pxRect(sx + roomW, sy + 2, 2, sh - 4, '#64748b');
    pxRect(sx + roomW * 2, sy + 2, 2, sh - 4, '#64748b');

    // --- ROOM 1: BEDROOM ---
    const isBedroomScene = genYear >= 6 && genYear <= 11;
    if (isBedroomScene) {
      // Dimmed lights for romantic scene
      pxRect(sx + 2, sy + 2, roomW - 3, sh - 4, '#090d1c');
    }
    // Bed
    const bedX = sx + 10;
    const bedW = Math.min(44, roomW - 18);
    pxRect(bedX, floorY - 7, bedW, 7, '#7c2d12');
    pxRect(bedX + 2, floorY - 10, 10, 3, '#f8fafc'); // pillow
    pxRect(bedX + 12, floorY - 9, bedW - 14, 4, '#ec4899'); // blanket

    if (isBedroomScene) {
      // Couple in bed + floating 8-bit heart
      pxCircle(bedX + 8, floorY - 11, 2, '#fed7aa');
      pxCircle(bedX + 15, floorY - 11, 2, '#fed7aa');
      const bob = Math.sin(tick * 0.15) * 3;
      drawHeart(bedX + bedW / 2, floorY - 24 + bob, 2);
      drawBubble(sx + roomW * 0.5, sy + 14, 'Nachwuchs-Mission!');
    } else if (genYear >= 12 && genYear < 28) {
      // Crib with baby
      pxRect(bedX + bedW + 4, floorY - 8, 12, 8, '#fde047');
      pxCircle(bedX + bedW + 10, floorY - 9, 2, '#fed7aa');
    }

    // --- ROOM 2: GREENHOUSE ---
    const ghX = sx + roomW + 8;
    pxRect(ghX, floorY - 5, roomW - 16, 5, '#713f12');
    for (let p = 0; p < 3; p++) {
      const px = ghX + 6 + p * Math.floor((roomW - 22) / 3);
      pxRect(px, floorY - 11, 3, 6, '#22c55e');
      pxRect(px - 2, floorY - 13, 7, 3, '#4ade80');
    }

    // --- ROOM 3: COCKPIT ---
    const cpX = sx + roomW * 2 + 6;
    pxRect(cpX + roomW - 20, sy + 10, 10, 14, '#38bdf8'); // window
    pxRect(cpX + roomW - 22, floorY - 10, 12, 10, '#334155'); // console

    // --- CREW AGING LOGIC ---
    if (genYear < 8) {
      // Young couple in cockpit
      drawAstronaut(cpX + 12, floorY - 5, '#92400e', '#f8fafc', false, 1);
      drawAstronaut(cpX + 24, floorY - 5, '#f59e0b', '#f8fafc', false, 1);
      drawBubble(cpX + 18, sy + 14, 'Startklar! (28 J.)');
    } else if (genYear < 28) {
      // Parents middle-aged, teenager in greenhouse watering potatoes
      drawAstronaut(ghX + 16, floorY - 5, '#f59e0b', '#38bdf8', false, 0.9);
      drawBubble(ghX + 18, sy + 14, 'Kein WLAN hier?!');
      drawAstronaut(cpX + 16, floorY - 5, '#64748b', '#f8fafc', false, 1);
    } else {
      // Year 28..42: Parents are grey-haired pensioners with cane, adult child commands cockpit!
      drawAstronaut(sx + 18, floorY - 5, '#e2e8f0', '#94a3b8', true, 1);
      drawAstronaut(sx + 32, floorY - 5, '#e2e8f0', '#94a3b8', true, 1);
      drawBubble(sx + 26, sy + 14, 'Rente an Bord!');

      drawAstronaut(cpX + 16, floorY - 5, '#f59e0b', '#4ade80', false, 1);
      drawBubble(cpX + 18, sy + 14, genYear === 42 ? 'Proxima b erreicht!' : 'Gen 2 am Steuer!');
    }
  }

  // --- Main Loop ---
  function loop() {
    tick++;
    if (currentLevel === 0) renderLevel1();
    else if (currentLevel === 1) renderLevel2();
    else if (currentLevel === 2) renderLevel3();
    else if (currentLevel === 3) renderLevel4();
    else if (currentLevel === 4) renderLevel5();
    requestAnimationFrame(loop);
  }

  loadProgress();
  resizeCanvas();
  setupLevel(currentLevel);
  requestAnimationFrame(loop);
})();
