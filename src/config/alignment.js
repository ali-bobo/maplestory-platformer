const createProfile = ({ displayWidth, displayHeight, bodyWidth, bodyOffsetX, bodyOffsetY, footPadding }) => ({
  displayWidth,
  displayHeight,
  bodyWidth,
  bodyOffsetX,
  bodyOffsetY,
  footPadding,
  bodyHeight: displayHeight - bodyOffsetY - footPadding,
});

// 新版角色/怪物圖已裁到腳底貼齊圖片底邊，只有 Boss 仍沿用 profile 內的 footPadding。
function resolveFootPadding(entity, profile) {
  return profile.footPadding;
}

export const ALIGNMENT_PROFILES = {
  // 主角動作圖統一為 100x80 畫布，腳底貼齊底邊、身體置中
  player: createProfile({
    displayWidth: 100,
    displayHeight: 80,
    bodyWidth: 44,
    bodyOffsetX: 28,
    bodyOffsetY: 10,
    footPadding: 0,
  }),
  monster: createProfile({
    displayWidth: 56,
    displayHeight: 56,
    bodyWidth: 44,
    bodyOffsetX: 6,
    bodyOffsetY: 4,
    footPadding: 0,
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