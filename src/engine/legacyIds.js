// 舊存檔識別字的改名對照（地圖 key、徽章 id）
//
// 早期版本的地圖 key 與徽章 id 沿用了其他遊戲的地名；公開前改成中性的名稱。
// 已發布的存檔（localStorage、匯出檔案、存檔代碼）裡仍是舊名，sanitizeState 在驗證前
// 先用 migrateLegacyIds 換成新名，讀檔後會回到同一張地圖、保留同樣的徽章與進度。
//
// 這張表只增不減：舊名不得再被新內容拿去用。

export const LEGACY_MAP_KEYS = Object.freeze({
  henesys: 'forest',
  ellinia: 'mystic',
  kerning: 'alley',
});

export const LEGACY_BADGE_IDS = Object.freeze({
  henesys_1: 'forest_1',
  henesys_2: 'forest_2',
  henesys_3: 'forest_3',
  ellinia_1: 'mystic_1',
  ellinia_2: 'mystic_2',
  kerning_1: 'alley_1',
  kerning_2: 'alley_2',
});

const own = (table, k) => typeof k === 'string' && Object.prototype.hasOwnProperty.call(table, k);

export function migrateMapKey(key) {
  return own(LEGACY_MAP_KEYS, key) ? LEGACY_MAP_KEYS[key] : key;
}

export function migrateBadgeId(id) {
  return own(LEGACY_BADGE_IDS, id) ? LEGACY_BADGE_IDS[id] : id;
}

// 回傳一份淺拷貝，currentMap / visitedMaps / badges 換成新名；其他欄位原樣保留（交給 sanitizeState 驗證）。
// 不是物件就原樣回傳。
export function migrateLegacyIds(raw) {
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) return raw;
  const out = { ...raw };
  if ('currentMap' in raw) out.currentMap = migrateMapKey(raw.currentMap);
  if (Array.isArray(raw.visitedMaps)) out.visitedMaps = raw.visitedMaps.map(migrateMapKey);
  if (Array.isArray(raw.badges)) out.badges = raw.badges.map(migrateBadgeId);
  return out;
}
