/**
 * Handlers IPC de gestión de pedidos.
 */
import { ipcMain } from "electron";
import { ctx } from "./context";

export function registrarPedidosHandlers() {
  const servicios = ctx.getServicios();

  ipcMain.handle("pedidos:crear", ctx.safeHandler(async (_event, datos: unknown) => {
    const resultado = await servicios.pedidos.crear(datos as any);
    ctx.logAuditoria("pedido_creado", undefined, { pedidoId: resultado.id, cliente: resultado.cliente, totalEstimado: resultado.totalEstimado });
    return resultado;
  }, { auth: true }));

  ipcMain.handle("pedidos:marcarListo", ctx.safeHandler(async (_event, pedidoId: number) => {
    return servicios.pedidos.marcarListo(pedidoId);
  }, { auth: true }));

  ipcMain.handle("pedidos:actualizarEstado", ctx.safeHandler(async (
    _event, pedidoId: number, nuevoEstado: "pendiente" | "en_proceso" | "listo" | "entregado" | "cancelado"
  ) => {
    return servicios.pedidos.actualizarEstado(pedidoId, nuevoEstado);
  }, { auth: true }));

  ipcMain.handle("pedidos:entregar", ctx.safeHandler(async (
    _event,
    pedidoId: number,
    sesionCajaEntregaId: number,
    metodoPagoSaldo?: string
  ) => {
    const pedido = await servicios.pedidos.obtenerPorId(pedidoId);
    if (!pedido) throw new Error("Pedido no encontrado");
    const detalles = await servicios.pedidos.obtenerDetalle(pedidoId);

    const saldoCobrado = Math.max(
      (pedido.totalEstimado ?? 0) - (pedido.anticipo ?? 0),
      0
    );

    await servicios.pedidos.entregar(
      pedidoId,
      sesionCajaEntregaId,
      metodoPagoSaldo as "efectivo" | "transferencia" | undefined
    );

    ctx.logAuditoria("pedido_entregado", undefined, { pedidoId, sesionCajaEntregaId, metodoPagoSaldo, saldoCobrado });

    const detallesValidos = detalles
      .filter((d) => d.productoId !== null)
      .map((d) => ({
        productoId: d.productoId!,
        unidad: ((d as any).unidad as "entero" | "porcion") || "entero",
        cantidad: 0,
        precioUnitario: d.precioUnitario,
        subtotal: d.subtotal,
      }));

    if (saldoCobrado > 0) {
      try {
        await servicios.ventas.crear({
          sesionCajaId: sesionCajaEntregaId,
          total: saldoCobrado,
          metodoPago: (metodoPagoSaldo as "efectivo" | "transferencia") || "efectivo",
          tipoOrigen: "pedido",
          requiereFactura: false,
          clienteNombre: pedido.cliente,
          detalles: detallesValidos.length > 0 ? detallesValidos : [{
            productoId: 1,
            unidad: "entero" as const,
            cantidad: 1,
            precioUnitario: saldoCobrado,
            subtotal: saldoCobrado,
          }],
        }, true);
      } catch (ventaErr) {
        await servicios.pedidos.revertirEntrega(pedidoId);
        throw ventaErr;
      }
    }

    ctx.notificarCambio();
    return { exito: true };
  }, { auth: true }));

  ipcMain.handle("pedidos:revertirEntrega", ctx.safeHandler(async (_event, pedidoId: number) => {
    await servicios.pedidos.revertirEntrega(pedidoId);
    return { exito: true };
  }, { auth: true }));

  ipcMain.handle("pedidos:cancelar", ctx.safeHandler(async (
    _event,
    pedidoId: number,
    motivo: string,
    metodoDevolucion: string,
    _registradoPor: number,
    sesionCajaDevolucionId?: number
  ) => {
    const usuarioActual = ctx.getUsuarioActual()!;
    const resultado = await servicios.pedidos.cancelar(
      pedidoId,
      motivo,
      metodoDevolucion as "efectivo" | "transferencia",
      usuarioActual.id,
      sesionCajaDevolucionId
    );
    ctx.logAuditoria("pedido_cancelado", usuarioActual.id, { pedidoId, motivo, metodoDevolucion });
    return resultado;
  }, { auth: true }));

  ipcMain.handle("pedidos:listarPorEstado", ctx.safeHandler(async (_event, estado: string) => {
    return servicios.pedidos.listarPorEstado(estado);
  }, { auth: true }));

  ipcMain.handle("pedidos:listarActivos", ctx.safeHandler(async () => {
    return servicios.pedidos.listarActivos();
  }, { auth: true }));

  ipcMain.handle("pedidos:listarTodos", ctx.safeHandler(async () => {
    return servicios.pedidos.listarTodos();
  }, { auth: true }));

  ipcMain.handle("pedidos:listarPorSesionAnticipo", ctx.safeHandler(async (_event, sesionCajaId: number) => {
    return servicios.pedidos.listarPorSesionAnticipo(sesionCajaId);
  }, { auth: true }));

  ipcMain.handle("pedidos:listarPorFecha", ctx.safeHandler(async (_event, fechaInicio: string, fechaFin: string) => {
    return servicios.pedidos.listarPorFecha(fechaInicio, fechaFin);
  }, { auth: true }));

  ipcMain.handle("pedidos:obtenerPorId", ctx.safeHandler(async (_event, id: number) => {
    return servicios.pedidos.obtenerPorId(id);
  }, { auth: true }));

  ipcMain.handle("pedidos:obtenerDetalle", ctx.safeHandler(async (_event, pedidoId: number) => {
    return servicios.pedidos.obtenerDetalle(pedidoId);
  }, { auth: true }));

  ipcMain.handle("pedidos:obtenerResumen", ctx.safeHandler(async (_event, pedidoId: number) => {
    return servicios.pedidos.obtenerResumen(pedidoId);
  }, { auth: true }));
}
