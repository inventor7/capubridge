param([string]$component)

if (-not $component) {
  Write-Host "Usage: .\add-ui.ps1 <component>" -ForegroundColor Yellow
  Write-Host "Example: .\add-ui.ps1 sheet"
  exit 1
}

Write-Host "Stopping project node processes (dev server, LSPs)..." -ForegroundColor Cyan
$projectRoot = $PSScriptRoot

Get-WmiObject Win32_Process | Where-Object {
  $_.Name -like 'node*' -and $_.CommandLine -like "*$projectRoot*"
} | ForEach-Object {
  Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue
  Write-Host "  Killed PID $($_.ProcessId)"
}

Start-Sleep -Milliseconds 800

Write-Host "Adding shadcn-vue component: $component..." -ForegroundColor Cyan
Set-Location "$projectRoot\apps\desktop"
pnpm dlx shadcn-vue@2.4.0 add $component -y

if ($LASTEXITCODE -eq 0) {
  Write-Host ""
  Write-Host "Done! Restart the dev server with:" -ForegroundColor Green
  Write-Host "  vp run tauri" -ForegroundColor White
} else {
  Write-Host ""
  Write-Host "Something went wrong. The workspace.yaml may still be locked." -ForegroundColor Red
}
