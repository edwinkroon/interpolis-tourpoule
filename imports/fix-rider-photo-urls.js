/**
 * Script om alleen verkeerde foto-URL's te fixen
 * Test elke URL en update alleen als de huidige URL niet werkt
 */

// First, manually read .env to prioritize local DATABASE_URL
// This prevents dotenv from loading NEON_DATABASE_URL first
try {
  const fs = require('fs');
  const path = require('path');
  const envPath = path.join(__dirname, '..', '.env');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    const lines = envContent.split('\n');
    for (const line of lines) {
      // Look for DATABASE_URL (usually local)
      const dbMatch = line.match(/^DATABASE_URL=(.+)/);
      if (dbMatch && !dbMatch[1].includes('POSTGRES_USER') && !dbMatch[1].includes('POSTGRES_PASSWORD') && !dbMatch[1].includes('POSTGRES_DB')) {
        const dbUrl = dbMatch[1].trim();
        // Only use if it's localhost
        if (dbUrl.includes('localhost') || dbUrl.includes('127.0.0.1')) {
          process.env.DATABASE_URL = dbUrl;
          break;
        }
      }
    }
  }
} catch (e) {
  // Ignore errors
}

// Then load dotenv (but DATABASE_URL is already set if found above)
try {
  require('dotenv').config();
} catch (e) {
  // dotenv not installed, continue without it
}

// Clear NEON_DATABASE_URL if we have a local DATABASE_URL
if (process.env.DATABASE_URL && (process.env.DATABASE_URL.includes('localhost') || process.env.DATABASE_URL.includes('127.0.0.1'))) {
  delete process.env.NEON_DATABASE_URL;
}

const { Client } = require('pg');

function resolveDatabaseUrl() {
  // Prioritize local databases (localhost) over remote (Neon)
  // First check DATABASE_URL (usually local)
  let url = process.env.DATABASE_URL;
  
  // Check if it's a placeholder
  if (url && (url.includes('POSTGRES_USER') || url.includes('POSTGRES_PASSWORD') || url.includes('POSTGRES_DB'))) {
    url = null;
  }
  
  // If DATABASE_URL is localhost, use it
  if (url && (url.includes('localhost') || url.includes('127.0.0.1'))) {
    return url;
  }
  
  // Otherwise try other environment variables
  url = process.env.POSTGRES_URL || process.env.POSTGRES_PRISMA_URL;
  if (url && (url.includes('localhost') || url.includes('127.0.0.1'))) {
    return url;
  }
  
  // Only use NEON_DATABASE_URL if no local database found
  url = process.env.NEON_DATABASE_URL;
  if (url && !url.includes('localhost') && !url.includes('127.0.0.1')) {
    // This is a remote database, skip it if we're looking for local
    // But for now, allow it if no local database is configured
    return url;
  }
  
  // If no URL found, return null (user needs to set it)
  return null;
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

function normalizeName(name) {
  if (!name) return '';
  let normalized = name.toLowerCase();
  normalized = normalized
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
  normalized = normalized
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return normalized;
}

async function testProCyclingStatsUrl(url) {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Referer': 'https://www.procyclingstats.com/'
      }
    });
    const contentType = response.headers.get('content-type');
    return response.ok && contentType && contentType.startsWith('image/');
  } catch {
    return false;
  }
}

async function findCorrectUrl(firstName, lastName) {
  const first = normalizeName(firstName);
  const last = normalizeName(lastName);
  if (!first || !last) return null;
  
  try {
    // Go to the rider's statistics page on ProCyclingStats
    const riderPageUrl = `https://www.procyclingstats.com/rider/${first}-${last}/statistics`;
    
    const response = await fetch(riderPageUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Referer': 'https://www.procyclingstats.com/'
      }
    });
    
    if (!response.ok) {
      return null;
    }
    
    const html = await response.text();
    
    // Look for image URLs in the HTML
    // ProCyclingStats typically has images in <img> tags with src pointing to /images/riders/
    const imageMatches = html.match(/https:\/\/www\.procyclingstats\.com\/images\/riders\/[^"'\s]+\.(jpg|jpeg|png)/gi);
    
    if (imageMatches && imageMatches.length > 0) {
      // Return the first image URL found
      return imageMatches[0];
    }
    
    // Also try relative URLs
    const relativeImageMatches = html.match(/\/images\/riders\/[^"'\s]+\.(jpg|jpeg|png)/gi);
    if (relativeImageMatches && relativeImageMatches.length > 0) {
      return `https://www.procyclingstats.com${relativeImageMatches[0]}`;
    }
    
    return null;
  } catch (error) {
    console.error(`Error fetching rider page for ${firstName} ${lastName}:`, error.message);
    return null;
  }
}

async function fixRiderPhotoUrls() {
  let connectionString = resolveDatabaseUrl();
  
  // If no connection string found, try common local defaults
  if (!connectionString) {
    console.log('⚠️  Geen DATABASE_URL gevonden, probeer standaard lokale database...');
    const commonDefaults = [
      'postgresql://postgres:postgres@localhost:5432/postgres',
      'postgresql://postgres:password@localhost:5432/postgres',
      'postgresql://postgres@localhost:5432/postgres',
      'postgresql://postgres:postgres@localhost:5432/neondb',
      'postgresql://postgres:password@localhost:5432/neondb',
    ];
    
    // Try each default until one works
    for (const defaultUrl of commonDefaults) {
      try {
        const testClient = new Client({ connectionString: defaultUrl });
        await testClient.connect();
        await testClient.end();
        connectionString = defaultUrl;
        console.log(`✅ Verbonden met lokale database: ${defaultUrl.replace(/:[^:@]+@/, ':****@')}`);
        break;
      } catch (e) {
        // Try next
      }
    }
  }
  
  if (!connectionString) {
    console.error('❌ Database configuration missing!');
    console.error('');
    console.error('Stel DATABASE_URL in, bijvoorbeeld:');
    console.error('  $env:DATABASE_URL="postgresql://postgres:password@localhost:5432/dbname"');
    console.error('');
    console.error('Of voeg toe aan .env bestand:');
    console.error('  DATABASE_URL=postgresql://postgres:password@localhost:5432/dbname');
    process.exit(1);
  }

  const clientConfig = { connectionString };
  if (shouldUseSsl(connectionString)) {
    clientConfig.ssl = { rejectUnauthorized: false };
  }

  const client = new Client(clientConfig);

  try {
    await client.connect();
    console.log(`✅ Verbonden met database: ${connectionString.replace(/:[^:@]+@/, ':****@')}\n`);

    // Get all riders with ProCyclingStats URLs
    const ridersResult = await client.query(`
      SELECT id, first_name, last_name, photo_url
      FROM riders
      WHERE photo_url LIKE '%procyclingstats.com%'
      ORDER BY last_name, first_name
    `);

    const riders = ridersResult.rows;
    console.log(`📋 ${riders.length} renners met ProCyclingStats URL's gevonden\n`);
    console.log('🖼️  Foto-URL\'s controleren en fixen...');
    console.log('─'.repeat(60));

    let checked = 0;
    let fixed = 0;
    let working = 0;
    let notFound = 0;

    for (const rider of riders) {
      checked++;
      const firstName = rider.first_name || '';
      const lastName = rider.last_name || '';
      
      // Test current URL
      const currentUrlWorks = await testProCyclingStatsUrl(rider.photo_url);
      
      if (currentUrlWorks) {
        console.log(`✅ ${firstName} ${lastName} - URL werkt`);
        working++;
      } else {
        console.log(`❌ ${firstName} ${lastName} - URL werkt niet, zoeken naar juiste URL...`);
        
        // Find correct URL
        const correctUrl = await findCorrectUrl(firstName, lastName);
        
        if (correctUrl) {
          try {
            await client.query(
              `UPDATE riders SET photo_url = $1 WHERE id = $2`,
              [correctUrl, rider.id]
            );
            console.log(`   ✅ Gefixed: ${correctUrl}`);
            fixed++;
          } catch (error) {
            console.error(`   ❌ Fout bij updaten: ${error.message}`);
          }
        } else {
          console.log(`   ⚠️  Geen werkende URL gevonden`);
          notFound++;
        }
      }
      
      // Small delay to avoid rate limiting (longer delay for web scraping)
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    console.log('─'.repeat(60));
    console.log(`\n✅ Klaar!`);
    console.log(`   Gecontroleerd: ${checked}`);
    console.log(`   Werkend: ${working}`);
    console.log(`   Gefixed: ${fixed}`);
    console.log(`   Niet gevonden: ${notFound}\n`);

  } catch (error) {
    console.error('❌ Fout:', error.message);
  } finally {
    await client.end();
  }
}

fixRiderPhotoUrls();



