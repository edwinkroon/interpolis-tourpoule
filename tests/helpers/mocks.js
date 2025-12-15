/**
 * Mock data and functions for tests
 */

/**
 * Mock stage data
 */
const mockStage = {
  id: 1,
  stage_number: 1,
  name: 'Test Stage',
  start_location: 'Start City',
  end_location: 'Finish City',
  distance_km: 150,
  date: '2024-07-01',
  is_neutralized: false,
  is_cancelled: false
};

/**
 * Mock rider data
 */
const mockRiders = [
  { id: 1, name: 'Rider 1', team: 'Team A', country: 'NED' },
  { id: 2, name: 'Rider 2', team: 'Team B', country: 'BEL' },
  { id: 3, name: 'Rider 3', team: 'Team C', country: 'FRA' }
];

/**
 * Mock stage results
 */
const mockStageResults = [
  { position: 1, riderId: 1, timeSeconds: 3600 },
  { position: 2, riderId: 2, timeSeconds: 3605 },
  { position: 3, riderId: 3, timeSeconds: 3610 }
];

/**
 * Mock jerseys
 */
const mockJerseys = [
  { jerseyType: 'geel', riderId: 1 },
  { jerseyType: 'groen', riderId: 2 },
  { jerseyType: 'bolletjes', riderId: 3 },
  { jerseyType: 'wit', riderId: 1 }
];

/**
 * Mock participant data
 */
const mockParticipant = {
  id: 1,
  user_id: 'test-user-123',
  team_name: 'Test Team',
  email: 'test@example.com'
};

/**
 * Mock database client
 * Returns a mock client with query method
 */
function mockDbClient(overrides = {}) {
  const defaultQuery = jest.fn().mockResolvedValue({ rows: [] });
  
  return {
    query: overrides.query || defaultQuery,
    connect: overrides.connect || jest.fn().mockResolvedValue(),
    end: overrides.end || jest.fn().mockResolvedValue(),
    ...overrides
  };
}

module.exports = {
  mockStage,
  mockRiders,
  mockStageResults,
  mockJerseys,
  mockParticipant,
  mockDbClient
};

