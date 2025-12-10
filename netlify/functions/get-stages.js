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

    // Get all stages with winner information
    const query = `
      SELECT 
        s.id,
        s.stage_number,
        s.name,
        s.start_location,
        s.end_location,
        s.distance_km,
        s.date,
        s.is_neutralized,
        s.is_cancelled,
        -- Get winner (rider with position 1)
        (
          SELECT json_build_object(
            'id', r.id,
            'first_name', r.first_name,
            'last_name', r.last_name
          )
          FROM stage_results sr
          INNER JOIN riders r ON sr.rider_id = r.id
          WHERE sr.stage_id = s.id
            AND sr.position = 1
          LIMIT 1
        ) as winner
      FROM stages s
      ORDER BY s.stage_number ASC
    `;
    
    const { rows } = await client.query(query);
    
    await client.end();

    const stages = rows.map(row => ({
      id: row.id,
      stage_number: row.stage_number,
      name: row.name,
      start_location: row.start_location,
      end_location: row.end_location,
      distance_km: row.distance_km ? parseFloat(row.distance_km) : null,
      date: row.date,
      is_neutralized: row.is_neutralized || false,
      is_cancelled: row.is_cancelled || false,
      winner: row.winner
    }));
    
    return {
      statusCode: 200,
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ 
        ok: true, 
        stages: stages
      })
    };
  } catch (err) {
    return await handleDbError(err, client);
  }
};


