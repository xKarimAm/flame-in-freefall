# Start one Muse lane headless. Usage: powershell -ExecutionPolicy Bypass -File E:\spaceapps-data\run-lane.ps1 -Lane w1   (or w2)
param([Parameter(Mandatory)][ValidateSet('w1','w2')][string]$Lane)
$wt    = @{ w1 = 'E:\fif-wt\pipeline'; w2 = 'E:\fif-wt\web' }[$Lane]
$model = @{ w1 = 'muse-wonder-1.0';    w2 = 'muse-spark-1.3-contributor' }[$Lane]
$env:META_API_KEY = (Get-Content E:\flame-in-freefall\.env | Where-Object { $_ -match '^META_API_KEY=(.+)$' } | ForEach-Object { $Matches[1].Trim() })
$env:GH_TOKEN = (gh auth token)
$log = "E:\spaceapps-data\logs\$Lane-$(Get-Date -Format 'MMdd-HHmm').jsonl"
Set-Location $wt
git -c safe.directory=* fetch -q origin
muse exec --prompt-file "E:\spaceapps-data\prompts\$Lane.md" --workspace $wt --model $model --contributor-mode on `
  --trust-workspace --disable-approval --sandbox-network enabled --disable-request-user-input --json 2>&1 | Out-File -Encoding utf8 $log
"$Lane finished, exit $LASTEXITCODE, log $log"
