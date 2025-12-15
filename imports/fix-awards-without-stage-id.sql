-- Fix awards without stage_id by deleting them
-- These are old awards that were created before stage_id was added
-- They will be recalculated when awards are calculated for each stage

DELETE FROM awards_per_participant WHERE stage_id IS NULL;
