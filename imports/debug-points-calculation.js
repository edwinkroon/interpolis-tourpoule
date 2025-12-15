/**
 * Debug script om te zien welke renners punten krijgen
 */

const { Client } = require('pg');
const {
  calculatePositionPoints,
  calculateJerseyPoints,
  aggregatePointsPerParticipant
} = require('../netlify/functions/import-stage-results');

const connectionString = process.env.DATABASE_URL || process.env.NEON_DATABASE_URL;
const client = new Client({ connectionString });

const stageNumber = 13;

client.connect()
  .then(async () => {
    // Get stage
    const stage = await client.query('SELECT id, stage_number, name FROM stages WHERE stage_number = $1', [stageNumber]);
    const stageId = stage.rows[0].id;

    // Get stage results
    const stageResults = await client.query(`
      SELECT rider_id, position 
      FROM stage_results 
      WHERE stage_id = $1 
      ORDER BY position
    `, [stageId]);

    console.log(`Stage results: ${stageResults.rows.length} renners`);
    console.log('Eerste 10 resultaten:');
    stageResults.rows.slice(0, 10).forEach(r => {
      console.log(`  Positie ${r.position}: Rider ${r.rider_id}`);
    });

    // Get fantasy teams
    const fantasyTeams = await client.query(`
      SELECT 
        ft.id as fantasy_team_id,
        ft.participant_id,
        ftr.rider_id,
        r.first_name || ' ' || r.last_name as rider_name
      FROM fantasy_teams ft
      JOIN fantasy_team_riders ftr ON ft.id = ftr.fantasy_team_id
      JOIN riders r ON ftr.rider_id = r.id
      WHERE ftr.active = true
        AND ftr.slot_type = 'main'
      ORDER BY ft.participant_id, ftr.rider_id
    `);

    console.log(`\nFantasy teams: ${fantasyTeams.rows.length} actieve basisrenners`);

    // Calculate position points
    const riderPositionPoints = await calculatePositionPoints(client, stageId, stageResults.rows, false);

    console.log(`\nRiders met position punten: ${riderPositionPoints.size}`);
    console.log('Eerste 10 renners met punten:');
    let count = 0;
    for (const [riderId, points] of riderPositionPoints) {
      if (count >= 10) break;
      const rider = fantasyTeams.rows.find(ft => ft.rider_id === riderId);
      const riderName = rider ? rider.rider_name : `Rider ${riderId}`;
      const stageResult = stageResults.rows.find(sr => sr.rider_id === riderId);
      console.log(`  ${riderName} (${riderId}): ${points} punten (positie ${stageResult?.position || 'N/A'})`);
      count++;
    }

    // Check which fantasy team riders have points
    console.log(`\nFantasy team renners met punten:`);
    let ridersWithPoints = 0;
    fantasyTeams.rows.forEach(team => {
      const points = riderPositionPoints.get(team.rider_id) || 0;
      if (points > 0) {
        ridersWithPoints++;
        if (ridersWithPoints <= 10) {
          console.log(`  ${team.rider_name} (Team ${team.participant_id}): ${points} punten`);
        }
      }
    });
    console.log(`Totaal: ${ridersWithPoints} renners met punten`);

    // Aggregate points
    const participantPoints = aggregatePointsPerParticipant(
      fantasyTeams.rows,
      riderPositionPoints,
      new Map(),
      new Map()
    );

    console.log(`\nParticipant punten:`);
    for (const [participantId, points] of participantPoints) {
      const participant = await client.query('SELECT team_name FROM participants WHERE id = $1', [participantId]);
      const teamName = participant.rows[0]?.team_name || `Participant ${participantId}`;
      console.log(`  ${teamName}: Stage=${points.points_stage}, Jerseys=${points.points_jerseys}`);
    }

    await client.end();
  })
  .catch(e => {
    console.error('Fout:', e.message);
    console.error(e.stack);
    process.exit(1);
  });
