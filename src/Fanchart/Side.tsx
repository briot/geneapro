import * as React from "react";
import { Accordion, Form } from "semantic-ui-react";
import * as GP_JSON from "../Server/JSON";
import { FanchartSettings } from "../Store/Fanchart";
import { CheckboxField, SliderField } from "../Forms";
import ThemeSelector from "../ThemeSelector";
import { MAXGEN } from '../Store/ColorTheme';

interface FanchartSideProps {
   settings: FanchartSettings;
   onChange: (diff: Partial<FanchartSettings>) => void;
   themeNameGet: (id: GP_JSON.ColorSchemeId) => string;
}

export default function FanchartSide(props: FanchartSideProps) {
   const panels = [
      {
         key: "generations",
         title: {
            content: (
               <span>
                  Generations
                  <small>
                     ancestors: {props.settings.ancestors}, descendants:{" "}
                     {props.settings.descendants},
                     {props.settings.showMissingPersons
                        ? ", show missing persons"
                        : ""}
                     {props.settings.showSourcedEvents
                        ? ", sourced events"
                        : ""}
                     {props.settings.showMarriages ? ", show marriages" : ""}
                  </small>
               </span>
            )
         },
         content: {
            content: (
               <Form size="tiny">
                  <SliderField
                     defaultValue={props.settings.ancestors}
                     label="Ancestors"
                     fieldName="ancestors"
                     min={0}
                     max={MAXGEN}
                     onChange={props.onChange}
                     debounce={250}
                  />

                  <SliderField
                     defaultValue={props.settings.descendants}
                     label="Descendants"
                     fieldName="descendants"
                     min={0}
                     max={MAXGEN}
                     onChange={props.onChange}
                     debounce={250}
                  />

                  <CheckboxField
                     defaultChecked={props.settings.showMissingPersons}
                     label="Show missing persons"
                     fieldName="showMissingPersons"
                     onChange={props.onChange}
                  />

                  <CheckboxField
                     defaultChecked={props.settings.showMarriages}
                     label="Show marriages"
                     fieldName="showMarriages"
                     onChange={props.onChange}
                  />

                  <CheckboxField
                     defaultChecked={props.settings.showSourcedEvents}
                     label="Sourced Events"
                     fieldName="showSourcedEvents"
                     onChange={props.onChange}
                  />
               </Form>
            )
         }
      },
      {
         key: "theme",
         title: {
            content: (
               <span>
                  Theme
                  <small>
                     colors: {props.themeNameGet(props.settings.colors)},&nbsp;
                     separators: {props.themeNameGet(props.settings.sepColors)}
                     ,&nbsp; angle: {props.settings.fullAngle},&nbsp; padding:{" "}
                     {props.settings.anglePad}
                  </small>
                  <small>
                     text threshold: {props.settings.straightTextThreshold}
                     {props.settings.readableText ? ", text kept readable" : ""}
                  </small>
                  <small>
                     {props.settings.gapBetweenGens
                        ? "gap between generations"
                        : ""}
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
                     defaultValue={props.settings.fullAngle}
                     label="Angle"
                     fieldName="fullAngle"
                     min={90}
                     max={360}
                     onChange={props.onChange}
                     debounce={100}
                  />

                  <ThemeSelector
                     defaultValue={props.settings.sepColors}
                     label="Separator colors"
                     fieldName="sepColors"
                     onChange={props.onChange}
                  />

                  <SliderField
                     defaultValue={props.settings.anglePad}
                     label="Padding"
                     fieldName="anglePad"
                     min={0}
                     max={60}
                     onChange={props.onChange}
                     debounce={100}
                  />

                  <SliderField
                     defaultValue={props.settings.straightTextThreshold}
                     label="Text along axis after generation"
                     fieldName="straightTextThreshold"
                     min={1}
                     max={props.settings.ancestors + 1}
                     onChange={props.onChange}
                     debounce={100}
                  />

                  <CheckboxField
                     defaultChecked={props.settings.readableText}
                     label="Orient text to keep it readable"
                     fieldName="readableText"
                     onChange={props.onChange}
                  />

                  <CheckboxField
                     defaultChecked={props.settings.gapBetweenGens}
                     label="Gap between generations"
                     fieldName="gapBetweenGens"
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
