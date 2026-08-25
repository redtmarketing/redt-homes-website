$ErrorActionPreference = "Continue"
$root = "C:\Users\redtl\OneDrive\Documents\website"
$logPath = Join-Path $root "mortgage-rate-sync.log"
Set-Location $root

$timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
"---- $timestamp ----" | Out-File -FilePath $logPath -Append -Encoding utf8

node update-mortgage-rate.js 2>&1 | Out-File -FilePath $logPath -Append -Encoding utf8
node build-listings.js 2>&1 | Out-File -FilePath $logPath -Append -Encoding utf8

"Done. Remember to redeploy the site to publish the refreshed rate." | Out-File -FilePath $logPath -Append -Encoding utf8
