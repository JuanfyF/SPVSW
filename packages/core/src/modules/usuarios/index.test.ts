import { describe, it, expect, beforeEach, vi } from "vitest";
import { crearServicioUsuarios } from "./index";

const PROPIETARIO = { id: 1, rol: "propietario" };
const CAJERO = { id: 2, rol: "cajero" };

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
      const resultado = await servicio.crear(
        {
          nombre: "Nuevo",
          rol: "pastelera",
          pin: "384729",
        },
        PROPIETARIO
      );
      expect(resultado).toBeDefined();
      expect(mockDb.insert).toHaveBeenCalled();
      expect(mockDb.values).toHaveBeenCalledWith(
        expect.objectContaining({ nombre: "Nuevo", rol: "pastelera" })
      );
    });

    it("debería hashear el PIN antes de guardar", async () => {
      mockDb.returning.mockResolvedValue([{ id: 1 }]);
      await servicio.crear({ nombre: "Test", rol: "pastelera", pin: "384729" }, PROPIETARIO);
      const valuesCall = mockDb.values.mock.calls[0][0];
      expect(valuesCall.pinHash).not.toBe("384729");
      expect(valuesCall.pinHash).toBeTruthy();
    });

    it("debería fallar con nombre vacío", async () => {
      await expect(
        servicio.crear({ nombre: "", rol: "pastelera", pin: "384729" }, PROPIETARIO)
      ).rejects.toThrow();
    });

    it("debería fallar con PIN corto", async () => {
      await expect(
        servicio.crear({ nombre: "Test", rol: "pastelera", pin: "12" }, PROPIETARIO)
      ).rejects.toThrow();
    });

    it("debería fallar con PIN no numérico", async () => {
      await expect(
        servicio.crear({ nombre: "Test", rol: "pastelera", pin: "abcdef" }, PROPIETARIO)
      ).rejects.toThrow();
    });

    it("debería fallar con rol inválido", async () => {
      await expect(
        servicio.crear({ nombre: "Test", rol: "invalido" as any, pin: "384729" }, PROPIETARIO)
      ).rejects.toThrow();
    });
  });

  describe("actualizar", () => {
    it("debería actualizar nombre", async () => {
      mockDb.returning.mockResolvedValue([{ id: 1, nombre: "Actualizado" }]);
      await servicio.actualizar(1, { nombre: "Actualizado" }, PROPIETARIO);
      expect(mockDb.update).toHaveBeenCalled();
      expect(mockDb.set).toHaveBeenCalledWith(
        expect.objectContaining({ nombre: "Actualizado" })
      );
    });

    it("debería actualizar rol", async () => {
      mockDb.returning.mockResolvedValue([{ id: 1, rol: "propietario" }]);
      await servicio.actualizar(1, { rol: "propietario" }, PROPIETARIO);
      expect(mockDb.set).toHaveBeenCalledWith(
        expect.objectContaining({ rol: "propietario" })
      );
    });

    it("debería incluir actualizadoEn", async () => {
      mockDb.returning.mockResolvedValue([{ id: 1 }]);
      await servicio.actualizar(1, { nombre: "Test" }, PROPIETARIO);
      const setCall = mockDb.set.mock.calls[0][0];
      expect(setCall.actualizadoEn).toBeDefined();
      expect(typeof setCall.actualizadoEn).toBe("string");
    });

    it("debería retornar null si el usuario no existe", async () => {
      mockDb.returning.mockResolvedValue([]);
      const resultado = await servicio.actualizar(999, { nombre: "Test" }, PROPIETARIO);
      expect(resultado).toBeNull();
    });
  });

  describe("desactivar", () => {
    it("debería desactivar un usuario pastelera", async () => {
      mockDb._pushWhereData([{ id: 1, nombre: "Pastelera", rol: "pastelera", activo: true }]);
      await servicio.desactivar(1, PROPIETARIO);
      expect(mockDb.update).toHaveBeenCalled();
      expect(mockDb.set).toHaveBeenCalledWith({ activo: false });
    });

    it("debería desactivar un administrador si hay más de uno", async () => {
      // obtenerPorId returns admin, then count query returns 2
      mockDb._pushWhereData(
        [{ id: 1, nombre: "Admin", rol: "propietario", activo: true }],
        [{ total: 2 }]
      );
      await servicio.desactivar(1, PROPIETARIO);
      expect(mockDb.update).toHaveBeenCalled();
      expect(mockDb.set).toHaveBeenCalledWith({ activo: false });
    });

    it("debería fallar si se intenta desactivar el último administrador", async () => {
      mockDb._pushWhereData(
        [{ id: 1, nombre: "Admin", rol: "propietario", activo: true }],
        [{ total: 1 }]
      );
      await expect(servicio.desactivar(1, PROPIETARIO)).rejects.toThrow(
        "No se puede desactivar el último usuario admin/cajero"
      );
    });

    it("debería fallar si el usuario no existe", async () => {
      mockDb._pushWhereData([]);
      await servicio.desactivar(999, PROPIETARIO);
      expect(mockDb.update).not.toHaveBeenCalled();
    });
  });

  describe("cambiarPin", () => {
    it("debería cambiar el PIN correctamente", async () => {
      mockDb._pushWhereData([{ id: 1 }]);
      await servicio.cambiarPin(1, "654321", PROPIETARIO);
      expect(mockDb.update).toHaveBeenCalled();
      const setCall = mockDb.set.mock.calls[0][0];
      expect(setCall.pinHash).not.toBe("654321");
      expect(setCall.pinHash).toBeTruthy();
    });

    it("debería fallar si el usuario no existe", async () => {
      mockDb._pushWhereData([]);
      await expect(servicio.cambiarPin(999, "654321", PROPIETARIO)).rejects.toThrow(
        "Usuario no encontrado"
      );
      expect(mockDb.update).not.toHaveBeenCalled();
    });

    it("debería fallar con PIN muy corto", async () => {
      await expect(servicio.cambiarPin(1, "12", PROPIETARIO)).rejects.toThrow();
    });

    it("debería fallar con PIN no numérico", async () => {
      await expect(servicio.cambiarPin(1, "abcdef", PROPIETARIO)).rejects.toThrow();
    });

    it("debería fallar con PIN largo", async () => {
      await expect(servicio.cambiarPin(1, "123456789", PROPIETARIO)).rejects.toThrow();
    });
  });

  describe("control de acceso — cajero vs propietario (Opción A)", () => {
    it("cajero NO debería poder crear un propietario", async () => {
      await expect(
        servicio.crear({ nombre: "Nuevo Owner", rol: "propietario", pin: "384729" }, CAJERO)
      ).rejects.toThrow("El cajero no puede gestionar la cuenta del propietario");
      expect(mockDb.insert).not.toHaveBeenCalledWith(
        expect.objectContaining({ nombre: "Nuevo Owner" })
      );
    });

    it("cajero SÍ debería poder crear una pastelera", async () => {
      mockDb.returning.mockResolvedValue([{ id: 5, nombre: "Ana", rol: "pastelera" }]);
      const resultado = await servicio.crear(
        { nombre: "Ana", rol: "pastelera", pin: "384729" },
        CAJERO
      );
      expect(resultado).toBeDefined();
    });

    it("cajero SÍ debería poder crear otro cajero", async () => {
      mockDb.returning.mockResolvedValue([{ id: 6, nombre: "Luis", rol: "cajero" }]);
      const resultado = await servicio.crear(
        { nombre: "Luis", rol: "cajero", pin: "384729" },
        CAJERO
      );
      expect(resultado).toBeDefined();
    });

    it("cajero NO debería poder ascender a un usuario a propietario", async () => {
      mockDb._pushWhereData([{ id: 3, nombre: "Ana", rol: "pastelera" }]);
      await expect(
        servicio.actualizar(3, { rol: "propietario" }, CAJERO)
      ).rejects.toThrow("El cajero no puede gestionar la cuenta del propietario");
      expect(mockDb.update).not.toHaveBeenCalled();
    });

    it("cajero NO debería poder editar al propietario", async () => {
      mockDb._pushWhereData([{ id: 1, nombre: "Dueño", rol: "propietario" }]);
      await expect(
        servicio.actualizar(1, { nombre: "Hackeado" }, CAJERO)
      ).rejects.toThrow("El cajero no puede gestionar la cuenta del propietario");
      expect(mockDb.update).not.toHaveBeenCalled();
    });

    it("cajero SÍ debería poder editar una pastelera", async () => {
      mockDb._pushWhereData([{ id: 3, nombre: "Ana", rol: "pastelera" }]);
      mockDb.returning.mockResolvedValue([{ id: 3, nombre: "Ana María" }]);
      await servicio.actualizar(3, { nombre: "Ana María" }, CAJERO);
      expect(mockDb.update).toHaveBeenCalled();
    });

    it("cajero NO debería poder desactivar al propietario", async () => {
      mockDb._pushWhereData([{ id: 1, nombre: "Dueño", rol: "propietario", activo: true }]);
      await expect(servicio.desactivar(1, CAJERO)).rejects.toThrow(
        "El cajero no puede gestionar la cuenta del propietario"
      );
      expect(mockDb.update).not.toHaveBeenCalled();
    });

    it("cajero SÍ debería poder desactivar un cajero (con más de uno activo)", async () => {
      mockDb._pushWhereData(
        [{ id: 4, nombre: "Otro", rol: "cajero", activo: true }],
        [{ total: 2 }]
      );
      await servicio.desactivar(4, CAJERO);
      expect(mockDb.set).toHaveBeenCalledWith({ activo: false });
    });

    it("cajero NO debería poder cambiar el PIN del propietario", async () => {
      mockDb._pushWhereData([{ id: 1, rol: "propietario" }]);
      await expect(servicio.cambiarPin(1, "654321", CAJERO)).rejects.toThrow(
        "El cajero no puede gestionar la cuenta del propietario"
      );
      expect(mockDb.update).not.toHaveBeenCalled();
    });

    it("cajero SÍ debería poder cambiar el PIN de una pastelera", async () => {
      mockDb._pushWhereData([{ id: 3, rol: "pastelera" }]);
      await servicio.cambiarPin(3, "654321", CAJERO);
      expect(mockDb.update).toHaveBeenCalled();
    });

    it("propietario NO debería tener restricciones de gestión", async () => {
      mockDb.returning.mockResolvedValue([{ id: 9, nombre: "Owner2", rol: "propietario" }]);
      const resultado = await servicio.crear(
        { nombre: "Owner2", rol: "propietario", pin: "384729" },
        PROPIETARIO
      );
      expect(resultado).toBeDefined();
    });
  });
});
