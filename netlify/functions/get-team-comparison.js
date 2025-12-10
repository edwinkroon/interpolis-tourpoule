const { getDbClient, handleDbError, missingDbConfigResponse } = require('./_shared/db');

exports.handler = async function(event) {
  if (event.httpMethod !== 'GET') {
    return { 
      statusCode: 405, 
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Method Not Allowed' }) 
    };
  }

  // Get participant_id from query string
  const participantId = event.queryStringParameters?.participantId;
  
  if (!participantId) {
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ok: false, error: 'participantId parameter is required' })
    };
  }

  let client;
  try {
    if (!process.env.NEON_DATABASE_URL) {
      return missingDbConfigResponse();
    }

    client = await getDbClient();

    // Get participant info
    const participantQuery = `
      SELECT 
        p.id,
        p.team_name,
        p.avatar_url,
        p.user_id
      FROM participants p
      WHERE p.id = $1
      LIMIT 1
    `;
    
    const participantResult = await client.query(participantQuery, [participantId]);
    
    if (participantResult.rows.length === 0) {
      await client.end();
      return {
        statusCode: 404,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ok: false, error: 'Team niet gevonden' })
      };
    }

    const participant = participantResult.rows[0];

    // Get team riders (only active/main riders)
    const ridersQuery = `
      SELECT 
        r.id,
        r.first_name,
        r.last_name,
        r.photo_url,
        tp.name as team_name,
        ftr.slot_type,
        ftr.slot_number
      FROM fantasy_team_riders ftr
      INNER JOIN fantasy_teams ft ON ftr.fantasy_team_id = ft.id
      INNER JOIN riders r ON ftr.rider_id = r.id
      LEFT JOIN teams_pro tp ON r.team_pro_id = tp.id
      WHERE ft.participant_id = $1
        AND ftr.active = true
        AND ftr.slot_type = 'main'
      ORDER BY ftr.slot_number ASC
    `;
    
    const ridersResult = await client.query(ridersQuery, [participantId]);
    
    const riders = ridersResult.rows.map(row => ({
      id: row.id,
      firstName: row.first_name,
      lastName: row.last_name,
      photoUrl: row.photo_url,
      teamName: row.team_name || 'Onbekend team',
      slotNumber: row.slot_number
    }));

    // Get latest standings to find rank and total points
    const latestStageQuery = `
      SELECT s.id, s.stage_number
      FROM stages s
      WHERE EXISTS (
        SELECT 1 FROM stage_results sr WHERE sr.stage_id = s.id
      )
      ORDER BY s.stage_number DESC
      LIMIT 1
    `;
    
    const latestStageResult = await client.query(latestStageQuery);
    
    let totalPoints = 0;
    let rank = null;
    
    if (latestStageResult.rows.length > 0) {
      const latestStageId = latestStageResult.rows[0].id;
      
      // Try to get from cumulative points first
      const cumulativeQuery = `
        SELECT total_points, rank
        FROM fantasy_cumulative_points
        WHERE participant_id = $1 AND after_stage_id = $2
        LIMIT 1
      `;
      
      const cumulativeResult = await client.query(cumulativeQuery, [participantId, latestStageId]);
      
      if (cumulativeResult.rows.length > 0) {
        totalPoints = cumulativeResult.rows[0].total_points || 0;
        rank = cumulativeResult.rows[0].rank;
      } else {
        // Fallback to sum of stage points
        const stagePointsQuery = `
          SELECT COALESCE(SUM(total_points), 0) as total_points
          FROM fantasy_stage_points
          WHERE participant_id = $1
        `;
        
        const stagePointsResult = await client.query(stagePointsQuery, [participantId]);
        totalPoints = stagePointsResult.rows[0].total_points || 0;
        
        // Calculate rank from standings
        const standingsQuery = `
          SELECT 
            p.id as participant_id,
            COALESCE(SUM(fsp.total_points), 0) as total_points
          FROM participants p
          LEFT JOIN fantasy_stage_points fsp ON fsp.participant_id = p.id
          GROUP BY p.id
          ORDER BY total_points DESC, p.team_name ASC
        `;
        
        const standingsResult = await client.query(standingsQuery);
        const participantIndex = standingsResult.rows.findIndex(row => row.participant_id === participantId);
        if (participantIndex !== -1) {
          rank = participantIndex + 1;
        }
      }
    }

    await client.end();

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        ok: true,
        team: {
          participantId: participant.id,
          teamName: participant.team_name,
          avatarUrl: participant.avatar_url,
          riders: riders,
          totalPoints: totalPoints,
          rank: rank
        }
      })
    };
  } catch (err) {
    return await handleDbError(err, client);
  }
};

