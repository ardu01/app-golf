import { DB_NAME, DB_VERSION, STORE } from "./keys.js";

function requestToPromise(req) {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export function openFairwayDb() {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("indexedDB"));
      return;
    }
    const open = indexedDB.open(DB_NAME, DB_VERSION);
    open.onupgradeneeded = () => {
      const db = open.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
    };
    open.onerror = () => reject(open.error);
    open.onsuccess = () => {
      const db = open.result;
      resolve({
        get(key) {
          const tx = db.transaction(STORE, "readonly");
          return requestToPromise(tx.objectStore(STORE).get(key));
        },
        set(key, value) {
          const tx = db.transaction(STORE, "readwrite");
          return requestToPromise(tx.objectStore(STORE).put(value, key));
        },
        del(key) {
          const tx = db.transaction(STORE, "readwrite");
          return requestToPromise(tx.objectStore(STORE).delete(key));
        }
      });
    };
  });
}
