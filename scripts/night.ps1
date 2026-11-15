# Unattended night run: Muse Spark works through a queue file on its own branch. main is never touched.
# Start:  powershell -ExecutionPolicy Bypass -File E:\flame-in-freefall\scripts\night.ps1 -Lane web      (or -Lane backend)
# Stop:   create the file STOP in the lane's worktree (E:\fif-wt\night-web\STOP); the loop ends after the current run.
# The agent gets no GitHub token and does not push: this script pushes the lane branch after each run.
param([ValidateSet('web','backend')][string]$Lane = 'web')
$repo = 'E:\flame-in-freefall'; $wt = "E:\fif-wt\night-$Lane"; $branch = "night/$Lane"; $logs = 'E:\spaceapps-data\logs'
$queue = @{ web = 'docs/NIGHT-QUEUE.md'; backend = 'docs/NIGHT-QUEUE-BACKEND.md' }[$Lane]
$env:TEMP = 'E:\caches\tmp'; $env:TMP = 'E:\caches\tmp'
# git ownership check: only these two paths, not '*'
$env:GIT_CONFIG_COUNT = '2'
$env:GIT_CONFIG_KEY_0 = 'safe.directory'; $env:GIT_CONFIG_VALUE_0 = 'E:/flame-in-freefall'
$env:GIT_CONFIG_KEY_1 = 'safe.directory'; $env:GIT_CONFIG_VALUE_1 = "E:/fif-wt/night-$Lane"
New-Item -ItemType Directory -Force $logs | Out-Null
function Note([string]$m) { "$(Get-Date -Format 'HH:mm:ss') [$Lane] $m" | Tee-Object -FilePath "$logs\night-$Lane.log" -Append }

git -C $repo fetch -q origin
if (-not (Test-Path $wt)) { git -C $repo worktree add -q -B $branch $wt origin/main }
# the muse CLI needs the key in its environment; it is not written to any file in the worktree
$env:META_API_KEY = (Get-Content "$repo\.env" | Where-Object { $_ -match '^META_API_KEY=(.+)$' } | ForEach-Object { $Matches[1].Trim() })
$prompt = "$logs\prompt-$Lane.md"
$head = "LANE: $Lane`nWORKSPACE: $wt`nBRANCH: $branch`nQUEUE FILE: $queue`n`n"
[IO.File]::WriteAllText($prompt, $head + [IO.File]::ReadAllText("$repo\docs\lanes\night-prompt.md"))

$idle = 0
for ($run = 1; $run -le 60; $run++) {
  if (Test-Path "$wt\STOP") { Note 'STOP file found'; break }
  if (-not (Select-String -Path "$wt\$queue" -Pattern '^- \[ \]' -Quiet)) { Note 'queue empty'; break }
  $before = git -C $wt rev-parse HEAD
  $log = "$logs\night-$Lane-$(Get-Date -Format 'MMdd-HHmm').jsonl"
  Note "run $run start, log $log"
  Set-Location $wt
  muse exec --prompt-file $prompt --workspace $wt --model 'muse-spark-1.3-contributor' --contributor-mode on `
    --trust-workspace --disable-approval --sandbox-network enabled --disable-request-user-input --json 2>&1 | Out-File -Encoding utf8 $log
  $code = $LASTEXITCODE
  $after = git -C $wt rev-parse HEAD
  if ((git -C $wt rev-parse --abbrev-ref HEAD) -eq $branch) { git -C $wt push -q origin $branch }
  Note "run $run exit $code, head $after"
  if ($after -eq $before) { $idle++ } else { $idle = 0 }
  if ($idle -ge 3) { Note 'three runs without a commit, stopping'; break }
  Start-Sleep -Seconds 20
}
Note 'night run finished'
