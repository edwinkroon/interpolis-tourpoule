const { Client } = require('pg');

const connectionString = process.env.DATABASE_URL || process.env.NEON_DATABASE_URL;
if (!connectionString) {
  console.error('❌ Database configuration missing!');
  process.exit(1);
}

const client = new Client({ connectionString });

async function main() {
  try {
    await client.connect();
    console.log('✅ Verbonden met database\n');

    // Get latest stage id/number
    const latestStageRes = await client.query(`SELECT id, stage_number, name FROM stages ORDER BY stage_number DESC LIMIT 1`);
    if (latestStageRes.rows.length === 0) {
      console.log('Geen stages gevonden.');
      return;
    }
    const latestStage = latestStageRes.rows[0];
    console.log(`Laatste etappe: ${latestStage.stage_number} - ${latestStage.name}\n`);

    // Find riders with DNF/DNS or missing result (for participants' main riders)
    const dnfQuery = `
      WITH latest_stage AS (
        SELECT $1::int AS stage_id
      ),
      rider_status AS (
        SELECT
          ftr.id as ftr_id,
          ftr.fantasy_team_id,
          ftr.slot_type,
          ftr.slot_number,
          ftr.active,
          r.id as rider_id,
          r.first_name,
          r.last_name,
          sr.time_seconds,
          sr.rider_id as sr_rider_id
        FROM fantasy_team_riders ftr
        JOIN riders r ON ftr.rider_id = r.id
        LEFT JOIN stage_results sr ON sr.rider_id = r.id AND sr.stage_id = $1
        WHERE ftr.slot_type = 'main'
      )
      SELECT
        p.team_name,
        r.first_name || ' ' || r.last_name AS rider_name,
        rs.slot_number,
        CASE
          WHEN rs.sr_rider_id IS NULL THEN 'DNS/missing'
          WHEN rs.time_seconds IS NULL THEN 'DNF/DNS'
          ELSE 'Finished'
        END AS status
      FROM rider_status rs
      JOIN fantasy_team_riders ftr ON rs.ftr_id = ftr.id
      JOIN fantasy_teams ft ON ftr.fantasy_team_id = ft.id
      JOIN participants p ON ft.participant_id = p.id
      JOIN riders r ON rs.rider_id = r.id
      WHERE rs.slot_type = 'main'
        AND (rs.sr_rider_id IS NULL OR rs.time_seconds IS NULL)
      ORDER BY p.team_name, rs.slot_number;
    `;

    const dnfResult = await client.query(dnfQuery, [latestStage.id]);

    if (dnfResult.rows.length === 0) {
      console.log('✅ Geen DNF/DNS basisrenners in de laatste etappe.');
    } else {
      console.log('📊 DNF/DNS basisrenners (laatste etappe):');
      console.log('─'.repeat(100));
      console.log('Team'.padEnd(30) + ' | ' + 'Renner'.padEnd(30) + ' | Slot | Status');
      console.log('─'.repeat(100));
      dnfResult.rows.forEach(row => {
        console.log(
          row.team_name.padEnd(30) + ' | ' +
          row.rider_name.padEnd(30) + ' | ' +
          String(row.slot_number).padEnd(4) + ' | ' +
          row.status
        );
      });
      console.log('─'.repeat(100));
    }

    // Show team counts after activation
    const teamCountsQuery = `
      SELECT 
        p.team_name,
        COUNT(*) FILTER (WHERE ftr.slot_type = 'main' AND ftr.active = true) AS active_main,
        COUNT(*) FILTER (WHERE ftr.slot_type = 'main' AND ftr.active = false) AS inactive_main,
        COUNT(*) FILTER (WHERE ftr.slot_type = 'reserve' AND ftr.active = true) AS active_reserve,
        COUNT(*) FILTER (WHERE ftr.slot_type = 'reserve' AND ftr.active = false) AS inactive_reserve
      FROM fantasy_team_riders ftr
      JOIN fantasy_teams ft ON ftr.fantasy_team_id = ft.id
      JOIN participants p ON ft.participant_id = p.id
      GROUP BY p.team_name
      ORDER BY p.team_name;
    `;

    const countsRes = await client.query(teamCountsQuery);
    console.log('\n📊 Teamsamenvatting (actieve basis/reserve):');
    console.log('─'.repeat(100));
    console.log('Team'.padEnd(30) + ' | Active main | Inactive main | Active reserve | Inactive reserve');
    console.log('─'.repeat(100));
    countsRes.rows.forEach(row => {
      console.log(
        row.team_name.padEnd(30) + ' | ' +
        String(row.active_main).padEnd(12) + ' | ' +
        String(row.inactive_main).padEnd(14) + ' | ' +
        String(row.active_reserve).padEnd(15) + ' | ' +
        String(row.inactive_reserve).padEnd(17)
      );
    });
    console.log('─'.repeat(100));

  } catch (err) {
    console.error('❌ Fout:', err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
