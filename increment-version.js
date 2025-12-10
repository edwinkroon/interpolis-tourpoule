// Script to increment version number and update commit message
// This is used as an alternative to git hooks (which might not work on Windows)

const fs = require('fs');
const { execSync } = require('child_process');

// Read current version
const versionFile = 'VERSION.txt';
let currentVersion = 1;

if (fs.existsSync(versionFile)) {
  const content = fs.readFileSync(versionFile, 'utf8').trim();
  currentVersion = parseInt(content, 10) || 1;
}

// Increment version
const nextVersion = currentVersion + 1;

// Update version file
fs.writeFileSync(versionFile, nextVersion.toString() + '\n');
console.log(`Version incremented to v${nextVersion}`);

// Stage the version file
try {
  execSync('git add VERSION.txt', { stdio: 'inherit' });
  
  // Get the last commit message
  const lastCommitMsg = execSync('git log -1 --pretty=%B', { encoding: 'utf8' }).trim();
  
  // Check if version is already in commit message
  let newCommitMsg;
  if (lastCommitMsg.includes(`[v${currentVersion}]`)) {
    // Version already in message, replace it
    newCommitMsg = lastCommitMsg.replace(`[v${currentVersion}]`, `[v${nextVersion}]`);
  } else {
    // Add version to commit message
    newCommitMsg = `${lastCommitMsg} [v${nextVersion}]`;
  }
  
  // Amend the last commit with new message and version file
  execSync(`git commit --amend -m "${newCommitMsg.replace(/"/g, '\\"')}" --no-edit`, { stdio: 'inherit' });
  
  console.log(`Commit message updated with version v${nextVersion}`);
} catch (error) {
  console.error('Error updating commit:', error.message);
  console.log('Version file updated manually. Please commit it manually.');
}

