import * as React from 'react';
import { Button, Dropdown, Form, Header } from 'semantic-ui-react';
import { Source, createNewSource } from '../Store/Source';
import { CitationModel, fetchCitationModelsFromServer,
         fetchModelTemplateFromServer } from '../Server/Citation';
import CitationTemplate from '../Store/CitationTemplate';

const CUSTOM = 'custom';

interface CitationPart {
   value: string;
   inTemplate: boolean;
}

type CitationParts = {[key: string]: CitationPart};

/***********************************************************************
 * InputOrLabel
 ***********************************************************************/

interface InputOrLabelProps {
   template?: CitationTemplate;   // field is readonly if this is undefined
   value: string;
   label: string;
   required?: boolean;
   rows?: number;
   onChange?: (e: React.FormEvent<HTMLElement>, data: {value: string}) => void;
}

function InputOrLabel(props: InputOrLabelProps) {
   return !props.template ? (
      props.rows !== undefined && props.rows > 0 ? (
         <Form.TextArea
            label={props.label}
            onChange={props.onChange}
            required={props.required}
            rows={props.rows}
            value={props.value}
         />
      ) : (
         <Form.Input
            label={props.label}
            onChange={props.onChange}
            required={props.required}
            value={props.value}
         />
      )
   ) : (
      <Form.Field>
         <label>{props.label}</label>
         <span style={{marginLeft: '15px'}}>
            {
               props.template.html(props.value)
            }
         </span>
      </Form.Field>
   );
}

/***********************************************************************
 * ExtraDetails
 ***********************************************************************/

function ExtraDetails(props: {parts: CitationParts}) {
   const toDiscard: [string, CitationPart][] = Object.entries(props.parts)
      .filter(value => !value[1].inTemplate && value[1].value)
      .sort((a, b) => a[0].localeCompare(b[0]));

   if (toDiscard.length === 0) {
      return null;
   }

   return (
      <div>
         <Header dividing={true}>Extra details</Header>
         <p>
            The following information is stored in the database, but not
            needed for the citation templates (perhaps imported from GEDCOM).
            It will be discarded when you save.
         </p>
         {
            toDiscard.map((value: [string, CitationPart]) => (
               <Form.Input
                  key={value[0]}
                  label={value[0]}
                  disabled={true}
                  defaultValue={value[1].value}
               />)
            )
         }
      </div>
   );
}

/***********************************************************************
 * HighLevelSource
 ***********************************************************************/

function HighLevelSource() {
   // <Header dividing={true}>Higher-level sources</Header>
   return null;
}

/***********************************************************************
 * Citation
 ***********************************************************************/

interface CitationProps {
   source: Source|undefined;
   onTitleChanged?: (html: JSX.Element|JSX.Element[]) => void;
}

interface CitationState {
   source: Source;  // modified state
   models: CitationModel[];
   template?: CitationTemplate;
   parts: CitationParts; //  ??? Aren't these part of the source already ?
   modified: boolean;
}

export default class SourceCitation extends React.PureComponent<CitationProps, CitationState> {

   manualTitle: string;
   manualAbbrev: string;
   manualBiblio: string;
   // manual citations entered by the user (or original citation).
   // These are used in case the user goes back to a CUSTOM model

   constructor(props: CitationProps) {
      super(props);
      this.state = {
         modified: false,
         models: [],
         parts: {},
         source: createNewSource(CUSTOM),  // updated in componentWillMount
      };
   }

   async componentWillMount() {
      let s = await fetchCitationModelsFromServer();
      s.source_types.sort((a, b) => a.type.localeCompare(b.type));
      this.setState({models: s.source_types,
                     source: this._updateSource(this.props)});
   }

   componentWillReceiveProps(nextProps: CitationProps) {
      if (!this.props.source) {
         if (nextProps.source) {
            this.setState({source: this._updateSource(nextProps)});
         }
      } else if (!nextProps.source) {
         if (this.props.source) {
            this.setState({source: this._updateSource(nextProps)});
         }
      } else if (this.props.source.id !== nextProps.source.id) {
         this.setState({source: this._updateSource(nextProps)});
      }
   }

   reset = () => {
      const source = this.props.source ?
         {...this.props.source} :
         createNewSource(CUSTOM);

      this.manualTitle = source.title || '';
      this.manualAbbrev = source.abbrev || '';
      this.manualBiblio = source.biblio || '';

      this.setState({modified: false});
      this.fetchModel(source, source.medium || CUSTOM, {});
   }

   /**
    * Take into account a change in the original source. Return the
    * update to be performed on this.state
    */
   _updateSource(props: CitationProps): Source {
      if (!props.source) {
         let source = createNewSource(CUSTOM);
         this.manualTitle = '';
         this.manualAbbrev = '';
         this.manualBiblio = '';
         this.fetchModel(source, CUSTOM, this.state.parts);
         return source;
      } else {
         this.manualTitle = props.source.title;
         this.manualAbbrev = props.source.abbrev;
         this.manualBiblio = props.source.biblio;
         const newMedium = props.source.medium || CUSTOM;
         this.fetchModel(props.source, newMedium, this.state.parts);
         return {...props.source, medium: newMedium};
      }
   }

   /**
    * Recompute the title/abbrev/biblio citation based on template and parts
    */
   recomputeCitation(templates: undefined|CitationTemplate, parts: CitationParts) {
      let title = this.manualTitle;
      let abbrev = this.manualAbbrev;
      let biblio = this.manualBiblio;

      if (templates !== undefined) {
         let simple: {[key: string]: string} = {};
         Object.entries(parts).forEach(e => {
            simple[e[0]] = e[1].value;
         });

         templates.setParts(simple);
         title = templates.full;
         abbrev = templates.abbrev;
         biblio = templates.biblio;

         if (this.props.onTitleChanged) {
            this.props.onTitleChanged(templates.html(title));
         }
      } else {
         if (this.props.onTitleChanged) {
            this.props.onTitleChanged(<span>{title}</span>);
         }
      }

      return {title: title, abbrev: abbrev, biblio: biblio};
   }

   fetchModel(source: Source, model: string, oldParts: CitationParts) {
      let newParts:  CitationParts = {};
      Object.entries(oldParts).forEach(p => {
         newParts[p[0]] = {value: p[1].value, inTemplate: false};
      });

      if (model === CUSTOM) {
         this.setState({template: undefined,
                        parts: newParts,
                        source: {...source, 
                                 medium: model,
                                 ...this.recomputeCitation(undefined, {})}});
      } else {
         fetchModelTemplateFromServer(model).then(
            d => {
               const parts = d.getParts();
               parts.forEach(key => {
                  newParts[key] = {value: newParts[key] ? newParts[key].value : '',
                                   inTemplate: true};
               });
               this.setState({template: d,
                              parts: newParts,
                              source: {...source,
                                       medium: model,
                                       ...this.recomputeCitation(d, newParts)}});
            }
         );
      }
   }

   setPart = (key: string, value: string) => {
      const p = {...this.state.parts, [key]: {...this.state.parts[key], value: value}};
      this.setState({
         ...this.state,
         parts: p,
         modified: true,
         source: {...this.state.source,
                  ...this.recomputeCitation(this.state.template, p)}});
   }

   mediumChange = (e: React.SyntheticEvent<HTMLInputElement>, data: {value: string}) => {
      this.setState({modified: true});
      this.fetchModel(this.state.source, data.value || CUSTOM, this.state.parts);
   }

   commentsChange = (e: React.SyntheticEvent<HTMLTextAreaElement>) => {
      this.setState({source: {...this.state.source, comments: e.currentTarget.value},
                     modified: true});
   }

   titleChange = (e: React.SyntheticEvent<HTMLInputElement>) => {
      this.manualTitle = e.currentTarget.value;

      if (this.props.onTitleChanged) {
         this.props.onTitleChanged(<span>{this.manualTitle}</span>);
      }
      this.setState({source: {...this.state.source, title: this.manualTitle},
                     modified: true});
   }

   abbrevChange = (e: React.SyntheticEvent<HTMLInputElement>) => {
      this.manualAbbrev = e.currentTarget.value;
      this.setState({source: {...this.state.source, abbrev: this.manualAbbrev},
                     modified: true});
   }

   biblioChange = (e: React.SyntheticEvent<HTMLInputElement>) => {
      this.manualBiblio = e.currentTarget.value;
      this.setState({source: {...this.state.source, biblio: this.manualBiblio},
                     modified: true});
   }

   jurisdictionPlaceChange = (e: React.SyntheticEvent<HTMLInputElement>) => {
      this.setState({source: {...this.state.source, jurisdictionPlace: e.currentTarget.value},
                     modified: true});
   }

   subjectPlaceChange = (e: React.SyntheticEvent<HTMLInputElement>) => {
      this.setState({source: {...this.state.source, subjectPlace: e.currentTarget.value},
                     modified: true});
   }

   subjectDateChange = (e: React.SyntheticEvent<HTMLInputElement>) => {
      this.setState({source: {...this.state.source, subjectDate: e.currentTarget.value},
                     modified: true});
   }

   render() {
      return (
         <Form size="small">
            <Header dividing={true}>Citation details</Header>
   
            <Form.Field>
               <label>Template</label>
               <Dropdown
                  value={this.state.source.medium || CUSTOM}
                  onChange={this.mediumChange}
                  search={true}
                  fluid={true}
                  selection={true}
                  placeholder="Template for citation"
                  title={'Select the type of the source. This will change the' +
                         ' details below to those needed for proper citation'}
                  options={
                     [{value: CUSTOM, text: 'Custom citation (no template)'}].concat(
                        this.state.models.map(m => ({
                           text: m.type,
                           value: m.id,
                        }))
                  )}
               />
            </Form.Field>

            <InputOrLabel
               template={this.state.template}
               value={this.state.source.title}
               onChange={this.titleChange}
               required={true}
               rows={3}
               label="Full citation"
            />

            <InputOrLabel
               template={this.state.template}
               value={this.state.source.abbrev}
               onChange={this.abbrevChange}
               required={true}
               rows={3}
               label="Short citation"
            />

            <InputOrLabel
               template={this.state.template}
               value={this.state.source.biblio}
               onChange={this.biblioChange}
               required={true}
               rows={3}
               label="Bibliography citation"
            />

            {
               Object.entries(this.state.parts).sort((a, b) => a[0].localeCompare(b[0])).map(
                  value => (
                     value[1].inTemplate ? (
                        <Form.Input
                           key={value[0]}
                           label={value[0]}
                           value={value[1].value || ''}
                           onChange={e => this.setPart(value[0], e.currentTarget.value)}
                        />) : null
                  )
               )
            }

            <ExtraDetails parts={this.state.parts} />
            <HighLevelSource />
    
            <Header dividing={true}>Research details</Header>
            <Form.Group widths="equal">
               <Form.Input
                  label="Subject date"
                  placeholder="What date is this about ?"
                  value={this.state.source.subjectDate || ''}
                  onChange={this.subjectDateChange}
                  title="The date the source is about. This isn't the date of the source itself"
               />
               <Form.Input
                  label="Subject place"
                  placeholder="What place is this about ?"
                  value={this.state.source.subjectPlace || ''}
                  onChange={this.subjectPlaceChange}
                  title="The place the source is about"
               />
               <Form.Input
                  label="Jurisdiction place"
                  placeholder="Where did you find it ?"
                  value={this.state.source.jurisdictionPlace || ''}
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
               label="Notes"
               value={this.state.source.comments || ''}
               onChange={this.commentsChange}
            />

            {
               this.state.modified && (
                  <div style={{height: '30px'}}>
                     <Button.Group floated="right">
                        <Button onClick={this.reset}>Reset</Button>
                        <Button.Or/>
                        <Button primary={true}>Save</Button>
                     </Button.Group>
                  </div>
               )
            }
         </Form>
      );
   }
}
