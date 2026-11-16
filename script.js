(() => {
  const PAIRS = [
    {
      id: 'gina',
      starName: 'Gina Wild',
      workTitle: "Jetzt wird's wild",
      year: '1999',
      bg1: '#ff1e8a',
      bg2: '#3a0ca3',
      hairColor: '#ffd166',
      hairStyle: 'long-blonde',
      accent: '#00f0ff',
      dvdTheme: 'sunset'
    },
    {
      id: 'dolly',
      starName: 'Dolly Buster',
      workTitle: 'In Excess',
      year: '1990',
      bg1: '#f72585',
      bg2: '#4cc9f0',
      hairColor: '#ffe066',
      hairStyle: 'big-curl',
      accent: '#ffbe0b',
      dvdTheme: 'diamonds'
    },
    {
      id: 'kelly',
      starName: 'Kelly Trump',
      workTitle: 'Supergirl – Voll verstrahlt',
      year: '1999',
      bg1: '#ff0054',
      bg2: '#0077b6',
      hairColor: '#fff3b0',
      hairStyle: 'glam-wave',
      accent: '#ffbd00',
      dvdTheme: 'hero'
    },
    {
      id: 'sibel',
      starName: 'Sibel Kekilli',
      workTitle: 'Gegen die Wand',
      year: '2004',
      bg1: '#9b5de5',
      bg2: '#f15bb5',
      hairColor: '#1a1118',
      hairStyle: 'sleek-dark',
      accent: '#00bbf9',
      dvdTheme: 'noir'
    },
    {
      id: 'teresa',
      starName: 'Teresa Orlowski',
      workTitle: 'Foxy Lady',
      year: '1985',
      bg1: '#ff6d00',
      bg2: '#7209b7',
      hairColor: '#e07a5f',
      hairStyle: '80s-mane',
      accent: '#ff9e00',
      dvdTheme: 'foxy'
    }
  ];

  const boardEl = document.getElementById('board');
  const pairsCountEl = document.getElementById('pairs-count');
  const movesCountEl = document.getElementById('moves-count');
  const pileCounterEl = document.getElementById('pile-counter');
  const pileCardsEl = document.getElementById('pile-cards');
  const discardPileEl = document.getElementById('discard-pile');
  const soundBtn = document.getElementById('sound-btn');
  const restartBtn = document.getElementById('restart-btn');
  const winModal = document.getElementById('win-modal');
  const winSummary = document.getElementById('win-summary');
  const playAgainBtn = document.getElementById('play-again-btn');

  let soundEnabled = true;
  let audioCtx = null;
  let cardsData = [];
  let flippedIndices = [];
  let matchedPairs = 0;
  let moves = 0;
  let pendingResetTimer = null;

  function ensureAudio() {
    if (!soundEnabled) return null;
    if (!audioCtx) {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (Ctx) audioCtx = new Ctx();
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume().catch(() => {});
    }
    return audioCtx;
  }

  function playBoing() {
    const ctx = ensureAudio();
    if (!ctx) return;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    const mainGain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(145, now);
    osc.frequency.exponentialRampToValueAtTime(340, now + 0.14);
    osc.frequency.exponentialRampToValueAtTime(175, now + 0.55);

    lfo.type = 'sine';
    lfo.frequency.setValueAtTime(26, now);
    lfo.frequency.linearRampToValueAtTime(14, now + 0.55);

    lfoGain.gain.setValueAtTime(55, now);
    lfoGain.gain.exponentialRampToValueAtTime(4, now + 0.55);

    mainGain.gain.setValueAtTime(0.001, now);
    mainGain.gain.linearRampToValueAtTime(0.32, now + 0.03);
    mainGain.gain.exponentialRampToValueAtTime(0.001, now + 0.58);

    lfo.connect(lfoGain);
    lfoGain.connect(osc.frequency);
    osc.connect(mainGain);
    mainGain.connect(ctx.destination);

    osc.start(now);
    lfo.start(now);
    osc.stop(now + 0.6);
    lfo.stop(now + 0.6);
  }

  function playSynthSigh() {
    const ctx = ensureAudio();
    if (!ctx) return;
    const now = ctx.currentTime;
    const duration = 0.78;

    const bufferSize = Math.floor(ctx.sampleRate * duration);
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuffer;

    const bandpass = ctx.createBiquadFilter();
    bandpass.type = 'bandpass';
    bandpass.frequency.setValueAtTime(680, now);
    bandpass.frequency.exponentialRampToValueAtTime(410, now + duration);
    bandpass.Q.setValueAtTime(2.6, now);

    const breathGain = ctx.createGain();
    breathGain.gain.setValueAtTime(0.001, now);
    breathGain.gain.linearRampToValueAtTime(0.24, now + 0.14);
    breathGain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    noise.connect(bandpass);
    bandpass.connect(breathGain);
    breathGain.connect(ctx.destination);

    const voice = ctx.createOscillator();
    const formant = ctx.createBiquadFilter();
    const voiceGain = ctx.createGain();

    voice.type = 'sawtooth';
    voice.frequency.setValueAtTime(235, now + 0.04);
    voice.frequency.exponentialRampToValueAtTime(148, now + duration);

    formant.type = 'lowpass';
    formant.frequency.setValueAtTime(560, now);
    formant.frequency.exponentialRampToValueAtTime(320, now + duration);
    formant.Q.setValueAtTime(3.2, now);

    voiceGain.gain.setValueAtTime(0.001, now);
    voiceGain.gain.linearRampToValueAtTime(0.16, now + 0.12);
    voiceGain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    voice.connect(formant);
    formant.connect(voiceGain);
    voiceGain.connect(ctx.destination);

    noise.start(now);
    voice.start(now + 0.03);
    noise.stop(now + duration);
    voice.stop(now + duration);
  }

  function createCardBackSVG() {
    return `
      <svg viewBox="0 0 80 80" shape-rendering="crispEdges" aria-hidden="true">
        <rect x="12" y="12" width="56" height="56" rx="6" fill="#240636" stroke="#00f0ff" stroke-width="3" />
        <circle cx="40" cy="36" r="16" fill="#ff2a85" />
        <rect x="22" y="38" width="36" height="4" fill="#1b062b" />
        <rect x="24" y="45" width="32" height="3" fill="#1b062b" />
        <rect x="38" y="34" width="4" height="26" fill="#09020d" />
        <rect x="26" y="28" width="12" height="4" fill="#09020d" />
        <rect x="42" y="28" width="12" height="4" fill="#09020d" />
        <rect x="29" y="24" width="22" height="4" fill="#09020d" />
        <rect x="22" y="32" width="6" height="4" fill="#09020d" />
        <rect x="52" y="32" width="6" height="4" fill="#09020d" />
      </svg>
    `;
  }

  function createStarPortraitSVG(item) {
    let hairBack = '';
    let hairFront = '';
    if (item.hairStyle === 'long-blonde') {
      hairBack = `<path d="M24,36 Q20,76 28,96 L72,96 Q80,76 76,36 Z" fill="${item.hairColor}" />`;
      hairFront = `<path d="M28,38 Q35,18 50,18 Q65,18 72,38 Q62,27 50,29 Q38,27 28,38 Z" fill="${item.hairColor}" />`;
    } else if (item.hairStyle === 'big-curl') {
      hairBack = `<circle cx="30" cy="42" r="18" fill="${item.hairColor}" /><circle cx="70" cy="42" r="18" fill="${item.hairColor}" /><circle cx="50" cy="26" r="20" fill="${item.hairColor}" />`;
      hairFront = `<path d="M30,36 Q50,20 70,36 Q58,28 50,31 Q42,28 30,36 Z" fill="${item.hairColor}" />`;
    } else if (item.hairStyle === 'glam-wave') {
      hairBack = `<path d="M22,38 C16,65 26,92 32,96 L68,96 C74,92 84,65 78,38 Z" fill="${item.hairColor}" />`;
      hairFront = `<path d="M28,38 C32,16 68,16 72,38 C60,26 42,26 28,38 Z" fill="${item.hairColor}" />`;
    } else if (item.hairStyle === 'sleek-dark') {
      hairBack = `<path d="M27,36 L25,94 L75,94 L73,36 Z" fill="${item.hairColor}" />`;
      hairFront = `<path d="M28,39 Q50,17 72,39 L66,31 L50,28 L34,31 Z" fill="${item.hairColor}" />`;
    } else {
      hairBack = `<path d="M20,35 C12,58 20,90 30,96 L70,96 C80,90 88,58 80,35 Z" fill="${item.hairColor}" />`;
      hairFront = `<path d="M26,38 Q38,14 50,22 Q62,14 74,38 Q58,26 42,28 Z" fill="${item.hairColor}" />`;
    }

    return `
      <svg viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        <defs>
          <linearGradient id="grad_${item.id}" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="${item.bg1}" />
            <stop offset="100%" stop-color="${item.bg2}" />
          </linearGradient>
        </defs>
        <rect width="100" height="100" fill="url(#grad_${item.id})" />
        <circle cx="50" cy="46" r="36" fill="none" stroke="${item.accent}" stroke-width="2" stroke-dasharray="6 4" opacity="0.7" />
        ${hairBack}
        <path d="M22,96 C26,76 38,70 50,70 C62,70 74,76 78,96 Z" fill="#160726" stroke="${item.accent}" stroke-width="2" />
        <rect x="44" y="58" width="12" height="15" rx="4" fill="#f7c59f" />
        <ellipse cx="50" cy="44" rx="16" ry="20" fill="#fbd3b4" />
        ${hairFront}
        <rect x="36" y="40" width="12" height="7" rx="2" fill="#09020d" stroke="${item.accent}" stroke-width="1.4" />
        <rect x="52" y="40" width="12" height="7" rx="2" fill="#09020d" stroke="${item.accent}" stroke-width="1.4" />
        <line x1="48" y1="43" x2="52" y2="43" stroke="${item.accent}" stroke-width="1.5" />
        <path d="M44,54 Q50,51 56,54 Q50,59 44,54 Z" fill="#ff1e6e" />
      </svg>
    `;
  }

  function createDVDCoverSVG(item) {
    let motif = '';
    if (item.dvdTheme === 'sunset') {
      motif = `
        <circle cx="50" cy="54" r="26" fill="#ffbe0b" />
        <rect x="15" y="64" width="70" height="36" fill="#240046" />
        <line x1="15" y1="72" x2="85" y2="72" stroke="#ff2a85" stroke-width="2" />
        <line x1="15" y1="82" x2="85" y2="82" stroke="#00f0ff" stroke-width="2" />
      `;
    } else if (item.dvdTheme === 'diamonds') {
      motif = `
        <polygon points="50,18 76,46 50,82 24,46" fill="none" stroke="#00f0ff" stroke-width="3" />
        <polygon points="50,28 66,46 50,70 34,46" fill="rgba(255,42,133,0.45)" />
      `;
    } else if (item.dvdTheme === 'hero') {
      motif = `
        <polygon points="50,16 82,38 70,82 30,82 18,38" fill="#d90429" stroke="#ffd166" stroke-width="3" />
        <polygon points="50,24 62,50 48,50 56,76 34,46 48,46" fill="#ffd166" />
      `;
    } else if (item.dvdTheme === 'noir') {
      motif = `
        <rect x="18" y="18" width="64" height="64" fill="none" stroke="#f15bb5" stroke-width="2.5" />
        <circle cx="50" cy="50" r="24" fill="rgba(0,187,249,0.35)" stroke="#00bbf9" stroke-width="2" />
      `;
    } else {
      motif = `
        <path d="M24,24 L36,42 L64,42 L76,24 L72,68 L50,82 L28,68 Z" fill="rgba(255,158,0,0.4)" stroke="#ffbe0b" stroke-width="2.5" />
      `;
    }

    return `
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        <defs>
          <linearGradient id="dvd_${item.id}" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="${item.bg2}" />
            <stop offset="100%" stop-color="${item.bg1}" />
          </linearGradient>
        </defs>
        <rect width="100" height="100" fill="url(#dvd_${item.id})" />
        ${motif}
      </svg>
    `;
  }

  function shuffle(array) {
    const arr = array.slice();
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  function buildDeck() {
    const deck = [];
    PAIRS.forEach((p) => {
      deck.push({ pairId: p.id, kind: 'star', data: p, matched: false, flipped: false });
      deck.push({ pairId: p.id, kind: 'dvd', data: p, matched: false, flipped: false });
    });
    return shuffle(deck);
  }

  function updateHUD() {
    pairsCountEl.textContent = `${matchedPairs} / ${PAIRS.length}`;
    movesCountEl.textContent = String(moves);
    pileCounterEl.textContent = String(matchedPairs * 2);
  }

  function renderBoard() {
    boardEl.innerHTML = '';
    cardsData.forEach((card, idx) => {
      const cardEl = document.createElement('div');
      cardEl.className = 'card';
      cardEl.tabIndex = 0;
      cardEl.dataset.index = String(idx);
      const keyLabel = idx === 9 ? '0' : String(idx + 1);
      cardEl.setAttribute('role', 'button');
      cardEl.setAttribute('aria-label', `Karte ${keyLabel}`);

      const frontHTML =
        card.kind === 'star'
          ? `
            <div class="card-face card-front type-star">
              <div class="star-art">${createStarPortraitSVG(card.data)}</div>
              <div class="star-nameplate">${card.data.starName}</div>
            </div>
          `
          : `
            <div class="card-face card-front type-dvd">
              <div class="dvd-case">
                <div class="dvd-header">
                  <span>DVD VIDEO</span>
                  <span class="dvd-badge-night">LATE NIGHT</span>
                </div>
                <div class="dvd-art">
                  ${createDVDCoverSVG(card.data)}
                  <div class="dvd-title">${card.data.workTitle}</div>
                  <div class="dvd-year">${card.data.year}</div>
                </div>
              </div>
            </div>
          `;

      cardEl.innerHTML = `
        <div class="card-inner">
          <div class="card-face card-back">
            <span class="card-key-hint">${keyLabel}</span>
            ${createCardBackSVG()}
          </div>
          ${frontHTML}
        </div>
      `;

      cardEl.addEventListener('click', () => handleCardSelect(idx));
      cardEl.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleCardSelect(idx);
        }
      });

      boardEl.appendChild(cardEl);
    });
  }

  function flyCardToPile(cardEl) {
    const rect = cardEl.getBoundingClientRect();
    const pileRect = discardPileEl.getBoundingClientRect();

    const clone = document.createElement('div');
    clone.className = 'flying-card';
    clone.style.left = `${rect.left}px`;
    clone.style.top = `${rect.top}px`;
    clone.style.width = `${rect.width}px`;
    clone.style.height = `${rect.height}px`;
    clone.innerHTML = cardEl.querySelector('.card-front').outerHTML;
    const innerFront = clone.querySelector('.card-front');
    if (innerFront) {
      innerFront.style.transform = 'none';
      innerFront.style.position = 'relative';
      innerFront.style.width = '100%';
      innerFront.style.height = '100%';
    }
    document.body.appendChild(clone);

    cardEl.classList.add('collected');

    const targetX = pileRect.left + pileRect.width / 2 - (rect.left + rect.width / 2);
    const targetY = pileRect.top + pileRect.height / 2 - (rect.top + rect.height / 2);
    const scaleX = Math.max(0.35, (pileRect.width - 10) / rect.width);
    const scaleY = Math.max(0.35, (pileRect.height - 10) / rect.height);
    const rot = (Math.random() * 18 - 9).toFixed(1);

    requestAnimationFrame(() => {
      clone.style.transform = `translate(${targetX}px, ${targetY}px) scale(${scaleX}, ${scaleY}) rotate(${rot}deg)`;
      clone.style.opacity = '0.9';
    });

    setTimeout(() => {
      clone.remove();
      addMiniCardToPile(rot);
      discardPileEl.classList.remove('pulse');
      void discardPileEl.offsetWidth;
      discardPileEl.classList.add('pulse');
    }, 640);
  }

  function addMiniCardToPile(rot) {
    const mini = document.createElement('div');
    mini.className = 'pile-mini';
    mini.style.transform = `rotate(${rot}deg)`;
    pileCardsEl.appendChild(mini);
  }

  function clearPendingMismatch() {
    if (pendingResetTimer !== null) {
      clearTimeout(pendingResetTimer);
      pendingResetTimer = null;
    }
    flippedIndices.forEach((i) => {
      if (!cardsData[i].matched) {
        cardsData[i].flipped = false;
        const el = boardEl.children[i];
        if (el) el.classList.remove('flipped');
      }
    });
    flippedIndices = [];
  }

  function handleCardSelect(index) {
    const card = cardsData[index];
    if (!card || card.matched) return;

    if (flippedIndices.length === 2) {
      clearPendingMismatch();
    }

    if (card.flipped) return;

    ensureAudio();
    card.flipped = true;
    flippedIndices.push(index);
    const cardEl = boardEl.children[index];
    if (cardEl) cardEl.classList.add('flipped');

    if (flippedIndices.length === 2) {
      moves += 1;
      const [idxA, idxB] = flippedIndices;
      const cardA = cardsData[idxA];
      const cardB = cardsData[idxB];

      if (cardA.pairId === cardB.pairId) {
        cardA.matched = true;
        cardB.matched = true;
        matchedPairs += 1;
        updateHUD();
        playSynthSigh();

        const elA = boardEl.children[idxA];
        const elB = boardEl.children[idxB];
        if (elA) elA.classList.add('matched');
        if (elB) elB.classList.add('matched');

        flippedIndices = [];

        setTimeout(() => {
          if (elA) flyCardToPile(elA);
          if (elB) flyCardToPile(elB);
        }, 420);

        if (matchedPairs === PAIRS.length) {
          setTimeout(() => {
            winSummary.textContent = `Alle 5 Kult-Paare in ${moves} Zügen auf den Stapel befördert!`;
            winModal.classList.remove('hidden');
          }, 1150);
        }
      } else {
        updateHUD();
        playBoing();
        pendingResetTimer = setTimeout(() => {
          clearPendingMismatch();
        }, 900);
      }
    }
  }

  function startNewGame() {
    if (pendingResetTimer !== null) {
      clearTimeout(pendingResetTimer);
      pendingResetTimer = null;
    }
    flippedIndices = [];
    matchedPairs = 0;
    moves = 0;
    pileCardsEl.innerHTML = '';
    winModal.classList.add('hidden');
    cardsData = buildDeck();
    updateHUD();
    renderBoard();
  }

  soundBtn.addEventListener('click', () => {
    soundEnabled = !soundEnabled;
    soundBtn.textContent = soundEnabled ? 'SFX: AN' : 'SFX: AUS';
    if (soundEnabled) ensureAudio();
  });

  restartBtn.addEventListener('click', startNewGame);
  playAgainBtn.addEventListener('click', startNewGame);

  window.addEventListener('keydown', (e) => {
    if (e.key >= '1' && e.key <= '9') {
      handleCardSelect(Number(e.key) - 1);
    } else if (e.key === '0') {
      handleCardSelect(9);
    } else if (e.key === 'r' || e.key === 'R') {
      startNewGame();
    }
  });

  startNewGame();
})();
