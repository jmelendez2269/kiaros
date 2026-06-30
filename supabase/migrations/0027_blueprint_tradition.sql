-- Track which tradition + house system a blueprint was generated under.
-- Used by the Blueprint page to detect when a regeneration is needed.
ALTER TABLE blueprints
  ADD COLUMN IF NOT EXISTS tradition TEXT
    CHECK (tradition IN ('evolutionary','karmic','psychological','traditional','synthesis')),
  ADD COLUMN IF NOT EXISTS house_system TEXT
    CHECK (house_system IN ('whole_sign','porphyry','placidus'));
