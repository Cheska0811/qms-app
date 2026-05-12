const express = require('express');
const cors = require('cors');
require('dotenv').config();
const pool = require('./db');

const app = express();

// ── CORS ───────────────────────────────────────────────
const allowedOrigins = [
  'http://localhost:5173',                  // local dev
  'https://your-app.vercel.app',            // 👈 palitan ng actual Vercel URL mo
];

app.use(cors({
  origin: function (origin, callback) {
    // allow requests with no origin (mobile apps, curl, Postman)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
}));

app.use(express.json());

// ── Test ──────────────────────────────────────────────
app.get('/api/test', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW()');
    res.json({ success: true, time: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Departments ───────────────────────────────────────
app.get('/api/departments', async (req, res) => {
  try {
    const { status } = req.query;
    let sql = 'SELECT * FROM departments';
    const params = [];
    if (status) { sql += ' WHERE status = $1'; params.push(status); }
    sql += ' ORDER BY name';
    const result = await pool.query(sql, params);
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/departments/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM departments WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/departments', async (req, res) => {
  try {
    const { id, name, code, description, head, status, headcount } = req.body;
    const deptId = id || `dept_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const result = await pool.query(
      `INSERT INTO departments (id, name, code, description, head, status, headcount)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [deptId, name, code, description, head, status || 'active', headcount || 0]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/departments/:id', async (req, res) => {
  try {
    const { name, code, description, head, status, headcount } = req.body;
    const result = await pool.query(
      `UPDATE departments SET name=$1, code=$2, description=$3, head=$4,
       status=$5, headcount=$6, updated_at=NOW() WHERE id=$7 RETURNING *`,
      [name, code, description, head, status, headcount, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/departments/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM departments WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── KPI Tables ────────────────────────────────────────
app.get('/api/kpi-tables', async (req, res) => {
  try {
    const { department_id, period } = req.query;
    let sql = 'SELECT * FROM kpi_tables';
    const params = [];
    const conditions = [];
    if (department_id) { conditions.push(`department_id = $${params.length + 1}`); params.push(department_id); }
    if (period) { conditions.push(`period = $${params.length + 1}`); params.push(period); }
    if (conditions.length) sql += ' WHERE ' + conditions.join(' AND ');
    sql += ' ORDER BY created_at DESC';
    const result = await pool.query(sql, params);
    res.json(result.rows.map(row => ({
      ...row,
      columns: typeof row.columns === 'string' ? JSON.parse(row.columns) : row.columns,
      rows: typeof row.rows === 'string' ? JSON.parse(row.rows) : row.rows,
    })));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/kpi-tables/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM kpi_tables WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    const row = result.rows[0];
    res.json({
      ...row,
      columns: typeof row.columns === 'string' ? JSON.parse(row.columns) : row.columns,
      rows: typeof row.rows === 'string' ? JSON.parse(row.rows) : row.rows,
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/kpi-tables', async (req, res) => {
  try {
    const { id, department_id, department_name, period, year, month, title, columns, rows, status } = req.body;
    const result = await pool.query(
      `INSERT INTO kpi_tables (id, department_id, department_name, period, year, month, title, columns, rows, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
      [id, department_id, department_name, period, year, month, title,
       JSON.stringify(columns), JSON.stringify(rows), status || 'draft']
    );
    const row = result.rows[0];
    res.status(201).json({
      ...row,
      columns: typeof row.columns === 'string' ? JSON.parse(row.columns) : row.columns,
      rows: typeof row.rows === 'string' ? JSON.parse(row.rows) : row.rows,
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/kpi-tables/:id', async (req, res) => {
  try {
    const { department_id, department_name, period, year, month, title, columns, rows, status } = req.body;
    const result = await pool.query(
      `UPDATE kpi_tables SET department_id=$1, department_name=$2, period=$3, year=$4,
       month=$5, title=$6, columns=$7, rows=$8, status=$9, updated_at=NOW()
       WHERE id=$10 RETURNING *`,
      [department_id, department_name, period, year, month, title,
       JSON.stringify(columns), JSON.stringify(rows), status, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    const row = result.rows[0];
    res.json({
      ...row,
      columns: typeof row.columns === 'string' ? JSON.parse(row.columns) : row.columns,
      rows: typeof row.rows === 'string' ? JSON.parse(row.rows) : row.rows,
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/kpi-tables/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM kpi_tables WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── Auth ──────────────────────────────────────────────
app.get('/api/auth', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, username, email, full_name, role, department_id, department_name, department_head FROM users'
    );
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (result.rows.length === 0) return res.status(401).json({ error: 'Invalid credentials' });
    const user = result.rows[0];
    if (user.password !== password) return res.status(401).json({ error: 'Invalid credentials' });
    const { password: _, ...safeUser } = user;
    res.json({ token: `token_${user.id}`, user: safeUser });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/auth/register', async (req, res) => {
  try {
    const { id, username, email, password, full_name, role, department_id, department_name, department_head } = req.body;
    const userId = id || `user_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const userName = username || email.split('@')[0];
    const result = await pool.query(
      `INSERT INTO users (id, username, email, password, full_name, role, department_id, department_name, department_head)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       RETURNING id, username, email, full_name, role, department_id, department_name, department_head`,
      [userId, userName, email, password, full_name || userName, role || 'department_user', department_id, department_name, department_head]
    );
    const newUser = result.rows[0];
    res.status(201).json({ token: `token_${newUser.id}`, user: newUser });
  } catch (err) {
    if (err.code === '23505') {
      res.status(409).json({ error: 'Email already registered. Please use a different email.' });
    } else {
      res.status(500).json({ error: err.message });
    }
  }
});

app.put('/api/auth/:id', async (req, res) => {
  try {
    const { email, role, department_id, department_name, department_head, full_name } = req.body;
    const result = await pool.query(
      `UPDATE users SET email=$1, role=$2, department_id=$3, department_name=$4,
       department_head=$5, full_name=$6, updated_at=NOW()
       WHERE id=$7 RETURNING id, username, email, full_name, role, department_id, department_name, department_head`,
      [email, role, department_id, department_name, department_head, full_name, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'User not found' });
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/auth/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM users WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── KPI Comments ──────────────────────────────────────
app.get('/api/kpi-comments/:tableId', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM kpi_comments WHERE table_id = $1 ORDER BY created_at ASC',
      [req.params.tableId]
    );
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/kpi-comments', async (req, res) => {
  try {
    const { id, table_id, user_id, user_name, comment } = req.body;
    const result = await pool.query(
      `INSERT INTO kpi_comments (id, table_id, user_id, user_name, comment)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [id || `cmt_${Date.now()}`, table_id, user_id, user_name, comment]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/kpi-comments/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM kpi_comments WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── Start server ──────────────────────────────────────
const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => console.log(`🚀 Server running on port ${PORT}`));