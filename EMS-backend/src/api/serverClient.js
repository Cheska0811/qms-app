function resolveApiBaseUrl() {
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  return 'http://localhost:5000/api';
}

const API_BASE_URL = resolveApiBaseUrl();
const SESSION_STORAGE_KEY = 'qms_auth_session';

function getSessionToken() {
  try {
    const raw = localStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) return null;
    const session = JSON.parse(raw);
    return session?.token || null;
  } catch {
    return null;
  }
}

async function apiCall(endpoint, method = 'GET', data = null) {
  const url = `${API_BASE_URL}${endpoint}`;
  const token = getSessionToken();
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  };
  if (data) {
    options.body = JSON.stringify(data);
  }
  try {
    const response = await fetch(url, options);
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error || `API Error: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    if (error instanceof TypeError) {
      throw new Error(`Cannot connect to the backend server at ${API_BASE_URL}.`);
    }
    throw new Error(error.message || 'Request failed');
  }
}

const departmentAPI = {
  list: () => apiCall('/departments'),
  filter: (filters) => apiCall(`/departments?${new URLSearchParams(filters)}`),
  get: (id) => apiCall(`/departments/${id}`),
  create: (data) => apiCall('/departments', 'POST', data),
  update: (id, data) => apiCall(`/departments/${id}`, 'PUT', data),
  delete: (id) => apiCall(`/departments/${id}`, 'DELETE'),
};

const kpiTableAPI = {
  list: () => apiCall('/kpi-tables'),
  filter: (filters) => apiCall(`/kpi-tables?${new URLSearchParams(filters)}`),
  get: (id) => apiCall(`/kpi-tables/${id}`),
  create: (data) => apiCall('/kpi-tables', 'POST', data),
  update: (id, data) => apiCall(`/kpi-tables/${id}`, 'PUT', data),
  delete: (id) => apiCall(`/kpi-tables/${id}`, 'DELETE'),
};

const authAPI = {
  login: (data) => apiCall('/auth/login', 'POST', data),
  register: (data) => apiCall('/auth/register', 'POST', data),
  getUsers: () => apiCall('/auth'),
  updateUser: (id, data) => apiCall(`/auth/${id}`, 'PUT', data),
  deleteUser: (id) => apiCall(`/auth/${id}`, 'DELETE'),
};
const userAPI = {
  list: () => apiCall('/auth'),
  update: (id, data) => apiCall(`/auth/${id}`, 'PUT', data),
  delete: (id) => apiCall(`/auth/${id}`, 'DELETE'),
};
const commentAPI = {
  list: (tableId) => apiCall(`/kpi-comments/${tableId}`),
  create: (data) => apiCall('/kpi-comments', 'POST', data),
  delete: (id) => apiCall(`/kpi-comments/${id}`, 'DELETE'),
};
export const serverApi = {
  login: authAPI.login,
  register: authAPI.register,
  getUsers: authAPI.getUsers,
  updateUser: userAPI.update,
  deleteUser: userAPI.delete,
  comments: commentAPI,
  entities: {
    Department: {
      list: departmentAPI.list,
      filter: departmentAPI.filter,
      create: departmentAPI.create,
      update: departmentAPI.update,
      delete: departmentAPI.delete,
    },
    KPITable: {
      list: kpiTableAPI.list,
      filter: kpiTableAPI.filter,
      create: kpiTableAPI.create,
      update: kpiTableAPI.update,
      delete: kpiTableAPI.delete,
    },
  },
  auth: authAPI,
  departments: departmentAPI,
  kpiTables: kpiTableAPI,
};

export default serverApi;
