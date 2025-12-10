const { Client } = require('pg');

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

    client = new Client({
      connectionString: process.env.NEON_DATABASE_URL,
      ssl: { rejectUnauthorized: false }
    });

    await client.connect();
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

    console.error('Error in delete-team-riders function:', err);
    
    return {
      statusCode: 500,
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ 
        ok: false, 
        error: err.message || 'Database error',
        details: process.env.NODE_ENV === 'development' ? err.stack : undefined
      })
    };
  }
};

