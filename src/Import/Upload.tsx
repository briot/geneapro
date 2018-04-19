import * as React from 'react';
import { Button, Form, Icon } from 'semantic-ui-react';
import './upload.css';

export interface UploadResult {
   files: File[];
   success: boolean;
   error: string;
}

interface UploadFormProps {
   multiple?: boolean;
   autosubmit?: boolean;

   // Called to perform the upload of the files.
   // It should return at least a success field.
   doUpload: (files: File[]) => Promise<{success: boolean}>;
}

interface UploadFormState {
   files: File[];
   uploading: boolean;
}

export class UploadForm extends React.PureComponent<UploadFormProps, UploadFormState> {

   fileInput: HTMLInputElement|null = null;
   state: UploadFormState = {
      files: [],
      uploading: false,
   };

   send(files: File[]) {
      this.setState({uploading: true});
      this.props.doUpload(files).then((res: {success: boolean}) => {
         if (res.success) {
            this.setState({files: [], uploading: false});
         } else {
            this.setState({uploading: false});
         }
      });
   }

   addFiles(files: FileList|null) {
      if (files && files.length) {
         let tmp = this.props.multiple ? [...this.state.files] : [];
         for (let f = 0; f < files.length; f++) {
            tmp.push(files[f]);
         }

         if (this.props.autosubmit) {
            this.send(tmp);
            tmp = [];
         }

         this.setState({files: tmp});
      }
   }

   onFileAdded = () => {
      if (this.fileInput) {
         this.addFiles(this.fileInput.files);
      }
   }

   onDragEnter = (e: DragEvent) => {
      this.cancelEvent(e);
   }

   onDragLeave = (e: DragEvent) => {
      this.cancelEvent(e);
   }

   onDrop = (e: DragEvent) => {
      this.onDragLeave(e);
      this.addFiles(e.dataTransfer.files);
   }

   cancelEvent = (e: Event) => {
      e.preventDefault();
      e.stopPropagation();
   }

   render() {
      const hasFiles = this.state.files.length !== 0;
      const fileList: JSX.Element = hasFiles ? (
         <ul className="files">
         {this.state.files.map(f => <li key={f.name}>{f.name}</li>)}
         </ul>
      ) : (
         <div>
            <span style={{fontWeight: 'bold'}}>Choose a file </span> or
            drag it here
         </div>
      );

      return (
         <Form
            className="uploadForm"
            onDrag={this.cancelEvent}
            onDragOver={this.cancelEvent}
            onDragEnter={this.onDragEnter}
            onDragEnd={this.onDragLeave}
            onDragLeave={this.onDragLeave}
            onDrop={this.onDrop}
         >
            <div className="maxi uploadTarget">
               <label>
                  <Icon name="download" />
                  {fileList}
                  <input
                     type="file"
                     multiple={this.props.multiple}
                     ref={input => this.fileInput = input}
                     onChange={this.onFileAdded}
                  />
               </label>
               <Button style={{marginTop: '20px'}} primary={true} disabled={!hasFiles}>Upload</Button>
               <div className="fa fa-spin fa-spinner" />
            </div>
         </Form>
      );
   }
}
