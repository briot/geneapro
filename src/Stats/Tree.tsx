import * as React from 'react';
import { Card, Icon, Statistic } from 'semantic-ui-react';
import { PersonaLink } from '../Links';

interface StatsTreeProps {
   decujus: number;
   totalInDatabase: number;
   totalInTree: number;
   fatherAncestors: number;
   motherAncestors: number;
}

export default function StatsTree(props: StatsTreeProps) {
   /*
    *  For whole population, for males only, for females only
       Includes population count, average, deviance, min, max,
       Age at first marriage:
       Age at first child:
       Age at last child:
       Age at death:
       #Name tags:
       #Birth group tags:
       #Death group tags:
       #Marriage group tags:
       #Divorce group tags:
       #Child tags:
       Sons:
       Daughters:
    */
   return (
      <div>
      <Card.Group>
         <Card>
            <Card.Content>
               <Statistic size="small">
                  <Statistic.Value>
                     <Icon name="user" size="small"/>
                     {props.totalInDatabase}
                  </Statistic.Value>
                  <Statistic.Label>In database</Statistic.Label>
               </Statistic>
            </Card.Content>
         </Card>

         <Card>
            <Card.Content>
               <Statistic size="small">
                  <Statistic.Value>
                     <Icon name="user" size="small"/>
                     {props.totalInTree}
                  </Statistic.Value>
                  <Statistic.Label>
                     In tree:&nbsp;
                     <PersonaLink id={props.decujus} />
                  </Statistic.Label>
               </Statistic>
            </Card.Content>
         </Card>

         <Card>
            <Card.Content>
               <Statistic size="small">
                  <Statistic.Value>
                     <Icon name="user" size="small"/>
                     {props.fatherAncestors}
                  </Statistic.Value>
                  <Statistic.Label>Father's ancestors</Statistic.Label>
               </Statistic>
            </Card.Content>
         </Card>

         <Card>
            <Card.Content>
               <Statistic size="small">
                  <Statistic.Value>
                     <Icon name="user" size="small"/>
                     {props.motherAncestors}
                  </Statistic.Value>
                  <Statistic.Label>Mother's ancestors</Statistic.Label>
               </Statistic>
            </Card.Content>
         </Card>
      </Card.Group>

      </div>
   );
}
