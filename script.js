document.addEventListener('DOMContentLoaded', () => {
  const monaCanvas = document.getElementById('monaCanvas');
  const geishaCanvas = document.getElementById('geishaCanvas');
  const ctxMona = monaCanvas.getContext('2d');
  const ctxGeisha = geishaCanvas.getContext('2d');
  const noseHotspot = document.getElementById('noseHotspot');
  const frame = document.getElementById('paintingFrame');
  const replayBtn = document.getElementById('replayBtn');
  const hintOverlay = document.getElementById('hintOverlay');
  const robber1 = document.getElementById('robber1');
  const robber2 = document.getElementById('robber2');
  const grandpa = document.getElementById('grandpa');
  const son = document.getElementById('son');
  let isAnimating = false, audioCtx = null, currentMusic = null, eyeZoomActive = false;

  function initAudio() {
    if (!audioCtx) {
      const Audio = window.AudioContext || window.webkitAudioContext;
      if (Audio) audioCtx = new Audio();
    }
  }
  function playTone(freq, duration, type = 'square') {
    if (!audioCtx) return;
    const osc = audioCtx.createOscillator(), gain = audioCtx.createGain();
    osc.type = type; osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + duration);
    osc.connect(gain); gain.connect(audioCtx.destination);
    osc.start(); osc.stop(audioCtx.currentTime + duration);
  }
  function play8BitMelody(notes, speed = 250) {
    stopMusic();
    let index = 0;
    currentMusic = setInterval(() => {
      if (notes[index]) playTone(notes[index], 0.22);
      index = (index + 1) % notes.length;
    }, speed);
  }
  function stopMusic() { if (currentMusic) { clearInterval(currentMusic); currentMusic = null; } }
  const marseillaise = [392,392,392,523,523,587,587,659,523,440,523,392];
  const bigInJapan = [440,440,523,440,392,349,392,440,349,330,293,330];

  function drawMonaLisa(pupilX = 0, pupilY = 0) {
    ctxMona.clearRect(0, 0, 120, 160);
    ctxMona.fillStyle = '#3a4f33'; ctxMona.fillRect(0, 0, 120, 160);
    ctxMona.fillStyle = '#2b3a26'; ctxMona.fillRect(0, 90, 120, 70);
    ctxMona.fillStyle = '#1e2b1a'; ctxMona.fillRect(0, 110, 120, 50);
    ctxMona.fillStyle = '#111'; ctxMona.fillRect(35, 30, 50, 80); ctxMona.fillRect(30, 45, 60, 90);
    ctxMona.fillStyle = '#e8beac'; ctxMona.fillRect(45, 45, 30, 40); ctxMona.fillRect(48, 85, 24, 20);
    ctxMona.fillStyle = '#4a3b2c'; ctxMona.fillRect(32, 100, 56, 60);
    ctxMona.fillStyle = '#2d4a27'; ctxMona.fillRect(28, 115, 64, 45);
    ctxMona.fillStyle = '#d4af37'; ctxMona.fillRect(45, 102, 30, 6);
    ctxMona.fillStyle = '#fff'; ctxMona.fillRect(50, 58, 6, 4); ctxMona.fillRect(64, 58, 6, 4);
    ctxMona.fillStyle = '#2b1a0e';
    const x = Math.max(-1.5, Math.min(1.5, pupilX)), y = Math.max(-1, Math.min(1, pupilY));
    ctxMona.fillRect(52+x, 59+y, 3, 3); ctxMona.fillRect(66+x, 59+y, 3, 3);
    ctxMona.fillStyle = '#6e503b'; ctxMona.fillRect(49,55,8,2); ctxMona.fillRect(63,55,8,2);
    ctxMona.fillStyle = '#c49885'; ctxMona.fillRect(58,62,4,10);
    ctxMona.fillStyle = '#8b4513'; ctxMona.fillRect(54,76,12,2);
  }
  function drawGeisha() {
    ctxGeisha.clearRect(0, 0, 120, 160);
    ctxGeisha.fillStyle = '#7a1c27'; ctxGeisha.fillRect(0,0,120,160);
    ctxGeisha.fillStyle = '#c53030'; ctxGeisha.beginPath(); ctxGeisha.arc(60,70,45,0,Math.PI*2); ctxGeisha.fill();
    ctxGeisha.fillStyle = '#0d0d0d'; ctxGeisha.fillRect(30,25,60,50);
    ctxGeisha.fillStyle = '#d4af37'; ctxGeisha.fillRect(80,30,12,6);
    ctxGeisha.fillStyle = '#f7fafc'; ctxGeisha.fillRect(42,45,36,40); ctxGeisha.fillRect(48,85,24,15);
    ctxGeisha.fillStyle = '#2b6cb0'; ctxGeisha.fillRect(25,100,70,60);
    ctxGeisha.fillStyle = '#c53030'; ctxGeisha.fillRect(45,100,30,60);
    ctxGeisha.fillStyle = '#f6e05e'; ctxGeisha.fillRect(48,115,24,45);
    ctxGeisha.fillStyle = '#1a202c'; ctxGeisha.fillRect(48,58,8,2); ctxGeisha.fillRect(64,58,8,2);
    ctxGeisha.fillStyle = '#e53e3e'; ctxGeisha.fillRect(55,74,10,4); ctxGeisha.fillRect(44,66,6,3); ctxGeisha.fillRect(70,66,6,3);
  }
  drawMonaLisa(); drawGeisha();

  window.addEventListener('mousemove', e => {
    if (isAnimating || geishaCanvas.style.display === 'block') return;
    initAudio(); if (!currentMusic) play8BitMelody(marseillaise, 280);
    const rect = monaCanvas.getBoundingClientRect();
    drawMonaLisa(((e.clientX - rect.left - rect.width/2) / (window.innerWidth/2))*2,
      ((e.clientY - rect.top - rect.height/2) / (window.innerHeight/2))*2);
  });

  noseHotspot.addEventListener('click', startHeistSequence);
  function startHeistSequence() {
    if (isAnimating) return;
    isAnimating = true; initAudio(); hintOverlay.style.display = 'none';
    playTone(150, 0.4, 'sawtooth'); frame.style.transform = 'rotate(-5deg) scale(1.05)';
    setTimeout(() => {
      frame.style.transform = 'rotate(0deg)'; robber1.style.right = '40%'; robber2.style.right = '32%';
      setTimeout(() => {
        robber1.querySelector('.speech-bubble').style.opacity = '1';
        robber1.classList.add('carrying'); robber2.classList.add('carrying');
        frame.style.transform = 'translate(100vw, -20px) rotate(15deg)'; frame.style.opacity = '0';
        robber1.style.right = '-200px'; robber2.style.right = '-200px';
        setTimeout(startGeishaPlacement, 1200);
      }, 1000);
    }, 600);
  }
  function startGeishaPlacement() {
    monaCanvas.style.display = 'none'; geishaCanvas.style.display = 'block';
    frame.style.transform = 'translate(-100vw, -20px) rotate(-15deg)';
    play8BitMelody(bigInJapan, 220); grandpa.style.left = '35%'; son.style.left = '43%';
    grandpa.classList.add('carrying'); son.classList.add('carrying');
    setTimeout(() => {
      frame.style.opacity = '1'; frame.style.transform = 'none';
      grandpa.classList.remove('carrying'); son.classList.remove('carrying');
      setTimeout(() => {
        son.querySelector('.speech-bubble').style.opacity = '1';
        grandpa.style.left = '120vw'; son.style.left = '120vw';
        setTimeout(() => { replayBtn.style.display = 'block'; }, 1200);
      }, 1200);
    }, 1000);
  }

  function startEndlessEyeZoom() {
    if (eyeZoomActive || geishaCanvas.style.display !== 'block') return;
    eyeZoomActive = true;
    hintOverlay.style.display = 'none';
    frame.style.transition = 'transform 2.4s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.25s';
    frame.style.transformOrigin = '50% 37%';
    function cycle() {
      if (!eyeZoomActive) return;
      frame.style.transform = 'scale(8)';
      setTimeout(() => {
        if (!eyeZoomActive) return;
        frame.style.transition = 'none';
        frame.style.transform = 'none';
        void frame.offsetWidth;
        frame.style.transition = 'transform 2.4s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.25s';
        setTimeout(cycle, 650);
      }, 2400);
    }
    cycle();
  }
  geishaCanvas.addEventListener('click', startEndlessEyeZoom);
  replayBtn.addEventListener('click', () => {
    eyeZoomActive = false;
    replayBtn.style.display = 'none'; monaCanvas.style.display = 'block'; geishaCanvas.style.display = 'none';
    frame.style.transition = ''; frame.style.transformOrigin = ''; frame.style.transform = 'none'; frame.style.opacity = '1';
    robber1.style.right = '-120px'; robber2.style.right = '-120px';
    grandpa.style.left = '-120px'; son.style.left = '-120px';
    [robber1, robber2, grandpa, son].forEach(el => el.classList.remove('carrying'));
    document.querySelectorAll('.speech-bubble').forEach(b => b.style.opacity = '0');
    drawMonaLisa(); play8BitMelody(marseillaise, 280); isAnimating = false;
  });
});