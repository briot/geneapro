import * as React from 'react';
import { Dropdown, Form, Header } from 'semantic-ui-react';
import { Source } from '../Store/Source';

interface CitationProps {
   source: Source;
}

interface CitationState {
   source: Source;  // modified state
}

const CUSTOM = 'custom';

export default class SourceCitation extends React.PureComponent<CitationProps, CitationState> {

   constructor(props: CitationProps) {
      super(props);
      this.state = {
         source: {...props.source,
                  medium: props.source.medium || CUSTOM},
      };
   }

   mediumChange = (e: React.FormEvent<HTMLElement>, data: {value: string}) => {
      this.setState((old: CitationState) => ({
         source: {...old.source, medium: data.value || CUSTOM}
      }));
   }

   commentsChange = (e: React.FormEvent<HTMLElement>, data: {value: string}) => {
      this.setState((old: CitationState) => ({
         source: {...old.source, comments: data.value},
      }));
   }

   jurisdictionPlaceChange = (e: React.FormEvent<HTMLElement>, data: {value: string}) => {
      this.setState((old: CitationState) => ({
         source: {...old.source, jurisdiction_place: data.value},
      }));
   }

   subjectPlaceChange = (e: React.FormEvent<HTMLElement>, data: {value: string}) => {
      this.setState((old: CitationState) => ({
         source: {...old.source, subject_place: data.value},
      }));
   }

   subjectDateChange = (e: React.FormEvent<HTMLElement>, data: {value: string}) => {
      this.setState((old: CitationState) => ({
         source: {...old.source, subject_date: data.value},
      }));
   }

   render() {
      const mediums = [
         {value: CUSTOM,      text: 'Custom citation (no template)'},
         {value: 'book',      text: 'Book'},
         {value: 'interview', text: 'Interview'},
      ];

      return (
         <Form size="small">
            <Header dividing={true}>Citation details</Header>
   
            <Form.Field>
               <label>Template</label>
               <Dropdown
                  defaultValue={this.state.source.medium}
                  onChange={this.mediumChange}
                  search={true}
                  fluid={true}
                  selection={true}
                  scrolling={true}
                  options={mediums}
                  title={'Select the type of the source. This will change the' +
                         ' details below to those needed for proper citation'}
               />
            </Form.Field>
   
            <Form.Input
               label="Full citation"
               required={true}
               disabled={this.state.source.medium === CUSTOM}
               defaultValue={this.state.source.title}
            />
            <Form.Input
               label="Short citation"
               required={true}
               disabled={this.state.source.medium === CUSTOM}
               defaultValue={this.state.source.abbrev}
            />
            <Form.Input
               label="Bibliography citation"
               required={true}
               disabled={this.state.source.medium === CUSTOM}
               defaultValue={this.state.source.biblio}
            />
   
            <Header dividing={true}>Higher-level sources</Header>
   
            <Header dividing={true}>Extra details</Header>
            <p>
               The following information is stored in the database, but not
               needed for the citation templates (perhaps imported from GEDCOM).
            </p>
   
            <Header dividing={true}>Research details</Header>
            <Form.Group widths="equal">
               <Form.Input
                  label="Subject date"
                  placeholder="What date is this about ?"
                  defaultValue={this.state.source.subject_date}
                  onChange={this.subjectDateChange}
                  title="The date the source is about. This isn't the date of the source itself"
               />
               <Form.Input
                  label="Subject place"
                  placeholder="What place is this about ?"
                  defaultValue={this.state.source.subject_place}
                  onChange={this.subjectPlaceChange}
                  title="The place the source is about"
               />
               <Form.Input
                  label="Jurisdiction place"
                  placeholder="Where did you find it ?"
                  defaultValue={this.state.source.jurisdiction_place}
                  onChange={this.jurisdictionPlaceChange}
                  title="Where the source was found"
               />
               <Form.Input
                  label="Researched by"
                  disabled={true}
                  title="Who did the research"
               />
            </Form.Group>
   
            <Form.TextArea
               label="Comments"
               defaultValue={this.state.source.comments}
               onChange={this.commentsChange}
            />
         </Form>
      );
   }
}
