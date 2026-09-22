import { test, expect, vi } from "vitest";
import { createScreenLoader } from "./screen-loader.js";

test("loads only the selected screen and shares the client module between tabs", async () => {
  const clients = vi.fn().mockResolvedValue({}), fleet = vi.fn().mockResolvedValue({});
  const load = createScreenLoader({ "./screens/analise-clientes.jsx": clients, "./screens/analise-frota.jsx": fleet });
  await Promise.all([load("clientes"), load("clientes-ranking")]);
  expect(clients).toHaveBeenCalledTimes(1);
  expect(fleet).not.toHaveBeenCalled();
});

test("failed screen imports can be retried without reloading other modules", async () => {
  const screen = vi.fn().mockRejectedValueOnce(new Error("network")).mockResolvedValue({});
  const load = createScreenLoader({ "./screens/diretoria.jsx": screen });
  await expect(load("diretoria")).rejects.toThrow("network");
  await load("diretoria");
  expect(screen).toHaveBeenCalledTimes(2);
  await expect(load("unknown")).rejects.toThrow();
});
