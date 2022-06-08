// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom/extend-expect';
// import { queryCache } from "react-query";
import fetchMock from "jest-fetch-mock";
// import "@testing-library/jest-dom"

//  require("jest-fetch-mock").enableMocks();


// See https://reactjs.org/blog/2022/03/08/react-18-upgrade-guide.html
// globalThis.IS_REACT_ACT_ENVIRONMENT = true;


/**
 * mock the resizeObserver, which doesn't exist in the test environment
 */
class ResizeObserver {
    observe() {
       // do nothing
    }
    unobserve() {
       // do nothing
    }
    disconnect() {
       // do nothing
    }
}
window.ResizeObserver = ResizeObserver;


beforeEach(() => {
  jest.clearAllMocks()
  fetchMock.resetMocks()
  // queryCache.clear()
})

fetchMock.enableMocks()
