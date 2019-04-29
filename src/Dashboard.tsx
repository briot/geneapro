import * as React from "react";
import { connect } from "react-redux";
import { AppState } from "./Store/State";
import { Person } from "./Store/Person";
import { Place, } from "./Store/Place";
import { extractYear } from "./Store/Event";
import { RouteComponentProps } from "react-router";
import {
   Card,
   Header,
   Icon,
   SemanticICONS,
   Statistic
} from "semantic-ui-react";
import { fetchSourcesCount } from './Server/Source';
import { fetchPlacesFromServer, fetchPlacesCount } from './Server/Place';
import { fetchPersonsCount, fetchPersonsFromServer } from './Server/Person';
import { HistoryKind, HistoryItem } from "./Store/History";
import { PersonaLink, PlaceLink } from "./Links";
import Page from "./Page";

const MAX_PER_CATEGORY = 9;

interface PersonCardProps {
   person: Person;
}

const PersonCard: React.FC<PersonCardProps> = (p) => {
   let img: JSX.Element | undefined;
   window.console.log('MANU dashboard.personcard=', p.person);
//   if (p.person.asserts) {
//      for (const a of p.person.asserts.get()) {
//         if (
//            a instanceof P2C &&
//            a.characteristic.medias &&
//            a.characteristic.medias[0]
//         ) {
//            img = (
//               <Image
//                  floated="right"
//                  size="tiny"
//                  src={a.characteristic.medias[0].url}
//               />
//            );
//            break;
//         }
//      }
//   }

   return (
      <Card>
         <Card.Content>
            {img}
            <Card.Header>
               <PersonaLink person={p.person} hideIcon={true} />
            </Card.Header>
            <Card.Meta>
               {extractYear(p.person.birthISODate)} -
               {extractYear(p.person.deathISODate)}
            </Card.Meta>
         </Card.Content>
      </Card>
   );
}

interface RecentPersonsProps {
   items: HistoryItem[];
}
const RecentPersons: React.FC<RecentPersonsProps> = (p) => {
   const [persons, setPersons] = React.useState<Person[]>([]);
   React.useEffect(
      () => {
         const ids = p.items
            .filter(h => h.kind === HistoryKind.PERSON)
            .slice(0, MAX_PER_CATEGORY)
            .map(f => f.id);
         if (ids.length) {
            fetchPersonsFromServer({ids}).then(setPersons);
         }
      },
      [p.items]
   );

   return (
      <>
         <Header size="medium">Recently viewed persons</Header>
         <Card.Group>
            {
               persons.map(h => (
                  <PersonCard key={h.id} person={h} />
               ))
            }
         </Card.Group>
      </>
   );
}

interface PlaceCardProps {
   place: Place;
}
const PlaceCard: React.FC<PlaceCardProps> = (p) => {
   return (
      <Card>
         <Card.Content>
            <Card.Header>
               <PlaceLink place={p.place} />
            </Card.Header>
         </Card.Content>
      </Card>
   );
}

interface RecentPlaces {
   items: HistoryItem[];
}
const RecentPlaces: React.FC<RecentPlaces> = (p) => {
   const [places, setPlaces] = React.useState<Place[]>([]);
   React.useEffect(
      () => {
         const items = p.items
               .filter(h => h.kind === HistoryKind.PLACE)
               .slice(0, MAX_PER_CATEGORY)
               .map(s => s.id);
         if (items.length) {
            fetchPlacesFromServer({ ids: items })
               .then((a: Place[]) => setPlaces(a));
         }
      },
      [p.items]
   );

   return (
      <>
         <Header size="medium">Recently viewed places</Header>
         <Card.Group>
            {
               places.map(h => (
                  <PlaceCard key={h.id} place={h} />
               ))
            }
         </Card.Group>
      </>
   );
}

interface StatCardProps {
   value: number;
   label: string;
   icon?: SemanticICONS;
   descr?: string;
}
const StatCard: React.FC<StatCardProps> = (p) => {
   return (
      <Card>
         <Card.Content>
            <Statistic>
               <Statistic.Value>
                  {p.icon && <Icon name={p.icon} size="small" />}
                  {p.value}
               </Statistic.Value>
               <Statistic.Label>{p.label}</Statistic.Label>
            </Statistic>
            <Card.Description>{p.descr}</Card.Description>
         </Card.Content>
      </Card>
   );
}

const AllStats: React.FC<{}> = () => {
   const [personsCount, setPersonsCount] = React.useState(0);
   const [placesCount, setPlacesCount] = React.useState(0);
   const [sourcesCount, setSourcesCount] = React.useState(0);

   React.useEffect(
      () => {
         fetchSourcesCount({filter: ''}).then(setSourcesCount);
         fetchPlacesCount({filter: ''}).then(setPlacesCount);
         fetchPersonsCount({filter: ''}).then(setPersonsCount);
      },
      []
   );

   return (
      <>
         <Header size="medium">Statistics</Header>
         <Card.Group>
            <StatCard
               value={personsCount}
               label="Persons"
               icon="user"
            />
            <StatCard
               value={placesCount}
               label="Places"
               icon="globe"
            />
            <StatCard
               value={sourcesCount}
               label="Sources"
               icon="book"
            />
         </Card.Group>
      </>
   );
};

interface PropsFromRoute {
   id?: string;
}
interface DashboardProps extends RouteComponentProps<PropsFromRoute> {
   items: HistoryItem[];
}
const Dashboard: React.FC<DashboardProps> = (p) => {
   const decujusid = Number(p.match.params.id) || undefined;
   document.title = "Dashboard";
   return (
      <Page
         main={
            <div>
               <RecentPersons {...p} />
               <RecentPlaces {...p} />
               <AllStats />
            </div>
         }
         decujusid={decujusid}
      />
   );
};

export default connect(
   (state: AppState, props: RouteComponentProps<PropsFromRoute>) => ({
      ...props,
      items: state.history,
   }),
)(Dashboard);
