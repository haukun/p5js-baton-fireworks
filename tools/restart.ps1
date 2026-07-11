# ローカル開発サーバー起動スクリプト
# Usage: .\scripts\restart.ps1

# 既存の http-server プロセスを停止
Get-Process -Name "node" -ErrorAction SilentlyContinue |
  Where-Object { $_.CommandLine -match "http-server" } |
  Stop-Process -Force -ErrorAction SilentlyContinue

Write-Host "Starting local server on http://localhost:8080/" -ForegroundColor Cyan
Write-Host "  Viewer:     http://localhost:8080/viewer-fireworks/" -ForegroundColor Gray
Write-Host "  Playground: http://localhost:8080/playground/" -ForegroundColor Gray
Write-Host "  Guide (JP): http://localhost:8080/docs/guide.html" -ForegroundColor Gray
Write-Host "  Guide (EN): http://localhost:8080/docs/guide-en.html" -ForegroundColor Gray
Write-Host ""
Write-Host "Press Ctrl+C to stop." -ForegroundColor DarkGray

npx http-server . -p 8080 -c-1 --cors
