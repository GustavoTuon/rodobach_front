// @vitest-environment jsdom
import { test, expect, vi, afterEach } from "vitest";
afterEach(() => { vi.unstubAllGlobals(); localStorage.clear(); });

test('financial search explicitly preserves an empty plate', async()=>{
  const fetch=vi.fn().mockResolvedValue({ok:true,status:200,json:async()=>({documents:[]})});
  vi.stubGlobal('fetch',fetch);
  await import('./api.js');
  await window.RB_API.searchPlantaoErpDocuments({q:'100',plate:'',series:'1'});
  const query=new URL(fetch.mock.calls[0][0], 'http://localhost').searchParams;
  expect(query.has('plate')).toBe(true);
  expect(query.get('plate')).toBe('');
  expect(query.get('q')).toBe('100');
  expect(query.get('series')).toBe('1');
});

test("task requests explain network and gateway failures without ending the session", async () => {
  const fetch = vi.fn(); vi.stubGlobal("fetch", fetch);
  await import("./api.js");
  localStorage.setItem("rodobach_token", "test-token");
  fetch.mockRejectedValueOnce(new TypeError("Failed to fetch"));
  await expect(window.RB_API.noteTasks()).rejects.toThrow("Não foi possível conectar ao servidor");
  for (const status of [502, 503, 504]) {
    fetch.mockResolvedValueOnce({ ok: false, status });
    await expect(window.RB_API.noteTasks()).rejects.toMatchObject({ status, message: "O servidor está temporariamente indisponível. Tente atualizar em alguns instantes." });
  }
  expect(localStorage.getItem("rodobach_token")).toBe("test-token");
});

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
