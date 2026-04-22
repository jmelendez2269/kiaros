BEGIN;

ALTER TABLE user_profiles
  ADD COLUMN theme TEXT NOT NULL DEFAULT 'obsidian'
    CHECK (theme IN ('obsidian', 'celestial', 'dawn'));

COMMIT;
