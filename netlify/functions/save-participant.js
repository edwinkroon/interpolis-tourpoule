const { Client } = require('pg');

exports.handler = async function(event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }) };
  }

  let client;
  try {
    const body = JSON.parse(event.body || '{}');
    let { userId, teamName, email, avatarUrl, newsletter } = body;

    // Sanitize inputs
    if (teamName) {
      teamName = teamName.trim().substring(0, 100); // Max 100 characters
    }
    if (email) {
      email = email.trim().toLowerCase().substring(0, 255); // Max 255 characters, lowercase
      // Basic email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return {
          statusCode: 400,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ok: false, error: 'Ongeldig emailadres' })
        };
      }
    }
    // Handle avatar URL - data URLs can be very long (base64 encoded images)
    // A 5MB image encoded as base64 is ~6.67MB, so we allow up to 10MB for safety
    if (avatarUrl && avatarUrl.trim() && avatarUrl !== 'null') {
      // Data URLs start with "data:image/", allow up to 10MB for base64 encoded images
      if (avatarUrl.length > 10485760) { // 10MB limit
        return {
          statusCode: 400,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ok: false, error: 'Avatar afbeelding is te groot (max 10MB)' })
        };
      }
      avatarUrl = avatarUrl.trim();
    } else {
      avatarUrl = null; // Convert empty string or 'null' string to null
    }

    // Validate required fields
    if (!userId) {
      return { 
        statusCode: 400, 
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ok: false, error: 'userId is verplicht. Je moet eerst inloggen via Auth0.' })
      };
    }
    
    if (!teamName) {
      return { 
        statusCode: 400, 
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ok: false, error: 'teamName is verplicht' }) 
      };
    }
    
    if (!email) {
      return { 
        statusCode: 400, 
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ok: false, error: 'email is verplicht' }) 
      };
    }
    
    // user_id is now required (NOT NULL in database)
    if (!userId || !userId.trim()) {
      return { 
        statusCode: 400, 
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ok: false, error: 'userId is verplicht' }) 
      };
    }

    // Check if database URL is set
    if (!process.env.NEON_DATABASE_URL) {
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

    // user_id is now required (NOT NULL), so always use ON CONFLICT for upsert
    const query = `
      INSERT INTO participants (user_id, team_name, email, avatar_url, newsletter)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (user_id) 
      DO UPDATE SET 
        team_name = EXCLUDED.team_name,
        email = EXCLUDED.email,
        avatar_url = EXCLUDED.avatar_url,
        newsletter = EXCLUDED.newsletter
      RETURNING id, user_id, created_at
    `;
    const values = [userId.trim(), teamName, email, avatarUrl || null, !!newsletter];

    const { rows } = await client.query(query, values);

    await client.end();

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ ok: true, id: rows[0].id })
    };
  } catch (err) {
    if (client) {
      try {
        await client.end();
      } catch (closeErr) {
        // Silent fail on connection close error
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
