import * as Redux from "redux";
import { persistStore, autoRehydrate } from "redux-persist";
import thunk, { ThunkDispatch } from 'redux-thunk';
import { AppState } from "../Store/State";
import { rootReducer } from "../Store/Reducers";

const middlewares: Redux.Middleware[] = [
   thunk,
];

// Use generators as reducers

if (process.env.NODE_ENV === `development`) {
   // Log actions to the console
   // Enabling 'diff' is useful in some cases, but has a very significant
   // performance impact (extra 14s to display the list of persons with
   // 10000 individuals).
   // eslint-disable-next-line @typescript-eslint/no-var-requires
   const { createLogger } = require("redux-logger");
   middlewares.push(
      createLogger({
         collapsed: true,
         duration: true,
         timestamp: true,
         diff: false
      })
   ); // log actions in the console
}

export const store = Redux.createStore(
   rootReducer /* reducer */,
   Redux.compose(
      /* enhancer */
      Redux.applyMiddleware(...middlewares),
      autoRehydrate<AppState>({ log: false }) // load from persistent storage
   )
);

export type GPDispatch =
   ThunkDispatch<AppState, null /* extra args */, Redux.Action>;

/**
 * Make the store persistent. This will be called from the main component's
 et fil componentDidMount, so that we can set a 'loading...' state while we restore
 * and thus avoid displaying the default settings.
 */
export function setPersist(whenDone: () => void) {
   if (process.env.NODE_ENV !== "test") {
      persistStore(
         store,
         {
            // ??? Should not save pedigree.loading
            whitelist: [
               "fanchart",
               "history",
               "pedigree",
               "personalist",
               "placelist",
               "quilts",
               "radial",
               "sourcelist",
               "stats"
            ]
         },
         whenDone
      );
   }
}
