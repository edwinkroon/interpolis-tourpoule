/**
 * Test script om awards berekening te testen
 * 
 * Gebruik: node imports/test-awards-calculation.js [stage_number]
 * Bijvoorbeeld: node imports/test-awards-calculation.js 13
 */

const { Client } = require('pg');
const {
  calculateAwards,
  calculatePerStageAwards,
  calculateStijgerVanDeDag
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
  console.error('Gebruik: node imports/test-awards-calculation.js [stage_number]');
  process.exit(1);
}

const client = new Client({ connectionString });

async function testAwardsCalculation() {
  try {
    await client.connect();
    console.log('✅ Verbonden met database\n');

    // Vind stage ID
    const stageQuery = await client.query(
      'SELECT id, stage_number, name FROM stages WHERE stage_number = $1',
      [stageNumber]
    );
    
    if (stageQuery.rows.length === 0) {
      console.error(`❌ Etappe ${stageNumber} niet gevonden`);
      process.exit(1);
    }

    const stage = stageQuery.rows[0];
    console.log(`📅 Etappe: ${stage.stage_number} - ${stage.name}\n`);

    // Check of er punten zijn berekend
    const pointsCheck = await client.query(
      'SELECT COUNT(*) as count FROM fantasy_stage_points WHERE stage_id = $1',
      [stage.id]
    );
    const pointsCount = parseInt(pointsCheck.rows[0].count, 10);
    
    if (pointsCount === 0) {
      console.error(`❌ Geen punten gevonden voor etappe ${stageNumber}`);
      console.error('   Awards kunnen niet worden berekend zonder punten');
      process.exit(1);
    }

    console.log(`✅ ${pointsCount} participants met punten gevonden\n`);

    // Toon huidige punten
    console.log('📊 Huidige etappe punten:');
    console.log('─'.repeat(80));
    const pointsQuery = await client.query(`
      SELECT 
        p.team_name,
        fsp.points_stage + fsp.points_jerseys + fsp.points_bonus as total_points,
        fsp.points_stage,
        fsp.points_jerseys,
        fsp.points_bonus
      FROM fantasy_stage_points fsp
      JOIN participants p ON fsp.participant_id = p.id
      WHERE fsp.stage_id = $1
      ORDER BY total_points DESC, p.team_name ASC
    `, [stage.id]);

    pointsQuery.rows.forEach((row, index) => {
      const position = index + 1;
      console.log(`${position.toString().padStart(2)}. ${row.team_name.padEnd(30)}: ${row.total_points.toString().padStart(3)} punten (Stage: ${row.points_stage}, Jerseys: ${row.points_jerseys}, Bonus: ${row.points_bonus})`);
    });

    // Check bestaande awards
    console.log('\n📋 Bestaande awards voor deze etappe:');
    console.log('─'.repeat(80));
    const existingAwardsQuery = await client.query(`
      SELECT 
        a.code,
        a.title,
        p.team_name,
        COUNT(*) as count
      FROM awards_per_participant app
      JOIN awards a ON app.award_id = a.id
      JOIN participants p ON app.participant_id = p.id
      WHERE app.stage_id = $1
      GROUP BY a.code, a.title, p.team_name
      ORDER BY a.code, p.team_name
    `, [stage.id]);

    if (existingAwardsQuery.rows.length === 0) {
      console.log('   Geen awards gevonden\n');
    } else {
      existingAwardsQuery.rows.forEach(row => {
        console.log(`   ${row.code.padEnd(20)}: ${row.team_name}`);
      });
      console.log('');
    }

    // Test awards berekening
    console.log('🔄 Bereken awards...\n');
    
    try {
      await calculateAwards(client, stage.id);
      console.log('✅ Awards berekening voltooid\n');
    } catch (err) {
      console.error('❌ Fout bij berekenen van awards:', err.message);
      console.error(err.stack);
      throw err;
    }

    // Toon nieuwe awards
    console.log('📋 Nieuwe awards na berekening:');
    console.log('─'.repeat(80));
    const newAwardsQuery = await client.query(`
      SELECT 
        a.code,
        a.title,
        p.team_name,
        COUNT(*) as count
      FROM awards_per_participant app
      JOIN awards a ON app.award_id = a.id
      JOIN participants p ON app.participant_id = p.id
      WHERE app.stage_id = $1
      GROUP BY a.code, a.title, p.team_name
      ORDER BY a.code, p.team_name
    `, [stage.id]);

    if (newAwardsQuery.rows.length === 0) {
      console.log('   Geen awards toegekend\n');
    } else {
      // Group by award code
      const awardsByCode = new Map();
      newAwardsQuery.rows.forEach(row => {
        if (!awardsByCode.has(row.code)) {
          awardsByCode.set(row.code, []);
        }
        awardsByCode.get(row.code).push(row);
      });

      for (const [code, winners] of awardsByCode) {
        const award = winners[0];
        console.log(`\n${award.title} (${code}):`);
        winners.forEach(winner => {
          console.log(`   - ${winner.team_name}`);
        });
      }
      console.log('');
    }

    // Toon STIJGER_VD_DAG details als die bestaat
    const stijgerQuery = await client.query(`
      SELECT 
        p.team_name,
        fcp_current.rank as current_rank,
        fcp_previous.rank as previous_rank,
        fcp_previous.rank - fcp_current.rank as improvement
      FROM awards_per_participant app
      JOIN awards a ON app.award_id = a.id
      JOIN participants p ON app.participant_id = p.id
      JOIN fantasy_cumulative_points fcp_current ON fcp_current.participant_id = p.id AND fcp_current.after_stage_id = $1
      LEFT JOIN fantasy_cumulative_points fcp_previous ON fcp_previous.participant_id = p.id AND fcp_previous.after_stage_id = (
        SELECT id FROM stages WHERE stage_number < $2 ORDER BY stage_number DESC LIMIT 1
      )
      WHERE app.stage_id = $1 AND a.code = 'STIJGER_VD_DAG'
    `, [stage.id, stageNumber]);

    if (stijgerQuery.rows.length > 0) {
      console.log('📈 STIJGER_VD_DAG details:');
      console.log('─'.repeat(80));
      stijgerQuery.rows.forEach(row => {
        console.log(`   ${row.team_name}:`);
        console.log(`      Vorige positie: ${row.previous_rank || 'N/A'}`);
        console.log(`      Huidige positie: ${row.current_rank}`);
        console.log(`      Verbetering: ${row.improvement || 'N/A'} posities`);
      });
      console.log('');
    }

    // Samenvatting
    console.log('═'.repeat(80));
    console.log('📊 SAMENVATTING');
    console.log('═'.repeat(80));
    const totalAwardsQuery = await client.query(`
      SELECT 
        COUNT(DISTINCT app.participant_id) as participants_with_awards,
        COUNT(*) as total_awards
      FROM awards_per_participant app
      WHERE app.stage_id = $1
    `, [stage.id]);

    const summary = totalAwardsQuery.rows[0];
    console.log(`   Participants met awards: ${summary.participants_with_awards}`);
    console.log(`   Totaal aantal awards: ${summary.total_awards}`);
    console.log('');

  } catch (error) {
    console.error('❌ Fout:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await client.end();
  }
}

testAwardsCalculation();
