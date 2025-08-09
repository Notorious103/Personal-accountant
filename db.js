
const DB_NAME = 'pa-db';
const DB_VERSION = 1;

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = req.result;
      if (!db.objectStoreNames.contains('accounts')) {
        const s = db.createObjectStore('accounts', { keyPath: 'id', autoIncrement: true });
      }
      if (!db.objectStoreNames.contains('categories')) {
        const s = db.createObjectStore('categories', { keyPath: 'id', autoIncrement: true });
      }
      if (!db.objectStoreNames.contains('transactions')) {
        const s = db.createObjectStore('transactions', { keyPath: 'id', autoIncrement: true });
      }
      if (!db.objectStoreNames.contains('settings')) {
        const s = db.createObjectStore('settings', { keyPath: 'key' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function txStore(storeName, mode='readonly') {
  const db = await openDB();
  const tx = db.transaction(storeName, mode);
  return tx.objectStore(storeName);
}

async function addItem(store, value) {
  return new Promise(async (resolve, reject) => {
    const s = await txStore(store, 'readwrite');
    const req = s.add(value);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
async function putItem(store, value) {
  return new Promise(async (resolve, reject) => {
    const s = await txStore(store, 'readwrite');
    const req = s.put(value);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
async function getAll(store) {
  return new Promise(async (resolve, reject) => {
    const s = await txStore(store, 'readonly');
    const req = s.getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
async function deleteItem(store, key) {
  return new Promise(async (resolve, reject) => {
    const s = await txStore(store, 'readwrite');
    const req = s.delete(key);
    req.onsuccess = () => resolve(true);
    req.onerror = () => reject(req.error);
  });
}

async function seedDefaults() {
  const accts = await getAll('accounts');
  if (accts.length === 0) {
    await addItem('accounts', { name: 'Cash', type: 'cash' });
    await addItem('accounts', { name: 'Bank', type: 'bank' });
    await addItem('accounts', { name: 'Mobile Money', type: 'mobile' });
  }
  const cats = await getAll('categories');
  if (cats.length === 0) {
    await addItem('categories', { name: 'Salary', type: 'income' });
    await addItem('categories', { name: 'Groceries', type: 'expense' });
    await addItem('categories', { name: 'Rent', type: 'expense' });
    await addItem('categories', { name: 'Investment', type: 'investment' });
  }
}

window.DB = { addItem, putItem, getAll, deleteItem, seedDefaults };
