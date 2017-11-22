import 'semantic-ui-css/semantic.min.css';
import './App.css';

import * as React from 'react';
import { Provider } from 'react-redux';
import { BrowserRouter, Route } from 'react-router-dom';
import { store, setPersist } from './Store/Store';
import DashboardPage from './Dashboard';
import FanchartPage from './Fanchart/Page';
import PedigreePage from './Pedigree/Page';
import PersonaList from './PersonaList';
import PlaceList from './PlaceList';
import SourceList from './SourceList';
import PersonaPage from './Persona/Page';
import SourcePage from './Source/Page';
import ImportPage from './Import/Page';
import RadialPage from './Radial/Page';
import QuiltsPage from './Quilts/Page';

class MainAppState {
   rehydrated: boolean;
}

export default class App extends React.PureComponent<{}, MainAppState> {
   constructor() {
      super();
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
                  <Route path="/:decujus(\\d+)?" exact={true} component={DashboardPage} />
                  <Route path="/persona/list" component={PersonaList} />
                  <Route path="/place/list" component={PlaceList} />
                  <Route path="/source/list" component={SourceList} />
                  <Route path="/pedigree/:decujus(\\d+)" component={PedigreePage} />
                  <Route path="/fanchart/:decujus(\\d+)" component={FanchartPage} />
                  <Route path="/radial/:decujus(\\d+)" component={RadialPage} />
                  <Route path="/quilts/:decujus(\\d+)" component={QuiltsPage} />
                  <Route path="/persona/:id(\\d+)" component={PersonaPage} />
                  <Route path="/source/:id(\\d+)" component={SourcePage} />
                  <Route path="/import" component={ImportPage} />
               </div>
            </BrowserRouter>
         </Provider>
      );
   }
}
