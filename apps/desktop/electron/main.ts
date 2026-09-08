import { app, BrowserWindow, ipcMain } from "electron";
import path from "node:path";
import { randomInt } from "node:crypto";
import { crearMenuPrincipal, setVentanaPrincipal } from "./menu";
import { setupAutoUpdater } from "./updater";

// Desactivar aceleración de hardware y GPU
process.env.ELECTRON_DISABLE_GPU = "1";
app.disableHardwareAcceleration();
app.commandLine.appendSwitch("disable-gpu");
app.commandLine.appendSwitch("disable-software-rasterizer");
app.commandLine.appendSwitch("ozone-platform=x11");
app.commandLine.appendSwitch("in-process-gpu");
app.commandLine.appendSwitch("no-sandbox");
import { createDb, createDbWithSqlite, migrate, eq } from "@pos/db";
import { usuarios, auditLog } from "@pos/db";
import { crearHashPin } from "@pos/shared";
import { startLocalServer } from "@pos/local-server";
import {
  crearServicioAuth,
  crearServicioUsuarios,
  crearServicioEmpleados,
  crearServicioProductos,
  crearServicioCaja,
  crearServicioStock,
  crearServicioVentas,
  crearServicioPedidos,
  crearServicioGastos,
  crearServicioNomina,
  crearServicioReportes,
} from "@pos/core";

let mainWindow: BrowserWindow | null = null;
let db: ReturnType<typeof createDb> | null = null;
let dbPath: string = "";

// Servicios de dominio
let servicios: {
  auth: ReturnType<typeof crearServicioAuth>;
  usuarios: ReturnType<typeof crearServicioUsuarios>;
  empleados: ReturnType<typeof crearServicioEmpleados>;
  productos: ReturnType<typeof crearServicioProductos>;
  caja: ReturnType<typeof crearServicioCaja>;
  stock: ReturnType<typeof crearServicioStock>;
  ventas: ReturnType<typeof crearServicioVentas>;
  pedidos: ReturnType<typeof crearServicioPedidos>;
  gastos: ReturnType<typeof crearServicioGastos>;
  nomina: ReturnType<typeof crearServicioNomina>;
  reportes: ReturnType<typeof crearServicioReportes>;
} | null = null;

// Estado de autenticación
let usuarioActual: { id: number; nombre: string; rol: string } | null = null;
let timeoutSesion: ReturnType<typeof setTimeout> | null = null;
const SESION_TIMEOUT_MS = 15 * 60 * 1000; // 15 minutos de inactividad

function reiniciarTimeoutSesion() {
  if (timeoutSesion) clearTimeout(timeoutSesion);
  if (usuarioActual) {
    timeoutSesion = setTimeout(() => {
      console.log("Sesión expirada por inactividad (15 min)");
      usuarioActual = null;
      mainWindow?.webContents.send("sesion:expirada");
    }, SESION_TIMEOUT_MS);
  }
}

function safeHandler<T extends (...args: any[]) => Promise<any>>(fn: T): T {
  return (async (...args: any[]) => {
    try {
      return await fn(...args);
    } catch (err: any) {
      const message = err?.message ?? String(err);
      console.error(`[IPC Error] ${message}`);
      throw new Error(message);
    }
  }) as T;
}

function requireAuth(): void {
  if (!usuarioActual) {
    throw new Error("Sesión no válida. Inicie sesión nuevamente.");
  }
}

function requireAdmin(): void {
  requireAuth();
  if (usuarioActual!.rol !== "propietario") {
    // Log de auditoría para denegación de permisos
    try {
      db?.insert(auditLog).values({
        evento: "permiso_denegado",
        usuarioId: usuarioActual!.id,
        detalle: JSON.stringify({ rol: usuarioActual!.rol }),
        origen: "desktop",
      });
    } catch { /* audit logging es best-effort */ }
    throw new Error("No tiene permisos para realizar esta acción.");
  }
}

function registrarHandlers() {
  if (!servicios) throw new Error("Servicios no inicializados");

  // Resetear timeout de sesión en cada llamada IPC (actividad del usuario)
  ipcMain.on("ipc-invoke", () => {
    if (usuarioActual) reiniciarTimeoutSesion();
  });

  // ============================================================
  // RATE LIMITING — Desktop login
  // ============================================================
  const intentosLogin = new Map<string, { count: number; resetAt: number }>();
  const MAX_INTENTOS = 5;
  const VENTANA_MS = 15 * 60 * 1000; // 15 minutos

  function verificarRateLimitDesktop(clave: string): { permitido: boolean; restantes: number } {
    const ahora = Date.now();
    const datos = intentosLogin.get(clave);

    if (!datos || ahora > datos.resetAt) {
      intentosLogin.set(clave, { count: 1, resetAt: ahora + VENTANA_MS });
      return { permitido: true, restantes: MAX_INTENTOS - 1 };
    }

    if (datos.count >= MAX_INTENTOS) {
      return { permitido: false, restantes: 0 };
    }

    datos.count++;
    return { permitido: true, restantes: MAX_INTENTOS - datos.count };
  }

  // Limpiar entradas expiradas cada 5 minutos
  setInterval(() => {
    const ahora = Date.now();
    for (const [clave, datos] of intentosLogin.entries()) {
      if (ahora > datos.resetAt) {
        intentosLogin.delete(clave);
      }
    }
  }, 5 * 60 * 1000);

  // ============================================================
  // AUTH
  // ============================================================
  ipcMain.handle("auth:login", async (_event, pin: string, rol?: string) => {
    const { permitido, restantes } = verificarRateLimitDesktop("desktop");

    if (!permitido) {
      throw new Error("Demasiados intentos. Espere 15 minutos.");
    }

    const usuario = await servicios!.auth.login(pin);

    if (!usuario) {
      // Log de intento fallido
      try {
        db?.insert(auditLog).values({
          evento: "login_fallido",
          detalle: JSON.stringify({ intentosRestantes: restantes }),
          origen: "desktop",
        });
      } catch { /* audit logging es best-effort */ }
      throw new Error(`PIN incorrecto. Intentos restantes: ${restantes}`);
    }

    // Filtrar por rol si se especifica (AGENT.md 5.1 — defensa en profundidad)
    if (rol && usuario.rol !== rol) {
      return { usuario: null, sesionAbierta: null };
    }

    usuarioActual = usuario;
    reiniciarTimeoutSesion();

    // Log de login exitoso
    try {
      db?.insert(auditLog).values({
        evento: "login_exitoso",
        usuarioId: usuario.id,
        detalle: JSON.stringify({ nombre: usuario.nombre, rol: usuario.rol }),
        origen: "desktop",
      });
    } catch { /* audit logging es best-effort */ }

    // Si hay sesión de caja abierta, devolverla junto con el usuario
    let sesionAbierta = null;
    if (usuario) {
      sesionAbierta = await servicios!.caja.obtenerSesionAbierta(usuario.id);
    }

    return { usuario, sesionAbierta };
  });

  ipcMain.handle("auth:logout", async () => {
    usuarioActual = null;
    if (timeoutSesion) {
      clearTimeout(timeoutSesion);
      timeoutSesion = null;
    }
    return true;
  });

  ipcMain.handle("auth:getUsuarioActual", async () => {
    return usuarioActual;
  });

  ipcMain.handle("auth:restablecerPin", safeHandler(async (_event, usuarioId: number) => {
    if (!usuarioActual) throw new Error("No hay usuario logueado");
    const resultado = await servicios!.auth.restablecerPin(usuarioId, usuarioActual.id);
    // Log de auditoría
    try {
      db?.insert(auditLog).values({
        evento: "pin_reset",
        usuarioId: usuarioActual.id,
        detalle: JSON.stringify({ usuarioResetId: usuarioId, nombre: resultado.nombre }),
        origen: "desktop",
      });
    } catch { /* audit logging es best-effort */ }
    return resultado;
  }));

  // ============================================================
  // USUARIOS
  // ============================================================
  ipcMain.handle("usuarios:listar", async () => {
    requireAdmin();
    return servicios!.usuarios.listar();
  });

  ipcMain.handle("usuarios:obtenerPorId", async (_event, id: number) => {
    requireAdmin();
    return servicios!.usuarios.obtenerPorId(id);
  });

  ipcMain.handle("usuarios:crear", safeHandler(async (_event, datos: unknown) => {
    requireAdmin();
    return servicios!.usuarios.crear(datos as any);
  }));

  ipcMain.handle(
    "usuarios:actualizar",
    async (_event, id: number, datos: unknown) => {
      requireAdmin();
      return servicios!.usuarios.actualizar(id, datos as any);
    }
  );

  ipcMain.handle("usuarios:desactivar", async (_event, id: number) => {
    requireAdmin();
    return servicios!.usuarios.desactivar(id);
  });

  ipcMain.handle(
    "usuarios:cambiarPin",
    safeHandler(async (_event, id: number, nuevoPin: string) => {
      requireAdmin();
      return servicios!.usuarios.cambiarPin(id, nuevoPin);
    })
  );

  // ============================================================
  // EMPLEADOS
  // ============================================================
  ipcMain.handle("empleados:listar", async () => {
    requireAuth();
    return servicios!.empleados.listar();
  });

  ipcMain.handle("empleados:obtenerPorId", async (_event, id: number) => {
    requireAuth();
    return servicios!.empleados.obtenerPorId(id);
  });

  ipcMain.handle("empleados:crear", async (_event, datos: unknown) => {
    requireAuth();
    return servicios!.empleados.crear(datos as any);
  });

  ipcMain.handle(
    "empleados:actualizar",
    async (_event, id: number, datos: unknown) => {
      requireAuth();
      return servicios!.empleados.actualizar(id, datos as any);
    }
  );

  ipcMain.handle("empleados:desactivar", async (_event, id: number) => {
    requireAuth();
    return servicios!.empleados.desactivar(id);
  });

  // ============================================================
  // PRODUCTOS
  // ============================================================
  ipcMain.handle("productos:listar", async () => {
    requireAuth();
    return servicios!.productos.listar();
  });

  ipcMain.handle("productos:obtenerPorId", async (_event, id: number) => {
    requireAuth();
    return servicios!.productos.obtenerPorId(id);
  });

  ipcMain.handle("productos:crear", safeHandler(async (_event, datos: unknown) => {
    requireAuth();
    return servicios!.productos.crear(datos as any);
  }));

  ipcMain.handle(
    "productos:actualizar",
    safeHandler(async (_event, id: number, datos: unknown) => {
      requireAuth();
      return servicios!.productos.actualizar(id, datos as any);
    })
  );

  ipcMain.handle("productos:desactivar", async (_event, id: number) => {
    requireAuth();
    return servicios!.productos.desactivar(id);
  });

  ipcMain.handle("productos:buscar", async (_event, nombre: string) => {
    requireAuth();
    return servicios!.productos.buscar(nombre);
  });

  // ============================================================
  // CAJA
  // ============================================================
  ipcMain.handle("caja:abrir", safeHandler(async (_event, datos: unknown) => {
    requireAuth();
    const resultado = await servicios!.caja.abrir(datos as any);
    mainWindow?.webContents.send("data:cambio");
    return resultado;
  }));

  ipcMain.handle("caja:cerrar", safeHandler(async (_event, datos: unknown) => {
    requireAuth();
    const resultado = await servicios!.caja.cerrar(datos as any);
    mainWindow?.webContents.send("data:cambio");
    return resultado;
  }));

  ipcMain.handle(
    "caja:obtenerSesionAbierta",
    async (_event, usuarioId: number) => {
      requireAuth();
      return servicios!.caja.obtenerSesionAbierta(usuarioId);
    }
  );

  ipcMain.handle(
    "caja:calcularEfectivoEsperado",
    async (_event, sesionCajaId: number) => {
      requireAuth();
      return servicios!.caja.calcularEfectivoEsperado(sesionCajaId);
    }
  );

  ipcMain.handle(
    "caja:obtenerTotalDevoluciones",
    async (_event, sesionCajaId: number) => {
      requireAuth();
      return servicios!.caja.obtenerTotalDevoluciones(sesionCajaId);
    }
  );

  ipcMain.handle(
    "caja:forzarCierre",
    async (_event, sesionCajaId: number, usuarioId: number) => {
      requireAuth();
      return servicios!.caja.forzarCierre(sesionCajaId, usuarioId);
    }
  );

  ipcMain.handle(
    "caja:marcarRevisado",
    async (_event, cierreCajaId: number, usuarioId: number) => {
      requireAuth();
      return servicios!.caja.marcarRevisado(cierreCajaId, usuarioId);
    }
  );

  // ============================================================
  // STOCK
  // ============================================================
  ipcMain.handle("stock:registrarStock", safeHandler(async (_event, datos: unknown) => {
    requireAuth();
    return servicios!.stock.registrarStock(datos as any);
  }));

  ipcMain.handle(
    "stock:registrarReposicion",
    safeHandler(async (_event, productoId: number, sesionCajaId: number, cantidad: number, unidad?: "entero" | "porcion") => {
      requireAuth();
      return servicios!.stock.registrarReposicion(productoId, sesionCajaId, cantidad, unidad);
    })
  );

  ipcMain.handle("stock:registrarCorte", safeHandler(async (_event, datos: unknown) => {
    requireAuth();
    return servicios!.stock.registrarCorte(datos as any);
  }));

  ipcMain.handle("stock:calcularAjusteCortesLote", async (_event, sesionCajaId: number) => {
    requireAuth();
    return servicios!.stock.calcularAjusteCortesLote(sesionCajaId);
  });

  ipcMain.handle("stock:registrarMerma", safeHandler(async (_event, datos: unknown) => {
    requireAuth();
    return servicios!.stock.registrarMerma(datos as any);
  }));

  ipcMain.handle("stock:registrarCortesia", safeHandler(async (_event, datos: unknown) => {
    requireAuth();
    return servicios!.stock.registrarCortesia(datos as any);
  }));

  ipcMain.handle(
    "stock:obtenerStockPorSesion",
    async (_event, sesionCajaId: number) => {
      requireAuth();
      return servicios!.stock.obtenerStockPorSesion(sesionCajaId);
    }
  );

  ipcMain.handle(
    "stock:listarMermasPorSesion",
    async (_event, sesionCajaId: number) => {
      requireAuth();
      return servicios!.stock.listarMermasPorSesion(sesionCajaId);
    }
  );

  ipcMain.handle(
    "stock:listarCortesiasPorSesion",
    async (_event, sesionCajaId: number) => {
      requireAuth();
      return servicios!.stock.listarCortesiasPorSesion(sesionCajaId);
    }
  );

  ipcMain.handle(
    "stock:conciliarStock",
    safeHandler(async (_event, sesionCajaId: number, conteoFisicoPorProducto: unknown[]) => {
      requireAuth();
      return servicios!.stock.conciliarStock(
        sesionCajaId,
        conteoFisicoPorProducto as any
      );
    })
  );

  ipcMain.handle(
    "stock:calcularVendido",
    async (_event, productoId: number, sesionCajaId: number, unidad?: string) => {
      requireAuth();
      return servicios!.stock.calcularVendidoPorSesion(productoId, sesionCajaId, unidad);
    }
  );

  ipcMain.handle(
    "stock:calcularVendidoLote",
    async (_event, sesionCajaId: number) => {
      requireAuth();
      return servicios!.stock.calcularVendidoLote(sesionCajaId);
    }
  );

  ipcMain.handle(
    "stock:verificarDisponibilidad",
    async (_event, productoId: number, sesionCajaId: number, unidad: "entero" | "porcion", cantidadRequerida: number) => {
      requireAuth();
      return servicios!.stock.verificarDisponibilidad(productoId, sesionCajaId, unidad, cantidadRequerida);
    }
  );

  // ============================================================
  // VENTAS
  // ============================================================
  ipcMain.handle("ventas:crear", safeHandler(async (_event, datos: unknown) => {
    requireAuth();
    const resultado = await servicios!.ventas.crear(datos as any);
    mainWindow?.webContents.send("data:cambio");
    return resultado;
  }));

  ipcMain.handle(
    "ventas:listarPorSesion",
    async (_event, sesionCajaId: number) => {
      requireAuth();
      return servicios!.ventas.listarPorSesion(sesionCajaId);
    }
  );

  ipcMain.handle("ventas:obtenerDetalle", async (_event, ventaId: number) => {
    requireAuth();
    return servicios!.ventas.obtenerDetalle(ventaId);
  });

  ipcMain.handle("ventas:obtenerPorId", async (_event, id: number) => {
    requireAuth();
    return servicios!.ventas.obtenerPorId(id);
  });

  // ============================================================
  // PEDIDOS
  // ============================================================
  ipcMain.handle("pedidos:crear", safeHandler(async (_event, datos: unknown) => {
    requireAuth();
    return servicios!.pedidos.crear(datos as any);
  }));

  ipcMain.handle("pedidos:marcarListo", async (_event, pedidoId: number) => {
    requireAuth();
    return servicios!.pedidos.marcarListo(pedidoId);
  });

  ipcMain.handle(
    "pedidos:actualizarEstado",
    async (_event, pedidoId: number, nuevoEstado: "pendiente" | "en_proceso" | "listo" | "entregado" | "cancelado") => {
      requireAuth();
      return servicios!.pedidos.actualizarEstado(pedidoId, nuevoEstado);
    }
  );

  ipcMain.handle(
    "pedidos:entregar",
    safeHandler(async (
      _event,
      pedidoId: number,
      sesionCajaEntregaId: number,
      metodoPagoSaldo?: string
    ) => {
      requireAuth();
      // Obtener pedido para calcular saldo ANTES de entregar
      const pedido = await servicios!.pedidos.obtenerPorId(pedidoId);
      if (!pedido) throw new Error("Pedido no encontrado");
      const detalles = await servicios!.pedidos.obtenerDetalle(pedidoId);

      const saldoCobrado = Math.max(
        (pedido.totalEstimado ?? 0) - (pedido.anticipo ?? 0),
        0
      );

      // Entregar el pedido
      await servicios!.pedidos.entregar(
        pedidoId,
        sesionCajaEntregaId,
        metodoPagoSaldo as "efectivo" | "transferencia" | undefined
      );

      // Detalles del pedido para la venta de saldo
      // IMPORTANTE: cantidad=0 para que no impacte el stock disponible.
      // Los pedidos de tipo producto no dependen del stock diario.
      const detallesValidos = detalles
        .filter((d) => d.productoId !== null)
        .map((d) => ({
          productoId: d.productoId!,
          unidad: ((d as any).unidad as "entero" | "porcion") || "entero",
          cantidad: 0, // No impactar stock
          precioUnitario: d.precioUnitario,
          subtotal: d.subtotal,
        }));

      // Registrar venta por SOLO el saldo cobrado (el anticipo ya fue contado en su sesión).
      // Crear venta siempre que haya saldo, incluso sin detalles de producto (pedidos personalizados).
      if (saldoCobrado > 0) {
        try {
          await servicios!.ventas.crear({
            sesionCajaId: sesionCajaEntregaId,
            total: saldoCobrado,
            metodoPago: (metodoPagoSaldo as "efectivo" | "transferencia") || "efectivo",
            tipoOrigen: "pedido",
            requiereFactura: false,
            clienteNombre: pedido.cliente,
            detalles: detallesValidos.length > 0 ? detallesValidos : [{
              productoId: 1, // Producto genérico para pedidos personalizados
              unidad: "entero" as const,
              cantidad: 1,
              precioUnitario: saldoCobrado,
              subtotal: saldoCobrado,
            }],
          }, true); // skipStockCheck: los pedidos no dependen del stock diario
        } catch (ventaErr) {
          // Rollback explícito: restaurar campos de entrega directamente
          // (actualizarEstado no permite salir de "entregado")
          await servicios!.pedidos.revertirEntrega(pedidoId);
          throw ventaErr;
        }
      }

      // Notificar al renderer que los datos cambiaron (Dashboard refresca)
      mainWindow?.webContents.send("data:cambio");

      return { exito: true };
    })
  );

  ipcMain.handle(
    "pedidos:revertirEntrega",
    safeHandler(async (_event, pedidoId: number) => {
      requireAuth();
      await servicios!.pedidos.revertirEntrega(pedidoId);
      return { exito: true };
    })
  );

  ipcMain.handle(
    "pedidos:cancelar",
    safeHandler(async (
      _event,
      pedidoId: number,
      motivo: string,
      metodoDevolucion: string,
      registradoPor: number,
      sesionCajaDevolucionId?: number
    ) => {
      requireAuth();
      return servicios!.pedidos.cancelar(
        pedidoId,
        motivo,
        metodoDevolucion as "efectivo" | "transferencia",
        registradoPor,
        sesionCajaDevolucionId
      );
    })
  );

  ipcMain.handle("pedidos:listarPorEstado", async (_event, estado: string) => {
    requireAuth();
    return servicios!.pedidos.listarPorEstado(estado);
  });

  ipcMain.handle("pedidos:listarActivos", async () => {
    requireAuth();
    return servicios!.pedidos.listarActivos();
  });

  ipcMain.handle("pedidos:listarTodos", async () => {
    requireAuth();
    return servicios!.pedidos.listarTodos();
  });

  ipcMain.handle(
    "pedidos:listarPorSesionAnticipo",
    async (_event, sesionCajaId: number) => {
      requireAuth();
      return servicios!.pedidos.listarPorSesionAnticipo(sesionCajaId);
    }
  );

  ipcMain.handle(
    "pedidos:listarPorFecha",
    async (_event, fechaInicio: string, fechaFin: string) => {
      requireAuth();
      return servicios!.pedidos.listarPorFecha(fechaInicio, fechaFin);
    }
  );

  ipcMain.handle("pedidos:obtenerPorId", async (_event, id: number) => {
    requireAuth();
    return servicios!.pedidos.obtenerPorId(id);
  });

  ipcMain.handle("pedidos:obtenerDetalle", async (_event, pedidoId: number) => {
    requireAuth();
    return servicios!.pedidos.obtenerDetalle(pedidoId);
  });

  ipcMain.handle("pedidos:obtenerResumen", async (_event, pedidoId: number) => {
    requireAuth();
    return servicios!.pedidos.obtenerResumen(pedidoId);
  });

  // ============================================================
  // GASTOS
  // ============================================================
  ipcMain.handle("gastos:crear", safeHandler(async (_event, datos: unknown) => {
    requireAuth();
    const resultado = await servicios!.gastos.crear(datos as any);
    mainWindow?.webContents.send("data:cambio");
    return resultado;
  }));

  ipcMain.handle(
    "gastos:listarPorSesion",
    async (_event, sesionCajaId: number) => {
      requireAuth();
      return servicios!.gastos.listarPorSesion(sesionCajaId);
    }
  );

  ipcMain.handle(
    "gastos:listarPorCategoria",
    async (_event, categoriaId: number, sesionCajaId?: number) => {
      requireAuth();
      return servicios!.gastos.listarPorCategoria(categoriaId, sesionCajaId);
    }
  );

  ipcMain.handle(
    "gastos:obtenerTotalPorOrigen",
    async (_event, sesionCajaId: number) => {
      requireAuth();
      return servicios!.gastos.obtenerTotalPorOrigen(sesionCajaId);
    }
  );

  ipcMain.handle("gastos:listarCategorias", async () => {
    requireAuth();
    return servicios!.gastos.listarCategorias();
  });

  ipcMain.handle("gastos:crearCategoria", safeHandler(async (_event, nombre: string) => {
    requireAuth();
    return servicios!.gastos.crearCategoria(nombre);
  }));

  // ============================================================
  // NÓMINA
  // ============================================================
  ipcMain.handle("nomina:registrarAdelanto", safeHandler(async (_event, datos: unknown) => {
    requireAuth();
    return servicios!.nomina.registrarAdelanto(datos as any);
  }));

  ipcMain.handle("nomina:registrarMulta", safeHandler(async (_event, datos: unknown) => {
    requireAuth();
    return servicios!.nomina.registrarMulta(datos as any);
  }));

  ipcMain.handle(
    "nomina:listarAdelantosPorEmpleado",
    async (_event, empleadoId: number) => {
      requireAuth();
      return servicios!.nomina.listarAdelantosPorEmpleado(empleadoId);
    }
  );

  ipcMain.handle(
    "nomina:listarAdelantosPorSesion",
    async (_event, sesionCajaId: number) => {
      requireAuth();
      return servicios!.nomina.listarAdelantosPorSesion(sesionCajaId);
    }
  );

  ipcMain.handle(
    "nomina:listarMultasPorEmpleado",
    async (_event, empleadoId: number) => {
      requireAuth();
      return servicios!.nomina.listarMultasPorEmpleado(empleadoId);
    }
  );

  ipcMain.handle(
    "nomina:calcularDescuentosMes",
    async (_event, empleadoId: number, mes: string) => {
      requireAuth();
      return servicios!.nomina.calcularDescuentosMes(empleadoId, mes);
    }
  );

  ipcMain.handle("nomina:listarEmpleadosActivos", async () => {
    requireAuth();
    return servicios!.nomina.listarEmpleadosActivos();
  });

  ipcMain.handle("nomina:crearEmpleado", safeHandler(async (_event, datos: unknown) => {
    requireAuth();
    return servicios!.nomina.crearEmpleado(datos as any);
  }));

  // ============================================================
  // REPORTES
  // ============================================================
  ipcMain.handle("reportes:reporteDiario", async (_event, fecha: string) => {
    requireAuth();
    return servicios!.reportes.reporteDiario(fecha);
  });

  ipcMain.handle(
    "reportes:reportePorFechas",
    async (_event, fechaInicio: string, fechaFin: string) => {
      requireAuth();
      return servicios!.reportes.reportePorFechas(fechaInicio, fechaFin);
    }
  );

  ipcMain.handle(
    "reportes:listarCierresPorRango",
    async (_event, fechaInicio: string, fechaFin: string) => {
      requireAuth();
      return servicios!.reportes.listarCierresPorRango(fechaInicio, fechaFin);
    }
  );

  ipcMain.handle("reportes:reportePedidosPendientes", async () => {
    requireAuth();
    return servicios!.reportes.reportePedidosPendientes();
  });

  ipcMain.handle(
    "reportes:reporteProductosMasVendidos",
    async (_event, fechaInicio: string, fechaFin: string) => {
      requireAuth();
      return servicios!.reportes.reporteProductosMasVendidos(fechaInicio, fechaFin);
    }
  );

  // ============================================================
  // SISTEMA
  // ============================================================
  ipcMain.handle("sistema:getDbPath", async () => {
    return path.join(app.getPath("userData"), "pos.sqlite");
  });

  ipcMain.handle("sistema:getVersion", async () => {
    return app.getVersion();
  });

  ipcMain.handle(
    "sistema:backup",
    safeHandler(async (_event, rutaDestino: string) => {
      requireAdmin();
      if (!db) throw new Error("Base de datos no inicializada");
      const fs = await import("fs");
      const crypto = await import("crypto");
      const os = await import("os");
      const currentDbPath = path.join(app.getPath("userData"), "pos.sqlite");
      const walPath = currentDbPath + "-wal";
      const shmPath = currentDbPath + "-shm";

      // Seguridad: validar que la ruta de destino esté en directorios permitidos
      const rutaResuelta = path.resolve(rutaDestino);
      const directoriosPermitidos = [
        path.resolve(app.getPath("userData")),
        path.resolve(app.getPath("desktop")),
        path.resolve(app.getPath("documents")),
        path.resolve(app.getPath("downloads")),
        path.resolve(os.homedir()),
      ];
      const rutaPermitida = directoriosPermitidos.some((dir) =>
        rutaResuelta.startsWith(dir + path.sep) || rutaResuelta === dir
      );
      if (!rutaPermitida) {
        throw new Error("Ruta de backup no permitida. Use Documents, Desktop o Downloads.");
      }

      // Forzar checkpoint para que todo esté en el archivo principal
      const { createDbWithSqlite: createDbFn } = await import("@pos/db");
      const { sqlite: tempSqlite } = createDbFn(currentDbPath);
      tempSqlite.pragma("wal_checkpoint(TRUNCATE)");
      tempSqlite.close();

      fs.copyFileSync(currentDbPath, rutaResuelta);

      // Copiar WAL y SHM si existen
      if (fs.existsSync(walPath)) {
        fs.copyFileSync(walPath, rutaResuelta + "-wal");
      }
      if (fs.existsSync(shmPath)) {
        fs.copyFileSync(shmPath, rutaResuelta + "-shm");
      }

      // Calcular SHA-256 del backup para verificación de integridad
      const hash = crypto.createHash("sha256");
      hash.update(fs.readFileSync(rutaResuelta));
      const sha256 = hash.digest("hex");
      fs.writeFileSync(rutaResuelta + ".sha256", sha256);

      // Log de auditoría
      try {
        db?.insert(auditLog).values({
          evento: "backup",
          usuarioId: usuarioActual?.id,
          detalle: JSON.stringify({ ruta: rutaResuelta, sha256 }),
          origen: "desktop",
        });
      } catch { /* audit logging es best-effort */ }

      return { ok: true, ruta: rutaResuelta, sha256 };
    })
  );

  ipcMain.handle(
    "sistema:restore",
    safeHandler(async (_event, rutaBackup: string) => {
      requireAdmin();
      const fs = await import("fs");
      const crypto = await import("crypto");
      const currentDbPath = path.join(app.getPath("userData"), "pos.sqlite");
      const walPath = currentDbPath + "-wal";
      const shmPath = currentDbPath + "-shm";

      // Seguridad: validar que el backup esté en directorios permitidos
      const rutaResuelta = path.resolve(rutaBackup);
      const directoriosPermitidos = [
        path.resolve(app.getPath("userData")),
        path.resolve(app.getPath("desktop")),
        path.resolve(app.getPath("documents")),
        path.resolve(app.getPath("downloads")),
      ];
      const rutaPermitida = directoriosPermitidos.some((dir) =>
        rutaResuelta.startsWith(dir + path.sep) || rutaResuelta === dir
      );
      if (!rutaPermitida) {
        throw new Error("Ruta de backup no permitida. Use Documents, Desktop o Downloads.");
      }

      // Verificar que el backup existe
      if (!fs.existsSync(rutaResuelta)) {
        throw new Error("El archivo de backup no existe");
      }

      // Verificar integridad SHA-256 si existe archivo de hash
      const rutaSha256 = rutaResuelta + ".sha256";
      if (fs.existsSync(rutaSha256)) {
        const hashAlmacenado = fs.readFileSync(rutaSha256, "utf-8").trim();
        const hashCalc = crypto.createHash("sha256");
        hashCalc.update(fs.readFileSync(rutaResuelta));
        const sha256Calculado = hashCalc.digest("hex");
        if (hashAlmacenado !== sha256Calculado) {
          throw new Error("El backup está corrupto o fue manipulado (SHA-256 no coincide).");
        }
      }

      // Cerrar conexión actual
      if (db) {
        db = null;
      }

      // Restaurar archivos
      fs.copyFileSync(rutaResuelta, currentDbPath);
      if (fs.existsSync(rutaResuelta + "-wal")) {
        fs.copyFileSync(rutaResuelta + "-wal", walPath);
      } else if (fs.existsSync(walPath)) {
        fs.unlinkSync(walPath);
      }
      if (fs.existsSync(rutaResuelta + "-shm")) {
        fs.copyFileSync(rutaResuelta + "-shm", shmPath);
      } else if (fs.existsSync(shmPath)) {
        fs.unlinkSync(shmPath);
      }

      // Reconectar
      const { createDbWithSqlite: createDbFn } = await import("@pos/db");
      const { db: newDb } = createDbFn(currentDbPath);
      db = newDb;

      // Log de auditoría
      try {
        db?.insert(auditLog).values({
          evento: "restore",
          usuarioId: usuarioActual?.id,
          detalle: JSON.stringify({ ruta: rutaResuelta }),
          origen: "desktop",
        });
      } catch { /* audit logging es best-effort */ }

      return { ok: true };
    })
  );
}

async function crearVentanaPrincipal() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // Content Security Policy (CSP) — OWASP A05
  mainWindow.webContents.session.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        "Content-Security-Policy": [
          "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self' data:; connect-src 'self' http://localhost:*"
        ],
      },
    });
  });

  setVentanaPrincipal(mainWindow);

  if (process.env.NODE_ENV === "development") {
    await mainWindow.loadURL("http://localhost:5173");
  } else {
    await mainWindow.loadFile(path.join(__dirname, "../dist/index.html"));
  }
}

app.whenReady().then(async () => {
  // Ruta de la base de datos en la carpeta de datos del usuario
  const dbPath = path.join(app.getPath("userData"), "pos.sqlite");
  
  // Crear conexión a la base de datos
  const { db: dbInstance } = createDbWithSqlite(dbPath);
  db = dbInstance;
  
  // Ejecutar migraciones automáticamente antes de abrir la ventana
  try {
    const migrationsFolder = process.env.NODE_ENV === "development"
      ? path.join(__dirname, "../../../packages/db/drizzle")
      : path.join(process.resourcesPath, "drizzle");
    migrate(db, { migrationsFolder });
    console.log("Migraciones ejecutadas correctamente");
  } catch (error) {
    console.error("Error al ejecutar migraciones:", error);
    const { dialog } = await import("electron");
    await dialog.showErrorBox(
      "Error de Base de Datos",
      `No se pudo actualizar la base de datos: ${error}\n\nLa aplicación se cerrará.`
    );
    app.quit();
    return;
  }

  // Inicializar servicios de dominio
  servicios = {
    auth: crearServicioAuth(db),
    usuarios: crearServicioUsuarios(db),
    empleados: crearServicioEmpleados(db),
    productos: crearServicioProductos(db),
    caja: crearServicioCaja(db),
    stock: crearServicioStock(db),
    ventas: crearServicioVentas(db),
    pedidos: crearServicioPedidos(db),
    gastos: crearServicioGastos(db),
    nomina: crearServicioNomina(db),
    reportes: crearServicioReportes(db),
  };

  // Crear usuario propietario por defecto si la DB está vacía
  try {
    const existingUsers = await db.select().from(usuarios).limit(1);
    if (existingUsers.length === 0) {
      // PIN aleatorio de 6 dígitos (seguridad: no hardcodear PINs por defecto)
      const pinAleatorio = String(randomInt(100000, 999999));
      const pinHash = await crearHashPin(pinAleatorio);
      await db.insert(usuarios).values({
        nombre: "Propietario",
        rol: "propietario",
        pinHash,
      });
      console.log("=== USUARIO PROPIETARIO CREADO ===");
      console.log(`PIN de acceso: ${pinAleatorio}`);
      console.log("Guarde este PIN. Se recomienda cambiarlo después del primer inicio.");
      console.log("===================================");
    }
  } catch (err) {
    console.error("Error al crear usuario propietario:", err);
  }

  // Registrar handlers IPC
  registrarHandlers();

  // Aplicar menú de la aplicación
  crearMenuPrincipal();

  // Servidor local para pasteleras
  startLocalServer({ port: 3000, db });

  await crearVentanaPrincipal();

  // Configurar auto-updater (solo en producción)
  if (mainWindow) {
    setupAutoUpdater(mainWindow);
  }
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
