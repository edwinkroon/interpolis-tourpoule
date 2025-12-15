/**
 * Database test helpers
 * 
 * Utilities voor het opzetten en opruimen van test databases
 */

const { Client } = require('pg');

/**
 * Get test database client
 * Uses NEON_DATABASE_URL_TEST if available, otherwise falls back to NEON_DATABASE_URL
 * 
 * @returns {Promise<Client>} Database client
 */
async function getTestDbClient() {
  const connectionString = 
    process.env.NEON_DATABASE_URL_TEST || 
    process.env.NEON_DATABASE_URL || 
    process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error(
      'Test database configuration missing! ' +
      'Set NEON_DATABASE_URL_TEST, NEON_DATABASE_URL, or DATABASE_URL environment variable'
    );
  }

  const client = new Client({ connectionString });
  await client.connect();
  return client;
}

/**
 * Clean up test data from database
 * 
 * @param {Client} client - Database client
 * @param {number} stageId - Stage ID to clean up
 */
async function cleanupTestStageData(client, stageId) {
  // Delete in reverse order of dependencies
  await client.query('DELETE FROM awards_per_participant WHERE stage_id = $1', [stageId]);
  await client.query('DELETE FROM fantasy_cumulative_points WHERE stage_id = $1', [stageId]);
  await client.query('DELETE FROM fantasy_stage_points WHERE stage_id = $1', [stageId]);
  await client.query('DELETE FROM stage_jersey_wearers WHERE stage_id = $1', [stageId]);
  await client.query('DELETE FROM stage_results WHERE stage_id = $1', [stageId]);
}

/**
 * Create a test stage
 * 
 * @param {Client} client - Database client
 * @param {Object} stageData - Stage data
 * @returns {Promise<Object>} Created stage
 */
async function createTestStage(client, stageData = {}) {
  const {
    stage_number = 1,
    name = 'Test Stage',
    start_location = 'Start',
    end_location = 'Finish',
    distance_km = 100,
    date = new Date().toISOString().split('T')[0],
    is_neutralized = false,
    is_cancelled = false
  } = stageData;

  const result = await client.query(
    `INSERT INTO stages (stage_number, name, start_location, end_location, distance_km, date, is_neutralized, is_cancelled)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING *`,
    [stage_number, name, start_location, end_location, distance_km, date, is_neutralized, is_cancelled]
  );

  return result.rows[0];
}

/**
 * Create test riders
 * 
 * @param {Client} client - Database client
 * @param {number} count - Number of riders to create
 * @returns {Promise<Array>} Created riders
 */
async function createTestRiders(client, count = 10) {
  const riders = [];
  for (let i = 1; i <= count; i++) {
    const result = await client.query(
      `INSERT INTO riders (name, team, country)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [`Test Rider ${i}`, `Test Team ${i}`, 'NED']
    );
    riders.push(result.rows[0]);
  }
  return riders;
}

/**
 * Create a test participant
 * 
 * @param {Client} client - Database client
 * @param {Object} participantData - Participant data
 * @returns {Promise<Object>} Created participant
 */
async function createTestParticipant(client, participantData = {}) {
  const {
    user_id = `test-user-${Date.now()}`,
    team_name = 'Test Team',
    email = 'test@example.com'
  } = participantData;

  const result = await client.query(
    `INSERT INTO participants (user_id, team_name, email)
     VALUES ($1, $2, $3)
     RETURNING *`,
    [user_id, team_name, email]
  );

  return result.rows[0];
}

module.exports = {
  getTestDbClient,
  cleanupTestStageData,
  createTestStage,
  createTestRiders,
  createTestParticipant
};

