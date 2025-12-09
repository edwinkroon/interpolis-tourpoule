-- ============================================================================
-- COMPLETE RESET AND IMPORT SCRIPT
-- ============================================================================
-- This script will:
-- 1. Clear all dependent tables (keeping teams_pro and riders)
-- 2. Import all stages for Tour de France 2025
-- 3. Import Stage 1 results from etappe-1-uitslag.csv
-- ============================================================================

-- ============================================================================
-- STEP 1: Clear all dependent tables (keeping teams_pro and riders)
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'STEP 1: Clearing dependent tables...';
  RAISE NOTICE '========================================';
END $$;

-- Clear tables in correct order (respecting foreign key constraints)
TRUNCATE TABLE awards_per_participant RESTART IDENTITY CASCADE;
TRUNCATE TABLE awards RESTART IDENTITY CASCADE;
TRUNCATE TABLE fantasy_cumulative_points RESTART IDENTITY CASCADE;
TRUNCATE TABLE fantasy_stage_points RESTART IDENTITY CASCADE;
TRUNCATE TABLE stage_jersey_wearers RESTART IDENTITY CASCADE;
TRUNCATE TABLE stage_results RESTART IDENTITY CASCADE;
TRUNCATE TABLE stages RESTART IDENTITY CASCADE;

DO $$
BEGIN
  RAISE NOTICE '✓ All dependent tables cleared';
END $$;

-- ============================================================================
-- STEP 2: Import Stages
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'STEP 2: Importing stages...';
  RAISE NOTICE '========================================';
END $$;

-- Import all stages for Tour de France 2025
INSERT INTO stages (stage_number, name, start_location, end_location, distance_km, date)
VALUES
  (1, 'Stage 1', 'Lille', 'Lille', 185.0, '2025-07-05'),
  (2, 'Stage 2', 'Lauwin-Planque', 'Boulogne-sur-Mer', 209.0, '2025-07-06'),
  (3, 'Stage 3', 'Valenciennes', 'Dunkerque', 172.0, '2025-07-07'),
  (4, 'Stage 4', 'Amiens', 'Rouen', 173.0, '2025-07-08'),
  (5, 'Stage 5', 'Caen', 'Caen', 33.0, '2025-07-09'),
  (6, 'Stage 6', 'Bayeux', 'Vire', 201.0, '2025-07-10'),
  (7, 'Stage 7', 'Saint-Malo', 'Mûr-de-Bretagne', 194.0, '2025-07-11'),
  (8, 'Stage 8', 'Saint-Méen-le-Grand', 'Laval', 174.0, '2025-07-12'),
  (9, 'Stage 9', 'Chinon', 'Châteauroux', 170.0, '2025-07-13'),
  (10, 'Rest Day', NULL, NULL, NULL, '2025-07-14'),
  (11, 'Stage 10', 'Ennezat', 'Le Mont-Dore', 163.0, '2025-07-15'),
  (12, 'Stage 11', 'Toulouse', 'Toulouse', 154.0, '2025-07-16'),
  (13, 'Stage 12', 'Auch', 'Hautacam', 181.0, '2025-07-17'),
  (14, 'Stage 13', 'Loudenvielle', 'Peyragudes', 11.0, '2025-07-18'),
  (15, 'Stage 14', 'Pau', 'Superbagnères', 183.0, '2025-07-19'),
  (16, 'Stage 15', 'Muret', 'Carcassonne', 169.0, '2025-07-20'),
  (17, 'Rest Day', NULL, NULL, NULL, '2025-07-21'),
  (18, 'Stage 16', 'Montpellier', 'Mont Ventoux', 172.0, '2025-07-22'),
  (19, 'Stage 17', 'Bollène', 'Valence', 161.0, '2025-07-23'),
  (20, 'Stage 18', 'Vif', 'Col de la Loze', 171.0, '2025-07-24'),
  (21, 'Stage 19', 'Albertville', 'La Plagne', 130.0, '2025-07-25'),
  (22, 'Stage 20', 'Nantua', 'Pontarlier', 185.0, '2025-07-26'),
  (23, 'Stage 21', 'Mantes-la-Ville', 'Paris', 120.0, '2025-07-27')
ON CONFLICT (stage_number) 
DO UPDATE SET
  name = EXCLUDED.name,
  start_location = EXCLUDED.start_location,
  end_location = EXCLUDED.end_location,
  distance_km = EXCLUDED.distance_km,
  date = EXCLUDED.date;

DO $$
BEGIN
  RAISE NOTICE '✓ Stages imported';
END $$;

-- ============================================================================
-- STEP 3: Import Stage 1 Results
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'STEP 3: Importing Stage 1 results...';
  RAISE NOTICE '========================================';
END $$;

-- Insert Stage 1 results from etappe-1-uitslag.csv
-- Uses rider_id if provided, otherwise looks up by first_name and last_name
-- Calculates same_time_group: riders with the same time_seconds get the same group number
INSERT INTO stage_results (stage_id, rider_id, position, time_seconds, same_time_group)
WITH stage_data AS (
  SELECT 
    s.id as stage_id,
    v.position,
    v.first_name,
    v.last_name,
    v.rider_id_provided,
    v.time_seconds,
    -- Calculate same_time_group: assign group number based on time_seconds
    DENSE_RANK() OVER (ORDER BY v.time_seconds NULLS LAST) as time_group
  FROM stages s
  CROSS JOIN (VALUES
    (1, 'Jasper', 'Philipsen', '66', 13991),
    (2, 'Biniam', 'Girmay', '153', 13991),
    (3, 'Søren', 'Wærenskjold', '150', 13991),
    (4, 'Anthony', 'Turgis', '', 13991),
    (5, 'Matteo', 'Trentin', '', 13991),
    (6, 'Clement', 'Russo', '', 13991),
    (7, 'Paul', 'Penhoet', '', 13991),
    (8, 'Matteo', 'Jorgenson', '169', 13991),
    (9, 'Marius', 'Mayrhofer', '', 13991),
    (10, 'Samuel', 'Watson', '', 13991),
    (11, 'Mike', 'Teunissen', '155', 13991),
    (12, 'Ivan', 'Garcia Cortina', '117', 13991),
    (13, 'Niklas', 'Maerkl', '', 13991),
    (14, 'Harry', 'Sweeny', '48', 13991),
    (15, 'Krists', 'Neilands', '95', 13991),
    (16, 'Kevin', 'Vauquelin', '', 13991),
    (17, 'Damien', 'Touze', '', 13991),
    (18, 'Tadej', 'Pogacar', '1', 13991),
    (19, 'Pascal', 'Ackermann', '', 13991),
    (20, 'Jonas', 'Vingegaard', '9', 13991),
    (21, 'Jasper', 'Stuyven', '176', 13991),
    (22, 'Marco', 'Haller', '32', 13991),
    (23, 'Kaden', 'Groves', '', 13991),
    (24, 'Kasper', 'Asgreen', '20', 13991),
    (25, 'Joseph', 'Blackmore', '163', 13991),
    (26, 'Luka', 'Mezgec', '104', 13991),
    (27, 'Tiesj', 'Benoot', '14', 13991),
    (28, 'Mathieu', 'van der Poel', '', 13991),
    (29, 'Stian', 'Fredheim', '', 13991),
    (30, 'Tobias', 'Johannessen', '', 13991),
    (31, 'Enric', 'Mas', '73', 13991),
    (32, 'Tim', 'Wellens', '7', 13991),
    (33, 'Cyril', 'Barthe', '', 13991),
    (34, 'Jonas', 'Abrahamson', '', 14004),
    (35, 'Jonas', 'Rickaert', '69', 14004),
    (36, 'Xandro', 'Meurisse', '84', 14004),
    (37, 'Davide', 'Ballerini', '', 14011),
    (38, 'Edoardo', 'Affini', '15', 14016),
    (39, 'Jonathan', 'Milan', '', 14030),
    (40, 'Arnaud', 'de Lie', '', 14030),
    (41, 'Bryan', 'Coquard', '108', 14030),
    (42, 'Jordi', 'Meeus', '', 14030),
    (43, 'Pavel', 'Bittner', '', 14030),
    (44, 'Alberto', 'Dainese', '', 14030),
    (45, 'Robert', 'Stannard', '164', 14030),
    (46, 'Phil', 'Bauhaus', '62', 14030),
    (47, 'Tim', 'Merlier', '24', 14030),
    (48, 'Wout', 'van Aert', '10', 14030),
    (49, 'Danny', 'van Poppel', '29', 14030),
    (50, 'Neilson', 'Powless', '42', 14030),
    (51, 'Markus', 'Hoelgaard', '', 14030),
    (52, 'Clement', 'Berthet', '', 14030),
    (53, 'Tobias Lund', 'Andresen', '157', 14030),
    (54, 'Mattias', 'Skjelmose', '', 14030),
    (55, 'Jasper', 'De Buyst', '72', 14030),
    (56, 'Emanuel', 'Buchmann', '27', 14030),
    (57, 'Guillaume', 'Boivin', '92', 14030),
    (58, 'Joao', 'Almeida', '2', 14030),
    (59, 'Amaury', 'Capiot', '106', 14030),
    (60, 'Dylan', 'Groenewegen', '99', 14030),
    (61, 'Magnus', 'Cort', '41', 14030),
    (62, 'Arnaud', 'Demare', '105', 14030),
    (63, 'Alexis', 'Renard', '133', 14030),
    (64, 'Ben', 'Healy', '45', 14030),
    (65, 'Matis', 'Louvel', '', 14030),
    (66, 'Aurelian', 'Paret-Peintre', '', 14030),
    (67, 'Remco', 'Evenepoel', '17', 14030),
    (68, 'Jordan', 'Jegat', '', 14030),
    (69, 'Carlos', 'Rodriguez', '35', 14030),
    (70, 'Gianni', 'Vermeersch', '70', 14030),
    (71, 'Santiago', 'Buitrago', '60', 14030),
    (72, 'Michael', 'Valgren', '172', 14030),
    (73, 'Oliver', 'Naesen', '122', 14030),
    (74, 'Oscar', 'Onley', '', 14030),
    (75, 'Felix', 'Gall', '124', 14030),
    (76, 'Han', 'van Wilder', '167', 14030),
    (77, 'Pascal', 'Eenkhoorn', '23', 14030),
    (78, 'Florian', 'Lipowitz', '', 14030),
    (79, 'Primoz', 'Roglic', '25', 14030),
    (80, 'Lennert', 'van Eetvelt', '', 14030),
    (81, 'Valentin', 'Madouas', '51', 14030),
    (82, 'Guillaume', 'Martin', '113', 14030),
    (83, 'Nelson', 'Oliveira', '76', 14030),
    (84, 'Fabian', 'Lienhard', '', 14030),
    (85, 'Sean', 'Flynn', '', 14030),
    (86, 'Connor', 'Swift', '', 14030),
    (87, 'Geraint', 'Thomas', '33', 14030),
    (88, 'Thomas', 'Gachignard', '', 14030),
    (89, 'Jhonatan', 'Narvaez', '3', 14030),
    (90, 'Hugo', 'Page', '158', 14030),
    (91, 'Staff', 'Cras', '', 14030),
    (92, 'Bastion', 'Tronchon', '', 14030),
    (93, 'Alexandre', 'Delettre', '', 14030),
    (94, 'Jack', 'Haig', '64', 14030),
    (95, 'Alex', 'Aranburu', '', 14030),
    (96, 'Marc', 'Hirschi', '', 14030),
    (97, 'Jenno', 'Berckmoes', '', 14030),
    (98, 'Dylan', 'Teuns', '61', 14030),
    (99, 'Brent', 'van Moer', '', 14030),
    (100, 'Tobias', 'Foss', '', 14030),
    (101, 'Fred', 'Wright', '48', 14030),
    (102, 'Jarrad', 'Drizners', '', 14030),
    (103, 'Vincenzo', 'Albanese', '46', 14030),
    (104, 'Elmar', 'Reinders', '', 14057),
    (105, 'Aleksandr', 'Vlasov', '28', 14057),
    (106, 'Callum', 'Scotson', '175', 14057),
    (107, 'Warren', 'Barguil', '106', 14057),
    (108, 'Matej', 'Mohoric', '59', 14057),
    (109, 'Alex', 'Baudin', '47', 14057),
    (110, 'Clement', 'Venturini', '', 14057),
    (111, 'Bert', 'van Lerberghe', '', 14057),
    (112, 'Toms', 'Skujins', '87', 14077),
    (113, 'Edward', 'Theuns', '88', 14077),
    (114, 'Vito', 'Brant', '', 14077),
    (115, 'Laurence', 'Pithie', '', 14084),
    (116, 'Simone', 'Consonni', '', 14084),
    (117, 'Mattis', 'Cattaneo', '22', 14099),
    (118, 'Victor', 'Campenaerts', '16', 14110),
    (119, 'Sepp', 'Kuss', '11', 14030),
    (120, 'Gianni', 'Moscon', '140', 14125),
    (121, 'Mick', 'van Dijke', '', 14125),
    (122, 'Ion', 'Izagirre', '', 14125),
    (123, 'Marc', 'Soler', '6', 14137),
    (124, 'Kamil', 'Gradek', '63', 14137),
    (125, 'Nils', 'Politt', '4', 14309),
    (126, 'Andreas', 'Leknessund', '', 14309),
    (127, 'Anders', 'Johannessen', '', 14309),
    (128, 'Quentin', 'Pacher', '54', 14309),
    (129, 'Harold', 'Tejada', '141', 14309),
    (130, 'Bruno', 'Armirail', '', 14309),
    (131, 'Sebastian', 'Grignard', '', 14309),
    (132, 'Mathis', 'le Berre', '', 14309),
    (133, 'Thymen', 'Arensman', '', 14309),
    (134, 'Jonas', 'Rutsch', '160', 14309),
    (135, 'Eduardo', 'Sepulveda', '', 14309),
    (136, 'Georg', 'Zimmermann', '161', 14309),
    (137, 'Gregor', 'Muehlberger', '', 14309),
    (138, 'Benjamin', 'Thomas', '165', 14309),
    (139, 'Einar', 'Rubio', '', 14309),
    (140, 'Cristian', 'Rodriguez', '35', 14309),
    (141, 'Frank', 'van den Brook', '', 14309),
    (142, 'Quinn', 'Simmons', '86', 14309),
    (143, 'Tim', 'Naberman', '', 14309),
    (144, 'Sergio', 'Higuita', '', 14309),
    (145, 'Clement', 'Champoussin', '', 14309),
    (146, 'Laurenz', 'Rex', '159', 14309),
    (147, 'Pablo', 'Castrillo', '', 14309),
    (148, 'Raul', 'Garcia Pierna', '109', 14309),
    (149, 'Romain', 'Gregoire', '173', 14309),
    (150, 'Ewen', 'Costiou', '', 14309),
    (151, 'Valentin', 'Paret-Peintre', '', 14309),
    (152, 'Emilien', 'Jeanniere', '', 14309),
    (153, 'Michael', 'Storer', '56', 14309),
    (154, 'Edward', 'Dunbar', '101', 14309),
    (155, 'Pavel', 'Sivakov', '5', 14309),
    (156, 'Adam', 'Yates', '8', 14309),
    (157, 'Emiel', 'Verstrynge', '', 14309),
    (158, 'Jake', 'Stewart', '', 14309),
    (159, 'Alexey', 'Lutsenko', '137', 14309),
    (160, 'Ben', 'O''Connor', '', 13991),
    (161, 'Mauro', 'Schmid', '104', 14318),
    (162, 'Marijn', 'van den Berg', '171', 13991),
    (163, 'Luke', 'Durbridge', '', 14382),
    (164, 'Simon', 'Yates', '170', 14382),
    (165, 'Axel', 'Laurance', '118', 14382),
    (166, 'Silvan', 'Dillier', '68', 14382),
    (167, 'Michael', 'Woods', '89', 14382),
    (168, 'Simone', 'Velasco', '142', 14382),
    (169, 'Maximilian', 'Schachmann', '183', 14382),
    (170, 'Lucas', 'Plapp', '100', 14382),
    (171, 'Yevgeniy', 'Fedorov', '', 14382),
    (172, 'Cees', 'Bol', '139', 14382),
    (173, 'Julian', 'Alaphilippe', '18', 14382),
    (174, 'Roel', 'van Sintmaartensdijk', '162', 14382),
    (175, 'Louis', 'Barre', '156', 14382),
    (176, 'Ivan', 'Romeo', '', 14382),
    (177, 'William', 'Barta', '', 14382),
    (178, 'Mathieu', 'Burgaudeau', '', 14382),
    (179, 'Matteo', 'Vercher', '', 14382),
    (180, 'Thibau', 'Nys', '', 14382),
    (181, 'Lewis', 'Askey', '', 14382),
    (182, 'Lenny', 'Martinez', '', 14542)
  ) AS v(position, first_name, last_name, rider_id_provided, time_seconds)
  WHERE s.stage_number = 1
),
rider_lookup AS (
  SELECT 
    sd.*,
    CASE 
      WHEN sd.rider_id_provided != '' AND sd.rider_id_provided IS NOT NULL 
      THEN sd.rider_id_provided::INTEGER
      ELSE (
        SELECT r.id 
        FROM riders r 
        WHERE LOWER(TRIM(r.first_name)) = LOWER(TRIM(sd.first_name))
          AND LOWER(TRIM(r.last_name)) = LOWER(TRIM(sd.last_name))
        LIMIT 1
      )
    END as rider_id
  FROM stage_data sd
)
SELECT DISTINCT ON (stage_id, rider_id)
  stage_id,
  rider_id,
  position,
  time_seconds,
  time_group as same_time_group
FROM rider_lookup
WHERE rider_id IS NOT NULL
ORDER BY stage_id, rider_id, position
ON CONFLICT (stage_id, rider_id) 
DO UPDATE SET
  position = EXCLUDED.position,
  time_seconds = EXCLUDED.time_seconds,
  same_time_group = EXCLUDED.same_time_group;

DO $$
BEGIN
  RAISE NOTICE '✓ Stage 1 results imported';
END $$;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'VERIFICATION';
  RAISE NOTICE '========================================';
END $$;

-- Summary counts
SELECT 
  'Stages' as table_name,
  COUNT(*) as count
FROM stages
UNION ALL
SELECT 
  'Teams Pro',
  COUNT(*)
FROM teams_pro
UNION ALL
SELECT 
  'Riders',
  COUNT(*)
FROM riders
UNION ALL
SELECT 
  'Stage Results',
  COUNT(*)
FROM stage_results;

-- Stage 1 results summary
SELECT 
  COUNT(*) as total_results,
  COUNT(DISTINCT rider_id) as unique_riders,
  COUNT(DISTINCT same_time_group) as time_groups
FROM stage_results
WHERE stage_id = (SELECT id FROM stages WHERE stage_number = 1);

-- Show first 20 results
SELECT 
  sr.position,
  r.first_name,
  r.last_name,
  r.id as rider_id,
  sr.time_seconds,
  sr.same_time_group,
  tp.name as team_name
FROM stage_results sr
INNER JOIN riders r ON sr.rider_id = r.id
LEFT JOIN teams_pro tp ON r.team_pro_id = tp.id
WHERE sr.stage_id = (SELECT id FROM stages WHERE stage_number = 1)
ORDER BY sr.position
LIMIT 20;

DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'IMPORT COMPLETE!';
  RAISE NOTICE '========================================';
END $$;

