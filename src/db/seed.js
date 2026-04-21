// Seeds a couple of demo employees. Run with `npm run seed`.
const bcrypt = require('bcrypt');
const pool = require('./pool');

const DEMO = [
  { code: '1001', name: 'Alice Johnson', pin: '1234' },
  { code: '1002', name: 'Bob Martinez',  pin: '5678' },
  { code: '1003', name: 'Carol Nguyen',  pin: '4321' },
];

(async () => {
  try {
    for (const e of DEMO) {
      const hash = await bcrypt.hash(e.pin, 10);
      await pool.query(
        `INSERT INTO employees (employee_code, name, pin_hash)
         VALUES ($1, $2, $3)
         ON CONFLICT (employee_code) DO NOTHING`,
        [e.code, e.name, hash]
      );
    }
    console.log('Seeded demo employees:');
    for (const e of DEMO) console.log(`  code=${e.code} pin=${e.pin} name=${e.name}`);
  } catch (err) {
    console.error('Seed failed:', err);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
})();
