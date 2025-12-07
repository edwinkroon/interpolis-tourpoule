// Utility functions for validation and sanitization

/**
 * Sanitize string input to prevent XSS
 * @param {string} str - String to sanitize
 * @returns {string} - Sanitized string
 */
function sanitizeInput(str) {
  if (typeof str !== 'string') {
    return '';
  }
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

/**
 * Validate email format
 * @param {string} email - Email to validate
 * @returns {boolean} - True if valid
 */
function isValidEmail(email) {
  if (!email || typeof email !== 'string') {
    return false;
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim());
}

/**
 * Validate team name (non-empty, reasonable length)
 * @param {string} teamName - Team name to validate
 * @returns {boolean} - True if valid
 */
function isValidTeamName(teamName) {
  if (!teamName || typeof teamName !== 'string') {
    return false;
  }
  const trimmed = teamName.trim();
  return trimmed.length > 0 && trimmed.length <= 100;
}

/**
 * Show error message in a user-friendly way
 * @param {HTMLElement} element - Element to show error in
 * @param {string} message - Error message
 */
function showError(element, message) {
  if (!element) return;
  element.textContent = message;
  element.style.display = 'block';
  element.setAttribute('role', 'alert');
  element.setAttribute('aria-live', 'polite');
}

/**
 * Hide error message
 * @param {HTMLElement} element - Element to hide error in
 */
function hideError(element) {
  if (!element) return;
  element.textContent = '';
  element.style.display = 'none';
  element.removeAttribute('role');
  element.removeAttribute('aria-live');
}

/**
 * Show loading state on button
 * @param {HTMLElement} button - Button element
 * @param {string} loadingText - Text to show while loading
 */
function setLoadingState(button, loadingText = 'Bezig...') {
  if (!button) return;
  button.disabled = true;
  button.setAttribute('aria-busy', 'true');
  const originalText = button.textContent || button.querySelector('span')?.textContent || '';
  button.dataset.originalText = originalText;
  const span = button.querySelector('span');
  if (span) {
    span.textContent = loadingText;
  } else {
    button.textContent = loadingText;
  }
}

/**
 * Remove loading state from button
 * @param {HTMLElement} button - Button element
 */
function removeLoadingState(button) {
  if (!button) return;
  button.disabled = false;
  button.removeAttribute('aria-busy');
  const originalText = button.dataset.originalText || '';
  const span = button.querySelector('span');
  if (span) {
    span.textContent = originalText;
  } else {
    button.textContent = originalText;
  }
  delete button.dataset.originalText;
}

/**
 * Show success message
 * @param {HTMLElement} container - Container to show message in
 * @param {string} message - Success message
 */
function showSuccessMessage(container, message) {
  if (!container) return;
  const successDiv = document.createElement('div');
  successDiv.className = 'success-message';
  successDiv.textContent = message;
  successDiv.setAttribute('role', 'status');
  successDiv.setAttribute('aria-live', 'polite');
  container.insertBefore(successDiv, container.firstChild);
  
  // Remove after 3 seconds
  setTimeout(() => {
    successDiv.remove();
  }, 3000);
}

