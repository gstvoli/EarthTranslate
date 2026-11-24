$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $PSScriptRoot
$tauriCli = Join-Path $projectRoot "node_modules\.bin\tauri.cmd"
$executable = Join-Path $projectRoot "src-tauri\target\release\earthtranslate.exe"
$releaseDirectory = Join-Path $projectRoot "release"
$packageVersion = (Get-Content (Join-Path $projectRoot "package.json") -Raw | ConvertFrom-Json).version
$archive = Join-Path $releaseDirectory "EarthTranslate-$packageVersion-portable.zip"

& $tauriCli build --no-bundle
if ($LASTEXITCODE -ne 0) {
  exit $LASTEXITCODE
}

New-Item -ItemType Directory -Force -Path $releaseDirectory | Out-Null
Remove-Item -Force -ErrorAction SilentlyContinue $archive
Compress-Archive -Path $executable -DestinationPath $archive -CompressionLevel Optimal

Write-Host "Pacote portátil criado em: $archive"
