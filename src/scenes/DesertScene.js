import { BaseMapScene } from './BaseMapScene.js';

// 黃沙遺跡（地圖機制見 config/maps.js 的 modifier 與 engine/mapModifiers.js）
export class DesertScene extends BaseMapScene {
  constructor() { super('DesertScene', 'desert'); }
}
