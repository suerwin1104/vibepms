# Backup Script for Windows (PowerShell)
# Set encoding to UTF8 to prevent issues
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8
chcp 65001 | Out-Null

$projectName = "vibepms"
$backupDir = "backups"
$timestamp = Get-Date -Format "yyyyMMdd_HHmm"
$backupFile = "${projectName}_backup_${timestamp}.zip"

# Create backup directory if it doesn't exist
if (!(Test-Path $backupDir)) {
    New-Item -ItemType Directory -Path $backupDir | Out-Null
    Write-Host "Creating backup directory: $backupDir" -ForegroundColor Cyan
}

Write-Host "Starting project backup..." -ForegroundColor Yellow

# Define folders to exclude
$excludeList = @('node_modules', '.git', 'dist', 'build', 'backups', '.next', 'tmp')

# Get all items excluding those in the exclude list
$itemsToCompress = Get-ChildItem -Path "." | Where-Object { $excludeList -notcontains $_.Name }

if ($itemsToCompress) {
    # Perform compression
    Compress-Archive -Path $itemsToCompress.FullName -DestinationPath "$backupDir\$backupFile" -Force
    
    $fullPath = Resolve-Path "$backupDir\$backupFile"
    Write-Host "`nBackup Successful!" -ForegroundColor Green
    Write-Host "Backup file saved at: $fullPath" -ForegroundColor White
}
else {
    Write-Host "No files found to backup." -ForegroundColor Red
}
