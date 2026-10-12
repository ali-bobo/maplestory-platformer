// 存檔代碼視窗（DOM 疊層）：匯出代碼 / 貼上匯入。
//
// 為什麼用 DOM 而不是 Phaser 文字：玩家要「選取、複製、貼上」一長串文字，Phaser 沒有文字輸入，
// 手機上也要能叫出系統貼上選單。其餘視窗仍全部是 Phaser（見 docs/design/ux-onboarding.md 第 6 節）。
//
// 重點：
//  - 不用 confirm() / alert()（內嵌頁面會被擋）：覆蓋確認是視窗內的第二個畫面。
//  - 剪貼簿寫入可能被拒絕（iframe 沒有 clipboard-write 權限）：失敗時改用 execCommand，再不行就全選代碼並提示手動複製。
//  - 檔案下載可能被沙箱擋掉而且沒有任何回報：只誠實說「已送出要求」或「這個環境多半會被擋」。
//  - 視窗內的按鍵不能傳到 Phaser（否則在輸入框打 Z、X、空白會讓角色出招；Ctrl+V 的 V 會被 Phaser 的按鍵攔截吃掉）。
//  - 樣式全在 style.css（CSP 的 style-src 'self' 不允許內嵌 style 屬性）。

import {
  makeSaveCode, checkSaveCode, commitImportedSave, currentSaveSummaryText,
  exportSaveFile, pickSaveFileText, downloadsLikelyBlocked, getSaveStatus,
} from '../engine/saveGame.js';

let openDialog = null;

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function button(label, className, onClick) {
  const b = el('button', `sd-btn ${className || ''}`.trim(), label);
  b.type = 'button';
  b.addEventListener('click', onClick);
  return b;
}

/**
 * 把文字複製到剪貼簿。回傳 'clipboard' | 'exec' | 'manual'：
 * manual 表示兩種自動方式都失敗，代碼已在輸入框全選，由玩家自己按 Ctrl+C / 長按拷貝。
 */
export async function copyToClipboard(text, textarea) {
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
      return 'clipboard';
    }
  } catch (_) { /* 權限被拒或不在安全環境：往下走 */ }
  try {
    if (textarea) {
      textarea.focus();
      textarea.select();
      textarea.setSelectionRange(0, text.length);
      if (document.execCommand && document.execCommand('copy')) return 'exec';
    }
  } catch (_) { /* 往下走 */ }
  if (textarea) {
    try { textarea.focus(); textarea.select(); textarea.setSelectionRange(0, text.length); } catch (_) { /* 靜默 */ }
  }
  return 'manual';
}

/**
 * 開啟存檔視窗。
 *  options.mode      'export'（顯示代碼）或 'import'（貼上代碼）
 *  options.gs        匯出時要編碼的即時狀態；不給就匯出目前存的檔
 *  options.onClose   關閉時呼叫（參數 { imported: boolean }）
 *  options.onImported 匯入成功並寫入後呼叫（參數 { persisted }）
 * 回傳 { close, root }。同時間只會有一個視窗。
 */
export function openSaveDialog(options = {}) {
  if (openDialog) openDialog.close();
  const mode = options.mode === 'import' ? 'import' : 'export';
  let imported = false;
  let view = 'main';          // 'main' | 'confirm'
  let pending = null;          // 等待覆蓋確認的、已驗證的存檔

  const backdrop = el('div', 'sd-backdrop');
  backdrop.setAttribute('role', 'dialog');
  backdrop.setAttribute('aria-modal', 'true');
  const panel = el('div', 'sd-panel');
  const title = el('h2', 'sd-title');
  const help = el('p', 'sd-help');
  const area = el('textarea', 'sd-text');
  area.spellcheck = false;
  area.setAttribute('autocomplete', 'off');
  area.setAttribute('autocapitalize', 'off');
  area.setAttribute('aria-label', mode === 'export' ? '存檔代碼' : '貼上存檔代碼');
  const status = el('div', 'sd-status');
  status.setAttribute('role', 'status');
  status.setAttribute('aria-live', 'polite');
  const actions = el('div', 'sd-actions');
  panel.append(title, help, area, status, actions);
  backdrop.appendChild(panel);

  const setStatus = (msg, kind) => {
    status.textContent = msg || '';
    status.className = `sd-status${kind ? ` sd-${kind}` : ''}`;
  };

  // 視窗內的鍵盤事件不傳給 Phaser；Esc 關視窗（確認畫面中則是返回）
  const swallow = (e) => {
    e.stopPropagation();
    if (e.type === 'keydown' && e.key === 'Escape') {
      e.preventDefault();
      if (view === 'confirm') renderMain(); else close();
    }
  };
  for (const type of ['keydown', 'keyup', 'keypress']) backdrop.addEventListener(type, swallow);
  // 點背景（不是面板）關閉；確認畫面不因誤觸背景而關閉
  backdrop.addEventListener('pointerdown', (e) => { if (e.target === backdrop && view === 'main') close(); });
  // 擋掉往下穿到遊戲畫布 / 觸控層的手勢
  backdrop.addEventListener('contextmenu', (e) => { if (e.target !== area) e.preventDefault(); });

  function clearActions() { actions.textContent = ''; }

  function renderMain() {
    view = 'main';
    pending = null;
    clearActions();
    if (mode === 'export') renderExport(); else renderImport();
  }

  function renderExport() {
    title.textContent = '存檔代碼';
    const code = makeSaveCode(options.gs);
    area.readOnly = true;
    area.value = code || '';
    const st = getSaveStatus();
    help.textContent = code
      ? '把這串代碼複製起來，貼到備忘錄或傳給自己。換瀏覽器、換裝置，或遊戲顯示「未存檔」時，用它就能接回進度。'
      : '目前沒有可以匯出的進度。';
    if (!code) setStatus('', '');
    else if (st.unsaved) setStatus('目前這個環境無法保存進度（關掉頁面就會消失），請務必複製下面的代碼。', 'warn');
    else setStatus(`代碼長度 ${code.length} 字`, '');
    const copy = button('複製代碼', 'sd-primary', async () => {
      if (!code) return;
      const how = await copyToClipboard(code, area);
      if (how === 'manual') setStatus('瀏覽器不允許自動複製，已幫你全選代碼：請按 Ctrl+C（手機長按後選「拷貝」）。', 'warn');
      else setStatus('已複製。請貼到備忘錄保存。', 'ok');
    });
    copy.disabled = !code;
    actions.appendChild(copy);
    if (code && options.gs === undefined) {
      const dl = button('下載檔案', '', () => {
        const r = exportSaveFile();
        if (r === 'started') setStatus('已送出下載要求。若沒有看到檔案，這個環境擋住了下載，請改用「複製代碼」。', 'info');
        else if (r === 'blocked') setStatus('這個頁面（內嵌或沙箱環境）多半無法下載檔案，請改用「複製代碼」。', 'warn');
        else if (r === 'nosave') setStatus('沒有存檔可以下載。', 'warn');
        else setStatus('下載失敗，請改用「複製代碼」。', 'warn');
      });
      if (downloadsLikelyBlocked()) dl.classList.add('sd-dim');
      actions.appendChild(dl);
    }
    actions.appendChild(button('關閉', '', close));
    if (code) setTimeout(() => { try { area.focus(); area.select(); area.scrollTop = 0; } catch (_) { /* 靜默 */ } }, 30);
  }

  function renderImport() {
    title.textContent = '匯入存檔';
    area.readOnly = false;
    area.value = '';
    area.placeholder = '把存檔代碼貼在這裡（TL1:…）';
    help.textContent = '貼上之前複製的存檔代碼，或選擇下載的存檔檔案。匯入會覆蓋目前的存檔。';
    setStatus('', '');
    actions.appendChild(button('匯入', 'sd-primary', () => tryImport(area.value)));
    actions.appendChild(button('選擇檔案', '', async () => {
      const picked = await pickSaveFileText();
      if (picked.cancelled) return;
      if (!picked.ok) { setStatus(picked.error || '讀取檔案失敗', 'warn'); return; }
      area.value = picked.text.length > 600 ? `${picked.text.slice(0, 120)}…（檔案內容已讀入）` : picked.text;
      tryImport(picked.text);
    }));
    actions.appendChild(button('取消', '', close));
    setTimeout(() => { try { area.focus(); } catch (_) { /* 靜默 */ } }, 30);
  }

  function tryImport(text) {
    const checked = checkSaveCode(text);
    if (!checked.ok) { setStatus(`匯入失敗：${checked.error}`, 'warn'); return; }
    const existing = currentSaveSummaryText();
    if (!existing) { commit(checked); return; }
    renderConfirm(checked, existing);
  }

  function renderConfirm(checked, existing) {
    view = 'confirm';
    pending = checked;
    clearActions();
    title.textContent = '確定要覆蓋存檔嗎？';
    area.readOnly = true;
    area.value = `目前的存檔：${existing}\n將會被覆蓋成：${checked.summary}`;
    help.textContent = '覆蓋後無法復原。想保險的話，先到「存檔代碼」把目前的進度複製起來。';
    setStatus('', '');
    actions.appendChild(button('確定覆蓋', 'sd-danger', () => commit(checked)));
    actions.appendChild(button('返回', '', renderMain));
  }

  function commit(checked) {
    const res = commitImportedSave(checked);
    if (!res.ok) { setStatus(`匯入失敗：${res.error}`, 'warn'); return; }
    imported = true;
    if (options.onImported) options.onImported({ persisted: res.persisted });
    close();
  }

  function close() {
    if (openDialog !== api) return;
    openDialog = null;
    backdrop.remove();
    if (options.onClose) options.onClose({ imported });
  }

  const api = { close, root: backdrop, get view() { return view; } };
  openDialog = api;
  document.body.appendChild(backdrop);
  renderMain();
  return api;
}

export function isSaveDialogOpen() {
  return !!openDialog;
}

export function closeSaveDialog() {
  if (openDialog) openDialog.close();
}
