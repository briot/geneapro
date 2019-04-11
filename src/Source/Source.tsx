import * as React from "react";
import { Accordion, Icon, Segment, Step } from "semantic-ui-react";
import { GPDispatch, MetadataDict } from "../Store/State";
import { Source } from "../Store/Source";
import SourceCitation from "../Source/Citation";
import SourceMedias from "../Source/Media";
import SourceAssertions from "../Source/Assertions";
import { useSourceAssertsCount } from "../Server/Source";
import "./Source.css";

interface SourceProps {
   dispatch: GPDispatch;
   metadata: MetadataDict;
   source: Source | undefined;
}

const SourceDetails: React.FC<SourceProps> = (p) => {
   const [title, setTitle] = React.useState<JSX.Element|JSX.Element[]>([]);
   const [showCitation, setShowCitation] = React.useState(
      !p.source || !p.source.title);
   const [showMedia, setShowMedia] = React.useState(true);
   const [showAsserts, setShowAsserts] = React.useState(true);

   const toggleCitation = React.useCallback(
      () => setShowCitation(c => !c), []);
   const toggleMedia = React.useCallback(
      () => setShowMedia(c => !c), []);
   const toggleAsserts = React.useCallback(
      () => setShowAsserts(c => !c), []);
   const onTitleChanged = React.useCallback(
      (title: JSX.Element | JSX.Element[]) => setTitle(title), []);

   const s = p.source;
   const assertCount = useSourceAssertsCount(s ? s.id : undefined);
   const step: number = !s ? 1 : 2;
   const step1Complete = !!s;
   const step2Complete = s && s.medias && s.medias.length > 0;
   const step3Complete = assertCount > 0;
   const step4Complete = step3Complete; //  ??? Incorrect
   const allStepsComplete =
      step1Complete && step2Complete && step3Complete && step4Complete;

   return (
      <div className="Source">
         <Segment attached={true} className="pageTitle preLine">
            {title || <span>&nbsp;</span>}
         </Segment>

         {!allStepsComplete && (
            <Segment attached={true}>
               {step > 4 ? null : (
                  <Step.Group
                     ordered={true}
                     stackable="tablet"
                     fluid={true}
                     size="mini"
                  >
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
               )}
            </Segment>
         )}

         <Accordion styled={true} fluid={true} style={{ marginTop: "10px" }}>
            <Accordion.Title
               active={showCitation}
               onClick={toggleCitation}
            >
               <Icon name="dropdown" />
               Citation
            </Accordion.Title>
            <Accordion.Content active={showCitation}>
               <SourceCitation
                  source={s}
                  onTitleChanged={onTitleChanged}
               />
            </Accordion.Content>
         </Accordion>

         {s ? (
            <Accordion
               styled={true}
               fluid={true}
               style={{ marginTop: "10px" }}
            >
               <Accordion.Title
                  active={showMedia}
                  onClick={toggleMedia}
               >
                  <Icon name="dropdown" />
                  Media
               </Accordion.Title>
               <Accordion.Content active={showMedia}>
                  <SourceMedias source={s} />
               </Accordion.Content>
            </Accordion>
         ) : null}

         {s ? (
            <Accordion
               styled={true}
               fluid={true}
               style={{ marginTop: "10px" }}
               className="pageContent"
            >
               <Accordion.Title
                  active={showAsserts}
                  onClick={toggleAsserts}
               >
                  <Icon name="dropdown" />
                  Assertions
               </Accordion.Title>
               <Accordion.Content active={showAsserts}>
                  <SourceAssertions
                     dispatch={p.dispatch}
                     filter={""}
                     metadata={p.metadata}
                     source={s}
                  />
               </Accordion.Content>
            </Accordion>
         ) : null}
      </div>
   );
}
export default SourceDetails;
