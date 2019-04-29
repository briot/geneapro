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
import { URL } from "./Links";
import { DndData, useDraggable, DropTarget } from "./Draggable";
import Panel from "./Panel";
import "./SideNav.css";

const LINK_STYLE = { color: "inherit" };

interface SideNavItemProps {
   icon?: SemanticICONS;
   label: React.ReactNode;
   disabled?: boolean;
   dropLink?: URL;
   dndData?: DndData;
   to?: string;
}
const SideNavItem: React.FC<SideNavItemProps> = (p) => {
   const [dragprops] = useDraggable({
      data: p.dndData,
      className: 'hideOverflow'
   });
   return (
      <List.Item disabled={p.disabled} {...dragprops} >
         <List.Icon name={p.icon} />
         <List.Content title={p.label}>
            <DropTarget redirectUrl={p.dropLink} >
               {
                  p.to ?
                     <Link
                        draggable={false}
                        to={p.to}
                        style={LINK_STYLE}
                     >
                        {p.label}
                     </Link>
                    : p.label
               }
            </DropTarget>
         </List.Content>
      </List.Item>
   );
};

const SideNavItemPerson: React.FC<{person?: Person}> = (p) =>
   p.person ? <SideNavItem
      dndData={{kind: 'person', id: p.person.id}}
      icon="user"
      label={personDisplay(p.person)}
      to={URL.persona.url(p.person.id)}
   /> : null;

const SideNavItemPlace: React.FC<{place?: Place}> = (p) =>
   p.place ? <SideNavItem
      dndData={{kind: 'place', id: p.place.id}}
      icon="globe"
      label={p.place.name}
      to={URL.place.url(p.place.id)}
   /> : null;

const SideNavItemSource: React.FC<{source?: Source}> = (p) =>
   p.source ? <SideNavItem
      dndData={{kind: 'source', id: p.source.id}}
      icon="book"
      label={p.source.abbrev}
      to={URL.source.url(p.source.id)}
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
               to={URL.dashboard.url(p.decujusid)}
               dropLink={URL.dashboard}
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
            <SideNavItem
               icon="pie chart"
               label="Stats"
               to={URL.stats.url(p.decujusid)}
               dropLink={URL.stats}
            />

            {
               false &&
               <>
                  <SideNavItem
                     icon="image"
                     label="Media Manager"
                     disabled={true}
                     to="/media"
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
               </>
            }

            <SideNavCategory
               key="category"
               label={personDisplay(persons[p.decujusid])}
               linkTo={URL.persona.url(p.decujusid)}
            />
            <SideNavItem
               key="pedigree"
               icon="sitemap"
               label="Pedigree"
               to={URL.pedigree.url(p.decujusid)}
               dropLink={URL.pedigree}
            />
            <SideNavItem
               key="fanchart"
               icon="wifi"
               label="Fan chart"
               to={URL.fanchart.url(p.decujusid)}
               dropLink={URL.fanchart}
            />
            <SideNavItem
               key="asterisk"
               icon="asterisk"
               label="Radial chart"
               to={URL.radial.url(p.decujusid)}
               dropLink={URL.radial}
            />
            <SideNavItem
               key="quilts"
               icon="server"
               label="Quilts"
               to={URL.quilts.url(p.decujusid)}
               dropLink={URL.quilts}
            />

            <SideNavCategory label="History" />
            {hist}
         </List>
      </Panel>
   );
}
export default SideNav;

