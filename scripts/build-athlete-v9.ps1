param([switch]$Render)
$ErrorActionPreference = 'Stop'
$taskRepo = Split-Path -Parent $PSScriptRoot
$taskRoot = Split-Path -Parent $taskRepo
$taskStudio = Join-Path $taskRoot 'asset-studio'
$taskSkinCache = Join-Path $taskRoot 'tools/asset-cache/young-asian-male'
New-Item -ItemType Directory -Path $taskStudio -Force | Out-Null
Set-Location -LiteralPath $taskRepo
function Run-Checked([string]$Program, [string[]]$Arguments) {
    & $Program @Arguments
    if ($LASTEXITCODE -ne 0) { throw "$Program failed with exit code $LASTEXITCODE" }
}
Run-Checked 'python' @('scripts/fetch-athlete-skin.py', $taskSkinCache)
Run-Checked 'node' @('scripts/prepare-athlete.mjs', (Join-Path $taskStudio 'athlete-v9-contour-raw.glb'))
Run-Checked 'node' @('node_modules/@gltf-transform/cli/bin/cli.js', 'simplify', (Join-Path $taskStudio 'athlete-v9-contour-raw.glb'), 'public/assets/human/makehuman-athlete.glb', '--ratio', '0.25', '--error', '0.001', '--lock-border', 'true')
Run-Checked 'node' @('scripts/export-crew.mjs', (Join-Path $taskStudio 'crew-v9-untextured.glb'), 'docs/qa/rig-sprint-v9.json')
Run-Checked 'python' @('scripts/texture-athlete.py', '--input', (Join-Path $taskStudio 'crew-v9-untextured.glb'), '--skin', (Join-Path $taskSkinCache 'young_lightskinned_male_diffuse3.png'), '--output', (Join-Path $taskStudio 'crew-v9-textured-raw.glb'), '--atlas-dir', (Join-Path $taskStudio 'athlete-atlas-v9'))
Run-Checked 'node' @('node_modules/@gltf-transform/cli/bin/cli.js', 'dedup', (Join-Path $taskStudio 'crew-v9-textured-raw.glb'), (Join-Path $taskStudio 'crew-v9-dedup.glb'))
Run-Checked 'node' @('scripts/tangent-athlete.mjs', (Join-Path $taskStudio 'crew-v9-dedup.glb'), (Join-Path $taskStudio 'crew-v9-tangents.glb'))
Run-Checked 'node' @('node_modules/@gltf-transform/cli/bin/cli.js', 'dedup', (Join-Path $taskStudio 'crew-v9-tangents.glb'), 'public/assets/ghe-ngo/ghe-ngo-crew-v9.glb')
if ($Render) {
    $taskBlender = Join-Path $taskRoot 'tools/blender/blender-5.2.2-windows-x64/blender.exe'
    if (-not (Test-Path -LiteralPath $taskBlender)) { throw 'Verified portable Blender installation was not found.' }
    Run-Checked $taskBlender @('--background', '--factory-startup', '--python-exit-code', '1', '--python', 'scripts/blender-studio.py', '--', '--input', 'public/assets/ghe-ngo/ghe-ngo-crew-v9.glb', '--output', (Join-Path $taskStudio 'v9-final'), '--render', '--export-actor')
}
Write-Output 'V9 crew GLB built. Inspect rendered and browser results before publishing.'
