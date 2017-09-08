import * as React from 'react';
import { Link } from 'react-router-dom';
import { Container, Menu, Search } from 'semantic-ui-react';
import './Logo.css';

class Logo extends React.PureComponent<{}, {}> {
   render() {
      return (
         <div className="Logo">
            <div>Geneaprove</div>
            <span className="tagline">Evidence your genealogy</span>
         </div>
      );
   }
}

interface NavbarProps {
   decujus: number;
}

export default class Navbar extends React.PureComponent<NavbarProps, {}> {
   render() {
      return (
         <Menu attached={true} inverted={true}>
            <Container>
               <Menu.Item as="span" header={true}>
                  <Link to={'/' + this.props.decujus}><Logo /></Link>
               </Menu.Item>
               <Menu.Item position="right">
                  <Search placeholder="search" />
               </Menu.Item>
            </Container>
         </Menu>
      );
   }
}
