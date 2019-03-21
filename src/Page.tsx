import * as React from "react";
import { Link } from "react-router-dom";
import { Button, Grid, Header, List } from "semantic-ui-react";
import Panel from "./Panel";
import { Person } from "./Store/Person";
import Navbar from "./Navbar";
import SideNav from "./SideNav";

interface PageProps {
   leftSide?: JSX.Element[] | JSX.Element;
   main: JSX.Element;
   decujus?: Person;
}
const Page = (props: PageProps) => {
   // put the first column in second position, so that on mobile it goes
   // below. Since we reverse columns it still shows on the left
   return (
      <div className="App">
         <Navbar decujus={props.decujus} />
         <Grid style={{ marginTop: "0px" }} stackable={true}>
            <Grid.Row reversed="computer">
               <Grid.Column width={13}>{props.main}</Grid.Column>

               <Grid.Column width={3} className="Side">
                  <Panel className="SideNav">
                     <List>
                        <List.Item>
                           <List.Content>
                              <Link to="/source/-1">
                                 <Button
                                    primary={true}
                                    size="mini"
                                    icon="add"
                                    content="source"
                                 />
                              </Link>
                           </List.Content>
                        </List.Item>
                     </List>
                  </Panel>

                  {props.leftSide && (
                     <Panel className="settings">
                        <Header size="small" sub={true}>
                           Settings
                        </Header>
                        {props.leftSide}
                     </Panel>
                  )}

                  <SideNav decujus={props.decujus} />
               </Grid.Column>
            </Grid.Row>
         </Grid>
      </div>
   );
};
export default Page;
