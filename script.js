const canvas = document.querySelector('#game');
const context = canvas.getContext('2d');
const scoreEl = document.querySelector('#score');
const bestEl = document.querySelector('#best');
const statusEl = document.querySelector('#status');
const playButton = document.querySelector('#play');
const directions = document.querySelectorAll('[data-direction]');

const cells = 20;
const unit = canvas.width / cells;
const keyToDirection = {
  ArrowUp: 'up', w: 'up', W: 'up', ArrowDown: 'down', s: 'down', S: 'down',
  ArrowLeft: 'left', a: 'left', A: 'left', ArrowRight: 'right', d: 'right', D: 'right'
};
const moves = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
const opposite = { up: 'down', down: 'up', left: 'right', right: 'left' };
let snake;
let fruit;
let direction;
let queuedDirection;
let score;
let best = Number(localStorage.getItem('cr34te-snake-best')) || 0;
let running = false;
let timer;

function reset() {
  snake = [{ x: 10, y: 10 }, { x: 9, y: 10 }, { x: 8, y: 10 }];
  direction = 'right';
  queuedDirection = 'right';
  score = 0;
  fruit = placeFruit();
  updateScore();
  draw();
}

function placeFruit() {
  let next;
  do next = { x: Math.floor(Math.random() * cells), y: Math.floor(Math.random() * cells) };
  while (snake.some(part => part.x === next.x && part.y === next.y));
  return next;
}

function updateScore() {
  scoreEl.textContent = String(score).padStart(3, '0');
  bestEl.textContent = String(best).padStart(3, '0');
}

function setDirection(next) {
  if (!running || next === opposite[direction]) return;
  queuedDirection = next;
}

function start() {
  clearInterval(timer);
  reset();
  running = true;
  playButton.classList.add('is-hidden');
  statusEl.textContent = 'Stay sharp.';
  timer = setInterval(step, 120);
}

function end() {
  running = false;
  clearInterval(timer);
  statusEl.textContent = `Game over — ${score} points`;
  playButton.textContent = 'Play again';
  playButton.classList.remove('is-hidden');
}

function step() {
  direction = queuedDirection;
  const [dx, dy] = moves[direction];
  const head = { x: snake[0].x + dx, y: snake[0].y + dy };
  const ate = head.x === fruit.x && head.y === fruit.y;
  const body = ate ? snake : snake.slice(0, -1);
  const collided = head.x < 0 || head.y < 0 || head.x >= cells || head.y >= cells || body.some(part => part.x === head.x && part.y === head.y);
  if (collided) return end();
  snake.unshift(head);
  if (ate) {
    score += 10;
    if (score > best) {
      best = score;
      localStorage.setItem('cr34te-snake-best', String(best));
    }
    fruit = placeFruit();
    updateScore();
  } else snake.pop();
  draw();
}

function draw() {
  context.fillStyle = '#111a13';
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.strokeStyle = 'rgba(184,239,131,.08)';
  context.lineWidth = 1;
  for (let i = 1; i < cells; i += 1) {
    context.beginPath(); context.moveTo(i * unit, 0); context.lineTo(i * unit, canvas.height); context.stroke();
    context.beginPath(); context.moveTo(0, i * unit); context.lineTo(canvas.width, i * unit); context.stroke();
  }
  context.fillStyle = '#ff907c';
  context.beginPath();
  context.arc((fruit.x + .5) * unit, (fruit.y + .5) * unit, unit * .28, 0, Math.PI * 2);
  context.fill();
  snake.forEach((part, index) => {
    context.fillStyle = index === 0 ? '#d3ffab' : '#b8ef83';
    context.fillRect(part.x * unit + 2, part.y * unit + 2, unit - 4, unit - 4);
  });
}

document.addEventListener('keydown', event => {
  const next = keyToDirection[event.key];
  if (next) { event.preventDefault(); setDirection(next); }
  if (event.key === ' ' && !running) { event.preventDefault(); start(); }
});
directions.forEach(button => button.addEventListener('click', () => setDirection(button.dataset.direction)));
playButton.addEventListener('click', start);
reset();
