// 聲音開關按鈕（Phaser 物件，木框小方塊 + 喇叭圖示）。主選單與遊戲 HUD 共用。
// 點一下切換全域靜音（音樂 + 音效）；偏好由 audio 記在 localStorage。

import { audio } from './audio.js';

export function addSoundButton(scene, x, y, { depth = 300, size = 40 } = {}) {
  const bg = scene.add.rectangle(x, y, size, size, 0x3a2410, 0.88)
    .setStrokeStyle(2, 0xd9a441).setDepth(depth).setScrollFactor(0)
    .setInteractive({ useHandCursor: true });
  const icon = scene.add.text(x, y, '', {
    fontSize: `${Math.round(size * 0.52)}px`, fontFamily: 'Arial, sans-serif',
  }).setOrigin(0.5).setDepth(depth + 1).setScrollFactor(0);
  const refresh = () => {
    icon.setText(audio.isMuted() ? '🔇' : '🔊');
    icon.setAlpha(audio.isMuted() ? 0.7 : 1);
  };
  bg.on('pointerover', () => bg.setFillStyle(0x5a3a1c, 0.95));
  bg.on('pointerout', () => bg.setFillStyle(0x3a2410, 0.88));
  bg.on('pointerdown', () => { audio.setMuted(!audio.isMuted()); refresh(); });
  refresh();
  return { bg, icon, objects: [bg, icon], refresh };
}
