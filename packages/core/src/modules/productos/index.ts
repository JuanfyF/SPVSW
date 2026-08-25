/**
 * Módulo: Productos (AGENT.md sección 1.1)
 *
 * CRUD de productos con validación de precios según tipo de venta.
 * Un producto artesanal tiene IVA 0% (futuro SRI).
 */

import { PosDatabase, productos, eq, like } from "@pos/db";
import {
  ActualizarProductoSchema,
  BuscarProductoSchema,
  CrearProductoInput,
  CrearProductoSchema,
  IdSchema,
} from "@pos/shared";

export function crearServicioProductos(db: PosDatabase) {
  return {
    /**
     * Lista todos los productos activos.
     */
    async listar() {
      return db
        .select()
        .from(productos)
        .where(eq(productos.activo, true));
    },

    /**
     * Lista productos por categoría.
     */
    async listarPorCategoria(categoria: string) {
      return db
        .select()
        .from(productos)
        .where(eq(productos.categoria, categoria));
    },

    /**
     * Busca productos por nombre (búsqueda parcial, case-insensitive).
     */
    async buscar(nombre: string) {
      const validados = BuscarProductoSchema.parse({ nombre });
      return db
        .select()
        .from(productos)
        .where(like(productos.nombre, `%${validados.nombre}%`));
    },

    /**
     * Obtiene un producto por ID.
     */
    async obtenerPorId(id: number) {
      IdSchema.parse(id);
      const resultado = await db
        .select()
        .from(productos)
        .where(eq(productos.id, id))
        .limit(1);

      return resultado[0] ?? null;
    },

    /**
     * Crea un nuevo producto con validación de precios.
     */
    async crear(datos: CrearProductoInput) {
      const validados = CrearProductoSchema.parse(datos);

      // Validar precios según tipo de venta
      if (validados.tipoVenta === "entero" && !validados.precioEntero) {
        throw new Error("Precio entero es requerido para productos de venta entera");
      }
      if (validados.tipoVenta === "porcion" && !validados.precioPorcion) {
        throw new Error("Precio porción es requerido para productos de venta por porción");
      }

      const resultado = await db
        .insert(productos)
        .values({
          nombre: validados.nombre,
          categoria: validados.categoria ?? null,
          tipoVenta: validados.tipoVenta,
          precioEntero: validados.precioEntero ?? null,
          precioPorcion: validados.precioPorcion ?? null,
          artesanal: validados.artesanal ?? false,
        })
        .returning();

      return resultado[0];
    },

    /**
     * Actualiza un producto existente.
     */
    async actualizar(id: number, datos: Partial<CrearProductoInput>) {
      IdSchema.parse(id);
      const validados = ActualizarProductoSchema.parse(datos);
      const resultado = await db
        .update(productos)
        .set({
          ...validados,
          actualizadoEn: new Date().toISOString(),
        })
        .where(eq(productos.id, id))
        .returning();

      return resultado[0] ?? null;
    },

    /**
     * Desactiva un producto (soft delete).
     */
    async desactivar(id: number) {
      IdSchema.parse(id);
      await db
        .update(productos)
        .set({ activo: false })
        .where(eq(productos.id, id));
    },
  };
}
