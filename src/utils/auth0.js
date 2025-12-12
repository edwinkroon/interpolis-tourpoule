import { createAuth0Client } from '@auth0/auth0-spa-js';

const AUTH0_DOMAIN = 'dev-g1uy3ps8fzt6ic37.us.auth0.com';
const AUTH0_CLIENT_ID = '4WLxdHDBodGyZB7Tbi3WRqECFqlbYeTO';

function getRedirectUri() {
  // Keep compatibility with existing Auth0 callback URL
  return `${window.location.origin}/auth-callback.html`;
}

let clientPromise;

export async function getAuth0Client() {
  if (!clientPromise) {
    clientPromise = createAuth0Client({
      domain: AUTH0_DOMAIN,
      clientId: AUTH0_CLIENT_ID,
      authorizationParams: {
        redirect_uri: getRedirectUri(),
      },
      cacheLocation: 'memory',
      useRefreshTokens: false,
    });
  }
  return await clientPromise;
}

export async function loginWithRedirect() {
  const client = await getAuth0Client();
  await client.loginWithRedirect({
    authorizationParams: {
      redirect_uri: getRedirectUri(),
    },
  });
}

export async function handleAuthCallback() {
  const client = await getAuth0Client();
  await client.handleRedirectCallback();
  const user = await client.getUser();
  const userId = user?.sub || null;
  if (userId) {
    sessionStorage.setItem('auth0_user_id', userId);
  }
  return { userId, user };
}

export async function getUserId() {
  const cached = sessionStorage.getItem('auth0_user_id');
  if (cached) return cached;

  const client = await getAuth0Client();
  const isAuthenticated = await client.isAuthenticated();
  if (!isAuthenticated) return null;

  const user = await client.getUser();
  const userId = user?.sub || null;
  if (userId) sessionStorage.setItem('auth0_user_id', userId);
  return userId;
}

export function clearSession() {
  sessionStorage.removeItem('auth0_user_id');
}
