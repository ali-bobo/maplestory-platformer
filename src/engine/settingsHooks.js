// 讓設定開關對「別人檔案裡的」效果也生效：不改 Skill.js / Player.js / Monster.js，只在開機時包一層。
//
//  - Camera.shake / Camera.flash：震動、閃光關閉（或開了「減少動態」）時直接略過。
//    遊戲裡幾十處 scene.cameras.main.shake(...) / .flash(...) 全部一次生效。
//  - Monster._showDamageNumber：關閉傷害數字時不建立飄字。
//
// 還包不到的：vfx.js 的 screenFlash（滿版白色矩形，不是相機效果）。它的呼叫端見 docs/STATUS.md「設定」一節；
// 之後把 screenFlash 內改成先問 settings.flashAllowed() 即可。
//
// 純函式 + 注入依賴，方便單元測試；重複呼叫只會包一次。

export function installSettingsHooks({ CameraClass, MonsterClass, settings }) {
  const patched = [];
  if (CameraClass && CameraClass.prototype && !CameraClass.prototype.__settingsGated) {
    const proto = CameraClass.prototype;
    const origShake = proto.shake;
    const origFlash = proto.flash;
    proto.shake = function gatedShake(...args) {
      if (!settings.shakeAllowed()) return this;
      return origShake.apply(this, args);
    };
    proto.flash = function gatedFlash(...args) {
      if (!settings.flashAllowed()) return this;
      return origFlash.apply(this, args);
    };
    Object.defineProperty(proto, '__settingsGated', { value: true });
    patched.push('camera.shake', 'camera.flash');
  }
  if (MonsterClass && MonsterClass.prototype && !MonsterClass.prototype.__settingsGated
      && typeof MonsterClass.prototype._showDamageNumber === 'function') {
    const proto = MonsterClass.prototype;
    const orig = proto._showDamageNumber;
    proto._showDamageNumber = function gatedDamageNumber(...args) {
      if (!settings.get().damageNumbers) return undefined;
      return orig.apply(this, args);
    };
    Object.defineProperty(proto, '__settingsGated', { value: true });
    patched.push('monster.damageNumber');
  }
  return patched;
}
