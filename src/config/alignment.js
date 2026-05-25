const createProfile = ({ displayWidth, displayHeight, bodyWidth, bodyOffsetX, bodyOffsetY, footPadding }) => ({
  displayWidth,
  displayHeight,
  bodyWidth,
  bodyOffsetX,
  bodyOffsetY,
  footPadding,
  bodyHeight: displayHeight - bodyOffsetY - footPadding,
});

const TEXTURE_FOOT_PADDING_RATIO = {
  final_char: 29 / 231,
  monster_boar: 9 / 80,
  monster_cyclops: 7 / 80,
  monster_dragon: 5 / 80,
  monster_golem: 7 / 80,
  monster_mimic: 8 / 80,
  monster_mushroom: 7 / 80,
  monster_robot: 7 / 80,
  monster_slime: 5 / 80,
  monster_snail: 5 / 80,
  monster_snake: 8 / 80,
  monster_stump: 6 / 80,
  monster_new_0: 4 / 219,
  monster_new_1: 4 / 201,
  monster_new_2: 4 / 199,
  monster_new_3: 3 / 230,
  monster_new_4: 1 / 261,
  monster_new_5: 3 / 173,
  monster_new_6: 4 / 203,
  monster_big_0: 1 / 425,
  monster_big_1: 2 / 408,
  monster_big_2: 2 / 417,
  monster_big_3: 0 / 460,
  monster_big_4: 0 / 403,
  miniboss_0: 0 / 609,
  miniboss_1: 0 / 577,
};

function resolveFootPadding(entity, profile) {
  const textureKey = entity?.texture?.key;
  const ratio = textureKey ? TEXTURE_FOOT_PADDING_RATIO[textureKey] : null;
  if (typeof ratio === 'number') {
    return Math.round(profile.displayHeight * ratio);
  }
  return profile.footPadding;
}

export const ALIGNMENT_PROFILES = {
  player: createProfile({
    displayWidth: 80,
    displayHeight: 80,
    bodyWidth: 48,
    bodyOffsetX: 16,
    bodyOffsetY: 10,
    footPadding: 2,
  }),
  monster: createProfile({
    displayWidth: 56,
    displayHeight: 56,
    bodyWidth: 44,
    bodyOffsetX: 6,
    bodyOffsetY: 4,
    footPadding: 1,
  }),
  // 暗影魔君：對齊裁切後的動作圖比例（來源 275x222）
  boss: createProfile({
    displayWidth: 260,
    displayHeight: 210,
    bodyWidth: 120,
    bodyOffsetX: 70,
    bodyOffsetY: 38,
    footPadding: 11,
  }),
};

export function applyAlignmentProfile(entity, profile) {
  const footPadding = resolveFootPadding(entity, profile);
  const sourceImage = entity.texture?.getSourceImage?.();
  const sourceWidth = sourceImage?.width || profile.displayWidth;
  const sourceHeight = sourceImage?.height || profile.displayHeight;
  const scaleX = profile.displayWidth / sourceWidth;
  const scaleY = profile.displayHeight / sourceHeight;
  const bodyWidth = profile.bodyWidth / scaleX;
  const bodyOffsetX = profile.bodyOffsetX / scaleX;
  const bodyOffsetY = profile.bodyOffsetY / scaleY;
  const bodyHeight = (profile.displayHeight - profile.bodyOffsetY - footPadding) / scaleY;

  entity.setOrigin(0.5, 1);
  entity.setDisplaySize(profile.displayWidth, profile.displayHeight);
  entity.body.setSize(bodyWidth, bodyHeight);
  entity.body.setOffset(bodyOffsetX, bodyOffsetY);
  entity.visualFootPadding = footPadding;
}

export function getVisualFootPadding(entity) {
  if (typeof entity?.visualFootPadding === 'number') {
    return entity.visualFootPadding;
  }
  if (!entity?.body) {
    return 0;
  }
  return Math.max(0, entity.displayHeight - entity.body.offset.y - entity.body.height);
}

export function getVisualTopY(entity) {
  return entity.y - entity.displayHeight * entity.originY;
}

export function getVisualCenterY(entity) {
  return getVisualTopY(entity) + entity.displayHeight / 2;
}

export function getVisualCenterPoint(entity) {
  return {
    x: entity.x,
    y: getVisualCenterY(entity),
  };
}