import * as Redux from 'redux';
import { isType } from 'redux-typescript-actions';
import { rehydrate } from '../Store/State';

export function csrfReducer(
   state: string = '',
   action: Redux.Action
) {
   if (isType(action, rehydrate)) {
      const name = 'csrftoken=';
      if (document.cookie) {
         const cookies = document.cookie.split(';');
         for (const c of cookies) {
            if (c.trim().startsWith(name)) {
               const val = c.substring(name.length);
               window.console.log('Found CSRF token', val);
               return val;
            }
         }
      }
   }
   return state;
}
