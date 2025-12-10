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

    client = new Client({
      connectionString: process.env.NEON_DATABASE_URL,
      ssl: { rejectUnauthorized: false }
    });

    await client.connect();

    // Check if stage 1 has results
    const query = `
      SELECT COUNT(*) as count
      FROM stage_results sr
      JOIN stages s ON sr.stage_id = s.id
      WHERE s.stage_number = 1
    `;
    
    const { rows } = await client.query(query);
    const count = parseInt(rows[0].count, 10);
    const hasResults = count > 0;
    
    await client.end();

    return {
      statusCode: 200,
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ 
        ok: true, 
        hasResults: hasResults,
        count: count
      })
    };
  } catch (err) {
    if (client) {
      try {
        await client.end();
      } catch (closeErr) {
        // Silent fail
      }
    }

    console.error('Error in check-first-stage-has-results:', err);

    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        ok: false,
        error: err.message || 'Database error'
      })
    };
  }
};

