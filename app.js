const CDN = "https://cdn.jsdelivr.net/gh/workinwithai-create/PreEight@d58301e4a494555f411a2afbc448b724136eee76/public/samples";
const LOOKAHEAD_MS = 25;
const SCHEDULE_AHEAD = 0.12;
const recipes = [
  { id:"piano-arp", name:"Piano arpeggio", blurb:"Rising 1-3-5-8 on acoustic grand." },
  { id:"nylon-arp", name:"Nylon arpeggio", blurb:"Fingerstyle 1-5-3-8 on nylon." },
  { id:"bass-arp", name:"Bass arpeggio", blurb:"Upright outlines the chord on the ands." }
];
const state = {
  bpm: 100,
  key: "C",
  chords: ["Am","F","C","G"],
  recipe: recipes[0],
  playing: false,
  bars: 4
};
let ctx, master, compressor, nextStepTime = 0, step = 0, timerId = null, activeSources = [];
let buffers = {};
const sampleList = [
  ["kick", `${CDN}/drums/kick.mp3`],
  ["snare", `${CDN}/drums/snare.mp3`],
  ["hat", `${CDN}/drums/hihat.mp3`],
  ["pC3", `${CDN}/piano/C3.mp3`],
  ["pC4", `${CDN}/piano/C4.mp3`],
  ["gE2", `${CDN}/guitar/E2.mp3`],
  ["bA1", `${CDN}/bass/A1.mp3`]
];

function midiFromNote(note) {
  const map = {C:0,D:2,E:4,F:5,G:7,A:9,B:11};
  const m = note.match(/([A-G])(#|b)?(\d)/);
  if (!m) return 60;
  let n = map[m[1]] + (m[2]==="#"?1:m[2]==="b"?-1:0) + (parseInt(m[3])+1)*12;
  return n;
}

async function loadSamples() {
  const status = document.getElementById("status");
  let loaded = 0;
  const missing = [];
  for (const [name, url] of sampleList) {
    try {
      const r = await fetch(url);
      if (!r.ok) throw new Error("fail");
      const ab = await r.arrayBuffer();
      buffers[name] = await ctx.decodeAudioData(ab);
      loaded++;
    } catch (e) {
      missing.push(name);
    }
    status.textContent = `Seating chairs ${loaded}/${sampleList.length}${missing.length ? " · missing: " + missing.join(", ") : ""}`;
  }
  if (missing.length) {
    status.textContent = "Missing instruments: " + missing.join(", ") + " — cannot play";
    return false;
  }
  status.textContent = "Chairs seated · live samples · tap play";
  return true;
}

function playSample(name, when, rate = 1, gain = 0.4, duration = 0.2) {
  const buf = buffers[name];
  if (!buf || !ctx) return null;
  const src = ctx.createBufferSource();
  src.buffer = buf;
  src.playbackRate.value = rate;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0, when);
  g.gain.linearRampToValueAtTime(gain, when + 0.01);
  g.gain.setValueAtTime(gain, when + duration - 0.02);
  g.gain.linearRampToValueAtTime(0, when + duration);
  src.connect(g);
  g.connect(master);
  src.start(when);
  src.stop(when + duration + 0.05);
  activeSources.push(src);
  return src;
}

function rateForMidi(midi, base = 60) {
  const semi = Math.max(-4, Math.min(4, midi - base));
  return Math.pow(2, semi / 12);
}

function scheduleStep(stepNum, time) {
  const stepDur = 60 / state.bpm / 4;
  const bar = Math.floor(stepNum / 16);
  const stepInBar = stepNum % 16;
  const chordIdx = bar % 4;
  const chord = state.chords[chordIdx] || "C";
  const rootMidi = midiFromNote(chord.replace(/m|7|maj/g,"")) || 60;
  // basic kit
  if (stepInBar === 0 || stepInBar === 8) playSample("kick", time, 1, 0.6, 0.15);
  if (stepInBar === 4 || stepInBar === 12) playSample("snare", time, 1, 0.4, 0.12);
  if (stepInBar % 2 === 0) playSample("hat", time, 1, 0.08, 0.08);
  // arpeggio based on recipe
  const arpNotes = [0, 4, 7, 12];
  if (state.recipe.id === "piano-arp" && stepInBar % 4 === 0) {
    const n = arpNotes[stepInBar / 4];
    playSample("pC4", time, rateForMidi(rootMidi + n, 60), 0.3, 0.4);
  } else if (state.recipe.id === "nylon-arp" && stepInBar % 4 === 2) {
    const n = arpNotes[(stepInBar / 2) % 4];
    playSample("gE2", time, rateForMidi(rootMidi + n - 12, 40), 0.25, 0.35);
  } else if (state.recipe.id === "bass-arp" && stepInBar % 4 === 1) {
    const n = arpNotes[Math.floor(stepInBar / 4) % 4];
    playSample("bA1", time, rateForMidi(rootMidi + n - 24, 33), 0.45, 0.3);
  }
}

function scheduler() {
  while (nextStepTime < ctx.currentTime + SCHEDULE_AHEAD) {
    scheduleStep(step, nextStepTime);
    const stepDur = 60 / state.bpm / 4;
    nextStepTime += stepDur;
    step = (step + 1) % (state.bars * 16);
  }
}

function start() {
  if (!ctx) {
    ctx = new AudioContext();
    master = ctx.createGain();
    compressor = ctx.createDynamicsCompressor();
    compressor.threshold.value = -1;
    compressor.knee.value = 0;
    compressor.ratio.value = 20;
    master.connect(compressor);
    compressor.connect(ctx.destination);
  }
  if (ctx.state === "suspended") ctx.resume();
  stop();
  state.playing = true;
  nextStepTime = ctx.currentTime + 0.1;
  step = 0;
  timerId = setInterval(scheduler, LOOKAHEAD_MS);
  document.getElementById("status").textContent = "Playing · live changes apply next step";
}

function stop() {
  state.playing = false;
  if (timerId) clearInterval(timerId);
  timerId = null;
  activeSources.forEach(s => { try { s.stop(); } catch(e){} });
  activeSources = [];
  document.getElementById("status").textContent = "Stopped";
}

document.getElementById("play").onclick = async () => {
  if (!ctx) {
    ctx = new AudioContext();
    const ok = await loadSamples();
    if (!ok) return;
  }
  if (ctx.state !== "running") await ctx.resume();
  start();
};
document.getElementById("stop").onclick = stop;
document.getElementById("bpm").onchange = e => { state.bpm = parseInt(e.target.value) || 100; };
document.getElementById("key").onchange = e => { state.key = e.target.value; };
document.getElementById("chords").onchange = e => {
  state.chords = e.target.value.split(/\s+/).filter(Boolean).slice(0,4);
  if (state.chords.length < 4) state.chords = [...state.chords, ...["C","G","Am","F"]].slice(0,4);
};

function paintRecipes() {
  const el = document.getElementById("recipes");
  el.innerHTML = "";
  recipes.forEach(r => {
    const b = document.createElement("button");
    b.className = "card" + (state.recipe.id === r.id ? " on" : "");
    b.innerHTML = `<b>${r.name}</b><br><span>${r.blurb}</span>`;
    b.onclick = () => { state.recipe = r; paintRecipes(); };
    el.appendChild(b);
  });
}
paintRecipes();

// Visibility stop
document.addEventListener("visibilitychange", () => {
  if (document.hidden && state.playing) stop();
});

// Persist
function save() {
  localStorage.setItem("arpfour", JSON.stringify({bpm:state.bpm, key:state.key, chords:state.chords, recipe:state.recipe.id}));
}
window.addEventListener("beforeunload", save);
try {
  const saved = JSON.parse(localStorage.getItem("arpfour") || "{}");
  if (saved.bpm) state.bpm = saved.bpm;
  if (saved.key) state.key = saved.key;
  if (saved.chords) state.chords = saved.chords;
  document.getElementById("bpm").value = state.bpm;
  document.getElementById("key").value = state.key;
  document.getElementById("chords").value = state.chords.join(" ");
} catch(e) {}

console.log("ArpFour ready · pinned samples · lookahead scheduler");