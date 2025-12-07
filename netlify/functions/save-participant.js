const { Client } = require('pg');

exports.handler = async function(event) {
  console.log('save-participant CALLED, method =', event.httpMethod);
  console.log('body =', event.body);

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }) };
  }

  let client;
  try {
    const { teamName, email, avatarUrl, newsletter } = JSON.parse(event.body || '{}');

    if (!teamName || !email) {
      return { 
        statusCode: 400, 
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

    const query = `
      INSERT INTO participants (team_name, email, avatar_url, newsletter)
      VALUES ($1, $2, $3, $4)
      RETURNING id
    `;
    const values = [teamName, email, avatarUrl || null, !!newsletter];

    console.log('Executing query with values:', values);
    const { rows } = await client.query(query, values);
    console.log('Query successful, inserted id:', rows[0].id);

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
