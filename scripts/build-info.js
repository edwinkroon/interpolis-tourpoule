// Load and display build info
async function loadBuildInfo() {
  try {
    const response = await fetch('/.netlify/functions/get-build-info');
    if (response.ok) {
      const buildInfo = await response.json();
      const buildInfoElement = document.getElementById('build-info');
      if (buildInfoElement) {
        // Show short commit hash or deploy ID
        const displayText = buildInfo.shortId || buildInfo.deployId.substring(0, 7);
        buildInfoElement.textContent = displayText;
        buildInfoElement.title = `Deploy: ${buildInfo.deployId}\nCommit: ${buildInfo.commitRef}\nTime: ${new Date(buildInfo.deployTime).toLocaleString('nl-NL')}`;
      }
    }
  } catch (error) {
    // Silently fail - don't show build info if it can't be loaded
    console.debug('Could not load build info:', error);
  }
}

// Load build info when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', loadBuildInfo);
} else {
  loadBuildInfo();
}

