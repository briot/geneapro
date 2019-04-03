import * as React from "react";
import { Button, Container, Menu, Search } from "semantic-ui-react";
import { Link }  from "react-router-dom";

export const Navbar = () => {
   return (
      <Menu attached={true} inverted={true} size="mini" >
         <Container fluid={true}>
            <Menu.Item position="right">
                <Link to="/source/-1">
                   <Button
                      primary={true}
                      size="mini"
                      icon="add"
                      content="source"
                   />
                </Link>
               <Search placeholder="search" />
            </Menu.Item>
         </Container>
      </Menu>
   );
}
