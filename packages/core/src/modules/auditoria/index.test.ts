import { describe, it, expect, beforeEach, vi } from "vitest";
import { crearServicioAuditoria, LIMITE_AUDITORIA } from "./index";

function crearMockDb() {
  const mock: any = {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    leftJoin: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue([]),
  };
  return mock;
}

describe("ServicioAuditoria", () => {
  let mockDb: any;
  let servicio: ReturnType<typeof crearServicioAuditoria>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockDb = crearMockDb();
    servicio = crearServicioAuditoria(mockDb);
  });

  describe("listar", () => {
    it("debería retornar los registros tal cual la DB", async () => {
      const filas = [
        {
          id: 3,
          evento: "venta_creada",
          detalle: '{"ventaId":10}',
          origen: "desktop",
          createdAt: "2026-10-08 12:00:00",
          usuarioId: 1,
          usuarioNombre: "Ana",
          usuarioRol: "propietario",
        },
      ];
      mockDb.limit.mockResolvedValue(filas);

      const resultado = await servicio.listar();
      expect(resultado).toEqual(filas);
    });

    it("debería aplicar el límite máximo de seguridad", async () => {
      await servicio.listar();
      expect(mockDb.limit).toHaveBeenCalledWith(LIMITE_AUDITORIA);
      expect(LIMITE_AUDITORIA).toBe(5000);
    });

    it("sin filtros no debería construir condiciones de where", async () => {
      await servicio.listar();
      expect(mockDb.where).toHaveBeenCalledWith(undefined);
    });

    it("debería filtrar por rango de fecha, evento y usuario", async () => {
      await servicio.listar({
        fechaInicio: "2026-10-01",
        fechaFin: "2026-10-08",
        evento: "login_exitoso",
        usuarioId: 2,
      });
      const condiciones = mockDb.where.mock.calls[0][0];
      expect(condiciones).toBeDefined();
      expect(condiciones).not.toBeNull();
    });

    it("debería ordenar por fecha descendente", async () => {
      await servicio.listar();
      expect(mockDb.orderBy).toHaveBeenCalled();
    });

    it("debería rechazar rango de fechas invertido", async () => {
      await expect(
        servicio.listar({ fechaInicio: "2026-10-08", fechaFin: "2026-10-01" })
      ).rejects.toThrow();
    });

    it("debería rechazar fechas con formato inválido", async () => {
      await expect(servicio.listar({ fechaInicio: "08/10/2026" })).rejects.toThrow();
    });

    it("debería ignorar campos desconocidos (Zod los descarta)", async () => {
      mockDb.limit.mockResolvedValue([]);
      const resultado = await servicio.listar({ inyeccion: "x", evento: "backup" });
      expect(resultado).toEqual([]);
      expect(mockDb.limit).toHaveBeenCalled();
    });
  });
});
