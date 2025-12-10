// Simple script to calculate points for all stages
// Usage: node imports/calculate-points-simple.js
// Make sure to set NEON_DATABASE_URL environment variable

const { Client } = require('pg');

// Copy the calculateStagePoints function
async function calculateStagePoints(client, stageId) {
  console.log(`\nCalculating points for stage ${stageId}...`);

  // Get scoring rules
  const scoringRules = await client.query(
    `SELECT rule_type, condition_json, points 
     FROM scoring_rules 
     WHERE rule_type = 'stage_position'`
  );
  
  if (scoringRules.rows.length === 0) {
    throw new Error('No scoring rules found! Run insert-scoring-rules.sql first.');
  }

  const positionPointsMap = new Map();
  scoringRules.rows.forEach(rule => {
    const condition = rule.condition_json;
    if (condition && condition.position) {
      positionPointsMap.set(condition.position, rule.points);
    }
  });

  // Get stage results
  const stageResults = await client.query(
    `SELECT rider_id, position 
     FROM stage_results 
     WHERE stage_id = $1 
     ORDER BY position`,
    [stageId]
  );

  if (stageResults.rows.length === 0) {
    console.log(`  No results found for stage ${stageId}, skipping...`);
    return { participantsCalculated: 0 };
  }

  // Get fantasy teams
  const fantasyTeams = await client.query(
    `SELECT 
       ft.participant_id,
       ftr.rider_id
     FROM fantasy_teams ft
     JOIN fantasy_team_riders ftr ON ft.id = ftr.fantasy_team_id
     WHERE ftr.active = true`
  );

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

  // Get jersey wearers
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

  // Calculate points per participant
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

    teams.forEach(team => {
      const jerseyPoints = riderJerseyPointsMap.get(team.rider_id) || 0;
      pointsJerseys += jerseyPoints;
    });

    participantPoints.set(participantId, {
      points_stage: pointsStage,
      points_jerseys: pointsJerseys,
      points_bonus: 0
    });
  });

  // Insert or update fantasy_stage_points
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

  // Create entries for participants without teams (with 0 points)
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

  console.log(`  ✓ Calculated points for ${participantPoints.size} participants with teams`);
  console.log(`  ✓ Created entries for ${allParticipants.rows.length - participantPoints.size} participants without teams`);
  
  return { participantsCalculated: participantPoints.size };
}

async function main() {
  if (!process.env.NEON_DATABASE_URL) {
    console.error('Error: NEON_DATABASE_URL environment variable is not set');
    console.error('\nSet it with:');
    console.error('  Windows PowerShell: $env:NEON_DATABASE_URL="your-connection-string"');
    console.error('  Windows CMD: set NEON_DATABASE_URL=your-connection-string');
    console.error('  Linux/Mac: export NEON_DATABASE_URL="your-connection-string"');
    console.error('\nOr run: NEON_DATABASE_URL="your-connection-string" node imports/calculate-points-simple.js');
    process.exit(1);
  }

  const client = new Client({
    connectionString: process.env.NEON_DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('Connected to database\n');

    // Get all stages with results
    const stagesResult = await client.query(`
      SELECT DISTINCT 
        s.id as stage_id,
        s.stage_number,
        s.name as stage_name,
        COUNT(sr.id) as result_count
      FROM stages s
      JOIN stage_results sr ON s.id = sr.stage_id
      GROUP BY s.id, s.stage_number, s.name
      ORDER BY s.stage_number
    `);

    if (stagesResult.rows.length === 0) {
      console.log('No stages with results found.');
      return;
    }

    console.log(`Found ${stagesResult.rows.length} stages with results:\n`);

    for (const stage of stagesResult.rows) {
      try {
        await calculateStagePoints(client, stage.stage_id);
      } catch (error) {
        console.error(`  ✗ Error: ${error.message}`);
      }
    }

    console.log('\n✓ Done! All points calculated.');
    
    // Show summary
    const summary = await client.query(`
      SELECT 
        COUNT(DISTINCT stage_id) as stages_with_points,
        COUNT(*) as total_entries,
        SUM(points_stage) as total_stage_points,
        SUM(points_jerseys) as total_jersey_points
      FROM fantasy_stage_points
    `);
    
    console.log('\nSummary:');
    console.log(`  Stages with points: ${summary.rows[0].stages_with_points}`);
    console.log(`  Total entries: ${summary.rows[0].total_entries}`);
    console.log(`  Total stage points: ${summary.rows[0].total_stage_points || 0}`);
    console.log(`  Total jersey points: ${summary.rows[0].total_jersey_points || 0}`);

  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

if (require.main === module) {
  main();
}

module.exports = { calculateStagePoints };

