# Implementatie Strategie: Etappe Import Refactoring

## Doel
Incrementeel refactoren zonder de huidige functionaliteit te breken. Elke fase moet testbaar en terugdraaibaar zijn.

---

## FASE 1: Voorbereiding & Validatie (Week 1)

### Stap 1.1: Backup & Safety Checks
- [ ] Maak backup van huidige `import-stage-results.js`
- [ ] Documenteer huidige flow (wat gebeurt er nu precies?)
- [ ] Test huidige functionaliteit grondig (baseline)
- [ ] Maak rollback plan

### Stap 1.2: Extract Helper Functies (Zonder Wijzigingen)
- [ ] Extract `validateInput()` - alleen validatie, geen wijzigingen
- [ ] Extract `importJerseys()` - verplaats bestaande code naar functie
- [ ] Extract `importStageResults()` - verplaats bestaande code naar functie
- [ ] Test: alles moet exact hetzelfde werken

**Voordeel**: Code wordt al modulair, maar gedrag blijft identiek.

---

## FASE 2: Reserve Activatie Fix (Week 1-2)

### Stap 2.1: Test Huidige Reserve Activatie
- [ ] Schrijf test script om reserve activatie te testen
- [ ] Identificeer bugs in huidige implementatie
- [ ] Documenteer wat er mis gaat

### Stap 2.2: Fix Reserve Activatie (Incrementeel)
- [ ] Fix DNF/DNS detectie (nu al gedaan ✅)
- [ ] Test met echte data
- [ ] Verifieer dat teams correct worden aangevuld
- [ ] Fix edge cases één voor één

**Voordeel**: Kritieke bug wordt gefixt, rest blijft werken.

---

## FASE 3: Punten Berekenen Refactor (Week 2-3)

### Stap 3.1: Extract Punten Functies
- [ ] Extract `calculatePositionPoints()` - alleen position punten
- [ ] Extract `calculateJerseyPoints()` - alleen jersey punten
- [ ] Extract `calculateBonusPoints()` - alleen bonus punten
- [ ] Test: punten moeten identiek zijn

### Stap 3.2: Refactor Aggregatie
- [ ] Extract `aggregatePointsPerParticipant()`
- [ ] Test: totaal punten moeten identiek zijn
- [ ] Optimaliseer queries (bulk i.p.v. loops)

**Voordeel**: Code wordt schoner, maar output blijft hetzelfde.

---

## FASE 4: Awards Implementatie (Week 3-4)

### Stap 4.1: Database Schema Check
- [ ] Verifieer `awards` tabel structuur
- [ ] Verifieer `awards_per_participant` tabel (heeft `stage_id`?)
- [ ] Maak migration script indien nodig

### Stap 4.2: Implementeer Eenvoudige Awards Eerst
- [ ] Implementeer PODIUM_1, PODIUM_2, PODIUM_3 (eenvoudig: top 3 teams)
- [ ] Test met echte data
- [ ] Verifieer dat awards correct worden opgeslagen

### Stap 4.3: Implementeer Complexere Awards
- [ ] STIJGER_VD_DAG (vergelijk rankings)
- [ ] COMEBACK (grootste stijging)
- [ ] Test één voor één

**Voordeel**: Nieuwe functionaliteit, geen impact op bestaande code.

---

## FASE 5: Cumulatieve Updates (Week 4)

### Stap 5.1: Extract Cumulatieve Functies
- [ ] Extract `updateCumulativePoints()` - verplaats bestaande code
- [ ] Extract `updateRankings()` - verplaats bestaande code
- [ ] Test: rankings moeten identiek zijn

### Stap 5.2: Optimaliseer Rankings
- [ ] Gebruik één query i.p.v. meerdere
- [ ] Test: rankings moeten identiek zijn

**Voordeel**: Performance verbetering, geen gedragswijziging.

---

## FASE 6: Status Systeem (Week 5 - Optioneel)

### Stap 6.1: Database Migration
- [ ] Voeg `status` kolom toe aan `fantasy_team_riders`
- [ ] Migreer bestaande data
- [ ] Test: alles moet nog werken

### Stap 6.2: Update Logica
- [ ] Update reserve activatie om status te zetten
- [ ] Update queries om status te gebruiken
- [ ] Test: gedrag moet identiek zijn

**Voordeel**: Betere data tracking, maar optioneel.

---

## IMPLEMENTATIE TACTIEK: "Strangler Fig Pattern"

### Principe
Vervang oude code geleidelijk door nieuwe code, terwijl oude code blijft werken.

### Stappen

#### 1. Maak Nieuwe Functies Naast Oude
```javascript
// Oude code blijft werken
async function calculateStagePoints_OLD(client, stageId) { ... }

// Nieuwe code wordt toegevoegd
async function calculateStagePoints_NEW(client, stageId) { ... }
```

#### 2. Test Nieuwe Functies
```javascript
// Test dat nieuwe functie identieke output geeft
const oldResult = await calculateStagePoints_OLD(client, stageId);
const newResult = await calculateStagePoints_NEW(client, stageId);
assert.deepEqual(oldResult, newResult);
```

#### 3. Switch Feature Flag
```javascript
const USE_NEW_LOGIC = process.env.USE_NEW_POINTS_CALCULATION === 'true';

if (USE_NEW_LOGIC) {
  await calculateStagePoints_NEW(client, stageId);
} else {
  await calculateStagePoints_OLD(client, stageId);
}
```

#### 4. Vervang Oude Code
```javascript
// Als nieuwe code bewezen werkt, verwijder oude
async function calculateStagePoints(client, stageId) {
  // Nu alleen nieuwe implementatie
  return await calculateStagePoints_NEW(client, stageId);
}
```

---

## RISICO MITIGATIE

### Risico 1: Data Corruptie
**Mitigatie**:
- [ ] Altijd in transaction
- [ ] Backup voor elke grote wijziging
- [ ] Test eerst op staging/test database
- [ ] Rollback script klaar

### Risico 2: Performance Degradatie
**Mitigatie**:
- [ ] Benchmark huidige performance
- [ ] Test nieuwe code met zelfde data
- [ ] Monitor query execution times
- [ ] Gebruik EXPLAIN ANALYZE voor queries

### Risico 3: Breaking Changes
**Mitigatie**:
- [ ] Feature flags voor nieuwe functionaliteit
- [ ] Backwards compatible API
- [ ] Uitgebreide logging
- [ ] Staged rollout (eerst test, dan productie)

### Risico 4: Vastlopen in Complexiteit
**Mitigatie**:
- [ ] Één stap per keer
- [ ] Test na elke stap
- [ ] Commit na elke werkende stap
- [ ] Documenteer wat werkt en wat niet

---

## CONCRETE EERSTE STAPPEN

### Stap 1: Maak Test Harness
```javascript
// imports/test-stage-import.js
// Script om volledige import flow te testen
// - Mock data
// - Test elke fase
// - Vergelijk output met verwachting
```

### Stap 2: Extract Eerste Functie
```javascript
// Begin met validateInput()
// - Maak nieuwe functie
// - Test dat output identiek is
// - Vervang oude code
```

### Stap 3: Fix Reserve Activatie
```javascript
// Dit is al grotendeels gedaan
// - Test met echte data
// - Fix edge cases
// - Verifieer correct gedrag
```

---

## TESTING STRATEGIE

### Unit Tests (per functie)
```javascript
// test/calculate-stage-points.test.js
describe('calculateStagePoints', () => {
  it('should calculate points correctly', async () => {
    // Test met bekende input/output
  });
});
```

### Integration Tests (volledige flow)
```javascript
// test/import-stage-results.integration.test.js
describe('importStageResults', () => {
  it('should import and calculate correctly', async () => {
    // Test volledige flow
  });
});
```

### Manual Testing Checklist
- [ ] Import etappe met normale resultaten
- [ ] Import etappe met DNF renners
- [ ] Import etappe met DNS renners
- [ ] Test reserve activatie
- [ ] Test punten berekenen
- [ ] Test awards (als geïmplementeerd)
- [ ] Test her-import scenario

---

## VOORGESTELDE VOLGORDE

### Week 1: Foundation
1. ✅ Backup & documentatie
2. ✅ Extract validateInput()
3. ✅ Fix reserve activatie (al gedaan)
4. ✅ Test reserve activatie met echte data

### Week 2: Punten Refactor
1. Extract calculatePositionPoints()
2. Extract calculateJerseyPoints()
3. Test dat punten identiek zijn
4. Optimaliseer queries

### Week 3: Awards
1. Database schema check
2. Implementeer PODIUM awards
3. Test awards
4. Implementeer STIJGER_VD_DAG

### Week 4: Finaliseren
1. Extract cumulatieve functies
2. Optimaliseer rankings
3. Uitgebreide testing
4. Documentatie

---

## SUCCESS CRITERIA

### Per Fase
- [ ] Code werkt identiek aan oude versie
- [ ] Tests slagen
- [ ] Geen performance degradatie
- [ ] Code is schoner/modulairder

### Eindresultaat
- [ ] Alle fases werken correct
- [ ] Reserve activatie werkt perfect
- [ ] Awards worden correct berekend
- [ ] Code is onderhoudbaar
- [ ] Geen data corruptie
- [ ] Performance is gelijk of beter

---

## WANNEER STOPPEN?

### Red Flags
- ❌ Tests falen en kunnen niet gefixt worden
- ❌ Performance wordt significant slechter
- ❌ Data corruptie optreedt
- ❌ Code wordt complexer i.p.v. eenvoudiger

### Wat Dan?
1. Stop en evalueer
2. Identificeer probleem
3. Overweeg alternatieve aanpak
4. Rollback indien nodig
5. Herstart met aangepast plan

---

## CONCLUSIE

**Kernprincipe**: 
- ✅ Één stap per keer
- ✅ Test na elke stap
- ✅ Oude code blijft werken tot nieuwe bewezen werkt
- ✅ Feature flags voor nieuwe functionaliteit
- ✅ Uitgebreide logging
- ✅ Rollback plan klaar

**Eerste Concrete Stap**:
1. Maak test harness
2. Extract validateInput()
3. Test reserve activatie met echte data
4. Fix eventuele bugs

**Vraag**: Wil je dat ik begin met Stap 1 (test harness + extract validateInput)?
