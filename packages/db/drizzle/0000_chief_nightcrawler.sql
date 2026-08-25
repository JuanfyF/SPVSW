CREATE TABLE `adelantos_sueldo` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`empleado_id` integer NOT NULL,
	`sesion_caja_id` integer NOT NULL,
	`fecha` text NOT NULL,
	`monto` real NOT NULL,
	`metodo_pago` text NOT NULL,
	`mes_a_descontar` text NOT NULL,
	`descripcion` text,
	`registrado_por` integer NOT NULL,
	`actualizado_en` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	FOREIGN KEY (`empleado_id`) REFERENCES `empleados`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`sesion_caja_id`) REFERENCES `sesiones_caja`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`registrado_por`) REFERENCES `usuarios`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `categorias_gasto` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`nombre` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `cierre_caja` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`sesion_caja_id` integer NOT NULL,
	`ventas_efectivo` real DEFAULT 0 NOT NULL,
	`ventas_transferencia` real DEFAULT 0 NOT NULL,
	`pedidos_efectivo` real DEFAULT 0 NOT NULL,
	`pedidos_transferencia` real DEFAULT 0 NOT NULL,
	`gastos_caja` real DEFAULT 0 NOT NULL,
	`adelantos_efectivo` real DEFAULT 0 NOT NULL,
	`adelantos_transferencia` real DEFAULT 0 NOT NULL,
	`devoluciones_anticipo_efectivo` real DEFAULT 0 NOT NULL,
	`efectivo_esperado` real NOT NULL,
	`efectivo_contado` real,
	`diferencia_efectivo` real,
	`tiene_diferencia_stock` integer DEFAULT false NOT NULL,
	`estado_revision` text DEFAULT 'pendiente' NOT NULL,
	`revisado_por` integer,
	`revisado_en` text,
	`actualizado_en` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	FOREIGN KEY (`sesion_caja_id`) REFERENCES `sesiones_caja`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`revisado_por`) REFERENCES `usuarios`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `comprobantes` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`venta_id` integer NOT NULL,
	`tipo` text NOT NULL,
	`estado` text DEFAULT 'pendiente' NOT NULL,
	`xml_firmado` text,
	`clave_acceso` text,
	`intentos_envio` integer DEFAULT 0 NOT NULL,
	`ultimo_error` text,
	`actualizado_en` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	FOREIGN KEY (`venta_id`) REFERENCES `ventas`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `cortes_producto` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`producto_id` integer NOT NULL,
	`sesion_caja_id` integer NOT NULL,
	`fecha_hora` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`porciones_obtenidas` integer NOT NULL,
	`registrado_por` integer NOT NULL,
	`actualizado_en` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	FOREIGN KEY (`producto_id`) REFERENCES `productos`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`sesion_caja_id`) REFERENCES `sesiones_caja`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`registrado_por`) REFERENCES `usuarios`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `cortesias` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`producto_id` integer NOT NULL,
	`sesion_caja_id` integer NOT NULL,
	`fecha_hora` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`cantidad` integer NOT NULL,
	`unidad` text NOT NULL,
	`motivo` text,
	`cliente` text,
	`registrado_por` integer NOT NULL,
	`actualizado_en` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	FOREIGN KEY (`producto_id`) REFERENCES `productos`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`sesion_caja_id`) REFERENCES `sesiones_caja`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`registrado_por`) REFERENCES `usuarios`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `devoluciones_anticipo` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`pedido_id` integer NOT NULL,
	`sesion_caja_id` integer NOT NULL,
	`monto` real NOT NULL,
	`fecha` text NOT NULL,
	`metodo_devolucion` text NOT NULL,
	`motivo` text,
	`registrado_por` integer NOT NULL,
	`actualizado_en` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	FOREIGN KEY (`pedido_id`) REFERENCES `pedidos`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`sesion_caja_id`) REFERENCES `sesiones_caja`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`registrado_por`) REFERENCES `usuarios`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `empleados` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`usuario_id` integer,
	`nombre` text NOT NULL,
	`cargo` text NOT NULL,
	`salario_mensual` real NOT NULL,
	`activo` integer DEFAULT true NOT NULL,
	`actualizado_en` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	FOREIGN KEY (`usuario_id`) REFERENCES `usuarios`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `gastos` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`fecha` text NOT NULL,
	`sesion_caja_id` integer NOT NULL,
	`categoria_id` integer NOT NULL,
	`descripcion` text NOT NULL,
	`monto` real NOT NULL,
	`origen` text NOT NULL,
	`registrado_por` integer NOT NULL,
	`actualizado_en` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	FOREIGN KEY (`sesion_caja_id`) REFERENCES `sesiones_caja`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`categoria_id`) REFERENCES `categorias_gasto`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`registrado_por`) REFERENCES `usuarios`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `mermas` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`producto_id` integer NOT NULL,
	`sesion_caja_id` integer NOT NULL,
	`fecha_hora` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`cantidad` integer NOT NULL,
	`unidad` text NOT NULL,
	`motivo` text NOT NULL,
	`registrado_por` integer NOT NULL,
	`actualizado_en` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	FOREIGN KEY (`producto_id`) REFERENCES `productos`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`sesion_caja_id`) REFERENCES `sesiones_caja`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`registrado_por`) REFERENCES `usuarios`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `multas_empleado` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`empleado_id` integer NOT NULL,
	`fecha` text NOT NULL,
	`monto` real NOT NULL,
	`motivo` text NOT NULL,
	`mes_a_descontar` text NOT NULL,
	`registrado_por` integer NOT NULL,
	`actualizado_en` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	FOREIGN KEY (`empleado_id`) REFERENCES `empleados`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`registrado_por`) REFERENCES `usuarios`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `pedido_detalle` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`pedido_id` integer NOT NULL,
	`producto_id` integer,
	`descripcion_personalizada` text,
	`cantidad` integer NOT NULL,
	`precio_unitario` real NOT NULL,
	`subtotal` real NOT NULL,
	FOREIGN KEY (`pedido_id`) REFERENCES `pedidos`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`producto_id`) REFERENCES `productos`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `pedidos` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`cliente` text NOT NULL,
	`telefono` text,
	`fecha_pedido` text NOT NULL,
	`fecha_entrega` text NOT NULL,
	`hora_entrega` text DEFAULT '12:00' NOT NULL,
	`estado` text DEFAULT 'pendiente' NOT NULL,
	`anticipo` real NOT NULL,
	`metodo_pago_anticipo` text NOT NULL,
	`sesion_caja_anticipo_id` integer NOT NULL,
	`total_estimado` real NOT NULL,
	`saldo_pendiente` real NOT NULL,
	`metodo_pago_saldo` text,
	`sesion_caja_entrega_id` integer,
	`notas` text,
	`requiere_factura` integer DEFAULT false NOT NULL,
	`cliente_identificacion` text,
	`actualizado_en` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	FOREIGN KEY (`sesion_caja_anticipo_id`) REFERENCES `sesiones_caja`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`sesion_caja_entrega_id`) REFERENCES `sesiones_caja`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `productos` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`nombre` text NOT NULL,
	`categoria` text,
	`tipo_venta` text NOT NULL,
	`precio_entero` real,
	`precio_porcion` real,
	`porciones_estandar` integer,
	`artesanal` integer DEFAULT false NOT NULL,
	`activo` integer DEFAULT true NOT NULL,
	`actualizado_en` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `sesiones_caja` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`usuario_id` integer NOT NULL,
	`fecha` text NOT NULL,
	`hora_apertura` text NOT NULL,
	`hora_cierre` text,
	`estado` text DEFAULT 'abierta' NOT NULL,
	`actualizado_en` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	FOREIGN KEY (`usuario_id`) REFERENCES `usuarios`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `stock_diario` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`producto_id` integer NOT NULL,
	`sesion_caja_id` integer NOT NULL,
	`unidad` text DEFAULT 'entero' NOT NULL,
	`fecha` text NOT NULL,
	`cantidad_inicial` integer DEFAULT 0 NOT NULL,
	`cantidad_agregada` integer DEFAULT 0 NOT NULL,
	`conteo_fisico_cierre` integer,
	`diferencia_detectada` integer,
	`actualizado_en` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	FOREIGN KEY (`producto_id`) REFERENCES `productos`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`sesion_caja_id`) REFERENCES `sesiones_caja`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `usuarios` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`nombre` text NOT NULL,
	`rol` text NOT NULL,
	`pin_hash` text NOT NULL,
	`activo` integer DEFAULT true NOT NULL,
	`actualizado_en` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `venta_detalle` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`venta_id` integer NOT NULL,
	`producto_id` integer NOT NULL,
	`unidad` text NOT NULL,
	`cantidad` integer NOT NULL,
	`precio_unitario` real NOT NULL,
	`subtotal` real NOT NULL,
	FOREIGN KEY (`venta_id`) REFERENCES `ventas`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`producto_id`) REFERENCES `productos`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `ventas` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`sesion_caja_id` integer NOT NULL,
	`fecha_hora` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`total` real NOT NULL,
	`metodo_pago` text NOT NULL,
	`tipo_origen` text NOT NULL,
	`requiere_factura` integer DEFAULT false NOT NULL,
	`cliente_identificacion` text,
	`cliente_nombre` text,
	`actualizado_en` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	FOREIGN KEY (`sesion_caja_id`) REFERENCES `sesiones_caja`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `cierre_caja_sesion_caja_id_unique` ON `cierre_caja` (`sesion_caja_id`);