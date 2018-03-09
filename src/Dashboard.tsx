import * as React from 'react';
import { connect } from 'react-redux';
import { AppState } from './Store/State';
import { Person, personPlaceholder } from './Store/Person';
import { RouteComponentProps } from 'react-router';
import { Card, Header, Icon, Image, SemanticICONS, Statistic } from 'semantic-ui-react';
import Page from './Page';

const DEFAULT_DECUJUS = 1;

interface PersonCardProps {
   image?: string;  // url to the image
   name:   string; // Name of the person
   dates?: string;  // dob-dod
}

class PersonCard extends React.PureComponent<PersonCardProps, {}> {
   render() {
      const img = 
         this.props.image &&
         <Image floated="right" size="tiny" src={this.props.image} />;

      return (
         <Card>
            <Card.Content>
               {img}
               <Card.Header>{this.props.name}</Card.Header>
               <Card.Meta>{this.props.dates}</Card.Meta>
               <Card.Description>
                  This person ...
               </Card.Description>
            </Card.Content>
            <Card.Content extra={true}>
               <Icon name="user" /> 3 Children
            </Card.Content>
         </Card>
      );
   }
}

interface PlaceCardProps {
   image?: string;  // url to the image
   name:   string; // Name of the person
   loc?: string;  // Full location
}

class PlaceCard extends React.PureComponent<PlaceCardProps, {}> {
   render() {
      const img = 
         this.props.image &&
         <Image floated="right" size="tiny" src={this.props.image} />;

      return (
         <Card>
            <Card.Content>
               {img}
               <Card.Header>{this.props.name}</Card.Header>
               <Card.Meta>{this.props.loc}</Card.Meta>
            </Card.Content>
         </Card>
      );
   }
}

interface StatCardProps {
   value: string;
   label: string;
   icon?: SemanticICONS;
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
            </Card.Content>
         </Card>
      );
   }
}

class Dashboard extends React.PureComponent<{}, {}> {
   render() {
      return (
         <div>
            <Header size="medium">Recently views persons</Header>
            <Card.Group>
               <PersonCard name="Emmanuel Briot" dates="1975-" />
               <PersonCard name="Roland Briot" dates="1950-2008" image="/assets/roland.jpg" />
               <PersonCard name="Jacques Le Texier" image="/assets/jacques_LE_TEXIER.jpg" />
               <PersonCard name="Marie-Helene Greard" image="invalid"/>
            </Card.Group>
            <Header size="medium">Recently views places</Header>
            <Card.Group>
               <PlaceCard name="Villeurbanne" loc="Rhone, France" />
               <PlaceCard name="Londres" loc="UK" />
            </Card.Group>
            <Header size="medium">Statistics</Header>
            <Card.Group>
               <StatCard value="1213" label="Persons in database" icon="user" />
               <StatCard value="910" label="Places in database" icon="globe" />
            </Card.Group>
         </div>
      );
   }
}

interface DashboardProps {
   decujus?: Person;
}

const DashboardPageConnected = (props: DashboardProps) => {
   document.title = 'Dashboard';
   return <Page main={<Dashboard/>} decujus={props.decujus} />;
};

interface PropsFromRoute {
   decujusId?: string;
}

const DashboardPage = connect(
   (state: AppState, ownProps: RouteComponentProps<PropsFromRoute>) => {
      const id = Number(ownProps.match.params.decujusId) || DEFAULT_DECUJUS;
      return {
         decujus: state.persons[id] || personPlaceholder(id),
      };
   },
)(DashboardPageConnected);

export default DashboardPage;
