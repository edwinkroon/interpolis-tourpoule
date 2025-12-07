const { Client } = require('pg');

exports.handler = async function(event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }) };
  }

  let client;
  try {
    const body = JSON.parse(event.body || '{}');
    const { userId, teamName, email, avatarUrl, newsletter } = body;
    
    console.log('Saving participant:', { userId: userId || 'none', teamName, email });

    if (!teamName || !email) {
      return { 
        statusCode: 400, 
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ok: false, error: 'teamName en email zijn verplicht' }) 
      };
    }

    // Check if database URL is set
    if (!process.env.NEON_DATABASE_URL) {
      console.error('NEON_DATABASE_URL environment variable is not set');
      console.error('Please set NEON_DATABASE_URL in Netlify: Site settings → Environment variables');
      return {
        statusCode: 500,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          ok: false, 
          error: 'Database configuration missing',
          message: 'NEON_DATABASE_URL environment variable is not set. Please configure it in Netlify site settings.'
        })
      };
    }

    // Create new client for each request (serverless best practice)
    client = new Client({
      connectionString: process.env.NEON_DATABASE_URL,
      ssl: { rejectUnauthorized: false }
    });

    await client.connect();
    console.log('Database connected');

    let query;
    let values;
    
    if (userId && userId.trim() !== '') {
      // Als userId aanwezig is, gebruik ON CONFLICT voor updates
      query = `
        INSERT INTO participants (user_id, team_name, email, avatar_url, newsletter)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (user_id) 
        DO UPDATE SET 
          team_name = EXCLUDED.team_name,
          email = EXCLUDED.email,
          avatar_url = EXCLUDED.avatar_url,
          newsletter = EXCLUDED.newsletter
        RETURNING id, user_id
      `;
      values = [userId, teamName, email, avatarUrl || null, !!newsletter];
    } else {
      // Als userId niet aanwezig is, gewoon INSERT (zonder user_id)
      query = `
        INSERT INTO participants (team_name, email, avatar_url, newsletter)
        VALUES ($1, $2, $3, $4)
        RETURNING id
      `;
      values = [teamName, email, avatarUrl || null, !!newsletter];
    }

    const { rows } = await client.query(query, values);
    console.log('Participant saved:', { id: rows[0].id, userId: rows[0].user_id || 'none' });

    await client.end();

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ ok: true, id: rows[0].id })
    };
  } catch (err) {
    console.error('Error in save-participant:', err);
    console.error('Error message:', err.message);
    console.error('Error stack:', err.stack);
    
    if (client) {
      try {
        await client.end();
      } catch (closeErr) {
        console.error('Error closing connection:', closeErr);
      }
    }

    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ 
        ok: false, 
        error: err.message || 'Database error',
        details: process.env.NODE_ENV === 'development' ? err.stack : undefined
      })
    };
  }
};
