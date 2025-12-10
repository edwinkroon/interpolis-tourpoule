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

    // Get all available jerseys
    const jerseysQuery = 'SELECT id, type, name, icon FROM jerseys ORDER BY id';
    const jerseysResult = await client.query(jerseysQuery);
    
    // Get participant and fantasy team
    const participantQuery = `
      SELECT p.id as participant_id, ft.id as fantasy_team_id
      FROM participants p
      LEFT JOIN fantasy_teams ft ON ft.participant_id = p.id
      WHERE p.user_id = $1
    `;
    const participantResult = await client.query(participantQuery, [userId]);
    
    if (participantResult.rows.length === 0) {
      await client.end();
      return {
        statusCode: 404,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({ 
          ok: false, 
          error: 'Participant not found' 
        })
      };
    }

    const participantId = participantResult.rows[0].participant_id;
    const fantasyTeamId = participantResult.rows[0].fantasy_team_id;

    // Get jersey assignments for this fantasy team
    // First try to get from fantasy_team_jerseys table, if it exists
    let jerseyAssignments = [];
    
    if (fantasyTeamId) {
      try {
        // Try to query fantasy_team_jerseys table
        const fantasyAssignmentsQuery = `
          SELECT 
            ftj.jersey_id,
            ftj.rider_id,
            j.type as jersey_type,
            j.name as jersey_name,
            j.icon as jersey_icon,
            r.first_name,
            r.last_name,
            r.photo_url,
            tp.name as team_name
          FROM fantasy_team_jerseys ftj
          INNER JOIN jerseys j ON ftj.jersey_id = j.id
          LEFT JOIN riders r ON ftj.rider_id = r.id
          LEFT JOIN teams_pro tp ON r.team_pro_id = tp.id
          WHERE ftj.fantasy_team_id = $1
        `;
        
        const fantasyAssignmentsResult = await client.query(fantasyAssignmentsQuery, [fantasyTeamId]);
        jerseyAssignments.push(...fantasyAssignmentsResult.rows);
      } catch (err) {
        // If table doesn't exist, fall back to stage_jersey_wearers (backward compatibility)
        if (err.code !== '42P01') { // Only ignore "relation does not exist" errors
          throw err;
        }
        
        // Fallback: Get from stage_jersey_wearers
        const teamRidersQuery = `
          SELECT DISTINCT rider_id
          FROM fantasy_team_riders
          WHERE fantasy_team_id = $1
        `;
        const teamRidersResult = await client.query(teamRidersQuery, [fantasyTeamId]);
        const teamRiderIds = teamRidersResult.rows.map(row => row.rider_id);
        
        // Get latest stage
        const latestStageQuery = 'SELECT id, stage_number FROM stages ORDER BY stage_number DESC LIMIT 1';
        const latestStageResult = await client.query(latestStageQuery);
        const latestStageId = latestStageResult.rows.length > 0 ? latestStageResult.rows[0].id : null;
        
        if (latestStageId && teamRiderIds.length > 0) {
          const assignmentsQuery = `
            SELECT 
              sjw.jersey_id,
              sjw.rider_id,
              j.type as jersey_type,
              j.name as jersey_name,
              j.icon as jersey_icon,
              r.first_name,
              r.last_name,
              r.photo_url,
              tp.name as team_name
            FROM stage_jersey_wearers sjw
            INNER JOIN jerseys j ON sjw.jersey_id = j.id
            INNER JOIN riders r ON sjw.rider_id = r.id
            LEFT JOIN teams_pro tp ON r.team_pro_id = tp.id
            WHERE sjw.stage_id = $1
              AND sjw.rider_id = ANY($2::int[])
          `;
          
          const assignmentsResult = await client.query(assignmentsQuery, [latestStageId, teamRiderIds]);
          jerseyAssignments.push(...assignmentsResult.rows);
        }
      }
    }
    
    await client.end();

    // Build jersey list with assignments
    const jerseys = jerseysResult.rows.map(jersey => {
      // Find if this jersey is assigned to a team rider
      const assignment = jerseyAssignments.find(a => a.jersey_id === jersey.id);
      
      return {
        id: jersey.id,
        type: jersey.type,
        name: jersey.name,
        icon: jersey.icon,
        assigned: assignment ? {
          rider_id: assignment.rider_id,
          first_name: assignment.first_name,
          last_name: assignment.last_name,
          photo_url: assignment.photo_url,
          team_name: assignment.team_name
        } : null
      };
    });

    // Check if all jerseys are assigned
    const allJerseysAssigned = jerseys.every(j => j.assigned !== null);

    return {
      statusCode: 200,
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ 
        ok: true, 
        jerseys: jerseys,
        allJerseysAssigned: allJerseysAssigned
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

    console.error('Error in get-team-jerseys function:', err);
    
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

