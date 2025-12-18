const { getDbClient, handleDbError, missingDbConfigResponse } = require('./_shared/db');

exports.handler = async function(event) {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ok: false, error: 'Method Not Allowed' })
    };
  }

  // Check admin access
  const userId = event.queryStringParameters?.userId;
  if (!userId) {
    return {
      statusCode: 401,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ok: false, error: 'User ID required' })
    };
  }

  let client;
  try {
    if (!process.env.NEON_DATABASE_URL) {
      return missingDbConfigResponse();
    }

    client = await getDbClient();

    // Check if user is admin
    const adminCheck = await client.query(
      'SELECT is_admin FROM participants WHERE user_id = $1',
      [userId]
    );

    if (!adminCheck.rows.length || !adminCheck.rows[0].is_admin) {
      await client.end();
      return {
        statusCode: 403,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ok: false, error: 'Admin access required' })
      };
    }

    // Reset all stage-related data in correct order (respecting foreign key constraints)
    await client.query('BEGIN');

    try {
      // 1. Clear cumulative points (depends on stages)
      await client.query('TRUNCATE TABLE fantasy_cumulative_points RESTART IDENTITY CASCADE');

      // 2. Clear stage points (depends on stages and participants)
      await client.query('TRUNCATE TABLE fantasy_stage_points RESTART IDENTITY CASCADE');

      // 3. Clear awards_per_participant (awards assigned to participants for stages)
      await client.query('TRUNCATE TABLE awards_per_participant RESTART IDENTITY CASCADE');

      // 4. Clear stage jersey wearers (depends on stages, jerseys, and riders)
      await client.query('TRUNCATE TABLE stage_jersey_wearers RESTART IDENTITY CASCADE');

      // 5. Clear stage results (depends on stages and riders)
      await client.query('TRUNCATE TABLE stage_results RESTART IDENTITY CASCADE');

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
          message: 'Alle etapperesultaten en gerelateerde data zijn gereset.'
        })
      };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    }
  } catch (error) {
    return handleDbError(error, client);
  }
};


