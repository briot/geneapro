import * as React from "react";
import { Link } from "react-router-dom";
import { Grid, Header } from "semantic-ui-react";
import Panel from "./Panel";
import { Navbar } from "./Navbar";
import SideNav from "./SideNav";
import "./Logo.css";

const Logo = (p: {decujusid?: number}) => {
  return (
     <Link to={"/" + p.decujusid}>
        <div className="Logo">
           <div>Geneaprove</div>
           <span className="tagline">Evidence your genealogy</span>
        </div>
     </Link>
  );
}

interface PageProps {
   leftSide?: JSX.Element[] | JSX.Element;
   main: JSX.Element;
   decujusid?: number;
}
const Page: React.FC<PageProps> = (p) => {
   // put the first column in second position, so that on mobile it goes
   // below. Since we reverse columns it still shows on the left
   return (
      <div className="App">
         <Logo decujusid={p.decujusid} />

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

                  <SideNav decujus={p.decujusid} />
               </Grid.Column>
            </Grid.Row>
         </Grid>
      </div>
   );
};
export default Page;
