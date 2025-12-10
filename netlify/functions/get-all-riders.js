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
    if (!process.env.NEON_DATABASE_URL) {
      return missingDbConfigResponse();
    }

    client = await getDbClient();

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
    return await handleDbError(err, client);
  }
};


