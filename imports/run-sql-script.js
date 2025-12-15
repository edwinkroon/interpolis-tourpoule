/**
 * Script om SQL bestanden uit te voeren tegen de lokale Docker database
 * 
 * Gebruik:
 *   node imports/run-sql-script.js imports/update-stages-2025.sql
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

async function runSqlScript(scriptPath) {
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

  // Lees het SQL bestand
  const fullPath = path.resolve(scriptPath);
  if (!fs.existsSync(fullPath)) {
    console.error(`❌ Bestand niet gevonden: ${fullPath}`);
    process.exit(1);
  }

  const sql = fs.readFileSync(fullPath, 'utf-8');
  console.log(`📄 SQL script geladen: ${fullPath}`);
  console.log('');

  const clientConfig = { connectionString };
  if (shouldUseSsl(connectionString)) {
    clientConfig.ssl = { rejectUnauthorized: false };
  }

  const client = new Client(clientConfig);

  try {
    console.log('🔌 Verbinden met database...');
    await client.connect();
    console.log('✅ Verbonden met database');
    console.log('');

    console.log('▶️  SQL script uitvoeren...');
    console.log('─'.repeat(50));
    
    // Voer het SQL script uit
    await client.query(sql);
    
    console.log('─'.repeat(50));
    console.log('✅ SQL script succesvol uitgevoerd!');
    console.log('');

  } catch (error) {
    console.error('❌ Fout bij uitvoeren van SQL script:');
    console.error(error.message);
    if (error.position) {
      console.error(`   Positie in SQL: ${error.position}`);
    }
    process.exit(1);
  } finally {
    await client.end();
    console.log('🔌 Database verbinding gesloten');
  }
}

// Main
const scriptPath = process.argv[2];
if (!scriptPath) {
  console.error('❌ Geen SQL bestand opgegeven!');
  console.error('');
  console.error('Gebruik:');
  console.error('  node imports/run-sql-script.js <pad-naar-sql-bestand>');
  console.error('');
  console.error('Voorbeeld:');
  console.error('  node imports/run-sql-script.js imports/update-stages-2025.sql');
  process.exit(1);
}

runSqlScript(scriptPath).catch((error) => {
  console.error('❌ Onverwachte fout:', error);
  process.exit(1);
});




