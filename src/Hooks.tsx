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

   React.useLayoutEffect(() => {
      if (!ref.current) {
         return;
      }

      onResize();

      // if (typeof window.ResizeObserver === 'function') {
      //    const obs = new ResizeObserver(onResize);
      //    obs.observe(ref.current);
      //    return () => obs.disconnect(ref.current);
      // }

      window.addEventListener("resize", onResize);
      return () => window.removeEventListener("resize", onResize);
   }, [ref.current, onResize]);

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
function createMemoSelector<V>(resolver: (...p: any[]) => V) {
   return (dependencies: any[]) =>
      React.useMemo(() => resolver(...dependencies), dependencies);
}

export function createSelector<P1, V>(resolve: (p1: P1) => V): (p1: P1) => V;
export function createSelector<P1, P2, V>(
   resolve: (p1: P1, p2: P2) => V
): (p1: P1, p2: P2) => V;
export function createSelector<P1, P2, P3, V>(
   resolve: (p1: P1, p2: P2, p3: P3) => V
): (p1: P1, p2: P2, p3: P3) => V;
export function createSelector<V>(resolver: (...p: any[]) => V) {
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
