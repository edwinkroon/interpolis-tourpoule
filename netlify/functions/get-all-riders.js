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

    // Get all riders with their team information
    const query = `
      SELECT 
        r.id,
        r.first_name,
        r.last_name,
        r.photo_url,
        r.nationality,
        tp.name as team_name
      FROM riders r
      LEFT JOIN teams_pro tp ON r.team_pro_id = tp.id
      ORDER BY r.last_name, r.first_name
    `;
    
    const { rows } = await client.query(query);
    
    await client.end();

    const riders = rows.map(row => ({
      id: row.id,
      first_name: row.first_name,
      last_name: row.last_name,
      name: `${row.first_name || ''} ${row.last_name || ''}`.trim(),
      photo_url: row.photo_url,
      team_name: row.team_name,
      nationality: row.nationality
    }));

    return {
      statusCode: 200,
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ 
        ok: true, 
        riders: riders
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

    console.error('Error in get-all-riders function:', err);
    
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

