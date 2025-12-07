document.addEventListener('DOMContentLoaded', function() {
  const loginButton = document.getElementById('logout-button');

  // Handle login button click - redirect to login page
  loginButton.addEventListener('click', function(e) {
    e.preventDefault();
    window.location.href = 'login.html';
  });
});

