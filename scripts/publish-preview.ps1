param(
    [string]$RepoPath = (Join-Path $PSScriptRoot '..'),
    [Parameter(Mandatory = $true)][string]$DeployPath,
    [switch]$PrepareOnly
)
$ErrorActionPreference = 'Stop'
$taskRepo = [IO.Path]::GetFullPath($RepoPath)
$taskDeploy = [IO.Path]::GetFullPath($DeployPath)
if ($taskDeploy -eq $taskRepo) { throw 'Use a separate staging directory' }
$taskSource = Join-Path $taskRepo 'public/assets/illustrated-v22'
$taskTarget = Join-Path $taskDeploy 'assets/illustrated-v22'
New-Item -ItemType Directory -Force -Path $taskTarget | Out-Null
Get-ChildItem -LiteralPath $taskSource -File | ForEach-Object { Copy-Item -LiteralPath $_.FullName -Destination $taskTarget }
Get-ChildItem -LiteralPath $taskSource -Directory | ForEach-Object { Copy-Item -LiteralPath $_.FullName -Destination $taskTarget -Recurse -Force }
# Remove only the six explicitly superseded files in this staging directory.
foreach ($taskOldName in @('game-rules-v26.js','hybrid-boats-v25.js','quick-race-v26.js','team-picker-v28.js','tournament-ui-v31.js','game-ui-v26.css')) {
    $taskOldFile = [IO.Path]::GetFullPath((Join-Path $taskTarget $taskOldName))
    if (!$taskOldFile.StartsWith($taskTarget + [IO.Path]::DirectorySeparatorChar)) { throw 'Invalid staging target' }
    if (Test-Path -LiteralPath $taskOldFile) { Remove-Item -LiteralPath $taskOldFile }
}
$taskBuilt = Join-Path $taskRepo 'dist'
if (!(Test-Path -LiteralPath (Join-Path $taskBuilt 'index.html'))) { throw 'Run npm run build before publishing' }
$taskPublishPaths = @('index.html','assets/illustrated-v22')
Get-ChildItem -LiteralPath (Join-Path $taskBuilt 'assets') -File | ForEach-Object {
    Copy-Item -LiteralPath $_.FullName -Destination (Join-Path $taskDeploy 'assets') -Force
    $taskPublishPaths += 'assets/' + $_.Name
}
# Carry existing source assets required by the preserved React studio.
foreach ($taskAssetDir in @('festival-crowd','studio-kit','athlete-identities','athlete-master','race-audio')) {
    if ($taskAssetDir -eq 'race-audio') {
        $taskAudioTarget = [IO.Path]::GetFullPath((Join-Path $taskDeploy 'assets/race-audio'))
        $taskOldManifest = Join-Path $taskAudioTarget 'manifest.json'
        if (Test-Path -LiteralPath $taskOldManifest) {
            $taskOldAudio = Get-Content -LiteralPath $taskOldManifest -Raw | ConvertFrom-Json
            foreach ($taskClip in $taskOldAudio.clips.PSObject.Properties.Value) {
                $taskOldAudioFile = [IO.Path]::GetFullPath((Join-Path $taskAudioTarget $taskClip.file))
                if (!$taskOldAudioFile.StartsWith($taskAudioTarget + [IO.Path]::DirectorySeparatorChar) -or [IO.Path]::GetExtension($taskOldAudioFile) -ne '.mp3') { throw 'Invalid old audio path' }
                # Root excerpts are owned by this publisher. Imported samples remain
                # owned by their nested source pack even when not selected in a heat.
                if ([IO.Path]::GetDirectoryName($taskOldAudioFile) -eq $taskAudioTarget -and !(Test-Path -LiteralPath (Join-Path $taskRepo ('public/assets/race-audio/' + $taskClip.file))) -and (Test-Path -LiteralPath $taskOldAudioFile)) { Remove-Item -LiteralPath $taskOldAudioFile }
            }
        }
    }
    Copy-Item -LiteralPath (Join-Path $taskRepo ('public/assets/' + $taskAssetDir)) -Destination (Join-Path $taskDeploy 'assets') -Recurse -Force
    $taskPublishPaths += 'assets/' + $taskAssetDir
}
$taskCrewPath = 'assets/ghe-ngo/festival-crew.glb'
New-Item -ItemType Directory -Force -Path (Join-Path $taskDeploy 'assets/ghe-ngo') | Out-Null
Copy-Item -LiteralPath (Join-Path $taskRepo ('public/' + $taskCrewPath)) -Destination (Join-Path $taskDeploy $taskCrewPath) -Force
$taskPublishPaths += $taskCrewPath
if (!$PrepareOnly) {
    & git -C $taskRepo fetch origin 'refs/heads/gh-pages:refs/remotes/origin/gh-pages'
    if ($LASTEXITCODE -ne 0) { throw 'Cannot fetch current Pages parent' }
}
$taskParent = (& git -C $taskRepo rev-parse origin/gh-pages).Trim()
if ($LASTEXITCODE -ne 0) { throw 'Cannot read Pages parent' }
$taskRootHtml = [IO.File]::ReadAllText((Join-Path $taskBuilt 'index.html'))
$taskDescription = 'Chơi đua ghe Ngo 3D: cúp lễ hội 61 đội, chèo theo nhịp, giữ sức và đạp nước rút trên sông Maspéro 1.200 m.'
$taskRootHtml = [regex]::Replace($taskRootHtml, '<meta name="description" content="[^"]*"\s*/?>', '<meta name="description" content="' + $taskDescription + '" />')
$taskRootHtml = [regex]::Replace($taskRootHtml, '<meta property="og:description" content="[^"]*"\s*/?>', '<meta property="og:description" content="' + $taskDescription + '" />')
$taskRootHtml = [regex]::Replace($taskRootHtml, '<meta property="og:title" content="[^"]*"\s*/?>', '<meta property="og:title" content="Đua Ghe Ngo — Sông Maspéro" />')
[IO.File]::WriteAllText((Join-Path $taskDeploy 'index.html'), $taskRootHtml + "`n", [Text.UTF8Encoding]::new($false))
if ($PrepareOnly) { Write-Output ('Prepared canonical root and assets: ' + $taskDeploy); return }

# Publish verified React chunks and current game; retain unrelated Pages data
# and historical assets by starting from its exact current tree.
$taskPreviousIndex = $env:GIT_INDEX_FILE
$env:GIT_INDEX_FILE = Join-Path $taskDeploy ('pages-' + [guid]::NewGuid().ToString('N') + '.index')
try {
    $taskGitDir = Join-Path $taskRepo '.git'
    & git -C $taskRepo read-tree $taskParent
    if ($LASTEXITCODE -ne 0) { throw 'Cannot initialize Pages index' }
    & git --git-dir=$taskGitDir --work-tree=$taskDeploy add --force -- @taskPublishPaths
    if ($LASTEXITCODE -ne 0) { throw 'Cannot stage canonical preview' }
    $taskChanges = @(& git -C $taskRepo diff --cached --name-only $taskParent)
    if ($LASTEXITCODE -ne 0 -or !$taskChanges.Count) { throw 'Missing Pages changes' }
    foreach ($taskPath in $taskChanges) {
        $taskAllowed = $false
        foreach ($taskApproved in $taskPublishPaths) {
            if ($taskPath -eq $taskApproved -or $taskPath.StartsWith($taskApproved + '/')) { $taskAllowed = $true; break }
        }
        if (!$taskAllowed) { throw ('Unexpected deployment path: ' + $taskPath) }
    }
    $taskTree = (& git -C $taskRepo write-tree).Trim()
    if ($LASTEXITCODE -ne 0) { throw 'Cannot write Pages tree' }
    $taskMain = (& git -C $taskRepo rev-parse HEAD).Trim()
    $taskCommit = (& git -C $taskRepo commit-tree $taskTree -p $taskParent -m ('Publish canonical 3D boat from ' + $taskMain)).Trim()
    if ($LASTEXITCODE -ne 0) { throw 'Cannot create Pages commit' }
    & git -C $taskRepo -c credential.username=machxanht push origin ($taskCommit + ':refs/heads/gh-pages')
    if ($LASTEXITCODE -ne 0) { throw 'Cannot push Pages preview' }
    [IO.File]::WriteAllText((Join-Path $taskDeploy 'pages-commit.txt'), $taskCommit)
    Write-Output ('Pages commit: ' + $taskCommit)
    Write-Output ('Paths published: ' + $taskChanges.Count)
} finally {
    $env:GIT_INDEX_FILE = $taskPreviousIndex
}
