/**
 * Script om stages te controleren in de database
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

async function checkStages() {
  const connectionString = resolveDatabaseUrl();
  if (!connectionString) {
    console.error('❌ Database configuration missing!');
    console.error('Zorg dat je DATABASE_URL hebt ingesteld');
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

    const query = `
      SELECT 
        stage_number,
        name,
        start_location,
        end_location,
        distance_km,
        date
      FROM stages
      ORDER BY stage_number
    `;
    
    const { rows } = await client.query(query);
    
    console.log(`📊 Totaal aantal stages: ${rows.length}\n`);
    console.log('─'.repeat(100));
    console.log('Stage | Naam | Start | Eind | KM | Datum');
    console.log('─'.repeat(100));
    
    rows.forEach(row => {
      const stageNum = String(row.stage_number).padStart(2, ' ');
      const name = (row.name || '').substring(0, 40).padEnd(40, ' ');
      const start = (row.start_location || 'NULL').substring(0, 20).padEnd(20, ' ');
      const end = (row.end_location || 'NULL').substring(0, 20).padEnd(20, ' ');
      const km = row.distance_km ? String(row.distance_km).padStart(6, ' ') : '  NULL';
      const date = row.date ? row.date.toISOString().split('T')[0] : 'NULL';
      
      console.log(`${stageNum}    | ${name} | ${start} | ${end} | ${km} | ${date}`);
    });
    
    console.log('─'.repeat(100));
    console.log('');

  } catch (error) {
    console.error('❌ Fout bij ophalen van stages:');
    console.error(error.message);
    process.exit(1);
  } finally {
    await client.end();
    console.log('🔌 Database verbinding gesloten');
  }
}

checkStages().catch((error) => {
  console.error('❌ Onverwachte fout:', error);
  process.exit(1);
});



