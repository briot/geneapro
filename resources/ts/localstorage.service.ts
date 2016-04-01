/**
 * An interface to the local storage
 */

import {Injectable} from '@angular/core';

@Injectable()
export class LocalStorage {
   private _storage : any;

   constructor() {
      if (!localStorage) {
         throw new Error('Browser does not support local storage');
      }
      this._storage = localStorage;
   }

   get<T>(key : string) : T {
      return JSON.parse(this._storage.getItem(key) || '{}');
   }

   set<T>(key : string, value : T) {
      this._storage.setItem(key, JSON.stringify(value));
   }
}
