const DB_NAME = "bc.runtime.assets.v1";
const STORE_NAME = "files";
const DB_VERSION = 1;

function openRuntimeAssetDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !("indexedDB" in window)) {
      reject(new Error("IndexedDB is not available."));
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Failed to open IndexedDB."));
  });
}

function transactionDone(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error("IndexedDB transaction failed."));
    transaction.onabort = () => reject(transaction.error ?? new Error("IndexedDB transaction aborted."));
  });
}

export async function saveRuntimeAssetBlob(key: string, blob: Blob): Promise<void> {
  const db = await openRuntimeAssetDb();
  const transaction = db.transaction(STORE_NAME, "readwrite");
  transaction.objectStore(STORE_NAME).put(blob, key);
  await transactionDone(transaction);
  db.close();
}

export async function loadRuntimeAssetBlob(key: string): Promise<Blob | null> {
  const db = await openRuntimeAssetDb();
  const transaction = db.transaction(STORE_NAME, "readonly");
  const request = transaction.objectStore(STORE_NAME).get(key);

  const value = await new Promise<Blob | null>((resolve, reject) => {
    request.onsuccess = () => {
      const result = request.result;
      resolve(result instanceof Blob ? result : null);
    };
    request.onerror = () => reject(request.error ?? new Error("Failed to read IndexedDB asset."));
  });

  await transactionDone(transaction);
  db.close();
  return value;
}

export async function removeRuntimeAssetBlob(key: string): Promise<void> {
  const db = await openRuntimeAssetDb();
  const transaction = db.transaction(STORE_NAME, "readwrite");
  transaction.objectStore(STORE_NAME).delete(key);
  await transactionDone(transaction);
  db.close();
}
