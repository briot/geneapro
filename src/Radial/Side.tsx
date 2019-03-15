import * as React from 'react';
import { Accordion, Form } from 'semantic-ui-react';
import * as GP_JSON from '../Server/JSON';
import { RadialSettings } from '../Store/Radial';
import { SliderField, CheckboxField } from '../Forms';
import ThemeSelector from '../ThemeSelector';

interface RadialSideProps {
   settings: RadialSettings;
   onChange: (diff: Partial<RadialSettings>) => void;
   themeNameGet: (id: GP_JSON.ColorSchemeId) => string;
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
                     colors: {props.themeNameGet(props.settings.colors)},&nbsp;
                     spacing: {props.settings.spacing}px
                     {props.settings.showText ? ', show text' : ''}
                     {props.settings.sameStyleForText ?
                           ', same color for text' : ''}
                  </small>
               </span>
            )
         },
         content: {
            content: (
               <Form size="tiny">
                  <ThemeSelector
                     defaultValue={props.settings.colors}
                     fieldName="colors"
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
                  <CheckboxField
                     defaultChecked={props.settings.sameStyleForText}
                     label="Same color for text"
                     fieldName="sameStyleForText"
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
