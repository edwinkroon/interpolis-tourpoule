/**
 * Script om foto-URL's van specifieke renners te controleren
 */

const { Client } = require('pg');

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

async function checkRiderPhotos() {
  const connectionString = resolveDatabaseUrl();
  if (!connectionString) {
    console.error('❌ Database configuration missing!');
    process.exit(1);
  }

  const clientConfig = { connectionString };
  if (shouldUseSsl(connectionString)) {
    clientConfig.ssl = { rejectUnauthorized: false };
  }

  const client = new Client(clientConfig);

  try {
    await client.connect();
    console.log('✅ Verbonden met database\n');

    // Get specific riders
    const result = await client.query(`
      SELECT first_name, last_name, photo_url 
      FROM riders 
      WHERE last_name ILIKE '%ballerini%' 
         OR last_name ILIKE '%pogacar%' 
         OR last_name ILIKE '%vingegaard%'
         OR last_name ILIKE '%van der poel%'
         OR last_name ILIKE '%evenepoel%'
      ORDER BY last_name
    `);

    console.log('Foto-URL\'s van specifieke renners:');
    console.log('─'.repeat(80));
    result.rows.forEach(rider => {
      console.log(`${rider.first_name} ${rider.last_name}:`);
      console.log(`  ${rider.photo_url || '(geen URL)'}`);
      console.log('');
    });

  } catch (error) {
    console.error('❌ Fout:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

checkRiderPhotos().catch((error) => {
  console.error('❌ Onverwachte fout:', error);
  process.exit(1);
});
