const { Client } = require('pg');

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

    // Get the latest stage (highest stage_number) that has results
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
      WHERE EXISTS (
        SELECT 1 
        FROM stage_results sr 
        WHERE sr.stage_id = s.id
      )
      ORDER BY s.stage_number DESC
      LIMIT 1
    `;
    
    const { rows } = await client.query(query);
    
    await client.end();

    if (rows.length > 0) {
      const stage = rows[0];
      
      // Format the route string: "Start - End (distance km)"
      let routeText = '';
      if (stage.start_location && stage.end_location) {
        routeText = `${stage.start_location} - ${stage.end_location}`;
        if (stage.distance_km) {
          routeText += ` (${parseFloat(stage.distance_km).toFixed(0)}km)`;
        }
      } else if (stage.name) {
        routeText = stage.name;
        if (stage.distance_km) {
          routeText += ` (${parseFloat(stage.distance_km).toFixed(0)}km)`;
        }
      }
      
      return {
        statusCode: 200,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({ 
          ok: true, 
          stage: {
            id: stage.id,
            stage_number: stage.stage_number,
            name: stage.name,
            start_location: stage.start_location,
            end_location: stage.end_location,
            distance_km: stage.distance_km ? parseFloat(stage.distance_km) : null,
            date: stage.date,
            route_text: routeText
          }
        })
      };
    } else {
      return {
        statusCode: 200,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({ 
          ok: true, 
          stage: null
        })
      };
    }
  } catch (err) {
    if (client) {
      try {
        await client.end();
      } catch (closeErr) {
        // Silent fail on connection close error
      }
    }

    console.error('Error in get-latest-stage function:', err);
    
    return {
      statusCode: 500,
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ 
        ok: false, 
        error: err.message || 'Database error',
        details: process.env.NODE_ENV === 'development' ? err.stack : undefined
      })
    };
  }
};

