import * as Redux from 'redux';
import createSagaMiddleware from 'redux-saga';
import { persistStore, autoRehydrate } from 'redux-persist';
import { AppState, GPStore } from '../Store/State';
import { rootReducer } from '../Store/Reducers';
import { rootSaga } from '../Store/Sagas';

// Use generators as reducers
const sagaMiddleware = createSagaMiddleware();

const middlewares: Redux.Middleware[] = [
   sagaMiddleware,
];

if (process.env.NODE_ENV === `development`) {
   // Log actions to the console
   // Enabling 'diff' is useful in some cases, but has a very significant
   // performance impact (extra 14s to display the list of persons with
   // 10000 individuals).
   // eslint-disable-next-line @typescript-eslint/no-var-requires
   const { createLogger } = require('redux-logger');
   middlewares.push(
      createLogger({collapsed: true,
                    duration: true,
                    timestamp: true,
                    diff: false}));   // log actions in the console
}

export const store: GPStore = Redux.createStore<AppState>(
   rootReducer /* reducer */,
   Redux.compose(  /* enhancer */
      Redux.applyMiddleware(...middlewares) as Redux.StoreEnhancer<AppState>,
      autoRehydrate<AppState>({log: false}) // load from persistent storage
   )
);

sagaMiddleware.run(rootSaga);

/**
 * Make the store persistent. This will be called from the main component's
 * componentDidMount, so that we can set a 'loading...' state while we restore
 * and thus avoid displaying the default settings.
 */
export function setPersist(whenDone: () => void) {
   if (process.env.NODE_ENV !== 'test') {
      persistStore(
         store,
         {
            // ??? Should not save pedigree.loading
            whitelist: ['pedigree', 'fanchart', 'radial', 'quilts', 'history',
                        'stats', 'personalist'],
         },
         whenDone
      );
   }
}
