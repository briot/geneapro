import * as React from 'react';
import { Accordion, Form } from 'semantic-ui-react';
import { RadialSettings } from '../Store/Radial';
import { ColorSchemeNames } from '../Store/Pedigree';
import { SliderField, CheckboxField, SelectField } from '../Forms';

interface RadialSideProps {
   settings: RadialSettings;
   onChange: (diff: Partial<RadialSettings>) => void;
}

export default function RadialSide(props: RadialSideProps) {
   const panels = [
      {
         key: 'generations',
         title: {
            content: (
               <span>
                  Generations
                  <small>
                  {props.settings.generations > 0 ?
                     'ancestors' : 'descendants'}:&nbsp;
                  {Math.abs(props.settings.generations)}
                  </small>
               </span>
            )
         },
         content: {
            content: (
               <Form size="tiny">
                  <SliderField
                     defaultValue={props.settings.generations}
                     label="Generations"
                     fieldName="generations"
                     min={-20}
                     max={20}
                     onChange={props.onChange}
                  />
               </Form>
            )
         }
      },
      {
         key: 'theme',
         title: {
            content: (
               <span>
                  Theme
                  <small>
                     colors: {ColorSchemeNames[props.settings.colors]},&nbsp;
                     spacing: {props.settings.spacing}px,&nbsp;
                     {props.settings.showText ? 'show text' : ''}
                  </small>
               </span>
            )
         },
         content: {
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
                     defaultValue={props.settings.spacing}
                     label="Spacing"
                     fieldName="spacing"
                     min={5}
                     max={200}
                     onChange={props.onChange}
                  />
                  <CheckboxField
                     defaultChecked={props.settings.showText}
                     label="Show text"
                     fieldName="showText"
                     onChange={props.onChange}
                  />
               </Form>
            )
         }
      },
   ];
   return (
      <Accordion styled={true} exclusive={false} fluid={true} panels={panels} />
   );
}
