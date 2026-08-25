/**
 * @pos/core
 *
 * Servicios de dominio (lógica de negocio pura).
 * Cada módulo exporta una función factory que recibe la instancia de DB.
 *
 * Módulos:
 *  - auth: Autenticación por PIN
 *  - usuarios: CRUD de usuarios
 *  - empleados: CRUD de empleados
 *  - productos: CRUD de productos
 *  - stock: Gestión de stock diario, cortes, mermas, cortesías
 *  - caja: Sesiones de caja, apertura, cierre, conciliación
 *  - ventas: Registro de ventas de mostrador
 *  - pedidos: Pedidos con anticipo, flujo de estados, devoluciones
 *  - gastos: Registro de gastos de caja y pedidos
 *  - nomina: Adelantos de sueldo y multas
 *  - reportes: Reportes diarios, por fechas, pedidos, productos
 */

export { crearServicioAuth } from "./modules/auth";
export { crearServicioUsuarios } from "./modules/usuarios";
export { crearServicioEmpleados } from "./modules/empleados";
export { crearServicioProductos } from "./modules/productos";
export { crearServicioStock } from "./modules/stock";
export { crearServicioCaja } from "./modules/caja";
export { crearServicioVentas } from "./modules/ventas";
export { crearServicioPedidos } from "./modules/pedidos";
export { crearServicioGastos } from "./modules/gastos";
export { crearServicioNomina } from "./modules/nomina";
export { crearServicioReportes } from "./modules/reportes";
