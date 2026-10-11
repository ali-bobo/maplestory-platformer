// 木質 / 羊皮紙 UI 元件：HUD、彈窗、對話框、結算畫面共用
//
// 紋理來自 dist/assets/hud_panel*.png（BootScene 預載），以 9-slice 伸縮。
// 所有元件預設 setScrollFactor(0)；世界座標用的（NPC 對話）傳 { world: true }。

export const PANEL_DARK_TINT = 0x5a4232; // 羊皮紙染深褐，配淺色字
const BUTTON_TINT = 0xe6d6bc;

/** 羊皮紙木框面板。dark=true 時染深色，適合放淺色文字 */
export function addParchmentPanel(scene, x, y, w, h, opts = {}) {
  const { dark = true, depth = 150, world = false } = opts;
  const panel = scene.add.nineslice(x, y, 'hud_panel', undefined, w, h, 30, 30, 30, 34)
    .setOrigin(0, 0).setDepth(depth);
  if (!world) panel.setScrollFactor(0);
  if (dark) panel.setTint(PANEL_DARK_TINT);
  return panel;
}

/**
 * 羊皮紙按鈕（置中座標）。回傳 { plate, label, objects }，objects 方便一併 destroy。
 */
export function addWoodButton(scene, cx, cy, w, h, text, onClick, opts = {}) {
  const { depth = 151, world = false, fontSize = 14 } = opts;
  const plate = scene.add.nineslice(cx, cy, 'hud_panel_sm', undefined, w, h, 9, 9, 9, 9)
    .setOrigin(0.5, 0.5).setDepth(depth).setTint(BUTTON_TINT)
    .setInteractive({ useHandCursor: true });
  const label = scene.add.text(cx, cy, text, {
    fontSize: `${fontSize}px`, color: '#3a2410', fontFamily: 'Arial', fontStyle: 'bold',
  }).setOrigin(0.5, 0.5).setDepth(depth + 1);
  if (!world) {
    plate.setScrollFactor(0);
    label.setScrollFactor(0);
  }
  plate.on('pointerover', () => { plate.clearTint(); label.setColor('#6b2a00'); });
  plate.on('pointerout',  () => { plate.setTint(BUTTON_TINT); label.setColor('#3a2410'); });
  plate.on('pointerdown', onClick);
  return { plate, label, objects: [plate, label] };
}
