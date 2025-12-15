/**
 * Test script om te verifiëren dat punten berekening identiek is na refactor
 * 
 * Gebruik: node imports/test-points-refactor.js [stage_number]
 * Bijvoorbeeld: node imports/test-points-refactor.js 15
 */

const { Client } = require('pg');
const {
  calculatePositionPoints,
  calculateJerseyPoints,
  calculateBonusPoints,
  aggregatePointsPerParticipant
} = require('../netlify/functions/import-stage-results');

const connectionString = process.env.DATABASE_URL || process.env.NEON_DATABASE_URL;

if (!connectionString) {
  console.error('❌ Database configuration missing!');
  console.error('   Set DATABASE_URL or NEON_DATABASE_URL environment variable');
  process.exit(1);
}

const stageNumber = process.argv[2] ? parseInt(process.argv[2], 10) : null;

if (!stageNumber) {
  console.error('❌ Geef een etappe nummer op');
  console.error('Gebruik: node imports/test-points-refactor.js [stage_number]');
  process.exit(1);
}

const client = new Client({ connectionString });

async function testPointsCalculation() {
  try {
    await client.connect();
    console.log('✅ Verbonden met database\n');

    // Vind stage ID
    const stageQuery = await client.query(
      'SELECT id, stage_number, name, is_neutralized, is_cancelled FROM stages WHERE stage_number = $1',
      [stageNumber]
    );
    
    if (stageQuery.rows.length === 0) {
      console.error(`❌ Etappe ${stageNumber} niet gevonden`);
      process.exit(1);
    }

    const stage = stageQuery.rows[0];
    console.log(`📅 Etappe: ${stage.stage_number} - ${stage.name}`);
    console.log(`   Neutralized: ${stage.is_neutralized}, Cancelled: ${stage.is_cancelled}\n`);

    // Check of er resultaten zijn
    const resultsCheck = await client.query(
      'SELECT COUNT(*) as count FROM stage_results WHERE stage_id = $1',
      [stage.id]
    );
    const resultCount = parseInt(resultsCheck.rows[0].count, 10);
    
    if (resultCount === 0) {
      console.error(`❌ Geen resultaten gevonden voor etappe ${stageNumber}`);
      console.error('   Punten kunnen niet worden berekend zonder resultaten');
      process.exit(1);
    }

    console.log(`✅ ${resultCount} resultaten gevonden\n`);

    // Check of dit de final stage is
    const isFinalQuery = await client.query(`
      SELECT COUNT(*) as count
      FROM stages
      WHERE stage_number > $1
    `, [stageNumber]);
    const isFinal = parseInt(isFinalQuery.rows[0].count, 10) === 0;

    // Haal stage results op
    const stageResultsQuery = await client.query(`
      SELECT rider_id, position 
      FROM stage_results 
      WHERE stage_id = $1 
      ORDER BY position
    `, [stage.id]);
    const stageResults = stageResultsQuery.rows;

    console.log(`📊 Stage results: ${stageResults.length} renners\n`);

    // Haal fantasy teams op
    const fantasyTeamsQuery = await client.query(`
      SELECT 
        ft.id as fantasy_team_id,
        ft.participant_id,
        ftr.rider_id,
        ftr.slot_type,
        ftr.active
      FROM fantasy_teams ft
      JOIN fantasy_team_riders ftr ON ft.id = ftr.fantasy_team_id
      WHERE ftr.active = true
        AND ftr.slot_type = 'main'
    `);
    const fantasyTeams = fantasyTeamsQuery.rows;

    console.log(`👥 Fantasy teams: ${fantasyTeams.length} actieve basisrenners\n`);

    // Test calculatePositionPoints
    console.log('🔄 Test calculatePositionPoints()...');
    const riderPositionPoints = await calculatePositionPoints(
      client,
      stage.id,
      stageResults,
      stage.is_neutralized
    );
    console.log(`   ✅ ${riderPositionPoints.size} renners met position punten\n`);

    // Test calculateJerseyPoints
    console.log('🔄 Test calculateJerseyPoints()...');
    const riderJerseyPoints = await calculateJerseyPoints(client, stage.id, isFinal);
    console.log(`   ✅ ${riderJerseyPoints.size} renners met jersey punten\n`);

    // Test calculateBonusPoints
    console.log('🔄 Test calculateBonusPoints()...');
    const riderBonusPoints = await calculateBonusPoints(client, stage.id);
    console.log(`   ✅ ${riderBonusPoints.size} renners met bonus punten\n`);

    // Test aggregatePointsPerParticipant
    console.log('🔄 Test aggregatePointsPerParticipant()...');
    const participantPoints = aggregatePointsPerParticipant(
      fantasyTeams,
      riderPositionPoints,
      riderJerseyPoints,
      riderBonusPoints
    );
    console.log(`   ✅ ${participantPoints.size} participants met punten\n`);

    // Vergelijk met bestaande punten in database
    console.log('📊 Vergelijk met bestaande punten in database...\n');
    
    const existingPointsQuery = await client.query(`
      SELECT 
        participant_id,
        points_stage,
        points_jerseys,
        points_bonus
      FROM fantasy_stage_points
      WHERE stage_id = $1
      ORDER BY participant_id
    `, [stage.id]);

    const existingPoints = new Map();
    existingPointsQuery.rows.forEach(row => {
      existingPoints.set(row.participant_id, {
        points_stage: row.points_stage,
        points_jerseys: row.points_jerseys,
        points_bonus: row.points_bonus
      });
    });

    console.log(`   Bestaande punten: ${existingPoints.size} participants`);
    console.log(`   Nieuwe punten: ${participantPoints.size} participants\n`);

    // Vergelijk punten
    let matches = 0;
    let mismatches = 0;
    const mismatchDetails = [];

    // Check alle participants in nieuwe berekening
    for (const [participantId, newPoints] of participantPoints) {
      const existing = existingPoints.get(participantId);
      
      if (!existing) {
        mismatches++;
        mismatchDetails.push({
          participant_id: participantId,
          reason: 'Niet gevonden in database',
          new: newPoints,
          existing: null
        });
      } else {
        const stageMatch = existing.points_stage === newPoints.points_stage;
        const jerseyMatch = existing.points_jerseys === newPoints.points_jerseys;
        const bonusMatch = existing.points_bonus === newPoints.points_bonus;
        
        if (stageMatch && jerseyMatch && bonusMatch) {
          matches++;
        } else {
          mismatches++;
          mismatchDetails.push({
            participant_id: participantId,
            reason: 'Punten verschillen',
            new: newPoints,
            existing: existing,
            differences: {
              stage: stageMatch ? '✓' : `✗ (${existing.points_stage} vs ${newPoints.points_stage})`,
              jerseys: jerseyMatch ? '✓' : `✗ (${existing.points_jerseys} vs ${newPoints.points_jerseys})`,
              bonus: bonusMatch ? '✓' : `✗ (${existing.points_bonus} vs ${newPoints.points_bonus})`
            }
          });
        }
      }
    }

    // Check participants die alleen in database staan
    for (const [participantId, existing] of existingPoints) {
      if (!participantPoints.has(participantId)) {
        mismatches++;
        mismatchDetails.push({
          participant_id: participantId,
          reason: 'Alleen in database, niet in nieuwe berekening',
          new: null,
          existing: existing
        });
      }
    }

    // Resultaten
    console.log('═'.repeat(80));
    console.log('📊 RESULTATEN');
    console.log('═'.repeat(80));
    console.log(`✅ Matches: ${matches}`);
    console.log(`❌ Mismatches: ${mismatches}\n`);

    if (mismatches > 0) {
      console.log('⚠️  MISMATCH DETAILS:');
      console.log('─'.repeat(80));
      mismatchDetails.slice(0, 10).forEach(detail => {
        console.log(`\nParticipant ID: ${detail.participant_id}`);
        console.log(`  Reden: ${detail.reason}`);
        if (detail.differences) {
          console.log(`  Stage: ${detail.differences.stage}`);
          console.log(`  Jerseys: ${detail.differences.jerseys}`);
          console.log(`  Bonus: ${detail.differences.bonus}`);
        } else {
          console.log(`  Nieuw: ${JSON.stringify(detail.new)}`);
          console.log(`  Bestaand: ${JSON.stringify(detail.existing)}`);
        }
      });
      if (mismatchDetails.length > 10) {
        console.log(`\n... en ${mismatchDetails.length - 10} meer mismatches`);
      }
    } else {
      console.log('✅ Alle punten zijn identiek! Refactor succesvol.\n');
    }

    // Toon voorbeeld punten
    console.log('\n📋 VOORBEELD PUNTEN (eerste 5 participants):');
    console.log('─'.repeat(80));
    let count = 0;
    for (const [participantId, points] of participantPoints) {
      if (count >= 5) break;
      const participantQuery = await client.query(
        'SELECT team_name FROM participants WHERE id = $1',
        [participantId]
      );
      const teamName = participantQuery.rows[0]?.team_name || `Participant ${participantId}`;
      console.log(`${teamName.padEnd(30)}: Stage=${points.points_stage.toString().padStart(3)}, Jerseys=${points.points_jerseys.toString().padStart(3)}, Bonus=${points.points_bonus.toString().padStart(3)}`);
      count++;
    }

  } catch (error) {
    console.error('❌ Fout:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await client.end();
  }
}

testPointsCalculation();
