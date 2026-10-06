window.StudyDB = (() => {
  let connection;
  function open() {
    return new Promise((resolve,reject) => {
      const request = indexedDB.open('meu-estudo-cfc',2);
      request.onupgradeneeded = () => {
        const db=request.result;
        if(!db.objectStoreNames.contains('questions'))db.createObjectStore('questions',{keyPath:'id'}).createIndex('exam','exam');
        if(!db.objectStoreNames.contains('exams'))db.createObjectStore('exams',{keyPath:'id'});
        if(!db.objectStoreNames.contains('settings'))db.createObjectStore('settings');
        if(!db.objectStoreNames.contains('imports'))db.createObjectStore('imports',{keyPath:'id'});
      };
      request.onsuccess=()=>resolve(request.result);
      request.onerror=()=>reject(request.error);
    });
  }
  function transaction(stores, mode, operation) {
    return new Promise((resolve,reject) => {
      const tx=connection.transaction(stores,mode);
      operation(tx);
      tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error);
    });
  }
  async function init(questions,exams) {
    connection=await open();
    await transaction(['questions','exams'],'readwrite',tx=>{
      const qs=tx.objectStore('questions'), es=tx.objectStore('exams');
      qs.clear();es.clear();questions.forEach(q=>qs.put(q));exams.forEach(e=>es.put(e));
    });
  }
  async function write(state) {
    if(!connection)throw new Error('Banco indisponível');
    return transaction(['settings'],'readwrite',tx=>tx.objectStore('settings').put(state,'progress'));
  }
  async function read() {
    if(!connection)return null;
    return new Promise((resolve,reject)=>{
      const r=connection.transaction('settings').objectStore('settings').get('progress');
      r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);
    });
  }
  async function imports(){
    if(!connection)throw new Error('Banco indisponível');
    return new Promise((resolve,reject)=>{const r=connection.transaction('imports').objectStore('imports').getAll();r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});
  }
  async function putImport(record){return transaction(['imports'],'readwrite',tx=>tx.objectStore('imports').put(record));}
  async function deleteImport(id){return transaction(['imports'],'readwrite',tx=>tx.objectStore('imports').delete(id));}
  return {init,write,read,imports,putImport,deleteImport};
})();
