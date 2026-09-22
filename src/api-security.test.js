// @vitest-environment jsdom
import { test, expect, vi, afterEach } from "vitest";
afterEach(() => { vi.unstubAllGlobals(); localStorage.clear(); });

test("API requests preserve authentication and use a deadline", async () => {
  localStorage.setItem("rodobach_token", "test-token");
  const fetch = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ rows: [] }) });
  vi.stubGlobal("fetch", fetch);
  await import("./api.js");
  await window.RB_API.listUsuarios();
  expect(fetch.mock.calls[0][1].headers.Authorization).toBe("Bearer test-token");
  expect(fetch.mock.calls[0][1].signal).toBeDefined();
});

test("server failure preserves the session; revoked session clears it", async () => {
  const fetch = vi.fn(); vi.stubGlobal("fetch", fetch);
  await import("./api.js");
  localStorage.setItem("rodobach_token", "test-token");
  fetch.mockResolvedValueOnce({ ok: false, status: 503, json: async () => ({ error: "Unavailable" }) });
  await expect(window.RB_AUTH.me()).rejects.toThrow();
  expect(localStorage.getItem("rodobach_token")).toBe("test-token");
  fetch.mockResolvedValueOnce({ ok: false, status: 401, json: async () => ({}) });
  await expect(window.RB_AUTH.me()).rejects.toThrow();
  expect(localStorage.getItem("rodobach_token")).toBeNull();
});
