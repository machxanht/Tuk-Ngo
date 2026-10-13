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
$taskParent = (& git -C $taskRepo rev-parse origin/gh-pages).Trim()
if ($LASTEXITCODE -ne 0) { throw 'Cannot read Pages parent' }
$taskRootHtml = (& git -C $taskRepo show ($taskParent + ':index.html')) -join "`n"
if ($LASTEXITCODE -ne 0) { throw 'Cannot read existing root entrypoint' }
if (!$taskRootHtml.Contains('entry-route.js')) {
    $taskRootHtml = $taskRootHtml.Replace('<head>', '<head>' + "`n" + '    <script src="./assets/illustrated-v22/entry-route.js"></script>')
}
$taskDescription = 'Đua ghe Ngo 2.5D minh họa trên sông Maspero: tập nhịp chèo, hai ghe đua thử và cảnh lễ hội hai bờ sông.'
$taskRootHtml = [regex]::Replace($taskRootHtml, '<meta name="description" content="[^"]*"\s*/?>', '<meta name="description" content="' + $taskDescription + '" />')
$taskRootHtml = [regex]::Replace($taskRootHtml, '<meta property="og:description" content="[^"]*"\s*/?>', '<meta property="og:description" content="' + $taskDescription + '" />')
$taskRootHtml = [regex]::Replace($taskRootHtml, '<meta property="og:title" content="[^"]*"\s*/?>', '<meta property="og:title" content="Đua Ghe Ngo — Sông Maspéro" />')
[IO.File]::WriteAllText((Join-Path $taskDeploy 'index.html'), $taskRootHtml + "`n", [Text.UTF8Encoding]::new($false))
if ($PrepareOnly) { Write-Output ('Prepared canonical root and assets: ' + $taskDeploy); return }

# Keep the currently published legacy bundles and 3D assets. Only update the
# canonical entry and the current illustration folder; do not publish dist
# built from unrelated work in progress.
$taskPreviousIndex = $env:GIT_INDEX_FILE
$env:GIT_INDEX_FILE = Join-Path $taskDeploy ('pages-' + [guid]::NewGuid().ToString('N') + '.index')
try {
    $taskGitDir = Join-Path $taskRepo '.git'
    & git -C $taskRepo read-tree $taskParent
    if ($LASTEXITCODE -ne 0) { throw 'Cannot initialize Pages index' }
    & git --git-dir=$taskGitDir --work-tree=$taskDeploy add --force -- index.html assets/illustrated-v22
    if ($LASTEXITCODE -ne 0) { throw 'Cannot stage canonical preview' }
    $taskChanges = @(& git -C $taskRepo diff --cached --name-only $taskParent)
    if ($LASTEXITCODE -ne 0 -or !$taskChanges.Count) { throw 'Missing Pages changes' }
    foreach ($taskPath in $taskChanges) {
        if ($taskPath -ne 'index.html' -and !$taskPath.StartsWith('assets/illustrated-v22/')) { throw ('Unexpected deployment path: ' + $taskPath) }
    }
    $taskTree = (& git -C $taskRepo write-tree).Trim()
    if ($LASTEXITCODE -ne 0) { throw 'Cannot write Pages tree' }
    $taskMain = (& git -C $taskRepo rev-parse HEAD).Trim()
    $taskCommit = (& git -C $taskRepo commit-tree $taskTree -p $taskParent -m ('Publish illustrated race preview from ' + $taskMain)).Trim()
    if ($LASTEXITCODE -ne 0) { throw 'Cannot create Pages commit' }
    & git -C $taskRepo -c credential.username=machxanht push origin ($taskCommit + ':refs/heads/gh-pages')
    if ($LASTEXITCODE -ne 0) { throw 'Cannot push Pages preview' }
    [IO.File]::WriteAllText((Join-Path $taskDeploy 'pages-commit.txt'), $taskCommit)
    Write-Output ('Pages commit: ' + $taskCommit)
    Write-Output ('Paths published: ' + $taskChanges.Count)
} finally {
    $env:GIT_INDEX_FILE = $taskPreviousIndex
}
