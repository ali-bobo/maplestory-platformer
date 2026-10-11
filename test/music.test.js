import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  noteToMidi, midiToFreq, parseChord, parseBar, voiceLead, bassNote, scalePcs, STEPS_PER_BAR,
} from '../src/engine/music/theory.js';
import { TRACKS, compileTrack } from '../src/engine/music/tracks.js';

const ic = (a, b) => { const d = (((a - b) % 12) + 12) % 12; return Math.min(d, 12 - d); };

test('音名與頻率：A4=440、C4=261.63、F#5、Bb3', () => {
  assert.equal(noteToMidi('A4'), 69);
  assert.equal(noteToMidi('C4'), 60);
  assert.equal(noteToMidi('F#5'), 78);
  assert.equal(noteToMidi('Bb3'), 58);
  assert.equal(noteToMidi('H4'), null);
  assert.ok(Math.abs(midiToFreq(69) - 440) < 1e-9);
  assert.ok(Math.abs(midiToFreq(60) - 261.6256) < 1e-3);
});

test('和弦解析：Am / Cmaj7 / G7 / C/E / F#m7 / B', () => {
  assert.deepEqual(parseChord('Am').pcs, [9, 0, 4]);
  assert.deepEqual(parseChord('Cmaj7').pcs, [0, 4, 7, 11]);
  assert.deepEqual(parseChord('G7').pcs, [7, 11, 2, 5]);
  assert.equal(parseChord('C/E').bassPc, 4);
  assert.deepEqual(parseChord('F#m7').pcs, [6, 9, 1, 4]);
  assert.deepEqual(parseChord('B').pcs, [11, 3, 6]);
  assert.throws(() => parseChord('H'));
});

test('旋律記譜：總長必須剛好 16，音符與休止符解析正確', () => {
  const ev = parseBar('E5.4 r.4 G5.8');
  assert.deepEqual(ev.map((e) => [e.pos, e.dur, e.midi]), [[0, 4, 76], [4, 4, null], [8, 8, 79]]);
  assert.throws(() => parseBar('E5.4 G5.4'));
  assert.throws(() => parseBar('E5.4 G5.4 X5.8'));
});

test('聲部連接：和弦音只含和弦內音、在範圍內、相鄰和弦移動小', () => {
  const am = parseChord('Am'); const f = parseChord('F');
  const v1 = voiceLead(null, am.pcs, 55, 74);
  const v2 = voiceLead(v1, f.pcs, 55, 74);
  for (const m of v1) assert.ok(am.pcs.includes(m % 12) && m >= 55 && m <= 74);
  for (const m of v2) assert.ok(f.pcs.includes(m % 12) && m >= 55 && m <= 74);
  const move = v2.reduce((s, m, i) => s + Math.abs(m - v1[i]), 0);
  assert.ok(move <= 6, `Am→F 總移動 ${move}`);
});

test('低音落在 C2..B2（小喇叭也聽得到）', () => {
  for (let pc = 0; pc < 12; pc++) {
    const m = bassNote(pc, 36);
    assert.ok(m >= 36 && m <= 47 && m % 12 === pc);
  }
});

for (const [name, track] of Object.entries(TRACKS)) {
  const compiled = compileTrack(track);
  const key = new Set(scalePcs(track.key.tonic, track.key.mode));

  test(`[${name}] 結構：16 小節、和弦與旋律對齊、BPM 合理`, () => {
    assert.equal(compiled.bars, 16);
    assert.equal(track.lead.length, 16);
    assert.ok(track.bpm >= 80 && track.bpm <= 170);
    for (const bar of track.lead) parseBar(bar);   // 每小節剛好 16 步
  });

  test(`[${name}] 旋律強拍（第 1、3 拍起音）一定是當下和弦的和弦音`, () => {
    const bad = [];
    track.lead.forEach((str, b) => {
      const chord = compiled.chords[b];
      for (const e of parseBar(str)) {
        if (e.midi === null || (e.pos !== 0 && e.pos !== 8)) continue;
        if (!chord.pcs.includes(e.midi % 12)) bad.push(`第${b + 1}小節 位置${e.pos} 音${e.midi}（${chord.name}）`);
      }
    });
    assert.deepEqual(bad, []);
  });

  test(`[${name}] 旋律音都在調內或屬於當下和弦（沒有不屬於調性的外音）`, () => {
    const bad = [];
    track.lead.forEach((str, b) => {
      const chord = compiled.chords[b];
      for (const e of parseBar(str)) {
        if (e.midi === null) continue;
        const pc = e.midi % 12;
        if (!key.has(pc) && !chord.pcs.includes(pc)) bad.push(`第${b + 1}小節 音${e.midi}（${chord.name}）`);
      }
    });
    assert.deepEqual(bad, []);
  });

  test(`[${name}] 持續 4 拍分之一以上的旋律音不與和弦音構成小二度 / 大七度`, () => {
    const bad = [];
    track.lead.forEach((str, b) => {
      const chord = compiled.chords[b];
      for (const e of parseBar(str)) {
        if (e.midi === null || e.dur < 4) continue;
        const pc = e.midi % 12;
        for (const cp of chord.pcs) {
          if (cp !== pc && ic(pc, cp) === 1) bad.push(`第${b + 1}小節 音${e.midi} 與和弦音 ${cp}（${chord.name}）`);
        }
      }
    });
    assert.deepEqual(bad, []);
  });

  test(`[${name}] 低音在每小節第一拍彈和弦根音（或斜線和弦指定的低音）`, () => {
    compiled.events.forEach((evs, b) => {
      const first = evs.find((e) => e.voice === 'bass' && e.pos === 0);
      assert.ok(first, `第${b + 1}小節沒有低音`);
      assert.equal(first.midi % 12, compiled.chords[b].bassPc);
      assert.ok(first.midi >= 36 && first.midi <= 47);
    });
  });

  test(`[${name}] 所有音符事件在合理音域，且伴奏 / 襯底只用和弦內音`, () => {
    compiled.events.forEach((evs, b) => {
      for (const e of evs) {
        if (e.voice === 'perc') continue;
        assert.ok(e.midi >= 28 && e.midi <= 100, `音域 ${e.midi}`);
        assert.ok(e.pos >= 0 && e.pos < STEPS_PER_BAR && e.dur > 0);
        if (['pad', 'comp', 'sparkle', 'drone'].includes(e.voice)) {
          assert.ok(compiled.chords[b].pcs.includes(e.midi % 12), `${e.voice} 第${b + 1}小節 音${e.midi} 不在 ${compiled.chords[b].name}`);
        }
      }
    });
  });

  test(`[${name}] 高音閃爍不與旋律同時構成小二度 / 大七度`, () => {
    const bad = [];
    compiled.events.forEach((evs, b) => {
      const leads = evs.filter((e) => e.voice === 'lead');
      for (const s of evs.filter((e) => e.voice === 'sparkle')) {
        for (const l of leads) {
          const overlap = Math.min(s.pos + s.dur, l.pos + l.dur) - Math.max(s.pos, l.pos);
          if (overlap >= 2 && ic(s.midi, l.midi) === 1) bad.push(`第${b + 1}小節 ${s.midi} vs ${l.midi}`);
        }
      }
    });
    assert.deepEqual(bad, []);
  });

  test(`[${name}] 襯底和弦的聲部連接平順（平均每聲部每次換和弦移動 ≤ 4 半音）`, () => {
    const pads = compiled.events.map((evs) => evs.filter((e) => e.voice === 'pad').map((e) => e.midi).sort((a, b) => a - b)).filter((p) => p.length);
    let total = 0; let n = 0;
    for (let i = 1; i < pads.length; i++) {
      if (pads[i].length !== pads[i - 1].length) continue;
      for (let k = 0; k < pads[i].length; k++) { total += Math.abs(pads[i][k] - pads[i - 1][k]); n++; }
    }
    assert.ok(total / n <= 4, `平均移動 ${(total / n).toFixed(2)}`);
  });

  test(`[${name}] 循環銜接：最後一小節和弦能順接回第一小節（根音進行為 4/5 度、級進或同音）`, () => {
    const last = compiled.chords[15]; const first = compiled.chords[0];
    const d = ic(last.rootPc, first.rootPc);
    assert.ok([0, 1, 2, 3, 5].includes(d), `${last.name} → ${first.name} 間隔 ${d}`);
  });
}
