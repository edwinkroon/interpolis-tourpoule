/**
 * Script om foto-URL's van alle renners bij te werken naar ProCyclingStats
 * 
 * Gebruik:
 *   node imports/update-all-rider-photos.js
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

function normalizeName(name) {
  if (!name) return '';
  // Convert to lowercase
  let normalized = name.toLowerCase();
  // Remove diacritics (č -> c, é -> e, etc.)
  normalized = normalized
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
  // Replace spaces and special characters with hyphens
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

async function generateProCyclingStatsUrl(firstName, lastName) {
  const first = normalizeName(firstName);
  const last = normalizeName(lastName);
  if (!first || !last) return null;
  
  // ProCyclingStats URL patterns - based on analysis of working URLs
  // Directories found: aa, bf, cb, cc, dc, ea
  // Extensions found: .jpg, .jpeg, .png
  const directories = ['dc', 'cb', 'cc', 'aa', 'ea', 'bf'];
  const extensions = ['jpg', 'jpeg', 'png'];
  
  // Generate all combinations
  const patterns = [];
  for (const dir of directories) {
    for (const ext of extensions) {
      patterns.push(`https://www.procyclingstats.com/images/riders/bp/${dir}/${first}-${last}-2025.${ext}`);
    }
  }
  
  // Try each pattern and return the first one that works
  for (const url of patterns) {
    if (await testProCyclingStatsUrl(url)) {
      return url;
    }
    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  // If none work, return the first pattern as fallback
  return patterns[0];
}

async function updateAllRiderPhotos() {
  const connectionString = resolveDatabaseUrl();
  if (!connectionString) {
    console.error('❌ Database configuration missing!');
    console.error('Zorg dat je een van deze environment variables hebt ingesteld:');
    console.error('  - NEON_DATABASE_URL');
    console.error('  - DATABASE_URL');
    console.error('  - POSTGRES_URL');
    console.error('  - POSTGRES_PRISMA_URL');
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
    console.log('✅ Verbonden met database');
    console.log('');

    // Get all riders
    console.log('📋 Renners ophalen uit database...');
    const ridersResult = await client.query(`
      SELECT id, first_name, last_name, photo_url
      FROM riders
      ORDER BY last_name, first_name
    `);

    const riders = ridersResult.rows;
    console.log(`✅ ${riders.length} renners gevonden`);
    console.log('');

    console.log('🖼️  Foto-URL\'s bijwerken...');
    console.log('─'.repeat(60));

    let updated = 0;
    let skipped = 0;
    let errors = 0;

    for (const rider of riders) {
      const firstName = rider.first_name || '';
      const lastName = rider.last_name || '';
      
      if (!firstName || !lastName) {
        console.log(`⏭️  Overgeslagen: ${firstName} ${lastName} (ontbrekende naam)`);
        skipped++;
        continue;
      }

      const photoUrl = await generateProCyclingStatsUrl(firstName, lastName);
      
      if (!photoUrl) {
        console.log(`⏭️  Overgeslagen: ${firstName} ${lastName} (kon URL niet genereren)`);
        skipped++;
        continue;
      }

      try {
        await client.query(
          `UPDATE riders SET photo_url = $1 WHERE id = $2`,
          [photoUrl, rider.id]
        );
        console.log(`✅ ${firstName} ${lastName} -> ${photoUrl}`);
        updated++;
      } catch (error) {
        console.error(`❌ Fout bij ${firstName} ${lastName}: ${error.message}`);
        errors++;
      }
    }

    console.log('─'.repeat(60));
    console.log('');
    console.log(`✅ Klaar! ${updated} renners bijgewerkt, ${skipped} overgeslagen, ${errors} fouten`);
    console.log('');

  } catch (error) {
    console.error('❌ Fout bij uitvoeren van script:');
    console.error(error.message);
    process.exit(1);
  } finally {
    await client.end();
    console.log('🔌 Database verbinding gesloten');
  }
}

// Main
updateAllRiderPhotos().catch((error) => {
  console.error('❌ Onverwachte fout:', error);
  process.exit(1);
});




