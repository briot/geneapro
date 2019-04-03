import * as React from "react";
import { render } from "react-testing-library";
import EditableList from "./EditableList";
// Some support in setupTests

it("renders all items in the list", () => {
   const list = [1, 2, 3];

   // General notes on testing with create-react-app:
   //    https://facebook.github.io/create-react-app/docs/running-tests

   // List of attributes returned from render():
   //    https://testing-library.com/docs/react-testing-library/api
   const { container } = render(
      <EditableList
         list={list}
         render={a => <span>{a}</span>}
         create={() => 4}
         onChange={() => null}
         orderable={false}
      />
   );
   //debug();

   // List of possible Jest tests:
   //    https://jestjs.io/docs/en/expect.html#content
   // Some more tests with jest-dom:
   //    https://github.com/gnapse/jest-dom
   expect(container.querySelectorAll("div.listItem")).toHaveLength(3);

   expect(container.querySelectorAll("[draggable=true]")).toHaveLength(0);
});
