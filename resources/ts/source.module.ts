import {NgModule} from '@angular/core';
import {MediaModule} from './media';
import {Citation} from './source.citation';
import {Source} from './source';
import {SourceMedia} from './source.media';
import {SourceAsserts} from './source.asserts';
import {Asserts} from './asserts';
import {SharedModule} from './shared.module';
import {FloatLabelModule} from './floatlabels';
import {UploadModule} from './upload.module';

@NgModule({
   imports: [MediaModule, SharedModule, FloatLabelModule, UploadModule],
   declarations: [Citation, Source, SourceMedia, SourceAsserts, Asserts],
})
export class SourceModule {}
