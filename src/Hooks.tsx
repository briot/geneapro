import * as React from "react";

/**
 * Get a components size, and monitor changes
 */
export function useComponentSize<T extends Element>(ref: React.RefObject<T>) {
   const [size, setSize] = React.useState({ width: 0, height: 0 });
   const onResize = React.useCallback(
      () => ref.current && setSize(ref.current.getBoundingClientRect()),
      [ref]
   );
   React.useLayoutEffect(
      () => {
         onResize();

         // if (typeof window.ResizeObserver === 'function') {
         //    const obs = new ResizeObserver(onResize);
         //    obs.observe(ref.current);
         //    return () => obs.disconnect(ref.current);
         // }

         window.addEventListener("resize", onResize);
         return () => window.removeEventListener("resize", onResize);
      },
      [onResize]
   );

   return size;
}

/**
 * Avoid firing callbacks too often, for instance on every keystroke
 */
export function useDebounce<T extends (...args: any[]) => any>(
   callback: T,
   delayms = 250
) {
   const timeout = React.useRef<number | undefined>(undefined);
   const debounced = (...args: any[]) => {
      window.clearTimeout(timeout.current);
      timeout.current = window.setTimeout(() => {
         callback(...args);
         window.clearTimeout(timeout.current);
         timeout.current = undefined;
      }, delayms);
   };
   return debounced;
}

/**
 * Hook similar to redux's reselect.
 * Makes it easier to use useMemo, without having to duplicate the list of
 * dependencies (those are now the list of parameters to the function.
 * For instance:
 *     const useSelector = createMemoSelector(computeExpensiveValue);
 *     const Component = (p) => {
 *        const memoized = useSelector(p.a, p.b);
 *        ...
 *     }
 *
 * from https://github.com/Andarist/react-selector-hooks
 */
function createMemoSelector<P1, V>(resolver: (p1: P1) => V): (p1: P1) => V;
function createMemoSelector<P1, P2, V>(
   resolver: (p1: P1, p2: P2) => V
): (p1: P1, p2: P2) => V;
function createMemoSelector<P1, P2, P3, V>(
   resolver: (p1: P1, p2: P2, p3: P3) => V
): (p1: P1, p2: P2, p3: P3) => V;
function createMemoSelector<V, T>(resolver: (...p: T[]) => V) {
   return (dependencies: T[]) =>
      // eslint-disable-next-line react-hooks/exhaustive-deps
      React.useMemo(() => resolver(...dependencies), dependencies);
}

export function createSelector<P1, V>(resolve: (p1: P1) => V): (p1: P1) => V;
export function createSelector<P1, P2, V>(
   resolve: (p1: P1, p2: P2) => V
): (p1: P1, p2: P2) => V;
export function createSelector<P1, P2, P3, V>(
   resolve: (p1: P1, p2: P2, p3: P3) => V
): (p1: P1, p2: P2, p3: P3) => V;
export function createSelector<V, T>(resolver: (...p: any[]) => V) {
   const selector = createMemoSelector(resolver);
   return (...dependencies: any[]) => selector(dependencies);
}

/**
 * Hook similar to redux's reselect.
 * For instance:
 *    const useSelector = createStateSelector(
 *       [(state, a) => state.values.value1,
 *        (state, a) => state.values.value2 + a,
 *        (state, a) => state.values.value3 * a],
 *       (value1, value2, value3) => value1 + value2);
 *
 *    const Component({a}) {
 *       const state = React.useContext(StoreContext);
 *       const memoizedd = useSelector(state, a);
 *       ...
 *    }
 *
 * from https://github.com/Andarist/react-selector-hooks
 */

// const resolveResolvers = (resolvers, args) =>
//   resolvers.map(resolver => resolver(...args))
//
// export const createStateSelector = (dependencyResolvers, resolver) => {
//   const selector = createMemoSelector(resolver)
//   return (...args) => selector(resolveResolvers(dependencyResolvers, args))
// }

/**
 * Similar to createStateSelector, but groups values into an object
 *    const useSelector = createStructuredSelector(
 *       {value1: (state, a) => state.values.value1,
 *        value2: (state, a) => state.values.value2 + a,
 *        value3: (state, a) => state.values.value3 * a},
 *       ({value1, value2, value3}) => value1 + value2);
 */

// export const createStructuredSelector = (dependencyResolversMap, resolver) => {
//   const keys = Object.keys(dependencyResolversMap)
//   const dependencyResolvers = keys.map(key => dependencyResolversMap[key])
//   return (...args) => {
//     const dependencies = resolveResolvers(dependencyResolvers, args)
//     return useMemo(
//       () =>
//         resolver(
//           keys.reduce((value, key, index) => {
//             value[key] = dependencies[index]
//             return value
//           }, {}),
//         ),
//       dependencies,
//     )
//   }
// }


// From https://overreacted.io/making-setinterval-declarative-with-react-hooks/
// This lets us dynamically change the callback, without impact the time, or
// temporary suspend callbacks by setting the default to 'null'

export function useInterval(callback: ()=>void, delay: number|null) {
  const savedCallback = React.useRef<()=>void>(callback);

  // Remember the latest callback.
  React.useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  // Set up the interval.
  React.useEffect(() => {
    function tick() {
      savedCallback.current();
    }
    if (delay !== null) {
      let id = setInterval(tick, delay);
      return () => clearInterval(id);
    }
  }, [delay]);
}

// Use in async operations, to check that the component is still mounted
// before we do anything like updating its state.

export const useIsMounted = () => {
  const isMounted = React.useRef(false);
  React.useEffect(
    () => {
      isMounted.current = true;
      return () => { isMounted.current = false; }
    },
    []);
  return isMounted;
}

// Triggering code when the user presses a specific key

export const useOnKeyPress = (
      targetKey: number,
      onKeyDown: (e: Event) => void,
      onKeyUp: (e: Event) => void,
      isDebugging=false
) => {
   const [isKeyDown, setIsKeyDown] = React.useState(false)
   const onKeyDownLocal = React.useCallback(e => {
      if (isDebugging) {
         console.log("key down",
            e.key, e.key !== targetKey ? " isn't triggered" : " is triggered");
      }
      if (e.key === targetKey) {
         setIsKeyDown(true);
         onKeyDown(e);
      }
   }, [onKeyDown, isDebugging, targetKey])

   const onKeyUpLocal = React.useCallback(e => {
      if (isDebugging) {
         console.log("key up",
            e.key, e.key !== targetKey ? " isn't triggered" : " is triggered");
      }
      if (e.key !== targetKey) {
         setIsKeyDown(false);
         onKeyUp(e);
      }
   }, [onKeyUp, isDebugging, targetKey])

   React.useEffect(() => {
      window.addEventListener('keydown', onKeyDownLocal);
      window.addEventListener('keyup', onKeyUpLocal);
      return () => {
        window.removeEventListener('keydown', onKeyDownLocal);
        window.removeEventListener('keyup', onKeyUpLocal);
      }
   }, [onKeyDownLocal, onKeyUpLocal]);

   return isKeyDown;
}
