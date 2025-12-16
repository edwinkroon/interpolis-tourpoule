const { getDbClient, handleDbError, missingDbConfigResponse } = require('./_shared/db');

// Helper function to check if a stage is the final stage
async function isFinalStage(client, stageId) {
  // Get the stage number of the current stage
  const currentStageQuery = await client.query(
    'SELECT stage_number FROM stages WHERE id = $1',
    [stageId]
  );
  
  if (currentStageQuery.rows.length === 0) {
    return false;
  }
  
  const currentStageNumber = currentStageQuery.rows[0].stage_number;
  
  // Get the highest stage number in the database
  const maxStageQuery = await client.query(
    'SELECT MAX(stage_number) as max_stage FROM stages'
  );
  
  if (maxStageQuery.rows.length === 0 || !maxStageQuery.rows[0].max_stage) {
    return false;
  }
  
  const maxStageNumber = maxStageQuery.rows[0].max_stage;
  
  return currentStageNumber === maxStageNumber;
}

// Helper function to calculate stage points (shared with import-stage-results.js)
async function calculateStagePoints(client, stageId) {
  // BUSINESS RULE 9: Check if this is the final stage
  // If it is, no jersey points should be awarded for this stage
  const isFinal = await isFinalStage(client, stageId);
  
  // Step 1: Get all scoring rules for stage positions
  const scoringRules = await client.query(
    `SELECT rule_type, condition_json, points 
     FROM scoring_rules 
     WHERE rule_type = 'stage_position'`
  );

  // Create a map of position -> points
  const positionPointsMap = new Map();
  scoringRules.rows.forEach(rule => {
    const condition = rule.condition_json;
    if (condition && condition.position) {
      positionPointsMap.set(condition.position, rule.points);
    }
  });

  // Check if stage is neutralized or cancelled - if so, return 0 points for all
  const stageCheck = await client.query(
    'SELECT is_neutralized, is_cancelled FROM stages WHERE id = $1',
    [stageId]
  );
  
  if (stageCheck.rows.length > 0) {
    const stage = stageCheck.rows[0];
    if (stage.is_cancelled) {
      // Stage is cancelled - no points should be awarded
      // Still create entries with 0 points for all participants
      const allParticipants = await client.query('SELECT id FROM participants');
      for (const participant of allParticipants.rows) {
        await client.query(
          `INSERT INTO fantasy_stage_points 
           (stage_id, participant_id, points_stage, points_jerseys, points_bonus)
           VALUES ($1, $2, 0, 0, 0)
           ON CONFLICT (stage_id, participant_id)
           DO UPDATE SET
             points_stage = 0,
             points_jerseys = 0,
             points_bonus = 0`,
          [stageId, participant.id]
        );
      }
      return { participantsCalculated: allParticipants.rows.length };
    }
    // If neutralized, jersey points are still awarded but stage position points are not
    // This is handled below
  }

  // Step 2: Get all stage results for this stage
  const stageResults = await client.query(
    `SELECT rider_id, position 
     FROM stage_results 
     WHERE stage_id = $1 
     ORDER BY position`,
    [stageId]
  );

  // Step 3: Get all fantasy teams with their riders
  // BUSINESS RULE: Only main riders (slot_type = 'main') can earn points
  const fantasyTeams = await client.query(
    `SELECT 
       ft.id as fantasy_team_id,
       ft.participant_id,
       ftr.rider_id,
       ftr.slot_type,
       ftr.active
     FROM fantasy_teams ft
     JOIN fantasy_team_riders ftr ON ft.id = ftr.fantasy_team_id
     WHERE ftr.active = true
       AND ftr.slot_type = 'main'`
  );

  // Step 4: Get jersey wearers for this stage and their points
  const jerseyRules = await client.query(
    `SELECT rule_type, condition_json, points 
     FROM scoring_rules 
     WHERE rule_type = 'jersey'`
  );

  // Create a map of jersey type -> points
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

  // Create a map of rider_id -> jersey points
  const riderJerseyPointsMap = new Map();
  jerseyWearers.rows.forEach(jersey => {
    const points = jerseyPointsMap.get(jersey.jersey_type) || 0;
    riderJerseyPointsMap.set(jersey.rider_id, points);
  });

  // Step 5: Calculate points per participant
  // Group fantasy teams by participant
  const participantTeamsMap = new Map();
  fantasyTeams.rows.forEach(team => {
    if (!participantTeamsMap.has(team.participant_id)) {
      participantTeamsMap.set(team.participant_id, []);
    }
    participantTeamsMap.get(team.participant_id).push(team);
  });

  // Calculate points for each participant
  const participantPoints = new Map();

  participantTeamsMap.forEach((teams, participantId) => {
    let pointsStage = 0;
    let pointsJerseys = 0;

    // Calculate points from stage positions
    // BUSINESS RULE 11: If stage is neutralized, no stage position points are awarded
    const isNeutralized = stageCheck.rows.length > 0 && stageCheck.rows[0].is_neutralized;
    if (!isNeutralized) {
      teams.forEach(team => {
        const stageResult = stageResults.rows.find(sr => sr.rider_id === team.rider_id);
        if (stageResult) {
          const positionPoints = positionPointsMap.get(stageResult.position) || 0;
          pointsStage += positionPoints;
        }
      });
    }

    // Calculate points from jerseys
    // BUSINESS RULE 9: No jersey points on final stage
    if (!isFinal) {
      teams.forEach(team => {
        const jerseyPoints = riderJerseyPointsMap.get(team.rider_id) || 0;
        pointsJerseys += jerseyPoints;
      });
    }

    participantPoints.set(participantId, {
      points_stage: pointsStage,
      points_jerseys: pointsJerseys,
      points_bonus: 0 // Can be extended later
    });
  });

  // Step 6: Insert or update fantasy_stage_points
  for (const [participantId, points] of participantPoints) {
    await client.query(
      `INSERT INTO fantasy_stage_points 
       (stage_id, participant_id, points_stage, points_jerseys, points_bonus)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (stage_id, participant_id)
       DO UPDATE SET
         points_stage = EXCLUDED.points_stage,
         points_jerseys = EXCLUDED.points_jerseys,
         points_bonus = EXCLUDED.points_bonus`,
      [stageId, participantId, points.points_stage, points.points_jerseys, points.points_bonus]
    );
  }

  // Also create entries for participants without teams (with 0 points)
  const allParticipants = await client.query('SELECT id FROM participants');
  for (const participant of allParticipants.rows) {
    if (!participantPoints.has(participant.id)) {
      await client.query(
        `INSERT INTO fantasy_stage_points 
         (stage_id, participant_id, points_stage, points_jerseys, points_bonus)
         VALUES ($1, $2, 0, 0, 0)
         ON CONFLICT (stage_id, participant_id)
         DO UPDATE SET
           points_stage = 0,
           points_jerseys = 0,
           points_bonus = 0`,
        [stageId, participant.id]
      );
    }
  }

  return { participantsCalculated: participantPoints.size };
}

exports.handler = async function(event) {
  let client;
  try {
    if (!process.env.NEON_DATABASE_URL) {
      return missingDbConfigResponse();
    }

    let body;
    try {
      body = JSON.parse(event.body || '{}');
    } catch (e) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ok: false,
          error: 'Invalid JSON in request body'
        })
      };
    }

    const stageId = body.stageId;

    if (!stageId) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ok: false,
          error: 'stageId is required'
        })
      };
    }

    client = await getDbClient();

    // Verify stage exists
    const stageCheck = await client.query('SELECT id, stage_number, name FROM stages WHERE id = $1', [stageId]);
    if (stageCheck.rows.length === 0) {
      await client.end();
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ok: false,
          error: `Stage with id ${stageId} does not exist`
        })
      };
    }

    // Begin transaction
    await client.query('BEGIN');

    try {
      const result = await calculateStagePoints(client, stageId);

      // Commit transaction
      await client.query('COMMIT');
      await client.end();

      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({
          ok: true,
          message: 'Stage points calculated successfully',
          participantsCalculated: result.participantsCalculated
        })
      };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    }
  } catch (err) {
    // Try to rollback if in transaction
    if (client) {
      try {
        await client.query('ROLLBACK');
      } catch (rollbackErr) {
        // Transaction might already be aborted, that's ok
      }
    }
    return await handleDbError(err, client);
  }
};

// Export for testing
module.exports.calculateStagePoints = calculateStagePoints;
module.exports.isFinalStage = isFinalStage;

