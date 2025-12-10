const { Client } = require('pg');

exports.handler = async function(event) {
  if (event.httpMethod !== 'GET') {
    return { 
      statusCode: 405, 
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Method Not Allowed' }) 
    };
  }

  // Get user_id from query string
  const userId = event.queryStringParameters?.userId;
  
  if (!userId) {
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ok: false, error: 'userId parameter is required' })
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

    // Get team riders for the participant
    const query = `
      SELECT 
        r.id,
        r.first_name,
        r.last_name,
        r.photo_url,
        tp.name as team_name
      FROM fantasy_team_riders ftr
      INNER JOIN fantasy_teams ft ON ftr.fantasy_team_id = ft.id
      INNER JOIN participants p ON ft.participant_id = p.id
      INNER JOIN riders r ON ftr.rider_id = r.id
      LEFT JOIN teams_pro tp ON r.team_pro_id = tp.id
      WHERE p.user_id = $1
      ORDER BY ftr.slot_number ASC, ftr.slot_type ASC
    `;
    
    const { rows } = await client.query(query, [userId]);

    const riders = rows.map(row => ({
      id: row.id,
      first_name: row.first_name,
      last_name: row.last_name,
      photo_url: row.photo_url,
      team_name: row.team_name
    }));

    // Get total rider count and check if all slots are filled (15 total: 10 main + 5 reserve)
    const totalRiders = riders.length;
    const maxRiders = 15;
    const allRidersSelected = totalRiders >= maxRiders;

    // Check jersey assignments (assuming jerseys need to be assigned to team riders)
    // For now, we'll check if there are any jersey assignments needed
    // This might need to be extended based on actual jersey assignment logic
    // For now, we assume jerseys are complete if we have all riders
    // This can be extended to actually check jersey assignments if that feature exists
    const allJerseysAssigned = allRidersSelected; // Simplified for now
    
    await client.end();

    // Determine team status
    // Status 1: No riders (0 riders)
    // Status 2: Has riders but incomplete (1-14 riders or jerseys not assigned)
    // Status 3: Complete (15 riders and all jerseys assigned)
    let teamStatus = 1; // Default to status 1
    if (totalRiders === 0) {
      teamStatus = 1;
    } else if (totalRiders > 0 && (totalRiders < maxRiders || !allJerseysAssigned)) {
      teamStatus = 2;
    } else if (totalRiders >= maxRiders && allJerseysAssigned) {
      teamStatus = 3;
    }

    return {
      statusCode: 200,
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ 
        ok: true, 
        riders: riders,
        status: {
          teamStatus: teamStatus,
          totalRiders: totalRiders,
          maxRiders: maxRiders,
          allRidersSelected: allRidersSelected,
          allJerseysAssigned: allJerseysAssigned
        }
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

    console.error('Error in get-team-riders function:', err);
    
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


