(async () => {
  try {
    console.log('Auth callback started');
    // Wacht even om er zeker van te zijn dat scripts geladen zijn
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Wacht tot auth0 beschikbaar is (max 5 seconden)
    let attempts = 0;
    while (typeof auth0 === 'undefined' && attempts < 50) {
      await new Promise(resolve => setTimeout(resolve, 100));
      attempts++;
    }
    
    if (typeof auth0 === 'undefined') {
      console.error('Auth0 SDK niet geladen');
      document.body.innerHTML = '<p>Fout: Auth0 SDK niet geladen. Ververs de pagina.</p>';
      return;
    }

    console.log('Creating Auth0 client...');
    const auth0Client = await auth0.createAuth0Client({
      domain: AUTH0_CONFIG.domain,
      clientId: AUTH0_CONFIG.clientId,
      authorizationParams: {
        redirect_uri: AUTH0_CONFIG.redirectUri
      }
    });

    console.log('Handling redirect callback...');
    // Verwerk het antwoord van Auth0
    await auth0Client.handleRedirectCallback();
    console.log('Getting user...');
    const user = await auth0Client.getUser();
    console.log('User:', user);

    if (!user || !user.sub) {
      console.error('No user or user.sub found:', user);
      window.location.href = 'index.html';
      return;
    }

    // Sla user ID op in sessionStorage voor later gebruik
    sessionStorage.setItem('auth0_user_id', user.sub);
    console.log('User ID saved:', user.sub);

    // Check of gebruiker al bestaat in database
    try {
      console.log('Checking if user exists in database...');
      const response = await fetch(`/.netlify/functions/get-user?userId=${encodeURIComponent(user.sub)}`);
      const result = await response.json();
      console.log('Database check result:', result);
      
      // Log error details for debugging
      if (!result.ok) {
        console.error('Error checking user:', result.error, result.details);
      }
      
      if (result.ok && result.exists) {
        // Gebruiker bestaat al, redirect naar home
        console.log('User exists, redirecting to home.html');
        window.location.href = 'home.html';
      } else {
        // Gebruiker bestaat nog niet, redirect naar index (welcome flow)
        console.log('User does not exist, redirecting to index.html');
        window.location.href = 'index.html';
      }
    } catch (error) {
      // Bij error, log en redirect naar index
      console.error('Error fetching user data:', error);
      window.location.href = 'index.html';
    }
  } catch (error) {
    console.error('Auth callback error:', error);
    document.body.innerHTML = `<p>Fout bij inloggen: ${error.message || error}. <a href="login.html">Probeer opnieuw</a></p>`;
  }
})();

