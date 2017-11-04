import * as React from 'react';
import { Accordion, Form, Header } from 'semantic-ui-react';
import Panel from '../Panel';
import { LayoutSchemeNames, LinkStyleNames, ColorSchemeNames,
         PedigreeSettings } from '../Store/Pedigree';
import { CheckboxField, SliderField, SelectField } from '../Forms';

interface PedigreeSideProps {
   settings: PedigreeSettings;
   onChange: (diff: Partial<PedigreeSettings>) => void;
}

export default function PedigreeSide(props: PedigreeSideProps) {
   const panels = [
      {
         title: {
            key: 'generations',
            content: (
               <span>
                  Generations
                  <small>
                     ancestors: {props.settings.ancestors},&nbsp;
                     descendants: {props.settings.descendants}
                     {props.settings.showMarriages ? ', marriages ' : ''}
                     {props.settings.showSourcedEvents ? ', sourced events' : ''}
                  </small>
               </span>
            )
         },
         content: {
            key: 'generationsContent',
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

                  <SliderField
                     defaultValue={props.settings.descendants}
                     label="Descendants"
                     fieldName="descendants"
                     min={0}
                     max={12}
                     onChange={props.onChange}
                  />

                  <CheckboxField
                     defaultChecked={props.settings.showSourcedEvents}
                     label="Sourced Events"
                     fieldName="showSourcedEvents"
                     onChange={props.onChange}
                  />

                  <CheckboxField
                     defaultChecked={props.settings.showMarriages}
                     label="Show Marriages"
                     fieldName="showMarriages"
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
                     layout: {LayoutSchemeNames[props.settings.layout]},&nbsp;
                     links: {LinkStyleNames[props.settings.links]}
                  </small>
                  <small>
                     size: {props.settings.sameSize ? 'constant' : 'decreasing'},&nbsp;
                     colors: {ColorSchemeNames[props.settings.colors]}
                  </small>
               </span>
            )
         },
         content: {
            key: 'themeContent',
            content: (
               <Form size="tiny">
                  <SelectField
                     defaultValue={props.settings.layout}
                     label="Layout"
                     fieldName="layout"
                     names={LayoutSchemeNames}
                     onChange={props.onChange}
                  />

                  <SelectField
                     defaultValue={props.settings.links}
                     label="Links"
                     fieldName="links"
                     names={LinkStyleNames}
                     onChange={props.onChange}
                  />

                  <SelectField
                     defaultValue={props.settings.colors}
                     label="Colors"
                     fieldName="colors"
                     names={ColorSchemeNames}
                     onChange={props.onChange}
                  />

                  <SliderField
                     defaultValue={props.settings.horizSpacing}
                     label="Spacing between generations"
                     fieldName="horizSpacing"
                     min={0}
                     max={200}
                     onChange={props.onChange}
                  />

                  <SliderField
                     defaultValue={props.settings.vertPadding}
                     label="Spacing between persons"
                     fieldName="vertPadding"
                     min={0}
                     max={30}
                     onChange={props.onChange}
                  />

                  <CheckboxField
                     defaultChecked={props.settings.sameSize}
                     label="Same size"
                     fieldName="sameSize"
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
