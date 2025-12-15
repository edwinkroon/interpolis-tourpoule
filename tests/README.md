# Test Structure

Deze directory bevat alle tests voor het Interpolis Tourpoule project.

## Structuur

```
tests/
├── setup.js                 # Jest setup configuratie
├── unit/                    # Unit tests voor individuele functies
│   ├── functions/          # Tests voor netlify functions
│   └── utils/              # Tests voor utility functies
├── integration/            # Integration tests voor complete flows
│   ├── import-stage-results.test.js
│   └── ...
├── frontend/               # Frontend/React component tests
│   ├── components/        # Component tests
│   ├── pages/             # Page tests
│   └── utils/             # Frontend utility tests
└── helpers/               # Test utilities en helpers
    ├── db.js              # Database test helpers
    └── mocks.js           # Mock data en functies
```

## Test Types

### Unit Tests
Test individuele functies in isolatie. Bijvoorbeeld:
- `validateInput()` functie
- `calculateStagePoints()` functie
- Utility functies

### Integration Tests
Test complete flows waarbij meerdere functies samenwerken. Bijvoorbeeld:
- Volledige `import-stage-results` flow
- Reserve activatie proces
- Awards berekening flow

### Frontend Tests
Test React components en user interactions. Bijvoorbeeld:
- Component rendering
- User events (clicks, form submissions)
- State management

## Test Commands

```bash
# Run alle tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests met coverage
npm run test:coverage

# Run alleen integration tests
npm run test:integration

# Run alleen unit tests
npm run test:unit

# Run alleen frontend tests
npm run test:frontend
```

## Test Database

Voor integration tests die de database nodig hebben:
- Gebruik een test database (niet de productie database!)
- Set `NEON_DATABASE_URL_TEST` environment variable
- Gebruik database helpers uit `tests/helpers/db.js`

## Best Practices

1. **Test één ding per test**: Elke test moet één specifiek gedrag testen
2. **Gebruik beschrijvende namen**: Test namen moeten duidelijk maken wat er getest wordt
3. **Arrange-Act-Assert**: Structuur tests in drie delen
4. **Mock externe dependencies**: Mock database calls, API calls, etc.
5. **Clean up**: Zorg dat tests geen side effects hebben op andere tests
6. **Test edge cases**: Test niet alleen happy paths, maar ook error cases

## Voorbeeld Test

```javascript
describe('validateInput', () => {
  it('should return valid: false when stageId is missing', async () => {
    // Arrange
    const client = mockDbClient();
    const stageId = null;
    const results = [{ position: 1, riderId: 1 }];
    const jerseys = [];

    // Act
    const result = await validateInput(client, stageId, results, jerseys);

    // Assert
    expect(result.valid).toBe(false);
    expect(result.error).toContain('stageId is required');
  });
});
```

