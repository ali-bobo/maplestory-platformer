// 音樂理論工具（純函式，無 Web Audio 依賴，可在 Node 單元測試）
//
// 音高一律用 MIDI 編號；音名格式 'C4' / 'F#5' / 'Bb3'，'r' 為休止符。
// 一小節固定 16 個十六分音符（4/4）。

export const STEPS_PER_BAR = 16;

const PC = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

export function pitchClass(letter, accidental = '') {
  let pc = PC[letter];
  if (pc === undefined) return null;
  if (accidental === '#') pc += 1;
  else if (accidental === 'b') pc -= 1;
  return ((pc % 12) + 12) % 12;
}

// 'F#5' → 78；不合法回傳 null
export function noteToMidi(name) {
  const m = /^([A-G])([#b]?)(-?\d)$/.exec(name || '');
  if (!m) return null;
  return 12 * (parseInt(m[3], 10) + 1) + pitchClass(m[1], m[2]);
}

export function midiToFreq(midi) {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

export const CHORD_QUALITIES = {
  '':     [0, 4, 7],
  m:      [0, 3, 7],
  dim:    [0, 3, 6],
  aug:    [0, 4, 8],
  sus2:   [0, 2, 7],
  sus4:   [0, 5, 7],
  '6':    [0, 4, 7, 9],
  '7':    [0, 4, 7, 10],
  maj7:   [0, 4, 7, 11],
  m7:     [0, 3, 7, 10],
  m7b5:   [0, 3, 6, 10],
  add9:   [0, 4, 7, 14],
};

// 'Am' / 'F#m7' / 'Cmaj7' / 'G7' / 'C/E' → { name, rootPc, bassPc, pcs:[…], thirdPc, fifthPc }
export function parseChord(sym) {
  const m = /^([A-G])([#b]?)(maj7|m7b5|m7|dim|aug|sus2|sus4|add9|6|7|m)?(?:\/([A-G])([#b]?))?$/.exec(sym || '');
  if (!m) throw new Error(`無法解析和弦：${sym}`);
  const rootPc = pitchClass(m[1], m[2]);
  const intervals = CHORD_QUALITIES[m[3] || ''];
  const pcs = intervals.map((i) => (rootPc + i) % 12);
  const bassPc = m[4] ? pitchClass(m[4], m[5]) : rootPc;
  const third = intervals.includes(3) ? 3 : intervals.includes(4) ? 4 : intervals.includes(2) ? 2 : intervals.includes(5) ? 5 : 7;
  return {
    name: sym, rootPc, bassPc, pcs, thirdPc: (rootPc + third) % 12,
    fifthPc: (rootPc + (intervals.includes(6) ? 6 : intervals.includes(8) ? 8 : 7)) % 12,
  };
}

// 解析一小節旋律：'E5.4 G5.4 r.8' → [{ pos, dur, midi|null }]；總長必須剛好 16
export function parseBar(str) {
  const events = [];
  let pos = 0;
  for (const tok of String(str).trim().split(/\s+/)) {
    const m = /^([A-G][#b]?\d|r)\.(\d+)$/.exec(tok);
    if (!m) throw new Error(`旋律記譜錯誤：「${tok}」（在「${str}」）`);
    const dur = parseInt(m[2], 10);
    events.push({ pos, dur, midi: m[1] === 'r' ? null : noteToMidi(m[1]) });
    pos += dur;
  }
  if (pos !== STEPS_PER_BAR) throw new Error(`一小節必須是 ${STEPS_PER_BAR} 個十六分音符，實際 ${pos}：「${str}」`);
  return events;
}

// 在 [lo, hi] 內選出每個和弦音的八度，使與前一個聲部配置移動最少（聲部連接，避免和弦跳來跳去）
export function voiceLead(prev, pcs, lo = 52, hi = 76) {
  const options = pcs.map((pc) => {
    const list = [];
    for (let m = lo; m <= hi; m++) if (((m % 12) + 12) % 12 === pc) list.push(m);
    return list;
  });
  let best = null;
  let bestCost = Infinity;
  const pick = (i, chosen) => {
    if (i === options.length) {
      const sorted = [...chosen].sort((a, b) => a - b);
      let cost = 0;
      if (prev && prev.length === sorted.length) {
        for (let k = 0; k < sorted.length; k++) cost += Math.abs(sorted[k] - prev[k]);
      } else {
        const center = (lo + hi) / 2;
        cost = Math.abs(sorted[0] - (lo + 6)) + Math.abs(sorted[sorted.length - 1] - center - 6);
      }
      // 太開的排列扣分（聽起來空洞）
      cost += Math.max(0, sorted[sorted.length - 1] - sorted[0] - 14) * 2;
      if (cost < bestCost) { bestCost = cost; best = sorted; }
      return;
    }
    for (const m of options[i]) pick(i + 1, [...chosen, m]);
  };
  pick(0, []);
  return best;
}

// 低音：落在 [lo, hi]（預設 C2..B2，小喇叭也聽得到）
export function bassNote(pc, lo = 36) {
  let m = lo;
  while (((m % 12) + 12) % 12 !== pc) m++;
  return m;
}

export const SCALES = {
  major:      [0, 2, 4, 5, 7, 9, 11],
  minor:      [0, 2, 3, 5, 7, 8, 10],
  dorian:     [0, 2, 3, 5, 7, 9, 10],
  // 混合利地亞：大調但第 7 音降半音（水手號子 / 民謠）
  mixolydian: [0, 2, 4, 5, 7, 9, 10],
  // 和聲小調：用於 V 級和弦（升高的第 7 音）
  harmonic:   [0, 2, 3, 5, 7, 8, 11],
  // Hijaz（弗里吉亞屬調式）：沙漠 / 阿拉伯風，第 2 與第 3 音之間是增二度（例如 A 調的 Bb→C#）
  hijaz:      [0, 1, 4, 5, 7, 8, 10],
  phrygian:   [0, 1, 3, 5, 7, 8, 10],
};

export function scalePcs(tonic, mode) {
  const root = pitchClass(tonic[0], tonic.slice(1));
  return SCALES[mode].map((i) => (root + i) % 12);
}
