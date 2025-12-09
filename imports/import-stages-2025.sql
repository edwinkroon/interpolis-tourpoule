-- SQL Script to import Tour de France 2025 stages
-- Tour de France 2025: July 5-27, 2025
-- Based on official Tour de France 2025 route

-- Insert stages for Tour de France 2025
INSERT INTO stages (stage_number, name, start_location, end_location, distance_km, date)
VALUES
  (1, 'Stage 1', 'Lille', 'Lille', 185.0, '2025-07-05'),
  (2, 'Stage 2', 'Lauwin-Planque', 'Boulogne-sur-Mer', 212.0, '2025-07-06'),
  (3, 'Stage 3', 'Valenciennes', 'Dunkerque', 178.0, '2025-07-07'),
  (4, 'Stage 4', 'Amiens Métropole', 'Rouen', 173.0, '2025-07-08'),
  (5, 'Stage 5', 'Caen', 'Caen', 33.0, '2025-07-09'),
  (6, 'Stage 6', 'Bayeux', 'Vire Normandie', 201.0, '2025-07-10'),
  (7, 'Stage 7', 'Saint-Malo', 'Mûr-de-Bretagne Guerlédan', 194.0, '2025-07-11'),
  (8, 'Stage 8', 'Saint-Méen-le-Grand', 'Laval Espace Mayenne', 174.0, '2025-07-12'),
  (9, 'Stage 9', 'Chinon', 'Châteauroux', 170.0, '2025-07-13'),
  (10, 'Rest Day', NULL, NULL, NULL, '2025-07-14'),
  (11, 'Stage 10', 'Ennezat', 'Le Mont-Dore Puy de Sancy', 163.0, '2025-07-15'),
  (12, 'Stage 11', NULL, NULL, NULL, '2025-07-16'),
  (13, 'Stage 12', 'Auch', 'Hautacam', 180.6, '2025-07-17'),
  (14, 'Stage 13', NULL, NULL, NULL, '2025-07-18'),
  (15, 'Stage 14', NULL, NULL, NULL, '2025-07-19'),
  (16, 'Stage 15', 'Muret', 'Carcassonne', NULL, '2025-07-20'),
  (17, 'Rest Day', NULL, NULL, NULL, '2025-07-21'),
  (18, 'Stage 16', 'Montpellier', 'Mont Ventoux', 171.5, '2025-07-22'),
  (19, 'Stage 17', NULL, NULL, NULL, '2025-07-23'),
  (20, 'Stage 18', 'Vif', 'Col de la Loze', 171.5, '2025-07-24'),
  (21, 'Stage 19', NULL, 'La Plagne', NULL, '2025-07-25'),
  (22, 'Stage 20', NULL, NULL, 184.2, '2025-07-26'),
  (23, 'Stage 21', 'Mantes-la-Ville', 'Paris', 132.3, '2025-07-27')
ON CONFLICT (stage_number) DO UPDATE SET
  name = EXCLUDED.name,
  start_location = EXCLUDED.start_location,
  end_location = EXCLUDED.end_location,
  distance_km = EXCLUDED.distance_km,
  date = EXCLUDED.date;

-- Verify the import
SELECT COUNT(*) as total_stages FROM stages WHERE date >= '2025-07-01' AND date <= '2025-07-31';
SELECT stage_number, name, date, start_location, end_location FROM stages WHERE date >= '2025-07-01' AND date <= '2025-07-31' ORDER BY stage_number;
