import * as React from "react";
import { Accordion, Form } from "semantic-ui-react";
import * as GP_JSON from "../Server/JSON";
import {
   LayoutSchemeNames,
   LinkStyleNames,
   PedigreeSettings
} from "../Store/Pedigree";
import { CheckboxField, SliderField, SelectField } from "../Forms";
import ThemeSelector from "../ThemeSelector";

interface PedigreeSideProps {
   settings: PedigreeSettings;
   onChange: (diff: Partial<PedigreeSettings>) => void;
   themeNameGet: (id: GP_JSON.ColorSchemeId) => string;
}

export default function PedigreeSide(props: PedigreeSideProps) {
   const panels = [
      {
         key: "generations",
         title: {
            content: (
               <span>
                  Generations
                  <small>
                     ancestors: {props.settings.ancestors},&nbsp; descendants:{" "}
                     {props.settings.descendants}
                     {props.settings.showMarriages ? ", marriages " : ""}
                     {props.settings.showSourcedEvents
                        ? ", sourced events"
                        : ""}
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
                     max={20}
                     onChange={props.onChange}
                  />

                  <SliderField
                     defaultValue={props.settings.descendants}
                     label="Descendants"
                     fieldName="descendants"
                     min={0}
                     max={20}
                     onChange={props.onChange}
                  />

                  <CheckboxField
                     defaultChecked={props.settings.showSourcedEvents}
                     label="Sourced Events"
                     fieldName="showSourcedEvents"
                     onChange={props.onChange}
                  />

                  <CheckboxField
                     defaultChecked={props.settings.showMarriages}
                     label="Show Marriages"
                     fieldName="showMarriages"
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
                     {props.settings.showUnknown ? "Expanded" : "Compact"}
                     ,&nbsp; layout: {LayoutSchemeNames[props.settings.layout]}
                     ,&nbsp; links: {LinkStyleNames[props.settings.links]}
                  </small>
                  <small>
                     size: {props.settings.sameSize ? "constant" : "decreasing"}
                     ,&nbsp; colors: {props.themeNameGet(props.settings.colors)}
                  </small>
               </span>
            )
         },
         content: {
            content: (
               <Form size="tiny">
                  <SelectField
                     defaultValue={props.settings.layout}
                     label="Layout"
                     fieldName="layout"
                     names={LayoutSchemeNames}
                     onChange={props.onChange}
                  />

                  <SelectField
                     defaultValue={props.settings.links}
                     label="Links"
                     fieldName="links"
                     names={LinkStyleNames}
                     onChange={props.onChange}
                  />

                  <ThemeSelector
                     defaultValue={props.settings.colors}
                     fieldName="colors"
                     onChange={props.onChange}
                  />

                  <SliderField
                     defaultValue={props.settings.horizSpacing}
                     label="Spacing between generations"
                     fieldName="horizSpacing"
                     min={0}
                     max={200}
                     onChange={props.onChange}
                  />

                  <SliderField
                     defaultValue={props.settings.vertPadding}
                     label="Spacing between persons"
                     fieldName="vertPadding"
                     min={0}
                     max={30}
                     onChange={props.onChange}
                  />

                  <CheckboxField
                     defaultChecked={props.settings.showUnknown}
                     label="Show boxes for unknown persons"
                     fieldName="showUnknown"
                     onChange={props.onChange}
                  />

                  <CheckboxField
                     defaultChecked={props.settings.sameSize}
                     label="Same size"
                     fieldName="sameSize"
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
