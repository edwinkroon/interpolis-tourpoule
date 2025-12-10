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

    // Get all stages that don't have any results yet
    const query = `
      SELECT 
        s.id,
        s.stage_number,
        s.name,
        s.start_location,
        s.end_location,
        s.distance_km,
        s.date
      FROM stages s
      WHERE NOT EXISTS (
        SELECT 1 
        FROM stage_results sr 
        WHERE sr.stage_id = s.id
      )
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
      date: row.date
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

