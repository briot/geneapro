import * as React from 'react';
import { connect } from 'react-redux';
import { AppState, DatabaseObjectsCount, GPDispatch } from './Store/State';
import { PersonSet } from './Store/Person';
import { PlaceSet } from './Store/Place';
import { P2C } from './Store/Assertion';
import { fetchCount, fetchPersonDetails, fetchPlaceDetails } from './Store/Sagas';
import { extractYear } from './Store/Event';
import { RouteComponentProps } from 'react-router';
import { Card, Header, Icon, Image, SemanticICONS, Statistic } from 'semantic-ui-react';
import { HistoryKind, HistoryItem } from './Store/History';
import { PersonaLink, PlaceLink } from './Links';
import Page from './Page';

const DEFAULT_DECUJUS = 1;
const MAX_PER_CATEGORY = 9;

interface PersonCardProps {
   id: number;
   persons: PersonSet;
   dispatch: GPDispatch;
}

class PersonCard extends React.PureComponent<PersonCardProps, {}> {
   componentDidMount() {
      this.props.dispatch(fetchPersonDetails.request({id: this.props.id}));
   }

   render() {
      const p = this.props.persons[this.props.id];
      if (!p) {
         return null;
      }

      let img: JSX.Element|undefined;
      if (p.asserts) {
         for (const a of p.asserts.get()) {
            if (a instanceof P2C
                && a.characteristic.medias
                && a.characteristic.medias[0]
            ) {
               img = <Image floated="right" size="tiny" src={a.characteristic.medias[0].url} />;
               break;
            }
         }
      }

      return (
         <Card>
            <Card.Content>
               {img}
               <Card.Header>
                  <PersonaLink id={this.props.id} hideIcon={true}/>
               </Card.Header>
               <Card.Meta>{extractYear(p.birthISODate)} - {extractYear(p.deathISODate)}</Card.Meta>
            </Card.Content>
         </Card>
      );
   }
}

function RecentPersons(props: {items: HistoryItem[], persons: PersonSet, dispatch: GPDispatch}) {
   const p = props.items.filter(
      h => h.kind === HistoryKind.PERSON).slice(0, MAX_PER_CATEGORY);
   if (!p.length) {
      return null;
   }
   return (
      <>
         <Header size="medium">Recently viewed persons</Header>
         <Card.Group>
         {p.map(h => <PersonCard key={h.id} id={h.id} {...props}/>)}
         </Card.Group>
      </>
   );
}

interface PlaceCardProps {
   id: number;
   places: PlaceSet;
   dispatch: GPDispatch;
}

class PlaceCard extends React.PureComponent<PlaceCardProps, {}> {
   componentDidMount() {
      this.props.dispatch(fetchPlaceDetails.request({id: this.props.id}));
   }

   render() {
      return (
         <Card>
            <Card.Content>
               <Card.Header>
                  <PlaceLink id={this.props.id} />
               </Card.Header>
            </Card.Content>
         </Card>
      );
   }
}

function RecentPlaces(props: {items: HistoryItem[], places: PlaceSet, dispatch: GPDispatch}) {
   const p = props.items.filter(
      h => h.kind === HistoryKind.PLACE).slice(0, MAX_PER_CATEGORY);
   if (!p.length) {
      return null;
   }
   return (
      <>
         <Header size="medium">Recently viewed places</Header>
         <Card.Group>
         {p.map(h => <PlaceCard key={h.id} id={h.id} {...props}/>)}
         </Card.Group>
      </>
   );
}

interface StatCardProps {
   value: string;
   label: string;
   icon?: SemanticICONS;
   descr?: string;
}

class StatCard extends React.PureComponent<StatCardProps, {}> {
   render() {
      const icon =
         this.props.icon &&
         (<Icon name={this.props.icon} size="small"/>);
      return (
         <Card>
            <Card.Content>
               <Statistic>
                  <Statistic.Value>{icon}{this.props.value}</Statistic.Value>
                  <Statistic.Label>{this.props.label}</Statistic.Label>
               </Statistic>
               <Card.Description>
                  {this.props.descr}
               </Card.Description>
            </Card.Content>
         </Card>
      );
   }
}

interface AllStatsProps {
   dispatch: GPDispatch;
   count: DatabaseObjectsCount|undefined;
}

class AllStats extends React.PureComponent<AllStatsProps> {
   componentDidMount() {
      this.props.dispatch(fetchCount.request({}));
   }

   render() {
      if (!this.props.count) {
         return null;
      }
      return (
         <>
            <Header size="medium">Statistics</Header>
            <Card.Group>
               <StatCard
                  value={`${this.props.count.persons}`}
                  label="Persons"
                  icon="user"
                  descr={`Using ${this.props.count.personas} basic personas`}
               />
               <StatCard value={`${this.props.count.places}`} label="Places" icon="globe" />
               <StatCard value={`${this.props.count.sources}`} label="Sources" icon="book" />
            </Card.Group>
         </>
      );
   }
}

interface PropsFromRoute {
   decujusId?: string;
}
interface ConnectedDashboardProps extends RouteComponentProps<PropsFromRoute> {
   persons: PersonSet;
   places: PlaceSet;
   count: DatabaseObjectsCount|undefined;
   decujusid: number;
   items: HistoryItem[];
   dispatch: GPDispatch;
}

class ConnectedDashboard extends React.PureComponent<ConnectedDashboardProps> {
   render() {
      const decujus = this.props.persons[this.props.decujusid];
      document.title = 'Dashboard';
      return (
         <Page
            main={
               <div>
                  <RecentPersons {...this.props} />
                  <RecentPlaces {...this.props} />
                  <AllStats {...this.props} />
               </div>
            }
            decujus={decujus}
         />
      );
   }
}

const DashboardPage = connect(
   (state: AppState, props: RouteComponentProps<PropsFromRoute>) => ({
      ...props,
      persons: state.persons,
      places: state.places,
      items: state.history,
      count: state.count,
      decujusid: Number(props.match.params.decujusId) || DEFAULT_DECUJUS,
   }),
   (dispatch: GPDispatch) => ({
      dispatch,
   }),
)(ConnectedDashboard);
export default DashboardPage;
