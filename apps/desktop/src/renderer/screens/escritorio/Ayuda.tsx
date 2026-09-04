import { HelpCircle } from "lucide-react";

export default function Ayuda() {
  return (
    <div className="p-6 max-w-4xl mx-auto space-y-8">
      <div className="flex items-center gap-3">
        <HelpCircle className="w-8 h-8 text-primary" />
        <h1 className="text-2xl font-bold text-on-surface">Ayuda</h1>
      </div>

      {/* Acerca de */}
      <section className="bg-surface-container-low rounded-2xl p-6">
        <h2 className="text-lg font-bold text-on-surface mb-2">Acerca de Sweet Bakery POS</h2>
        <p className="text-on-surface-variant">
          Sistema de Punto de Venta para pastelería artesanal.
          Gestión de ventas, pedidos, inventario, gastos y nómina.
        </p>
      </section>

      {/* Por rol */}
      <section className="bg-surface-container-low rounded-2xl p-6 space-y-4">
        <h2 className="text-lg font-bold text-on-surface">Funciones por rol</h2>

        <div>
          <h3 className="font-semibold text-on-surface mb-1">Propietario / Cajero</h3>
          <ul className="list-disc list-inside text-on-surface-variant space-y-1">
            <li>Dashboard con resumen del día</li>
            <li>Venta de mostrador (crear ventas, cobrar)</li>
            <li>Gestión de productos (crear, editar, precios)</li>
            <li>Pedidos (crear, entregar, cancelar)</li>
            <li>Control de stock (reposición, conciliación)</li>
            <li>Registro de gastos</li>
            <li>Nómina (adelantos, multas, pagos)</li>
            <li>Reportes diarios y por rango de fechas</li>
            <li>Gestión de usuarios (crear, cambiar PIN)</li>
            <li>Backup y restauración de base de datos</li>
          </ul>
        </div>

        <div>
          <h3 className="font-semibold text-on-surface mb-1">Pastelera</h3>
          <ul className="list-disc list-inside text-on-surface-variant space-y-1">
            <li>Ver stock disponible</li>
            <li>Ver pedidos de producción (sin datos financieros)</li>
            <li>Actualizar estado de pedidos (en_proceso, listo)</li>
          </ul>
        </div>
      </section>

      {/* Flujos */}
      <section className="bg-surface-container-low rounded-2xl p-6 space-y-4">
        <h2 className="text-lg font-bold text-on-surface">Flujos principales</h2>

        <div>
          <h3 className="font-semibold text-on-surface mb-1">Caja</h3>
          <p className="text-on-surface-variant text-sm">
            Abrir caja → Registrar ventas → Registrar gastos → Cerrar caja.
            El cierre genera un resumen de efectivo, transferencias y stock.
          </p>
        </div>

        <div>
          <h3 className="font-semibold text-on-surface mb-1">Pedidos</h3>
          <p className="text-on-surface-variant text-sm">
            Crear pedido (con anticipo) → Pastelera lo prepara (en_proceso → listo) →
            Entregar al cliente (cobra saldo) → El pedido queda registrado como venta.
          </p>
        </div>

        <div>
          <h3 className="font-semibold text-on-surface mb-1">Stock</h3>
          <p className="text-on-surface-variant text-sm">
            Registrar stock al inicio del día → El sistema calcula lo vendido automáticamente →
            Conciliar stock al cerrar caja → Registrar mermas o cortesías si aplica.
          </p>
        </div>
      </section>

      {/* Atajos de teclado */}
      <section className="bg-surface-container-low rounded-2xl p-6">
        <h2 className="text-lg font-bold text-on-surface mb-2">Atajos de teclado</h2>
        <div className="grid grid-cols-2 gap-2 text-sm text-on-surface-variant">
          <div><kbd className="px-2 py-1 bg-surface-container-highest rounded">0-9</kbd> Ingresar PIN</div>
          <div><kbd className="px-2 py-1 bg-surface-container-highest rounded">Backspace</kbd> Borrar dígito</div>
          <div><kbd className="px-2 py-1 bg-surface-container-highest rounded">Enter</kbd> Confirmar</div>
          <div><kbd className="px-2 py-1 bg-surface-container-highest rounded">Esc</kbd> Cancelar</div>
        </div>
      </section>
    </div>
  );
}
