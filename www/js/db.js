/* Parlo — stockage local (IndexedDB). Tout reste sur la tablette. */
(function (root) {
  const DB_NAME = 'parlo';
  const DB_VERSION = 1;
  const STORES = ['kv', 'boards', 'images', 'audio'];
  let dbPromise = null;

  function open() {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        for (const s of STORES) if (!db.objectStoreNames.contains(s)) db.createObjectStore(s);
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    return dbPromise;
  }

  async function tx(store, mode, fn) {
    const db = await open();
    return new Promise((resolve, reject) => {
      const t = db.transaction(store, mode);
      const s = t.objectStore(store);
      let result;
      const r = fn(s);
      if (r && 'onsuccess' in r) r.onsuccess = () => { result = r.result; };
      t.oncomplete = () => resolve(result);
      t.onerror = () => reject(t.error);
      t.onabort = () => reject(t.error);
    });
  }

  const DB = {
    get: (store, key) => tx(store, 'readonly', (s) => s.get(key)),
    put: (store, key, value) => tx(store, 'readwrite', (s) => s.put(value, key)),
    del: (store, key) => tx(store, 'readwrite', (s) => s.delete(key)),
    clear: (store) => tx(store, 'readwrite', (s) => s.clear()),
    keys: (store) => tx(store, 'readonly', (s) => s.getAllKeys()),
    all: (store) => tx(store, 'readonly', (s) => s.getAll()),
    async entries(store) {
      const [k, v] = await Promise.all([DB.keys(store), DB.all(store)]);
      return k.map((key, i) => [key, v[i]]);
    },
  };

  root.ParloDB = DB;
})(self);
