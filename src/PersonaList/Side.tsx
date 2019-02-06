import * as React from 'react';
import { Accordion, Form } from 'semantic-ui-react';
import { ColorSchemeNames } from '../Store/Pedigree';
import { PersonaListSettings } from '../Store/PersonaList';
import { CheckboxField, SliderField, SelectField } from '../Forms';

interface PersonaListSideProps {
   settings: PersonaListSettings;
   onChange: (diff: Partial<PersonaListSettings>) => void;
}

export default function PersonaListSide(props: PersonaListSideProps) {
   const panels = [
      {
         key: 'theme',
         title: {
            content: (
               <span>
                  Theme
                  <small>
                     colors: {ColorSchemeNames[props.settings.colors]}
                  </small>
               </span>
            )
         },
         content: {
            content: (
               <Form>
                  <SelectField
                     defaultValue={props.settings.colors}
                     label="Colors"
                     fieldName="colors"
                     names={ColorSchemeNames}
                     onChange={props.onChange}
                  />
               </Form>
            )
         }
      }

   ];

   return (
      <Accordion styled={true} exclusive={false} fluid={true} panels={panels} />
   );
}
