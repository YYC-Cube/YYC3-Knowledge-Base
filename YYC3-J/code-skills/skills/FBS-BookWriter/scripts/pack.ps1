# FBS-BookWriter 打包脚本
# 用法：powershell -ExecutionPolicy Bypass -File scripts\pack.ps1 [-Version 1.59C]

param(
    [string]$Version = ''
)

$src = Split-Path -Parent $PSScriptRoot
$deliverDir = 'D:\SKILL2026'
$exclude = @('_deliverables', 'node_modules')
$tmp = "$env:TEMP\FBS-BW-pack-tmp"

# 自动读取版本号
if (-not $Version) {
    $pkgJson = Get-Content "$src\package.json" -Raw | ConvertFrom-Json
    $Version = $pkgJson.version
}

$dst = "$deliverDir\FBS-BookWriter-v$Version.zip"

Write-Host "打包版本：$Version"
Write-Host "目标路径：$dst"

if (Test-Path $tmp) { Remove-Item $tmp -Recurse -Force }
New-Item -ItemType Directory -Path $tmp | Out-Null

foreach ($item in Get-ChildItem -Path $src) {
    if ($item.Name -notin $exclude) {
        Copy-Item $item.FullName -Destination $tmp -Recurse
    }
}

$fc = (Get-ChildItem $tmp -Recurse -File).Count
Write-Host "打包文件数：$fc"

if (Test-Path $dst) { Remove-Item $dst -Force }

Add-Type -Assembly 'System.IO.Compression.FileSystem'
[System.IO.Compression.ZipFile]::CreateFromDirectory($tmp, $dst, 'Optimal', $false)

$zip = [System.IO.Compression.ZipFile]::OpenRead($dst)
$count = $zip.Entries.Count
$zip.Dispose()

Remove-Item $tmp -Recurse -Force

$size = [math]::Round((Get-Item $dst).Length / 1KB, 1)
Write-Host "完成：$count 个文件，${size}KB -> $dst"
