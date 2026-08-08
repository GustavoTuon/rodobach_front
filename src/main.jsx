import React from "react";
import ReactDOM from "react-dom/client";

window.React = React;
window.ReactDOM = ReactDOM;

await import("./data.js");
await import("./api.js");
await import("./components.jsx");
await import("../tweaks-panel.jsx");
await import("./screens/login.jsx");
await import("./screens/usuarios.jsx");
await import("./app.jsx");
