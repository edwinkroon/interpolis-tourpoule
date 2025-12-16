/**
 * Debug script to check team riders in database
 * Shows all riders (active and inactive) for a user
 */

const { getDbClient } = require('../netlify/functions/_shared/db');

async function debugTeamRiders(userId) {
  if (!process.env.NEON_DATABASE_URL && !process.env.DATABASE_URL) {
    console.error('❌ Database configuration missing!');
    console.error('Set NEON_DATABASE_URL or DATABASE_URL environment variable.');
    process.exit(1);
  }

  const client = await getDbClient();

  try {
    // Get all riders (active and inactive) for the user
    const query = `
      SELECT 
        r.id,
        r.first_name,
        r.last_name,
        tp.name as team_name,
        ftr.slot_type,
        ftr.slot_number,
        ftr.active,
        p.user_id,
        p.team_name as participant_team_name
      FROM fantasy_team_riders ftr
      INNER JOIN fantasy_teams ft ON ftr.fantasy_team_id = ft.id
      INNER JOIN participants p ON ft.participant_id = p.id
      INNER JOIN riders r ON ftr.rider_id = r.id
      LEFT JOIN teams_pro tp ON r.team_pro_id = tp.id
      WHERE p.user_id = $1
      ORDER BY ftr.slot_type ASC, ftr.active DESC, ftr.slot_number ASC
    `;
    
    const { rows } = await client.query(query, [userId]);

    if (rows.length === 0) {
      console.log(`\n❌ No riders found for user_id: ${userId}\n`);
      return;
    }

    const participant = rows[0];
    console.log(`\n📊 Team Overview for: ${participant.participant_team_name || 'Unknown'}`);
    console.log(`   User ID: ${userId}\n`);

    // Group by slot_type and active status
    const mainActive = rows.filter(r => r.slot_type === 'main' && r.active);
    const mainInactive = rows.filter(r => r.slot_type === 'main' && !r.active);
    const reserveActive = rows.filter(r => r.slot_type === 'reserve' && r.active);
    const reserveInactive = rows.filter(r => r.slot_type === 'reserve' && !r.active);

    console.log(`📈 Summary:`);
    console.log(`   Main riders (active): ${mainActive.length}`);
    console.log(`   Main riders (inactive): ${mainInactive.length}`);
    console.log(`   Reserve riders (active): ${reserveActive.length}`);
    console.log(`   Reserve riders (inactive): ${reserveInactive.length}`);
    console.log(`   Total: ${rows.length}\n`);

    if (mainActive.length > 0) {
      console.log(`✅ Active Main Riders (${mainActive.length}):`);
      mainActive.forEach(r => {
        console.log(`   Slot ${r.slot_number}: ${r.first_name} ${r.last_name} (${r.team_name || 'Unknown'})`);
      });
      console.log('');
    }

    if (mainInactive.length > 0) {
      console.log(`❌ Inactive Main Riders (${mainInactive.length}):`);
      mainInactive.forEach(r => {
        console.log(`   Slot ${r.slot_number}: ${r.first_name} ${r.last_name} (${r.team_name || 'Unknown'})`);
      });
      console.log('');
    }

    if (reserveActive.length > 0) {
      console.log(`✅ Active Reserve Riders (${reserveActive.length}):`);
      reserveActive.forEach(r => {
        console.log(`   Slot ${r.slot_number}: ${r.first_name} ${r.last_name} (${r.team_name || 'Unknown'})`);
      });
      console.log('');
    }

    if (reserveInactive.length > 0) {
      console.log(`⚠️  Inactive Reserve Riders (${reserveInactive.length}) - This shouldn't happen!:`);
      reserveInactive.forEach(r => {
        console.log(`   Slot ${r.slot_number}: ${r.first_name} ${r.last_name} (${r.team_name || 'Unknown'})`);
      });
      console.log('');
    }

    if (reserveActive.length === 0 && reserveInactive.length === 0) {
      console.log(`⚠️  No reserve riders found! You should have 5 reserve riders.\n`);
    }

    if (mainActive.length < 10) {
      console.log(`⚠️  Only ${mainActive.length} active main riders. You should have 10 active main riders.\n`);
    }

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    await client.end();
  }
}

// Get userId from command line argument
const userId = process.argv[2];

if (!userId) {
  console.error('Usage: node imports/debug-team-riders.js <userId>');
  console.error('Example: node imports/debug-team-riders.js auth0|123456');
  process.exit(1);
}

debugTeamRiders(userId)
  .then(() => {
    console.log('✅ Done');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Failed:', error);
    process.exit(1);
  });


