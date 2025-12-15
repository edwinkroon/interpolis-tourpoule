const { Client } = require('pg');

const connectionString = process.env.DATABASE_URL || process.env.NEON_DATABASE_URL;
const client = new Client({ connectionString });

client.connect()
  .then(() => client.query(`
    SELECT s.stage_number, s.name, COUNT(sr.id) as result_count
    FROM stages s
    LEFT JOIN stage_results sr ON sr.stage_id = s.id
    GROUP BY s.stage_number, s.name
    ORDER BY s.stage_number DESC
    LIMIT 10
  `))
  .then(r => {
    console.log('Resultaten per etappe (laatste 10):');
    console.log('─'.repeat(80));
    r.rows.forEach(row => {
      console.log(`Etappe ${row.stage_number}: ${row.result_count} resultaten - ${row.name}`);
    });
    return client.end();
  })
  .catch(e => {
    console.error('Fout:', e.message);
    process.exit(1);
  });
