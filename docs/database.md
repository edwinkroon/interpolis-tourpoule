Dit is een Markdown‑overzicht dat je zo als `docs/database.md` in je repo kunt zetten.

## teams_pro  
Ploegen uit het profpeloton waar renners voor rijden.

- **id** – Interne ID van de ploeg. Voorbeeld: `1`  
- **name** – Volledige ploegnaam. Voorbeeld: `Team Aurora Cycling`  
- **code** – Korte ploegcode. Voorbeeld: `AUR`  
- **country** – Land van de ploeg. Voorbeeld: `Norway`  

## riders  
Alle renners die in je spel kunnen voorkomen.

- **id** – Interne ID van de renner. Voorbeeld: `101`  
- **team_pro_id** – Verwijzing naar `teams_pro.id`. Voorbeeld: `1`  
- **first_name** – Voornaam renner. Voorbeeld: `Lars`  
- **last_name** – Achternaam renner. Voorbeeld: `Halvorsen`  
- **date_of_birth** – Geboortedatum. Voorbeeld: `1997-03-21`  
- **nationality** – Nationaliteit. Voorbeeld: `Norway`  
- **weight_kg** – Gewicht in kilo’s. Voorbeeld: `70.5`  
- **height_m** – Lengte in meters. Voorbeeld: `1.83`  
- **photo_url** – URL naar foto. Voorbeeld: `https://cdn.example.com/riders/lars-halvorsen.jpg`  

## stages  
Etappes van de huidige ronde.

- **id** – Interne ID van de etappe. Voorbeeld: `1`  
- **stage_number** – Etappenummer. Voorbeeld: `1`  
- **name** – Titel/omschrijving. Voorbeeld: `Utrecht – Rotterdam`  
- **start_location** – Startplaats. Voorbeeld: `Utrecht`  
- **end_location** – Finishplaats. Voorbeeld: `Rotterdam`  
- **distance_km** – Afstand in km. Voorbeeld: `184.9`  
- **date** – Datum van de etappe. Voorbeeld: `2025-07-05`  

## jerseys  
Definitie van truien in het spel.

- **id** – Interne ID van de trui. Voorbeeld: `1`  
- **type** – Code van de trui. Voorbeeld: `yellow`  
- **name** – Weergavenaam. Voorbeeld: `Yellow jersey`  
- **icon** – Iconnaam / asset‑key. Voorbeeld: `yellow_jersey`  

## participants  
Deelnemers / teammanagers gekoppeld aan Auth0.

- **id** – Interne ID van de deelnemer. Voorbeeld: `10`  
- **user_id** – Auth0 user id. Voorbeeld: `auth0|abc123`  
- **team_name** – Teamnaam in de poule. Voorbeeld: `Koning Kroon`  
- **email** – E‑mailadres. Voorbeeld: `edwin@example.com`  
- **avatar_url** – URL naar avatar. Voorbeeld: `https://cdn.example.com/avatars/edwin.png`  
- **newsletter** – Nieuwsbrief ja/nee. Voorbeeld: `true`  
- **created_at** – Datum/tijd van aanmaken. Voorbeeld: `2025-06-20T09:15:00Z`  

## fantasy_teams  
Het fantasieteam van een participant voor de huidige ronde (1‑op‑1).

- **id** – Interne ID van het fantasieteam. Voorbeeld: `5`  
- **participant_id** – Verwijzing naar `participants.id`. Voorbeeld: `10`  
- **created_at** – Datum/tijd aangemaakt. Voorbeeld: `2025-06-20T09:20:00Z`  

## fantasy_team_riders  
Koppelt renners aan een fantasieteam (10 basis + 5 reserves).

- **id** – Interne ID van selectie‑record. Voorbeeld: `301`  
- **fantasy_team_id** – Verwijzing naar `fantasy_teams.id`. Voorbeeld: `5`  
- **rider_id** – Verwijzing naar `riders.id`. Voorbeeld: `101`  
- **slot_type** – Hoofd of reserve. Voorbeeld: `main` of `reserve`  
- **slot_number** – Positie in lijst (1–10 of 1–5). Voorbeeld: `3`  
- **active** – Of renner nog actief is in selectie. Voorbeeld: `true`  

## stage_results  
Officiële etappe‑uitslag per renner.

- **id** – Interne ID van uitslagregel. Voorbeeld: `1001`  
- **stage_id** – Verwijzing naar `stages.id`. Voorbeeld: `1`  
- **rider_id** – Verwijzing naar `riders.id`. Voorbeeld: `101`  
- **position** – Positie in etappe. Voorbeeld: `1`  
- **time_seconds** – Etappetijd in seconden. Voorbeeld: `15843`  
- **same_time_group** – Nummer van groep met gelijke tijd. Voorbeeld: `1`  

## stage_jersey_wearers  
Welke renner draagt welke trui in een etappe.

- **id** – Interne ID. Voorbeeld: `501`  
- **stage_id** – Verwijzing naar `stages.id`. Voorbeeld: `1`  
- **jersey_id** – Verwijzing naar `jerseys.id`. Voorbeeld: `1`  
- **rider_id** – Verwijzing naar `riders.id`. Voorbeeld: `101`  

## scoring_rules  
Configurabele puntentabel voor etappes en eindklassement.

- **id** – Interne ID van de regel. Voorbeeld: `1`  
- **rule_type** – Type regel. Voorbeeld: `stage_position`  
- **condition_json** – JSON met voorwaarde. Voorbeeld: `{"position":1}`  
- **points** – Aantal punten. Voorbeeld: `30`  

## fantasy_stage_points  
Punten per etappe per participant (voor daguitslag).

- **id** – Interne ID. Voorbeeld: `2001`  
- **stage_id** – Verwijzing naar `stages.id`. Voorbeeld: `1`  
- **participant_id** – Verwijzing naar `participants.id`. Voorbeeld: `10`  
- **points_stage** – Punten uit etappe‑uitslag. Voorbeeld: `25`  
- **points_jerseys** – Punten uit truien. Voorbeeld: `5`  
- **points_bonus** – Extra/bijzondere punten. Voorbeeld: `2`  
- **total_points** – Totaal voor deze etappe. Voorbeeld: `32`  

## fantasy_cumulative_points  
Tussenklassement na elke etappe.

- **id** – Interne ID. Voorbeeld: `3001`  
- **participant_id** – Verwijzing naar `participants.id`. Voorbeeld: `10`  
- **after_stage_id** – Laatste etappe waarvoor dit totaal geldt. Voorbeeld: `3`  
- **total_points** – Totaal punten na deze etappe. Voorbeeld: `87`  
- **rank** – Positie in algemene stand na deze etappe. Voorbeeld: `5`  

## awards  
Definitie van badges/prijzen (dagprijzen, stijger van de dag, enz.).

- **id** – Interne ID van award. Voorbeeld: `1`  
- **stage_id** – Optionele etappe. Voorbeeld: `1` of `NULL`  
- **code** – Technische code. Voorbeeld: `stage_podium_1`  
- **title** – Titel in UI. Voorbeeld: `Eerste plaats rit 1`  
- **description** – Uitleg/ondertitel. Voorbeeld: `Je renner won de openingsrit.`  
- **icon** – Iconnaam / asset. Voorbeeld: `trophy_gold`  

## awards_per_participant  
Koppelt awards aan deelnemers (voor prijzenkast).

- **id** – Interne ID. Voorbeeld: `9001`  
- **award_id** – Verwijzing naar `awards.id`. Voorbeeld: `1`  
- **participant_id** – Verwijzing naar `participants.id`. Voorbeeld: `10`  

## bulletin_messages  
Prikbordberichten binnen de ronde.

- **id** – Interne ID van bericht. Voorbeeld: `7001`  
- **participant_id** – Afzender (optioneel). Voorbeeld: `10`  
- **message** – Tekst van het bericht. Voorbeeld: `Ik heb de stand geüpdatet.`  
- **created_at** – Tijdstip van plaatsen. Voorbeeld: `2025-07-06T14:35:00Z`