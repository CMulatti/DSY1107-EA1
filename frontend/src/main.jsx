/*import { createRoot } from "react-dom/client";
import App from "./App";

createRoot(document.getElementById("root")).render(<App />);*/

import { createRoot } from "react-dom/client"
import App from "./App"
import { cargarConfig } from "./config.js"

cargarConfig().then(() => {
  createRoot(document.getElementById("root")).render(<App />)
})