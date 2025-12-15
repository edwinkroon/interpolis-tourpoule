const { Client } = require('pg');

const connectionString = process.env.DATABASE_URL || process.env.NEON_DATABASE_URL;

if (!connectionString) {
  console.error('❌ Database configuration missing!');
  process.exit(1);
}

const client = new Client({ connectionString });

async function checkAlmeida() {
  try {
    await client.connect();
    console.log('✅ Verbonden met database\n');

    const query = `
      SELECT 
        p.team_name,
        r.first_name || ' ' || r.last_name as rider_name,
        ftr.slot_type,
        ftr.active,
        ls.stage_number as latest_stage,
        CASE 
          WHEN sr.time_seconds IS NULL THEN 'DNF/DNS'
          WHEN sr.rider_id IS NULL THEN 'DNS (niet in uitslag)'
          ELSE 'Finished'
        END as status
      FROM fantasy_team_riders ftr
      JOIN fantasy_teams ft ON ftr.fantasy_team_id = ft.id
      JOIN participants p ON ft.participant_id = p.id
      JOIN riders r ON ftr.rider_id = r.id
      JOIN (SELECT id, stage_number FROM stages ORDER BY stage_number DESC LIMIT 1) ls ON 1=1
      LEFT JOIN stage_results sr ON sr.rider_id = r.id AND sr.stage_id = ls.id
      WHERE LOWER(TRIM(r.first_name)) LIKE '%joão%' 
        AND LOWER(TRIM(r.last_name)) LIKE '%almeida%'
      ORDER BY p.team_name, ftr.slot_type;
    `;

    const result = await client.query(query);

    console.log('📊 Teams met Almeida João:');
    console.log('─'.repeat(80));
    
    if (result.rows.length === 0) {
      console.log('✅ Geen teams hebben deze renner in hun team.');
    } else {
      console.log('Team naam'.padEnd(30) + ' | ' + 'Renner'.padEnd(25) + ' | ' + 'Type'.padEnd(8) + ' | Active | Stage | Status');
      console.log('─'.repeat(80));
      result.rows.forEach(row => {
        console.log(
          row.team_name.padEnd(30) + ' | ' +
          row.rider_name.padEnd(25) + ' | ' +
          row.slot_type.padEnd(8) + ' | ' +
          String(row.active).padEnd(6) + ' | ' +
          String(row.latest_stage).padEnd(5) + ' | ' +
          row.status
        );
      });

      // Check reserve activation for teams with Almeida
      const teamsWithAlmeida = [...new Set(result.rows.map(r => r.team_name))];
      
      for (const teamName of teamsWithAlmeida) {
        const teamQuery = `
          SELECT 
            COUNT(CASE WHEN ftr.slot_type = 'main' AND ftr.active = true THEN 1 END) as active_main,
            COUNT(CASE WHEN ftr.slot_type = 'main' AND ftr.active = false THEN 1 END) as inactive_main,
            COUNT(CASE WHEN ftr.slot_type = 'reserve' AND ftr.active = true THEN 1 END) as active_reserve
          FROM fantasy_team_riders ftr
          JOIN fantasy_teams ft ON ftr.fantasy_team_id = ft.id
          JOIN participants p ON ft.participant_id = p.id
          WHERE p.team_name = $1
        `;
        const teamResult = await client.query(teamQuery, [teamName]);
        const stats = teamResult.rows[0];
        
        console.log(`\n📊 ${teamName}:`);
        console.log(`   - Actieve basisrenners: ${stats.active_main}`);
        console.log(`   - Inactieve basisrenners: ${stats.inactive_main}`);
        console.log(`   - Actieve reserverenners: ${stats.active_reserve}`);
        if (stats.active_main < 10 && stats.active_reserve === 0) {
          console.log(`   ⚠ Status: Minder dan 10 basisrenners, geen reserves meer beschikbaar`);
        } else if (stats.active_main === 10) {
          console.log(`   ✅ Status: 10 basisrenners (reserves correct geactiveerd)`);
        } else {
          console.log(`   ⚠ Status: Minder dan 10 basisrenners, maar heeft nog reserves`);
        }
      }
    }

  } catch (error) {
    console.error('❌ Fout:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

checkAlmeida();
