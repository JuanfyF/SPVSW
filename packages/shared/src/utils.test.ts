import { describe, it, expect } from "vitest";
import { formatearMoneda } from "./utils";

describe("formatearMoneda", () => {
  it("formatea cero", () => {
    expect(formatearMoneda(0)).toBe("$0,00");
  });

  it("formatea enteros simples", () => {
    expect(formatearMoneda(50)).toBe("$50,00");
  });

  it("formatea decimales", () => {
    expect(formatearMoneda(50.5)).toBe("$50,50");
    expect(formatearMoneda(0.05)).toBe("$0,05");
  });

  it("agrega separador de miles con punto (es-EC)", () => {
    expect(formatearMoneda(1234.5)).toBe("$1.234,50");
    expect(formatearMoneda(1000000)).toBe("$1.000.000,00");
  });

  it("usa coma decimal (es-EC)", () => {
    expect(formatearMoneda(70.99)).toBe("$70,99");
  });

  it("negativos llevan signo antes del $", () => {
    expect(formatearMoneda(-50)).toBe("-$50,00");
    expect(formatearMoneda(-1234.5)).toBe("-$1.234,50");
  });

  it("null y undefined retornan $0,00", () => {
    expect(formatearMoneda(null)).toBe("$0,00");
    expect(formatearMoneda(undefined)).toBe("$0,00");
  });

  it("NaN e Infinity retornan $0,00", () => {
    expect(formatearMoneda(NaN)).toBe("$0,00");
    expect(formatearMoneda(Infinity)).toBe("$0,00");
    expect(formatearMoneda(-Infinity)).toBe("$0,00");
  });

  it("siempre retorna 2 decimales", () => {
    expect(formatearMoneda(1)).toMatch(/,\d{2}$/);
    expect(formatearMoneda(1000)).toMatch(/,\d{2}$/);
  });
});
