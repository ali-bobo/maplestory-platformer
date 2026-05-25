import Phaser from 'phaser';
import { Monster } from './Monster.js';
import { particles } from '../engine/particles.js';
import { ALIGNMENT_PROFILES, applyAlignmentProfile } from '../config/alignment.js';

// 暗影魔君 — 3 階段 Boss
// 使用由 boss_main.png 裁切的多動作圖（待機 / 移動 / 攻擊 / 死亡），以狀態驅動姿勢動畫
export class Boss extends Monster {
  constructor(scene, x, y) {
    super(scene, x, y, {
      id: 'boss',
      name: '暗影魔君',
      level: 30,
      hp: 10000,
      atk: 160,
      exp: 5000,
      speed: 120,
      meso: 500,
      dropRate: 1.0,
      behavior: 'chase',
      spriteKey: 'boss_idle',
      area: 'boss',
    });

    this.phase = 1;
    this.maxHp = 10000;
    this.hp = 10000;
    applyAlignmentProfile(this, ALIGNMENT_PROFILES.boss);
    this._phaseTransitioning = false;
    this._summonCooldown = 0;
    this._slamCooldown = 0;
    this._berserking = false;

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
    // 相位分隔線（60% 與 30% 位置）
    this._bossPhaseLine1 = scene.add.rectangle(bx + bw * 0.4, by + bh / 2, 2, bh, 0xffffff, 0.6)
      .setScrollFactor(0).setDepth(101);
    this._bossPhaseLine2 = scene.add.rectangle(bx + bw * 0.7, by + bh / 2, 2, bh, 0xffffff, 0.6)
      .setScrollFactor(0).setDepth(101);

    this._updateBossHpBar();
  }

  // ── 姿勢動畫 ─────────────────────────────────────────────────────────────
  _setPose(poseKey) {
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

  takeDamage(amount, isCrit = false) {
    super.takeDamage(amount, isCrit);
    if (this.isDead) return;
    this._updateBossHpBar();
    this._checkPhaseTransition();
    // 受擊閃白會清掉狂暴紅色 tint，閃爍結束後補回
    if (this._berserking) {
      this.scene.time.delayedCall(170, () => {
        if (this.active && this._berserking && !this.isDead) this.setTint(0xff0000);
      });
    }
  }

  _checkPhaseTransition() {
    if (this._phaseTransitioning) return;
    const ratio = this.hp / this.maxHp;
    if (this.phase === 1 && ratio <= 0.6) {
      this._transitionToPhase(2);
    } else if (this.phase === 2 && ratio <= 0.3) {
      this._transitionToPhase(3);
    }
  }

  _transitionToPhase(newPhase) {
    this._phaseTransitioning = true;
    this.phase = newPhase;

    // 相位過渡特效
    const flash = this.scene.add.graphics();
    flash.fillStyle(0xffffff, 0.8);
    flash.fillRect(0, 0, this.scene.cameras.main.width, this.scene.cameras.main.height);
    flash.setScrollFactor(0).setDepth(200);
    this.scene.tweens.add({
      targets: flash, alpha: 0, duration: 600,
      onComplete: () => flash.destroy(),
    });

    particles.spawnDeath(this.scene, this.x, this.y, 0xff00ff);

    // 相位文字
    const phaseText = this.scene.add.text(
      this.scene.cameras.main.width / 2,
      this.scene.cameras.main.height / 2,
      `第${newPhase}階段！`,
      { fontSize: '48px', color: '#ff00ff', fontFamily: 'Arial', stroke: '#000000', strokeThickness: 6 }
    ).setScrollFactor(0).setDepth(201).setOrigin(0.5, 0.5);

    this.scene.tweens.add({
      targets: phaseText, y: phaseText.y - 80, alpha: 0, duration: 2000,
      onComplete: () => phaseText.destroy(),
    });

    // 第2階段：召喚援軍
    if (newPhase === 2) {
      // 過場援軍登場後，週期召喚延後 8 秒再啟動，避免一次冒出兩批
      this._summonCooldown = 8000;
      this.scene.time.delayedCall(500, () => this._summonMinions());
    }
    // 第3階段：狂暴模式
    if (newPhase === 3) {
      this._berserking = true;
      this.speed *= 1.5;
      this.atk = Math.floor(this.atk * 1.5);
      this.setTint(0xff0000);
    }

    this.scene.time.delayedCall(1000, () => { this._phaseTransitioning = false; });
  }

  _summonMinions() {
    // 區域捕捉 scene：召喚有 0~800ms 延遲，期間 Boss 可能先死亡使 this.scene 變 null
    const scene = this.scene;
    if (!scene || !scene.sys.isActive()) return;
    for (let i = 0; i < 3; i++) {
      scene.time.delayedCall(i * 400, () => {
        if (!this.active || this.isDead || !scene.sys.isActive()) return;
        scene.events.emit('boss-summon-minion', {
          x: this.x + (i - 1) * 120,
          y: this.y,
        });
      });
    }
  }

  // 覆寫近戰攻擊：實際出手時切換攻擊姿勢
  _doAttack(player) {
    const ready = this.attackCooldown <= 0;
    super._doAttack(player);
    if (ready) this._triggerAttackPose();
  }

  update(player, delta) {
    if (this.isDead) return;
    super.update(player, delta);
    this._updateBossHpBar();
    this._updatePose();

    this._summonCooldown = Math.max(0, this._summonCooldown - delta);
    this._slamCooldown = Math.max(0, this._slamCooldown - delta);

    if (!player || !player.active) return;
    const dist = Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y);

    // 第1階段：地面重擊
    if (this.phase >= 1 && this._slamCooldown <= 0 && dist < 200) {
      this._groundSlam(player);
    }

    // 第2/3階段：召喚冷卻
    if (this.phase >= 2 && this._summonCooldown <= 0) {
      this._summonCooldown = 8000;
      this._summonMinions();
    }
  }

  _groundSlam(player) {
    this._slamCooldown = this._berserking ? 1500 : 3000;
    this._triggerAttackPose();
    // 震動效果
    this.scene.cameras.main.shake(300, 0.015);
    particles.spawnDeath(this.scene, this.x, this.y + 20, 0x884400);

    // AoE 傷害
    const dmg = Math.floor(this.atk * (this._berserking ? 1.8 : 1.2));
    if (player && !player.isInvincible) {
      const d = Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y);
      if (d < 150) player.takeDamage(dmg);
    }
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
