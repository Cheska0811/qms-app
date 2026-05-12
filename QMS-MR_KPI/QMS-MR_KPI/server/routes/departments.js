import express from 'express';
import { query } from '../config/database.js';

const router = express.Router();

// Get all departments
router.get('/', async (req, res) => {
  try {
    const results = await query('SELECT * FROM departments WHERE status = "active" ORDER BY name ASC');
    res.json(results);
  } catch (error) {
    console.error('Error fetching departments:', error);
    res.status(500).json({ error: 'Failed to fetch departments' });
  }
});

// Get department by ID
router.get('/:id', async (req, res) => {
  try {
    const results = await query('SELECT * FROM departments WHERE id = ?', [req.params.id]);
    if (results.length === 0) {
      return res.status(404).json({ error: 'Department not found' });
    }
    res.json(results[0]);
  } catch (error) {
    console.error('Error fetching department:', error);
    res.status(500).json({ error: 'Failed to fetch department' });
  }
});

// Create department
router.post('/', async (req, res) => {
  try {
    const { id, name, code, description, head, status = 'active', headcount = 0 } = req.body;
    
    if (!name || !code) {
      return res.status(400).json({ error: 'Name and code are required' });
    }

    const deptId = id || `dept_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    
    await query(
      'INSERT INTO departments (id, name, code, description, head, status, headcount) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [deptId, name, code, description || null, head || null, status, headcount]
    );

    const result = await query('SELECT * FROM departments WHERE id = ?', [deptId]);
    res.status(201).json(result[0]);
  } catch (error) {
    console.error('Error creating department:', error);
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: 'Department code already exists' });
    }
    res.status(500).json({ error: 'Failed to create department' });
  }
});

// Update department
router.put('/:id', async (req, res) => {
  try {
    const { name, code, description, head, status, headcount } = req.body;

    await query(
      'UPDATE departments SET name = ?, code = ?, description = ?, head = ?, status = ?, headcount = ? WHERE id = ?',
      [name, code, description || null, head || null, status, headcount, req.params.id]
    );

    await query(
      'UPDATE users SET department_name = ?, department_head = ?, full_name = CASE WHEN role = ? THEN ? ELSE full_name END WHERE department_id = ?',
      [name, head || '', 'department_user', head || '', req.params.id]
    );

    const result = await query('SELECT * FROM departments WHERE id = ?', [req.params.id]);
    if (result.length === 0) {
      return res.status(404).json({ error: 'Department not found' });
    }
    res.json(result[0]);
  } catch (error) {
    console.error('Error updating department:', error);
    res.status(500).json({ error: 'Failed to update department' });
  }
});

// Delete department
router.delete('/:id', async (req, res) => {
  try {
    await query(
      'UPDATE users SET department_id = ?, department_name = ?, department_head = ? WHERE department_id = ?',
      ['', '', '', req.params.id]
    );
    await query('DELETE FROM departments WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting department:', error);
    res.status(500).json({ error: 'Failed to delete department' });
  }
});

export default router;
