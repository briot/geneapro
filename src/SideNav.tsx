import * as React from 'react';
import { connect } from 'react-redux';
import { Header, List } from 'semantic-ui-react';
import { Link } from 'react-router-dom';
import { AppState } from './Store/State';
import { HistoryItem, HistoryKind } from './Store/Person';
import { urlPersona } from './Links';
import Panel from './Panel';
import './SideNav.css';

interface SideNavItemProps {
   icon?: string;
   label: React.ReactNode;
   disabled?: boolean;
   to?: string;
}

class SideNavItem extends React.PureComponent<SideNavItemProps, {}> {
   render() {
      const style = {color: 'inherit'};
      const link =
         this.props.to ?
         <Link to={this.props.to} style={style}>{this.props.label}</Link> :
         this.props.label;

      return (
         <List.Item disabled={this.props.disabled}>
            <List.Icon name={this.props.icon} />
            <List.Content>
               {link}
            </List.Content>
         </List.Item>
      );
   }
}

interface SideNavCategoryProps {
   label: React.ReactNode;
}

class SideNavCategory extends React.PureComponent<SideNavCategoryProps, {}> {
   render() {
      return (
         <Header size="small" sub={true}>{this.props.label}</Header>
      );
   }
}

interface SideNavProps {
   decujus: number;
   history: HistoryItem[];
}

class SideNavConnected extends React.PureComponent<SideNavProps, {}> {
   render(): JSX.Element {
      const hist: JSX.Element[] = this.props.history.map(
         ({id, display, kind}: HistoryItem) => (
            <SideNavItem
               key={kind + ' ' + id}
               icon={kind === HistoryKind.PERSON ? 'user' : 'globe'}
               label={display}
               to={urlPersona(id)}
            />
         ));

      return (
         <Panel className="SideNav">
            <Header as="h5">Navigation</Header>
            <List>
               <SideNavItem
                   icon="dashboard"
                   label="Dashboard"
                   to={'/' + this.props.decujus}
               />
               <SideNavItem icon="folder open" label="Import Gedcom" disabled={true} to="/import"/>

               <SideNavCategory label="Lists" />
               <SideNavItem
                   icon="users"
                   label="All persons"
                   to={'/persona/list/' + this.props.decujus}
               />
               <SideNavItem icon="globe" label="All places" disabled={true} to="/place/list" />
               <SideNavItem icon="book" label="All sources" disabled={true} to="/source/list" />
               <SideNavItem icon="image" label="Media Manager" disabled={true} to="/media"/>

               <SideNavCategory label="Views" />
               <SideNavItem
                   icon="sitemap"
                   label="Pedigree"
                   to={'/pedigree/' + this.props.decujus}
               />
               <SideNavItem
                   icon="wifi"
                   label="Fan chart"
                   to={'/fanchart/' + this.props.decujus}
               />
               <SideNavItem icon="asterisk" label="Radial chart" disabled={true} to="/radial" />
               <SideNavItem icon="server" label="Quilts" disabled={true} to="/quilts" />
               <SideNavItem icon="pie chart" label="Stats" disabled={true} to="/stats" />
               <SideNavItem icon="calendar times" label="Timeline" disabled={true} to="/timeline" />
               <SideNavItem icon="list ul" label="Ancestor Tree" disabled={true} to="/ancestortree" />
               <SideNavItem icon="address book outline" label="Family Dictionary" disabled={true} to="/familyDict" />

               <SideNavCategory label="Details" />
               {hist}
            </List>
         </Panel>
      );
   }
}

const SideNav = connect(
   (state: AppState) => ({
      history: state.history,
   })
)(SideNavConnected);

export default SideNav;
