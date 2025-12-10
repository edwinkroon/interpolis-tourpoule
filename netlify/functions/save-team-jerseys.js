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
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          ok: false, 
          error: 'Database configuration missing' 
        })
      };
    }

    // Parse request body
    let body;
    try {
      body = JSON.parse(event.body);
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

    const userId = body.userId;
    const assignments = body.assignments; // Array of { jerseyId, riderId }

    if (!userId) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          ok: false, 
          error: 'userId is required' 
        })
      };
    }

    if (!Array.isArray(assignments)) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          ok: false, 
          error: 'assignments must be an array' 
        })
      };
    }

    client = new Client({
      connectionString: process.env.NEON_DATABASE_URL,
      ssl: { rejectUnauthorized: false }
    });

    await client.connect();

    // Check if fantasy_team_jerseys table exists BEFORE starting transaction
    // (DDL operations like CREATE TABLE auto-commit, which breaks transactions)
    let tableExists = false;
    try {
      await client.query(`
        SELECT 1 FROM fantasy_team_jerseys LIMIT 1
      `);
      tableExists = true;
    } catch (err) {
      // Table doesn't exist, create it
      if (err.code === '42P01') { // relation does not exist
        await client.query(`
          CREATE TABLE IF NOT EXISTS fantasy_team_jerseys (
            id SERIAL PRIMARY KEY,
            fantasy_team_id INTEGER NOT NULL,
            jersey_id INTEGER NOT NULL,
            rider_id INTEGER,
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW(),
            FOREIGN KEY (fantasy_team_id) REFERENCES fantasy_teams(id) ON DELETE CASCADE,
            FOREIGN KEY (jersey_id) REFERENCES jerseys(id) ON DELETE CASCADE,
            FOREIGN KEY (rider_id) REFERENCES riders(id) ON DELETE SET NULL,
            UNIQUE(fantasy_team_id, jersey_id)
          )
        `);
        tableExists = true;
      } else {
        // Unexpected error, close connection and return
        await client.end();
        throw err;
      }
    }

    // Start transaction for the rest of the operations
    await client.query('BEGIN');

    try {
      // Get participant and fantasy team
      const participantQuery = `
        SELECT p.id as participant_id, ft.id as fantasy_team_id
        FROM participants p
        LEFT JOIN fantasy_teams ft ON ft.participant_id = p.id
        WHERE p.user_id = $1
      `;
      
      const participantResult = await client.query(participantQuery, [userId]);
      
      if (participantResult.rows.length === 0) {
        await client.query('ROLLBACK');
        await client.end();
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

      const participantId = participantResult.rows[0].participant_id;
      let fantasyTeamId = participantResult.rows[0].fantasy_team_id;

      // Create fantasy team if it doesn't exist
      if (!fantasyTeamId) {
        const createTeamQuery = `
          INSERT INTO fantasy_teams (participant_id, created_at)
          VALUES ($1, NOW())
          RETURNING id
        `;
        const createResult = await client.query(createTeamQuery, [participantId]);
        fantasyTeamId = createResult.rows[0].id;
      }

      // Verify that the riders belong to this fantasy team
      const teamRidersQuery = `
        SELECT DISTINCT rider_id
        FROM fantasy_team_riders
        WHERE fantasy_team_id = $1
      `;
      const teamRidersResult = await client.query(teamRidersQuery, [fantasyTeamId]);
      const teamRiderIds = new Set(teamRidersResult.rows.map(row => row.rider_id));

      // Get all valid jersey IDs from database
      const validJerseysQuery = 'SELECT id FROM jerseys';
      const validJerseysResult = await client.query(validJerseysQuery);
      const validJerseyIds = new Set(validJerseysResult.rows.map(row => row.id));

      // Validate assignments - all riders must be in the team and jersey IDs must exist
      for (const assignment of assignments) {
        if (!assignment.jerseyId) {
          continue; // Skip assignments without jerseyId
        }

        // Validate jersey ID exists
        if (!validJerseyIds.has(assignment.jerseyId)) {
          await client.query('ROLLBACK');
          await client.end();
          return {
            statusCode: 400,
            headers: { 
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({ 
              ok: false, 
              error: `Jersey ID ${assignment.jerseyId} does not exist in the database` 
            })
          };
        }

        // Validate rider ID if provided
        if (assignment.riderId && !teamRiderIds.has(assignment.riderId)) {
          await client.query('ROLLBACK');
          await client.end();
          return {
            statusCode: 400,
            headers: { 
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({ 
              ok: false, 
              error: `Rider ${assignment.riderId} is not in your fantasy team` 
            })
          };
        }
      }

      // Delete existing assignments for this team
      await client.query(
        'DELETE FROM fantasy_team_jerseys WHERE fantasy_team_id = $1',
        [fantasyTeamId]
      );

      // Insert new assignments (only those with a riderId and valid jerseyId)
      for (const assignment of assignments) {
        if (assignment.riderId && assignment.jerseyId && validJerseyIds.has(assignment.jerseyId)) {
          await client.query(
            `INSERT INTO fantasy_team_jerseys (fantasy_team_id, jersey_id, rider_id, updated_at)
             VALUES ($1, $2, $3, NOW())
             ON CONFLICT (fantasy_team_id, jersey_id) 
             DO UPDATE SET rider_id = EXCLUDED.rider_id, updated_at = NOW()`,
            [fantasyTeamId, assignment.jerseyId, assignment.riderId]
          );
        }
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
          message: 'Jersey assignments saved successfully'
        })
      };
    } catch (err) {
      // Rollback transaction on error (if still in transaction)
      try {
        const result = await client.query('SELECT 1');
        // If query succeeds, we're still connected, so rollback
        await client.query('ROLLBACK');
      } catch (rollbackErr) {
        // Transaction might already be aborted, that's ok
      }
      throw err;
    }
  } catch (err) {
    if (client) {
      try {
        await client.end();
      } catch (closeErr) {
        // Silent fail on connection close error
      }
    }

    console.error('Error in save-team-jerseys function:', err);

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

