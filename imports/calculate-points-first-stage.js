// Script to calculate points for the first stage for all teams (including new test teams)
// Usage: node imports/calculate-points-first-stage.js
// Make sure to set DATABASE_URL or NEON_DATABASE_URL environment variable

const { Client } = require('pg');

function resolveDatabaseUrl() {
  return (
    process.env.NEON_DATABASE_URL ||
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL ||
    process.env.POSTGRES_PRISMA_URL
  );
}

function shouldUseSsl(connectionString) {
  if (!connectionString) return false;
  const lower = connectionString.toLowerCase();
  
  if (
    lower.includes('sslmode=require') ||
    lower.includes('ssl=true') ||
    lower.includes('ssl=1') ||
    lower.includes('channel_binding=require')
  ) {
    return true;
  }
  
  if (lower.includes('.neon.tech') || lower.includes('.aws.neon.tech')) {
    return true;
  }
  
  if (
    lower.includes('localhost') ||
    lower.includes('127.0.0.1') ||
    lower.includes('0.0.0.0') ||
    lower.includes('host.docker.internal')
  ) {
    return false;
  }
  
  return false;
}

async function calculateStagePoints(client, stageId) {
  console.log(`\nCalculating points for stage ${stageId}...`);

  // Check if stage is final stage (no jersey points on final stage)
  const stageInfo = await client.query(
    'SELECT stage_number, (SELECT MAX(stage_number) FROM stages) as max_stage FROM stages WHERE id = $1',
    [stageId]
  );
  const isFinal = stageInfo.rows[0]?.stage_number === stageInfo.rows[0]?.max_stage;

  // Get scoring rules for stage positions
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

  // Check if stage is neutralized or cancelled
  const stageCheck = await client.query(
    'SELECT is_neutralized, is_cancelled FROM stages WHERE id = $1',
    [stageId]
  );
  
  const isNeutralized = stageCheck.rows.length > 0 && stageCheck.rows[0].is_neutralized;
  const isCancelled = stageCheck.rows.length > 0 && stageCheck.rows[0].is_cancelled;

  if (isCancelled) {
    console.log(`  Stage is cancelled, setting all points to 0...`);
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

  console.log(`  Found ${stageResults.rows.length} stage results`);

  // Get fantasy teams (only main riders can earn points)
  const fantasyTeams = await client.query(
    `SELECT 
       ft.participant_id,
       ftr.rider_id,
       ftr.slot_type
     FROM fantasy_teams ft
     JOIN fantasy_team_riders ftr ON ft.id = ftr.fantasy_team_id
     WHERE ftr.active = true
       AND ftr.slot_type = 'main'`
  );

  console.log(`  Found ${fantasyTeams.rows.length} main riders in fantasy teams`);

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

    // Calculate points from stage positions
    // BUSINESS RULE 11: If stage is neutralized, no stage position points are awarded
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
      points_bonus: 0
    });
  });

  // Insert or update fantasy_stage_points
  let updatedCount = 0;
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
    updatedCount++;
  }

  // Create entries for participants without teams (with 0 points)
  const allParticipants = await client.query('SELECT id FROM participants');
  let createdCount = 0;
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
      createdCount++;
    }
  }

  console.log(`  ✓ Calculated points for ${updatedCount} participants with teams`);
  console.log(`  ✓ Created entries for ${createdCount} participants without teams`);
  
  return { participantsCalculated: updatedCount };
}

async function main() {
  const connectionString = resolveDatabaseUrl();
  if (!connectionString) {
    console.error('❌ Database configuration missing!');
    console.error('Zorg dat je een van deze environment variables hebt ingesteld:');
    console.error('  - NEON_DATABASE_URL');
    console.error('  - DATABASE_URL');
    console.error('  - POSTGRES_URL');
    console.error('');
    console.error('Voor lokale Docker database, gebruik bijvoorbeeld:');
    console.error('  $env:DATABASE_URL="postgresql://postgres:devpassword@localhost:5432/tourpoule"');
    process.exit(1);
  }

  const clientConfig = { connectionString };
  if (shouldUseSsl(connectionString)) {
    clientConfig.ssl = { rejectUnauthorized: false };
  }

  const client = new Client(clientConfig);

  try {
    await client.connect();
    console.log('✅ Verbonden met database\n');

    // Get first stage (stage_number = 1)
    const stageResult = await client.query(`
      SELECT id, stage_number, name
      FROM stages
      WHERE stage_number = 1
      LIMIT 1
    `);

    if (stageResult.rows.length === 0) {
      console.log('❌ Geen eerste etappe gevonden (stage_number = 1)');
      return;
    }

    const stage = stageResult.rows[0];
    console.log(`📊 Eerste etappe gevonden:`);
    console.log(`   ID: ${stage.id}`);
    console.log(`   Nummer: ${stage.stage_number}`);
    console.log(`   Naam: ${stage.name}\n`);

    // Check if stage has results
    const resultsCheck = await client.query(
      'SELECT COUNT(*) as count FROM stage_results WHERE stage_id = $1',
      [stage.id]
    );
    const resultCount = parseInt(resultsCheck.rows[0].count, 10);

    if (resultCount === 0) {
      console.log('❌ De eerste etappe heeft nog geen resultaten.');
      console.log('   Importeer eerst de etappe resultaten voordat je punten kunt berekenen.');
      return;
    }

    console.log(`✅ Etappe heeft ${resultCount} resultaten\n`);

    // Calculate points
    await client.query('BEGIN');
    try {
      const result = await calculateStagePoints(client, stage.id);
      await client.query('COMMIT');
      
      console.log(`\n✅ Punten berekend voor ${result.participantsCalculated} teams!`);
      
      // Show summary for test teams
      const testTeamsSummary = await client.query(`
        SELECT 
          p.team_name,
          fsp.points_stage,
          fsp.points_jerseys,
          fsp.points_bonus,
          fsp.total_points
        FROM participants p
        JOIN fantasy_stage_points fsp ON fsp.participant_id = p.id
        WHERE p.user_id LIKE 'test-team-%'
          AND fsp.stage_id = $1
        ORDER BY fsp.total_points DESC, p.team_name
      `, [stage.id]);

      if (testTeamsSummary.rows.length > 0) {
        console.log('\n📊 Punten voor test teams:');
        console.log('─'.repeat(60));
        testTeamsSummary.rows.forEach((row, index) => {
          console.log(`${index + 1}. ${row.team_name}`);
          console.log(`   Etappe punten: ${row.points_stage}`);
          console.log(`   Trui punten: ${row.points_jerseys}`);
          console.log(`   Bonus punten: ${row.points_bonus}`);
          console.log(`   Totaal: ${row.total_points}`);
          console.log('');
        });
      }

    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    }

  } catch (error) {
    console.error('❌ Fout:', error.message);
    process.exit(1);
  } finally {
    await client.end();
    console.log('🔌 Database verbinding gesloten');
  }
}

if (require.main === module) {
  main();
}

module.exports = { calculateStagePoints };

