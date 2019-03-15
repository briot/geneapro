/**
 * This class provides support for sending POST requests to the server
 */

let csrf: string|undefined;

export const setCsrf = (token: string) => csrf = token;

export const post = (url: string, data?: string|FormData) => {
   return window.fetch(
      url,
      {
         method: 'POST',
         headers: new Headers({'X-CSRFToken': csrf || ''}),
         credentials: 'same-origin',  //  Send cookies from same origin
         body: data
      });
}

