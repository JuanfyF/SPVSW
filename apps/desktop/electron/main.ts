import { app, BrowserWindow, ipcMain } from "electron";
import path from "node:path";

// Desactivar aceleración de hardware y GPU
process.env.ELECTRON_DISABLE_GPU = "1";
app.disableHardwareAcceleration();
app.commandLine.appendSwitch("disable-gpu");
app.commandLine.appendSwitch("disable-software-rasterizer");
app.commandLine.appendSwitch("ozone-platform=x11");
app.commandLine.appendSwitch("in-process-gpu");
app.commandLine.appendSwitch("no-sandbox");
import { createDb, createDbWithSqlite, migrate, eq } from "@pos/db";
import { usuarios } from "@pos/db";
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

function registrarHandlers() {
  if (!servicios) throw new Error("Servicios no inicializados");

  // ============================================================
  // AUTH
  // ============================================================
  ipcMain.handle("auth:login", async (_event, pin: string) => {
    const usuario = await servicios!.auth.login(pin);
    usuarioActual = usuario;

    // Si hay sesión de caja abierta, devolverla junto con el usuario
    let sesionAbierta = null;
    if (usuario) {
      sesionAbierta = await servicios!.caja.obtenerSesionAbierta(usuario.id);
    }

    return { usuario, sesionAbierta };
  });

  ipcMain.handle("auth:logout", async () => {
    usuarioActual = null;
    return true;
  });

  ipcMain.handle("auth:getUsuarioActual", async () => {
    return usuarioActual;
  });

  // ============================================================
  // USUARIOS
  // ============================================================
  ipcMain.handle("usuarios:listar", async () => {
    return servicios!.usuarios.listar();
  });

  ipcMain.handle("usuarios:obtenerPorId", async (_event, id: number) => {
    return servicios!.usuarios.obtenerPorId(id);
  });

  ipcMain.handle("usuarios:crear", safeHandler(async (_event, datos: unknown) => {
    return servicios!.usuarios.crear(datos as any);
  }));

  ipcMain.handle(
    "usuarios:actualizar",
    async (_event, id: number, datos: unknown) => {
      return servicios!.usuarios.actualizar(id, datos as any);
    }
  );

  ipcMain.handle("usuarios:desactivar", async (_event, id: number) => {
    return servicios!.usuarios.desactivar(id);
  });

  ipcMain.handle(
    "usuarios:cambiarPin",
    safeHandler(async (_event, id: number, nuevoPin: string) => {
      return servicios!.usuarios.cambiarPin(id, nuevoPin);
    })
  );

  // ============================================================
  // EMPLEADOS
  // ============================================================
  ipcMain.handle("empleados:listar", async () => {
    return servicios!.empleados.listar();
  });

  ipcMain.handle("empleados:obtenerPorId", async (_event, id: number) => {
    return servicios!.empleados.obtenerPorId(id);
  });

  ipcMain.handle("empleados:crear", async (_event, datos: unknown) => {
    return servicios!.empleados.crear(datos as any);
  });

  ipcMain.handle(
    "empleados:actualizar",
    async (_event, id: number, datos: unknown) => {
      return servicios!.empleados.actualizar(id, datos as any);
    }
  );

  ipcMain.handle("empleados:desactivar", async (_event, id: number) => {
    return servicios!.empleados.desactivar(id);
  });

  // ============================================================
  // PRODUCTOS
  // ============================================================
  ipcMain.handle("productos:listar", async () => {
    return servicios!.productos.listar();
  });

  ipcMain.handle("productos:obtenerPorId", async (_event, id: number) => {
    return servicios!.productos.obtenerPorId(id);
  });

  ipcMain.handle("productos:crear", safeHandler(async (_event, datos: unknown) => {
    return servicios!.productos.crear(datos as any);
  }));

  ipcMain.handle(
    "productos:actualizar",
    safeHandler(async (_event, id: number, datos: unknown) => {
      return servicios!.productos.actualizar(id, datos as any);
    })
  );

  ipcMain.handle("productos:desactivar", async (_event, id: number) => {
    return servicios!.productos.desactivar(id);
  });

  ipcMain.handle("productos:buscar", async (_event, nombre: string) => {
    return servicios!.productos.buscar(nombre);
  });

  // ============================================================
  // CAJA
  // ============================================================
  ipcMain.handle("caja:abrir", safeHandler(async (_event, datos: unknown) => {
    return servicios!.caja.abrir(datos as any);
  }));

  ipcMain.handle("caja:cerrar", safeHandler(async (_event, datos: unknown) => {
    return servicios!.caja.cerrar(datos as any);
  }));

  ipcMain.handle(
    "caja:obtenerSesionAbierta",
    async (_event, usuarioId: number) => {
      return servicios!.caja.obtenerSesionAbierta(usuarioId);
    }
  );

  ipcMain.handle(
    "caja:calcularEfectivoEsperado",
    async (_event, sesionCajaId: number) => {
      return servicios!.caja.calcularEfectivoEsperado(sesionCajaId);
    }
  );

  ipcMain.handle(
    "caja:obtenerTotalDevoluciones",
    async (_event, sesionCajaId: number) => {
      return servicios!.caja.obtenerTotalDevoluciones(sesionCajaId);
    }
  );

  ipcMain.handle(
    "caja:forzarCierre",
    async (_event, sesionCajaId: number, usuarioId: number) => {
      return servicios!.caja.forzarCierre(sesionCajaId, usuarioId);
    }
  );

  ipcMain.handle(
    "caja:marcarRevisado",
    async (_event, cierreCajaId: number, usuarioId: number) => {
      return servicios!.caja.marcarRevisado(cierreCajaId, usuarioId);
    }
  );

  // ============================================================
  // STOCK
  // ============================================================
  ipcMain.handle("stock:registrarStock", safeHandler(async (_event, datos: unknown) => {
    return servicios!.stock.registrarStock(datos as any);
  }));

  ipcMain.handle(
    "stock:registrarReposicion",
    safeHandler(async (_event, productoId: number, sesionCajaId: number, cantidad: number, unidad?: "entero" | "porcion") => {
      return servicios!.stock.registrarReposicion(productoId, sesionCajaId, cantidad, unidad);
    })
  );

  ipcMain.handle("stock:registrarCorte", safeHandler(async (_event, datos: unknown) => {
    return servicios!.stock.registrarCorte(datos as any);
  }));

  ipcMain.handle("stock:calcularAjusteCortesLote", async (_event, sesionCajaId: number) => {
    return servicios!.stock.calcularAjusteCortesLote(sesionCajaId);
  });

  ipcMain.handle("stock:registrarMerma", safeHandler(async (_event, datos: unknown) => {
    return servicios!.stock.registrarMerma(datos as any);
  }));

  ipcMain.handle("stock:registrarCortesia", safeHandler(async (_event, datos: unknown) => {
    return servicios!.stock.registrarCortesia(datos as any);
  }));

  ipcMain.handle(
    "stock:obtenerStockPorSesion",
    async (_event, sesionCajaId: number) => {
      return servicios!.stock.obtenerStockPorSesion(sesionCajaId);
    }
  );

  ipcMain.handle(
    "stock:listarMermasPorSesion",
    async (_event, sesionCajaId: number) => {
      return servicios!.stock.listarMermasPorSesion(sesionCajaId);
    }
  );

  ipcMain.handle(
    "stock:listarCortesiasPorSesion",
    async (_event, sesionCajaId: number) => {
      return servicios!.stock.listarCortesiasPorSesion(sesionCajaId);
    }
  );

  ipcMain.handle(
    "stock:conciliarStock",
    safeHandler(async (_event, sesionCajaId: number, conteoFisicoPorProducto: unknown[]) => {
      return servicios!.stock.conciliarStock(
        sesionCajaId,
        conteoFisicoPorProducto as any
      );
    })
  );

  ipcMain.handle(
    "stock:calcularVendido",
    async (_event, productoId: number, sesionCajaId: number, unidad?: string) => {
      return servicios!.stock.calcularVendidoPorSesion(productoId, sesionCajaId, unidad);
    }
  );

  ipcMain.handle(
    "stock:calcularVendidoLote",
    async (_event, sesionCajaId: number) => {
      return servicios!.stock.calcularVendidoLote(sesionCajaId);
    }
  );

  ipcMain.handle(
    "stock:verificarDisponibilidad",
    async (_event, productoId: number, sesionCajaId: number, unidad: "entero" | "porcion", cantidadRequerida: number) => {
      return servicios!.stock.verificarDisponibilidad(productoId, sesionCajaId, unidad, cantidadRequerida);
    }
  );

  // ============================================================
  // VENTAS
  // ============================================================
  ipcMain.handle("ventas:crear", safeHandler(async (_event, datos: unknown) => {
    return servicios!.ventas.crear(datos as any);
  }));

  ipcMain.handle(
    "ventas:listarPorSesion",
    async (_event, sesionCajaId: number) => {
      return servicios!.ventas.listarPorSesion(sesionCajaId);
    }
  );

  ipcMain.handle("ventas:obtenerDetalle", async (_event, ventaId: number) => {
    return servicios!.ventas.obtenerDetalle(ventaId);
  });

  ipcMain.handle("ventas:obtenerPorId", async (_event, id: number) => {
    return servicios!.ventas.obtenerPorId(id);
  });

  // ============================================================
  // PEDIDOS
  // ============================================================
  ipcMain.handle("pedidos:crear", safeHandler(async (_event, datos: unknown) => {
    return servicios!.pedidos.crear(datos as any);
  }));

  ipcMain.handle("pedidos:marcarListo", async (_event, pedidoId: number) => {
    return servicios!.pedidos.marcarListo(pedidoId);
  });

  ipcMain.handle(
    "pedidos:actualizarEstado",
    async (_event, pedidoId: number, nuevoEstado: "pendiente" | "en_proceso" | "listo" | "entregado" | "cancelado") => {
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

      // Registrar venta por SOLO el saldo cobrado (el anticipo ya fue contado en su sesión).
      if (saldoCobrado > 0) {
        try {
          await servicios!.ventas.crear({
            sesionCajaId: sesionCajaEntregaId,
            total: saldoCobrado,
            metodoPago: (metodoPagoSaldo as "efectivo" | "transferencia") || "efectivo",
            tipoOrigen: "pedido",
            requiereFactura: false,
            clienteNombre: pedido.cliente,
            detalles: detalles
              .filter((d) => d.productoId !== null)
              .map((d) => ({
                productoId: d.productoId!,
                unidad: ((d as any).unidad as "entero" | "porcion") || "entero",
                cantidad: d.cantidad,
                precioUnitario: d.precioUnitario,
                subtotal: d.subtotal,
              })),
          }, true); // skipStockCheck: los pedidos no dependen del stock diario
        } catch (ventaErr) {
          // Rollback explícito: restaurar campos de entrega directamente
          // (actualizarEstado no permite salir de "entregado")
          await servicios!.pedidos.revertirEntrega(pedidoId);
          throw ventaErr;
        }
      }

      return { exito: true };
    })
  );

  ipcMain.handle(
    "pedidos:revertirEntrega",
    safeHandler(async (_event, pedidoId: number) => {
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
    return servicios!.pedidos.listarPorEstado(estado);
  });

  ipcMain.handle("pedidos:listarActivos", async () => {
    return servicios!.pedidos.listarActivos();
  });

  ipcMain.handle("pedidos:listarTodos", async () => {
    return servicios!.pedidos.listarTodos();
  });

  ipcMain.handle(
    "pedidos:listarPorSesionAnticipo",
    async (_event, sesionCajaId: number) => {
      return servicios!.pedidos.listarPorSesionAnticipo(sesionCajaId);
    }
  );

  ipcMain.handle(
    "pedidos:listarPorFecha",
    async (_event, fechaInicio: string, fechaFin: string) => {
      return servicios!.pedidos.listarPorFecha(fechaInicio, fechaFin);
    }
  );

  ipcMain.handle("pedidos:obtenerPorId", async (_event, id: number) => {
    return servicios!.pedidos.obtenerPorId(id);
  });

  ipcMain.handle("pedidos:obtenerDetalle", async (_event, pedidoId: number) => {
    return servicios!.pedidos.obtenerDetalle(pedidoId);
  });

  ipcMain.handle("pedidos:obtenerResumen", async (_event, pedidoId: number) => {
    return servicios!.pedidos.obtenerResumen(pedidoId);
  });

  // ============================================================
  // GASTOS
  // ============================================================
  ipcMain.handle("gastos:crear", safeHandler(async (_event, datos: unknown) => {
    return servicios!.gastos.crear(datos as any);
  }));

  ipcMain.handle(
    "gastos:listarPorSesion",
    async (_event, sesionCajaId: number) => {
      return servicios!.gastos.listarPorSesion(sesionCajaId);
    }
  );

  ipcMain.handle(
    "gastos:listarPorCategoria",
    async (_event, categoriaId: number, sesionCajaId?: number) => {
      return servicios!.gastos.listarPorCategoria(categoriaId, sesionCajaId);
    }
  );

  ipcMain.handle(
    "gastos:obtenerTotalPorOrigen",
    async (_event, sesionCajaId: number) => {
      return servicios!.gastos.obtenerTotalPorOrigen(sesionCajaId);
    }
  );

  ipcMain.handle("gastos:listarCategorias", async () => {
    return servicios!.gastos.listarCategorias();
  });

  ipcMain.handle("gastos:crearCategoria", safeHandler(async (_event, nombre: string) => {
    return servicios!.gastos.crearCategoria(nombre);
  }));

  // ============================================================
  // NÓMINA
  // ============================================================
  ipcMain.handle("nomina:registrarAdelanto", safeHandler(async (_event, datos: unknown) => {
    return servicios!.nomina.registrarAdelanto(datos as any);
  }));

  ipcMain.handle("nomina:registrarMulta", safeHandler(async (_event, datos: unknown) => {
    return servicios!.nomina.registrarMulta(datos as any);
  }));

  ipcMain.handle(
    "nomina:listarAdelantosPorEmpleado",
    async (_event, empleadoId: number) => {
      return servicios!.nomina.listarAdelantosPorEmpleado(empleadoId);
    }
  );

  ipcMain.handle(
    "nomina:listarAdelantosPorSesion",
    async (_event, sesionCajaId: number) => {
      return servicios!.nomina.listarAdelantosPorSesion(sesionCajaId);
    }
  );

  ipcMain.handle(
    "nomina:listarMultasPorEmpleado",
    async (_event, empleadoId: number) => {
      return servicios!.nomina.listarMultasPorEmpleado(empleadoId);
    }
  );

  ipcMain.handle(
    "nomina:calcularDescuentosMes",
    async (_event, empleadoId: number, mes: string) => {
      return servicios!.nomina.calcularDescuentosMes(empleadoId, mes);
    }
  );

  ipcMain.handle("nomina:listarEmpleadosActivos", async () => {
    return servicios!.nomina.listarEmpleadosActivos();
  });

  ipcMain.handle("nomina:crearEmpleado", safeHandler(async (_event, datos: unknown) => {
    return servicios!.nomina.crearEmpleado(datos as any);
  }));

  // ============================================================
  // REPORTES
  // ============================================================
  ipcMain.handle("reportes:reporteDiario", async (_event, fecha: string) => {
    return servicios!.reportes.reporteDiario(fecha);
  });

  ipcMain.handle(
    "reportes:reportePorFechas",
    async (_event, fechaInicio: string, fechaFin: string) => {
      return servicios!.reportes.reportePorFechas(fechaInicio, fechaFin);
    }
  );

  ipcMain.handle(
    "reportes:listarCierresPorRango",
    async (_event, fechaInicio: string, fechaFin: string) => {
      return servicios!.reportes.listarCierresPorRango(fechaInicio, fechaFin);
    }
  );

  ipcMain.handle("reportes:reportePedidosPendientes", async () => {
    return servicios!.reportes.reportePedidosPendientes();
  });

  ipcMain.handle(
    "reportes:reporteProductosMasVendidos",
    async (_event, fechaInicio: string, fechaFin: string) => {
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

  ipcMain.handle("sistema:backup", async (_event, rutaDestino: string) => {
    if (!db) throw new Error("Base de datos no inicializada");
    const fs = await import("fs");
    const currentDbPath = path.join(app.getPath("userData"), "pos.sqlite");
    const walPath = currentDbPath + "-wal";
    const shmPath = currentDbPath + "-shm";

    // Forzar checkpoint para que todo esté en el archivo principal
    const { createDbWithSqlite: createDbFn } = await import("@pos/db");
    const { sqlite: tempSqlite } = createDbFn(currentDbPath);
    tempSqlite.pragma("wal_checkpoint(TRUNCATE)");
    tempSqlite.close();

    fs.copyFileSync(currentDbPath, rutaDestino);

    // Copiar WAL y SHM si existen
    if (fs.existsSync(walPath)) {
      fs.copyFileSync(walPath, rutaDestino + "-wal");
    }
    if (fs.existsSync(shmPath)) {
      fs.copyFileSync(shmPath, rutaDestino + "-shm");
    }

    return { ok: true, ruta: rutaDestino };
  });

  ipcMain.handle("sistema:restore", async (_event, rutaBackup: string) => {
    const fs = await import("fs");
    const currentDbPath = path.join(app.getPath("userData"), "pos.sqlite");
    const walPath = currentDbPath + "-wal";
    const shmPath = currentDbPath + "-shm";

    // Verificar que el backup existe
    if (!fs.existsSync(rutaBackup)) {
      throw new Error("El archivo de backup no existe");
    }

    // Cerrar conexión actual
    if (db) {
      db = null;
    }

    // Restaurar archivos
    fs.copyFileSync(rutaBackup, currentDbPath);
    if (fs.existsSync(rutaBackup + "-wal")) {
      fs.copyFileSync(rutaBackup + "-wal", walPath);
    } else if (fs.existsSync(walPath)) {
      fs.unlinkSync(walPath);
    }
    if (fs.existsSync(rutaBackup + "-shm")) {
      fs.copyFileSync(rutaBackup + "-shm", shmPath);
    } else if (fs.existsSync(shmPath)) {
      fs.unlinkSync(shmPath);
    }

    // Reconectar
    const { createDbWithSqlite: createDbFn } = await import("@pos/db");
    const { db: newDb } = createDbFn(currentDbPath);
    db = newDb;

    return { ok: true };
  });
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
      const pinHash = await crearHashPin("123456");
      await db.insert(usuarios).values({
        nombre: "Propietario",
        rol: "propietario",
        pinHash,
      });
      console.log("Seed: usuario propietario creado");
    }
  } catch (err) {
    console.error("Error al crear usuario propietario:", err);
  }

  // Registrar handlers IPC
  registrarHandlers();

  // Servidor local para pasteleras
  startLocalServer({ port: 3000, db });

  await crearVentanaPrincipal();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
