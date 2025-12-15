-- SQL Script to update stages with new 2025 Tour de France data
-- Run this script to update all stages with the latest information

DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Updating stages with new 2025 data...';
  RAISE NOTICE '========================================';
END $$;

-- Update all stages with new data
-- Using ON CONFLICT to update existing stages or insert new ones
INSERT INTO stages (stage_number, name, start_location, end_location, distance_km, date)
VALUES
  (1, 'Stage 1 | Lille Métropole - Lille Métropole', 'Lille Métropole', 'Lille Métropole', 184.9, ('2025-07-05')::date),
  (2, 'Stage 2 | Lauwin-Planque - Boulogne-sur-Mer', 'Lauwin-Planque', 'Boulogne-sur-Mer', 209.1, ('2025-07-06')::date),
  (3, 'Stage 3 | Valenciennes - Dunkerque', 'Valenciennes', 'Dunkerque', 178.3, ('2025-07-07')::date),
  (4, 'Stage 4 | Amiens Métropole - Rouen', 'Amiens Métropole', 'Rouen', 174.2, ('2025-07-08')::date),
  (5, 'Stage 5 (ITT) | Caen - Caen', 'Caen', 'Caen', 33.0, ('2025-07-09')::date),
  (6, 'Stage 6 | Bayeux - Vire Normandie', 'Bayeux', 'Vire Normandie', 201.5, ('2025-07-10')::date),
  (7, 'Stage 7 | Saint-Malo - Mûr-de-Bretagne (Guerlédan)', 'Saint-Malo', 'Mûr-de-Bretagne (Guerlédan)', 197.0, ('2025-07-11')::date),
  (8, 'Stage 8 | Saint-Méen-le-Grand - Laval (Espace Mayenne)', 'Saint-Méen-le-Grand', 'Laval (Espace Mayenne)', 171.4, ('2025-07-12')::date),
  (9, 'Stage 9 | Chinon - Châteauroux', 'Chinon', 'Châteauroux', 174.1, ('2025-07-13')::date),
  (10, 'Stage 10 | Ennezat - Le Mont-Dore Puy de Sancy', 'Ennezat', 'Le Mont-Dore Puy de Sancy', 165.3, ('2025-07-14')::date),
  (11, 'Rest Day', NULL, NULL, NULL, ('2025-07-15')::date),
  (12, 'Stage 11 | Toulouse - Toulouse', 'Toulouse', 'Toulouse', 156.8, ('2025-07-16')::date),
  (13, 'Stage 12 | Auch - Hautacam', 'Auch', 'Hautacam', 180.6, ('2025-07-17')::date),
  (14, 'Stage 13 (ITT) | Loudenvielle - Peyragudes', 'Loudenvielle', 'Peyragudes', 10.9, ('2025-07-18')::date),
  (15, 'Stage 14 | Pau - Luchon-Superbagnères', 'Pau', 'Luchon-Superbagnères', 182.6, ('2025-07-19')::date),
  (16, 'Stage 15 | Muret - Carcassonne', 'Muret', 'Carcassonne', 169.3, ('2025-07-20')::date),
  (17, 'Rest Day', NULL, NULL, NULL, ('2025-07-21')::date),
  (18, 'Stage 16 | Montpellier - Mont Ventoux', 'Montpellier', 'Mont Ventoux', 171.5, ('2025-07-22')::date),
  (19, 'Stage 17 | Bollène - Valence', 'Bollène', 'Valence', 160.4, ('2025-07-23')::date),
  (20, 'Stage 18 | Vif - Courchevel (Col de la Loze)', 'Vif', 'Courchevel (Col de la Loze)', 171.5, ('2025-07-24')::date),
  (21, 'Stage 19 | Albertville - La Plagne', 'Albertville', 'La Plagne', 93.1, ('2025-07-25')::date),
  (22, 'Stage 20 | Nantua - Pontarlier', 'Nantua', 'Pontarlier', 184.2, ('2025-07-26')::date),
  (23, 'Stage 21 | Mantes-la-Ville - Paris (Champs-Élysées)', 'Mantes-la-Ville', 'Paris (Champs-Élysées)', 132.3, ('2025-07-27')::date)
ON CONFLICT (stage_number) 
DO UPDATE SET
  name = EXCLUDED.name,
  start_location = EXCLUDED.start_location,
  end_location = EXCLUDED.end_location,
  distance_km = EXCLUDED.distance_km,
  date = EXCLUDED.date;

DO $$
BEGIN
  RAISE NOTICE '✓ Stages updated successfully';
  RAISE NOTICE 'Total stages: %', (SELECT COUNT(*) FROM stages);
END $$;

-- Verify the update
SELECT 
  stage_number,
  name,
  start_location,
  end_location,
  distance_km,
  date
FROM stages
ORDER BY stage_number;



