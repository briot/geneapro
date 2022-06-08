// import * as React from "react";
import { Button, Container, Menu, Search } from "semantic-ui-react";
import { Link }  from "react-router-dom";
import "./Logo.css";

const Logo = () => {
  return (
     <Link to="/">
        <div className="Logo">
           <div>Geneaprove</div>
           <span className="tagline">Evidence your genealogy</span>
        </div>
     </Link>
  );
}

export const Navbar = () => {
   return (
      <Menu inverted={true} size="mini" >
         <Logo />
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
