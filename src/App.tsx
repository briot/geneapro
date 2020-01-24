import "semantic-ui-css/semantic.min.css";
import "./App.css";
import * as React from "react";
import { useDispatch, Provider } from "react-redux";
import { BrowserRouter, Route, Switch } from "react-router-dom";
import DashboardPage from "./Dashboard";
import FanchartPage from "./Fanchart/Page";
import ImportPage from "./Import/Page";
import PedigreePage from "./Pedigree/Page";
import PersonaPage from "./Persona/Page";
import PersonaList from "./PersonaList/PersonaList";
import PlacePage from "./Place/Page";
import PlaceList from "./PlaceList";
import QuiltsPage from "./Quilts/Page";
import RadialPage from "./Radial/Page";
import SourcePage from "./Source/Page";
import SourceList from "./SourceList";
import StatsPage from "./Stats/Page";
import ThemeEditor from "./ThemeEditor/ThemeEditor";
import { setPersist, store } from "./Store/Store";
import { fetchMetadata } from "./Store/Sagas";
import { URL } from "./Links";

const App: React.FC<{}> = () => {
   const [rehydrated, setRehydrated] = React.useState(false);
   const dispatch = useDispatch();

   React.useEffect(
      () => {
         setPersist(() => setRehydrated(true));
         fetchMetadata.execute(dispatch, {});
      },
      []
   );


   if (!rehydrated) {
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
               <Route path={URL.pedigree.path} component={PedigreePage} />
               <Route path={URL.fanchart.path} component={FanchartPage} />
               <Route path={URL.radial.path} component={RadialPage} />
               <Route path={URL.quilts.path} component={QuiltsPage} />
               <Route path={URL.persona.path} component={PersonaPage} />
               <Route path={URL.source.path} component={SourcePage} />
               <Route path={URL.place.path} component={PlacePage} />
               <Route path="/import" component={ImportPage} />
               <Route path="/themeeditor" component={ThemeEditor} />
               <Route path={URL.stats.path} component={StatsPage} />
               <Route
                  path={URL.dashboard.path}
                  exact={true}
                  component={DashboardPage}
               />
               <Route
                  path="/"
                  exact={true}
                  component={DashboardPage}
               />
               <Route>
                  {() => <span>No match for route</span>}
               </Route>
            </Switch>
         </BrowserRouter>
      </Provider>
   );
};
export default App;
