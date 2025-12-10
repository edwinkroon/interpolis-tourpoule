// Load and display version number
async function loadVersion() {
  try {
    const response = await fetch('/VERSION.txt');
    if (response.ok) {
      const version = await response.text();
      const versionElement = document.getElementById('version-number');
      if (versionElement) {
        versionElement.textContent = `v${version.trim()}`;
      }
    }
  } catch (error) {
    console.error('Error loading version:', error);
  }
}

// Load version when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', loadVersion);
} else {
  loadVersion();
}

