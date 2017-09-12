import * as React from 'react';
import { Grid } from 'semantic-ui-react';
import Navbar from './Navbar';
import SideNav from './SideNav';

interface PageProps {
   leftSide?: JSX.Element[] | JSX.Element;
   main: JSX.Element;
   decujus?: number;
}
const Page = (props: PageProps) => {
   // put the first column in second position, so that on mobile it goes
   // below. Since we reverse columns it still shows on the left
   return (
      <div className="App">
         <Navbar decujus={props.decujus} />
         <Grid style={{ marginTop: '0px' }} stackable={true} >
            <Grid.Row reversed="computer">
               <Grid.Column width={13}>
                  {props.main}
               </Grid.Column>

               <Grid.Column width={3} className="Side">
                  {props.leftSide}
                  <SideNav decujus={props.decujus} />
               </Grid.Column>
            </Grid.Row>
         </Grid>
      </div>
   );
};
export default Page;
