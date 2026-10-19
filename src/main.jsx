import React from "react";
import ReactDOM from "react-dom/client";

window.React = React;
window.ReactDOM = ReactDOM;

const standalonePath = window.location.pathname.replace(/\/$/, "");

if (["/compras/responder", "/compras/fornecedor"].includes(standalonePath)) {
  await import("./api.js");
  document.title = "Rodobach \u00b7 Portal do fornecedor";
  const { default: SupplierPortal } = await import("./supplier-portal.jsx");
  ReactDOM.createRoot(document.getElementById("app")).render(
    <SupplierPortal />,
  );
} else if (standalonePath === "/compras") {
  await import("./api.js");
  await import("./components.jsx");
  await import("./screens/login.jsx");
  const { default: PurchasesPortal } = await import("./purchases-portal.jsx");
  document.title = "Rodobach · Compras";
  ReactDOM.createRoot(document.getElementById("app")).render(
    <PurchasesPortal />,
  );
} else if (standalonePath === "/manutencao-plantao") {
  await import("./api.js");
  await import("./components.jsx");
  await import("./screens/login.jsx");
  const { default: MaintenanceDemo } = await import("./maintenance-demo.jsx");
  document.title = "Rodobach · Manutenção de plantão";
  ReactDOM.createRoot(document.getElementById("app")).render(
    <MaintenanceDemo />,
  );
} else {
  await import("./data.js");
  await import("./api.js");
  await import("./components.jsx");
  await import("../tweaks-panel.jsx");
  await import("./screens/login.jsx");
  await import("./screens/usuarios.jsx");
  await import("./app.jsx");
}
