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

    // Get jersey IDs from database
    const jerseyTypes = ['geel', 'groen', 'bolletjes', 'wit'];
    const jerseyQuery = await client.query(
      `SELECT id, type, name FROM jerseys WHERE type = ANY($1::text[])`,
      [jerseyTypes]
    );
    
    const jerseyMap = new Map();
    jerseyQuery.rows.forEach(jersey => {
      jerseyMap.set(jersey.type, { id: jersey.id, name: jersey.name });
    });
    
    // Get previous stage jersey wearers (default values)
    const previousStageNumber = stageNumber - 1;
    const previousJerseys = new Map();
    
    if (previousStageNumber > 0) {
      const previousStageQuery = await client.query(
        `SELECT id FROM stages WHERE stage_number = $1`,
        [previousStageNumber]
      );
      
      if (previousStageQuery.rows.length > 0) {
        const previousStageId = previousStageQuery.rows[0].id;
        const previousJerseyQuery = await client.query(
          `SELECT 
             j.type as jersey_type,
             sjw.rider_id,
             r.first_name,
             r.last_name
           FROM stage_jersey_wearers sjw
           JOIN jerseys j ON sjw.jersey_id = j.id
           JOIN riders r ON sjw.rider_id = r.id
           WHERE sjw.stage_id = $1`,
          [previousStageId]
        );
        
        previousJerseyQuery.rows.forEach(row => {
          previousJerseys.set(row.jersey_type, {
            riderId: row.rider_id,
            riderName: `${row.first_name || ''} ${row.last_name || ''}`.trim()
          });
        });
      }
    }
    
    // Get all riders for dropdown
    const ridersQuery = await client.query(
      `SELECT 
         r.id,
         r.first_name,
         r.last_name,
         tp.name as team_name
       FROM riders r
       LEFT JOIN teams_pro tp ON r.team_pro_id = tp.id
       ORDER BY r.last_name, r.first_name`
    );
    
    const allRiders = ridersQuery.rows.map(row => ({
      id: row.id,
      name: `${row.first_name || ''} ${row.last_name || ''}`.trim(),
      teamName: row.team_name || null
    }));
    
    await client.end();

    // Return structure with jersey types, IDs, previous wearers, and all riders
    const jerseys = jerseyTypes.map(type => {
      const jerseyInfo = jerseyMap.get(type);
      const previousJersey = previousJerseys.get(type);
      
      return {
        type: type,
        jerseyId: jerseyInfo?.id || null,
        name: jerseyInfo?.name || type,
        defaultRiderId: previousJersey?.riderId || null,
        defaultRiderName: previousJersey?.riderName || null
      };
    });

    return {
      statusCode: 200,
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ 
        ok: true, 
        jerseys: jerseys,
        riders: allRiders,
        stageNumber: stageNumber
      })
    };
  } catch (err) {
    return await handleDbError(err, 'get-stage-jerseys', client);
  }
};

