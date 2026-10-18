import Phaser from 'phaser';
import { Monster } from './Monster.js';
import { particles } from '../engine/particles.js';
import { ALIGNMENT_PROFILES, applyAlignmentProfile, getVisualCenterY } from '../config/alignment.js';
import { getTable, jumpClassFor } from '../engine/platformGraph.js';
import { playFx } from './Skill.js';
import { FINAL_BOSS } from '../config/monsters.js';
import { settings } from '../engine/settings.js';

// 數值（config/monsters.js 的 FINAL_BOSS）：最終 Boss 至少要比區域守衛更耐打才有「決戰」的份量
const BOSS_HP = FINAL_BOSS.hp;
const BOSS_ATK = FINAL_BOSS.atk;
const BOSS_JUMP_VEL = 640;   // 能跳上相距約 200px 的平台（Boss 房每層落差 140–156）

// 暗影魔君 — 3 階段 Boss（招式與階段門檻見 config/monsterAttacks.js 的 boss 條目）
// 使用多張動作圖（待機 / 移動 / 攻擊 / 死亡），以狀態驅動姿勢動畫
export class Boss extends Monster {
  constructor(scene, x, y) {
    super(scene, x, y, {
      id: 'boss',
      name: '暗影魔君',
      level: 30,
      hp: BOSS_HP,
      atk: BOSS_ATK,
      exp: 5000,
      speed: 120,
      meso: 500,
      dropRate: 1.0,
      behavior: 'chase',
      spriteKey: 'boss_idle',
      area: 'boss',
    });

    // maxHp / hp 由 Monster 建構子依 config.hp（BOSS_HP）與難度倍率設定
    applyAlignmentProfile(this, ALIGNMENT_PROFILES.boss);
    this.knockbackResist = 0.9;

    // 永遠追著玩家；身體很寬，近戰距離與到位死區都要放大
    this.detectionRange = Infinity;
    this._detectionRangeSq = Infinity;
    this._chaseExtendedSq = Infinity;
    this.attackRange = 110;
    this._attackRangeSq = 110 * 110;
    this._arriveDist = 70;
    // 玩家在別的平台時，Boss 會跳上去 / 走下來
    this.steerJumpVel = BOSS_JUMP_VEL;
    this._table = this.graph ? getTable(this.graph, jumpClassFor(BOSS_JUMP_VEL)) : null;

    // 姿勢動畫狀態
    this._currentPose = 'boss_idle';
    this._attackPoseUntil = 0;

    // Boss 名稱文字
    this._nameText = scene.add.text(scene.cameras.main.width / 2, 80, '暗影魔君', {
      fontSize: '24px', color: '#ff44ff', fontFamily: 'Arial',
      stroke: '#000000', strokeThickness: 4,
    }).setScrollFactor(0).setDepth(100).setOrigin(0.5, 0.5);

    // Boss 血條：Phase 3.2 全部改 Rectangle，消除 Graphics 持久存在的開銷
    // 邊框用「外層大白底 + 內層黑底覆蓋」雙層模擬 strokeRect，
    // 相位分隔線用兩條垂直細 rectangle 取代 strokePath
    const sw = scene.cameras.main.width;
    const bw = sw * 0.7, bh = 16, bx = sw * 0.15, by = 100;
    this._bossHpBarMetrics = { bw, bh, bx, by };
    this._lastBossHpRatio = -1;

    // 邊框（白色稍大，alpha 0.6 模擬白邊）
    this._bossHpBorder = scene.add.rectangle(bx + bw / 2, by + bh / 2, bw + 4, bh + 4, 0xffffff, 0.6)
      .setScrollFactor(0).setDepth(98);
    // 黑底
    this._bossHpBg = scene.add.rectangle(bx + bw / 2, by + bh / 2, bw, bh, 0x000000, 0.8)
      .setScrollFactor(0).setDepth(99);
    // 動態前景血條：origin (0,0) 左對齊，scaleX 控制 HP 比例
    this._bossFgBar = scene.add.rectangle(bx, by, bw, bh, 0xff0066)
      .setOrigin(0, 0).setScrollFactor(0).setDepth(100);
    // 相位分隔線：血條由右往左縮短，階段門檻（70% / 35%）在左起 0.7 / 0.35 處
    const [ph2, ph3] = FINAL_BOSS.phaseAt;
    this._bossPhaseLine1 = scene.add.rectangle(bx + bw * ph2, by + bh / 2, 2, bh, 0xffffff, 0.6)
      .setScrollFactor(0).setDepth(101);
    this._bossPhaseLine2 = scene.add.rectangle(bx + bw * ph3, by + bh / 2, 2, bh, 0xffffff, 0.6)
      .setScrollFactor(0).setDepth(101);

    this._updateBossHpBar();
  }

  // ── 姿勢動畫 ─────────────────────────────────────────────────────────────
  // 第 3 階段（狂暴）起，待機 / 移動 / 攻擊改用 boss_rage_*（圖沒載到就沿用一般版）
  _setPose(poseKey) {
    if (this._rage && /^boss_(idle|move|attack)$/.test(poseKey)) {
      const rageKey = poseKey.replace('boss_', 'boss_rage_');
      if (this.scene.textures.exists(rageKey)) poseKey = rageKey;
    }
    if (this._currentPose === poseKey || !this.active) return;
    this._currentPose = poseKey;
    this.setTexture(poseKey);
  }

  // 依移動狀態切換待機 / 移動姿勢（攻擊與死亡姿勢另外鎖定）
  _updatePose() {
    if (this.isDead) return;
    if (this.scene.time.now < this._attackPoseUntil) return;
    const moving = this.body && Math.abs(this.body.velocity.x) > 8;
    this._setPose(moving ? 'boss_move' : 'boss_idle');
  }

  // 觸發攻擊姿勢，並鎖定一小段時間不被移動姿勢覆蓋
  _triggerAttackPose() {
    if (this.isDead) return;
    this._setPose('boss_attack');
    this._attackPoseUntil = this.scene.time.now + 450;
  }

  _updateBossHpBar() {
    if (!this._bossFgBar) return;
    const ratio = Math.max(0, this.hp / this.maxHp);
    // dirty flag：比例沒變動就不更新
    if (ratio === this._lastBossHpRatio) return;
    this._lastBossHpRatio = ratio;
    // 用 scaleX 控制血條長度（GPU 純 transform，零 path/earcut）
    this._bossFgBar.scaleX = ratio;
  }

  takeDamage(amount, isCrit = false, opts) {
    super.takeDamage(amount, isCrit, opts);
    if (this.isDead) return;
    this._updateBossHpBar();
  }

  // 階段切換：全螢幕閃光 + 光環 + 震動 + 大字，並清掉場上彈幕（咆哮期間不會被偷襲）
  _onPhaseChange(newPhase, ph) {
    const scene = this.scene;
    const cam = scene.cameras.main;
    scene._aiPool?.clear();

    // 全螢幕閃光是一張矩形（不是相機效果，設定的「閃光 / 減少動態」要自己問）
    if (settings.flashAllowed()) {
      const flash = scene.add.rectangle(0, 0, cam.width, cam.height, newPhase >= 3 ? 0xff3333 : 0xffffff, 0.8)
        .setOrigin(0, 0).setScrollFactor(0).setDepth(200);
      scene.tweens.add({ targets: flash, alpha: 0, duration: 600, onComplete: () => flash.destroy() });
    }

    cam.shake(700, 0.02);
    const cy = getVisualCenterY(this);
    playFx(scene, 'fx_boss_aura', this.x, cy, { scale: 2.4, frameRate: 8, tint: newPhase >= 3 ? 0xff2222 : 0xcc44ff, depth: 14 });
    particles.spawnDeath(scene, this.x, cy, newPhase >= 3 ? 0xff2222 : 0xff00ff);

    const phaseText = scene.add.text(cam.width / 2, cam.height / 2,
      `第${newPhase}階段！${ph.label && newPhase >= 3 ? '  ' + ph.label : ''}`,
      { fontSize: '48px', color: newPhase >= 3 ? '#ff4444' : '#ff00ff', fontFamily: 'Arial', stroke: '#000000', strokeThickness: 6 }
    ).setScrollFactor(0).setDepth(201).setOrigin(0.5, 0.5);
    scene.tweens.add({ targets: phaseText, y: phaseText.y - 80, alpha: 0, duration: 2000, onComplete: () => phaseText.destroy() });

    if (newPhase >= 3 && !this._rage) {
      this._rage = true;
      // 狂暴圖本身就是紅色系，不再整隻染紅（染了會把紫焰壓成一片暗紅）；沒有狂暴圖才保留紅色染色
      if (scene.textures.exists('boss_rage_idle')) this._baseTint = null;
      this._currentPose = null;   // 立刻換成狂暴姿勢
      this._updatePose();
      scene.events.emit('boss-rage');
    }

    this._restoreTint();
  }

  // 近戰攻擊：實際出手時切換攻擊姿勢
  _doAttack(player) {
    const ready = this.attackCooldown <= 0;
    super._doAttack(player);
    if (ready) this._triggerAttackPose();
  }

  // 大招出手時的姿勢（brain 在前搖結束時呼叫）
  onAttackStart() {
    this._triggerAttackPose();
  }

  update(player, delta) {
    if (this.isDead) return;
    super.update(player, delta);
    this._updateBossHpBar();
    this._updatePose();
  }

  die() {
    if (this.isDead) return;
    // 死亡動畫：消失前 → 消失後
    this._setPose('boss_death1');
    this.scene.time.delayedCall(380, () => {
      if (this.active) this._setPose('boss_death2');
    });
    super.die();
    if (this._nameText?.active) this._nameText.destroy();
    this._nameText = null;
    if (this._bossHpBorder?.active) this._bossHpBorder.destroy();
    this._bossHpBorder = null;
    if (this._bossHpBg?.active) this._bossHpBg.destroy();
    this._bossHpBg = null;
    if (this._bossFgBar?.active) this._bossFgBar.destroy();
    this._bossFgBar = null;
    if (this._bossPhaseLine1?.active) this._bossPhaseLine1.destroy();
    this._bossPhaseLine1 = null;
    if (this._bossPhaseLine2?.active) this._bossPhaseLine2.destroy();
    this._bossPhaseLine2 = null;
    this.scene._aiPool?.clear();
    this.scene.events.emit('boss-defeated');
  }

  destroy(fromScene) {
    if (this._nameText && this._nameText.active) this._nameText.destroy();
    if (this._bossHpBorder && this._bossHpBorder.active) this._bossHpBorder.destroy();
    if (this._bossHpBg && this._bossHpBg.active) this._bossHpBg.destroy();
    if (this._bossFgBar && this._bossFgBar.active) this._bossFgBar.destroy();
    if (this._bossPhaseLine1 && this._bossPhaseLine1.active) this._bossPhaseLine1.destroy();
    if (this._bossPhaseLine2 && this._bossPhaseLine2.active) this._bossPhaseLine2.destroy();
    super.destroy(fromScene);
  }
}
