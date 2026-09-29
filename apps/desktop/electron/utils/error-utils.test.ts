import { describe, it, expect } from "vitest";
import { limpiarErrorIPC, limpiarMensajeError } from "./error-utils";

describe("limpiarErrorIPC", () => {
  it("elimina el prefijo de Electron IPC", () => {
    const err = new Error(
      "Error invoking remote method 'auth:login': Error: PIN incorrecto. Intentos restantes: 4"
    );
    const resultado = limpiarErrorIPC(err, "auth:login");
    expect(resultado.message).toBe("PIN incorrecto. Intentos restantes: 4");
  });

  it("elimina el prefijo en errores de sesión", () => {
    const err = new Error(
      "Error invoking remote method 'usuarios:listar': Error: Sesión no válida. Inicie sesión nuevamente."
    );
    const resultado = limpiarErrorIPC(err, "usuarios:listar");
    expect(resultado.message).toBe(
      "Sesión no válida. Inicie sesión nuevamente."
    );
  });

  it("maneja mensajes sin prefijo (ya limpios)", () => {
    const err = new Error("Mensaje ya limpio");
    const resultado = limpiarErrorIPC(err, "auth:login");
    expect(resultado.message).toBe("Mensaje ya limpio");
  });

  it("maneja errores que no son Error (string)", () => {
    const resultado = limpiarErrorIPC("Error crudo", "auth:login");
    expect(resultado.message).toBe("Error crudo");
  });

  it("elimina el prefijo 'Error: ' residual", () => {
    const err = new Error("Error: Mensaje con Error residual");
    const resultado = limpiarErrorIPC(err, "test:channel");
    expect(resultado.message).toBe("Mensaje con Error residual");
  });

  it("retorna una instancia de Error", () => {
    const err = new Error("test");
    const resultado = limpiarErrorIPC(err, "canal");
    expect(resultado).toBeInstanceOf(Error);
  });

  it("maneja rate limit con prefijo completo", () => {
    const err = new Error(
      "Error invoking remote method 'auth:login': Error: Demasiados intentos. Espere 15 minutos."
    );
    const resultado = limpiarErrorIPC(err, "auth:login");
    expect(resultado.message).toBe(
      "Demasiados intentos. Espere 15 minutos."
    );
  });
});

describe("limpiarMensajeError", () => {
  it("elimina el prefijo IPC de cualquier canal", () => {
    const msg =
      "Error invoking remote method 'caja:abrir': Error: Ya existe una sesión abierta";
    expect(limpiarMensajeError(msg)).toBe(
      "Ya existe una sesión abierta"
    );
  });

  it("retorna el mensaje original si no tiene prefijo", () => {
    expect(limpiarMensajeError("Error normal")).toBe("Error normal");
  });

  it("maneja prefijo con diferentes formatos de Error", () => {
    const conError =
      "Error invoking remote method 'x': Error: algo falló";
    const sinError =
      "Error invoking remote method 'x': algo falló";
    expect(limpiarMensajeError(conError)).toBe("algo falló");
    expect(limpiarMensajeError(sinError)).toBe("algo falló");
  });

  it("maneja string vacío", () => {
    expect(limpiarMensajeError("")).toBe("");
  });

  it("no altera mensajes que contengan 'Error invoking' en medio", () => {
    const msg = "Fallo al procesar Error invoking something interno";
    expect(limpiarMensajeError(msg)).toBe(msg);
  });
});
