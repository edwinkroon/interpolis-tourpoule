const { Client } = require('pg');

const connectionString = process.env.DATABASE_URL || process.env.NEON_DATABASE_URL;
const client = new Client({ connectionString });

client.connect()
  .then(() => client.query(`
    SELECT 
      s.stage_number,
      COUNT(DISTINCT fsp.participant_id) as participants,
      SUM(fsp.points_stage) as total_stage_points,
      SUM(fsp.points_jerseys) as total_jersey_points
    FROM fantasy_stage_points fsp
    JOIN stages s ON fsp.stage_id = s.id
    GROUP BY s.stage_number
    ORDER BY s.stage_number DESC
    LIMIT 10
  `))
  .then(r => {
    console.log('Etappes met punten (laatste 10):');
    console.log('─'.repeat(80));
    r.rows.forEach(x => {
      console.log(`Etappe ${x.stage_number.toString().padStart(2)}: ${x.participants.toString().padStart(2)} participants, Stage=${x.total_stage_points || 0}, Jerseys=${x.total_jersey_points || 0}`);
    });
    return client.end();
  })
  .catch(e => {
    console.error('Fout:', e.message);
    process.exit(1);
  });
