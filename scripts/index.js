// Load shared Auth0 utilities
document.addEventListener('DOMContentLoaded', async function() {
  const nextButton = document.getElementById('next-button');

  // Initialize Auth0
  await initAuth();

  // Check if user is already a participant and redirect to home if so
  const userId = await getUserId();
  if (userId) {
    const exists = await checkParticipantExists(userId);
    if (exists) {
      window.location.href = 'home.html';
      return;
    }
  }

  // Handle next button click
  nextButton.addEventListener('click', function(e) {
    e.preventDefault();
    window.location.href = 'welcome2.html';
  });

  // Add click handler for spelregels button
  const spelregelsButtons = document.querySelectorAll('.action-button');
  spelregelsButtons.forEach(button => {
    const buttonText = button.querySelector('span');
    if (buttonText && buttonText.textContent.trim() === 'Spelregels') {
      button.addEventListener('click', function() {
        window.location.href = 'rules.html';
      });
    }
  });
});

