import * as React from 'react';
import { connect } from 'react-redux';
import { AppState } from './Store/State';
import { PersonSet } from './Store/Person';
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
            <i>This is a mockup</i>
            <Header size="medium">Recently viewed persons</Header>
            <Card.Group>
               <PersonCard name="Emmanuel Briot" dates="1975-" image="/assets/Emmanuel_Briot.jpg"/>
               <PersonCard name="John Smith" dates="~January, 1580-June 21, 1631" image="/assets/John_Smith.jpg" />
               <PersonCard name="Louis XIII" image="/assets/Louis_XIII.jpg" />
               <PersonCard name="Josephine" image="invalid"/>
               <PersonCard name="Napoléon Bonaparte" dates="August 15, 1769-May 5, 1821" />
               <PersonCard name="" dates="~60 Years Ago-Last Thursday" image="/assets/unknown-image.png" />
               <PersonCard name="" dates="12 BC-34 AD" />
               <PersonCard name="" image="/assets/unknown-image.png" />
               <PersonCard name="" image="invalid" />
               <PersonCard name="" dates="" image="" />
               <PersonCard name="" />
            </Card.Group>
            <Header size="medium">Recently viewed places</Header>
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
   persons: PersonSet;
   decujusid?: number;
}

const DashboardPageConnected = (props: DashboardProps) => {
   const decujus = props.decujusid === undefined ? undefined : props.persons[props.decujusid];
   document.title = 'Dashboard';
   return <Page main={<Dashboard/>} decujus={decujus} />;
};

interface PropsFromRoute {
   decujusId?: string;
}

const DashboardPage = connect(
   (state: AppState, ownProps: RouteComponentProps<PropsFromRoute>) => ({
      persons: state.persons,
      decujus: Number(ownProps.match.params.decujusId) || DEFAULT_DECUJUS,
   }),
)(DashboardPageConnected);

export default DashboardPage;
