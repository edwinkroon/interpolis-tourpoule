const { Client } = require('pg');

const connectionString = process.env.DATABASE_URL || process.env.NEON_DATABASE_URL;
const client = new Client({ connectionString });

client.connect()
  .then(async () => {
    console.log('✅ Verbonden met database\n');

    // Check awards_per_participant table
    console.log('📋 awards_per_participant tabel:');
    console.log('─'.repeat(80));
    
    const columnsQuery = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'awards_per_participant'
      ORDER BY ordinal_position
    `);
    
    columnsQuery.rows.forEach(row => {
      console.log(`  ${row.column_name.padEnd(20)}: ${row.data_type.padEnd(20)} (nullable: ${row.is_nullable}, default: ${row.column_default || 'NULL'})`);
    });
    
    // Check unique constraints
    console.log('\n🔒 Unique constraints:');
    console.log('─'.repeat(80));
    const constraintsQuery = await client.query(`
      SELECT 
        conname,
        pg_get_constraintdef(oid) as definition
      FROM pg_constraint 
      WHERE conrelid = 'awards_per_participant'::regclass 
        AND contype = 'u'
    `);
    
    if (constraintsQuery.rows.length === 0) {
      console.log('  Geen unique constraints gevonden');
    } else {
      constraintsQuery.rows.forEach(row => {
        console.log(`  ${row.conname}:`);
        console.log(`    ${row.definition}`);
      });
    }
    
    // Check foreign keys
    console.log('\n🔗 Foreign keys:');
    console.log('─'.repeat(80));
    const fkQuery = await client.query(`
      SELECT 
        conname,
        pg_get_constraintdef(oid) as definition
      FROM pg_constraint 
      WHERE conrelid = 'awards_per_participant'::regclass 
        AND contype = 'f'
    `);
    
    if (fkQuery.rows.length === 0) {
      console.log('  Geen foreign keys gevonden');
    } else {
      fkQuery.rows.forEach(row => {
        console.log(`  ${row.conname}:`);
        console.log(`    ${row.definition}`);
      });
    }
    
    await client.end();
  })
  .catch(e => {
    console.error('❌ Fout:', e.message);
    console.error(e.stack);
    process.exit(1);
  });
