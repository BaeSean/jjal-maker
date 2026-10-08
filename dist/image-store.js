'use strict';
// Scope the library to this app path, including GitHub Pages project paths.
const imageStore = (() => {
  let connection;
  function open() {
    if (!connection) connection = new Promise((resolve, reject) => {
      const request = indexedDB.open(`jjal-images:${new URL('.', location.href).pathname}`, 1);
      request.onupgradeneeded = () => request.result.createObjectStore('images', { keyPath: 'id' });
      request.onsuccess = () => {
        const db = request.result;
        db.onversionchange = () => { db.close(); connection = undefined; };
        resolve(db);
      };
      request.onerror = () => { connection = undefined; reject(request.error); };
      request.onblocked = () => { connection = undefined; reject(new Error('저장소가 다른 탭에서 사용 중입니다.')); };
    });
    return connection;
  }
  async function run(mode, operation) {
    const db = await open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('images', mode);
      const request = operation(tx.objectStore('images'));
      tx.oncomplete = () => resolve(request.result);
      tx.onabort = tx.onerror = () => reject(tx.error || request.error || new Error('저장소 오류'));
    });
  }
  return {
    list: () => run('readonly', store => store.getAll()),
    put: record => run('readwrite', store => store.put(record)),
    remove: id => run('readwrite', store => store.delete(id))
  };
})();
