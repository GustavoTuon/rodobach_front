// @vitest-environment jsdom
import React from "react";
import { render, screen, fireEvent, cleanup, waitFor } from "@testing-library/react";
import { test, expect, vi, beforeEach, afterEach } from "vitest";

const { load } = vi.hoisted(() => ({ load: vi.fn() }));
vi.mock("./screen-loader.js", () => ({ createScreenLoader: () => load }));

beforeEach(() => {
  vi.resetModules(); load.mockReset();
  vi.stubGlobal("React", React);
  vi.stubGlobal("ReactDOM", { createRoot: () => ({ render() {} }) });
  vi.stubGlobal("useTweaks", () => [{ theme: "light", density: "comfortable" }, () => {}]);
  window.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {} });
  document.body.innerHTML = '<div id="app"></div>';
  window.location.hash = "#/diretoria";
  for (const name of ["Icon", "Tabs", "TweaksPanel", "TweakSection", "TweakRadio"]) vi.stubGlobal(name, () => null);
  vi.stubGlobal("Diretoria", () => <div>Executive fixture loaded</div>);
  vi.stubGlobal("LoginScreen", () => <div>Login fixture</div>);
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

test("failed screen loading offers retry and mounts the screen only after success", async () => {
  const user = { login: "fixture", permissions: { diretoria: true } };
  vi.stubGlobal("RB_AUTH", { getToken: () => "fixture", getUser: () => user, me: async () => ({ user }), logout() {} });
  load.mockRejectedValueOnce(new Error("network")).mockResolvedValue(undefined);
  await import("./app.jsx");
  render(<window.App />);
  fireEvent.click(await screen.findByText("Tentar novamente"));
  await screen.findByText("Executive fixture loaded");
  expect(load.mock.calls.map(args => args[0])).toEqual(["diretoria", "diretoria"]);
});

test("user with no permissions sees no default business screen", async () => {
  const user = { login: "fixture", permissions: {} };
  vi.stubGlobal("RB_AUTH", { getToken: () => "fixture", getUser: () => user, me: async () => ({ user }), logout() {} });
  await import("./app.jsx"); render(<window.App />);
  await screen.findByText(/ainda não possui telas liberadas/);
  expect(load).not.toHaveBeenCalled();
});

test("temporary authentication outage allows retry without clearing the stored session", async () => {
  const user = { login: "fixture", permissions: { diretoria: true } };
  const logout = vi.fn(), me = vi.fn().mockRejectedValueOnce(new Error("Temporarily unavailable")).mockResolvedValue({ user });
  vi.stubGlobal("RB_AUTH", { getToken: () => "fixture", getUser: () => user, me, logout });
  load.mockResolvedValue(undefined);
  await import("./app.jsx"); render(<window.App />);
  fireEvent.click(await screen.findByText("Tentar novamente"));
  await waitFor(() => expect(me).toHaveBeenCalledTimes(2));
  await screen.findByText("Executive fixture loaded");
  expect(logout).not.toHaveBeenCalled();
});
