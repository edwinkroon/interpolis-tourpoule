# Database Documentatie - Interpolis Tourpoule

Deze documentatie beschrijft alle tabellen en velden in de database, hun functie en gebruik.

## Inhoudsopgave

1. [Stamtabellen (Masterdata)](#stamtabellen-masterdata)
2. [Gebruikers en Teams](#gebruikers-en-teams)
3. [Etappes en Resultaten](#etappes-en-resultaten)
4. [Punten en Klassementen](#punten-en-klassementen)
5. [Awards en Prijzen](#awards-en-prijzen)
6. [Overige Tabellen](#overige-tabellen)

---

## Stamtabellen (Masterdata)

### `teams_pro`
Bevat de professionele wielerploegen die deelnemen aan de Tour de France.

| Veld | Type | Beschrijving |
|------|------|--------------|
| `id` | Int (PK) | Unieke identifier voor het team |
| `name` | String (Unique) | Volledige naam van het team (bijv. "Team Jumbo-Visma") |
| `code` | String? | Teamcode (bijv. "TJV") |
| `country` | String? | Land van herkomst van het team |

**Gebruik:** Referentietabel voor renners. Elke renner hoort bij een team_pro.

---

### `riders`
Bevat alle renners die deelnemen aan de Tour de France.

| Veld | Type | Beschrijving |
|------|------|--------------|
| `id` | Int (PK) | Unieke identifier voor de renner |
| `team_pro_id` | Int? (FK) | Verwijzing naar het professionele team |
| `first_name` | String? | Voornaam van de renner |
| `last_name` | String | Achternaam van de renner (verplicht) |
| `date_of_birth` | DateTime? | Geboortedatum |
| `nationality` | String? | Nationaliteit |
| `weight_kg` | Decimal? | Gewicht in kilogram |
| `height_m` | Decimal? | Lengte in meters |
| `photo_url` | String? | URL naar foto van de renner |

**Gebruik:** 
- Basisdata voor alle renners
- Wordt gebruikt in fantasy teams, etapperesultaten en truidragers
- Relatie met `teams_pro` via `team_pro_id`

---

### `jerseys`
Bevat de verschillende truien (jerseys) die kunnen worden gedragen in de Tour.

| Veld | Type | Beschrijving |
|------|------|--------------|
| `id` | Int (PK) | Unieke identifier voor de trui |
| `type` | String (Unique) | Type trui: 'geel', 'groen', 'bolletjes', 'wit' |
| `name` | String | Volledige naam (bijv. "Gele trui") |
| `icon` | String? | Icon identifier voor weergave |

**Gebruik:**
- Masterdata voor de 4 klassementstruien
- Wordt gebruikt in `stage_jersey_wearers` om aan te geven wie welke trui draagt per etappe
- Wordt gebruikt in `fantasy_team_jerseys` om aan te geven welke truien een fantasy team heeft toegewezen

**Waarden voor `type`:**
- `geel`: Algemeen klassement (Maillot Jaune)
- `groen`: Puntenklassement (Maillot Vert)
- `bolletjes`: Bergklassement (Maillot à Pois)
- `wit`: Jongerenklassement (Maillot Blanc)

---

### `scoring_rules`
Bevat de puntentelling regels voor verschillende acties.

| Veld | Type | Beschrijving |
|------|------|--------------|
| `id` | Int (PK) | Unieke identifier |
| `rule_type` | String | Type regel: 'stage_position', 'jersey', 'final_classification', 'final_jersey' |
| `condition_json` | Json | JSON object met voorwaarden (bijv. `{"position": 1}` of `{"jersey_type": "geel"}`) |
| `points` | Int | Aantal punten voor deze regel |

**Gebruik:**
- Definieert hoeveel punten worden gegeven voor verschillende prestaties
- Wordt gebruikt bij het berekenen van punten voor etappeposities en truien

**Voorbeelden:**
- `rule_type: 'stage_position'`, `condition_json: {"position": 1}`, `points: 30` → 30 punten voor 1e plaats
- `rule_type: 'jersey'`, `condition_json: {"jersey_type": "geel"}`, `points: 10` → 10 punten voor gele trui

---

### `stages`
Bevat alle etappes van de Tour de France.

| Veld | Type | Beschrijving |
|------|------|--------------|
| `id` | Int (PK) | Unieke identifier |
| `stage_number` | Int (Unique) | Etappenummer (1, 2, 3, etc.) |
| `name` | String | Naam van de etappe |
| `start_location` | String? | Startplaats |
| `end_location` | String? | Finishplaats |
| `distance_km` | Decimal? | Afstand in kilometers |
| `date` | DateTime | Datum van de etappe |
| `type` | String? | Type etappe: 'vlak', 'heuvels', 'bergen', 'berg', 'ITT' |
| `is_neutralized` | Boolean | Of de etappe geneutraliseerd is (geen positiepunten) |
| `is_cancelled` | Boolean | Of de etappe is vervallen |

**Gebruik:**
- Centrale tabel voor alle etappes
- Wordt gebruikt voor etapperesultaten, puntenberekening en klassementen
- `is_neutralized`: Bij true worden geen positiepunten gegeven, maar wel truipunten
- `is_cancelled`: Bij true worden geen punten gegeven

**Waarden voor `type`:**
- `vlak`: Vlakke etappe
- `heuvels`: Heuvelachtige etappe
- `bergen`: Bergrit met meerdere bergen
- `berg`: Bergrit met één grote beklimming
- `ITT`: Individuele tijdrit
- `NULL`: Rustdag

---

## Gebruikers en Teams

### `participants`
Bevat alle deelnemers aan het fantasy spel.

| Veld | Type | Beschrijving |
|------|------|--------------|
| `id` | Int (PK) | Unieke identifier |
| `user_id` | String (Unique) | Auth0 user ID (uniek per gebruiker) |
| `team_name` | String | Naam van het fantasy team |
| `email` | String? | Emailadres |
| `avatar_url` | String? | URL naar avatar afbeelding |
| `newsletter` | Boolean | Of de gebruiker de nieuwsbrief wil ontvangen |
| `created_at` | DateTime | Aanmaakdatum |
| `is_admin` | Boolean | Of de gebruiker admin rechten heeft (niet in Prisma schema) |

**Gebruik:**
- Hoofdtabel voor alle gebruikers
- Elke participant heeft één fantasy team
- `is_admin`: Bepaalt of gebruiker admin functionaliteit kan gebruiken

---

### `fantasy_teams`
Bevat de fantasy teams van deelnemers.

| Veld | Type | Beschrijving |
|------|------|--------------|
| `id` | Int (PK) | Unieke identifier |
| `participant_id` | Int (Unique, FK) | Verwijzing naar participant (1-op-1 relatie) |
| `created_at` | DateTime | Aanmaakdatum van het team |

**Gebruik:**
- Container voor fantasy team renners
- Elke participant heeft precies één fantasy team
- Wordt gebruikt om renners te koppelen aan een team via `fantasy_team_riders`

---

### `fantasy_team_riders`
Koppelt renners aan fantasy teams met hun positie en status.

| Veld | Type | Beschrijving |
|------|------|--------------|
| `id` | Int (PK) | Unieke identifier |
| `fantasy_team_id` | Int (FK) | Verwijzing naar fantasy team |
| `rider_id` | Int (FK) | Verwijzing naar renner |
| `slot_type` | String | Type slot: 'main' of 'reserve' |
| `slot_number` | Int | Slotnummer (1-10 voor main, 1-5 voor reserve) |
| `active` | Boolean | Of de renner actief is (kan punten verdienen) |

**Gebruik:**
- Definieert welke renners in welk fantasy team zitten
- **Business Rules:**
  - Elk team heeft 10 main riders (slot 1-10) en 5 reserve riders (slot 1-5)
  - Alleen actieve main riders (`active = true` en `slot_type = 'main'`) kunnen punten verdienen
  - Wanneer een main rider DNF/DNS is, wordt `active` op `false` gezet
  - Reserves kunnen automatisch worden geactiveerd om de plaats van DNF main riders in te nemen
  - `slot_number` wordt gebruikt om de volgorde te bepalen

**Constraints:**
- Uniek: `[fantasy_team_id, slot_type, slot_number]` - elk slot kan maar één renner hebben
- Uniek: `[fantasy_team_id, rider_id]` - een renner kan maar één keer in een team zitten

---

### `fantasy_team_jerseys` (niet in Prisma schema)
Bevat de truien die fantasy teams hebben toegewezen aan hun renners.

| Veld | Type | Beschrijving |
|------|------|--------------|
| `id` | Int (PK) | Unieke identifier |
| `fantasy_team_id` | Int (FK) | Verwijzing naar fantasy team |
| `jersey_id` | Int (FK) | Verwijzing naar trui (jersey) |
| `rider_id` | Int? (FK) | Verwijzing naar renner die de trui draagt |
| `created_at` | DateTime | Aanmaakdatum |
| `updated_at` | DateTime | Laatste wijziging |

**Gebruik:**
- Slaat op welke truien een fantasy team heeft toegewezen aan welke renners
- Elke trui kan maar één keer per team worden toegewezen
- Wordt gebruikt voor weergave van team truien in de UI

**Constraint:**
- Uniek: `[fantasy_team_id, jersey_id]` - elk team kan elke trui maar één keer toewijzen

---

## Etappes en Resultaten

### `stage_results`
Bevat de resultaten van renners per etappe.

| Veld | Type | Beschrijving |
|------|------|--------------|
| `id` | Int (PK) | Unieke identifier |
| `stage_id` | Int (FK) | Verwijzing naar etappe |
| `rider_id` | Int (FK) | Verwijzing naar renner |
| `position` | Int | Eindpositie in de etappe |
| `time_seconds` | Int? | Finishtijd in seconden (NULL = DNF/DNS) |
| `same_time_group` | Int? | Groepnummer voor renners met dezelfde tijd |

**Gebruik:**
- Slaat de uitslag van elke etappe op
- Wordt gebruikt voor:
  - Puntenberekening op basis van positie
  - Bepalen welke renners DNF/DNS zijn (`time_seconds IS NULL`)
  - Klassementen en statistieken

**Business Rules:**
- `time_seconds IS NULL` betekent DNF (Did Not Finish) of DNS (Did Not Start)
- DNF/DNS renners worden automatisch gedeactiveerd in fantasy teams
- `same_time_group` wordt gebruikt om renners met dezelfde tijd te groeperen

**Constraints:**
- Uniek: `[stage_id, rider_id]` - een renner kan maar één resultaat per etappe hebben
- Uniek: `[stage_id, position]` - elke positie kan maar één renner hebben

---

### `stage_jersey_wearers`
Bevat wie welke trui draagt na elke etappe.

| Veld | Type | Beschrijving |
|------|------|--------------|
| `id` | Int (PK) | Unieke identifier |
| `stage_id` | Int (FK) | Verwijzing naar etappe |
| `jersey_id` | Int (FK) | Verwijzing naar trui |
| `rider_id` | Int (FK) | Verwijzing naar renner die de trui draagt |

**Gebruik:**
- Slaat op wie na elke etappe welke trui draagt
- Wordt gebruikt voor:
  - Puntenberekening voor truien
  - Weergave van truidragers per etappe
  - Klassementen

**Constraint:**
- Uniek: `[stage_id, jersey_id]` - elke trui kan maar één drager per etappe hebben

---

## Punten en Klassementen

### `fantasy_stage_points`
Bevat de punten per deelnemer per etappe.

| Veld | Type | Beschrijving |
|------|------|--------------|
| `id` | Int (PK) | Unieke identifier |
| `stage_id` | Int (FK) | Verwijzing naar etappe |
| `participant_id` | Int (FK) | Verwijzing naar deelnemer |
| `points_stage` | Int | Punten van etappeposities (standaard 0) |
| `points_jerseys` | Int | Punten van truien (standaard 0) |
| `points_bonus` | Int | Bonuspunten (standaard 0) |
| `total_points` | Int? | Totaal punten (berekend: points_stage + points_jerseys + points_bonus) |

**Gebruik:**
- Slaat de punten op die een deelnemer heeft verdiend in een specifieke etappe
- Wordt gebruikt voor:
  - Etappe klassementen
  - Cumulatieve punten berekening
  - Statistieken en weergave

**Business Rules:**
- `points_stage`: Punten voor etappeposities (1e=30, 2e=15, etc.)
- `points_jerseys`: Punten voor truien (geel=10, groen=5, etc.)
- `points_bonus`: Extra bonuspunten (voor awards, etc.)
- `total_points` wordt automatisch berekend door de database

**Constraint:**
- Uniek: `[stage_id, participant_id]` - elke deelnemer heeft één puntenregel per etappe

---

### `fantasy_cumulative_points`
Bevat de cumulatieve punten en ranking per deelnemer na elke etappe.

| Veld | Type | Beschrijving |
|------|------|--------------|
| `id` | Int (PK) | Unieke identifier |
| `participant_id` | Int (FK) | Verwijzing naar deelnemer |
| `after_stage_id` | Int (FK) | Verwijzing naar etappe (na deze etappe) |
| `total_points` | Int | Totaal aantal punten na deze etappe |
| `rank` | Int? | Ranking positie (1 = eerste plaats) |

**Gebruik:**
- Slaat de totale punten en ranking op na elke etappe
- Wordt gebruikt voor:
  - Algemeen klassement
  - Ranking weergave
  - Statistieken over positieveranderingen
  - Awards zoals "Stijger van de dag"

**Business Rules:**
- Wordt na elke etappe opnieuw berekend
- `rank` wordt bepaald door `total_points` te sorteren (hoogste eerst)
- `after_stage_id` verwijst naar de etappe waarna deze punten gelden

**Constraint:**
- Uniek: `[participant_id, after_stage_id]` - elke deelnemer heeft één cumulatief record per etappe

---

## Awards en Prijzen

### `awards`
Bevat alle beschikbare awards/prijzen die kunnen worden toegekend.

| Veld | Type | Beschrijving |
|------|------|--------------|
| `id` | Int (PK) | Unieke identifier |
| `stage_id` | Int? (FK) | Verwijzing naar etappe (NULL = algemene award) |
| `code` | String | Unieke code (bijv. 'PODIUM_1', 'STIJGER_VD_DAG') |
| `title` | String | Titel van de award |
| `description` | String? | Beschrijving van de award |
| `icon` | String? | Pad naar icon afbeelding |

**Gebruik:**
- Masterdata voor alle awards
- Wordt gebruikt om awards toe te kennen aan deelnemers
- `stage_id` is NULL voor algemene awards (bijv. "Puntenvreter"), of verwijst naar een specifieke etappe (bijv. "Dagwinnaar")

**Voorbeelden van awards:**
- `PODIUM_1`: Dagwinnaar (1e plaats in etappe)
- `STIJGER_VD_DAG`: Stijger van de dag
- `PUNTENVRETER`: Hoogste totaalpunten
- `PLOEGLEIDER`: Hoogste eindsaldo

---

### `awards_per_participant`
Koppelt awards aan deelnemers.

| Veld | Type | Beschrijving |
|------|------|--------------|
| `id` | Int (PK) | Unieke identifier |
| `award_id` | Int (FK) | Verwijzing naar award |
| `participant_id` | Int (FK) | Verwijzing naar deelnemer |
| `stage_id` | Int? (FK) | Verwijzing naar etappe (voor etappe-specifieke awards) |

**Gebruik:**
- Slaat op welke deelnemers welke awards hebben gewonnen
- `stage_id` wordt gebruikt voor etappe-specifieke awards (bijv. "Dagwinnaar etappe 5")

**Constraint:**
- Uniek: `[award_id, participant_id, stage_id]` - een deelnemer kan een award maar één keer per etappe krijgen

---

## Overige Tabellen

### `settings`
Bevat applicatie-instellingen (niet in Prisma schema).

| Veld | Type | Beschrijving |
|------|------|--------------|
| `id` | Int (PK) | Unieke identifier |
| `key` | String (Unique) | Instelling sleutel (bijv. 'registration_deadline') |
| `value` | String? | Waarde van de instelling |
| `description` | String? | Beschrijving van de instelling |
| `updated_at` | DateTime | Laatste wijziging |
| `updated_by` | Int? (FK) | Wie de instelling heeft gewijzigd |

**Gebruik:**
- Slaat algemene applicatie-instellingen op
- Voorbeelden:
  - `registration_deadline`: Deadline voor teamwijzigingen
  - `tour_start_date`: Startdatum Tour de France
  - `tour_end_date`: Einddatum Tour de France

---

### `bulletin_messages`
Bevat prikbordberichten van deelnemers.

| Veld | Type | Beschrijving |
|------|------|--------------|
| `id` | Int (PK) | Unieke identifier |
| `participant_id` | Int (FK) | Verwijzing naar deelnemer die het bericht heeft geplaatst |
| `message` | String | Inhoud van het bericht |
| `created_at` | DateTime | Tijdstip waarop het bericht is geplaatst |

**Gebruik:**
- Slaat prikbordberichten op die deelnemers kunnen plaatsen
- Wordt gebruikt voor sociale interactie tussen deelnemers

---

## Belangrijke Business Rules

### Team Samenstelling
- Elk fantasy team heeft **precies 10 main riders** (slot 1-10) en **5 reserve riders** (slot 1-5)
- Alleen **actieve main riders** (`active = true` en `slot_type = 'main'`) kunnen punten verdienen
- Reserves kunnen automatisch worden geactiveerd wanneer main riders DNF/DNS zijn

### Punten Berekening
- **Etappeposities**: Punten worden gegeven op basis van eindpositie (1e=30, 2e=15, etc.)
- **Truien**: Punten worden gegeven als een renner een trui draagt (geel=10, groen=5, etc.)
- **Alleen actieve main riders** tellen mee voor punten
- Geneutraliseerde etappes: Geen positiepunten, wel truipunten
- Vervallen etappes: Geen punten

### DNF/DNS Handling
- Renners met `time_seconds IS NULL` in `stage_results` zijn DNF/DNS
- Main riders die DNF/DNS zijn worden automatisch gedeactiveerd (`active = false`)
- Hun slot wordt vrijgemaakt (slot_number wordt verhoogd naar 900+)
- Reserves worden automatisch geactiveerd om de plaats in te nemen
- Doel: Elk team heeft altijd 10 actieve main riders

### Team Wijzigingen
- Teams kunnen alleen worden gewijzigd **voor de eerste etappe** of **voor de deadline**
- Na de eerste etappe of na de deadline kunnen teams niet meer worden aangepast
- Dit wordt gecontroleerd via de `settings` tabel (`registration_deadline`)

---

## Relaties tussen Tabellen

```
participants (1) ──< (1) fantasy_teams
fantasy_teams (1) ──< (15) fantasy_team_riders
fantasy_team_riders (N) ──> (1) riders
riders (N) ──> (1) teams_pro

stages (1) ──< (N) stage_results
stage_results (N) ──> (1) riders

stages (1) ──< (4) stage_jersey_wearers
stage_jersey_wearers (N) ──> (1) jerseys
stage_jersey_wearers (N) ──> (1) riders

stages (1) ──< (N) fantasy_stage_points
fantasy_stage_points (N) ──> (1) participants

stages (1) ──< (N) fantasy_cumulative_points
fantasy_cumulative_points (N) ──> (1) participants

awards (1) ──< (N) awards_per_participant
awards_per_participant (N) ──> (1) participants
awards_per_participant (N) ──> (1) stages (optioneel)
```

---

## Indexen en Constraints

### Belangrijke Unique Constraints:
- `teams_pro.name`: Elke team naam is uniek
- `riders`: Combinaties zijn uniek waar nodig
- `stages.stage_number`: Elk etappenummer is uniek
- `jerseys.type`: Elk truitype is uniek
- `participants.user_id`: Elke Auth0 user ID is uniek
- `fantasy_teams.participant_id`: Elke participant heeft één team
- `fantasy_team_riders`: Unieke combinaties van team/slot en team/rider
- `stage_results`: Unieke combinaties van stage/rider en stage/position
- `stage_jersey_wearers`: Unieke combinatie van stage/jersey

### Belangrijke Foreign Keys:
- Cascade delete: Wanneer een stage wordt verwijderd, worden alle gerelateerde records verwijderd
- NoAction: Renners en teams_pro kunnen niet worden verwijderd als ze worden gebruikt

---

*Laatste update: 2025*
