$ErrorActionPreference = "Continue"
$root = "C:\Users\redtl\OneDrive\Documents\website"
$logPath = Join-Path $root "listings-check.log"
Set-Location $root

$timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
"---- $timestamp ----" | Out-File -FilePath $logPath -Append -Encoding utf8

node check-listings-spreadsheet.js 2>&1 | Out-File -FilePath $logPath -Append -Encoding utf8

"See listings-check-report.md for the full comparison." | Out-File -FilePath $logPath -Append -Encoding utf8
