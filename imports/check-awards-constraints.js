const { Client } = require('pg');

const connectionString = process.env.DATABASE_URL || process.env.NEON_DATABASE_URL;
const client = new Client({ connectionString });

client.connect()
  .then(async () => {
    // Check unique constraints
    const constraintsQuery = await client.query(`
      SELECT 
        conname,
        contype,
        pg_get_constraintdef(oid) as definition
      FROM pg_constraint 
      WHERE conrelid = 'awards_per_participant'::regclass 
        AND contype = 'u'
    `);
    
    console.log('Unique constraints op awards_per_participant:');
    console.log('─'.repeat(80));
    constraintsQuery.rows.forEach(row => {
      console.log(`${row.conname}: ${row.definition}`);
    });
    
    // Check if stage_id column exists
    const columnsQuery = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'awards_per_participant'
      ORDER BY ordinal_position
    `);
    
    console.log('\nColumns in awards_per_participant:');
    console.log('─'.repeat(80));
    columnsQuery.rows.forEach(row => {
      console.log(`${row.column_name}: ${row.data_type} (nullable: ${row.is_nullable})`);
    });
    
    await client.end();
  })
  .catch(e => {
    console.error('Fout:', e.message);
    process.exit(1);
  });
