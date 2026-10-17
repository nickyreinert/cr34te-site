(function () {
  const NUM_RINGS = 5;
  const NUM_SECTORS = 16;
  const TICK_INTERVAL = 180;

  let canvas, ctx;
  let canvasSize = 300;
  let score = 0;
  let highScore = 0;
  let isRunning = false;
  let gameTimer = null;

  const DIR = { CW: 'CW', CCW: 'CCW', IN: 'IN', OUT: 'OUT' };

  let snake = [];
  let currentDir = DIR.CW;
  let inputQueue = [];
  let food = { ring: 2, sector: 8 };

  let scoreEl, highScoreEl, overlayEl, overlayTitleEl, overlayMsgEl, startBtn;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  function init() {
    canvas = document.getElementById('game-canvas');
    ctx = canvas.getContext('2d');
    scoreEl = document.getElementById('score');
    highScoreEl = document.getElementById('high-score');
    overlayEl = document.getElementById('overlay');
    overlayTitleEl = document.getElementById('overlay-title');
    overlayMsgEl = document.getElementById('overlay-msg');
    startBtn = document.getElementById('start-btn');

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    document.getElementById('btn-cw').addEventListener('click', (e) => { e.preventDefault(); queueInput(DIR.CW); });
    document.getElementById('btn-ccw').addEventListener('click', (e) => { e.preventDefault(); queueInput(DIR.CCW); });
    document.getElementById('btn-in').addEventListener('click', (e) => { e.preventDefault(); queueInput(DIR.IN); });
    document.getElementById('btn-out').addEventListener('click', (e) => { e.preventDefault(); queueInput(DIR.OUT); });

    startBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      startGame();
    });

    canvas.addEventListener('click', () => {
      if (!isRunning) startGame();
    });

    window.addEventListener('keydown', handleKeyDown);

    draw();
  }

  function resizeCanvas() {
    const wrapper = document.getElementById('arena-wrapper');
    if (!wrapper || !canvas) return;
    const size = Math.min(wrapper.clientWidth - 20, wrapper.clientHeight - 20, 380);
    canvasSize = Math.max(size, 220);
    canvas.width = canvasSize;
    canvas.height = canvasSize;
    draw();
  }

  function queueInput(dir) {
    if (inputQueue.length < 2) {
      inputQueue.push(dir);
    }
  }

  function handleKeyDown(e) {
    switch (e.key) {
      case 'ArrowLeft':
      case 'a':
      case 'A':
        queueInput(DIR.CCW);
        e.preventDefault();
        break;
      case 'ArrowRight':
      case 'd':
      case 'D':
        queueInput(DIR.CW);
        e.preventDefault();
        break;
      case 'ArrowDown':
      case 's':
      case 'S':
        queueInput(DIR.IN);
        e.preventDefault();
        break;
      case 'ArrowUp':
      case 'w':
      case 'W':
        queueInput(DIR.OUT);
        e.preventDefault();
        break;
      case ' ':
      case 'Enter':
        if (!isRunning) startGame();
        e.preventDefault();
        break;
    }
  }

  function startGame() {
    score = 0;
    scoreEl.textContent = score;
    isRunning = true;
    inputQueue = [];
    currentDir = DIR.CW;

    snake = [
      { ring: 2, sector: 4 },
      { ring: 2, sector: 3 },
      { ring: 2, sector: 2 }
    ];

    spawnFood();
    overlayEl.classList.remove('active');

    if (gameTimer) clearInterval(gameTimer);
    gameTimer = setInterval(gameTick, TICK_INTERVAL);
    draw();
  }

  function spawnFood() {
    let valid = false;
    while (!valid) {
      const r = Math.floor(Math.random() * NUM_RINGS);
      const s = Math.floor(Math.random() * NUM_SECTORS);
      const onSnake = snake.some(seg => seg.ring === r && seg.sector === s);
      if (!onSnake) {
        food = { ring: r, sector: s };
        valid = true;
      }
    }
  }

  function gameTick() {
    if (inputQueue.length > 0) {
      currentDir = inputQueue.shift();
    }

    const head = snake[0];
    let nextHead = { ring: head.ring, sector: head.sector };

    if (currentDir === DIR.CW) {
      nextHead.sector = (head.sector + 1) % NUM_SECTORS;
    } else if (currentDir === DIR.CCW) {
      nextHead.sector = (head.sector - 1 + NUM_SECTORS) % NUM_SECTORS;
    } else if (currentDir === DIR.OUT) {
      nextHead.ring = head.ring + 1;
    } else if (currentDir === DIR.IN) {
      if (head.ring > 0) {
        nextHead.ring = head.ring - 1;
      } else {
        nextHead.sector = (head.sector + NUM_SECTORS / 2) % NUM_SECTORS;
        nextHead.ring = 0;
      }
    }

    if (nextHead.ring >= NUM_RINGS) {
      gameOver('Banden-Crash! Du bist aus dem Kreis gelaufen.');
      return;
    }

    const selfHit = snake.some((seg, idx) => {
      if (idx === snake.length - 1 && !(nextHead.ring === food.ring && nextHead.sector === food.sector)) {
        return false;
      }
      return seg.ring === nextHead.ring && seg.sector === nextHead.sector;
    });

    if (selfHit) {
      gameOver('In den eigenen Schwanz gebissen!');
      return;
    }

    snake.unshift(nextHead);

    if (nextHead.ring === food.ring && nextHead.sector === food.sector) {
      score += 10;
      scoreEl.textContent = score;
      if (score > highScore) {
        highScore = score;
        highScoreEl.textContent = highScore;
      }
      spawnFood();
    } else {
      snake.pop();
    }

    draw();
  }

  function gameOver(msg) {
    isRunning = false;
    clearInterval(gameTimer);
    overlayTitleEl.textContent = 'Game Over!';
    overlayMsgEl.textContent = msg + ` Finale Punkte: ${score}`;
    startBtn.textContent = 'Erneut Spielen';
    overlayEl.classList.add('active');
  }

  function getCellCenter(ring, sector) {
    const cx = canvasSize / 2;
    const cy = canvasSize / 2;
    const maxR = canvasSize / 2 - 12;

    const ringStep = maxR / NUM_RINGS;
    const r = (ring + 0.5) * ringStep;

    const angleStep = (2 * Math.PI) / NUM_SECTORS;
    const angle = sector * angleStep - Math.PI / 2 + angleStep / 2;

    return {
      x: cx + r * Math.cos(angle),
      y: cy + r * Math.sin(angle),
      angle: angle,
      r: r
    };
  }

  function draw() {
    if (!ctx) return;
    ctx.clearRect(0, 0, canvasSize, canvasSize);

    const cx = canvasSize / 2;
    const cy = canvasSize / 2;
    const maxR = canvasSize / 2 - 12;
    const ringStep = maxR / NUM_RINGS;
    const angleStep = (2 * Math.PI) / NUM_SECTORS;

    ctx.strokeStyle = 'rgba(82, 183, 136, 0.15)';
    ctx.lineWidth = 1;

    for (let i = 1; i <= NUM_RINGS; i++) {
      ctx.beginPath();
      ctx.arc(cx, cy, i * ringStep, 0, 2 * Math.PI);
      ctx.stroke();
    }

    for (let s = 0; s < NUM_SECTORS; s++) {
      const a = s * angleStep - Math.PI / 2;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + maxR * Math.cos(a), cy + maxR * Math.sin(a));
      ctx.stroke();
    }

    ctx.fillStyle = 'rgba(45, 106, 79, 0.2)';
    ctx.beginPath();
    ctx.arc(cx, cy, ringStep * 0.4, 0, 2 * Math.PI);
    ctx.fill();

    const foodPos = getCellCenter(food.ring, food.sector);
    ctx.save();
    ctx.translate(foodPos.x, foodPos.y);

    ctx.fillStyle = '#ffb703';
    ctx.shadowColor = '#ffb703';
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.arc(0, 0, ringStep * 0.3, 0, 2 * Math.PI);
    ctx.fill();

    ctx.fillStyle = '#fb8500';
    ctx.beginPath();
    ctx.arc(-1, -1, ringStep * 0.15, 0, 2 * Math.PI);
    ctx.fill();
    ctx.restore();

    for (let i = snake.length - 1; i >= 0; i--) {
      const seg = snake[i];
      const pos = getCellCenter(seg.ring, seg.sector);

      ctx.save();
      ctx.translate(pos.x, pos.y);

      if (i === 0) {
        ctx.rotate(pos.angle + Math.PI / 2);

        ctx.fillStyle = '#2d6a4f';
        ctx.shadowColor = '#52b788';
        ctx.shadowBlur = 4;

        ctx.beginPath();
        ctx.moveTo(-ringStep * 0.25, ringStep * 0.2);
        ctx.lineTo(-ringStep * 0.15, -ringStep * 0.35);
        ctx.lineTo(0, -ringStep * 0.42);
        ctx.lineTo(ringStep * 0.15, -ringStep * 0.35);
        ctx.lineTo(ringStep * 0.25, ringStep * 0.2);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = '#ffb703';
        ctx.beginPath();
        ctx.arc(-ringStep * 0.15, 0, 3, 0, 2 * Math.PI);
        ctx.arc(ringStep * 0.15, 0, 3, 0, 2 * Math.PI);
        ctx.fill();

        ctx.fillStyle = '#000';
        ctx.beginPath();
        ctx.arc(-ringStep * 0.15, 0, 1.5, 0, 2 * Math.PI);
        ctx.arc(ringStep * 0.15, 0, 1.5, 0, 2 * Math.PI);
        ctx.fill();

        ctx.fillStyle = '#1b4d2e';
        ctx.beginPath();
        ctx.arc(-ringStep * 0.05, -ringStep * 0.35, 1, 0, 2 * Math.PI);
        ctx.arc(ringStep * 0.05, -ringStep * 0.35, 1, 0, 2 * Math.PI);
        ctx.fill();

      } else {
        const segRadius = Math.max(ringStep * 0.28, 4);

        ctx.fillStyle = (i % 2 === 0) ? '#40916c' : '#52b788';
        ctx.beginPath();
        ctx.arc(0, 0, segRadius, 0, 2 * Math.PI);
        ctx.fill();

        ctx.fillStyle = '#1b4d2e';
        ctx.beginPath();
        ctx.moveTo(0, -segRadius - 3);
        ctx.lineTo(-3, -segRadius + 2);
        ctx.lineTo(3, -segRadius + 2);
        ctx.closePath();
        ctx.fill();
      }

      ctx.restore();
    }
  }
})();