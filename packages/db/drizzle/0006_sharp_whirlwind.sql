CREATE TABLE `configuracion` (
	`id` integer PRIMARY KEY NOT NULL,
	`nombre_negocio` text DEFAULT '' NOT NULL,
	`actualizado_en` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL
);
