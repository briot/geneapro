import * as React from 'react';
import { connect } from 'react-redux';
import { Header, List, SemanticICONS } from 'semantic-ui-react';
import { Link } from 'react-router-dom';
import { AppState } from './Store/State';
import { Person, PersonSet, personDisplay } from './Store/Person';
import { HistoryItem, HistoryKind, lastVisitedPerson } from './Store/History';
import { urlPersona, urlSource, urlPlace } from './Links';
import Panel from './Panel';
import './SideNav.css';

interface SideNavItemProps {
   icon?: SemanticICONS;
   label: React.ReactNode;
   disabled?: boolean;
   to?: string;
}

const LINK_STYLE = {color: 'inherit'};

class SideNavItem extends React.PureComponent<SideNavItemProps> {
   render() {
      const link =
         this.props.to ?
         <Link to={this.props.to} style={LINK_STYLE}>{this.props.label}</Link> :
         this.props.label;

      return (
         <List.Item disabled={this.props.disabled} className="hideOverflow">
            <List.Icon name={this.props.icon} />
            <List.Content title={this.props.label}>
               {link}
            </List.Content>
         </List.Item>
      );
   }
}

interface SideNavCategoryProps {
   label: React.ReactNode;
   linkTo?: string;
}

function SideNavCategory(props: SideNavCategoryProps) {
   return (
      <Header size="small" sub={true} className="hideOverflow">
         {
            props.linkTo ? (
               <Link to={props.linkTo} style={LINK_STYLE}>{props.label}</Link>
            ) : props.label
         }
      </Header>
   );
}

interface SideNavProps {
   decujus?: Person;
   history: HistoryItem[];
   persons: PersonSet;
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
               label={kind === HistoryKind.PERSON ? personDisplay(this.props.persons[id]) || display :
                      display}
               to={kind === HistoryKind.PERSON ? urlPersona(id) :
                   kind === HistoryKind.PLACE ? urlPlace(id) :
                   kind === HistoryKind.SOURCE ? urlSource(id) :
                  '#' }
            />
         ));

      const lastVisited = lastVisitedPerson(this.props.history);
      const decujusStr: string = this.props.decujus !== undefined ?
         this.props.decujus.id.toString() :
         lastVisited !== undefined ? lastVisited.toString() :
         '';

      return (
         <Panel className="SideNav">
            <List>
               <SideNavCategory label="Views" />
               <SideNavItem
                   icon="dashboard"
                   label="Dashboard"
                   to={'/' + decujusStr}
               />
               <SideNavItem
                  icon="folder open"
                  label="Import Gedcom"
                  to="/import"
               />

               <SideNavItem
                   icon="users"
                   label="All persons"
                   to="/persona/list/"
               />
               <SideNavItem
                   icon="globe"
                   label="All places"
                   to="/place/list/"
               />
               <SideNavItem
                   icon="book"
                   label="Bibliography"
                   to="/source/list/"
               />
               <SideNavItem icon="image" label="Media Manager" disabled={true} to="/media"/>

               <SideNavItem
                   icon="pie chart"
                   label="Stats"
                   to={'/stats/' + decujusStr}
               />
               <SideNavItem icon="calendar times" label="Timeline" disabled={true} to="/timeline" />
               <SideNavItem icon="list ul" label="Ancestor Tree" disabled={true} to="/ancestortree" />
               <SideNavItem icon="address book outline" label="Family Dictionary" disabled={true} to="/familyDict" />

               {
                  this.props.decujus !== undefined && [
                     <SideNavCategory
                        key="category"
                        label={personDisplay(this.props.decujus)}
                        linkTo={urlPersona(this.props.decujus.id)}
                     />,
                     <SideNavItem
                         key="pedigree"
                         icon="sitemap"
                         label="Pedigree"
                         to={'/pedigree/' + decujusStr}
                     />,
                     <SideNavItem
                         key="fanchart"
                         icon="wifi"
                         label="Fan chart"
                         to={'/fanchart/' + decujusStr}
                     />,
                     <SideNavItem
                         key="asterisk"
                         icon="asterisk"
                         label="Radial chart"
                         to={'/radial/' + decujusStr}
                     />,
                     <SideNavItem
                         key="quilts"
                         icon="server"
                         label="Quilts"
                         to={'/quilts/' + decujusStr}
                     />
                  ]
               }

               <SideNavCategory label="History" />
               {hist}
            </List>
         </Panel>
      );
   }
}

const SideNav = connect(
   (state: AppState) => ({
      history: state.history,
      persons: state.persons,
   })
)(SideNavConnected);

export default SideNav;
