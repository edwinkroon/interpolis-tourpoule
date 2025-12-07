const { Client } = require('pg');

exports.handler = async function(event) {
  console.log('get-user CALLED, method =', event.httpMethod);

  if (event.httpMethod !== 'GET') {
    return { 
      statusCode: 405, 
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Method Not Allowed' }) 
    };
  }

  // Get user_id from query string
  const userId = event.queryStringParameters?.userId;
  
  if (!userId) {
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ok: false, error: 'userId parameter is required' })
    };
  }

  let client;
  try {
    if (!process.env.NEON_DATABASE_URL) {
      console.error('NEON_DATABASE_URL environment variable is not set');
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
    console.log('Database connected');

    const query = `
      SELECT id, team_name, email, avatar_url, newsletter
      FROM participants
      WHERE user_id = $1
      LIMIT 1
    `;
    
    console.log('Checking for user_id:', userId);
    const { rows } = await client.query(query, [userId]);
    
    await client.end();

    if (rows.length > 0) {
      console.log('User found:', rows[0]);
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          ok: true, 
          exists: true,
          participant: rows[0]
        })
      };
    } else {
      console.log('User not found');
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          ok: true, 
          exists: false
        })
      };
    }
  } catch (err) {
    console.error('Error in get-user:', err);
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
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        ok: false, 
        error: err.message || 'Database error'
      })
    };
  }
};

