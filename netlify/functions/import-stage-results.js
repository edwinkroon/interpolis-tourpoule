const { getDbClient, handleDbError, missingDbConfigResponse } = require('./_shared/db');
const { calculateCumulativePoints } = require('./calculate-cumulative-points');
const { calculateAllFinalPoints } = require('./calculate-final-points');

// BUSINESS RULE: Activate reserve riders when main riders drop out
// This function checks which main riders are no longer in stage results
// and automatically activates the first reserve rider to take their place
async function activateReservesForDroppedRiders(client, stageId) {
  // Get all active main riders from all fantasy teams
  const mainRidersQuery = await client.query(`
    SELECT 
      ftr.id,
      ftr.fantasy_team_id,
      ftr.rider_id,
      ftr.slot_number,
      ft.participant_id
    FROM fantasy_team_riders ftr
    JOIN fantasy_teams ft ON ftr.fantasy_team_id = ft.id
    WHERE ftr.slot_type = 'main'
      AND ftr.active = true
    ORDER BY ft.participant_id, ftr.slot_number
  `);
  
  // Get all riders that finished this stage (are in stage_results)
  const finishedRidersQuery = await client.query(`
    SELECT DISTINCT rider_id
    FROM stage_results
    WHERE stage_id = $1
  `, [stageId]);
  
  const finishedRiderIds = new Set(finishedRidersQuery.rows.map(r => r.rider_id));
  
  // Group main riders by fantasy team
  const teamMainRidersMap = new Map();
  mainRidersQuery.rows.forEach(rider => {
    if (!teamMainRidersMap.has(rider.fantasy_team_id)) {
      teamMainRidersMap.set(rider.fantasy_team_id, []);
    }
    teamMainRidersMap.get(rider.fantasy_team_id).push(rider);
  });
  
  // For each fantasy team, check for dropped main riders and activate reserves
  for (const [fantasyTeamId, mainRiders] of teamMainRidersMap) {
    const droppedMainRiders = mainRiders.filter(rider => !finishedRiderIds.has(rider.rider_id));
    
    if (droppedMainRiders.length > 0) {
      // Get available reserve riders for this team, ordered by slot_number
      const reserveRidersQuery = await client.query(`
        SELECT 
          id,
          rider_id,
          slot_number
        FROM fantasy_team_riders
        WHERE fantasy_team_id = $1
          AND slot_type = 'reserve'
          AND active = true
        ORDER BY slot_number ASC
      `, [fantasyTeamId]);
      
      const availableReserves = reserveRidersQuery.rows;
      
      // STEP 1: First, deactivate ALL dropped main riders
      for (const droppedMain of droppedMainRiders) {
        await client.query(`
          UPDATE fantasy_team_riders
          SET active = false
          WHERE id = $1
        `, [droppedMain.id]);
      }
      
      // STEP 2: Then, activate reserves to replace dropped main riders
      // We need to be careful about unique constraint on (fantasy_team_id, slot_type, slot_number)
      for (let i = 0; i < droppedMainRiders.length && i < availableReserves.length; i++) {
        const droppedMain = droppedMainRiders[i];
        const reserveToActivate = availableReserves[i];
        
        // Check if the slot is already occupied by another active main rider
        // (This shouldn't happen after deactivating dropped riders, but let's be safe)
        const slotCheck = await client.query(`
          SELECT id FROM fantasy_team_riders
          WHERE fantasy_team_id = $1
            AND slot_type = 'main'
            AND slot_number = $2
            AND active = true
            AND id != $3
        `, [fantasyTeamId, droppedMain.slot_number, droppedMain.id]);
        
        if (slotCheck.rows.length > 0) {
          console.warn(`Slot ${droppedMain.slot_number} is already occupied for team ${fantasyTeamId}, skipping reserve activation`);
          continue;
        }
        
        try {
          // Temporarily set the reserve's slot_number to a high value to avoid unique constraint conflicts
          await client.query(`
            UPDATE fantasy_team_riders
            SET slot_number = 999
            WHERE id = $1
          `, [reserveToActivate.id]);
          
          // Now update to the correct slot
          const updateResult = await client.query(`
            UPDATE fantasy_team_riders
            SET slot_type = 'main',
                slot_number = $1,
                active = true
            WHERE id = $2
          `, [droppedMain.slot_number, reserveToActivate.id]);
          
          if (updateResult.rowCount === 0) {
            console.warn(`Failed to update reserve rider ${reserveToActivate.id} - no rows affected`);
            // Revert slot_number change
            await client.query(`
              UPDATE fantasy_team_riders
              SET slot_number = $1
              WHERE id = $2
            `, [reserveToActivate.slot_number, reserveToActivate.id]);
            continue;
          }
          
          console.log(`Activated reserve rider ${reserveToActivate.rider_id} to replace dropped main rider ${droppedMain.rider_id} in slot ${droppedMain.slot_number} for team ${fantasyTeamId}`);
        } catch (updateError) {
          // If we get a unique constraint violation, log it and continue
          if (updateError.code === '23505') { // PostgreSQL unique violation
            console.error(`Unique constraint violation when activating reserve ${reserveToActivate.id} to slot ${droppedMain.slot_number} for team ${fantasyTeamId}:`, updateError.message);
            // Try to revert the slot_number change
            try {
              await client.query(`
                UPDATE fantasy_team_riders
                SET slot_number = $1
                WHERE id = $2
              `, [reserveToActivate.slot_number, reserveToActivate.id]);
            } catch (revertError) {
              console.error(`Failed to revert slot_number for reserve ${reserveToActivate.id}:`, revertError.message);
              // If revert fails, we need to rollback the transaction
              throw new Error(`Failed to activate reserve and revert failed: ${revertError.message}`);
            }
            continue;
          }
          // Check if transaction is aborted
          if (updateError.code === '25P02') {
            // Transaction is aborted, we can't continue
            throw updateError;
          }
          // For other errors, rethrow
          throw updateError;
        }
      }
    }
  }
}

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

// Helper function to calculate stage points (shared with calculate-stage-points.js)
async function calculateStagePoints(client, stageId) {
  if (!client) {
    throw new Error('Database client is not available');
  }
  
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
  

  // Check if stage is cancelled - if so, return early (no points calculation needed)
  const stageCheck = await client.query(
    'SELECT is_neutralized, is_cancelled FROM stages WHERE id = $1',
    [stageId]
  );
  
  if (stageCheck.rows.length > 0 && stageCheck.rows[0].is_cancelled) {
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
  
  
  if (participantTeamsMap.size === 0) {
    console.warn('WARNING: No fantasy teams found with active riders! Points will be 0 for all participants.');
  }

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
    const jerseys = body.jerseys || []; // Array of {jerseyType, jerseyId, riderId}


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
      // FIRST: Import jerseys if provided (before results)
      if (jerseys && jerseys.length > 0) {
        // Delete existing jersey wearers for this stage
        await client.query('DELETE FROM stage_jersey_wearers WHERE stage_id = $1', [stageId]);
        
        // Get jersey IDs by type if not provided
        const jerseyTypeMap = new Map();
        if (jerseys.some(j => !j.jerseyId)) {
          const jerseyQuery = await client.query(
            `SELECT id, type FROM jerseys WHERE type = ANY($1::text[])`,
            [jerseys.map(j => j.jerseyType)]
          );
          jerseyQuery.rows.forEach(j => {
            jerseyTypeMap.set(j.type, j.id);
          });
        }
        
        // Insert jersey wearers
        for (const jersey of jerseys) {
          if (!jersey.riderId) {
            throw new Error(`Jersey ${jersey.jerseyType} heeft geen renner geselecteerd`);
          }
          
          const jerseyId = jersey.jerseyId || jerseyTypeMap.get(jersey.jerseyType);
          if (!jerseyId) {
            throw new Error(`Jersey ID niet gevonden voor type: ${jersey.jerseyType}`);
          }
          
          await client.query(
            `INSERT INTO stage_jersey_wearers (stage_id, jersey_id, rider_id)
             VALUES ($1, $2, $3)
             ON CONFLICT (stage_id, jersey_id)
             DO UPDATE SET rider_id = EXCLUDED.rider_id`,
            [stageId, jerseyId, jersey.riderId]
          );
        }
      } else {
        // Validate that all 4 jerseys are provided
        throw new Error('Alle 4 truien moeten worden geselecteerd (geel, groen, bolletjes, wit)');
      }
      
      // SECOND: Delete existing results for this stage
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

      // Commit transaction BEFORE activating reserves
      // This prevents transaction abort errors if reserve activation fails
      await client.query('COMMIT');
      
      // BUSINESS RULE: Check for dropped main riders and activate reserves
      // After importing stage results, check which main riders are no longer in results
      // and automatically activate the first reserve rider to take their place
      // This is done AFTER commit to avoid transaction abort issues
      try {
        await activateReservesForDroppedRiders(client, stageId);
      } catch (reserveError) {
        console.error('Error activating reserves (non-fatal):', reserveError);
        console.error('Error code:', reserveError.code);
        console.error('Error message:', reserveError.message);
        // Reserve activation failure doesn't fail the import
        // The stage results are already imported successfully
      }
      
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
        
        // BUSINESS RULE: Calculate final classification and final jersey points if this is the final stage
        try {
          const isFinal = await isFinalStage(client, stageId);
          if (isFinal) {
            console.log('Final stage detected, calculating final classification and jersey points...');
            await calculateAllFinalPoints(client, stageId);
            console.log('Final points calculated successfully');
          }
        } catch (finalPointsErr) {
          console.error('Error calculating final points:', finalPointsErr);
          // Don't fail the import if final points calculation fails
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
      // Check if transaction is already aborted
      if (err.code === '25P02' || err.message.includes('current transaction is aborted')) {
        // Transaction is aborted, try to rollback
        try {
          await client.query('ROLLBACK');
        } catch (rollbackErr) {
          // Transaction might already be rolled back, that's ok
          console.error('Error during rollback (transaction may already be aborted):', rollbackErr.message);
        }
      } else {
        // Normal error, rollback transaction
        try {
          await client.query('ROLLBACK');
        } catch (rollbackErr) {
          console.error('Error during rollback:', rollbackErr.message);
        }
      }
      throw err;
    }
  } catch (err) {
    // Try to rollback if in transaction
    if (client) {
      try {
        // Check if transaction is already aborted
        if (err.code === '25P02' || err.message.includes('current transaction is aborted')) {
          // Try to rollback, but don't fail if it's already aborted
          await client.query('ROLLBACK');
        } else {
          await client.query('ROLLBACK');
        }
      } catch (rollbackErr) {
        // Transaction might already be aborted or rolled back, that's ok
        console.error('Error during rollback in outer catch:', rollbackErr.message);
      }
    }
    return await handleDbError(err, client);
  }
};




