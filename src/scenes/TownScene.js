import { BaseMapScene } from './BaseMapScene.js';

// 城鎮場景：和平安全區。商人的商店、星光之塔、傳送門都由 BaseMapScene 的通用機制處理（地圖資料決定）
export class TownScene extends BaseMapScene {
  constructor() {
    super('TownScene', 'town');
  }
}
