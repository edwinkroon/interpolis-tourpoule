-- Masterdata voor awards (inclusief criteria in description)
-- Run met je DATABASE_URL, bijv.:
--   $env:DATABASE_URL="postgresql://POSTGRES_USER:POSTGRES_PASSWORD@localhost:5432/POSTGRES_DB"
--   node imports/run-sql-script.js imports/insert-awards-masterdata.sql

DO $$
DECLARE
  -- helper record
  _award RECORD;
BEGIN
  -- Gebruik een helper functie-achtige constructie voor idempotente upsert per code
  -- (geen unieke index op code, dus we checken handmatig)
  PERFORM 1;
END $$;

DO $$
BEGIN
  -- BLITZ_START
  IF NOT EXISTS (SELECT 1 FROM awards WHERE code = 'BLITZ_START') THEN
    INSERT INTO awards (stage_id, code, title, description, icon)
    VALUES (NULL, 'BLITZ_START', 'Bliksemstarter', 'Meeste punten in de openingsrit.', NULL);
  ELSE
    UPDATE awards
      SET title = 'Bliksemstarter',
          description = 'Meeste punten in de openingsrit.',
          icon = NULL
    WHERE code = 'BLITZ_START';
  END IF;

  -- DIESEL
  IF NOT EXISTS (SELECT 1 FROM awards WHERE code = 'DIESEL') THEN
    INSERT INTO awards (stage_id, code, title, description, icon)
    VALUES (NULL, 'DIESEL', 'De Diesel', 'Meeste consistente top-10 finishes zonder ritwinst.', NULL);
  ELSE
    UPDATE awards SET title = 'De Diesel', description = 'Meeste consistente top-10 finishes zonder ritwinst.', icon = NULL WHERE code = 'DIESEL';
  END IF;

  -- BERGGEIT
  IF NOT EXISTS (SELECT 1 FROM awards WHERE code = 'BERGGEIT') THEN
    INSERT INTO awards (stage_id, code, title, description, icon)
    VALUES (NULL, 'BERGGEIT', 'Berggeit van de Lage Landen', 'Hoogste score in bergetappes.', NULL);
  ELSE
    UPDATE awards SET title = 'Berggeit van de Lage Landen', description = 'Hoogste score in bergetappes.', icon = NULL WHERE code = 'BERGGEIT';
  END IF;

  -- WAAIER
  IF NOT EXISTS (SELECT 1 FROM awards WHERE code = 'WAAIER') THEN
    INSERT INTO awards (stage_id, code, title, description, icon)
    VALUES (NULL, 'WAAIER', 'Waaierspecialist', 'Hoogste score in ritten met waaiers/windalarm.', NULL);
  ELSE
    UPDATE awards SET title = 'Waaierspecialist', description = 'Hoogste score in ritten met waaiers/windalarm.', icon = NULL WHERE code = 'WAAIER';
  END IF;

  -- SPRINTER
  IF NOT EXISTS (SELECT 1 FROM awards WHERE code = 'SPRINTER') THEN
    INSERT INTO awards (stage_id, code, title, description, icon)
    VALUES (NULL, 'SPRINTER', 'Sprintkanon', 'Meeste sprintpunten in vlakke ritten.', NULL);
  ELSE
    UPDATE awards SET title = 'Sprintkanon', description = 'Meeste sprintpunten in vlakke ritten.', icon = NULL WHERE code = 'SPRINTER';
  END IF;

  -- TT_KING
  IF NOT EXISTS (SELECT 1 FROM awards WHERE code = 'TT_KING') THEN
    INSERT INTO awards (stage_id, code, title, description, icon)
    VALUES (NULL, 'TT_KING', 'Tijdrijkoning(in)', 'Beste score in tijdritten.', NULL);
  ELSE
    UPDATE awards SET title = 'Tijdrijkoning(in)', description = 'Beste score in tijdritten.', icon = NULL WHERE code = 'TT_KING';
  END IF;

  -- COMEBACK
  IF NOT EXISTS (SELECT 1 FROM awards WHERE code = 'COMEBACK') THEN
    INSERT INTO awards (stage_id, code, title, description, icon)
    VALUES (NULL, 'COMEBACK', 'Comeback Kid', 'Grootste stijging in het klassement in één etappe.', NULL);
  ELSE
    UPDATE awards SET title = 'Comeback Kid', description = 'Grootste stijging in het klassement in één etappe.', icon = NULL WHERE code = 'COMEBACK';
  END IF;

  -- HOUDINI
  IF NOT EXISTS (SELECT 1 FROM awards WHERE code = 'HOUDINI') THEN
    INSERT INTO awards (stage_id, code, title, description, icon)
    VALUES (NULL, 'HOUDINI', 'De Houdini', 'Vaakst in de top-20 zonder eruit te vallen.', NULL);
  ELSE
    UPDATE awards SET title = 'De Houdini', description = 'Vaakst in de top-20 zonder eruit te vallen.', icon = NULL WHERE code = 'HOUDINI';
  END IF;

  -- CONSISTENT
  IF NOT EXISTS (SELECT 1 FROM awards WHERE code = 'CONSISTENT') THEN
    INSERT INTO awards (stage_id, code, title, description, icon)
    VALUES (NULL, 'CONSISTENT', 'Mr./Ms. Consistent', 'Langste aaneengesloten reeks binnen de top-10.', NULL);
  ELSE
    UPDATE awards SET title = 'Mr./Ms. Consistent', description = 'Langste aaneengesloten reeks binnen de top-10.', icon = NULL WHERE code = 'CONSISTENT';
  END IF;

  -- LUCKY_LOSER
  IF NOT EXISTS (SELECT 1 FROM awards WHERE code = 'LUCKY_LOSER') THEN
    INSERT INTO awards (stage_id, code, title, description, icon)
    VALUES (NULL, 'LUCKY_LOSER', 'Lucky Loser', 'Beste etappescore met het kleinste aantal actieve renners.', NULL);
  ELSE
    UPDATE awards SET title = 'Lucky Loser', description = 'Beste etappescore met het kleinste aantal actieve renners.', icon = NULL WHERE code = 'LUCKY_LOSER';
  END IF;

  -- STOFFEERDER
  IF NOT EXISTS (SELECT 1 FROM awards WHERE code = 'STOFFEERDER') THEN
    INSERT INTO awards (stage_id, code, title, description, icon)
    VALUES (NULL, 'STOFFEERDER', 'De Stoffeerder', 'Hoogste score met de laagst geprijsde selectie.', NULL);
  ELSE
    UPDATE awards SET title = 'De Stoffeerder', description = 'Hoogste score met de laagst geprijsde selectie.', icon = NULL WHERE code = 'STOFFEERDER';
  END IF;

  -- UNDERDOG
  IF NOT EXISTS (SELECT 1 FROM awards WHERE code = 'UNDERDOG') THEN
    INSERT INTO awards (stage_id, code, title, description, icon)
    VALUES (NULL, 'UNDERDOG', 'Underdog Whisperer', 'Meeste punten van renners met lage populariteit.', NULL);
  ELSE
    UPDATE awards SET title = 'Underdog Whisperer', description = 'Meeste punten van renners met lage populariteit.', icon = NULL WHERE code = 'UNDERDOG';
  END IF;

  -- PUNTENVRETER
  IF NOT EXISTS (SELECT 1 FROM awards WHERE code = 'PUNTENVRETER') THEN
    INSERT INTO awards (stage_id, code, title, description, icon)
    VALUES (NULL, 'PUNTENVRETER', 'De Puntenvreter', 'Hoogste totaalpunten over alle etappes.', NULL);
  ELSE
    UPDATE awards SET title = 'De Puntenvreter', description = 'Hoogste totaalpunten over alle etappes.', icon = NULL WHERE code = 'PUNTENVRETER';
  END IF;

  -- DAGWINNERVRETER
  IF NOT EXISTS (SELECT 1 FROM awards WHERE code = 'DAGWINNERVRETER') THEN
    INSERT INTO awards (stage_id, code, title, description, icon)
    VALUES (NULL, 'DAGWINNERVRETER', 'Dagwinnervreter', 'Meeste etappe-overwinningen (dagwinst).', NULL);
  ELSE
    UPDATE awards SET title = 'Dagwinnervreter', description = 'Meeste etappe-overwinningen (dagwinst).', icon = NULL WHERE code = 'DAGWINNERVRETER';
  END IF;

  -- TRUIEN
  IF NOT EXISTS (SELECT 1 FROM awards WHERE code = 'TRUIEN') THEN
    INSERT INTO awards (stage_id, code, title, description, icon)
    VALUES (NULL, 'TRUIEN', 'Truienverzamelaar', 'Meeste punten uit truien (geel/groen/bolletjes/wit).', NULL);
  ELSE
    UPDATE awards SET title = 'Truienverzamelaar', description = 'Meeste punten uit truien (geel/groen/bolletjes/wit).', icon = NULL WHERE code = 'TRUIEN';
  END IF;

  -- TEAMWORK
  IF NOT EXISTS (SELECT 1 FROM awards WHERE code = 'TEAMWORK') THEN
    INSERT INTO awards (stage_id, code, title, description, icon)
    VALUES (NULL, 'TEAMWORK', 'Teamwork Makes the Dream Work', 'Meeste etappes waarin ≥5 renners punten scoren.', NULL);
  ELSE
    UPDATE awards SET title = 'Teamwork Makes the Dream Work', description = 'Meeste etappes waarin ≥5 renners punten scoren.', icon = NULL WHERE code = 'TEAMWORK';
  END IF;

  -- KOP_OVER_KOP
  IF NOT EXISTS (SELECT 1 FROM awards WHERE code = 'KOP_OVER_KOP') THEN
    INSERT INTO awards (stage_id, code, title, description, icon)
    VALUES (NULL, 'KOP_OVER_KOP', 'Kop-over-Kop', 'Vaakst de nummer 1-positie in het klassement overgenomen.', NULL);
  ELSE
    UPDATE awards SET title = 'Kop-over-Kop', description = 'Vaakst de nummer 1-positie in het klassement overgenomen.', icon = NULL WHERE code = 'KOP_OVER_KOP';
  END IF;

  -- MID_RANGE
  IF NOT EXISTS (SELECT 1 FROM awards WHERE code = 'MID_RANGE') THEN
    INSERT INTO awards (stage_id, code, title, description, icon)
    VALUES (NULL, 'MID_RANGE', 'Mister/Miss Negentig', 'Beste gemiddelde score in ritten van 90-120 km.', NULL);
  ELSE
    UPDATE awards SET title = 'Mister/Miss Negentig', description = 'Beste gemiddelde score in ritten van 90-120 km.', icon = NULL WHERE code = 'MID_RANGE';
  END IF;

  -- STILLE_WATEREN
  IF NOT EXISTS (SELECT 1 FROM awards WHERE code = 'STILLE_WATEREN') THEN
    INSERT INTO awards (stage_id, code, title, description, icon)
    VALUES (NULL, 'STILLE_WATEREN', 'Stille Wateren', 'Top-5 eindklassering met de minste prikbordberichten.', NULL);
  ELSE
    UPDATE awards SET title = 'Stille Wateren', description = 'Top-5 eindklassering met de minste prikbordberichten.', icon = NULL WHERE code = 'STILLE_WATEREN';
  END IF;

  -- PLOEGLEIDER
  IF NOT EXISTS (SELECT 1 FROM awards WHERE code = 'PLOEGLEIDER') THEN
    INSERT INTO awards (stage_id, code, title, description, icon)
    VALUES (NULL, 'PLOEGLEIDER', 'Ploegleider van het Jaar', 'Hoogste eindsaldo na alle etappes (incl. trui/bonus).', NULL);
  ELSE
    UPDATE awards SET title = 'Ploegleider van het Jaar', description = 'Hoogste eindsaldo na alle etappes (incl. trui/bonus).', icon = NULL WHERE code = 'PLOEGLEIDER';
  END IF;

  -- STIJGER_VD_DAG (heeft icon)
  IF NOT EXISTS (SELECT 1 FROM awards WHERE code = 'STIJGER_VD_DAG') THEN
    INSERT INTO awards (stage_id, code, title, description, icon)
    VALUES (NULL, 'STIJGER_VD_DAG', 'Stijger van de dag', 'Grootste klassementssprong in de meest recente etappe.', 'icons/icoonstijgervandedag.svg');
  ELSE
    UPDATE awards SET title = 'Stijger van de dag', description = 'Grootste klassementssprong in de meest recente etappe.', icon = 'icons/icoonstijgervandedag.svg' WHERE code = 'STIJGER_VD_DAG';
  END IF;

  -- PODIUM_1 (heeft icon)
  IF NOT EXISTS (SELECT 1 FROM awards WHERE code = 'PODIUM_1') THEN
    INSERT INTO awards (stage_id, code, title, description, icon)
    VALUES (NULL, 'PODIUM_1', 'Dagwinnaar', '1e plaats in een etappe (meeste etappepunten).', 'icons/IcoonEerstePlaats.svg');
  ELSE
    UPDATE awards SET title = 'Dagwinnaar', description = '1e plaats in een etappe (meeste etappepunten).', icon = 'icons/IcoonEerstePlaats.svg' WHERE code = 'PODIUM_1';
  END IF;

  -- PODIUM_2 (heeft icon)
  IF NOT EXISTS (SELECT 1 FROM awards WHERE code = 'PODIUM_2') THEN
    INSERT INTO awards (stage_id, code, title, description, icon)
    VALUES (NULL, 'PODIUM_2', 'Tweede plaats', '2e plaats in een etappe (tweede etappepunten).', 'icons/icoontweedeplaats.svg');
  ELSE
    UPDATE awards SET title = 'Tweede plaats', description = '2e plaats in een etappe (tweede etappepunten).', icon = 'icons/icoontweedeplaats.svg' WHERE code = 'PODIUM_2';
  END IF;

  -- PODIUM_3 (nog geen icon)
  IF NOT EXISTS (SELECT 1 FROM awards WHERE code = 'PODIUM_3') THEN
    INSERT INTO awards (stage_id, code, title, description, icon)
    VALUES (NULL, 'PODIUM_3', 'Derde plaats', '3e plaats in een etappe (derde etappepunten).', NULL);
  ELSE
    UPDATE awards SET title = 'Derde plaats', description = '3e plaats in een etappe (derde etappepunten).', icon = NULL WHERE code = 'PODIUM_3';
  END IF;
END $$;


