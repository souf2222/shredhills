const path = require('path');
const express = require('express');
const bcrypt = require('bcrypt');
const pool = require('../db/pool');

const router = express.Router();

// --- Auth ---------------------------------------------------------------

function requireAdmin(req, res, next) {
  if (req.session && req.session.admin) return next();
  if (req.accepts('html') && !req.path.startsWith('/api')) {
    return res.redirect('/admin/login');
  }
  return res.status(401).json({ error: 'Unauthorized' });
}

router.get('/login', (_req, res) => {
  res.sendFile(path.join(__dirname, '..', '..', 'public', 'admin', 'login.html'));
});

router.post('/login', express.urlencoded({ extended: true }), (req, res) => {
  const { username, password } = req.body || {};
  const expectedUser = process.env.ADMIN_USERNAME || 'admin';
  const expectedPass = process.env.ADMIN_PASSWORD || 'admin';
  if (username === expectedUser && password === expectedPass) {
    req.session.admin = { username };
    return res.redirect('/admin');
  }
  res.status(401).send(
    '<p>Invalid credentials. <a href="/admin/login">Try again</a>.</p>'
  );
});

router.post('/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/admin/login'));
});

// --- Static admin UI ----------------------------------------------------

router.get('/', requireAdmin, (_req, res) => {
  res.sendFile(path.join(__dirname, '..', '..', 'public', 'admin', 'index.html'));
});

// --- Employees API ------------------------------------------------------

router.get('/api/employees', requireAdmin, async (_req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, employee_code, name, active, created_at
         FROM employees ORDER BY name ASC`
    );
    res.json(rows);
  } catch (e) { next(e); }
});

router.post('/api/employees', requireAdmin, async (req, res, next) => {
  try {
    const { employee_code, name, pin, active } = req.body || {};
    if (!employee_code || !name || !pin) {
      return res.status(400).json({ error: 'employee_code, name, pin required' });
    }
    const pin_hash = await bcrypt.hash(String(pin), 10);
    const { rows } = await pool.query(
      `INSERT INTO employees (employee_code, name, pin_hash, active)
       VALUES ($1, $2, $3, COALESCE($4, TRUE))
       RETURNING id, employee_code, name, active, created_at`,
      [employee_code, name, pin_hash, active]
    );
    res.status(201).json(rows[0]);
  } catch (e) {
    if (e.code === '23505') {
      return res.status(409).json({ error: 'Employee code already exists' });
    }
    next(e);
  }
});

router.put('/api/employees/:id', requireAdmin, async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { employee_code, name, pin, active } = req.body || {};
    const sets = [];
    const params = [];
    let i = 1;
    if (employee_code !== undefined) { sets.push(`employee_code = $${i++}`); params.push(employee_code); }
    if (name !== undefined)          { sets.push(`name = $${i++}`);          params.push(name); }
    if (active !== undefined)        { sets.push(`active = $${i++}`);        params.push(!!active); }
    if (pin) {
      const pin_hash = await bcrypt.hash(String(pin), 10);
      sets.push(`pin_hash = $${i++}`); params.push(pin_hash);
    }
    if (sets.length === 0) return res.status(400).json({ error: 'No fields to update' });
    params.push(id);
    const { rows } = await pool.query(
      `UPDATE employees SET ${sets.join(', ')} WHERE id = $${i}
       RETURNING id, employee_code, name, active, created_at`,
      params
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (e) {
    if (e.code === '23505') {
      return res.status(409).json({ error: 'Employee code already exists' });
    }
    next(e);
  }
});

router.delete('/api/employees/:id', requireAdmin, async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    const r = await pool.query(`DELETE FROM employees WHERE id = $1`, [id]);
    if (r.rowCount === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ ok: true });
  } catch (e) { next(e); }
});

// --- Punches API --------------------------------------------------------

// GET /admin/api/punches?employee_id=&from=&to=
router.get('/api/punches', requireAdmin, async (req, res, next) => {
  try {
    const { employee_id, from, to } = req.query;
    const where = [];
    const params = [];
    let i = 1;
    if (employee_id) { where.push(`p.employee_id = $${i++}`); params.push(parseInt(employee_id, 10)); }
    if (from)        { where.push(`p.punch_in >= $${i++}`);   params.push(from); }
    if (to)          { where.push(`p.punch_in < $${i++}`);    params.push(to); }
    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const { rows } = await pool.query(
      `SELECT p.id, p.employee_id, e.employee_code, e.name,
              p.punch_in, p.punch_out, p.note,
              p.edited_by_employee, p.edited_at,
              p.original_punch_in, p.original_punch_out,
              EXTRACT(EPOCH FROM (COALESCE(p.punch_out, NOW()) - p.punch_in)) AS seconds
         FROM punches p
         JOIN employees e ON e.id = p.employee_id
         ${whereSql}
         ORDER BY p.punch_in DESC
         LIMIT 1000`,
      params
    );
    res.json(rows);
  } catch (e) { next(e); }
});

router.post('/api/punches', requireAdmin, async (req, res, next) => {
  try {
    const { employee_id, punch_in, punch_out, note } = req.body || {};
    if (!employee_id || !punch_in) {
      return res.status(400).json({ error: 'employee_id and punch_in required' });
    }
    const { rows } = await pool.query(
      `INSERT INTO punches (employee_id, punch_in, punch_out, note)
       VALUES ($1, $2, $3, $4)
       RETURNING id, employee_id, punch_in, punch_out, note`,
      [employee_id, punch_in, punch_out || null, note || null]
    );
    res.status(201).json(rows[0]);
  } catch (e) { next(e); }
});

router.put('/api/punches/:id', requireAdmin, async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { punch_in, punch_out, note } = req.body || {};
    const sets = [];
    const params = [];
    let i = 1;
    if (punch_in !== undefined)  { sets.push(`punch_in = $${i++}`);  params.push(punch_in); }
    if (punch_out !== undefined) { sets.push(`punch_out = $${i++}`); params.push(punch_out || null); }
    if (note !== undefined)      { sets.push(`note = $${i++}`);      params.push(note); }
    if (sets.length === 0) return res.status(400).json({ error: 'No fields to update' });
    sets.push(`updated_at = NOW()`);
    params.push(id);
    const { rows } = await pool.query(
      `UPDATE punches SET ${sets.join(', ')} WHERE id = $${i}
       RETURNING id, employee_id, punch_in, punch_out, note`,
      params
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (e) { next(e); }
});

router.delete('/api/punches/:id', requireAdmin, async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    const r = await pool.query(`DELETE FROM punches WHERE id = $1`, [id]);
    if (r.rowCount === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ ok: true });
  } catch (e) { next(e); }
});

// --- Reports ------------------------------------------------------------

// GET /admin/api/report?from=&to=&employee_id=
router.get('/api/report', requireAdmin, async (req, res, next) => {
  try {
    const { from, to, employee_id } = req.query;
    const where = [`p.punch_out IS NOT NULL`];
    const params = [];
    let i = 1;
    if (from)        { where.push(`p.punch_in >= $${i++}`); params.push(from); }
    if (to)          { where.push(`p.punch_in < $${i++}`);  params.push(to); }
    if (employee_id) { where.push(`p.employee_id = $${i++}`); params.push(parseInt(employee_id, 10)); }
    const { rows } = await pool.query(
      `SELECT e.id AS employee_id, e.employee_code, e.name,
              COUNT(p.id)::int AS punch_count,
              COALESCE(SUM(EXTRACT(EPOCH FROM (p.punch_out - p.punch_in))), 0) AS total_seconds
         FROM employees e
         LEFT JOIN punches p
           ON p.employee_id = e.id
          AND ${where.join(' AND ')}
         GROUP BY e.id, e.employee_code, e.name
         ORDER BY e.name ASC`,
      params
    );
    res.json(rows.map(r => ({
      ...r,
      total_hours: Math.round((r.total_seconds / 3600) * 100) / 100,
    })));
  } catch (e) { next(e); }
});

// --- CSV export ---------------------------------------------------------

function csvEscape(v) {
  if (v === null || v === undefined) return '';
  const s = String(v);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

router.get('/api/export.csv', requireAdmin, async (req, res, next) => {
  try {
    const { from, to, employee_id } = req.query;
    const where = [];
    const params = [];
    let i = 1;
    if (employee_id) { where.push(`p.employee_id = $${i++}`); params.push(parseInt(employee_id, 10)); }
    if (from)        { where.push(`p.punch_in >= $${i++}`);   params.push(from); }
    if (to)          { where.push(`p.punch_in < $${i++}`);    params.push(to); }
    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const { rows } = await pool.query(
      `SELECT e.employee_code, e.name, p.punch_in, p.punch_out, p.note,
              EXTRACT(EPOCH FROM (p.punch_out - p.punch_in)) AS seconds
         FROM punches p
         JOIN employees e ON e.id = p.employee_id
         ${whereSql}
         ORDER BY e.name, p.punch_in`,
      params
    );
    const header = ['employee_code', 'name', 'punch_in', 'punch_out', 'hours', 'note'];
    const lines = [header.join(',')];
    for (const r of rows) {
      const hours = r.seconds != null ? (r.seconds / 3600).toFixed(2) : '';
      lines.push([
        csvEscape(r.employee_code),
        csvEscape(r.name),
        csvEscape(r.punch_in ? new Date(r.punch_in).toISOString() : ''),
        csvEscape(r.punch_out ? new Date(r.punch_out).toISOString() : ''),
        csvEscape(hours),
        csvEscape(r.note),
      ].join(','));
    }
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="timesheet-${Date.now()}.csv"`);
    res.send(lines.join('\n'));
  } catch (e) { next(e); }
});

module.exports = router;
