# Unattended night run: Muse Spark works through docs/NIGHT-QUEUE.md on branch night/spark. main is never touched.
# Start:  powershell -ExecutionPolicy Bypass -File E:\flame-in-freefall\scripts\night.ps1
# Stop:   create the file E:\fif-wt\night\STOP   (the loop ends after the current run)
# Same muse flags as docs/lanes/run-lane.ps1. Logs: E:\spaceapps-data\logs\night-*.jsonl and night.log
$repo = 'E:\flame-in-freefall'; $wt = 'E:\fif-wt\night'; $logs = 'E:\spaceapps-data\logs'
$env:TEMP = 'E:\caches\tmp'; $env:TMP = 'E:\caches\tmp'
$env:GIT_CONFIG_COUNT = '1'; $env:GIT_CONFIG_KEY_0 = 'safe.directory'; $env:GIT_CONFIG_VALUE_0 = '*'
New-Item -ItemType Directory -Force $logs | Out-Null
function Note([string]$m) { "$(Get-Date -Format 'HH:mm:ss') $m" | Tee-Object -FilePath "$logs\night.log" -Append }

# wait for tonight's story PR, so the branch starts from the new look (at most 45 minutes)
for ($i = 0; $i -lt 45; $i++) {
  if ((gh pr view 12 --repo xKarimAm/flame-in-freefall --json state -q .state) -eq 'MERGED') { break }
  Start-Sleep -Seconds 60
}
git -C $repo fetch -q origin
if (-not (Test-Path $wt)) { git -C $repo worktree add -q -B night/spark $wt origin/main }
$env:META_API_KEY = (Get-Content "$repo\.env" | Where-Object { $_ -match '^META_API_KEY=(.+)$' } | ForEach-Object { $Matches[1].Trim() })
$env:GH_TOKEN = (gh auth token)
Copy-Item "$repo\.env" "$wt\.env" -Force   # git-ignored; scripts/translate.py reads it

$idle = 0
for ($run = 1; $run -le 40; $run++) {
  if (Test-Path "$wt\STOP") { Note 'STOP file found'; break }
  if ((Get-Date).Hour -ge 8 -and (Get-Date).Hour -lt 20) { Note 'past 08:00, stopping'; break }
  if (-not (Select-String -Path "$wt\docs\NIGHT-QUEUE.md" -Pattern '^- \[ \]' -Quiet)) { Note 'queue empty'; break }
  $before = git -C $wt rev-parse HEAD
  $log = "$logs\night-$(Get-Date -Format 'MMdd-HHmm').jsonl"
  Note "run $run start, log $log"
  Set-Location $wt
  muse exec --prompt-file "$repo\docs\lanes\night-prompt.md" --workspace $wt --model 'muse-spark-1.3-contributor' --contributor-mode on `
    --trust-workspace --disable-approval --sandbox-network enabled --disable-request-user-input --json 2>&1 | Out-File -Encoding utf8 $log
  $after = git -C $wt rev-parse HEAD
  Note "run $run exit $LASTEXITCODE, head $after"
  if ($after -eq $before) { $idle++ } else { $idle = 0 }
  if ($idle -ge 3) { Note 'three runs without a commit, stopping'; break }
  Start-Sleep -Seconds 20
}
Note 'night run finished'
