import * as React from 'react';
import { Accordion, Form, Header } from 'semantic-ui-react';
import Panel from '../Panel';
import { QuiltsSettings } from '../Store/Quilts';
import { SliderField } from '../Forms';

interface QuiltsSideProps {
   settings: QuiltsSettings;
   onChange: (diff: Partial<QuiltsSettings>) => void;
}

export default function QuiltsSide(props: QuiltsSideProps) {
   const panels = [
      {
         title: {
            key: 'theme',
            content: (
               <span>
                  Theme
                  <small>
                  ancestors: {props.settings.ancestors}
                  </small>
               </span>
            )
         },
         content: {
            key: 'themeContent',
            content: (
               <Form size="tiny">
                  <SliderField
                     defaultValue={props.settings.ancestors}
                     label="Ancestors"
                     fieldName="ancestors"
                     min={1}
                     max={60}
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
