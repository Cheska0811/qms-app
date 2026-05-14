📘 EMS Project Setup Guide
📂 Project Structure
EMS/              → Frontend (existing)
EMS-backend/      → Backend (Express + PostgreSQL)
│── server.js
│── db.js
│── routes/
│── .env
🚀 Backend Setup (Express + PostgreSQL)
1️⃣ Create Backend Folder
cd ..
mkdir EMS-backend
cd EMS-backend
npm init -y
2️⃣ Install Dependencies
npm install express pg dotenv cors
3️⃣ Create Required Files
"" > server.js
"" > db.js
"" > .env
4️⃣ Setup Environment Variables (.env) - PASTE TO BACKEND FOLDER
DB_HOST=localhost
DB_PORT=5432
DB_NAME=mycompany_db
DB_USER=myuser
DB_PASSWORD=mypassword
PORT=5000
5️⃣ Database Connection (db.js) - PASTE TO BACKEND FOLDER
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

pool.connect()
  .then(() => console.log('✅ Connected to PostgreSQL!'))
  .catch(err => console.error('❌ Connection error:', err));

module.exports = pool;
6️⃣ Server Setup (server.js) - PASTE TO BACKEND FOLDER
const express = require('express');
const cors = require('cors');
require('dotenv').config();
const pool = require('./db');

const app = express();
app.use(cors({ origin: 'http://localhost:5173' }));
app.use(express.json());

// Test route
app.get('/api/test', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW()');
    res.json({ success: true, time: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
▶️ Run Backend
node server.js

✅ Expected output:

✅ Connected to PostgreSQL!
🚀 Server running on port 5000
🗄️ PostgreSQL Setup
1️⃣ Install PostgreSQL
Download here: PostgreSQL Windows Installer
Default port: 5432
Save your password (example: CLD2026)
2️⃣ Create Database
CREATE DATABASE mycompany_db;
CREATE USER myuser WITH PASSWORD 'mypassword';
GRANT ALL PRIVILEGES ON DATABASE mycompany_db TO myuser;
3️⃣ Create Employees Table
CREATE TABLE employees (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255),
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  employee_id VARCHAR(50),
  batch VARCHAR(100),
  gender VARCHAR(20),
  status VARCHAR(50) DEFAULT 'Pre-Employment',
  pre_employment_status VARCHAR(50) DEFAULT 'Not Started',
  date_registered DATE,
  hire_date DATE,
  photo_url TEXT,
  attendance BOOLEAN DEFAULT false,
  last_attendance_date DATE,
  day1_part1_score NUMERIC, day1_part2_score NUMERIC, day1_part3_score NUMERIC, day1_pass BOOLEAN DEFAULT false,
  day2_taping_score NUMERIC, day2_defect1_score NUMERIC, day2_assessment1_score NUMERIC, day2_pass BOOLEAN DEFAULT false,
  day3_preassy_score NUMERIC, day3_defect2_score NUMERIC, day3_assessment2_score NUMERIC, day3_pass BOOLEAN DEFAULT false,
  day4_qms_score NUMERIC, day4_basic5s_score NUMERIC, day4_isms_score NUMERIC, day4_safety_score NUMERIC, day4_ems_score NUMERIC, day4_pass BOOLEAN DEFAULT false,
  day4_completion_date DATE,
  passed_exam BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);
🔌 API Routes (Employees)
Create File
mkdir routes
cd routes
echo. > employees.js
routes/employees.js
const express = require('express');
const router = express.Router();
const pool = require('../db');

// GET all employees
router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM employees ORDER BY date_registered DESC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST create employee
router.post('/', async (req, res) => {
  try {
    const {
      name, first_name, last_name, employee_id, batch, gender,
      status, pre_employment_status, date_registered, hire_date,
      day1_pass, day2_pass, day3_pass, day4_pass, passed_exam
    } = req.body;

    const result = await pool.query(
      `INSERT INTO employees 
      (name, first_name, last_name, employee_id, batch, gender,
       status, pre_employment_status, date_registered, hire_date,
       day1_pass, day2_pass, day3_pass, day4_pass, passed_exam)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
       RETURNING *`,
      [name, first_name, last_name, employee_id, batch, gender,
       status, pre_employment_status, date_registered, hire_date,
       day1_pass, day2_pass, day3_pass, day4_pass, passed_exam]
    );

    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH update employee
router.patch('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const fields = Object.keys(req.body);
    const values = Object.values(req.body);

    const setClause = fields.map((f, i) => `${f} = $${i + 1}`).join(', ');

    const result = await pool.query(
      `UPDATE employees SET ${setClause} WHERE id = $${fields.length + 1} RETURNING *`,
      [...values, id]
    );

    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE employee
router.delete('/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM employees WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
Update server.js
const employeesRouter = require('./routes/employees');
app.use('/api/employees', employeesRouter);

Restart server:

node server.js
🤖 Face Recognition (Python)
Requirements
Python 3.11.9
Setup Virtual Environment
py -3.11 -m venv venv311
venv311\Scripts\activate
Install Dependencies
pip install deepface tf-keras flask flask-cors python-dotenv
▶️ Run Face Server
python face_server.py
⚠️ Important Notes
Always activate virtual environment:
venv311\Scripts\activate
Run backend:
node server.js
Run face recognition server:
python face_server.py
✅ Summary

✔ Backend: Express + PostgreSQL
✔ Frontend: Vite (Port 5173)
✔ Face Recognition: Python + DeepFace

-- 1. List all users
\du

-- 2. List all databases (to find your real database name)
\l

-- 3. Create the user
CREATE USER myuser WITH PASSWORD 'TDS123';

-- 4. Grant access (replace 'yourdbname' with the real name from step 2)
GRANT ALL PRIVILEGES ON DATABASE yourdbname TO myuser;

-- 5. Exit
\q