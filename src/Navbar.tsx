import * as React from "react";
import { Container, Menu, Search } from "semantic-ui-react";

export const Navbar = (p: {}) => {
   return (
      <Menu attached={true} inverted={true} size="mini" >
         <Container fluid={true} >
            <Menu.Item position="right">
               <Search placeholder="search" />
            </Menu.Item>
         </Container>
      </Menu>
   );
}
