import * as React from 'react';
import { connect } from 'react-redux';
import { Header, List, SemanticICONS } from 'semantic-ui-react';
import { Link } from 'react-router-dom';
import { AppState } from './Store/State';
import { HistoryItem, HistoryKind } from './Store/History';
import { urlPersona, urlSource, urlPlace } from './Links';
import Panel from './Panel';
import './SideNav.css';

interface SideNavItemProps {
   icon?: SemanticICONS;
   label: React.ReactNode;
   disabled?: boolean;
   to?: string;
}

class SideNavItem extends React.PureComponent<SideNavItemProps> {
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

class SideNavCategory extends React.PureComponent<SideNavCategoryProps> {
   render() {
      return (
         <Header size="small" sub={true}>{this.props.label}</Header>
      );
   }
}

interface SideNavProps {
   decujus?: number;
   history: HistoryItem[];
}

class SideNavConnected extends React.PureComponent<SideNavProps> {
   render(): JSX.Element {
      const hist: JSX.Element[] = this.props.history.map(
         ({id, display, kind}: HistoryItem) => (
            <SideNavItem
               key={kind + ' ' + id}
               icon={kind === HistoryKind.PERSON ? 'user' :
                     kind === HistoryKind.PLACE ? 'globe' :
                     kind === HistoryKind.SOURCE ? 'book' :
                     undefined}
               label={display}
               to={kind === HistoryKind.PERSON ? urlPersona(id) :
                   kind === HistoryKind.PLACE ? urlPlace(id) :
                   kind === HistoryKind.SOURCE ? urlSource(id) :
                  '#' }
            />
         ));

      const decujus: string = this.props.decujus === undefined ?
         '' : this.props.decujus.toString();

      return (
         <Panel className="SideNav">
            <List>
               <SideNavCategory label="Navigation" />
               <SideNavItem
                   icon="dashboard"
                   label="Dashboard"
                   to={'/' + this.props.decujus}
               />
               <SideNavItem
                  icon="folder open"
                  label="Import Gedcom"
                  to={'/import/' + this.props.decujus}
               />

               <SideNavCategory label="Lists" />
               <SideNavItem
                   icon="users"
                   label="All persons"
                   to={'/persona/list/' + decujus}
               />
               <SideNavItem
                   icon="globe"
                   label="All places"
                   to={'/place/list/' + decujus}
               />
               <SideNavItem
                   icon="book"
                   label="All sources"
                   to={'/source/list/' + decujus}
               />
               <SideNavItem icon="image" label="Media Manager" disabled={true} to="/media"/>

               <SideNavCategory label="Views" />
               <SideNavItem
                   icon="sitemap"
                   label="Pedigree"
                   disabled={this.props.decujus === undefined}
                   to={'/pedigree/' + decujus}
               />
               <SideNavItem
                   icon="wifi"
                   label="Fan chart"
                   disabled={this.props.decujus === undefined}
                   to={'/fanchart/' + decujus}
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
