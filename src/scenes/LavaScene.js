import { BaseMapScene } from './BaseMapScene.js';

// 熔岩巢穴（地圖機制見 config/maps.js 的 modifier 與 engine/mapModifiers.js）
export class LavaScene extends BaseMapScene {
  constructor() { super('LavaScene', 'lava'); }
}
