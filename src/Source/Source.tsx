import * as React from 'react';
import { Accordion, Icon, Segment, Step } from 'semantic-ui-react';
import { Source } from '../Store/Source';
import SourceCitation from '../Source/Citation';
import SourceMedias from '../Source/Media';
import SourceAssertions from '../Source/Assertions';
import './Source.css';

interface SourceProps {
   source: Source|undefined;
}

interface SourceState {
   title?: JSX.Element | JSX.Element[];
   showCitation: boolean;
   showMedia: boolean;
   showAssertions: boolean;
}

export default class SourceDetails extends React.PureComponent<SourceProps, SourceState> {
   state: SourceState = {
      title: undefined,
      showCitation: false,
      showMedia: true,
      showAssertions: true,
   };

   static getDerivedStateFromProps(nextProps: SourceProps, prevState: SourceState) {
      return {...prevState,
              showCitation: !nextProps.source || !nextProps.source.title,
      };
   }

   toggleCitation = (e: React.SyntheticEvent<HTMLElement>, props2: {active: boolean}) => {
      const show = !this.state.showCitation;
      this.setState({showCitation: show});
   }

   toggleMedia = (e: React.SyntheticEvent<HTMLElement>, props2: {active: boolean}) => {
      const show = !this.state.showMedia;
      this.setState({showMedia: show});
   }

   toggleAssertions = (e: React.SyntheticEvent<HTMLElement>, props2: {active: boolean}) => {
      const show = !this.state.showAssertions;
      this.setState({showAssertions: show});
   }

   onTitleChanged = (title: JSX.Element | JSX.Element[]) => {
      this.setState({title: title});
   }

   render() {
      const s = this.props.source;
      const step: number = !s ? 1 : 2;
      const step1Complete = !!s;
      const step2Complete = s && s.medias && s.medias.length > 0;
      const step3Complete = s && s.asserts && s.asserts.get().length > 0;
      const step4Complete = step3Complete;  //  ??? Incorrect
      const allStepsComplete =
         step1Complete && step2Complete && step3Complete && step4Complete;

      return (
         <div className="Source">
            <Segment attached={true} className="pageTitle">
               {this.state.title || <span>&nbsp;</span>}
            </Segment>

            {
               !allStepsComplete &&
               <Segment attached={true}>
                  {step > 4 ?
                     null :
                     <Step.Group ordered={true} stackable="tablet" fluid={true} size="mini">
                        <Step
                           completed={step1Complete}
                           active={!s}
                           title="Citing"
                           description="the source"
                        />
                        <Step
                           completed={step2Complete}
                           active={s && !s.medias}
                           disabled={!s}
                           title="Capturing"
                           description="images, sounds, videos"
                        />
                        <Step
                           completed={step3Complete}
                           active={step === 3}
                           disabled={!s}
                           title="Identifying"
                           description="persons and events"
                        />
                        <Step
                           completed={step4Complete}
                           active={step === 4}
                           disabled={!s}
                           title="Asserting"
                           description="what the source says"
                        />
                     </Step.Group>
                  }
               </Segment>
            }

            <Accordion
               styled={true}
               fluid={true}
               style={{marginTop: '10px'}}
            >
               <Accordion.Title
                   active={this.state.showCitation}
                   onClick={this.toggleCitation}
               >
                  <Icon name="dropdown" />
                  Citation
               </Accordion.Title>
               <Accordion.Content
                  active={this.state.showCitation}
               >
                  <SourceCitation
                     source={s}
                     onTitleChanged={this.onTitleChanged}
                  />
               </Accordion.Content>
            </Accordion>

            {
               s ? (
                  <Accordion
                     styled={true}
                     fluid={true}
                     style={{marginTop: '10px'}}
                  >
                     <Accordion.Title
                         active={this.state.showMedia}
                         onClick={this.toggleMedia}
                     >
                        <Icon name="dropdown" />
                        Media
                     </Accordion.Title>
                     <Accordion.Content
                         active={this.state.showMedia}
                     >
                        <SourceMedias source={s} />
                     </Accordion.Content>
                  </Accordion>
               ) : null
            }

            {
               s ? (
                  <Accordion
                     styled={true}
                     fluid={true}
                     style={{marginTop: '10px'}}
                     className="pageContent"
                  >
                     <Accordion.Title
                         active={this.state.showAssertions}
                         onClick={this.toggleAssertions}
                     >
                        <Icon name="dropdown" />
                        Assertions
                     </Accordion.Title>
                     <Accordion.Content
                         active={this.state.showAssertions}
                     >
                        <SourceAssertions source={s} />
                     </Accordion.Content>
                  </Accordion>
               ) : null
            }
         </div>
      );
   }
}
