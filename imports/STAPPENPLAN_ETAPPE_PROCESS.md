# Stappenplan: Refactoring Etappe Import & Verwerking Proces

## Huidige Situatie
Het proces na het toevoegen van een etappe is verspreid over verschillende functies en heeft geen duidelijke volgorde. Dit document beschrijft een gestructureerde aanpak.

---

## 1. OVERZICHT: Hoofdproces na Etappe Upload

### Fase 1: Data Import & Validatie
### Fase 2: Punten Berekenen
### Fase 3: Team Management (Reserve Activatie)
### Fase 4: Awards Berekenen
### Fase 5: Cumulatieve Updates
### Fase 6: Notificaties & Logging

---

## 2. GEDETAILLEERD STAPPENPLAN

### **FASE 1: Data Import & Validatie**

#### Stap 1.1: Validatie Input Data
- [ ] Valideer dat `stageId` bestaat en geldig is
- [ ] Valideer dat `results` array niet leeg is
- [ ] Valideer dat alle 4 truien (`jerseys`) zijn opgegeven
- [ ] Valideer dat alle renners in `results` bestaan in `riders` tabel
- [ ] Valideer dat posities uniek zijn (geen duplicaten)
- [ ] Valideer dat tijd formaten correct zijn (of NULL voor DNF/DNS)
- [ ] Check of er al resultaten bestaan voor deze etappe (waarschuwing/bevestiging)

#### Stap 1.2: Transaction Start
- [ ] Begin database transaction
- [ ] Lock relevante tabellen indien nodig (om race conditions te voorkomen)

#### Stap 1.3: Import Truien (Jerseys)
- [ ] Verwijder bestaande `stage_jersey_wearers` voor deze etappe
- [ ] Valideer dat alle 4 truien uniek zijn (geen dubbele renner)
- [ ] Insert nieuwe `stage_jersey_wearers` records
- [ ] Log welke truien zijn toegewezen

#### Stap 1.4: Import Etappe Resultaten
- [ ] Verwijder bestaande `stage_results` voor deze etappe (als her-import)
- [ ] Bereken `same_time_group` voor alle resultaten
- [ ] Insert alle `stage_results` records
- [ ] Markeer renners met `time_seconds IS NULL` als DNF/DNS
- [ ] Log totaal aantal finishers vs DNF/DNS

#### Stap 1.5: Data Integriteit Check
- [ ] Verifieer dat alle resultaten correct zijn opgeslagen
- [ ] Check of er geen orphaned records zijn
- [ ] Valideer dat alle truien correct zijn gelinkt

---

### **FASE 2: Punten Berekenen**

#### Stap 2.1: Voorbereiding Punten Berekenen
- [ ] Haal alle `scoring_rules` op (stage_position en jersey)
- [ ] Check of etappe geannuleerd is (`is_cancelled`) → skip punten berekenen
- [ ] Check of etappe geneutraliseerd is (`is_neutralized`) → geen stage position punten
- [ ] Check of dit de finale etappe is → geen trui punten

#### Stap 2.2: Bereken Stage Position Punten
- [ ] Voor elke renner in `stage_results`:
  - [ ] Zoek bijbehorende punten op basis van `position`
  - [ ] Alleen voor renners met `time_seconds IS NOT NULL` (geen DNF/DNS)
- [ ] Maak map: `rider_id → position_points`

#### Stap 2.3: Bereken Trui Punten
- [ ] Voor elke trui drager in `stage_jersey_wearers`:
  - [ ] Zoek bijbehorende punten op basis van `jersey_type`
- [ ] Maak map: `rider_id → jersey_points`

#### Stap 2.4: Bereken Bonus Punten
- [ ] Check of er bonus regels zijn (bijv. bergsprint, tussensprint)
- [ ] Bereken bonus punten per renner
- [ ] Maak map: `rider_id → bonus_points`

#### Stap 2.5: Aggregeer Punten per Participant
- [ ] Voor elke participant:
  - [ ] Haal alle actieve basisrenners op (`slot_type = 'main' AND active = true`)
  - [ ] Tel punten op per renner (position + jersey + bonus)
  - [ ] Tel alle renner punten op tot totaal team punten
- [ ] Maak map: `participant_id → total_points`

#### Stap 2.6: Sla Punten Op
- [ ] Verwijder bestaande `fantasy_stage_points` voor deze etappe
- [ ] Insert nieuwe `fantasy_stage_points` records
- [ ] Voor participants zonder team: insert met 0 punten
- [ ] Log totaal aantal participants met punten

---

### **FASE 3: Team Management (Reserve Activatie)**

#### Stap 3.1: Identificeer Uitgevallen Renners
- [ ] Voor elke participant:
  - [ ] Haal alle basisrenners op (`slot_type = 'main'`)
  - [ ] Check welke renners DNF/DNS zijn:
    - [ ] `time_seconds IS NULL` in `stage_results` (DNF/DNS)
    - [ ] OF renner staat niet in `stage_results` (DNS/missing)
- [ ] Maak lijst: `[participant_id, rider_id, slot_number]` voor uitgevallen renners

#### Stap 3.2: Deactiveer Uitgevallen Basisrenners
- [ ] Voor elke uitgevallen basisrenner:
  - [ ] Update `fantasy_team_riders.active = false`
  - [ ] Log deactivaties

#### Stap 3.3: Tel Actieve Basisrenners
- [ ] Voor elke participant:
  - [ ] Tel aantal actieve basisrenners (`slot_type = 'main' AND active = true`)
  - [ ] Bereken hoeveel reserves nodig zijn om tot 10 te komen

#### Stap 3.4: Activeer Reserves
- [ ] Voor elke participant met < 10 actieve basisrenners:
  - [ ] Haal beschikbare reserves op (`slot_type = 'reserve' AND active = true`)
  - [ ] Sorteer reserves op `slot_number` (volgorde)
  - [ ] Vind beschikbare main slots (1-10 die niet bezet zijn)
  - [ ] Activeer zoveel reserves als nodig (tot max 10 basisrenners)
  - [ ] Update: `slot_type = 'main'`, `slot_number = beschikbare_slot`, `active = true`
  - [ ] Log elke reserve activatie

#### Stap 3.5: Verifieer Team Status
- [ ] Check dat alle teams correct zijn aangevuld (of max bereikt)
- [ ] Log teams die < 10 basisrenners hebben (geen reserves meer)
- [ ] Verifieer dat er geen conflicten zijn (unieke constraints)

---

### **FASE 4: Awards Berekenen**

#### Stap 4.1: Identificeer Award Types
- [ ] Haal alle `awards` op voor deze etappe (`stage_id = X`)
- [ ] Haal alle algemene awards op (`stage_id IS NULL`) - deze worden na elke etappe geëvalueerd
- [ ] Categoriseer awards:
  - [ ] Per-etappe awards (bijv. PODIUM_1, PODIUM_2, PODIUM_3)
  - [ ] Cumulatieve awards (bijv. STIJGER_VD_DAG, COMEBACK)
  - [ ] Finale awards (alleen na laatste etappe)

#### Stap 4.2: Bereken Per-Etappe Awards
Voor elke per-etappe award:
- [ ] **PODIUM_1, PODIUM_2, PODIUM_3**: 
  - [ ] Haal top 3 teams op basis van `fantasy_stage_points` voor deze etappe
  - [ ] Insert in `awards_per_participant` (meerdere winnaars bij gelijkspel)
  
- [ ] **STIJGER_VD_DAG**:
  - [ ] Vergelijk `fantasy_cumulative_points` voor deze etappe met vorige etappe
  - [ ] Bereken grootste stijging in ranking
  - [ ] Insert winnaar(s) in `awards_per_participant`

#### Stap 4.3: Bereken Cumulatieve Awards
Voor elke cumulatieve award:
- [ ] **COMEBACK**:
  - [ ] Vergelijk ranking tussen etappes
  - [ ] Vind grootste stijging in één etappe
  - [ ] Insert winnaar(s)
  
- [ ] **LUCKY_LOSER**:
  - [ ] Bereken voor elke participant: aantal actieve renners in deze etappe
  - [ ] Vind beste score met minste actieve renners
  - [ ] Insert winnaar(s)
  
- [ ] **TEAMWORK**:
  - [ ] Tel voor elke participant: aantal etappes met ≥5 renners die punten scoorden
  - [ ] Vind hoogste aantal
  - [ ] Insert winnaar(s)

#### Stap 4.4: Bereken Finale Awards (alleen laatste etappe)
- [ ] Check of dit de laatste etappe is
- [ ] **Ploegleider van het Jaar**:
  - [ ] Haal hoogste `fantasy_cumulative_points` op
  - [ ] Insert winnaar(s)
- [ ] Andere finale awards...

#### Stap 4.5: Sla Awards Op
- [ ] Verwijder bestaande `awards_per_participant` voor deze etappe (als her-berekening)
- [ ] Insert alle nieuwe awards
- [ ] Verifieer dat er geen duplicaten zijn (unique constraint: `award_id + participant_id + stage_id`)
- [ ] Log totaal aantal awards uitgereikt

---

### **FASE 5: Cumulatieve Updates**

#### Stap 5.1: Update Cumulatieve Punten
- [ ] Voor elke participant:
  - [ ] Haal huidige `fantasy_cumulative_points` op (na vorige etappe)
  - [ ] Tel `fantasy_stage_points` van deze etappe op
  - [ ] Update of insert `fantasy_cumulative_points` voor deze etappe
  - [ ] Bereken nieuwe ranking op basis van cumulatieve punten

#### Stap 5.2: Update Rankings
- [ ] Sorteer alle participants op `fantasy_cumulative_points` (DESC)
- [ ] Update `rank` in `fantasy_cumulative_points`
- [ ] Log ranking wijzigingen (stijgers/dalers)

#### Stap 5.3: Update Stage Status
- [ ] Update `stages.status` naar "completed" of "results_imported"
- [ ] Set `stages.results_imported_at` timestamp

---

### **FASE 6: Notificaties & Logging**

#### Stap 6.1: Transaction Commit
- [ ] Commit database transaction
- [ ] Verifieer dat alle wijzigingen zijn opgeslagen

#### Stap 6.2: Logging
- [ ] Log totaal aantal resultaten geïmporteerd
- [ ] Log aantal DNF/DNS renners
- [ ] Log aantal reserves geactiveerd
- [ ] Log aantal awards uitgereikt
- [ ] Log ranking wijzigingen
- [ ] Log eventuele errors/warnings

#### Stap 6.3: Notificaties (optioneel)
- [ ] Stuur notificatie naar admin: "Etappe X resultaten geïmporteerd"
- [ ] Stuur notificatie naar participants met awards: "Je hebt award Y gewonnen!"
- [ ] Stuur notificatie naar participants met uitgevallen renners: "Je renner X is uitgevallen, reserve Y is geactiveerd"

---

## 3. RENNER STATUS SYSTEEM

### Huidige Situatie
- Renners hebben alleen `active` boolean in `fantasy_team_riders`
- Geen duidelijk onderscheid tussen verschillende statussen

### Voorgestelde Status Kolom

#### Optie A: Status in `fantasy_team_riders` tabel
```sql
ALTER TABLE fantasy_team_riders 
ADD COLUMN status VARCHAR(20) DEFAULT 'active';

-- Mogelijke statussen:
-- 'active' - Actief in team (basis of reserve)
-- 'inactive' - Inactief (uitgevallen, verwijderd)
-- 'reserve' - Reserve renner (kan geactiveerd worden)
-- 'dnf' - Did Not Finish (uitgevallen in etappe)
-- 'dns' - Did Not Start (niet gestart)
-- 'injured' - Geblesseerd (toekomstig gebruik)
-- 'suspended' - Geschorst (toekomstig gebruik)
```

#### Optie B: Status per Etappe in `stage_results` tabel
```sql
-- Huidige tabel heeft al:
-- time_seconds (NULL = DNF/DNS)
-- position

-- Mogelijk toevoegen:
ALTER TABLE stage_results
ADD COLUMN status VARCHAR(10);

-- Mogelijke statussen:
-- 'finished' - Gefinisht
-- 'dnf' - Did Not Finish
-- 'dns' - Did Not Start
-- 'dsq' - Disqualified
-- 'otl' - Outside Time Limit
```

#### Optie C: Combinatie (aanbevolen)
- **`fantasy_team_riders.status`**: Huidige team status (active/inactive/reserve)
- **`stage_results.status`**: Status per etappe (finished/dnf/dns/dsq)
- **`riders.status`**: Algemene renner status (active/injured/suspended) - toekomstig

### Voordelen Status Systeem
1. **Duidelijkheid**: Makkelijker te zien waarom een renner inactief is
2. **Historie**: Kunnen bijhouden wanneer renner is uitgevallen
3. **Rapportage**: Betere statistieken (aantal DNF vs DNS)
4. **Toekomst**: Uitbreidbaar voor nieuwe statussen (blessure, schorsing)

### Implementatie Stappen
1. [ ] Voeg `status` kolom toe aan `fantasy_team_riders`
2. [ ] Migreer bestaande data: `active = true` → `status = 'active'`, `active = false` → `status = 'inactive'`
3. [ ] Update reserve activatie logica om status te zetten
4. [ ] Voeg `status` kolom toe aan `stage_results` (optioneel)
5. [ ] Update import logica om status te bepalen op basis van `time_seconds`
6. [ ] Update queries om status te gebruiken in plaats van alleen `active`

---

## 4. DINGEN DIE MOGELIJK VERGETEN ZIJN

### 4.1 Error Handling & Rollback
- [ ] Wat gebeurt er als punten berekenen faalt?
- [ ] Wat gebeurt er als reserve activatie faalt?
- [ ] Wat gebeurt er als awards berekenen faalt?
- [ ] Moeten we partial rollback doen of alles terugdraaien?
- [ ] Hoe omgaan met race conditions (twee admins uploaden tegelijk)?

### 4.2 Performance
- [ ] Zijn alle queries geoptimaliseerd (indexes)?
- [ ] Moeten we bulk inserts gebruiken i.p.v. loops?
- [ ] Moeten we caching toevoegen voor scoring rules?
- [ ] Zijn er N+1 query problemen?

### 4.3 Data Consistency
- [ ] Wat als een renner in meerdere teams zit (mag dat)?
- [ ] Wat als een renner zowel basis als reserve is in hetzelfde team (mag niet)?
- [ ] Wat als een team > 10 basisrenners heeft (data corruptie)?
- [ ] Validatie: max 10 basisrenners, max 5 reserves per team

### 4.4 Edge Cases
- [ ] Wat als alle 10 basisrenners uitvallen? (alle reserves activeren)
- [ ] Wat als er geen reserves meer zijn? (team blijft met < 10 renners)
- [ ] Wat als een reserve ook uitvalt? (niet activeren)
- [ ] Wat als een etappe geannuleerd wordt? (geen punten, geen reserve activatie?)
- [ ] Wat als een etappe geneutraliseerd wordt? (geen stage position punten, wel trui punten)

### 4.5 Her-import Scenario's
- [ ] Wat als admin een etappe opnieuw importeert (corrigeren van fouten)?
- [ ] Moeten we oude punten verwijderen?
- [ ] Moeten we reserve activaties terugdraaien?
- [ ] Moeten we awards opnieuw berekenen?

### 4.6 Audit Trail
- [ ] Moeten we bijhouden wie/wanneer een etappe heeft geïmporteerd?
- [ ] Moeten we een audit log hebben van alle wijzigingen?
- [ ] Moeten we versie nummers bijhouden voor etappe resultaten?

### 4.7 Notificaties & Communicatie
- [ ] Moeten participants een email krijgen bij reserve activatie?
- [ ] Moeten participants een notificatie krijgen bij awards?
- [ ] Moet er een prikbord bericht worden geplaatst?

### 4.8 Testing & Validatie
- [ ] Unit tests voor elke fase?
- [ ] Integration tests voor volledige flow?
- [ ] Test data voor edge cases?
- [ ] Validatie scripts om data integriteit te checken?

---

## 5. VOORGESTELDE REFACTORING STRUCTUUR

### Nieuwe Functie Structuur

```javascript
// import-stage-results.js
async function importStageResults(stageId, results, jerseys) {
  const client = await getDbClient();
  await client.query('BEGIN');
  
  try {
    // FASE 1: Data Import & Validatie
    await validateInput(stageId, results, jerseys);
    await importJerseys(client, stageId, jerseys);
    await importStageResults(client, stageId, results);
    
    // FASE 2: Punten Berekenen
    await calculateStagePoints(client, stageId);
    
    // FASE 3: Team Management
    await activateReservesForDroppedRiders(client, stageId);
    
    // FASE 4: Awards Berekenen
    await calculateAwards(client, stageId);
    
    // FASE 5: Cumulatieve Updates
    await updateCumulativePoints(client, stageId);
    await updateRankings(client, stageId);
    
    // FASE 6: Notificaties & Logging
    await logImportResults(client, stageId);
    
    await client.query('COMMIT');
    return { success: true };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    await client.end();
  }
}
```

### Nieuwe Helper Functies

```javascript
// Validatie
async function validateInput(stageId, results, jerseys) { ... }
async function validateStageExists(client, stageId) { ... }
async function validateRidersExist(client, results) { ... }

// Import
async function importJerseys(client, stageId, jerseys) { ... }
async function importStageResults(client, stageId, results) { ... }

// Punten
async function calculateStagePoints(client, stageId) { ... }
async function calculatePositionPoints(client, stageId) { ... }
async function calculateJerseyPoints(client, stageId) { ... }
async function calculateBonusPoints(client, stageId) { ... }

// Team Management
async function activateReservesForDroppedRiders(client, stageId) { ... }
async function identifyDroppedRiders(client, stageId) { ... }
async function deactivateDroppedRiders(client, droppedRiders) { ... }
async function activateReserves(client, participantId, neededCount) { ... }

// Awards
async function calculateAwards(client, stageId) { ... }
async function calculatePerStageAwards(client, stageId) { ... }
async function calculateCumulativeAwards(client, stageId) { ... }
async function calculateFinalAwards(client, stageId) { ... }

// Cumulatief
async function updateCumulativePoints(client, stageId) { ... }
async function updateRankings(client, stageId) { ... }

// Logging
async function logImportResults(client, stageId, stats) { ... }
```

---

## 6. IMPLEMENTATIE VOLGORDE

### Prioriteit 1: Core Functionaliteit
1. Refactor import proces in duidelijke fases
2. Implementeer reserve activatie correct
3. Implementeer awards berekenen

### Prioriteit 2: Status Systeem
1. Voeg status kolom toe
2. Migreer bestaande data
3. Update logica om status te gebruiken

### Prioriteit 3: Error Handling & Edge Cases
1. Implementeer rollback strategie
2. Handle edge cases
3. Voeg validatie toe

### Prioriteit 4: Performance & Optimalisatie
1. Optimaliseer queries
2. Voeg indexes toe
3. Implementeer caching

### Prioriteit 5: Notificaties & Audit
1. Implementeer notificaties
2. Voeg audit logging toe
3. Voeg versie beheer toe

---

## 7. VRAAGPUNTEN VOOR DISCUSSIE

1. **Transaction Scope**: Moeten alle fases in één transaction, of kunnen we partial commits doen?
2. **Reserve Activatie**: Moeten we reserves activeren VOOR of NA punten berekenen?
3. **Awards Timing**: Moeten awards direct na elke etappe, of alleen aan het einde?
4. **Status Systeem**: Welke statussen hebben we nodig? Moeten we historie bijhouden?
5. **Her-import**: Hoe omgaan met her-import? Alles terugdraaien of alleen wijzigen?
6. **Notificaties**: Welke notificaties zijn nodig? Email, in-app, prikbord?
7. **Performance**: Zijn er performance issues met huidige implementatie?
8. **Testing**: Welke tests zijn nodig? Unit, integration, e2e?

---

## 8. CONCLUSIE

Dit stappenplan geeft een duidelijk overzicht van:
- ✅ Alle fases die moeten worden uitgevoerd
- ✅ De volgorde van operaties
- ✅ Dingen die mogelijk vergeten zijn
- ✅ Voorgestelde refactoring structuur
- ✅ Implementatie prioriteiten

**Volgende stap**: Bespreek dit plan en bepaal prioriteiten voor implementatie.
