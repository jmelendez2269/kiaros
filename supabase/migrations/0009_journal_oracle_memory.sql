BEGIN;

ALTER TABLE journal_entries
  ADD COLUMN oracle_memory BOOLEAN NOT NULL DEFAULT false;

-- Index so the Oracle fetch (WHERE oracle_memory = true) is fast
CREATE INDEX idx_journal_entries_oracle_memory
  ON journal_entries (user_id, oracle_memory)
  WHERE oracle_memory = true;

COMMIT;
