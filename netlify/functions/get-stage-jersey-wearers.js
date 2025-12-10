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

    const stageNumber = event.queryStringParameters?.stage_number 
      ? parseInt(event.queryStringParameters.stage_number) 
      : null;

    if (!stageNumber) {
      return {
        statusCode: 400,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({ 
          ok: false, 
          error: 'stage_number parameter is required' 
        })
      };
    }

    client = await getDbClient();

    // Get stage info
    const stageQuery = await client.query(
      `SELECT id, stage_number, name FROM stages WHERE stage_number = $1`,
      [stageNumber]
    );

    if (stageQuery.rows.length === 0) {
      await client.end();
      return {
        statusCode: 404,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({ 
          ok: false, 
          error: 'Stage not found' 
        })
      };
    }

    const stageId = stageQuery.rows[0].id;

    // Get jersey wearers for this stage
    const jerseyWearersQuery = await client.query(
      `SELECT 
         j.type as jersey_type,
         j.name as jersey_name,
         r.id as rider_id,
         r.first_name,
         r.last_name,
         r.photo_url,
         tp.name as team_name
       FROM stage_jersey_wearers sjw
       JOIN jerseys j ON sjw.jersey_id = j.id
       JOIN riders r ON sjw.rider_id = r.id
       LEFT JOIN teams_pro tp ON r.team_pro_id = tp.id
       WHERE sjw.stage_id = $1
       ORDER BY 
         CASE j.type
           WHEN 'geel' THEN 1
           WHEN 'groen' THEN 2
           WHEN 'bolletjes' THEN 3
           WHEN 'wit' THEN 4
           ELSE 5
         END`,
      [stageId]
    );
    
    await client.end();

    const jerseys = jerseyWearersQuery.rows.map(row => ({
      type: row.jersey_type,
      jerseyName: row.jersey_name,
      rider: `${row.first_name || ''} ${row.last_name || ''}`.trim(),
      riderId: row.rider_id,
      photoUrl: row.photo_url,
      team: row.team_name || ''
    }));

    return {
      statusCode: 200,
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ 
        ok: true, 
        jerseys: jerseys,
        stageNumber: stageNumber
      })
    };
  } catch (err) {
    return await handleDbError(err, 'get-stage-jersey-wearers', client);
  }
};

