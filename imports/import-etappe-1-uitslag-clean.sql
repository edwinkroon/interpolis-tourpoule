-- SQL Script to import Stage 1 results from etappe-1-uitslag.csv
-- Generated automatically
-- Total riders: 182

-- First, verify that Stage 1 exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM stages WHERE stage_number = 1) THEN
    RAISE EXCEPTION 'Stage 1 does not exist. Please run full-reset-and-import.sql first.';
  END IF;
END $$;

-- Clear existing Stage 1 results
DELETE FROM stage_results WHERE stage_id = (SELECT id FROM stages WHERE stage_number = 1);

-- Insert Stage 1 results
-- Uses rider_id from CSV if provided, otherwise looks up by name
-- Calculates same_time_group based on time_seconds
INSERT INTO stage_results (stage_id, rider_id, position, time_seconds, same_time_group)
WITH stage_data AS (
  SELECT 
    s.id as stage_id,
    v.position,
    v.first_name,
    v.last_name,
    v.rider_id_provided,
    v.time_seconds,
    DENSE_RANK() OVER (ORDER BY v.time_seconds NULLS LAST) as time_group
  FROM stages s
  CROSS JOIN (VALUES
    (1, 'Jasper', 'Philipsen', 81, 13991),
    (2, 'Biniam', 'Girmay', 33, 13991),
    (3, 'Soren', 'Waerenskjold', 184, 13991),
    (4, 'Anthony', 'Turgis', 151, 13991),
    (5, 'Matteo', 'Trentin', 96, 13991),
    (6, 'Clement', 'Russo', 80, 13991),
    (7, 'Paul', 'Penhoet', 79, 13991),
    (8, 'Matteo', 'Jorgenson', 13, 13991),
    (9, 'Marius', 'Mayrhofer', 94, 13991),
    (10, 'Samuel', 'Watson', 56, 13991),
    (11, 'Mike', 'Teunissen', 143, 13991),
    (12, 'Ivan', 'Garcia Cortina', 117, 13991),
    (13, 'Niklas', 'Markl', 158, 13991),
    (14, 'Harry', 'Sweeny', 30, 13991),
    (15, 'Krists', 'Neilands', 167, 13991),
    (16, 'Kevin', 'Vauquelin', 105, 13991),
    (17, 'Damien', 'Touze', 136, 13991),
    (18, 'Tadej', 'Pogacar', 1, 13991),
    (19, 'Pascal', 'Ackermann', 162, 13991),
    (20, 'Jonas', 'Vingegaard', 9, 13991),
    (21, 'Jasper', 'Stuyven', 71, 13991),
    (22, 'Marco', 'Haller', 91, 13991),
    (23, 'Kaden', 'Groves', 83, 13991),
    (24, 'Kasper', 'Asgreen', 27, 13991),
    (25, 'Joseph', 'Blackmore', 163, 13991),
    (26, 'Luka', 'Mezgec', 101, 13991),
    (27, 'Tiesj', 'Benoot', 11, 13991),
    (28, 'Mathieu', 'van der Poel', 86, 13991),
    (29, 'Stian', 'Fredheim', 180, 13991),
    (30, 'Tobias Halland', 'Johannessen', 177, 13991),
    (31, 'Enric Mondiale Team', 'Mas', 113, 13991),
    (32, 'Tim', 'Wellens', 7, 13991),
    (33, 'Cyril', 'Barthe', 75, 13991),
    (34, 'Jonas', 'Abrahamsen', 178, 14004),
    (35, 'Jonas', 'Rickaert', 85, 14004),
    (36, 'Xandro', 'Meurisse', 84, 14004),
    (37, 'Davide', 'Ballerini', 138, 14011),
    (38, 'Edoardo', 'Affini', 10, 14016),
    (39, 'Jonathan', 'Milan', 65, 14030),
    (40, 'Arnaud', 'de Lie', 169, 14030),
    (41, 'Bryan', 'Coquard', 131, 14030),
    (42, 'Jordi', 'Meeus', 59, 14030),
    (43, 'Pavel', 'Bittner', 155, 14030),
    (44, 'Alberto', 'Dainese', 90, 14030),
    (45, 'Robert', 'Stannard', 47, 14030),
    (46, 'Phil', 'Bauhaus', 42, 14030),
    (47, 'Tim', 'Merlier', 20, 14030),
    (48, 'Wout', 'van Aert', 15, 14030),
    (49, 'Danny', 'van Poppel', 63, 14030),
    (50, 'Neilson', 'Powless', 29, 14030),
    (51, 'Markus', 'Hoelgaard', 181, 14030),
    (52, 'Clement', 'Berthet', 123, 14030),
    (53, 'Tobias Lund', 'Andresen', 157, 14030),
    (54, 'Mattias', 'Skjelmose', 69, 14030),
    (55, 'Jasper', 'De Buyst', 171, 14030),
    (56, 'Emanuel', 'Buchmann', 129, 14030),
    (57, 'Guillaume', 'Boivin', 164, 14030),
    (58, 'Joao', 'Almeida', 2, 14030),
    (59, 'Amaury', 'Capiot', 106, 14030),
    (60, 'Dylan', 'Groenewegen', 100, 14030),
    (61, 'Magnus', 'Cort', 179, 14030),
    (62, 'Arnaud', 'Demare', 108, 14030),
    (63, 'Alexis', 'Renard', 133, 14030),
    (64, 'Ben', 'Healy', 25, 14030),
    (65, 'Matis', 'Louvel', 165, 14030),
    (66, 'Aurelien', 'Paret-Peintre', 126, 14030),
    (67, 'Remco', 'Evenepoel', 17, 14030),
    (68, 'Jordan', 'Jegat', 150, 14030),
    (69, 'Carlos', 'Rodriguez', 54, 14030),
    (70, 'Gianni', 'Vermeersch', 87, 14030),
    (71, 'Santiago', 'Buitrago', 41, 14030),
    (72, 'Michael', 'Valgren', 31, 14030),
    (73, 'Oliver', 'Naesen', 125, 14030),
    (74, 'Oscar', 'Onley', 153, 14030),
    (75, 'Felix', 'Gall', 121, 14030),
    (76, 'Ilan', 'Van Wilder', 24, 14030),
    (77, 'Pascal', 'Eenkhoorn', 19, 14030),
    (78, 'Florian', 'Lipowitz', 58, 14030),
    (79, 'Primoz', 'Roglic', 57, 14030),
    (80, 'Lennert', 'van Eetvelt', 175, 14030),
    (81, 'Valentin', 'Madouas', 77, 14030),
    (82, 'Guillaume', 'Martin', 73, 14030),
    (83, 'Nelson', 'Oliveira', 116, 14030),
    (84, 'Fabian', 'Lienhard', 93, 14030),
    (85, 'Sean', 'Flynn', 156, 14030),
    (86, 'Connor', 'Swift', 55, 14030),
    (87, 'Geraint', 'Thomas', 49, 14030),
    (88, 'Thomas', 'Gachignard', 148, 14030),
    (89, 'Jhonatan', 'Narvaez', 3, 14030),
    (90, 'Hugo', 'Page', 36, 14030),
    (91, 'Steff', 'Cras', 145, 14030),
    (92, 'Bastien', 'Tronchon', 128, 14030),
    (93, 'Alexandre', 'Delettre', 147, 14030),
    (94, 'Jack', 'Haig', 44, 14030),
    (95, 'Alex', 'Aranburu', 130, 14030),
    (96, 'Marc', 'Hirschi', 92, 14030),
    (97, 'Jenno', 'Berckmoes', 170, 14030),
    (98, 'Dylan', 'Teuns', 134, 14030),
    (99, 'Brent', 'van Moer', 176, 14030),
    (100, 'Tobias', 'Foss', 51, 14030),
    (101, 'Fred', 'Wright', 48, 14030),
    (102, 'Jarrad', 'Drizners', 172, 14030),
    (103, 'Vincenzo', 'Albanese', 26, 14030),
    (104, 'Elmar', 'Reinders', 103, 14057),
    (105, 'Aleksandr', 'Vlasov', 64, 14057),
    (106, 'Callum', 'Scotson', 127, 14057),
    (107, 'Warren', 'Barguil', 154, 14057),
    (108, 'Matej', 'Mohoric', 46, 14057),
    (109, 'Alex', 'Baudin', 28, 14057),
    (110, 'Clement', 'Venturini', 112, 14057),
    (111, 'Bert', 'van Lerberghe', 23, 14057),
    (112, 'Toms', 'Skujins', 70, 14077),
    (113, 'Edward', 'Theuns', 72, 14077),
    (114, 'Vito', 'Braet', 35, 14077),
    (115, 'Laurence', 'Pithie', 61, 14084),
    (116, 'Simone', 'Consonni', 66, 14084),
    (117, 'Mattia', 'Cattaneo', 18, 14099),
    (118, 'Victor', 'Campenaerts', 12, 14110),
    (119, 'Sepp', 'Kuss', 14, 14030),
    (120, 'Gianni', 'Moscon', 60, 14125),
    (121, 'Mick', 'van Dijke', 62, 14125),
    (122, 'Ion', 'Izagirre', 132, 14125),
    (123, 'Marc', 'Soler', 6, 14137),
    (124, 'Kamil', 'Gradek', 43, 14137),
    (125, 'Nils', 'Politt', 4, 14309),
    (126, 'Andreas', 'Leknessund', 183, 14309),
    (127, 'Anders Halland', 'Johannessen', 182, 14309),
    (128, 'Quentin', 'Pacher', 78, 14309),
    (129, 'Harold', 'Tejada', 137, 14309),
    (130, 'Bruno', 'Armirail', 122, 14309),
    (131, 'Sebastien', 'Grignard', 173, 14309),
    (132, 'Mathis', 'le Berre', 110, 14309),
    (133, 'Thymen', 'Arensman', 50, 14309),
    (134, 'Jonas', 'Rutsch', 38, 14309),
    (135, 'Eduardo', 'Sepulveda', 174, 14309),
    (136, 'Georg', 'Zimmermann', 40, 14309),
    (137, 'Gregor', 'Muhlberger', 118, 14309),
    (138, 'Benjamin', 'Thomas', 135, 14309),
    (139, 'Einer', 'Rubio', 120, 14309),
    (140, 'Cristian', 'Rodriguez', 111, 14309),
    (141, 'Frank', 'Van Den Broek', 160, 14309),
    (142, 'Quinn', 'Simmons', 68, 14309),
    (143, 'Tim', 'Naberman', 159, 14309),
    (144, 'Sergio', 'Higuita', 142, 14309),
    (145, 'Clement', 'Champoussin', 140, 14309),
    (146, 'Laurenz', 'Rex', 37, 14309),
    (147, 'Pablo', 'Castrillo', 115, 14309),
    (148, 'Raul', 'Garcia Pierna', 109, 14309),
    (149, 'Romain', 'Gregoire', 76, 14309),
    (150, 'Ewen', 'Costiou', 107, 14309),
    (151, 'Valentin', 'Paret-Peintre', 21, 14309),
    (152, 'Emilien', 'Jeanniere', 149, 14309),
    (153, 'Michael', 'Storer', 95, 14309),
    (154, 'Eddie', 'Dunbar', 98, 14309),
    (155, 'Pavel', 'Sivakov', 5, 14309),
    (156, 'Adam', 'Yates', 8, 14309),
    (157, 'Emiel', 'Verstrynge', 88, 14309),
    (158, 'Jake', 'Stewart', 168, 14309),
    (159, 'Alexey', 'Lutsenko', 166, 14309),
    (160, 'Ben', 'O''Connor', 97, 13991),
    (161, 'Mauro', 'Schmid', 104, 14318),
    (162, 'Marijn', 'van den Berg', 32, 13991),
    (163, 'Luke', 'Durbridge', 99, 14382),
    (164, 'Simon', 'Yates', 16, 14382),
    (165, 'Axel', 'Laurance', 53, 14382),
    (166, 'Silvan', 'Dillier', 82, 14382),
    (167, 'Michael', 'Woods', 161, 14382),
    (168, 'Simone', 'Velasco', 144, 14382),
    (169, 'Maximilian', 'Schachmann', 22, 14382),
    (170, 'Luke', 'Plapp', 102, 14382),
    (171, 'Yevgeniy', 'Fedorov', 141, 14382),
    (172, 'Cees', 'Bol', 139, 14382),
    (173, 'Julian', 'Alaphilippe', 89, 14382),
    (174, 'Roel', 'van Sintmaartensdijk', 39, 14382),
    (175, 'Louis', 'Barre', 34, 14382),
    (176, 'Ivan', 'Romeo', 119, 14382),
    (177, 'Will', 'Barta', 114, 14382),
    (178, 'Mathieu', 'Burgaudeau', 146, 14382),
    (179, 'Matteo', 'Vercher', 152, 14382),
    (180, 'Thibau', 'Nys', 67, 14382),
    (181, 'Lewis', 'Askey', 74, 14382),
    (182, 'Lenny', 'Martinez', 45, 14542)
  ) AS v(position, first_name, last_name, rider_id_provided, time_seconds)
  WHERE s.stage_number = 1
),
rider_lookup AS (
  SELECT 
    sd.*,
    CASE
      WHEN sd.rider_id_provided IS NOT NULL THEN sd.rider_id_provided
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

-- Verify the import
SELECT 
  COUNT(*) as total_results,
  COUNT(DISTINCT rider_id) as unique_riders,
  COUNT(DISTINCT same_time_group) as time_groups,
  COUNT(*) FILTER (WHERE time_seconds IS NULL) as dnf_count
FROM stage_results
WHERE stage_id = (SELECT id FROM stages WHERE stage_number = 1);


