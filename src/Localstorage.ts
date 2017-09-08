
export default class LocalStorage {
   private _storage: Storage;

   constructor() {
      if (!localStorage) {
         throw new Error('Browser does not support local storage');
      }
      this._storage = localStorage;
   }

   get<T>(key: string): (T | null) {
      return JSON.parse(this._storage.getItem(key) || 'null');
   }

   set<T>(key: string, value: T) {
      this._storage.setItem(key, JSON.stringify(value));
   }
}
