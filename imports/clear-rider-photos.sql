-- Script om alle photo_url waarden in de riders tabel leeg te maken
-- Dit zorgt ervoor dat alleen initialen worden getoond in plaats van foto's

UPDATE riders
SET photo_url = NULL
WHERE photo_url IS NOT NULL;

-- Toon resultaat
SELECT 
  COUNT(*) as total_riders,
  COUNT(photo_url) as riders_with_photo,
  COUNT(*) - COUNT(photo_url) as riders_without_photo
FROM riders;
