const { getDbClient, handleDbError, missingDbConfigResponse } = require('./_shared/db');

exports.handler = async function(event) {
  if (event.httpMethod !== 'POST') {
    return { 
      statusCode: 405, 
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Method Not Allowed' }) 
    };
  }

  // Get user_id from query string to verify admin
  const userId = event.queryStringParameters?.userId;
  
  if (!userId) {
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ok: false, error: 'userId parameter is required' })
    };
  }

  let client;
  try {
    if (!process.env.NEON_DATABASE_URL) {
      return missingDbConfigResponse();
    }

    let body;
    try {
      body = JSON.parse(event.body || '{}');
    } catch (e) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ok: false,
          error: 'Invalid JSON in request body'
        })
      };
    }

    const settings = body.settings; // Object with key-value pairs

    if (!settings || typeof settings !== 'object') {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ok: false,
          error: 'settings object is required'
        })
      };
    }

    client = await getDbClient();

    // Check if user is admin
    const adminCheck = await client.query(
      'SELECT id, is_admin FROM participants WHERE user_id = $1',
      [userId]
    );

    if (adminCheck.rows.length === 0 || !adminCheck.rows[0].is_admin) {
      await client.end();
      return {
        statusCode: 403,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ok: false,
          error: 'Admin access required'
        })
      };
    }

    const participantId = adminCheck.rows[0].id;

    // Begin transaction
    await client.query('BEGIN');

    try {
      // Update or insert each setting
      for (const [key, value] of Object.entries(settings)) {
        await client.query(
          `INSERT INTO settings (key, value, updated_by, updated_at)
           VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
           ON CONFLICT (key) 
           DO UPDATE SET 
             value = EXCLUDED.value,
             updated_by = EXCLUDED.updated_by,
             updated_at = CURRENT_TIMESTAMP`,
          [key, String(value), participantId]
        );
      }

      // Commit transaction
      await client.query('COMMIT');
      await client.end();

      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({
          ok: true,
          message: 'Settings saved successfully'
        })
      };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    }
  } catch (err) {
    if (client) {
      try {
        await client.query('ROLLBACK');
      } catch (rollbackErr) {
        // Transaction might already be aborted
      }
    }
    return await handleDbError(err, client);
  }
};

