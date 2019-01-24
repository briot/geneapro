import * as React from 'react';
import { Accordion, Form } from 'semantic-ui-react';
import { SliderField } from '../Forms';
import { StatsSettings } from '../Store/Stats';

interface StatsSideProps {
   settings: StatsSettings;
   onChange: (diff: Partial<StatsSettings>) => void;

}

export default function StatsSide(props: StatsSideProps) {
   const panels = [
      {
         title: {
            key: 'stats',
            content: (
               <span>
                  Stats
                  <small>
                     {props.settings.max_age ?
                         'max age:' + props.settings.max_age :
                         'ignore persons with no explicit death'
                     }
                   </small>
               </span>
            )
         },
         content: {
            key: 'statsContent',
            content: (
               <Form size="tiny">
                  <SliderField
                     defaultValue={props.settings.max_age}
                     label="Max age"
                     fieldName="max_age"
                     min={0}
                     max={200}
                     onChange={props.onChange}
                     doc={'If 0, ignore people with no explicit death date,' +
                          'otherwise assume they do not live longer than' +
                          'this value'}
                  />
               </Form>
            )
         }
      }];

   return (
      <Accordion styled={true} exclusive={false} fluid={true} panels={panels} />
   );
}
