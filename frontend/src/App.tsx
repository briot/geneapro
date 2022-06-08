import "semantic-ui-css/semantic.min.css";
import "./App.css";
import * as React from "react";
import { Provider } from "react-redux";
import { BrowserRouter, Routes, Route } from "react-router-dom";
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

const App: React.FC<unknown> = () => {
   const [rehydrated, setRehydrated] = React.useState(false);

   React.useEffect(
      () => {
         setPersist(() => setRehydrated(true));
         fetchMetadata.execute(store.dispatch, {});
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
            <Routes>
               <Route path="/persona/list"      element={<PersonaList />} />
               <Route path="/place/list"        element={<PlaceList />} />
               <Route path="/source/list"       element={<SourceList />} />
               <Route path={URL.pedigree.path}  element={<PedigreePage />} />
               <Route path={URL.fanchart.path}  element={<FanchartPage />} />
               <Route path={URL.radial.path}    element={<RadialPage />} />
               <Route path={URL.quilts.path}    element={<QuiltsPage />} />
               <Route path={URL.persona.path}   element={<PersonaPage />} />
               <Route path={URL.source.path}    element={<SourcePage />} />
               <Route path={URL.place.path}     element={<PlacePage />} />
               <Route path="/import"            element={<ImportPage />} />
               <Route path="/themeeditor"       element={<ThemeEditor />} />
               <Route path={URL.stats.path}     element={<StatsPage />} />
               <Route path={URL.dashboard.path} element={<DashboardPage />} />
               <Route path="/"                  element={<DashboardPage />} />
            </Routes>
         </BrowserRouter>
      </Provider>
   );
};
export default App;
