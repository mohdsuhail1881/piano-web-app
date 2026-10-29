'use strict';
/* Pure piano logic — no DOM, no AudioContext, so it can be unit-tested in Node. */
(function (root) {
  const NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  function midiToFreq(midi) { return 440 * Math.pow(2, (midi - 69) / 12); }
  function noteName(midi) { return NAMES[midi % 12] + (Math.floor(midi / 12) - 1); }
  function isBlack(midi) { return [1, 3, 6, 8, 10].indexOf(midi % 12) !== -1; }
  // Computer-key mapping. Lower octave on the Z row, upper octave on the Q row.
  // Key values are lowercase event.key values.
  const KEY_MAP = {
    z: 0, s: 1, x: 2, d: 3, c: 4, v: 5, g: 6, b: 7, h: 8, n: 9, j: 10, m: 11,
    q: 12, '2': 13, w: 14, '3': 15, e: 16, r: 17, '5': 18, t: 19, '6': 20, y: 21, '7': 22, u: 23,
  };
  function keyToMidi(key, baseMidi) {
    const off = KEY_MAP[String(key).toLowerCase()];
    return off === undefined ? null : baseMidi + off;
  }
  // Demo songs as [midi, beats] pairs, in C major. 1 beat = 0.45s in the player.
  const SONGS = {
    twinkle: { title: 'Twinkle Twinkle', notes: [[60, 1], [60, 1], [67, 1], [67, 1], [69, 1], [69, 1], [67, 2], [65, 1], [65, 1], [64, 1], [64, 1], [62, 1], [62, 1], [60, 2]] },
    ode: { title: 'Ode to Joy', notes: [[64, 1], [64, 1], [65, 1], [67, 1], [67, 1], [65, 1], [64, 1], [62, 1], [60, 1], [60, 1], [62, 1], [64, 1], [64, 1.5], [62, 0.5], [62, 2]] },
    birthday: { title: 'Happy Birthday', notes: [[67, 0.75], [67, 0.25], [69, 1], [67, 1], [72, 1], [71, 2], [67, 0.75], [67, 0.25], [69, 1], [67, 1], [74, 1], [72, 2], [67, 0.75], [67, 0.25], [69, 1], [67, 1], [79, 1], [76, 1], [72, 0.75], [72, 0.25], [71, 1], [67, 1], [74, 1], [72, 2]] },
  };
  const api = { NAMES, midiToFreq, noteName, isBlack, KEY_MAP, keyToMidi, SONGS };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.PianoLogic = api;
})(typeof window !== 'undefined' ? window : globalThis);
