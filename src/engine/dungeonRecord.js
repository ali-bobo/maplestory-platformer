// 副本每日進入次數記錄（Phase 14 MVP）
//
// localStorage 結構：
//   { date: 'YYYY-MM-DD', counts: { [dungeonId]: number } }
//
// 跨日自動歸零（檢測 date 不同就 reset）。本機儲存，跨 session 持久。

const STORAGE_KEY = 'maple_dungeon_daily_record';

function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function loadRecord() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { date: todayKey(), counts: {} };
    const rec = JSON.parse(raw);
    // 跨日歸零
    if (rec.date !== todayKey()) return { date: todayKey(), counts: {} };
    return rec;
  } catch (_) {
    return { date: todayKey(), counts: {} };
  }
}

function saveRecord(rec) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(rec));
  } catch (_) { /* localStorage 不可用就靜默（隱身模式等） */ }
}

// 是否還能進這個副本（未達當日上限）
export function canEnterDungeon(dungeonId, dailyLimit) {
  const rec = loadRecord();
  return (rec.counts[dungeonId] || 0) < dailyLimit;
}

// 記錄一次進入（次數 +1）
export function recordDungeonEntry(dungeonId) {
  const rec = loadRecord();
  rec.counts[dungeonId] = (rec.counts[dungeonId] || 0) + 1;
  saveRecord(rec);
}

// 取得今日剩餘次數（給 UI 顯示用）
export function getRemainingEntries(dungeonId, dailyLimit) {
  const rec = loadRecord();
  return Math.max(0, dailyLimit - (rec.counts[dungeonId] || 0));
}
