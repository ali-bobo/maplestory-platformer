// 裝備定義與生成邏輯

export const RARITIES = {
  common:    { name: '普通', color: '#aaaaaa', hex: 0xaaaaaa, weight: 60 },
  rare:      { name: '稀有', color: '#4488ff', hex: 0x4488ff, weight: 25 },
  epic:      { name: '史詩', color: '#aa44ff', hex: 0xaa44ff, weight: 12 },
  legendary: { name: '傳說', color: '#ffaa00', hex: 0xffaa00, weight: 3  },
};

const RARITY_MULT = {
  common: 1.0, rare: 1.5, epic: 2.2, legendary: 3.5,
};

export const EQUIPMENT_SLOTS = ['weapon', 'armor', 'gloves', 'helmet', 'boots'];

export const EQUIPMENT_BASES = {
  weapon:  { name: '短劍',  slot: 'weapon',  baseAtk: 20, baseHp: 0,  baseMp: 0,  baseSpeed: 0,  spriteKey: 'item-weapon'  },
  armor:   { name: '皮甲',  slot: 'armor',   baseAtk: 0,  baseHp: 40, baseMp: 15, baseSpeed: 0,  spriteKey: 'item-armor'   },
  gloves:  { name: '手套',  slot: 'gloves',  baseAtk: 8,  baseHp: 12, baseMp: 0,  baseSpeed: 5,  spriteKey: 'item-gloves'  },
  helmet:  { name: '帽子',  slot: 'helmet',  baseAtk: 0,  baseHp: 25, baseMp: 20, baseSpeed: 0,  spriteKey: 'item-helmet'  },
  boots:   { name: '靴子',  slot: 'boots',   baseAtk: 0,  baseHp: 18, baseMp: 0,  baseSpeed: 12, spriteKey: 'item-boots'   },
};

export function rollRarity() {
  const entries = Object.entries(RARITIES);
  const total = entries.reduce((s, [, r]) => s + r.weight, 0);
  let rand = Math.random() * total;
  for (const [key, r] of entries) {
    rand -= r.weight;
    if (rand <= 0) return key;
  }
  return 'common';
}

export function generateEquipment(slotKey, playerLevel = 1) {
  const base = EQUIPMENT_BASES[slotKey];
  if (!base) return null;
  const rarity = rollRarity();
  const mult = RARITY_MULT[rarity];
  const lvBonus = 1 + (playerLevel - 1) * 0.06;
  return {
    ...base,
    rarity,
    rarityColor: RARITIES[rarity].hex,
    displayName: `${RARITIES[rarity].name}${base.name}`,
    atk:   Math.floor(base.baseAtk  * mult * lvBonus),
    hp:    Math.floor(base.baseHp   * mult * lvBonus),
    mp:    Math.floor(base.baseMp   * mult * lvBonus),
    speed: Math.floor(base.baseSpeed * mult * lvBonus),
  };
}

export function isEquipmentBetter(newItem, currentItem) {
  if (!currentItem) return true;
  const score = (item) => item.atk * 2 + item.hp * 0.5 + item.mp * 0.3 + item.speed;
  return score(newItem) > score(currentItem);
}

export function rollEquipmentDrop(playerLevel, dropRate) {
  if (Math.random() > dropRate) return null;
  const slots = EQUIPMENT_SLOTS;
  const slot = slots[Math.floor(Math.random() * slots.length)];
  return generateEquipment(slot, playerLevel);
}
