let audioCtx, masterGain, synthLoop, audioAnalyser;
let isPlaying = false;
let currentPitch = 1.0;
let leftRotation = 0;
let rightRotation = 0;
let isScratching = false;
let scratchBufferSource = null;

const startOverlay = document.getElementById('start-overlay');
const startBtn = document.getElementById('start-btn');
const pitchSlider = document.getElementById('pitch-slider');
const applauseBtn = document.getElementById('applause-btn');

const oscCanvas = document.getElementById('oscilloscope');
const oscCtx = oscCanvas.getContext('2d');
const specCanvas = document.getElementById('spectrum');
const specCtx = specCanvas.getContext('2d');

function resizeCanvases() {
  oscCanvas.width = oscCanvas.clientWidth;
  oscCanvas.height = oscCanvas.clientHeight;
  specCanvas.width = specCanvas.clientWidth;
  specCanvas.height = specCanvas.clientHeight;
}
window.addEventListener('resize', resizeCanvases);

function initAudio() {
  audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  masterGain = audioCtx.createGain();
  masterGain.gain.value = 0.6;

  audioAnalyser = audioCtx.createAnalyser();
  audioAnalyser.fftSize = 64;

  masterGain.connect(audioAnalyser);
  audioAnalyser.connect(audioCtx.destination);

  startTechnoLoop();
  drawVisualizers();
}

function startTechnoLoop() {
  const tempo = 128;
  const stepTime = 60 / tempo / 4;
  let step = 0;

  function scheduleNext() {
    if (!isPlaying) return;
    const now = audioCtx.currentTime;
    
    // 8-bit Kick drum
    if (step % 4 === 0) {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(130 * currentPitch, now);
      osc.frequency.exponentialRampToValueAtTime(30 * currentPitch, now + 0.1);
      gain.gain.setValueAtTime(0.8, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.12);
      osc.connect(gain);
      gain.connect(masterGain);
      osc.start(now);
      osc.stop(now + 0.12);
    }

    // 8-bit Hi-Hat
    if (step % 2 === 1) {
      const bufferSize = audioCtx.sampleRate * 0.03;
      const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
      const noise = audioCtx.createBufferSource();
      noise.buffer = buffer;
      noise.playbackRate.value = currentPitch;
      const filter = audioCtx.createBiquadFilter();
      filter.type = 'highpass';
      filter.frequency.value = 5000;
      const gain = audioCtx.createGain();
      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.04);
      noise.connect(filter);
      filter.connect(gain);
      gain.connect(masterGain);
      noise.start(now);
    }

    // 8-bit Synth Synth Baseline / Arp
    const notes = [110, 130.81, 146.83, 164.81, 196.00, 220.00];
    if (step % 2 === 0) {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sawtooth';
      const note = notes[(step / 2) % notes.length];
      osc.frequency.setValueAtTime(note * currentPitch, now);
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + stepTime * 1.5);
      osc.connect(gain);
      gain.connect(masterGain);
      osc.start(now);
      osc.stop(now + stepTime * 1.5);
    }

    step = (step + 1) % 16;
    setTimeout(scheduleNext, stepTime * 1000);
  }

  isPlaying = true;
  scheduleNext();
}

function triggerScratchSound(speed) {
  if (!audioCtx) return;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = 'sawtooth';
  const baseFreq = 400 + Math.abs(speed) * 10;
  osc.frequency.setValueAtTime(baseFreq * currentPitch, audioCtx.currentTime);
  osc.frequency.exponentialRampToValueAtTime((baseFreq + 300) * currentPitch, audioCtx.currentTime + 0.05);
  gain.gain.setValueAtTime(0.4, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.05);
  osc.connect(gain);
  gain.connect(masterGain);
  osc.start();
  osc.stop(audioCtx.currentTime + 0.05);
}

function triggerApplause() {
  if (!audioCtx) return;
  const duration = 1.5;
  const now = audioCtx.currentTime;
  const bufferSize = audioCtx.sampleRate * duration;
  const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (audioCtx.sampleRate * 0.4));
  }
  
  for (let i = 0; i < 15; i++) {
    const clapTime = now + Math.random() * duration;
    const noise = audioCtx.createBufferSource();
    noise.buffer = buffer;
    const gain = audioCtx.createGain();
    gain.gain.setValueAtTime(0.3, clapTime);
    gain.gain.exponentialRampToValueAtTime(0.01, clapTime + 0.2);
    noise.connect(gain);
    gain.connect(masterGain);
    noise.start(clapTime);
  }
}

function setupTurntables() {
  ['left-turntable', 'right-turntable'].forEach((id, idx) => {
    const el = document.getElementById(id);
    const jog = el.querySelector('.jog-wheel');
    let lastY = 0;
    let active = false;

    const start = (e) => {
      active = true;
      lastY = e.touches ? e.touches[0].clientY : e.clientY;
    };

    const move = (e) => {
      if (!active) return;
      const currentY = e.touches ? e.touches[0].clientY : e.clientY;
      const delta = currentY - lastY;
      lastY = currentY;
      
      if (idx === 0) leftRotation += delta * 5;
      else rightRotation += delta * 5;
      
      jog.style.transform = `rotate(${idx === 0 ? leftRotation : rightRotation}deg)`;
      if (Math.abs(delta) > 2) {
        triggerScratchSound(delta);
      }
    };

    const stop = () => { active = false; };

    el.addEventListener('mousedown', start);
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', stop);

    el.addEventListener('touchstart', start);
    window.addEventListener('touchmove', move);
    window.addEventListener('touchend', stop);
  });
}

function drawVisualizers() {
  requestAnimationFrame(drawVisualizers);
  if (!audioAnalyser) return;

  // Oscilloscope
  const timeData = new Uint8Array(audioAnalyser.fftSize);
  audioAnalyser.getByteTimeDomainData(timeData);
  oscCtx.fillStyle = '#050010';
  oscCtx.fillRect(0, 0, oscCanvas.width, oscCanvas.height);
  oscCtx.lineWidth = 3;
  oscCtx.strokeStyle = '#00f0ff';
  oscCtx.beginPath();
  const sliceWidth = oscCanvas.width / timeData.length;
  let x = 0;
  for (let i = 0; i < timeData.length; i++) {
    const v = timeData[i] / 128.0;
    const y = (v * oscCanvas.height) / 2;
    if (i === 0) oscCtx.moveTo(x, y);
    else oscCtx.lineTo(x, y);
    x += sliceWidth;
  }
  oscCtx.stroke();

  // Frequency Spectrum
  const freqData = new Uint8Array(audioAnalyser.frequencyBinCount);
  audioAnalyser.getByteFrequencyData(freqData);
  specCtx.fillStyle = '#050010';
  specCtx.fillRect(0, 0, specCanvas.width, specCanvas.height);
  const barWidth = (specCanvas.width / freqData.length) * 1.5;
  let barX = 0;
  for (let i = 0; i < freqData.length; i++) {
    const barHeight = (freqData[i] / 255) * specCanvas.height;
    specCtx.fillStyle = `hsl(${i * 12 + 280}, 100%, 50%)`;
    specCtx.fillRect(barX, specCanvas.height - barHeight, barWidth - 2, barHeight);
    barX += barWidth;
  }
}

startBtn.addEventListener('click', () => {
  startOverlay.style.display = 'none';
  resizeCanvases();
  initAudio();
  setupTurntables();
});

pitchSlider.addEventListener('input', (e) => {
  currentPitch = parseFloat(e.target.value);
});

applauseBtn.addEventListener('click', triggerApplause);
