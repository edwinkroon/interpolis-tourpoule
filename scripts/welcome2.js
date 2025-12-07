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
    console.log('Auth0 client geïnitialiseerd in welcome2');
  } catch (error) {
    console.error('Fout bij initialiseren van Auth0:', error);
  }
}

async function logout() {
  // Wis sessionStorage
  sessionStorage.removeItem('auth0_user_id');
  console.log('User ID verwijderd uit sessionStorage');
  
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
          console.log('User ID opgehaald en opgeslagen bij pagina load:', user.sub);
        }
      }
    } catch (error) {
      console.log('Kon user ID niet ophalen bij pagina load (niet kritiek):', error);
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
    console.log('submit handler gestart');


    if (!validateForm()) {
        console.log('validateForm() faalt, geen fetch');
      return;
    }

    // Get user ID from sessionStorage (opgeslagen bij login) of Auth0 (optioneel - niet verplicht)
    let userId = null;
    
    // Probeer eerst uit sessionStorage te halen (sneller en betrouwbaarder)
    const storedUserId = sessionStorage.getItem('auth0_user_id');
    if (storedUserId) {
      userId = storedUserId;
      console.log('✅ User ID opgehaald uit sessionStorage:', userId);
    } else {
      console.log('Geen user ID in sessionStorage, proberen via Auth0...');
      
      // Probeer Auth0 client te initialiseren als het nog niet is gebeurd
      if (!auth0Initialized && typeof auth0 !== 'undefined') {
        console.log('Auth0 nog niet geïnitialiseerd, proberen te initialiseren...');
        await initAuth();
      }
      
      // Wacht even als Auth0 nog aan het initialiseren is
      if (!auth0Initialized && typeof auth0 !== 'undefined') {
        console.log('Wachten op Auth0 initialisatie...');
        for (let i = 0; i < 10; i++) {
          await new Promise(resolve => setTimeout(resolve, 100));
          if (auth0Initialized) break;
        }
      }
      
      if (auth0Client && auth0Initialized) {
        try {
          // Check eerst of de user is ingelogd
          const isAuthenticated = await auth0Client.isAuthenticated();
          console.log('Is authenticated:', isAuthenticated);
          
          if (isAuthenticated) {
            console.log('Ophalen van user via auth0Client...');
            const user = await auth0Client.getUser();
            console.log('User object:', user);
            console.log('User.sub:', user?.sub);
            
            if (user && user.sub) {
              userId = user.sub;
              // Sla ook op in sessionStorage voor volgende keer
              sessionStorage.setItem('auth0_user_id', user.sub);
              console.log('✅ User ID opgehaald via Auth0 en opgeslagen:', userId);
            } else {
              console.warn('⚠️ Geen user of user.sub gevonden');
              console.warn('User object:', JSON.stringify(user, null, 2));
            }
          } else {
            console.warn('⚠️ User is niet ingelogd (isAuthenticated = false)');
          }
        } catch (error) {
          console.error('❌ Fout bij ophalen van user:', error);
          console.error('Error details:', error.message, error.stack);
          // Doorgaan zonder userId
        }
      } else {
        console.warn('⚠️ Auth0 client niet beschikbaar');
        console.warn('auth0Client:', auth0Client);
        console.warn('auth0Initialized:', auth0Initialized);
      }
    }
    
    console.log('Final userId voor submit:', userId);

    const data = {
      userId: userId,
      teamName: e.target.teamName.value,
      email: e.target.email.value,
      avatarUrl: e.target.avatar.value,
      newsletter: e.target.newsletter.checked
    };
    
    console.log('=== FORM DATA VOOR SUBMIT ===');
    console.log('Data object:', JSON.stringify(data, null, 2));
    console.log('userId in data:', data.userId);
    console.log('userId type:', typeof data.userId);
    console.log('userId truthy?', !!data.userId);

    console.log('data die we naar Netlify sturen:', data);

    try {
      const res = await fetch('/.netlify/functions/save-participant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      const result = await res.json();
      console.log(result);

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

