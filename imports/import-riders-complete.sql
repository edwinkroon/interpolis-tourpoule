-- SQL Script to import ALL riders from riders.csv into riders table
-- This version will show which riders fail to import and why

-- First, let's see what teams exist and check for name mismatches
SELECT name FROM teams_pro ORDER BY name;

-- Insert riders from riders.csv with all fields
-- This version will attempt to insert all riders and show any that fail
INSERT INTO riders (team_pro_id, first_name, last_name, date_of_birth, nationality, weight_kg, height_m, photo_url)
SELECT 
  tp.id as team_pro_id,
  r.first_name,
  r.last_name,
  r.date_of_birth::DATE,
  r.nationality,
  r.weight_kg::NUMERIC(4,1),
  r.height_m::NUMERIC(3,2),
  NULLIF(r.photo_url, '') as photo_url
FROM (
  VALUES
    ('Tadej', 'Pogačar', 'UAE Team Emirates', 'Slovenia', '1998-09-21', 66.0, 1.76, ''),
    ('João', 'Almeida', 'UAE Team Emirates', 'Portugal', '1998-08-05', 60.0, 1.78, ''),
    ('Jhonatan', 'Narváez', 'UAE Team Emirates', 'Ecuador', '1997-06-04', 65.0, 1.80, ''),
    ('Nils', 'Politt', 'UAE Team Emirates', 'Germany', '1994-03-06', 75.0, 1.85, ''),
    ('Pavel', 'Sivakov', 'UAE Team Emirates', 'France', '1997-07-11', 65.0, 1.88, ''),
    ('Marc', 'Soler', 'UAE Team Emirates', 'Spain', '1993-11-22', 70.0, 1.86, ''),
    ('Tim', 'Wellens', 'UAE Team Emirates', 'Belgium', '1991-05-10', 68.0, 1.84, ''),
    ('Adam', 'Yates', 'UAE Team Emirates', 'United Kingdom', '1992-08-07', 58.0, 1.73, ''),
    ('Jonas', 'Vingegaard', 'Team Visma-Lease a Bike', 'Denmark', '1996-12-10', 60.0, 1.75, ''),
    ('Wout', 'van Aert', 'Team Visma-Lease a Bike', 'Belgium', '1994-09-15', 78.0, 1.90, ''),
    ('Sepp', 'Kuss', 'Team Visma-Lease a Bike', 'United States', '1994-09-13', 61.0, 1.80, ''),
    ('Christophe', 'Laporte', 'Team Visma-Lease a Bike', 'France', '1992-12-11', 72.0, 1.88, ''),
    ('Dylan', 'van Baarle', 'Team Visma-Lease a Bike', 'Netherlands', '1992-05-21', 75.0, 1.90, ''),
    ('Tiesj', 'Benoot', 'Team Visma-Lease a Bike', 'Belgium', '1994-03-11', 70.0, 1.90, ''),
    ('Remco', 'Evenepoel', 'Soudal Quick-Step', 'Belgium', '2000-01-25', 61.0, 1.71, ''),
    ('Julian', 'Alaphilippe', 'Soudal Quick-Step', 'France', '1992-06-11', 62.0, 1.73, ''),
    ('Yves', 'Lampaert', 'Soudal Quick-Step', 'Belgium', '1991-04-10', 78.0, 1.88, ''),
    ('Kasper', 'Asgreen', 'Soudal Quick-Step', 'Denmark', '1995-02-08', 75.0, 1.92, ''),
    ('Mikkel', 'Honoré', 'Soudal Quick-Step', 'Denmark', '1997-01-21', 68.0, 1.85, ''),
    ('Primož', 'Roglič', 'Bora-Hansgrohe', 'Slovenia', '1989-10-29', 65.0, 1.77, ''),
    ('Jai', 'Hindley', 'Bora-Hansgrohe', 'Australia', '1996-05-05', 58.0, 1.75, ''),
    ('Emanuel', 'Buchmann', 'Bora-Hansgrohe', 'Germany', '1992-11-18', 60.0, 1.75, ''),
    ('Aleksandr', 'Vlasov', 'Bora-Hansgrohe', 'Russia', '1996-04-23', 65.0, 1.85, ''),
    ('Danny', 'van Poppel', 'Bora-Hansgrohe', 'Netherlands', '1993-07-26', 78.0, 1.85, ''),
    ('Matteo', 'Sobrero', 'Bora-Hansgrohe', 'Italy', '1997-05-14', 68.0, 1.85, ''),
    ('Geraint', 'Thomas', 'INEOS Grenadiers', 'United Kingdom', '1986-05-25', 71.0, 1.83, ''),
    ('Tom', 'Pidcock', 'INEOS Grenadiers', 'United Kingdom', '1999-07-30', 58.0, 1.70, ''),
    ('Carlos', 'Rodríguez', 'INEOS Grenadiers', 'Spain', '2001-02-02', 58.0, 1.73, ''),
    ('Egan', 'Bernal', 'INEOS Grenadiers', 'Colombia', '1997-01-13', 60.0, 1.75, ''),
    ('Filippo', 'Ganna', 'INEOS Grenadiers', 'Italy', '1996-07-25', 82.0, 1.93, ''),
    ('Magnus', 'Cort', 'EF Education-EasyPost', 'Denmark', '1993-01-16', 72.0, 1.85, ''),
    ('Neilson', 'Powless', 'EF Education-EasyPost', 'United States', '1996-09-03', 70.0, 1.88, ''),
    ('Rigoberto', 'Urán', 'EF Education-EasyPost', 'Colombia', '1987-01-26', 62.0, 1.73, ''),
    ('Richard', 'Carapaz', 'EF Education-EasyPost', 'Ecuador', '1993-05-23', 62.0, 1.70, ''),
    ('Ben', 'Healy', 'EF Education-EasyPost', 'Ireland', '2000-09-11', 65.0, 1.80, ''),
    ('Thibaut', 'Pinot', 'Groupama-FDJ', 'France', '1990-05-29', 60.0, 1.80, ''),
    ('David', 'Gaudu', 'Groupama-FDJ', 'France', '1996-10-10', 62.0, 1.73, ''),
    ('Valentin', 'Madouas', 'Groupama-FDJ', 'France', '1996-07-12', 68.0, 1.85, ''),
    ('Stefan', 'Küng', 'Groupama-FDJ', 'Switzerland', '1993-11-16', 78.0, 1.94, ''),
    ('Romain', 'Grégoire', 'Groupama-FDJ', 'France', '2003-03-24', 65.0, 1.80, ''),
    ('Pello', 'Bilbao', 'Bahrain Victorious', 'Spain', '1990-02-25', 65.0, 1.78, ''),
    ('Wout', 'Poels', 'Bahrain Victorious', 'Netherlands', '1987-10-01', 70.0, 1.85, ''),
    ('Matej', 'Mohorič', 'Bahrain Victorious', 'Slovenia', '1994-10-19', 70.0, 1.85, ''),
    ('Santiago', 'Buitrago', 'Bahrain Victorious', 'Colombia', '1999-09-11', 58.0, 1.70, ''),
    ('Dylan', 'Teuns', 'Bahrain Victorious', 'Belgium', '1992-03-01', 70.0, 1.85, ''),
    ('Mathieu', 'van der Poel', 'Alpecin-Deceuninck', 'Netherlands', '1995-01-19', 75.0, 1.84, ''),
    ('Jasper', 'Philipsen', 'Alpecin-Deceuninck', 'Belgium', '1998-03-02', 78.0, 1.85, ''),
    ('Søren', 'Kragh Andersen', 'Alpecin-Deceuninck', 'Denmark', '1994-08-10', 72.0, 1.88, ''),
    ('Silvan', 'Dillier', 'Alpecin-Deceuninck', 'Switzerland', '1990-08-03', 72.0, 1.88, ''),
    ('Enric', 'Mas', 'Movistar Team', 'Spain', '1995-01-07', 60.0, 1.77, ''),
    ('Alejandro', 'Valverde', 'Movistar Team', 'Spain', '1980-04-25', 61.0, 1.78, ''),
    ('Iván', 'García Cortina', 'Movistar Team', 'Spain', '1995-11-20', 70.0, 1.85, ''),
    ('Nelson', 'Oliveira', 'Movistar Team', 'Portugal', '1989-03-06', 68.0, 1.80, ''),
    ('Carlos', 'Verona', 'Movistar Team', 'Spain', '1992-11-04', 62.0, 1.78, ''),
    ('Peter', 'Sagan', 'Lidl-Trek', 'Slovakia', '1990-01-26', 78.0, 1.84, ''),
    ('Giulio', 'Ciccone', 'Lidl-Trek', 'Italy', '1994-12-20', 58.0, 1.75, ''),
    ('Bauke', 'Mollema', 'Lidl-Trek', 'Netherlands', '1986-11-26', 68.0, 1.83, ''),
    ('Jasper', 'Stuyven', 'Lidl-Trek', 'Belgium', '1992-04-17', 75.0, 1.88, ''),
    ('Mads', 'Pedersen', 'Lidl-Trek', 'Denmark', '1995-12-18', 78.0, 1.85, ''),
    ('Michael', 'Woods', 'Israel-Premier Tech', 'Canada', '1986-10-12', 68.0, 1.83, ''),
    ('Chris', 'Froome', 'Israel-Premier Tech', 'United Kingdom', '1985-05-20', 69.0, 1.86, ''),
    ('Jakob', 'Fuglsang', 'Israel-Premier Tech', 'Denmark', '1985-03-22', 68.0, 1.82, ''),
    ('Guillaume', 'Boivin', 'Israel-Premier Tech', 'Canada', '1989-05-25', 78.0, 1.88, ''),
    ('Simon', 'Yates', 'Team Jayco AlUla', 'United Kingdom', '1992-08-07', 58.0, 1.72, ''),
    ('Michael', 'Matthews', 'Team Jayco AlUla', 'Australia', '1990-09-26', 72.0, 1.81, ''),
    ('Dylan', 'Groenewegen', 'Team Jayco AlUla', 'Netherlands', '1993-06-21', 78.0, 1.88, ''),
    ('Luke', 'Plapp', 'Team Jayco AlUla', 'Australia', '2000-12-25', 68.0, 1.85, ''),
    ('Eddie', 'Dunbar', 'Team Jayco AlUla', 'Ireland', '1996-09-01', 62.0, 1.78, ''),
    ('Arnaud', 'Démare', 'Arkéa-B&B Hotels', 'France', '1991-08-26', 78.0, 1.81, ''),
    ('Warren', 'Barguil', 'Arkéa-B&B Hotels', 'France', '1991-10-28', 65.0, 1.80, ''),
    ('Nacer', 'Bouhanni', 'Arkéa-B&B Hotels', 'France', '1990-07-25', 72.0, 1.78, ''),
    ('Bryan', 'Coquard', 'Arkéa-B&B Hotels', 'France', '1992-04-25', 68.0, 1.70, ''),
    ('Guillaume', 'Martin', 'Cofidis', 'France', '1993-06-09', 62.0, 1.78, ''),
    ('Victor', 'Lafay', 'Cofidis', 'France', '1996-01-17', 65.0, 1.80, ''),
    ('Axel', 'Zingle', 'Cofidis', 'France', '1998-12-18', 68.0, 1.85, ''),
    ('Benoît', 'Cosnefroy', 'Decathlon AG2R La Mondiale Team', 'France', '1995-10-17', 65.0, 1.78, ''),
    ('Oliver', 'Naesen', 'Decathlon AG2R La Mondiale Team', 'Belgium', '1990-09-16', 75.0, 1.88, ''),
    ('Greg', 'Van Avermaet', 'Decathlon AG2R La Mondiale Team', 'Belgium', '1985-05-17', 74.0, 1.81, ''),
    ('Romain', 'Bardet', 'Team dsm-firmenich PostNL', 'France', '1990-11-09', 62.0, 1.78, ''),
    ('John', 'Degenkolb', 'Team dsm-firmenich PostNL', 'Germany', '1989-01-07', 78.0, 1.81, ''),
    ('Nils', 'Eekhoff', 'Team dsm-firmenich PostNL', 'Netherlands', '1998-01-23', 75.0, 1.88, ''),
    ('Alexey', 'Lutsenko', 'Astana Qazaqstan Team', 'Kazakhstan', '1992-09-07', 70.0, 1.85, ''),
    ('Mark', 'Cavendish', 'Astana Qazaqstan Team', 'United Kingdom', '1985-05-21', 70.0, 1.75, ''),
    ('Cees', 'Bol', 'Uno-X Mobility', 'Netherlands', '1995-07-25', 78.0, 1.90, ''),
    ('Alexander', 'Kristoff', 'Uno-X Mobility', 'Norway', '1987-07-05', 78.0, 1.81, ''),
    ('Tobias', 'Halland Johannessen', 'Uno-X Mobility', 'Norway', '1999-08-07', 68.0, 1.85, ''),
    ('Biniam', 'Girmay', 'Intermarché-Wanty', 'Belgium', '2000-04-02', 70.0, 1.85, ''),
    ('Louis', 'Meintjes', 'Intermarché-Wanty', 'South Africa', '1992-02-21', 58.0, 1.70, ''),
    ('Mike', 'Teunissen', 'Intermarché-Wanty', 'Netherlands', '1992-08-25', 75.0, 1.88, '')
) AS r(first_name, last_name, team_name, nationality, date_of_birth, weight_kg, height_m, photo_url)
INNER JOIN teams_pro tp ON tp.name = r.team_name
ON CONFLICT DO NOTHING;

-- Show riders that couldn't be matched with teams (these won't be inserted)
SELECT 
  r.first_name,
  r.last_name,
  r.team_name as csv_team_name,
  'No matching team in teams_pro table' as issue
FROM (
  VALUES
    ('Tadej', 'Pogačar', 'UAE Team Emirates', 'Slovenia', '1998-09-21', 66.0, 1.76, ''),
    -- ... (all riders from above)
    ('Mike', 'Teunissen', 'Intermarché-Wanty', 'Netherlands', '1992-08-25', 75.0, 1.88, '')
) AS r(first_name, last_name, team_name, nationality, date_of_birth, weight_kg, height_m, photo_url)
LEFT JOIN teams_pro tp ON tp.name = r.team_name
WHERE tp.id IS NULL;

-- Final count
SELECT COUNT(*) as total_riders_imported FROM riders;

