// Determine redirect URI based on environment
const getRedirectUri = () => {
  // Check if we're on localhost or production
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    return `${window.location.origin}/auth-callback.html`;
  }
  // Production URL
  return 'https://interpolistourpoule.netlify.app/auth-callback.html';
};

window.AUTH0_CONFIG = {
    domain: 'dev-g1uy3ps8fzt6ic37.us.auth0.com',
    clientId: '4WLxdHDBodGyZB7Tbi3WRqECFqlbYeTO',
    redirectUri: getRedirectUri()
  };
  