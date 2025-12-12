const { Client } = require('pg');

function resolveDatabaseUrl() {
  // Preferred name in this codebase is NEON_DATABASE_URL, but allow common fallbacks
  return (
    process.env.NEON_DATABASE_URL ||
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL ||
    process.env.POSTGRES_PRISMA_URL
  );
}

function shouldUseSsl(connectionString) {
  if (!connectionString) return false;

  const lower = connectionString.toLowerCase();

  // If explicitly requested via query params / flags, use SSL.
  if (
    lower.includes('sslmode=require') ||
    lower.includes('ssl=true') ||
    lower.includes('ssl=1') ||
    lower.includes('channel_binding=require')
  ) {
    return true;
  }

  // Common hosted Postgres providers typically require SSL.
  if (lower.includes('.neon.tech') || lower.includes('.aws.neon.tech')) {
    return true;
  }

  // Local dev defaults: usually no SSL (Docker, localhost, etc.)
  if (
    lower.includes('localhost') ||
    lower.includes('127.0.0.1') ||
    lower.includes('0.0.0.0') ||
    lower.includes('host.docker.internal')
  ) {
    return false;
  }

  // Safe default: do not force SSL unless we know it's required.
  return false;
}

// Backwards-compat: many handlers check NEON_DATABASE_URL directly.
// If the user provides DATABASE_URL (or another fallback), mirror it.
if (!process.env.NEON_DATABASE_URL) {
  const resolved = resolveDatabaseUrl();
  if (resolved) process.env.NEON_DATABASE_URL = resolved;
}

/**
 * Create and connect to database client
 * @returns {Promise<Client>} Connected database client
 * @throws {Error} If database configuration is missing
 */
async function getDbClient() {
  const connectionString = resolveDatabaseUrl();
  if (!connectionString) {
    throw new Error('Database configuration missing');
  }

  const clientConfig = { connectionString };
  if (shouldUseSsl(connectionString)) {
    clientConfig.ssl = { rejectUnauthorized: false };
  }

  const client = new Client(clientConfig);

  await client.connect();
  return client;
}

/**
 * Standard error response for database errors
 * @param {Error} error - The error object
 * @param {Client|null} client - Optional database client to close
 * @returns {Object} Netlify function response object
 */
async function handleDbError(error, client = null) {
  if (client) {
    try {
      await client.end();
    } catch (closeErr) {
      // Silent fail on close error
    }
  }

  console.error('Database error:', error);

  return {
    statusCode: 500,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    },
    body: JSON.stringify({
      ok: false,
      error: error.message || 'Database error'
    })
  };
}

/**
 * Standard error response for missing database configuration
 * @returns {Object} Netlify function response object
 */
function missingDbConfigResponse() {
  return {
    statusCode: 500,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    },
    body: JSON.stringify({
      ok: false,
      error: 'Database configuration missing'
    })
  };
}

module.exports = {
  getDbClient,
  handleDbError,
  missingDbConfigResponse
};

