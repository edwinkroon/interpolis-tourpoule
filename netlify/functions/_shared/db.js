const { Client } = require('pg');

/**
 * Create and connect to database client
 * @returns {Promise<Client>} Connected database client
 * @throws {Error} If database configuration is missing
 */
async function getDbClient() {
  if (!process.env.NEON_DATABASE_URL) {
    throw new Error('Database configuration missing');
  }

  const client = new Client({
    connectionString: process.env.NEON_DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

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

