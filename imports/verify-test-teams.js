const { Client } = require('pg');

const connectionString = process.env.NEON_DATABASE_URL || process.env.DATABASE_URL;

if (!connectionString) {
  console.error('❌ Database configuration missing!');
  process.exit(1);
}

const client = new Client({ connectionString });

async function verify() {
  try {
    await client.connect();
    
    const result = await client.query(`
      SELECT 
        p.team_name,
        COUNT(DISTINCT ftr.rider_id) as rider_count,
        COUNT(DISTINCT CASE WHEN ftr.slot_type = 'main' THEN ftr.rider_id END) as main_riders,
        COUNT(DISTINCT CASE WHEN ftr.slot_type = 'reserve' THEN ftr.rider_id END) as reserve_riders
      FROM participants p
      JOIN fantasy_teams ft ON ft.participant_id = p.id
      JOIN fantasy_team_riders ftr ON ftr.fantasy_team_id = ft.id AND ftr.active = true
      WHERE p.user_id LIKE 'test-team-%'
      GROUP BY p.team_name
      ORDER BY p.team_name
    `);
    
    console.log('Test teams rider counts:');
    result.rows.forEach(row => {
      console.log(`  ${row.team_name}: ${row.rider_count} riders (${row.main_riders} main, ${row.reserve_riders} reserve)`);
    });
    
    // Check popularity of riders in test teams
    const popularityResult = await client.query(`
      SELECT 
        p.team_name,
        AVG(popularity.selection_count) as avg_popularity,
        MIN(popularity.selection_count) as min_popularity,
        MAX(popularity.selection_count) as max_popularity
      FROM participants p
      JOIN fantasy_teams ft ON ft.participant_id = p.id
      JOIN fantasy_team_riders ftr ON ftr.fantasy_team_id = ft.id AND ftr.active = true
      LEFT JOIN (
        SELECT 
          ftr2.rider_id,
          COUNT(DISTINCT ftr2.fantasy_team_id) as selection_count
        FROM fantasy_team_riders ftr2
        JOIN fantasy_teams ft2 ON ftr2.fantasy_team_id = ft2.id
        JOIN participants p2 ON ft2.participant_id = p2.id
        WHERE ftr2.active = true
          AND p2.user_id NOT LIKE 'test-team-%'
        GROUP BY ftr2.rider_id
      ) popularity ON popularity.rider_id = ftr.rider_id
      WHERE p.user_id LIKE 'test-team-%'
      GROUP BY p.team_name
      ORDER BY p.team_name
    `);
    
    console.log('\nAverage rider popularity (selection count in other teams):');
    popularityResult.rows.forEach(row => {
      console.log(`  ${row.team_name}: avg=${Math.round(row.avg_popularity || 0)}, min=${row.min_popularity || 0}, max=${row.max_popularity || 0}`);
    });
    
    await client.end();
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

verify();
