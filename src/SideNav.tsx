import * as React from "react";
import { Header, List, SemanticICONS } from "semantic-ui-react";
import { Link } from "react-router-dom";
import { Person, personDisplay } from "./Store/Person";
import { Place } from './Store/Place';
import { Source } from './Store/Source';
import {
   useHistoryPersons,
   useHistoryPlaces,
   useHistorySources
} from './History';
import { HistoryItem, HistoryKind } from "./Store/History";
import { urlPersona, urlSource, urlPlace } from "./Links";
import Panel from "./Panel";
import "./SideNav.css";

const LINK_STYLE = { color: "inherit" };

interface SideNavItemProps {
   icon?: SemanticICONS;
   label: React.ReactNode;
   disabled?: boolean;
   to?: string;
}
const SideNavItem: React.FC<SideNavItemProps> = (p) => {
   return (
      <List.Item disabled={p.disabled} className="hideOverflow">
         <List.Icon name={p.icon} />
         <List.Content title={p.label}>
            {
               p.to ?
                  <Link to={p.to} style={LINK_STYLE}>{p.label}</Link>
                 : p.label
            }
         </List.Content>
      </List.Item>
   );
};

const SideNavItemPerson: React.FC<{person?: Person}> = (p) =>
   p.person ? <SideNavItem
      icon="user"
      label={personDisplay(p.person)}
      to={urlPersona(p.person.id)}
   /> : null;

const SideNavItemPlace: React.FC<{place?: Place}> = (p) =>
   p.place ? <SideNavItem
      icon="globe"
      label={p.place.name}
      to={urlPlace(p.place.id)}
   /> : null;

const SideNavItemSource: React.FC<{source?: Source}> = (p) =>
   p.source ? <SideNavItem
      icon="book"
      label={p.source.abbrev}
      to={urlSource(p.source.id)}
   /> : null;

interface SideNavCategoryProps {
   label: React.ReactNode;
   linkTo?: string;
}
const SideNavCategory: React.FC<SideNavCategoryProps> = (p) => {
   return (
      <Header size="small" sub={true} className="hideOverflow">
         {
            p.linkTo ?
               <Link to={p.linkTo} style={LINK_STYLE}>{p.label} </Link>
              : p.label
         }
      </Header>
   );
};

interface SideNavProps {
   decujusid: number;
   history: HistoryItem[];
}
const SideNav: React.FC<SideNavProps> = (p) => {
   const persons = useHistoryPersons(p.history);
   const places = useHistoryPlaces(p.history);
   const sources = useHistorySources(p.history);
   const hist = p.history.map(
      ({ id, kind }: HistoryItem) => (
         kind === HistoryKind.PERSON
         ? <SideNavItemPerson person={persons[id]} key={`P${id}`} />
         : kind === HistoryKind.PLACE
         ? <SideNavItemPlace place={places[id]} key={`L${id}`} />
         : kind === HistoryKind.SOURCE
         ? <SideNavItemSource source={sources[id]} key={`S${id}`} />
         : null
      ));

   return (
      <Panel className="SideNav">
         <List>
            <SideNavCategory label="Views" />
            <SideNavItem
               icon="dashboard"
               label="Dashboard"
               to={`/${p.decujusid}`}
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
            <SideNavItem icon="globe" label="All places" to="/place/list/" />
            <SideNavItem
               icon="book"
               label="Bibliography"
               to="/source/list/"
            />
            <SideNavItem
               icon="image"
               label="Media Manager"
               disabled={true}
               to="/media"
            />

            <SideNavItem
               icon="pie chart"
               label="Stats"
               to={`/stats/${p.decujusid}`}
            />
            <SideNavItem
               icon="calendar times"
               label="Timeline"
               disabled={true}
               to="/timeline"
            />
            <SideNavItem
               icon="list ul"
               label="Ancestor Tree"
               disabled={true}
               to="/ancestortree"
            />
            <SideNavItem
               icon="address book outline"
               label="Family Dictionary"
               disabled={true}
               to="/familyDict"
            />

            <SideNavCategory
               key="category"
               label={personDisplay(persons[p.decujusid])}
               linkTo={urlPersona(p.decujusid)}
            />
            <SideNavItem
               key="pedigree"
               icon="sitemap"
               label="Pedigree"
               to={`/pedigree/${p.decujusid}`}
            />
            <SideNavItem
               key="fanchart"
               icon="wifi"
               label="Fan chart"
               to={`/fanchart/${p.decujusid}`}
            />
            <SideNavItem
               key="asterisk"
               icon="asterisk"
               label="Radial chart"
               to={`/radial/${p.decujusid}`}
            />
            <SideNavItem
               key="quilts"
               icon="server"
               label="Quilts"
               to={`/quilts/${p.decujusid}`}
            />

            <SideNavCategory label="History" />
            {hist}
         </List>
      </Panel>
   );
}
export default SideNav;

