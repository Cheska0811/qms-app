const DB_NAME = 'qms_mr_kpi_db';
const STORE_NAME = 'app_state';
const DB_VERSION = 1;

function canUseIndexedDb() {
  return typeof window !== 'undefined' && typeof window.indexedDB !== 'undefined';
}

function openDatabase() {
  if (!canUseIndexedDb()) return Promise.resolve(null);

  return new Promise((resolve, reject) => {
    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME, { keyPath: 'key' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function withStore(mode, handler) {
  const database = await openDatabase();
  if (!database) return null;

  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, mode);
    const store = transaction.objectStore(STORE_NAME);
    const result = handler(store);

    transaction.oncomplete = () => resolve(result);
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error);
  });
}

function readFallback(key, fallback) {
  if (typeof window === 'undefined' || typeof window.localStorage === 'undefined') return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function writeFallback(key, value) {
  if (typeof window === 'undefined' || typeof window.localStorage === 'undefined') return;
  window.localStorage.setItem(key, JSON.stringify(value));
}

function removeFallback(key) {
  if (typeof window === 'undefined' || typeof window.localStorage === 'undefined') return;
  window.localStorage.removeItem(key);
}

export async function readState(key, fallback = null) {
  if (!canUseIndexedDb()) {
    return readFallback(key, fallback);
  }

  const database = await openDatabase();
  if (!database) return fallback;

  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(key);

    request.onsuccess = () => {
      if (request.result) {
        resolve(request.result.value);
        return;
      }

      const migrated = readFallback(key, undefined);
      if (migrated !== undefined) {
        writeState(key, migrated).then(() => {
          removeFallback(key);
          resolve(migrated);
        }).catch(reject);
        return;
      }

      resolve(fallback);
    };

    request.onerror = () => reject(request.error);
  });
}

export async function writeState(key, value) {
  if (!canUseIndexedDb()) {
    writeFallback(key, value);
    return value;
  }

  await withStore('readwrite', (store) => {
    store.put({ key, value });
  });
  return value;
}

export async function removeState(key) {
  if (!canUseIndexedDb()) {
    removeFallback(key);
    return;
  }

  await withStore('readwrite', (store) => {
    store.delete(key);
  });
}
