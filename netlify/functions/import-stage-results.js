const { getDbClient, handleDbError, missingDbConfigResponse } = require('./_shared/db');
const { calculateCumulativePoints } = require('./calculate-cumulative-points');

// Helper function to calculate stage points (shared with calculate-stage-points.js)
async function calculateStagePoints(client, stageId) {
  if (!client) {
    throw new Error('Database client is not available');
  }
  
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
  

  // Step 2: Get all stage results for this stage
  const stageResults = await client.query(
    `SELECT rider_id, position 
     FROM stage_results 
     WHERE stage_id = $1 
     ORDER BY position`,
    [stageId]
  );
  

  // Step 3: Get all fantasy teams with their riders
  const fantasyTeams = await client.query(
    `SELECT 
       ft.id as fantasy_team_id,
       ft.participant_id,
       ftr.rider_id,
       ftr.slot_type,
       ftr.active
     FROM fantasy_teams ft
     JOIN fantasy_team_riders ftr ON ft.id = ftr.fantasy_team_id
     WHERE ftr.active = true`
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
  
  
  if (participantTeamsMap.size === 0) {
    console.warn('WARNING: No fantasy teams found with active riders! Points will be 0 for all participants.');
  }

  // Calculate points for each participant
  const participantPoints = new Map();

  participantTeamsMap.forEach((teams, participantId) => {
    let pointsStage = 0;
    let pointsJerseys = 0;

    // Calculate points from stage positions
    teams.forEach(team => {
      const stageResult = stageResults.rows.find(sr => sr.rider_id === team.rider_id);
      if (stageResult) {
        const positionPoints = positionPointsMap.get(stageResult.position) || 0;
        pointsStage += positionPoints;
      }
    });

    // Calculate points from jerseys
    teams.forEach(team => {
      const jerseyPoints = riderJerseyPointsMap.get(team.rider_id) || 0;
      pointsJerseys += jerseyPoints;
    });

    participantPoints.set(participantId, {
      points_stage: pointsStage,
      points_jerseys: pointsJerseys,
      points_bonus: 0 // Can be extended later
    });
  });

  // Step 6: Insert or update fantasy_stage_points
  
  let insertedCount = 0;
  for (const [participantId, points] of participantPoints) {
    try {
      const result = await client.query(
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
      insertedCount++;
    } catch (insertError) {
      console.error(`  ✗ Failed to insert points for participant ${participantId}:`, insertError.message);
      throw insertError;
    }
  }
  
  // Also create entries for participants without teams (with 0 points)
  const allParticipants = await client.query('SELECT id FROM participants');
  
  let participantsWithoutTeams = 0;
  for (const participant of allParticipants.rows) {
    if (!participantPoints.has(participant.id)) {
      participantsWithoutTeams++;
      try {
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
      } catch (insertError) {
        console.error(`Failed to insert 0 points for participant ${participant.id}:`, insertError.message);
        throw insertError;
      }
    }
  }
  

  return { participantsCalculated: participantPoints.size };
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
      body = JSON.parse(event.body);
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
    const results = body.results; // Array of {position, riderId, timeSeconds}


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

    if (!Array.isArray(results) || results.length === 0) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ok: false,
          error: 'results must be a non-empty array'
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

    // Check if results already exist for this stage
    const existingResultsCheck = await client.query(
      'SELECT COUNT(*) as count FROM stage_results WHERE stage_id = $1',
      [stageId]
    );
    const existingCount = parseInt(existingResultsCheck.rows[0].count, 10);
    const hasExistingResults = existingCount > 0;

    // Begin transaction
    await client.query('BEGIN');

    try {
      // Delete existing results for this stage
      await client.query('DELETE FROM stage_results WHERE stage_id = $1', [stageId]);

      // Calculate same_time_group based on time_seconds
      // Group results by time_seconds and assign group numbers
      const timeGroupMap = new Map(); // Maps time_seconds value to group number
      let currentGroupNumber = 1;
      
      // First pass: assign group numbers by time_seconds
      // Sort by time_seconds (nulls last) and position for consistent grouping
      const sortedResults = [...results].sort((a, b) => {
        if (a.timeSeconds === null && b.timeSeconds === null) {
          return a.position - b.position;
        }
        if (a.timeSeconds === null) return 1;
        if (b.timeSeconds === null) return -1;
        if (a.timeSeconds !== b.timeSeconds) {
          return a.timeSeconds - b.timeSeconds;
        }
        return a.position - b.position;
      });

      // Assign group numbers (similar to DENSE_RANK)
      // All null times get the same group (highest group number)
      let nullTimeGroup = null;
      
      sortedResults.forEach(result => {
        if (result.timeSeconds === null) {
          // All null times share the same group
          if (nullTimeGroup === null) {
            nullTimeGroup = currentGroupNumber++;
          }
        } else {
          // Group by time_seconds value
          if (!timeGroupMap.has(result.timeSeconds)) {
            timeGroupMap.set(result.timeSeconds, currentGroupNumber++);
          }
        }
      });

      // Insert results with same_time_group
      for (const result of results) {
        const sameTimeGroup = result.timeSeconds === null 
          ? nullTimeGroup
          : timeGroupMap.get(result.timeSeconds);

        await client.query(
          `INSERT INTO stage_results (stage_id, rider_id, position, time_seconds, same_time_group)
           VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT (stage_id, rider_id)
           DO UPDATE SET
             position = EXCLUDED.position,
             time_seconds = EXCLUDED.time_seconds,
             same_time_group = EXCLUDED.same_time_group`,
          [stageId, result.riderId, result.position, result.timeSeconds, sameTimeGroup]
        );
      }

      // Commit transaction
      await client.query('COMMIT');
      
      // Calculate fantasy stage points after importing results
      // This is done after commit to avoid long-running transactions
      let pointsCalculated = false;
      let pointsError = null;
      let participantsCalculated = 0;
      
      try {
        const pointsResult = await calculateStagePoints(client, stageId);
        pointsCalculated = true;
        participantsCalculated = pointsResult.participantsCalculated;
        
        // Verify that points were actually inserted
        const verifyQuery = await client.query(
          'SELECT COUNT(*) as count FROM fantasy_stage_points WHERE stage_id = $1',
          [stageId]
        );
        const actualCount = parseInt(verifyQuery.rows[0].count, 10);
        
        if (actualCount === 0) {
          console.warn('WARNING: Points calculation reported success but no entries were created!');
        }
        
        // Calculate cumulative points and rankings after stage points are calculated
        try {
          await calculateCumulativePoints(client, stageId);
        } catch (cumulativeErr) {
          console.error('Error calculating cumulative points:', cumulativeErr);
          // Don't fail the import if cumulative points calculation fails
        }
        
      } catch (err) {
        // Don't fail the import if points calculation fails, but log the error thoroughly
        pointsError = err;
        console.error('=== POINTS CALCULATION FAILED ===');
        console.error('Stage ID:', stageId);
        console.error('Error message:', err.message);
        console.error('Error stack:', err.stack);
        console.error('Error name:', err.name);
        console.error('Error code:', err.code);
        console.error('Error detail:', err.detail);
        console.error('Error hint:', err.hint);
        console.error('Full error object:', JSON.stringify(err, Object.getOwnPropertyNames(err)));
      }
      
      await client.end();

      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({
          ok: true,
          message: 'Stage results imported successfully',
          count: results.length,
          replacedExisting: hasExistingResults,
          existingCount: existingCount,
          pointsCalculated: pointsCalculated,
          participantsCalculated: participantsCalculated,
          pointsError: pointsError ? pointsError.message : null
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




