import React from "react";
import ReactDOM from "react-dom/client";

window.React = React;
window.ReactDOM = ReactDOM;

if (window.location.pathname.replace(/\/$/, "") === "/manutencao-plantao") {
  await import("./api.js");
  await import("./components.jsx");
  await import("./screens/login.jsx");
  const { default: MaintenanceDemo } = await import("./maintenance-demo.jsx");
  document.title = "Rodobach · Manutenção de plantão";
  ReactDOM.createRoot(document.getElementById("app")).render(<MaintenanceDemo />);
} else {
  await import("./data.js");
  await import("./api.js");
  await import("./components.jsx");
  await import("../tweaks-panel.jsx");
  await import("./screens/login.jsx");
  await import("./screens/usuarios.jsx");
  await import("./app.jsx");
}
