import * as React from "react";
import { useSelector } from "react-redux";
import { Grid, Header } from "semantic-ui-react";
import { AppState, lastVisitedPerson } from "./Store/State";
import Panel from "./Panel";
import { Navbar } from "./Navbar";
import SideNav from "./SideNav";

interface PageProps {
   decujusid?: number;
   leftSide?: JSX.Element[] | JSX.Element;
   main: JSX.Element;
}

const Page: React.FC<PageProps> = (p) => {
   const default_decujusid = useSelector(
      (s: AppState) => lastVisitedPerson(s));
   const history = useSelector((s: AppState) => s.history);

   const decujusid = p.decujusid === undefined
      ? default_decujusid : p.decujusid;

   // put the first column in second position, so that on mobile it goes
   // below. Since we reverse columns it still shows on the left
   return (
      <div className="App">
         <Navbar />
         <Grid stackable={true} >
            <Grid.Row reversed="computer">
               <Grid.Column width={13} >
                  {p.main}
               </Grid.Column>

               <Grid.Column width={3} className="Side">
                  {p.leftSide && (
                     <Panel className="settings">
                        <Header size="small" sub={true}>
                           Settings
                        </Header>
                        {p.leftSide}
                     </Panel>
                  )}

                  <SideNav decujusid={decujusid} history={history} />
               </Grid.Column>
            </Grid.Row>
         </Grid>
      </div>
   );
};

export default Page;
