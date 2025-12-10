-- SQL Script to insert scoring rules for final classification and final jersey standings
-- Based on the rules from rules.html

-- Insert final classification scoring rules (eindklassement)
-- 1e=150, 2e=75, 3e=50, 4e=40, 5e=35, 6e=30, 7e=28, 8e=26, 9e=24, 10e=22
-- 11e=20, 12e=18, 13e=17, 14e=16, 15e=15, 16e=14, 17e=13, 18e=12, 19e=11, 20e=10
INSERT INTO scoring_rules (rule_type, condition_json, points) VALUES
  ('final_classification', '{"position": 1}', 150),
  ('final_classification', '{"position": 2}', 75),
  ('final_classification', '{"position": 3}', 50),
  ('final_classification', '{"position": 4}', 40),
  ('final_classification', '{"position": 5}', 35),
  ('final_classification', '{"position": 6}', 30),
  ('final_classification', '{"position": 7}', 28),
  ('final_classification', '{"position": 8}', 26),
  ('final_classification', '{"position": 9}', 24),
  ('final_classification', '{"position": 10}', 22),
  ('final_classification', '{"position": 11}', 20),
  ('final_classification', '{"position": 12}', 18),
  ('final_classification', '{"position": 13}', 17),
  ('final_classification', '{"position": 14}', 16),
  ('final_classification', '{"position": 15}', 15),
  ('final_classification', '{"position": 16}', 14),
  ('final_classification', '{"position": 17}', 13),
  ('final_classification', '{"position": 18}', 12),
  ('final_classification', '{"position": 19}', 11),
  ('final_classification', '{"position": 20}', 10)
ON CONFLICT DO NOTHING;

-- Insert final jersey standings scoring rules (eindstanden truien)
-- Groene trui: 1e=40, 2e=20, 3e=10
-- Bolletjestrui: 1e=40, 2e=20, 3e=10
-- Witte trui: 1e=20, 2e=10, 3e=5
INSERT INTO scoring_rules (rule_type, condition_json, points) VALUES
  ('final_jersey', '{"jersey_type": "groen", "position": 1}', 40),
  ('final_jersey', '{"jersey_type": "groen", "position": 2}', 20),
  ('final_jersey', '{"jersey_type": "groen", "position": 3}', 10),
  ('final_jersey', '{"jersey_type": "bolletjes", "position": 1}', 40),
  ('final_jersey', '{"jersey_type": "bolletjes", "position": 2}', 20),
  ('final_jersey', '{"jersey_type": "bolletjes", "position": 3}', 10),
  ('final_jersey', '{"jersey_type": "wit", "position": 1}', 20),
  ('final_jersey', '{"jersey_type": "wit", "position": 2}', 10),
  ('final_jersey', '{"jersey_type": "wit", "position": 3}', 5)
ON CONFLICT DO NOTHING;

-- Verify inserted rules
SELECT rule_type, condition_json, points 
FROM scoring_rules 
WHERE rule_type IN ('final_classification', 'final_jersey')
ORDER BY rule_type, 
  CASE 
    WHEN rule_type = 'final_classification' THEN (condition_json->>'position')::int
    WHEN rule_type = 'final_jersey' THEN (condition_json->>'position')::int
  END;

