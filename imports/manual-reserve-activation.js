/**
 * Handmatig reserve activatie uitvoeren voor een specifieke etappe
 * 
 * Gebruik: node imports/manual-reserve-activation.js [stage_number]
 * Bijvoorbeeld: node imports/manual-reserve-activation.js 15
 */

const { Client } = require('pg');
const { activateReservesForDroppedRiders } = require('../netlify/functions/import-stage-results');

const connectionString = process.env.DATABASE_URL || process.env.NEON_DATABASE_URL;

if (!connectionString) {
  console.error('❌ Database configuration missing!');
  process.exit(1);
}

const stageNumber = process.argv[2] ? parseInt(process.argv[2], 10) : null;

if (!stageNumber) {
  console.error('❌ Geef een etappe nummer op');
  console.error('Gebruik: node imports/manual-reserve-activation.js [stage_number]');
  process.exit(1);
}

const client = new Client({ connectionString });

async function run() {
  try {
    await client.connect();
    console.log('✅ Verbonden met database\n');

    // Vind stage ID
    const stageQuery = await client.query('SELECT id, stage_number, name FROM stages WHERE stage_number = $1', [stageNumber]);
    if (stageQuery.rows.length === 0) {
      console.error(`❌ Etappe ${stageNumber} niet gevonden`);
      process.exit(1);
    }

    const stage = stageQuery.rows[0];
    console.log(`📅 Etappe: ${stage.stage_number} - ${stage.name}\n`);

    // Check of er resultaten zijn
    const resultsCheck = await client.query('SELECT COUNT(*) as count FROM stage_results WHERE stage_id = $1', [stage.id]);
    const resultCount = parseInt(resultsCheck.rows[0].count, 10);
    
    if (resultCount === 0) {
      console.error(`❌ Geen resultaten gevonden voor etappe ${stageNumber}`);
      console.error('   Reserve activatie kan alleen draaien als er resultaten zijn geïmporteerd');
      process.exit(1);
    }

    console.log(`✅ ${resultCount} resultaten gevonden voor deze etappe\n`);
    console.log('🔄 Start reserve activatie...\n');

    // Import de functie (we moeten deze eerst exporteren)
    // Voor nu kopiëren we de logica
    await activateReservesForDroppedRiders(client, stage.id);

    console.log('\n✅ Reserve activatie voltooid!');

    // Check resultaat
    const teamsQuery = await client.query(`
      SELECT 
        p.team_name,
        COUNT(*) FILTER (WHERE ftr.slot_type = 'main' AND ftr.active = true) as active_main,
        COUNT(*) FILTER (WHERE ftr.slot_type = 'reserve' AND ftr.active = true) as active_reserve
      FROM fantasy_teams ft
      JOIN participants p ON ft.participant_id = p.id
      JOIN fantasy_team_riders ftr ON ftr.fantasy_team_id = ft.id
      GROUP BY p.team_name, ft.id
      ORDER BY p.team_name
    `);

    console.log('\n📊 Resultaat na reserve activatie:');
    console.log('─'.repeat(80));
    teamsQuery.rows.forEach(row => {
      console.log(`${row.team_name.padEnd(30)}: ${row.active_main} actieve basisrenners, ${row.active_reserve} actieve reserves`);
    });

  } catch (error) {
    console.error('❌ Fout:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await client.end();
  }
}

run();
