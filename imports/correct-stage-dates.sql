-- Correct stage dates by adding 1 day to fix timezone issue
UPDATE stages 
SET date = date + INTERVAL '1 day' 
WHERE stage_number <= 23;

-- Verify the correction
SELECT 
  stage_number,
  name,
  date,
  TO_CHAR(date, 'DD/MM/YYYY') as formatted_date
FROM stages
ORDER BY stage_number;


