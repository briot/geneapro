// Declares require()
/// <reference path="../../node_modules/awesome-typescript-loader/lib/runtime.d.ts" />
/// <reference path="../../node_modules/@types/core-js/index.d.ts"/>

import {platformBrowserDynamic} from '@angular/platform-browser-dynamic';
import {AppModule} from './app.module';
platformBrowserDynamic().bootstrapModule(AppModule);
