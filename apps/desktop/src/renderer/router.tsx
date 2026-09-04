import { createHashRouter } from "react-router-dom";

type RouterType = ReturnType<typeof createHashRouter>;

// Layouts
import LayoutEscritorio from "./layouts/LayoutEscritorio";
import LayoutMovil from "./layouts/LayoutMovil";

// Pantallas de autenticación
import Login from "./screens/Login";
import LoginMovil from "./screens/LoginMovil";
import PinVerificacion from "./screens/PinVerificacion";

// Pantallas de escritorio (11)
import Dashboard from "./screens/escritorio/Dashboard";
import AperturaCaja from "./screens/escritorio/AperturaCaja";
import VentaMostrador from "./screens/escritorio/VentaMostrador";
import StockEscritorio from "./screens/escritorio/Stock";
import Productos from "./screens/escritorio/Productos";
import PedidosLista from "./screens/escritorio/pedidos/Lista";
import PedidoNuevo from "./screens/escritorio/pedidos/Nuevo";
import PedidoDetalle from "./screens/escritorio/pedidos/Detalle";
import Gastos from "./screens/escritorio/Gastos";
import Nomina from "./screens/escritorio/Nomina";
import CierreCaja from "./screens/escritorio/CierreCaja";
import Reportes from "./screens/escritorio/Reportes";
import Usuarios from "./screens/escritorio/Usuarios";
import BackupRestore from "./screens/escritorio/BackupRestore";
import Ayuda from "./screens/escritorio/Ayuda";
import CambiarPinForzado from "./screens/CambiarPinForzado";

// Pantallas móviles (7)
import MenuMovil from "./screens/movil/Menu";
import PedidosMovil from "./screens/movil/pedidos/Lista";
import PedidoMovilDetalle from "./screens/movil/pedidos/Detalle";
import PedidoMovilNuevo from "./screens/movil/pedidos/Nuevo";
import StockMovil from "./screens/movil/Stock";
import PerfilMovil from "./screens/movil/Perfil";

export const router: RouterType = createHashRouter([
  // Rutas de autenticación
  {
    path: "/login",
    element: <Login />,
  },
  {
    path: "/movil/login",
    element: <LoginMovil />,
  },
  {
    path: "/pin",
    element: <PinVerificacion />,
  },
  {
    path: "/cambiar-pin",
    element: <CambiarPinForzado />,
  },

  // Rutas de escritorio (11 pantallas)
  {
    path: "/",
    element: <LayoutEscritorio />,
    children: [
      {
        index: true,
        element: <Dashboard />,
      },
      {
        path: "caja/apertura",
        element: <AperturaCaja />,
      },
      {
        path: "caja/cierre",
        element: <CierreCaja />,
      },
      {
        path: "venta",
        element: <VentaMostrador />,
      },
      {
        path: "stock",
        element: <StockEscritorio />,
      },
      {
        path: "productos",
        element: <Productos />,
      },
      {
        path: "pedidos",
        element: <PedidosLista />,
      },
      {
        path: "pedidos/nuevo",
        element: <PedidoNuevo />,
      },
      {
        path: "pedidos/:id",
        element: <PedidoDetalle />,
      },
      {
        path: "gastos",
        element: <Gastos />,
      },
      {
        path: "nomina",
        element: <Nomina />,
      },
      {
        path: "reportes",
        element: <Reportes />,
      },
      {
        path: "usuarios",
        element: <Usuarios />,
      },
      {
        path: "backup",
        element: <BackupRestore />,
      },
      {
        path: "ayuda",
        element: <Ayuda />,
      },
    ],
  },

  // Rutas móviles (7 pantallas)
  {
    path: "/movil",
    element: <LayoutMovil />,
    children: [
      {
        index: true,
        element: <MenuMovil />,
      },
      {
        path: "pedidos",
        element: <PedidosMovil />,
      },
      {
        path: "pedidos/nuevo",
        element: <PedidoMovilNuevo />,
      },
      {
        path: "pedidos/:id",
        element: <PedidoMovilDetalle />,
      },
      {
        path: "stock",
        element: <StockMovil />,
      },
      {
        path: "perfil",
        element: <PerfilMovil />,
      },
    ],
  },
]);
