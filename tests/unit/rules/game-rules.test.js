/**
 * Unit tests voor spelregels zoals beschreven in rules.html
 * 
 * Test de belangrijkste business rules voor puntentelling en team samenstelling
 */

const { mockDbClient, mockStage, mockRiders } = require('../../helpers/mocks');
const calculateStagePointsModule = require('../../../netlify/functions/calculate-stage-points');

describe('Game Rules - Unit Tests', () => {
  let mockClient;

  // Mock scoring rules based on rules.html
  const mockScoringRules = {
    stage_position: [
      { rule_type: 'stage_position', condition_json: { position: 1 }, points: 30 },
      { rule_type: 'stage_position', condition_json: { position: 2 }, points: 15 },
      { rule_type: 'stage_position', condition_json: { position: 3 }, points: 12 },
      { rule_type: 'stage_position', condition_json: { position: 4 }, points: 9 },
      { rule_type: 'stage_position', condition_json: { position: 5 }, points: 8 },
      { rule_type: 'stage_position', condition_json: { position: 6 }, points: 7 },
      { rule_type: 'stage_position', condition_json: { position: 7 }, points: 6 },
      { rule_type: 'stage_position', condition_json: { position: 8 }, points: 5 },
      { rule_type: 'stage_position', condition_json: { position: 9 }, points: 4 },
      { rule_type: 'stage_position', condition_json: { position: 10 }, points: 3 },
    ],
    jersey: [
      { rule_type: 'jersey', condition_json: { jersey_type: 'geel' }, points: 10 },
      { rule_type: 'jersey', condition_json: { jersey_type: 'groen' }, points: 5 },
      { rule_type: 'jersey', condition_json: { jersey_type: 'bolletjes' }, points: 5 },
      { rule_type: 'jersey', condition_json: { jersey_type: 'wit' }, points: 3 },
    ],
  };

  beforeEach(() => {
    mockClient = mockDbClient({
      query: jest.fn(),
      end: jest.fn().mockResolvedValue(),
    });
  });

  describe('Rule 1-10: Etappe positie punten', () => {
    it('should award 30 points for 1st place', async () => {
      const stageId = 1;
      const participantId = 1;
      const riderId = 1;

      // Mock queries in correct order
      mockClient.query
        .mockResolvedValueOnce({ rows: [{ stage_number: 1 }] }) // isFinalStage: current stage
        .mockResolvedValueOnce({ rows: [{ max_stage: 5 }] }) // isFinalStage: max stage
        .mockResolvedValueOnce({ rows: mockScoringRules.stage_position }) // scoring rules
        .mockResolvedValueOnce({ rows: [{ is_neutralized: false, is_cancelled: false }] }) // stage check
        .mockResolvedValueOnce({ rows: [{ rider_id: riderId, position: 1 }] }) // stage results
        .mockResolvedValueOnce({ rows: [{ fantasy_team_id: 1, participant_id: participantId, rider_id: riderId, slot_type: 'main', active: true }] }) // fantasy teams
        .mockResolvedValueOnce({ rows: mockScoringRules.jersey }) // jersey rules
        .mockResolvedValueOnce({ rows: [] }) // jersey wearers
        .mockResolvedValueOnce({ rows: [] }) // insert query
        .mockResolvedValueOnce({ rows: [{ id: participantId }] }); // all participants query

      const { calculateStagePoints } = calculateStagePointsModule;
      await calculateStagePoints(mockClient, stageId);

      // Verify that points were calculated correctly
      const insertCalls = mockClient.query.mock.calls.filter(call => 
        call[0] && call[0].includes('INSERT INTO fantasy_stage_points')
      );
      
      expect(insertCalls.length).toBeGreaterThan(0);
      const insertCall = insertCalls[0];
      const values = insertCall[1];
      expect(values[2]).toBe(30); // points_stage should be 30 for 1st place
    });

    it('should award 15 points for 2nd place', async () => {
      const stageId = 1;
      const participantId = 1;
      const riderId = 1;

      mockClient.query
        .mockResolvedValueOnce({ rows: [{ stage_number: 1 }] })
        .mockResolvedValueOnce({ rows: [{ max_stage: 5 }] })
        .mockResolvedValueOnce({ rows: mockScoringRules.stage_position })
        .mockResolvedValueOnce({ rows: [{ is_neutralized: false, is_cancelled: false }] })
        .mockResolvedValueOnce({ rows: [{ rider_id: riderId, position: 2 }] })
        .mockResolvedValueOnce({ rows: [{ fantasy_team_id: 1, participant_id: participantId, rider_id: riderId, slot_type: 'main', active: true }] })
        .mockResolvedValueOnce({ rows: mockScoringRules.jersey })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ id: participantId }] });

      const { calculateStagePoints } = calculateStagePointsModule;
      await calculateStagePoints(mockClient, stageId);

      const insertCalls = mockClient.query.mock.calls.filter(call => 
        call[0] && call[0].includes('INSERT INTO fantasy_stage_points')
      );
      
      expect(insertCalls.length).toBeGreaterThan(0);
      const values = insertCalls[0][1];
      expect(values[2]).toBe(15); // points_stage should be 15 for 2nd place
    });

    it('should award correct points for positions 1-10', async () => {
      const expectedPoints = {
        1: 30, 2: 15, 3: 12, 4: 9, 5: 8,
        6: 7, 7: 6, 8: 5, 9: 4, 10: 3
      };

      for (const [position, expectedPointsValue] of Object.entries(expectedPoints)) {
        const stageId = 1;
        const participantId = 1;
        const riderId = 1;

        mockClient.query.mockClear();
        mockClient.query
          .mockResolvedValueOnce({ rows: [{ stage_number: 1 }] })
          .mockResolvedValueOnce({ rows: [{ max_stage: 5 }] })
          .mockResolvedValueOnce({ rows: mockScoringRules.stage_position })
          .mockResolvedValueOnce({ rows: [{ is_neutralized: false, is_cancelled: false }] })
          .mockResolvedValueOnce({ rows: [{ rider_id: riderId, position: parseInt(position) }] })
          .mockResolvedValueOnce({ rows: [{ fantasy_team_id: 1, participant_id: participantId, rider_id: riderId, slot_type: 'main', active: true }] })
          .mockResolvedValueOnce({ rows: mockScoringRules.jersey })
          .mockResolvedValueOnce({ rows: [] })
          .mockResolvedValueOnce({ rows: [] })
          .mockResolvedValueOnce({ rows: [{ id: participantId }] });

        const { calculateStagePoints } = calculateStagePointsModule;
        await calculateStagePoints(mockClient, stageId);

        const insertCalls = mockClient.query.mock.calls.filter(call => 
          call[0] && call[0].includes('INSERT INTO fantasy_stage_points')
        );
        
        expect(insertCalls.length).toBeGreaterThan(0);
        const values = insertCalls[0][1];
        expect(values[2]).toBe(expectedPointsValue);
      }
    });
  });

  describe('Rule 9: Trui punten per etappe', () => {
    it('should award 10 points for gele trui', async () => {
      const stageId = 1;
      const participantId = 1;
      const riderId = 1;

      mockClient.query
        .mockResolvedValueOnce({ rows: [{ stage_number: 1 }] })
        .mockResolvedValueOnce({ rows: [{ max_stage: 5 }] })
        .mockResolvedValueOnce({ rows: mockScoringRules.stage_position })
        .mockResolvedValueOnce({ rows: [{ is_neutralized: false, is_cancelled: false }] })
        .mockResolvedValueOnce({ rows: [] }) // no stage results
        .mockResolvedValueOnce({ rows: [{ fantasy_team_id: 1, participant_id: participantId, rider_id: riderId, slot_type: 'main', active: true }] })
        .mockResolvedValueOnce({ rows: mockScoringRules.jersey })
        .mockResolvedValueOnce({ rows: [{ rider_id: riderId, jersey_type: 'geel' }] })
        .mockResolvedValueOnce({ rows: [] }) // insert query
        .mockResolvedValueOnce({ rows: [{ id: participantId }] }); // all participants

      const { calculateStagePoints } = calculateStagePointsModule;
      await calculateStagePoints(mockClient, stageId);

      const insertCalls = mockClient.query.mock.calls.filter(call => 
        call[0] && call[0].includes('INSERT INTO fantasy_stage_points')
      );
      
      expect(insertCalls.length).toBeGreaterThan(0);
      const values = insertCalls[0][1];
      expect(values[3]).toBe(10); // points_jerseys should be 10 for gele trui
    });

    it('should award 5 points for groene trui', async () => {
      const stageId = 1;
      const participantId = 1;
      const riderId = 1;

      mockClient.query
        .mockResolvedValueOnce({ rows: [{ stage_number: 1 }] })
        .mockResolvedValueOnce({ rows: [{ max_stage: 5 }] })
        .mockResolvedValueOnce({ rows: mockScoringRules.stage_position })
        .mockResolvedValueOnce({ rows: [{ is_neutralized: false, is_cancelled: false }] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ fantasy_team_id: 1, participant_id: participantId, rider_id: riderId, slot_type: 'main', active: true }] })
        .mockResolvedValueOnce({ rows: mockScoringRules.jersey })
        .mockResolvedValueOnce({ rows: [{ rider_id: riderId, jersey_type: 'groen' }] })
        .mockResolvedValueOnce({ rows: [] }) // insert query
        .mockResolvedValueOnce({ rows: [{ id: participantId }] }); // all participants

      const { calculateStagePoints } = calculateStagePointsModule;
      await calculateStagePoints(mockClient, stageId);

      const insertCalls = mockClient.query.mock.calls.filter(call => 
        call[0] && call[0].includes('INSERT INTO fantasy_stage_points')
      );
      
      expect(insertCalls.length).toBeGreaterThan(0);
      const values = insertCalls[0][1];
      expect(values[3]).toBe(5); // points_jerseys should be 5 for groene trui
    });

    it('should award 5 points for bolletjestrui', async () => {
      const stageId = 1;
      const participantId = 1;
      const riderId = 1;

      mockClient.query
        .mockResolvedValueOnce({ rows: [{ stage_number: 1 }] })
        .mockResolvedValueOnce({ rows: [{ max_stage: 5 }] })
        .mockResolvedValueOnce({ rows: mockScoringRules.stage_position })
        .mockResolvedValueOnce({ rows: [{ is_neutralized: false, is_cancelled: false }] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ fantasy_team_id: 1, participant_id: participantId, rider_id: riderId, slot_type: 'main', active: true }] })
        .mockResolvedValueOnce({ rows: mockScoringRules.jersey })
        .mockResolvedValueOnce({ rows: [{ rider_id: riderId, jersey_type: 'bolletjes' }] })
        .mockResolvedValueOnce({ rows: [] }) // insert query
        .mockResolvedValueOnce({ rows: [{ id: participantId }] }); // all participants

      const { calculateStagePoints } = calculateStagePointsModule;
      await calculateStagePoints(mockClient, stageId);

      const insertCalls = mockClient.query.mock.calls.filter(call => 
        call[0] && call[0].includes('INSERT INTO fantasy_stage_points')
      );
      
      expect(insertCalls.length).toBeGreaterThan(0);
      const values = insertCalls[0][1];
      expect(values[3]).toBe(5); // points_jerseys should be 5 for bolletjestrui
    });

    it('should award 3 points for witte trui', async () => {
      const stageId = 1;
      const participantId = 1;
      const riderId = 1;

      mockClient.query
        .mockResolvedValueOnce({ rows: [{ stage_number: 1 }] })
        .mockResolvedValueOnce({ rows: [{ max_stage: 5 }] })
        .mockResolvedValueOnce({ rows: mockScoringRules.stage_position })
        .mockResolvedValueOnce({ rows: [{ is_neutralized: false, is_cancelled: false }] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ fantasy_team_id: 1, participant_id: participantId, rider_id: riderId, slot_type: 'main', active: true }] })
        .mockResolvedValueOnce({ rows: mockScoringRules.jersey })
        .mockResolvedValueOnce({ rows: [{ rider_id: riderId, jersey_type: 'wit' }] })
        .mockResolvedValueOnce({ rows: [] }) // insert query
        .mockResolvedValueOnce({ rows: [{ id: participantId }] }); // all participants

      const { calculateStagePoints } = calculateStagePointsModule;
      await calculateStagePoints(mockClient, stageId);

      const insertCalls = mockClient.query.mock.calls.filter(call => 
        call[0] && call[0].includes('INSERT INTO fantasy_stage_points')
      );
      
      expect(insertCalls.length).toBeGreaterThan(0);
      const values = insertCalls[0][1];
      expect(values[3]).toBe(3); // points_jerseys should be 3 for witte trui
    });
  });

  describe('Rule 9: Geen trui punten op laatste etappe', () => {
    it('should not award jersey points on final stage', async () => {
      const stageId = 21;
      const participantId = 1;
      const riderId = 1;
      const finalStageNumber = 21;

      mockClient.query
        .mockResolvedValueOnce({ rows: [{ stage_number: finalStageNumber }] }) // current stage is final
        .mockResolvedValueOnce({ rows: [{ max_stage: finalStageNumber }] }) // max stage is same
        .mockResolvedValueOnce({ rows: mockScoringRules.stage_position })
        .mockResolvedValueOnce({ rows: [{ is_neutralized: false, is_cancelled: false }] })
        .mockResolvedValueOnce({ rows: [] }) // no stage results
        .mockResolvedValueOnce({ rows: [{ fantasy_team_id: 1, participant_id: participantId, rider_id: riderId, slot_type: 'main', active: true }] })
        .mockResolvedValueOnce({ rows: mockScoringRules.jersey })
        .mockResolvedValueOnce({ rows: [{ rider_id: riderId, jersey_type: 'geel' }] }) // rider has gele trui
        .mockResolvedValueOnce({ rows: [] }) // insert query
        .mockResolvedValueOnce({ rows: [{ id: participantId }] }); // all participants

      const { calculateStagePoints } = calculateStagePointsModule;
      await calculateStagePoints(mockClient, stageId);

      const insertCalls = mockClient.query.mock.calls.filter(call => 
        call[0] && call[0].includes('INSERT INTO fantasy_stage_points')
      );
      
      expect(insertCalls.length).toBeGreaterThan(0);
      const values = insertCalls[0][1];
      expect(values[3]).toBe(0); // points_jerseys should be 0 on final stage
    });
  });

  describe('Rule 11: Geneutraliseerde etappes', () => {
    it('should not award stage position points for neutralized stage', async () => {
      const stageId = 1;
      const participantId = 1;
      const riderId = 1;

      mockClient.query
        .mockResolvedValueOnce({ rows: [{ stage_number: 1 }] })
        .mockResolvedValueOnce({ rows: [{ max_stage: 5 }] })
        .mockResolvedValueOnce({ rows: mockScoringRules.stage_position })
        .mockResolvedValueOnce({ rows: [{ is_neutralized: true, is_cancelled: false }] }) // stage is neutralized
        .mockResolvedValueOnce({ rows: [{ rider_id: riderId, position: 1 }] }) // rider finished 1st
        .mockResolvedValueOnce({ rows: [{ fantasy_team_id: 1, participant_id: participantId, rider_id: riderId, slot_type: 'main', active: true }] })
        .mockResolvedValueOnce({ rows: mockScoringRules.jersey })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ id: participantId }] });

      const { calculateStagePoints } = calculateStagePointsModule;
      await calculateStagePoints(mockClient, stageId);

      const insertCalls = mockClient.query.mock.calls.filter(call => 
        call[0] && call[0].includes('INSERT INTO fantasy_stage_points')
      );
      
      expect(insertCalls.length).toBeGreaterThan(0);
      const values = insertCalls[0][1];
      expect(values[2]).toBe(0); // points_stage should be 0 for neutralized stage
    });

    it('should still award jersey points for neutralized stage', async () => {
      const stageId = 1;
      const participantId = 1;
      const riderId = 1;

      mockClient.query
        .mockResolvedValueOnce({ rows: [{ stage_number: 1 }] })
        .mockResolvedValueOnce({ rows: [{ max_stage: 5 }] })
        .mockResolvedValueOnce({ rows: mockScoringRules.stage_position })
        .mockResolvedValueOnce({ rows: [{ is_neutralized: true, is_cancelled: false }] }) // stage is neutralized
        .mockResolvedValueOnce({ rows: [] }) // no stage results (neutralized)
        .mockResolvedValueOnce({ rows: [{ fantasy_team_id: 1, participant_id: participantId, rider_id: riderId, slot_type: 'main', active: true }] })
        .mockResolvedValueOnce({ rows: mockScoringRules.jersey })
        .mockResolvedValueOnce({ rows: [{ rider_id: riderId, jersey_type: 'geel' }] }) // rider has gele trui
        .mockResolvedValueOnce({ rows: [] }) // insert query
        .mockResolvedValueOnce({ rows: [{ id: participantId }] }); // all participants

      const { calculateStagePoints } = calculateStagePointsModule;
      await calculateStagePoints(mockClient, stageId);

      const insertCalls = mockClient.query.mock.calls.filter(call => 
        call[0] && call[0].includes('INSERT INTO fantasy_stage_points')
      );
      
      expect(insertCalls.length).toBeGreaterThan(0);
      const values = insertCalls[0][1];
      expect(values[2]).toBe(0); // points_stage should be 0
      expect(values[3]).toBe(10); // points_jerseys should still be 10 (truien tellen wel mee)
    });
  });

  describe('Vervallen etappes', () => {
    it('should not award any points for cancelled stage', async () => {
      const stageId = 1;
      const participantId = 1;

      // For cancelled stages, the function returns early after checking is_cancelled
      // It queries all participants and inserts 0 points for each
      mockClient.query
        .mockResolvedValueOnce({ rows: [{ stage_number: 1 }] }) // isFinalStage: current stage
        .mockResolvedValueOnce({ rows: [{ max_stage: 5 }] }) // isFinalStage: max stage
        .mockResolvedValueOnce({ rows: mockScoringRules.stage_position }) // scoring rules
        .mockResolvedValueOnce({ rows: [{ is_neutralized: false, is_cancelled: true }] }) // stage is cancelled
        .mockResolvedValueOnce({ rows: [{ id: participantId }] }) // all participants
        .mockResolvedValueOnce({ rows: [] }); // insert query for participant (in loop)

      const { calculateStagePoints } = calculateStagePointsModule;
      await calculateStagePoints(mockClient, stageId);

      // For cancelled stages, the function should insert 0 points for each participant
      // The function loops through allParticipants and calls query for each
      const insertCalls = mockClient.query.mock.calls.filter(call => 
        call[0] && typeof call[0] === 'string' && call[0].includes('INSERT INTO fantasy_stage_points')
      );
      
      // Verify that insert was called (the function loops and calls query for each participant)
      // Since we mocked the insert query to return empty rows, we need to check the call count
      const allParticipantsCall = mockClient.query.mock.calls.find(call => 
        call[0] && typeof call[0] === 'string' && call[0].includes('SELECT id FROM participants')
      );
      expect(allParticipantsCall).toBeDefined();
      
      // Verify that insert was called for the participant (check by stageId and participantId in params)
      const participantInsertCalls = mockClient.query.mock.calls.filter(call => 
        Array.isArray(call[1]) && call[1].length >= 2 && call[1][0] === stageId && call[1][1] === participantId
      );
      
      expect(participantInsertCalls.length).toBeGreaterThan(0);
      const insertCall = participantInsertCalls[0];
      // The insert query has parameters: [stageId, participantId]
      // The VALUES clause uses hardcoded 0, 0, 0 for points
      const params = insertCall[1];
      expect(params[0]).toBe(stageId);
      expect(params[1]).toBe(participantId);
      // Verify the SQL query contains the hardcoded 0 values
      const sqlQuery = insertCall[0];
      expect(sqlQuery).toContain('VALUES ($1, $2, 0, 0, 0)');
      expect(sqlQuery).toContain('points_stage = 0');
      expect(sqlQuery).toContain('points_jerseys = 0');
      expect(sqlQuery).toContain('points_bonus = 0');
    });
  });

  describe('Team samenstelling regels', () => {
    it('should only award points to active main riders', async () => {
      const stageId = 1;
      const participantId = 1;
      const mainRiderId = 1;
      const reserveRiderId = 2;
      const inactiveRiderId = 3;

      mockClient.query
        .mockResolvedValueOnce({ rows: [{ stage_number: 1 }] })
        .mockResolvedValueOnce({ rows: [{ max_stage: 5 }] })
        .mockResolvedValueOnce({ rows: mockScoringRules.stage_position })
        .mockResolvedValueOnce({ rows: [{ is_neutralized: false, is_cancelled: false }] })
        .mockResolvedValueOnce({ 
          rows: [
            { rider_id: mainRiderId, position: 1 },
            { rider_id: reserveRiderId, position: 2 },
            { rider_id: inactiveRiderId, position: 3 }
          ] 
        })
        .mockResolvedValueOnce({ 
          rows: [
            { fantasy_team_id: 1, participant_id: participantId, rider_id: mainRiderId, slot_type: 'main', active: true },
            // Reserve rider should not be included (query filters for slot_type = 'main')
            // Inactive rider should not be included (query filters for active = true)
          ] 
        })
        .mockResolvedValueOnce({ rows: mockScoringRules.jersey })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ id: participantId }] });

      const { calculateStagePoints } = calculateStagePointsModule;
      await calculateStagePoints(mockClient, stageId);

      const insertCalls = mockClient.query.mock.calls.filter(call => 
        call[0] && call[0].includes('INSERT INTO fantasy_stage_points')
      );
      
      expect(insertCalls.length).toBeGreaterThan(0);
      const values = insertCalls[0][1];
      expect(values[2]).toBe(30); // Only main rider (1st place) should get points
      // Reserve and inactive riders should not contribute to points
    });

    it('should not award points to reserve riders', async () => {
      const stageId = 1;
      const participantId = 1;
      const reserveRiderId = 2;

      mockClient.query
        .mockResolvedValueOnce({ rows: [{ stage_number: 1 }] })
        .mockResolvedValueOnce({ rows: [{ max_stage: 5 }] })
        .mockResolvedValueOnce({ rows: mockScoringRules.stage_position })
        .mockResolvedValueOnce({ rows: [{ is_neutralized: false, is_cancelled: false }] })
        .mockResolvedValueOnce({ rows: [{ rider_id: reserveRiderId, position: 1 }] })
        .mockResolvedValueOnce({ rows: [] }) // No main riders (reserve riders are filtered out)
        .mockResolvedValueOnce({ rows: mockScoringRules.jersey })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ id: participantId }] });

      const { calculateStagePoints } = calculateStagePointsModule;
      await calculateStagePoints(mockClient, stageId);

      // Verify that the query filters for slot_type = 'main'
      const fantasyTeamsQuery = mockClient.query.mock.calls.find(call => 
        call[0] && call[0].includes('slot_type') && call[0].includes('main')
      );
      expect(fantasyTeamsQuery).toBeDefined();
      
      // Verify that reserve riders don't contribute points
      const insertCalls = mockClient.query.mock.calls.filter(call => 
        call[0] && call[0].includes('INSERT INTO fantasy_stage_points') && call[0].includes('VALUES')
      );
      
      const participantInsertCall = insertCalls.find(call => call[1] && call[1][1] === participantId);
      if (participantInsertCall) {
        const values = participantInsertCall[1];
        expect(values[2]).toBe(0); // Reserve riders should not contribute points
      }
    });

    it('should not award points to inactive riders', async () => {
      const stageId = 1;
      const participantId = 1;
      const inactiveRiderId = 3;

      mockClient.query
        .mockResolvedValueOnce({ rows: [{ stage_number: 1 }] })
        .mockResolvedValueOnce({ rows: [{ max_stage: 5 }] })
        .mockResolvedValueOnce({ rows: mockScoringRules.stage_position })
        .mockResolvedValueOnce({ rows: [{ is_neutralized: false, is_cancelled: false }] })
        .mockResolvedValueOnce({ rows: [{ rider_id: inactiveRiderId, position: 1 }] })
        .mockResolvedValueOnce({ rows: [] }) // No active riders (inactive riders are filtered out)
        .mockResolvedValueOnce({ rows: mockScoringRules.jersey })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] }) // insert query (for participants with teams)
        .mockResolvedValueOnce({ rows: [{ id: participantId }] }); // all participants

      const { calculateStagePoints } = calculateStagePointsModule;
      await calculateStagePoints(mockClient, stageId);

      // Verify that the query filters for active = true
      const fantasyTeamsQuery = mockClient.query.mock.calls.find(call => 
        call[0] && call[0].includes('active = true') && call[0].includes('slot_type')
      );
      expect(fantasyTeamsQuery).toBeDefined();
      
      // Verify that inactive riders don't contribute points
      const insertCalls = mockClient.query.mock.calls.filter(call => 
        call[0] && call[0].includes('INSERT INTO fantasy_stage_points') && call[0].includes('VALUES')
      );
      
      const participantInsertCall = insertCalls.find(call => call[1] && call[1][1] === participantId);
      if (participantInsertCall) {
        const values = participantInsertCall[1];
        expect(values[2]).toBe(0); // Inactive riders should not contribute points
      }
    });
  });

  describe('Meerdere renners met punten', () => {
    it('should sum points from multiple riders in same team', async () => {
      const stageId = 1;
      const participantId = 1;
      const rider1Id = 1;
      const rider2Id = 2;

      mockClient.query
        .mockResolvedValueOnce({ rows: [{ stage_number: 1 }] })
        .mockResolvedValueOnce({ rows: [{ max_stage: 5 }] })
        .mockResolvedValueOnce({ rows: mockScoringRules.stage_position })
        .mockResolvedValueOnce({ rows: [{ is_neutralized: false, is_cancelled: false }] })
        .mockResolvedValueOnce({ 
          rows: [
            { rider_id: rider1Id, position: 1 }, // 30 points
            { rider_id: rider2Id, position: 3 }  // 12 points
          ] 
        })
        .mockResolvedValueOnce({ 
          rows: [
            { fantasy_team_id: 1, participant_id: participantId, rider_id: rider1Id, slot_type: 'main', active: true },
            { fantasy_team_id: 1, participant_id: participantId, rider_id: rider2Id, slot_type: 'main', active: true }
          ] 
        })
        .mockResolvedValueOnce({ rows: mockScoringRules.jersey })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ id: participantId }] });

      const { calculateStagePoints } = calculateStagePointsModule;
      await calculateStagePoints(mockClient, stageId);

      const insertCalls = mockClient.query.mock.calls.filter(call => 
        call[0] && call[0].includes('INSERT INTO fantasy_stage_points')
      );
      
      expect(insertCalls.length).toBeGreaterThan(0);
      const values = insertCalls[0][1];
      expect(values[2]).toBe(42); // 30 + 12 = 42 points total
    });
  });
});

