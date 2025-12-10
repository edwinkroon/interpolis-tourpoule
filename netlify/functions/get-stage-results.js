const { Client } = require('pg');

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
      return {
        statusCode: 500,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          ok: false, 
          error: 'Database configuration missing' 
        })
      };
    }

    // Get stage_number from query parameters (default to latest stage with results)
    const stageNumber = event.queryStringParameters?.stage_number 
      ? parseInt(event.queryStringParameters.stage_number) 
      : null;

    client = new Client({
      connectionString: process.env.NEON_DATABASE_URL,
      ssl: { rejectUnauthorized: false }
    });

    await client.connect();

    // Build query to get top 6 results for the stage
    let query;
    let params = [];
    
    if (stageNumber) {
      query = `
        SELECT 
          sr.position,
          sr.time_seconds,
          r.first_name,
          r.last_name
        FROM stage_results sr
        INNER JOIN riders r ON sr.rider_id = r.id
        INNER JOIN stages s ON sr.stage_id = s.id
        WHERE s.stage_number = $1
        ORDER BY sr.position ASC
        LIMIT 6
      `;
      params = [stageNumber];
    } else {
      // Get latest stage with results
      query = `
        SELECT 
          sr.position,
          sr.time_seconds,
          r.first_name,
          r.last_name
        FROM stage_results sr
        INNER JOIN riders r ON sr.rider_id = r.id
        INNER JOIN stages s ON sr.stage_id = s.id
        WHERE s.id = (
          SELECT s2.id
          FROM stages s2
          WHERE EXISTS (
            SELECT 1 
            FROM stage_results sr2 
            WHERE sr2.stage_id = s2.id
          )
          ORDER BY s2.stage_number ASC
          LIMIT 1
        )
        ORDER BY sr.position ASC
        LIMIT 6
      `;
    }
    
    const { rows } = await client.query(query, params);
    
    await client.end();

    // Format time from seconds to HH:MM:SS
    function formatTime(seconds) {
      if (!seconds) return null;
      const hours = Math.floor(seconds / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);
      const secs = seconds % 60;
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }

    const results = rows.map(row => ({
      position: row.position,
      rider: `${row.first_name || ''} ${row.last_name || ''}`.trim(),
      time: formatTime(row.time_seconds)
    }));

    return {
      statusCode: 200,
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ 
        ok: true, 
        results: results
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

    console.error('Error in get-stage-results function:', err);
    
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


