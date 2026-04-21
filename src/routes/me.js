// Self-service routes for employees: view + edit their own punches.
// Auth model: each request carries { code, pin } in the JSON body (or query
// string for GETs). Simple and stateless — no session needed.

const express = require('express');
const bcrypt = require('bcrypt');
const pool = require('../db/pool');

const router = express.Router();

async function authEmployee({ code, pin }) {
  if (!code || !pin) return null;
  const { rows } = await pool.query(
    `SELECT id, employee_code, name, pin_hash, active
       FROM employees WHERE employee_code = $1`,
    [code]
  );
  if (rows.length === 0) return null;
  const emp = rows[0];
  if (!emp.active) return null;
  const ok = await bcrypt.compare(String(pin), emp.pin_hash);
  return ok ? emp : null;
}

// Middleware: pulls credentials from body (POST/PUT/DELETE) or query (GET).
async function requireEmployee(req, res, next) {
  try {
    const creds = req.method === 'GET'
      ? { code: req.query.code, pin: req.query.pin }
      : { code: req.body?.code, pin: req.body?.pin };
    const emp = await authEmployee(creds);
    if (!emp) return res.status(401).json({ error: 'Invalid employee code or PIN' });
    req.employee = emp;
    next();
  } catch (e) { next(e); }
}

// GET /api/me/history?code=&pin=&from=&to=
router.get('/history', requireEmployee, async (req, res, next) => {
  try {
    const { from, to } = req.query;
    const where = ['employee_id = $1'];
    const params = [req.employee.id];
    let i = 2;
    if (from) { where.push(`punch_in >= $${i++}`); params.push(from); }
    if (to)   { where.push(`punch_in <  $${i++}`); params.push(to); }
    const { rows } = await pool.query(
      `SELECT id, punch_in, punch_out, note,
              edited_by_employee, edited_at,
              original_punch_in, original_punch_out,
              EXTRACT(EPOCH FROM (COALESCE(punch_out, NOW()) - punch_in)) AS seconds
         FROM punches
        WHERE ${where.join(' AND ')}
        ORDER BY punch_in DESC
        LIMIT 500`,
      params
    );
    res.json(rows);
  } catch (e) { next(e); }
});

// GET /api/me/summary?code=&pin=
// Returns this-week and this-month totals (closed punches only).
router.get('/summary', requireEmployee, async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT
         COALESCE(SUM(CASE
           WHEN punch_in >= date_trunc('week', NOW())
           THEN EXTRACT(EPOCH FROM (punch_out - punch_in)) END), 0) AS week_seconds,
         COALESCE(SUM(CASE
           WHEN punch_in >= date_trunc('month', NOW())
           THEN EXTRACT(EPOCH FROM (punch_out - punch_in)) END), 0) AS month_seconds
       FROM punches
      WHERE employee_id = $1 AND punch_out IS NOT NULL`,
      [req.employee.id]
    );
    const r = rows[0];

    // Currently-open punch (still clocked in)?
    const open = await pool.query(
      `SELECT id, punch_in FROM punches
        WHERE employee_id = $1 AND punch_out IS NULL
        ORDER BY punch_in DESC LIMIT 1`,
      [req.employee.id]
    );

    res.json({
      employee: { id: req.employee.id, name: req.employee.name, code: req.employee.employee_code },
      weekHours:  Math.round((r.week_seconds  / 3600) * 100) / 100,
      monthHours: Math.round((r.month_seconds / 3600) * 100) / 100,
      clockedIn: open.rows.length > 0,
      since:     open.rows[0]?.punch_in || null,
    });
  } catch (e) { next(e); }
});

// PUT /api/me/punches/:id   { code, pin, punch_in, punch_out, note }
// Employee edits their own punch. Captures original values on first edit.
router.put('/punches/:id', requireEmployee, async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { punch_in, punch_out, note } = req.body || {};

    // Fetch current row & verify ownership
    const cur = await pool.query(
      `SELECT id, punch_in, punch_out, note,
              original_punch_in, original_punch_out, edited_by_employee
         FROM punches WHERE id = $1 AND employee_id = $2`,
      [id, req.employee.id]
    );
    if (cur.rows.length === 0) {
      return res.status(404).json({ error: 'Punch not found' });
    }
    const row = cur.rows[0];

    // Basic validation
    if (punch_in === undefined && punch_out === undefined && note === undefined) {
      return res.status(400).json({ error: 'Nothing to update' });
    }
    const newIn  = punch_in  !== undefined ? punch_in  : row.punch_in;
    const newOut = punch_out !== undefined ? punch_out : row.punch_out;
    if (newIn && newOut && new Date(newOut) <= new Date(newIn)) {
      return res.status(400).json({ error: 'Punch out must be after punch in' });
    }

    // First-edit snapshot of originals
    const origIn  = row.original_punch_in  || row.punch_in;
    const origOut = row.original_punch_out || row.punch_out;

    const sets = [];
    const params = [];
    let i = 1;
    if (punch_in !== undefined)  { sets.push(`punch_in = $${i++}`);  params.push(punch_in); }
    if (punch_out !== undefined) { sets.push(`punch_out = $${i++}`); params.push(punch_out || null); }
    if (note !== undefined)      { sets.push(`note = $${i++}`);      params.push(note); }

    sets.push(`original_punch_in  = $${i++}`); params.push(origIn);
    sets.push(`original_punch_out = $${i++}`); params.push(origOut);
    sets.push(`edited_by_employee = TRUE`);
    sets.push(`edited_at = NOW()`);
    sets.push(`updated_at = NOW()`);
    params.push(id);

    const { rows } = await pool.query(
      `UPDATE punches SET ${sets.join(', ')} WHERE id = $${i}
       RETURNING id, punch_in, punch_out, note,
                 edited_by_employee, edited_at,
                 original_punch_in, original_punch_out`,
      params
    );
    res.json(rows[0]);
  } catch (e) { next(e); }
});

// DELETE /api/me/punches/:id   { code, pin }
router.delete('/punches/:id', requireEmployee, async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    const r = await pool.query(
      `DELETE FROM punches WHERE id = $1 AND employee_id = $2`,
      [id, req.employee.id]
    );
    if (r.rowCount === 0) return res.status(404).json({ error: 'Punch not found' });
    res.json({ ok: true });
  } catch (e) { next(e); }
});

module.exports = router;
