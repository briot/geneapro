//  import * as React from "react";
import { createRoot } from 'react-dom/client';
import App from "./App";
import registerServiceWorker from "./registerServiceWorker";
import "./index.css";

const container = document.getElementById('root');
if (!container) {
   throw "No <root> found";
}
const root = createRoot(container);
root.render(
   <App />
//   <React.StrictMode>
//      <App />
//  </React.StrictMode>
);
registerServiceWorker();
