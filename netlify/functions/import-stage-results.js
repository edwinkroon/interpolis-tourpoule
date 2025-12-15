const { getDbClient, handleDbError, missingDbConfigResponse } = require('./_shared/db');
const { calculateCumulativePoints } = require('./calculate-cumulative-points');
const { calculateAllFinalPoints } = require('./calculate-final-points');

/**
 * Valideer input data voor stage import
 * @param {Object} client - Database client
 * @param {number} stageId - Stage ID
 * @param {Array} results - Array of {position, riderId, timeSeconds}
 * @param {Array} jerseys - Array of {jerseyType, jerseyId, riderId}
 * @returns {Object} {valid: boolean, error?: string}
 */
async function validateInput(client, stageId, results, jerseys) {
  // Valideer stageId
  if (!stageId) {
    return { valid: false, error: 'stageId is required' };
  }

  // Valideer results
  if (!Array.isArray(results) || results.length === 0) {
    return { valid: false, error: 'results must be a non-empty array' };
  }

  // Valideer dat stage bestaat
  const stageCheck = await client.query('SELECT id, stage_number, name FROM stages WHERE id = $1', [stageId]);
  if (stageCheck.rows.length === 0) {
    return { valid: false, error: `Stage with id ${stageId} does not exist` };
  }

  // Valideer dat alle renners bestaan
  const riderIds = results.map(r => r.riderId).filter(id => id != null);
  if (riderIds.length > 0) {
    const riderCheck = await client.query(
      'SELECT id FROM riders WHERE id = ANY($1::int[])',
      [riderIds]
    );
    const foundIds = new Set(riderCheck.rows.map(r => r.id));
    const missingIds = riderIds.filter(id => !foundIds.has(id));
    if (missingIds.length > 0) {
      return { valid: false, error: `Riders niet gevonden: ${missingIds.join(', ')}` };
    }
  }

  // Valideer dat posities uniek zijn
  const positions = results.map(r => r.position).filter(p => p != null);
  const uniquePositions = new Set(positions);
  if (positions.length !== uniquePositions.size) {
    const duplicates = positions.filter((p, i) => positions.indexOf(p) !== i);
    return { valid: false, error: `Dubbele posities: ${[...new Set(duplicates)].join(', ')}` };
  }

  // Valideer jerseys
  if (!jerseys || !Array.isArray(jerseys) || jerseys.length === 0) {
    return { valid: false, error: 'Alle 4 truien moeten worden geselecteerd (geel, groen, bolletjes, wit)' };
  }

  if (jerseys.length !== 4) {
    return { valid: false, error: `Er moeten 4 truien zijn, maar ${jerseys.length} opgegeven` };
  }

  const requiredTypes = ['geel', 'groen', 'bolletjes', 'wit'];
  const providedTypes = jerseys.map(j => j.jerseyType);
  const missingTypes = requiredTypes.filter(t => !providedTypes.includes(t));
  if (missingTypes.length > 0) {
    return { valid: false, error: `Ontbrekende truien: ${missingTypes.join(', ')}` };
  }

  // Valideer dat alle trui dragers bestaan
  const jerseyRiderIds = jerseys.map(j => j.riderId).filter(id => id != null);
  if (jerseyRiderIds.length > 0) {
    const jerseyRiderCheck = await client.query(
      'SELECT id FROM riders WHERE id = ANY($1::int[])',
      [jerseyRiderIds]
    );
    const foundJerseyRiderIds = new Set(jerseyRiderCheck.rows.map(r => r.id));
    const missingJerseyRiderIds = jerseyRiderIds.filter(id => !foundJerseyRiderIds.has(id));
    if (missingJerseyRiderIds.length > 0) {
      return { valid: false, error: `Trui dragers niet gevonden: ${missingJerseyRiderIds.join(', ')}` };
    }
  }

  return { valid: true };
}

/**
 * Import jersey wearers for a stage
 * @param {Object} client - PostgreSQL client
 * @param {number} stageId - Stage ID
 * @param {Array} jerseys - Array of {jerseyType, jerseyId?, riderId}
 */
async function importJerseys(client, stageId, jerseys) {
  if (!jerseys || jerseys.length === 0) {
    throw new Error('Alle 4 truien moeten worden geselecteerd (geel, groen, bolletjes, wit)');
  }

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
}

/**
 * Import stage results for a stage
 * @param {Object} client - PostgreSQL client
 * @param {number} stageId - Stage ID
 * @param {Array} results - Array of {position, riderId, timeSeconds}
 */
/**
 * Calculate same_time_group numbers for stage results
 * Groups riders by their finish time (time_seconds), similar to DENSE_RANK.
 * All riders with the same time_seconds get the same group number.
 * Riders with null time_seconds (DNF/DNS) all get the same group (highest number).
 * @param {Array<{position: number, timeSeconds: number|null}>} results - Array of stage results
 * @returns {Map<number, number>} Map of result index -> same_time_group number
 */
function calculateSameTimeGroups(results) {
  const timeGroupMap = new Map(); // Maps time_seconds value to group number
  let currentGroupNumber = 1;
  
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

  // Create map of original result -> group number
  const resultGroupMap = new Map();
  results.forEach((result, index) => {
    const sameTimeGroup = result.timeSeconds === null 
      ? nullTimeGroup
      : timeGroupMap.get(result.timeSeconds);
    resultGroupMap.set(index, sameTimeGroup);
  });

  return resultGroupMap;
}

/**
 * Import stage results into the database
 * @param {Object} client - PostgreSQL client
 * @param {number} stageId - Stage ID
 * @param {Array<{position: number, riderId: number, timeSeconds: number|null}>} results - Array of stage results
 */
async function importStageResults(client, stageId, results) {
  // Delete existing results for this stage
  await client.query('DELETE FROM stage_results WHERE stage_id = $1', [stageId]);

  // Calculate same_time_group for all results
  const sameTimeGroupMap = calculateSameTimeGroups(results);

  // Insert results with same_time_group
  for (let i = 0; i < results.length; i++) {
    const result = results[i];
    const sameTimeGroup = sameTimeGroupMap.get(i);

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
}

/**
 * Calculate position points for riders based on their stage position
 * @param {Object} client - PostgreSQL client
 * @param {number} stageId - Stage ID
 * @param {Array} stageResults - Array of {rider_id, position}
 * @param {boolean} isNeutralized - Whether the stage is neutralized
 * @returns {Map} Map of rider_id -> position points
 */
async function calculatePositionPoints(client, stageId, stageResults, isNeutralized) {
  // BUSINESS RULE 11: If stage is neutralized, no stage position points are awarded
  if (isNeutralized) {
    return new Map(); // Return empty map, no points
  }

  // Get all scoring rules for stage positions
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

  // Calculate points per rider
  const riderPositionPoints = new Map();
  stageResults.forEach(result => {
    const positionPoints = positionPointsMap.get(result.position) || 0;
    riderPositionPoints.set(result.rider_id, positionPoints);
  });

  return riderPositionPoints;
}

/**
 * Calculate jersey points for riders based on jerseys they wear
 * @param {Object} client - PostgreSQL client
 * @param {number} stageId - Stage ID
 * @param {boolean} isFinal - Whether this is the final stage
 * @returns {Map} Map of rider_id -> jersey points
 */
async function calculateJerseyPoints(client, stageId, isFinal) {
  // BUSINESS RULE 9: No jersey points on final stage
  if (isFinal) {
    return new Map(); // Return empty map, no points
  }

  // Get jersey scoring rules
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

  return riderJerseyPointsMap;
}

/**
 * Calculate bonus points for riders (currently returns 0, can be extended later)
 * @param {Object} client - PostgreSQL client
 * @param {number} stageId - Stage ID
 * @returns {Map} Map of rider_id -> bonus points
 */
async function calculateBonusPoints(client, stageId) {
  // Currently no bonus points, but structure is ready for future implementation
  return new Map();
}

/**
 * Aggregate points per participant from their active main riders
 * @param {Array} fantasyTeams - Array of {fantasy_team_id, participant_id, rider_id}
 * @param {Map} riderPositionPoints - Map of rider_id -> position points
 * @param {Map} riderJerseyPoints - Map of rider_id -> jersey points
 * @param {Map} riderBonusPoints - Map of rider_id -> bonus points
 * @returns {Map} Map of participant_id -> {points_stage, points_jerseys, points_bonus}
 */
function aggregatePointsPerParticipant(fantasyTeams, riderPositionPoints, riderJerseyPoints, riderBonusPoints) {
  // Group fantasy teams by participant
  const participantTeamsMap = new Map();
  fantasyTeams.forEach(team => {
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
    let pointsBonus = 0;

    teams.forEach(team => {
      // Add position points
      const positionPoints = riderPositionPoints.get(team.rider_id) || 0;
      pointsStage += positionPoints;

      // Add jersey points
      const jerseyPoints = riderJerseyPoints.get(team.rider_id) || 0;
      pointsJerseys += jerseyPoints;

      // Add bonus points
      const bonusPoints = riderBonusPoints.get(team.rider_id) || 0;
      pointsBonus += bonusPoints;
    });

    participantPoints.set(participantId, {
      points_stage: pointsStage,
      points_jerseys: pointsJerseys,
      points_bonus: pointsBonus
    });
  });

  return participantPoints;
}

/**
 * Calculate awards for a stage
 * Awards are calculated after stage points are calculated
 * @param {Object} client - PostgreSQL client
 * @param {number} stageId - Stage ID
 */
async function calculateAwards(client, stageId) {
  // Calculate per-stage awards (PODIUM_1, PODIUM_2, PODIUM_3, STIJGER_VD_DAG)
  await calculatePerStageAwards(client, stageId);
  
  // Calculate cumulative awards (COMEBACK, LUCKY_LOSER, TEAMWORK)
  await calculateCumulativeAwards(client, stageId);
}

/**
 * Calculate per-stage awards (PODIUM_1, PODIUM_2, PODIUM_3, STIJGER_VD_DAG)
 * @param {Object} client - PostgreSQL client
 * @param {number} stageId - Stage ID
 */
async function calculatePerStageAwards(client, stageId) {
  // Get stage points for this stage, ordered by total points descending
  const stagePointsQuery = await client.query(`
    SELECT 
      participant_id,
      points_stage + points_jerseys + points_bonus as total_points
    FROM fantasy_stage_points
    WHERE stage_id = $1
    ORDER BY total_points DESC, participant_id ASC
  `, [stageId]);

  if (stagePointsQuery.rows.length === 0) {
    console.log('No stage points found, skipping per-stage awards');
    return;
  }

  // PODIUM_1, PODIUM_2, PODIUM_3: Top 3 teams by stage points
  // Handle ties correctly: if multiple teams have the same points, they share the position
  const awardIdsQuery = await client.query(`
    SELECT id, code FROM awards WHERE code IN ('PODIUM_1', 'PODIUM_2', 'PODIUM_3')
  `);
  const awardIdsMap = new Map();
  awardIdsQuery.rows.forEach(award => {
    awardIdsMap.set(award.code, award.id);
  });

  // Delete existing per-stage awards for this stage
  await client.query(`
    DELETE FROM awards_per_participant
    WHERE stage_id = $1
      AND award_id IN (SELECT id FROM awards WHERE code IN ('PODIUM_1', 'PODIUM_2', 'PODIUM_3'))
  `, [stageId]);

  // Group participants by points and assign positions
  // If multiple teams have the same points, they share the position
  let currentPosition = 1;
  let processedParticipants = new Set();
  
  for (let i = 0; i < stagePointsQuery.rows.length && currentPosition <= 3; i++) {
    const currentRow = stagePointsQuery.rows[i];
    
    // Skip if already processed (part of a tie group)
    if (processedParticipants.has(currentRow.participant_id)) {
      continue;
    }
    
    // Find all participants with the same points (ties)
    const samePoints = stagePointsQuery.rows.filter(
      row => row.total_points === currentRow.total_points
    );
    
    // Determine which award(s) to give based on position
    let awardsToGive = [];
    if (currentPosition === 1) {
      awardsToGive.push({ code: 'PODIUM_1', awardId: awardIdsMap.get('PODIUM_1') });
    } else if (currentPosition === 2) {
      awardsToGive.push({ code: 'PODIUM_2', awardId: awardIdsMap.get('PODIUM_2') });
    } else if (currentPosition === 3) {
      awardsToGive.push({ code: 'PODIUM_3', awardId: awardIdsMap.get('PODIUM_3') });
    }
    
    // Award to all participants with the same points
    for (const award of awardsToGive) {
      if (!award.awardId) {
        console.warn(`Award ${award.code} not found in database, skipping`);
        continue;
      }
      
      for (const participant of samePoints) {
        try {
          await client.query(`
            INSERT INTO awards_per_participant (award_id, participant_id, stage_id)
            VALUES ($1, $2, $3)
            ON CONFLICT (award_id, participant_id, stage_id) DO NOTHING
          `, [award.awardId, participant.participant_id, stageId]);
        } catch (err) {
          console.error(`Error inserting ${award.code} for participant ${participant.participant_id}:`, err.message);
        }
      }
      
      console.log(`Awarded ${award.code} to ${samePoints.length} participant(s) for stage ${stageId} (position ${currentPosition})`);
    }
    
    // Mark all participants in this group as processed
    samePoints.forEach(p => processedParticipants.add(p.participant_id));
    
    // Move to next position (skip all tied participants)
    currentPosition += samePoints.length;
  }

  // STIJGER_VD_DAG: Grootste klassementssprong in de meest recente etappe
  await calculateStijgerVanDeDag(client, stageId);
}

/**
 * Calculate STIJGER_VD_DAG award (grootste klassementssprong in de meest recente etappe)
 * @param {Object} client - PostgreSQL client
 * @param {number} stageId - Stage ID
 */
async function calculateStijgerVanDeDag(client, stageId) {
  // Get current stage number
  const stageQuery = await client.query('SELECT stage_number FROM stages WHERE id = $1', [stageId]);
  if (stageQuery.rows.length === 0) return;
  
  const currentStageNumber = stageQuery.rows[0].stage_number;
  
  // Get previous stage
  const previousStageQuery = await client.query(`
    SELECT id FROM stages 
    WHERE stage_number < $1 
    ORDER BY stage_number DESC 
    LIMIT 1
  `, [currentStageNumber]);
  
  if (previousStageQuery.rows.length === 0) {
    console.log('No previous stage found, skipping STIJGER_VD_DAG');
    return; // First stage, no previous ranking
  }
  
  const previousStageId = previousStageQuery.rows[0].id;
  
  // Get rankings before and after this stage
  const currentRankingsQuery = await client.query(`
    SELECT 
      participant_id,
      rank
    FROM fantasy_cumulative_points
    WHERE after_stage_id = $1
    ORDER BY rank ASC
  `, [stageId]);
  
  const previousRankingsQuery = await client.query(`
    SELECT 
      participant_id,
      rank
    FROM fantasy_cumulative_points
    WHERE after_stage_id = $1
    ORDER BY rank ASC
  `, [previousStageId]);
  
  if (previousRankingsQuery.rows.length === 0) {
    console.log('No previous rankings found, skipping STIJGER_VD_DAG');
    return;
  }
  
  // Create maps of participant_id -> rank
  const currentRankings = new Map();
  currentRankingsQuery.rows.forEach(row => {
    currentRankings.set(row.participant_id, row.rank);
  });
  
  const previousRankings = new Map();
  previousRankingsQuery.rows.forEach(row => {
    previousRankings.set(row.participant_id, row.rank);
  });
  
  // Calculate rank changes (positive = improvement, negative = decline)
  const rankChanges = [];
  for (const [participantId, currentRank] of currentRankings) {
    const previousRank = previousRankings.get(participantId);
    if (previousRank !== undefined) {
      const change = previousRank - currentRank; // Positive = improved
      rankChanges.push({
        participant_id: participantId,
        change: change
      });
    }
  }
  
  if (rankChanges.length === 0) {
    console.log('No rank changes found, skipping STIJGER_VD_DAG');
    return;
  }
  
  // Find maximum improvement
  const maxChange = Math.max(...rankChanges.map(r => r.change));
  
  if (maxChange <= 0) {
    console.log('No positive rank changes found, skipping STIJGER_VD_DAG');
    return; // No one improved
  }
  
  // Find all participants with maximum improvement (handle ties)
  const winners = rankChanges.filter(r => r.change === maxChange);
  
  // Get award ID
  const awardQuery = await client.query("SELECT id FROM awards WHERE code = 'STIJGER_VD_DAG'");
  if (awardQuery.rows.length === 0) {
    console.warn('STIJGER_VD_DAG award not found in database, skipping');
    return;
  }
  
  const awardId = awardQuery.rows[0].id;
  
  // Delete existing STIJGER_VD_DAG awards for this stage
  await client.query(`
    DELETE FROM awards_per_participant
    WHERE stage_id = $1 AND award_id = $2
  `, [stageId, awardId]);
  
  // Insert awards for all winners
  for (const winner of winners) {
    try {
      await client.query(`
        INSERT INTO awards_per_participant (award_id, participant_id, stage_id)
        VALUES ($1, $2, $3)
        ON CONFLICT (award_id, participant_id, stage_id) DO NOTHING
      `, [awardId, winner.participant_id, stageId]);
    } catch (err) {
      console.error(`Error inserting STIJGER_VD_DAG for participant ${winner.participant_id}:`, err.message);
    }
  }
  
  console.log(`Awarded STIJGER_VD_DAG to ${winners.length} participant(s) for stage ${stageId} (improvement: ${maxChange} positions)`);
}

/**
 * Helper function to save awards for winners
 * Handles award ID lookup, deletion of existing awards, and insertion of new awards
 * @param {Object} client - PostgreSQL client
 * @param {string} awardCode - Award code (e.g., 'COMEBACK', 'LUCKY_LOSER', 'TEAMWORK')
 * @param {number} stageId - Stage ID
 * @param {Array<{participant_id: number}>} winners - Array of winner objects with participant_id
 * @param {string} logMessage - Custom log message to append
 * @returns {Promise<void>}
 */
async function saveAwardsForWinners(client, awardCode, stageId, winners, logMessage = '') {
  if (!winners || winners.length === 0) {
    return;
  }

  // Get award ID
  const awardQuery = await client.query('SELECT id FROM awards WHERE code = $1', [awardCode]);
  if (awardQuery.rows.length === 0) {
    console.warn(`${awardCode} award not found in database, skipping`);
    return;
  }

  const awardId = awardQuery.rows[0].id;

  // Delete existing awards for this stage
  await client.query(
    'DELETE FROM awards_per_participant WHERE stage_id = $1 AND award_id = $2',
    [stageId, awardId]
  );

  // Insert awards for all winners
  for (const winner of winners) {
    try {
      await client.query(
        `INSERT INTO awards_per_participant (award_id, participant_id, stage_id)
         VALUES ($1, $2, $3)
         ON CONFLICT (award_id, participant_id, stage_id) DO NOTHING`,
        [awardId, winner.participant_id, stageId]
      );
    } catch (err) {
      console.error(`Error inserting ${awardCode} for participant ${winner.participant_id}:`, err.message);
    }
  }

  const logSuffix = logMessage ? ` (${logMessage})` : '';
  console.log(`Awarded ${awardCode} to ${winners.length} participant(s) for stage ${stageId}${logSuffix}`);
}

/**
 * Calculate cumulative awards (COMEBACK, LUCKY_LOSER, TEAMWORK)
 * These awards are evaluated after each stage but may span multiple stages
 * @param {Object} client - PostgreSQL client
 * @param {number} stageId - Stage ID
 */
async function calculateCumulativeAwards(client, stageId) {
  // COMEBACK: Grootste stijging in het klassement in één etappe
  // This is similar to STIJGER_VD_DAG but tracks the biggest improvement ever
  await calculateComeback(client, stageId);
  
  // LUCKY_LOSER: Beste etappescore met het kleinste aantal actieve renners
  await calculateLuckyLoser(client, stageId);
  
  // TEAMWORK: Meeste etappes waarin ≥5 renners punten scoren
  await calculateTeamwork(client, stageId);
}

/**
 * Calculate COMEBACK award (grootste stijging in het klassement in één etappe)
 * This is similar to STIJGER_VD_DAG but tracks the biggest improvement across all stages
 * @param {Object} client - PostgreSQL client
 * @param {number} stageId - Stage ID
 */
async function calculateComeback(client, stageId) {
  // Get current stage number
  const stageQuery = await client.query('SELECT stage_number FROM stages WHERE id = $1', [stageId]);
  if (stageQuery.rows.length === 0) return;
  
  const currentStageNumber = stageQuery.rows[0].stage_number;
  
  // Get previous stage
  const previousStageQuery = await client.query(`
    SELECT id FROM stages 
    WHERE stage_number < $1 
    ORDER BY stage_number DESC 
    LIMIT 1
  `, [currentStageNumber]);
  
  if (previousStageQuery.rows.length === 0) {
    return; // First stage, no previous ranking
  }
  
  const previousStageId = previousStageQuery.rows[0].id;
  
  // Get rankings before and after this stage
  const currentRankingsQuery = await client.query(`
    SELECT 
      participant_id,
      rank
    FROM fantasy_cumulative_points
    WHERE after_stage_id = $1
    ORDER BY rank ASC
  `, [stageId]);
  
  const previousRankingsQuery = await client.query(`
    SELECT 
      participant_id,
      rank
    FROM fantasy_cumulative_points
    WHERE after_stage_id = $1
    ORDER BY rank ASC
  `, [previousStageId]);
  
  if (previousRankingsQuery.rows.length === 0) {
    return;
  }
  
  // Create maps of participant_id -> rank
  const currentRankings = new Map();
  currentRankingsQuery.rows.forEach(row => {
    currentRankings.set(row.participant_id, row.rank);
  });
  
  const previousRankings = new Map();
  previousRankingsQuery.rows.forEach(row => {
    previousRankings.set(row.participant_id, row.rank);
  });
  
  // Calculate rank changes (positive = improvement, negative = decline)
  const rankChanges = [];
  for (const [participantId, currentRank] of currentRankings) {
    const previousRank = previousRankings.get(participantId);
    if (previousRank !== undefined) {
      const change = previousRank - currentRank; // Positive = improved
      rankChanges.push({
        participant_id: participantId,
        change: change
      });
    }
  }
  
  if (rankChanges.length === 0) {
    return;
  }
  
  // Find maximum improvement
  const maxChange = Math.max(...rankChanges.map(r => r.change));
  
  if (maxChange <= 0) {
    return; // No one improved
  }
  
  // Find all participants with maximum improvement (handle ties)
  const winners = rankChanges.filter(r => r.change === maxChange);
  
  // Save awards using helper function
  await saveAwardsForWinners(
    client,
    'COMEBACK',
    stageId,
    winners,
    `improvement: ${maxChange} positions`
  );
}

/**
 * Calculate LUCKY_LOSER award (beste etappescore met het kleinste aantal actieve renners)
 * @param {Object} client - PostgreSQL client
 * @param {number} stageId - Stage ID
 */
async function calculateLuckyLoser(client, stageId) {
  // Get stage points and count active riders per participant
  const participantStatsQuery = await client.query(`
    SELECT 
      fsp.participant_id,
      fsp.points_stage + fsp.points_jerseys + fsp.points_bonus as total_points,
      COUNT(DISTINCT ftr.rider_id) FILTER (WHERE ftr.active = true AND ftr.slot_type = 'main') as active_riders
    FROM fantasy_stage_points fsp
    JOIN fantasy_teams ft ON fsp.participant_id = ft.participant_id
    JOIN fantasy_team_riders ftr ON ft.id = ftr.fantasy_team_id
    WHERE fsp.stage_id = $1
    GROUP BY fsp.participant_id, fsp.points_stage, fsp.points_jerseys, fsp.points_bonus
    HAVING COUNT(DISTINCT ftr.rider_id) FILTER (WHERE ftr.active = true AND ftr.slot_type = 'main') > 0
    ORDER BY active_riders ASC, total_points DESC
  `, [stageId]);
  
  if (participantStatsQuery.rows.length === 0) {
    return;
  }
  
  // Find minimum number of active riders
  const minActiveRiders = participantStatsQuery.rows[0].active_riders;
  
  // Find all participants with minimum active riders, then select the one(s) with highest points
  const candidatesWithMinRiders = participantStatsQuery.rows.filter(
    row => row.active_riders === minActiveRiders
  );
  
  if (candidatesWithMinRiders.length === 0) {
    return;
  }
  
  // Find maximum points among candidates with minimum riders
  const maxPoints = Math.max(...candidatesWithMinRiders.map(r => parseInt(r.total_points, 10)));
  
  // Find all participants with minimum riders AND maximum points (handle ties)
  const winners = candidatesWithMinRiders.filter(
    r => parseInt(r.total_points, 10) === maxPoints
  );
  
  // Save awards using helper function
  await saveAwardsForWinners(
    client,
    'LUCKY_LOSER',
    stageId,
    winners,
    `${minActiveRiders} active riders, ${maxPoints} points`
  );
}

/**
 * Calculate TEAMWORK award (meeste etappes waarin ≥5 renners gefinisht zijn)
 * This is a cumulative award that tracks across all stages
 * Note: Changed from "≥5 renners punten" to "≥5 renners gefinisht" because
 *       teams rarely have ≥5 riders scoring points (max seen: 4 riders)
 * @param {Object} client - PostgreSQL client
 * @param {number} stageId - Stage ID
 */
async function calculateTeamwork(client, stageId) {
  // Get all stages up to and including this stage
  const stageQuery = await client.query('SELECT stage_number FROM stages WHERE id = $1', [stageId]);
  if (stageQuery.rows.length === 0) return;
  
  const currentStageNumber = stageQuery.rows[0].stage_number;
  
  // Count stages where participant had ≥5 active riders who finished
  // Changed from "scoring points" to "finished" because ≥5 riders scoring points is too rare
  const simplifiedQuery = await client.query(`
    WITH participant_stage_rider_finished AS (
      SELECT 
        fsp.participant_id,
        fsp.stage_id,
        ftr.rider_id
      FROM fantasy_stage_points fsp
      JOIN fantasy_teams ft ON fsp.participant_id = ft.participant_id
      JOIN fantasy_team_riders ftr ON ft.id = ftr.fantasy_team_id
      JOIN stages s ON fsp.stage_id = s.id
      WHERE s.stage_number <= $1
        AND ftr.active = true
        AND ftr.slot_type = 'main'
        AND EXISTS (
          -- Only count riders who actually finished (have a result with time)
          SELECT 1 
          FROM stage_results sr
          WHERE sr.stage_id = fsp.stage_id 
            AND sr.rider_id = ftr.rider_id
            AND sr.time_seconds IS NOT NULL
        )
    ),
    participant_stage_stats AS (
      SELECT 
        participant_id,
        stage_id,
        COUNT(*) as riders_finished
      FROM participant_stage_rider_finished
      GROUP BY participant_id, stage_id
    )
    SELECT 
      participant_id,
      COUNT(*) FILTER (WHERE riders_finished >= 5) as stages_with_teamwork
    FROM participant_stage_stats
    GROUP BY participant_id
    ORDER BY stages_with_teamwork DESC
  `, [currentStageNumber]);
  
  if (simplifiedQuery.rows.length === 0) {
    console.log('No participants found for TEAMWORK calculation');
    return;
  }
  
  // Find maximum number of stages with teamwork
  const maxStages = Math.max(...simplifiedQuery.rows.map(r => parseInt(r.stages_with_teamwork, 10)));
  
  if (maxStages === 0) {
    console.log('No participants have ≥5 riders finishing in any stage, skipping TEAMWORK');
    return; // No one has ≥5 riders finishing in any stage
  }
  
  // Find all participants with maximum stages (handle ties)
  const winners = simplifiedQuery.rows.filter(
    r => parseInt(r.stages_with_teamwork, 10) === maxStages
  );
  
  // Save awards using helper function
  await saveAwardsForWinners(
    client,
    'TEAMWORK',
    stageId,
    winners,
    `${maxStages} stages with ≥5 riders finishing`
  );
}

/**
 * Deactivate main riders that are DNF/DNS in the current stage
 * @param {Object} client - PostgreSQL client
 * @param {number} fantasyTeamId - Fantasy team ID
 * @param {Array} mainRiders - Array of main riders for this team
 * @param {Set<number>} dnfRiderIds - Set of rider IDs that are DNF (time_seconds IS NULL)
 * @param {Set<number>} finishedRiderIds - Set of rider IDs that finished the stage
 * @returns {Promise<number>} Number of riders deactivated
 */
async function deactivateDnfMainRiders(client, fantasyTeamId, mainRiders, dnfRiderIds, finishedRiderIds) {
  const activeMainRiders = mainRiders.filter(r => r.active);
  const dnfOrMissingMainRiders = activeMainRiders.filter(rider => {
    const isDnf = dnfRiderIds.has(rider.rider_id);
    const isMissing = !finishedRiderIds.has(rider.rider_id); // DNS / no result line
    return isDnf || isMissing;
  });
  
  // Deactivate DNF/DNS main riders
  for (const dnfMain of dnfOrMissingMainRiders) {
    await client.query(
      'UPDATE fantasy_team_riders SET active = false WHERE id = $1',
      [dnfMain.id]
    );
    console.log(`Deactivated DNF/DNS main rider ${dnfMain.rider_id} in slot ${dnfMain.slot_number} for team ${fantasyTeamId}`);
  }
  
  return dnfOrMissingMainRiders.length;
}

/**
 * Free up slots from inactive main riders by moving them to high slot numbers
 * This allows reserves to take their place in slots 1-10
 * @param {Object} client - PostgreSQL client
 * @param {number} fantasyTeamId - Fantasy team ID
 * @param {Array} mainRiders - Array of main riders for this team
 * @returns {Promise<void>}
 */
async function freeUpInactiveMainSlots(client, fantasyTeamId, mainRiders) {
  const inactiveMainRiders = mainRiders.filter(r => !r.active);
  for (const inactiveMain of inactiveMainRiders) {
    // Only move if slot is in range 1-10 (reserves might already be in higher slots)
    if (inactiveMain.slot_number >= 1 && inactiveMain.slot_number <= 10) {
      await client.query(
        'UPDATE fantasy_team_riders SET slot_number = 900 + $1 WHERE id = $2',
        [inactiveMain.slot_number, inactiveMain.id]
      );
      console.log(`Freed slot ${inactiveMain.slot_number} from inactive main rider ${inactiveMain.rider_id} for team ${fantasyTeamId}`);
    }
  }
}

/**
 * Get available main slots (1-10) that are not currently occupied by active main riders
 * @param {Object} client - PostgreSQL client
 * @param {number} fantasyTeamId - Fantasy team ID
 * @returns {Promise<Array<number>>} Array of available slot numbers
 */
async function getAvailableMainSlots(client, fantasyTeamId) {
  const occupiedSlotsQuery = await client.query(
    `SELECT slot_number
     FROM fantasy_team_riders
     WHERE fantasy_team_id = $1
       AND slot_type = 'main'
       AND active = true
       AND slot_number BETWEEN 1 AND 10`,
    [fantasyTeamId]
  );
  
  const occupiedSlots = new Set(occupiedSlotsQuery.rows.map(r => r.slot_number));
  const availableMainSlots = [];
  for (let i = 1; i <= 10; i++) {
    if (!occupiedSlots.has(i)) {
      availableMainSlots.push(i);
    }
  }
  
  return availableMainSlots;
}

/**
 * Activate reserves for a specific team to fill up to 10 active main riders
 * @param {Object} client - PostgreSQL client
 * @param {number} fantasyTeamId - Fantasy team ID
 * @param {number} neededReserves - Number of reserves needed
 * @param {number} activeMainCount - Current number of active main riders
 * @returns {Promise<number>} Number of reserves activated
 */
async function activateReservesForTeam(client, fantasyTeamId, neededReserves, activeMainCount) {
  if (neededReserves <= 0) {
    return 0;
  }

  // Get available reserve riders for this team, ordered by slot_number
  const reserveRidersQuery = await client.query(
    `SELECT id, rider_id, slot_number
     FROM fantasy_team_riders
     WHERE fantasy_team_id = $1
       AND slot_type = 'reserve'
       AND active = true
     ORDER BY slot_number ASC`,
    [fantasyTeamId]
  );
  
  const availableReserves = reserveRidersQuery.rows;
  const reservesToActivate = Math.min(neededReserves, availableReserves.length);
  
  if (reservesToActivate === 0) {
    console.log(`Team ${fantasyTeamId} needs ${neededReserves} reserves but none are available`);
    return 0;
  }

  // Get available main slots
  const availableMainSlots = await getAvailableMainSlots(client, fantasyTeamId);
  
  let activatedCount = 0;
  
  // Activate reserves to fill up to 10 main riders
  for (let i = 0; i < reservesToActivate && i < availableMainSlots.length; i++) {
    const reserveToActivate = availableReserves[i];
    const targetSlot = availableMainSlots[i];
    
    try {
      // Temporarily set the reserve's slot_number to a high value to avoid unique constraint conflicts
      await client.query(
        'UPDATE fantasy_team_riders SET slot_number = 999 WHERE id = $1',
        [reserveToActivate.id]
      );
      
      // Now update to the correct slot
      const updateResult = await client.query(
        `UPDATE fantasy_team_riders
         SET slot_type = 'main', slot_number = $1, active = true
         WHERE id = $2`,
        [targetSlot, reserveToActivate.id]
      );
      
      if (updateResult.rowCount === 0) {
        console.warn(`Failed to update reserve rider ${reserveToActivate.id} - no rows affected`);
        // Revert slot_number change
        await client.query(
          'UPDATE fantasy_team_riders SET slot_number = $1 WHERE id = $2',
          [reserveToActivate.slot_number, reserveToActivate.id]
        );
        continue;
      }
      
      console.log(`Activated reserve rider ${reserveToActivate.rider_id} to slot ${targetSlot} for team ${fantasyTeamId} (filling up to 10 main riders)`);
      activatedCount++;
    } catch (updateError) {
      // If we get a unique constraint violation, log it and continue
      if (updateError.code === '23505') { // PostgreSQL unique violation
        console.error(`Unique constraint violation when activating reserve ${reserveToActivate.id} to slot ${targetSlot} for team ${fantasyTeamId}:`, updateError.message);
        // Try to revert the slot_number change
        try {
          await client.query(
            'UPDATE fantasy_team_riders SET slot_number = $1 WHERE id = $2',
            [reserveToActivate.slot_number, reserveToActivate.id]
          );
        } catch (revertError) {
          console.error(`Failed to revert slot_number for reserve ${reserveToActivate.id}:`, revertError.message);
          throw new Error(`Failed to activate reserve and revert failed: ${revertError.message}`);
        }
        continue;
      }
      // Check if transaction is aborted
      if (updateError.code === '25P02') {
        throw updateError;
      }
      // For other errors, rethrow
      throw updateError;
    }
  }
  
  if (activatedCount < neededReserves) {
    console.log(`Team ${fantasyTeamId} has ${activeMainCount + activatedCount} active main riders (target: 10, but no more reserves available)`);
  } else {
    console.log(`Team ${fantasyTeamId} now has ${activeMainCount + activatedCount} active main riders (target: 10)`);
  }
  
  return activatedCount;
}

/**
 * BUSINESS RULE: Activate reserve riders when main riders drop out (DNF)
 * This function checks which main riders have DNF (time_seconds IS NULL in stage_results)
 * and automatically activates reserve riders to maintain 10 active main riders per team
 * @param {Object} client - PostgreSQL client
 * @param {number} stageId - Stage ID
 * @returns {Promise<{reservesActivated: number}>} Number of reserves activated
 */
async function activateReservesForDroppedRiders(client, stageId) {
  // Get all main riders from all fantasy teams (both active and inactive)
  const mainRidersQuery = await client.query(`
    SELECT 
      ftr.id,
      ftr.fantasy_team_id,
      ftr.rider_id,
      ftr.slot_number,
      ftr.active,
      ft.participant_id
    FROM fantasy_team_riders ftr
    JOIN fantasy_teams ft ON ftr.fantasy_team_id = ft.id
    WHERE ftr.slot_type = 'main'
    ORDER BY ft.participant_id, ftr.slot_number
  `);
  
  // Get riders that have a result for this stage
  const stageResultsQuery = await client.query(`
    SELECT rider_id, time_seconds
    FROM stage_results
    WHERE stage_id = $1
  `, [stageId]);

  const finishedRiderIds = new Set(stageResultsQuery.rows.map(r => r.rider_id));

  // Riders with NULL time_seconds are DNF/DNS
  const dnfRiderIds = new Set(
    stageResultsQuery.rows
      .filter(r => r.time_seconds === null)
      .map(r => r.rider_id)
  );
  
  // Group main riders by fantasy team
  const teamMainRidersMap = new Map();
  mainRidersQuery.rows.forEach(rider => {
    if (!teamMainRidersMap.has(rider.fantasy_team_id)) {
      teamMainRidersMap.set(rider.fantasy_team_id, []);
    }
    teamMainRidersMap.get(rider.fantasy_team_id).push(rider);
  });
  
  // Track total reserves activated across all teams
  let totalReservesActivated = 0;
  
  // For each fantasy team, check for DNF main riders and activate reserves
  for (const [fantasyTeamId, mainRiders] of teamMainRidersMap) {
    // STEP 1: Deactivate main riders that are DNF/DNS in this stage
    await deactivateDnfMainRiders(client, fantasyTeamId, mainRiders, dnfRiderIds, finishedRiderIds);
    
    // STEP 2: Free up slots from inactive main riders
    await freeUpInactiveMainSlots(client, fantasyTeamId, mainRiders);
    
    // STEP 3: Count how many active main riders remain (after deactivating DNF riders)
    const activeMainCountQuery = await client.query(
      `SELECT COUNT(*) as count
       FROM fantasy_team_riders
       WHERE fantasy_team_id = $1 AND slot_type = 'main' AND active = true`,
      [fantasyTeamId]
    );
    
    const activeMainCount = parseInt(activeMainCountQuery.rows[0].count, 10);
    const targetMainCount = 10;
    const neededReserves = Math.max(0, targetMainCount - activeMainCount);
    
    // STEP 4: Activate reserves if needed
    if (neededReserves > 0) {
      const activated = await activateReservesForTeam(client, fantasyTeamId, neededReserves, activeMainCount);
      totalReservesActivated += activated;
    } else if (activeMainCount === 10) {
      console.log(`Team ${fantasyTeamId} already has 10 active main riders`);
    }
  }
  
  return { reservesActivated: totalReservesActivated };
}

/**
 * Check if a stage is the final stage (highest stage number)
 * @param {Object} client - PostgreSQL client
 * @param {number} stageId - Stage ID to check
 * @returns {Promise<boolean>} True if this is the final stage
 */
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

  // Step 1: Get all stage results for this stage
  const stageResultsQuery = await client.query(
    `SELECT rider_id, position 
     FROM stage_results 
     WHERE stage_id = $1 
     ORDER BY position`,
    [stageId]
  );
  const stageResults = stageResultsQuery.rows;

  // Step 2: Get all fantasy teams with their riders
  // BUSINESS RULE: Only main riders (slot_type = 'main') can earn points
  const fantasyTeamsQuery = await client.query(
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
  const fantasyTeams = fantasyTeamsQuery.rows;

  if (fantasyTeams.length === 0) {
    console.warn('WARNING: No fantasy teams found with active riders! Points will be 0 for all participants.');
  }

  // Step 3: Calculate points per rider type
  const isNeutralized = stageCheck.rows.length > 0 && stageCheck.rows[0].is_neutralized;
  const riderPositionPoints = await calculatePositionPoints(client, stageId, stageResults, isNeutralized);
  const riderJerseyPoints = await calculateJerseyPoints(client, stageId, isFinal);
  const riderBonusPoints = await calculateBonusPoints(client, stageId);

  // Step 4: Aggregate points per participant
  const participantPoints = aggregatePointsPerParticipant(
    fantasyTeams,
    riderPositionPoints,
    riderJerseyPoints,
    riderBonusPoints
  );

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

// Export functions for testing/manual use
exports.validateInput = validateInput;
exports.importJerseys = importJerseys;
exports.importStageResults = importStageResults;
exports.calculatePositionPoints = calculatePositionPoints;
exports.calculateJerseyPoints = calculateJerseyPoints;
exports.calculateBonusPoints = calculateBonusPoints;
exports.aggregatePointsPerParticipant = aggregatePointsPerParticipant;
exports.calculateAwards = calculateAwards;
exports.calculatePerStageAwards = calculatePerStageAwards;
exports.calculateStijgerVanDeDag = calculateStijgerVanDeDag;
exports.calculateCumulativeAwards = calculateCumulativeAwards;
exports.calculateComeback = calculateComeback;
exports.calculateLuckyLoser = calculateLuckyLoser;
exports.calculateTeamwork = calculateTeamwork;
exports.activateReservesForDroppedRiders = activateReservesForDroppedRiders;

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

    client = await getDbClient();

    // Valideer input data
    const validation = await validateInput(client, stageId, results, jerseys);
    if (!validation.valid) {
      await client.end();
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ok: false,
          error: validation.error
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
      await importJerseys(client, stageId, jerseys);
      
      // SECOND: Import stage results
      await importStageResults(client, stageId, results);

      // Commit transaction BEFORE activating reserves
      // This prevents transaction abort errors if reserve activation fails
      await client.query('COMMIT');
      
      // BUSINESS RULE: Check for dropped main riders and activate reserves
      // After importing stage results, check which main riders are no longer in results
      // and automatically activate the first reserve rider to take their place
      // This is done AFTER commit to avoid transaction abort issues
      let reservesActivated = 0;
      let reserveError = null;
      try {
        const reserveResult = await activateReservesForDroppedRiders(client, stageId);
        reservesActivated = reserveResult?.reservesActivated || 0;
      } catch (err) {
        reserveError = err;
        console.error('Error activating reserves (non-fatal):', err);
        console.error('Error code:', err.code);
        console.error('Error message:', err.message);
        // Reserve activation failure doesn't fail the import
        // The stage results are already imported successfully
      }
      
      // Calculate fantasy stage points after importing results
      // This is done after commit to avoid long-running transactions
      let pointsCalculated = false;
      let pointsError = null;
      let participantsCalculated = 0;
      let awardsCalculated = false;
      let awardsError = null;
      let cumulativeCalculated = false;
      let cumulativeError = null;
      
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
        
        // Calculate awards after stage points are calculated
        try {
          await calculateAwards(client, stageId);
          awardsCalculated = true;
        } catch (err) {
          awardsError = err;
          console.error('Error calculating awards:', err);
          // Don't fail the import if awards calculation fails
        }
        
        // Calculate cumulative points and rankings after stage points are calculated
        try {
          await calculateCumulativePoints(client, stageId);
          cumulativeCalculated = true;
        } catch (err) {
          cumulativeError = err;
          console.error('Error calculating cumulative points:', err);
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
      
      // Fase 6: Logging - Samenvatting van import
      const summary = {
        stageId: stageId,
        resultsImported: results.length,
        jerseysImported: jerseys.length,
        replacedExisting: hasExistingResults,
        existingCount: existingCount,
        reservesActivated: reservesActivated,
        reserveError: reserveError ? reserveError.message : null,
        pointsCalculated: pointsCalculated,
        participantsCalculated: participantsCalculated,
        pointsError: pointsError ? pointsError.message : null,
        awardsCalculated: awardsCalculated,
        awardsError: awardsError ? awardsError.message : null,
        cumulativeCalculated: cumulativeCalculated,
        cumulativeError: cumulativeError ? cumulativeError.message : null
      };

      // Log samenvatting
      console.log('\n' + '═'.repeat(80));
      console.log('📊 ETAPPE IMPORT SAMENVATTING');
      console.log('═'.repeat(80));
      console.log(`Etappe ID: ${summary.stageId}`);
      console.log(`Resultaten geïmporteerd: ${summary.resultsImported}`);
      console.log(`Truien geïmporteerd: ${summary.jerseysImported}`);
      if (summary.replacedExisting) {
        console.log(`⚠️  Bestaande resultaten vervangen (${summary.existingCount} records)`);
      }
      if (summary.reservesActivated > 0) {
        console.log(`✅ ${summary.reservesActivated} reserve(s) geactiveerd`);
      } else if (summary.reserveError) {
        console.log(`⚠️  Reserve activatie gefaald: ${summary.reserveError}`);
      }
      if (summary.pointsCalculated) {
        console.log(`✅ Punten berekend voor ${summary.participantsCalculated} participants`);
      } else {
        console.log(`❌ Punten berekening gefaald: ${summary.pointsError || 'Onbekende fout'}`);
      }
      if (summary.awardsCalculated) {
        console.log(`✅ Awards berekend`);
      } else if (summary.awardsError) {
        console.log(`⚠️  Awards berekening gefaald: ${summary.awardsError}`);
      }
      if (summary.cumulativeCalculated) {
        console.log(`✅ Cumulatieve punten en rankings bijgewerkt`);
      } else if (summary.cumulativeError) {
        console.log(`⚠️  Cumulatieve punten berekening gefaald: ${summary.cumulativeError}`);
      }
      console.log('═'.repeat(80) + '\n');

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
          ...summary
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




