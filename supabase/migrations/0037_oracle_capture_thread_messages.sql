BEGIN;

ALTER TABLE oracle_captures ADD COLUMN thread_messages JSONB;
ALTER TABLE oracle_captures ADD COLUMN tradition TEXT;

COMMENT ON COLUMN oracle_captures.thread_messages IS
  'Structured UIMessage[] for captures saved via "Save full thread" in Stelloquy. NULL for ordinary highlight/exchange captures, which keep captured_text as their only content.';
COMMENT ON COLUMN oracle_captures.tradition IS
  'Oracle tradition tab the capture was saved from (evolutionary/karmic/psychological/traditional), when known.';

COMMIT;
