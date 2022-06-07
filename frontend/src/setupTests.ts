// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom/extend-expect';
// import { queryCache } from "react-query";
// import fetch from "jest-fetch-mock";
// import "@testing-library/jest-dom"

//  require("jest-fetch-mock").enableMocks();


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
  //  fetch.resetMocks()
  // queryCache.clear()
})
