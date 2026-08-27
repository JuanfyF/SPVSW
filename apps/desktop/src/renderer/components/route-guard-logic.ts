const rutasRestringidasPastelera: Record<string, string> = {
  "/movil/pedidos/nuevo": "/movil/pedidos",
};

export function verificarRuta(pathname: string, rol: string): string | null {
  if (rol === "pastelera" && rutasRestringidasPastelera[pathname]) {
    return rutasRestringidasPastelera[pathname];
  }
  return null;
}
