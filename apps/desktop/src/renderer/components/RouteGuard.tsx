import { Navigate } from "react-router-dom";
import { useAuthStore } from "../store/auth";
import { verificarRuta as verificarRutaBase } from "./route-guard-logic";

export { verificarRuta } from "./route-guard-logic";

export function useRouteGuard() {
  const { usuario } = useAuthStore();

  function verificarRuta(pathname: string): string | null {
    return verificarRutaBase(pathname, usuario?.rol ?? "");
  }

  return { verificarRuta };
}

export function RouteGuard({ children }: { children: React.ReactNode }) {
  const { usuario } = useAuthStore();
  const pathname = window.location.hash.replace("#", "").split("?")[0];

  if (verificarRutaBase(pathname, usuario?.rol ?? "")) {
    return <Navigate to={verificarRutaBase(pathname, usuario?.rol ?? "")!} replace />;
  }

  return <>{children}</>;
}
