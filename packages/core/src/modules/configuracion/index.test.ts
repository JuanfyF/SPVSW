import { describe, it, expect, beforeEach, vi } from "vitest";
import { crearServicioConfiguracion } from "./index";

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
    update: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
  };
  mock._pushWhereData = (...args: any[]) => whereQueue.push(...args);
  return mock;
}

describe("ServicioConfiguracion", () => {
  let mockDb: any;
  let servicio: ReturnType<typeof crearServicioConfiguracion>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockDb = crearMockDb();
    servicio = crearServicioConfiguracion(mockDb);
  });

  describe("obtener", () => {
    it("debería retornar nombre vacío si nunca se guardó", async () => {
      mockDb._pushWhereData([]);
      const config = await servicio.obtener();
      expect(config).toEqual({ nombreNegocio: "" });
    });

    it("debería retornar el nombre guardado", async () => {
      mockDb._pushWhereData([{ id: 1, nombreNegocio: "Dulce Tentación" }]);
      const config = await servicio.obtener();
      expect(config).toEqual({ nombreNegocio: "Dulce Tentación" });
    });
  });

  describe("guardar", () => {
    it("debería insertar si no existe la fila", async () => {
      mockDb._pushWhereData([]);
      const config = await servicio.guardar({ nombreNegocio: "Dulce Tentación" });
      expect(config).toEqual({ nombreNegocio: "Dulce Tentación" });
      expect(mockDb.insert).toHaveBeenCalled();
      expect(mockDb.values).toHaveBeenCalledWith(
        expect.objectContaining({ id: 1, nombreNegocio: "Dulce Tentación" })
      );
      expect(mockDb.update).not.toHaveBeenCalled();
    });

    it("debería actualizar si la fila ya existe", async () => {
      mockDb._pushWhereData([{ id: 1 }]);
      await servicio.guardar({ nombreNegocio: "La Pastelera" });
      expect(mockDb.update).toHaveBeenCalled();
      expect(mockDb.set).toHaveBeenCalledWith(
        expect.objectContaining({ nombreNegocio: "La Pastelera" })
      );
      expect(mockDb.insert).not.toHaveBeenCalled();
    });

    it("debería incluir actualizadoEn al actualizar", async () => {
      mockDb._pushWhereData([{ id: 1 }]);
      await servicio.guardar({ nombreNegocio: "X" });
      const setCall = mockDb.set.mock.calls[0][0];
      expect(typeof setCall.actualizadoEn).toBe("string");
    });

    it("debería fallar con nombre vacío", async () => {
      await expect(servicio.guardar({ nombreNegocio: "" })).rejects.toThrow();
      expect(mockDb.insert).not.toHaveBeenCalled();
      expect(mockDb.update).not.toHaveBeenCalled();
    });

    it("debería fallar con nombre demasiado largo", async () => {
      await expect(
        servicio.guardar({ nombreNegocio: "x".repeat(101) })
      ).rejects.toThrow();
    });

    it("debería aceptar nombre con espacios (trim)", async () => {
      mockDb._pushWhereData([]);
      const config = await servicio.guardar({ nombreNegocio: "  Dulce  " });
      expect(config.nombreNegocio).toBe("Dulce");
    });
  });
});
