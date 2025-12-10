// Node.js script to calculate points for all stages with results
// Run with: node imports/calculate-points-for-stages.js
// Make sure NEON_DATABASE_URL is set in your environment
//
// Or set it inline:
// NEON_DATABASE_URL="your-connection-string" node imports/calculate-points-for-stages.js

const { Client } = require('pg');

async function calculatePointsForAllStages() {
  const client = new Client({
    connectionString: process.env.NEON_DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('Connected to database');

    // Get all stages with results
    const stagesQuery = `
      SELECT DISTINCT 
        s.id as stage_id,
        s.stage_number,
        s.name as stage_name,
        COUNT(sr.id) as result_count
      FROM stages s
      JOIN stage_results sr ON s.id = sr.stage_id
      GROUP BY s.id, s.stage_number, s.name
      ORDER BY s.stage_number
    `;
    
    const stagesResult = await client.query(stagesQuery);
    console.log(`Found ${stagesResult.rows.length} stages with results`);

    if (stagesResult.rows.length === 0) {
      console.log('No stages with results found');
      return;
    }

    // Import the calculateStagePoints function
    // Since we can't easily import it, we'll copy the logic here
    for (const stage of stagesResult.rows) {
      console.log(`\nCalculating points for stage ${stage.stage_number} (${stage.stage_name})...`);
      
      try {
        await calculateStagePoints(client, stage.stage_id);
        console.log(`✓ Points calculated for stage ${stage.stage_number}`);
      } catch (error) {
        console.error(`✗ Error calculating points for stage ${stage.stage_number}:`, error.message);
      }
    }

    console.log('\nDone!');
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.end();
  }
}

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

// Copy of calculateStagePoints function from import-stage-results.js
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

  const jerseyPointsMap = new Map();
  jerseyRules.rows.forEach(rule => {
    const condition = rule.condition_json;
    if (condition && condition.jersey_type) {
      jerseyPointsMap.set(condition.jersey_type, rule.points);
    }
  });

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

  // Step 5: Calculate points per participant
  const participantTeamsMap = new Map();
  fantasyTeams.rows.forEach(team => {
    if (!participantTeamsMap.has(team.participant_id)) {
      participantTeamsMap.set(team.participant_id, []);
    }
    participantTeamsMap.get(team.participant_id).push(team);
  });

  const participantPoints = new Map();

  participantTeamsMap.forEach((teams, participantId) => {
    let pointsStage = 0;
    let pointsJerseys = 0;

    teams.forEach(team => {
      const stageResult = stageResults.rows.find(sr => sr.rider_id === team.rider_id);
      if (stageResult) {
        const positionPoints = positionPointsMap.get(stageResult.position) || 0;
        pointsStage += positionPoints;
      }
    });

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
      points_bonus: 0
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

// Run if called directly
if (require.main === module) {
  if (!process.env.NEON_DATABASE_URL) {
    console.error('Error: NEON_DATABASE_URL environment variable is not set');
    console.error('Set it with: export NEON_DATABASE_URL="your-connection-string"');
    process.exit(1);
  }
  
  calculatePointsForAllStages().catch(console.error);
}

module.exports = { calculatePointsForAllStages, calculateStagePoints };

