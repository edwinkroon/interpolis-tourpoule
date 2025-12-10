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

    const stageId = body.stageId;
    const isNeutralized = body.isNeutralized;
    const isCancelled = body.isCancelled;

    if (!stageId) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ok: false,
          error: 'stageId is required'
        })
      };
    }

    if (isNeutralized === undefined && isCancelled === undefined) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ok: false,
          error: 'At least one of isNeutralized or isCancelled must be provided'
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

    // Verify stage exists
    const stageCheck = await client.query('SELECT id, stage_number, name FROM stages WHERE id = $1', [stageId]);
    if (stageCheck.rows.length === 0) {
      await client.end();
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ok: false,
          error: `Stage with id ${stageId} does not exist`
        })
      };
    }

    // Build update query dynamically based on what's provided
    const updates = [];
    const values = [];
    let paramIndex = 1;

    if (isNeutralized !== undefined) {
      updates.push(`is_neutralized = $${paramIndex}`);
      values.push(isNeutralized);
      paramIndex++;
    }

    if (isCancelled !== undefined) {
      updates.push(`is_cancelled = $${paramIndex}`);
      values.push(isCancelled);
      paramIndex++;
    }

    values.push(stageId);

    const updateQuery = `
      UPDATE stages
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING id, stage_number, name, is_neutralized, is_cancelled
    `;

    const result = await client.query(updateQuery, values);
    
    await client.end();

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        ok: true,
        message: 'Stage status updated successfully',
        stage: result.rows[0]
      })
    };
  } catch (err) {
    return await handleDbError(err, client);
  }
};

