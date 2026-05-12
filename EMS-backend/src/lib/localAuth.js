import { readState, removeState, writeState } from '@/lib/localDb';

const USERS_STORAGE_KEY = 'qms_local_users';
const SESSION_STORAGE_KEY = 'qms_local_session';

const adminSeed = {
  id: 'local-admin',
  username: 'admin',
  password: 'admin123',
  full_name: 'System Admin',
  role: 'admin',
  department_id: '',
  department_name: '',
  department_head: 'System Admin',
  email: 'admin@local.app',
};

function buildUserId() {
  return `user_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function normalizeEmail(value) {
  return value.trim().toLowerCase();
}

export async function ensureSeedUsers() {
  const users = await readState(USERS_STORAGE_KEY, []);
  if (users.length === 0) {
    await writeState(USERS_STORAGE_KEY, [adminSeed]);
    return [adminSeed];
  }

  const hasAdmin = users.some((user) => user.email === adminSeed.email);
  if (!hasAdmin) {
    const nextUsers = [adminSeed, ...users];
    await writeState(USERS_STORAGE_KEY, nextUsers);
    return nextUsers;
  }

  return users;
}

export async function getAllLocalUsers() {
  return ensureSeedUsers();
}

export async function getCurrentLocalUser() {
  const users = await ensureSeedUsers();
  const session = await readState(SESSION_STORAGE_KEY, null);
  if (!session?.userId) return null;
  return users.find((user) => user.id === session.userId) || null;
}

export async function loginLocalUser(email, password) {
  const users = await ensureSeedUsers();
  const normalizedEmail = normalizeEmail(email);
  const user = users.find(
    (entry) => normalizeEmail(entry.email) === normalizedEmail && entry.password === password,
  );

  if (!user) {
    throw new Error('Invalid email or password.');
  }

  await writeState(SESSION_STORAGE_KEY, { userId: user.id });
  return user;
}

export async function registerLocalUser(payload) {
  const users = await ensureSeedUsers();
  const email = normalizeEmail(payload.email || '');

  if (!payload.department_name?.trim()) {
    throw new Error('Department is required.');
  }

  if (!payload.department_head?.trim()) {
    throw new Error('Department head is required.');
  }

  if (!email) {
    throw new Error('Email is required.');
  }

  if (!payload.password) {
    throw new Error('Password is required.');
  }

  const exists = users.some((user) => normalizeEmail(user.email) === email);
  if (exists) {
    throw new Error('Email already exists.');
  }

  const newUser = {
    id: buildUserId(),
    username: payload.username?.trim() || email,
    password: payload.password,
    full_name: payload.department_head.trim(),
    role: payload.role || 'department_user',
    department_id: payload.department_id || '',
    department_name: payload.department_name.trim(),
    department_head: payload.department_head.trim(),
    email,
  };

  const nextUsers = [...users, newUser];
  await writeState(USERS_STORAGE_KEY, nextUsers);
  await writeState(SESSION_STORAGE_KEY, { userId: newUser.id });
  return newUser;
}

export async function createLocalUser(payload) {
  const users = await ensureSeedUsers();
  const email = normalizeEmail(payload.email || '');

  if (!email) {
    throw new Error('Email is required.');
  }

  if (!payload.password) {
    throw new Error('Password is required.');
  }

  const exists = users.some((user) => normalizeEmail(user.email) === email);
  if (exists) {
    throw new Error('Email already exists.');
  }

  const newUser = {
    id: buildUserId(),
    username: payload.username?.trim() || email,
    password: payload.password,
    full_name: payload.full_name?.trim() || payload.department_head?.trim() || email,
    role: payload.role || 'department_user',
    department_id: payload.department_id || '',
    department_name: payload.department_name?.trim() || '',
    department_head: payload.department_head?.trim() || '',
    email,
  };

  const nextUsers = [...users, newUser];
  await writeState(USERS_STORAGE_KEY, nextUsers);
  return newUser;
}

export async function updateLocalUser(userId, updates) {
  const users = await ensureSeedUsers();
  const nextUsers = users.map((user) => {
    if (user.id !== userId) return user;
    return {
      ...user,
      ...updates,
      email: updates.email ? normalizeEmail(updates.email) : user.email,
    };
  });
  await writeState(USERS_STORAGE_KEY, nextUsers);
  return nextUsers.find((user) => user.id === userId) || null;
}

export async function logoutLocalUser() {
  await removeState(SESSION_STORAGE_KEY);
}
