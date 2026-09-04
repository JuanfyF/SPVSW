CREATE TABLE `pin_reset_log` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`usuario_id` integer NOT NULL,
	`pin_temporal_hash` text NOT NULL,
	`expiracion` text NOT NULL,
	`utilizado` integer DEFAULT false NOT NULL,
	`actualizado_en` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	FOREIGN KEY (`usuario_id`) REFERENCES `usuarios`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
ALTER TABLE `usuarios` ADD `debe_cambiar_pin` integer DEFAULT false NOT NULL;