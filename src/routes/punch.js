const express = require('express');
const bcrypt = require('bcrypt');
const pool = require('../db/pool');

const router = express.Router();

// Verify employee by code + PIN. Returns the employee row or null.
async function verifyEmployee(code, pin) {
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

// POST /api/punch/status  { code, pin } -> { clockedIn, since }
router.post('/status', async (req, res, next) => {
  try {
    const { code, pin } = req.body || {};
    if (!code || !pin) return res.status(400).json({ error: 'code and pin required' });
    const emp = await verifyEmployee(code, pin);
    if (!emp) return res.status(401).json({ error: 'Invalid employee code or PIN' });

    const open = await pool.query(
      `SELECT id, punch_in FROM punches
        WHERE employee_id = $1 AND punch_out IS NULL
        ORDER BY punch_in DESC LIMIT 1`,
      [emp.id]
    );
    res.json({
      employee: { id: emp.id, name: emp.name, code: emp.employee_code },
      clockedIn: open.rows.length > 0,
      since: open.rows[0]?.punch_in || null,
    });
  } catch (e) { next(e); }
});

// POST /api/punch/in  { code, pin }
router.post('/in', async (req, res, next) => {
  try {
    const { code, pin } = req.body || {};
    if (!code || !pin) return res.status(400).json({ error: 'code and pin required' });
    const emp = await verifyEmployee(code, pin);
    if (!emp) return res.status(401).json({ error: 'Invalid employee code or PIN' });

    // Check for existing open punch
    const open = await pool.query(
      `SELECT id FROM punches WHERE employee_id = $1 AND punch_out IS NULL`,
      [emp.id]
    );
    if (open.rows.length > 0) {
      return res.status(409).json({ error: 'Already clocked in' });
    }

    const { rows } = await pool.query(
      `INSERT INTO punches (employee_id, punch_in) VALUES ($1, NOW())
       RETURNING id, punch_in`,
      [emp.id]
    );
    res.json({
      ok: true,
      action: 'in',
      employee: { name: emp.name, code: emp.employee_code },
      punch: rows[0],
    });
  } catch (e) { next(e); }
});

// POST /api/punch/out  { code, pin }
router.post('/out', async (req, res, next) => {
  try {
    const { code, pin } = req.body || {};
    if (!code || !pin) return res.status(400).json({ error: 'code and pin required' });
    const emp = await verifyEmployee(code, pin);
    if (!emp) return res.status(401).json({ error: 'Invalid employee code or PIN' });

    const { rows } = await pool.query(
      `UPDATE punches SET punch_out = NOW(), updated_at = NOW()
        WHERE employee_id = $1 AND punch_out IS NULL
        RETURNING id, punch_in, punch_out`,
      [emp.id]
    );
    if (rows.length === 0) {
      return res.status(409).json({ error: 'Not currently clocked in' });
    }
    const p = rows[0];
    const durationMs = new Date(p.punch_out) - new Date(p.punch_in);
    res.json({
      ok: true,
      action: 'out',
      employee: { name: emp.name, code: emp.employee_code },
      punch: p,
      durationMinutes: Math.round(durationMs / 60000),
    });
  } catch (e) { next(e); }
});

// POST /api/punch/toggle  { code, pin }  - punch in if out, punch out if in
router.post('/toggle', async (req, res, next) => {
  try {
    const { code, pin } = req.body || {};
    if (!code || !pin) return res.status(400).json({ error: 'code and pin required' });
    const emp = await verifyEmployee(code, pin);
    if (!emp) return res.status(401).json({ error: 'Invalid employee code or PIN' });

    const open = await pool.query(
      `SELECT id FROM punches WHERE employee_id = $1 AND punch_out IS NULL`,
      [emp.id]
    );
    if (open.rows.length > 0) {
      const { rows } = await pool.query(
        `UPDATE punches SET punch_out = NOW(), updated_at = NOW()
          WHERE id = $1 RETURNING id, punch_in, punch_out`,
        [open.rows[0].id]
      );
      const p = rows[0];
      const mins = Math.round((new Date(p.punch_out) - new Date(p.punch_in)) / 60000);
      return res.json({
        ok: true, action: 'out',
        employee: { name: emp.name, code: emp.employee_code },
        punch: p, durationMinutes: mins,
      });
    } else {
      const { rows } = await pool.query(
        `INSERT INTO punches (employee_id, punch_in) VALUES ($1, NOW())
         RETURNING id, punch_in`,
        [emp.id]
      );
      return res.json({
        ok: true, action: 'in',
        employee: { name: emp.name, code: emp.employee_code },
        punch: rows[0],
      });
    }
  } catch (e) { next(e); }
});

module.exports = router;
