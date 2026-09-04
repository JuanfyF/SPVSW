import { Menu, dialog, app } from "electron";

let ventanaPrincipal: Electron.BrowserWindow | null = null;

export function setVentanaPrincipal(win: Electron.BrowserWindow) {
  ventanaPrincipal = win;
}

export function crearMenuPrincipal() {
  const template: Electron.MenuItemConstructorOptions[] = [
    {
      label: "Archivo",
      submenu: [
        { role: "quit", label: "Salir" },
      ],
    },
    {
      label: "Ver",
      submenu: [
        { role: "reload", label: "Recargar" },
        { role: "forceReload", label: "Forzar recarga" },
        { role: "toggleDevTools", label: "Herramientas de desarrollo" },
        { type: "separator" },
        { role: "resetZoom", label: "Restablecer zoom" },
        { role: "zoomIn", label: "Acercar" },
        { role: "zoomOut", label: "Alejar" },
        { type: "separator" },
        { role: "togglefullscreen", label: "Pantalla completa" },
      ],
    },
    {
      label: "Ventana",
      submenu: [
        { role: "minimize", label: "Minimizar" },
        { role: "close", label: "Cerrar" },
      ],
    },
    {
      label: "Help",
      submenu: [
        {
          label: "Acerca de Sweet Bakery",
          click: () => mostrarAcercaDe(),
        },
        { type: "separator" },
        {
          label: "Atajos de teclado",
          click: () => mostrarAtajos(),
        },
      ],
    },
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

function mostrarAcercaDe() {
  dialog.showMessageBox(ventanaPrincipal!, {
    type: "info",
    title: "Acerca de Sweet Bakery",
    message: "Sweet Bakery POS",
    detail: [
      `Versión: ${app.getVersion()}`,
      "Sistema POS para pastelería",
      "",
      "Gestión de ventas, pedidos, stock y nómina.",
      "",
      "© 2026 Sweet Bakery",
    ].join("\n"),
    buttons: ["Cerrar"],
  });
}

function mostrarAtajos() {
  dialog.showMessageBox(ventanaPrincipal!, {
    type: "info",
    title: "Atajos de teclado",
    message: "Atajos disponibles",
    detail: [
      "Ctrl+1-9: Navegar entre secciones",
      "Esc: Cancelar / Cerrar modal",
      "Enter: Confirmar / Enviar formulario",
      "",
      "Navegación con teclado en la pantalla de PIN:",
      "0-9: Ingresar dígitos del PIN",
      "Backspace: Borrar último dígito",
    ].join("\n"),
    buttons: ["Cerrar"],
  });
}
