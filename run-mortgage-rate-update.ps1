$ErrorActionPreference = "Continue"
$root = "C:\Users\redtl\OneDrive\Documents\website"
$logPath = Join-Path $root "mortgage-rate-sync.log"
$ratePath = Join-Path $root "data\mortgage-rate.json"
$netlify = "C:\Users\redtl\AppData\Roaming\npm\netlify.cmd"
Set-Location $root

function Log($msg) { $msg | Out-File -FilePath $logPath -Append -Encoding utf8 }

$timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
Log "---- $timestamp ----"

# Only auto-deploy from a clean working tree, so half-finished edits never
# go live by accident. (Checked before the sync touches any files.)
# Local Claude Code settings (.claude/) never get deployed and are almost
# always modified, so they don't count as "dirty".
$dirtyBefore = git status --porcelain | Where-Object { $_ -notmatch '\s\.claude/' }
Log "Started (working tree $(if ($dirtyBefore) { 'has other changes' } else { 'clean' }))."
$oldRate = (Get-Content $ratePath -Raw | ConvertFrom-Json).rate

node update-mortgage-rate.js *>&1 | Out-File -FilePath $logPath -Append -Encoding utf8
if ($LASTEXITCODE -ne 0) { Log "Rate sync failed - nothing deployed."; exit 1 }

$newRate = (Get-Content $ratePath -Raw | ConvertFrom-Json).rate
if ($newRate -eq $oldRate) {
  # fetchedAt still changed; put the file back so the tree stays clean.
  git checkout -- data/mortgage-rate.json 2>&1 | Out-Null
  Log "Rate unchanged at $newRate% - no rebuild or deploy needed."
  exit 0
}

node build-listings.js *>&1 | Out-File -FilePath $logPath -Append -Encoding utf8
if ($LASTEXITCODE -ne 0) { Log "build-listings.js failed - nothing deployed."; exit 1 }

if ($dirtyBefore) {
  Log "Rate changed $oldRate% -> $newRate%, but the site folder had other uncommitted changes, so it was NOT deployed. Commit/deploy manually."
  exit 0
}

git add data/mortgage-rate.json listings index.html 2>&1 | Out-Null
git commit -q -m "Weekly mortgage rate sync: $oldRate% -> $newRate%" 2>&1 | Out-File -FilePath $logPath -Append -Encoding utf8
git push -q 2>&1 | Out-File -FilePath $logPath -Append -Encoding utf8

# Keep the full CLI output: on 2026-11-10 the deploy silently didn't happen
# under Task Scheduler while the old filtered log still said "Deployed".
$deployLog = Join-Path $root "mortgage-rate-deploy.log"
$deployOut = & $netlify deploy --prod --dir . *>&1 | Out-String
$deployOut | Out-File -FilePath $deployLog -Encoding utf8
if ($deployOut -notmatch "Deploy is live") {
  Log "Netlify deploy FAILED (exit $LASTEXITCODE) - see mortgage-rate-deploy.log, then run 'netlify deploy --prod' manually."
  exit 1
}

Log "Deployed: site now shows $newRate%."
