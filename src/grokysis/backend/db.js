import idb from 'idb';

const DB_GLOBAL = 'global';
const DB_SESSION_THINGS = 'session-things';

export default class BackendDB {
  constructor({ name }) {
    this.dbName = `grok-${name}`;
    this.dbVersion = 4; // want static properties.
    this.db = null;
  }

  /**
   * Asynchronously load all initial state from the database that's needed for
   * the front-end to become user-responsive.  This means configuration data and
   * the notebook sheet level granularity of session things.
   */
  async init() {
    let freshDb = false;
    const db = this.db = await idb.open(this.dbName, this.dbVersion, (upDb) => {
      // Purge any existing object stores.  This lets us hackily bump the db
      // version as a means of re-initializing the database to its default
      // state.
      for (let objectStoreName of upDb.objectStoreNames) {
        upDb.deleteObjectStore(objectStoreName);
      }

      // global:
      // - stores singleton-ish data in separate keys for things that should be
      //   transactionally separate and are notionally global from the backend's
      //   perspective.
      upDb.createObjectStore(DB_GLOBAL);

      // session-things:
      // - keys are one-up values issued by the front-end SessionManager,
      //   atomically tracked as 'next-session-thing' in  the 'global' store.
      // - values are objects of the form { id, track, index, persisted }.
      //   - track: a string that identifies the track the widget resides in.
      //   - index: a sortable
      upDb.createObjectStore(DB_SESSION_THINGS, { keyPath: 'id' });

      freshDb = true;
    });

    console.log('DB: freshly created?', freshDb);

    if (freshDb) {
      return {
        globals: null,
        sessionThings: null
      };
    }

    const tx = db.transaction([DB_GLOBAL, DB_SESSION_THINGS]);
    const pGlobalKeys = tx.objectStore(DB_GLOBAL).getAllKeys();
    const pGlobalValues = tx.objectStore(DB_GLOBAL).getAll();
    const pSessionThings = tx.objectStore(DB_SESSION_THINGS).getAll();

    console.log('issued requests', pGlobalKeys, pGlobalValues, pSessionThings);

    const globalKeys = await pGlobalKeys;
    console.log('globalKeys', globalKeys);
    const globalValues = await pGlobalValues;
    console.log('globalValues', globalValues);
    const sessionThings = await pSessionThings;
    console.log('sessionThings', sessionThings);


    const globals = {};
    for (let i=0; i < globalKeys.length; i++) {
      const key = globalKeys[i];
      const value = globalValues[i];

      globals[key] = value;
    }

    console.log('DB: loaded', globals, sessionThings);

    return { globals, sessionThings };
  }

  /**
   * Set string key to any IDB-friendly value.
   */
  setGlobal(key, value) {
    const tx = this.db.transaction([DB_GLOBAL], 'readwrite');
    tx.objectStore(DB_GLOBAL).put(value, key);
    return tx.complete;
  }

  /**
   * Set a self-identified via `id` property IDB-friendly value.
   */
  async setSessionThing(thing) {
    const tx = this.db.transaction([DB_SESSION_THINGS], 'readwrite');
    tx.objectStore(DB_SESSION_THINGS).put(thing);
    return tx.complete;
  }

  /**
   * Delete a previously provided session-thing via its id (key path extraction
   * doesn't happen).
   */
  async deleteSessionThingById(id) {
    const tx = this.db.transaction([DB_SESSION_THINGS], 'readwrite');
    tx.objectStore(DB_SESSION_THINGS).delete(id);
    return tx.complete;
  }
}
