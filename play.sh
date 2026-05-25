#!/usr/bin/env bash
# ============================================================
#   盜賊傳說 — 一鍵啟動遊戲（macOS / Linux）
# ============================================================
#   執行：./play.sh
#   首次執行 npx 會自動下載 serve 套件（< 30 秒）。
# ============================================================

set -e

echo
echo " ============================================================"
echo "   盜賊傳說 - MapleStory 風格平台遊戲"
echo " ============================================================"
echo

# 檢查 Node.js 是否安裝
if ! command -v node >/dev/null 2>&1; then
  echo " [錯誤] 找不到 Node.js"
  echo
  echo " 請先安裝 Node.js 18 或以上版本："
  echo "   https://nodejs.org/"
  echo
  exit 1
fi

NODE_VERSION="$(node --version)"
echo " Node.js 已安裝"
echo " 版本：${NODE_VERSION}"
echo

# 切到本腳本所在目錄
cd "$(dirname "$0")"

echo " 正在啟動本地伺服器..."
echo " 啟動完成後請開啟瀏覽器："
echo
echo "     http://localhost:3000"
echo
echo " 按 Ctrl+C 可以停止伺服器"
echo " ============================================================"
echo

# 啟動 serve（npx 會自動下載未安裝的套件）
# 綁定 127.0.0.1 避免對外網路暴露（依專案安全規範）
exec npx --yes serve . -l tcp://127.0.0.1:3000
