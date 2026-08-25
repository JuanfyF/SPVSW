# Sweet Bakery — POS Pastelería

Sistema de punto de venta (POS) para pastelería en Ecuador, diseñado **local-first**: opera completamente sin internet.

## Stack tecnológico

| Capa | Tecnología |
|------|-----------|
| UI Desktop | React + TypeScript + Vite + Tailwind CSS |
| UI Móvil | React (aceso vía navegador en celular) |
| Estado | Zustand |
| Base de datos | SQLite + Drizzle ORM |
| Validación | Zod |
| Desktop | Electron 31 |
| API Móvil | Express (embebido en Electron) |
| Empaquetado | electron-builder |
| Monorepo | pnpm workspaces |

## Requisitos

- Node.js 20+
- pnpm 9+

## Instalación

```bash
# Clonar el repositorio
git clone https://github.com/JuanfyF/SPVSW.git
cd SPVSW

# Instalar dependencias
pnpm install

# Construir el proyecto
pnpm build

# El AppImage se genera en:
# apps/desktop/release/Sweet Bakery-0.1.0.AppImage
```

## Desarrollo

```bash
# Modo desarrollo (una terminal)
pnpm --filter @pos/desktop dev:mobile

# Esto arranca:
# - Vite en puerto 5173 (UI React)
# - Electron + local-server en puerto 3000 (API)
```

### Acceso desde celular

1. Iniciar `dev:mobile`
2. Obtener la IP de la laptop: `hostname -I`
3. Desde el celular: `http://<IP>:5173/movil/login`

## Estructura del proyecto

```
POS-Pasteleria/
├── packages/
│   ├── core/          Lógica de negocio (stock, caja, pedidos, nómina, reportes)
│   ├── db/            Schema y migraciones Drizzle ORM
│   └── shared/        Tipos, validaciones Zod, utilidades
├── apps/
│   ├── desktop/       Electron: main process + renderer (React)
│   └── local-server/  API REST embebida para acceso móvil
├── build/             Recursos de build
└── docs/              Documentación
```

## Funcionalidades

### Desktop (Administrador/Cajero)
- Dashboard con ventas del día y diferencias pendientes
- Caja (apertura, cierre, conciliación)
- Ventas mostrador
- Pedidos con anticipos y entregas
- Stock diario con cortes, mermas y cortesías
- Gastos operativos
- Nómina (adelantos y multas)
- Reportes históricos con exportación PDF/CSV
- Gestión de usuarios

### Móvil (Pastelera)
- Vista de producción de pedidos
- Gestión de stock (cortes, mermas, reposiciones)
- Actualización de estado de pedidos

## Roles

| Rol | Acceso |
|-----|--------|
| Propietario | Acceso total |
| Cajero | Acceso total (sin gestión de usuarios) |
| Pastelera | Stock y pedidos (solo producción, sin datos financieros) |

## Base de datos

SQLite local ubicada en `~/.config/@pos/desktop/pos.sqlite`. Se crea automáticamente al iniciar la aplicación por primera vez, ejecutando las migraciones de Drizzle ORM.

## Licencia

Propietaria — Ver [LICENSE](LICENSE) para detalles.

Las dependencias de terceros mantienen sus propias licencias. Ver [NOTICE.txt](NOTICE.txt) para la lista completa.
