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

    const stageId = body.stageId;
    const results = body.results; // Array of {position, riderId, timeSeconds}

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

    if (!Array.isArray(results) || results.length === 0) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ok: false,
          error: 'results must be a non-empty array'
        })
      };
    }

    client = new Client({
      connectionString: process.env.NEON_DATABASE_URL,
      ssl: { rejectUnauthorized: false }
    });

    await client.connect();

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

    // Begin transaction
    await client.query('BEGIN');

    try {
      // Delete existing results for this stage
      await client.query('DELETE FROM stage_results WHERE stage_id = $1', [stageId]);

      // Calculate same_time_group based on time_seconds
      // Group results by time_seconds and assign group numbers
      const timeGroupMap = new Map(); // Maps time_seconds value to group number
      let currentGroupNumber = 1;
      
      // First pass: assign group numbers by time_seconds
      // Sort by time_seconds (nulls last) and position for consistent grouping
      const sortedResults = [...results].sort((a, b) => {
        if (a.timeSeconds === null && b.timeSeconds === null) {
          return a.position - b.position;
        }
        if (a.timeSeconds === null) return 1;
        if (b.timeSeconds === null) return -1;
        if (a.timeSeconds !== b.timeSeconds) {
          return a.timeSeconds - b.timeSeconds;
        }
        return a.position - b.position;
      });

      // Assign group numbers (similar to DENSE_RANK)
      // All null times get the same group (highest group number)
      let nullTimeGroup = null;
      
      sortedResults.forEach(result => {
        if (result.timeSeconds === null) {
          // All null times share the same group
          if (nullTimeGroup === null) {
            nullTimeGroup = currentGroupNumber++;
          }
        } else {
          // Group by time_seconds value
          if (!timeGroupMap.has(result.timeSeconds)) {
            timeGroupMap.set(result.timeSeconds, currentGroupNumber++);
          }
        }
      });

      // Insert results with same_time_group
      for (const result of results) {
        const sameTimeGroup = result.timeSeconds === null 
          ? nullTimeGroup
          : timeGroupMap.get(result.timeSeconds);

        await client.query(
          `INSERT INTO stage_results (stage_id, rider_id, position, time_seconds, same_time_group)
           VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT (stage_id, rider_id)
           DO UPDATE SET
             position = EXCLUDED.position,
             time_seconds = EXCLUDED.time_seconds,
             same_time_group = EXCLUDED.same_time_group`,
          [stageId, result.riderId, result.position, result.timeSeconds, sameTimeGroup]
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
          message: 'Stage results imported successfully',
          count: results.length
        })
      };
    } catch (err) {
      await client.query('ROLLBACK');
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

    console.error('Error in import-stage-results function:', err);

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

