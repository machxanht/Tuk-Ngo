param([switch]$RebuildStudy)
$ErrorActionPreference = 'Stop'
$crewRepo = Split-Path -Parent $PSScriptRoot
$crewBlender = Join-Path $crewRepo '../tools/blender/blender-5.2.2-windows-x64/blender.exe'
$crewCache = Join-Path $crewRepo '../asset-studio/crew-v11'
if (!(Test-Path -LiteralPath $crewBlender)) { throw "Blender is missing: $crewBlender" }
Push-Location $crewRepo
try {
    if ($RebuildStudy) {
        & powershell -NoProfile -File scripts/build-athlete-study.ps1
        if ($LASTEXITCODE -ne 0) { throw 'Detailed athlete build failed' }
    }
    & node scripts/plan-crew-support.mjs
    if ($LASTEXITCODE -ne 0) { throw 'Foot support planning failed' }
    foreach ($crewSprint in @($false, $true)) {
        $crewArgs = @('--background','--python-exit-code','1','--python','scripts/build-role-crew.py')
        if ($crewSprint) { $crewArgs += @('--','--sprint') }
        & $crewBlender @crewArgs
        if ($LASTEXITCODE -ne 0) { throw 'Role animation export failed' }
    }
    & npx --no-install gltf-transform dedup (Join-Path $crewCache 'crew-only.glb') (Join-Path $crewCache 'crew-dedup.glb')
    if ($LASTEXITCODE -ne 0) { throw 'Crew deduplication failed' }
    & node scripts/merge-role-crew.mjs
    if ($LASTEXITCODE -ne 0) { throw 'Hull and crew assembly failed' }
    & node scripts/check-role-crew.mjs
    if ($LASTEXITCODE -ne 0) { throw 'Persisted role GLB check failed' }
    & node scripts/check-role-runtime.mjs
    if ($LASTEXITCODE -ne 0) { throw 'Animated foot placement check failed' }
} finally { Pop-Location }
