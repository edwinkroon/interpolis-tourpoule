/**
 * Script om foto-URL's te controleren
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

async function checkRiderPhotoUrls() {
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
    
    // Check Davide Ballerini
    const ballerini = await client.query(`
      SELECT first_name, last_name, photo_url 
      FROM riders 
      WHERE last_name ILIKE '%ballerini%'
    `);
    
    console.log('Davide Ballerini:');
    console.log(JSON.stringify(ballerini.rows, null, 2));
    console.log('');
    
    // Check a few other riders
    const others = await client.query(`
      SELECT first_name, last_name, photo_url 
      FROM riders 
      WHERE photo_url IS NOT NULL 
        AND last_name NOT ILIKE '%ballerini%'
      LIMIT 5
    `);
    
    console.log('Other riders:');
    console.log(JSON.stringify(others.rows, null, 2));
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.end();
  }
}

checkRiderPhotoUrls();



