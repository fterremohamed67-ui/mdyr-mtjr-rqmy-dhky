$ErrorActionPreference = 'Stop'

$projectRoot = $PSScriptRoot
$runScript = Join-Path $projectRoot 'run-hidden.vbs'
$iconPath = Join-Path $projectRoot 'app-icon.ico'
$desktopPath = [Environment]::GetFolderPath('Desktop')
$shortcutPath = Join-Path $desktopPath 'متجر روبي الذكي.lnk'

foreach ($path in @($runScript, $iconPath)) {
    if (-not (Test-Path -LiteralPath $path -PathType Leaf)) {
        throw "Required shortcut file not found: $path"
    }
}
if (-not (Test-Path -LiteralPath $desktopPath -PathType Container)) {
    throw "Desktop folder not found: $desktopPath"
}

$shell = New-Object -ComObject WScript.Shell
$shortcut = $shell.CreateShortcut($shortcutPath)
$shortcut.TargetPath = $runScript
$shortcut.WorkingDirectory = $projectRoot
$shortcut.IconLocation = "$iconPath,0"
$shortcut.Description = 'تشغيل متجر روبي الذكي'
$shortcut.Save()

$createdShortcut = $shell.CreateShortcut($shortcutPath)
if ($createdShortcut.TargetPath -ne $runScript -or $createdShortcut.IconLocation -ne "$iconPath,0") {
    throw "Shortcut verification failed: $shortcutPath"
}

Write-Output "Created desktop shortcut: $shortcutPath"
Write-Output "Target: $($createdShortcut.TargetPath)"
Write-Output "Icon: $($createdShortcut.IconLocation)"
