# PowerShell script to increment version number and update commit message
# Run this script after git push: .\increment-version.ps1

$versionFile = "VERSION.txt"
$currentVersion = 1

# Read current version
if (Test-Path $versionFile) {
    $content = Get-Content $versionFile -Raw
    $currentVersion = [int]($content.Trim())
}

# Increment version
$nextVersion = $currentVersion + 1

# Update version file
$nextVersion.ToString() | Out-File -FilePath $versionFile -Encoding utf8 -NoNewline
Write-Host "Version incremented to v$nextVersion" -ForegroundColor Green

# Stage the version file
git add VERSION.txt

# Get the last commit message
$lastCommitMsg = git log -1 --pretty=%B

# Check if version is already in commit message
if ($lastCommitMsg -match "\[v$currentVersion\]") {
    # Version already in message, replace it
    $newCommitMsg = $lastCommitMsg -replace "\[v$currentVersion\]", "[v$nextVersion]"
} else {
    # Add version to commit message
    $newCommitMsg = "$lastCommitMsg [v$nextVersion]"
}

# Amend the last commit with new message and version file
git commit --amend -m $newCommitMsg --no-edit

Write-Host "Commit message updated with version v$nextVersion" -ForegroundColor Green
Write-Host "Don't forget to force push: git push --force-with-lease" -ForegroundColor Yellow

