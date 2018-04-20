import 'semantic-ui-css/semantic.min.css';
import './App.css';

import * as React from 'react';
import { Provider } from 'react-redux';
import { BrowserRouter, Route, Switch } from 'react-router-dom';
import DashboardPage from './Dashboard';
import FanchartPage from './Fanchart/Page';
import ImportPage from './Import/Page';
import PedigreePage from './Pedigree/Page';
import PersonaPage from './Persona/Page';
import PersonaList from './PersonaList';
import PlacePage from './Place/Page';
import PlaceList from './PlaceList';
import QuiltsPage from './Quilts/Page';
import RadialPage from './Radial/Page';
import SourcePage from './Source/Page';
import SourceList from './SourceList';
import StatsPage from './Stats/Page';
import { setPersist, store } from './Store/Store';

class MainAppState {
   public rehydrated: boolean;
}

export default class App extends React.PureComponent<{}, MainAppState> {
   state: MainAppState = {rehydrated: false};

   componentDidMount() {
      setPersist(() => {
         this.setState({rehydrated: true});
      });
   }

   render() {
      if (!this.state.rehydrated) {
         return <div>Loading...</div>;
      }
      // <React.StrictMode>   // See https://reactjs.org/docs/strict-mode.html
      return (
         <Provider store={store}>
            <BrowserRouter>
                  <Switch>
                     <Route path="/persona/list" component={PersonaList} />
                     <Route path="/place/list" component={PlaceList} />
                     <Route path="/source/list" component={SourceList} />
                     <Route path="/pedigree/:decujusId" component={PedigreePage} />
                     <Route path="/fanchart/:id" component={FanchartPage} />
                     <Route path="/radial/:decujusId" component={RadialPage} />
                     <Route path="/quilts/:decujusId" component={QuiltsPage} />
                     <Route path="/persona/:id" component={PersonaPage} />
                     <Route path="/source/:id" component={SourcePage} />
                     <Route path="/place/:id" component={PlacePage} />
                     <Route path="/import" component={ImportPage} />
                     <Route path="/stats/:decujusId" component={StatsPage} />
                     <Route path="/:decujusId?" exact={true} component={DashboardPage} />
                     <Route children={() => <span>No match for route</span>} />
                  </Switch>
            </BrowserRouter>
         </Provider>
      );
   }
}
