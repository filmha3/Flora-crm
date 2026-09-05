import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// The static #flora-splash in index.html exists only to cover the gap
// before this script itself has downloaded and run — the moment it has,
// React's own loading screen (FerrofluidLoader) is already mounted
// underneath and ready to take over, so the static splash is removed here
// rather than on its own fixed timer. It used to fade out after a hardcoded
// 1.1s no matter what, which meant a slower load showed splash → a
// different-looking loader → the real app: three visibly different
// screens in a row. Now it's just one continuous loading screen from the
// person's point of view.
const splash = document.getElementById("flora-splash");
if (splash) splash.remove();
