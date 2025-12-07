// Load shared Auth0 utilities

document.addEventListener('DOMContentLoaded', function() {
  const prevButton = document.getElementById('prev-button');
  const nextButton = document.getElementById('next-button');
  const logoutButton = document.getElementById('logout-button');

  // Initialize Auth0
  initAuth();

  // Handle previous button click
  prevButton.addEventListener('click', function(e) {
    e.preventDefault();
    window.location.href = 'welcome2.html';
  });

  // Handle next button click
  nextButton.addEventListener('click', function(e) {
    e.preventDefault();
    window.location.href = 'home.html';
  });

  // Handle logout button click
  logoutButton.addEventListener('click', function(e) {
    e.preventDefault();
    logout();
  });
});
