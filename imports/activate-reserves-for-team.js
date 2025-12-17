/**
 * Script om reserves te activeren voor een team dat minder dan 10 actieve main riders heeft
 * 
 * Gebruik: node imports/activate-reserves-for-team.js [participant_id]
 * Bijvoorbeeld: node imports/activate-reserves-for-team.js 1
 */

const { Client } = require('pg');

const connectionString = process.env.DATABASE_URL || process.env.NEON_DATABASE_URL;

if (!connectionString) {
  console.error('❌ Database configuration missing!');
  console.error('   Set DATABASE_URL or NEON_DATABASE_URL environment variable');
  process.exit(1);
}

const participantId = process.argv[2] ? parseInt(process.argv[2], 10) : null;

if (!participantId) {
  console.error('❌ Geef een participant ID op');
  console.error('Gebruik: node imports/activate-reserves-for-team.js [participant_id]');
  process.exit(1);
}

async function activateReservesForTeam(client, participantId) {
  // Get fantasy team for this participant
  const teamQuery = await client.query(
    'SELECT id FROM fantasy_teams WHERE participant_id = $1',
    [participantId]
  );

  if (teamQuery.rows.length === 0) {
    console.error(`❌ Geen fantasy team gevonden voor participant ${participantId}`);
    return;
  }

  const fantasyTeamId = teamQuery.rows[0].id;

  // Count active main riders
  const activeMainCountQuery = await client.query(
    `SELECT COUNT(*) as count
     FROM fantasy_team_riders
     WHERE fantasy_team_id = $1 AND slot_type = 'main' AND active = true`,
    [fantasyTeamId]
  );

  const activeMainCount = parseInt(activeMainCountQuery.rows[0].count, 10);
  const targetMainCount = 10;
  const neededReserves = Math.max(0, targetMainCount - activeMainCount);

  console.log(`\n📊 Team status voor participant ${participantId}:`);
  console.log(`   Actieve main riders: ${activeMainCount}`);
  console.log(`   Doel: ${targetMainCount}`);
  console.log(`   Reserves nodig: ${neededReserves}`);

  if (neededReserves === 0) {
    console.log('✅ Team heeft al 10 actieve main riders, geen actie nodig');
    return;
  }

  // Get available reserve riders
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
  console.log(`   Beschikbare reserves: ${availableReserves.length}`);

  if (availableReserves.length === 0) {
    console.log('⚠️  Geen reserves beschikbaar om te activeren');
    return;
  }

  // Get available main slots (1-10)
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

  console.log(`   Beschikbare main slots: ${availableMainSlots.join(', ')}`);

  const reservesToActivate = Math.min(neededReserves, availableReserves.length, availableMainSlots.length);

  if (reservesToActivate === 0) {
    console.log('⚠️  Geen reserves kunnen worden geactiveerd (geen beschikbare slots)');
    return;
  }

  console.log(`\n🔄 Activeer ${reservesToActivate} reserve(s)...\n`);

  let activatedCount = 0;

  for (let i = 0; i < reservesToActivate; i++) {
    const reserveToActivate = availableReserves[i];
    const targetSlot = availableMainSlots[i];

    try {
      // Get rider name for logging
      const riderQuery = await client.query(
        'SELECT first_name, last_name FROM riders WHERE id = $1',
        [reserveToActivate.rider_id]
      );
      const riderName = riderQuery.rows[0]
        ? `${riderQuery.rows[0].first_name} ${riderQuery.rows[0].last_name}`.trim()
        : `Rider ${reserveToActivate.rider_id}`;

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
        console.warn(`   ⚠️  Failed to update reserve rider ${reserveToActivate.id} - no rows affected`);
        // Revert slot_number change
        await client.query(
          'UPDATE fantasy_team_riders SET slot_number = $1 WHERE id = $2',
          [reserveToActivate.slot_number, reserveToActivate.id]
        );
        continue;
      }

      console.log(`   ✅ Geactiveerd: ${riderName} (rider_id: ${reserveToActivate.rider_id}) → slot ${targetSlot}`);
      activatedCount++;
    } catch (updateError) {
      console.error(`   ❌ Fout bij activeren reserve ${reserveToActivate.id}:`, updateError.message);
      // Try to revert
      try {
        await client.query(
          'UPDATE fantasy_team_riders SET slot_number = $1 WHERE id = $2',
          [reserveToActivate.slot_number, reserveToActivate.id]
        );
      } catch (revertError) {
        console.error(`   ❌ Fout bij terugdraaien: ${revertError.message}`);
      }
    }
  }

  console.log(`\n✅ ${activatedCount} reserve(s) geactiveerd`);
  console.log(`   Team heeft nu ${activeMainCount + activatedCount} actieve main riders`);
}

async function main() {
  const client = new Client({ connectionString });

  try {
    await client.connect();
    console.log('✅ Verbonden met database\n');

    await client.query('BEGIN');

    await activateReservesForTeam(client, participantId);

    await client.query('COMMIT');
    console.log('\n✅ Transactie voltooid');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('\n❌ Fout:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();




