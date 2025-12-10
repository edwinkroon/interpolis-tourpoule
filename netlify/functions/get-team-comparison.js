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

    // Get fantasy team ID
    const fantasyTeamQuery = `
      SELECT id FROM fantasy_teams WHERE participant_id = $1 LIMIT 1
    `;
    const fantasyTeamResult = await client.query(fantasyTeamQuery, [participantId]);
    const fantasyTeamId = fantasyTeamResult.rows.length > 0 ? fantasyTeamResult.rows[0].id : null;

    // Get team riders (both main and reserve)
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
      ORDER BY ftr.slot_type ASC, ftr.slot_number ASC
    `;
    
    const ridersResult = await client.query(ridersQuery, [participantId]);
    
    // Get jersey assignments
    let jerseyAssignments = [];
    if (fantasyTeamId) {
      try {
        const jerseyQuery = `
          SELECT 
            ftj.jersey_id,
            ftj.rider_id,
            j.type as jersey_type,
            j.name as jersey_name,
            j.icon as jersey_icon
          FROM fantasy_team_jerseys ftj
          INNER JOIN jerseys j ON ftj.jersey_id = j.id
          WHERE ftj.fantasy_team_id = $1
        `;
        const jerseyResult = await client.query(jerseyQuery, [fantasyTeamId]);
        jerseyAssignments = jerseyResult.rows;
      } catch (err) {
        // If table doesn't exist, ignore
        if (err.code !== '42P01') {
          console.error('Error fetching jersey assignments:', err);
        }
      }
    }

    // Create map of rider_id -> jersey assignments
    const riderJerseyMap = new Map();
    jerseyAssignments.forEach(assignment => {
      if (!riderJerseyMap.has(assignment.rider_id)) {
        riderJerseyMap.set(assignment.rider_id, []);
      }
      riderJerseyMap.get(assignment.rider_id).push({
        type: assignment.jersey_type,
        name: assignment.jersey_name,
        icon: assignment.jersey_icon
      });
    });

    // Get all stages with results to calculate total points per rider
    const stagesWithResultsQuery = `
      SELECT DISTINCT s.id, s.stage_number
      FROM stages s
      WHERE EXISTS (
        SELECT 1 FROM stage_results sr WHERE sr.stage_id = s.id
      )
      ORDER BY s.stage_number ASC
    `;
    const stagesWithResults = await client.query(stagesWithResultsQuery);

    // Get scoring rules
    const scoringRulesQuery = `
      SELECT rule_type, condition_json, points 
      FROM scoring_rules 
      WHERE rule_type IN ('stage_position', 'jersey')
    `;
    const scoringRulesResult = await client.query(scoringRulesQuery);
    
    const positionPointsMap = new Map();
    const jerseyPointsMap = new Map();
    scoringRulesResult.rows.forEach(rule => {
      const condition = rule.condition_json;
      if (rule.rule_type === 'stage_position' && condition && condition.position) {
        positionPointsMap.set(condition.position, rule.points);
      } else if (rule.rule_type === 'jersey' && condition && condition.jersey_type) {
        jerseyPointsMap.set(condition.jersey_type, rule.points);
      }
    });

    // Calculate total points per rider across all stages
    const riderPointsMap = new Map();
    const riderIds = ridersResult.rows.map(row => row.id);
    
    if (riderIds.length > 0 && stagesWithResults.rows.length > 0) {
      for (const stage of stagesWithResults.rows) {
        // Get stage results for these riders
        const stageResultsQuery = `
          SELECT rider_id, position
          FROM stage_results
          WHERE stage_id = $1 AND rider_id = ANY($2::int[])
        `;
        const stageResults = await client.query(stageResultsQuery, [stage.id, riderIds]);
        
        // Get jersey wearers for this stage
        const jerseyWearersQuery = `
          SELECT 
            sjw.rider_id,
            j.type as jersey_type
          FROM stage_jersey_wearers sjw
          JOIN jerseys j ON sjw.jersey_id = j.id
          WHERE sjw.stage_id = $1 AND sjw.rider_id = ANY($2::int[])
        `;
        const jerseyWearers = await client.query(jerseyWearersQuery, [stage.id, riderIds]);
        
        // Calculate points for each rider in this stage
        stageResults.rows.forEach(result => {
          const currentPoints = riderPointsMap.get(result.rider_id) || 0;
          const positionPoints = positionPointsMap.get(result.position) || 0;
          riderPointsMap.set(result.rider_id, currentPoints + positionPoints);
        });
        
        jerseyWearers.rows.forEach(wearer => {
          const currentPoints = riderPointsMap.get(wearer.rider_id) || 0;
          const jerseyPoints = jerseyPointsMap.get(wearer.jersey_type) || 0;
          riderPointsMap.set(wearer.rider_id, currentPoints + jerseyPoints);
        });
      }
    }
    
    const riders = ridersResult.rows.map(row => ({
      id: row.id,
      firstName: row.first_name,
      lastName: row.last_name,
      photoUrl: row.photo_url,
      teamName: row.team_name || 'Onbekend team',
      slotType: row.slot_type,
      slotNumber: row.slot_number,
      jerseys: riderJerseyMap.get(row.id) || [],
      totalPoints: riderPointsMap.get(row.id) || 0
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
          mainRiders: riders.filter(r => r.slotType === 'main'),
          reserveRiders: riders.filter(r => r.slotType === 'reserve'),
          totalPoints: totalPoints,
          rank: rank
        }
      })
    };
  } catch (err) {
    return await handleDbError(err, client);
  }
};

