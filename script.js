// Web Audio 8-Bit Chiptune Player
let audioCtx = null;
let masterGain = null;
let analyser = null;
let isPlaying = false;
let isPaused = false;
let currentTrackIndex = 0;
let trackStartTime = 0;
let pauseOffset = 0;
let trackTimerInterval = null;
let audioSchedulerInterval = null;

const TRACKS = [
  {
    title: "1. Hyper Rave (8-Bit 20s)",
    num: "01",
    duration: 20,
    bpm: 165,
    notes: [
      { note: "C4", dur: 0.25 }, { note: "C4", dur: 0.25 }, { note: "DS4", dur: 0.25 }, { note: "F4", dur: 0.25 },
      { note: "G4", dur: 0.5 }, { note: "DS4", dur: 0.25 }, { note: "F4", dur: 0.25 }, { note: "G4", dur: 0.5 },
      { note: "AS4", dur: 0.5 }, { note: "C5", dur: 0.5 }, { note: "AS4", dur: 0.25 }, { note: "G4", dur: 0.25 },
      { note: "F4", dur: 0.5 }, { note: "DS4", dur: 0.5 }, { note: "C4", dur: 0.5 }, { note: "REST", dur: 0.25 },
      { note: "C4", dur: 0.25 }, { note: "C4", dur: 0.25 }, { note: "DS4", dur: 0.25 }, { note: "F4", dur: 0.25 },
      { note: "G4", dur: 0.5 }, { note: "DS4", dur: 0.25 }, { note: "F4", dur: 0.25 }, { note: "G4", dur: 0.5 },
      { note: "C5", dur: 0.5 }, { note: "DS5", dur: 0.5 }, { note: "D5", dur: 0.5 }, { note: "C5", dur: 0.5 }
    ]
  },
  {
    title: "2. Rainbow Dreams (8-Bit 20s)",
    num: "02",
    duration: 20,
    bpm: 172,
    notes: [
      { note: "C5", dur: 0.5 }, { note: "C6", dur: 0.5 }, { note: "B5", dur: 0.25 }, { note: "G5", dur: 0.25 },
      { note: "A5", dur: 0.25 }, { note: "B5", dur: 0.25 }, { note: "C6", dur: 0.75 }, { note: "A5", dur: 0.25 },
      { note: "G5", dur: 0.5 }, { note: "E5", dur: 0.25 }, { note: "F5", dur: 0.25 }, { note: "G5", dur: 0.5 },
      { note: "A5", dur: 0.5 }, { note: "F5", dur: 0.5 }, { note: "D5", dur: 0.5 }, { note: "E5", dur: 0.25 },
      { note: "F5", dur: 0.25 }, { note: "G5", dur: 0.5 }, { note: "E5", dur: 0.5 }, { note: "C5", dur: 0.5 }
    ]
  },
  {
    title: "3. Firestarter Beat (8-Bit 20s)",
    num: "03",
    duration: 20,
    bpm: 140,
    notes: [
      { note: "FS2", dur: 0.25 }, { note: "FS2", dur: 0.25 }, { note: "A2", dur: 0.25 }, { note: "GS2", dur: 0.25 },
      { note: "FS2", dur: 0.25 }, { note: "FS2", dur: 0.25 }, { note: "C3", dur: 0.25 }, { note: "B2", dur: 0.25 },
      { note: "FS2", dur: 0.25 }, { note: "FS2", dur: 0.25 }, { note: "A2", dur: 0.25 }, { note: "GS2", dur: 0.25 },
      { note: "FS3", dur: 0.125 }, { note: "E3", dur: 0.125 }, { note: "FS3", dur: 0.25 }, { note: "REST", dur: 0.25 }
    ]
  }
];

const NOTE_FREQS = {
  "REST": 0,
  "FS2": 92.50, "GS2": 103.83, "A2": 110.00, "B2": 123.47,
  "C3": 130.81, "E3": 164.81, "FS3": 185.00,
  "C4": 261.63, "DS4": 311.13, "F4": 349.23, "G4": 392.00, "AS4": 466.16,
  "C5": 523.25, "D5": 587.33, "DS5": 622.25, "E5": 659.25, "F5": 698.46, "G5": 783.99, "A5": 880.00, "B5": 987.77,
  "C6": 1046.50
};

function initAudio() {
  if (!audioCtx) {
    const AudioCtxClass = window.AudioContext || window.webkitAudioContext;
    audioCtx = new AudioCtxClass();
    masterGain = audioCtx.createGain();
    analyser = audioCtx.createAnalyser();
    analyser.fftSize = 32;
    masterGain.connect(analyser);
    analyser.connect(audioCtx.destination);
    
    const volInput = document.getElementById('vol-slider');
    if (volInput) {
      masterGain.gain.value = volInput.value / 100;
    }
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
}

function playNote(freq, duration, time) {
  if (freq === 0 || !audioCtx) return;
  
  const osc = audioCtx.createOscillator();
  const noteGain = audioCtx.createGain();
  
  osc.type = 'square';
  osc.frequency.setValueAtTime(freq, time);
  
  noteGain.gain.setValueAtTime(0.12, time);
  noteGain.gain.exponentialRampToValueAtTime(0.001, time + duration - 0.02);
  
  osc.connect(noteGain);
  noteGain.connect(masterGain);
  
  osc.start(time);
  osc.stop(time + duration);

  const bassOsc = audioCtx.createOscillator();
  const bassGain = audioCtx.createGain();
  bassOsc.type = 'triangle';
  bassOsc.frequency.setValueAtTime(freq / 2, time);
  
  bassGain.gain.setValueAtTime(0.15, time);
  bassGain.gain.exponentialRampToValueAtTime(0.001, time + duration - 0.01);
  
  bassOsc.connect(bassGain);
  bassGain.connect(masterGain);
  
  bassOsc.start(time);
  bassOsc.stop(time + duration);
}

function startPlayback(offset = 0) {
  initAudio();
  stopAudioScheduler();
  
  isPlaying = true;
  isPaused = false;
  
  const track = TRACKS[currentTrackIndex];
  trackStartTime = audioCtx.currentTime - offset;
  
  let nextNoteTime = audioCtx.currentTime;
  let noteIdx = 0;
  
  let accumulatedTime = 0;
  while (accumulatedTime < offset) {
    const n = track.notes[noteIdx % track.notes.length];
    accumulatedTime += n.dur;
    noteIdx++;
  }

  audioSchedulerInterval = setInterval(() => {
    const elapsed = audioCtx.currentTime - trackStartTime;
    if (elapsed >= track.duration) {
      nextTrack();
      return;
    }
    
    while (nextNoteTime < audioCtx.currentTime + 0.2) {
      const currentNote = track.notes[noteIdx % track.notes.length];
      const freq = NOTE_FREQS[currentNote.note] || 0;
      playNote(freq, currentNote.dur, nextNoteTime);
      nextNoteTime += currentNote.dur;
      noteIdx++;
    }
  }, 50);

  updateUIState();
  startTimerUI();
}

function pausePlayback() {
  if (!isPlaying) return;
  isPaused = true;
  isPlaying = false;
  pauseOffset = audioCtx.currentTime - trackStartTime;
  stopAudioScheduler();
  clearInterval(trackTimerInterval);
  updateUIState();
}

function stopPlayback() {
  isPlaying = false;
  isPaused = false;
  pauseOffset = 0;
  stopAudioScheduler();
  clearInterval(trackTimerInterval);
  
  document.getElementById('time-display').innerText = "00:00";
  updateUIState();
}

function stopAudioScheduler() {
  if (audioSchedulerInterval) {
    clearInterval(audioSchedulerInterval);
    audioSchedulerInterval = null;
  }
}

function nextTrack() {
  currentTrackIndex = (currentTrackIndex + 1) % TRACKS.length;
  stopPlayback();
  startPlayback(0);
}

function prevTrack() {
  currentTrackIndex = (currentTrackIndex - 1 + TRACKS.length) % TRACKS.length;
  stopPlayback();
  startPlayback(0);
}

function updateUIState() {
  const track = TRACKS[currentTrackIndex];
  document.getElementById('track-num').innerText = track.num;
  document.getElementById('marquee-text').innerText = track.title;
  
  document.getElementById('ind-play').classList.toggle('active', isPlaying);
  document.getElementById('ind-pause').classList.toggle('active', isPaused);
  
  const plItems = document.querySelectorAll('.pl-item');
  plItems.forEach((item, idx) => {
    item.classList.toggle('active', idx === currentTrackIndex);
  });

  const taskTitle = document.querySelector('.taskbar-tasks .task-btn');
  if (taskTitle) {
    taskTitle.innerHTML = `<span class="mini-app-icon"></span> Winamp - ${track.title}`;
  }
}

function startTimerUI() {
  clearInterval(trackTimerInterval);
  trackTimerInterval = setInterval(() => {
    if (!isPlaying || !audioCtx) return;
    const elapsed = Math.floor(audioCtx.currentTime - trackStartTime);
    const secs = elapsed % 60;
    const mins = Math.floor(elapsed / 60);
    const timeStr = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    document.getElementById('time-display').innerText = timeStr;
  }, 200);
}

function renderVisualizer() {
  const canvas = document.getElementById('visualizer');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const width = canvas.width;
  const height = canvas.height;
  
  function draw() {
    requestAnimationFrame(draw);
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, width, height);
    
    const barCount = 16;
    const barWidth = width / barCount - 1;
    
    if (isPlaying && analyser) {
      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      analyser.getByteFrequencyData(dataArray);
      
      for (let i = 0; i < barCount; i++) {
        const value = dataArray[i] || Math.floor(Math.random() * 120);
        const barHeight = (value / 255) * height;
        
        const grad = ctx.createLinearGradient(0, height, 0, 0);
        grad.addColorStop(0, '#00ff00');
        grad.addColorStop(0.7, '#ffff00');
        grad.addColorStop(1, '#ff3300');
        
        ctx.fillStyle = grad;
        ctx.fillRect(i * (barWidth + 1), height - barHeight, barWidth, barHeight);
      }
    } else {
      ctx.fillStyle = '#003300';
      ctx.fillRect(0, height - 2, width, 2);
    }
  }
  draw();
}

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('btn-play').addEventListener('click', () => {
    if (isPaused) {
      startPlayback(pauseOffset);
    } else if (!isPlaying) {
      startPlayback(0);
    }
  });
  
  document.getElementById('btn-pause').addEventListener('click', () => {
    pausePlayback();
  });
  
  document.getElementById('btn-stop').addEventListener('click', () => {
    stopPlayback();
  });
  
  document.getElementById('btn-next').addEventListener('click', () => {
    nextTrack();
  });
  
  document.getElementById('btn-prev').addEventListener('click', () => {
    prevTrack();
  });
  
  document.getElementById('btn-eject').addEventListener('click', () => {
    nextTrack();
  });

  const volSlider = document.getElementById('vol-slider');
  volSlider.addEventListener('input', (e) => {
    if (masterGain) {
      masterGain.gain.value = e.target.value / 100;
    }
  });

  document.getElementById('toggle-eq').addEventListener('click', function() {
    const eqWin = document.getElementById('winamp-eq');
    const isHidden = eqWin.style.display === 'none';
    eqWin.style.display = isHidden ? 'block' : 'none';
    this.classList.toggle('active', isHidden);
  });

  document.getElementById('toggle-pl').addEventListener('click', function() {
    const plWin = document.getElementById('winamp-pl');
    const isHidden = plWin.style.display === 'none';
    plWin.style.display = isHidden ? 'block' : 'none';
    this.classList.toggle('active', isHidden);
  });

  const plItems = document.querySelectorAll('.pl-item');
  plItems.forEach(item => {
    item.addEventListener('click', () => {
      const idx = parseInt(item.getAttribute('data-index'));
      currentTrackIndex = idx;
      stopPlayback();
      startPlayback(0);
    });
  });

  function updateClock() {
    const now = new Date();
    const hrs = String(now.getHours()).padStart(2, '0');
    const mins = String(now.getMinutes()).padStart(2, '0');
    document.getElementById('clock').innerText = `${hrs}:${mins}`;
  }
  setInterval(updateClock, 1000);
  updateClock();

  renderVisualizer();
  updateUIState();
});
