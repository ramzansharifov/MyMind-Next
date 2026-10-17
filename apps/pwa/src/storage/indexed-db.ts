export interface StoredAsset {
  path: string
  blob: Blob
}

interface BinaryValue {
  pwaBinary: 1
  bytes: Uint8Array
  mimeType: string
}
interface BinaryAsset {
  path: string
  data: BinaryValue
}
const encodeBlob = async (blob: Blob): Promise<BinaryValue> => ({
  pwaBinary: 1,
  bytes: new Uint8Array(await blob.arrayBuffer()),
  mimeType: blob.type
})
const decodeBlob = (data: BinaryValue): Blob =>
  new Blob([new Uint8Array(data.bytes)], { type: data.mimeType })

export interface PwaDisk {
  readState<T>(key: string): Promise<T | undefined>
  writeState<T>(key: string, value: T | undefined): Promise<void>
  clearStates(prefix: string): Promise<void>
  readDatabase(): Promise<Uint8Array | undefined>
  saveDatabase(bytes: Uint8Array): Promise<void>
  listAssets(): Promise<StoredAsset[]>
  putAsset(asset: StoredAsset): Promise<void>
  deleteAssets(paths: string[]): Promise<void>
  replace(bytes: Uint8Array, assets: StoredAsset[]): Promise<void>
}

/** The SQLite snapshot and attachment replacement share one IndexedDB transaction. */
export async function openPwaDisk(name = 'mymind-pwa-v1'): Promise<PwaDisk> {
  const db = await new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(name, 1)
    request.onupgradeneeded = () => {
      request.result.createObjectStore('state')
      request.result.createObjectStore('assets', { keyPath: 'path' })
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
    request.onblocked = () =>
      reject(new Error('Закройте другие вкладки MyMind и повторите запуск.'))
  })
  db.onversionchange = () => db.close()

  function transaction<T>(
    stores: string[],
    mode: IDBTransactionMode,
    operation: (tx: IDBTransaction, result: (value: T) => void) => void
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      const tx = db.transaction(stores, mode)
      let result: T
      tx.oncomplete = () => resolve(result)
      tx.onerror = () => reject(tx.error ?? new Error('Ошибка локального хранилища'))
      tx.onabort = () => reject(tx.error ?? new Error('Локальная запись отменена'))
      try {
        operation(tx, (value) => {
          result = value
        })
      } catch (error) {
        tx.abort()
        reject(error)
      }
    })
  }

  return {
    clearStates: (prefix) =>
      transaction(['state'], 'readwrite', (tx) => {
        const request = tx
          .objectStore('state')
          .openCursor(IDBKeyRange.bound(prefix, `${prefix}\uffff`))
        request.onsuccess = () => {
          const cursor = request.result
          if (cursor) {
            cursor.delete()
            cursor.continue()
          }
        }
      }),
    readState: <T>(key: string) =>
      transaction<T | undefined>(['state'], 'readonly', (tx, set) => {
        const request = tx.objectStore('state').get(key)
        request.onsuccess = () => {
          const value = request.result
          set(value?.pwaBinary === 1 ? (decodeBlob(value) as T) : (value as T | undefined))
        }
      }),
    writeState: async (key, value) => {
      const stored = value instanceof Blob ? await encodeBlob(value) : value
      return transaction(['state'], 'readwrite', (tx) => {
        const store = tx.objectStore('state')
        if (stored === undefined) store.delete(key)
        else store.put(stored, key)
      })
    },
    readDatabase: () =>
      transaction(['state'], 'readonly', (tx, set) => {
        const request = tx.objectStore('state').get('sqlite')
        request.onsuccess = () => set(request.result as Uint8Array | undefined)
      }),
    saveDatabase: (bytes) =>
      transaction(['state'], 'readwrite', (tx) => {
        tx.objectStore('state').put(bytes, 'sqlite')
      }),
    listAssets: () =>
      transaction(['assets'], 'readonly', (tx, set) => {
        const request = tx.objectStore('assets').getAll()
        request.onsuccess = () =>
          set(
            (request.result as Array<StoredAsset | BinaryAsset>).map((row) =>
              'data' in row ? { path: row.path, blob: decodeBlob(row.data) } : row
            )
          )
      }),
    putAsset: async (asset) => {
      // Some WebKit implementations reject Blob/File structured clones in IndexedDB.
      // Materialize before opening the transaction so it cannot expire while reading bytes.
      const row: BinaryAsset = { path: asset.path, data: await encodeBlob(asset.blob) }
      return transaction(['assets'], 'readwrite', (tx) => {
        tx.objectStore('assets').put(row)
      })
    },
    deleteAssets: (paths) =>
      transaction(['assets'], 'readwrite', (tx) => {
        for (const path of paths) tx.objectStore('assets').delete(path)
      }),
    replace: async (bytes, assets) => {
      const rows: BinaryAsset[] = []
      for (const asset of assets)
        rows.push({ path: asset.path, data: await encodeBlob(asset.blob) })
      return transaction(['state', 'assets'], 'readwrite', (tx) => {
        tx.objectStore('state').put(bytes, 'sqlite')
        tx.objectStore('state').delete('profile-secret')
        const store = tx.objectStore('assets')
        store.clear()
        for (const row of rows) store.put(row)
      })
    }
  }
}
