@echo off
REM ============================================================
REM   盜賊傳說 — 一鍵啟動遊戲（Windows）
REM ============================================================
REM   雙擊本檔即可啟動本機伺服器，並在預設瀏覽器開啟遊戲。
REM   首次執行 npx 會自動下載 serve 套件（< 30 秒）。
REM ============================================================

setlocal

echo.
echo  ============================================================
echo    盜賊傳說 - MapleStory 風格平台遊戲
echo  ============================================================
echo.

REM 檢查 Node.js 是否安裝
where node >nul 2>nul
if errorlevel 1 (
    echo  [錯誤] 找不到 Node.js
    echo.
    echo  請先安裝 Node.js 18 或以上版本：
    echo    https://nodejs.org/
    echo.
    pause
    exit /b 1
)

echo  Node.js 已安裝
for /f "tokens=*" %%v in ('node --version') do echo  版本：%%v
echo.

REM 切到本檔所在目錄
cd /d "%~dp0"

echo  正在啟動本地伺服器...
echo  啟動完成後請開啟瀏覽器：
echo.
echo      http://localhost:3000
echo.
echo  按 Ctrl+C 可以停止伺服器
echo  ============================================================
echo.

REM 啟動 serve（npx 會自動下載未安裝的套件）
REM 綁定 127.0.0.1 避免對外網路暴露（依專案安全規範）
call npx --yes serve . -l tcp://127.0.0.1:3000

REM 若伺服器結束（玩家按 Ctrl+C 或執行錯誤）
echo.
echo  伺服器已停止。
pause
endlocal
