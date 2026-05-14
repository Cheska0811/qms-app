import { readState, writeState } from '@/lib/localDb';

const STORAGE_KEY = 'qms_local_db';
const SCHEMA_VERSION = 3;

function buildId(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function createSeedDatabase() {
  return {
    schemaVersion: SCHEMA_VERSION,
    Department: [
      { id: 'quality_assurance', name: 'Quality Assurance', code: 'QA', description: 'Quality assurance and compliance unit', head: 'Liza Mendoza', status: 'active', headcount: 12 },
      { id: 'operations', name: 'Operations', code: 'OPS', description: 'Operations and production department', head: 'Paolo Ramos', status: 'active', headcount: 20 },
      { id: 'it_department', name: 'IT Department', code: 'IT', description: 'Information technology and systems support', head: 'Ana Villanueva', status: 'active', headcount: 8 },
    ],
    DepartmentEntry: [],
    KPITable: [],
    KPITemplate: [],
  };
}

async function readDb() {
  const db = await readState(STORAGE_KEY, null);
  if (!db || db.schemaVersion !== SCHEMA_VERSION) {
    const seeded = createSeedDatabase();
    await writeState(STORAGE_KEY, seeded);
    return seeded;
  }
  return db;
}

async function writeDb(db) {
  await writeState(STORAGE_KEY, db);
}

function matchesFilters(record, filters = {}) {
  return Object.entries(filters).every(([key, value]) => record?.[key] === value);
}

async function listEntity(name) {
  const db = await readDb();
  return clone(db[name] || []);
}

async function filterEntity(name, filters) {
  const collection = await listEntity(name);
  return collection.filter((record) => matchesFilters(record, filters));
}

async function createEntity(name, data) {
  const db = await readDb();
  const nextRecord = { id: data.id || buildId(name.toLowerCase()), ...data };
  db[name] = [...(db[name] || []), nextRecord];
  await writeDb(db);
  return clone(nextRecord);
}

async function updateEntity(name, id, updates) {
  const db = await readDb();
  let updatedRecord = null;
  db[name] = (db[name] || []).map((record) => {
    if (record.id !== id) return record;
    updatedRecord = { ...record, ...updates };
    return updatedRecord;
  });
  await writeDb(db);
  return clone(updatedRecord);
}

async function deleteEntity(name, id) {
  const db = await readDb();
  db[name] = (db[name] || []).filter((record) => record.id !== id);

  if (name === 'Department') {
    db.DepartmentEntry = (db.DepartmentEntry || []).filter((entry) => entry.department_id !== id);
    db.KPITable = (db.KPITable || []).filter((table) => table.department_id !== id);
    db.KPITemplate = (db.KPITemplate || []).filter((template) => template.department_id !== id);
  }

  await writeDb(db);
  return true;
}

export const localApi = {
  entities: {
    Department: {
      list: async () => listEntity('Department'),
      filter: async (filters) => filterEntity('Department', filters),
      create: async (data) => createEntity('Department', data),
      update: async (id, updates) => updateEntity('Department', id, updates),
      delete: async (id) => deleteEntity('Department', id),
    },
    DepartmentEntry: {
      list: async () => listEntity('DepartmentEntry'),
      filter: async (filters) => filterEntity('DepartmentEntry', filters),
      create: async (data) => createEntity('DepartmentEntry', data),
      update: async (id, updates) => updateEntity('DepartmentEntry', id, updates),
      delete: async (id) => deleteEntity('DepartmentEntry', id),
    },
    KPITable: {
      list: async () => listEntity('KPITable'),
      filter: async (filters) => filterEntity('KPITable', filters),
      create: async (data) => createEntity('KPITable', data),
      update: async (id, updates) => updateEntity('KPITable', id, updates),
      delete: async (id) => deleteEntity('KPITable', id),
    },
    KPITemplate: {
      list: async () => listEntity('KPITemplate'),
      filter: async (filters) => filterEntity('KPITemplate', filters),
      create: async (data) => createEntity('KPITemplate', data),
      update: async (id, updates) => updateEntity('KPITemplate', id, updates),
      delete: async (id) => deleteEntity('KPITemplate', id),
    },
  },
};
