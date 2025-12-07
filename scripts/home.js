// Load shared Auth0 utilities and utils

async function loadUserData() {
  const userId = await getUserId();
  
  if (!userId) {
    return;
  }

  try {
    const response = await fetch(`/.netlify/functions/get-user?userId=${encodeURIComponent(userId)}`);
    const result = await response.json();
    
    if (result.ok && result.exists && result.participant) {
      const participant = result.participant;
      const welcomeHeading = document.getElementById('welcome-heading');
      const avatarContainer = document.getElementById('header-avatar-container');
      const avatarImg = document.getElementById('header-avatar');
      
      // Update welcome heading with team name (without "Welkom" prefix)
      if (participant.team_name && welcomeHeading) {
        welcomeHeading.textContent = sanitizeInput(participant.team_name);
      }
      
      // Show avatar if available
      if (participant.avatar_url && participant.avatar_url.trim() && avatarContainer && avatarImg) {
        avatarImg.src = participant.avatar_url;
        avatarImg.alt = `Avatar van ${sanitizeInput(participant.team_name || 'gebruiker')}`;
        avatarContainer.style.display = 'block';
        
        // Handle image load errors
        avatarImg.onerror = function() {
          avatarContainer.style.display = 'none';
        };
      } else {
        avatarContainer.style.display = 'none';
      }
    }
  } catch (error) {
    // Silent fail on data load error
  }
}

document.addEventListener('DOMContentLoaded', async function() {
  const logoutButton = document.getElementById('logout-button');

  // Initialize Auth0
  await initAuth();
  
  // Load user data from database
  await loadUserData();

  // Handle logout button click
  logoutButton.addEventListener('click', function(e) {
    e.preventDefault();
    logout();
  });
});
