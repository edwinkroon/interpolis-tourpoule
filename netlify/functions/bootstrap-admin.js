const { getDbClient, handleDbError, missingDbConfigResponse } = require('./_shared/db');

// Safe bootstrap endpoint to promote a user to admin.
// Disabled unless ADMIN_BOOTSTRAP_TOKEN is set in env.
exports.handler = async function (event) {
  if (event.httpMethod !== 'POST' && event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ok: false, error: 'Method Not Allowed' }),
    };
  }

  let client;
  try {
    if (!process.env.NEON_DATABASE_URL) {
      return missingDbConfigResponse();
    }

    const requiredToken = process.env.ADMIN_BOOTSTRAP_TOKEN;
    if (!requiredToken) {
      return {
        statusCode: 403,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ok: false, error: 'Bootstrap disabled' }),
      };
    }

    const token =
      event.queryStringParameters?.token ||
      event.headers?.['x-admin-bootstrap-token'] ||
      event.headers?.['X-Admin-Bootstrap-Token'];

    if (!token || token !== requiredToken) {
      return {
        statusCode: 403,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ok: false, error: 'Invalid token' }),
      };
    }

    const userId = event.queryStringParameters?.userId;
    if (!userId) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ok: false, error: 'userId parameter is required' }),
      };
    }

    client = await getDbClient();

    const result = await client.query(
      `UPDATE participants
       SET is_admin = true
       WHERE user_id = $1
       RETURNING id, user_id, is_admin`,
      [userId]
    );

    await client.end();

    if (result.rows.length === 0) {
      return {
        statusCode: 404,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ok: false, error: 'Participant not found' }),
      };
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ ok: true, participant: result.rows[0] }),
    };
  } catch (err) {
    return await handleDbError(err, client);
  }
};






