(async () => {
  try {
    // Wacht even om er zeker van te zijn dat scripts geladen zijn
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Wacht tot auth0 beschikbaar is (max 5 seconden)
    let attempts = 0;
    while (typeof auth0 === 'undefined' && attempts < 50) {
      await new Promise(resolve => setTimeout(resolve, 100));
      attempts++;
    }
    
    if (typeof auth0 === 'undefined') {
      document.body.innerHTML = '<p>Fout: Auth0 SDK niet geladen. Ververs de pagina.</p>';
      return;
    }

    const auth0Client = await auth0.createAuth0Client({
      domain: AUTH0_CONFIG.domain,
      clientId: AUTH0_CONFIG.clientId,
      authorizationParams: {
        redirect_uri: AUTH0_CONFIG.redirectUri
      }
    });

    // Verwerk het antwoord van Auth0
    await auth0Client.handleRedirectCallback();
    const user = await auth0Client.getUser();

    if (!user || !user.sub) {
      window.location.href = 'index.html';
      return;
    }

    // Sla user ID op in sessionStorage voor later gebruik
    sessionStorage.setItem('auth0_user_id', user.sub);

    // Check of gebruiker al bestaat in database
    try {
      const response = await fetch(`/.netlify/functions/get-user?userId=${encodeURIComponent(user.sub)}`);
      const result = await response.json();
      
      // Log error details for debugging
      if (!result.ok) {
        console.error('Error checking user:', result.error, result.details);
      }
      
      if (result.ok && result.exists) {
        // Gebruiker bestaat al, redirect naar home
        window.location.href = 'home.html';
      } else {
        // Gebruiker bestaat nog niet, redirect naar login
        window.location.href = 'login.html';
      }
    } catch (error) {
      // Bij error, log en redirect naar login
      console.error('Error fetching user data:', error);
      window.location.href = 'login.html';
    }
  } catch (error) {
    document.body.innerHTML = `<p>Fout bij inloggen: ${error.message || error}. <a href="login.html">Probeer opnieuw</a></p>`;
  }
})();

