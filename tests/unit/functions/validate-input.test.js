/**
 * Unit test voor validateInput functie
 * 
 * Test de validatie logica in isolatie
 */

const { mockDbClient, mockStage, mockRiders, mockStageResults, mockJerseys } = require('../../helpers/mocks');

// We need to check if validateInput is exported
// For now, we'll assume it's exported or we'll need to export it
const importStageResultsModule = require('../../../netlify/functions/import-stage-results');

describe('validateInput - Unit Tests', () => {
  let mockClient;

  beforeEach(() => {
    mockClient = mockDbClient({
      query: jest.fn()
    });
  });

  describe('stageId validation', () => {
    it('should reject null stageId', async () => {
      const result = await importStageResultsModule.validateInput(
        mockClient,
        null,
        mockStageResults,
        mockJerseys
      );

      expect(result.valid).toBe(false);
      expect(result.error).toContain('stageId is required');
    });

    it('should reject undefined stageId', async () => {
      const result = await importStageResultsModule.validateInput(
        mockClient,
        undefined,
        mockStageResults,
        mockJerseys
      );

      expect(result.valid).toBe(false);
      expect(result.error).toContain('stageId is required');
    });

    it('should reject non-existent stageId', async () => {
      mockClient.query.mockResolvedValueOnce({ rows: [] }); // Stage not found

      const result = await importStageResultsModule.validateInput(
        mockClient,
        99999,
        mockStageResults,
        mockJerseys
      );

      expect(result.valid).toBe(false);
      expect(result.error).toContain('does not exist');
    });
  });

  describe('results validation', () => {
    it('should reject empty results array', async () => {
      mockClient.query.mockResolvedValueOnce({ rows: [mockStage] }); // Stage exists

      const result = await importStageResultsModule.validateInput(
        mockClient,
        mockStage.id,
        [],
        mockJerseys
      );

      expect(result.valid).toBe(false);
      expect(result.error).toContain('non-empty array');
    });

    it('should reject null results', async () => {
      mockClient.query.mockResolvedValueOnce({ rows: [mockStage] });

      const result = await importStageResultsModule.validateInput(
        mockClient,
        mockStage.id,
        null,
        mockJerseys
      );

      expect(result.valid).toBe(false);
      expect(result.error).toContain('non-empty array');
    });

    it('should reject duplicate positions', async () => {
      mockClient.query.mockResolvedValueOnce({ rows: [mockStage] });
      mockClient.query.mockResolvedValueOnce({ rows: mockRiders }); // Riders exist

      const duplicateResults = [
        { position: 1, riderId: mockRiders[0].id },
        { position: 1, riderId: mockRiders[1].id } // Duplicate position
      ];

      const result = await importStageResultsModule.validateInput(
        mockClient,
        mockStage.id,
        duplicateResults,
        mockJerseys
      );

      expect(result.valid).toBe(false);
      expect(result.error).toContain('Dubbele posities');
    });
  });

  describe('jerseys validation', () => {
    it('should reject missing jerseys', async () => {
      mockClient.query.mockResolvedValueOnce({ rows: [mockStage] });
      mockClient.query.mockResolvedValueOnce({ rows: mockRiders });

      const result = await importStageResultsModule.validateInput(
        mockClient,
        mockStage.id,
        mockStageResults,
        []
      );

      expect(result.valid).toBe(false);
      expect(result.error).toContain('truien');
    });

    it('should reject incomplete jerseys (less than 4)', async () => {
      mockClient.query.mockResolvedValueOnce({ rows: [mockStage] });
      mockClient.query.mockResolvedValueOnce({ rows: mockRiders });

      const incompleteJerseys = [
        { jerseyType: 'geel', riderId: mockRiders[0].id },
        { jerseyType: 'groen', riderId: mockRiders[1].id }
        // Missing bolletjes and wit
      ];

      const result = await importStageResultsModule.validateInput(
        mockClient,
        mockStage.id,
        mockStageResults,
        incompleteJerseys
      );

      expect(result.valid).toBe(false);
      expect(result.error).toContain('4 truien');
    });
  });

  describe('rider validation', () => {
    it('should reject non-existent riders', async () => {
      mockClient.query.mockResolvedValueOnce({ rows: [mockStage] });
      mockClient.query.mockResolvedValueOnce({ rows: [] }); // No riders found

      const result = await importStageResultsModule.validateInput(
        mockClient,
        mockStage.id,
        mockStageResults,
        mockJerseys
      );

      expect(result.valid).toBe(false);
      expect(result.error).toContain('niet gevonden');
    });
  });

  describe('valid input', () => {
    it('should accept valid input', async () => {
      // Mock 3 queries: stage check, riders check, jersey riders check
      mockClient.query.mockResolvedValueOnce({ rows: [mockStage] }); // Stage exists
      mockClient.query.mockResolvedValueOnce({ rows: mockRiders }); // Riders in results exist
      mockClient.query.mockResolvedValueOnce({ rows: mockRiders }); // Jersey riders exist

      const result = await importStageResultsModule.validateInput(
        mockClient,
        mockStage.id,
        mockStageResults,
        mockJerseys
      );

      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });
  });
});

