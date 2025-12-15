/**
 * Onderzoek waarom teams 0 actieve basisrenners hebben
 * 
 * Dit script analyseert de status van alle teams en hun renners
 */

const { Client } = require('pg');

const connectionString = process.env.DATABASE_URL || process.env.NEON_DATABASE_URL;

if (!connectionString) {
  console.error('❌ Database configuration missing!');
  process.exit(1);
}

const client = new Client({ connectionString });

async function investigate() {
  try {
    await client.connect();
    console.log('✅ Verbonden met database\n');

    // Haal alle teams op
    const teamsQuery = await client.query(`
      SELECT ft.id, ft.participant_id, p.team_name
      FROM fantasy_teams ft
      JOIN participants p ON ft.participant_id = p.id
      ORDER BY p.team_name
    `);

    console.log(`📊 Gevonden ${teamsQuery.rows.length} teams\n`);

    // Haal laatste etappe op
    const latestStageQuery = await client.query(`
      SELECT id, stage_number, name 
      FROM stages 
      ORDER BY stage_number DESC 
      LIMIT 1
    `);
    const latestStage = latestStageQuery.rows[0];
    console.log(`📅 Laatste etappe: ${latestStage.stage_number} - ${latestStage.name}\n`);

    for (const team of teamsQuery.rows) {
      console.log(`\n${'='.repeat(80)}`);
      console.log(`🏁 TEAM: ${team.team_name}`);
      console.log('='.repeat(80));

      // Haal alle renners op voor dit team
      const allRidersQuery = await client.query(`
        SELECT 
          ftr.id,
          ftr.rider_id,
          ftr.slot_type,
          ftr.slot_number,
          ftr.active,
          r.first_name || ' ' || r.last_name as rider_name,
          sr.time_seconds,
          sr.position
        FROM fantasy_team_riders ftr
        JOIN riders r ON ftr.rider_id = r.id
        LEFT JOIN stage_results sr ON sr.rider_id = r.id AND sr.stage_id = $1
        WHERE ftr.fantasy_team_id = $2
        ORDER BY ftr.slot_type, ftr.slot_number
      `, [latestStage.id, team.id]);

      const mainRiders = allRidersQuery.rows.filter(r => r.slot_type === 'main');
      const reserveRiders = allRidersQuery.rows.filter(r => r.slot_type === 'reserve');

      const activeMain = mainRiders.filter(r => r.active).length;
      const inactiveMain = mainRiders.filter(r => !r.active).length;
      const activeReserve = reserveRiders.filter(r => r.active).length;
      const inactiveReserve = reserveRiders.filter(r => !r.active).length;

      console.log(`\n📊 Overzicht:`);
      console.log(`   Basisrenners: ${activeMain} actief, ${inactiveMain} inactief (totaal: ${mainRiders.length})`);
      console.log(`   Reserverenners: ${activeReserve} actief, ${inactiveReserve} inactief (totaal: ${reserveRiders.length})`);

      // Analyseer basisrenners
      if (inactiveMain > 0) {
        console.log(`\n❌ Inactieve basisrenners (${inactiveMain}):`);
        const inactiveMainRiders = mainRiders.filter(r => !r.active);
        for (const rider of inactiveMainRiders.slice(0, 5)) { // Toon eerste 5
          const status = rider.time_seconds === null ? 'DNF/DNS' : 
                        rider.time_seconds === undefined ? 'Geen resultaat' : 
                        'Finished';
          console.log(`   - Slot ${rider.slot_number}: ${rider.rider_name} (${status})`);
        }
        if (inactiveMainRiders.length > 5) {
          console.log(`   ... en ${inactiveMainRiders.length - 5} meer`);
        }
      }

      // Check welke basisrenners DNF/DNS zijn in laatste etappe
      const dnfMainRiders = mainRiders.filter(r => {
        const hasResult = r.time_seconds !== undefined;
        const isDnf = r.time_seconds === null;
        const isMissing = !hasResult;
        return (isDnf || isMissing) && r.active === false;
      });

      if (dnfMainRiders.length > 0) {
        console.log(`\n⚠️  Basisrenners die DNF/DNS zijn in laatste etappe (${dnfMainRiders.length}):`);
        for (const rider of dnfMainRiders.slice(0, 5)) {
          console.log(`   - Slot ${rider.slot_number}: ${rider.rider_name}`);
        }
        if (dnfMainRiders.length > 5) {
          console.log(`   ... en ${dnfMainRiders.length - 5} meer`);
        }
      }

      // Check actieve reserves
      if (activeReserve > 0) {
        console.log(`\n✅ Actieve reserverenners (${activeReserve}):`);
        const activeReserveRiders = reserveRiders.filter(r => r.active);
        for (const rider of activeReserveRiders) {
          console.log(`   - Slot ${rider.slot_number}: ${rider.rider_name}`);
        }
      }

      // Analyse: waarom zijn er 0 actieve basisrenners?
      if (activeMain === 0 && activeReserve > 0) {
        console.log(`\n🔍 ANALYSE:`);
        console.log(`   ⚠️  Team heeft 0 actieve basisrenners maar ${activeReserve} actieve reserves`);
        console.log(`   💡 Reserves zouden geactiveerd moeten worden om tot 10 basisrenners te komen`);
        console.log(`   ❓ Mogelijke oorzaken:`);
        console.log(`      1. Reserve activatie heeft niet gedraaid`);
        console.log(`      2. Reserve activatie heeft gefaald`);
        console.log(`      3. Alle basisrenners zijn uitgevallen en reserves zijn al geactiveerd maar nog niet naar main verplaatst`);
      } else if (activeMain === 0 && activeReserve === 0) {
        console.log(`\n🔍 ANALYSE:`);
        console.log(`   ⚠️  Team heeft geen actieve renners (geen basis, geen reserves)`);
        console.log(`   ❓ Dit is ongebruikelijk - mogelijk data issue`);
      } else if (activeMain < 10 && activeReserve > 0) {
        console.log(`\n🔍 ANALYSE:`);
        console.log(`   ⚠️  Team heeft ${activeMain} actieve basisrenners (doel: 10)`);
        console.log(`   💡 Er zijn ${activeReserve} reserves beschikbaar om aan te vullen`);
        console.log(`   ❓ Reserve activatie zou moeten draaien om tot 10 te komen`);
      }
    }

    // Algemene statistieken
    console.log(`\n\n${'='.repeat(80)}`);
    console.log('📊 ALGEMENE STATISTIEKEN');
    console.log('='.repeat(80));

    const statsQuery = await client.query(`
      SELECT 
        COUNT(*) FILTER (WHERE ftr.slot_type = 'main' AND ftr.active = true) as active_main_total,
        COUNT(*) FILTER (WHERE ftr.slot_type = 'main' AND ftr.active = false) as inactive_main_total,
        COUNT(*) FILTER (WHERE ftr.slot_type = 'reserve' AND ftr.active = true) as active_reserve_total,
        COUNT(*) FILTER (WHERE ftr.slot_type = 'reserve' AND ftr.active = false) as inactive_reserve_total
      FROM fantasy_team_riders ftr
    `);

    const stats = statsQuery.rows[0];
    console.log(`\nTotaal over alle teams:`);
    console.log(`   Actieve basisrenners: ${stats.active_main_total}`);
    console.log(`   Inactieve basisrenners: ${stats.inactive_main_total}`);
    console.log(`   Actieve reserverenners: ${stats.active_reserve_total}`);
    console.log(`   Inactieve reserverenners: ${stats.inactive_reserve_total}`);

    // Check hoeveel teams < 10 actieve basisrenners hebben
    const teamsWithLessThan10Query = await client.query(`
      SELECT 
        p.team_name,
        COUNT(*) FILTER (WHERE ftr.slot_type = 'main' AND ftr.active = true) as active_main
      FROM fantasy_teams ft
      JOIN participants p ON ft.participant_id = p.id
      JOIN fantasy_team_riders ftr ON ftr.fantasy_team_id = ft.id
      GROUP BY p.team_name, ft.id
      HAVING COUNT(*) FILTER (WHERE ftr.slot_type = 'main' AND ftr.active = true) < 10
      ORDER BY active_main
    `);

    console.log(`\n⚠️  Teams met < 10 actieve basisrenners: ${teamsWithLessThan10Query.rows.length}`);
    if (teamsWithLessThan10Query.rows.length > 0) {
      teamsWithLessThan10Query.rows.forEach(row => {
        console.log(`   - ${row.team_name}: ${row.active_main} actieve basisrenners`);
      });
    }

  } catch (error) {
    console.error('❌ Fout:', error.message);
    console.error(error.stack);
  } finally {
    await client.end();
  }
}

investigate();
