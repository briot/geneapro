import * as React from "react";
import {
   Button,
   Dropdown,
   DropdownProps,
   Form,
   Header,
   InputOnChangeData,
   TextAreaProps
} from "semantic-ui-react";
import {
   Source,
   CitationPart,
   CitationPartSet,
   createNewSource
} from "../Store/Source";
import {
   CitationModel,
   fetchCitationModelsFromServer,
   fetchModelTemplateFromServer
} from "../Server/Citation";
import CitationTemplate from "../Store/CitationTemplate";

const CUSTOM = "custom";

/***********************************************************************
 * InputOrLabel
 ***********************************************************************/

interface InputOrLabelProps {
   template?: CitationTemplate; // field is readonly if this is undefined
   value: string;
   label: string;
   required?: boolean;
   rows?: number;
   onChange?: (
      e: Event | React.SyntheticEvent,
      data: InputOnChangeData | TextAreaProps
   ) => void;
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
         <span style={{ marginLeft: "15px" }}>
            {props.template.html(props.value)}
         </span>
      </Form.Field>
   );
}

/***********************************************************************
 * ExtraDetails
 ***********************************************************************/

interface ExtraDetailsProps {
   inTemplate: Set<string>;
   source: Source;
}
function ExtraDetails(props: ExtraDetailsProps) {
   const toDiscard: [string, CitationPart][] = Object.entries(
      props.source.parts
   )
      .filter(value => !props.inTemplate.has(value[0]) && value[1].value)
      .sort((a, b) => a[0].localeCompare(b[0]));

   if (toDiscard.length === 0) {
      return null;
   }

   return (
      <div>
         <Header dividing={true}>Extra details</Header>
         <p>
            The following information is stored in the database, but not needed
            for the citation templates (perhaps imported from GEDCOM). It will
            be discarded when you save.
         </p>
         {toDiscard.map((value: [string, CitationPart]) => (
            <Form.Input
               key={value[0]}
               label={value[0]}
               disabled={true}
               defaultValue={value[1].value}
            />
         ))}
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
   source: Source | undefined;
   onTitleChanged?: (html: JSX.Element | JSX.Element[]) => void;
}

interface CitationState {
   source: Source; // modified state
   models: CitationModel[];
   template?: CitationTemplate;
   templateParts: Set<string>; // which parts are defined in the template
   modified: boolean;
}

export default class SourceCitationi extends React.PureComponent<
   CitationProps,
   CitationState
> {
   public manualTitle: string = "";
   public manualAbbrev: string = "";
   public manualBiblio: string = "";
   // manual citations entered by the user (or original citation).
   // These are used in case the user goes back to a CUSTOM model

   public state: CitationState = {
      modified: false,
      models: [],
      templateParts: new Set(),
      source: createNewSource(CUSTOM) // updated in componentDidMount
   };

   public async componentDidMount() {
      let s = await fetchCitationModelsFromServer();
      s.source_types.sort((a, b) => a.type.localeCompare(b.type));
      this.setState({ models: s.source_types, source: this._updateSource() });
   }

   public componentDidUpdate(old: CitationProps) {
      if (!old.source) {
         if (this.props.source) {
            this.setState({ source: this._updateSource() });
         }
      } else if (!this.props.source) {
         if (old.source) {
            this.setState({ source: this._updateSource() });
         }
      } else if (this.props.source.id !== old.source.id) {
         this.setState({ source: this._updateSource() });
      }
   }

   public reset = () => {
      const source = this.props.source
         ? { ...this.props.source }
         : createNewSource(CUSTOM);

      this.manualTitle = source.title || "";
      this.manualAbbrev = source.abbrev || "";
      this.manualBiblio = source.biblio || "";

      this.setState({ modified: false });
      this.fetchModel(source, source.medium || CUSTOM);
   };

   /**
    * Take into account a change in the original source. Return the
    * update to be performed on this.state
    */
   protected _updateSource(): Source {
      if (!this.props.source) {
         let source = createNewSource(CUSTOM);
         this.manualTitle = "";
         this.manualAbbrev = "";
         this.manualBiblio = "";
         this.fetchModel(source, CUSTOM);
         return source;
      } else {
         this.manualTitle = this.props.source.title;
         this.manualAbbrev = this.props.source.abbrev;
         this.manualBiblio = this.props.source.biblio;
         const newMedium = this.props.source.medium || CUSTOM;
         this.fetchModel(this.props.source, newMedium);
         return { ...this.props.source, medium: newMedium };
      }
   }

   /**
    * Recompute the title/abbrev/biblio citation based on template and parts
    */
   public recomputeCitation(
      templates: undefined | CitationTemplate,
      parts: CitationPartSet
   ) {
      let title = this.manualTitle;
      let abbrev = this.manualAbbrev;
      let biblio = this.manualBiblio;

      if (templates !== undefined) {
         let simple: { [key: string]: string } = {};
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

      return { title: title, abbrev: abbrev, biblio: biblio };
   }

   public fetchModel(source: Source, model: string) {
      if (model === CUSTOM) {
         this.setState({
            template: undefined,
            templateParts: new Set(),
            source: {
               ...source,
               medium: model,
               parts: { ...source.parts },
               ...this.recomputeCitation(undefined, {})
            }
         });
      } else {
         fetchModelTemplateFromServer(model).then(d => {
            this.setState({
               template: d,
               templateParts: d.getParts(),
               source: {
                  ...source,
                  parts: { ...source.parts },
                  medium: model,
                  ...this.recomputeCitation(d, source.parts)
               }
            });
         });
      }
   }

   public setPart = (key: string, value: string) => {
      const p: CitationPartSet = {
         ...this.state.source.parts,
         [key]: { name: key, value: value, fromHigh: false }
      };
      this.setState({
         ...this.state,
         modified: true,
         source: {
            ...this.state.source,
            parts: p,
            ...this.recomputeCitation(this.state.template, p)
         }
      });
   };

   public mediumChange = (
      e: Event | React.SyntheticEvent,
      data: DropdownProps
   ) => {
      this.setState({ modified: true });
      this.fetchModel(this.state.source, "" + data.value || CUSTOM);
   };

   public commentsChange = (
      e: Event | React.SyntheticEvent,
      data: TextAreaProps
   ) => {
      this.setState({
         source: { ...this.state.source, comments: "" + data.value },
         modified: true
      });
   };

   public titleChange = (
      e: Event | React.SyntheticEvent,
      data: TextAreaProps | InputOnChangeData
   ) => {
      this.manualTitle = "" + data.value;

      if (this.props.onTitleChanged) {
         this.props.onTitleChanged(<span>{this.manualTitle}</span>);
      }
      this.setState({
         source: { ...this.state.source, title: this.manualTitle },
         modified: true
      });
   };

   public abbrevChange = (
      e: Event | React.SyntheticEvent,
      data: TextAreaProps | InputOnChangeData
   ) => {
      this.manualAbbrev = "" + data.value;
      this.setState({
         source: { ...this.state.source, abbrev: this.manualAbbrev },
         modified: true
      });
   };

   public biblioChange = (
      e: Event | React.SyntheticEvent,
      data: TextAreaProps | InputOnChangeData
   ) => {
      this.manualBiblio = "" + data.value;
      this.setState({
         source: { ...this.state.source, biblio: this.manualBiblio },
         modified: true
      });
   };

   public jurisdictionPlaceChange = (
      e: React.SyntheticEvent<HTMLInputElement>
   ) => {
      this.setState({
         source: {
            ...this.state.source,
            jurisdictionPlace: e.currentTarget.value
         },
         modified: true
      });
   };

   public subjectPlaceChange = (e: React.SyntheticEvent<HTMLInputElement>) => {
      this.setState({
         source: { ...this.state.source, subjectPlace: e.currentTarget.value },
         modified: true
      });
   };

   public subjectDateChange = (e: React.SyntheticEvent<HTMLInputElement>) => {
      this.setState({
         source: { ...this.state.source, subjectDate: e.currentTarget.value },
         modified: true
      });
   };

   public render() {
      const s = this.state.source;
      return (
         <Form size="small">
            <Header dividing={true}>Citation details</Header>

            <Form.Field>
               <label>Template</label>
               <Dropdown
                  value={s.medium || CUSTOM}
                  onChange={this.mediumChange}
                  search={true}
                  fluid={true}
                  selection={true}
                  placeholder="Template for citation"
                  title={
                     "Select the type of the source. This will change the" +
                     " details below to those needed for proper citation"
                  }
                  options={[
                     { value: CUSTOM, text: "Custom citation (no template)" }
                  ].concat(
                     this.state.models.map(m => ({
                        text: m.type,
                        value: m.id
                     }))
                  )}
               />
            </Form.Field>

            <InputOrLabel
               template={this.state.template}
               value={s.title}
               onChange={this.titleChange}
               required={true}
               rows={3}
               label="Full citation"
            />

            <InputOrLabel
               template={this.state.template}
               value={s.abbrev}
               onChange={this.abbrevChange}
               required={true}
               rows={3}
               label="Short citation"
            />

            <InputOrLabel
               template={this.state.template}
               value={s.biblio}
               onChange={this.biblioChange}
               required={true}
               rows={3}
               label="Bibliography citation"
            />

            {Object.entries(s.parts)
               .sort((a, b) => a[0].localeCompare(b[0]))
               .map(value =>
                  // Show parts that are in the template
                  this.state.templateParts.has(value[0]) ? (
                     <Form.Input
                        key={value[0]}
                        label={value[0]}
                        value={value[1].value || ""}
                        onChange={e =>
                           this.setPart(value[0], e.currentTarget.value)
                        }
                     />
                  ) : null
               )}

            <ExtraDetails inTemplate={this.state.templateParts} source={s} />
            <HighLevelSource />

            <Header dividing={true}>Research details</Header>
            <Form.Group widths="equal">
               <Form.Input
                  label="Subject date"
                  placeholder="What date is this about ?"
                  value={s.subjectDate || ""}
                  onChange={this.subjectDateChange}
                  title="The date the source is about. This isn't the date of the source itself"
               />
               <Form.Input
                  label="Subject place"
                  placeholder="What place is this about ?"
                  value={s.subjectPlace || ""}
                  onChange={this.subjectPlaceChange}
                  title="The place the source is about"
               />
               <Form.Input
                  label="Jurisdiction place"
                  placeholder="Where did you find it ?"
                  value={s.jurisdictionPlace || ""}
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
               value={s.comments || ""}
               onChange={this.commentsChange}
            />

            {this.state.modified && (
               <div style={{ height: "30px" }}>
                  <Button.Group floated="right">
                     <Button onClick={this.reset}>Reset</Button>
                     <Button.Or />
                     <Button primary={true}>Save</Button>
                  </Button.Group>
               </div>
            )}
         </Form>
      );
   }
}
