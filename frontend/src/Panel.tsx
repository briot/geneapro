import * as React from "react";
import { Header } from "semantic-ui-react";
import "./Panel.css";

interface PanelProps {
   header?: string | React.ReactNode;
   className?: string;
}

const Panel: React.FC<PanelProps> = p => {
   const header = p.header && (
      <Header size="medium" block={true} attached={true}>
         {p.header}
      </Header>
   );

   return (
      <div>
         {header}
         <div className={"Panel " + p.className}>
            {p.children}
         </div>
      </div>
   );
}
export default Panel;
