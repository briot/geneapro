import 'semantic-ui-css/semantic.min.css';
import './App.css';

import * as React from 'react';
import { Provider } from 'react-redux';
import { BrowserRouter, Route } from 'react-router-dom';
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
   constructor(props: {}) {
      super(props);
      this.state = {rehydrated: false };
   }

   componentWillMount() {
      setPersist(() => {
         this.setState({rehydrated: true});
      });
   }

   render() {
      if (!this.state.rehydrated) {
         return <div>Loading...</div>;
      }
      return (
         <Provider store={store}>
            <BrowserRouter>
               <div>
                  <Route path="/:decujusId(\\d+)?" exact={true} component={DashboardPage} />
                  <Route path="/persona/list" component={PersonaList} />
                  <Route path="/place/list" component={PlaceList} />
                  <Route path="/source/list" component={SourceList} />
                  <Route path="/pedigree/:decujusId(\\d+)" component={PedigreePage} />
                  <Route path="/fanchart/:id(\\d+)" component={FanchartPage} />
                  <Route path="/radial/:decujusId(\\d+)" component={RadialPage} />
                  <Route path="/quilts/:decujusId(\\d+)" component={QuiltsPage} />
                  <Route path="/persona/:id(\\d+)" component={PersonaPage} />
                  <Route path="/source/:id(-?\\d+)" component={SourcePage} />
                  <Route path="/place/:id(-?\\d+)" component={PlacePage} />
                  <Route path="/import" component={ImportPage} />
                  <Route path="/stats/:decujusId(\\d+)" component={StatsPage} />
               </div>
            </BrowserRouter>
         </Provider>
      );
   }
}
