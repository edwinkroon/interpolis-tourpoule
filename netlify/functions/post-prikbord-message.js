const { getDbClient, handleDbError, missingDbConfigResponse } = require('./_shared/db');

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
    const body = JSON.parse(event.body || '{}');
    const { userId, message } = body;

    // Validate required fields
    if (!userId) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          ok: false, 
          error: 'userId is verplicht. Je moet eerst inloggen via Auth0.' 
        })
      };
    }

    if (!message || !message.trim()) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          ok: false, 
          error: 'Bericht is verplicht' 
        })
      };
    }

    // Sanitize and validate message length
    const sanitizedMessage = message.trim();
    if (sanitizedMessage.length > 1000) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          ok: false, 
          error: 'Bericht is te lang (maximaal 1000 tekens)' 
        })
      };
    }

    // Check if database URL is set
    if (!process.env.NEON_DATABASE_URL) {
      return missingDbConfigResponse();
    }

    client = await getDbClient();

    // Get participant_id from user_id
    const participantQuery = `
      SELECT id FROM participants WHERE user_id = $1 LIMIT 1
    `;
    const participantResult = await client.query(participantQuery, [userId.trim()]);

    if (participantResult.rows.length === 0) {
      await client.end();
      return {
        statusCode: 404,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          ok: false, 
          error: 'Gebruiker niet gevonden. Maak eerst een team aan.' 
        })
      };
    }

    const participantId = participantResult.rows[0].id;

    // Insert message into bulletin_messages
    const insertQuery = `
      INSERT INTO bulletin_messages (participant_id, message)
      VALUES ($1, $2)
      RETURNING id, participant_id, message, created_at
    `;
    const insertResult = await client.query(insertQuery, [participantId, sanitizedMessage]);

    await client.end();

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ 
        ok: true, 
        message: insertResult.rows[0]
      })
    };
  } catch (err) {
    return await handleDbError(err, client);
  }
};

