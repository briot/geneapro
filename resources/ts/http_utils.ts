/**
 * Various utilities for http
 */

/**
 * It seems it would be better to use something like:
 *     import {HTTP_PROVIDERS, XSRFStrategy, CookieXSRFStrategy} from '@angular/http';
 *     bootstrap(app, [
 *        HTTP_PROVIDERS,
 *        provide(XSRFStrategy, {useValue: new FooCookieXSRFStrategy('csrftoken', 'X-CSRFToken')}),
 *     ]);
 * but this doesn't seem to have an effect
 */

import {Http, Headers, RequestOptions} from '@angular/http';
import {__platform_browser_private__} from '@angular/platform-browser';

/**
 * The 'options' object to pass to http.post
 */
export function json_post(http : Http, url : string, data : Object) {
   const headers = new Headers({
      'Content-Type': 'application/json',
      'X-CSRFToken': __platform_browser_private__.getDOM().getCookie('csrftoken')
   });
   const options = new RequestOptions({headers: headers});
   const body = JSON.stringify(data);

   return http.post(url, body, options);
}

/**
 * Sending data already encoded in a FormData
 */
export function formdata_post(http : Http, url : string, data : FormData) {
   const headers = new Headers({
      //'Content-Type': 'undefined',
      'X-CSRFToken': __platform_browser_private__.getDOM().getCookie('csrftoken')
   });
   const options = new RequestOptions({headers: headers});
   return http.post(url, data, options);
}
