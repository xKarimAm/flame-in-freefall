# The one test command (docs/OWNERS.md). Run from anywhere: powershell -ExecutionPolicy Bypass -File scripts\check.ps1
# Exits non-zero on any failure.
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot

$env:TEMP = 'E:\caches\tmp'
$env:TMP = 'E:\caches\tmp'
New-Item -ItemType Directory -Force $env:TEMP | Out-Null

# safe.directory: OWNERS.md says to add the global entry if missing. That would write
# C:\Users\<user>\.gitconfig, and AGENTS rule 9 says never write to C:, so the same
# setting is applied to this process only. See STATE.md "needs Karim's call".
if (-not (git config --global --get-all safe.directory | Where-Object { $_ -eq '*' })) {
  $env:GIT_CONFIG_COUNT = '1'
  $env:GIT_CONFIG_KEY_0 = 'safe.directory'
  $env:GIT_CONFIG_VALUE_0 = '*'
}

$failed = @()
function Step([string]$name, [string]$dir, [scriptblock]$cmd) {
  Write-Host "== $name" -ForegroundColor Cyan
  Push-Location $dir
  try {
    & $cmd
    if ($LASTEXITCODE -ne 0) { $script:failed += $name; Write-Host "FAILED: $name (exit $LASTEXITCODE)" -ForegroundColor Red }
  } catch {
    $script:failed += $name; Write-Host "FAILED: $name ($_)" -ForegroundColor Red
  } finally { Pop-Location }
}

if (Test-Path "$root\pipeline\pyproject.toml") {
  Step 'pytest (pipeline)' "$root\pipeline" { uv run pytest -q }
} else { Write-Host '== pipeline: no pyproject.toml yet, skipped' }

if (Test-Path "$root\web\package.json") {
  if (-not (Test-Path "$root\web\node_modules")) { Step 'npm ci (web)' "$root\web" { npm ci --no-audit --no-fund } }
  Step 'npm test (web)' "$root\web" { npm test }
  Step 'npm run build (web)' "$root\web" { npm run build }
} else { Write-Host '== web: no package.json yet, skipped' }

if ($failed.Count) { Write-Host "check.ps1: FAILED -> $($failed -join ', ')" -ForegroundColor Red; exit 1 }
Write-Host 'check.ps1: green' -ForegroundColor Green
exit 0
