import * as React from 'react';
import { RouteComponentProps } from 'react-router';
import { connect } from 'react-redux';
import { AppState, GPDispatch } from '../Store/State';
import { PersonSet } from '../Store/Person';
import Page from '../Page';
import { UploadForm } from './Upload';
import { importGEDCOM } from '../Server/Import';

import './Page.css';

interface ImportPageProps {
   decujus: number;
   persons: PersonSet;
   dispatch: GPDispatch;
   csrf_token: string;
}

interface ImportPageState {
   success?: boolean;
   errorMsg?: string;
}

class ImportPageConnected extends React.PureComponent<ImportPageProps, ImportPageState> {
   constructor() {
      super();
      this.state = {};
   }

   doUpload = (files: File[]) => {
      return importGEDCOM(files, this.props.csrf_token).then(res => {
         this.setState({errorMsg: res.error, success: res.success});
         return res;
      });
   }

   render() {
      let error: undefined|JSX.Element|JSX.Element[] = undefined;

      if (this.state.success === true) {
         if (this.state.errorMsg && this.state.errorMsg !== '') {
            error = (
               <div>
                  <p className="success">Your file was successfully imported</p>
                  <p className="info">
                  Some data might be missing though, check the output of the
                  importer below for a summary.
                  </p>
                  <p className="output">{this.state.errorMsg}</p>
               </div>
            );
         } else {
            error = (
               <p className="succes">
               Your data was successfully imported.
               </p>
            );
         }
      } else if (this.state.success === false) {
         error = (
            <div>
               <p className="error">Geneaprove could not import your file</p>
               <p className="info">
               This is either because your file does not contain correct GEDCOM
               data, or more likely because of limitations in Geneaprove. Please
               report this issue to the geneaprove developers on github. If your
               GEDCOM data contains information you wish to keep private, you
               can use the <em>gedcom_anon.py</em> script to anonymize the data
               before you send it.
               </p>
               <p className="output">{this.state.errorMsg}</p>
            </div>
         );
      }

      return (
         <Page
            main={
               <div style={{width: '900px'}}>
                  <p>
                  Geneaprove is currently mostly read-only. As such, we
                  recommend importing data from another genealogy software.
                  In particular, the authors have tested importing from
                  <b>Gramps</b> and <b>Roots Magic</b>.
                  </p>
                  <p>
                  Most genealogy software are capable of exporting your data
                  as a <b>GEDCOM</b> file, which Geneaprove can then import.
                  </p>
                  <UploadForm
                     autosubmit={true}
                     doUpload={this.doUpload}
                  />
                  {error}
               </div>}
            decujus={this.props.decujus}
         />
      );
   }
}

interface PropsFromRoute {
   decujus: string;
}

const ImportPage = connect(
   (state: AppState, ownProps: RouteComponentProps<PropsFromRoute>) => ({
      persons: state.persons,
      csrf_token: state.csrf,
      decujus: Number(ownProps.match.params.decujus),
   }),
   (dispatch: GPDispatch) => ({
      dispatch
   }),
)(ImportPageConnected);

export default ImportPage;
