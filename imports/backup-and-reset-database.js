/**
 * Script om alle database tabellen te backuppen naar CSV en vervolgens alle tabellen leeg te maken en sequences te resetten
 * 
 * Gebruik: node imports/backup-and-reset-database.js
 * 
 * Dit script zal:
 * 1. Alle data van alle tabellen exporteren naar CSV bestanden in database_csv/backup_YYYYMMDD_HHMMSS/
 * 2. Alle tabellen leegmaken (TRUNCATE)
 * 3. Alle sequences resetten naar 0
 * 
 * WAARSCHUWING: Dit script verwijdert ALLE data uit de database!
 * Zorg dat je een backup hebt voordat je dit script uitvoert.
 * 
 * Voor lokale database, gebruik:
 *   $env:DATABASE_URL="postgresql://postgres:password@localhost:5432/dbname"
 *   node imports/backup-and-reset-database.js
 */

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

function resolveDatabaseUrl() {
  return (
    process.env.NEON_DATABASE_URL ||
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL ||
    process.env.POSTGRES_PRISMA_URL
  );
}

function shouldUseSsl(connectionString) {
  if (!connectionString) return false;
  const lower = connectionString.toLowerCase();
  
  if (
    lower.includes('sslmode=require') ||
    lower.includes('ssl=true') ||
    lower.includes('ssl=1') ||
    lower.includes('channel_binding=require')
  ) {
    return true;
  }
  
  if (lower.includes('.neon.tech') || lower.includes('.aws.neon.tech')) {
    return true;
  }
  
  if (
    lower.includes('localhost') ||
    lower.includes('127.0.0.1') ||
    lower.includes('0.0.0.0') ||
    lower.includes('host.docker.internal')
  ) {
    return false;
  }
  
  return false;
}

// Order for truncating tables (child tables first to respect foreign keys)
// This is a suggested order, but the script will dynamically detect all tables
const suggestedTruncateOrder = [
  'awards_per_participant',
  'fantasy_cumulative_points',
  'fantasy_stage_points',
  'stage_jersey_wearers',
  'stage_results',
  'fantasy_team_riders',
  'bulletin_messages',
  'awards',
  'fantasy_teams',
  'participants',
  'stages',
  'riders',
  'teams_pro',
  'jerseys',
  'scoring_rules',
  'settings',
];

// Helper function to escape CSV values
function escapeCsvValue(value) {
  if (value === null || value === undefined) {
    return '';
  }
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

// Helper function to export table to CSV
async function exportTableToCsv(client, tableName, backupDir) {
  try {
    // Get all columns for this table
    const columnsResult = await client.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = $1
      ORDER BY ordinal_position
    `, [tableName]);

    if (columnsResult.rows.length === 0) {
      console.log(`  ⚠ Tabel ${tableName} bestaat niet, overslaan...`);
      return;
    }

    const columns = columnsResult.rows.map(row => row.column_name);
    
    // Get all data
    const dataResult = await client.query(`SELECT * FROM ${tableName} ORDER BY id`);
    
    // Create CSV content
    const csvLines = [];
    
    // Header row
    csvLines.push(columns.map(escapeCsvValue).join(','));
    
    // Data rows
    for (const row of dataResult.rows) {
      const values = columns.map(col => {
        const value = row[col];
        // Handle JSON fields
        if (value && typeof value === 'object') {
          return escapeCsvValue(JSON.stringify(value));
        }
        // Handle Date objects
        if (value instanceof Date) {
          return escapeCsvValue(value.toISOString().split('T')[0]);
        }
        return escapeCsvValue(value);
      });
      csvLines.push(values.join(','));
    }
    
    // Write to file
    const csvPath = path.join(backupDir, `${tableName}.csv`);
    fs.writeFileSync(csvPath, csvLines.join('\n'), 'utf-8');
    
      console.log(`  ✅ Geëxporteerd ${dataResult.rows.length} rijen van ${tableName} naar ${path.basename(csvPath)}`);
  } catch (err) {
      console.error(`  ❌ Fout bij exporteren van ${tableName}:`, err.message);
    throw err;
  }
}

// Helper function to get all sequences
async function getAllSequences(client) {
  const result = await client.query(`
    SELECT sequence_name
    FROM information_schema.sequences
    WHERE sequence_schema = 'public'
    ORDER BY sequence_name
  `);
  return result.rows.map(row => row.sequence_name);
}

// Helper function to reset all sequences
async function resetAllSequences(client) {
  const sequences = await getAllSequences(client);
  console.log(`\nResetting ${sequences.length} sequences...`);
  
  for (const seqName of sequences) {
    try {
      await client.query(`SELECT setval('${seqName}', 0, false)`);
      console.log(`  ✅ Sequence ${seqName} gereset`);
    } catch (err) {
      console.error(`  ❌ Fout bij resetten van sequence ${seqName}:`, err.message);
    }
  }
}

// Main function
async function main() {
  const connectionString = resolveDatabaseUrl();
  if (!connectionString) {
    console.error('❌ Database configuration missing!');
    console.error('Zorg dat je een van deze environment variables hebt ingesteld:');
    console.error('  - NEON_DATABASE_URL');
    console.error('  - DATABASE_URL');
    console.error('  - POSTGRES_URL');
    console.error('');
    console.error('Voor lokale Docker database, gebruik bijvoorbeeld:');
    console.error('  $env:DATABASE_URL="postgresql://postgres:password@localhost:5432/dbname"');
    process.exit(1);
  }

  const clientConfig = { connectionString };
  if (shouldUseSsl(connectionString)) {
    clientConfig.ssl = { rejectUnauthorized: false };
  }

  const client = new Client(clientConfig);

  try {
    console.log('🔌 Verbinden met database...');
    await client.connect();
    console.log('✅ Verbonden met database\n');

    // Create backup directory with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19).replace('T', '_');
    const backupDir = path.join(__dirname, '../database_csv', `backup_${timestamp}`);
    
    if (!fs.existsSync(path.dirname(backupDir))) {
      fs.mkdirSync(path.dirname(backupDir), { recursive: true });
    }
    fs.mkdirSync(backupDir, { recursive: true });
    
    console.log(`Backup directory: ${backupDir}\n`);

    // Step 1: Export all tables to CSV
    console.log('========================================');
    console.log('STAP 1: Exporteren van alle tabellen naar CSV...');
    console.log('========================================\n');

    // Get all tables from information_schema
    const tablesResult = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_type = 'BASE TABLE'
        AND table_name NOT LIKE 'prisma%'
        AND table_name NOT LIKE '_prisma%'
      ORDER BY table_name
    `);

    const allTables = tablesResult.rows.map(row => row.table_name);
    
    for (const tableName of allTables) {
      await exportTableToCsv(client, tableName, backupDir);
    }

    console.log(`\n✅ Alle tabellen geëxporteerd naar ${path.basename(backupDir)}\n`);

    // Step 2: Truncate all tables (in correct order to respect foreign keys)
    console.log('========================================');
    console.log('STAP 2: Leegmaken van alle tabellen...');
    console.log('========================================\n');

    // Get all tables and sort them according to suggested order
    const allTablesForTruncate = tablesResult.rows.map(row => row.table_name);
    
    // Sort tables: first the ones in suggested order, then the rest
    const truncateOrder = [
      ...suggestedTruncateOrder.filter(t => allTablesForTruncate.includes(t)),
      ...allTablesForTruncate.filter(t => !suggestedTruncateOrder.includes(t))
    ];

    // Only truncate tables that exist
    for (const tableName of truncateOrder) {
      try {
        // Check if table exists
        const existsResult = await client.query(`
          SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = $1
          )
        `, [tableName]);

        if (existsResult.rows[0].exists) {
          await client.query(`TRUNCATE TABLE ${tableName} RESTART IDENTITY CASCADE`);
          console.log(`  ✅ Tabel ${tableName} geleegd`);
        } else {
          console.log(`  ⚠ Tabel ${tableName} bestaat niet, overslaan...`);
        }
      } catch (err) {
        console.error(`  ❌ Fout bij leegmaken van ${tableName}:`, err.message);
        // Continue with other tables
      }
    }

    console.log('\n✅ Alle tabellen geleegd\n');

    // Step 3: Reset all sequences
    console.log('========================================');
    console.log('STAP 3: Resetten van alle sequences...');
    console.log('========================================\n');

    await resetAllSequences(client);

    console.log('\n✅ Alle sequences gereset\n');

    // Step 4: Verify
    console.log('========================================');
    console.log('STAP 4: Verificatie...');
    console.log('========================================\n');

    const verifyResult = await client.query(`
      SELECT 
        table_name,
        (SELECT COUNT(*) FROM information_schema.tables t2 
         WHERE t2.table_schema = 'public' 
         AND t2.table_name = t.table_name) as exists,
        (SELECT COUNT(*) FROM information_schema.columns c 
         WHERE c.table_schema = 'public' 
         AND c.table_name = t.table_name) as column_count
      FROM information_schema.tables t
      WHERE t.table_schema = 'public'
        AND t.table_type = 'BASE TABLE'
        AND t.table_name NOT LIKE 'prisma%'
        AND t.table_name NOT LIKE '_prisma%'
      ORDER BY t.table_name
    `);

    console.log('Tabel status:');
    for (const row of verifyResult.rows) {
      const tableName = row.table_name;
      try {
        const countResult = await client.query(`SELECT COUNT(*) as count FROM ${tableName}`);
        const count = parseInt(countResult.rows[0].count, 10);
        console.log(`  ${tableName}: ${count} rijen`);
      } catch (err) {
        console.log(`  ${tableName}: Fout bij controleren aantal - ${err.message}`);
      }
    }

    console.log('\n========================================');
    console.log('✅ Backup en reset succesvol voltooid!');
    console.log(`✅ Backup opgeslagen in: ${backupDir}`);
    console.log('========================================\n');

  } catch (error) {
    console.error('\n❌ Fout:', error.message);
    if (error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  } finally {
    await client.end();
    console.log('🔌 Database verbinding gesloten');
  }
}

// Run the script
main();
