// Load shared Auth0 utilities and utils

document.addEventListener('DOMContentLoaded', async function() {
  const prevButton = document.getElementById('prev-button');
  const nextButton = document.getElementById('next-button');
  const teamForm = document.getElementById('team-form');
  const teamnameInput = document.getElementById('teamname');
  const emailInput = document.getElementById('email');
  const teamnameError = document.getElementById('teamname-error');
  const emailError = document.getElementById('email-error');

  // Initialize Auth0
  await initAuth();
  
  // Try to get user ID and store in sessionStorage if not already there
  if (!sessionStorage.getItem('auth0_user_id')) {
    const userId = await getUserId();
    if (userId) {
      sessionStorage.setItem('auth0_user_id', userId);
    }
  }

  // Handle previous button click
  prevButton.addEventListener('click', function(e) {
    e.preventDefault();
    window.location.href = 'index.html';
  });

  function validateForm() {
    let isValid = true;
    
    // Reset errors
    hideError(teamnameError);
    hideError(emailError);
    teamnameInput.classList.remove('error');
    emailInput.classList.remove('error');

    // Validate teamname
    const teamNameValue = teamnameInput.value.trim();
    if (!isValidTeamName(teamNameValue)) {
      showError(teamnameError, 'Vul een teamnaam in om door te gaan');
      teamnameInput.classList.add('error');
      teamnameInput.setAttribute('aria-invalid', 'true');
      isValid = false;
    } else {
      teamnameInput.setAttribute('aria-invalid', 'false');
    }

    // Validate email (if provided)
    const emailValue = emailInput.value.trim();
    if (emailValue && !isValidEmail(emailValue)) {
      showError(emailError, 'Vul een geldig emailadres in');
      emailInput.classList.add('error');
      emailInput.setAttribute('aria-invalid', 'true');
      isValid = false;
    } else {
      emailInput.setAttribute('aria-invalid', 'false');
    }

    return isValid;
  }

  // Handle form submit
  teamForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      // Focus first error field
      const firstError = teamForm.querySelector('.error');
      if (firstError) {
        firstError.focus();
      }
      return;
    }

    // Set loading state
    setLoadingState(nextButton, 'Opslaan...');

    // Get user ID
    const userId = await getUserId();

    // Sanitize inputs
    const data = {
      userId: userId,
      teamName: sanitizeInput(teamnameInput.value.trim()),
      email: emailInput.value.trim() ? sanitizeInput(emailInput.value.trim()) : '',
      avatarUrl: document.getElementById('avatar').value || null, // Use null instead of empty string
      newsletter: document.getElementById('newsletter').checked
    };

    try {
      const res = await fetch('/.netlify/functions/save-participant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      const result = await res.json();

      if (res.ok && result.ok) {
        // Show success message
        showSuccessMessage(teamForm, 'Gegevens opgeslagen!');
        
        // Redirect after short delay
        setTimeout(() => {
          window.location.href = 'welcome3.html';
        }, 500);
      } else {
        removeLoadingState(nextButton);
        const errorMsg = result.error || 'Er is een fout opgetreden bij het opslaan. Probeer het opnieuw.';
        showError(teamnameError, errorMsg);
        teamnameInput.classList.add('error');
        teamnameInput.focus();
      }
    } catch (error) {
      removeLoadingState(nextButton);
      showError(teamnameError, 'Er is een fout opgetreden bij het opslaan. Controleer je internetverbinding en probeer het opnieuw.');
      teamnameInput.classList.add('error');
      teamnameInput.focus();
    }
  });

  // Clear errors when user starts typing
  teamnameInput.addEventListener('input', function() {
    if (this.value.trim()) {
      this.classList.remove('error');
      hideError(teamnameError);
      this.setAttribute('aria-invalid', 'false');
    }
  });

  emailInput.addEventListener('input', function() {
    if (this.value.trim()) {
      this.classList.remove('error');
      hideError(emailError);
      this.setAttribute('aria-invalid', 'false');
    }
  });

  // Keyboard navigation support
  teamnameInput.addEventListener('keydown', function(e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      emailInput.focus();
    }
  });

  emailInput.addEventListener('keydown', function(e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      teamForm.dispatchEvent(new Event('submit'));
    }
  });

  // Avatar upload functionality
  const avatarPlaceholder = document.getElementById('avatar-placeholder');
  const avatarInput = document.getElementById('avatar-input');
  const avatarPreview = document.getElementById('avatar-preview');
  const avatarIcon = document.getElementById('avatar-icon');
  const avatarLink = document.getElementById('avatar-link');

  // Open file picker when clicking on avatar section
  avatarPlaceholder.addEventListener('click', function() {
    avatarInput.click();
  });

  avatarLink.addEventListener('click', function(e) {
    e.preventDefault();
    avatarInput.click();
  });

  // Handle file selection
  avatarInput.addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (file) {
      // Check file type
      if (!file.type.startsWith('image/')) {
        alert('Selecteer een geldige afbeelding');
        return;
      }

      // Check file size (max 5MB)
      const maxSize = 5 * 1024 * 1024; // 5MB
      if (file.size > maxSize) {
        alert('Afbeelding is te groot. Maximum grootte is 5MB.');
        return;
      }

      // Create FileReader to preview image
      const reader = new FileReader();
      reader.onload = function(event) {
        const dataUrl = event.target.result;
        avatarPreview.src = dataUrl;
        avatarPreview.style.display = 'block';
        avatarIcon.style.display = 'none';
        avatarLink.textContent = 'Avatar aanpassen';
        // Store avatar data URL in hidden input
        document.getElementById('avatar').value = dataUrl;
      };
      reader.readAsDataURL(file);
    }
  });
});
