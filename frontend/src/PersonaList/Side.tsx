import * as React from "react";
import { Accordion, Form } from "semantic-ui-react";
import * as GP_JSON from "../Server/JSON";
import { PersonaListSettings } from "../Store/PersonaList";
import ThemeSelector from "../ThemeSelector";

interface PersonaListSideProps {
   settings: PersonaListSettings;
   onChange: (diff: Partial<PersonaListSettings>) => void;
   themeNameGet: (id: GP_JSON.ColorSchemeId) => string;
}

const PersonaListSide: React.FC<PersonaListSideProps> = props => {
   const panels = [
      {
         key: "theme",
         title: {
            content: (
               <span>
                  Theme
                  <small>
                     colors: {props.themeNameGet(props.settings.colors)}
                  </small>
               </span>
            )
         },
         content: {
            content: (
               <Form>
                  <ThemeSelector
                     defaultValue={props.settings.colors}
                     fieldName="colors"
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
export default PersonaListSide;
