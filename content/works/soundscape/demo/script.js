// Soundscape — the browser synthesizes a generative ambient piece with the
// Web Audio API, and an AnalyserNode feeds its FFT back into the visuals, so
// the screen reacts to exactly what you hear. The cursor shapes the sound.
// Self-contained vanilla JS: no build step, no dependencies.

const canvas = document.getElementById("stage");
const ctx = canvas.getContext("2d");
const startButton = document.getElementById("start");

// --- Layout ----------------------------------------------------------------
let W = 0;
let H = 0;
function resize() {
  const dpr = window.devicePixelRatio || 1;
  W = canvas.clientWidth;
  H = canvas.clientHeight;
  canvas.width = Math.round(W * dpr);
  canvas.height = Math.round(H * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
window.addEventListener("resize", resize);
resize();

// --- Pointer (drives the sound once started) --------------------------------
const pointer = { x: 0.5, y: 0.5 };
function trackPointer(clientX, clientY) {
  const rect = canvas.getBoundingClientRect();
  pointer.x = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
  pointer.y = Math.min(1, Math.max(0, (clientY - rect.top) / rect.height));
}
canvas.addEventListener("mousemove", (e) => trackPointer(e.clientX, e.clientY));
canvas.addEventListener(
  "touchmove",
  (e) => trackPointer(e.touches[0].clientX, e.touches[0].clientY),
  { passive: true }
);

// --- Music theory -----------------------------------------------------------
function mtof(midi) {
  return 440 * Math.pow(2, (midi - 69) / 12);
}
// Four soft, overlapping five-note voicings — a slow, consonant loop.
const CHORDS = [
  [50, 57, 62, 66, 69],
  [48, 55, 60, 64, 67],
  [52, 59, 64, 67, 71],
  [45, 52, 57, 61, 64],
];
let chordIndex = 0;

// --- Audio engine (built on the first click) --------------------------------
let audio = null;
let analyser = null;
let freqData = null;
let nextPluck = 0;
let nextChord = 0;

function buildAudio() {
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  const ac = new AC();

  const master = ac.createGain();
  master.gain.value = 0.0001;
  const an = ac.createAnalyser();
  an.fftSize = 512;
  an.smoothingTimeConstant = 0.82;
  master.connect(an);
  an.connect(ac.destination);

  // Pad bus: a resonant lowpass the cursor will sweep.
  const padFilter = ac.createBiquadFilter();
  padFilter.type = "lowpass";
  padFilter.frequency.value = 900;
  padFilter.Q.value = 6;
  padFilter.connect(master);

  // Feedback delay for space.
  const delay = ac.createDelay(1.0);
  delay.delayTime.value = 0.38;
  const feedback = ac.createGain();
  feedback.gain.value = 0.42;
  const delayLP = ac.createBiquadFilter();
  delayLP.type = "lowpass";
  delayLP.frequency.value = 1900;
  delay.connect(delayLP);
  delayLP.connect(feedback);
  feedback.connect(delay);
  delay.connect(master);
  const send = ac.createGain();
  send.gain.value = 0.4;
  padFilter.connect(send);
  send.connect(delay);

  // Five pad voices, each two detuned oscillators.
  const voices = [];
  const chord = CHORDS[0];
  for (let i = 0; i < 5; i++) {
    const voiceGain = ac.createGain();
    voiceGain.gain.value = 0;
    voiceGain.connect(padFilter);
    const o1 = ac.createOscillator();
    const o2 = ac.createOscillator();
    o1.type = "sine";
    o2.type = "triangle";
    o2.detune.value = 8;
    o1.frequency.value = mtof(chord[i]);
    o2.frequency.value = mtof(chord[i]);
    o1.connect(voiceGain);
    o2.connect(voiceGain);
    o1.start();
    o2.start();
    voiceGain.gain.setTargetAtTime(0.13, ac.currentTime, 2.2);
    voices.push({ voiceGain, o1, o2 });
  }

  // Slow LFO breathing the filter cutoff.
  const lfo = ac.createOscillator();
  lfo.frequency.value = 0.07;
  const lfoGain = ac.createGain();
  lfoGain.gain.value = 240;
  lfo.connect(lfoGain);
  lfoGain.connect(padFilter.frequency);
  lfo.start();

  master.gain.setTargetAtTime(0.3, ac.currentTime, 1.6);

  return { ac, master, padFilter, voices, analyser: an };
}

// A short plucked note from the current chord, panned at random.
function pluck(engine) {
  const ac = engine.ac;
  const chord = CHORDS[chordIndex];
  const midi = chord[Math.floor(Math.random() * chord.length)] + 12;
  const osc = ac.createOscillator();
  osc.type = "triangle";
  osc.frequency.value = mtof(midi);
  const gain = ac.createGain();
  osc.connect(gain);
  if (ac.createStereoPanner) {
    const pan = ac.createStereoPanner();
    pan.pan.value = (Math.random() * 2 - 1) * 0.7;
    gain.connect(pan);
    pan.connect(engine.padFilter);
  } else {
    gain.connect(engine.padFilter);
  }
  const t = ac.currentTime;
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.linearRampToValueAtTime(0.12, t + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0008, t + 1.4);
  osc.start(t);
  osc.stop(t + 1.5);
}

// Glide every voice to the next chord.
function setChord(engine, idx) {
  const chord = CHORDS[idx];
  for (let i = 0; i < 5; i++) {
    const f = mtof(chord[i]);
    engine.voices[i].o1.frequency.setTargetAtTime(f, engine.ac.currentTime, 1.8);
    engine.voices[i].o2.frequency.setTargetAtTime(f, engine.ac.currentTime, 1.8);
  }
}

// --- Visual state -----------------------------------------------------------
const rings = [];
const motes = [];
for (let i = 0; i < 64; i++) {
  motes.push({
    ang: Math.random() * Math.PI * 2,
    rad: 0.16 + Math.random() * 0.46,
    spd: 0.3 + Math.random() * 1.2,
    ph: Math.random() * Math.PI * 2,
  });
}
let prevBass = 0;
let ringCooldown = 0;

function draw(now) {
  const t = now || 0;

  // --- Read the spectrum (or a gentle fake when audio is off).
  let bass = 0;
  let mid = 0;
  let treble = 0;
  if (analyser && freqData) {
    analyser.getByteFrequencyData(freqData);
    for (let i = 1; i <= 10; i++) bass += freqData[i];
    for (let i = 11; i <= 50; i++) mid += freqData[i];
    for (let i = 51; i <= 170; i++) treble += freqData[i];
    bass /= 10 * 255;
    mid /= 40 * 255;
    treble /= 120 * 255;
  } else {
    bass = 0.13 + 0.06 * Math.sin(t * 0.0016);
    mid = 0.09 + 0.04 * Math.sin(t * 0.0021 + 1);
    treble = 0.05 + 0.03 * Math.sin(t * 0.0029 + 2);
  }

  // --- Drive the sound from the cursor.
  if (audio) {
    const ac = audio.ac;
    const tc = ac.currentTime;
    // Cursor X -> filter cutoff (exponential 250 Hz .. 3000 Hz).
    audio.padFilter.frequency.setTargetAtTime(
      250 * Math.pow(12, pointer.x),
      tc,
      0.2
    );
    // Cursor Y -> melody density (top of the canvas = denser).
    if (tc > nextPluck) {
      pluck(audio);
      nextPluck = tc + 0.6 + pointer.y * 3.2 + Math.random() * 0.7;
    }
    if (tc > nextChord) {
      chordIndex = (chordIndex + 1) % CHORDS.length;
      setChord(audio, chordIndex);
      nextChord = tc + 11;
    }
  }

  const cx = W / 2;
  const cy = H / 2;
  const minDim = Math.min(W, H);
  const hue = (t * 0.012 + chordIndex * 42) % 360;

  ctx.fillStyle = "#06070e";
  ctx.fillRect(0, 0, W, H);

  ctx.globalCompositeOperation = "lighter";

  // --- Bilateral radial spectrum.
  const bins = 128;
  const innerR = minDim * 0.14;
  const maxBar = minDim * 0.3;
  for (let half = 0; half < 2; half++) {
    for (let i = 0; i < bins; i++) {
      const v = analyser && freqData ? freqData[i] / 255 : Math.max(0, 0.34 - i / bins) * (0.4 + 0.6 * mid);
      const a = (i / bins) * Math.PI + (half ? Math.PI : 0);
      const len = innerR + v * maxBar;
      const c = Math.cos(a);
      const s = Math.sin(a);
      ctx.strokeStyle = `hsla(${hue + i * 0.7}, 90%, ${52 + v * 30}%, ${0.15 + v * 0.6})`;
      ctx.lineWidth = 1 + v * 2.4;
      ctx.beginPath();
      ctx.moveTo(cx + c * innerR, cy + s * innerR);
      ctx.lineTo(cx + c * len, cy + s * len);
      ctx.stroke();
    }
  }

  // --- Expanding rings on bass peaks.
  ringCooldown -= 1;
  if (bass > 0.45 && bass > prevBass + 0.035 && ringCooldown <= 0) {
    rings.push({ r: innerR, life: 1 });
    ringCooldown = 8;
  }
  prevBass = bass;
  for (let i = rings.length - 1; i >= 0; i--) {
    const ring = rings[i];
    ring.r += minDim * 0.006;
    ring.life -= 0.012;
    if (ring.life <= 0) {
      rings.splice(i, 1);
      continue;
    }
    ctx.strokeStyle = `hsla(${hue + 40}, 90%, 66%, ${ring.life * 0.4})`;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(cx, cy, ring.r, 0, Math.PI * 2);
    ctx.stroke();
  }

  // --- Orbiting motes.
  for (const m of motes) {
    m.ang += m.spd * (0.0009 + mid * 0.006);
    const orbit = m.rad * minDim * (1 + 0.16 * Math.sin(t * 0.001 + m.ph));
    const x = cx + Math.cos(m.ang) * orbit;
    const y = cy + Math.sin(m.ang) * orbit;
    const size = 1.4 + treble * 4;
    ctx.fillStyle = `hsla(${hue + 60}, 95%, 75%, ${0.25 + treble * 0.6})`;
    ctx.beginPath();
    ctx.arc(x, y, size, 0, Math.PI * 2);
    ctx.fill();
  }

  // --- Luminous core, pulsing with the bass.
  const coreR = innerR * (0.6 + bass * 1.3);
  const core = ctx.createRadialGradient(cx, cy, 0, cx, cy, coreR);
  core.addColorStop(0, `hsla(${hue}, 95%, 86%, 0.95)`);
  core.addColorStop(0.5, `hsla(${hue}, 92%, 64%, 0.5)`);
  core.addColorStop(1, `hsla(${hue}, 90%, 55%, 0)`);
  ctx.fillStyle = core;
  ctx.beginPath();
  ctx.arc(cx, cy, coreR, 0, Math.PI * 2);
  ctx.fill();

  // --- Cursor glow.
  if (audio) {
    const px = pointer.x * W;
    const py = pointer.y * H;
    const cg = ctx.createRadialGradient(px, py, 0, px, py, 46);
    cg.addColorStop(0, `hsla(${hue + 90}, 95%, 80%, 0.5)`);
    cg.addColorStop(1, `hsla(${hue + 90}, 95%, 70%, 0)`);
    ctx.fillStyle = cg;
    ctx.beginPath();
    ctx.arc(px, py, 46, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.globalCompositeOperation = "source-over";
  requestAnimationFrame(draw);
}

// --- Start ------------------------------------------------------------------
startButton.addEventListener("click", () => {
  audio = buildAudio();
  if (audio) {
    if (audio.ac.state === "suspended") audio.ac.resume();
    analyser = audio.analyser;
    freqData = new Uint8Array(analyser.frequencyBinCount);
    nextPluck = audio.ac.currentTime + 1.5;
    nextChord = audio.ac.currentTime + 11;
  }
  startButton.classList.add("hidden");
});

requestAnimationFrame(draw);
