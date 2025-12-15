/**
 * Script om te testen of teams DNF renners hadden en of reserve activatie correct werkte
 * 
 * Gebruik:
 *   node imports/test-dnf-riders.js
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

function formatTable(rows, title) {
  if (rows.length === 0) {
    console.log(`\n${title}: (geen resultaten)`);
    return;
  }

  console.log(`\n${title}:`);
  console.log('─'.repeat(80));
  
  // Get column names
  const columns = Object.keys(rows[0]);
  
  // Calculate column widths
  const widths = columns.map(col => {
    const headerWidth = col.length;
    const dataWidth = Math.max(...rows.map(row => {
      const val = row[col];
      return val === null || val === undefined ? 4 : String(val).length;
    }));
    return Math.max(headerWidth, dataWidth, 10);
  });
  
  // Print header
  const header = columns.map((col, i) => col.padEnd(widths[i])).join(' | ');
  console.log(header);
  console.log('─'.repeat(80));
  
  // Print rows
  rows.forEach(row => {
    const values = columns.map((col, i) => {
      const val = row[col];
      const str = val === null || val === undefined ? 'NULL' : String(val);
      return str.padEnd(widths[i]);
    });
    console.log(values.join(' | '));
  });
  
  console.log('─'.repeat(80));
  console.log(`Totaal: ${rows.length} rij(en)`);
}

async function testDnfRiders() {
  const connectionString = resolveDatabaseUrl();
  if (!connectionString) {
    console.error('❌ Database configuration missing!');
    console.error('Zorg dat je een van deze environment variables hebt ingesteld:');
    console.error('  - NEON_DATABASE_URL');
    console.error('  - DATABASE_URL');
    console.error('  - POSTGRES_URL');
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

    // Query 0: Eerst checken of deze renners überhaupt in de database staan
    console.log('📊 QUERY 0: Zijn Cattaneo of Haig renners in de database?');
    const riderExistsQuery = `
      SELECT 
        r.id,
        r.first_name,
        r.last_name,
        tp.name as team_name
      FROM riders r
      LEFT JOIN teams_pro tp ON r.team_pro_id = tp.id
      WHERE (LOWER(TRIM(r.first_name)) LIKE '%mattia%' AND LOWER(TRIM(r.last_name)) LIKE '%cattaneo%')
         OR (LOWER(TRIM(r.first_name)) LIKE '%jack%' AND LOWER(TRIM(r.last_name)) LIKE '%haig%')
      ORDER BY r.last_name, r.first_name;
    `;
    const riderExistsResult = await client.query(riderExistsQuery);
    formatTable(riderExistsResult.rows, 'Renners in database');

    // Query 1: Quick check - zijn deze renners in teams?
    console.log('📊 QUERY 1: Zijn Cattaneo Mattia of Haig Jack in teams?');
    const quickCheckQuery = `
      SELECT 
        p.team_name,
        r.first_name || ' ' || r.last_name as rider_name,
        r.first_name,
        r.last_name,
        ftr.slot_type,
        ftr.active as is_active,
        ls.stage_number as latest_stage,
        CASE 
          WHEN sr.time_seconds IS NULL THEN 'DNF'
          ELSE 'Finished'
        END as stage_status
      FROM fantasy_team_riders ftr
      JOIN fantasy_teams ft ON ftr.fantasy_team_id = ft.id
      JOIN participants p ON ft.participant_id = p.id
      JOIN riders r ON ftr.rider_id = r.id
      JOIN (SELECT id, stage_number FROM stages ORDER BY stage_number DESC LIMIT 1) ls ON 1=1
      LEFT JOIN stage_results sr ON sr.rider_id = r.id AND sr.stage_id = ls.id
      WHERE (LOWER(TRIM(r.first_name)) LIKE '%mattia%' AND LOWER(TRIM(r.last_name)) LIKE '%cattaneo%')
         OR (LOWER(TRIM(r.first_name)) LIKE '%jack%' AND LOWER(TRIM(r.last_name)) LIKE '%haig%')
      ORDER BY p.team_name, ftr.slot_type;
    `;
    
    const quickCheckResult = await client.query(quickCheckQuery);
    formatTable(quickCheckResult.rows, 'Teams met Cattaneo of Haig');

    if (quickCheckResult.rows.length === 0) {
      console.log('\n✅ Geen teams hebben deze renners in hun team.');
      await client.end();
      return;
    }

    // Query 2: Details per team
    console.log('\n📊 QUERY 2: Details per team');
    const detailsQuery = `
      WITH target_riders AS (
        SELECT id
        FROM riders
        WHERE (LOWER(TRIM(first_name)) LIKE '%mattia%' AND LOWER(TRIM(last_name)) LIKE '%cattaneo%')
           OR (LOWER(TRIM(first_name)) LIKE '%jack%' AND LOWER(TRIM(last_name)) LIKE '%haig%')
      ),
      latest_stage AS (
        SELECT id, stage_number, name
        FROM stages
        ORDER BY stage_number DESC
        LIMIT 1
      )
      SELECT 
        p.team_name,
        r.first_name || ' ' || r.last_name as rider_name,
        ftr.slot_type,
        ftr.slot_number,
        ftr.active,
        sr.position,
        CASE 
          WHEN sr.time_seconds IS NULL THEN 'DNF'
          ELSE 'Finished'
        END as status,
        ls.stage_number as latest_stage_number
      FROM fantasy_team_riders ftr
      JOIN fantasy_teams ft ON ftr.fantasy_team_id = ft.id
      JOIN participants p ON ft.participant_id = p.id
      JOIN riders r ON ftr.rider_id = r.id
      JOIN target_riders tr ON r.id = tr.id
      LEFT JOIN latest_stage ls ON 1=1
      LEFT JOIN stage_results sr ON sr.rider_id = r.id AND sr.stage_id = ls.id
      ORDER BY p.team_name, ftr.slot_type, ftr.slot_number;
    `;
    
    const detailsResult = await client.query(detailsQuery);
    formatTable(detailsResult.rows, 'Details per team');

    // Query 3: Reserve activatie check
    console.log('\n📊 QUERY 3: Reserve activatie status');
    const reserveCheckQuery = `
      WITH target_riders AS (
        SELECT id
        FROM riders
        WHERE (LOWER(TRIM(first_name)) LIKE '%mattia%' AND LOWER(TRIM(last_name)) LIKE '%cattaneo%')
           OR (LOWER(TRIM(first_name)) LIKE '%jack%' AND LOWER(TRIM(last_name)) LIKE '%haig%')
      ),
      latest_stage AS (
        SELECT id, stage_number
        FROM stages
        ORDER BY stage_number DESC
        LIMIT 1
      ),
      teams_with_dnf AS (
        SELECT DISTINCT ft.id as fantasy_team_id, ft.participant_id
        FROM fantasy_team_riders ftr
        JOIN fantasy_teams ft ON ftr.fantasy_team_id = ft.id
        JOIN target_riders tr ON ftr.rider_id = tr.id
        JOIN latest_stage ls ON 1=1
        JOIN stage_results sr ON sr.rider_id = ftr.rider_id AND sr.stage_id = ls.id
        WHERE ftr.slot_type = 'main'
          AND sr.time_seconds IS NULL
      )
      SELECT 
        p.team_name,
        COUNT(CASE WHEN ftr.slot_type = 'main' AND ftr.active = true THEN 1 END) as active_main_riders,
        COUNT(CASE WHEN ftr.slot_type = 'main' AND ftr.active = false THEN 1 END) as inactive_main_riders,
        COUNT(CASE WHEN ftr.slot_type = 'reserve' AND ftr.active = true THEN 1 END) as active_reserve_riders,
        COUNT(CASE WHEN ftr.slot_type = 'reserve' AND ftr.active = false THEN 1 END) as inactive_reserve_riders,
        CASE 
          WHEN COUNT(CASE WHEN ftr.slot_type = 'main' AND ftr.active = true THEN 1 END) = 10 THEN '✓ 10 main riders'
          WHEN COUNT(CASE WHEN ftr.slot_type = 'main' AND ftr.active = true THEN 1 END) < 10 
           AND COUNT(CASE WHEN ftr.slot_type = 'reserve' AND ftr.active = true THEN 1 END) = 0 THEN '⚠ Minder dan 10, geen reserves meer'
          ELSE '⚠ Minder dan 10, maar heeft nog reserves'
        END as status
      FROM teams_with_dnf twd
      JOIN fantasy_teams ft ON twd.fantasy_team_id = ft.id
      JOIN participants p ON ft.participant_id = p.id
      JOIN fantasy_team_riders ftr ON ftr.fantasy_team_id = ft.id
      GROUP BY p.team_name, p.id
      ORDER BY p.team_name;
    `;
    
    const reserveCheckResult = await client.query(reserveCheckQuery);
    formatTable(reserveCheckResult.rows, 'Reserve activatie status');

    // Summary
    console.log('\n📋 SAMENVATTING:');
    console.log('─'.repeat(80));
    const dnfTeams = quickCheckResult.rows.filter(r => r.stage_status === 'DNF' && r.slot_type === 'main');
    if (dnfTeams.length > 0) {
      console.log(`✅ ${dnfTeams.length} team(s) had(den) een DNF basisrenner:`);
      dnfTeams.forEach(row => {
        console.log(`   - ${row.team_name}: ${row.rider_name} (was ${row.slot_type}, nu active=${row.is_active})`);
      });
    } else {
      console.log('✅ Geen teams hadden DNF basisrenners');
    }

    if (reserveCheckResult.rows.length > 0) {
      reserveCheckResult.rows.forEach(row => {
        console.log(`\n📊 ${row.team_name}:`);
        console.log(`   - Actieve basisrenners: ${row.active_main_riders}`);
        console.log(`   - Inactieve basisrenners: ${row.inactive_main_riders}`);
        console.log(`   - Actieve reserverenners: ${row.active_reserve_riders}`);
        console.log(`   - Status: ${row.status}`);
      });
    }

  } catch (error) {
    console.error('❌ Fout bij uitvoeren van queries:');
    console.error(error.message);
    if (error.position) {
      console.error(`   Positie in SQL: ${error.position}`);
    }
    process.exit(1);
  } finally {
    await client.end();
    console.log('\n🔌 Database verbinding gesloten');
  }
}

testDnfRiders().catch((error) => {
  console.error('❌ Onverwachte fout:', error);
  process.exit(1);
});
