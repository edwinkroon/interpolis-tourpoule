const { getDbClient, handleDbError, missingDbConfigResponse } = require('./_shared/db');

exports.handler = async function(event) {
  let client;
  try {
    if (!process.env.NEON_DATABASE_URL) {
      return missingDbConfigResponse();
    }

    // Get user_id from query string (passed from frontend)
    const userId = event.queryStringParameters?.userId;
    
    if (!userId) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ok: false,
          error: 'userId parameter is required'
        })
      };
    }
    const stageNumber = event.queryStringParameters?.stage_number;

    if (!stageNumber) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ok: false,
          error: 'stage_number is required'
        })
      };
    }

    client = await getDbClient();

    // Get participant
    const participantResult = await client.query(
      'SELECT id FROM participants WHERE user_id = $1',
      [userId]
    );

    if (participantResult.rows.length === 0) {
      await client.end();
      return {
        statusCode: 404,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ok: false,
          error: 'Participant not found'
        })
      };
    }

    const participantId = participantResult.rows[0].id;

    // Get stage ID, status, and check if it's the final stage (all in one query for performance)
    const stageResult = await client.query(
      `SELECT 
         s.id,
         s.stage_number,
         s.is_neutralized,
         s.is_cancelled,
         (SELECT MAX(stage_number) FROM stages) as max_stage_number
       FROM stages s
       WHERE s.stage_number = $1`,
      [stageNumber]
    );

    if (stageResult.rows.length === 0) {
      await client.end();
      return {
        statusCode: 404,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ok: false,
          error: 'Stage not found'
        })
      };
    }

    const stageRow = stageResult.rows[0];
    const stageId = stageRow.id;
    const isNeutralized = stageRow.is_neutralized || false;
    const isCancelled = stageRow.is_cancelled || false;
    
    // BUSINESS RULE 9: Check if this is the final stage
    // If it is, no jersey points should be awarded for this stage
    const isFinal = stageRow.max_stage_number && 
                    stageRow.stage_number === stageRow.max_stage_number;

    // BUSINESS RULE: If stage is cancelled, return empty results (no points awarded)
    if (isCancelled) {
      await client.end();
      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({
          ok: true,
          riders: [],
          totalPoints: 0
        })
      };
    }

    // Get scoring rules
    const scoringRules = await client.query(
      `SELECT rule_type, condition_json, points 
       FROM scoring_rules 
       WHERE rule_type = 'stage_position'`
    );

    const positionPointsMap = new Map();
    scoringRules.rows.forEach(rule => {
      const condition = rule.condition_json;
      if (condition && condition.position) {
        positionPointsMap.set(condition.position, rule.points);
      }
    });

    // Get jersey rules
    const jerseyRules = await client.query(
      `SELECT rule_type, condition_json, points 
       FROM scoring_rules 
       WHERE rule_type = 'jersey'`
    );

    const jerseyPointsMap = new Map();
    jerseyRules.rows.forEach(rule => {
      const condition = rule.condition_json;
      if (condition && condition.jersey_type) {
        jerseyPointsMap.set(condition.jersey_type, rule.points);
      }
    });

    // Get jersey wearers for this stage
    const jerseyWearers = await client.query(
      `SELECT 
         sjw.rider_id,
         j.type as jersey_type
       FROM stage_jersey_wearers sjw
       JOIN jerseys j ON sjw.jersey_id = j.id
       WHERE sjw.stage_id = $1`,
      [stageId]
    );

    const riderJerseyPointsMap = new Map();
    jerseyWearers.rows.forEach(jersey => {
      const points = jerseyPointsMap.get(jersey.jersey_type) || 0;
      riderJerseyPointsMap.set(jersey.rider_id, points);
    });

    // Get user's fantasy team riders
    // BUSINESS RULE: Only main riders (slot_type = 'main') can earn points
    const teamRidersResult = await client.query(
      `SELECT 
         r.id as rider_id,
         r.first_name,
         r.last_name,
         tp.name as team_name,
         sr.position,
         sr.time_seconds
       FROM fantasy_teams ft
       JOIN fantasy_team_riders ftr ON ft.id = ftr.fantasy_team_id
       JOIN riders r ON ftr.rider_id = r.id
       LEFT JOIN teams_pro tp ON r.team_pro_id = tp.id
       LEFT JOIN stage_results sr ON sr.rider_id = r.id AND sr.stage_id = $1
       WHERE ft.participant_id = $2
         AND ftr.active = true
         AND ftr.slot_type = 'main'
       ORDER BY sr.position NULLS LAST, r.last_name, r.first_name`,
      [stageId, participantId]
    );

    // Calculate points for each rider
    // BUSINESS RULE 11: If stage is neutralized, no stage position points are awarded
    // BUSINESS RULE: If stage is cancelled, no points are awarded (handled by returning empty results)
    const ridersWithPoints = teamRidersResult.rows.map(rider => {
      let points = 0;
      let pointsBreakdown = {
        position: 0,
        jersey: 0
      };

      // Points from position (only if stage is not neutralized)
      if (!isNeutralized && rider.position) {
        pointsBreakdown.position = positionPointsMap.get(rider.position) || 0;
        points += pointsBreakdown.position;
      }

      // Points from jersey (still awarded even if neutralized, but not if cancelled or final stage)
      // BUSINESS RULE 9: No jersey points on final stage
      if (!isCancelled && !isFinal) {
        const jerseyPoints = riderJerseyPointsMap.get(rider.rider_id) || 0;
        pointsBreakdown.jersey = jerseyPoints;
        points += jerseyPoints;
      }

      return {
        id: rider.rider_id,
        name: `${rider.first_name || ''} ${rider.last_name || ''}`.trim(),
        team: rider.team_name || 'Onbekend team',
        position: rider.position || null,
        points: points,
        pointsBreakdown: pointsBreakdown
      };
    });

    // Calculate total points
    const totalPoints = ridersWithPoints.reduce((sum, rider) => sum + rider.points, 0);

    await client.end();

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        ok: true,
        riders: ridersWithPoints,
        totalPoints: totalPoints
      })
    };
  } catch (err) {
    return await handleDbError(err, client);
  }
};


