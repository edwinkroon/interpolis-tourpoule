let auth0Client;
let auth0Initialized = false;

async function initAuth() {
  if (typeof auth0 === 'undefined') {
    return;
  }

  try {
    auth0Client = await auth0.createAuth0Client({
      domain: AUTH0_CONFIG.domain,
      clientId: AUTH0_CONFIG.clientId,
      authorizationParams: {
        redirect_uri: AUTH0_CONFIG.redirectUri
      }
    });
    auth0Initialized = true;
  } catch (error) {
    console.error('Fout bij initialiseren van Auth0:', error);
  }
}

async function logout() {
  // Wis sessionStorage
  sessionStorage.removeItem('auth0_user_id');
  
  if (!auth0Client) {
    console.error('Auth0 client niet geïnitialiseerd');
    return;
  }

  try {
    await auth0Client.logout({
      logoutParams: {
        returnTo: window.location.origin + '/logout.html',
        federated: true
      }
    });
  } catch (error) {
    console.error('Fout bij uitloggen:', error);
  }
}

document.addEventListener('DOMContentLoaded', async function() {
  const prevButton = document.getElementById('prev-button');
  const nextButton = document.getElementById('next-button');
  const logoutButton = document.getElementById('logout-button');
  const teamnameInput = document.getElementById('teamname');
  const emailInput = document.getElementById('email');
  const teamnameError = document.getElementById('teamname-error');
  const emailError = document.getElementById('email-error');

  // Initialize Auth0 - wacht tot het klaar is
  await initAuth();
  
  // Probeer user ID op te halen en op te slaan in sessionStorage als het er nog niet is
  if (!sessionStorage.getItem('auth0_user_id') && auth0Client && auth0Initialized) {
    try {
      const isAuthenticated = await auth0Client.isAuthenticated();
      if (isAuthenticated) {
        const user = await auth0Client.getUser();
        if (user && user.sub) {
          sessionStorage.setItem('auth0_user_id', user.sub);
        }
      }
    } catch (error) {
      // Silent fail - user ID niet kritiek bij pagina load
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
    teamnameError.textContent = '';
    emailError.textContent = '';
    teamnameInput.classList.remove('error');
    emailInput.classList.remove('error');

    // Validate teamname
    if (!teamnameInput.value.trim()) {
      teamnameError.textContent = 'Vul een teamnaam in om door te gaan';
      teamnameInput.classList.add('error');
      isValid = false;
    }

    // Validate email
    if (!emailInput.value.trim()) {
      emailError.textContent = 'Vul een emailadres in om door te gaan';
      emailInput.classList.add('error');
      isValid = false;
    }

    return isValid;
  }

  // Handle form submit
  const teamForm = document.getElementById('team-form');
  teamForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    // Get user ID from sessionStorage (opgeslagen bij login) of Auth0 (fallback)
    let userId = sessionStorage.getItem('auth0_user_id');
    
    // Fallback: probeer via Auth0 als niet in sessionStorage
    if (!userId && auth0Client && auth0Initialized) {
      try {
        const isAuthenticated = await auth0Client.isAuthenticated();
        if (isAuthenticated) {
          const user = await auth0Client.getUser();
          if (user && user.sub) {
            userId = user.sub;
            sessionStorage.setItem('auth0_user_id', user.sub);
          }
        }
      } catch (error) {
        console.error('Fout bij ophalen van user:', error);
      }
    }

    const data = {
      userId: userId,
      teamName: e.target.teamName.value,
      email: e.target.email.value,
      avatarUrl: e.target.avatar.value,
      newsletter: e.target.newsletter.checked
    };

    try {
      const res = await fetch('/.netlify/functions/save-participant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      const result = await res.json();

      if (res.ok && result.ok) {
        window.location.href = 'welcome3.html';
      } else {
        alert('Er is een fout opgetreden bij het opslaan. Probeer het opnieuw.');
      }
    } catch (error) {
      console.error('Fout bij opslaan:', error);
      alert('Er is een fout opgetreden bij het opslaan. Probeer het opnieuw.');
    }
  });

  // Clear errors when user starts typing
  teamnameInput.addEventListener('input', function() {
    if (this.value.trim()) {
      this.classList.remove('error');
      teamnameError.textContent = '';
    }
  });

  emailInput.addEventListener('input', function() {
    if (this.value.trim()) {
      this.classList.remove('error');
      emailError.textContent = '';
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
      // Check if file is an image
      if (!file.type.startsWith('image/')) {
        alert('Selecteer een geldige afbeelding');
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

  // Handle logout button click
  logoutButton.addEventListener('click', function(e) {
    e.preventDefault();
    logout();
  });
});

