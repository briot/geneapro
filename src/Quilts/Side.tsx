import * as React from "react";
import { Accordion, Form } from "semantic-ui-react";
import { QuiltsSettings } from "../Store/Quilts";
import { CheckboxField, SliderField } from "../Forms";

interface QuiltsSideProps {
   settings: QuiltsSettings;
   onChange: (diff: Partial<QuiltsSettings>) => void;
}

export default function QuiltsSide(props: QuiltsSideProps) {
   const panels = [
      {
         key: "theme",
         title: {
            content: (
               <span>
                  Theme
                  <small>
                     ancestors: {props.settings.ancestors},&nbsp; restrict:{" "}
                     {props.settings.decujusTreeOnly ? "yes" : "no"}
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
                     min={1}
                     max={60}
                     onChange={props.onChange}
                  />

                  <CheckboxField
                     defaultChecked={props.settings.decujusTreeOnly}
                     label="Restrict to tree"
                     fieldName="decujusTreeOnly"
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
