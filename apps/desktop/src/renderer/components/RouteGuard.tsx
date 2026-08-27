import { Navigate } from "react-router-dom";
import { useAuthStore } from "../store/auth";

const rutasRestringidasPastelera: Record<string, string> = {
  "/movil/pedidos/nuevo": "/movil/pedidos",
};

export function useRouteGuard() {
  const { usuario } = useAuthStore();

  function verificarRuta(pathname: string): string | null {
    if (usuario?.rol === "pastelera" && rutasRestringidasPastelera[pathname]) {
      return rutasRestringidasPastelera[pathname];
    }
    return null;
  }

  return { verificarRuta };
}

export function RouteGuard({ children }: { children: React.ReactNode }) {
  const { usuario } = useAuthStore();
  const pathname = window.location.hash.replace("#", "").split("?")[0];

  if (usuario?.rol === "pastelera" && rutasRestringidasPastelera[pathname]) {
    return <Navigate to={rutasRestringidasPastelera[pathname]} replace />;
  }

  return <>{children}</>;
}
