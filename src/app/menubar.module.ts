import {NgModule} from '@angular/core';
import {MenuButton} from './menubar.button';
import {Menubar} from './menubar';
import {SharedModule} from './shared.module';

@NgModule({
   imports: [SharedModule],
   exports: [Menubar],
   declarations: [Menubar, MenuButton],
})
export class MenubarModule {}
