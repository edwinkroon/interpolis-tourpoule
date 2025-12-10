const { getDbClient, handleDbError, missingDbConfigResponse } = require('./_shared/db');

// Helper function to check if a stage is the final stage
async function isFinalStage(client, stageId) {
  const currentStageQuery = await client.query(
    'SELECT stage_number FROM stages WHERE id = $1',
    [stageId]
  );
  
  if (currentStageQuery.rows.length === 0) {
    return false;
  }
  
  const currentStageNumber = currentStageQuery.rows[0].stage_number;
  
  const maxStageQuery = await client.query(
    'SELECT MAX(stage_number) as max_stage FROM stages'
  );
  
  if (maxStageQuery.rows.length === 0 || !maxStageQuery.rows[0].max_stage) {
    return false;
  }
  
  const maxStageNumber = maxStageQuery.rows[0].max_stage;
  
  return currentStageNumber === maxStageNumber;
}

// Calculate final classification points (eindklassement)
// This should be called after the final stage results are imported
async function calculateFinalPoints(client, finalStageId) {
  // Verify this is actually the final stage
  const isFinal = await isFinalStage(client, finalStageId);
  if (!isFinal) {
    throw new Error('This function can only be called for the final stage');
  }
  
  // Step 1: Get final classification scoring rules
  const finalClassificationRules = await client.query(
    `SELECT rule_type, condition_json, points 
     FROM scoring_rules 
     WHERE rule_type = 'final_classification'`
  );
  
  const finalPositionPointsMap = new Map();
  finalClassificationRules.rows.forEach(rule => {
    const condition = rule.condition_json;
    if (condition && condition.position) {
      finalPositionPointsMap.set(condition.position, rule.points);
    }
  });
  
  // Step 2: Get final classification (general classification after final stage)
  // NOTE: The final classification should be based on cumulative time across all stages.
  // For now, we use the position from the final stage as a proxy for the final classification.
  // In a production system, you would need to:
  // 1. Calculate cumulative time for each rider across all stages
  // 2. Rank riders by cumulative time
  // 3. Use that ranking for final classification points
  // 
  // For this implementation, we assume the final stage position reflects the general classification.
  // This is a reasonable approximation if the final stage is a time trial or if positions are stable.
  const finalStageResults = await client.query(
    `SELECT rider_id, position 
     FROM stage_results 
     WHERE stage_id = $1 
     ORDER BY position`,
    [finalStageId]
  );
  
  // Step 3: Get all fantasy teams with their riders (only main riders)
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
  
  // Step 4: Calculate final classification points per participant
  const participantTeamsMap = new Map();
  fantasyTeams.rows.forEach(team => {
    if (!participantTeamsMap.has(team.participant_id)) {
      participantTeamsMap.set(team.participant_id, []);
    }
    participantTeamsMap.get(team.participant_id).push(team);
  });
  
  const participantFinalPoints = new Map();
  
  participantTeamsMap.forEach((teams, participantId) => {
    let pointsFinal = 0;
    
    // Calculate points from final classification positions
    teams.forEach(team => {
      const finalResult = finalStageResults.rows.find(sr => sr.rider_id === team.rider_id);
      if (finalResult) {
        const positionPoints = finalPositionPointsMap.get(finalResult.position) || 0;
        pointsFinal += positionPoints;
      }
    });
    
    participantFinalPoints.set(participantId, pointsFinal);
  });
  
  // Step 5: Add final classification points to fantasy_stage_points for the final stage
  for (const [participantId, points] of participantFinalPoints) {
    // Update existing entry or create new one
    await client.query(
      `INSERT INTO fantasy_stage_points 
       (stage_id, participant_id, points_stage, points_jerseys, points_bonus)
       VALUES ($1, $2, 
         COALESCE((SELECT points_stage FROM fantasy_stage_points WHERE stage_id = $1 AND participant_id = $2), 0),
         COALESCE((SELECT points_jerseys FROM fantasy_stage_points WHERE stage_id = $1 AND participant_id = $2), 0),
         $3)
       ON CONFLICT (stage_id, participant_id)
       DO UPDATE SET
         points_bonus = EXCLUDED.points_bonus + COALESCE(fantasy_stage_points.points_bonus, 0)`,
      [finalStageId, participantId, points]
    );
  }
  
  return { participantsCalculated: participantFinalPoints.size };
}

// Calculate final jersey standings points (eindstanden truien)
// This should be called after the final stage results are imported
async function calculateFinalJerseyPoints(client, finalStageId) {
  // Verify this is actually the final stage
  const isFinal = await isFinalStage(client, finalStageId);
  if (!isFinal) {
    throw new Error('This function can only be called for the final stage');
  }
  
  // Step 1: Get final jersey standings scoring rules
  const finalJerseyRules = await client.query(
    `SELECT rule_type, condition_json, points 
     FROM scoring_rules 
     WHERE rule_type = 'final_jersey'`
  );
  
  // Create maps: jersey_type -> position -> points
  const finalJerseyPointsMap = new Map();
  finalJerseyRules.rows.forEach(rule => {
    const condition = rule.condition_json;
    if (condition && condition.jersey_type && condition.position) {
      const key = `${condition.jersey_type}_${condition.position}`;
      finalJerseyPointsMap.set(key, rule.points);
    }
  });
  
  // Step 2: Get final jersey standings (who wears the jersey after final stage)
  // For groen, bolletjes, and wit jerseys, we need the final standings (positions 1-3)
  // The final jersey wearers are those wearing the jersey after the final stage (position 1)
  const finalJerseyWearers = await client.query(
    `SELECT 
       sjw.rider_id,
       j.type as jersey_type
     FROM stage_jersey_wearers sjw
     JOIN jerseys j ON sjw.jersey_id = j.id
     WHERE sjw.stage_id = $1
       AND j.type IN ('groen', 'bolletjes', 'wit')`,
    [finalStageId]
  );
  
  // NOTE: For final standings, we need positions 1-3 for each jersey type.
  // Currently, we only have the jersey wearer (position 1) from stage_jersey_wearers.
  // Positions 2 and 3 would need to come from the final standings of each jersey classification.
  // 
  // In a production system, you would need to:
  // 1. Query or calculate the final standings for each jersey classification (groen, bolletjes, wit)
  // 2. Get positions 1, 2, and 3 for each classification
  // 3. Award points accordingly
  //
  // For now, we only award points for position 1 (the jersey wearer).
  
  // Step 3: Get all fantasy teams with their riders (only main riders)
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
  
  // Step 4: Calculate final jersey points per participant
  const participantTeamsMap = new Map();
  fantasyTeams.rows.forEach(team => {
    if (!participantTeamsMap.has(team.participant_id)) {
      participantTeamsMap.set(team.participant_id, []);
    }
    participantTeamsMap.get(team.participant_id).push(team);
  });
  
  const participantFinalJerseyPoints = new Map();
  
  participantTeamsMap.forEach((teams, participantId) => {
    let pointsFinalJerseys = 0;
    
    // For each jersey type (groen, bolletjes, wit), check if team riders are in top 3
    // For now, we only have position 1 (the jersey wearer)
    // TODO: In a real implementation, you would need to get positions 2 and 3 from final standings
    teams.forEach(team => {
      finalJerseyWearers.rows.forEach(jersey => {
        if (jersey.rider_id === team.rider_id) {
          // Position 1 (jersey wearer)
          const key = `${jersey.jersey_type}_1`;
          const points = finalJerseyPointsMap.get(key) || 0;
          pointsFinalJerseys += points;
        }
      });
    });
    
    participantFinalJerseyPoints.set(participantId, pointsFinalJerseys);
  });
  
  // Step 5: Add final jersey points to fantasy_stage_points for the final stage
  for (const [participantId, points] of participantFinalJerseyPoints) {
    // Update existing entry
    await client.query(
      `UPDATE fantasy_stage_points
       SET points_bonus = COALESCE(points_bonus, 0) + $1
       WHERE stage_id = $2 AND participant_id = $3`,
      [points, finalStageId, participantId]
    );
  }
  
  return { participantsCalculated: participantFinalJerseyPoints.size };
}

// Main function to calculate all final points
async function calculateAllFinalPoints(client, finalStageId) {
  const finalClassificationResult = await calculateFinalPoints(client, finalStageId);
  const finalJerseyResult = await calculateFinalJerseyPoints(client, finalStageId);
  
  return {
    finalClassification: finalClassificationResult,
    finalJerseys: finalJerseyResult
  };
}

exports.handler = async function(event) {
  if (event.httpMethod !== 'POST') {
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

    const finalStageId = body.finalStageId;

    if (!finalStageId) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ok: false,
          error: 'finalStageId is required'
        })
      };
    }

    client = await getDbClient();

    // Verify stage exists and is final
    const stageCheck = await client.query('SELECT id, stage_number FROM stages WHERE id = $1', [finalStageId]);
    if (stageCheck.rows.length === 0) {
      await client.end();
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ok: false,
          error: `Stage with id ${finalStageId} does not exist`
        })
      };
    }

    const isFinal = await isFinalStage(client, finalStageId);
    if (!isFinal) {
      await client.end();
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ok: false,
          error: 'This function can only be called for the final stage'
        })
      };
    }

    // Begin transaction
    await client.query('BEGIN');

    try {
      const result = await calculateAllFinalPoints(client, finalStageId);

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
          message: 'Final points calculated successfully',
          ...result
        })
      };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    }
  } catch (err) {
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

// Export helper functions for use in other modules
exports.calculateFinalPoints = calculateFinalPoints;
exports.calculateFinalJerseyPoints = calculateFinalJerseyPoints;
exports.calculateAllFinalPoints = calculateAllFinalPoints;
exports.isFinalStage = isFinalStage;

