import serverApi from '@/api/serverClient';

const SESSION_STORAGE_KEY = 'qms_auth_session';

function sanitizeUser(user) {
  if (!user) return null;

  const {
    password: _password,
    username: _username,
    auth_token: _authToken,
    ...safeUser
  } = user;

  return safeUser;
}

export async function ensureSeedUsers() {
  try {
    const users = await serverApi.getUsers();
    return users || [];
  } catch (error) {
    console.error('Error fetching users:', error);
    return [];
  }
}

export async function getAllServerUsers() {
  return ensureSeedUsers();
}

export async function getCurrentServerUser() {
  try {
    const session = localStorage.getItem(SESSION_STORAGE_KEY);
    if (!session) {
      return null;
    }

    const { user } = JSON.parse(session);
    return sanitizeUser(user);
  } catch (error) {
    console.error('Error getting current user:', error);
    return null;
  }
}

export async function loginServerUser(email, password) {
  try {
    const response = await serverApi.login({ email, password });
    const user = sanitizeUser(response?.user || response);
    const token = response?.auth_token || null;

    if (user && user.id) {
      const sessionData = {
        userId: user.id,
        user,
        token,
        timestamp: Date.now(),
      };
      localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(sessionData));
      return user;
    }

    throw new Error('Login failed: Invalid response from server');
  } catch (error) {
    console.error('Login error:', error);
    throw new Error(error.message || 'Login failed');
  }
}

export async function registerServerUser(payload) {
  try {
    const response = await serverApi.register(payload);
    const user = sanitizeUser(response?.user || response);
    const token = response?.auth_token || null;

    if (user && user.id) {
      const sessionData = {
        userId: user.id,
        user,
        token,
        timestamp: Date.now(),
      };
      localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(sessionData));
      return user;
    }

    throw new Error('Registration failed: Invalid response from server');
  } catch (error) {
    console.error('Registration error:', error);
    throw new Error(error.message || 'Registration failed');
  }
}

export async function logoutServerUser() {
  try {
    localStorage.removeItem(SESSION_STORAGE_KEY);
    return true;
  } catch (error) {
    console.error('Logout error:', error);
    return false;
  }
}
