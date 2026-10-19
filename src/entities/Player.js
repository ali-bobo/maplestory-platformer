import Phaser from 'phaser';
import { poseKey, idleFrameKey } from '../config/poses.js';
import { jobOf, jobIdOf, skillDefOf, expNeeded, MAX_LEVEL, MAP_SCENE_KEYS, POTIONS, createInitialGameState, BASIC_ATTACK, skillForSlot, jobPassive } from '../config/constants.js';
import { saveGame } from '../engine/saveGame.js';
import { castSlash, castShuriken, castDash, castAssassinate, castVortex, castClone, hitStop } from './Skill.js';
import { castTwinBlade, castSabre, castBackstab, castPoison, castMark, castWhirl, castSteal, castSmoke } from './JobSkills.js';
import { particles } from '../engine/particles.js';
import { audio } from '../engine/audio.js';
import { iceVelocity } from '../engine/mapModifierLogic.js';
import { INPUT_BUFFER_MS, COYOTE_MS, createInputBuffer, bufferPress, consumeBuffered, hasBuffered, createCoyote, updateCoyote, canCoyoteJump, isActionReady } from '../engine/inputBuffer.js';
import { isEquipmentBetter } from '../config/equipment.js';
import { ALIGNMENT_PROFILES, applyAlignmentProfile, getVisualCenterPoint, getVisualTopY } from '../config/alignment.js';
import { settings } from '../engine/settings.js';
import { keyCodeOf } from '../engine/keyBindings.js';
import { REGEN, hpRegenPerSec, mpRegenPerSec, regenStep } from '../engine/regen.js';
import {
  HURT_IFRAME_MS, HURT_HITSTOP_MS, knockbackVelocity, decayKnockbackVx, isHeavyHit, canKnockback, lockHardCapMs,
} from '../engine/knockback.js';

// 硬直至少要跑過的物理步數（約 50 ms 模擬時間），遊戲時間上限才會生效
const HIT_LOCK_MIN_STEPS = 3;

export class Player extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y, gameState) {
    super(scene, x, y, 'player_idle');
    scene.add.existing(this);
    scene.physics.add.existing(this);

    // gameState 理應由場景從 registry 傳入；為空時用工廠建一份避免後續深層存取崩潰
    this.gameState = gameState || createInitialGameState();
    this.facingRight = true;
    this.jumpsLeft = 2;
    this.isInvincible = false;
    this.isDead = false;
    this.dropThrough = false;
    this.isDashing = false;
    this.speedMult = 1;      // 地圖機制：流沙等造成的移速倍率
    this.iceFloor = false;   // 地圖機制：冰面（滑行）
    this._jumpKeyWasDown = false;
    // 動作圖切換：攻擊/受傷期間鎖定姿勢到 _poseLockUntil
    this._poseLockKey = null;
    this._poseLockUntil = 0;
    this._poseKeys = {};     // 姿勢名 → 紋理鍵快取（依職業；換職業時清掉），每幀查表不配置字串
    this._walkKeys = null;
    // HP/MP 自然回復的 UI 節流：只在顯示整數改變時才更新 registry/事件
    this._lastEmittedHp = -1;
    this._lastEmittedMp = -1;
    // 自然回復的打斷時間點（受傷停 HP 回復、施法停 MP 回復；見 engine/regen.js）
    this._lastHurtAt = null;
    this._lastCastAt = null;
    this.safeZone = false;   // 城鎮等安全區：回復較快（由地圖場景設定）
    // 受擊反應：擊退硬直剩餘時間（以物理模擬時間計：每個物理步扣一次，FPS 低或命中停頓放慢物理時，
    // 擊退距離都一樣，不會在物理還沒動之前就結束）、無敵結束時間與閃爍補間
    this._hitLockLeft = 0;
    this._hitLockSteps = 0;   // 這次硬直已經過的物理步數
    this._hitLockCapAt = 0;   // 硬直的遊戲時間上限（見 knockback.js lockHardCapMs）
    this._world = scene.physics.world;
    this._onWorldStep = (dt) => this._stepHitLock(dt);
    this._world.on('worldstep', this._onWorldStep);
    this._invUntil = 0;
    this._invTimer = null;
    this._blinkTween = null;

    // 角色站位由共享腳底基準 metadata 決定，避免各類實體各自猜測底部留白。
    this.setCollideWorldBounds(true);
    applyAlignmentProfile(this, ALIGNMENT_PROFILES.player);
    this.setDepth(20);

    // 技能施放群組快取
    this.enemies = null;

    // 目標選取框（單一 Graphics 物件複用，每幀同步最近怪物的位置）
    this._targetGfx = scene.add.graphics().setDepth(30);

    // 輸入按鍵：依設定裡的鍵位（src/engine/keyBindings.js）建立；設定改了在 update 開頭重新綁定
    this._bindKeys(settings.get().keys);

    // Phase 4.0：修復場景切換時冷卻卡死 bug
    // gs.skillCooldowns 持久化在 registry，但 Player 物件在傳送門切場景時會 new 一個新的。
    // 必須掃描現有冷卻值，重建 _coolingDownKeys Set，否則 update() 不會遞減 → 永卡冷卻。
    this._coolingDownKeys = new Set();
    // 輸入緩衝與土狼時間（純邏輯在 engine/inputBuffer.js）
    this._inputBuf = createInputBuffer();
    this._coyote = createCoyote();
    this._setPose(this.pose('idle'));
    const cds = this.gameState.skillCooldowns || {};
    for (const key in cds) {
      if (cds[key] > 0) this._coolingDownKeys.add(key);
    }
  }

  // 依鍵位表建立 Phaser Key 物件。屬性名稱沿用舊的（cursors / keySpace / keyZ… / keyAlt / keyPotA…），
  // 預設鍵位：← → ↑ ↓、Q / ↑ 跳（舊版是 Alt，見 keyBindings.js）、空白鍵普攻、Z X C V 技能欄、A S D R G 藥水。
  // 舊的 Key 物件不移除：同一個 keyCode 的 Key 可能被別處共用（addKey 會回傳同一個實例）。
  _bindKeys(kb) {
    const kbd = this.scene.input.keyboard;
    const key = (action) => kbd.addKey(keyCodeOf(kb[action]));
    this._boundKeys = kb;
    this.cursors = { left: key('left'), right: key('right'), up: key('up'), down: key('down') };
    // 普通攻擊（近戰揮刀，不耗 MP）；四個技能欄位（放哪個技能由 gs.skillSlots 決定，欄位 id 仍是 Z X C V）
    this.keySpace = key('attack');
    this.keyZ = key('skill1');
    this.keyX = key('skill2');
    this.keyC = key('skill3');
    this.keyV = key('skill4');
    this.keyAlt = key('jump');
    // 藥水快捷鍵（F 預設是互動鍵，由 BaseMapScene 處理）
    this.keyPotA = key('potA');
    this.keyPotS = key('potS');
    this.keyPotD = key('potD');
    this.keyPotR = key('potR');
    this.keyPotG = key('potG');
  }

  update(delta) {
    if (this.isDead) return;
    const kb = settings.get().keys;
    if (kb !== this._boundKeys) this._bindKeys(kb);

    const gs = this.gameState;
    const dt = delta / 1000;
    const onGround = this.body.blocked.down;
    const left  = this.cursors.left.isDown;
    const right = this.cursors.right.isDown;
    const down  = this.cursors.down.isDown;
    const jumpNow = Phaser.Input.Keyboard.JustDown(this.keyAlt) || Phaser.Input.Keyboard.JustDown(this.cursors.up);
    const now = this.scene.time.now;

    // 輸入緩衝：跳躍每幀記錄（含衝刺中）；窗口至少一幀長，低 FPS 時不會比一幀還短而讓緩衝形同虛設
    const buf = this._inputBuf;
    const bufMs = Math.max(INPUT_BUFFER_MS, Math.min(delta, 250));
    const coyoteMs = Math.max(COYOTE_MS, Math.min(delta, 250));
    if (jumpNow) bufferPress(buf, 'jump', now);

    // Phase 3.6 + 4.0：冷卻計時優化——用 Set 追蹤「正在冷卻」的技能 key
    // Set 在 constructor 中初始化並從 gs.skillCooldowns 重建（修復場景切換 bug）
    if (this._coolingDownKeys.size > 0) {
      for (const key of this._coolingDownKeys) {
        const cd = (gs.skillCooldowns[key] || 0) - dt;
        if (cd <= 0) {
          gs.skillCooldowns[key] = 0;
          this._coolingDownKeys.delete(key);
        } else {
          gs.skillCooldowns[key] = cd;
        }
      }
    }

    if (this.isDashing) {
      this._updateFacing();
      this._updateTargetBox();
      return;
    }

    // ─── 受擊硬直：擊退期間不能移動 / 跳 / 攻擊（藥水仍可用）；倒數與速度衰減在 _stepHitLock（每個物理步）───
    // 遊戲時間上限：命中停頓一直觸發、物理長時間被放慢時，硬直也會在上限到時結束（至少跑過幾個物理步，確保真的被推開）
    if (this._hitLockLeft > 0 && this.scene.time.now >= this._hitLockCapAt && this._hitLockSteps >= HIT_LOCK_MIN_STEPS) {
      this._hitLockLeft = 0;
    }
    if (this._hitLockLeft > 0) {
      this._handlePotionKeys();
      this._updateFacing();
      this._updateTargetBox();
      this._updatePose(onGround);
      return;
    }

    // ─── 移動 ───────────────────────────────────────────────────────────────
    // 地圖機制（engine/mapModifiers.js）每幀先設好：speedMult（流沙 0.6）、iceFloor（冰面：在地面上加速 / 煞車都有慣性）
    const speed = gs.speed * this.speedMult;
    const dir = left ? -1 : right ? 1 : 0;
    if (dir !== 0) {
      this.facingRight = dir > 0;
      this.setFlipX(dir < 0);
    }
    if (this.iceFloor && onGround) {
      this.setVelocityX(iceVelocity(this.body.velocity.x, dir * speed, dt));
    } else {
      this.setVelocityX(dir * speed);
    }

    // ─── 跳躍 / 下落穿越 ────────────────────────────────────────────────────
    // 兩段跳：走離平台邊緣後仍保有完整兩跳（維持舊手感，不因土狼時間而削弱）；
    // 土狼窗（COYOTE_MS）只保證離邊瞬間按跳必定算地面跳。
    if (onGround) this.jumpsLeft = 2;

    // ↓ 鍵觸發薄平台下穿：按住 DOWN 持續穿越所有薄平台，鬆開後停在下一個平台
    if (down && onGround && !this.dropThrough) {
      this.dropThrough = true;
      this.setVelocityY(80);
    }
    if (!down) {
      this.dropThrough = false;
    }

    // 跳躍緩衝：落地前 120ms 內按下的跳，著地（或仍有跳躍次數）的當幀執行
    let jumped = false;
    if (hasBuffered(buf, 'jump', now, bufMs) && !down && this.jumpsLeft > 0) {
      consumeBuffered(buf, 'jump', now, bufMs);
      this.setVelocityY(-520);
      this.jumpsLeft--;
      jumped = true;
      audio.playJump();
    }
    updateCoyote(this._coyote, onGround && !jumped, now, jumped);

    // ─── 技能施放 ───────────────────────────────────────────────────────────
    // 攻擊 / 技能鍵在衝刺中不讀取（維持原行為：按鍵留在 Phaser 裡，衝刺結束後的第一幀才讀到）
    if (Phaser.Input.Keyboard.JustDown(this.keySpace)) bufferPress(buf, 'attack', now);
    for (const [slot, k] of [['Z', this.keyZ], ['X', this.keyX], ['C', this.keyC], ['V', this.keyV]]) {
      if (Phaser.Input.Keyboard.JustDown(k)) bufferPress(buf, 'skill' + slot, now);
    }
    // 按下當幀冷卻已好 → 立即施放（原行為）；冷卻中 → 留在緩衝，冷卻結束且 120ms 內才補放。
    // 補放仍走 basicAttack / castSkill，MP 與冷卻照常判定，不會多扣或無視冷卻。
    if (hasBuffered(buf, 'attack', now, bufMs) && isActionReady(gs.skillCooldowns[BASIC_ATTACK])) {
      consumeBuffered(buf, 'attack', now, bufMs);
      this.basicAttack();
    }
    for (const slot of ['Z', 'X', 'C', 'V']) {
      const act = 'skill' + slot;
      if (!hasBuffered(buf, act, now, bufMs)) continue;
      const key = skillForSlot(gs, slot);
      if (key && !isActionReady(gs.skillCooldowns[key])) continue;
      consumeBuffered(buf, act, now, bufMs);
      this.castSkill(key);
    }

    // ─── 藥水快捷鍵 ─────────────────────────────────────────────────────────
    this._handlePotionKeys();

    // ─── 更新面向 + 目標框 + 動作圖 ─────────────────────────────────────────
    this._updateFacing();
    this._updateTargetBox();
    this._updatePose(onGround);
  }

  _handlePotionKeys() {
    if (Phaser.Input.Keyboard.JustDown(this.keyPotA)) this.usePotion('A');
    if (Phaser.Input.Keyboard.JustDown(this.keyPotS)) this.usePotion('S');
    if (Phaser.Input.Keyboard.JustDown(this.keyPotD)) this.usePotion('D');
    if (Phaser.Input.Keyboard.JustDown(this.keyPotR)) this.usePotion('R');
    if (Phaser.Input.Keyboard.JustDown(this.keyPotG)) this.usePotion('G');
  }

  /** 受擊硬直中（擊退中）：供外部（e2e / 觸控）查詢 */
  isHitLocked() {
    return this._hitLockLeft > 0;
  }

  // 目前職業的姿勢紋理鍵（缺圖退回盜賊；都沒有回傳 null）
  pose(name) {
    const cache = this._poseKeys;
    if (cache[name] === undefined) {
      cache[name] = poseKey(jobIdOf(this.gameState), name, (k) => this.scene.textures.exists(k));
    }
    return cache[name];
  }

  walkPoseKey(now) {
    if (!this._walkKeys) this._walkKeys = [this.pose('walk_1'), this.pose('walk_2'), this.pose('walk_3'), this.pose('walk_4')];
    return this._walkKeys[Math.floor(now / 110) % 4];
  }

  // 轉職後切換外觀：清掉姿勢快取並立刻換成待機圖
  refreshJobVisuals() {
    this._poseKeys = {};
    this._walkKeys = null;
    this._poseLockUntil = 0;
    this._setPose(this.pose('idle'));
  }

  _lockPose(key, duration) {
    if (!key) return;
    this._poseLockKey = key;
    this._poseLockUntil = this.scene.time.now + duration;
    this._setPose(key);
  }

  _setPose(key) {
    if (key && this.texture.key !== key && this.scene.textures.exists(key)) this.setTexture(key);
  }

  _updatePose(onGround) {
    const now = this.scene.time.now;
    if (now < this._poseLockUntil) {
      this._setPose(this._poseLockKey);
      return;
    }
    if (!onGround) {
      this._setPose(this.pose(this.body.velocity.y > 40 ? 'fall' : 'jump'));
    } else if (this.body.velocity.x !== 0) {
      this._setPose(this.walkPoseKey(now));
    } else if (this.cursors.down.isDown) {
      this._setPose(this.pose('down'));
    } else {
      this._setPose(idleFrameKey(now, this.pose('idle'), this.pose('idle_2')));
    }
  }

  _updateFacing() {
    this.setFlipX(!this.facingRight);
  }

  // 找到最近的活怪物（供目標選取框用）
  _findNearestMonster() {
    if (!this.enemies) return null;
    let nearest = null;
    let minDist = Infinity;
    for (const m of this.enemies.getChildren()) {
      if (!m.active || (m.hp !== undefined && m.hp <= 0)) continue;
      const dx = m.x - this.x;
      const dy = m.y - this.y;
      const dist = dx * dx + dy * dy;
      if (dist < minDist) {
        minDist = dist;
        nearest = m;
      }
    }
    return nearest;
  }

  // 每幀更新鎖定標記：最近怪物頭上一個上下浮動的小箭頭（取代舊的橙色方框）
  _updateTargetBox() {
    if (!this._targetGfx || !this._targetGfx.active) return;
    const target = this._findNearestMonster();
    if (target && target.active && target.body) {
      // 以碰撞框為準，Boss 等寬畫布（含特效留白）也能標在身體正上方
      const b = target.body;
      const x = b.center.x;
      const y = b.top - 22 + Math.sin(this.scene.time.now / 160) * 3;
      const g = this._targetGfx;
      g.clear();
      g.fillStyle(0x1a0e06, 0.7);
      g.fillTriangle(x - 8, y - 2, x + 8, y - 2, x, y + 10);
      g.fillStyle(0xffd24a, 0.95);
      g.fillTriangle(x - 6, y, x + 6, y, x, y + 8);
    } else {
      this._targetGfx.clear();
    }
  }

  playThrowAnimation(duration = 200) {
    if (this.anims && this.anims.animationManager && this.anims.animationManager.exists('throw')) {
      this.play('throw', true);
      this.scene.time.delayedCall(duration, () => {
        if (this.active && this.anims.isPlaying) this.anims.stop();
      });
      return;
    }

    const total = Math.max(duration, 180);
    this._lockPose(this.pose('throw_1'), total * 0.4);
    this.scene.time.delayedCall(total * 0.4, () => {
      if (this.active && !this.isDead) this._lockPose(this.pose('throw_2'), total * 0.6);
    });
  }

  usePotion(slot) {
    const gs = this.gameState;
    if (!gs.potions) return;
    const qty = gs.potions[slot] || 0;
    if (qty <= 0) {
      this._showNotice('藥水不足！');
      return;
    }
    const potion = POTIONS[slot];
    if (!potion) return;

    gs.potions[slot]--;
    if (potion.hpRestore > 0) {
      gs.hp = Math.min(gs.maxHp, gs.hp + potion.hpRestore);
      this.scene.registry.events.emit('changedata-hp', null, gs.hp);
    }
    if (potion.mpRestore > 0) {
      gs.mp = Math.min(gs.maxMp, gs.mp + potion.mpRestore);
      this.scene.registry.events.emit('changedata-mp', null, gs.mp);
    }
    this.scene.registry.set('gameState', gs);
    // 顯示回復效果（萬靈藥同時回復 HP+MP 時顯示兩者）
    let restoreMsg;
    if (potion.hpRestore > 0 && potion.mpRestore > 0) {
      restoreMsg = 'HP/MP';
    } else if (potion.hpRestore > 0) {
      restoreMsg = 'HP';
    } else {
      restoreMsg = 'MP';
    }
    this._showNotice(`使用 ${potion.name}  +${restoreMsg}`, 1200);
  }

  // 普通攻擊：不耗 MP，冷卻短；冷卻與技能共用 gs.skillCooldowns（key = ATK）
  basicAttack() {
    const gs = this.gameState;
    if (this.isDead || (gs.skillCooldowns[BASIC_ATTACK] || 0) > 0) return;
    gs.skillCooldowns[BASIC_ATTACK] = jobOf(gs).basic.cooldown;
    this._coolingDownKeys.add(BASIC_ATTACK);
    const job = this.gameState.job;
    if (job === 'assassin') castTwinBlade(this.scene, this, this.enemies);
    else if (job === 'bandit') castSabre(this.scene, this, this.enemies);
    else castSlash(this.scene, this, this.enemies);
    audio.resumeContext();
  }

  castSkill(key) {
    const gs = this.gameState;
    const skillDef = skillDefOf(gs.job, key);
    if (!skillDef) return;

    // 解鎖檢查
    if (!gs.unlockedSkills.includes(key)) {
      this._showNotice(`${skillDef.name} 需要 Lv.${skillDef.unlockLevel}`);
      return;
    }

    // 冷卻檢查
    if (gs.skillCooldowns[key] > 0) return;

    // MP 檢查
    if (gs.mp < skillDef.mpCost) {
      this._showNotice('MP不足！');
      return;
    }

    // 消耗 MP 並設定冷卻（施法後 MP 自然回復暫停一下）
    gs.mp = Math.max(0, gs.mp - skillDef.mpCost);
    const prevCastAt = this._lastCastAt;
    this._lastCastAt = this.scene.time.now;
    gs.skillCooldowns[key] = skillDef.cooldown;
    // Phase 3.6：把進入冷卻的 key 加入 Set，update() 才會去遞減它
    // （Set 已在 constructor 初始化，這裡不需 lazy check）
    this._coolingDownKeys.add(key);
    this.scene.registry.set('gameState', gs);
    this.scene.registry.events.emit('changedata-mp', null, gs.mp);

    const enemies = this.enemies;
    let ok;
    switch (key) {
      case 'Z': castShuriken(this.scene, this, enemies);    break;
      case 'X': castDash(this.scene, this, enemies);        break;
      case 'C': ok = castAssassinate(this.scene, this, enemies); break;
      case 'V': castVortex(this.scene, this, enemies);      break;
      case 'B': castClone(this.scene, this, enemies);       break;
      case 'backstab': ok = castBackstab(this.scene, this, enemies); break;
      case 'poison':   ok = castPoison(this.scene, this, enemies);   break;
      case 'mark':     ok = castMark(this.scene, this, enemies);     break;
      case 'whirl':    ok = castWhirl(this.scene, this, enemies);    break;
      case 'steal':    ok = castSteal(this.scene, this, enemies);    break;
      case 'smoke':    ok = castSmoke(this.scene, this, enemies);    break;
    }
    if (ok === false) {
      // 沒有目標：沒有真的施放，退還 MP 與冷卻
      gs.mp = Math.min(gs.maxMp, gs.mp + skillDef.mpCost);
      gs.skillCooldowns[key] = 0;
      this._lastCastAt = prevCastAt;
      this.scene.registry.events.emit('changedata-mp', null, gs.mp);
      this._showNotice('範圍內沒有目標');
    }
    audio.resumeContext();
  }

  // 重生保護：一段時間不受傷，期間半透明閃爍
  grantInvincibility(ms) {
    this._setInvincibleFor(ms);
  }

  // 無敵 ms 毫秒（含閃爍）。已經有更長的無敵（例如重生保護）時不縮短
  _setInvincibleFor(ms) {
    const scene = this.scene;
    if (!scene || !this.active) return;
    const until = scene.time.now + ms;
    if (this.isInvincible && until <= this._invUntil) return;
    this._invUntil = until;
    this.isInvincible = true;
    this._startBlink();
    if (this._invTimer) this._invTimer.remove(false);
    this._invTimer = scene.time.delayedCall(ms, () => {
      this._invTimer = null;
      this._invUntil = 0;
      this.isInvincible = false;
      this._stopBlink();
    });
  }

  // 無敵閃爍：半透明 ↔ 不透明，一直到無敵結束（同一時間只有一個補間）
  _startBlink() {
    if (this._blinkTween && this._blinkTween.isPlaying()) return;
    this._stopBlink();
    this._blinkTween = this.scene.tweens.add({
      targets: this, alpha: { from: 1, to: 0.4 }, duration: 90, yoyo: true, repeat: -1,
    });
  }

  _stopBlink() {
    if (this._blinkTween) { this._blinkTween.remove(); this._blinkTween = null; }
    if (this.active) this.setAlpha(1);
  }

  /**
   * 受到傷害。opts：
   *  - sourceX：攻擊來源的 x（怪物 / 投射物位置），玩家往遠離它的方向被擊退；沒給就往面向的反方向退
   *  - force：擊退力道倍率（預設 1；精英 / Boss 重擊約 1.5~2，0 = 不擊退）
   */
  takeDamage(amount, opts = {}) {
    if (this.isInvincible || this.isDead || !this.active) return;
    const o = opts || {};
    const scene = this.scene;
    const gs = this.gameState;
    const defense = this._getDefenseBonus();
    const actual = Math.max(1, Math.floor(amount * (1 - defense)));
    gs.hp = Math.max(0, gs.hp - actual);
    this._lastHurtAt = scene.time.now;   // 受傷後 HP 自然回復暫停
    scene.registry.set('gameState', gs);
    scene.registry.events.emit('changedata-hp', null, gs.hp);

    audio.playHit();
    // 傷害閃紅 + 受傷動作
    this._lockPose(this.pose('hurt'), 300);
    this.setTint(0xff4444);
    scene.time.delayedCall(200, () => { if (this.active && !this.isDead) this.clearTint(); });
    this._showHurtNumber(actual);

    if (gs.hp <= 0) {
      this._die();
      return;
    }

    // 無敵時間（閃爍）
    this._setInvincibleFor(HURT_IFRAME_MS);

    // 擊退 + 短暫硬直 + 命中停頓
    const force = o.force ?? 1;
    this._applyKnockback(o.sourceX, force);
    hitStop(scene, HURT_HITSTOP_MS);

    // 重擊：畫面震動（相機震動已依設定開關把關）+ HUD 紅色暈影脈衝
    if (isHeavyHit(actual, gs.maxHp, force)) {
      scene.cameras.main.shake(160, 0.007);
      scene.registry.events.emit('player-heavy-hit', actual);
    }
  }

  // 擊退：死亡 / 衝刺 / 傳送 / 對話或選單開著時不擊退（只扣血）。牆壁交給物理碰撞，地圖邊界由 collideWorldBounds 夾住
  _applyKnockback(sourceX, force) {
    const scene = this.scene;
    if (!this.body || !this.body.enable) return;
    const state = {
      dead: this.isDead,
      dashing: this.isDashing,
      transitioning: !!scene._transitioning,
      dialogOpen: !!scene._npcDialog,
      modal: !!scene.registry.get('uiModal'),
    };
    if (!canKnockback(state)) return;
    const kb = knockbackVelocity(this.x, sourceX, this.facingRight, force);
    if (kb.lockMs <= 0) return;
    this.dropThrough = false;
    this.setVelocity(kb.vx, Math.min(this.body.velocity.y, kb.vy));
    this._hitLockLeft = kb.lockMs;
    this._hitLockSteps = 0;
    this._hitLockCapAt = scene.time.now + lockHardCapMs(kb.lockMs);
  }

  // 每個物理步：硬直倒數（模擬時間）+ 擊退水平速度衰減
  _stepHitLock(dt) {
    if (!(this._hitLockLeft > 0) || !this.body) return;
    const ms = dt * 1000;
    this._hitLockLeft -= ms;
    this._hitLockSteps++;
    this.body.velocity.x = decayKnockbackVx(this.body.velocity.x, ms);
  }

  // 玩家頭上的紅色扣血數字（設定可關閉傷害數字）
  _showHurtNumber(actual) {
    if (!settings.get().damageNumbers) return;
    const topY = getVisualTopY(this);
    const txt = this.scene.add.text(this.x, topY - 4, `-${actual}`, {
      fontSize: '18px', color: '#ff5a4a', fontFamily: 'Arial', fontStyle: 'bold', stroke: '#2a0606', strokeThickness: 4,
    }).setDepth(91).setOrigin(0.5, 1);
    // 先往上飄、後半段才淡出（看得清楚扣了多少）
    this.scene.tweens.add({ targets: txt, y: txt.y - 34, duration: 800, ease: 'Cubic.easeOut' });
    this.scene.tweens.add({ targets: txt, alpha: 0, delay: 450, duration: 400, onComplete: () => txt.destroy() });
  }

  _getDefenseBonus() {
    const gs = this.gameState;
    const armor = gs.equipment.armor;
    const base = armor ? Math.min(0.5, armor.hp / 500) : 0;
    return Math.min(0.6, base + jobPassive(gs, 'damageReduction', 0));
  }

  gainExp(amount) {
    const gs = this.gameState;
    gs.exp += amount;
    let leveledUp = false;

    while (gs.exp >= gs.expNeeded && gs.level < MAX_LEVEL) {
      gs.exp -= gs.expNeeded;
      gs.level++;
      gs.expNeeded = expNeeded(gs.level);
      this._onLevelUp(gs);
      leveledUp = true;
    }
    if (gs.level >= MAX_LEVEL) gs.exp = Math.min(gs.exp, gs.expNeeded - 1);

    this.scene.registry.set('gameState', gs);
    this.scene.registry.events.emit('changedata-exp', null, gs.exp);
    if (leveledUp) {
      saveGame(gs);
      this.scene.registry.events.emit('changedata-level', null, gs.level);
      // 升級音效 + 粒子 + UI 全屏演出一律發出一次（避免多級同時累加）
      audio.playLevelUp();
      const center = getVisualCenterPoint(this);
      particles.spawnLevelUp(this.scene, center.x, center.y);
      this.scene.registry.events.emit('changedata-levelup', null, gs.level);
    }
  }

  _onLevelUp(gs) {
    // 屬性提升
    gs.maxHp  = Math.floor(gs.maxHp  + 20 * jobPassive(gs, 'maxHpMult', 1));   // 悍匪體魄：升級 HP 也 +30%
    gs.maxMp  = Math.floor(gs.maxMp  + 12);
    gs.atk    = Math.floor(gs.atk    + 5);
    gs.speed  = Math.min(320, gs.speed + 2);
    gs.hp = gs.maxHp;
    gs.mp = gs.maxMp;
    // 技能點數（每升一級 +3）
    gs.skillPoints = (gs.skillPoints || 0) + 3;
    this.scene.registry.events.emit('changedata-sp', null, gs.skillPoints);

    // 技能解鎖（解鎖即獲得 1 級，之後可在技能欄花 SP 升級）
    for (const [key, skill] of Object.entries(jobOf(gs).skills)) {
      if (gs.level >= skill.unlockLevel && !gs.unlockedSkills.includes(key)) {
        gs.unlockedSkills.push(key);
        gs.skillLevels[key] = Math.max(1, gs.skillLevels[key] || 0);
        this._showNotice(`習得新技能：${skill.name}！`);
      }
    }
  }

  pickupEquipment(equip) {
    const gs = this.gameState;
    const slot = equip.slot;
    if (isEquipmentBetter(equip, gs.equipment[slot])) {
      // 換裝前先扣除舊裝備的加成，避免每次撿裝備數值無限疊加
      const old = gs.equipment[slot];
      if (old) {
        gs.atk   -= old.atk   || 0;
        gs.maxHp -= old.hp    || 0;
        gs.maxMp -= old.mp    || 0;
        gs.speed -= old.speed || 0;
      }
      gs.equipment[slot] = equip;
      gs.atk   += equip.atk   || 0;
      gs.maxHp += equip.hp    || 0;
      gs.maxMp += equip.mp    || 0;
      gs.speed  = Math.min(320, gs.speed + (equip.speed || 0));
      gs.hp = Math.min(gs.hp, gs.maxHp);
      gs.mp = Math.min(gs.mp, gs.maxMp);
      this.scene.registry.set('gameState', gs);
      this._showNotice(`裝備了 ${equip.displayName}！`);
    }
  }

  _showNotice(msg, duration = 2000) {
    const topY = getVisualTopY(this);
    const txt = this.scene.add.text(
      this.x,
      topY - 8,
      msg,
      { fontSize: '14px', color: '#ffff88', fontFamily: 'Arial', stroke: '#000', strokeThickness: 3 }
    ).setDepth(90).setOrigin(0.5, 1);
    this.scene.tweens.add({
      targets: txt, y: txt.y - 40, alpha: 0, duration,
      onComplete: () => txt.destroy(),
    });
  }

  _die() {
    if (this.isDead) return;
    this.isDead = true;
    this.isDashing = false;
    this._hitLockLeft = 0;
    this._stopBlink();
    this.setAlpha(1);
    this.body.setAllowGravity(true);
    this.setVelocity(0, -200);
    audio.playDeath();
    // 有倒地姿勢就用它（不再染全紅，免得蓋掉圖）；缺圖才維持舊的紅色
    const dieKey = this.pose('die');
    if (dieKey && this.scene.textures.exists(dieKey)) { this._setPose(dieKey); this.setTint(0xffbbbb); }
    else this.setTint(0xff0000);
    this.scene.time.delayedCall(1500, () => {
      this.scene.scene.stop('UIScene');
      this.scene.scene.start('GameOverScene', { victory: false, gameState: this.gameState, deathX: this.x });
    });
  }

  // MP 自然回復（數值每幀平滑累加，但 registry/UI 只在顯示整數改變時更新 — 節流）
  // 回復量見 engine/regen.js：依最大 MP 小幅成長，施法後暫停，安全區較快
  recoverMp(delta) {
    const gs = this.gameState;
    if (gs.mp < gs.maxMp) {
      const now = this.scene.time.now;
      gs.mp = regenStep(gs.mp, gs.maxMp, mpRegenPerSec(gs.maxMp, this.safeZone), delta, now, this._lastCastAt, REGEN.mpDelayMs);
      const shown = Math.ceil(gs.mp);
      if (shown !== this._lastEmittedMp) {
        this._lastEmittedMp = shown;
        this.scene.registry.set('gameState', gs);
        this.scene.registry.events.emit('changedata-mp', null, gs.mp);
      }
    }
  }

  // HP 自然回復（受傷後暫停 REGEN.hpDelayMs；同樣節流 UI 更新）
  recoverHp(delta) {
    const gs = this.gameState;
    if (gs.hp < gs.maxHp) {
      const now = this.scene.time.now;
      gs.hp = regenStep(gs.hp, gs.maxHp, hpRegenPerSec(gs.maxHp, this.safeZone), delta, now, this._lastHurtAt, REGEN.hpDelayMs);
      const shown = Math.ceil(gs.hp);
      if (shown !== this._lastEmittedHp) {
        this._lastEmittedHp = shown;
        this.scene.registry.set('gameState', gs);
        this.scene.registry.events.emit('changedata-hp', null, gs.hp);
      }
    }
  }

  destroy(fromScene) {
    // 物理世界在場景關閉時會先被銷毀（連同監聽），這裡只處理玩家單獨被銷毀的情況
    if (this._world && this._onWorldStep) this._world.off('worldstep', this._onWorldStep);
    this._world = null;
    this._onWorldStep = null;
    if (this._invTimer) { this._invTimer.remove(false); this._invTimer = null; }
    if (this._blinkTween) { this._blinkTween.remove(); this._blinkTween = null; }
    if (this._targetGfx) {
      this._targetGfx.destroy();
      this._targetGfx = null;
    }
    super.destroy(fromScene);
  }
}
