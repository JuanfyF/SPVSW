import { describe, it, expect, beforeEach, vi } from "vitest";
import { crearServicioAuth } from "./index";
import { crearHashPin } from "@pos/shared";

function crearMockDb() {
  const whereQueue: any[] = [];
  let limitCalled = false;
  const mock: any = {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockImplementation(() => {
      limitCalled = false;
      return {
        then(resolve: any, reject?: any) {
          if (limitCalled) return Promise.resolve().then(resolve, reject);
          const data = whereQueue.shift() ?? [];
          return Promise.resolve(data).then(resolve, reject);
        },
        limit(n: number) {
          limitCalled = true;
          const data = whereQueue.shift() ?? [];
          return Promise.resolve(data);
        },
      };
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
      const resultado = await servicio.login("384729");
      expect(resultado).toBeNull();
    });

    it("debería retornar null si el PIN es incorrecto", async () => {
      const hash = await crearHashPin("384729");
      mockDb._pushWhereData([
        { id: 1, nombre: "Test", rol: "pastelera", pinHash: hash, activo: true },
      ]);
      const resultado = await servicio.login("999988");
      expect(resultado).toBeNull();
    });

    it("debería retornar usuario si el PIN es correcto", async () => {
      const hash = await crearHashPin("384729");
      mockDb._pushWhereData([
        { id: 1, nombre: "Test", rol: "pastelera", pinHash: hash, activo: true },
      ]);
      const resultado = await servicio.login("384729");
      expect(resultado).not.toBeNull();
      expect(resultado).toEqual({ id: 1, nombre: "Test", rol: "pastelera" });
    });

    it("debería retornar solo id, nombre y rol (sin pinHash)", async () => {
      const hash = await crearHashPin("384729");
      mockDb._pushWhereData([
        { id: 1, nombre: "Test", rol: "pastelera", pinHash: hash, activo: true },
      ]);
      const resultado = await servicio.login("384729");
      expect(resultado).not.toHaveProperty("pinHash");
      expect(resultado).not.toHaveProperty("activo");
    });

    it("debería encontrar el usuario correcto entre múltiples", async () => {
      const hashAdmin = await crearHashPin("334455");
      const hashPastelera = await crearHashPin("667788");
      mockDb._pushWhereData([
        { id: 1, nombre: "Admin", rol: "administrador", pinHash: hashAdmin, activo: true },
        { id: 2, nombre: "Pastelera", rol: "pastelera", pinHash: hashPastelera, activo: true },
      ]);
      const resultado = await servicio.login("667788");
      expect(resultado).toEqual({ id: 2, nombre: "Pastelera", rol: "pastelera" });
    });

    it("debería retornar null si el PIN no coincide con ningún usuario", async () => {
      const hashAdmin = await crearHashPin("334455");
      const hashPastelera = await crearHashPin("667788");
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
        pin: "384729",
      });
      expect(resultado).toBeDefined();
      expect(mockDb.insert).toHaveBeenCalled();
    });

    it("debería fallar con nombre vacío", async () => {
      await expect(
        servicio.crear({ nombre: "", rol: "pastelera", pin: "384729" })
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

  describe("restablecerPin", () => {
    it("debería generar PIN temporal de 6 dígitos", async () => {
      mockDb._pushWhereData([{ id: 1, nombre: "Test", rol: "pastelera" }]);
      const resultado = await servicio.restablecerPin(1, 1);
      expect(resultado.pinTemporal).toMatch(/^\d{6}$/);
      expect(resultado.expiracion).toBeDefined();
      expect(resultado.nombre).toBe("Test");
    });

    it("debería lanzar error si el usuario no existe", async () => {
      mockDb._pushWhereData([]);
      await expect(servicio.restablecerPin(99999, 1)).rejects.toThrow("Usuario no encontrado");
    });

    it("debería establecer debeCambiarPin en true", async () => {
      mockDb._pushWhereData([{ id: 1, nombre: "Test", rol: "pastelera" }]);
      await servicio.restablecerPin(1, 1);
      expect(mockDb.update).toHaveBeenCalled();
      expect(mockDb.set).toHaveBeenCalledWith(
        expect.objectContaining({ debeCambiarPin: true })
      );
    });

    it("debería registrar resetadoPor en log de auditoría", async () => {
      mockDb._pushWhereData([{ id: 1, nombre: "Test", rol: "pastelera" }]);
      await servicio.restablecerPin(1, 5);
      expect(mockDb.values).toHaveBeenCalledWith(
        expect.objectContaining({ resetadoPor: 5 })
      );
    });

    it("debería actualizar el pinHash del usuario", async () => {
      mockDb._pushWhereData([{ id: 1, nombre: "Test", rol: "pastelera" }]);
      await servicio.restablecerPin(1, 1);
      expect(mockDb.set).toHaveBeenCalledWith(
        expect.objectContaining({ pinHash: expect.any(String) })
      );
    });
  });

  describe("marcarPinTemporalUtilizado", () => {
    it("debería marcar logs activos como utilizados", async () => {
      await servicio.marcarPinTemporalUtilizado(1);
      expect(mockDb.update).toHaveBeenCalled();
      expect(mockDb.set).toHaveBeenCalledWith({ utilizado: true });
    });
  });

  describe("login con debeCambiarPin", () => {
    it("debería retornar usuario con debeCambiarPin=true cuando no ha expirado", async () => {
      const hash = await crearHashPin("111111");
      const expiracionFutura = new Date(Date.now() + 3600000).toISOString(); // +1 hora
      // Primera query: buscar usuario
      mockDb._pushWhereData([
        { id: 1, nombre: "Test", rol: "pastelera", pinHash: hash, activo: true, debeCambiarPin: true },
      ]);
      // Segunda query: buscar log activo
      mockDb._pushWhereData([
        { id: 1, usuarioId: 1, expiracion: expiracionFutura, utilizado: false },
      ]);
      const resultado = await servicio.login("111111");
      expect(resultado).not.toBeNull();
      expect(resultado!.debeCambiarPin).toBe(true);
    });

    it("debería retornar null si el PIN temporal expiró", async () => {
      const hash = await crearHashPin("222222");
      const expiracionPasada = new Date(Date.now() - 3600000).toISOString(); // -1 hora
      // Primera query: buscar usuario
      mockDb._pushWhereData([
        { id: 2, nombre: "Test2", rol: "pastelera", pinHash: hash, activo: true, debeCambiarPin: true },
      ]);
      // Segunda query: buscar log activo (expirado)
      mockDb._pushWhereData([
        { id: 2, usuarioId: 2, expiracion: expiracionPasada, utilizado: false },
      ]);
      const resultado = await servicio.login("222222");
      expect(resultado).toBeNull();
    });

    it("debería retornar usuario normal si debeCambiarPin=false", async () => {
      const hash = await crearHashPin("333333");
      mockDb._pushWhereData([
        { id: 3, nombre: "Test3", rol: "pastelera", pinHash: hash, activo: true, debeCambiarPin: false },
      ]);
      const resultado = await servicio.login("333333");
      expect(resultado).not.toBeNull();
      expect(resultado!.debeCambiarPin).toBe(false);
    });
  });
});
