-- Remove the DEFAULT 'evolutionary' / 'porphyry' that migration 0026 set.
-- Those defaults silently assigned a tradition to every existing user,
-- contradicting the design decision that tradition must be an explicit choice.
-- Users with no chosen tradition get no blueprint lens (intentional).
ALTER TABLE user_profiles
  ALTER COLUMN tradition DROP DEFAULT,
  ALTER COLUMN house_system DROP DEFAULT;

-- Null out all rows so no user is carrying a tradition they didn't choose.
-- hereiambeingme@gmail.com will be set to evolutionary/porphyry manually after this runs.
UPDATE user_profiles SET tradition = NULL, house_system = NULL;
