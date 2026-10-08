import { describe, it, expect } from "vitest";
import { formatearMoneda, formatearNotasRelease } from "./utils";

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

describe("formatearNotasRelease", () => {
  it("notas vacías o inexistentes retornan cadena vacía", () => {
    expect(formatearNotasRelease(null)).toBe("");
    expect(formatearNotasRelease(undefined)).toBe("");
    expect(formatearNotasRelease("")).toBe("");
    expect(formatearNotasRelease("   ")).toBe("");
  });

  it("el placeholder de GitHub 'No content.' retorna cadena vacía", () => {
    expect(formatearNotasRelease("No content.")).toBe("");
  });

  it("convierte markdown a texto plano (headers, bullets, links, bold, código)", () => {
    const markdown = [
      "## What's Changed",
      "* Fix **cierre de caja** con `pos.sqlite`",
      "* Nuevo PDF por [commit](https://github.com/x/commit/abc)",
      "",
      "**Full Changelog**: https://github.com/x/compare/v1...v2",
    ].join("\n");
    const salida = formatearNotasRelease(markdown);
    expect(salida).toContain("WHAT'S CHANGED");
    expect(salida).toContain("• Fix cierre de caja con pos.sqlite");
    expect(salida).toContain("• Nuevo PDF por commit");
    expect(salida).toContain("Full Changelog: https://github.com/x/compare/v1...v2");
    expect(salida).not.toContain("**");
    expect(salida).not.toContain("](");
  });

  it("convierte HTML renderizado a texto plano (h2, li, links, entidades)", () => {
    const html =
      '<h2>What\'s Changed</h2><ul><li>Fix caja &amp; stock</li>' +
      '<li>Ver <a href="https://github.com/x">detalle</a></li></ul>';
    const salida = formatearNotasRelease(html);
    expect(salida).toContain("WHAT'S CHANGED");
    expect(salida).toContain("• Fix caja & stock");
    expect(salida).toContain("• Ver detalle");
    expect(salida).not.toContain("<");
    expect(salida).not.toContain("&amp;");
  });

  it("colapsa líneas en blanco excesivas y trimea", () => {
    const salida = formatearNotasRelease("\n\n## Título\n\n\n\nPárrafo\n\n\n");
    expect(salida).toBe("TÍTULO\n\nPárrafo");
  });

  it("texto sin formato se conserva tal cual", () => {
    expect(formatearNotasRelease("Solo texto plano.")).toBe("Solo texto plano.");
  });
});
