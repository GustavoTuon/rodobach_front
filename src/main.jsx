import { GlobalLoading } from "./global-loading.jsx";
import { beginLoadingActivity } from "./loading-activity.js";
import React from "react";
import ReactDOM from "react-dom/client";

window.React = React;
window.ReactDOM = ReactDOM;

const loadingHost = document.createElement("div");
loadingHost.id = "global-loading";
document.body.appendChild(loadingHost);
const loadingRoot = ReactDOM.createRoot(loadingHost);
loadingRoot.render(<GlobalLoading />);
const finishStartup = beginLoadingActivity();
if (import.meta.hot) import.meta.hot.dispose(() => { loadingRoot.unmount(); loadingHost.remove(); finishStartup(); });

const standalonePath = window.location.pathname.replace(/\/$/, "");

try {
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

} finally { finishStartup(); }
