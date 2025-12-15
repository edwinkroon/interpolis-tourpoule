/**
 * Test Harness voor Stage Import Flow
 * 
 * Dit script test de volledige import flow zonder wijzigingen te maken.
 * Gebruik: node imports/test-stage-import.js
 */

const { Client } = require('pg');

const connectionString = process.env.DATABASE_URL || process.env.NEON_DATABASE_URL;

if (!connectionString) {
  console.error('❌ Database configuration missing!');
  console.error('Zorg dat DATABASE_URL of NEON_DATABASE_URL is ingesteld');
  process.exit(1);
}

const client = new Client({ connectionString });

// Test data (mock)
const mockStageId = 1; // Pas aan naar bestaande stage
const mockResults = [
  { position: 1, riderId: 1, timeSeconds: 3600 },
  { position: 2, riderId: 2, timeSeconds: 3605 },
  { position: 3, riderId: 3, timeSeconds: null } // DNF
];
const mockJerseys = [
  { jerseyType: 'geel', riderId: 1 },
  { jerseyType: 'groen', riderId: 2 },
  { jerseyType: 'bolletjes', riderId: 3 },
  { jerseyType: 'wit', riderId: 4 }
];

async function testValidation(client, stageId, results, jerseys) {
  console.log('\n📋 TEST: Validatie');
  console.log('─'.repeat(80));
  
  const errors = [];
  
  // Test 1: stageId bestaat
  if (!stageId) {
    errors.push('stageId is required');
  } else {
    const stageCheck = await client.query('SELECT id, stage_number, name FROM stages WHERE id = $1', [stageId]);
    if (stageCheck.rows.length === 0) {
      errors.push(`Stage with id ${stageId} does not exist`);
    } else {
      console.log(`✅ Stage ${stageId} bestaat: ${stageCheck.rows[0].name}`);
    }
  }
  
  // Test 2: results is array en niet leeg
  if (!Array.isArray(results) || results.length === 0) {
    errors.push('results must be a non-empty array');
  } else {
    console.log(`✅ Results array heeft ${results.length} items`);
  }
  
  // Test 3: Alle renners bestaan
  if (Array.isArray(results) && results.length > 0) {
    const riderIds = results.map(r => r.riderId).filter(id => id != null);
    if (riderIds.length > 0) {
      const riderCheck = await client.query(
        'SELECT id FROM riders WHERE id = ANY($1::int[])',
        [riderIds]
      );
      const foundIds = new Set(riderCheck.rows.map(r => r.id));
      const missingIds = riderIds.filter(id => !foundIds.has(id));
      if (missingIds.length > 0) {
        errors.push(`Riders niet gevonden: ${missingIds.join(', ')}`);
      } else {
        console.log(`✅ Alle ${riderIds.length} renners bestaan in database`);
      }
    }
  }
  
  // Test 4: Posities zijn uniek
  if (Array.isArray(results) && results.length > 0) {
    const positions = results.map(r => r.position).filter(p => p != null);
    const uniquePositions = new Set(positions);
    if (positions.length !== uniquePositions.size) {
      const duplicates = positions.filter((p, i) => positions.indexOf(p) !== i);
      errors.push(`Dubbele posities: ${[...new Set(duplicates)].join(', ')}`);
    } else {
      console.log(`✅ Alle posities zijn uniek`);
    }
  }
  
  // Test 5: Jerseys zijn opgegeven
  if (!jerseys || !Array.isArray(jerseys) || jerseys.length === 0) {
    errors.push('Jerseys moeten worden opgegeven');
  } else if (jerseys.length !== 4) {
    errors.push(`Er moeten 4 truien zijn, maar ${jerseys.length} opgegeven`);
  } else {
    const requiredTypes = ['geel', 'groen', 'bolletjes', 'wit'];
    const providedTypes = jerseys.map(j => j.jerseyType);
    const missingTypes = requiredTypes.filter(t => !providedTypes.includes(t));
    if (missingTypes.length > 0) {
      errors.push(`Ontbrekende truien: ${missingTypes.join(', ')}`);
    } else {
      console.log(`✅ Alle 4 truien zijn opgegeven`);
    }
  }
  
  // Test 6: Check of er al resultaten bestaan
  if (stageId) {
    const existingCheck = await client.query(
      'SELECT COUNT(*) as count FROM stage_results WHERE stage_id = $1',
      [stageId]
    );
    const existingCount = parseInt(existingCheck.rows[0].count, 10);
    if (existingCount > 0) {
      console.log(`⚠️  Waarschuwing: Er bestaan al ${existingCount} resultaten voor deze etappe`);
    } else {
      console.log(`✅ Geen bestaande resultaten voor deze etappe`);
    }
  }
  
  if (errors.length > 0) {
    console.log('\n❌ Validatie fouten:');
    errors.forEach(err => console.log(`   - ${err}`));
    return { valid: false, errors };
  }
  
  console.log('\n✅ Alle validaties geslaagd!');
  return { valid: true, errors: [] };
}

async function testReserveActivation(client, stageId) {
  console.log('\n📋 TEST: Reserve Activatie');
  console.log('─'.repeat(80));
  
  // Haal alle teams op
  const teamsQuery = await client.query(`
    SELECT DISTINCT ft.id, ft.participant_id, p.team_name
    FROM fantasy_teams ft
    JOIN participants p ON ft.participant_id = p.id
  `);
  
  console.log(`Gevonden ${teamsQuery.rows.length} teams`);
  
  // Voor elk team: check basisrenners en reserves
  for (const team of teamsQuery.rows) {
    const mainRidersQuery = await client.query(`
      SELECT ftr.id, ftr.rider_id, ftr.slot_number, ftr.active, r.first_name, r.last_name
      FROM fantasy_team_riders ftr
      JOIN riders r ON ftr.rider_id = r.id
      WHERE ftr.fantasy_team_id = $1
        AND ftr.slot_type = 'main'
    `, [team.id]);
    
    const reserveRidersQuery = await client.query(`
      SELECT ftr.id, ftr.rider_id, ftr.slot_number, ftr.active, r.first_name, r.last_name
      FROM fantasy_team_riders ftr
      JOIN riders r ON ftr.rider_id = r.id
      WHERE ftr.fantasy_team_id = $1
        AND ftr.slot_type = 'reserve'
    `, [team.id]);
    
    const activeMain = mainRidersQuery.rows.filter(r => r.active).length;
    const activeReserve = reserveRidersQuery.rows.filter(r => r.active).length;
    
    console.log(`\n${team.team_name}:`);
    console.log(`   - Actieve basisrenners: ${activeMain}/10`);
    console.log(`   - Actieve reserverenners: ${activeReserve}/5`);
    
    // Check DNF renners voor dit team
    const dnfRiders = mainRidersQuery.rows.filter(mainRider => {
      // Check of renner DNF is in deze etappe
      // Dit is een simpele check - in echte implementatie zou je stage_results checken
      return !mainRider.active;
    });
    
    if (dnfRiders.length > 0) {
      console.log(`   ⚠️  ${dnfRiders.length} inactieve basisrenners gevonden`);
    }
  }
}

async function runTests() {
  try {
    await client.connect();
    console.log('✅ Verbonden met database\n');
    
    // Test 1: Validatie
    const validationResult = await testValidation(client, mockStageId, mockResults, mockJerseys);
    
    if (!validationResult.valid) {
      console.log('\n❌ Validatie gefaald, stop test');
      return;
    }
    
    // Test 2: Reserve activatie check (read-only)
    await testReserveActivation(client, mockStageId);
    
    console.log('\n✅ Alle tests voltooid (read-only mode)');
    
  } catch (error) {
    console.error('❌ Test fout:', error.message);
    console.error(error.stack);
  } finally {
    await client.end();
  }
}

// Run tests
runTests();
