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
import PersonaPage from './Persona/Page';

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
                  <Route path="/:decujus?" exact={true} component={DashboardPage} />
                  <Route path="/persona/list/:decujus(\\d+)" component={PersonaList} />
                  <Route path="/pedigree/:decujus(\\d+)" component={PedigreePage} />
                  <Route path="/fanchart/:decujus(\\d+)" component={FanchartPage} />
                  <Route path="/persona/:id(\\d+)" component={PersonaPage} />
               </div>
            </BrowserRouter>
         </Provider>
      );
   }
}
