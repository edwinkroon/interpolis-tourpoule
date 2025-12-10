-- SQL Script to insert scoring rules for stage positions and jerseys
-- Based on the rules from rules.html

-- Clear existing scoring rules (optional - comment out if you want to keep existing rules)
-- DELETE FROM scoring_rules;

-- Insert stage position scoring rules
-- Etappe posities: 1e=30, 2e=15, 3e=12, 4e=9, 5e=8, 6e=7, 7e=6, 8e=5, 9e=4, 10e=3
INSERT INTO scoring_rules (rule_type, condition_json, points) VALUES
  ('stage_position', '{"position": 1}', 30),
  ('stage_position', '{"position": 2}', 15),
  ('stage_position', '{"position": 3}', 12),
  ('stage_position', '{"position": 4}', 9),
  ('stage_position', '{"position": 5}', 8),
  ('stage_position', '{"position": 6}', 7),
  ('stage_position', '{"position": 7}', 6),
  ('stage_position', '{"position": 8}', 5),
  ('stage_position', '{"position": 9}', 4),
  ('stage_position', '{"position": 10}', 3)
ON CONFLICT DO NOTHING;

-- Insert jersey scoring rules
-- Truien: Geel=10, Groen=5, Bolletjes=5, Wit=3
-- Note: jersey_type moet overeenkomen met jerseys.type in de database (geel, groen, bolletjes, wit)
INSERT INTO scoring_rules (rule_type, condition_json, points) VALUES
  ('jersey', '{"jersey_type": "geel"}', 10),
  ('jersey', '{"jersey_type": "groen"}', 5),
  ('jersey', '{"jersey_type": "bolletjes"}', 5),
  ('jersey', '{"jersey_type": "wit"}', 3)
ON CONFLICT DO NOTHING;

-- Verify inserted rules
SELECT rule_type, condition_json, points FROM scoring_rules ORDER BY rule_type, points DESC;

