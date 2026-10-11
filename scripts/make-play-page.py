#!/usr/bin/env python3
"""把遊戲打包成單一 HTML 頁面（Claude Artifact 用）。

用法：python3 scripts/make-play-page.py [輸出檔，預設 /tmp/play.html]

頁面 = <title> + 內嵌 style.css + 遊戲容器 + 內嵌 dist/bundle.js。
圖片（dist/assets/*）不內嵌，發布時以附加檔案放在同樣的相對路徑。
發布前先 `npm run build`，確保 dist/bundle.js 是最新的。
"""
import sys, pathlib

root = pathlib.Path(__file__).resolve().parent.parent
out = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else '/tmp/play.html')
css = (root / 'style.css').read_text(encoding='utf-8')
js = (root / 'dist' / 'bundle.js').read_text(encoding='utf-8')
assert '</script' not in js.replace('<\\/script', ''), 'bundle 內含 </script，內嵌會破壞頁面'
page = (
    '<title>盜賊傳說</title>\n'
    f'<style>{css}</style>\n'
    '<div id="game-container"></div>\n'
    '<div id="loading">載入中... 請稍候</div>\n'
    f'<script>{js}\n</script>\n'
    '<script>document.getElementById("loading").style.display="none";</script>\n'
)
out.write_text(page, encoding='utf-8')
print(f'{out}  {len(page.encode()) / 1e6:.2f} MB')
