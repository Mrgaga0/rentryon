param()

$ErrorActionPreference = "Stop"
$scriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot = Split-Path -Parent $scriptRoot
Set-Location $repoRoot

if (-not (Test-Path "package.json")) {
  Write-Error "Run this script from the repository root."
  exit 1
}

if (-not (Test-Path "node_modules")) {
  Write-Host "Installing npm dependencies..." -ForegroundColor Cyan
  npm install
  if ($LASTEXITCODE -ne 0) {
    Write-Error "npm install failed."
    exit $LASTEXITCODE
  }
}

function Import-DotEnv($path) {
  if (-not (Test-Path $path)) { return }
  Write-Host "Loading environment from $path" -ForegroundColor DarkGray
  Get-Content $path | ForEach-Object {
    $line = $_.Trim()
    if (-not $line -or $line.StartsWith('#')) { return }
    $parts = $line.Split('=', 2)
    if ($parts.Count -eq 2) {
      $key = $parts[0].Trim()
      $value = $parts[1].Trim().Trim('"')
      if (-not [string]::IsNullOrWhiteSpace($key)) {
        [Environment]::SetEnvironmentVariable($key, $value)
      }
    }
  }
}

$envFile = Join-Path $repoRoot ".env.local"
Import-DotEnv $envFile

if (-not $env:NODE_ENV) { $env:NODE_ENV = "development" }
if (-not $env:PORT -or $env:PORT.Trim() -eq "") { $env:PORT = "5000" }

$folderName = "렌트리온홈페이지"
$defaultDataRoot = "Y:\$folderName\data"

if (-not $env:DATA_ROOT -or $env:DATA_ROOT.Trim() -eq "") {
  $env:DATA_ROOT = $defaultDataRoot
}

$fallbackDataRoot = Join-Path $repoRoot "uploads"
$triedFallback = $false

# Fall back to repo uploads when the shared drive is unavailable.
while ($true) {
  try {
    if (-not (Test-Path $env:DATA_ROOT)) {
      New-Item -ItemType Directory -Force -Path $env:DATA_ROOT | Out-Null
    }
    break
  } catch {
    if (-not $triedFallback -and $env:DATA_ROOT -eq $defaultDataRoot) {
      Write-Warning "Failed to access $($env:DATA_ROOT). Falling back to $fallbackDataRoot."
      $env:DATA_ROOT = $fallbackDataRoot
      $triedFallback = $true
      continue
    }
    Write-Error "Failed to create data directory at $($env:DATA_ROOT): $_"
    exit 1
  }
}

Write-Host "Using data directory: $($env:DATA_ROOT)" -ForegroundColor DarkGray

$requiredVars = @(
  "DATABASE_URL",
  "SESSION_SECRET",
  "REPLIT_DOMAINS",
  "REPL_ID",
  "ISSUER_URL",
  "GEMINI_API_KEY"
)

$missing = @()
foreach ($var in $requiredVars) {
  $value = [Environment]::GetEnvironmentVariable($var)
  if ([string]::IsNullOrWhiteSpace($value)) {
    $missing += $var
  }
}

if ($missing.Count -gt 0) {
  Write-Host "Missing environment variables:" -ForegroundColor Red
  $missing | ForEach-Object { Write-Host "  - $_" -ForegroundColor Red }
  Write-Host "Configure them in .env.local or the current shell and rerun." -ForegroundColor Yellow
  exit 1
}

Write-Host "Starting 렌트리온 dev server on http://localhost:$($env:PORT)" -ForegroundColor Green
try {
  Start-Process "http://localhost:$($env:PORT)" | Out-Null
} catch {
  Write-Host "(Browser launch skipped: $_)" -ForegroundColor Yellow
}

Write-Host "Press Ctrl+C to stop the server." -ForegroundColor DarkGray

& npx tsx server/index.ts
$exitCode = $LASTEXITCODE

if ($exitCode -ne 0) {
  Write-Warning "Server exited with code $exitCode. Verify Supabase credentials and other env vars."
  Read-Host "Press Enter to close"
}

exit $exitCode
