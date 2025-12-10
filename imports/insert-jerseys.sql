-- Insert jerseys (truien) into the jerseys table
-- These are the four main classification jerseys in the Tour de France

-- Gele trui (Maillot Jaune) - Algemeen klassement / General classification
INSERT INTO jerseys (type, name, icon) 
VALUES ('geel', 'Gele trui', 'jersey-yellow')
ON CONFLICT (type) DO NOTHING;

-- Groene trui (Maillot Vert) - Puntenklassement / Points classification
INSERT INTO jerseys (type, name, icon) 
VALUES ('groen', 'Groene trui', 'jersey-green')
ON CONFLICT (type) DO NOTHING;

-- Bolkentrui (Maillot à Pois) - Bergklassement / Mountains classification
INSERT INTO jerseys (type, name, icon) 
VALUES ('bolletjes', 'Bolkentrui', 'jersey-polka-dot')
ON CONFLICT (type) DO NOTHING;

-- Witte trui (Maillot Blanc) - Jongerenklassement / Young rider classification
INSERT INTO jerseys (type, name, icon) 
VALUES ('wit', 'Witte trui', 'jersey-white')
ON CONFLICT (type) DO NOTHING;

-- Verify the insertions
SELECT id, type, name, icon FROM jerseys ORDER BY id;

