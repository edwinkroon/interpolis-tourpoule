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

    // Get all stages that have results
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
      ORDER BY s.stage_number ASC
    `;
    
    const { rows } = await client.query(query);
    
    await client.end();

    const stages = rows.map(row => {
      // Format the route string: "Start - End (distance km)"
      let routeText = '';
      if (row.start_location && row.end_location) {
        routeText = `${row.start_location} - ${row.end_location}`;
        if (row.distance_km) {
          routeText += ` (${parseFloat(row.distance_km).toFixed(0)}km)`;
        }
      } else if (row.name) {
        routeText = row.name;
        if (row.distance_km) {
          routeText += ` (${parseFloat(row.distance_km).toFixed(0)}km)`;
        }
      }
      
      return {
        id: row.id,
        stage_number: row.stage_number,
        name: row.name,
        start_location: row.start_location,
        end_location: row.end_location,
        distance_km: row.distance_km ? parseFloat(row.distance_km) : null,
        date: row.date,
        route_text: routeText
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
        stages: stages
      })
    };
  } catch (err) {
    if (client) {
      try {
        await client.end();
      } catch (closeErr) {
        // Silent fail on connection close error
      }
    }

    console.error('Error in get-stages-with-results function:', err);
    
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

