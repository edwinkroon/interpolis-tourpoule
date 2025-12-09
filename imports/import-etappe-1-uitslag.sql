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
    -- Calculate same_time_group: assign group number based on time_seconds
    DENSE_RANK() OVER (ORDER BY v.time_seconds NULLS LAST) as time_group
  FROM stages s
  CROSS JOIN (VALUES
    (1, 'Jasper', 'Philipsen', NULLIF('81', ''), 13991),
    (2, 'Biniam', 'Girmay', NULLIF('33', ''), 13991),
    (3, 'Soren', 'Waerenskjold', NULLIF('184', ''), 13991),
    (4, 'Anthony', 'Turgis', NULLIF('151', ''), 13991),
    (5, 'Matteo', 'Trentin', NULLIF('96', ''), 13991),
    (6, 'Clement', 'Russo', NULLIF('80', ''), 13991),
    (7, 'Paul', 'Penhoet', NULLIF('79', ''), 13991),
    (8, 'Matteo', 'Jorgenson', NULLIF('13', ''), 13991),
    (9, 'Marius', 'Mayrhofer', NULLIF('94', ''), 13991),
    (10, 'Samuel', 'Watson', NULLIF('56', ''), 13991),
    (11, 'Mike', 'Teunissen', NULLIF('143', ''), 13991),
    (12, 'Ivan', 'Garcia Cortina', NULLIF('117', ''), 13991),
    (13, 'Niklas', 'Markl', NULLIF('158', ''), 13991),
    (14, 'Harry', 'Sweeny', NULLIF('30', ''), 13991),
    (15, 'Krists', 'Neilands', NULLIF('167', ''), 13991),
    (16, 'Kevin', 'Vauquelin', NULLIF('105', ''), 13991),
    (17, 'Damien', 'Touze', NULLIF('136', ''), 13991),
    (18, 'Tadej', 'Pogacar', NULLIF('1', ''), 13991),
    (19, 'Pascal', 'Ackermann', NULLIF('162', ''), 13991),
    (20, 'Jonas', 'Vingegaard', NULLIF('9', ''), 13991),
    (21, 'Jasper', 'Stuyven', NULLIF('71', ''), 13991),
    (22, 'Marco', 'Haller', NULLIF('91', ''), 13991),
    (23, 'Kaden', 'Groves', NULLIF('83', ''), 13991),
    (24, 'Kasper', 'Asgreen', NULLIF('27', ''), 13991),
    (25, 'Joseph', 'Blackmore', NULLIF('163', ''), 13991),
    (26, 'Luka', 'Mezgec', NULLIF('101', ''), 13991),
    (27, 'Tiesj', 'Benoot', NULLIF('11', ''), 13991),
    (28, 'Mathieu', 'van der Poel', NULLIF('86', ''), 13991),
    (29, 'Stian', 'Fredheim', NULLIF('180', ''), 13991),
    (30, 'Tobias Halland', 'Johannessen', NULLIF('177', ''), 13991),
    (31, 'Enric Mondiale Team', 'Mas', NULLIF('113', ''), 13991),
    (32, 'Tim', 'Wellens', NULLIF('7', ''), 13991),
    (33, 'Cyril', 'Barthe', NULLIF('75', ''), 13991),
    (34, 'Jonas', 'Abrahamsen', NULLIF('178', ''), 14004),
    (35, 'Jonas', 'Rickaert', NULLIF('85', ''), 14004),
    (36, 'Xandro', 'Meurisse', NULLIF('84', ''), 14004),
    (37, 'Davide', 'Ballerini', NULLIF('138', ''), 14011),
    (38, 'Edoardo', 'Affini', NULLIF('10', ''), 14016),
    (39, 'Jonathan', 'Milan', NULLIF('65', ''), 14030),
    (40, 'Arnaud', 'de Lie', NULLIF('169', ''), 14030),
    (41, 'Bryan', 'Coquard', NULLIF('131', ''), 14030),
    (42, 'Jordi', 'Meeus', NULLIF('59', ''), 14030),
    (43, 'Pavel', 'Bittner', NULLIF('155', ''), 14030),
    (44, 'Alberto', 'Dainese', NULLIF('90', ''), 14030),
    (45, 'Robert', 'Stannard', NULLIF('47', ''), 14030),
    (46, 'Phil', 'Bauhaus', NULLIF('42', ''), 14030),
    (47, 'Tim', 'Merlier', NULLIF('20', ''), 14030),
    (48, 'Wout', 'van Aert', NULLIF('15', ''), 14030),
    (49, 'Danny', 'van Poppel', NULLIF('63', ''), 14030),
    (50, 'Neilson', 'Powless', NULLIF('29', ''), 14030),
    (51, 'Markus', 'Hoelgaard', NULLIF('181', ''), 14030),
    (52, 'Clement', 'Berthet', NULLIF('123', ''), 14030),
    (53, 'Tobias Lund', 'Andresen', NULLIF('157', ''), 14030),
    (54, 'Mattias', 'Skjelmose', NULLIF('69', ''), 14030),
    (55, 'Jasper', 'De Buyst', NULLIF('171', ''), 14030),
    (56, 'Emanuel', 'Buchmann', NULLIF('129', ''), 14030),
    (57, 'Guillaume', 'Boivin', NULLIF('164', ''), 14030),
    (58, 'Joao', 'Almeida', NULLIF('2', ''), 14030),
    (59, 'Amaury', 'Capiot', NULLIF('106', ''), 14030),
    (60, 'Dylan', 'Groenewegen', NULLIF('100', ''), 14030),
    (61, 'Magnus', 'Cort', NULLIF('179', ''), 14030),
    (62, 'Arnaud', 'Demare', NULLIF('108', ''), 14030),
    (63, 'Alexis', 'Renard', NULLIF('133', ''), 14030),
    (64, 'Ben', 'Healy', NULLIF('25', ''), 14030),
    (65, 'Matis', 'Louvel', NULLIF('165', ''), 14030),
    (66, 'Aurelien', 'Paret-Peintre', NULLIF('126', ''), 14030),
    (67, 'Remco', 'Evenepoel', NULLIF('17', ''), 14030),
    (68, 'Jordan', 'Jegat', NULLIF('150', ''), 14030),
    (69, 'Carlos', 'Rodriguez', NULLIF('54', ''), 14030),
    (70, 'Gianni', 'Vermeersch', NULLIF('87', ''), 14030),
    (71, 'Santiago', 'Buitrago', NULLIF('41', ''), 14030),
    (72, 'Michael', 'Valgren', NULLIF('31', ''), 14030),
    (73, 'Oliver', 'Naesen', NULLIF('125', ''), 14030),
    (74, 'Oscar', 'Onley', NULLIF('153', ''), 14030),
    (75, 'Felix', 'Gall', NULLIF('121', ''), 14030),
    (76, 'Ilan', 'Van Wilder', NULLIF('24', ''), 14030),
    (77, 'Pascal', 'Eenkhoorn', NULLIF('19', ''), 14030),
    (78, 'Florian', 'Lipowitz', NULLIF('58', ''), 14030),
    (79, 'Primoz', 'Roglic', NULLIF('57', ''), 14030),
    (80, 'Lennert', 'van Eetvelt', NULLIF('175', ''), 14030),
    (81, 'Valentin', 'Madouas', NULLIF('77', ''), 14030),
    (82, 'Guillaume', 'Martin', NULLIF('73', ''), 14030),
    (83, 'Nelson', 'Oliveira', NULLIF('116', ''), 14030),
    (84, 'Fabian', 'Lienhard', NULLIF('93', ''), 14030),
    (85, 'Sean', 'Flynn', NULLIF('156', ''), 14030),
    (86, 'Connor', 'Swift', NULLIF('55', ''), 14030),
    (87, 'Geraint', 'Thomas', NULLIF('49', ''), 14030),
    (88, 'Thomas', 'Gachignard', NULLIF('148', ''), 14030),
    (89, 'Jhonatan', 'Narvaez', NULLIF('3', ''), 14030),
    (90, 'Hugo', 'Page', NULLIF('36', ''), 14030),
    (91, 'Steff', 'Cras', NULLIF('145', ''), 14030),
    (92, 'Bastien', 'Tronchon', NULLIF('128', ''), 14030),
    (93, 'Alexandre', 'Delettre', NULLIF('147', ''), 14030),
    (94, 'Jack', 'Haig', NULLIF('44', ''), 14030),
    (95, 'Alex', 'Aranburu', NULLIF('130', ''), 14030),
    (96, 'Marc', 'Hirschi', NULLIF('92', ''), 14030),
    (97, 'Jenno', 'Berckmoes', NULLIF('170', ''), 14030),
    (98, 'Dylan', 'Teuns', NULLIF('134', ''), 14030),
    (99, 'Brent', 'van Moer', NULLIF('176', ''), 14030),
    (100, 'Tobias', 'Foss', NULLIF('51', ''), 14030),
    (101, 'Fred', 'Wright', NULLIF('48', ''), 14030),
    (102, 'Jarrad', 'Drizners', NULLIF('172', ''), 14030),
    (103, 'Vincenzo', 'Albanese', NULLIF('26', ''), 14030),
    (104, 'Elmar', 'Reinders', NULLIF('103', ''), 14057),
    (105, 'Aleksandr', 'Vlasov', NULLIF('64', ''), 14057),
    (106, 'Callum', 'Scotson', NULLIF('127', ''), 14057),
    (107, 'Warren', 'Barguil', NULLIF('154', ''), 14057),
    (108, 'Matej', 'Mohoric', NULLIF('46', ''), 14057),
    (109, 'Alex', 'Baudin', NULLIF('28', ''), 14057),
    (110, 'Clement', 'Venturini', NULLIF('112', ''), 14057),
    (111, 'Bert', 'van Lerberghe', NULLIF('23', ''), 14057),
    (112, 'Toms', 'Skujins', NULLIF('70', ''), 14077),
    (113, 'Edward', 'Theuns', NULLIF('72', ''), 14077),
    (114, 'Vito', 'Braet', NULLIF('35', ''), 14077),
    (115, 'Laurence', 'Pithie', NULLIF('61', ''), 14084),
    (116, 'Simone', 'Consonni', NULLIF('66', ''), 14084),
    (117, 'Mattia', 'Cattaneo', NULLIF('18', ''), 14099),
    (118, 'Victor', 'Campenaerts', NULLIF('12', ''), 14110),
    (119, 'Sepp', 'Kuss', NULLIF('14', ''), 14030),
    (120, 'Gianni', 'Moscon', NULLIF('60', ''), 14125),
    (121, 'Mick', 'van Dijke', NULLIF('62', ''), 14125),
    (122, 'Ion', 'Izagirre', NULLIF('132', ''), 14125),
    (123, 'Marc', 'Soler', NULLIF('6', ''), 14137),
    (124, 'Kamil', 'Gradek', NULLIF('43', ''), 14137),
    (125, 'Nils', 'Politt', NULLIF('4', ''), 14309),
    (126, 'Andreas', 'Leknessund', NULLIF('183', ''), 14309),
    (127, 'Anders Halland', 'Johannessen', NULLIF('182', ''), 14309),
    (128, 'Quentin', 'Pacher', NULLIF('78', ''), 14309),
    (129, 'Harold', 'Tejada', NULLIF('137', ''), 14309),
    (130, 'Bruno', 'Armirail', NULLIF('122', ''), 14309),
    (131, 'Sebastien', 'Grignard', NULLIF('173', ''), 14309),
    (132, 'Mathis', 'le Berre', NULLIF('110', ''), 14309),
    (133, 'Thymen', 'Arensman', NULLIF('50', ''), 14309),
    (134, 'Jonas', 'Rutsch', NULLIF('38', ''), 14309),
    (135, 'Eduardo', 'Sepulveda', NULLIF('174', ''), 14309),
    (136, 'Georg', 'Zimmermann', NULLIF('40', ''), 14309),
    (137, 'Gregor', 'Muhlberger', NULLIF('118', ''), 14309),
    (138, 'Benjamin', 'Thomas', NULLIF('135', ''), 14309),
    (139, 'Einer', 'Rubio', NULLIF('120', ''), 14309),
    (140, 'Cristian', 'Rodriguez', NULLIF('111', ''), 14309),
    (141, 'Frank', 'Van Den Broek', NULLIF('160', ''), 14309),
    (142, 'Quinn', 'Simmons', NULLIF('68', ''), 14309),
    (143, 'Tim', 'Naberman', NULLIF('159', ''), 14309),
    (144, 'Sergio', 'Higuita', NULLIF('142', ''), 14309),
    (145, 'Clement', 'Champoussin', NULLIF('140', ''), 14309),
    (146, 'Laurenz', 'Rex', NULLIF('37', ''), 14309),
    (147, 'Pablo', 'Castrillo', NULLIF('115', ''), 14309),
    (148, 'Raul', 'Garcia Pierna', NULLIF('109', ''), 14309),
    (149, 'Romain', 'Gregoire', NULLIF('76', ''), 14309),
    (150, 'Ewen', 'Costiou', NULLIF('107', ''), 14309),
    (151, 'Valentin', 'Paret-Peintre', NULLIF('21', ''), 14309),
    (152, 'Emilien', 'Jeanniere', NULLIF('149', ''), 14309),
    (153, 'Michael', 'Storer', NULLIF('95', ''), 14309),
    (154, 'Eddie', 'Dunbar', NULLIF('98', ''), 14309),
    (155, 'Pavel', 'Sivakov', NULLIF('5', ''), 14309),
    (156, 'Adam', 'Yates', NULLIF('8', ''), 14309),
    (157, 'Emiel', 'Verstrynge', NULLIF('88', ''), 14309),
    (158, 'Jake', 'Stewart', NULLIF('168', ''), 14309),
    (159, 'Alexey', 'Lutsenko', NULLIF('166', ''), 14309),
    (160, 'Ben', 'O''Connor', NULLIF('97', ''), 13991),
    (161, 'Mauro', 'Schmid', NULLIF('104', ''), 14318),
    (162, 'Marijn', 'van den Berg', NULLIF('32', ''), 13991),
    (163, 'Luke', 'Durbridge', NULLIF('99', ''), 14382),
    (164, 'Simon', 'Yates', NULLIF('16', ''), 14382),
    (165, 'Axel', 'Laurance', NULLIF('53', ''), 14382),
    (166, 'Silvan', 'Dillier', NULLIF('82', ''), 14382),
    (167, 'Michael', 'Woods', NULLIF('161', ''), 14382),
    (168, 'Simone', 'Velasco', NULLIF('144', ''), 14382),
    (169, 'Maximilian', 'Schachmann', NULLIF('22', ''), 14382),
    (170, 'Luke', 'Plapp', NULLIF('102', ''), 14382),
    (171, 'Yevgeniy', 'Fedorov', NULLIF('141', ''), 14382),
    (172, 'Cees', 'Bol', NULLIF('139', ''), 14382),
    (173, 'Julian', 'Alaphilippe', NULLIF('89', ''), 14382),
    (174, 'Roel', 'van Sintmaartensdijk', NULLIF('39', ''), 14382),
    (175, 'Louis', 'Barre', NULLIF('34', ''), 14382),
    (176, 'Ivan', 'Romeo', NULLIF('119', ''), 14382),
    (177, 'Will', 'Barta', NULLIF('114', ''), 14382),
    (178, 'Mathieu', 'Burgaudeau', NULLIF('146', ''), 14382),
    (179, 'Matteo', 'Vercher', NULLIF('152', ''), 14382),
    (180, 'Thibau', 'Nys', NULLIF('67', ''), 14382),
    (181, 'Lewis', 'Askey', NULLIF('74', ''), 14382),
    (182, 'Lenny', 'Martinez', NULLIF('45', ''), 14542)
  ) AS v(position, first_name, last_name, rider_id_provided, time_seconds)
  WHERE s.stage_number = 1
),
rider_lookup AS (
  SELECT 
    sd.*,
    CASE
      WHEN sd.rider_id_provided IS NOT NULL AND sd.rider_id_provided != '' THEN sd.rider_id_provided::INTEGER
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
