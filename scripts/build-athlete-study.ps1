param([switch]$Render)
$ErrorActionPreference = 'Stop'
$studyRepo = Split-Path -Parent $PSScriptRoot
$studyBlender = Join-Path $studyRepo '../tools/blender/blender-5.2.2-windows-x64/blender.exe'
$studyCache = Join-Path $studyRepo '../tools/asset-cache/young-asian-male'
$studyOutput = Join-Path $studyRepo '../asset-studio/athlete-study'
if (!(Test-Path -LiteralPath $studyBlender)) { throw "Blender is missing: $studyBlender" }
Push-Location $studyRepo
try {
    & python scripts/fetch-athlete-skin.py $studyCache
    if ($LASTEXITCODE -ne 0) { throw 'Source skin verification failed' }
    New-Item -ItemType Directory -Path $studyOutput -Force | Out-Null
    Add-Type -AssemblyName System.Drawing
    $studyBitmap = New-Object System.Drawing.Bitmap 1024,256
    $studyGraphics = [System.Drawing.Graphics]::FromImage($studyBitmap)
    $studyGraphics.Clear([System.Drawing.Color]::Transparent)
    $studyGraphics.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit
    $studyFont = New-Object System.Drawing.Font('Khmer UI',110,[System.Drawing.FontStyle]::Bold,[System.Drawing.GraphicsUnit]::Pixel)
    $studyFormat = New-Object System.Drawing.StringFormat
    $studyFormat.Alignment = [System.Drawing.StringAlignment]::Center
    $studyFormat.LineAlignment = [System.Drawing.StringAlignment]::Center
    $studyGraphics.DrawString('កូនខ្មែរ',$studyFont,[System.Drawing.Brushes]::White,(New-Object System.Drawing.RectangleF(0,0,1024,256)),$studyFormat)
    $studyBitmap.Save((Join-Path $studyOutput 'koun-khmer.png'),[System.Drawing.Imaging.ImageFormat]::Png)
    $studyGraphics.Dispose(); $studyBitmap.Dispose(); $studyFont.Dispose()
    $studyArgs = @('--background','--factory-startup','--python-exit-code','1','--python','scripts/build-athlete-study.py','--','--output',$studyOutput)
    if ($Render) { $studyArgs += '--render' }
    & $studyBlender @studyArgs
    if ($LASTEXITCODE -ne 0) { throw 'Blender authoring failed' }
    Copy-Item -LiteralPath (Join-Path $studyOutput 'athlete-rower-study.glb') -Destination 'public/assets/human/athlete-rower-study.glb'
    Copy-Item -LiteralPath (Join-Path $studyOutput 'athlete-rower-study.blend') -Destination 'assets/blender/athlete-rower-study.blend'
    New-Item -ItemType Directory -Path 'docs/qa/athlete-study' -Force | Out-Null
    Copy-Item -LiteralPath (Join-Path $studyOutput 'build-report.json') -Destination 'docs/qa/athlete-study/build-report.json'
    if ($Render) { Copy-Item -Path (Join-Path $studyOutput '*.png') -Destination 'docs/qa/athlete-study/' }
    & node scripts/check-athlete-study.mjs
    if ($LASTEXITCODE -ne 0) { throw 'Persisted GLB check failed' }
} finally { Pop-Location }
