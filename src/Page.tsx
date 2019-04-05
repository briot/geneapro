import * as React from "react";
import { connect } from "react-redux";
import { Link } from "react-router-dom";
import { Grid, Header } from "semantic-ui-react";
import { AppState, lastVisitedPerson } from "./Store/State";
import Panel from "./Panel";
import { Navbar } from "./Navbar";
import SideNav from "./SideNav";
import { HistoryItem } from "./Store/History";

interface PageProps {
   decujusid?: number;
   leftSide?: JSX.Element[] | JSX.Element;
   main: JSX.Element;
}
interface ConnectedPageProps extends PageProps {
   history: HistoryItem[];
   default_decujusid: number;
}
const Page: React.FC<ConnectedPageProps> = (p) => {
   const decujusid = p.decujusid === undefined
      ? p.default_decujusid : p.decujusid;

   // put the first column in second position, so that on mobile it goes
   // below. Since we reverse columns it still shows on the left
   return (
      <div className="App">
         <Navbar />
         <Grid stackable={true} className="pagegrid">
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

                  <SideNav decujusid={decujusid} history={p.history} />
               </Grid.Column>
            </Grid.Row>
         </Grid>
      </div>
   );
};

export default connect(
   (state: AppState, p: PageProps) => ({
      default_decujusid: lastVisitedPerson(state),
      history: state.history,
   })
)(Page);
