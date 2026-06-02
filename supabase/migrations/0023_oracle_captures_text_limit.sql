BEGIN;

-- Bump the captured_text upper bound so "Save full thread" can persist a
-- multi-turn Stelloquy conversation in one row. Original limit (4000 chars)
-- was set in 0013 when capture meant a single highlighted snippet; threads
-- of 3+ exchanges blow past that quickly.
ALTER TABLE oracle_captures
  DROP CONSTRAINT IF EXISTS oracle_captures_captured_text_check;

ALTER TABLE oracle_captures
  ADD CONSTRAINT oracle_captures_captured_text_check
  CHECK (char_length(captured_text) BETWEEN 1 AND 20000);

COMMIT;
