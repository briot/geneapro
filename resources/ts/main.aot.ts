import {platformBrowser} from '@angular/platform-browser';
import {AppModuleNgFactory} from '../aot/resources/ts/app.module.ngfactory';
platformBrowser().bootstrapModuleFactory(AppModuleNgFactory);
