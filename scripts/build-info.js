// Load and display build info
async function loadBuildInfo() {
  try {
    const response = await fetch('/.netlify/functions/get-build-info');
    if (response.ok) {
      const buildInfo = await response.json();
      const buildInfoElement = document.getElementById('build-info');
      if (buildInfoElement) {
        // Only show build info on production (not local)
        if (buildInfo.context === 'production' || (buildInfo.deployId !== 'local' && buildInfo.commitRef !== 'unknown')) {
          // Format deployment time
          const deployDate = new Date(buildInfo.deployTime);
          const now = new Date();
          const diffMs = now - deployDate;
          const diffMins = Math.floor(diffMs / 60000);
          const diffHours = Math.floor(diffMs / 3600000);
          const diffDays = Math.floor(diffMs / 86400000);
          
          let timeText;
          if (diffMins < 1) {
            timeText = 'zojuist';
          } else if (diffMins < 60) {
            timeText = `${diffMins}m geleden`;
          } else if (diffHours < 24) {
            timeText = `${diffHours}u geleden`;
          } else if (diffDays < 7) {
            timeText = `${diffDays}d geleden`;
          } else {
            // Show date if older than a week
            timeText = deployDate.toLocaleDateString('nl-NL', { day: '2-digit', month: '2-digit' });
          }
          
          buildInfoElement.textContent = timeText;
          buildInfoElement.title = `Deployment tijd: ${deployDate.toLocaleString('nl-NL', { 
            day: '2-digit', 
            month: '2-digit', 
            year: 'numeric',
            hour: '2-digit', 
            minute: '2-digit' 
          })}\nCommit: ${buildInfo.commitRef}\nDeploy ID: ${buildInfo.deployId}`;
        } else {
          // Hide build info on local development
          buildInfoElement.style.display = 'none';
        }
      }
    }
  } catch (error) {
    // Silently fail - don't show build info if it can't be loaded
    console.debug('Could not load build info:', error);
    const buildInfoElement = document.getElementById('build-info');
    if (buildInfoElement) {
      buildInfoElement.style.display = 'none';
    }
  }
}

// Load build info when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', loadBuildInfo);
} else {
  loadBuildInfo();
}

