-- Force remove the old constraint by name
ALTER TABLE awards_per_participant
DROP CONSTRAINT IF EXISTS awards_per_participant_award_id_participant_id_key;
