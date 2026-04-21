// Creates the database schema. Run with `npm run init-db`.
const pool = require('./pool');

const SCHEMA = `
CREATE TABLE IF NOT EXISTS employees (
  id            SERIAL PRIMARY KEY,
  employee_code TEXT NOT NULL UNIQUE,
  name          TEXT NOT NULL,
  pin_hash      TEXT NOT NULL,
  active        BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS punches (
  id                  SERIAL PRIMARY KEY,
  employee_id         INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  punch_in            TIMESTAMPTZ NOT NULL,
  punch_out           TIMESTAMPTZ,
  note                TEXT,
  -- Audit trail for self-edits by employees
  original_punch_in   TIMESTAMPTZ,
  original_punch_out  TIMESTAMPTZ,
  edited_by_employee  BOOLEAN NOT NULL DEFAULT FALSE,
  edited_at           TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Migrate older databases (no-op on fresh installs)
ALTER TABLE punches ADD COLUMN IF NOT EXISTS original_punch_in   TIMESTAMPTZ;
ALTER TABLE punches ADD COLUMN IF NOT EXISTS original_punch_out  TIMESTAMPTZ;
ALTER TABLE punches ADD COLUMN IF NOT EXISTS edited_by_employee  BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE punches ADD COLUMN IF NOT EXISTS edited_at           TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_punches_employee ON punches(employee_id);
CREATE INDEX IF NOT EXISTS idx_punches_in      ON punches(punch_in);

-- Only one open punch (no punch_out) per employee.
CREATE UNIQUE INDEX IF NOT EXISTS uniq_open_punch_per_employee
  ON punches(employee_id) WHERE punch_out IS NULL;
`;

(async () => {
  try {
    await pool.query(SCHEMA);
    console.log('Database schema initialized.');
  } catch (err) {
    console.error('Failed to init schema:', err);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
})();
