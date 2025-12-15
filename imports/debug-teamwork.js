const { Client } = require('pg');

const connectionString = process.env.DATABASE_URL || process.env.NEON_DATABASE_URL;
const client = new Client({ connectionString });

const stageNumber = 13;

client.connect()
  .then(async () => {
    const stage = await client.query('SELECT id, stage_number FROM stages WHERE stage_number = $1', [stageNumber]);
    const stageId = stage.rows[0].id;
    const currentStageNumber = stage.rows[0].stage_number;

    // Test scoring positions
    const scoringPositions = await client.query(`
      SELECT DISTINCT (condition_json->>'position')::int as position
      FROM scoring_rules
      WHERE rule_type = 'stage_position'
        AND condition_json->>'position' IS NOT NULL
      ORDER BY position
      LIMIT 10
    `);
    console.log('Scoring positions (first 10):', scoringPositions.rows.map(r => r.position));

    // Test for one participant
    const testQuery = await client.query(`
      WITH scoring_positions AS (
        SELECT DISTINCT (condition_json->>'position')::int as position
        FROM scoring_rules
        WHERE rule_type = 'stage_position'
          AND condition_json->>'position' IS NOT NULL
      )
      SELECT 
        fsp.participant_id,
        fsp.stage_id,
        ftr.rider_id,
        sr.position as result_position,
        CASE 
          WHEN EXISTS (
            SELECT 1 
            FROM stage_results sr2
            JOIN scoring_positions sp ON sr2.position = sp.position
            WHERE sr2.stage_id = fsp.stage_id 
              AND sr2.rider_id = ftr.rider_id
              AND sr2.time_seconds IS NOT NULL
          ) THEN 1
          WHEN EXISTS (
            SELECT 1 
            FROM stage_jersey_wearers sjw
            WHERE sjw.stage_id = fsp.stage_id 
              AND sjw.rider_id = ftr.rider_id
          ) THEN 1
          ELSE 0
        END as scored_points
      FROM fantasy_stage_points fsp
      JOIN fantasy_teams ft ON fsp.participant_id = ft.participant_id
      JOIN fantasy_team_riders ftr ON ft.id = ftr.fantasy_team_id
      JOIN stages s ON fsp.stage_id = s.id
      LEFT JOIN stage_results sr ON sr.stage_id = fsp.stage_id AND sr.rider_id = ftr.rider_id
      WHERE s.stage_number <= $1
        AND ftr.active = true
        AND ftr.slot_type = 'main'
        AND fsp.participant_id = (SELECT id FROM participants LIMIT 1)
      ORDER BY fsp.stage_id, ftr.rider_id
      LIMIT 20
    `, [currentStageNumber]);

    console.log('\nRider points check (first 20):');
    testQuery.rows.forEach(row => {
      console.log(`  Participant ${row.participant_id}, Stage ${row.stage_id}, Rider ${row.rider_id}, Position ${row.result_position || 'N/A'}, Scored: ${row.scored_points}`);
    });

    // Count per stage
    const countQuery = await client.query(`
      WITH scoring_positions AS (
        SELECT DISTINCT (condition_json->>'position')::int as position
        FROM scoring_rules
        WHERE rule_type = 'stage_position'
          AND condition_json->>'position' IS NOT NULL
      ),
      participant_stage_rider_points AS (
        SELECT 
          fsp.participant_id,
          fsp.stage_id,
          ftr.rider_id,
          CASE 
            WHEN EXISTS (
              SELECT 1 
              FROM stage_results sr
              JOIN scoring_positions sp ON sr.position = sp.position
              WHERE sr.stage_id = fsp.stage_id 
                AND sr.rider_id = ftr.rider_id
                AND sr.time_seconds IS NOT NULL
            ) THEN 1
            WHEN EXISTS (
              SELECT 1 
              FROM stage_jersey_wearers sjw
              WHERE sjw.stage_id = fsp.stage_id 
                AND sjw.rider_id = ftr.rider_id
            ) THEN 1
            ELSE 0
          END as scored_points
        FROM fantasy_stage_points fsp
        JOIN fantasy_teams ft ON fsp.participant_id = ft.participant_id
        JOIN fantasy_team_riders ftr ON ft.id = ftr.fantasy_team_id
        JOIN stages s ON fsp.stage_id = s.id
        WHERE s.stage_number <= $1
          AND ftr.active = true
          AND ftr.slot_type = 'main'
      ),
      participant_stage_stats AS (
        SELECT 
          participant_id,
          stage_id,
          COUNT(*) FILTER (WHERE scored_points = 1) as riders_scoring
        FROM participant_stage_rider_points
        GROUP BY participant_id, stage_id
      )
      SELECT 
        participant_id,
        stage_id,
        riders_scoring
      FROM participant_stage_stats
      WHERE riders_scoring >= 5
      ORDER BY participant_id, stage_id
      LIMIT 20
    `, [currentStageNumber]);

    console.log('\nStages with ≥5 riders scoring:');
    countQuery.rows.forEach(row => {
      console.log(`  Participant ${row.participant_id}, Stage ${row.stage_id}: ${row.riders_scoring} riders`);
    });

    await client.end();
  })
  .catch(e => {
    console.error('Fout:', e.message);
    console.error(e.stack);
    process.exit(1);
  });
