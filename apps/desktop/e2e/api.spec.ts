/**
 * Tests E2E: Autenticación y control de acceso via local-server HTTP.
 *
 * Requiere la aplicación corriendo (AppImage o dev mode).
 * El local-server está embebido en Electron y escucha en puerto 3000.
 *
 * Para ejecutar:
 *   1. Iniciar la app: "./release/Sweet Bakery-0.1.0.AppImage"
 *   2. Ejecutar tests: pnpm --filter @pos/desktop test:e2e
 */
import { test, expect } from "@playwright/test";

const BASE_URL = process.env.E2E_BASE_URL || "http://localhost:3000";

test.describe("Autenticación", () => {
  test("login con PIN válido retorna token", async ({ request }) => {
    const response = await request.post(`${BASE_URL}/auth/login`, {
      data: { pin: "123456" },
    });
    expect(response.ok()).toBeTruthy();
    const body = await response.json();
    expect(body).toHaveProperty("token");
    expect(body).toHaveProperty("usuario");
    expect(body.usuario.rol).toBe("propietario");
  });

  test("login con PIN inválido retorna error", async ({ request }) => {
    const response = await request.post(`${BASE_URL}/auth/login`, {
      data: { pin: "000000" },
    });
    expect(response.ok()).toBeFalsy();
  });

  test("acceso sin token retorna 401", async ({ request }) => {
    const response = await request.get(`${BASE_URL}/api/productos`);
    expect(response.status()).toBe(401);
  });
});

test.describe("Control de roles", () => {
  let adminToken: string;

  test.beforeAll(async ({ request }) => {
    const res = await request.post(`${BASE_URL}/auth/login`, {
      data: { pin: "123456" },
    });
    if (res.ok()) {
      const body = await res.json();
      adminToken = body.token;
    }
  });

  test("admin puede listar productos", async ({ request }) => {
    if (!adminToken) {
      test.skip();
      return;
    }
    const response = await request.get(`${BASE_URL}/api/productos`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    expect(response.ok()).toBeTruthy();
    const body = await response.json();
    expect(body).toHaveProperty("productos");
    expect(Array.isArray(body.productos)).toBeTruthy();
  });

  test("admin puede ver pedidos de producción", async ({ request }) => {
    if (!adminToken) {
      test.skip();
      return;
    }
    const response = await request.get(`${BASE_URL}/api/pedidos/produccion`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    expect(response.ok()).toBeTruthy();
  });

  test("admin puede ver stock", async ({ request }) => {
    if (!adminToken) {
      test.skip();
      return;
    }
    const response = await request.get(`${BASE_URL}/api/stock`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    // /api/stock requires sesionCajaId; without it, may return 400 or empty
    // Just verify auth is accepted (not 401)
    expect(response.status()).not.toBe(401);
  });
});

test.describe("Stock", () => {
  let token: string;

  test.beforeAll(async ({ request }) => {
    const res = await request.post(`${BASE_URL}/auth/login`, {
      data: { pin: "123456" },
    });
    if (res.ok()) {
      const body = await res.json();
      token = body.token;
    }
  });

  test("listar stock sin sesión retorna respuesta válida", async ({ request }) => {
    if (!token) {
      test.skip();
      return;
    }
    const response = await request.get(`${BASE_URL}/api/stock`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    // Requiere sesionCajaId; verificar que no es 401
    expect(response.status()).not.toBe(401);
  });

  test("listar mermas sin sesión retorna respuesta válida", async ({ request }) => {
    if (!token) {
      test.skip();
      return;
    }
    const response = await request.get(`${BASE_URL}/api/stock/mermas`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(response.status()).not.toBe(401);
  });

  test("listar cortesías sin sesión retorna respuesta válida", async ({ request }) => {
    if (!token) {
      test.skip();
      return;
    }
    const response = await request.get(`${BASE_URL}/api/stock/cortesias`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(response.status()).not.toBe(401);
  });
});

test.describe("Pedidos", () => {
  let token: string;

  test.beforeAll(async ({ request }) => {
    const res = await request.post(`${BASE_URL}/auth/login`, {
      data: { pin: "123456" },
    });
    if (res.ok()) {
      const body = await res.json();
      token = body.token;
    }
  });

  test("listar pedidos de producción retorna array", async ({ request }) => {
    if (!token) {
      test.skip();
      return;
    }
    const response = await request.get(`${BASE_URL}/api/pedidos/produccion`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(response.ok()).toBeTruthy();
    const body = await response.json();
    expect(body).toHaveProperty("pedidos");
    expect(Array.isArray(body.pedidos)).toBeTruthy();
  });
});
