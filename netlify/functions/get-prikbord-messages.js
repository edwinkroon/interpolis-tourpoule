const { getDbClient, handleDbError, missingDbConfigResponse } = require('./_shared/db');

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
    // Check if database URL is set
    if (!process.env.NEON_DATABASE_URL) {
      return missingDbConfigResponse();
    }

    client = await getDbClient();

    // Get all prikbord messages with participant info, ordered by most recent first
    const query = `
      SELECT 
        bm.id,
        bm.message,
        bm.created_at,
        p.team_name as author,
        p.id as participant_id
      FROM bulletin_messages bm
      INNER JOIN participants p ON bm.participant_id = p.id
      ORDER BY bm.created_at DESC
      LIMIT 50
    `;
    
    const { rows } = await client.query(query);
    
    await client.end();

    // Format the data to match the expected structure
    const formattedMessages = rows.map(row => {
      const createdAt = new Date(row.created_at);
      const date = createdAt.toLocaleDateString('nl-NL', { 
        day: '2-digit', 
        month: '2-digit', 
        year: 'numeric' 
      });
      const time = createdAt.toLocaleTimeString('nl-NL', { 
        hour: '2-digit', 
        minute: '2-digit' 
      });

      return {
        id: row.id,
        message: row.message,
        author: row.author || 'Onbekend',
        date: date,
        time: time,
        isNew: false, // You can implement logic to determine if message is new
        replies: [] // Replies not implemented yet
      };
    });

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ 
        ok: true, 
        messages: formattedMessages 
      })
    };
  } catch (err) {
    return await handleDbError(err, client);
  }
};

