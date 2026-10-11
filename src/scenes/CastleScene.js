import { BaseMapScene } from './BaseMapScene.js';

// 魔君王城（地圖機制見 config/maps.js 的 modifier 與 engine/mapModifiers.js）
export class CastleScene extends BaseMapScene {
  constructor() { super('CastleScene', 'castle'); }
}
