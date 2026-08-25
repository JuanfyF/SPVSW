ALTER TABLE `pedido_detalle` ADD COLUMN `unidad` text NOT NULL DEFAULT 'entero';
--> statement-breakpoint
ALTER TABLE `productos` DROP COLUMN `porciones_estandar`;
