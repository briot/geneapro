import {Component, Input, Output, EventEmitter} from '@angular/core';
import {SourceData, SourceService, ModelData} from './source.service';
import {ModalService} from './modal';
import {ZoomImage} from './media';

@Component({
   selector: 'gp-source-media',
   template: require('./source.media.html'),
})
export class SourceMedia {
  @Input() data : SourceData;
  @Output() mediaChange = new EventEmitter<SourceData>();

  constructor(
     private image : ZoomImage,
     private sources : SourceService,
     private modal : ModalService)
  {
  }

  current : number = 0;

  prevMedia() {
     this.current --;
     if (this.current < 0) {
        this.current = this.data.repr.length - 1;
     }
  }

  nextMedia() {
     this.current ++;
     if (this.current >= this.data.repr.length) {
        this.current = 0;
     }
  }

  deleteCurrentRepr() {
     this.modal.show().subscribe((d : string) => {
        let del : boolean;

        if (d == "Delete on Disk") {
           del = true;
        } else if (d == "Keep File") {
           del = false;
        } else {
           return;
        }

        this.sources.delete_repr(
           this.data.source, this.data.repr[this.current], del).subscribe(data => {
              this.mediaChange.emit(data);
              this.current = Math.min(this.current, data.repr.length - 1);
           });
     });
  }

  // Called when a new representation has been uploaded
  onUpload(data : SourceData) {
     this.mediaChange.emit(data);
     this.current = data.repr.length - 1;  // show most recent media
  }

}
