import * as React from 'react';
import { Accordion, Icon, Segment, Step } from 'semantic-ui-react';
import { Source } from '../Store/Source';
import SourceCitation from '../Source/Citation';
import './Source.css';

interface SourceProps {
   source: Source;
}

export default function SourceDetails(props: SourceProps) {
   const s: Source = props.source;

   const step: number = !s.title ? 1 :
      2;

   return (
      <div className="Source">
         <Segment attached={true} className="pageTitle">
            {s.title}
         </Segment>
         <Segment attached={true}>
            {step > 4 ?
               null :
               <Step.Group ordered={true} stackable="tablet" fluid={true} size="mini">
                  <Step
                     completed={step > 1}
                     active={step === 1}
                     title="Citing"
                     description="the source"
                  />
                  <Step
                     completed={step > 2}
                     active={step === 2}
                     title="Capturing"
                     description="images, sounds, videos"
                  />
                  <Step
                     completed={step > 3}
                     active={step === 3}
                     title="Identifying"
                     description="persons and events"
                  />
                  <Step
                     completed={step > 4}
                     active={step === 4}
                     title="Asserting"
                     description="what the source says"
                  />
               </Step.Group>
            }
         </Segment>

         <Accordion
            styled={true}
            fluid={true}
            defaultActiveIndex={step === 1 ? 0 : -1}
            style={{marginTop: '10px'}}
         >
            <Accordion.Title>
               <Icon name="dropdown" />
               Citation
            </Accordion.Title>
            <Accordion.Content>
               <SourceCitation source={s} />
            </Accordion.Content>
         </Accordion>

         <Accordion
            styled={true}
            fluid={true}
            defaultActiveIndex={step === 2 ? 0 : -1}
            style={{marginTop: '10px'}}
         >
            <Accordion.Title>
               <Icon name="dropdown" />
               Media
            </Accordion.Title>
            <Accordion.Content>
               media
            </Accordion.Content>
         </Accordion>

         <Accordion
            styled={true}
            fluid={true}
            defaultActiveIndex={step === 3 ? 0 : -1}
            style={{marginTop: '10px'}}
         >
            <Accordion.Title>
               <Icon name="dropdown" />
               Assertions
            </Accordion.Title>
            <Accordion.Content>
               assertions
            </Accordion.Content>
         </Accordion>
      </div>
   );
}
