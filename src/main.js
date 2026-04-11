import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene.js';
import { MenuScene } from './scenes/MenuScene.js';
import { MapleIslandScene } from './scenes/MapleIslandScene.js';
import { HenesysScene } from './scenes/HenesysScene.js';
import { ElliniaScene } from './scenes/ElliniaScene.js';
import { PerionScene } from './scenes/PerionScene.js';
import { KerningScene } from './scenes/KerningScene.js';
import { TownScene } from './scenes/TownScene.js';
import { BossScene } from './scenes/BossScene.js';
import { UIScene } from './scenes/UIScene.js';
import { GameOverScene } from './scenes/GameOverScene.js';

const config = {
  type: Phaser.AUTO,
  width: 1280,
  height: 720,
  parent: 'game-container',
  backgroundColor: '#87ceeb',
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { y: 1000 },
      debug: false,
    },
  },
  scene: [
    BootScene,
    MenuScene,
    MapleIslandScene,
    HenesysScene,
    ElliniaScene,
    PerionScene,
    KerningScene,
    TownScene,
    BossScene,
    UIScene,
    GameOverScene,
  ],
};

export const game = new Phaser.Game(config);
