import * as React from 'react';
import { Link } from 'react-router-dom';
import { Container, Menu, Search } from 'semantic-ui-react';
import { Person } from './Store/Person';
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
   decujus?: Person;
}

export default function Navbar(props: NavbarProps) {
  return (
     <Menu attached={true} inverted={true}>
        <Container>
           <Menu.Item as="span" header={true}>
              <Link to={'/' + (props.decujus ? props.decujus.id : '')}>
                 <Logo />
              </Link>
           </Menu.Item>
           <Menu.Item position="right">
              <Search placeholder="search" />
           </Menu.Item>
        </Container>
     </Menu>
  );
}
