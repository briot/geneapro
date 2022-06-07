import * as React from "react";
import { Accordion, Form } from "semantic-ui-react";
import { CheckboxField, SliderField } from "../Forms";
import { StatsSettings } from "../Store/Stats";

interface StatsSideProps {
   settings: StatsSettings;
   onChange: (diff: Partial<StatsSettings>) => void;
}

const StatsSide: React.FC<StatsSideProps> = props => {
   const panels = [
      {
         key: "stats",
         title: {
            content: (
               <span>
                  Stats
                  <small>
                     {props.settings.max_age
                        ? "max age:" + props.settings.max_age
                        : "ignore persons with no explicit death"}
                     , every {props.settings.bar_width} years,
                     {props.settings.show_treestats ? " show " : " hide "}
                     stats,
                     {props.settings.show_generations ? " show " : " hide "}
                     generations,
                     {props.settings.show_lifespan ? " show " : " hide "}
                     lifespan
                  </small>
               </span>
            )
         },
         content: {
            content: (
               <Form size="tiny">
                  <SliderField
                     defaultValue={props.settings.max_age}
                     label="Max age"
                     fieldName="max_age"
                     min={0}
                     max={130}
                     onChange={props.onChange}
                     doc={
                        "If 0, ignore people with no explicit death date," +
                        "otherwise assume they do not live longer than" +
                        "this value"
                     }
                  />

                  <SliderField
                     defaultValue={props.settings.bar_width}
                     label="Bar width"
                     fieldName="bar_width"
                     min={1}
                     max={80}
                     onChange={props.onChange}
                     doc='Width of bars in "age at death", in years'
                  />
                  <CheckboxField
                     defaultChecked={props.settings.show_treestats}
                     label="Show stats"
                     fieldName="show_treestats"
                     onChange={props.onChange}
                  />

                  <CheckboxField
                     defaultChecked={props.settings.show_generations}
                     label="Show generations"
                     fieldName="show_generations"
                     onChange={props.onChange}
                  />

                  <CheckboxField
                     defaultChecked={props.settings.show_lifespan}
                     label="Show lifespan"
                     fieldName="show_lifespan"
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

export default StatsSide;
