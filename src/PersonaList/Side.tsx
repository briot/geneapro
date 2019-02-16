import * as React from 'react';
import { Accordion, Form } from 'semantic-ui-react';
import { PersonaListSettings } from '../Store/PersonaList';
import { CheckboxField, SliderField, SelectField } from '../Forms';
import ThemeSelector from '../ThemeSelector';

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
                     colors: {props.settings.colors.name}
                  </small>
               </span>
            )
         },
         content: {
            content: (
               <Form>
                  <ThemeSelector
                     defaultValue={props.settings.colors}
                     fieldName="colors"
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
