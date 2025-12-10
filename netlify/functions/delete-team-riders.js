const { getDbClient, handleDbError, missingDbConfigResponse } = require('./_shared/db');

exports.handler = async function(event) {
  if (event.httpMethod !== 'POST') {
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

    const { userId, riderIds } = JSON.parse(event.body || '{}');
    
    if (!userId || !riderIds || !Array.isArray(riderIds) || riderIds.length === 0) {
      return {
        statusCode: 400,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({ 
          ok: false, 
          error: 'userId and riderIds array are required' 
        })
      };
    }

    client = await getDbClient();
    
    // Check if deadline has passed or first stage has results
    const deadlineCheck = await client.query(
      `SELECT value FROM settings WHERE key = 'registration_deadline'`
    );
    
    const firstStageCheck = await client.query(
      `SELECT COUNT(*) as count
       FROM stage_results sr
       JOIN stages s ON sr.stage_id = s.id
       WHERE s.stage_number = 1`
    );
    
    const hasFirstStageResults = parseInt(firstStageCheck.rows[0]?.count || 0, 10) > 0;
    
    // Check deadline if set
    if (deadlineCheck.rows.length > 0 && deadlineCheck.rows[0].value) {
      const deadline = new Date(deadlineCheck.rows[0].value);
      const now = new Date();
      
      if (now > deadline) {
        await client.end();
        return {
          statusCode: 403,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            ok: false, 
            error: 'De aanmeldingsdeadline is verstreken. Je team kan niet meer worden gewijzigd.' 
          })
        };
      }
    }
    
    // Check if first stage has results
    if (hasFirstStageResults) {
      await client.end();
      return {
        statusCode: 403,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          ok: false, 
          error: 'De eerste etappe heeft al resultaten. Je team kan niet meer worden gewijzigd.' 
        })
      };
    }
    
    await client.query('BEGIN');

    // Get participant ID
    const participantQuery = 'SELECT id FROM participants WHERE user_id = $1';
    const participantResult = await client.query(participantQuery, [userId]);
    
    if (participantResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return {
        statusCode: 404,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({ 
          ok: false, 
          error: 'Participant not found' 
        })
      };
    }

    const participantId = participantResult.rows[0].id;

    // Get fantasy team ID
    const teamQuery = 'SELECT id FROM fantasy_teams WHERE participant_id = $1';
    const teamResult = await client.query(teamQuery, [participantId]);
    
    if (teamResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return {
        statusCode: 404,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({ 
          ok: false, 
          error: 'Fantasy team not found' 
        })
      };
    }

    const fantasyTeamId = teamResult.rows[0].id;

    // First, delete jersey assignments for these riders (if they exist)
    // Check if fantasy_team_jerseys table exists
    try {
      const jerseyPlaceholders = riderIds.map((_, index) => `$${index + 2}`).join(', ');
      const deleteJerseysQuery = `
        DELETE FROM fantasy_team_jerseys
        WHERE fantasy_team_id = $1
          AND rider_id IN (${jerseyPlaceholders})
      `;
      
      const jerseyDeleteParams = [fantasyTeamId, ...riderIds];
      await client.query(deleteJerseysQuery, jerseyDeleteParams);
    } catch (jerseyErr) {
      // If table doesn't exist (error code 42P01), ignore the error
      // Otherwise, log it but don't fail the entire operation
      if (jerseyErr.code !== '42P01') {
      }
    }

    // Delete riders
    const placeholders = riderIds.map((_, index) => `$${index + 2}`).join(', ');
    const deleteQuery = `
      DELETE FROM fantasy_team_riders
      WHERE fantasy_team_id = $1
        AND rider_id IN (${placeholders})
    `;
    
    const deleteParams = [fantasyTeamId, ...riderIds];
    const deleteResult = await client.query(deleteQuery, deleteParams);
    
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
        deleted: deleteResult.rowCount
      })
    };
  } catch (err) {
    if (client) {
      try {
        await client.query('ROLLBACK');
        await client.end();
      } catch (closeErr) {
        // Silent fail on connection close error
      }
    }

    // Try to rollback if in transaction
    if (client) {
      try {
        await client.query('ROLLBACK');
      } catch (rollbackErr) {
        // Transaction might already be aborted, that's ok
      }
    }
    return await handleDbError(err, client);
  }
};

