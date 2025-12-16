const { getDbClient, handleDbError, missingDbConfigResponse } = require('./_shared/db');

exports.handler = async function(event) {
  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Method Not Allowed' })
    };
  }

  let client;
  try {
    if (!process.env.NEON_DATABASE_URL) {
      return missingDbConfigResponse();
    }

    client = await getDbClient();

    // Check if deadline has passed
    const deadlineCheck = await client.query(
      `SELECT value FROM settings WHERE key = 'registration_deadline'`
    );
    
    // Check if first stage has results
    const firstStageCheck = await client.query(
      `SELECT COUNT(*) as count
       FROM stage_results sr
       JOIN stages s ON sr.stage_id = s.id
       WHERE s.stage_number = 1`
    );
    
    const hasFirstStageResults = parseInt(firstStageCheck.rows[0]?.count || 0, 10) > 0;
    
    let deadlinePassed = false;
    let deadlineDate = null;
    
    // Check deadline if set
    if (deadlineCheck.rows.length > 0 && deadlineCheck.rows[0].value) {
      deadlineDate = deadlineCheck.rows[0].value;
      const deadline = new Date(deadlineDate);
      const now = new Date();
      deadlinePassed = now > deadline;
    }
    
    const changesAllowed = !deadlinePassed && !hasFirstStageResults;

    await client.end();

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        ok: true,
        changesAllowed,
        deadlinePassed,
        hasFirstStageResults,
        deadlineDate
      })
    };
  } catch (err) {
    if (client) {
      try {
        await client.end();
      } catch (closeErr) {
        // Silent fail on connection close error
      }
    }
    return await handleDbError(err, 'check-team-changes-allowed', client);
  }
};
