import { BaseMapScene } from './BaseMapScene.js';

// 霜牙峰（地圖機制見 config/maps.js 的 modifier 與 engine/mapModifiers.js）
export class SnowScene extends BaseMapScene {
  constructor() { super('SnowScene', 'snow'); }
}
