import * as React from 'react';
import { Accordion, Form, Header } from 'semantic-ui-react';
import Panel from '../Panel';
import { FanchartSettings } from '../Store/Fanchart';
import { ColorSchemeNames } from '../Store/Pedigree';
import { CheckboxField, SliderField, SelectField } from '../Forms';

interface FanchartSideProps {
   settings: FanchartSettings;
   onChange: (diff: Partial<FanchartSettings>) => void;
}

export default function FanchartSide(props: FanchartSideProps) {
   const panels = [
      {
         title: {
            key: 'generations',
            content: (
               <span>
                  Generations
                  <small>
                     ancestors: {props.settings.ancestors}
                     {props.settings.showMissingPersons ? ', show missing persons' : ''}
                     {props.settings.showSourcedEvents ? ', sourced events' : ''}
                     {props.settings.showMarriages ? ', show marriages' : ''}
                  </small>
               </span>
            )
         },
         content: {
            key: 'generationsC',
            content: (
               <Form size="tiny">
                  <SliderField
                     defaultValue={props.settings.ancestors}
                     label="Ancestors"
                     fieldName="ancestors"
                     min={0}
                     max={12}
                     onChange={props.onChange}
                  />

                  <CheckboxField
                     defaultChecked={props.settings.showMissingPersons}
                     label="Show missing persons"
                     fieldName="showMissingPersons"
                     onChange={props.onChange}
                  />

                  <CheckboxField
                     defaultChecked={props.settings.showMarriages}
                     label="Show marriages"
                     fieldName="showMarriages"
                     onChange={props.onChange}
                  />

                  <CheckboxField
                     defaultChecked={props.settings.showSourcedEvents}
                     label="Sourced Events"
                     fieldName="showSourcedEvents"
                     onChange={props.onChange}
                  />

               </Form>
            )
         }
      },
      {
         title: {
            key: 'theme',
            content: (
               <span>
                  Theme
                  <small>
                     colors: {ColorSchemeNames[props.settings.colors]},&nbsp;
                     separators: {ColorSchemeNames[props.settings.sepColors]},&nbsp;
                     angle: {props.settings.fullAngle},&nbsp;
                     padding: {props.settings.anglePad}
                  </small>
                  <small>
                     text threshold: {props.settings.straightTextThreshold}
                     {props.settings.readableText ? ', text kept readable' : ''}
                  </small>
                  <small>
                     {props.settings.gapBetweenGens ? 'gap between generations' : ''}
                  </small>
               </span>
            )
         },
         content: {
            key: 'themeC',
            content: (
               <Form size="tiny">
                  <SelectField
                     defaultValue={props.settings.colors}
                     label="Colors"
                     fieldName="colors"
                     names={ColorSchemeNames}
                     onChange={props.onChange}
                  />

                  <SliderField
                     defaultValue={props.settings.fullAngle}
                     label="Angle"
                     fieldName="fullAngle"
                     min={90}
                     max={360}
                     onChange={props.onChange}
                  />

                  <SelectField
                     defaultValue={props.settings.sepColors}
                     label="Separator colors"
                     fieldName="sepColors"
                     names={ColorSchemeNames}
                     onChange={props.onChange}
                  />

                  <SliderField
                     defaultValue={props.settings.anglePad}
                     label="Padding"
                     fieldName="anglePad"
                     min={0}
                     max={60}
                     onChange={props.onChange}
                  />

                  <SliderField
                     defaultValue={props.settings.straightTextThreshold}
                     label="Text along axis after generation"
                     fieldName="straightTextThreshold"
                     min={1}
                     max={props.settings.ancestors + 1}
                     onChange={props.onChange}
                  />

                  <CheckboxField
                     defaultChecked={props.settings.readableText}
                     label="Orient text to keep it readable"
                     fieldName="readableText"
                     onChange={props.onChange}
                  />

                  <CheckboxField
                     defaultChecked={props.settings.gapBetweenGens}
                     label="Gap between generations"
                     fieldName="gapBetweenGens"
                     onChange={props.onChange}
                  />
               </Form>
            )
         }
      }
   ];

   return (
      <Panel className="settings">
         <Header as="h5">Settings</Header>
         <Accordion styled={true} exclusive={false} fluid={true} panels={panels} />
      </Panel>
   );
}
