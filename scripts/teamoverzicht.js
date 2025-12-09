// Team Overview Page Script

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', async function() {
  // Check if user is authenticated and exists in database
  try {
    const isAuthorized = await requireParticipant();
    if (!isAuthorized) {
      return; // Redirect will happen in requireParticipant
    }
  } catch (error) {
    console.error('Auth check failed:', error);
    console.log('Continuing with fallback data due to auth error');
  }

  // Load team data
  await loadTeamData();
  
  // Load team riders
  await loadTeamRiders();
});

async function loadTeamData() {
  const userId = await getUserId();
  
  if (!userId) {
    return;
  }

  try {
    const response = await fetch(`/.netlify/functions/get-user?userId=${encodeURIComponent(userId)}`);
    const result = await response.json();
    
    if (result.ok && result.exists && result.participant) {
      const participant = result.participant;
      
      // Update team name
      const teamNameElement = document.getElementById('team-name');
      if (teamNameElement && participant.team_name) {
        teamNameElement.textContent = sanitizeInput(participant.team_name);
      }
      
      // Update member name (we need to get this from Auth0 or another source)
      // For now, we'll extract from email or use a placeholder
      const memberNameElement = document.getElementById('team-member-name');
      if (memberNameElement) {
        // Try to get name from email or use placeholder
        if (participant.email) {
          const emailParts = participant.email.split('@')[0];
          const nameParts = emailParts.split('.');
          const formattedName = nameParts.map(part => 
            part.charAt(0).toUpperCase() + part.slice(1)
          ).join(' ');
          memberNameElement.textContent = sanitizeInput(formattedName);
        } else {
          memberNameElement.textContent = 'Gebruiker';
        }
      }
      
      // Update email
      const emailElement = document.getElementById('team-email');
      if (emailElement && participant.email) {
        emailElement.textContent = sanitizeInput(participant.email);
      }
      
      // Update newsletter notification
      const notificationElement = document.getElementById('team-notification');
      if (notificationElement) {
        notificationElement.textContent = participant.newsletter ? 'Aan' : 'Uit';
      }
      
      // Update avatar
      const avatarImg = document.getElementById('team-avatar');
      const avatarPlaceholder = document.getElementById('team-avatar-placeholder');
      
      if (participant.avatar_url && participant.avatar_url.trim()) {
        if (avatarImg) {
          avatarImg.src = participant.avatar_url;
          avatarImg.style.display = 'block';
          if (avatarPlaceholder) {
            avatarPlaceholder.style.display = 'none';
          }
          
          // Handle image load errors
          avatarImg.onerror = function() {
            avatarImg.style.display = 'none';
            if (avatarPlaceholder) {
              const initials = participant.team_name 
                ? participant.team_name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
                : 'U';
              avatarPlaceholder.textContent = initials;
              avatarPlaceholder.style.display = 'block';
            }
          };
        }
      } else {
        if (avatarImg) {
          avatarImg.style.display = 'none';
        }
        if (avatarPlaceholder) {
          const initials = participant.team_name 
            ? participant.team_name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
            : 'U';
          avatarPlaceholder.textContent = initials;
          avatarPlaceholder.style.display = 'block';
        }
      }
    }
  } catch (error) {
    console.error('Error loading team data:', error);
  }
}

async function loadTeamRiders() {
  const userId = await getUserId();
  
  if (!userId) {
    return;
  }

  try {
    const response = await fetch(`/.netlify/functions/get-team-riders?userId=${encodeURIComponent(userId)}`);
    const result = await response.json();
    
    const ridersContainer = document.getElementById('riders-list-container');
    const noRidersMessage = document.getElementById('no-riders-message');
    
    if (!ridersContainer) return;
    
    if (result.ok && result.riders && result.riders.length > 0) {
      // Hide no riders message
      if (noRidersMessage) {
        noRidersMessage.style.display = 'none';
      }
      
      // Clear container
      ridersContainer.innerHTML = '';
      
      // Render riders
      result.riders.forEach(rider => {
        const riderItem = document.createElement('div');
        riderItem.className = 'team-rider-item';
        
        // Get initials for placeholder
        const initials = rider.first_name && rider.last_name
          ? `${rider.first_name[0]}${rider.last_name[0]}`.toUpperCase()
          : rider.last_name ? rider.last_name.substring(0, 2).toUpperCase() : 'R';
        
        riderItem.innerHTML = `
          <div class="rider-avatar">
            <img src="${rider.photo_url || ''}" alt="${sanitizeInput(rider.first_name || '')} ${sanitizeInput(rider.last_name || '')}" class="rider-photo" onerror="this.style.display='none'; this.nextElementSibling.style.display='block';">
            <div class="rider-avatar-placeholder" style="display: none;">${sanitizeInput(initials)}</div>
          </div>
          <div class="rider-info">
            <div class="rider-name">${sanitizeInput(rider.first_name || '')} ${sanitizeInput(rider.last_name || '')}</div>
            <div class="rider-team">${sanitizeInput(rider.team_name || '')}</div>
          </div>
        `;
        
        ridersContainer.appendChild(riderItem);
      });
    } else {
      // Show no riders message
      if (noRidersMessage) {
        noRidersMessage.style.display = 'block';
      }
      ridersContainer.innerHTML = '';
    }
  } catch (error) {
    console.error('Error loading team riders:', error);
    // Show no riders message on error
    const noRidersMessage = document.getElementById('no-riders-message');
    if (noRidersMessage) {
      noRidersMessage.style.display = 'block';
    }
  }
}

