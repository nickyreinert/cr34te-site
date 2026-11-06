"use strict";

const $ = id => document.getElementById(id);
const controls = [
  ["tuning", "Tuning", 400, 480, 440, 1, " Hz"],
  ["cutoff", "Cutoff", 100, 8000, 800, 10, " Hz"],
  ["resonance", "Resonance", 0, 24, 10, 1, ""],
  ["env", "Env Mod", 0, 100, 60, 1, "%"],
  ["decay", "Decay", 0, 100, 40, 1, "%"],
  ["accent", "Accent", 0, 100, 60, 1, "%"],
  ["tempo", "Tempo", 40, 240, 120, 1, " BPM"],
  ["volume", "Volume", 0, 100, 70, 1, "%"]
];
const params = Object.fromEntries(controls.map(([id, , , , value]) => [id, value]));
const notes = ["C", "C♯", "D", "D♯", "E", "F", "F♯", "G", "G♯", "A", "A♯", "B", "C"];
const shortcuts = ["A", "W", "S", "E", "D", "F", "T", "G", "Y", "H", "U", "J", "K"];
const emptyStep = () => ({ note: 0, gate: false, slide: false, accent: false });
const patterns = Array.from({ length: 4 }, () => Array.from({ length: 16 }, emptyStep));
// Semitone offsets from C2. The two halves of Acid Tracks repeat the transcribed half-bar.
const acidTracks = [21, -3, -12, -2, -8, 13, -11, 10];
const presets = [
  {
    name: "Acid Tracks",
    pitches: [...acidTracks, ...acidTracks],
    slide: [],
    accent: [],
    wave: "sawtooth",
    settings: { tempo: 120, cutoff: 430, resonance: 17, env: 58, decay: 46, accent: 50 }
  },
  {
    name: "Confusion",
    pitches: [7, 7, 7, 7, null, -5, 7, null, 10, null, -2, -2, -2, 10, null, -2],
    slide: [1, 2, 11],
    accent: [],
    wave: "square",
    settings: { tempo: 134, cutoff: 2670, resonance: 16, env: 66, decay: 66, accent: 0 }
  },
  {
    name: "Access",
    pitches: [9, null, 9, 21, 9, 9, 9, null, 9, 9, 21, 9, null, 9, 9, null],
    slide: [],
    accent: [4],
    wave: "square",
    settings: { tempo: 134, cutoff: 1800, resonance: 24, env: 66, decay: 33, accent: 20 }
  },
  {
    name: "Higher State of Consciousness",
    pitches: [7, 19, 7, 7, 7, 7, 11, 7, 11, 7, 7, 11, 7, 7, 7, 11],
    slide: [1, 3, 4, 10, 13, 14],
    accent: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
    wave: "square",
    settings: { tempo: 134, cutoff: 8000, resonance: 18, env: 50, decay: 0, accent: 66 }
  },
  {
    name: "Acperience 1",
    pitches: [4, 11, 16, 19, null, 14, 11, 7, -8, 4, 23, 21, 16, null, 9, 11],
    slide: [2, 3, 6, 9, 10, 11, 15],
    accent: [0, 3, 5, 8, 10, 14],
    wave: "sawtooth",
    settings: { tempo: 126, cutoff: 730, resonance: 20, env: 69, decay: 70, accent: 73 }
  },
  {
    name: "Da Funk",
    pitches: [-5, 22, 7, 17, 3, -11, -11, 1, 15, -9, 17, 19, -4, -5, -12, 7],
    slide: [3, 5, 7, 9, 11, 12, 14, 15],
    accent: [4, 5, 6, 7, 11],
    wave: "square",
    settings: { tempo: 110, cutoff: 340, resonance: 7, env: 37, decay: 58, accent: 59 }
  },
  {
    name: "Acid Phase",
    pitches: [5, 5, 17, 5, -7, null, 5, 12, 5, 5, 20, 17, 15, 5, 24, 12],
    slide: [2, 4, 7, 10, 11, 12, 14],
    accent: [0, 2, 6, 10, 12, 14],
    wave: "sawtooth",
    settings: { tempo: 138, cutoff: 470, resonance: 21, env: 74, decay: 36, accent: 81 }
  },
  {
    name: "Startpattern",
    pitches: [0, null, 5, 7, 12, 7, null, 3, 0, null, 10, 7, -5, 0, 12, null],
    slide: [3, 4, 11, 13],
    accent: [0, 4, 8, 10, 14],
    wave: "square",
    settings: { tempo: 120, cutoff: 800, resonance: 10, env: 60, decay: 40, accent: 60 }
  }
];

function makePattern(preset) {
  return preset.pitches.map((note, i) => note === null ? emptyStep() : {
    note,
    gate: true,
    slide: preset.slide.includes(i),
    accent: preset.accent.includes(i)
  });
}
patterns[0] = makePattern(presets[presets.length - 1]);

let bank = 0;
let selected = 0;
let mode = "play";
let tool = "note";
let wave = "square";
let power = true;
let playing = false;
let head = -1;
let next = 0;
let previous = false;
let timer;
let deadline;
let runId = 0;
let powerId = 0;
let context, master, sequenceVoice, previewVoice;
let audioError = false;

function makeVoice(destination) {
  const osc = context.createOscillator();
  const filter = context.createBiquadFilter();
  const gain = context.createGain();
  osc.type = wave;
  filter.type = "lowpass";
  filter.frequency.value = params.cutoff;
  filter.Q.value = params.resonance;
  gain.gain.value = 0;
  osc.connect(filter);
  filter.connect(gain);
  gain.connect(destination);
  osc.start();
  return { osc, filter, gain, note: 0 };
}

async function enableAudio() {
  if (!context) {
    const Audio = window.AudioContext || window.webkitAudioContext;
    if (!Audio) throw new Error("Web Audio fehlt");
    context = new Audio();
    const limiter = context.createDynamicsCompressor();
    master = context.createGain();
    master.gain.value = params.volume / 100;
    limiter.connect(master);
    master.connect(context.destination);
    sequenceVoice = makeVoice(limiter);
    previewVoice = makeVoice(limiter);
  }
  if (context.state !== "running") await context.resume();
  audioError = false;
}

function frequency(note) {
  return params.tuning * 2 ** ((36 + note - 69) / 12);
}

function sound(voice, step, seconds, glide = false) {
  const t = context.currentTime;
  const accent = step.accent ? params.accent / 100 : 0;
  const decay = 0.025 + 0.45 * params.decay / 100;
  const freq = voice.osc.frequency;
  const cutoff = voice.filter.frequency;
  const level = voice.gain.gain;
  const peak = Math.min(12000, params.cutoff * (1 + params.env / 100 * (5 + accent * 4)));
  voice.note = step.note;
  freq.cancelScheduledValues(t);
  if (glide) freq.setTargetAtTime(frequency(step.note), t, 0.028);
  else freq.setValueAtTime(frequency(step.note), t);

  cutoff.cancelScheduledValues(t);
  cutoff.setTargetAtTime(peak, t, 0.004);
  cutoff.setTargetAtTime(params.cutoff, t + 0.012, decay / 3);

  level.cancelScheduledValues(t);
  if (!glide) level.setValueAtTime(0.001, t);
  level.setTargetAtTime(0.24 + accent * 0.16, t, 0.003);
  level.setTargetAtTime(0.07 + accent * 0.035, t + 0.012, decay / 2);
  if (seconds !== Infinity) level.setTargetAtTime(0, t + seconds, 0.008);
}

function release(voice) {
  if (!voice) return;
  const t = context.currentTime;
  voice.gain.gain.cancelScheduledValues(t);
  voice.gain.gain.setTargetAtTime(0, t, 0.006);
}

const stepMs = () => 15000 / params.tempo;
const activeSteps = () => patterns[bank];
const noteName = note => notes[(note % 12 + 12) % 12] + (2 + Math.floor(note / 12));

function schedule() {
  timer = setTimeout(tick, Math.max(0, deadline - performance.now()));
}

function tick() {
  const steps = activeSteps();
  const length = stepMs();
  const now = performance.now();
  head = next;
  next = (head + 1) % 16;
  const step = steps[head];
  const following = steps[next];
  if (step.gate) {
    const hold = following.gate && following.slide;
    sound(sequenceVoice, step, hold ? Infinity : length * 0.00084, previous && step.slide);
  } else {
    release(sequenceVoice);
  }
  previous = step.gate;
  deadline = Math.max(deadline + length, now + length * 0.5);
  render();
  schedule();
}

async function start() {
  if (!power || playing) return;
  const id = ++runId;
  playing = true;
  render();
  try {
    await enableAudio();
  } catch {
    if (id === runId) {
      audioError = true;
      stop();
    }
    return;
  }
  if (id !== runId) return;
  next = 0;
  previous = false;
  deadline = performance.now();
  tick();
}

function stop() {
  runId++;
  playing = false;
  clearTimeout(timer);
  head = -1;
  release(sequenceVoice);
  render();
}

async function pressNote(note) {
  const key = keyButtons[note];
  key.classList.add("lit");
  clearTimeout(key.flash);
  key.flash = setTimeout(() => key.classList.remove("lit"), 170);
  if (mode === "write") Object.assign(activeSteps()[selected], { note, gate: true });
  render();
  if (!power) return;
  const id = powerId;
  try {
    await enableAudio();
    if (id === powerId) {
      const accent = mode === "write" && activeSteps()[selected].accent;
      sound(previewVoice, { note, accent }, 0.2);
      render();
    }
  } catch {
    if (id === powerId) {
      audioError = true;
      render();
    }
  }
}

function setParam(id, value) {
  const oldLength = stepMs();
  params[id] = value;
  if (id === "tempo" && head !== -1) {
    const now = performance.now();
    const remaining = Math.max(0, deadline - now) / oldLength;
    deadline = now + remaining * stepMs();
    clearTimeout(timer);
    schedule();
  }
  if (master) {
    const t = context.currentTime;
    if (id === "volume") master.gain.setTargetAtTime(value / 100, t, 0.012);
    for (const voice of [sequenceVoice, previewVoice]) {
      if (id === "resonance") voice.filter.Q.setTargetAtTime(value, t, 0.012);
      if (id === "cutoff") {
        voice.filter.frequency.cancelScheduledValues(t);
        voice.filter.frequency.setTargetAtTime(value, t, 0.015);
      }
      if (id === "tuning") {
        voice.osc.frequency.cancelScheduledValues(t);
        voice.osc.frequency.setTargetAtTime(frequency(voice.note), t, 0.012);
      }
    }
  }
  if (id === "tempo") render();
}

function makeDial([id, label, min, max, value, step, unit], container) {
  const node = document.createElement("div");
  node.className = "regulator";
  node.innerHTML = '<span class="caption"></span><span class="dial"><input type="range"></span><output></output>';
  node.title = label + " · Ziehen oder Pfeiltasten";
  node.firstElementChild.textContent = label;
  const dial = node.querySelector(".dial");
  const input = node.querySelector("input");
  const output = node.querySelector("output");
  Object.assign(input, { min, max, step, value });
  input.setAttribute("aria-label", label);
  container.append(node);

  const logarithmic = id === "cutoff";
  const ratio = logarithmic ? max / min : 1;
  const positionOf = n => logarithmic ? Math.log(n / min) / Math.log(ratio) : (n - min) / (max - min);
  const valueAt = position => logarithmic ? min * ratio ** position : min + position * (max - min);

  function show() {
    const n = Number(input.value);
    const sweep = positionOf(n) * 270;
    dial.style.setProperty("--angle", (sweep - 135) + "deg");
    dial.style.setProperty("--sweep", sweep + "deg");
    output.textContent = n + unit;
    input.setAttribute("aria-valuetext", n + unit);
  }
  function update() {
    setParam(id, Number(input.value));
    show();
  }
  input.addEventListener("input", update);
  show();

  let drag;
  input.addEventListener("pointerdown", e => {
    if (e.button !== 0 || drag) return;
    e.preventDefault();
    input.focus();
    input.setPointerCapture(e.pointerId);
    drag = { id: e.pointerId, x: e.clientX, y: e.clientY, position: positionOf(Number(input.value)), moved: false };
  });
  input.addEventListener("pointermove", e => {
    if (!drag || e.pointerId !== drag.id) return;
    const x = e.clientX - drag.x;
    const y = drag.y - e.clientY;
    const delta = Math.abs(y) >= Math.abs(x) ? y : x;
    if (Math.abs(delta) < 2 && !drag.moved) return;
    drag.moved = true;
    const position = Math.max(0, Math.min(1, drag.position + delta / 150));
    const raw = valueAt(position);
    input.value = min + Math.round((raw - min) / step) * step;
    update();
  });
  input.addEventListener("pointerup", e => {
    if (!drag || e.pointerId !== drag.id) return;
    if (!drag.moved) {
      const box = input.getBoundingClientRect();
      const direction = e.clientX < box.left + box.width / 2 ? -1 : 1;
      input.value = Number(input.value) + direction * step;
      update();
    }
    drag = null;
  });
  input.addEventListener("lostpointercapture", e => {
    if (drag && drag.id === e.pointerId) drag = null;
  });
  return nextValue => {
    input.value = nextValue;
    update();
  };
}

const keyButtons = notes.map((note, i) => {
  const button = document.createElement("button");
  button.className = note.includes("♯") ? "key sharp" : "key";
  button.append(note);
  const label = document.createElement("small");
  label.textContent = shortcuts[i];
  button.append(label);
  button.setAttribute("aria-label", noteName(i) + ", Taste " + shortcuts[i]);
  button.addEventListener("click", () => pressNote(i));
  $("keys").append(button);
  return button;
});

const stepButtons = Array.from({ length: 16 }, (_, i) => {
  const button = document.createElement("button");
  button.className = "step";
  button.append(String(i + 1));
  const marks = document.createElement("span");
  marks.className = "flags";
  marks.setAttribute("aria-hidden", "true");
  button.append(marks);
  button.addEventListener("click", () => {
    selected = i;
    changeStep(mode === "play" ? "gate" : tool);
    render();
  });
  $("steps").append(button);
  return button;
});

function changeStep(field) {
  const step = activeSteps()[selected];
  if (field !== "note") step[field] = !step[field];
}

const groups = Object.fromEntries(["pattern", "mode", "tool", "wave"].map(group => [
  group, [...document.querySelectorAll("[data-" + group + "]")]
]));
function pressed(button, value) {
  button.setAttribute("aria-pressed", String(value));
}

function render() {
  const steps = activeSteps();
  const step = steps[selected];
  stepButtons.forEach((button, i) => {
    const s = steps[i];
    pressed(button, s.gate);
    button.classList.toggle("selected", i === selected);
    button.classList.toggle("current", i === head);
    button.lastChild.textContent = (s.slide ? "↗" : "") + (s.accent ? "•" : "");
    button.setAttribute("aria-label", "Schritt " + (i + 1) + ", " +
      (s.gate ? noteName(s.note) : "Pause") + (s.slide ? ", Slide" : "") +
      (s.accent ? ", Accent" : "") + (i === selected ? ", ausgewählt" : ""));
  });
  const selectedGroup = { pattern: String(bank), mode, tool: mode === "write" ? tool : "", wave };
  for (const [group, buttons] of Object.entries(groups)) {
    buttons.forEach(button => pressed(button, button.dataset[group] === selectedGroup[group]));
  }
  pressed($("start"), playing);
  pressed($("power"), power);
  const loadLabel = "In PTN " + (bank + 1) + " laden";
  if ($("loadPreset").textContent !== loadLabel) $("loadPreset").textContent = loadLabel;
  $("display").textContent = "PTN " + (bank + 1) + " · STEP " + (selected + 1) + "/16 " +
    (step.gate ? noteName(step.note) : "–") + (step.slide ? " ↗" : "") +
    (step.accent ? " •" : "") + " · " + params.tempo + " BPM" +
    (head >= 0 ? " · ▶ " + (head + 1) : "");
  const help = {
    note: "Pitch: Schritt wählen, dann Note drücken.",
    slide: "Slide: ↗ gleitet von der vorherigen Note.",
    accent: "Accent: • betont die Note.",
    gate: "Time: Schritt zwischen Note und Pause umschalten."
  };
  $("hint").textContent = !power ? "Power aus · einschalten für Ton." :
    audioError ? "Audio konnte nicht starten. Drücke Start oder eine Note." :
    mode === "write" ? help[tool] : "Klick ins Gerät für Tastatur. Noten antippen oder A–K. Regler ziehen.";
}

const actions = {
  pattern: value => {
    if (bank !== Number(value)) previous = false;
    bank = Number(value);
  },
  mode: value => {
    mode = value;
    if (value === "write") tool = "note";
  },
  tool: value => {
    mode = "write";
    tool = value;
    changeStep(tool);
  },
  wave: value => {
    wave = value;
    if (sequenceVoice) sequenceVoice.osc.type = wave;
    if (previewVoice) previewVoice.osc.type = wave;
  }
};
for (const [group, buttons] of Object.entries(groups)) {
  buttons.forEach(button => button.addEventListener("click", () => {
    actions[group](button.dataset[group]);
    render();
  }));
}
$("start").addEventListener("click", start);
$("stop").addEventListener("click", stop);
$("clear").addEventListener("click", () => {
  patterns[bank] = Array.from({ length: 16 }, emptyStep);
  previous = false;
  release(sequenceVoice);
  render();
});
$("back").addEventListener("click", () => {
  selected = (selected + 15) % 16;
  render();
});
$("next").addEventListener("click", () => {
  selected = (selected + 1) % 16;
  render();
});
$("power").addEventListener("click", () => {
  power = !power;
  powerId++;
  if (!power) {
    release(previewVoice);
    stop();
  } else {
    render();
  }
});
document.addEventListener("keydown", event => {
  if (event.target === $("preset") || event.ctrlKey || event.metaKey || event.altKey || event.isComposing) return;
  const note = shortcuts.indexOf(event.key.toUpperCase());
  if (note === -1) return;
  event.preventDefault();
  pressNote(note);
});
const dials = Object.fromEntries(controls.map((control, i) => [
  control[0], makeDial(control, $(i < 6 ? "tone" : "mix"))
]));
const picker = $("preset");
presets.forEach((preset, i) => {
  const option = document.createElement("option");
  option.value = i;
  option.textContent = preset.name;
  picker.append(option);
});
$("loadPreset").addEventListener("click", () => {
  const preset = presets[Number(picker.value)];
  patterns[bank] = makePattern(preset);
  selected = 0;
  next = 0;
  previous = false;
  release(sequenceVoice);
  actions.wave(preset.wave);
  dials.tuning(440);
  for (const [id, value] of Object.entries(preset.settings)) dials[id](value);
  $("presetStatus").textContent = preset.name + " in Pattern " + (bank + 1) + " geladen.";
  render();
});
render();
