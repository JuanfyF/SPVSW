import { describe, it, expect, beforeEach, vi } from "vitest";
import { crearServicioUsuarios } from "./index";

function crearMockDb() {
  const whereQueue: any[] = [];
  const mock: any = {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockImplementation(() => {
      const data = whereQueue.shift() ?? [];
      const chain = {
        limit: vi.fn().mockResolvedValue(data),
        returning: vi.fn().mockResolvedValue(data),
        then: (resolve: any, reject?: any) =>
          Promise.resolve(data).then(resolve, reject),
        [Symbol.toStringTag]: "Promise",
      };
      return chain;
    }),
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
    returning: vi.fn().mockResolvedValue([]),
    update: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
  };
  mock._pushWhereData = (...args: any[]) => whereQueue.push(...args);
  return mock;
}

describe("ServicioUsuarios", () => {
  let mockDb: any;
  let servicio: ReturnType<typeof crearServicioUsuarios>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockDb = crearMockDb();
    servicio = crearServicioUsuarios(mockDb);
  });

  describe("listar", () => {
    it("debería hacer select con campos específicos (sin pinHash)", async () => {
      await servicio.listar();
      expect(mockDb.select).toHaveBeenCalledWith({
        id: expect.anything(),
        nombre: expect.anything(),
        rol: expect.anything(),
        activo: expect.anything(),
        actualizadoEn: expect.anything(),
      });
    });
  });

  describe("obtenerPorId", () => {
    it("debería retornar usuario si existe", async () => {
      mockDb._pushWhereData([{ id: 1, nombre: "Admin", rol: "propietario" }]);
      const resultado = await servicio.obtenerPorId(1);
      expect(resultado).toBeDefined();
      expect(resultado?.id).toBe(1);
    });

    it("debería retornar null si no existe", async () => {
      mockDb._pushWhereData([]);
      const resultado = await servicio.obtenerPorId(999);
      expect(resultado).toBeNull();
    });
  });

  describe("crear", () => {
    it("debería crear un usuario válido", async () => {
      mockDb.returning.mockResolvedValue([
        { id: 1, nombre: "Nuevo", rol: "pastelera", activo: true },
      ]);
      const resultado = await servicio.crear({
        nombre: "Nuevo",
        rol: "pastelera",
        pin: "123456",
      });
      expect(resultado).toBeDefined();
      expect(mockDb.insert).toHaveBeenCalled();
      expect(mockDb.values).toHaveBeenCalledWith(
        expect.objectContaining({ nombre: "Nuevo", rol: "pastelera" })
      );
    });

    it("debería hashear el PIN antes de guardar", async () => {
      mockDb.returning.mockResolvedValue([{ id: 1 }]);
      await servicio.crear({ nombre: "Test", rol: "pastelera", pin: "123456" });
      const valuesCall = mockDb.values.mock.calls[0][0];
      expect(valuesCall.pinHash).not.toBe("123456");
      expect(valuesCall.pinHash).toBeTruthy();
    });

    it("debería fallar con nombre vacío", async () => {
      await expect(
        servicio.crear({ nombre: "", rol: "pastelera", pin: "123456" })
      ).rejects.toThrow();
    });

    it("debería fallar con PIN corto", async () => {
      await expect(
        servicio.crear({ nombre: "Test", rol: "pastelera", pin: "12" })
      ).rejects.toThrow();
    });

    it("debería fallar con PIN no numérico", async () => {
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

  describe("actualizar", () => {
    it("debería actualizar nombre", async () => {
      mockDb.returning.mockResolvedValue([{ id: 1, nombre: "Actualizado" }]);
      await servicio.actualizar(1, { nombre: "Actualizado" });
      expect(mockDb.update).toHaveBeenCalled();
      expect(mockDb.set).toHaveBeenCalledWith(
        expect.objectContaining({ nombre: "Actualizado" })
      );
    });

    it("debería actualizar rol", async () => {
      mockDb.returning.mockResolvedValue([{ id: 1, rol: "propietario" }]);
      await servicio.actualizar(1, { rol: "propietario" });
      expect(mockDb.set).toHaveBeenCalledWith(
        expect.objectContaining({ rol: "propietario" })
      );
    });

    it("debería incluir actualizadoEn", async () => {
      mockDb.returning.mockResolvedValue([{ id: 1 }]);
      await servicio.actualizar(1, { nombre: "Test" });
      const setCall = mockDb.set.mock.calls[0][0];
      expect(setCall.actualizadoEn).toBeDefined();
      expect(typeof setCall.actualizadoEn).toBe("string");
    });

    it("debería retornar null si el usuario no existe", async () => {
      mockDb.returning.mockResolvedValue([]);
      const resultado = await servicio.actualizar(999, { nombre: "Test" });
      expect(resultado).toBeNull();
    });
  });

  describe("desactivar", () => {
    it("debería desactivar un usuario pastelera", async () => {
      mockDb._pushWhereData([{ id: 1, nombre: "Pastelera", rol: "pastelera", activo: true }]);
      await servicio.desactivar(1);
      expect(mockDb.update).toHaveBeenCalled();
      expect(mockDb.set).toHaveBeenCalledWith({ activo: false });
    });

    it("debería desactivar un administrador si hay más de uno", async () => {
      // obtenerPorId returns admin, then count query returns 2
      mockDb._pushWhereData(
        [{ id: 1, nombre: "Admin", rol: "propietario", activo: true }],
        [{ total: 2 }]
      );
      await servicio.desactivar(1);
      expect(mockDb.update).toHaveBeenCalled();
      expect(mockDb.set).toHaveBeenCalledWith({ activo: false });
    });

    it("debería fallar si se intenta desactivar el último administrador", async () => {
      mockDb._pushWhereData(
        [{ id: 1, nombre: "Admin", rol: "propietario", activo: true }],
        [{ total: 1 }]
      );
      await expect(servicio.desactivar(1)).rejects.toThrow(
        "No se puede desactivar el último usuario admin/cajero"
      );
    });

    it("debería fallar si el usuario no existe", async () => {
      mockDb._pushWhereData([]);
      await servicio.desactivar(999);
      expect(mockDb.update).not.toHaveBeenCalled();
    });
  });

  describe("cambiarPin", () => {
    it("debería cambiar el PIN correctamente", async () => {
      mockDb._pushWhereData([{ id: 1 }]);
      await servicio.cambiarPin(1, "654321");
      expect(mockDb.update).toHaveBeenCalled();
      const setCall = mockDb.set.mock.calls[0][0];
      expect(setCall.pinHash).not.toBe("654321");
      expect(setCall.pinHash).toBeTruthy();
    });

    it("debería fallar si el usuario no existe", async () => {
      mockDb._pushWhereData([]);
      await expect(servicio.cambiarPin(999, "654321")).rejects.toThrow(
        "Usuario no encontrado"
      );
      expect(mockDb.update).not.toHaveBeenCalled();
    });

    it("debería fallar con PIN muy corto", async () => {
      await expect(servicio.cambiarPin(1, "12")).rejects.toThrow();
    });

    it("debería fallar con PIN no numérico", async () => {
      await expect(servicio.cambiarPin(1, "abcdef")).rejects.toThrow();
    });

    it("debería fallar con PIN largo", async () => {
      await expect(servicio.cambiarPin(1, "123456789")).rejects.toThrow();
    });
  });
});
