/**
 * Check hoeveel renners gemiddeld punten scoren per team per etappe
 * Dit helpt om de TEAMWORK award definitie realistisch te maken
 */

const { Client } = require('pg');

const connectionString = process.env.DATABASE_URL || process.env.NEON_DATABASE_URL;
const client = new Client({ connectionString });

client.connect()
  .then(async () => {
    console.log('✅ Verbonden met database\n');

    // Get all stages with results
    const stagesQuery = await client.query(`
      SELECT id, stage_number, name
      FROM stages
      WHERE EXISTS (SELECT 1 FROM fantasy_stage_points WHERE stage_id = stages.id)
      ORDER BY stage_number
    `);

    console.log(`📊 Analyseren van ${stagesQuery.rows.length} etappes met resultaten\n`);

    // For each stage, count how many riders scored points per participant
    const stats = [];

    for (const stage of stagesQuery.rows) {
      const statsQuery = await client.query(`
        WITH scoring_positions AS (
          SELECT DISTINCT (condition_json->>'position')::int as position
          FROM scoring_rules
          WHERE rule_type = 'stage_position'
            AND condition_json->>'position' IS NOT NULL
        ),
        participant_rider_points AS (
          SELECT 
            fsp.participant_id,
            ftr.rider_id,
            CASE 
              WHEN EXISTS (
                SELECT 1 
                FROM stage_results sr
                JOIN scoring_positions sp ON sr.position = sp.position
                WHERE sr.stage_id = $1 
                  AND sr.rider_id = ftr.rider_id
                  AND sr.time_seconds IS NOT NULL
              ) THEN 1
              WHEN EXISTS (
                SELECT 1 
                FROM stage_jersey_wearers sjw
                WHERE sjw.stage_id = $1 
                  AND sjw.rider_id = ftr.rider_id
              ) THEN 1
              ELSE 0
            END as scored_points
          FROM fantasy_stage_points fsp
          JOIN fantasy_teams ft ON fsp.participant_id = ft.participant_id
          JOIN fantasy_team_riders ftr ON ft.id = ftr.fantasy_team_id
          WHERE fsp.stage_id = $1
            AND ftr.active = true
            AND ftr.slot_type = 'main'
            AND EXISTS (
              SELECT 1 
              FROM stage_results sr
              WHERE sr.stage_id = $1 
                AND sr.rider_id = ftr.rider_id
                AND sr.time_seconds IS NOT NULL
            )
        )
        SELECT 
          participant_id,
          COUNT(*) FILTER (WHERE scored_points = 1) as riders_scoring,
          COUNT(*) as total_active_riders
        FROM participant_rider_points
        GROUP BY participant_id
        ORDER BY riders_scoring DESC
      `, [stage.id]);

      if (statsQuery.rows.length > 0) {
        const maxRiders = Math.max(...statsQuery.rows.map(r => parseInt(r.riders_scoring, 10)));
        const avgRiders = statsQuery.rows.reduce((sum, r) => sum + parseInt(r.riders_scoring, 10), 0) / statsQuery.rows.length;
        const teamsWith5Plus = statsQuery.rows.filter(r => parseInt(r.riders_scoring, 10) >= 5).length;
        const teamsWith4Plus = statsQuery.rows.filter(r => parseInt(r.riders_scoring, 10) >= 4).length;
        const teamsWith3Plus = statsQuery.rows.filter(r => parseInt(r.riders_scoring, 10) >= 3).length;

        stats.push({
          stage_number: stage.stage_number,
          stage_name: stage.name,
          max_riders: maxRiders,
          avg_riders: avgRiders.toFixed(2),
          teams_with_5_plus: teamsWith5Plus,
          teams_with_4_plus: teamsWith4Plus,
          teams_with_3_plus: teamsWith3Plus,
          total_teams: statsQuery.rows.length
        });
      }
    }

    // Print summary
    console.log('═'.repeat(100));
    console.log('📊 SAMENVATTING PER ETAPPE');
    console.log('═'.repeat(100));
    console.log('Etappe | Max | Gemiddeld | Teams met ≥5 | Teams met ≥4 | Teams met ≥3 | Totaal teams');
    console.log('─'.repeat(100));

    stats.forEach(s => {
      console.log(
        `${s.stage_number.toString().padStart(7)} | ${s.max_riders.toString().padStart(3)} | ${s.avg_riders.padStart(9)} | ${s.teams_with_5_plus.toString().padStart(11)} | ${s.teams_with_4_plus.toString().padStart(11)} | ${s.teams_with_3_plus.toString().padStart(11)} | ${s.total_teams.toString().padStart(12)}`
      );
    });

    // Overall statistics
    const overallMax = Math.max(...stats.map(s => s.max_riders));
    const overallAvg = stats.reduce((sum, s) => sum + parseFloat(s.avg_riders), 0) / stats.length;
    const totalStagesWith5Plus = stats.filter(s => s.teams_with_5_plus > 0).length;
    const totalStagesWith4Plus = stats.filter(s => s.teams_with_4_plus > 0).length;
    const totalStagesWith3Plus = stats.filter(s => s.teams_with_3_plus > 0).length;

    console.log('\n' + '═'.repeat(100));
    console.log('📊 OVERZICHT');
    console.log('═'.repeat(100));
    console.log(`Totaal etappes geanalyseerd: ${stats.length}`);
    console.log(`Maximaal renners met punten (over alle etappes): ${overallMax}`);
    console.log(`Gemiddeld renners met punten per team per etappe: ${overallAvg.toFixed(2)}`);
    console.log(`Etappes met ≥1 team met ≥5 renners met punten: ${totalStagesWith5Plus} (${((totalStagesWith5Plus / stats.length) * 100).toFixed(1)}%)`);
    console.log(`Etappes met ≥1 team met ≥4 renners met punten: ${totalStagesWith4Plus} (${((totalStagesWith4Plus / stats.length) * 100).toFixed(1)}%)`);
    console.log(`Etappes met ≥1 team met ≥3 renners met punten: ${totalStagesWith3Plus} (${((totalStagesWith3Plus / stats.length) * 100).toFixed(1)}%)`);

    // Recommendation
    console.log('\n' + '═'.repeat(100));
    console.log('💡 AANBEVELING');
    console.log('═'.repeat(100));
    if (totalStagesWith5Plus === 0) {
      console.log('❌ ≥5 renners is te streng - geen enkele etappe heeft teams met ≥5 renners met punten');
      if (totalStagesWith4Plus > 0) {
        console.log('✅ Overweeg ≥4 renners (werkt in ' + ((totalStagesWith4Plus / stats.length) * 100).toFixed(1) + '% van de etappes)');
      } else if (totalStagesWith3Plus > 0) {
        console.log('✅ Overweeg ≥3 renners (werkt in ' + ((totalStagesWith3Plus / stats.length) * 100).toFixed(1) + '% van de etappes)');
      } else {
        console.log('⚠️  Zelfs ≥3 renners is zeldzaam. Overweeg een andere definitie (bijv. "≥5 renners gefinisht" i.p.v. "≥5 renners punten")');
      }
    } else {
      console.log(`✅ ≥5 renners werkt in ${((totalStagesWith5Plus / stats.length) * 100).toFixed(1)}% van de etappes`);
    }

    await client.end();
  })
  .catch(e => {
    console.error('❌ Fout:', e.message);
    console.error(e.stack);
    process.exit(1);
  });
