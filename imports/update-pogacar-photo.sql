-- Update photo URL for Tadej Pogačar
-- Photo source: https://www.procyclingstats.com/images/riders/bp/dc/tadej-pogacar-2025.jpg

UPDATE riders
SET photo_url = 'https://www.procyclingstats.com/images/riders/bp/dc/tadej-pogacar-2025.jpg'
WHERE first_name = 'Tadej' 
  AND last_name = 'Pogacar';

-- Verify the update
SELECT id, first_name, last_name, photo_url
FROM riders
WHERE first_name = 'Tadej' 
  AND last_name = 'Pogacar';


