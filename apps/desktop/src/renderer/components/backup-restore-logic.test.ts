import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { ejecutarBackup, ejecutarRestore, generarNombreBackup } from "./backup-restore-logic";

// Mock de fs
vi.mock("fs", () => ({
  copyFileSync: vi.fn(),
  existsSync: vi.fn().mockReturnValue(false),
  unlinkSync: vi.fn(),
}));

import { copyFileSync, existsSync, unlinkSync } from "fs";

describe("backup-restore-logic", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("ejecutarBackup", () => {
    it("crea backup exitosamente sin WAL/SHM", () => {
      const mockSqlite = { pragma: vi.fn(), close: vi.fn() };
      (existsSync as any).mockReturnValue(false);

      const resultado = ejecutarBackup({
        dbPath: "/data/pos.sqlite",
        rutaDestino: "/backup/pos.sqlite",
        sqlite: mockSqlite,
      });

      expect(resultado).toEqual({ ok: true, ruta: "/backup/pos.sqlite" });
      expect(mockSqlite.pragma).toHaveBeenCalledWith("wal_checkpoint(TRUNCATE)");
      expect(mockSqlite.close).toHaveBeenCalled();
      expect(copyFileSync).toHaveBeenCalledWith("/data/pos.sqlite", "/backup/pos.sqlite");
      expect(copyFileSync).toHaveBeenCalledTimes(1);
    });

    it("copia WAL cuando existe", () => {
      const mockSqlite = { pragma: vi.fn(), close: vi.fn() };
      (existsSync as any).mockImplementation((p: string) => p.endsWith("-wal"));

      ejecutarBackup({
        dbPath: "/data/pos.sqlite",
        rutaDestino: "/backup/pos.sqlite",
        sqlite: mockSqlite,
      });

      expect(copyFileSync).toHaveBeenCalledWith("/data/pos.sqlite", "/backup/pos.sqlite");
      expect(copyFileSync).toHaveBeenCalledWith("/data/pos.sqlite-wal", "/backup/pos.sqlite-wal");
      expect(copyFileSync).toHaveBeenCalledTimes(2);
    });

    it("copia SHM cuando existe", () => {
      const mockSqlite = { pragma: vi.fn(), close: vi.fn() };
      (existsSync as any).mockImplementation((p: string) => p.endsWith("-shm"));

      ejecutarBackup({
        dbPath: "/data/pos.sqlite",
        rutaDestino: "/backup/pos.sqlite",
        sqlite: mockSqlite,
      });

      expect(copyFileSync).toHaveBeenCalledWith("/data/pos.sqlite", "/backup/pos.sqlite");
      expect(copyFileSync).toHaveBeenCalledWith("/data/pos.sqlite-shm", "/backup/pos.sqlite-shm");
      expect(copyFileSync).toHaveBeenCalledTimes(2);
    });

    it("copia WAL y SHM cuando ambos existen", () => {
      const mockSqlite = { pragma: vi.fn(), close: vi.fn() };
      (existsSync as any).mockReturnValue(true);

      ejecutarBackup({
        dbPath: "/data/pos.sqlite",
        rutaDestino: "/backup/pos.sqlite",
        sqlite: mockSqlite,
      });

      expect(copyFileSync).toHaveBeenCalledTimes(3);
    });
  });

  describe("ejecutarRestore", () => {
    it("lanza error si el backup no existe", () => {
      (existsSync as any).mockReturnValue(false);

      expect(() =>
        ejecutarRestore({
          dbPath: "/data/pos.sqlite",
          rutaBackup: "/backup/pos.sqlite",
          crearDb: vi.fn(),
        })
      ).toThrow("El archivo de backup no existe");
    });

    it("restaura sin WAL/SHM", () => {
      (existsSync as any).mockImplementation((p: string) => p === "/backup/pos.sqlite");
      const mockCrearDb = vi.fn().mockReturnValue({ db: {}, sqlite: {} });

      const resultado = ejecutarRestore({
        dbPath: "/data/pos.sqlite",
        rutaBackup: "/backup/pos.sqlite",
        crearDb: mockCrearDb,
      });

      expect(resultado).toEqual({ ok: true });
      expect(copyFileSync).toHaveBeenCalledWith("/backup/pos.sqlite", "/data/pos.sqlite");
      expect(copyFileSync).toHaveBeenCalledTimes(1);
      expect(mockCrearDb).toHaveBeenCalledWith("/data/pos.sqlite");
    });

    it("restaura WAL cuando existe en backup", () => {
      (existsSync as any).mockImplementation((p: string) =>
        p === "/backup/pos.sqlite" || p === "/backup/pos.sqlite-wal"
      );
      const mockCrearDb = vi.fn().mockReturnValue({ db: {}, sqlite: {} });

      ejecutarRestore({
        dbPath: "/data/pos.sqlite",
        rutaBackup: "/backup/pos.sqlite",
        crearDb: mockCrearDb,
      });

      expect(copyFileSync).toHaveBeenCalledWith("/backup/pos.sqlite", "/data/pos.sqlite");
      expect(copyFileSync).toHaveBeenCalledWith("/backup/pos.sqlite-wal", "/data/pos.sqlite-wal");
    });

    it("elimina WAL local si no hay WAL en backup", () => {
      (existsSync as any).mockImplementation((p: string) =>
        p === "/backup/pos.sqlite" || p === "/data/pos.sqlite-wal"
      );
      const mockCrearDb = vi.fn().mockReturnValue({ db: {}, sqlite: {} });

      ejecutarRestore({
        dbPath: "/data/pos.sqlite",
        rutaBackup: "/backup/pos.sqlite",
        crearDb: mockCrearDb,
      });

      expect(unlinkSync).toHaveBeenCalledWith("/data/pos.sqlite-wal");
    });

    it("restaura SHM cuando existe en backup", () => {
      (existsSync as any).mockImplementation((p: string) =>
        p === "/backup/pos.sqlite" || p === "/backup/pos.sqlite-shm"
      );
      const mockCrearDb = vi.fn().mockReturnValue({ db: {}, sqlite: {} });

      ejecutarRestore({
        dbPath: "/data/pos.sqlite",
        rutaBackup: "/backup/pos.sqlite",
        crearDb: mockCrearDb,
      });

      expect(copyFileSync).toHaveBeenCalledWith("/backup/pos.sqlite-shm", "/data/pos.sqlite-shm");
    });

    it("elimina SHM local si no hay SHM en backup", () => {
      (existsSync as any).mockImplementation((p: string) =>
        p === "/backup/pos.sqlite" || p === "/data/pos.sqlite-shm"
      );
      const mockCrearDb = vi.fn().mockReturnValue({ db: {}, sqlite: {} });

      ejecutarRestore({
        dbPath: "/data/pos.sqlite",
        rutaBackup: "/backup/pos.sqlite",
        crearDb: mockCrearDb,
      });

      expect(unlinkSync).toHaveBeenCalledWith("/data/pos.sqlite-shm");
    });

    it("llama crearDb para reconectar", () => {
      (existsSync as any).mockImplementation((p: string) => p === "/backup/pos.sqlite");
      const mockCrearDb = vi.fn().mockReturnValue({ db: {}, sqlite: {} });

      ejecutarRestore({
        dbPath: "/data/pos.sqlite",
        rutaBackup: "/backup/pos.sqlite",
        crearDb: mockCrearDb,
      });

      expect(mockCrearDb).toHaveBeenCalledTimes(1);
      expect(mockCrearDb).toHaveBeenCalledWith("/data/pos.sqlite");
    });
  });

  describe("generarNombreBackup", () => {
    it("genera nombre con fecha ISO", () => {
      const nombre = generarNombreBackup("2026-08-27T15:30:00.000Z");
      expect(nombre).toBe("sweet-bakery-backup-2026-08-27.sqlite");
    });

    it("genera nombre con fecha actual si no se provee", () => {
      const nombre = generarNombreBackup();
      expect(nombre).toMatch(/^sweet-bakery-backup-\d{4}-\d{2}-\d{2}\.sqlite$/);
    });

    it("usa solo la parte de fecha de ISO string", () => {
      const nombre = generarNombreBackup("2025-12-31T23:59:59.999Z");
      expect(nombre).toBe("sweet-bakery-backup-2025-12-31.sqlite");
    });
  });
});
