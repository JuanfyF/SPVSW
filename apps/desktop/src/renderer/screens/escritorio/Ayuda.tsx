import { HelpCircle, Download } from "lucide-react";
import { generarGuiaUsuario } from "@pos/shared";

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
        <button
          onClick={() => generarGuiaUsuario()}
          className="mt-4 flex items-center gap-2 px-4 py-2 bg-primary text-on-primary rounded-xl hover:bg-primary/90 transition-colors text-sm font-medium"
        >
          <Download className="w-4 h-4" />
          Descargar guía de usuario (PDF)
        </button>
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

      {/* Recuperación de PIN */}
      <section className="bg-surface-container-low rounded-2xl p-6 space-y-4">
        <h2 className="text-lg font-bold text-on-surface">Recuperación de PIN</h2>

        <div>
          <h3 className="font-semibold text-on-surface mb-1">¿Qué es un PIN temporal?</h3>
          <p className="text-on-surface-variant text-sm">
            Cuando un propietario restablece el PIN de una empleada, se genera un PIN temporal
            de 6 dígitos que dura 24 horas. La empleada debe usar ese PIN para entrar y
            luego cambiarlo por uno nuevo.
          </p>
        </div>

        <div>
          <h3 className="font-semibold text-on-surface mb-1">Cómo restablecer el PIN de una empleada</h3>
          <ol className="list-decimal list-inside text-on-surface-variant text-sm space-y-1">
            <li>En la pantalla de login, haz clic en "¿Olvidaste tu PIN?"</li>
            <li>Selecciona el nombre de la empleada</li>
            <li>Haz clic en "Restablecer"</li>
            <li>Copia el PIN temporal y compártelo con la empleada</li>
            <li>La empleada usa ese PIN para entrar y debe cambiarlo inmediatamente</li>
          </ol>
        </div>

        <div>
          <h3 className="font-semibold text-on-surface mb-1">Qué ve la empleada al entrar con PIN temporal</h3>
          <p className="text-on-surface-variant text-sm">
            Al entrar con un PIN temporal, la empleada es redirigida automáticamente a una
            pantalla donde debe crear un nuevo PIN. No puede cancelar ni saltarse este paso.
            Una vez que cambia el PIN, accede normalmente al sistema.
          </p>
        </div>

        <div>
          <h3 className="font-semibold text-on-surface mb-1">Cuándo expira un PIN temporal</h3>
          <p className="text-on-surface-variant text-sm">
            Los PINs temporales expiran después de 24 horas. Si la empleada no entra antes
            de que expire, el propietario debe generar uno nuevo. El sistema muestra cuándo
            vence el PIN temporal en la pantalla de login.
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
