import {platformBrowserDynamic} from '@angular/platform-browser-dynamic';
import {AppModule} from './app.module';
platformBrowserDynamic().bootstrapModule(AppModule);

//******************************************************************
//** use JIT compiler for now.
//** for AOT compiler, see
//**    https://angular.io/docs/ts/latest/guide/ngmodule.html
//******************************************************************
