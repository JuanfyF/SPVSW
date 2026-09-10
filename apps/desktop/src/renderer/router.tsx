import { lazy, Suspense } from "react";
import { createHashRouter } from "react-router-dom";
import LoadingScreen from "./components/LoadingScreen";

type RouterType = ReturnType<typeof createHashRouter>;

// Layouts (se cargan inmediatamente — necesarios para estructura)
import LayoutEscritorio from "./layouts/LayoutEscritorio";
import LayoutMovil from "./layouts/LayoutMovil";

// Pantallas de autenticación (lazy)
const Login = lazy(() => import("./screens/Login"));
const LoginMovil = lazy(() => import("./screens/LoginMovil"));
const PinVerificacion = lazy(() => import("./screens/PinVerificacion"));
const CambiarPinForzado = lazy(() => import("./screens/CambiarPinForzado"));

// Pantallas de escritorio (lazy)
const Dashboard = lazy(() => import("./screens/escritorio/Dashboard"));
const AperturaCaja = lazy(() => import("./screens/escritorio/AperturaCaja"));
const VentaMostrador = lazy(() => import("./screens/escritorio/VentaMostrador"));
const StockEscritorio = lazy(() => import("./screens/escritorio/Stock"));
const Productos = lazy(() => import("./screens/escritorio/Productos"));
const PedidosLista = lazy(() => import("./screens/escritorio/pedidos/Lista"));
const PedidoNuevo = lazy(() => import("./screens/escritorio/pedidos/Nuevo"));
const PedidoDetalle = lazy(() => import("./screens/escritorio/pedidos/Detalle"));
const Gastos = lazy(() => import("./screens/escritorio/Gastos"));
const Nomina = lazy(() => import("./screens/escritorio/Nomina"));
const CierreCaja = lazy(() => import("./screens/escritorio/CierreCaja"));
const Reportes = lazy(() => import("./screens/escritorio/Reportes"));
const Usuarios = lazy(() => import("./screens/escritorio/Usuarios"));
const BackupRestore = lazy(() => import("./screens/escritorio/BackupRestore"));
const Ayuda = lazy(() => import("./screens/escritorio/Ayuda"));

// Pantallas móviles (lazy)
const MenuMovil = lazy(() => import("./screens/movil/Menu"));
const PedidosMovil = lazy(() => import("./screens/movil/pedidos/Lista"));
const PedidoMovilDetalle = lazy(() => import("./screens/movil/pedidos/Detalle"));
const PedidoMovilNuevo = lazy(() => import("./screens/movil/pedidos/Nuevo"));
const StockMovil = lazy(() => import("./screens/movil/Stock"));
const PerfilMovil = lazy(() => import("./screens/movil/Perfil"));

const errorElement = (
  <div className="flex flex-col items-center justify-center h-full min-h-[400px] p-8 text-center">
    <p className="text-on-surface-variant">Ocurrió un error al cargar esta pantalla.</p>
  </div>
);

export const router: RouterType = createHashRouter([
  // Rutas de autenticación
  {
    path: "/login",
    element: <Suspense fallback={<LoadingScreen />}><Login /></Suspense>,
    errorElement,
  },
  {
    path: "/movil/login",
    element: <Suspense fallback={<LoadingScreen />}><LoginMovil /></Suspense>,
    errorElement,
  },
  {
    path: "/pin",
    element: <Suspense fallback={<LoadingScreen />}><PinVerificacion /></Suspense>,
    errorElement,
  },
  {
    path: "/cambiar-pin",
    element: <Suspense fallback={<LoadingScreen />}><CambiarPinForzado /></Suspense>,
    errorElement,
  },

  // Rutas de escritorio
  {
    path: "/",
    element: <LayoutEscritorio />,
    errorElement,
    children: [
      {
        index: true,
        element: <Suspense fallback={<LoadingScreen />}><Dashboard /></Suspense>,
      },
      {
        path: "caja/apertura",
        element: <Suspense fallback={<LoadingScreen />}><AperturaCaja /></Suspense>,
      },
      {
        path: "caja/cierre",
        element: <Suspense fallback={<LoadingScreen />}><CierreCaja /></Suspense>,
      },
      {
        path: "venta",
        element: <Suspense fallback={<LoadingScreen />}><VentaMostrador /></Suspense>,
      },
      {
        path: "stock",
        element: <Suspense fallback={<LoadingScreen />}><StockEscritorio /></Suspense>,
      },
      {
        path: "productos",
        element: <Suspense fallback={<LoadingScreen />}><Productos /></Suspense>,
      },
      {
        path: "pedidos",
        element: <Suspense fallback={<LoadingScreen />}><PedidosLista /></Suspense>,
      },
      {
        path: "pedidos/nuevo",
        element: <Suspense fallback={<LoadingScreen />}><PedidoNuevo /></Suspense>,
      },
      {
        path: "pedidos/:id",
        element: <Suspense fallback={<LoadingScreen />}><PedidoDetalle /></Suspense>,
      },
      {
        path: "gastos",
        element: <Suspense fallback={<LoadingScreen />}><Gastos /></Suspense>,
      },
      {
        path: "nomina",
        element: <Suspense fallback={<LoadingScreen />}><Nomina /></Suspense>,
      },
      {
        path: "reportes",
        element: <Suspense fallback={<LoadingScreen />}><Reportes /></Suspense>,
      },
      {
        path: "usuarios",
        element: <Suspense fallback={<LoadingScreen />}><Usuarios /></Suspense>,
      },
      {
        path: "backup",
        element: <Suspense fallback={<LoadingScreen />}><BackupRestore /></Suspense>,
      },
      {
        path: "ayuda",
        element: <Suspense fallback={<LoadingScreen />}><Ayuda /></Suspense>,
      },
    ],
  },

  // Rutas móviles
  {
    path: "/movil",
    element: <LayoutMovil />,
    errorElement,
    children: [
      {
        index: true,
        element: <Suspense fallback={<LoadingScreen />}><MenuMovil /></Suspense>,
      },
      {
        path: "pedidos",
        element: <Suspense fallback={<LoadingScreen />}><PedidosMovil /></Suspense>,
      },
      {
        path: "pedidos/nuevo",
        element: <Suspense fallback={<LoadingScreen />}><PedidoMovilNuevo /></Suspense>,
      },
      {
        path: "pedidos/:id",
        element: <Suspense fallback={<LoadingScreen />}><PedidoMovilDetalle /></Suspense>,
      },
      {
        path: "stock",
        element: <Suspense fallback={<LoadingScreen />}><StockMovil /></Suspense>,
      },
      {
        path: "perfil",
        element: <Suspense fallback={<LoadingScreen />}><PerfilMovil /></Suspense>,
      },
    ],
  },
]);
