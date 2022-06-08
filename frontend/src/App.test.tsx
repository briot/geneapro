import {render, screen} from '@testing-library/react';
import App from "./App";
import fetchMock from "jest-fetch-mock";
import * as GP_JSON from '@/Server/JSON';

it("renders without crashing", () => {
   fetchMock.once(
      JSON.stringify({
         characteristic_types: [],
         char_part_SEX: 1,
         event_types: [],
         event_type_roles: [],
         p2p_types: [],
         researchers: [],
         theme_operators: [],
         themes: [],
      } as GP_JSON.Metadata)
   );

   render(<App />);

   const divElement = screen.getByText(/Loading.../i);  // not rehydrated
   expect(divElement).toBeInTheDocument();

   expect(fetchMock.mock.calls.length).toEqual(1);
   expect(fetchMock.mock.calls[0][0]).toEqual('/data/metadata');
});
