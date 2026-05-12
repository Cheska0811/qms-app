import { query } from '../config/database.js';

export async function initializeDatabase() {
  try {
    console.log('Initializing SQLite database schema...');

    // Create Users table
    await query(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        username TEXT NOT NULL UNIQUE,
        email TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL,
        full_name TEXT,
        role TEXT NOT NULL DEFAULT 'department_user',
        department_id TEXT,
        department_name TEXT,
        department_head TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create Departments table
    await query(`
      CREATE TABLE IF NOT EXISTS departments (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        code TEXT NOT NULL UNIQUE,
        description TEXT,
        head TEXT,
        status TEXT DEFAULT 'active',
        headcount INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create KPI Templates table
    await query(`
      CREATE TABLE IF NOT EXISTS kpi_templates (
        id TEXT PRIMARY KEY,
        department_id TEXT NOT NULL,
        title TEXT,
        description TEXT,
        columns TEXT,
        rows TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE CASCADE
      )
    `);

    // Create KPI Tables table
    await query(`
      CREATE TABLE IF NOT EXISTS kpi_tables (
        id TEXT PRIMARY KEY,
        department_id TEXT NOT NULL,
        department_name TEXT,
        period TEXT,
        year INTEGER,
        month INTEGER,
        title TEXT,
        columns TEXT,
        rows TEXT,
        status TEXT DEFAULT 'draft',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE CASCADE
      )
    `);

    // Create Department Entries table
    await query(`
      CREATE TABLE IF NOT EXISTS department_entries (
        id TEXT PRIMARY KEY,
        department_id TEXT NOT NULL,
        entry_data TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE CASCADE
      )
    `);

    // Insert seed admin user if doesn't exist
    const adminExists = await query(`SELECT * FROM users WHERE email = ?`, ['admin@local.app']);
    if (adminExists.length === 0) {
      await query(`
        INSERT INTO users (id, username, email, password, full_name, role, department_head)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [
        'local-admin',
        'admin',
        'admin@local.app',
        'admin123',
        'System Admin',
        'admin',
        'System Admin'
      ]);
      console.log('✓ Admin user created');
    }

    // Insert seed departments if don't exist
    const deptCount = await query(`SELECT COUNT(*) as count FROM departments`);
    if (Number(deptCount[0]?.count || 0) === 0) {
      await query(`
        INSERT INTO departments (id, name, code, description, head, status, headcount)
        VALUES
          (?, ?, ?, ?, ?, ?, ?),
          (?, ?, ?, ?, ?, ?, ?),
          (?, ?, ?, ?, ?, ?, ?)
      `, [
        'quality_assurance', 'Quality Assurance', 'QA', 'Quality assurance and compliance unit', 'Liza Mendoza', 'active', 12,
        'operations', 'Operations', 'OPS', 'Operations and production department', 'Paolo Ramos', 'active', 20,
        'it_department', 'IT Department', 'IT', 'Information technology and systems support', 'Ana Villanueva', 'active', 8
      ]);
      console.log('✓ Seed departments created');
    }

    console.log('✓ Database initialized successfully');
  } catch (error) {
    console.error('Error initializing database:', error);
    throw error;
  }
}
