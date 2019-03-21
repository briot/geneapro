import * as React from "react";
import { Header } from "semantic-ui-react";
import "./Panel.css";

interface PanelProps {
   header?: string | React.ReactNode;
   className?: string;
}

export default class Panel extends React.PureComponent<PanelProps, {}> {
   render() {
      const header = this.props.header && (
         <Header size="medium" block={true} attached={true}>
            {this.props.header}
         </Header>
      );

      return (
         <div>
            {header}
            <div className={"Panel " + this.props.className}>
               {this.props.children}
            </div>
         </div>
      );
   }
}
