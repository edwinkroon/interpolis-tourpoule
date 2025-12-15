/**
 * Integration test voor het import-stage-results proces
 * 
 * Test de volledige flow:
 * 1. Data import & validatie
 * 2. Punten berekenen
 * 3. Reserve activatie
 * 4. Awards berekenen
 * 5. Cumulatieve updates
 */

const {
  getTestDbClient,
  cleanupTestStageData,
  createTestStage,
  createTestRiders,
  createTestParticipant
} = require('../helpers/db');

// Import functions to test
// Note: We need to check what's exported from import-stage-results.js
const importStageResultsModule = require('../../netlify/functions/import-stage-results');

// Skip integration tests if no database configuration is available
const hasDbConfig = !!(
  process.env.NEON_DATABASE_URL_TEST ||
  process.env.NEON_DATABASE_URL ||
  process.env.DATABASE_URL
);

const describeIntegration = hasDbConfig ? describe : describe.skip;

describeIntegration('Import Stage Results - Integration Test', () => {
  let client;
  let testStage;
  let testRiders;
  let testParticipant;

  beforeAll(async () => {
    // Setup: Connect to test database
    client = await getTestDbClient();
  });

  beforeEach(async () => {
    // Setup test data for each test
    testStage = await createTestStage(client, {
      stage_number: 999, // Use high number to avoid conflicts
      name: 'Integration Test Stage'
    });

    testRiders = await createTestRiders(client, 20);
    testParticipant = await createTestParticipant(client);
  });

  afterEach(async () => {
    // Cleanup: Remove test data
    if (testStage?.id) {
      await cleanupTestStageData(client, testStage.id);
      await client.query('DELETE FROM stages WHERE id = $1', [testStage.id]);
    }
    
    if (testRiders?.length) {
      await client.query('DELETE FROM riders WHERE id = ANY($1::int[])', [
        testRiders.map(r => r.id)
      ]);
    }
    
    if (testParticipant?.id) {
      await client.query('DELETE FROM participants WHERE id = $1', [testParticipant.id]);
    }
  });

  afterAll(async () => {
    // Close database connection
    if (client) {
      await client.end();
    }
  });

  describe('validateInput', () => {
    it('should validate correct input data', async () => {
      const results = [
        { position: 1, riderId: testRiders[0].id, timeSeconds: 3600 },
        { position: 2, riderId: testRiders[1].id, timeSeconds: 3605 }
      ];
      const jerseys = [
        { jerseyType: 'geel', riderId: testRiders[0].id },
        { jerseyType: 'groen', riderId: testRiders[1].id },
        { jerseyType: 'bolletjes', riderId: testRiders[2].id },
        { jerseyType: 'wit', riderId: testRiders[3].id }
      ];

      const validation = await importStageResultsModule.validateInput(
        client,
        testStage.id,
        results,
        jerseys
      );

      expect(validation.valid).toBe(true);
      expect(validation.error).toBeUndefined();
    });

    it('should reject invalid stageId', async () => {
      const results = [{ position: 1, riderId: testRiders[0].id }];
      const jerseys = [];

      const validation = await importStageResultsModule.validateInput(
        client,
        null,
        results,
        jerseys
      );

      expect(validation.valid).toBe(false);
      expect(validation.error).toContain('stageId is required');
    });

    it('should reject duplicate positions', async () => {
      const results = [
        { position: 1, riderId: testRiders[0].id },
        { position: 1, riderId: testRiders[1].id } // Duplicate position
      ];
      const jerseys = [];

      const validation = await importStageResultsModule.validateInput(
        client,
        testStage.id,
        results,
        jerseys
      );

      expect(validation.valid).toBe(false);
      expect(validation.error).toContain('Dubbele posities');
    });

    it('should reject missing jerseys', async () => {
      const results = [
        { position: 1, riderId: testRiders[0].id }
      ];
      const jerseys = []; // Missing jerseys

      const validation = await importStageResultsModule.validateInput(
        client,
        testStage.id,
        results,
        jerseys
      );

      expect(validation.valid).toBe(false);
      expect(validation.error).toContain('truien');
    });
  });

  // TODO: Add more integration tests for:
  // - Full import flow (importJerseys, importStageResults)
  // - Points calculation
  // - Reserve activation
  // - Awards calculation
  // - Cumulative points update

  // Note: These tests require the functions to be exported from import-stage-results.js
  // Currently, many functions might not be exported. This is something to address
  // during the code cleanup phase.
});

