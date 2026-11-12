param(
  [string]$Destination = (Join-Path (Split-Path $PSScriptRoot -Parent) '..\ai-interview-practice')
)

$ErrorActionPreference = 'Stop'
$Root = Split-Path $PSScriptRoot -Parent
$Destination = [System.IO.Path]::GetFullPath($Destination)

if (Test-Path $Destination) {
  throw "Destination already exists: $Destination. Remove it or choose another path."
}

Push-Location $Root
try {
  git diff --quiet
  if ($LASTEXITCODE -ne 0) { throw 'Main checkout is dirty. Commit or stash changes first.' }
  git worktree add --detach $Destination HEAD
  Copy-Item (Join-Path $Root 'exercise\starter\QuoteCalculator.cs') (Join-Path $Destination 'src\Practice.Domain\QuoteCalculator.cs') -Force
  Push-Location $Destination
  try {
    dotnet build
    Write-Host ''
    Write-Host 'Practice worktree created:' $Destination -ForegroundColor Green
    Write-Host 'Expected: the build is green; behavior tests are red.'
    Write-Host "Run: dotnet run --project src/Practice.Api --urls http://127.0.0.1:5187"
  }
  finally { Pop-Location }
}
finally { Pop-Location }
