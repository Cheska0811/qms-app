import express from 'express';
import { query } from '../config/database.js';

const router = express.Router();

// Get all KPI tables for a department and period
router.get('/', async (req, res) => {
  try {
    const { department_id, period } = req.query;
    let sql = 'SELECT * FROM kpi_tables';
    const params = [];

    if (department_id) {
      sql += ' WHERE department_id = ?';
      params.push(department_id);
    }
    if (period) {
      sql += (department_id ? ' AND' : ' WHERE') + ' period = ?';
      params.push(period);
    }

    sql += ' ORDER BY created_at DESC';
    const results = await query(sql, params);
    
    // Parse JSON columns
    const parsed = results.map(row => ({
      ...row,
      columns: typeof row.columns === 'string' ? JSON.parse(row.columns) : row.columns,
      rows: typeof row.rows === 'string' ? JSON.parse(row.rows) : row.rows,
    }));

    res.json(parsed);
  } catch (error) {
    console.error('Error fetching KPI tables:', error);
    res.status(500).json({ error: 'Failed to fetch KPI tables' });
  }
});

// Get single KPI table
router.get('/:id', async (req, res) => {
  try {
    const results = await query('SELECT * FROM kpi_tables WHERE id = ?', [req.params.id]);
    if (results.length === 0) {
      return res.status(404).json({ error: 'KPI table not found' });
    }

    const row = results[0];
    const parsed = {
      ...row,
      columns: typeof row.columns === 'string' ? JSON.parse(row.columns) : row.columns,
      rows: typeof row.rows === 'string' ? JSON.parse(row.rows) : row.rows,
    };

    res.json(parsed);
  } catch (error) {
    console.error('Error fetching KPI table:', error);
    res.status(500).json({ error: 'Failed to fetch KPI table' });
  }
});

// Create KPI table
router.post('/', async (req, res) => {
  try {
    const { id, department_id, department_name, period, year, month, title, columns, rows, status = 'draft' } = req.body;

    if (!department_id || !period) {
      return res.status(400).json({ error: 'department_id and period are required' });
    }

    const tableId = id || `table_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    await query(
      `INSERT INTO kpi_tables 
        (id, department_id, department_name, period, year, month, title, columns, rows, status) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        tableId,
        department_id,
        department_name || null,
        period,
        year || null,
        month || null,
        title || null,
        JSON.stringify(columns || []),
        JSON.stringify(rows || []),
        status
      ]
    );

    const result = await query('SELECT * FROM kpi_tables WHERE id = ?', [tableId]);
    const row = result[0];
    const parsed = {
      ...row,
      columns: JSON.parse(row.columns),
      rows: JSON.parse(row.rows),
    };

    res.status(201).json(parsed);
  } catch (error) {
    console.error('Error creating KPI table:', error);
    res.status(500).json({ error: 'Failed to create KPI table' });
  }
});

// Update KPI table
router.put('/:id', async (req, res) => {
  try {
    const { department_id, department_name, period, year, month, title, columns, rows, status } = req.body;

    await query(
      `UPDATE kpi_tables 
       SET department_id = ?, department_name = ?, period = ?, year = ?, month = ?, title = ?, columns = ?, rows = ?, status = ?
       WHERE id = ?`,
      [
        department_id,
        department_name || null,
        period,
        year || null,
        month || null,
        title || null,
        JSON.stringify(columns || []),
        JSON.stringify(rows || []),
        status || 'draft',
        req.params.id
      ]
    );

    const result = await query('SELECT * FROM kpi_tables WHERE id = ?', [req.params.id]);
    if (result.length === 0) {
      return res.status(404).json({ error: 'KPI table not found' });
    }

    const row = result[0];
    const parsed = {
      ...row,
      columns: JSON.parse(row.columns),
      rows: JSON.parse(row.rows),
    };

    res.json(parsed);
  } catch (error) {
    console.error('Error updating KPI table:', error);
    res.status(500).json({ error: 'Failed to update KPI table' });
  }
});

// Delete KPI table
router.delete('/:id', async (req, res) => {
  try {
    await query('DELETE FROM kpi_tables WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting KPI table:', error);
    res.status(500).json({ error: 'Failed to delete KPI table' });
  }
});

export default router;
