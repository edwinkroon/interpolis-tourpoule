-- SQL Script to make a user an admin
-- Replace 'YOUR_USER_ID_HERE' with the actual user_id from Auth0

-- Example: Make a user admin
-- UPDATE participants 
-- SET is_admin = true 
-- WHERE user_id = 'auth0|1234567890';

-- To find your user_id, check the participants table:
-- SELECT user_id, team_name, email FROM participants;

-- Then run:
-- UPDATE participants SET is_admin = true WHERE user_id = 'YOUR_USER_ID_HERE';

-- Verify admin status:
-- SELECT user_id, team_name, is_admin FROM participants WHERE is_admin = true;

