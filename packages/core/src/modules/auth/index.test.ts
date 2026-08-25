import { describe, it, expect, beforeEach, vi } from "vitest";
import { crearServicioAuth } from "./index";
import { crearHashPin } from "@pos/shared";

function crearMockDb() {
  const whereQueue: any[] = [];
  const mock: any = {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockImplementation(() => {
      const data = whereQueue.shift() ?? [];
      return Promise.resolve(data);
    }),
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
    returning: vi.fn().mockResolvedValue([{ id: 1, nombre: "Test", rol: "pastelera" }]),
    update: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
  };
  mock._pushWhereData = (...args: any[]) => whereQueue.push(...args);
  return mock;
}

describe("ServicioAuth", () => {
  let mockDb: any;
  let servicio: ReturnType<typeof crearServicioAuth>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockDb = crearMockDb();
    servicio = crearServicioAuth(mockDb);
  });

  describe("login", () => {
    it("debería retornar null si no hay usuarios", async () => {
      const resultado = await servicio.login("123456");
      expect(resultado).toBeNull();
    });

    it("debería retornar null si el PIN es incorrecto", async () => {
      const hash = await crearHashPin("123456");
      mockDb._pushWhereData([
        { id: 1, nombre: "Test", rol: "pastelera", pinHash: hash, activo: true },
      ]);
      const resultado = await servicio.login("000000");
      expect(resultado).toBeNull();
    });

    it("debería retornar usuario si el PIN es correcto", async () => {
      const hash = await crearHashPin("123456");
      mockDb._pushWhereData([
        { id: 1, nombre: "Test", rol: "pastelera", pinHash: hash, activo: true },
      ]);
      const resultado = await servicio.login("123456");
      expect(resultado).not.toBeNull();
      expect(resultado).toEqual({ id: 1, nombre: "Test", rol: "pastelera" });
    });

    it("debería retornar solo id, nombre y rol (sin pinHash)", async () => {
      const hash = await crearHashPin("123456");
      mockDb._pushWhereData([
        { id: 1, nombre: "Test", rol: "pastelera", pinHash: hash, activo: true },
      ]);
      const resultado = await servicio.login("123456");
      expect(resultado).not.toHaveProperty("pinHash");
      expect(resultado).not.toHaveProperty("activo");
    });

    it("debería encontrar el usuario correcto entre múltiples", async () => {
      const hashAdmin = await crearHashPin("111111");
      const hashPastelera = await crearHashPin("222222");
      mockDb._pushWhereData([
        { id: 1, nombre: "Admin", rol: "administrador", pinHash: hashAdmin, activo: true },
        { id: 2, nombre: "Pastelera", rol: "pastelera", pinHash: hashPastelera, activo: true },
      ]);
      const resultado = await servicio.login("222222");
      expect(resultado).toEqual({ id: 2, nombre: "Pastelera", rol: "pastelera" });
    });

    it("debería retornar null si el PIN no coincide con ningún usuario", async () => {
      const hashAdmin = await crearHashPin("111111");
      const hashPastelera = await crearHashPin("222222");
      mockDb._pushWhereData([
        { id: 1, nombre: "Admin", rol: "administrador", pinHash: hashAdmin, activo: true },
        { id: 2, nombre: "Pastelera", rol: "pastelera", pinHash: hashPastelera, activo: true },
      ]);
      const resultado = await servicio.login("999999");
      expect(resultado).toBeNull();
    });
  });

  describe("crear", () => {
    it("debería crear un usuario válido", async () => {
      mockDb.returning.mockResolvedValue([
        { id: 1, nombre: "Test User", rol: "pastelera", activo: true },
      ]);
      const resultado = await servicio.crear({
        nombre: "Test User",
        rol: "pastelera",
        pin: "123456",
      });
      expect(resultado).toBeDefined();
      expect(mockDb.insert).toHaveBeenCalled();
    });

    it("debería fallar con nombre vacío", async () => {
      await expect(
        servicio.crear({ nombre: "", rol: "pastelera", pin: "123456" })
      ).rejects.toThrow();
    });

    it("debería fallar con PIN muy corto", async () => {
      await expect(
        servicio.crear({ nombre: "Test", rol: "pastelera", pin: "12" })
      ).rejects.toThrow();
    });

    it("debería fallar con PIN que no es numérico", async () => {
      await expect(
        servicio.crear({ nombre: "Test", rol: "pastelera", pin: "abcdef" })
      ).rejects.toThrow();
    });

    it("debería fallar con rol inválido", async () => {
      await expect(
        servicio.crear({ nombre: "Test", rol: "invalido" as any, pin: "123456" })
      ).rejects.toThrow();
    });
  });

  describe("desactivar", () => {
    it("debería desactivar un usuario", async () => {
      await servicio.desactivar(1);
      expect(mockDb.update).toHaveBeenCalled();
      expect(mockDb.set).toHaveBeenCalledWith({ activo: false });
    });
  });
});
