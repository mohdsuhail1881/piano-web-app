'use strict';
/* Playable Piano — DOM + Web Audio layer. Pure note logic lives in logic.js */
const L = window.PianoLogic;
const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];

let ctx = null;
let baseMidi = 60; // C4
let sustainOn = false;
let activeVoices = new Map(); // midi -> {oscillators, gain, stop}
let recording = null; // {start, events: [{midi, at}]}
let songTimer = null;
let songPlaying = false;

function ensureCtx() {
  if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}
function volume() { return Number($('#volume').value) / 100; }

function noteOn(midi) {
  const ac = ensureCtx();
  const freq = L.midiToFreq(midi);
  const gain = ac.createGain();
  gain.connect(ac.destination);
  const t = ac.currentTime;
  const type = $('#waveform').value;
  const vol = volume() * 0.5;
  gain.gain.setValueAtTime(0, t);
  gain.gain.linearRampToValueAtTime(vol, t + 0.008);
  if (type === 'piano') {
    // Piano-like: fundamental + quiet 2nd and 3rd harmonics, natural decay.
    const oscs = [1, 2, 3].map((mult, i) => {
      const o = ac.createOscillator();
      o.type = 'sine';
      o.frequency.value = freq * mult;
      const g = ac.createGain();
      g.gain.value = [1, 0.35, 0.12][i];
      o.connect(g); g.connect(gain);
      o.start(t);
      return o;
    });
    gain.gain.exponentialRampToValueAtTime(0.001, t + 2.2);
    const voice = { oscs, gain, stop: (when) => { try { oscs.forEach((o) => o.stop(when)); } catch (e) {} } };
    activeVoices.set(midi, voice);
    // Auto-cleanup after decay, unless sustained.
    setTimeout(() => { if (activeVoices.get(midi) === voice) activeVoices.delete(midi); }, 2400);
  } else {
    const o = ac.createOscillator();
    o.type = type;
    o.connect(gain);
    o.start(t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 1.6);
    activeVoices.set(midi, { oscs: [o], gain, stop: (when) => { try { o.stop(when); } catch (e) {} } });
  }
  markKey(midi, true);
  $('#now-playing').textContent = 'Now playing: ' + L.noteName(midi) + '  (' + Math.round(freq) + ' Hz)';
  if (recording) recording.events.push({ midi, at: performance.now() - recording.start });
}
function noteOff(midi) {
  if (sustainOn) return;
  const v = activeVoices.get(midi);
  if (v) {
    const ac = ctx; if (ac) { v.gain.gain.cancelScheduledValues(ac.currentTime); v.gain.gain.setTargetAtTime(0, ac.currentTime, 0.08); }
    setTimeout(() => { try { v.stop(ctx ? ctx.currentTime + 0.5 : 0); } catch (e) {} }, 400);
    activeVoices.delete(midi);
  }
  markKey(midi, false);
}
function releaseAll() {
  sustainOn = false; updateSustainBtn();
  [...activeVoices.keys()].forEach((m) => noteOff(m));
}
function markKey(midi, on) {
  const el = document.querySelector(`[data-midi="${midi}"]`);
  if (el) el.classList.toggle('active', on);
}

/* ---------- build keys ---------- */
const pianoEl = $('#piano');
function buildKeys() {
  pianoEl.innerHTML = '';
  // White keys first (flow layout), then black keys positioned over the gaps.
  const whites = [];
  for (let i = 0; i < 24; i++) {
    const midi = baseMidi + i;
    if (!L.isBlack(midi)) whites.push(midi);
  }
  whites.forEach((midi) => {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'white-key'; b.dataset.midi = midi;
    b.setAttribute('aria-label', 'Play ' + L.noteName(midi));
    b.innerHTML = `<span>${L.noteName(midi)}</span><span class="key-note">${keyLabelFor(midi) || ''}</span>`;
    bindKeyButton(b, midi);
    pianoEl.appendChild(b);
  });
  // Black key x-position: after the white key that precedes it, in white-key units.
  let whiteIndex = -1;
  for (let i = 0; i < 24; i++) {
    const midi = baseMidi + i;
    if (!L.isBlack(midi)) { whiteIndex++; continue; }
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'black-key'; b.dataset.midi = midi;
    b.setAttribute('aria-label', 'Play ' + L.noteName(midi));
    // left edge of the gap after whiteIndex-th white key
    b.style.left = `calc(8px + (100% - 16px) / 14 * ${whiteIndex + 1})`;
    b.innerHTML = `<span>${L.noteName(midi)}</span><span class="key-note">${keyLabelFor(midi) || ''}</span>`;
    bindKeyButton(b, midi);
    pianoEl.appendChild(b);
  }
  $('#octave-label').textContent = L.noteName(baseMidi) + ' – ' + L.noteName(baseMidi + 23);
}
function keyLabelFor(midi) {
  const off = midi - baseMidi;
  for (const [k, v] of Object.entries(L.KEY_MAP)) if (v === off) return k.toUpperCase();
  return '';
}
function bindKeyButton(btn, midi) {
  btn.addEventListener('pointerdown', (e) => { e.preventDefault(); btn.setPointerCapture(e.pointerId); noteOn(midi); });
  const off = () => noteOff(midi);
  btn.addEventListener('pointerup', off);
  btn.addEventListener('pointercancel', off);
  btn.addEventListener('pointerleave', off);
}
buildKeys();

/* ---------- controls ---------- */
$('#oct-down').addEventListener('click', () => { if (baseMidi > 36) { baseMidi -= 12; buildKeys(); } });
$('#oct-up').addEventListener('click', () => { if (baseMidi < 72) { baseMidi += 12; buildKeys(); } });
function updateSustainBtn() {
  const b = $('#sustain');
  b.textContent = 'Sustain: ' + (sustainOn ? 'On' : 'Off');
  b.setAttribute('aria-pressed', String(sustainOn));
}
$('#sustain').addEventListener('click', () => { sustainOn = !sustainOn; updateSustainBtn(); if (!sustainOn) releaseAll(); });
updateSustainBtn();

/* ---------- computer keyboard ---------- */
const heldKeys = new Set();
window.addEventListener('keydown', (e) => {
  if (e.repeat) return;
  if (e.key === 'Shift') { sustainOn = true; updateSustainBtn(); return; }
  const midi = L.keyToMidi(e.key, baseMidi);
  if (midi === null) return;
  e.preventDefault();
  heldKeys.add(e.key.toLowerCase());
  noteOn(midi);
});
window.addEventListener('keyup', (e) => {
  if (e.key === 'Shift') { sustainOn = false; updateSustainBtn(); [...activeVoices.keys()].forEach((m) => noteOff(m)); return; }
  const midi = L.keyToMidi(e.key, baseMidi);
  if (midi === null) return;
  heldKeys.delete(e.key.toLowerCase());
  noteOff(midi);
});

/* ---------- recording ---------- */
/* noteOn() already appends to recording.events while recording is on.
   On Stop we copy those events to savedRec, so Play works after stopping. */
const recBtn = $('#rec-toggle'), playRecBtn = $('#play-rec'), clearRecBtn = $('#clear-rec');
let savedRec = [];
recBtn.addEventListener('click', () => {
  if (recording) {
    savedRec = recording.events.slice();
    recording = null;
    recBtn.textContent = 'Start recording';
    $('#rec-indicator').hidden = true;
    $('#rec-status').textContent = savedRec.length
      ? 'Recording saved (' + savedRec.length + ' notes). Press Play recording to hear it.'
      : 'No notes were played while recording.';
    playRecBtn.disabled = !savedRec.length;
    clearRecBtn.disabled = !savedRec.length;
  } else {
    savedRec = [];
    playRecBtn.disabled = true; clearRecBtn.disabled = true;
    recording = { start: performance.now(), events: [] };
    recBtn.textContent = 'Stop recording';
    $('#rec-indicator').hidden = false;
    $('#rec-status').textContent = 'Recording… play something, then Stop.';
  }
});
playRecBtn.addEventListener('click', () => {
  if (!savedRec.length) return;
  ensureCtx();
  savedRec.forEach((ev) => setTimeout(() => { noteOn(ev.midi); setTimeout(() => noteOff(ev.midi), 450); }, ev.at));
  $('#rec-status').textContent = 'Playing back ' + savedRec.length + ' notes…';
});
clearRecBtn.addEventListener('click', () => {
  savedRec = []; recording = null;
  recBtn.textContent = 'Start recording'; $('#rec-indicator').hidden = true;
  playRecBtn.disabled = true; clearRecBtn.disabled = true;
  $('#rec-status').textContent = 'Nothing recorded yet.';
});

/* ---------- demo songs ---------- */
function stopSong() {
  songPlaying = false;
  if (songTimer) { clearTimeout(songTimer); songTimer = null; }
  $('#stop-song').disabled = true;
  $$('.song').forEach((b) => { b.disabled = false; });
}
$('#stop-song').addEventListener('click', stopSong);
$$('.song').forEach((btn) => btn.addEventListener('click', () => {
  const song = L.SONGS[btn.dataset.song];
  if (!song) return;
  stopSong();
  songPlaying = true;
  $('#stop-song').disabled = false;
  $$('.song').forEach((b) => { b.disabled = true; });
  $('#now-playing').textContent = 'Playing: ' + song.title + ' — watch the keys';
  let i = 0;
  const step = () => {
    if (!songPlaying || i >= song.notes.length) { stopSong(); return; }
    const [midi, beats] = song.notes[i++];
    // If the note is outside the current 2-octave view, shift the view to it.
    if (midi < baseMidi || midi >= baseMidi + 24) {
      baseMidi = Math.max(36, Math.min(72, Math.floor((midi - 60) / 12) * 12 + 60));
      buildKeys();
    }
    noteOn(midi);
    setTimeout(() => noteOff(midi), Math.max(250, beats * 450 - 80));
    songTimer = setTimeout(step, beats * 450);
  };
  step();
}));
