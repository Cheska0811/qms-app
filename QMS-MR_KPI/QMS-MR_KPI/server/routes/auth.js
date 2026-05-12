import express from 'express';
import { randomBytes } from 'crypto';
import { query } from '../config/database.js';

const router = express.Router();
const sessions = new Map();
const SESSION_TTL_MS = 1000 * 60 * 60 * 12;

function sanitizeUser(user) {
  if (!user) return null;
  const { password: _password, username: _username, ...safeUser } = user;
  return safeUser;
}

function createSession(userId) {
  const token = randomBytes(32).toString('hex');
  sessions.set(token, {
    userId,
    expiresAt: Date.now() + SESSION_TTL_MS,
  });
  return token;
}

function getBearerToken(req) {
  const authHeader = req.headers.authorization || '';
  if (!authHeader.startsWith('Bearer ')) {
    return null;
  }

  return authHeader.slice(7).trim();
}

async function getAuthenticatedUser(req) {
  const token = getBearerToken(req);
  if (!token) return null;

  const session = sessions.get(token);
  if (!session) return null;

  if (session.expiresAt <= Date.now()) {
    sessions.delete(token);
    return null;
  }

  const users = await query('SELECT * FROM users WHERE id = ?', [session.userId]);
  return users[0] || null;
}

async function requireAdmin(req, res) {
  const currentUser = await getAuthenticatedUser(req);

  if (!currentUser) {
    res.status(401).json({ error: 'Authentication required.' });
    return null;
  }

  if (currentUser.role !== 'admin') {
    res.status(403).json({ error: 'Admin access required.' });
    return null;
  }

  return currentUser;
}

async function resolveDepartmentPayload({ department_id, department_name, department_head }) {
  if (!department_id) {
    return {
      department_id: '',
      department_name: department_name || '',
      department_head: department_head || '',
    };
  }

  const departments = await query('SELECT id, name, head FROM departments WHERE id = ?', [department_id]);
  if (departments.length === 0) {
    const error = new Error('Department not found.');
    error.status = 404;
    throw error;
  }

  const department = departments[0];

  return {
    department_id: department.id,
    department_name: department.name || '',
    department_head: department.head || department_head || '',
  };
}

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const users = await query('SELECT * FROM users WHERE email = ?', [email.toLowerCase()]);
    
    if (users.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const user = users[0];
    
    // Note: In production, compare hashed passwords!
    if (user.password !== password) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const authToken = createSession(user.id);
    res.json({
      auth_token: authToken,
      user: sanitizeUser(user),
    });
  } catch (error) {
    console.error('Error during login:', error);
    res.status(500).json({ error: 'Failed to login' });
  }
});

// Register
router.post('/register', async (req, res) => {
  try {
    const currentUser = await getAuthenticatedUser(req);
    const {
      email,
      password,
      department_name,
      department_head,
      username,
      full_name,
      department_id,
      role,
    } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const userCountResult = await query('SELECT COUNT(*) as count FROM users');
    const isFirstUser = Number(userCountResult[0]?.count || 0) === 0;
    const requestedRole = isFirstUser || (currentUser?.role === 'admin' && role === 'admin')
      ? 'admin'
      : 'department_user';
    const resolvedDepartment = await resolveDepartmentPayload({ department_id, department_name, department_head });

    if (requestedRole !== 'admin' && (!resolvedDepartment.department_name || !resolvedDepartment.department_head)) {
      return res.status(400).json({ error: 'Department name and department head are required' });
    }

    // Check if email exists
    const existing = await query('SELECT * FROM users WHERE email = ?', [email.toLowerCase()]);
    if (existing.length > 0) {
      return res.status(400).json({ error: 'Email already exists.' });
    }

    const userId = `user_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    await query(
      `INSERT INTO users (id, username, email, password, full_name, role, department_id, department_name, department_head)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        username || email,
        email.toLowerCase(),
        password, // In production, hash this!
        full_name || resolvedDepartment.department_head || email,
        requestedRole,
        resolvedDepartment.department_id,
        resolvedDepartment.department_name,
        resolvedDepartment.department_head
      ]
    );

    const result = await query('SELECT * FROM users WHERE id = ?', [userId]);
    const user = result[0];
    const authToken = currentUser ? null : createSession(user.id);

    res.status(201).json({
      auth_token: authToken,
      user: sanitizeUser(user),
    });
  } catch (error) {
    console.error('Error during registration:', error);
    res.status(error.status || 500).json({ error: error.message || 'Failed to register' });
  }
});

// Get all users (admin only)
router.get('/', async (req, res) => {
  try {
    const currentUser = await requireAdmin(req, res);
    if (!currentUser) return;

    const results = await query(
      'SELECT id, email, full_name, role, department_id, department_name, department_head FROM users',
    );
    res.json(results.map(sanitizeUser));
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const currentUser = await requireAdmin(req, res);
    if (!currentUser) return;

    const existingUsers = await query('SELECT * FROM users WHERE id = ?', [req.params.id]);
    if (existingUsers.length === 0) {
      return res.status(404).json({ error: 'User not found.' });
    }

    const existingUser = existingUsers[0];
    const nextEmail = (req.body.email || existingUser.email || '').trim().toLowerCase();
    if (!nextEmail) {
      return res.status(400).json({ error: 'Email is required.' });
    }

    const duplicateUsers = await query('SELECT id FROM users WHERE email = ? AND id != ?', [nextEmail, req.params.id]);
    if (duplicateUsers.length > 0) {
      return res.status(400).json({ error: 'Email already exists.' });
    }

    const nextRole = req.body.role === 'admin' ? 'admin' : 'department_user';
    const resolvedDepartment = await resolveDepartmentPayload({
      department_id: req.body.department_id,
      department_name: req.body.department_name,
      department_head: req.body.department_head,
    });
    const nextFullName =
      req.body.full_name?.trim() ||
      req.body.department_head?.trim() ||
      resolvedDepartment.department_head ||
      existingUser.full_name ||
      nextEmail;

    await query(
      `UPDATE users
       SET email = ?, username = ?, full_name = ?, role = ?, department_id = ?, department_name = ?, department_head = ?
       WHERE id = ?`,
      [
        nextEmail,
        req.body.username || nextEmail,
        nextFullName,
        nextRole,
        resolvedDepartment.department_id,
        resolvedDepartment.department_name,
        resolvedDepartment.department_head,
        req.params.id,
      ]
    );

    const results = await query(
      'SELECT id, email, full_name, role, department_id, department_name, department_head FROM users WHERE id = ?',
      [req.params.id]
    );
    res.json(sanitizeUser(results[0]));
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(error.status || 500).json({ error: error.message || 'Failed to update user' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const currentUser = await requireAdmin(req, res);
    if (!currentUser) return;

    if (currentUser.id === req.params.id) {
      return res.status(400).json({ error: 'You cannot delete your own account.' });
    }

    const result = await query('DELETE FROM users WHERE id = ?', [req.params.id]);
    if (!result.changes) {
      return res.status(404).json({ error: 'User not found.' });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

export default router;
